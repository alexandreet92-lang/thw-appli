'use client'
// Orchestrateur « Séance en direct » (muscu). Machine à états via useSessionEngine ;
// rend l'écran résumé puis les phases colorées + surcouches (pause / progression /
// pavé). Fin → SessionSaveForm (persistance workout_sessions existante).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSessionEngine } from './useSessionEngine'
import { useHeartRate } from '@/lib/record/useHeartRate'
import PhaseShell from './PhaseShell'
import { PrepareBody, EffortRepsBody, EffortTimeBody, RestBody, DoneBody } from './PhaseBodies'
import SummaryScreen from './SummaryScreen'
import PauseOverlay from './PauseOverlay'
import ProgressSheet from './ProgressSheet'
import NumPadSheet from './NumPadSheet'
import SessionSaveForm, { type SessionFormData } from '../SessionSaveForm'
import { fmt } from './liveUi'
import { saveWorkout } from './saveWorkout'
import type { WorkoutExercise } from '@/types/workout'

interface Props { blocks: WorkoutExercise[]; planTitle?: string; onClose: () => void; isDark: boolean; variant?: 'A' | 'B' }

const PHASE_NAME: Record<string, string> = { prepare: 'PRÉPARER', effortReps: 'EFFORT', effortTime: 'EFFORT', rest: 'REPOS', done: 'TERMINÉ' }
const ACTION: Record<string, string> = { prepare: 'Passer', effortReps: 'Valider', effortTime: 'Terminer', rest: 'Passer', done: 'Enregistrer' }

export default function SessionRunner({ blocks, planTitle, onClose, isDark, variant = 'A' }: Props) {
  const { state, step, color, toursRemaining, exosRemaining, dispatch } = useSessionEngine(blocks)
  const hr = useHeartRate()
  const [startedAt] = useState(() => new Date().toISOString())
  const [pad, setPad] = useState<'reps' | 'kg' | null>(null)
  const [progress, setProgress] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const title = planTitle || 'Musculation'

  const handleSave = async (form: SessionFormData) => {
    await saveWorkout({ sport: 'gym', startedAt, durationSec: state.elapsed, exercises: blocks,
      setsCompleted: state.setsDone, volumeKg: state.volumeKg, hr: { avg: hr.avg, max: hr.max, min: hr.min }, form })
    onClose()
  }
  const primary = () => (state.phase === 'done' ? setShowSave(true) : dispatch({ t: 'PRIMARY' }))

  const inner = (() => {
    if (state.phase === 'summary') {
      return <SummaryScreen title={title} blocks={blocks} onStart={() => dispatch({ t: 'BEGIN' })} onClose={onClose} />
    }
    const ctx = step ?? state.timeline[0]
    const first = state.timeline[0]
    const firstName = first && first.kind === 'effort' ? first.ex.name : ''
    const done = state.phase === 'done'
    return (
      <PhaseShell
        color={color}
        phaseName={PHASE_NAME[state.phase]}
        clock={fmt(state.elapsed)}
        toursInBlock={ctx?.toursInBlock ?? 1}
        tourInBlock={done ? (ctx?.toursInBlock ?? 1) : (step?.tourInBlock ?? 1)}
        toursRemaining={done ? 0 : toursRemaining}
        exosRemaining={done ? 0 : exosRemaining}
        actionLabel={ACTION[state.phase]}
        onAction={primary}
        onPause={() => dispatch({ t: 'PAUSE' })}
        onProgress={() => setProgress(true)}
        hr={hr}
      >
        {state.phase === 'prepare' && <PrepareBody remaining={state.remaining} firstExo={firstName} />}
        {state.phase === 'effortReps' && step?.kind === 'effort' && <EffortRepsBody step={step} state={state} dispatch={dispatch} onOpenPad={setPad} />}
        {state.phase === 'effortTime' && step?.kind === 'effort' && <EffortTimeBody step={step} remaining={state.remaining} />}
        {state.phase === 'rest' && step?.kind === 'rest' && <RestBody step={step} remaining={state.remaining} dispatch={dispatch} />}
        {state.phase === 'done' && <DoneBody setsDone={state.setsDone} volumeKg={state.volumeKg} />}
      </PhaseShell>
    )
  })()

  return createPortal(
    <div data-phase-variant={variant} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--bg)' }}>
      {inner}
      {state.paused && <PauseOverlay onResume={() => dispatch({ t: 'RESUME' })} onEnd={onClose} />}
      {progress && <ProgressSheet timeline={state.timeline} stepIdx={state.stepIdx} onClose={() => setProgress(false)} />}
      {pad && (
        <NumPadSheet
          title={pad === 'reps' ? 'Répétitions' : 'Charge (kg)'}
          initial={pad === 'reps' ? state.reps : state.bodyweight ? 0 : state.kg}
          onClose={() => setPad(null)}
          onSubmit={v => { dispatch(pad === 'reps' ? { t: 'SET_REPS', v } : { t: 'SET_KG', v }); setPad(null) }}
        />
      )}
      {showSave && (
        <SessionSaveForm sport="gym" startedAt={startedAt} isDark={isDark}
          onBack={() => setShowSave(false)} onSave={handleSave}
          summary={{ exos: blocks.length, sets: state.setsDone, volumeKg: state.volumeKg, durationSec: state.elapsed }}
          hr={{ avg: hr.avg, min: hr.min, max: hr.max }} />
      )}
    </div>,
    document.body,
  )
}
