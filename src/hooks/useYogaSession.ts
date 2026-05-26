'use client'
import { useState, useEffect, useRef } from 'react'
import type { YogaSessionExercise } from '@/types/yoga'

export type YogaPhase = 'idle' | 'exercise' | 'rest' | 'paused' | 'finished'
const REST_DURATION = 10

export function useYogaSession(exercises: YogaSessionExercise[]) {
  const [phase, setPhase]               = useState<YogaPhase>('idle')
  const [currentIdx, setCurrentIdx]     = useState(0)
  const [remaining, setRemaining]       = useState(exercises[0]?.duration_seconds ?? 30)
  const [currentDuration, setCurrentDuration] = useState(exercises[0]?.duration_seconds ?? 30)
  const [restRemaining, setRestRemaining] = useState(REST_DURATION)
  const [elapsed, setElapsed]           = useState(0)

  const phaseRef    = useRef(phase)
  const idxRef      = useRef(currentIdx)
  const remainRef   = useRef(remaining)
  const restRef     = useRef(restRemaining)
  phaseRef.current  = phase
  idxRef.current    = currentIdx
  remainRef.current = remaining
  restRef.current   = restRemaining

  const goNext = (fromIdx: number) => {
    const next = fromIdx + 1
    if (next >= exercises.length) {
      setPhase('finished')
    } else {
      setCurrentIdx(next)
      setRemaining(exercises[next].duration_seconds)
      setCurrentDuration(exercises[next].duration_seconds)
      setRestRemaining(REST_DURATION)
      setPhase('rest')
    }
  }

  useEffect(() => {
    const active = phase === 'exercise' || phase === 'rest'
    if (!active) return
    const tick = setInterval(() => {
      setElapsed(e => e + 1)
      if (phaseRef.current === 'exercise') {
        const next = remainRef.current - 1
        if (next <= 0) { goNext(idxRef.current) }
        else setRemaining(next)
      } else if (phaseRef.current === 'rest') {
        const next = restRef.current - 1
        if (next <= 0) { setRestRemaining(REST_DURATION); setPhase('exercise') }
        else setRestRemaining(next)
      }
    }, 1000)
    return () => clearInterval(tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return {
    phase, currentIdx, remaining, currentDuration, restRemaining, elapsed,
    start:   () => { setPhase('exercise') },
    pause:   () => setPhase('paused'),
    resume:  () => setPhase(restRef.current < REST_DURATION ? 'rest' : 'exercise'),
    skip:    () => goNext(idxRef.current),
    addTime: (sec: number) => {
      setRemaining(s => s + sec)
      setCurrentDuration(d => d + sec)
    },
  }
}
