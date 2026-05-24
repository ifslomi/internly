export default function DeanWeeklyReportsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading weekly reports">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 260, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 10 }} />
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 34, borderRadius: 10 }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ width: '100%', height: 60, marginBottom: 8, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}
