import { Platform } from 'react-native';

import { ensureHydrated, getSnapshot, subscribe } from '@/lib/goon-store';
import StreakWidget, { type StreakWidgetProps } from '@/widgets/streak-widget';

function snapshotProps(): StreakWidgetProps {
  return { lastOccurredAt: getSnapshot()[0]?.occurredAt ?? null };
}

/** Push the latest entry time. The home screen timer runs on its own after that. */
export async function pushStreakWidget() {
  if (Platform.OS === 'web') return;
  await ensureHydrated();
  StreakWidget.updateSnapshot(snapshotProps());
}

export function startStreakWidgetSync() {
  if (Platform.OS === 'web') return () => {};

  const push = () => {
    StreakWidget.updateSnapshot(snapshotProps());
  };

  const unsubscribe = subscribe(push);
  void ensureHydrated().then(push);

  return () => {
    unsubscribe();
  };
}
