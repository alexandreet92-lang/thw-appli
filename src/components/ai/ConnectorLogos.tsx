'use client'
// ══════════════════════════════════════════════════════════════
// Logos des connecteurs, rendus en tuiles arrondies aux couleurs de marque.
// SEUL endroit où des couleurs de marque en dur sont autorisées (ce sont
// des identités visuelles, pas de la couleur décorative — cf. design system).
// ══════════════════════════════════════════════════════════════

export type ConnectorId = 'strava' | 'polar' | 'wahoo' | 'withings' | 'gcal' | 'acal' | 'excel'

function Tile({ bg, size, children }: { bg: string; size: number; children: React.ReactNode }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

export function ConnectorLogo({ id, size = 40 }: { id: ConnectorId; size?: number }) {
  const vb = '0 0 24 24'
  switch (id) {
    case 'strava':
      return (
        <Tile bg="#FC4C02" size={size}>
          <svg width={size * 0.6} height={size * 0.6} viewBox={vb} fill="#fff">
            <path d="M10.6 2 4.8 13.2h3.5L10.6 8.6l2.3 4.6h3.5z" opacity="0.55" />
            <path d="M13.9 13.2 12.4 16l-1.5-2.8H8.3L12.4 22l4.1-8.8z" />
          </svg>
        </Tile>
      )
    case 'polar':
      return (
        <Tile bg="#E4022A" size={size}>
          <svg width={size * 0.62} height={size * 0.62} viewBox={vb} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="7.5" />
            <circle cx="12" cy="12" r="2.4" fill="#fff" stroke="none" />
          </svg>
        </Tile>
      )
    case 'wahoo':
      return (
        <Tile bg="#0B0B0C" size={size}>
          <span style={{ color: '#22c1e6', fontSize: size * 0.5, fontWeight: 800, fontFamily: 'var(--font-body)', lineHeight: 1 }}>W</span>
        </Tile>
      )
    case 'withings':
      return (
        <Tile bg="#0A8F9E" size={size}>
          <svg width={size * 0.66} height={size * 0.66} viewBox={vb} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h3.5l2-5 3 12 2.5-9 1.5 4H21" />
          </svg>
        </Tile>
      )
    case 'gcal':
      return (
        <Tile bg="#fff" size={size}>
          <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #4285F4', boxSizing: 'border-box', borderRadius: Math.round(size * 0.22) }}>
            <span style={{ color: '#4285F4', fontSize: size * 0.4, fontWeight: 700, fontFamily: 'var(--font-body)', letterSpacing: '-0.03em' }}>31</span>
          </div>
        </Tile>
      )
    case 'acal':
      return (
        <Tile bg="#fff" size={size}>
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '32%', background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#1c1c1e', fontSize: size * 0.42, fontWeight: 600, fontFamily: 'var(--font-body)', lineHeight: 1 }}>17</span>
            </div>
          </div>
        </Tile>
      )
    case 'excel':
      return (
        <Tile bg="#217346" size={size}>
          <span style={{ color: '#fff', fontSize: size * 0.5, fontWeight: 800, fontFamily: 'var(--font-body)', lineHeight: 1 }}>X</span>
        </Tile>
      )
  }
}
