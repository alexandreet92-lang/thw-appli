'use client'
import { useState } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'
import { useI18n } from '@/lib/i18n'
import RestTimer from './RestTimer'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  onComplete?: () => void
  hasNext?: boolean
  isDark: boolean
  accent: string
}

export default function SeriesView({ exercise, onSetDone, onComplete, hasNext, isDark, accent }: Props) {
  const { t } = useI18n()
  const [currentSet, setCurrentSet] = useState(0)
  const [reps, setReps] = useState(exercise.reps)
  const [weight, setWeight] = useState(exercise.weightKg)
  const [resting, setResting] = useState(false)
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const surface = 'var(--bg-card2)'
  const separator = 'var(--border)'

  const done = currentSet >= exercise.sets

  const handleMark = () => {
    onSetDone({ exerciseId: exercise.id, setIndex: currentSet, reps, weightKg: weight, completedAt: Date.now() })
    if (currentSet + 1 < exercise.sets) {
      setCurrentSet(s => s + 1)
      setResting(true)
    } else {
      setCurrentSet(exercise.sets)
    }
  }

  if (resting) {
    return <RestTimer seconds={exercise.restSec} onDone={() => setResting(false)} isDark={isDark} accent={accent} />
  }

  return (
    <div style={{ padding: '20px 20px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, margin: '0 0 4px' }}>
        {exercise.name}
      </p>
      <p style={{ fontSize: 13, color: dim, margin: '0 0 20px' }}>
        {t('record.seriesSetProgress', { current: done ? exercise.sets : currentSet + 1, total: exercise.sets })}
      </p>

      {/* Dot progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {Array.from({ length: exercise.sets }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < currentSet ? accent : i === currentSet ? `${accent}88` : separator }} />
        ))}
      </div>

      {done ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: accent, fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{t('record.seriesExerciseDone')}</p>
          {hasNext && onComplete && (
            <button onClick={onComplete} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              {t('record.seriesNextBlock')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Reps */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: dim, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{t('record.seriesReps')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setReps(r => Math.max(1, r - 1))} style={{ width: 44, height: 44, borderRadius: 12, background: surface, border: 'none', color: text, fontSize: 22, cursor: 'pointer' }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 36, fontWeight: 700, color: text, lineHeight: 1 }}>{reps}</span>
              <button onClick={() => setReps(r => r + 1)} style={{ width: 44, height: 44, borderRadius: 12, background: surface, border: 'none', color: text, fontSize: 22, cursor: 'pointer' }}>+</button>
            </div>
          </div>

          {/* Weight */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: dim, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{t('record.seriesLoadKg')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setWeight(w => Math.max(0, +(w - 2.5).toFixed(1)))} style={{ width: 44, height: 44, borderRadius: 12, background: surface, border: 'none', color: text, fontSize: 22, cursor: 'pointer' }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 36, fontWeight: 700, color: text, lineHeight: 1 }}>{weight}</span>
              <button onClick={() => setWeight(w => +(w + 2.5).toFixed(1))} style={{ width: 44, height: 44, borderRadius: 12, background: surface, border: 'none', color: text, fontSize: 22, cursor: 'pointer' }}>+</button>
            </div>
          </div>

          <button onClick={handleMark} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            {t('record.seriesMarkSet')}
          </button>
        </>
      )}
    </div>
  )
}
