import type { FamilyId, Template } from '@/lib/notifications/types';

function t(
  family: FamilyId,
  id: string,
  title: string,
  body: string,
  extra?: Partial<Template>
): Template {
  return { family, id: `${family}.${id}`, title, body, weight: 1, ...extra };
}

/** Direct, short, Today-style. No emoji except congrats confetti. */
export const TEMPLATES: Template[] = [
  // morning
  t('morning_checkin', '01', 'Good morning.', "New day, fresh start. You've got this one."),
  t('morning_checkin', '02', 'Morning.', 'Make it to noon. That is the job for now.'),
  t('morning_checkin', '03', 'Good morning.', "Don't open the usual tabs before you're even awake."),
  t('morning_checkin', '04', 'Hey.', 'Up. First hour sets the tone, so keep it boring.'),
  t('morning_checkin', '05', 'Morning.', 'Start over if you need to. Nobody is keeping score but you.'),
  t('morning_checkin', '06', 'Good morning.', 'Water, then whatever you were actually going to do.'),
  t('morning_checkin', '07', 'Morning check-in.', 'You already made it to morning. Hold that.'),
  t('morning_checkin', '08', 'Hey.', "New day. Don't overthink the first hour."),
  t('morning_checkin', '09', 'Good morning.', "You've got this one. One hour at a time."),
  t('morning_checkin', '10', 'Morning.', 'If the urge shows up early, name it and walk away.'),
  t('morning_checkin', '11', 'Good morning.', 'Tiny win before noon. That is enough.'),
  t('morning_checkin', '12', 'Morning.', "Same you, new day. You've done harder mornings."),

  // midday
  t('midday_anchor', '01', 'Afternoon check-in.', "Halfway through the day. Keep that going."),
  t('midday_anchor', '02', 'Still going.', "Afternoon is where days slip. Don't autopilot it."),
  t('midday_anchor', '03', 'Check-in.', "You're still in it. Don't throw the day yet."),
  t('midday_anchor', '04', 'Afternoon.', 'Stand up, drink water, then decide.'),
  t('midday_anchor', '05', 'Halfway.', "Wanting it isn't the same as doing it. Stay with the day."),
  t('midday_anchor', '06', 'Afternoon check-in.', 'Bored is not an emergency. Keep going.'),
  t('midday_anchor', '07', 'Hey.', 'This hour likes old habits. Catch it once.'),
  t('midday_anchor', '08', 'Still here.', "Halfway through and you're still fighting. Hold on."),
  t('midday_anchor', '09', 'Check-in.', 'Close the tab that does not deserve you.'),
  t('midday_anchor', '10', 'Afternoon.', "Don't negotiate with the urge yet. Give it ten minutes."),
  t('midday_anchor', '11', 'Midday.', "You're mid-day, not done. Keep that going."),
  t('midday_anchor', '12', 'Afternoon check-in.', 'Get up. Change rooms if you have to.'),

  // evening
  t('evening_winddown', '01', 'Good evening.', "Night's the hard part. Hold strong tonight."),
  t('evening_winddown', '02', 'Evening.', 'You made it this far. Do not give tonight away.'),
  t('evening_winddown', '03', 'Almost there.', "Tonight is where days get lost. Stay in it."),
  t('evening_winddown', '04', 'Good evening.', "You know how this ends. Skip the rerun."),
  t('evening_winddown', '05', 'Evening check-in.', 'Phone down is a favor to morning-you.'),
  t('evening_winddown', '06', 'Getting late.', 'Bored is not a crisis. Sleep is a solid move.'),
  t('evening_winddown', '07', 'Good evening.', 'Urges get louder at night. So do exits.'),
  t('evening_winddown', '08', 'Almost night.', "Hold on. You've already done the hard part of the day."),
  t('evening_winddown', '09', 'Evening.', 'Close the day cleaner than it started if you can.'),
  t('evening_winddown', '10', 'Good evening.', "One more stretch and today is yours. So close."),
  t('evening_winddown', '11', 'Wind down.', "Don't start something you already regret."),
  t('evening_winddown', '12', 'Evening check-in.', 'Make the last hour yours.'),

  // streak milestones
  t('streak_milestone', '1h', '1 hour.', "It's been an hour since the last one. One hour at a time."),
  t('streak_milestone', '6h', '6 hours.', 'Six hours since the last goon. Keep that going.'),
  t('streak_milestone', '12h', 'Half a day.', '{streakLabel} in. Halfway is a real win. Hold on.'),
  t('streak_milestone', '24h', '1 day.', '{streakLabel}. A full day. That is a real win.'),
  t('streak_milestone', '48h', '2 days.', '{streakLabel}. Two days. Keep stacking hours.'),
  t('streak_milestone', '72h', '3 days.', '{streakLabel}. Three days. Do not get cute with it.'),
  t('streak_milestone', '7d', '1 week.', '{streakLabel}. A week. You actually did that.'),
  t('streak_milestone', '14d', '2 weeks.', '{streakLabel}. Two weeks. Stay with the boring version.'),
  t('streak_milestone', '30d', '1 month.', '{streakLabel}. A month. That is not a fluke anymore.'),
  t('streak_milestone', '60d', '2 months.', '{streakLabel}. Two months. Keep the same play.'),
  t('streak_milestone', '90d', '90 days.', '{streakLabel}. Ninety days. Do not overthink it. Keep going.'),
  t('streak_milestone', '100d', '100 days.', '{streakLabel}. A hundred days. One hour at a time still works.'),
  t('streak_milestone', '365d', '1 year.', '{streakLabel}. A year. You built a different default.'),

  // comeback
  t('comeback', '01', 'New morning.', "Yesterday happened. Today's still yours."),
  t('comeback', '02', 'You logged it.', "No lecture. Start this one over."),
  t('comeback', '03', 'Reset.', 'You logged it. Now take the next hour.'),
  t('comeback', '04', 'Again.', 'Starting over is continuing. Get the next hour.'),
  t('comeback', '05', 'Back.', 'Tiny next step. Water counts.'),
  t('comeback', '06', 'Day after.', "Treat the morning like it matters. It does."),
  t('comeback', '07', 'Comeback.', "You're still fighting. That takes real strength."),
  t('comeback', '08', 'Fresh start.', "New day. You've got this one."),

  // post log chains
  t('post_log_encourage', '01', 'You logged it.', "Logged. Next hour is still yours."),
  t('post_log_encourage', '02', 'Logged.', "Doesn't erase the rest of the day. Get back in it."),
  t('post_log_encourage', '03', 'You logged it.', "You're still fighting. That takes real strength."),
  t('post_log_encourage', '04', 'Noted.', 'Skip the spiral. Do the next small right thing.'),
  t('post_log_encourage', '05', 'Logged.', "Be kind for the next hour. Then keep going."),
  t('post_log_encourage', '06', 'You logged it.', 'Caught it. Do not write a novel about this.'),

  t('post_log_hydrate', '01', 'Water.', 'Body first. Shame can wait.'),
  t('post_log_hydrate', '02', 'Drink something.', 'One glass. Then see how you feel.'),
  t('post_log_hydrate', '03', 'Hour later.', 'Drink water. Then decide if you still want the rest of it.'),
  t('post_log_hydrate', '04', 'Hydrate.', 'Drink water first. Then see if the rest still feels urgent.'),
  t('post_log_hydrate', '05', 'Water.', 'Simple. Do it.'),

  t('post_log_walk', '01', 'Move.', 'Five minutes outside beats twenty of rumination.'),
  t('post_log_walk', '02', 'Change rooms.', 'Put your body somewhere else.'),
  t('post_log_walk', '03', 'Walk.', 'Shoes on. Door open. That is the plan.'),
  t('post_log_walk', '04', 'Get up.', 'Not punishment. Just relocation.'),

  t('post_log_reset', '01', 'Still yours.', "Three hours later and the evening's still open."),
  t('post_log_reset', '02', 'Reset.', "Day isn't ruined. Get the rest of it."),
  t('post_log_reset', '03', 'Back in.', 'Come back to whatever you were actually doing.'),
  t('post_log_reset', '04', "Evening's open.", 'You can still close today decently.'),

  // urge surf
  t('urge_surf', '01', 'This hour.', "You've slipped here before. Don't autopilot it."),
  t('urge_surf', '02', 'Hold on.', 'Give it ten minutes. Do not negotiate yet.'),
  t('urge_surf', '03', 'Urge.', 'Name it. Wait ten minutes. Then decide.'),
  t('urge_surf', '04', 'Hold.', 'Urges peak, then fall. Outlast this one.'),
  t('urge_surf', '05', 'Ten minutes.', 'Set a timer. Reassess after.'),
  t('urge_surf', '06', 'Soft no.', 'You can want it and still choose something else.'),
  t('urge_surf', '07', 'This window.', "You've seen this hour. Move your body."),
  t('urge_surf', '08', 'Stay with it.', 'Outlast the impulse by one long breath.'),

  // pattern mirror
  t('pattern_mirror', '01', 'Same day.', 'Same weekday energy. Catch it early if you can.'),
  t('pattern_mirror', '02', 'Pattern.', '{site} keeps showing up. That is useful to know.'),
  t('pattern_mirror', '03', 'Heads up.', 'Your log has a favorite path. Take a detour.'),
  t('pattern_mirror', '04', 'Again?', '{subject} again. Still optional.'),
  t('pattern_mirror', '05', 'This hour.', 'This slot likes slips. Have a boring backup ready.'),
  t('pattern_mirror', '06', 'Familiar.', "You've seen this setup. Change one thing."),
  t('pattern_mirror', '07', 'Pattern.', 'No shame. The loop just looks familiar.'),
  t('pattern_mirror', '08', 'Stats.', 'You looked. That already breaks the secrecy a bit.'),

  // quote wrappers
  t('quote', '01', 'Reminder.', '{quote}'),
  t('quote', '02', 'Keep this.', '{quote}'),
  t('quote', '03', 'Hey.', '{quote}'),
  t('quote', '04', 'Check-in.', '{quote}'),
  t('quote', '05', 'For later.', '{quote}'),

  // absence
  t('absence_nudge', '01', 'Hey.', 'No pressure. Just checking you remember the way back.'),
  t('absence_nudge', '02', 'Still here.', 'Whenever you open it, that counts.'),
  t('absence_nudge', '03', 'Missed you.', 'The log is patient. Guilt not required.'),
  t('absence_nudge', '04', 'Whenever.', "Your data's waiting. No lecture attached."),
  t('absence_nudge', '05', 'Hey stranger.', "Door's open when you want it."),

  // weekly digest
  t('weekly_digest_tease', '01', 'Week.', 'Stats has a number if you want a glance.'),
  t('weekly_digest_tease', '02', 'Sunday.', 'One look at the week, then leave it alone.'),
  t('weekly_digest_tease', '03', 'Monday.', 'Fresh week. Old patterns are optional.'),
  t('weekly_digest_tease', '04', 'Digest.', '{count} logged this week. Info, not a verdict.'),
  t('weekly_digest_tease', '05', 'Weekly.', 'The chart knows things. You decide what to do.'),

  // congrats
  t('congrats', '01', 'Nice.', '🎉 Longest stretch beaten. That is huge.', { confetti: true }),
  t('congrats', '02', 'Look at you.', '🎉 New personal best. Keep it ordinary.', { confetti: true }),
  t('congrats', '03', 'New best.', '🎉 {streakLabel} and a new high. You did that.', { confetti: true }),
  t('congrats', '04', 'Clean week.', '🎉 Seven quieter days. That is craft.', { confetti: true }),
  t('congrats', '05', 'You did that.', '🎉 No speech. Just respect.', { confetti: true }),

  // hydrate standalone
  t('hydrate_standalone', '01', 'Water.', 'Drink something. Then get back to it.'),
  t('hydrate_standalone', '02', 'Hydrate.', 'Your brain runs better with water in it.'),
  t('hydrate_standalone', '03', 'Drink.', 'Glass of water, then back to being a person.'),
  t('hydrate_standalone', '04', 'Water.', 'Thirst sneaks up. Fix it.'),
  t('hydrate_standalone', '05', 'Hydrate.', 'Simple maintenance. Do it.'),
  t('hydrate_standalone', '06', 'Refill.', 'Body first. Story later.'),

  // move standalone
  t('move_standalone', '01', 'Move.', 'Sixty seconds. Bar is on the floor.'),
  t('move_standalone', '02', 'Stand up.', 'Unstick from the chair.'),
  t('move_standalone', '03', 'Stretch.', 'Shoulders, jaw, whatever you have been clenching.'),
  t('move_standalone', '04', 'Walk.', 'Even to the kitchen counts.'),
  t('move_standalone', '05', 'Get up.', 'A short walk helps more than sitting with it.'),
  t('move_standalone', '06', 'Move.', 'Change posture. Next decision gets easier.'),

  // identity
  t('identity', '01', 'Hey.', "You keep logging. That is the whole trick."),
  t('identity', '02', 'Still here.', 'Showing up again is the win.'),
  t('identity', '03', 'You.', 'You keep receipts. That helps later.'),
  t('identity', '04', 'Hey.', "You're still in this. Keep going."),
  t('identity', '05', 'Still fighting.', 'Coming back counts. Do it again tomorrow.'),
  t('identity', '06', 'You.', "You've got this one."),
  t('identity', '07', 'Hey.', 'One hour at a time still works.'),
  t('identity', '08', 'Still here.', "You're the kind of person who comes back."),
];

