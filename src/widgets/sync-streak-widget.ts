import { AppState, Platform } from 'react-native';

import { ensureHydrated, getSnapshot, subscribe } from '@/lib/goon-store';
import { buildTimeline, widgetState } from '@/widgets/hour-grid';
import StreakWidget from '@/widgets/streak-widget';

function lastOccurredAt(): number | null {
  return getSnapshot()[0]?.occurredAt ?? null;
}

/**
 * iOS: write a timeline with one entry per streak minute plus confetti frames
 * (hour-grid.ts). WidgetKit swaps entries on its own until the horizon, and the
 * app re-pushes on launch, on every log change and from the background task.
 *
 * Android: the snapshot carries lastOccurredAt; the native provider repaints
 * and schedules its own next update.
 */
function push() {
  const last = lastOccurredAt();
  const now = Date.now();
  if (Platform.OS === 'ios') {
    StreakWidget.updateTimeline(buildTimeline(last, now));
  } else {
    StreakWidget.updateSnapshot(widgetState(last, now));
  }
}

export async function pushStreakWidget() {
  if (Platform.OS === 'web') return;
  await ensureHydrated();
  push();
}

export function startStreakWidgetSync() {
  if (Platform.OS === 'web') return () => {};

  const unsubscribe = subscribe(push);
  void ensureHydrated().then(push);
  // Coming back to the app re-writes the timeline so it never runs dry.
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') push();
  });

  return () => {
    unsubscribe();
    appState.remove();
  };
}
