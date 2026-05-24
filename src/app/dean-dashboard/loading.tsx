export default function DeanDashboardLoading() {
    return (
        <div aria-busy="true" aria-label="Loading dean dashboard">
            <div
                style={{
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ minWidth: 220 }}>
                    <div className="skeleton" style={{ width: 260, maxWidth: '75vw', height: 34, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: 240, maxWidth: '60vw', height: 14 }} />
                </div>
                <div className="skeleton" style={{ width: 160, height: 40, borderRadius: 12 }} />
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="card" style={{ padding: 16 }}>
                        <div className="skeleton" style={{ width: 94, height: 18, marginBottom: 12 }} />
                        <div className="skeleton" style={{ width: '45%', height: 32, marginBottom: 10 }} />
                        <div className="skeleton" style={{ width: '68%', height: 12 }} />
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 16 }}>
                <div className="skeleton" style={{ width: '100%', height: 44, marginBottom: 10, borderRadius: 10 }} />
                <div className="skeleton" style={{ width: '100%', height: 44, marginBottom: 10, borderRadius: 10 }} />
                <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 10 }} />
            </div>
        </div>
    );
}
