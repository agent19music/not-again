import { computeDigest, startOfDay, DAY_MS } from '@/lib/digest';
import type { GoonEntry } from '@/lib/goon-store';
import { templatesFor } from '@/lib/notifications/content/banks';
import { resolveQuotes } from '@/lib/notifications/content/quotes';
import { formatStreakLabel, interpolate } from '@/lib/notifications/copy';
import {
  buildDayWindows,
  isFamilyEligible,
  riskHours,
  type EligibilityContext,
} from '@/lib/notifications/eligibility';
import * as planStore from '@/lib/notifications/plan-store';
import type {
  FamilyId,
  NotifPrefs,
  PlannedNotification,
  Template,
} from '@/lib/notifications/types';
import { FAMILY_CHANNEL } from '@/lib/notifications/types';

const WEEK_MS = 7 * DAY_MS;
const MIN_SPACING_MS = 90 * 60_000;

const PLANNED_FAMILIES: FamilyId[] = [
  'morning_checkin',
  'midday_anchor',
  'evening_winddown',
  'comeback',
  'urge_surf',
  'pattern_mirror',
  'quote',
  'absence_nudge',
  'weekly_digest_tease',
  'congrats',
  'hydrate_standalone',
  'move_standalone',
  'identity',
];

const FAMILY_WEIGHT: Partial<Record<FamilyId, number>> = {
  morning_checkin: 3,
  midday_anchor: 3,
  evening_winddown: 3,
  comeback: 4,
  urge_surf: 3,
  pattern_mirror: 2,
  quote: 3,
  absence_nudge: 2,
  weekly_digest_tease: 2,
  congrats: 1,
  hydrate_standalone: 2,
  move_standalone: 2,
  identity: 2,
};

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Seeded mulberry32 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: string[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickTemplate(
  family: FamilyId,
  forbidden: Set<string>,
  random: () => number
): Template | null {
  const pool = templatesFor(family).filter((t) => !forbidden.has(t.id));
  if (pool.length === 0) {
    const fallback = templatesFor(family);
    if (fallback.length === 0) return null;
    return fallback[Math.floor(random() * fallback.length)];
  }
  const total = pool.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  let r = random() * total;
  for (const t of pool) {
    r -= t.weight ?? 1;
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

function slotForFamily(
  family: FamilyId,
  windows: ReturnType<typeof buildDayWindows>,
  random: () => number,
  entries: GoonEntry[],
  now: number
): number | null {
  const jitter = (range: [number, number]) => {
    const [a, b] = range;
    if (b <= a) return a;
    return a + random() * (b - a);
  };

  switch (family) {
    case 'morning_checkin':
    case 'comeback':
      return jitter(windows.morning);
    case 'midday_anchor':
      return jitter(windows.midday);
    case 'evening_winddown':
      return jitter(windows.evening);
    case 'urge_surf': {
      const hours = riskHours(entries);
      if (hours.length === 0) return null;
      const hour = hours[Math.floor(random() * hours.length)];
      const base = windows.dayStart + hour * 3_600_000 + random() * 40 * 60_000;
      if (base < windows.daytime[0] || base > windows.daytime[1]) {
        return jitter(windows.daytime);
      }
      return base;
    }
    case 'weekly_digest_tease': {
      const day = new Date(windows.dayStart).getDay();
      if (day === 0) return jitter(windows.evening);
      return jitter(windows.morning);
    }
    case 'absence_nudge':
      return jitter(windows.midday);
    default:
      return jitter(windows.daytime);
  }
}

function buildCopy(
  family: FamilyId,
  template: Template,
  entries: GoonEntry[],
  prefs: NotifPrefs,
  now: number
) {
  const digest = computeDigest(entries, now);
  const last = entries[0];
  const quotes = resolveQuotes(prefs.quotes);
  const quote = quotes[Math.floor(Math.abs(now) % quotes.length)] ?? quotes[0];
  const ctx = {
    streakLabel: digest.currentGapMs != null ? formatStreakLabel(digest.currentGapMs) : '',
    hours: digest.currentGapMs != null ? Math.floor(digest.currentGapMs / 3_600_000) : 0,
    days: digest.currentGapMs != null ? Math.floor(digest.currentGapMs / DAY_MS) : 0,
    site: digest.thisWeek.topSites[0]?.label ?? last?.site ?? '',
    subject: digest.thisWeek.topSubjects[0]?.label ?? last?.subject ?? '',
    count: digest.thisWeek.count,
    quote,
  };
  return {
    title: interpolate(template.title, ctx).slice(0, 40),
    body: interpolate(template.body, ctx).slice(0, 140),
  };
}

function fitsSpacing(fireAt: number, existing: number[]): boolean {
  return existing.every((t) => Math.abs(t - fireAt) >= MIN_SPACING_MS);
}

function planOneDay(
  dayStart: number,
  entries: GoonEntry[],
  prefs: NotifPrefs,
  installSalt: string,
  now: number,
  lastAppOpenAt: number
): PlannedNotification[] {
  const windows = buildDayWindows(dayStart, prefs);
  const random = rng(hashSeed([installSalt, dayKey(dayStart), 'plan']));
  const forbidden = planStore.recentTemplateIds(WEEK_MS, now);
  const usedFamilies = new Set<FamilyId>();

  const ctx: EligibilityContext = { now: Math.max(now, dayStart), entries, prefs, lastAppOpenAt };
  const eligible = PLANNED_FAMILIES.filter((f) => isFamilyEligible(f, ctx));

  const target = Math.min(
    prefs.dailyMax,
    Math.max(prefs.dailyMin, Math.round(prefs.dailyMin + random() * (prefs.dailyMax - prefs.dailyMin)))
  );

  const picked: FamilyId[] = [];
  const pool = [...eligible];

  while (picked.length < target && pool.length > 0) {
    const total = pool.reduce((sum, f) => sum + (FAMILY_WEIGHT[f] ?? 1), 0);
    let r = random() * total;
    let choice = pool[0];
    for (const f of pool) {
      r -= FAMILY_WEIGHT[f] ?? 1;
      if (r <= 0) {
        choice = f;
        break;
      }
    }
    picked.push(choice);
    // remove family so no duplicates in day
    const idx = pool.indexOf(choice);
    if (idx >= 0) pool.splice(idx, 1);
  }

  // Floor: ensure at least dailyMin
  while (picked.length < prefs.dailyMin) {
    const fallback: FamilyId = random() > 0.5 ? 'quote' : 'identity';
    if (!picked.includes(fallback) && prefs.families[fallback] !== false) {
      picked.push(fallback);
    } else if (!picked.includes('quote')) {
      picked.push('quote');
    } else {
      break;
    }
  }

  const fireTimes: number[] = [];
  const out: PlannedNotification[] = [];

  for (const family of picked) {
    if (usedFamilies.has(family)) continue;
    const template = pickTemplate(family, forbidden, random);
    if (!template) continue;

    let fireAt = slotForFamily(family, windows, random, entries, now);
    if (fireAt == null) continue;

    // push forward if too soon / clash
    let guard = 0;
    while (
      guard < 8 &&
      (fireAt < now + 60_000 || !fitsSpacing(fireAt, fireTimes) || fireAt > windows.daytime[1])
    ) {
      fireAt += MIN_SPACING_MS * 0.5;
      guard += 1;
    }
    if (fireAt < now + 60_000 || fireAt > windows.daytime[1]) continue;
    if (!fitsSpacing(fireAt, fireTimes)) continue;

    const copy = buildCopy(family, template, entries, prefs, now);
    const clientId = `plan:${dayKey(dayStart)}:${family}`;
    out.push({
      clientId,
      family,
      templateId: template.id,
      title: copy.title,
      body: copy.body,
      fireAt: Math.floor(fireAt),
      channelId: FAMILY_CHANNEL[family],
      kind: 'planned',
    });
    fireTimes.push(fireAt);
    usedFamilies.add(family);
    forbidden.add(template.id);
  }

  return out;
}

/** Build planned notifications for today + tomorrow (excluding chain/milestone kinds). */
export function buildDailyPlan(
  entries: GoonEntry[],
  prefs: NotifPrefs,
  now = Date.now()
): PlannedNotification[] {
  if (!prefs.enabled) return [];
  const salt = planStore.getSnapshot().installSalt;
  const lastAppOpenAt = planStore.getSnapshot().lastAppOpenAt;
  const today = startOfDay(now);
  const tomorrow = today + DAY_MS;
  return [
    ...planOneDay(today, entries, prefs, salt, now, lastAppOpenAt),
    ...planOneDay(tomorrow, entries, prefs, salt, now, lastAppOpenAt),
  ];
}

export function countPlannedForDay(
  planned: PlannedNotification[],
  dayStart: number
): number {
  const end = dayStart + DAY_MS;
  return planned.filter((p) => p.fireAt >= dayStart && p.fireAt < end && p.kind !== 'test').length;
}
