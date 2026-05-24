export default function DeanOjtHoursLoading() {
  return (
    <div aria-busy="true" aria-label="Loading OJT hours">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 220, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 300, height: 13 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="card" style={{ padding: 14 }}>
            <div className="skeleton" style={{ width: '55%', height: 14, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '40%', height: 30, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '70%', height: 12 }} />
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 14 }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ width: '100%', height: 56, marginBottom: 8, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}
