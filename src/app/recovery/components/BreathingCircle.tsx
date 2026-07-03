'use client'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale'

const SEQUENCE: { phase: Phase; ms: number; labelKey: string }[] = [
  { phase: 'inhale', ms: 4000, labelKey: 'recovery.breathing.inhale' },
  { phase: 'hold',   ms: 2000, labelKey: 'recovery.breathing.hold' },
  { phase: 'exhale', ms: 6000, labelKey: 'recovery.breathing.exhale'  },
]

export default function BreathingCircle() {
  const { t } = useI18n()
  const [active, setActive]   = useState(false)
  const [phase,  setPhase]    = useState<Phase>('idle')
  const [cycles, setCycles]   = useState(0)
  const [counter, setCounter] = useState(0)

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseIdx   = useRef(0)

  function clearTimers() {
    if (timerRef.current)  clearTimeout(timerRef.current)
    if (countRef.current)  clearInterval(countRef.current)
  }

  function runPhase() {
    const idx = phaseIdx.current % SEQUENCE.length
    const p   = SEQUENCE[idx]
    setPhase(p.phase)
    setCounter(Math.round(p.ms / 1000))
    if (idx === 0 && phaseIdx.current > 0) setCycles(c => c + 1)

    if (countRef.current) clearInterval(countRef.current)
    countRef.current = setInterval(() => setCounter(c => Math.max(0, c - 1)), 1000)

    timerRef.current = setTimeout(() => {
      phaseIdx.current++
      runPhase()
    }, p.ms)
  }

  function start() {
    setActive(true); setCycles(0); phaseIdx.current = 0; runPhase()
  }

  function stop() {
    clearTimers(); setActive(false); setPhase('idle'); setCycles(0)
  }

  useEffect(() => () => clearTimers(), [])

  const expanded = phase === 'inhale' || phase === 'hold'
  const transMs  = phase === 'inhale' ? '4s' : phase === 'exhale' ? '6s' : '0.15s'

  const bgGrad = phase === 'hold'
    ? 'radial-gradient(circle, #06B6D4, #0891B2)'
    : expanded
    ? 'radial-gradient(circle, #60A5FA, #06B6D4)'
    : 'radial-gradient(circle, #3B82F6, #1D4ED8)'

  const seqLabelKey = SEQUENCE.find(s => s.phase === phase)?.labelKey
  const label = phase === 'idle' ? t('recovery.breathing.ready') : (seqLabelKey ? t(seqLabelKey) : '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px', gap: 18 }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 4px', textAlign: 'center' }}>
          {t('recovery.breathing.eyebrow')}
        </p>
        <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0, textAlign: 'center', color: 'var(--text)' }}>
          {t('recovery.breathing.title')}
        </h3>
      </div>

      {/* Animated circle */}
      <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer glow */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(59,130,246,0.08)',
          transform: `scale(${active && expanded ? 1.35 : 1})`,
          transition: `transform ${transMs} ease-in-out`,
        }} />
        {/* Main circle */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: bgGrad,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${active && expanded ? 1.3 : 1})`,
          transition: `transform ${transMs} ease-in-out, background 0.5s ease`,
          boxShadow: active ? '0 0 32px rgba(59,130,246,0.45)' : '0 4px 20px rgba(0,0,0,0.18)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1 }}>
            {label}
          </span>
          {active && (
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'DM Mono,monospace', marginTop: 4 }}>
              {counter}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      {!active ? (
        <button onClick={start} style={{
          padding: '10px 28px', borderRadius: 22, border: 'none',
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
        }}>
          {t('recovery.breathing.start')}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {cycles > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {t(cycles > 1 ? 'recovery.breathing.cyclesDone.other' : 'recovery.breathing.cyclesDone.one', { n: cycles })}
            </span>
          )}
          <button onClick={stop} style={{
            padding: '7px 20px', borderRadius: 18, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
          }}>
            {t('recovery.breathing.stop')}
          </button>
        </div>
      )}

      <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0, textAlign: 'center' }}>
        {t('recovery.breathing.footer')}
      </p>
    </div>
  )
}
