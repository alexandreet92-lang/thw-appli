'use client'
import { useEffect, useState, useRef } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  isDark: boolean
  accent: string
}

export default function EMOMView({ exercise, onSetDone, isDark, accent }: Props) {
  const totalMinutes = exercise.emomMinutes ?? 10
  const [currentMinute, setCurrentMinute] = useState(0)
  const [secondsInMinute, setSecondsInMinute] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const completedThisMinuteRef = useRef(false)
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF'
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'

  useEffect(() => {
    if (!running || done) return
    const t = setInterval(() => {
      setSecondsInMinute(s => {
        if (s + 1 >= 60) {
          const next = currentMinute + 1
          if (next >= totalMinutes) { setDone(true); setRunning(false); return 0 }
          setCurrentMinute(next)
          completedThisMinuteRef.current = false
          return 0
        }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, done, currentMinute, totalMinutes])

  const handleDone = () => {
    if (completedThisMinuteRef.current) return
    completedThisMinuteRef.current = true
    onSetDone({ exerciseId: exercise.id, setIndex: currentMinute, reps: exercise.reps, weightKg: exercise.weightKg, completedAt: Date.now() })
  }

  const timeLeft = 60 - secondsInMinute
  const isWork = secondsInMinute < 45
  const phaseColor = isWork ? accent : '#22C55E'

  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, margin: '0 0 4px' }}>EMOM</p>
      <p style={{ fontSize: 13, color: dim, margin: '0 0 20px' }}>Minute {currentMinute + 1} / {totalMinutes}</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {Array.from({ length: totalMinutes }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < currentMinute ? accent : i === currentMinute ? `${accent}88` : separator }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 110, height: 110, borderRadius: '50%', border: `6px solid ${phaseColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s' }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: text, lineHeight: 1 }}>{timeLeft}</span>
          <span style={{ fontSize: 11, color: dim }}>sec</span>
        </div>
        <p style={{ fontSize: 13, color: phaseColor, fontWeight: 600, margin: '10px 0 0', transition: 'color 0.3s' }}>
          {isWork ? 'TRAVAIL' : 'REPOS'}
        </p>
      </div>

      <div style={{ background: surface, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: dim, margin: '0 0 4px' }}>{exercise.name}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: text, margin: 0 }}>
          {exercise.reps} {exercise.weightKg > 0 ? `× ${exercise.weightKg}kg` : 'reps'}
        </p>
      </div>

      {!done && !running && (
        <button onClick={() => setRunning(true)} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
          Démarrer EMOM
        </button>
      )}
      {running && (
        <button onClick={handleDone} disabled={completedThisMinuteRef.current} style={{ width: '100%', height: 52, borderRadius: 16, background: completedThisMinuteRef.current ? surface : `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: completedThisMinuteRef.current ? dim : '#fff', fontSize: 16, fontWeight: 600, cursor: completedThisMinuteRef.current ? 'default' : 'pointer' }}>
          {completedThisMinuteRef.current ? '✓ Fait' : 'Marquer fait'}
        </button>
      )}
      {done && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: accent, fontSize: 15, fontWeight: 600 }}>EMOM terminé ✓</div>
      )}
    </div>
  )
}
