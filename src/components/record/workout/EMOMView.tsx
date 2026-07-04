'use client'
import { useEffect, useState, useRef } from 'react'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'
import { useI18n } from '@/lib/i18n'

interface Props {
  exercise: WorkoutExercise
  onSetDone: (set: CompletedSet) => void
  isDark: boolean
  accent: string
}

export default function EMOMView({ exercise, onSetDone, isDark, accent }: Props) {
  const { t } = useI18n()
  const totalMinutes = exercise.emomMinutes ?? 10
  // EMOM : 1 exercice par minute. S'il y a plusieurs exos dans le circuit, on
  // tourne dessus (minute 1 → exo 1, minute 2 → exo 2, …, puis on reboucle).
  const exos = exercise.circuitExercises && exercise.circuitExercises.length ? exercise.circuitExercises : [exercise]
  const [currentMinute, setCurrentMinute] = useState(0)
  const [secondsInMinute, setSecondsInMinute] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [vals, setVals] = useState<Record<string, { reps: number; weightKg: number }>>(
    () => Object.fromEntries(exos.map(e => [e.id, { reps: e.reps, weightKg: e.weightKg }])),
  )
  const completedThisMinuteRef = useRef(false)
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const surface = 'var(--bg-card2)'
  const separator = 'var(--border)'

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

  const activeExo = exos[currentMinute % exos.length]
  const av = vals[activeExo.id] ?? { reps: activeExo.reps, weightKg: activeExo.weightKg }
  const setAv = (patch: Partial<{ reps: number; weightKg: number }>) => setVals(s => ({ ...s, [activeExo.id]: { ...av, ...patch } }))

  const handleDone = () => {
    if (completedThisMinuteRef.current) return
    completedThisMinuteRef.current = true
    onSetDone({ exerciseId: activeExo.id, setIndex: currentMinute, reps: av.reps, weightKg: av.weightKg, completedAt: Date.now() })
  }

  const timeLeft = 60 - secondsInMinute
  const isWork = secondsInMinute < 45
  const phaseColor = isWork ? accent : '#22C55E'

  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, margin: '0 0 4px' }}>EMOM</p>
      <p style={{ fontSize: 13, color: dim, margin: '0 0 20px' }}>{t('record.emomMinuteProgress', { current: currentMinute + 1, total: totalMinutes })}</p>

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
          {isWork ? t('record.emomWork') : t('record.emomRest')}
        </p>
      </div>

      <div style={{ background: surface, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: dim, margin: '0 0 12px' }}>{activeExo.name}{exos.length > 1 ? ` ${t('record.emomExoIndex', { current: (currentMinute % exos.length) + 1, total: exos.length })}` : ''}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {([[t('record.emomReps'), 'reps', 1], [t('record.emomLoadKg'), 'weightKg', 2.5]] as const).map(([label, key, step]) => (
            <div key={key} style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', textAlign: 'center' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setAv({ [key]: Math.max(0, +(av[key] - step).toFixed(1)) })} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-card)', border: `1px solid ${separator}`, color: text, fontSize: 18, cursor: 'pointer' }}>−</button>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 700, color: text }}>{av[key]}</span>
                <button onClick={() => setAv({ [key]: +(av[key] + step).toFixed(1) })} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-card)', border: `1px solid ${separator}`, color: text, fontSize: 18, cursor: 'pointer' }}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!done && !running && (
        <button onClick={() => setRunning(true)} style={{ width: '100%', height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
          {t('record.emomStart')}
        </button>
      )}
      {running && (
        <button onClick={handleDone} disabled={completedThisMinuteRef.current} style={{ width: '100%', height: 52, borderRadius: 16, background: completedThisMinuteRef.current ? surface : `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', color: completedThisMinuteRef.current ? dim : '#fff', fontSize: 16, fontWeight: 600, cursor: completedThisMinuteRef.current ? 'default' : 'pointer' }}>
          {completedThisMinuteRef.current ? t('record.emomDoneMark') : t('record.emomMarkDone')}
        </button>
      )}
      {done && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: accent, fontSize: 15, fontWeight: 600 }}>{t('record.emomDone')}</div>
      )}
    </div>
  )
}
