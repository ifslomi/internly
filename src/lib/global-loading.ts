'use client';

function emit(eventName: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName));
}

export function beginGlobalLoading(): () => void {
  emit('app:global-loading-start');
  let finished = false;

  return () => {
    if (finished) return;
    finished = true;
    emit('app:global-loading-stop');
  };
}

export async function withGlobalLoading<T>(task: () => Promise<T>): Promise<T> {
  const endLoading = beginGlobalLoading();
  try {
    return await task();
  } finally {
    endLoading();
  }
}

