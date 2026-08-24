'use client'
// Sélection du builder selon le sport (endurance / muscu / hyrox), partagé
// par les coquilles mobile et desktop. Ne duplique aucune logique : il route
// simplement vers les builders existants.
import type { Block } from '@/app/planning/page'
import { SessionBlockBuilder } from './SessionBlockBuilder'
import { SprintsBuilder } from './SprintsBuilder'
import { StridesBuilder } from './StridesBuilder'
import { StrengthBuilder } from './StrengthBuilder'
import { HyroxBuilder } from './HyroxBuilder'
import { MobilityBuilder } from './MobilityBuilder'
import { ComposedBuilder } from '../ComposedBuilder'
import type { ComposedSport } from '../composedSports'
import type { MBlock } from './blocks'
import type { SessionEditorPanelProps } from './panelProps'

export function BuilderSection({ p }: { p: SessionEditorPanelProps }) {
  if (p.isComposed) {
    return <ComposedBuilder sport={p.sport as ComposedSport} moves={p.composedMoves} accent={p.accent} onChange={p.setComposedMoves} circuits={p.composedCircuits} onCircuitsChange={p.setComposedCircuits} />
  }
  if (p.sport === 'mobilite') {
    return <MobilityBuilder blocks={p.blocks as MBlock[]} accent={p.accent} onChange={b => p.setBlocks(b as Block[])} />
  }
  if (p.sport === 'gym') {
    return (
      <StrengthBuilder accent={p.accent}
        exercises={p.exercises} setExercises={p.setExercises}
        circuits={p.circuits} setCircuits={p.setCircuits}
        map={p.exoMap} setMap={p.setExoMap}
        sn={p.sn} builderTab={p.builderTab} onBuilderTab={p.setBuilderTab} />
    )
  }
  // Famille course « Sprints » / « Intervals Strides » — builders dédiés.
  if (p.sport === 'run' && p.runFamily === 'sprints') {
    return <SprintsBuilder blocks={p.blocks as MBlock[]} accent={p.accent} onChange={b => p.setBlocks(b as Block[])} />
  }
  if (p.sport === 'run' && p.runFamily === 'intervals') {
    return <StridesBuilder blocks={p.blocks as MBlock[]} accent={p.accent} onChange={b => p.setBlocks(b as Block[])} />
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
      sport={p.sport} runningSub={p.runningSub} accent={p.accent} blocks={p.blocks as MBlock[]}
      onChange={b => p.setBlocks(b as Block[])}
      sm={p.sm} sn={p.sn} refs={p.refs} parcoursData={p.parcoursData}
      onParcoursFile={p.onParcoursFile} onParcoursRemove={p.onParcoursRemove}
      riderKg={p.riderKg} bikeKg={p.bikeKg}
      builderTab={p.builderTab} onBuilderTab={p.setBuilderTab} />
  )
}
