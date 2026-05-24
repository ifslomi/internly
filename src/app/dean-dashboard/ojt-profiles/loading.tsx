export default function DeanOjtProfilesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading OJT profiles">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 250, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="skeleton" style={{ width: '100%', height: 40, marginBottom: 12, borderRadius: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 88, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
