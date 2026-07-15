'use client'
// Corps spécifiques à chaque phase, posés dans PhaseShell. Encre héritée.
import { fmt, BigTime, BigName, Kicker, Sub } from './liveUi'
import RepsInput from './RepsInput'
import type { EffortStep, RestStep } from './types'
import type { Action } from './sessionReducer'
import type { EngineState } from './sessionReducer'

const chip: React.CSSProperties = {
  border: '2px solid currentColor', borderRadius: 20, padding: '8px 14px', fontSize: 13, fontWeight: 800,
  opacity: 0.85, cursor: 'pointer', background: 'transparent', color: 'inherit',
}

export function PrepareBody({ remaining, firstExo }: { remaining: number; firstExo: string }) {
  return (<>
    <Kicker>Tenez-vous prêt</Kicker>
    <BigTime>{fmt(remaining)}</BigTime>
    <Sub>Premier · <b>{firstExo}</b></Sub>
  </>)
}

export function EffortTimeBody({ step, remaining }: { step: EffortStep; remaining: number }) {
  return (<>
    <BigName>{step.ex.name}</BigName>
    <BigTime>{fmt(remaining)}</BigTime>
    <Sub>Tenir · <b>{step.ex.durationSec} s</b></Sub>
  </>)
}

export function RestBody({ step, remaining, dispatch }: { step: RestStep; remaining: number; dispatch: (a: Action) => void }) {
  return (<>
    <Kicker>{step.tourEnd ? 'Repos de tour' : 'Repos court'}</Kicker>
    <BigTime>{fmt(remaining)}</BigTime>
    <Sub>À suivre · <b>{step.nextExoName}</b></Sub>
    <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button style={chip} onClick={() => dispatch({ t: 'ADJUST_REST', d: -15 })}>−15 s</button>
      <button style={chip} onClick={() => dispatch({ t: 'ADJUST_REST', d: 15 })}>+15 s</button>
      <button style={chip} onClick={() => dispatch({ t: 'ADD_TOUR' })}>+1 tour</button>
    </div>
  </>)
}

export function EffortRepsBody({ step, state, dispatch, onOpenPad }: {
  step: EffortStep; state: EngineState; dispatch: (a: Action) => void; onOpenPad: (t: 'reps' | 'kg') => void
}) {
  return (<>
    <BigName>{step.ex.name}</BigName>
    <RepsInput
      reps={state.reps} kg={state.kg} bodyweight={state.bodyweight}
      targetReps={step.ex.targetReps} targetKg={step.ex.targetWeightKg}
      onNudgeReps={d => dispatch({ t: 'NUDGE_REPS', d })}
      onNudgeKg={d => dispatch({ t: 'NUDGE_KG', d })}
      onOpenPad={onOpenPad}
    />
  </>)
}

export function DoneBody({ setsDone, volumeKg }: { setsDone: number; volumeKg: number }) {
  return (<>
    <Kicker>Séance bouclée</Kicker>
    <Sub><b>{setsDone}</b> séries · <b>{Math.round(volumeKg)}</b> kg</Sub>
  </>)
}
