'use client'
// Donut kcal + 3 jauges macros (P rouge / G jaune / L vert) pour un repas.
// Chiffres NEUTRES ; les couleurs ne servent qu'au donut et au remplissage des jauges.
import { MacroDonut } from './MacroDonut'

interface Props { kcal: number; prot: number; gluc: number; lip: number }

const ROWS = [
  { label: 'P', key: 'prot', color: 'var(--macro-prot)' },
  { label: 'G', key: 'gluc', color: 'var(--macro-gluc)' },
  { label: 'L', key: 'lip', color: 'var(--macro-lip)' },
] as const

export function MealMacros({ kcal, prot, gluc, lip }: Props) {
  const g = { prot, gluc, lip }
  const max = Math.max(prot, gluc, lip, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <MacroDonut kcal={kcal} prot={prot} gluc={gluc} lip={lip} size={68} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ROWS.map(r => {
          const val = Math.max(0, g[r.key])
          return (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', width: 12, flexShrink: 0 }}>{r.label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden' }}>
                <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: r.color, opacity: 0.7, borderRadius: 999, transition: 'width 0.5s ease' }} />
              </div>
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: val > 0 ? 'var(--text)' : 'var(--text-dim)', width: 38, textAlign: 'right', flexShrink: 0 }}>{val} g</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
