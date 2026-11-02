import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ChannelId } from '@/lib/notifications/types';

const CHANNEL_DEFS: Record<
  ChannelId,
  { name: string; importance: Notifications.AndroidImportance; description: string }
> = {
  care: {
    name: 'Care',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Check-ins, wind-downs, and gentle nudges',
  },
  milestones: {
    name: 'Milestones',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Streak beats and congratulations',
  },
  chains: {
    name: 'After a log',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Follow-ups right after you log',
  },
  quotes: {
    name: 'Quotes',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Lines from your quote bank',
  },
};

let ensured = false;

export async function ensureChannels() {
  if (ensured || Platform.OS !== 'android') {
    ensured = true;
    return;
  }
  for (const [id, def] of Object.entries(CHANNEL_DEFS) as [
    ChannelId,
    (typeof CHANNEL_DEFS)[ChannelId],
  ][]) {
    await Notifications.setNotificationChannelAsync(id, {
      name: def.name,
      importance: def.importance,
      description: def.description,
      vibrationPattern: [0, 40, 80, 40],
      lightColor: '#FB7D55',
    });
  }
  ensured = true;
}

export function channelFor(id: ChannelId): ChannelId {
  return id;
}
