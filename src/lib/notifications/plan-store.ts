import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FiredRecord, PlannedNotification, PlanState } from '@/lib/notifications/types';

const STORAGE_KEY = 'gooned.notif-plan.v1';
const MAX_RECENT = 80;

function makeSalt() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyState(): PlanState {
  return {
    installSalt: makeSalt(),
    planned: [],
    recentFired: [],
    lastAppOpenAt: 0,
    lastReplanAt: 0,
  };
}

let state: PlanState = emptyState();
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): PlanState {
  return state;
}

export function ensureHydrated() {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve();
  hydrating = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlanState;
        state = {
          ...emptyState(),
          ...parsed,
          planned: Array.isArray(parsed.planned) ? parsed.planned : [],
          recentFired: Array.isArray(parsed.recentFired) ? parsed.recentFired : [],
          installSalt: parsed.installSalt || makeSalt(),
        };
      } else {
        state = emptyState();
        await persist();
      }
    } catch {
      state = emptyState();
    }
    hydrated = true;
    emit();
  })();
  return hydrating;
}

export async function setPlanned(planned: PlannedNotification[]) {
  state = { ...state, planned, lastReplanAt: Date.now() };
  emit();
  await persist();
}

export async function upsertPlanned(items: PlannedNotification[]) {
  const byId = new Map(state.planned.map((p) => [p.clientId, p]));
  for (const item of items) byId.set(item.clientId, item);
  await setPlanned(Array.from(byId.values()));
}

export async function removePlannedByPrefix(prefix: string) {
  await setPlanned(state.planned.filter((p) => !p.clientId.startsWith(prefix)));
}

export async function removePlannedByIds(ids: string[]) {
  const drop = new Set(ids);
  await setPlanned(state.planned.filter((p) => !drop.has(p.clientId)));
}

export async function markFired(record: FiredRecord) {
  const recentFired = [record, ...state.recentFired].slice(0, MAX_RECENT);
  state = { ...state, recentFired };
  emit();
  await persist();
}

export async function touchAppOpen() {
  state = { ...state, lastAppOpenAt: Date.now() };
  emit();
  await persist();
}

export function recentTemplateIds(withinMs: number, now = Date.now()): Set<string> {
  const ids = new Set<string>();
  for (const r of state.recentFired) {
    if (now - r.firedAt <= withinMs) ids.add(r.templateId);
  }
  // Also treat still-scheduled future items as "used" for anti-echo today
  for (const p of state.planned) {
    if (p.fireAt >= now - withinMs) ids.add(p.templateId);
  }
  return ids;
}

export function recentFamiliesToday(now = Date.now()): Set<string> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  const families = new Set<string>();
  for (const r of state.recentFired) {
    if (r.firedAt >= startMs) families.add(r.family);
  }
  for (const p of state.planned) {
    if (p.fireAt >= startMs && p.fireAt < startMs + 86_400_000) families.add(p.family);
  }
  return families;
}
