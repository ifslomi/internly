export default function DeanCompetenciesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading competencies">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 240, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 290, height: 13 }} />
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 'calc(100vh - 220px)', padding: 14 }}>
        <div>
          <div className="skeleton" style={{ width: '100%', height: 38, marginBottom: 10, borderRadius: 10 }} />
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 56, marginBottom: 8, borderRadius: 10 }} />
          ))}
        </div>
        <div>
          <div className="skeleton" style={{ width: '50%', height: 20, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '100%', height: 36, marginBottom: 10, borderRadius: 10 }} />
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 74, marginBottom: 10, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
