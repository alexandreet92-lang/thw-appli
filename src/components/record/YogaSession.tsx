'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useYogaSession } from '@/hooks/useYogaSession'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import type { YogaSessionExercise } from '@/types/yoga'
import AICoachingTip from './AICoachingTip'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import YogaSettings from './YogaSettings'
import { vibrateBlockChange, vibrateSessionEnd } from './blockVibrate'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  rkScope, RkFab, RkIco, RK_ICON, RkStartButton, RkControlRow, RkBigButton, RkSheet, RkCta, RK_SPRING, PauseGlyph, PlayGlyph,
} from './kit/RecordKit'

interface Props {
  exercises: YogaSessionExercise[]
  title: string
  isDark: boolean
  onClose: () => void
}

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function YogaSession({ exercises, title, isDark, onClose }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted]       = useState(false)
  const [startedAt]                 = useState(() => new Date().toISOString())
  const [aiEnabled, setAiEnabled]   = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSave, setShowSave]     = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const session = useYogaSession(exercises)
  const reduce = useReducedMotion()
  useWakeLock(session.phase === 'exercise' || session.phase === 'rest')
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (session.phase === 'finished') setShowSave(true) }, [session.phase])

  // Vibration aux transitions exercice ↔ repos, longue à la fin de séance.
  const lastPhaseRef = useRef(session.phase)
  useEffect(() => {
    const prev = lastPhaseRef.current
    if (session.phase === prev) return
    lastPhaseRef.current = session.phase
    if (session.phase === 'finished') vibrateSessionEnd()
    else if (prev === 'exercise' || prev === 'rest') vibrateBlockChange()
  }, [session.phase])

  if (!mounted) return null

  const cur  = exercises[session.currentIdx]
  const next = exercises[session.currentIdx + 1]
  const progress = Math.max(0, Math.min(1, (session.currentDuration - session.remaining) / (session.currentDuration || 1)))
  const isRunning = session.phase === 'exercise' || session.phase === 'rest'
  const R = 92, C = 2 * Math.PI * R

  const handleSave = async (formData: SessionFormData) => {
    const sb = createClient()
    const user = await getCurrentUser()
    if (user) {
      await sb.from('activities').insert({
        user_id: user.id, sport: 'yoga',
        title: formData.title, started_at: startedAt,
        moving_time_s: session.elapsed, elapsed_time_s: session.elapsed,
        calories: Math.round(session.elapsed / 60 * 3),
      })
    }
    onClose()
  }

  const content = (
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>

      {/* En-tête : × · titre + chrono · réglages */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFab label={t('record.yogaQuit')} onClick={() => { if (isRunning) session.pause(); setConfirmClose(true) }}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div className="rk-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>{fmt(session.elapsed)}</div>
        </div>
        <RkFab label={t('record.commonSettings')} onClick={() => setSettingsOpen(true)}><RkIco d={RK_ICON.sliders} size={19} /></RkFab>
      </div>

      {/* Principal */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="rk-card" style={{ padding: '22px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          {session.phase === 'rest' ? (
            <>
              <span className="rk-banner" style={{ animation: 'none', boxShadow: 'none', background: 'color-mix(in srgb, var(--success) 14%, transparent)' }}>
                <span className="rk-dot" style={{ background: 'var(--success)' }} />{t('record.yogaRest')}
              </span>
              <div className="rk-num" style={{ fontSize: 88, fontWeight: 800, lineHeight: 1 }}>{session.restRemaining}</div>
              {next && <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-mid)' }}>{t('record.yogaNext', { name: next.name })}</div>}
            </>
          ) : (
            <>
              <div className="rk-label">{t('record.yogaExerciseProgress', { current: session.currentIdx + 1, total: exercises.length })}</div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2 key={session.currentIdx}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -10 }}
                  transition={reduce ? { duration: 0.1 } : RK_SPRING}
                  style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>{cur?.name}</motion.h2>
              </AnimatePresence>
              {/* Anneau de progression (SVG brut) */}
              <div style={{ position: 'relative', width: 210, height: 210 }}>
                <svg width="210" height="210" viewBox="0 0 210 210" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                  <circle cx="105" cy="105" r={R} fill="none" stroke="var(--surface-chip)" strokeWidth="12" />
                  <circle cx="105" cy="105" r={R} fill="none" stroke="var(--sport-rowing)" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: reduce ? 'none' : 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div className="rk-num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800 }}>{session.remaining}</div>
              </div>
            </>
          )}
        </div>

        {session.phase !== 'rest' && cur && <AICoachingTip exercise={cur} enabled={aiEnabled && session.phase === 'exercise'} isDark={isDark} />}

        {next && session.phase !== 'idle' && session.phase !== 'rest' && (
          <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="rk-dot" style={{ width: 10, height: 10, background: 'var(--sport-rowing)' }} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t('record.yogaUpNext', { name: next.name, s: next.duration_seconds })}</span>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div style={{ flexShrink: 0, padding: '8px 0 calc(env(safe-area-inset-bottom) + 22px)', display: 'flex', justifyContent: 'center', minHeight: 120 }}>
        {session.phase === 'idle' ? (
          <RkStartButton label={t('record.yogaStart')} onClick={session.start} size={96} />
        ) : session.phase !== 'finished' && (
          <RkControlRow
            left={<RkFab label={t('record.yogaSkip')} size={56} onClick={session.skip}><RkIco d={RK_ICON.skip} size={22} /></RkFab>}
            center={<RkBigButton label={isRunning ? t('record.yogaPause') : t('record.yogaResume')} onClick={isRunning ? session.pause : session.resume}>
              {isRunning ? <PauseGlyph /> : <PlayGlyph />}
            </RkBigButton>}
            right={session.phase === 'exercise'
              ? <RkFab label="+30s" size={56} onClick={() => session.addTime(30)}><span style={{ fontSize: 14, fontWeight: 800 }}>+30s</span></RkFab>
              : undefined}
          />
        )}
      </div>

      {/* Confirmation de sortie */}
      <RkSheet open={confirmClose} onClose={() => { setConfirmClose(false); session.resume() }} isDark={isDark} zIndex={10070} label={t('record.yogaQuitConfirm')}>
        <div style={{ textAlign: 'center', padding: '6px 4px 4px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('record.yogaQuitConfirm')}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '8px 0 22px' }}>{t('record.yogaQuitWarning')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RkCta variant="primary" onClick={() => { setConfirmClose(false); session.resume() }}>{t('record.yogaCancel')}</RkCta>
            <RkCta variant="text-danger" onClick={onClose}>{t('record.yogaQuit')}</RkCta>
          </div>
        </div>
      </RkSheet>

      <YogaSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} aiTipsEnabled={aiEnabled} onToggleAI={setAiEnabled} />
      {showSave && <SessionSaveForm sport="yoga" startedAt={startedAt} onBack={() => { setShowSave(false); onClose() }} onSave={handleSave} isDark={isDark} />}
    </div>
  )

  return createPortal(content, document.body)
}
