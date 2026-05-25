'use client'

interface Props {
  isDark?: boolean
}

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
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(239,68,68,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
        </svg>
      </div>

      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
        Accès GPS refusé
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: dim, lineHeight: 1.5, maxWidth: 320 }}>
        L'application a besoin de votre position pour enregistrer votre trajet et calculer distance, vitesse et altitude.
      </p>

      <div style={{
        background: card, borderRadius: 12, padding: '16px 20px',
        marginBottom: 28, maxWidth: 340, width: '100%', textAlign: 'left',
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: text }}>
          Pour autoriser l'accès sur iOS :
        </p>
        {[
          'Ouvrez Réglages',
          'Allez dans Safari (ou votre navigateur)',
          'Appuyez sur Position',
          'Sélectionnez "Autoriser"',
        ].map((step, i) => (
          <p key={i} style={{ margin: '0 0 4px', fontSize: 13, color: dim, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: '#EF4444', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
            {step}
          </p>
        ))}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '14px 32px', borderRadius: 40, border: 'none',
          background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
        }}
      >
        Recharger la page
      </button>
    </div>
  )
}
