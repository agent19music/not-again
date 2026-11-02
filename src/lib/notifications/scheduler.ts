import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureChannels } from '@/lib/notifications/channels';
import type { PlannedNotification } from '@/lib/notifications/types';

export async function cancelByPrefix(prefix: string) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => {
        const cid = n.content.data?.clientId;
        return typeof cid === 'string' && cid.startsWith(prefix);
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function scheduleOne(item: PlannedNotification): Promise<PlannedNotification> {
  if (item.fireAt <= Date.now() + 2_000) return item;

  const osId = await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: item.body,
      sound: true,
      data: {
        clientId: item.clientId,
        family: item.family,
        templateId: item.templateId,
        kind: item.kind,
      },
      ...(Platform.OS === 'android'
        ? { channelId: item.channelId, color: '#FB7D55' }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(item.fireAt),
    },
  });

  return { ...item, osId };
}

/** Cancel engine-managed schedules and register the full next set. */
export async function applySchedule(next: PlannedNotification[]): Promise<PlannedNotification[]> {
  if (Platform.OS === 'web') return next;

  await ensureChannels();
  await cancelByPrefix('plan:');
  await cancelByPrefix('chain:');
  await cancelByPrefix('mile:');
  await cancelByPrefix('test:');

  const scheduled: PlannedNotification[] = [];
  for (const item of next) {
    if (item.fireAt <= Date.now() + 2_000) continue;
    try {
      scheduled.push(await scheduleOne(item));
    } catch {
      // continue
    }
  }
  return scheduled;
}

export async function scheduleAdditional(
  items: PlannedNotification[]
): Promise<PlannedNotification[]> {
  if (Platform.OS === 'web') return items;
  await ensureChannels();
  const out: PlannedNotification[] = [];
  for (const item of items) {
    if (item.fireAt <= Date.now() + 2_000) continue;
    try {
      out.push(await scheduleOne(item));
    } catch {
      // ignore
    }
  }
  return out;
}

export async function scheduleTestInSeconds(seconds = 5): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  await ensureChannels();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test.',
      body: 'Yep. Notifications work.',
      sound: true,
      data: { clientId: 'test:manual', family: 'identity', kind: 'test' },
      ...(Platform.OS === 'android' ? { channelId: 'care', color: '#FB7D55' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, seconds),
      repeats: false,
    },
  });
}
