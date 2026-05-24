export default function DeanSettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading settings">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 180, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 290, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 180, height: 20, marginBottom: 12 }} />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ width: '100%', height: 44, marginBottom: 10, borderRadius: 10 }} />
        ))}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="skeleton" style={{ width: 160, height: 20, marginBottom: 12 }} />
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ width: '100%', height: 44, marginBottom: 10, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}
