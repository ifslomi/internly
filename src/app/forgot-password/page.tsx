'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { navigateWithLoader } from '@/lib/route-loading';
import * as storage from '@/lib/storage';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const normalizedEmail = email.trim().toLowerCase();

        try {
            const { sendPasswordResetEmail, fetchSignInMethodsForEmail } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');

            const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
            const localOnlyUser = storage.findUserByEmail(normalizedEmail);

            if (signInMethods.length === 0 && localOnlyUser) {
                throw Object.assign(new Error('This account was created in local mode and cannot receive Firebase reset emails. Please sign in normally, then change your password in Settings.'), {
                    code: 'auth/local-only-account',
                });
            }

            if (signInMethods.length > 0) {
                await sendPasswordResetEmail(auth, normalizedEmail, {
                    url: `${appBaseUrl}/login`,
                    handleCodeInApp: false,
                });
            }

            setSent(true);
            showToast({ kind: 'success', title: 'Email Sent', message: 'If the account exists, a reset link was sent. Check your inbox and spam folder.' });
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/invalid-email') {
                // Don't reveal whether the email exists — just show success anyway
                setSent(true);
                showToast({ kind: 'success', title: 'Email Sent', message: 'If the account exists, a reset link was sent.' });
            } else if (firebaseErr.code === 'auth/local-only-account') {
                const message = firebaseErr.message || 'This account cannot receive reset emails.';
                setError(message);
                showToast({ kind: 'warning', title: 'Reset Not Available', message });
            } else if (firebaseErr.code === 'auth/unauthorized-continue-uri' || firebaseErr.code === 'auth/invalid-continue-uri') {
                const message = 'Password reset is not configured for this domain in Firebase Auth. Add this app domain to Authorized domains in Firebase Console.';
                setError(message);
                showToast({ kind: 'error', title: 'Firebase Domain Config Needed', message });
            } else if (firebaseErr.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
                showToast({ kind: 'warning', title: 'Too Many Attempts', message: 'Please try again later.' });
            } else {
                setError(firebaseErr.message || 'Failed to send reset email.');
                showToast({ kind: 'error', title: 'Request Failed', message: firebaseErr.message || 'Failed to send reset email.' });
            }
        }

        setSubmitting(false);
    };

    const maskedEmail = email
        ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c)
        : '';

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
            <div className="hero-glow" style={{ background: '#10b981', top: '20%', left: '10%' }} />
            <div className="hero-glow" style={{ background: '#14b8a6', bottom: '20%', right: '10%', width: 400, height: 400 }} />

            <div style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1, padding: '0 4px' }}>
                <button
                    className="btn btn-ghost"
                    onClick={() => navigateWithLoader(router, '/login')}
                    style={{ marginBottom: 32, color: 'var(--slate-400)' }}
                >
                    <ArrowLeft size={18} /> Back to login
                </button>

                <div className="card-elevated auth-card">
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: sent ? 'rgba(34,197,94,0.12)' : 'rgba(16,185,129,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            transition: 'background 300ms',
                        }}>
                            {sent
                                ? <CheckCircle size={28} style={{ color: '#4ade80' }} />
                                : <Mail size={28} style={{ color: 'var(--primary-400)' }} />
                            }
                        </div>

                        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                            {sent ? 'Check your email' : 'Reset your password'}
                        </h1>
                        <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6 }}>
                            {sent
                                ? <>We sent a password reset link to</>
                                : <>Enter the email address associated with your account and we&apos;ll send you a link to reset your password.</>
                            }
                        </p>
                        {sent && (
                            <p style={{
                                color: 'var(--primary-300)',
                                fontSize: 15,
                                fontWeight: 600,
                                marginTop: 4,
                                wordBreak: 'break-all',
                            }}>
                                {maskedEmail}
                            </p>
                        )}
                    </div>

                    {!sent ? (
                        <>
                            {error && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(244,63,94,0.1)',
                                    border: '1px solid rgba(244,63,94,0.2)',
                                    color: 'var(--rose-400)',
                                    fontSize: 13,
                                    marginBottom: 16,
                                    textAlign: 'center',
                                }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="input-group" style={{ marginBottom: 20 }}>
                                    <label className="input-label" htmlFor="reset-email">Email address</label>
                                    <input
                                        id="reset-email"
                                        className="input"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting || !email}
                                    style={{
                                        width: '100%',
                                        padding: '14px 24px',
                                        opacity: submitting || !email ? 0.6 : 1,
                                        cursor: submitting || !email ? 'not-allowed' : 'pointer',
                                    }}
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
                                            Sending...
                                        </span>
                                    ) : (
                                        <>
                                            <Send size={18} /> Send Reset Link
                                        </>
                                    )}
                                </button>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </form>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{
                                padding: '16px 20px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(34,197,94,0.08)',
                                border: '1px solid rgba(34,197,94,0.2)',
                                color: '#4ade80',
                                fontSize: 13,
                                lineHeight: 1.6,
                                textAlign: 'center',
                            }}>
                                Click the link in the email to set a new password. If you don&apos;t see it, check your spam folder.
                            </div>

                            <button
                                onClick={() => navigateWithLoader(router, '/login')}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '14px 24px' }}
                            >
                                Back to Login
                            </button>

                            <button
                                onClick={() => {
                                    setSent(false);
                                    setEmail('');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 24px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: 'white',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            >
                                Try a different email
                            </button>
                        </div>
                    )}

                    <div style={{ height: 20 }} />

                    <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--slate-400)' }}>
                        Remember your password?{' '}
                        <button
                            onClick={() => navigateWithLoader(router, '/login')}
                            style={{
                                color: 'var(--primary-400)',
                                fontWeight: 600,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 14,
                            }}
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
