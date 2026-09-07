import { useEffect, useSyncExternalStore } from 'react';

import { ensureHydrated, getSnapshot, isHydrated, subscribe, type GoonEntry } from '@/lib/goon-store';

export function useGoonEntries(): { entries: GoonEntry[]; ready: boolean } {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    ensureHydrated();
  }, []);

  return { entries, ready: isHydrated() };
}
