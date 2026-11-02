import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ALL_FAMILIES,
  type FamilyId,
  type NotifPrefs,
} from '@/lib/notifications/types';

const STORAGE_KEY = 'gooned.notif-prefs.v1';

function defaultFamilies(): Record<FamilyId, boolean> {
  const out = {} as Record<FamilyId, boolean>;
  for (const id of ALL_FAMILIES) out[id] = true;
  return out;
}

export const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  dailyMin: 1,
  dailyMax: 4,
  quietStartMinutes: 23 * 60,
  quietEndMinutes: 7 * 60 + 30,
  families: defaultFamilies(),
  quotes: [],
  chainAfterLog: true,
};

let prefs: NotifPrefs = { ...DEFAULT_PREFS, families: defaultFamilies() };
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function mergePrefs(raw: Partial<NotifPrefs> | null): NotifPrefs {
  const families = { ...defaultFamilies(), ...(raw?.families ?? {}) };
  return {
    ...DEFAULT_PREFS,
    ...raw,
    families,
    dailyMin: 1,
    dailyMax: ([3, 4, 5] as const).includes(raw?.dailyMax as 3 | 4 | 5)
      ? (raw!.dailyMax as 3 | 4 | 5)
      : DEFAULT_PREFS.dailyMax,
    quotes: Array.isArray(raw?.quotes) ? raw!.quotes.filter((q) => typeof q === 'string') : [],
  };
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): NotifPrefs {
  return prefs;
}

export function ensureHydrated() {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve();
  hydrating = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      prefs = raw ? mergePrefs(JSON.parse(raw) as Partial<NotifPrefs>) : mergePrefs(null);
    } catch {
      prefs = mergePrefs(null);
    }
    hydrated = true;
    emit();
  })();
  return hydrating;
}

export async function setPrefs(patch: Partial<NotifPrefs>) {
  prefs = mergePrefs({ ...prefs, ...patch, families: { ...prefs.families, ...patch.families } });
  emit();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export async function setFamilyEnabled(family: FamilyId, enabled: boolean) {
  await setPrefs({ families: { ...prefs.families, [family]: enabled } });
}

export async function setQuotes(quotes: string[]) {
  await setPrefs({ quotes });
}

export function isFamilyEnabled(family: FamilyId): boolean {
  return prefs.families[family] !== false;
}
