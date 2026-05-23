'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { navigateWithLoader } from '@/lib/route-loading';

export default function DeanDashboardPage() {
    const router = useRouter();

    useEffect(() => {
        navigateWithLoader(router, '/dean-dashboard/ojt-profiles');
    }, [router]);

    return (
        <div style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(16,185,129,0.22)',
                borderTopColor: 'var(--primary-500)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
