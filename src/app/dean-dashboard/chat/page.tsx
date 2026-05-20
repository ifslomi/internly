'use client';

export default function DeanChatPage() {
    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    Messages
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Communication with interns and supervisors
                </p>
            </div>

            <div style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                padding: '24px',
                minHeight: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--slate-400)',
            }}>
                <p>Chat functionality coming soon...</p>
            </div>
        </div>
    );
}
