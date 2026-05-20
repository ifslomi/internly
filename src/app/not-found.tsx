import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="card-elevated" style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
        <p style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: 'var(--primary-400)', marginBottom: 10 }}>
          404
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>This page could not be found.</h1>
        <p style={{ color: 'var(--slate-400)', marginBottom: 20 }}>
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </main>
  );
}

