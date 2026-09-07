/**
 * Streak timer formatting — calendar-ish unit cascade for time since last goon.
 */

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export type StreakUnit = 'sec' | 'min' | 'hr' | 'day' | 'wk' | 'mo' | 'yr';

export type StreakTier = 'hms' | 'dhm' | 'wdh' | 'mwd' | 'ymw';

export type StreakParts = {
  tier: StreakTier;
  values: [number, number, number];
  labels: [StreakUnit, StreakUnit, StreakUnit];
};

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function streakTierFor(elapsedMs: number): StreakTier {
  if (elapsedMs < DAY) return 'hms';
  if (elapsedMs < WEEK) return 'dhm';
  if (elapsedMs < MONTH) return 'wdh';
  if (elapsedMs < YEAR) return 'mwd';
  return 'ymw';
}

export function formatStreak(elapsedMs: number): StreakParts {
  const ms = Math.max(0, elapsedMs);
  const tier = streakTierFor(ms);

  if (tier === 'hms') {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MIN);
    const seconds = Math.floor((ms % MIN) / SEC);
    return { tier, values: [hours, minutes, seconds], labels: ['hr', 'min', 'sec'] };
  }

  if (tier === 'dhm') {
    const days = Math.floor(ms / DAY);
    const hours = Math.floor((ms % DAY) / HOUR);
    const minutes = Math.floor((ms % HOUR) / MIN);
    return { tier, values: [days, hours, minutes], labels: ['day', 'hr', 'min'] };
  }

  if (tier === 'wdh') {
    const weeks = Math.floor(ms / WEEK);
    const days = Math.floor((ms % WEEK) / DAY);
    const hours = Math.floor((ms % DAY) / HOUR);
    return { tier, values: [weeks, days, hours], labels: ['wk', 'day', 'hr'] };
  }

  if (tier === 'mwd') {
    const months = Math.floor(ms / MONTH);
    const weeks = Math.floor((ms % MONTH) / WEEK);
    const days = Math.floor((ms % WEEK) / DAY);
    return { tier, values: [months, weeks, days], labels: ['mo', 'wk', 'day'] };
  }

  const years = Math.floor(ms / YEAR);
  const months = Math.floor((ms % YEAR) / MONTH);
  const weeks = Math.floor((ms % MONTH) / WEEK);
  return { tier, values: [years, months, weeks], labels: ['yr', 'mo', 'wk'] };
}

export function formatStreakDigits(parts: StreakParts): [string, string, string] {
  return [pad2(parts.values[0]), pad2(parts.values[1]), pad2(parts.values[2])];
}

export const EMPTY_STREAK: StreakParts = {
  tier: 'hms',
  values: [0, 0, 0],
  labels: ['hr', 'min', 'sec'],
};
