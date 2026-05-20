export default function RecordPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 24, padding: '40px 24px',
      textAlign: 'center',
    }}>
      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/logo_app.png"
        alt="THW Coaching"
        style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'contain' }}
      />

      <div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 22, fontWeight: 700,
          margin: '0 0 8px',
          color: 'var(--text)',
        }}>
          Enregistrer une séance
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15, color: 'var(--text-dim)',
          margin: 0, lineHeight: 1.5,
        }}>
          Cette fonctionnalité arrive bientôt.
        </p>
      </div>

      <span style={{
        padding: '6px 16px', borderRadius: 20,
        background: 'rgba(0,200,224,0.1)',
        border: '1px solid rgba(0,200,224,0.25)',
        fontSize: 12, fontWeight: 600,
        color: '#00c8e0',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Bientôt disponible
      </span>
    </div>
  )
}
