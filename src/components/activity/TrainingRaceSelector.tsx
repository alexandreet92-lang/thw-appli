'use client'
// Sélecteur « Entraînement / Course » d'une activité (segmented control stylé).
// Course = tag is_race sur l'activité. Quand « Course » est choisi, l'appelant
// masque les badges de type d'entraînement (une course n'est pas un entraînement).
import { IconBarbell, IconFlag } from '@tabler/icons-react'
import { useIsMobile, SegTrack } from './ActivityMobileKit'

export function TrainingRaceSelector({ value, onChange }: { value: boolean; onChange: (isRace: boolean) => void }) {
  // value=false → Entraînement · value=true → Course
  const opts = [
    { race: false, label: 'Entraînement', Icon: IconBarbell, color: 'var(--primary)' },
    { race: true,  label: 'Course',       Icon: IconFlag,    color: '#ef4444' },
  ]
  const mob = useIsMobile()
  // Mobile : piste segmentée grise + pastille blanche (aucune surface colorée).
  if (mob) {
    return (
      <SegTrack<'train' | 'race'>
        value={value ? 'race' : 'train'}
        onChange={v => { const r = v === 'race'; if (value !== r) onChange(r) }}
        options={opts.map(o => ({ v: o.race ? 'race' as const : 'train' as const, l: <><o.Icon size={17} /> {o.label}</> }))}
      />
    )
  }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4,
      background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
    }}>
      {opts.map(o => {
        const on = value === o.race
        return (
          <button key={o.label} onClick={() => { if (value !== o.race) onChange(o.race) }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 8px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
            background: on ? o.color : 'transparent',
            color: on ? '#fff' : 'var(--text-mid)',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            boxShadow: on ? '0 2px 8px color-mix(in srgb, ' + o.color + ' 40%, transparent)' : 'none',
            transition: 'background .18s, color .18s',
          }}>
            <o.Icon size={17} /> {o.label}
          </button>
        )
      })}
    </div>
  )
}
