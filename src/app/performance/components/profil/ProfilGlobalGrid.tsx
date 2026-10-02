'use client'
// Profil Global — 8 métriques en grille nue (DESIGN_SYSTEM.md). Chiffres NEUTRES
// (plus de bleu/rouge/violet décoratif) en Inter tabulaire. 2 colonnes mobile
// (toutes les 8 métriques), 4 colonnes desktop. Présentationnel, tokens uniquement.
import { CountUp } from '@/components/ui/AnimatedBar'

const FB = 'var(--font-body)'

export interface Metric {
  label: string; value: string | number; unit?: string; sub?: string
  selected?: boolean; onSelect: () => void
}

export function ProfilGlobalGrid({ metrics, isMobile, mobile }: { metrics: Metric[]; isMobile: boolean; mobile?: boolean }) {
  // Mobile natif : 2 colonnes, libellé gris 13 (casse de phrase), gros chiffre 26/800.
  if (mobile) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
        {metrics.map(m => {
          const isInt = typeof m.value === 'number' && Number.isInteger(m.value)
          return (
            <button key={m.label} type="button" onClick={m.onSelect} aria-pressed={!!m.selected}
              style={{ textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: FB, minHeight: 64, padding: '10px 12px', borderRadius: 'var(--r-md)', background: m.selected ? 'var(--surface-chip)' : 'transparent', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 4 }}>{m.label}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
                <span className="tnum" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                  {isInt ? <CountUp value={m.value as number} /> : m.value}
                </span>
                {m.unit && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{m.unit}</span>}
              </span>
              {m.sub && <span className="tnum" style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 3 }}>{m.sub}</span>}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 'var(--space-4)' }}>
      {metrics.map(m => {
        const isInt = typeof m.value === 'number' && Number.isInteger(m.value)
        return (
          <div key={m.label} onClick={m.onSelect} style={{
            cursor: 'pointer', userSelect: 'none', padding: 'var(--space-2)',
            borderRadius: 'var(--r-sm)', background: m.selected ? 'var(--bg-card2)' : 'transparent',
          }}>
            <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-2)' }}>{m.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 24, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
                {isInt ? <CountUp value={m.value as number} /> : m.value}
              </span>
              {m.unit && <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>{m.unit}</span>}
            </div>
            {m.sub && <p className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 'var(--space-1) 0 0' }}>{m.sub}</p>}
          </div>
        )
      })}
    </div>
  )
}
