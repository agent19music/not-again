/**
 * Fully local goon log. AsyncStorage is the only persistence, nothing leaves
 * the device. A tiny external store (subscribe/getSnapshot) keeps the Log and
 * Stats screens in sync without a context provider.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type GoonSessionStatus = 'active' | 'ended';

/** Reserved — no UI in v1. */
export type GoonSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: GoonSessionStatus;
};

export type GoonEntry = {
  id: string;
  /** epoch ms — when Save was tapped */
  createdAt: number;
  /** epoch ms — custom picker time, else createdAt */
  occurredAt: number;
  site?: string;
  subject?: string;
  /** Future link to GoonSession */
  sessionId?: string;
};

export type LogGoonInput = {
  site?: string;
  subject?: string;
  occurredAt?: number;
};

export type AnnotateGoonPatch = {
  site?: string;
  subject?: string;
  occurredAt?: number;
};

const STORAGE_KEY = 'gooned.entries.v1';

let entries: GoonEntry[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function sortByOccurredAtDesc(list: GoonEntry[]) {
  return [...list].sort((a, b) => b.occurredAt - a.occurredAt);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): GoonEntry[] {
  return entries;
}

export function ensureHydrated() {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve();
  hydrating = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      entries = raw ? sortByOccurredAtDesc(JSON.parse(raw) as GoonEntry[]) : [];
    } catch {
      entries = [];
    }
    hydrated = true;
    emit();
  })();
  return hydrating;
}

export function isHydrated() {
  return hydrated;
}

export async function logGoon(input: LogGoonInput = {}): Promise<GoonEntry> {
  const createdAt = Date.now();
  const entry: GoonEntry = {
    id: makeId(),
    createdAt,
    occurredAt: input.occurredAt ?? createdAt,
    site: input.site,
    subject: input.subject,
  };
  entries = sortByOccurredAtDesc([entry, ...entries]);
  emit();
  await persist();
  return entry;
}

export async function annotateEntry(id: string, patch: AnnotateGoonPatch) {
  entries = sortByOccurredAtDesc(
    entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
  );
  emit();
  await persist();
}

export async function deleteEntry(id: string) {
  entries = entries.filter((entry) => entry.id !== id);
  emit();
  await persist();
}

/** Re-inserts a previously deleted entry, kept in occurredAt order. Used by undo. */
export async function restoreEntry(entry: GoonEntry) {
  entries = sortByOccurredAtDesc([...entries, entry]);
  emit();
  await persist();
}
