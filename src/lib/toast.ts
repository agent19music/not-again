import { dismissToast, pushToast, type ToastOptions } from '@/lib/toast-store';

function toastFn(title: string, options?: ToastOptions) {
  return pushToast('default', title, options);
}
toastFn.success = (title: string, options?: ToastOptions) => pushToast('success', title, options);
toastFn.error = (title: string, options?: ToastOptions) => pushToast('error', title, options);
toastFn.dismiss = dismissToast;

export const toast = toastFn;
