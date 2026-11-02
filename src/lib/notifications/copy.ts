export type CopyContext = {
  hours?: number;
  days?: number;
  streakLabel?: string;
  site?: string;
  subject?: string;
  count?: number;
  quote?: string;
};

/** Replace `{key}` placeholders; unknown keys stay empty. */
export function interpolate(template: string, ctx: CopyContext): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = ctx[key as keyof CopyContext];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

export function formatStreakLabel(elapsedMs: number): string {
  const hours = Math.floor(elapsedMs / 3_600_000);
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(elapsedMs / 60_000));
    return `${mins}m`;
  }
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w`;
  return `${Math.floor(days / 30)}mo`;
}
