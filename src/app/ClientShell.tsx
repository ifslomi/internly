'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import SplashScreen from './SplashScreen';
import type { ToastKind, ToastPayload } from '@/lib/toast';

type UiToast = {
    id: string;
    title: string;
    message: string;
    kind: ToastKind;
    durationMs: number;
};

export default function ClientShell({ children }: { children: React.ReactNode }) {
    const [showSplash, setShowSplash] = useState(true);
    const [showRouteLoader, setShowRouteLoader] = useState(false);
    const [toasts, setToasts] = useState<UiToast[]>([]);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const START_THROTTLE_MS = 180;
    const SHOW_DELAY_MS = 120;
    const MIN_VISIBLE_MS = 340;
    const MAX_VISIBLE_MS = 12000;

    const navActiveRef = useRef(false);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visibleSinceRef = useRef<number>(0);
    const lastStartRef = useRef(0);
    const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const recentToastRef = useRef<Map<string, number>>(new Map());

    const TOAST_MAX = 5;
    const TOAST_RATE_LIMIT_MS = 900;

    const handleFinish = useCallback(() => {
        setShowSplash(false);
    }, []);

    const clearTimers = useCallback(() => {
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
        if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = toastTimersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            toastTimersRef.current.delete(id);
        }
    }, []);

    const pushToast = useCallback((payload: ToastPayload) => {
        const kind = payload.kind || 'info';
        const title = payload.title || (
            kind === 'success' ? 'Success' :
            kind === 'error' ? 'Error' :
            kind === 'warning' ? 'Warning' :
            'Notice'
        );

        const dedupeKey = `${kind}:${title}:${payload.message}`;
        const now = Date.now();
        const lastShown = recentToastRef.current.get(dedupeKey) || 0;
        if (now - lastShown < TOAST_RATE_LIMIT_MS) return;
        recentToastRef.current.set(dedupeKey, now);

        const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
        const durationMs = Math.min(Math.max(payload.durationMs ?? 3400, 1800), 9000);

        setToasts((prev) => {
            const next = [...prev, { id, title, message: payload.message, kind, durationMs }];
            return next.slice(-TOAST_MAX);
        });

        const timer = setTimeout(() => removeToast(id), durationMs);
        toastTimersRef.current.set(id, timer);
    }, [TOAST_MAX, TOAST_RATE_LIMIT_MS, removeToast]);

    const startRouteLoader = useCallback(() => {
        const now = Date.now();
        if (navActiveRef.current) return;
        if (now - lastStartRef.current < START_THROTTLE_MS) return;

        lastStartRef.current = now;
        navActiveRef.current = true;

        if (showTimerRef.current) clearTimeout(showTimerRef.current);
        showTimerRef.current = setTimeout(() => {
            visibleSinceRef.current = Date.now();
            setShowRouteLoader(true);
        }, SHOW_DELAY_MS);

        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(() => {
            navActiveRef.current = false;
            setShowRouteLoader(false);
        }, MAX_VISIBLE_MS);
    }, [MAX_VISIBLE_MS, SHOW_DELAY_MS, START_THROTTLE_MS]);

    const stopRouteLoader = useCallback(() => {
        navActiveRef.current = false;

        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }

        const elapsed = Date.now() - visibleSinceRef.current;
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            setShowRouteLoader(false);
            if (safetyTimerRef.current) {
                clearTimeout(safetyTimerRef.current);
                safetyTimerRef.current = null;
            }
        }, remaining);
    }, [MIN_VISIBLE_MS]);

    useEffect(() => {
        const key = `${pathname || ''}?${searchParams?.toString() || ''}`;
        if (key) stopRouteLoader();
    }, [pathname, searchParams, stopRouteLoader]);

    useEffect(() => {
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function (...args) {
            startRouteLoader();
            return originalPushState.apply(this, args);
        };

        window.history.replaceState = function (...args) {
            startRouteLoader();
            return originalReplaceState.apply(this, args);
        };

        const handlePopState = () => {
            startRouteLoader();
        };

        const handleManualStart = () => {
            startRouteLoader();
        };

        const handleManualStop = () => {
            stopRouteLoader();
        };

        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
            if (!anchor) return;
            if (anchor.target && anchor.target !== '_self') return;
            if (anchor.hasAttribute('download')) return;

            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

            try {
                const url = new URL(anchor.href, window.location.href);
                if (url.origin !== window.location.origin) return;
                const current = `${window.location.pathname}${window.location.search}`;
                const next = `${url.pathname}${url.search}`;
                if (current !== next) startRouteLoader();
            } catch {
                // Ignore malformed links
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('app:route-loading-start', handleManualStart as EventListener);
        window.addEventListener('app:route-loading-stop', handleManualStop as EventListener);
        document.addEventListener('click', handleDocumentClick, true);

        return () => {
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('app:route-loading-start', handleManualStart as EventListener);
            window.removeEventListener('app:route-loading-stop', handleManualStop as EventListener);
            document.removeEventListener('click', handleDocumentClick, true);
            clearTimers();
        };
    }, [clearTimers, startRouteLoader, stopRouteLoader]);

    useEffect(() => {
        const handleToast = (event: Event) => {
            const custom = event as CustomEvent<ToastPayload>;
            if (!custom.detail?.message) return;
            pushToast(custom.detail);
        };

        window.addEventListener('app:toast', handleToast as EventListener);
        return () => {
            window.removeEventListener('app:toast', handleToast as EventListener);
            toastTimersRef.current.forEach((timer) => clearTimeout(timer));
            toastTimersRef.current.clear();
        };
    }, [pushToast]);

    useEffect(() => {
        document.body.classList.toggle('splash-active', showSplash);
        return () => {
            document.body.classList.remove('splash-active');
        };
    }, [showSplash]);

    return (
        <>
            {showSplash && <SplashScreen onFinish={handleFinish} />}

            {showRouteLoader && !showSplash && (
                <div className="global-route-loader" role="status" aria-live="polite" aria-label="Loading page">
                    <div className="global-route-loader-bar" />
                    <div className="global-route-loader-dot" />
                </div>
            )}

            <div style={{ display: showSplash ? 'none' : 'contents' }}>
                {children}
            </div>

            {toasts.length > 0 && !showSplash && (
                <div className="app-toast-stack" aria-live="polite" aria-atomic="false">
                    {toasts.map((toast) => (
                        <div key={toast.id} className={`app-toast app-toast-${toast.kind}`} role="status">
                            <div className="app-toast-head">
                                <strong>{toast.title}</strong>
                                <button
                                    className="app-toast-close"
                                    onClick={() => removeToast(toast.id)}
                                    aria-label="Dismiss notification"
                                    type="button"
                                >
                                    x
                                </button>
                            </div>
                            <p>{toast.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
