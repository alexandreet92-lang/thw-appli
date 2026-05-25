'use client'

interface Props {
  isDark?: boolean
}

const IOS_STEPS = [
  'Ouvre l\'app Réglages sur ton iPhone',
  'Appuie sur "Confidentialité et sécurité"',
  'Appuie sur "Service de localisation"',
  'Descends jusqu\'à Safari (ou ton navigateur)',
  'Sélectionne "Lors de l\'utilisation"',
]

export default function GPSPermissionScreen({ isDark = false }: Props) {
  const bg   = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.55)' : '#666'
  const card = isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      background: bg, color: text,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center',
      fontFamily: 'DM Sans, sans-serif',
      overflowY: 'auto',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(239,68,68,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, flexShrink: 0,
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
        </svg>
      </div>

      <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
        Localisation désactivée
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: dim, lineHeight: 1.5, maxWidth: 300 }}>
        Pour activer le GPS, suis ces étapes :
      </p>

      <div style={{
        background: card, borderRadius: 12, padding: '16px 20px',
        marginBottom: 28, maxWidth: 340, width: '100%', textAlign: 'left',
      }}>
        {IOS_STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < IOS_STEPS.length - 1 ? 10 : 0 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)', color: '#EF4444',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 13, color: dim, lineHeight: 1.45 }}>{step}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          width: '100%', maxWidth: 340, height: 52, borderRadius: 40, border: 'none',
          background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
        }}
      >
        J&apos;ai activé la localisation
      </button>

      <p style={{ marginTop: 14, fontSize: 12, color: dim, maxWidth: 300, lineHeight: 1.5 }}>
        Sur Android : Réglages → Applications → Chrome → Autorisations → Position
      </p>
    </div>
  )
}
