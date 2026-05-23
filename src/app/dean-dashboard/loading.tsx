export default function DeanDashboardLoading() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
        }}>
            <div style={{
                width: 48,
                height: 48,
                border: '3px solid rgba(16,185,129,0.22)',
                borderTopColor: 'var(--primary-500)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
