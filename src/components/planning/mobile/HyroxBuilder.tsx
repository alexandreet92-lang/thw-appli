'use client'
// Builder Hyrox (mobile) : presets 8 stations + bandeau SM/SN/Temps/nb + groupes.
import { IconPlus } from '@tabler/icons-react'
import {
  type ExerciseItem, type ExoCircuit, hyroxStations, itemFromDef, customItem, targetTimeSec, fmtSec,
} from './strength'
import { Banner, BuilderHeader } from './ui'
import { GroupBuilder } from './GroupBuilder'

export function HyroxBuilder(p: {
  accent: string
  exercises: ExerciseItem[]; setExercises: (e: ExerciseItem[]) => void
  circuits: ExoCircuit[]; setCircuits: (c: ExoCircuit[]) => void
  map: Record<string, string>; setMap: (m: Record<string, string>) => void
  sm: number; sn: number; builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const firstCid = p.circuits[0]?.id ?? 'default'
  const add = (item: ExerciseItem) => { p.setExercises([...p.exercises, item]); p.setMap({ ...p.map, [item.id]: firstCid }) }
  const tt = targetTimeSec(p.exercises, p.circuits)
  const cells = [
    { label: 'SM métab.', value: String(p.sm), color: '#22b8c4' },
    { label: 'SN neuro', value: String(p.sn), color: 'var(--pat-core)' },
    { label: 'Temps cible', value: tt ? fmtSec(tt) : '—' },
    { label: 'Stations', value: String(p.exercises.length) },
  ]

  const presets = (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>Stations officielles</p>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'] }}>
        {hyroxStations().map(def => (
          <button key={def.id} type="button" onClick={() => add(itemFromDef(def))}
            style={chip(p.accent, false)}>{def.name}</button>
        ))}
        <button type="button" onClick={() => add(customItem('Exercice libre', 'hyrox'))} style={chip(p.accent, true)}>
          <IconPlus size={13} /> Libre
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <BuilderHeader accent={p.accent} tab={p.builderTab} onTab={p.onBuilderTab} />
      <GroupBuilder variant="hyrox" accent={p.accent}
        exercises={p.exercises} setExercises={p.setExercises}
        circuits={p.circuits} setCircuits={p.setCircuits}
        map={p.map} setMap={p.setMap}
        banner={<Banner cells={cells} />} presets={presets} />
    </div>
  )
}

const chip = (accent: string, dashed: boolean): React.CSSProperties => ({
  flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
  border: dashed ? `1px dashed ${accent}` : '1px solid var(--se-rule)',
  background: dashed ? 'transparent' : 'var(--se-card)', color: dashed ? accent : 'var(--se-text)',
  borderRadius: 999, padding: '8px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
})
