import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { replan } from '@/lib/notifications/engine';
import { pushStreakWidget } from '@/widgets/sync-streak-widget';

export const NOTIF_RECONCILE_TASK = 'gooned-notif-reconcile';

TaskManager.defineTask(NOTIF_RECONCILE_TASK, async () => {
  try {
    await replan();
    await pushStreakWidget();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundReconcile() {
  if (Platform.OS === 'web') return;
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIF_RECONCILE_TASK);
  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(NOTIF_RECONCILE_TASK, {
      minimumInterval: 60 * 12, // minutes — daily-ish reconcile
    });
  }
}

export async function unregisterBackgroundReconcile() {
  if (Platform.OS === 'web') return;
  const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIF_RECONCILE_TASK);
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(NOTIF_RECONCILE_TASK);
  }
}
