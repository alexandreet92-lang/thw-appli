'use client'
import { useI18n } from '@/lib/i18n'

export const CYCLING_TYPES: { id: string; label: string; desc: string }[] = [
  { id: 'ef',      label: 'EF',      desc: 'Endurance fondamentale' },
  { id: 'pma',     label: 'PMA',     desc: 'Puissance maximale aérobie' },
  { id: 'seuil',   label: 'Seuil',   desc: 'Effort au seuil' },
  { id: 'sprints', label: 'Sprints', desc: 'Efforts courts et intenses' },
  { id: 'tempo',   label: 'Tempo',   desc: 'Allure soutenue' },
  { id: 'recup',   label: 'Récup',   desc: 'Récupération active' },
]

const TYPE_I18N: Record<string, { label: string; desc: string }> = {
  ef:      { label: 'record.trainingTypeEfLabel',      desc: 'record.trainingTypeEfDesc' },
  pma:     { label: 'record.trainingTypePmaLabel',     desc: 'record.trainingTypePmaDesc' },
  seuil:   { label: 'record.trainingTypeSeuilLabel',   desc: 'record.trainingTypeSeuilDesc' },
  sprints: { label: 'record.trainingTypeSprintsLabel', desc: 'record.trainingTypeSprintsDesc' },
  tempo:   { label: 'record.trainingTypeTempoLabel',   desc: 'record.trainingTypeTempoDesc' },
  recup:   { label: 'record.trainingTypeRecupLabel',   desc: 'record.trainingTypeRecupDesc' },
}

// Types d'entraînement PROPRES à chaque sport (fini les types de course sur la boxe).
export const BOXE_TYPES: { id: string; label: string; desc: string }[] = [
  { id: 'technique',  label: 'Technique',  desc: 'Travail technique, déplacements' },
  { id: 'sac',        label: 'Sac',        desc: 'Frappe au sac' },
  { id: 'sparring',   label: 'Sparring',   desc: 'Opposition, assaut' },
  { id: 'condition',  label: 'Condition physique', desc: 'Renfo, cardio boxe' },
  { id: 'recup',      label: 'Récup',      desc: 'Récupération active' },
]

export const HYBRID_TYPES: { id: string; label: string; desc: string }[] = [
  { id: 'metcon',     label: 'Metcon',     desc: 'Conditionnement métabolique (WOD)' },
  { id: 'force',      label: 'Force',      desc: 'Charges lourdes' },
  { id: 'cardio',     label: 'Cardio',     desc: 'Machines cardio, intervalles' },
  { id: 'endurance',  label: 'Endurance',  desc: 'Effort long et régulier' },
  { id: 'recup',      label: 'Récup',      desc: 'Récupération active' },
]

export type TrainingType = { id: string; label: string; desc: string; labelKey?: string; descKey?: string }

interface Props {
  selected: string[]
  onChange: (ids: string[]) => void
  isDark?: boolean
  types?: TrainingType[]
}

export default function TrainingTypeSelector({ selected, onChange, isDark = false, types = CYCLING_TYPES }: Props) {
  const { t: tr } = useI18n()
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {types.map(type => {
        const active = selected.includes(type.id)
        const i18n = TYPE_I18N[type.id]
        const labelText = type.labelKey ? tr(type.labelKey) : (i18n ? tr(i18n.label) : type.label)
        const descText  = type.descKey  ? tr(type.descKey)  : (i18n ? tr(i18n.desc)  : type.desc)
        return (
          <button
            key={type.id}
            onClick={() => toggle(type.id)}
            title={descText}
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
            {labelText}
          </button>
        )
      })}
    </div>
  )
}
