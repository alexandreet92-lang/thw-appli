'use client'
import { useState, useEffect, useRef } from 'react'
import {
  rkScope, RkFab, RkFabSpacer, RkIco, RK_ICON, RkStatusPill, RK_DOT, RkHero, RkGrid, RkCell, RkStartButton,
  RkControlRow, RkBigButton, RkPausePills, RkSheet, RkCta, PauseGlyph,
} from './kit/RecordKit'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
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
    const user = await getCurrentUser()
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
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>

      {/* En-tête : retour · pilule d'état */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFab label={t('record.commonQuit')} onClick={handleClose}><RkIco d={RK_ICON.back} size={22} sw={2.2} /></RkFab>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <RkStatusPill dot={running ? RK_DOT.rec : elapsed > 0 ? RK_DOT.warn : sport === 'gym' ? 'var(--sport-gym)' : 'var(--sport-hyrox)'} live={running}>{label}</RkStatusPill>
        </div>
        <RkFabSpacer />
      </div>

      {/* Données : héro durée + FC + calories */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={running || elapsed > 0 ? 'rk-card' : 'rk-card rk-dim'}>
          <RkHero label={t('record.commonDuration')} value={fmt(elapsed)} size={72} />
          <RkGrid>
            <RkCell label="FC" value={hr != null ? String(hr) : '—'} unit="bpm" />
            <RkCell label={t('record.freeModeCaloriesEst')} value={String(calories)} unit="kcal" />
          </RkGrid>
        </div>
        {hrSamples.length > 2 && (
          <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '12px 14px', display: 'flex', justifyContent: 'center' }}>
            <HRMiniChart samples={hrSamples} isDark={isDark} height={60} width={320} />
          </div>
        )}
      </div>

      {/* Contrôles : Démarrer → pause ronde → Reprendre / Terminer */}
      <div style={{ flexShrink: 0, padding: '8px 0 calc(env(safe-area-inset-bottom) + 22px)', display: 'flex', justifyContent: 'center', minHeight: 120 }}>
        {elapsed === 0 && !running ? (
          <RkStartButton label={t('record.commonStart')} onClick={() => setRunning(true)} size={96} />
        ) : running ? (
          <RkControlRow center={<RkBigButton label={t('record.commonPause')} onClick={() => setRunning(false)}><PauseGlyph /></RkBigButton>} />
        ) : (
          <RkPausePills resumeLabel={t('record.commonResume')} finishLabel={t('record.commonFinish')}
            onResume={() => setRunning(true)} onFinish={() => { setRunning(false); setShowSave(true) }} />
        )}
      </div>

      {/* Confirmation de sortie */}
      <RkSheet open={confirmClose} onClose={() => setConfirmClose(false)} isDark={isDark} zIndex={10070} label={t('record.freeModeQuitConfirm')}>
        <div style={{ textAlign: 'center', padding: '6px 4px 4px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('record.freeModeQuitConfirm')}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '8px 0 22px' }}>{t('record.freeModeQuitWarning')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RkCta variant="primary" onClick={() => setConfirmClose(false)}>{t('record.commonCancel')}</RkCta>
            <RkCta variant="text-danger" onClick={onClose}>{t('record.commonQuit')}</RkCta>
          </div>
        </div>
      </RkSheet>

      {showSave && <SessionSaveForm sport={sport} startedAt={startedAt} onBack={() => setShowSave(false)} onSave={handleSave} isDark={isDark} />}
    </div>
  )

  return mounted ? createPortal(content, document.body) : null
}
