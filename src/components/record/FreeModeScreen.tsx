'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import HRMiniChart from './workout/HRMiniChart'

interface Props {
  sport: 'gym' | 'hyrox'
  onClose: () => void
  isDark: boolean
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FreeModeScreen({ sport, onClose, isDark }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [startedAt] = useState(new Date().toISOString())
  const [hrSamples, setHrSamples] = useState<number[]>([])
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => {
    if (!running) return
    navigator.wakeLock?.request('screen').then(l => { wakeLockRef.current = l }).catch(() => {})
    return () => { wakeLockRef.current?.release() }
  }, [running])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setHrSamples(prev => [...prev.slice(-59), Math.round(120 + Math.random() * 40)])
    }, 5000)
    return () => clearInterval(t)
  }, [running])

  const calories = Math.round(elapsed / 60 * 7)
  const hr = hrSamples.length > 0 ? hrSamples[hrSamples.length - 1] : null
  const label = sport === 'gym' ? t('record.freeModeGym') : 'Hyrox'

  const handleClose = () => {
    if (elapsed > 0 && running) { setConfirmClose(true); return }
    onClose()
  }

  const handleSave = async (formData: SessionFormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activities').insert({
      user_id: user.id, sport,
      date: new Date().toISOString().split('T')[0],
      duration: elapsed,
      load: Math.round(elapsed / 60 * 4),
      title: formData.title,
      training_types: formData.trainingTypes,
      rpe: formData.rpe,
      comment: formData.comment,
    })
    onClose()
  }

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', gap: 10 }}>
        <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <p style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{label}</p>
        <div style={{ width: 36 }} />
      </div>

      {/* Main zone */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, padding: '0 24px' }}>

        {/* Chrono */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 6px' }}>{t('record.commonDuration')}</p>
          <p style={{ fontSize: 72, fontWeight: 700, color: 'var(--text)', margin: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmt(elapsed)}</p>
        </div>

        {/* FC + courbe */}
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 14S2 10 2 5.5C2 3.5 3.5 2 5.5 2c1.1 0 2.1.5 2.5 1.5C8.4 2.5 9.4 2 10.5 2 12.5 2 14 3.5 14 5.5 14 10 8 14 8 14z" fill="rgba(239,68,68,0.8)"/>
            </svg>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
              {hr ?? '--'} <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>bpm</span>
            </span>
          </div>
          {hrSamples.length > 2 && (
            <HRMiniChart samples={hrSamples} isDark={isDark} height={60} width={320} />
          )}
        </div>

        {/* Calories */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px' }}>{t('record.freeModeCaloriesEst')}</p>
          <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {calories}<span style={{ fontSize: 14, color: 'var(--text-mid)', marginLeft: 4 }}>kcal</span>
          </p>
        </div>

      </div>

      {/* Bottom controls */}
      <div style={{ padding: '16px 24px', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', display: 'flex', gap: 12, flexShrink: 0 }}>
        <button onClick={() => setRunning(r => !r)}
          style={{ flex: 1, height: 52, borderRadius: 16, background: running ? 'var(--bg-card2)' : 'linear-gradient(135deg, #06B6D4, #2563EB)', border: '1px solid var(--border)', color: running ? 'var(--text)' : '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {running ? t('record.commonPause') : elapsed === 0 ? t('record.commonStart') : t('record.commonResume')}
        </button>
        {elapsed > 0 && (
          <button onClick={() => { setRunning(false); setShowSave(true) }}
            style={{ flex: 1, height: 52, borderRadius: 16, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {t('record.commonFinish')}
          </button>
        )}
      </div>

      {/* Confirm close overlay */}
      {confirmClose && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{t('record.freeModeQuitConfirm')}</p>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 20px' }}>{t('record.freeModeQuitWarning')}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClose(false)} style={{ flex: 1, height: 44, borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonCancel')}</button>
              <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 12, background: '#EF4444', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('record.commonQuit')}</button>
            </div>
          </div>
        </div>
      )}

      {showSave && <SessionSaveForm sport={sport} startedAt={startedAt} onBack={() => setShowSave(false)} onSave={handleSave} isDark={isDark} />}
    </div>
  )

  return mounted ? createPortal(content, document.body) : null
}
