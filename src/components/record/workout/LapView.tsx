'use client'
import { useState } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'
import RestTimer from './RestTimer'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  isDark: boolean
  accent: string
}

export default function LapView({ exercise, onSetDone, isDark, accent }: Props) {
  const rounds = exercise.circuitRounds ?? 3
  const exercises = exercise.circuitExercises ?? []
  const [currentRound, setCurrentRound] = useState(0)
  const [currentEx, setCurrentEx] = useState(0)
  const [resting, setResting] = useState(false)
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const surface = 'var(--bg-card2)'
  const separator = 'var(--border)'

  const done = currentRound >= rounds

  const handleNext = () => {
    const ex = exercises[currentEx] ?? exercise
    onSetDone({ exerciseId: ex.id, setIndex: currentRound, reps: ex.reps, weightKg: ex.weightKg, completedAt: Date.now() })
    if (exercises.length > 0 && currentEx + 1 < exercises.length) {
      setCurrentEx(e => e + 1)
    } else {
      setCurrentEx(0)
      if (currentRound + 1 < rounds) {
        setCurrentRound(r => r + 1)
        setResting(true)
      } else {
        setCurrentRound(rounds)
      }
    }
  }

  if (resting) {
    return <RestTimer seconds={exercise.circuitRestSec ?? 60} onDone={() => setResting(false)} isDark={isDark} accent={accent} />
  }

  const activeEx = exercises.length > 0 ? exercises[currentEx] : exercise

  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, margin: '0 0 4px' }}>Circuit</p>
      <p style={{ fontSize: 13, color: dim, margin: '0 0 20px' }}>Tour {done ? rounds : currentRound + 1} / {rounds}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: rounds }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < currentRound ? accent : i === currentRound ? `${accent}66` : separator }} />
        ))}
      </div>

      {done ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: accent, fontSize: 15, fontWeight: 600 }}>Circuit terminé ✓</div>
      ) : (
        <>
          {exercises.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              {exercises.map((ex, i) => (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${separator}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === currentEx ? accent : i < currentEx ? `${accent}66` : dim, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: i === currentEx ? text : dim, fontWeight: i === currentEx ? 600 : 400 }}>{ex.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: dim }}>{ex.reps} × {ex.weightKg > 0 ? `${ex.weightKg}kg` : 'pc'}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: surface, borderRadius: 16, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: dim, margin: '0 0 4px' }}>{activeEx.name}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: text, margin: 0 }}>
              {activeEx.reps} {activeEx.weightKg > 0 ? `× ${activeEx.weightKg}kg` : 'reps'}
            </p>
          </div>

          <button onClick={handleNext} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Suivant →
          </button>
        </>
      )}
    </div>
  )
}
