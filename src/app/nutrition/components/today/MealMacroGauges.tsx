'use client'
// 3 jauges spécifiques d'un repas : Protéines / Glucides / Lipides. Barre COLORÉE
// (rouge/jaune/vert, tokens --macro-*), proportion = part calorique de la macro dans le
// repas. Valeurs en grammes + kcal, chiffres NEUTRES. Aucune lib, SVG/CSS brut.

import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)'

const ROWS = [
  { key: 'prot', labelKey: 'nutrition.macro.proteins', color: 'var(--macro-prot)', k: 4 },
  { key: 'gluc', labelKey: 'nutrition.macro.carbs',  color: 'var(--macro-gluc)', k: 4 },
  { key: 'lip',  labelKey: 'nutrition.macro.fats',   color: 'var(--macro-lip)',  k: 9 },
] as const

export function MealMacroGauges({ prot, gluc, lip }: { prot: number; gluc: number; lip: number }) {
  const { t } = useI18n()
  const g = { prot, gluc, lip }
  const kcals = { prot: prot * 4, gluc: gluc * 4, lip: lip * 9 }
  const total = kcals.prot + kcals.gluc + kcals.lip

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%' }}>
      {ROWS.map(r => {
        const grams = Math.max(0, Math.round(g[r.key]))
        const kcal = Math.round(kcals[r.key])
        const pct = total > 0 ? kcals[r.key] / total : 0
        return (
          <div key={r.key} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(r.labelKey)}</span>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', flexShrink: 0 }}>{grams} g · {kcal} kcal</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', boxSizing: 'border-box' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: r.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
