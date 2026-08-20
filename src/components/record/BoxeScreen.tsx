'use client'
// ══════════════════════════════════════════════════════════════════
// BoxeScreen — lecteur EN DIRECT d'une séance de boxe PLANIFIÉE. Déroule la
// timeline (buildBoxeTimeline) : préparation → rounds/exos par circuit → repos →
// terminé. Fond THÈME (blanc jour / noir nuit) ; seul le bloc de phase est coloré.
// • bouton vue d'ensemble en haut à droite (où on en est, ce qu'il reste) ;
// • exo courant + prochain + récup ; • mobile : swipe vers la page données ;
// • desktop : split gauche (séance) / droite (données). Sauvegarde en activité.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import SessionSaveForm from './SessionSaveForm'
import type { SessionFormData } from './SessionSaveForm'
import { useHeartRate } from '@/lib/record/useHeartRate'
import HeartRatePanel from './workout/HeartRatePanel'
import { vibrateBlockChange, vibrateSessionEnd } from './blockVibrate'
import { buildBoxeTimeline, totalBoxeRounds, type BoxeSession, type BoxeStep } from './boxe/buildBoxeTimeline'
import { sumComposedMinutes, moveDef, composedMoveLabel } from '@/components/planning/composedSports'

interface Props { session: BoxeSession; onClose: () => void; isDark: boolean }

const C_PREP = '#f59e0b', C_WORK = '#ef4444', C_REST = '#22c55e', ACCENT = '#ef4444'
const phaseColorOf = (p: BoxeStep['phase']) => p === 'prepare' ? C_PREP : p === 'rest' ? C_REST : C_WORK

function fmt(sec: number) { const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
function fmtDur(sec: number) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : fmt(sec) }

function useIsDesktop() {
  const [d, setD] = useState(false)
  useEffect(() => { const s = () => setD(window.innerWidth >= 1024); s(); window.addEventListener('resize', s); return () => window.removeEventListener('resize', s) }, [])
  return d
}

