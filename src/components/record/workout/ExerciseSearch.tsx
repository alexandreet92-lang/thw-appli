'use client'
import { useState, useMemo } from 'react'
import type { WorkoutExercise } from '@/types/workout'
import { DEFAULT_GYM_EXERCISES, DEFAULT_HYROX_EXERCISES } from '@/types/workout'
import { useI18n } from '@/lib/i18n'

interface Props {
  sport: 'gym' | 'hyrox'
  onAdd: (exercise: WorkoutExercise) => void
  onClose: () => void
  isDark: boolean
}

export default function ExerciseSearch({ sport, onAdd, onClose, isDark }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const pool = sport === 'gym' ? DEFAULT_GYM_EXERCISES : DEFAULT_HYROX_EXERCISES
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const bg = 'var(--bg-card)'
  const surface = 'var(--bg-card2)'
  const border = 'var(--border-mid)'
  const separator = 'var(--border)'

  const filtered = useMemo(() => {
    if (!query.trim()) return pool
    const q = query.toLowerCase()
    return pool.filter(e => e.name.toLowerCase().includes(q))
  }, [query, pool])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${separator}`, paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: text, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('record.searchPlaceholder')}
          style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 14px', fontSize: 15, color: text, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((ex, idx) => (
          <button
            key={ex.id}
            onClick={() => { onAdd({ ...ex, id: `${ex.id}_${Date.now()}` }); onClose() }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? `1px solid ${separator}` : 'none', gap: 12, textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h3M11 8h3M5 4v8M11 4v8M5 8h6" stroke={dim} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: text, margin: 0 }}>{ex.name}</p>
              <p style={{ fontSize: 12, color: dim, margin: '2px 0 0' }}>
                {ex.sets} × {ex.reps}{ex.weightKg > 0 ? ` · ${ex.weightKg}kg` : ''}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke={dim} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: dim }}>
            <p style={{ fontSize: 14 }}>{t('record.searchEmpty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
