'use client';
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{
            display: 'flex',
            height: 'calc(100vh - 40px)',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--slate-950)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: 40,
        }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: 16 }} />
                <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                    Chat Failed to Load
                </h3>
                <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    Something went wrong while loading the chat page. This is usually a temporary issue.
                </p>
                <p style={{ color: 'var(--slate-600)', fontSize: 12, marginBottom: 20, fontFamily: 'monospace' }}>
                    {error.message}
                </p>
                <button
                    onClick={reset}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 24px',
                        background: 'var(--primary-500)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    <RefreshCw size={16} />
                    Try Again
                </button>
            </div>
        </div>
    );
}
