'use client'
// Sélecteur « début du bloc » : grille 3 colonnes de lundis (jour + mois réels, aucun numéro
// ISO). Toute la PLAGE (départ → départ+durée-1) est surlignée : extrémités cyan plein,
// milieu cyan translucide. Recalcul immédiat quand le départ ou la durée change.
import type { WeekOption } from '@/lib/utils/weekDates'

const C_CYAN = '#22d3ee', C_ON = '#04141a' // cyan/on-cyan = couleurs fonctionnelles assumées

export function BlocStartWeekPicker({ options, startKey, durationWeeks, onSelect }: {
  options: WeekOption[]; startKey: string; durationWeeks: number; onSelect: (opt: WeekOption) => void
}) {
  const startIdx = options.findIndex(o => o.key === startKey)
  const endIdx = startIdx >= 0 ? startIdx + durationWeeks - 1 : -1
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
      {options.map((opt, i) => {
        const isStart = i === startIdx, isEnd = i === endIdx
        const inRange = startIdx >= 0 && i >= startIdx && i <= endIdx
        const edge = isStart || isEnd
        return (
          <div key={opt.key} onClick={() => onSelect(opt)}
            style={{
              padding: '5px 4px', textAlign: 'center', fontSize: 10, fontWeight: 600, cursor: 'pointer', lineHeight: 1.3, transition: 'all .12s',
              background: edge ? C_CYAN : inRange ? 'rgba(34,211,238,.25)' : 'var(--bg-card2)',
              color: edge ? C_ON : inRange ? C_CYAN : 'var(--text-dim)',
              borderRadius: isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : inRange ? 0 : 6,
            }}>
            <span style={{ fontSize: 11, fontWeight: 700, display: 'block' }}>{opt.day}</span>
            <span style={{ fontSize: 9, display: 'block', opacity: .8 }}>{opt.month}</span>
          </div>
        )
      })}
    </div>
  )
}
