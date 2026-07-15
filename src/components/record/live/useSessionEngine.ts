'use client'
// Hook moteur : enveloppe le reducer pur avec le timer (1 s) et le wake-lock.
// Expose l'état + des actions + le pas courant et quelques dérivés d'affichage.
import { useEffect, useMemo, useReducer, useRef } from 'react'
import { reducer, initState, type EngineState, type Action } from './sessionReducer'
import type { PhaseColor, TimelineStep } from './types'
import type { WorkoutExercise } from '@/types/workout'

function phaseColor(phase: EngineState['phase']): PhaseColor {
  if (phase === 'prepare') return 'prepare'
  if (phase === 'rest' || phase === 'done') return 'rest'
  return 'effort'
}

export interface EngineView {
  state: EngineState
  step: TimelineStep | undefined
  color: PhaseColor
  toursRemaining: number
  exosRemaining: number
  dispatch: (a: Action) => void
}

export function useSessionEngine(blocks: WorkoutExercise[]): EngineView {
  const [state, dispatch] = useReducer(reducer, blocks, initState)

  // Timer 1 s : ne tourne pas en pause / résumé / terminé.
  const running = !state.paused && state.phase !== 'summary' && state.phase !== 'done'
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => dispatch({ t: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [running])

  // Empêche la mise en veille pendant la séance (dégradation propre si absent).
  const lockRef = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!running) return
    navigator.wakeLock?.request('screen').then(l => { lockRef.current = l }).catch(() => {})
    return () => { lockRef.current?.release().catch(() => {}); lockRef.current = null }
  }, [running])

  const step = state.timeline[state.stepIdx]
  const { toursRemaining, exosRemaining } = useMemo(() => {
    if (!step) return { toursRemaining: 0, exosRemaining: 0 }
    const tours = Math.max(0, step.toursInBlock - step.tourInBlock)
    const exos = step.kind === 'effort' ? Math.max(0, step.exosInTour - 1 - step.exIdxInTour) : 0
    return { toursRemaining: tours, exosRemaining: exos }
  }, [step])

  return { state, step, color: phaseColor(state.phase), toursRemaining, exosRemaining, dispatch }
}
