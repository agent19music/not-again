import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { computeDigest, startOfDay, DAY_MS } from '@/lib/digest';
import type { GoonEntry } from '@/lib/goon-store';
import * as goonStore from '@/lib/goon-store';
import { MILESTONE_OFFSETS, templatesFor, templateById } from '@/lib/notifications/content/banks';
import { formatStreakLabel, interpolate } from '@/lib/notifications/copy';
import { respectQuietHours } from '@/lib/notifications/eligibility';
import { buildDailyPlan, countPlannedForDay } from '@/lib/notifications/planner';
import * as planStore from '@/lib/notifications/plan-store';
import * as prefsStore from '@/lib/notifications/prefs-store';
import { ensureChannels } from '@/lib/notifications/channels';
import {
  getPermissionSnapshot,
  requestNotificationPermission,
} from '@/lib/notifications/permissions';
import * as scheduler from '@/lib/notifications/scheduler';
import type { FamilyId, PlannedNotification } from '@/lib/notifications/types';
import { FAMILY_CHANNEL } from '@/lib/notifications/types';

const CHAIN_PREFIX = 'chain:';
const MILE_PREFIX = 'mile:';
const PLAN_PREFIX = 'plan:';

let initialized = false;
let replanning: Promise<void> | null = null;
let appStateSub: { remove: () => void } | null = null;
let receivedSub: Notifications.EventSubscription | null = null;
let responseSub: Notifications.EventSubscription | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function pickChainTemplate(family: FamilyId, index = 0) {
  const list = templatesFor(family);
  if (list.length === 0) return null;
  return list[index % list.length];
}

function chainItem(
  family: FamilyId,
  fireAt: number,
  entryId: string,
  templateIndex = 0
): PlannedNotification | null {
  const template = pickChainTemplate(family, templateIndex);
  if (!template) return null;
  return {
    clientId: `${CHAIN_PREFIX}${entryId}:${family}`,
    family,
    templateId: template.id,
    title: template.title,
    body: template.body,
    fireAt,
    channelId: FAMILY_CHANNEL[family],
    kind: 'chain',
    meta: { entryId },
  };
}

/** Drop lowest-priority planned items on a day so chains fit under dailyMax. */
function trimDayForChains(
  planned: PlannedNotification[],
  dayStart: number,
  dailyMax: number,
  chainCount: number
): PlannedNotification[] {
  const dayEnd = dayStart + DAY_MS;
  const dayItems = planned.filter(
    (p) => p.fireAt >= dayStart && p.fireAt < dayEnd && p.kind === 'planned'
  );
  const others = planned.filter((p) => !(p.fireAt >= dayStart && p.fireAt < dayEnd && p.kind === 'planned'));
  const room = Math.max(0, dailyMax - chainCount);
  const kept = dayItems
    .slice()
    .sort((a, b) => a.fireAt - b.fireAt)
    .slice(0, room);
  return [...others, ...kept];
}

function buildMilestones(
  lastOccurredAt: number,
  prefs: ReturnType<typeof prefsStore.getSnapshot>,
  now: number,
  beatLongest: boolean
): PlannedNotification[] {
  if (!prefs.enabled || prefs.families.streak_milestone === false) return [];
  const out: PlannedNotification[] = [];

  for (const mile of MILESTONE_OFFSETS) {
    const rawFire = lastOccurredAt + mile.offsetMs;
    const fireAt = respectQuietHours(rawFire, prefs, now);
    if (fireAt == null) continue;

    const useCongrats =
      mile.congrats &&
      beatLongest &&
      mile.offsetMs >= 24 * 3_600_000 &&
      prefs.families.congrats !== false;

    const family: FamilyId = useCongrats ? 'congrats' : 'streak_milestone';
    if (prefs.families[family] === false) continue;

    const templateId = useCongrats
      ? templatesFor('congrats')[0]?.id
      : `streak_milestone.${mile.templateSuffix}`;
    const template = templateId ? templateById(templateId) : undefined;
    const fallback = templatesFor(family)[0];
    const t = template ?? fallback;
    if (!t) continue;

    const streakLabel = formatStreakLabel(mile.offsetMs);
    out.push({
      clientId: `${MILE_PREFIX}${mile.templateSuffix}`,
      family,
      templateId: t.id,
      title: interpolate(t.title, { streakLabel }),
      body: interpolate(t.body, { streakLabel }),
      fireAt,
      channelId: FAMILY_CHANNEL[family],
      kind: 'milestone',
      meta: { offsetMs: mile.offsetMs },
    });
  }
  return out;
}

function buildChainsForEntry(
  entry: GoonEntry,
  prefs: ReturnType<typeof prefsStore.getSnapshot>,
  now: number
): PlannedNotification[] {
  if (!prefs.enabled || !prefs.chainAfterLog) return [];

  const specs: { family: FamilyId; delayMs: number; required: boolean }[] = [
    { family: 'post_log_encourage', delayMs: 60_000, required: true },
    { family: 'post_log_walk', delayMs: 15 * 60_000, required: false },
    { family: 'post_log_hydrate', delayMs: 60 * 60_000, required: true },
    { family: 'post_log_reset', delayMs: 3 * 60 * 60_000, required: false },
  ];

  const chosen: PlannedNotification[] = [];
  for (const spec of specs) {
    if (prefs.families[spec.family] === false) continue;
    // Always take the two required; optionally walk if encourage+hydrate only would be 2
    if (!spec.required) continue;
    const fireAt = respectQuietHours(now + spec.delayMs, prefs, now);
    if (fireAt == null) continue;
    const item = chainItem(spec.family, fireAt, entry.id);
    if (item) chosen.push(item);
  }

  // Cap at 2 chain notifications
  return chosen.slice(0, 2);
}

