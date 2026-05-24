export default function DashboardReportsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading weekly reports">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 230, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
          <div className="skeleton" style={{ width: '100%', height: 42, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 42, borderRadius: 10 }} />
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ width: '100%', height: 58, marginBottom: 8, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}
