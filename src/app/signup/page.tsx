'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { ArrowLeft, Eye, EyeOff, UserPlus, X } from 'lucide-react';

export default function SignUpPage() {
    const { signUp, user, loading, signUpWithGoogle } = useApp();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [totalHours, setTotalHours] = useState(480);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [policyModal, setPolicyModal] = useState<'Privacy' | 'Terms' | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        if (!loading && user) router.push('/dashboard');
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!agreedTerms) {
            setError('You must agree to the Terms of Service and Privacy Policy.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (totalHours < 1) {
            setError('Total required hours must be at least 1.');
            return;
        }

        setSubmitting(true);
        try {
            await signUp(name, email, password, totalHours, startDate);
            router.push('/verify-email');
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists.');
            } else {
                setError(firebaseErr.message || 'Sign up failed');
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
            <div className="hero-glow" style={{ background: '#10b981', top: '30%', right: '15%' }} />
            <div className="hero-glow" style={{ background: '#14b8a6', bottom: '10%', left: '15%', width: 400, height: 400 }} />

            <div style={{ maxWidth: 480, width: '100%', position: 'relative', zIndex: 1, padding: '0 4px' }}>
                <button
                    className="btn btn-ghost"
                    onClick={() => router.push('/')}
                    style={{ marginBottom: 32, color: 'var(--slate-400)' }}
                    id="signup-back"
                >
                    <ArrowLeft size={18} /> Back to home
                </button>

                <div className="card-elevated auth-card" style={{}}>
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
                        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Create your account</h1>
                        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                            Set up your internship tracking in minutes
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

                        <div className="input-group" style={{ marginBottom: 16 }}>
                            <label className="input-label" htmlFor="signup-email">Email</label>
                            <input
                                id="signup-email"
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div id="signup-passwords-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="input-group">
                                <label className="input-label" htmlFor="signup-password">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="signup-password"
                                        className="input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Min 6 characters"
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

                        <div className="divider" />

                        <p style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--slate-300)',
                            marginBottom: 16,
                            letterSpacing: '0.02em',
                        }}>
                            Internship Details
                        </p>

                        <div id="signup-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="input-group">
                                <label className="input-label" htmlFor="signup-hours">Total Required Hours</label>
                                <input
                                    id="signup-hours"
                                    className="input"
                                    type="number"
                                    min={1}
                                    max={5000}
                                    value={totalHours}
                                    onChange={(e) => setTotalHours(Number(e.target.value))}
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

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
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
                            <label htmlFor="signup-agree" style={{ fontSize: 13, color: 'var(--slate-400)', lineHeight: 1.5, cursor: 'pointer' }}>
                                I agree to the{' '}
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setPolicyModal('Terms'); }}
                                    style={{ color: 'var(--primary-400)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                                >
                                    Terms of Service
                                </button>{' '}and{' '}
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setPolicyModal('Privacy'); }}
                                    style={{ color: 'var(--primary-400)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                                >
                                    Privacy Policy
                                </button>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                            style={{ width: '100%', padding: '14px 24px' }}
                            id="signup-submit"
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
                                    Creating account...
                                </span>
                            ) : (
                                <>
                                    <UserPlus size={18} /> Create Account
                                </>
                            )}
                        </button>
                        <style>{`
                            @keyframes spin { to { transform: rotate(360deg); } }
                            @media (max-width: 640px) {
                                #signup-passwords-grid,
                                #signup-details-grid {
                                    grid-template-columns: 1fr !important;
                                }
                            }
                        `}</style>
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
                                await signUpWithGoogle();
                                router.push('/verify-email');
                            } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : 'Google sign-up failed. Please try again.');
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
                        Already have an account?{' '}
                        <button
                            onClick={() => router.push('/login')}
                            style={{
                                color: 'var(--primary-400)',
                                fontWeight: 600,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 14,
                            }}
                            id="signup-login-link"
                        >
                            Log In
                        </button>
                    </p>
                </div>
            </div>

            {/* Policy Modal */}
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
                        animation: 'fadeIn 200ms ease',
                    }}
                >
                    <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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
                            animation: 'slideUp 250ms ease',
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
                                    <p style={{ marginBottom: 12 }}>Internly is committed to protecting your privacy. All data you enter &mdash; including daily logs, hour records, and personal information &mdash; is stored locally on your device using browser storage.</p>
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
                                    <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>3. No Warranty:</strong> Internly is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for data loss resulting from browser resets or device changes.</p>
                                    <p><strong style={{ color: 'var(--slate-200)' }}>4. Modifications:</strong> We reserve the right to update these terms at any time. Continued use of the app constitutes acceptance of any changes.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
