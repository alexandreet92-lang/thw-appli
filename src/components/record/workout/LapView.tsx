'use client'
import { useState } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'
import { useI18n } from '@/lib/i18n'
import RestTimer from './RestTimer'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  isDark: boolean
  accent: string
}

export default function LapView({ exercise, onSetDone, isDark, accent }: Props) {
  const { t } = useI18n()
  const rounds = exercise.circuitRounds ?? 3
  const exercises = exercise.circuitExercises ?? []
  const list = exercises.length > 0 ? exercises : [exercise]
  const [currentRound, setCurrentRound] = useState(0)
  const [currentEx, setCurrentEx] = useState(0)
  const [resting, setResting] = useState(false)
  // Valeurs réellement faites (reps/charge), éditables — préremplies depuis le plan.
  const [vals, setVals] = useState<Record<string, { reps: number; weightKg: number }>>(
    () => Object.fromEntries(list.map(e => [e.id, { reps: e.reps, weightKg: e.weightKg }])),
  )
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const surface = 'var(--bg-card2)'
  const separator = 'var(--border)'

  const done = currentRound >= rounds
  const valOf = (id: string, e: WorkoutExercise) => vals[id] ?? { reps: e.reps, weightKg: e.weightKg }

  const handleNext = () => {
    const ex = exercises[currentEx] ?? exercise
    const v = valOf(ex.id, ex)
    onSetDone({ exerciseId: ex.id, setIndex: currentRound, reps: v.reps, weightKg: v.weightKg, completedAt: Date.now() })
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
      <p style={{ fontSize: 13, color: dim, margin: '0 0 20px' }}>{t('record.lapRoundProgress', { current: done ? rounds : currentRound + 1, total: rounds })}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: rounds }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < currentRound ? accent : i === currentRound ? `${accent}66` : separator }} />
        ))}
      </div>

      {done ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: accent, fontSize: 15, fontWeight: 600 }}>{t('record.lapDone')}</div>
      ) : (
        <>
          {exercises.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              {exercises.map((ex, i) => {
                const v = valOf(ex.id, ex)
                return (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${separator}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === currentEx ? accent : i < currentEx ? `${accent}66` : dim, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: i === currentEx ? text : dim, fontWeight: i === currentEx ? 600 : 400 }}>{ex.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: dim }}>{v.reps} × {v.weightKg > 0 ? `${v.weightKg}kg` : t('record.lapBodyweightAbbr')}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Exercice en cours — reps / charge éditables (ce que tu as réellement fait) */}
          <div style={{ background: surface, borderRadius: 16, padding: '16px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: dim, margin: '0 0 14px', textAlign: 'center', fontWeight: 600 }}>{activeEx.name}</p>
            {(() => {
              const v = valOf(activeEx.id, activeEx)
              const setV = (patch: Partial<{ reps: number; weightKg: number }>) => setVals(s => ({ ...s, [activeEx.id]: { ...v, ...patch } }))
              const stepBtn = { width: 40, height: 40, borderRadius: 11, background: 'var(--bg-card)', border: `1px solid ${separator}`, color: text, fontSize: 20, cursor: 'pointer' } as React.CSSProperties
              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', textAlign: 'center' }}>Reps</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setV({ reps: Math.max(0, v.reps - 1) })} style={stepBtn}>−</button>
                      <span style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: 700, color: text }}>{v.reps}</span>
                      <button onClick={() => setV({ reps: v.reps + 1 })} style={stepBtn}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', textAlign: 'center' }}>{t('record.lapLoadKg')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setV({ weightKg: Math.max(0, +(v.weightKg - 2.5).toFixed(1)) })} style={stepBtn}>−</button>
                      <span style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: 700, color: text }}>{v.weightKg}</span>
                      <button onClick={() => setV({ weightKg: +(v.weightKg + 2.5).toFixed(1) })} style={stepBtn}>+</button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          <button onClick={handleNext} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            {t('record.lapNext')}
          </button>
        </>
      )}
    </div>
  )
}
