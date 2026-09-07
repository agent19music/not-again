/**
 * Smocha design tokens — the single source of truth for color, type, spacing,
 * radius, and motion. No component may hardcode a hex value, font size, or
 * spring config; everything reads from here (colors via `useTheme()`).
 *
 * Identity: friendly-premium fintech. One accent (Gooned rose) over soft
 * neutrals, pill geometry, spring motion. Dark mode is warm dark (neutral-950),
 * never pure black.
 */

/** Semantic color tokens. Light and dark carry identical keys.
 *
 * Neutral grays are the Tailwind CSS neutral palette (hex equivalents).
 * neutral-50 #fafafa → neutral-950 #0a0a0a
 */
export const Colors = {
  light: {
    /* Surfaces — Tailwind neutral */
    background: '#fafafa',  // neutral-50
    surface: '#ffffff',
    surfaceAlt: '#f5f5f5',  // neutral-100
    border: '#e5e5e5',      // neutral-200
    divider: '#e5e5e5',     // neutral-200
    handle: '#d4d4d4',      // neutral-300

    /* Text — Tailwind neutral */
    text: '#171717',        // neutral-900
    textSecondary: '#737373', // neutral-500
    textMuted: '#a3a3a3',   // neutral-400
    textInverse: '#ffffff',

    /* Accent (Gooned rose) */
    accent: '#D83C55',
    onAccent: '#ffffff',
    accentSoft: '#fdecef',
    accentSoftText: '#c4334c',
    accentMuted: '#e0b4bc',

    /* Neutral tone */
    neutralFill: '#171717',  // neutral-900
    onNeutralFill: '#ffffff',
    neutralSoft: '#f5f5f5',  // neutral-100
    neutralSoftText: '#171717', // neutral-900

    /* Semantic */
    success: '#22c55e',
    successSoft: '#f0fdf4',
    successSoftText: '#16a34a',
    danger: '#ef4444',
    onDanger: '#ffffff',
    dangerSoft: '#fef2f2',
    dangerSoftText: '#dc2626',
    warning: '#f97316',
    warningSoft: '#fff7ed',
    warningSoftText: '#ea580c',

    /* Effects */
    overlay: 'rgba(0, 0, 0, 0.40)',
    shadow: '#000000',
    sheen: 'rgba(255, 255, 255, 0.45)',
    sheenSubtle: 'rgba(255, 255, 255, 0.22)',
  },
  dark: {
    /* Surfaces — Tailwind neutral dark end */
    background: '#0a0a0a',  // neutral-950
    surface: '#171717',     // neutral-900
    surfaceAlt: '#262626',  // neutral-800
    border: '#404040',      // neutral-700
    divider: '#262626',     // neutral-800
    handle: '#525252',      // neutral-600

    /* Text */
    text: '#fafafa',        // neutral-50
    textSecondary: '#a3a3a3', // neutral-400
    textMuted: '#525252',   // neutral-600
    textInverse: '#171717', // neutral-900

    /* Accent — lifted for dark-surface contrast */
    accent: '#E85A6F',
    onAccent: '#ffffff',
    accentSoft: '#3d1f26',
    accentSoftText: '#f5a3b0',
    accentMuted: '#73555c',

    /* Neutral tone — inverts to a light fill on dark */
    neutralFill: '#fafafa',  // neutral-50
    onNeutralFill: '#171717', // neutral-900
    neutralSoft: '#262626',  // neutral-800
    neutralSoftText: '#fafafa', // neutral-50

    /* Semantic */
    success: '#4ade80',
    successSoft: '#14532d',
    successSoftText: '#86efac',
    danger: '#f87171',
    onDanger: '#ffffff',
    dangerSoft: '#450a0a',
    dangerSoftText: '#fca5a5',
    warning: '#fb923c',
    warningSoft: '#431407',
    warningSoftText: '#fdba74',

    /* Effects */
    overlay: 'rgba(0, 0, 0, 0.60)',
    shadow: '#000000',
    sheen: 'rgba(255, 255, 255, 0.20)',
    sheenSubtle: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ColorToken = keyof ThemeColors;

/**
 * Brand fonts — 2 weights only.
 *
 * - heading  Inter_500Medium   : section headings, titles, display text
 * - body     Geist_400Regular  : body copy, captions, all default text
 * - emphasis Geist_500Medium   : inline emphasis, form labels, UI chrome
 *
 * Never set `fontWeight` — each entry IS the font file for that weight.
 * Lint enforces this. See eslint.config.js.
 */
export const Fonts = {
  heading: 'Inter_500Medium',
  body: 'Geist_400Regular',
  emphasis: 'Geist_500Medium',
  /** Geist Pixel Square — streak timer only. */
  pixel: 'GeistPixelSquare',
} as const;

/**
 * Type scale. Hierarchy comes from weight + size + leading together.
 * Headings/display use Inter; body copy and chrome use Geist.
 */
export const Typography = {
  wordmark:   { fontSize: 64, lineHeight: 70, letterSpacing: -4.0, fontFamily: Fonts.heading },
  display:    { fontSize: 40, lineHeight: 46, letterSpacing: -1.2, fontFamily: Fonts.heading },
  title:      { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontFamily: Fonts.heading },
  heading:    { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontFamily: Fonts.heading },
  subheading: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontFamily: Fonts.heading },
  headline:   { fontSize: 16, lineHeight: 22, letterSpacing: -0.1, fontFamily: Fonts.heading },
  body:       { fontSize: 15, lineHeight: 22, letterSpacing:  0,   fontFamily: Fonts.body },
  bodySm:     { fontSize: 14, lineHeight: 20, letterSpacing:  0,   fontFamily: Fonts.body },
  label:      { fontSize: 13, lineHeight: 18, letterSpacing:  0,   fontFamily: Fonts.emphasis },
  caption:    { fontSize: 12, lineHeight: 16, letterSpacing:  0,   fontFamily: Fonts.body },
  /** Live streak timer — Geist Pixel Square only. */
  timer:      { fontSize: 56, lineHeight: 64, letterSpacing:  0,   fontFamily: Fonts.pixel },
} as const;

export const Spacing = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  s48: 48,
  s64: 64,
  s80: 80,
} as const;

export const Radius = {
  xs: 8,
  sm: 10,
  mc: 12,
  md: 16,
  card: 28,
  pill: 999,
} as const;

/**
 * Motion tokens — every spring in the app comes from here so all presses
 * and entrances share one physical personality. Press feedback fires on
 * press-IN (never on release), settles with a slightly looser spring.
 */
export const Motion = {
  spring: {
    press:    { damping: 20, stiffness: 400 },
    release:  { damping: 16, stiffness: 300 },
    entrance: { damping: 20, stiffness: 110 },
    sheet:    { damping: 50, stiffness: 300 },
    pop:      { damping: 22, stiffness: 260 },
  },
  timing: {
    fast:   100,
    base:   150,
    exit:   180,
    gentle: 250,
  },
  scale: {
    press: 0.97,
    chip:  0.93,
    icon:  0.85,
  },
} as const;
