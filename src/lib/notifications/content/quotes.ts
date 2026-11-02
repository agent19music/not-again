/** Default quote bank. Used when the user hasn't customized prefs.quotes. */

export const DEFAULT_QUOTES: string[] = [
  "You've got this one.",
  'One hour at a time.',
  "Don't throw the day yet.",
  'Hold on. Night is the hard part.',
  'Logged. Next hour is still yours.',
  "Halfway through. Keep that going.",
  "That's a real win. Stay with it.",
  'Fresh start. Make it to noon.',
  "You've slipped here before. Don't autopilot it.",
  'So close. Finish the day.',
  'Water, then decide.',
  'Get up. Change rooms.',
  "You're still fighting. That counts.",
  'New day. Same you. Start over.',
  'Ten minutes. Reassess after.',
];

export function resolveQuotes(userQuotes: string[]): string[] {
  const cleaned = userQuotes.map((q) => q.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : DEFAULT_QUOTES;
}
