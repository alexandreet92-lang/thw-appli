'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeLauncher — étape avant le chrono : on choisit une séance planifiée
// (sport = boxe) si elle existe, sinon on configure une séance libre (rounds /
// durée / repos). Résumé visible avant de lancer. Pas de carte.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import type { BoxeConfig } from './BoxeScreen'

interface Props {
  open: boolean
  onClose: () => void
  onStart: (config: BoxeConfig) => void
}

interface PlannedRow { id: string; title: string | null }

const ACCENT = '#ef4444'

function Stepper({ label, value, onDec, onInc, display }: { label: string; value: number; onDec: () => void; onInc: () => void; display: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px' }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onDec} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 20, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>−</button>
        <span style={{ minWidth: 56, textAlign: 'center', fontSize: 17, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{display}</span>
        <button onClick={onInc} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 20, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>+</button>
      </div>
    </div>
  )
}

export default function BoxeLauncher({ open, onClose, onStart }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [sessions, setSessions] = useState<PlannedRow[]>([])
  const [title, setTitle] = useState<string | undefined>(undefined)
  const [rounds, setRounds] = useState(12)
  const [workSec, setWorkSec] = useState(180)
  const [restSec, setRestSec] = useState(60)
  const prepareSec = 10

  useEffect(() => { setMounted(true) }, [])

  // Séances de boxe planifiées (facultatif — s'il y en a).
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    let cancelled = false
    void supabase.from('planned_sessions').select('id, title, sport').eq('sport', 'boxe').limit(20)
      .then(({ data }) => { if (!cancelled && data) setSessions((data as PlannedRow[]).filter(Boolean)) })
    return () => { cancelled = true }
  }, [open])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const totalSec = prepareSec + rounds * workSec + Math.max(0, rounds - 1) * restSec
  const totalMin = Math.round(totalSec / 60)

  const clampRounds = (n: number) => Math.max(1, Math.min(30, n))
  const clampWork = (n: number) => Math.max(30, Math.min(600, n))
  const clampRest = (n: number) => Math.max(0, Math.min(300, n))

  if (!mounted || !open) return null

  return createPortal(
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'boxeScrim .2s ease' }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10001,
        background: 'var(--bg-card)', borderTopLeftRadius: 26, borderTopRightRadius: 26,
        maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
        animation: closing ? 'boxeDown .23s ease forwards' : 'boxeUp .3s cubic-bezier(.2,.8,.2,1)',
      }}>
        <style>{`@keyframes boxeScrim{from{opacity:0}to{opacity:1}}@keyframes boxeUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes boxeDown{from{transform:translateY(0)}to{transform:translateY(100%)}}`}</style>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{ padding: '14px 20px 8px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--text)' }}>Boxe</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 12px' }}>
          {/* Séances planifiées (si présentes) */}
          {sessions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }}>{t('record.workoutPlannedSessions') || 'Séances planifiées'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => {
                  const active = title === (s.title ?? '')
                  return (
                    <button key={s.id} onClick={() => setTitle(active ? undefined : (s.title ?? 'Boxe'))}
                      style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                        border: `1px solid ${active ? ACCENT : 'var(--border)'}`, background: active ? `${ACCENT}14` : 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
                      {s.title || 'Séance boxe'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Config rounds (séance libre / réglages) */}
          <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 4px' }}>{title ? title : (t('record.freeMode') || 'Séance libre')}</p>
          <div style={{ background: 'var(--bg-card2)', borderRadius: 14, border: '1px solid var(--border)', padding: '4px 14px', marginBottom: 14 }}>
            <Stepper label="Rounds" value={rounds} display={String(rounds)} onDec={() => setRounds(r => clampRounds(r - 1))} onInc={() => setRounds(r => clampRounds(r + 1))} />
            <div style={{ height: 1, background: 'var(--border)' }} />
            <Stepper label="Round" value={workSec} display={fmtMS(workSec)} onDec={() => setWorkSec(v => clampWork(v - 15))} onInc={() => setWorkSec(v => clampWork(v + 15))} />
            <div style={{ height: 1, background: 'var(--border)' }} />
            <Stepper label="Repos" value={restSec} display={fmtMS(restSec)} onDec={() => setRestSec(v => clampRest(v - 15))} onInc={() => setRestSec(v => clampRest(v + 15))} />
          </div>

          {/* Résumé */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{rounds} × {fmtMS(workSec)}</span>
            <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>· {t('record.rest') || 'repos'} {fmtMS(restSec)}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: ACCENT }}>≈ {totalMin} min</span>
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: '12px 20px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => { onStart({ title, rounds, workSec, restSec, prepareSec }); handleClose() }}
            style={{ width: '100%', padding: 15, borderRadius: 999, border: 'none', background: ACCENT, color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer' }}>
            {t('record.start') || 'Commencer'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

function fmtMS(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
