export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastPayload {
  title?: string;
  message: string;
  kind?: ToastKind;
  durationMs?: number;
}

export function showToast(payload: ToastPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>('app:toast', { detail: payload }));
}
