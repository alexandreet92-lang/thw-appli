'use client'
import { useState, useRef } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'
import { useI18n } from '@/lib/i18n'
import RestTimer from './RestTimer'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  onRestDone?: (exerciseIds: string[], setIndex: number, restSec: number) => void
  isDark: boolean
  accent: string
}

export default function SupersetView({ exercise, onSetDone, onRestDone, isDark, accent }: Props) {
  const { t } = useI18n()
  const partnerB = exercise.supersetPartner
  const [currentSet, setCurrentSet] = useState(0)
  const [phase, setPhase] = useState<'A' | 'B'>('A')
  const [resting, setResting] = useState(false)
  const restForSet = useRef(0)
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const surface = 'var(--bg-card2)'
  const separator = 'var(--border)'

  const done = currentSet >= exercise.sets

  const handleMark = () => {
    const ex = phase === 'A' ? exercise : (partnerB ?? exercise)
    onSetDone({ exerciseId: ex.id, setIndex: currentSet, reps: ex.reps, weightKg: ex.weightKg, completedAt: Date.now() })
    if (phase === 'A' && partnerB) {
      setPhase('B')
    } else {
      setPhase('A')
      if (currentSet + 1 < exercise.sets) {
        restForSet.current = currentSet
        setCurrentSet(s => s + 1)
        setResting(true)
      } else {
        setCurrentSet(exercise.sets)
      }
    }
  }

  if (resting) {
    const ids = [exercise.id, partnerB?.id].filter((x): x is string => !!x)
    return <RestTimer seconds={exercise.restSec}
      onDone={sec => { onRestDone?.(ids, restForSet.current, sec); setResting(false) }}
      isDark={isDark} accent={accent} />
  }

  const activeEx = phase === 'A' ? exercise : (partnerB ?? exercise)
  const accentA = accent
  const accentB = '#F97316'

  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, margin: '0 0 4px' }}>Superset</p>
      <p style={{ fontSize: 13, color: dim, margin: '0 0 20px' }}>{t('record.supersetSetProgress', { current: done ? exercise.sets : currentSet + 1, total: exercise.sets })}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {Array.from({ length: exercise.sets }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < currentSet ? accent : i === currentSet ? `${accent}66` : separator }} />
        ))}
      </div>

      {done ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: accent, fontSize: 15, fontWeight: 600 }}>{t('record.supersetDone')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[exercise, partnerB].map((ex, i) => {
              if (!ex) return null
              const isActive = (i === 0 && phase === 'A') || (i === 1 && phase === 'B')
              const col = i === 0 ? accentA : accentB
              return (
                <div key={ex.id} style={{ flex: 1, background: isActive ? `${col}18` : surface, border: `2px solid ${isActive ? col : 'transparent'}`, borderRadius: 14, padding: '12px', textAlign: 'center', transition: 'all 0.2s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 auto 8px' }}>{i === 0 ? 'A' : 'B'}</div>
                  <p style={{ fontSize: 12, color: isActive ? text : dim, fontWeight: isActive ? 600 : 400, margin: '0 0 4px' }}>{ex.name}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: isActive ? col : dim, margin: 0 }}>
                    {ex.reps} {ex.weightKg > 0 ? `×${ex.weightKg}` : 'reps'}
                  </p>
                </div>
              )
            })}
          </div>

          <div style={{ background: surface, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: dim, margin: '0 0 2px' }}>{t('record.supersetNow')}</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: text, margin: 0 }}>{activeEx.name} — {activeEx.reps} × {activeEx.weightKg > 0 ? `${activeEx.weightKg}kg` : t('record.supersetBodyweight')}</p>
          </div>

          <button onClick={handleMark} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accentA}, ${accentB})`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            {t('record.supersetMark', { phase })}
          </button>
        </>
      )}
    </div>
  )
}
