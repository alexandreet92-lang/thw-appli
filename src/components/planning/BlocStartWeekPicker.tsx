'use client'
// Sélecteur « début du bloc » : grille 3 colonnes de lundis (jour + mois réels). Aucun numéro
// de semaine ISO affiché — uniquement la date du lundi.
import type { WeekOption } from '@/lib/utils/weekDates'

const C_CYAN = '#22d3ee', C_ON = '#04141a' // design-allow-color : maquette dark

export function BlocStartWeekPicker({ options, selectedKey, onSelect }: {
  options: WeekOption[]; selectedKey: string; onSelect: (opt: WeekOption) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
      {options.map(opt => {
        const on = opt.key === selectedKey
        return (
          <div key={opt.key} onClick={() => onSelect(opt)}
            style={{ padding: '5px 4px', textAlign: 'center', fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: 'pointer', lineHeight: 1.3, background: on ? C_CYAN : 'rgba(255,255,255,.04)', color: on ? C_ON : 'rgba(230,237,243,.35)', transition: 'all .12s' }}>
            <span style={{ fontSize: 11, fontWeight: 700, display: 'block' }}>{opt.day}</span>
            <span style={{ fontSize: 9, display: 'block', opacity: .8 }}>{opt.month}</span>
          </div>
        )
      })}
    </div>
  )
}
