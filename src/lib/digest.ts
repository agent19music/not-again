import type { GoonEntry } from '@/lib/goon-store';

const DAY_MS = 24 * 60 * 60 * 1000;
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 local time for the week containing `ts`. */
export function startOfWeek(ts: number) {
  const d = new Date(startOfDay(ts));
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.getTime();
}

export type WeekRange = { start: number; end: number };

export function weekRange(referenceTs: number, weeksAgo = 0): WeekRange {
  const start = startOfWeek(referenceTs) - weeksAgo * 7 * DAY_MS;
  return { start, end: start + 7 * DAY_MS };
}

export type PeriodKey = 'week' | 'month' | 'year' | 'all';

export function monthRange(referenceTs: number): WeekRange {
  const d = new Date(referenceTs);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return { start, end };
}

export function yearRange(referenceTs: number): WeekRange {
  const d = new Date(referenceTs);
  const start = new Date(d.getFullYear(), 0, 1).getTime();
  const end = new Date(d.getFullYear() + 1, 0, 1).getTime();
  return { start, end };
}

export function allTimeRange(entries: GoonEntry[], now: number): WeekRange {
  const earliest = entries.reduce((min, entry) => Math.min(min, entry.occurredAt), now);
  return { start: earliest, end: now + 1 };
}

export function rangeForPeriod(period: PeriodKey, entries: GoonEntry[], now: number): WeekRange {
  if (period === 'week') return weekRange(now, 0);
  if (period === 'month') return monthRange(now);
  if (period === 'year') return yearRange(now);
  return allTimeRange(entries, now);
}

export type RankedLabel = { label: string; count: number };

export function rankLabels(values: string[]): RankedLabel[] {
  const byKey = new Map<string, { label: string; count: number }>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, { label: trimmed, count: 1 });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
}

export type WeekStats = {
  range: WeekRange;
  count: number;
  byDay: number[]; // Mon..Sun
  topSites: RankedLabel[];
  topSubjects: RankedLabel[];
  notedCount: number;
  todayCount: number;
};

export function computeWeekStats(entries: GoonEntry[], range: WeekRange, now = Date.now()): WeekStats {
  const inRange = entries.filter((e) => e.occurredAt >= range.start && e.occurredAt < range.end);
  const byDay = new Array(7).fill(0);
  for (const entry of inRange) {
    const dayIndex = Math.floor((startOfDay(entry.occurredAt) - range.start) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < 7) byDay[dayIndex] += 1;
  }
  const todayStart = startOfDay(now);
  const todayCount = entries.filter(
    (e) => e.occurredAt >= todayStart && e.occurredAt < todayStart + DAY_MS
  ).length;
  return {
    range,
    count: inRange.length,
    byDay,
    todayCount,
    topSites: rankLabels(inRange.map((e) => e.site ?? '')),
    topSubjects: rankLabels(inRange.map((e) => e.subject ?? '')),
    notedCount: inRange.filter((e) => e.site || e.subject).length,
  };
}

export type Digest = {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  /** Percent change vs last week; null when last week had zero entries. */
  deltaPct: number | null;
  /** Longest gap between consecutive goons across all recorded history, ms. */
  longestGapMs: number | null;
  /** Time since the most recent goon, ms. */
  currentGapMs: number | null;
  totalCount: number;
};

export function computeDigest(entries: GoonEntry[], now: number): Digest {
  const thisWeek = computeWeekStats(entries, weekRange(now, 0), now);
  const lastWeek = computeWeekStats(entries, weekRange(now, 1), now);

  const deltaPct =
    lastWeek.count === 0
      ? null
      : Math.round(((thisWeek.count - lastWeek.count) / lastWeek.count) * 100);

  const sorted = [...entries].sort((a, b) => a.occurredAt - b.occurredAt);
  let longestGapMs: number | null = null;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i].occurredAt - sorted[i - 1].occurredAt;
    if (longestGapMs === null || gap > longestGapMs) longestGapMs = gap;
  }
  const lastEntry = sorted[sorted.length - 1];
  const currentGapMs = lastEntry ? now - lastEntry.occurredAt : null;
  if (currentGapMs !== null && (longestGapMs === null || currentGapMs > longestGapMs)) {
    longestGapMs = currentGapMs;
  }

  return { thisWeek, lastWeek, deltaPct, longestGapMs, currentGapMs, totalCount: entries.length };
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${Math.max(minutes, 0)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatTimeAgo(ts: number, now: number): string {
  const diff = now - ts;
  if (diff < 60_000) return 'just now';
  return `${formatDuration(diff)} ago`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(ts: number, now: number): string {
  if (startOfDay(ts) === startOfDay(now)) return 'Today';
  if (startOfDay(ts) === startOfDay(now) - DAY_MS) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export { startOfDay, DAY_MS };
