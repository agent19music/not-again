import { useEffect, useSyncExternalStore } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ensureHydrated,
  getSnapshot,
  setThemePreference,
  subscribe,
  type ThemePreference,
} from '@/lib/theme-store';

/** The user's explicit light/dark override, or `null` while following the system. */
export function useThemeMode(): { preference: ThemePreference; setPreference: typeof setThemePreference } {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    ensureHydrated();
  }, []);

  return { preference, setPreference: setThemePreference };
}

/** Effective color scheme: the explicit override if set, otherwise the system appearance. */
export function useResolvedScheme(): 'light' | 'dark' {
  const { preference } = useThemeMode();
  const system = useColorScheme();
  if (preference) return preference;
  return system === 'dark' ? 'dark' : 'light';
}
