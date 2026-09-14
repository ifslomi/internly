'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { getRememberedEmail } from '@/lib/storage';
import { Eye, EyeOff, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { navigateWithLoader, replaceWithLoader, startRouteLoading, stopRouteLoading } from '@/lib/route-loading';
import { createPortal } from 'react-dom';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
    const { login, user, loading, loginWithGoogle, signUp, signUpWithGoogle } = useApp();
    const router = useRouter();
    const searchParams = useSearchParams();

    const requestedMode = useMemo<AuthMode>(() => (searchParams.get('mode') === 'signup' ? 'signup' : 'login'), [searchParams]);
    const ubFlow = useMemo(() => searchParams.get('ubFlow'), [searchParams]);
    const [mode, setMode] = useState<AuthMode>(requestedMode);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [totalHours, setTotalHours] = useState(486);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [role, setRole] = useState<'intern' | 'dean'>('intern');
    const [rememberMe, setRememberMe] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [policyModal, setPolicyModal] = useState<'Privacy' | 'Terms' | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showUbPopupModal, setShowUbPopupModal] = useState(false);
    const [ubPopupTimedOut, setUbPopupTimedOut] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMode(requestedMode);
    }, [requestedMode]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!googleLoading || mode !== 'login') {
            setUbPopupTimedOut(false);
            return;
        }

        const timer = setTimeout(() => {
            setUbPopupTimedOut(true);
        }, 9000);

        return () => clearTimeout(timer);
    }, [googleLoading, mode]);

    useEffect(() => {
                if (!loading && user) {
            const destination = user.role === 'dean' ? '/dean-dashboard/ojt-profiles' : '/dashboard';
            navigateWithLoader(router, destination);
        }
    }, [user, loading, router]);

    useEffect(() => {
        const remembered = getRememberedEmail();
        if (remembered) {
            setEmail(remembered);
            setRememberMe(true);
        }
    }, []);

    useEffect(() => {
        if (mode !== 'login' || ubFlow !== 'redirect' || loading || !!user || googleLoading) return;

        let cancelled = false;
        const startRedirectFlow = async () => {
            setGoogleLoading(true);
            setShowUbPopupModal(true);
            setUbPopupTimedOut(false);
            startRouteLoading();
            try {
                await loginWithGoogle({ preferRedirect: true });
            } catch (err: unknown) {
                if (cancelled) return;
                const firebaseErr = err as { code?: string; message?: string };
                const msg =
                    firebaseErr.code === 'auth/unauthorized-domain'
                        ? 'This domain is not authorized in Firebase Auth. Add your Vercel domain in Firebase Console > Authentication > Settings > Authorized domains. Also disable ad blockers and try Chrome or Safari; Brave shields can block this flow.'
                        : err instanceof Error
                            ? err.message
                            : 'UB Mail redirect sign-in failed. Disable ad blockers and try Chrome or Safari. Brave shields can block this flow.';
                showToast({ kind: 'error', title: 'UB Mail Sign-in Failed', message: msg });
                setShowUbPopupModal(false);
                setGoogleLoading(false);
                stopRouteLoading();
            }
        };

        void startRedirectFlow();

        return () => {
            cancelled = true;
        };
    }, [googleLoading, loading, loginWithGoogle, mode, ubFlow, user]);

    const openUbFallbackTab = () => {
        const tab = window.open('/login?ubFlow=redirect', '_blank', 'noopener,noreferrer');

        if (!tab) {
            showToast({
                kind: 'error',
                title: 'New Tab Blocked',
                message: 'Your browser blocked opening a new tab. Allow popups/new tabs, disable ad blocker extensions, and try Chrome or Safari. Brave shields can block this flow.',
            });
            return false;
        }

        showToast({
            kind: 'info',
            title: 'Fallback Started',
            message: 'Opened UB Mail sign-in in a new tab. Complete login there.',
        });
        setShowUbPopupModal(false);
        setGoogleLoading(false);
        stopRouteLoading();
        return true;
    };

    const switchAuthMode = (nextMode: AuthMode) => {
        if (nextMode === mode) return;
        setShowPassword(false);
        setGoogleLoading(false);
        setShowUbPopupModal(false);
        setMode(nextMode);
        replaceWithLoader(router, nextMode === 'signup' ? '/login?mode=signup' : '/login', { scroll: false });
    };

    const isUbEmail = (value: string) => value.trim().toLowerCase().endsWith('@ub.edu.ph');
    const blockNonIntegerKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (['e', 'E', '+', '-', '.', ',', ' '].includes(event.key)) {
            event.preventDefault();
        }
    };
    const sanitizeInteger = (value: string, fallback: number, min = 1) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return fallback;
        return Math.max(min, Number(digits));
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        startRouteLoading();
        try {
            await login(email, password, rememberMe);
            showToast({ kind: 'success', title: 'Welcome Back', message: 'Login successful.' });
            // Will be handled by useEffect above
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
                showToast({ kind: 'error', title: 'Login Failed', message: 'Invalid email or password.' });
            } else if (firebaseErr.code === 'auth/user-not-found') {
                showToast({ kind: 'error', title: 'Login Failed', message: 'No account found with this email.' });
            } else if (firebaseErr.code === 'auth/too-many-requests') {
                showToast({ kind: 'warning', title: 'Too Many Attempts', message: 'Please try again later.' });
            } else {
                showToast({ kind: 'error', title: 'Login Failed', message: firebaseErr.message || 'Login failed.' });
            }
            stopRouteLoading();
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignUpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!agreedTerms) {
            showToast({ kind: 'error', title: 'Sign Up Failed', message: 'You must agree to the Terms of Service and Privacy Policy.' });
            return;
        }
        if (role !== 'dean' && !isUbEmail(email)) {
            showToast({ kind: 'error', title: 'Sign Up Failed', message: 'Please use your @ub.edu.ph email address.' });
            return;
        }
        if (password !== confirmPassword) {
            showToast({ kind: 'error', title: 'Sign Up Failed', message: 'Passwords do not match.' });
            return;
        }
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (password.length < 8 || !hasUpperCase || !hasNumber) {
            showToast({ 
                kind: 'error', 
                title: 'Weak Password', 
                message: 'Password must be at least 8 characters long and contain both an uppercase letter and a number.' 
            });
            return;
        }
        if (totalHours < 1) {
            showToast({ kind: 'error', title: 'Sign Up Failed', message: 'Total required hours must be at least 1.' });
            return;
        }

        setSubmitting(true);
        try {
            await signUp(name, email, password, totalHours, startDate, role);
            if (role === 'dean') {
                showToast({ kind: 'success', title: 'Account Created', message: 'Dean account created successfully.' });
                navigateWithLoader(router, '/dean-dashboard/ojt-profiles');
            } else {
                showToast({ kind: 'success', title: 'Account Created', message: 'Verify your UB email to continue.' });
                navigateWithLoader(router, '/verify-email');
            }
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/email-already-in-use') {
                showToast({ kind: 'error', title: 'Sign Up Failed', message: 'An account with this email already exists.' });
            } else {
                showToast({ kind: 'error', title: 'Sign Up Failed', message: firebaseErr.message || 'Sign up failed' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="grid-pattern"
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div className="hero-glow" style={{ background: '#10b981', top: '20%', left: '10%' }} />
            <div className="hero-glow" style={{ background: '#14b8a6', bottom: '20%', right: '10%', width: 400, height: 400 }} />

            <div
                id="auth-shell"
                style={{
                    maxWidth: 1200,
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1.08fr minmax(460px, 560px)',
                    gap: 26,
                    alignItems: 'center',
                }}
            >
                <div
                    id="auth-brand"
                    style={{
                        padding: '22px 26px',
                        minHeight: 620,
                        borderRadius: 34,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'linear-gradient(160deg, rgba(24,24,27,0.84), rgba(24,24,27,0.62))',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.74), rgba(6,95,70,0.76) 62%, rgba(24,24,27,0.72) 100%)', left: -250, top: -220, filter: 'blur(0.5px)' }} />
                    <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle at 28% 28%, rgba(52,211,153,0.95), rgba(6,95,70,0.85))', left: 34, bottom: 52, boxShadow: '0 22px 70px rgba(16,185,129,0.28)' }} />
                    <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(74,222,128,0.75), rgba(4,120,87,0.8))', right: 34, top: 110, opacity: 0.88 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(24,24,27,0.18) 20%, rgba(24,24,27,0.58) 60%, rgba(24,24,27,0.88) 100%)' }} />

                    <div style={{ position: 'relative', zIndex: 2, maxWidth: 440, paddingLeft: 16 }}>
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 18,
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 28,
                                color: 'white',
                                marginBottom: 20,
                                boxShadow: '0 14px 40px rgba(16,185,129,0.28)',
                            }}
                        >
                            I
                        </div>
                        <h1 style={{ fontSize: 44, lineHeight: 1.05, fontWeight: 800, marginBottom: 10, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                            Welcome
                        </h1>
                        <p style={{ color: 'rgba(236,253,245,0.88)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 12, marginBottom: 18 }}>
                            Internly System Portal
                        </p>
                        <p style={{ color: 'var(--slate-300)', fontSize: 15, lineHeight: 1.72, maxWidth: 420, marginBottom: 22 }}>
                            {mode === 'login'
                                ? 'Sign in to continue tracking your internship progress, work logs, and weekly submissions.'
                                : 'Create your account to organize hours, daily outputs, and weekly reports from one streamlined dashboard.'}
                        </p>
                        <h2 style={{ fontSize: 22, lineHeight: 1.28, fontWeight: 700, color: 'white', maxWidth: 420 }}>
                            OJT Hours Monitoring and Training Management
                        </h2>
                    </div>
                </div>

                <div style={{ width: '100%', padding: '0 4px' }}>
                    <div className="card-elevated auth-card" style={{ borderRadius: 24, minHeight: 620, paddingTop: 24 }}>
                        <div key={mode} style={{ animation: 'authModeSwap 220ms ease both' }}>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>
                                    {mode === 'login' ? 'Sign in' : 'Sign up'}
                                </h1>
                                <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>
                                    {mode === 'login' ? 'Access your Internly account' : 'Create your Internly account'}
                                </p>
                            </div>

                            {mode === 'login' ? (
                                <form onSubmit={handleLoginSubmit}>
                                    <div className="input-group" style={{ marginBottom: 12 }}>
                                        <label className="input-label" htmlFor="auth-email">Email</label>
                                        <input
                                            id="auth-email"
                                            className="input"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="input-group" style={{ marginBottom: 12 }}>
                                        <label className="input-label" htmlFor="auth-password">Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="auth-password"
                                                className="input"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                style={{ paddingRight: 44 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: 12,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--slate-500)',
                                                    cursor: 'pointer',
                                                    padding: 4,
                                                }}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-400)', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                className="checkbox-custom"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            Remember me
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => navigateWithLoader(router, '/forgot-password')}
                                            style={{
                                                color: 'var(--primary-400)',
                                                fontWeight: 600,
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: 13,
                                            }}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', padding: '13px 20px' }}>
                                        {submitting ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTopColor: 'white',
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite',
                                                    }}
                                                />
                                                Signing in...
                                            </span>
                                        ) : (
                                            <>
                                                <LogIn size={18} /> Sign In
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSignUpSubmit}>
                                    <div id="signup-account-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="signup-name">Full Name</label>
                                            <input
                                                id="signup-name"
                                                className="input"
                                                type="text"
                                                placeholder="Juan Dela Cruz"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="signup-email">UB Email</label>
                                            <input
                                                id="signup-email"
                                                className="input"
                                                type="email"
                                                placeholder="you@ub.edu.ph"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div id="signup-passwords-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="signup-password">Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    id="signup-password"
                                                    className="input"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Min 8 chars, A-Z, 0-9"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    style={{ paddingRight: 40 }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: 10,
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--slate-500)',
                                                        cursor: 'pointer',
                                                        padding: 4,
                                                    }}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="signup-confirm">Confirm Password</label>
                                            <input
                                                id="signup-confirm"
                                                className="input"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Re-enter password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div id="signup-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="signup-hours">Total Hours</label>
                                            <input
                                                id="signup-hours"
                                                className="input"
                                                type="number"
                                                min={1}
                                                max={5000}
                                                inputMode="numeric"
                                                onKeyDown={blockNonIntegerKeys}
                                                value={totalHours}
                                                onChange={(e) => setTotalHours(sanitizeInteger(e.target.value, 1, 1))}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="signup-startdate">Start Date</label>
                                            <input
                                                id="signup-startdate"
                                                className="input"
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                                        <input
                                            type="checkbox"
                                            id="signup-agree"
                                            checked={agreedTerms}
                                            onChange={(e) => setAgreedTerms(e.target.checked)}
                                            style={{
                                                marginTop: 3,
                                                width: 16,
                                                height: 16,
                                                accentColor: 'var(--primary-500)',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <label htmlFor="signup-agree" style={{ fontSize: 13, color: 'var(--slate-400)', lineHeight: 1.45, cursor: 'pointer' }}>
                                            I agree to the{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setPolicyModal('Terms');
                                                }}
                                                style={{ color: 'var(--primary-400)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                                            >
                                                Terms of Service
                                            </button>{' '}
                                            and{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setPolicyModal('Privacy');
                                                }}
                                                style={{ color: 'var(--primary-400)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                                            >
                                                Privacy Policy
                                            </button>
                                        </label>
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', padding: '13px 20px' }}>
                                        {submitting ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTopColor: 'white',
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite',
                                                    }}
                                                />
                                                Creating account...
                                            </span>
                                        ) : (
                                            <>
                                                <UserPlus size={18} /> Create Account
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <div className="divider" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                                <span style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
                                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    if (mode === 'signup') {
                                        if (!agreedTerms) {
                                            showToast({ kind: 'error', title: 'UB Mail Sign-up Failed', message: 'You must agree to the Terms of Service and Privacy Policy.' });
                                            return;
                                        }
                                        if (password !== confirmPassword) {
                                            showToast({ kind: 'error', title: 'UB Mail Sign-up Failed', message: 'Passwords do not match.' });
                                            return;
                                        }
                                        const hasUpperCase = /[A-Z]/.test(password);
                                        const hasNumber = /\d/.test(password);
                                        if (password.length < 8 || !hasUpperCase || !hasNumber) {
                                            showToast({ 
                                                kind: 'error', 
                                                title: 'UB Mail Sign-up Failed', 
                                                message: 'Password must be at least 8 characters long and contain both an uppercase letter and a number.' 
                                            });
                                            return;
                                        }
                                    }

                                    setGoogleLoading(true);
                                    if (mode === 'login') {
                                        setShowUbPopupModal(true);
                                        setUbPopupTimedOut(false);
                                        startRouteLoading();
                                    }

                                    try {
                                        if (mode === 'login') {
                                            await loginWithGoogle();
                                            showToast({ kind: 'success', title: 'Welcome Back', message: 'UB Mail login successful.' });
                                            // Let the auth listener redirect based on role (dean -> /dean-dashboard)
                                        } else {
                                            await signUpWithGoogle(password, role);
                                            if (role === 'dean') {
                                                showToast({ kind: 'success', title: 'Account Created', message: 'Dean account created successfully.' });
                                                navigateWithLoader(router, '/dean-dashboard/ojt-profiles');
                                            } else {
                                                showToast({ kind: 'success', title: 'Account Created', message: 'Verify your UB email to continue.' });
                                                navigateWithLoader(router, '/verify-email');
                                            }
                                        }
                                    } catch (err: unknown) {
                                        const firebaseErr = err as { code?: string; message?: string };
                                        const msg =
                                            firebaseErr.code === 'auth/popup-closed-by-user'
                                                ? 'Popup closed before sign-in completed.'
                                                : firebaseErr.code === 'auth/popup-blocked'
                                                    ? 'Popup was blocked by your browser. Allow popups, disable ad blocker extensions, and try Chrome or Safari. Brave shields can block this flow.'
                                                : firebaseErr.code === 'auth/unauthorized-domain'
                                                    ? 'This domain is not authorized in Firebase Auth. Add your Vercel domain in Firebase Console > Authentication > Settings > Authorized domains. Disable ad blockers and try Chrome or Safari; Brave shields can block this flow.'
                                                    : err instanceof Error
                                                        ? err.message
                                                        : mode === 'login'
                                                            ? 'UB Mail sign-in failed. Please try again.'
                                                            : 'UB Mail sign-up failed. Please try again.';
                                        showToast({ kind: 'error', title: mode === 'login' ? 'UB Mail Sign-in Failed' : 'UB Mail Sign-up Failed', message: msg });
                                        if (
                                            mode === 'login' &&
                                            (
                                                firebaseErr.code === 'auth/popup-blocked' ||
                                                firebaseErr.code === 'auth/popup-closed-by-user' ||
                                                firebaseErr.code === 'auth/cancelled-popup-request'
                                            )
                                        ) {
                                            const opened = openUbFallbackTab();
                                            if (!opened) {
                                                setUbPopupTimedOut(true);
                                                setShowUbPopupModal(true);
                                            }
                                        }
                                        if (mode === 'login') {
                                            stopRouteLoading();
                                        }
                                        if (
                                            mode !== 'login' ||
                                            (
                                                firebaseErr.code !== 'auth/popup-blocked' &&
                                                firebaseErr.code !== 'auth/popup-closed-by-user' &&
                                                firebaseErr.code !== 'auth/cancelled-popup-request'
                                            )
                                        ) {
                                            setShowUbPopupModal(false);
                                        }
                                    } finally {
                                        setGoogleLoading(false);
                                    }
                                }}
                                disabled={googleLoading}
                                style={{
                                    width: '100%',
                                    padding: '12px 24px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: 'white',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: googleLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    transition: 'all 150ms',
                                    opacity: googleLoading ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                }}
                            >
                                {googleLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span
                                            style={{
                                                width: 18,
                                                height: 18,
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                            }}
                                        />
                                        Redirecting...
                                    </span>
                                ) : (
                                    <>
                                        <Mail size={18} />
                                        {mode === 'login' ? 'Continue with UB Mail' : 'Continue with UB Mail'}
                                    </>
                                )}
                            </button>

                            <div style={{ height: 14 }} />

                            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--slate-400)', marginTop: 8 }}>
                                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                                <button
                                    onClick={() => switchAuthMode(mode === 'login' ? 'signup' : 'login')}
                                    className="auth-toggle-btn"
                                >
                                    {mode === 'login' ? 'Sign Up' : 'Log In'}
                                </button>
                            </p>

                        </div>
                    </div>
                </div>
            </div>

            {policyModal && (
                <div
                    onClick={() => setPolicyModal(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        animation: 'signupPolicyFadeIn 200ms ease',
                    }}
                >
                    <style>{`@keyframes signupPolicyFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes signupPolicySlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            padding: 32,
                            maxWidth: 520,
                            width: '100%',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            position: 'relative',
                            animation: 'signupPolicySlideUp 250ms ease',
                        }}
                    >
                        <button
                            onClick={() => setPolicyModal(null)}
                            style={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                background: 'rgba(255,255,255,0.06)',
                                border: 'none',
                                borderRadius: 8,
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--slate-400)',
                                transition: 'background 150ms',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                            <X size={16} />
                        </button>

                        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: 'white' }}>
                            {policyModal === 'Privacy' ? 'Privacy Policy' : 'Terms of Service'}
                        </h3>

                        <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--slate-400)' }}>
                            {policyModal === 'Privacy' && (
                                <>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Effective Date:</strong> January 1, 2026</p>
                                    <p style={{ marginBottom: 12 }}>Internly is committed to protecting your privacy. All data you enter, including daily logs, hour records, and personal information, is stored locally on your device using browser storage.</p>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Data Collection:</strong> We do not collect, transmit, or store your data on any external server. Everything stays on your browser.</p>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Cookies:</strong> Internly does not use tracking cookies or third-party analytics.</p>
                                    <p><strong style={{ color: 'var(--slate-200)' }}>Your Control:</strong> You can delete all your data at any time by clearing your browser&apos;s local storage.</p>
                                </>
                            )}
                            {policyModal === 'Terms' && (
                                <>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Effective Date:</strong> January 1, 2026</p>
                                    <p style={{ marginBottom: 12 }}>By using Internly, you agree to the following terms:</p>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>1. Purpose:</strong> Internly is a web-based tool designed to help on-the-job training participants track hours, log activities, and generate weekly reports.</p>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>2. Data Responsibility:</strong> All data is stored locally. You are responsible for maintaining and backing up your records.</p>
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>3. No Warranty:</strong> Internly is provided as is without warranties of any kind. We are not liable for data loss resulting from browser resets or device changes.</p>
                                    <p><strong style={{ color: 'var(--slate-200)' }}>4. Modifications:</strong> We reserve the right to update these terms at any time. Continued use of the app constitutes acceptance of any changes.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {mode === 'login' && showUbPopupModal && mounted && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 12000,
                        background: 'rgba(0, 0, 0, 0.58)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                    }}
                    onClick={() => { if (!googleLoading) setShowUbPopupModal(false); }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            maxWidth: 420,
                            width: 'calc(100vw - 40px)',
                            minHeight: 180,
                            padding: 28,
                            borderRadius: 20,
                            background: 'rgba(24, 24, 27, 0.92)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: 'var(--shadow-xl), var(--shadow-glow-lg)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 16,
                        }}
                    >
                        <span
                            aria-hidden
                            style={{
                                width: 46,
                                height: 46,
                                border: '3px solid rgba(255,255,255,0.2)',
                                borderTopColor: 'var(--primary-400)',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }}
                        />
                        <p style={{ fontSize: 14, color: 'var(--slate-300)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                            {ubPopupTimedOut
                                ? 'Still waiting. If the popup is open, finish sign-in there. If it was closed, try UB Mail again.'
                                : 'Signing in with UB Mail. Please complete sign-in in the popup window.'}
                        </p>
                        {ubPopupTimedOut && (
                            <>
                                <button
                                    type="button"
                                    onClick={openUbFallbackTab}
                                    style={{
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'rgba(255,255,255,0.08)',
                                        color: 'white',
                                        borderRadius: 10,
                                        padding: '10px 14px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Open sign-in in new tab
                                </button>
                                <a
                                    href="/login?ubFlow=redirect"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--primary-300)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        textDecoration: 'underline',
                                        textUnderlineOffset: 3,
                                    }}
                                >
                                    Open fallback in a new tab manually
                                </a>
                            </>
                        )}
                    </div>
                </div>,
                document.body,
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes authModeSwap {
                    from { opacity: 0; transform: translateY(10px) scale(0.99); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @media (max-width: 1180px) {
                    #auth-shell {
                        grid-template-columns: 1fr !important;
                        max-width: 640px !important;
                        gap: 20px !important;
                    }
                    #auth-brand {
                        min-height: 420px !important;
                        padding: 20px !important;
                        border-radius: 24px !important;
                    }
                    #auth-brand h1 {
                        font-size: 34px !important;
                    }
                    #signup-account-grid,
                    #signup-passwords-grid,
                    #signup-details-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .auth-card {
                        min-height: auto !important;
                    }
                }
                .auth-toggle-btn {
                    color: var(--primary-400);
                    font-weight: 700;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 0 4px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    text-underline-offset: 4px;
                }
                .auth-toggle-btn:hover {
                    color: var(--primary-300);
                    text-decoration: underline;
                    transform: translateY(-1px);
                }
                .auth-toggle-btn:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
}
