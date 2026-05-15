'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { getRememberedEmail } from '@/lib/storage';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
    const { login, user, loading, loginWithGoogle } = useApp();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        if (!loading && user) router.push('/dashboard');
    }, [user, loading, router]);

    useEffect(() => {
        const remembered = getRememberedEmail();
        if (remembered) {
            setEmail(remembered);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password, rememberMe);
            router.push('/dashboard');
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (firebaseErr.code === 'auth/user-not-found') {
                setError('No account found with this email.');
            } else if (firebaseErr.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
            } else {
                setError(firebaseErr.message || 'Login failed');
            }
        }
        setSubmitting(false);
    };

    return (
        <div className="grid-pattern" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background */}
            <div className="hero-glow" style={{ background: '#10b981', top: '20%', left: '10%' }} />
            <div className="hero-glow" style={{ background: '#14b8a6', bottom: '20%', right: '10%', width: 400, height: 400 }} />

            <div style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1, padding: '0 4px' }}>
                <div className="card-elevated auth-card" style={{}}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 22,
                            color: 'white',
                            margin: '0 auto 16px',
                        }}>I</div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
                        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                            Sign in to your Internly account
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(244,63,94,0.1)',
                            border: '1px solid rgba(244,63,94,0.2)',
                            color: 'var(--rose-400)',
                            fontSize: 13,
                            marginBottom: 20,
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group" style={{ marginBottom: 16 }}>
                            <label className="input-label" htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group" style={{ marginBottom: 16 }}>
                            <label className="input-label" htmlFor="login-password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
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

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 24,
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                color: 'var(--slate-400)',
                                cursor: 'pointer',
                            }}>
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
                                onClick={() => router.push('/forgot-password')}
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

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                            style={{ width: '100%', padding: '14px 24px' }}
                            id="login-submit"
                        >
                            {submitting ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 18,
                                        height: 18,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                    Signing in...
                                </span>
                            ) : (
                                <>
                                    <LogIn size={18} /> Sign In
                                </>
                            )}
                        </button>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </form>

                    <div className="divider" style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
                        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>

                    <button
                        type="button"
                        onClick={async () => {
                            setGoogleLoading(true);
                            setError('');
                            try {
                                await loginWithGoogle();
                                router.push('/dashboard');
                            } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
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
                        onMouseEnter={(e) => { if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    >
                        {googleLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                    width: 18,
                                    height: 18,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                Redirecting...
                            </span>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 48 48">
                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    <div style={{ height: 24 }} />

                    <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--slate-400)' }}>
                        Don&apos;t have an account?{' '}
                        <button
                            onClick={() => router.push('/signup')}
                            style={{
                                color: 'var(--primary-400)',
                                fontWeight: 600,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 14,
                            }}
                            id="login-signup-link"
                        >
                            Sign Up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
