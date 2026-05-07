'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { getPendingSignup } from '@/lib/storage';
import { Mail, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function VerifyEmailPage() {
    const router = useRouter();
    const { user, verifyCode, resendCode } = useApp();
    const [email, setEmail] = useState('');
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Load pending signup email
    useEffect(() => {
        if (user) {
            router.replace('/dashboard');
            return;
        }
        const pending = getPendingSignup();
        if (!pending) {
            router.replace('/signup');
            return;
        }
        setEmail(pending.email);
    }, [user, router]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleChange = useCallback((index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...digits];
        newDigits[index] = value.slice(-1);
        setDigits(newDigits);
        setError('');
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    }, [digits]);

    const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }, [digits]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length > 0) {
            const newDigits = [...digits];
            for (let i = 0; i < 6; i++) {
                newDigits[i] = pasted[i] || '';
            }
            setDigits(newDigits);
            const focusIdx = Math.min(pasted.length, 5);
            inputRefs.current[focusIdx]?.focus();
        }
    }, [digits]);

    const handleVerify = async () => {
        const code = digits.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code.');
            return;
        }

        setVerifying(true);
        setError('');
        try {
            await verifyCode(code);
            setSuccess(true);
            // Redirect to login after a short delay
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Verification failed.';
            setError(msg);
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
        setVerifying(false);
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        try {
            await resendCode();
            setResendCooldown(60);
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to resend code.');
        }
        setResending(false);
    };

    const maskedEmail = email
        ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c)
        : '';

    const code = digits.join('');
    const isComplete = code.length === 6;

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
            <div className="hero-glow" style={{ background: '#10b981', top: '20%', left: '20%' }} />
            <div className="hero-glow" style={{ background: '#14b8a6', bottom: '20%', right: '15%', width: 400, height: 400 }} />

            <div style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1, padding: '0 4px' }}>
                <button
                    className="btn btn-ghost"
                    onClick={() => router.push('/signup')}
                    style={{ marginBottom: 32, color: 'var(--slate-400)' }}
                >
                    <ArrowLeft size={18} /> Back to sign up
                </button>

                <div className="card-elevated auth-card">
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: success ? 'rgba(34,197,94,0.12)' : 'rgba(16,185,129,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            transition: 'background 300ms',
                        }}>
                            {success
                                ? <ShieldCheck size={28} style={{ color: '#4ade80' }} />
                                : <Mail size={28} style={{ color: 'var(--primary-400)' }} />
                            }
                        </div>

                        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                            {success ? 'Email verified!' : 'Check your email'}
                        </h1>
                        <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6 }}>
                            {success
                                ? 'Redirecting to login...'
                                : <>We sent a 6-digit code to</>
                            }
                        </p>
                        {!success && (
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

                    {!success && (
                        <>
                            {/* OTP Input */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 10,
                                marginBottom: 24,
                            }}>
                                {digits.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        onPaste={i === 0 ? handlePaste : undefined}
                                        autoFocus={i === 0}
                                        style={{
                                            width: 48,
                                            height: 56,
                                            textAlign: 'center',
                                            fontSize: 22,
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                            borderRadius: 'var(--radius-sm)',
                                            border: `2px solid ${digit ? 'var(--primary-500)' : 'rgba(255,255,255,0.12)'}`,
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'white',
                                            outline: 'none',
                                            transition: 'border-color 150ms, box-shadow 150ms',
                                            caretColor: 'var(--primary-400)',
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary-500)';
                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = digit ? 'var(--primary-500)' : 'rgba(255,255,255,0.12)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                ))}
                            </div>

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

                            <button
                                onClick={handleVerify}
                                disabled={verifying || !isComplete}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '14px 24px',
                                    opacity: verifying || !isComplete ? 0.6 : 1,
                                    cursor: verifying || !isComplete ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {verifying ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="spinner" />
                                        Verifying...
                                    </span>
                                ) : (
                                    <>
                                        <ShieldCheck size={18} /> Verify & Create Account
                                    </>
                                )}
                            </button>

                            <div style={{
                                margin: '20px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}>
                                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                                <span style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    didn&apos;t receive it?
                                </span>
                                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                            </div>

                            <button
                                onClick={handleResend}
                                disabled={resending || resendCooldown > 0}
                                style={{
                                    width: '100%',
                                    padding: '12px 24px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: 'white',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: resending || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    transition: 'all 150ms',
                                    opacity: resending || resendCooldown > 0 ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    if (!resending && resendCooldown <= 0) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            >
                                {resending ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="spinner" />
                                        Sending...
                                    </span>
                                ) : resendCooldown > 0 ? (
                                    `Resend in ${resendCooldown}s`
                                ) : (
                                    <>
                                        <RefreshCw size={16} /> Resend code
                                    </>
                                )}
                            </button>

                            <p style={{
                                textAlign: 'center',
                                fontSize: 13,
                                color: 'var(--slate-500)',
                                lineHeight: 1.5,
                                marginTop: 16,
                            }}>
                                Check your spam folder if you don&apos;t see the email.
                            </p>
                        </>
                    )}

                    {success && (
                        <div style={{
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(34,197,94,0.08)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            <span className="spinner" style={{ borderTopColor: '#4ade80' }} />
                            <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 500 }}>
                                Account created! Redirecting to login...
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .spinner {
                    display: inline-block;
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    flex-shrink: 0;
                }
            `}</style>
        </div>
    );
}
