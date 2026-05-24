export default function ChatLoading() {
  return (
    <div aria-busy="true" aria-label="Loading chat messages">
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, minHeight: 'calc(100vh - 180px)', padding: 12 }}>
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 12 }}>
          <div className="skeleton" style={{ width: '100%', height: 40, marginBottom: 10, borderRadius: 10 }} />
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: '100%', height: 56, marginBottom: 8, borderRadius: 10 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 10 }}>
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="skeleton"
                style={{
                  width: idx % 2 === 0 ? '72%' : '58%',
                  justifySelf: idx % 2 === 0 ? 'start' : 'end',
                  height: 44,
                  borderRadius: 12,
                }}
              />
            ))}
          </div>
          <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}
