'use client'
// Builder Musculation (mobile) : bandeau SN/Volume/Durée/nb exos + groupes.
import { type ExerciseItem, type ExoCircuit, tonnageKg, estDurationMin } from './strength'
import { fmtDur } from './editorial'
import { Banner, BuilderHeader } from './ui'
import { GroupBuilder } from './GroupBuilder'

export function StrengthBuilder(p: {
  accent: string
  exercises: ExerciseItem[]; setExercises: (e: ExerciseItem[]) => void
  circuits: ExoCircuit[]; setCircuits: (c: ExoCircuit[]) => void
  map: Record<string, string>; setMap: (m: Record<string, string>) => void
  sn: number; builderTab: 'manual' | 'ai'; onBuilderTab: (t: 'manual' | 'ai') => void
}) {
  const tonnage = tonnageKg(p.exercises)
  const cells = [
    { label: 'SN neuro', value: String(p.sn), color: 'var(--pat-core)' },
    { label: 'Volume', value: tonnage ? `${(tonnage / 1000).toFixed(1)} t` : '—' },
    { label: 'Durée est.', value: p.exercises.length ? fmtDur(estDurationMin(p.exercises, p.circuits)) : '—' },
    { label: 'Exercices', value: String(p.exercises.length) },
  ]
  return (
    <div>
      <BuilderHeader accent={p.accent} tab={p.builderTab} onTab={p.onBuilderTab} />
      <GroupBuilder variant="muscu" accent={p.accent}
        exercises={p.exercises} setExercises={p.setExercises}
        circuits={p.circuits} setCircuits={p.setCircuits}
        map={p.map} setMap={p.setMap}
        banner={<Banner cells={cells} />} />
    </div>
  )
}