export default function BoxeScreen({ session, onClose, isDark }: Props) {
  const { t } = useI18n()
  const sport = session.sport ?? 'boxe'
  const timeline = useMemo(() => buildBoxeTimeline(session), [session])
  const totalRounds = useMemo(() => totalBoxeRounds(timeline), [timeline])
  const isDesktop = useIsDesktop()

  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState<boolean>(!!session.free)  // résumé pré-séance sauf séance libre
  const [running, setRunning] = useState(false)
  const [idx, setIdx] = useState(0)
  const [remaining, setRemaining] = useState(timeline[0]?.durationSec ?? 10)
  const [elapsed, setElapsed] = useState(0)
  const [page, setPage] = useState(0)
  const [showOverview, setShowOverview] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [startedAt] = useState(new Date().toISOString())
  const hr = useHeartRate()
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const pagesRef = useRef<HTMLDivElement>(null)

  const cur = timeline[idx] ?? timeline[timeline.length - 1]
  const isDone = cur.phase === 'done'
  const roundsDone = useMemo(() => timeline.slice(0, idx).filter(s => s.isRound).length, [timeline, idx])
  // Compteur adaptatif : ROUNDS pour la boxe (moves « round »), EXOS sinon
  // (hybrid, renfo…). L'hybrid n'a pas de rounds → on montre les exercices.
  const totalExos = useMemo(() => timeline.filter(s => s.phase === 'work').length, [timeline])
  const exosDone = useMemo(() => timeline.slice(0, idx).filter(s => s.phase === 'work').length, [timeline, idx])
  const useRounds = totalRounds > 0
  const unitLabel = useRounds ? 'ROUNDS' : 'EXOS'
  const doneCount = useRounds ? roundsDone : exosDone
  const totalCount = useRounds ? totalRounds : totalExos
  const caloriesEst = Math.round((elapsed / 60) * 9)  // ≈ 9 kcal/min en boxe

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!running) return
    navigator.wakeLock?.request('screen').then(l => { wakeLockRef.current = l }).catch(() => {})
    return () => { wakeLockRef.current?.release().catch(() => {}) }
  }, [running])

  // Chrono total.
  useEffect(() => {
    if (!running || isDone) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [running, isDone])

  // Décompte de l'étape en cours (uniquement les étapes AU TEMPS). Un tick par
  // seconde ; à 0 on passe à l'étape suivante (sans setState imbriqué).
  useEffect(() => {
    if (!running || isDone || cur.measure !== 'time') return
    if (remaining <= 0) { advance(); return }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, isDone, cur.measure, remaining, idx])

  function advance() {
    setIdx(i => {
      const next = Math.min(i + 1, timeline.length - 1)
      const step = timeline[next]
      if (step) {
        setRemaining(step.durationSec)
        if (step.phase === 'done') { setRunning(false); vibrateSessionEnd() } else vibrateBlockChange()
      }
      return next
    })
  }

  const onScroll = () => { const el = pagesRef.current; if (el) setPage(Math.round(el.scrollLeft / el.clientWidth)) }

  const handleClose = () => { if (elapsed > 0) { setConfirmClose(true); return } onClose() }

  const handleSave = async (formData: SessionFormData) => {
    const sb = createClient()
    const user = await getCurrentUser()
    if (!user) return
    await sb.from('activities').insert({
      user_id: user.id, sport_type: session.sport === 'hybrid' ? 'hybrid' : 'boxe', title: formData.title,
      started_at: startedAt, moving_time_s: elapsed, elapsed_time_s: elapsed,
      calories: caloriesEst || null,
      avg_hr: hr.avg || null, max_hr: hr.max || null,
      average_heartrate: hr.avg || null, max_heartrate: hr.max || null,
      rpe: formData.rpe, perceived_effort: formData.rpe, comment: formData.comment,
    })
    onClose()
  }

  if (!mounted) return null

  if (showSave) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--bg-card)' }}>
        <SessionSaveForm sport="boxe" startedAt={startedAt} onBack={() => setShowSave(false)} onSave={handleSave} isDark={isDark}
          hr={{ avg: hr.avg, min: hr.min, max: hr.max }} />
      </div>,
      document.body,
    )
  }

  // ── Panneau « données » (mobile page 2 + colonne droite desktop) ──
  const dataPanel = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 16, alignContent: 'start' }}>
      <Metric label="Temps total" value={fmtDur(elapsed)} />
      <Metric label={useRounds ? 'Rounds faits' : 'Exos faits'} value={`${doneCount}/${totalCount}`} />
      <Metric label="Calories (est.)" value={String(caloriesEst)} unit="kcal" />
      <Metric label="FC moyenne" value={hr.avg ? String(hr.avg) : '—'} unit={hr.avg ? 'bpm' : ''} />
      <Metric label="FC max" value={hr.max ? String(hr.max) : '—'} unit={hr.max ? 'bpm' : ''} />
      <Metric label="Circuit" value={cur.circuitName || (cur.circuitIdx >= 0 ? `#${cur.circuitIdx + 1}` : '—')} />
      <div style={{ gridColumn: '1 / -1' }}><HeartRatePanel hr={hr} accent={ACCENT} /></div>
    </div>
  )

  // ── Écran chrono (bloc de phase coloré + prochain + contrôles) ──
  const timerPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Bloc phase géant */}
      <div style={{ flex: 1, minHeight: 0, background: phaseColorOf(cur.phase), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background .3s', padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase', textShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>{cur.label}</p>
        {cur.detail && <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '4px 0 0' }}>{cur.detail}</p>}
        {cur.label === 'Séance libre' ? (
          <p style={{ fontSize: 'min(26vw, 120px)', fontWeight: 900, color: '#fff', margin: '4px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtDur(elapsed)}</p>
        ) : cur.measure === 'time' ? (
          <p style={{ fontSize: 'min(28vw, 130px)', fontWeight: 900, color: '#fff', margin: '4px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{isDone ? '00:00' : fmt(remaining)}</p>
        ) : (
          <>
            <p style={{ fontSize: 'min(24vw, 110px)', fontWeight: 900, color: '#fff', margin: '4px 0 0', lineHeight: 1 }}>{cur.reps ? `×${cur.reps}` : '—'}</p>
            {!isDone && <button onClick={advance} style={{ marginTop: 14, padding: '12px 28px', borderRadius: 999, border: '2px solid #fff', background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Suivant</button>}
          </>
        )}
      </div>

      {/* Prochain */}
      {!isDone && cur.nextLabel && (
        <div style={{ flexShrink: 0, background: 'var(--bg-card2)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>À suivre</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.nextLabel}</span>
        </div>
      )}

      {/* Contrôles */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '14px 24px', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 34, fontWeight: 900, color: ACCENT, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, totalCount - doneCount)}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', margin: '4px 0 0', letterSpacing: '0.06em' }}>{unitLabel} RESTANTS</p>
        </div>
        {isDone ? (
          <button onClick={() => setShowSave(true)} style={{ width: 84, height: 84, borderRadius: '50%', border: `3px solid ${ACCENT}`, background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>{t('record.sessionSaveSave') || 'Enregistrer'}</button>
        ) : (
          <button onClick={() => setRunning(r => !r)} style={{ width: 84, height: 84, borderRadius: '50%', border: `3px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {running ? <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              : <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totalCount}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', margin: '4px 0 0', letterSpacing: '0.06em' }}>{unitLabel} TOTAL</p>
        </div>
      </div>
    </div>
  )

  const header = (
    <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, borderBottom: '1px solid var(--border)' }}>
      <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title || 'Boxe'}</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(elapsed)}</p>
      </div>
      <button onClick={() => setShowOverview(true)} aria-label="Vue d'ensemble" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  )

  // ── Résumé pré-séance (comme la muscu) : titre + durée/tours/exos + détail ──
  const preCircuits = session.circuits.length ? session.circuits : [{ id: 'c1', rounds: 1, restSec: 0 }]
  const preFirstId = preCircuits[0].id
  const preDurMin = sumComposedMinutes(session.moves, session.circuits)
  const preTours = preCircuits.reduce((s, c) => s + Math.max(1, c.rounds), 0)
  const preStart = (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 32px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, fontWeight: 800, margin: '4px 0 6px' }}>Prêt à démarrer</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 18px' }}>{session.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>~{preDurMin} min</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Durée est.</div></div>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{preTours}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tours</div></div>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{session.moves.length}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Exos</div></div>
        </div>
        {preCircuits.map((c, ci) => {
          const cm = session.moves.filter(m => (m.circuitId ?? preFirstId) === c.id)
          if (!cm.length) return null
          return (
            <div key={c.id} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>{c.name || `Circuit ${ci + 1}`} · {Math.max(1, c.rounds)} tour{c.rounds > 1 ? 's' : ''}</p>
              {cm.map(m => {
                const def = moveDef(sport, m.kind)
                const detail = m.kind === 'round' ? `${m.rounds ?? 1} × ${Math.round((m.timeSec ?? 0) / 60)} min`
                  : m.measure === 'reps' && !m.timeSec ? `${m.reps ?? ''} reps${m.weightKg ? ` · ${m.weightKg} kg` : ''}`
                  : m.timeSec ? `${Math.round(m.timeSec / 60)} min` : ''
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: 13 }}>#</span>
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{composedMoveLabel(m, def)}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-mid)', fontWeight: 600 }}>{detail}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', paddingTop: 'env(safe-area-inset-top)' }}>
      {header}
      {!started ? (<>
        {preStart}
        <div style={{ flexShrink: 0, padding: '12px 18px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => { setStarted(true); setRunning(true) }} style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'block', padding: 15, borderRadius: 14, border: 'none', background: ACCENT, color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer' }}>Commencer</button>
        </div>
      </>) : isDesktop ? (
        // Desktop : split gauche (séance/chrono) / droite (données)
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.4fr 1fr' }}>
          <div style={{ minHeight: 0, borderRight: '1px solid var(--border)' }}>{timerPanel}</div>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{dataPanel}</div>
        </div>
      ) : (
        // Mobile : pager horizontal (chrono / données) + points
        <>
          <div ref={pagesRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory' }}>
            <div style={{ minWidth: '100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', minHeight: 0 }}>{timerPanel}</div>
            <div style={{ minWidth: '100%', scrollSnapAlign: 'start', overflowY: 'auto' }}>{dataPanel}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 calc(6px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
            {[0, 1].map(i => <span key={i} style={{ height: 6, width: i === page ? 18 : 6, borderRadius: 3, background: i === page ? ACCENT : 'var(--border-mid)', transition: '.2s' }} />)}
          </div>
        </>
      )}

      {showOverview && <OverviewSheet timeline={timeline} idx={idx} onClose={() => setShowOverview(false)} />}

      {/* Chrono en pause → Reprendre ou Terminer l'entraînement */}
      {!running && !isDone && elapsed > 0 && !showOverview && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 22, width: 'min(340px, 88vw)', textAlign: 'center' }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>Séance en pause</p>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 18px' }}>Temps écoulé · {fmtDur(elapsed)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setRunning(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Reprendre</button>
              <button onClick={() => setShowSave(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Terminer l’entraînement</button>
            </div>
          </div>
        </div>
      )}

      {confirmClose && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 20, width: 'min(320px, 86vw)', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Quitter la séance ?</p>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 16px' }}>La séance en cours ne sera pas enregistrée.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClose(false)} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: ACCENT, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
        {value}{unit && <small style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 2 }}>{unit}</small>}
      </div>
    </div>
  )
}

// Vue d'ensemble : toutes les étapes d'EFFORT groupées Fait / En cours / À venir.
function OverviewSheet({ timeline, idx, onClose }: { timeline: BoxeStep[]; idx: number; onClose: () => void }) {
  const efforts = timeline.map((s, i) => ({ s, i })).filter(x => x.s.phase === 'work')
  const Row = ({ s, state }: { s: BoxeStep; state: 'done' | 'now' | 'todo' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: state === 'now' ? `${ACCENT}14` : 'var(--bg-card2)', border: state === 'now' ? `1px solid ${ACCENT}55` : '1px solid transparent', opacity: state === 'done' ? 0.5 : 1 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: state === 'done' ? 'var(--text-dim)' : state === 'now' ? ACCENT : 'var(--border-mid)', flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{s.label}{s.tours && s.tours > 1 ? ` · tour ${s.tour}/${s.tours}` : ''}</span>
        {s.detail && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>{s.detail}</span>}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', flexShrink: 0 }}>{s.measure === 'time' ? fmt(s.durationSec) : s.reps ? `×${s.reps}` : ''}</span>
    </div>
  )
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10006, background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Séance complète</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 20px' }}>
          {efforts.map(({ s, i }) => <Row key={i} s={s} state={i < idx ? 'done' : i === idx ? 'now' : 'todo'} />)}
        </div>
      </div>
    </>,
    document.body,
  )
}
