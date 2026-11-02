import { computeDigest, startOfDay, DAY_MS } from '@/lib/digest';
import type { GoonEntry } from '@/lib/goon-store';
import type { FamilyId, NotifPrefs } from '@/lib/notifications/types';
import * as planStore from '@/lib/notifications/plan-store';

export type EligibilityContext = {
  now: number;
  entries: GoonEntry[];
  prefs: NotifPrefs;
  lastAppOpenAt: number;
};

export type DayWindows = {
  dayStart: number;
  dayEnd: number;
  quietEnd: number;
  quietStart: number;
  morning: [number, number];
  midday: [number, number];
  evening: [number, number];
  daytime: [number, number];
};

function minutesToMsOnDay(dayStart: number, minutes: number) {
  return dayStart + minutes * 60_000;
}

/** Quiet hours may wrap midnight (e.g. 23:00–07:30). */
export function buildDayWindows(dayStart: number, prefs: NotifPrefs): DayWindows {
  const dayEnd = dayStart + DAY_MS;
  const quietStart = minutesToMsOnDay(dayStart, prefs.quietStartMinutes);
  let quietEnd = minutesToMsOnDay(dayStart, prefs.quietEndMinutes);
  if (prefs.quietEndMinutes <= prefs.quietStartMinutes) {
    // quiet spans midnight: end is on this morning
    quietEnd = minutesToMsOnDay(dayStart, prefs.quietEndMinutes);
  }

  const activeStart = quietEnd;
  const activeEnd = quietStart > quietEnd ? quietStart : dayEnd;

  const span = Math.max(activeEnd - activeStart, 60_000);
  const morning: [number, number] = [activeStart, activeStart + span * 0.35];
  const midday: [number, number] = [activeStart + span * 0.35, activeStart + span * 0.7];
  const evening: [number, number] = [activeStart + span * 0.7, activeEnd];

  return {
    dayStart,
    dayEnd,
    quietEnd: activeStart,
    quietStart: activeEnd,
    morning,
    midday,
    evening,
    daytime: [activeStart, activeEnd],
  };
}

export function isInQuietHours(ts: number, prefs: NotifPrefs): boolean {
  const dayStart = startOfDay(ts);
  const mins = Math.floor((ts - dayStart) / 60_000);
  const { quietStartMinutes: qs, quietEndMinutes: qe } = prefs;
  if (qs === qe) return false;
  if (qs > qe) {
    // wraps midnight
    return mins >= qs || mins < qe;
  }
  return mins >= qs && mins < qe;
}

/** Defer into quiet-hours end if needed; null if too stale (>6h past intended). */
export function respectQuietHours(
  fireAt: number,
  prefs: NotifPrefs,
  now = Date.now()
): number | null {
  if (!isInQuietHours(fireAt, prefs)) {
    return fireAt < now - 60_000 ? null : Math.max(fireAt, now + 5_000);
  }
  const dayStart = startOfDay(fireAt);
  const windows = buildDayWindows(dayStart, prefs);
  let deferred = windows.quietEnd;
  if (deferred <= fireAt) {
    deferred = buildDayWindows(dayStart + DAY_MS, prefs).quietEnd;
  }
  if (deferred - fireAt > 6 * 3_600_000) return null;
  if (deferred < now - 60_000) return null;
  return Math.max(deferred, now + 5_000);
}

export function riskHours(entries: GoonEntry[]): number[] {
  if (entries.length < 3) return [];
  const buckets = new Array(24).fill(0);
  for (const e of entries) {
    buckets[new Date(e.occurredAt).getHours()] += 1;
  }
  const ranked = buckets
    .map((count, hour) => ({ hour, count }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);
  return ranked.slice(0, 3).map((b) => b.hour);
}

export function isFamilyEligible(family: FamilyId, ctx: EligibilityContext): boolean {
  if (!ctx.prefs.enabled) return false;
  if (ctx.prefs.families[family] === false) return false;

  const digest = computeDigest(ctx.entries, ctx.now);
  const last = ctx.entries[0];
  const dayStart = startOfDay(ctx.now);
  const yesterdayStart = dayStart - DAY_MS;

  switch (family) {
    case 'morning_checkin':
    case 'midday_anchor':
    case 'evening_winddown':
    case 'quote':
    case 'hydrate_standalone':
    case 'move_standalone':
    case 'identity':
      return true;

    case 'comeback': {
      if (!last) return false;
      return last.occurredAt >= yesterdayStart && last.occurredAt < dayStart;
    }

    case 'urge_surf':
      return riskHours(ctx.entries).length > 0;

    case 'pattern_mirror': {
      const sites = digest.thisWeek.topSites;
      const subjects = digest.thisWeek.topSubjects;
      return (sites[0]?.count ?? 0) >= 2 || (subjects[0]?.count ?? 0) >= 2;
    }

    case 'absence_nudge': {
      const gap = ctx.now - (ctx.lastAppOpenAt || 0);
      return ctx.lastAppOpenAt > 0 && gap >= 3 * DAY_MS;
    }

    case 'weekly_digest_tease': {
      const day = new Date(ctx.now).getDay(); // 0 Sun
      return day === 0 || day === 1;
    }

    case 'congrats': {
      if (digest.currentGapMs == null || digest.longestGapMs == null) return false;
      // Eligible when current gap is approaching / at longest (planner uses milestones mostly)
      return digest.currentGapMs >= 24 * 3_600_000;
    }

    case 'streak_milestone':
    case 'post_log_encourage':
    case 'post_log_hydrate':
    case 'post_log_walk':
    case 'post_log_reset':
      // Scheduled via dedicated pipelines, not daily lottery
      return false;

    default:
      return false;
  }
}

export function familiesUsedToday(now = Date.now()) {
  return planStore.recentFamiliesToday(now);
}
