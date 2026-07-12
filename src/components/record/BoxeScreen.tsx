'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeScreen — chrono de boxe plein écran (rounds / repos), inspiré du timer
// d'intervalles : grande phase colorée + compte à rebours géant, aperçu de la
// phase suivante, compteur de rounds restants. FC réelle via capteur BLE
// (useHeartRate) + courbe. Pas de carte. Sauvegarde en activité (sport = boxe).
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import { useHeartRate } from '@/lib/record/useHeartRate'
import HeartRatePanel from './workout/HeartRatePanel'

export interface BoxeConfig {
  title?: string
  rounds: number
  workSec: number
  restSec: number
  prepareSec: number
}

interface Props {
  config: BoxeConfig
  onClose: () => void
  isDark: boolean
}

type Phase = 'prepare' | 'work' | 'rest' | 'done'

// Couleurs de phase (sémantiques, façon timer d'intervalles).
const C_PREP = '#f59e0b'   // ambre — préparation
const C_WORK = '#ef4444'   // rouge — round actif
const C_REST = '#22c55e'   // vert — repos
const ACCENT = '#ef4444'

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function BoxeScreen({ config, onClose, isDark }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('prepare')
  const [round, setRound] = useState(1)
  const [remaining, setRemaining] = useState(config.prepareSec)
  const [elapsed, setElapsed] = useState(0)
  const [showSave, setShowSave] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [startedAt] = useState(new Date().toISOString())
  const hr = useHeartRate()
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Wake lock pendant la séance (écran allumé).
  useEffect(() => {
    if (!running) return
    navigator.wakeLock?.request('screen').then(l => { wakeLockRef.current = l }).catch(() => {})
    return () => { wakeLockRef.current?.release().catch(() => {}) }
  }, [running])

  // Durée totale écoulée.
  useEffect(() => {
    if (!running || phase === 'done') return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [running, phase])

  // Machine à états du chrono d'intervalles.
  useEffect(() => {
    if (!running || phase === 'done') return
    const id = setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1
        // Transition de phase à 0.
        if (phase === 'prepare') { setPhase('work'); return config.workSec }
        if (phase === 'work') {
          if (round >= config.rounds) { setPhase('done'); setRunning(false); return 0 }
          setPhase('rest'); return config.restSec
        }
        // rest → round suivant
        setRound(n => n + 1); setPhase('work'); return config.workSec
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, phase, round, config])

  const phaseColor = phase === 'prepare' ? C_PREP : phase === 'rest' ? C_REST : C_WORK
  const phaseLabel = phase === 'prepare' ? 'PRÉPARER' : phase === 'rest' ? 'REPOS' : phase === 'done' ? 'TERMINÉ' : `ROUND ${round}`
  const nextLabel = phase === 'prepare' ? `ROUND 1` : phase === 'work' ? (round >= config.rounds ? 'TERMINÉ' : 'REPOS') : phase === 'rest' ? `ROUND ${round + 1}` : ''
  const nextDur = phase === 'prepare' ? config.workSec : phase === 'work' ? (round >= config.rounds ? 0 : config.restSec) : phase === 'rest' ? config.workSec : 0
  const displayRoundsLeft = phase === 'done' ? 0 : config.rounds - round + (phase === 'rest' ? 0 : 1)

  const handleClose = () => {
    if (elapsed > 0) { setConfirmClose(true); return }
    onClose()
  }

  const handleSave = async (formData: SessionFormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activities').insert({
      user_id: user.id, sport_type: 'boxe',
      title: formData.title,
      started_at: startedAt,
      moving_time_s: elapsed, elapsed_time_s: elapsed,
      rpe: formData.rpe,
      comment: formData.comment,
    })
    onClose()
  }

  if (!mounted) return null

  if (showSave) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--bg-card)' }}>
        <SessionSaveForm
          sport="boxe" startedAt={startedAt} onBack={() => setShowSave(false)} onSave={handleSave} isDark={isDark}
          hr={{ avg: hr.avg, min: hr.min, max: hr.max }}
        />
      </div>,
      document.body,
    )
  }

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: '#0b0b0d', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
        <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase' }}>{config.title || 'Boxe'}</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(elapsed)}</p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Phase géante (bloc coloré) */}
      <div style={{ flex: 1, minHeight: 0, background: phaseColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
        <p style={{ fontSize: 34, fontWeight: 900, color: '#0b0b0d', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{phaseLabel}</p>
        <p style={{ fontSize: 'min(30vw, 150px)', fontWeight: 900, color: '#0b0b0d', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {phase === 'done' ? '00:00' : fmt(remaining)}
        </p>
      </div>

      {/* Aperçu phase suivante */}
      {phase !== 'done' && nextLabel && (
        <div style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{nextLabel}</span>
          {nextDur > 0 && <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(nextDur)}</span>}
        </div>
      )}

      {/* Contrôles : rounds restants · play/pause · rounds total */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '16px 24px calc(16px + env(safe-area-inset-bottom))', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40, fontWeight: 900, color: '#3b82f6', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, displayRoundsLeft)}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', letterSpacing: '0.06em' }}>ROUNDS RESTANTS</p>
        </div>
        {phase === 'done' ? (
          <button onClick={() => setShowSave(true)} style={{ width: 88, height: 88, borderRadius: '50%', border: `3px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
            {t('record.sessionSaveSave') || 'Enregistrer'}
          </button>
        ) : (
          <button onClick={() => setRunning(r => !r)} style={{ width: 88, height: 88, borderRadius: '50%', border: `3px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {running
              ? <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              : <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40, fontWeight: 900, color: ACCENT, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{config.rounds}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', letterSpacing: '0.06em' }}>ROUNDS TOTAL</p>
        </div>
      </div>

      {/* Panneau FC réel (capteur BLE) + courbe */}
      <div style={{ flexShrink: 0 }}>
        <HeartRatePanel hr={hr} accent={ACCENT} />
      </div>

      {/* Confirmation de fermeture */}
      {confirmClose && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 20, width: 'min(320px, 86vw)', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{t('record.freeModeQuitTitle') || 'Quitter la séance ?'}</p>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 16px' }}>{t('record.freeModeQuitBody') || 'La séance en cours ne sera pas enregistrée.'}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClose(false)} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>{t('record.cancel') || 'Annuler'}</button>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: ACCENT, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t('record.quit') || 'Quitter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
