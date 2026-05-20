export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="card-elevated"
        style={{
          width: 'min(520px, 100%)',
          padding: 24,
          borderRadius: 20,
        }}
        aria-busy="true"
        aria-label="Loading page"
      >
        <div className="skeleton" style={{ width: 180, height: 26, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '75%', height: 14, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 48, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '100%', height: 48, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '100%', height: 48 }} />
      </div>
    </div>
  );
}
