/** Shared types for the local notification engine. */

export type FamilyId =
  | 'morning_checkin'
  | 'midday_anchor'
  | 'evening_winddown'
  | 'streak_milestone'
  | 'comeback'
  | 'post_log_encourage'
  | 'post_log_hydrate'
  | 'post_log_walk'
  | 'post_log_reset'
  | 'urge_surf'
  | 'pattern_mirror'
  | 'quote'
  | 'absence_nudge'
  | 'weekly_digest_tease'
  | 'congrats'
  | 'hydrate_standalone'
  | 'move_standalone'
  | 'identity';

export type ChannelId = 'care' | 'milestones' | 'chains' | 'quotes';

export type NotifKind = 'planned' | 'chain' | 'milestone' | 'test';

export type Template = {
  id: string;
  family: FamilyId;
  title: string;
  body: string;
  /** Only true for congrats templates — allows a single 🎉 */
  confetti?: boolean;
  weight?: number;
};

export type PlannedNotification = {
  /** Stable client id used for cancel/reschedule */
  clientId: string;
  family: FamilyId;
  templateId: string;
  title: string;
  body: string;
  fireAt: number;
  channelId: ChannelId;
  kind: NotifKind;
  /** OS schedule id once registered */
  osId?: string;
  meta?: Record<string, string | number | boolean>;
};

export type NotifPrefs = {
  enabled: boolean;
  dailyMin: 1;
  dailyMax: 3 | 4 | 5;
  quietStartMinutes: number;
  quietEndMinutes: number;
  families: Record<FamilyId, boolean>;
  quotes: string[];
  chainAfterLog: boolean;
  exactAlarmPromptedAt?: number;
};

export type FiredRecord = {
  templateId: string;
  family: FamilyId;
  firedAt: number;
};

export type PlanState = {
  installSalt: string;
  planned: PlannedNotification[];
  recentFired: FiredRecord[];
  lastAppOpenAt: number;
  lastReplanAt: number;
};

export const ALL_FAMILIES: FamilyId[] = [
  'morning_checkin',
  'midday_anchor',
  'evening_winddown',
  'streak_milestone',
  'comeback',
  'post_log_encourage',
  'post_log_hydrate',
  'post_log_walk',
  'post_log_reset',
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

export const FAMILY_CHANNEL: Record<FamilyId, ChannelId> = {
  morning_checkin: 'care',
  midday_anchor: 'care',
  evening_winddown: 'care',
  streak_milestone: 'milestones',
  comeback: 'care',
  post_log_encourage: 'chains',
  post_log_hydrate: 'chains',
  post_log_walk: 'chains',
  post_log_reset: 'chains',
  urge_surf: 'care',
  pattern_mirror: 'care',
  quote: 'quotes',
  absence_nudge: 'care',
  weekly_digest_tease: 'care',
  congrats: 'milestones',
  hydrate_standalone: 'care',
  move_standalone: 'care',
  identity: 'care',
};

export const FAMILY_LABELS: Record<FamilyId, string> = {
  morning_checkin: 'Morning check-in',
  midday_anchor: 'Midday anchor',
  evening_winddown: 'Evening wind-down',
  streak_milestone: 'Streak milestones',
  comeback: 'Comeback',
  post_log_encourage: 'After log: encourage',
  post_log_hydrate: 'After log: hydrate',
  post_log_walk: 'After log: walk',
  post_log_reset: 'After log: reset',
  urge_surf: 'Urge surf',
  pattern_mirror: 'Pattern mirror',
  quote: 'Quotes',
  absence_nudge: 'Absence nudge',
  weekly_digest_tease: 'Weekly digest tease',
  congrats: 'Congrats',
  hydrate_standalone: 'Hydrate',
  move_standalone: 'Move',
  identity: 'Identity',
};

/** Family groups for Settings UI */
export const FAMILY_GROUPS: { title: string; families: FamilyId[] }[] = [
  {
    title: 'Care',
    families: [
      'morning_checkin',
      'midday_anchor',
      'evening_winddown',
      'comeback',
      'urge_surf',
      'pattern_mirror',
      'absence_nudge',
      'weekly_digest_tease',
      'hydrate_standalone',
      'move_standalone',
      'identity',
    ],
  },
  {
    title: 'Milestones',
    families: ['streak_milestone', 'congrats'],
  },
  {
    title: 'Chains',
    families: ['post_log_encourage', 'post_log_hydrate', 'post_log_walk', 'post_log_reset'],
  },
  {
    title: 'Quotes',
    families: ['quote'],
  },
];
