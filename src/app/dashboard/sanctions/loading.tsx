export default function DashboardSanctionsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading sanctions">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 300, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 62, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
