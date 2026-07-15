// Machine à états pure du moteur de séance. Aucun timer ici (le hook dispatch
// TICK) → testable. Transitions : summary → prepare(10s) → [effort → rest]* → done.
import { buildTimeline, PREPARE_SEC } from './buildTimeline'
import { stepKey, type TimelineStep, type PhaseKind } from './types'
import type { WorkoutExercise } from '@/types/workout'

export interface EngineState {
  blocks: WorkoutExercise[]
  timeline: TimelineStep[]
  phase: PhaseKind
  stepIdx: number
  reps: number
  kg: number
  bodyweight: boolean
  setsDone: number
  volumeKg: number
  elapsed: number
  remaining: number
  paused: boolean
}

export function initState(blocks: WorkoutExercise[]): EngineState {
  return {
    blocks, timeline: buildTimeline(blocks), phase: 'summary', stepIdx: 0,
    reps: 0, kg: 0, bodyweight: false, setsDone: 0, volumeKg: 0,
    elapsed: 0, remaining: 0, paused: false,
  }
}

function enterStep(s: EngineState, idx: number): EngineState {
  if (idx >= s.timeline.length) return { ...s, phase: 'done' }
  const step = s.timeline[idx]
  if (step.kind === 'rest') return { ...s, stepIdx: idx, phase: 'rest', remaining: step.sec }
  if (step.ex.nature === 'temps') return { ...s, stepIdx: idx, phase: 'effortTime', remaining: step.ex.durationSec }
  return { ...s, stepIdx: idx, phase: 'effortReps', reps: step.ex.targetReps, kg: step.ex.targetWeightKg, bodyweight: step.ex.bodyweight, remaining: 0 }
}

function validateAndAdvance(s: EngineState): EngineState {
  const step = s.timeline[s.stepIdx]
  let ns = s
  if (step?.kind === 'effort' && step.ex.nature === 'reps') {
    ns = { ...s, setsDone: s.setsDone + 1, volumeKg: s.volumeKg + s.reps * (s.bodyweight ? 0 : s.kg) }
  }
  return enterStep(ns, ns.stepIdx + 1)
}

// +1 tour : incrémente les tours du bloc courant, reconstruit la timeline, et
// re-localise le pas courant par sa clé (ne décale PAS le bloc en cours).
function addTour(s: EngineState): EngineState {
  const step = s.timeline[s.stepIdx]
  const blockIdx = step?.blockIdx ?? 0
  const blocks = s.blocks.map((b, i) =>
    i !== blockIdx ? b
      : b.mode === 'circuit' ? { ...b, circuitRounds: (b.circuitRounds ?? 1) + 1 }
        : { ...b, sets: b.sets + 1 })
  const timeline = buildTimeline(blocks)
  const key = step ? stepKey(step) : ''
  let idx = timeline.findIndex(x => stepKey(x) === key)
  if (idx < 0) idx = Math.min(s.stepIdx, timeline.length - 1)
  return { ...s, blocks, timeline, stepIdx: idx }
}

export type Action =
  | { t: 'TICK' } | { t: 'BEGIN' } | { t: 'PRIMARY' }
  | { t: 'NUDGE_REPS'; d: number } | { t: 'NUDGE_KG'; d: number }
  | { t: 'SET_REPS'; v: number } | { t: 'SET_KG'; v: number }
  | { t: 'ADJUST_REST'; d: number } | { t: 'ADD_TOUR' }
  | { t: 'PAUSE' } | { t: 'RESUME' }

export function reducer(s: EngineState, a: Action): EngineState {
  switch (a.t) {
    case 'BEGIN': return { ...s, phase: 'prepare', remaining: PREPARE_SEC, elapsed: 0 }
    case 'TICK': {
      if (s.paused || s.phase === 'summary' || s.phase === 'done') return s
      const elapsed = s.elapsed + 1
      if (s.phase === 'effortReps') return { ...s, elapsed } // auto-rythmé : pas de décompte
      const remaining = s.remaining - 1
      if (remaining > 0) return { ...s, elapsed, remaining }
      return s.phase === 'prepare' ? enterStep({ ...s, elapsed }, 0) : enterStep({ ...s, elapsed }, s.stepIdx + 1)
    }
    case 'PRIMARY':
      if (s.phase === 'prepare') return enterStep(s, 0)
      if (s.phase === 'effortReps') return validateAndAdvance(s)
      if (s.phase === 'effortTime' || s.phase === 'rest') return enterStep(s, s.stepIdx + 1)
      return s
    case 'NUDGE_REPS': return s.phase === 'effortReps' ? { ...s, reps: Math.max(0, s.reps + a.d) } : s
    case 'NUDGE_KG': {
      if (s.phase !== 'effortReps') return s
      if (s.bodyweight && a.d <= 0) return s
      const bodyweight = s.bodyweight && a.d > 0 ? false : s.bodyweight
      return { ...s, bodyweight, kg: Math.max(0, +(s.kg + a.d).toFixed(1)) }
    }
    case 'SET_REPS': return s.phase === 'effortReps' ? { ...s, reps: Math.max(0, a.v) } : s
    case 'SET_KG': return s.phase === 'effortReps' ? { ...s, kg: Math.max(0, a.v), bodyweight: false } : s
    case 'ADJUST_REST': return s.phase === 'rest' ? { ...s, remaining: Math.max(0, s.remaining + a.d) } : s
    case 'ADD_TOUR': return addTour(s)
    case 'PAUSE': return { ...s, paused: true }
    case 'RESUME': return { ...s, paused: false }
    default: return s
  }
}
