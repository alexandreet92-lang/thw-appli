'use client'
// Message d'erreur des écrans d'entrée : carte neutre + pastille et texte
// --danger (pas de surface colorée), petite secousse à l'apparition.

interface Props { error: string }

export function ErrorMessage({ error }: Props) {
  if (!error) return null
  return (
    <div key={error} role="alert" className="au-shake" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', borderRadius: 'var(--r-md)', margin: '4px 0 14px',
      background: 'var(--surface-card)', boxShadow: 'inset 0 0 0 1px var(--danger-soft)',
    }}>
      <svg aria-hidden width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="8" cy="8" r="7" stroke="var(--danger)" strokeWidth="1.5" />
        <path d="M8 4.8v4M8 10.8v.4" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: 14, color: 'var(--danger)', margin: 0, lineHeight: 1.45, fontFamily: 'var(--font-body)' }}>
        {error}
      </p>
    </div>
  )
}
