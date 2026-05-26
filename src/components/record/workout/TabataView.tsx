'use client'
import { useEffect, useState, useRef } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  isDark: boolean
  accent: string
}

type Phase = 'idle' | 'work' | 'rest' | 'done'

export default function TabataView({ exercise, onSetDone, isDark, accent }: Props) {
  const totalRounds = exercise.tabataRounds ?? 8
  const workSec = exercise.tabataWorkSec ?? 20
  const restSec = exercise.tabataRestSec ?? 10
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(workSec)
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF'
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return
    clearTimer()
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearTimer()
          if (phase === 'work') {
            onSetDone({ exerciseId: exercise.id, setIndex: round, reps: exercise.reps, weightKg: exercise.weightKg, completedAt: Date.now() })
            if (round + 1 >= totalRounds) { setPhase('done'); return 0 }
            setRound(p => p + 1)
            setPhase('rest')
            return restSec
          } else {
            setPhase('work')
            return workSec
          }
        }
        return r - 1
      })
    }, 1000)
    return clearTimer
  }, [phase, round, totalRounds, workSec, restSec, onSetDone, exercise])

  const start = () => { setPhase('work'); setRemaining(workSec) }
  const phaseColor = phase === 'work' ? accent : phase === 'rest' ? '#22C55E' : dim
  const total = phase === 'work' ? workSec : restSec
  const circumference = 2 * Math.PI * 50
  const progress = remaining / total

  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, margin: '0 0 4px' }}>Tabata</p>
      <p style={{ fontSize: 13, color: dim, margin: '0 0 16px' }}>Tour {phase === 'done' ? totalRounds : round + 1} / {totalRounds}</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < round ? accent : i === round ? `${accent}88` : separator }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'} strokeWidth="7" />
            {phase !== 'idle' && phase !== 'done' && (
              <circle cx="60" cy="60" r="50" fill="none" stroke={phaseColor} strokeWidth="7"
                strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
              />
            )}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 38, fontWeight: 700, color: text, lineHeight: 1 }}>{phase === 'idle' || phase === 'done' ? '--' : remaining}</span>
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: phaseColor, margin: '10px 0 0', letterSpacing: '0.08em', transition: 'color 0.3s' }}>
          {phase === 'idle' ? 'PRÊT' : phase === 'work' ? 'TRAVAIL' : phase === 'rest' ? 'REPOS' : 'TERMINÉ'}
        </p>
        <p style={{ fontSize: 12, color: dim, margin: '4px 0 0' }}>{workSec}s / {restSec}s</p>
      </div>

      <div style={{ background: surface, borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: dim, margin: '0 0 2px' }}>{exercise.name}</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0 }}>Max reps {exercise.weightKg > 0 ? `@ ${exercise.weightKg}kg` : ''}</p>
      </div>

      {phase === 'idle' && (
        <button onClick={start} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
          Démarrer Tabata
        </button>
      )}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '8px 0', color: accent, fontSize: 15, fontWeight: 600 }}>Tabata terminé ✓</div>
      )}
    </div>
  )
}
