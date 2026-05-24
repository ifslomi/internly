export default function DeanSanctionsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading sanctions">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 210, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 340, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 38, borderRadius: 10 }} />
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ width: '100%', height: 62, marginBottom: 8, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}
