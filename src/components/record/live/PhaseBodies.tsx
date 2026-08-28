'use client'
// Corps spécifiques à chaque phase, posés dans PhaseShell. Encre héritée.
import { fmt, BigTime, BigName, Kicker, Sub } from './liveUi'
import RepsInput from './RepsInput'
import { useI18n } from '@/lib/i18n'
import type { EffortStep, RestStep } from './types'
import type { Action } from './sessionReducer'
import type { EngineState } from './sessionReducer'

const chip: React.CSSProperties = {
  border: '2px solid currentColor', borderRadius: 20, padding: '8px 14px', fontSize: 13, fontWeight: 800,
  opacity: 0.85, cursor: 'pointer', background: 'transparent', color: 'inherit',
}

export function PrepareBody({ remaining, firstExo }: { remaining: number; firstExo: string }) {
  const { t } = useI18n()
  return (<>
    <Kicker>{t('w3a.prepare_ready')}</Kicker>
    <BigTime>{fmt(remaining)}</BigTime>
    <Sub>{t('w3a.first')} · <b>{firstExo}</b></Sub>
  </>)
}

export function EffortTimeBody({ step, remaining }: { step: EffortStep; remaining: number }) {
  const { t } = useI18n()
  return (<>
    <BigName>{step.ex.name}</BigName>
    <BigTime>{fmt(remaining)}</BigTime>
    <Sub>{t('w3a.hold')} · <b>{step.ex.durationSec} s</b></Sub>
  </>)
}

export function RestBody({ step, remaining, dispatch }: { step: RestStep; remaining: number; dispatch: (a: Action) => void }) {
  const { t } = useI18n()
  return (<>
    <Kicker>{step.tourEnd ? t('w3a.rest_tour') : t('w3a.rest_short')}</Kicker>
    <BigTime>{fmt(remaining)}</BigTime>
    <Sub>{t('w3a.up_next')} · <b>{step.nextExoName}</b></Sub>
    <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button style={chip} onClick={() => dispatch({ t: 'ADJUST_REST', d: -15 })}>−15 s</button>
      <button style={chip} onClick={() => dispatch({ t: 'ADJUST_REST', d: 15 })}>+15 s</button>
      <button style={chip} onClick={() => dispatch({ t: 'ADD_TOUR' })}>{t('w3a.add_tour')}</button>
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
  const { t } = useI18n()
  return (<>
    <Kicker>{t('w3a.done_wrapped')}</Kicker>
    <Sub><b>{setsDone}</b> {t('w3a.series')} · <b>{Math.round(volumeKg)}</b> kg</Sub>
  </>)
}
