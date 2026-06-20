'use client'
// Sélection du builder selon le sport (endurance / muscu / hyrox), partagé
// par les coquilles mobile et desktop. Ne duplique aucune logique : il route
// simplement vers les builders existants.
import type { Block } from '@/app/planning/page'
import { SessionBlockBuilder } from './SessionBlockBuilder'
import { StrengthBuilder } from './StrengthBuilder'
import { HyroxBuilder } from './HyroxBuilder'
import type { MBlock } from './blocks'
import type { SessionEditorPanelProps } from './panelProps'

export function BuilderSection({ p }: { p: SessionEditorPanelProps }) {
  if (p.sport === 'gym') {
    return (
      <StrengthBuilder accent={p.accent}
        exercises={p.exercises} setExercises={p.setExercises}
        circuits={p.circuits} setCircuits={p.setCircuits}
        map={p.exoMap} setMap={p.setExoMap}
        sn={p.sn} builderTab={p.builderTab} onBuilderTab={p.setBuilderTab} />
    )
  }
  if (p.sport === 'hyrox') {
    return (
      <HyroxBuilder accent={p.accent}
        exercises={p.exercises} setExercises={p.setExercises}
        circuits={p.circuits} setCircuits={p.setCircuits}
        map={p.exoMap} setMap={p.setExoMap}
        sm={p.sm} sn={p.sn} builderTab={p.builderTab} onBuilderTab={p.setBuilderTab} />
    )
  }
  return (
    <SessionBlockBuilder
      sport={p.sport} accent={p.accent} blocks={p.blocks as MBlock[]}
      onChange={b => p.setBlocks(b as Block[])}
      sm={p.sm} sn={p.sn} refs={p.refs} parcoursData={p.parcoursData}
      builderTab={p.builderTab} onBuilderTab={p.setBuilderTab} />
  )
}
