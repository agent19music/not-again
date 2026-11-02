import { useSyncExternalStore } from 'react';

import * as prefsStore from '@/lib/notifications/prefs-store';
import type { NotifPrefs } from '@/lib/notifications/types';

prefsStore.ensureHydrated();

export function useNotifPrefs(): NotifPrefs {
  return useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getSnapshot);
}
