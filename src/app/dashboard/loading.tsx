export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div
        style={{
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 220 }}>
          <div className="skeleton" style={{ width: 280, maxWidth: '75vw', height: 36, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, maxWidth: '60vw', height: 14 }} />
        </div>
        <div className="skeleton" style={{ width: 170, height: 44, borderRadius: 12 }} />
      </div>

      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}
      >
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="card" style={{ padding: 16 }}>
            <div className="skeleton" style={{ width: 84, height: 24, marginBottom: 14 }} />
            <div className="skeleton" style={{ width: '48%', height: 38, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '68%', height: 12 }} />
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="skeleton" style={{ width: 170, height: 24, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 240, height: 12, marginBottom: 20 }} />
        <div style={{ display: 'grid', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 62, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