async function composeAndApply(entries: GoonEntry[]) {
  if (Platform.OS === 'web') return;

  const prefs = prefsStore.getSnapshot();
  if (!prefs.enabled) {
    await scheduler.applySchedule([]);
    await planStore.setPlanned([]);
    return;
  }

  const permission = await getPermissionSnapshot();
  if (!permission.granted) return;

  const now = Date.now();
  const digest = computeDigest(entries, now);
  const last = entries[0];

  let planned = buildDailyPlan(entries, prefs, now);

  // Preserve existing future chains unless we're about to replace via onGoonLogged
  const existingChains = planStore
    .getSnapshot()
    .planned.filter((p) => p.kind === 'chain' && p.fireAt > now);

  const milestones = last
    ? buildMilestones(
        last.occurredAt,
        prefs,
        now,
        digest.longestGapMs != null &&
          digest.currentGapMs != null &&
          digest.currentGapMs >= (digest.longestGapMs ?? 0) * 0.98
      )
    : [];

  // Fit chains into daily budget
  const dayStart = startOfDay(now);
  const chainToday = existingChains.filter((c) => c.fireAt >= dayStart && c.fireAt < dayStart + DAY_MS);
  planned = trimDayForChains(planned, dayStart, prefs.dailyMax, chainToday.length);

  // Ensure floor of 1 planned-or-chain for today if somehow empty
  const todayCount =
    countPlannedForDay(planned, dayStart) +
    chainToday.length +
    milestones.filter((m) => m.fireAt >= dayStart && m.fireAt < dayStart + DAY_MS).length;
  if (todayCount === 0 && prefs.enabled) {
    const floor = buildDailyPlan(entries, { ...prefs, dailyMin: 1, dailyMax: 3 }, now).filter(
      (p) => p.fireAt >= dayStart && p.fireAt < dayStart + DAY_MS
    );
    planned = [...planned, ...floor];
  }

  const next = [...planned, ...existingChains, ...milestones];
  const scheduled = await scheduler.applySchedule(next);
  await planStore.setPlanned(scheduled);
}

export async function replan() {
  if (Platform.OS === 'web') return;
  if (replanning) return replanning;
  replanning = (async () => {
    try {
      await prefsStore.ensureHydrated();
      await planStore.ensureHydrated();
      await goonStore.ensureHydrated();
      await ensureChannels();
      await composeAndApply(goonStore.getSnapshot());
    } finally {
      replanning = null;
    }
  })();
  return replanning;
}

export async function onGoonLogged(entry: GoonEntry) {
  if (Platform.OS === 'web') return;
  await prefsStore.ensureHydrated();
  await planStore.ensureHydrated();
  const prefs = prefsStore.getSnapshot();
  const now = Date.now();

  // Drop old chains; schedule new ones for this log
  await scheduler.cancelByPrefix(CHAIN_PREFIX);
  const withoutChains = planStore.getSnapshot().planned.filter((p) => p.kind !== 'chain');
  await planStore.setPlanned(withoutChains);

  const chains = buildChainsForEntry(entry, prefs, now);
  const dayStart = startOfDay(now);
  let planned = withoutChains.filter((p) => p.kind === 'planned');
  planned = trimDayForChains(planned, dayStart, prefs.dailyMax, chains.length);

  const entries = goonStore.getSnapshot();
  const digest = computeDigest(entries, now);
  const milestones = buildMilestones(
    entry.occurredAt,
    prefs,
    now,
    digest.longestGapMs != null &&
      digest.currentGapMs != null &&
      digest.currentGapMs >= (digest.longestGapMs ?? 0) * 0.98
  );

  const next = [...planned, ...chains, ...milestones];
  const scheduled = await scheduler.applySchedule(next);
  await planStore.setPlanned(scheduled);
}

export async function onEntriesChanged() {
  await replan();
}

export async function initNotificationEngine() {
  if (initialized || Platform.OS === 'web') return;
  initialized = true;

  await prefsStore.ensureHydrated();
  await planStore.ensureHydrated();
  await goonStore.ensureHydrated();
  await ensureChannels();
  await planStore.touchAppOpen();

  const prefs = prefsStore.getSnapshot();
  if (prefs.enabled) {
    const snap = await getPermissionSnapshot();
    if (!snap.granted && snap.canAskAgain) {
      await requestNotificationPermission();
    }
  }

  receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    const templateId = typeof data?.templateId === 'string' ? data.templateId : '';
    const family = typeof data?.family === 'string' ? (data.family as FamilyId) : 'identity';
    if (templateId) {
      void planStore.markFired({ templateId, family, firedAt: Date.now() });
    }
  });

  responseSub = Notifications.addNotificationResponseReceivedListener(() => {
    // Opening the app is enough; plan will refresh on foreground
  });

  appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void planStore.touchAppOpen();
      void replan();
    }
  });

  goonStore.setGoonMutationListener((event) => {
    if (event.type === 'log') void onGoonLogged(event.entry);
    else void onEntriesChanged();
  });

  await replan();
}

export function teardownNotificationEngine() {
  goonStore.setGoonMutationListener(null);
  appStateSub?.remove();
  receivedSub?.remove();
  responseSub?.remove();
  appStateSub = null;
  receivedSub = null;
  responseSub = null;
  initialized = false;
}

export async function setEnabledAndReplan(enabled: boolean) {
  await prefsStore.setPrefs({ enabled });
  await replan();
}

export { PLAN_PREFIX, CHAIN_PREFIX, MILE_PREFIX };
