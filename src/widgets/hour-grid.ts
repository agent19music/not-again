/**
 * Concept C "Hour grid" widget logic. Pure functions, no React Native imports,
 * so the app, the tests and the native ports all agree on one definition.
 *
 * Everything is measured on the streak's elapsed time (now - lastOccurredAt),
 * not the wall clock: the grid fills one square per streak minute and the
 * confetti plays in the first five minutes of every full streak hour.
 *
 * The Android provider (plugins/withStreakHourGrid.js) is a Kotlin port of this
 * file. The iOS view inlines confettiPieces between <confetti-gen> markers
 * because expo-widgets serialises the view to a string. Tests keep all copies
 * in step.
 */

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Seconds into a full hour where each confetti phase ends. */
export const BURST_END_S = 150; // :02:30
export const DRIFT_END_S = 280; // :04:40
export const SETTLE_END_S = 300; // :05:00
/** Pre-rendered frames swap every 30 s inside burst and drift. */
export const FRAME_STEP_S = 30;
export const BURST_FRAMES = BURST_END_S / FRAME_STEP_S; // 5
export const DRIFT_FRAMES = Math.ceil((DRIFT_END_S - BURST_END_S) / FRAME_STEP_S); // 5

/** Every offset (s) inside an hour where the confetti picture changes. */
export const CONFETTI_BOUNDARIES_S: readonly number[] = [
  ...Array.from({ length: BURST_FRAMES - 1 }, (_, i) => (i + 1) * FRAME_STEP_S),
  ...Array.from({ length: DRIFT_FRAMES }, (_, i) => BURST_END_S + i * FRAME_STEP_S),
  DRIFT_END_S,
  SETTLE_END_S,
];

/** How far ahead iOS timelines are written. The app and background task re-push. */
export const DEFAULT_HORIZON_MS = 12 * HOUR_MS;

export type ConfettiPhase = 'none' | 'burst' | 'drift' | 'settle';

export type StreakWidgetProps = {
  /** Epoch ms of the latest entry. Null when nothing is logged. */
  lastOccurredAt: number | null;
  /** HH:MM, hours within the current day of the streak. */
  clock: string;
  /** "3 days" */
  days: string;
  /** "3d" */
  dayShort: string;
  /** Squares filled in the 60-square grid (streak minutes into this hour). */
  filled: number;
  phase: ConfettiPhase;
  /** Frame index inside the phase. */
  frame: number;
  /** Full streak hours. Seeds the confetti so every hour looks different. */
  seed: number;
};

export type StreakParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
};

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** ms since the last entry. Null or a future entry counts as zero. */
export function elapsedMs(lastOccurredAt: number | null, now: number): number {
  if (lastOccurredAt == null || !Number.isFinite(lastOccurredAt)) return 0;
  return Math.max(0, now - lastOccurredAt);
}

export function streakParts(ms: number): StreakParts {
  const s = Math.floor(Math.max(0, ms) / SECOND_MS);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalHours: Math.floor(s / 3600),
  };
}

/** HH:MM. Seconds are left out on purpose: the widget repaints once a minute. */
export function formatClock(ms: number): string {
  const p = streakParts(ms);
  return `${pad2(p.hours)}:${pad2(p.minutes)}`;
}

