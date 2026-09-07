export type ToastVariant = 'default' | 'success' | 'error';

export type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  description?: string;
  /** ms, or `Infinity` to require manual dismissal. */
  duration?: number;
  action?: ToastAction;
  id?: string;
};

export type ToastItem = {
  id: string;
  title: string;
  variant: ToastVariant;
  description?: string;
  duration: number;
  action?: ToastAction;
};

const DEFAULT_DURATION = 3200;

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ToastItem[] {
  return toasts;
}

export function pushToast(variant: ToastVariant, title: string, options?: ToastOptions): string {
  const id = options?.id ?? makeId();
  const item: ToastItem = {
    id,
    title,
    variant,
    description: options?.description,
    action: options?.action,
    duration: options?.duration ?? DEFAULT_DURATION,
  };
  toasts = [...toasts.filter((t) => t.id !== id), item];
  emit();
  return id;
}

export function dismissToast(id?: string) {
  toasts = id ? toasts.filter((t) => t.id !== id) : [];
  emit();
}