const byFamily = new Map<FamilyId, Template[]>();
for (const template of TEMPLATES) {
  const list = byFamily.get(template.family) ?? [];
  list.push(template);
  byFamily.set(template.family, list);
}

export function templatesFor(family: FamilyId): Template[] {
  return byFamily.get(family) ?? [];
}

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Milestone offset ms → template id suffix used in banks */
export const MILESTONE_OFFSETS: { offsetMs: number; templateSuffix: string; congrats?: boolean }[] = [
  { offsetMs: 1 * 3_600_000, templateSuffix: '1h' },
  { offsetMs: 6 * 3_600_000, templateSuffix: '6h' },
  { offsetMs: 12 * 3_600_000, templateSuffix: '12h' },
  { offsetMs: 24 * 3_600_000, templateSuffix: '24h', congrats: true },
  { offsetMs: 48 * 3_600_000, templateSuffix: '48h', congrats: true },
  { offsetMs: 72 * 3_600_000, templateSuffix: '72h', congrats: true },
  { offsetMs: 7 * 86_400_000, templateSuffix: '7d', congrats: true },
  { offsetMs: 14 * 86_400_000, templateSuffix: '14d', congrats: true },
  { offsetMs: 30 * 86_400_000, templateSuffix: '30d', congrats: true },
  { offsetMs: 60 * 86_400_000, templateSuffix: '60d', congrats: true },
  { offsetMs: 90 * 86_400_000, templateSuffix: '90d', congrats: true },
  { offsetMs: 100 * 86_400_000, templateSuffix: '100d', congrats: true },
  { offsetMs: 365 * 86_400_000, templateSuffix: '365d', congrats: true },
];