export function dayLabel(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Squares lit in the hour grid: one per completed streak minute this hour, 0–59. */
export function hourGridFill(ms: number): number {
  return streakParts(ms).minutes;
}

/** Which confetti phase shows at this elapsed time. The first hour never celebrates. */
export function confettiPhase(ms: number): ConfettiPhase {
  if (ms < HOUR_MS) return 'none';
  const intoHour = Math.floor((ms % HOUR_MS) / SECOND_MS);
  if (intoHour < BURST_END_S) return 'burst';
  if (intoHour < DRIFT_END_S) return 'drift';
  if (intoHour < SETTLE_END_S) return 'settle';
  return 'none';
}

/** Frame index inside the current phase, 0 when there is no animation. */
export function confettiFrame(ms: number): number {
  const phase = confettiPhase(ms);
  const intoHour = Math.floor((ms % HOUR_MS) / SECOND_MS);
  if (phase === 'burst') return Math.floor(intoHour / FRAME_STEP_S);
  if (phase === 'drift') return Math.floor((intoHour - BURST_END_S) / FRAME_STEP_S);
  return 0;
}

export function widgetState(lastOccurredAt: number | null, now: number): StreakWidgetProps {
  const ms = elapsedMs(lastOccurredAt, now);
  const p = streakParts(ms);
  return {
    lastOccurredAt,
    clock: formatClock(ms),
    days: dayLabel(p.days),
    dayShort: `${p.days}d`,
    filled: hourGridFill(ms),
    phase: confettiPhase(ms),
    frame: confettiFrame(ms),
    seed: p.totalHours,
  };
}

/**
 * Epoch ms of the next moment the widget looks different after `now`:
 * the next streak minute, or the next confetti frame/phase boundary.
 * Null when nothing is logged (the widget is static).
 */
export function nextChangeAt(lastOccurredAt: number | null, now: number): number | null {
  if (lastOccurredAt == null || !Number.isFinite(lastOccurredAt)) return null;
  if (now < lastOccurredAt) return lastOccurredAt;
  const ms = now - lastOccurredAt;
  let next = lastOccurredAt + (Math.floor(ms / MINUTE_MS) + 1) * MINUTE_MS;
  if (ms >= HOUR_MS) {
    const hourStart = lastOccurredAt + Math.floor(ms / HOUR_MS) * HOUR_MS;
    for (const b of CONFETTI_BOUNDARIES_S) {
      const at = hourStart + b * SECOND_MS;
      if (at > now) {
        next = Math.min(next, at);
        break;
      }
    }
  }
  return next;
}

export type TimelineEntry = { date: Date; props: StreakWidgetProps };

/**
 * iOS timeline: one entry now, then one per visual change up to the horizon.
 * About 60 entries an hour plus 8 extra in each confetti window.
 */
export function buildTimeline(
  lastOccurredAt: number | null,
  now: number,
  horizonMs: number = DEFAULT_HORIZON_MS
): TimelineEntry[] {
  const entries: TimelineEntry[] = [{ date: new Date(now), props: widgetState(lastOccurredAt, now) }];
  const end = now + horizonMs;
  let t = nextChangeAt(lastOccurredAt, now);
  while (t != null && t <= end) {
    entries.push({ date: new Date(t), props: widgetState(lastOccurredAt, t) });
    t = nextChangeAt(lastOccurredAt, t);
  }
  return entries;
}

export type ConfettiPiece = {
  /** Left edge, fraction of widget width. */
  x: number;
  /** Top edge, fraction of widget height. */
  y: number;
  /** Size in points (dp on Android). Strips are 2.2x taller than wide. */
  w: number;
  h: number;
  /** Degrees. */
  rot: number;
  /** Index into the confetti palette: accent, ink, orange, yellow. */
  color: number;
};

// <confetti-gen>
export function confettiPieces(phase: string, frame: number, seed: number): ConfettiPiece[] {
  if (phase !== 'burst' && phase !== 'drift' && phase !== 'settle') return [];
  const kind = phase === 'burst' ? 1 : phase === 'drift' ? 2 : 3;
  let s = (Math.abs(Math.floor(seed)) * 7919 + kind * 104729) % 2147483647;
  if (s <= 0) s += 2147483646;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const n = kind === 1 ? 36 : kind === 2 ? 16 : 14;
  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  const out: ConfettiPiece[] = [];
  for (let i = 0; i < n; i++) {
    const size = 4 + Math.floor(r() * 3);
    const strip = kind !== 3 && r() < 0.3;
    const rot = Math.floor(r() * 360);
    let x = 0;
    let y = 0;
    if (kind === 1) {
      const a = r() * Math.PI * 2;
      const d = 0.15 + r() * 0.45;
      const p = (frame + 1) / 5;
      x = 0.5 + Math.cos(a) * d * p;
      y = 0.45 + Math.sin(a) * d * 0.7 * p - 0.2 * p + 0.5 * p * p;
    } else if (kind === 2) {
      x = r();
      y = ((r() + frame * 0.2) % 1) * 1.1 - 0.05;
    } else {
      x = 0.03 + r() * 0.92;
      y = 0.93 - r() * 0.05;
    }
    out.push({
      x: round3(x),
      y: round3(y),
      w: size,
      h: strip ? Math.round(size * 2.2) : size,
      rot,
      color: i % 4,
    });
  }
  return out;
}
// </confetti-gen>
