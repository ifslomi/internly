'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import SplashScreen from './SplashScreen';
import type { ToastKind, ToastPayload } from '@/lib/toast';
import { showToast } from '@/lib/toast';
import { useApp } from '@/lib/context';
import { createPortal } from 'react-dom';

type UiToast = {
    id: string;
    title: string;
    message: string;
    kind: ToastKind;
    durationMs: number;
};

export default function ClientShell({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading, requiresPasswordCredentialSetup, setupPasswordCredential, logout } = useApp();
    const [showSplash, setShowSplash] = useState(true);
    const [showRouteLoader, setShowRouteLoader] = useState(false);
    const [toasts, setToasts] = useState<UiToast[]>([]);
    const [passwordSetupValue, setPasswordSetupValue] = useState('');
    const [passwordSetupConfirm, setPasswordSetupConfirm] = useState('');
    const [passwordSetupSaving, setPasswordSetupSaving] = useState(false);
    const [passwordSetupError, setPasswordSetupError] = useState('');
    const [mounted, setMounted] = useState(false);
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

    useEffect(() => {
        setMounted(true);
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

    useEffect(() => {
        if (!requiresPasswordCredentialSetup) {
            setPasswordSetupValue('');
            setPasswordSetupConfirm('');
            setPasswordSetupSaving(false);
            setPasswordSetupError('');
        }
    }, [requiresPasswordCredentialSetup]);

    const handlePasswordSetupSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setPasswordSetupError('');

        if (passwordSetupValue.length < 6) {
            setPasswordSetupError('Password must be at least 6 characters.');
            return;
        }

        if (passwordSetupValue !== passwordSetupConfirm) {
            setPasswordSetupError('Passwords do not match.');
            return;
        }

        setPasswordSetupSaving(true);
        try {
            await setupPasswordCredential(passwordSetupValue);
            showToast({ kind: 'success', title: 'Password Setup Complete', message: 'You can now log in with UB Mail or email and password.' });
            setPasswordSetupValue('');
            setPasswordSetupConfirm('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to set password. Please try again.';
            setPasswordSetupError(message);
            showToast({ kind: 'error', title: 'Password Setup Failed', message });
        } finally {
            setPasswordSetupSaving(false);
        }
    };

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
                <div
                    className="app-toast-stack"
                    aria-live="polite"
                    aria-atomic="false"
                    style={{
                        position: 'fixed',
                        right: 20,
                        bottom: 20,
                        left: 'auto',
                        top: 'auto',
                    }}
                >
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

            {mounted && user && !authLoading && !showSplash && requiresPasswordCredentialSetup && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 13000,
                        background: 'rgba(0, 0, 0, 0.62)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                    }}
                >
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 'min(520px, calc(100vw - 32px))',
                            background: 'rgba(24, 24, 27, 0.95)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 18,
                            boxShadow: 'var(--shadow-xl), var(--shadow-glow-lg)',
                            padding: 24,
                        }}
                    >
                        <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                            Set Your Password
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--slate-300)', marginBottom: 16, lineHeight: 1.6 }}>
                            Your UB Mail login is active. Add an email password now so both sign-in methods work.
                        </p>

                        <form onSubmit={handlePasswordSetupSubmit}>
                            <div className="input-group" style={{ marginBottom: 10 }}>
                                <label className="input-label" htmlFor="setup-password">New Password</label>
                                <input
                                    id="setup-password"
                                    className="input"
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordSetupValue}
                                    onChange={(e) => setPasswordSetupValue(e.target.value)}
                                    placeholder="At least 6 characters"
                                    required
                                />
                            </div>

                            <div className="input-group" style={{ marginBottom: 14 }}>
                                <label className="input-label" htmlFor="setup-password-confirm">Confirm Password</label>
                                <input
                                    id="setup-password-confirm"
                                    className="input"
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordSetupConfirm}
                                    onChange={(e) => setPasswordSetupConfirm(e.target.value)}
                                    placeholder="Re-enter password"
                                    required
                                />
                            </div>

                            {passwordSetupError && (
                                <div style={{
                                    marginBottom: 14,
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    border: '1px solid rgba(244,63,94,0.28)',
                                    background: 'rgba(244,63,94,0.12)',
                                    color: 'var(--rose-300)',
                                    fontSize: 13,
                                }}>
                                    {passwordSetupError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    disabled={passwordSetupSaving}
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                                    onClick={() => {
                                        logout();
                                        setPasswordSetupValue('');
                                        setPasswordSetupConfirm('');
                                        setPasswordSetupError('');
                                    }}
                                >
                                    Sign Out
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={passwordSetupSaving}>
                                    {passwordSetupSaving ? 'Saving...' : 'Save Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
