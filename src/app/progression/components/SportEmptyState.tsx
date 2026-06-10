'use client'

// État vide plein écran pour les sports sans données (Hyrox / Aviron / Trail).
const MESSAGES: Record<string, string> = {
  hyrox: "Aucune séance Hyrox enregistrée. Commence à enregistrer pour suivre ta progression.",
  aviron: "Aucune séance d'aviron enregistrée. Commence à enregistrer pour suivre ta progression.",
  trail: "La progression Trail sera disponible prochainement.",
}

export function SportEmptyState({ sport, label, color }: { sport: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px', background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
      </div>
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', margin: '0 0 8px' }}>Aucune donnée {label}</h2>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: 420, margin: '0 auto' }}>{MESSAGES[sport] ?? 'Pas encore de données pour ce sport.'}</p>
    </div>
  )
}
