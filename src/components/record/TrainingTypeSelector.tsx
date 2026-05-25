'use client'

interface TrainingType { id: string; label: string; desc: string }

export const CYCLING_TYPES: TrainingType[] = [
  { id: 'ef',      label: 'EF',      desc: 'Endurance fondamentale' },
  { id: 'pma',     label: 'PMA',     desc: 'Puissance maximale aérobie' },
  { id: 'seuil',   label: 'Seuil',   desc: 'Effort au seuil' },
  { id: 'sprints', label: 'Sprints', desc: 'Efforts courts et intenses' },
  { id: 'tempo',   label: 'Tempo',   desc: 'Allure soutenue' },
  { id: 'recup',   label: 'Récup',   desc: 'Récupération active' },
]

export type TrainingType = { id: string; label: string; desc: string }

interface Props {
  selected: string[]
  onChange: (ids: string[]) => void
  isDark?: boolean
  types?: TrainingType[]
}

export default function TrainingTypeSelector({ selected, onChange, isDark = false, types = CYCLING_TYPES }: Props) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {types.map(t => {
        const active = selected.includes(t.id)
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            title={t.desc}
            style={{
              padding: '10px 16px', borderRadius: 9999,
              fontSize: 14, fontWeight: 500,
              border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB'}`,
              background: active
                ? 'linear-gradient(135deg, #06B6D4, #2563EB)'
                : (isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'),
              color: active ? '#fff' : (isDark ? '#fff' : '#374151'),
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 150ms',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
