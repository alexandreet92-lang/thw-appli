'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import type { YogaSessionExercise } from '@/types/yoga'

interface Props {
  exercise: YogaSessionExercise
  enabled: boolean
  isDark: boolean
}

export default function AICoachingTip({ exercise, enabled, isDark }: Props) {
  const { t } = useI18n()
  const [tip, setTip]         = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const text = isDark ? '#FFFFFF' : '#0A0A0A'

  useEffect(() => {
    if (!enabled) return
    setTip(null)
    setLoading(true)
    fetch('/api/yoga-tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise: exercise.name }),
    })
      .then(r => r.json())
      .then(d => { setTip(d.tip || null) })
      .catch(() => { setTip(null) })
      .finally(() => setLoading(false))
  }, [exercise.name, enabled])

  if (!enabled) return null

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        padding: '14px 18px',
        background: 'rgba(6,182,212,0.08)',
        border: '1px solid rgba(6,182,212,0.20)',
        borderRadius: 14,
        maxWidth: 320, textAlign: 'center',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              border: '2px solid rgba(6,182,212,0.3)',
              borderTopColor: '#06B6D4',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#8C8C8C' }}>{t('record.aiCoachingTipLoading')}</span>
          </div>
        ) : tip ? (
          <p style={{ fontSize: 14, color: text, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            &ldquo;{tip}&rdquo;
          </p>
        ) : null}
      </div>
    </>
  )
}
