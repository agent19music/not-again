import AsyncStorage from '@react-native-async-storage/async-storage';

/** `null` means "follow the system appearance" until the user picks one explicitly. */
export type ThemePreference = 'light' | 'dark' | null;

const STORAGE_KEY = 'gooned.theme-preference.v1';

let preference: ThemePreference = null;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ThemePreference {
  return preference;
}

export function ensureHydrated() {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve();
  hydrating = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark') preference = raw;
    } catch {
      preference = null;
    }
    hydrated = true;
    emit();
  })();
  return hydrating;
}

export async function setThemePreference(next: ThemePreference) {
  preference = next;
  emit();
  if (next) {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
