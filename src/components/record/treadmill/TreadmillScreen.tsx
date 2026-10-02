'use client'
// Course sur TAPIS — séance guidée plein écran.
//  1) Résumé (style muscu SummaryScreen) : blocs, durée, km prévus.
//  2) Mode live : fond coloré par zone d'allure (vert Z1-2 / jaune Z3-4 / rouge Z5),
//     timer décompte par bloc, allure + pente cibles, boutons ± pour ajuster
//     vitesse et pente en direct, section fréquence cardiaque (branchée quand un
//     capteur sera connecté).
//  3) Enregistrement dans activities + workout_sessions, puis résumé final.
//
// Réutilise les patrons existants : portal plein écran (cf. HomeTrainerScreen),
// useStopwatch/useWakeLock, timeline de blocs (cf. ride/buildPlan).
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch, formatSeconds } from '@/hooks/useStopwatch'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { notifyActivitySaved } from '@/lib/notifications/activitySaved'
import { useHeartRate } from '@/lib/record/useHeartRate'
import { vibrateBlockChange, vibrateSessionEnd } from '../blockVibrate'
import { useTreadmillPlan } from './useTreadmillPlan'
import {
  type TreadmillPlan, type TreadStep,
  zoneBg, zoneInk, fmtPaceSec, kmhToPaceSec, buildTreadmillLaps,
} from './treadmillPlan'
import { buildTreadmillStreams, type TreadInterval } from './treadmillProfile'
import { haptic } from '@/lib/haptics'
import {
  rkScope, useAppDark, RkFab, RkFabSpacer, RkIco, RK_ICON, RkStatusPill, RK_DOT, RkSectionLabel, RkGroup, RkRow,
  RkStartButton, RkControlRow, RkBigButton, RkPausePills, RkGrid, RkCell, RkCta, RkSheet, RkScreenIn, RkPageDots, PauseGlyph,
} from '../kit/RecordKit'

interface Props { onExit: () => void; onFinished: () => void }

const FB = 'var(--font-body)'
const FD = 'var(--font-display)'

function cd(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
function kindLabel(k: TreadStep['kind']): string {
  return k === 'warmup' ? 'Échauffement' : k === 'recovery' ? 'Récupération'
    : k === 'cooldown' ? 'Retour au calme' : 'Effort'
}

// Séance libre par défaut quand aucun plan tapis n'est trouvé : un seul bloc ouvert.
function freePlan(): TreadmillPlan {
  const step: TreadStep = {
    name: 'Course libre', kind: 'effort', durationS: 3600,
    targetKmh: 10, targetPaceSecPerKm: kmhToPaceSec(10), inclinePct: 0, zone: 2, t0: 0, t1: 3600,
  }
  return { title: 'Course libre', steps: [step], totalS: 3600, totalDistanceM: 10000 }
}

export default function TreadmillScreen({ onExit, onFinished }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const { plan: loadedPlan, loading, options, selectedId, select } = useTreadmillPlan(true)
  const [phase, setPhase] = useState<'summary' | 'live' | 'review' | 'done'>('summary')
  const [running, setRunning] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const appDark = useAppDark()
  const [treadPage, setTreadPage] = useState(0)
  // Desktop large : double fenêtre (live + données côte à côte)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const f = () => setWide(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  // Plan effectif : celui du planning, sinon libre.
  const plan = useMemo(() => loadedPlan ?? freePlan(), [loadedPlan])
  const isFree = loadedPlan == null

  useEffect(() => { setMounted(true) }, [])
  useWakeLock(running)
  const { seconds } = useStopwatch(running)

  // Étape courante d'après le temps écoulé.
  const stepIdx = useMemo(() => {
    const i = plan.steps.findIndex(s => seconds < s.t1)
    return i === -1 ? plan.steps.length - 1 : i
  }, [plan.steps, seconds])
  const step = plan.steps[stepIdx]
  const remainingInStep = Math.max(0, step.t1 - seconds)
  const planComplete = !isFree && seconds >= plan.totalS

  // Vitesse & pente RÉELLES ajustables en direct. Réinitialisées sur la cible du
  // bloc à chaque changement d'étape (l'athlète peut ensuite ajuster).
  const [speedKmh, setSpeedKmh] = useState(step.targetKmh ?? 10)
  const [incline, setIncline] = useState(step.inclinePct)
  const lastStepRef = useRef(-1)
  useEffect(() => {
    if (stepIdx !== lastStepRef.current) {
      // Vibration au CHANGEMENT de bloc (pas au premier rendu ni au lancement).
      if (lastStepRef.current !== -1 && running) vibrateBlockChange()
      lastStepRef.current = stepIdx
      if (step.targetKmh != null) setSpeedKmh(step.targetKmh)
      setIncline(step.inclinePct)
    }
  }, [stepIdx, step.targetKmh, step.inclinePct, running])

  // Fin de plan : vibration longue une seule fois.
  const endVibratedRef = useRef(false)
  useEffect(() => {
    if (planComplete && running && !endVibratedRef.current) {
      endVibratedRef.current = true
      vibrateSessionEnd()
    }
  }, [planComplete, running])

  // Capteur cardio BLE (Web Bluetooth) — FC réelle dans le live, les données
  // de séance et l'enregistrement.
  const hr = useHeartRate()
  const bpmRef = useRef<number | null>(null)
  useEffect(() => { bpmRef.current = hr.status === 'connected' ? hr.bpm : null }, [hr.bpm, hr.status])

  // ── TRACE RÉELLE (1 échantillon/s) : c'est CE QUI A ÉTÉ FAIT qui compte,
  // pas le plan — vitesse et pente peuvent être ajustées en direct.
  //  • distRef : distance réelle intégrée
  //  • elevRef : D+ réel (vitesse × pente)
  //  • adjRef  : distance équivalente plat (facteur Minetti) → allure VAP
  //  • segsRef : segments réels {durée, vitesse, pente} → streams à l'enregistrement
  //  • altSeriesRef : série d'altitude cumulée → profil altimétrique live
  const distRef = useRef(0)
  const elevRef = useRef(0)
  const adjRef = useRef(0)
  const segsRef = useRef<TreadInterval[]>([])
  const altSeriesRef = useRef<number[]>([0])
  const [distM, setDistM] = useState(0)
  const [elevM, setElevM] = useState(0)
  const [adjM, setAdjM] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const v = speedKmh / 3.6                       // m/s
      const g = Math.max(0, incline) / 100
      distRef.current += v
      elevRef.current += v * g
      const factor = 1 + g * (0.033 * g * 1000 + 0.133)   // Minetti (comme le GAP)
      adjRef.current += v * Math.max(0.5, factor)
      altSeriesRef.current.push(elevRef.current)
      // Segments réels : fusionne avec le dernier si vitesse & pente inchangées.
      // FC réelle (capteur BLE) : moyenne glissante par segment → stream heartrate.
      const bpm = bpmRef.current
      const last = segsRef.current[segsRef.current.length - 1]
      if (last && last.speedKmh === speedKmh && last.inclinePct === incline) {
        if (bpm != null) last.hr = Math.round((((last.hr ?? bpm) * last.durationS) + bpm) / (last.durationS + 1))
        last.durationS += 1
      } else {
        segsRef.current.push({ durationS: 1, speedKmh, inclinePct: incline, ...(bpm != null ? { hr: bpm } : {}) })
      }
      setDistM(distRef.current)
      setElevM(elevRef.current)
      setAdjM(adjRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [running, speedKmh, incline])

  const bg = zoneBg(step.zone)
  const ink = zoneInk(step.zone)

  const kcal = Math.round((seconds / 60) * 10)   // ≈10 kcal/min (repli sans poids)

  async function handleSave() {
    setRunning(false)
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (user) {
        const durationSec = seconds
        const distanceM = Math.round(distRef.current)
        const start = new Date(Date.now() - durationSec * 1000).toISOString()
        const avgSpeedMs = durationSec > 0 ? distanceM / durationSec : 0
        // Profil altimétrique + streams à partir de la TRACE RÉELLE (vitesse et
        // pente telles qu'ajustées pendant la séance), pas du plan initial.
        // Repli sur le plan si la trace est vide (séance sans échantillons).
        const intervals: TreadInterval[] = segsRef.current.length > 0
          ? segsRef.current
          : plan.steps.map(st => ({
              durationS: st.durationS,
              speedKmh: st.targetKmh ?? (st.targetPaceSecPerKm ? 3600 / st.targetPaceSecPerKm : 0),
              inclinePct: st.inclinePct,
            }))
        const streams = buildTreadmillStreams(intervals)
        // Tours = intervalles de la séance → même analyse que le vélo/course GPS.
        const laps = streams ? buildTreadmillLaps(plan.steps, streams.time, streams.heartrate) : []
        const elevationM = elevRef.current
        await sb.from('workout_sessions').insert({
          user_id: user.id, sport: 'running',
          started_at: start, ended_at: new Date().toISOString(),
          duration_seconds: durationSec, distance_m: distanceM,
          elevation_gain_m: Math.round(elevationM),
          avg_speed_kmh: avgSpeedMs * 3.6, calories: kcal, status: 'completed',
          title: plan.title, training_types: ['tapis'],
          avg_hr: hr.avg, max_hr: hr.max, min_hr: hr.min,
        })
        await sb.from('activities').insert({
          user_id: user.id, sport_type: 'run', title: plan.title,
          started_at: start, moving_time_s: durationSec, elapsed_time_s: durationSec,
          distance_m: distanceM, elevation_gain_m: Math.round(elevationM),
          avg_speed_ms: avgSpeedMs, calories: kcal, streams,
          laps: laps.length > 1 ? laps : null,
          avg_hr: hr.avg, max_hr: hr.max, min_hr: hr.min,
          average_heartrate: hr.avg, max_heartrate: hr.max,
        })
        notifyActivitySaved({ sport: 'running', title: plan.title })
      }
    } catch (e) { console.error('[treadmill] save error:', e) }
    setPhase('done')
  }

  if (!mounted) return null

  const card: React.CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)' }
  const fmtTarget = (s: TreadStep) => s.targetKmh != null ? `${s.targetKmh.toFixed(1).replace('.', ',')} km/h` : (s.targetPaceSecPerKm != null ? `${fmtPaceSec(s.targetPaceSecPerKm)}/km` : '—')

  // ── Écran RÉSUMÉ ────────────────────────────────────────────
  const summary = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', color: 'var(--text)', fontFamily: FB }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFab label="Retour" onClick={onExit}><RkIco d={RK_ICON.back} size={22} sw={2.2} /></RkFab>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <RkStatusPill dot="var(--sport-run)">{t('tm.readyToStart')}</RkStatusPill>
        </div>
        <RkFabSpacer />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 12px' }}>
        <div className="rk-fade-up" style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 600, margin: '4px 4px 0' }}>{plan.title}</h1>
          <div className="rk-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)' }}>
            {[
              { v: `~${Math.round(plan.totalS / 60)}`, l: 'min' },
              { v: `${(plan.totalDistanceM / 1000).toFixed(1).replace('.', ',')}`, l: 'km prévus' },
              { v: String(plan.steps.length), l: 'intervalles' },
            ].map(s => (
              <div key={s.l} className="rk-cell">
                <div className="rk-cell-v" style={{ marginTop: 0 }}><span className="rk-cell-n rk-num" style={{ fontSize: 28 }}>{s.v}</span></div>
                <div className="rk-label" style={{ marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* ── Mes séances planifiées (semaine courante + suivante) : un clic charge la séance ── */}
          {options.length > 0 && (
            <div>
              <RkSectionLabel>Mes séances planifiées</RkSectionLabel>
              <div className="rk-chips" style={{ gap: 8, margin: '0 -16px', padding: '2px 16px 4px' }}>
                {/* Course libre */}
                <button type="button" onClick={() => select(null)} className="rk-press"
                  style={{ flexShrink: 0, textAlign: 'left', padding: '12px 16px', borderRadius: 'var(--r-lg)', cursor: 'pointer', border: 'none',
                    background: selectedId == null ? 'var(--text)' : 'var(--surface-card)', color: selectedId == null ? 'var(--bg)' : 'var(--text)' }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Course libre</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{t('tm.speedGradeOnFly')}</div>
                </button>
                {options.map(o => {
                  const on = selectedId === o.id
                  return (
                    <button key={o.id} type="button" onClick={() => select(o.id)} className="rk-press"
                      style={{ flexShrink: 0, textAlign: 'left', padding: '12px 16px', borderRadius: 'var(--r-lg)', cursor: 'pointer', maxWidth: 230, border: 'none',
                        background: on ? 'var(--text)' : 'var(--surface-card)', color: on ? 'var(--bg)' : 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                        {o.isTreadmill && <span className="rk-dot" style={{ background: 'var(--sport-run)' }} />}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, textTransform: 'capitalize' }}>
                        {o.isToday ? "Aujourd'hui" : o.dayLabel}{o.durationMin ? ` · ${o.durationMin} min` : ''}{!o.hasBlocks ? ' · sans blocs' : ''}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {isFree && options.length === 0 && !loading && (
            <div style={{ ...card, fontSize: 14, color: 'var(--text-mid)', padding: '14px 16px', lineHeight: 1.5 }}>
              Aucune séance course planifiée ces deux semaines — mode libre. Ajuste vitesse et pente à la volée.
            </div>
          )}
          {isFree && selectedId != null && (
            <div style={{ ...card, fontSize: 14, color: 'var(--text-mid)', padding: '14px 16px', lineHeight: 1.5 }}>
              Cette séance n&apos;a pas de blocs détaillés — elle se lance en mode libre.
            </div>
          )}
          <RkGroup>
            {plan.steps.map((s, i) => (
              <RkRow key={i}
                icon={<span className="rk-dot" style={{ width: 10, height: 10, background: zoneBg(s.zone) }} />}
                label={s.name}
                sub={`${kindLabel(s.kind)}${s.of ? ` · ${s.rep}/${s.of}` : ''} · ${cd(s.durationS)}`}
                right={
                  <span style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="rk-num" style={{ display: 'block', fontSize: 15, fontWeight: 800, letterSpacing: 0 }}>{fmtTarget(s)}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{s.inclinePct > 0 ? `pente ${s.inclinePct}%` : 'à plat'}</span>
                  </span>
                } />
            ))}
          </RkGroup>
        </div>
      </div>

      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '12px 0 calc(env(safe-area-inset-bottom) + 24px)' }}>
        <RkStartButton label={t('record.startSession')} disabled={loading} onClick={() => { setPhase('live'); setRunning(true) }} size={96}>
          {t('w2c.start')}
        </RkStartButton>
      </div>
    </div>
  )

  // ── Mode LIVE ───────────────────────────────────────────────
  const targetLabel = fmtTarget(step)
  const curPaceSec = speedKmh > 0 ? kmhToPaceSec(speedKmh) : null
  const avgPaceSec = distM > 50 ? seconds / (distM / 1000) : null
  const vapPaceSec = adjM > 50 ? seconds / (adjM / 1000) : null

  const Stepper = ({ label, value, unit, onMinus, onPlus }: { label: string; value: string; unit: string; onMinus: () => void; onPlus: () => void }) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div className="rk-label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <RkFab label={`${label} moins`} onClick={onMinus} variant="ghost"><span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>−</span></RkFab>
        <div style={{ minWidth: 64, textAlign: 'center' }}>
          <span className="rk-num" style={{ fontSize: 28, fontWeight: 800 }}>{value}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 2 }}>{unit}</span>
        </div>
        <RkFab label={`${label} plus`} onClick={onPlus} variant="ghost"><span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>+</span></RkFab>
      </div>
    </div>
  )

  // ── Écran 1 — cadran live : panneau coloré par zone + réglages ──
  const liveMain = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', color: 'var(--text)', fontFamily: FB }}>
      {/* En-tête : durée · type de bloc · distance */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFabSpacer />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <RkStatusPill dot={running ? RK_DOT.rec : RK_DOT.warn} live={running}>
            <span className="rk-num" style={{ letterSpacing: 0 }}>{formatSeconds(seconds)} · {(distM / 1000).toFixed(2).replace('.', ',')} km</span>
          </RkStatusPill>
        </div>
        <RkFabSpacer />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Panneau de zone : bloc, décompte, cible, progression des intervalles */}
        <div className="rk-phase" style={{ backgroundColor: bg, color: ink }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.85 }}>{kindLabel(step.kind)}{step.of ? ` · ${step.rep}/${step.of}` : ''}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 4 }}>{step.name}</div>
          <div className="rk-num" style={{ fontSize: 'min(24vw, 96px)', fontWeight: 800, lineHeight: 1, marginTop: 10 }}>
            {isFree ? formatSeconds(seconds) : cd(remainingInStep)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, opacity: 0.9, marginTop: 6 }}>
            Cible · {targetLabel}{step.inclinePct > 0 ? ` · pente ${step.inclinePct}%` : ''}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            {plan.steps.map((s, i) => (
              <span key={i} style={{ flex: Math.max(1, s.durationS), height: 6, borderRadius: 3, background: 'currentColor', opacity: i < stepIdx ? 0.85 : i === stepIdx ? 1 : 0.28 }} />
            ))}
          </div>
        </div>

        {/* Stats live : D+, allures, kcal */}
        <div className="rk-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)' }}>
          {[
            { l: 'Dénivelé', v: `${Math.round(elevM)}`, u: 'm' },
            { l: 'Allure moy', v: avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)}` : '—' },
            { l: 'Allure', v: curPaceSec != null ? `${fmtPaceSec(curPaceSec)}` : '—' },
            { l: 'Kcal', v: String(kcal) },
          ].map(s => (
            <div key={s.l} className="rk-cell" style={{ padding: '10px 4px 12px' }}>
              <div className="rk-label" style={{ fontSize: 12 }}>{s.l}</div>
              <div className="rk-cell-v"><span className="rk-cell-n rk-num" style={{ fontSize: 20 }}>{s.v}</span>{s.u && <span className="rk-cell-u" style={{ fontSize: 12 }}>{s.u}</span>}</div>
            </div>
          ))}
        </div>

        {/* Réglages vitesse + pente (pente : pas de 0,5 %) */}
        <div style={{ ...card, display: 'flex', gap: 8, padding: '14px 8px' }}>
          <Stepper label="Vitesse" value={speedKmh.toFixed(1).replace('.', ',')} unit="km/h"
            onMinus={() => setSpeedKmh(v => Math.max(0.5, Math.round((v - 0.5) * 10) / 10))}
            onPlus={() => setSpeedKmh(v => Math.min(30, Math.round((v + 0.5) * 10) / 10))} />
          <Stepper label="Pente" value={incline.toFixed(incline % 1 !== 0 ? 1 : 0).replace('.', ',')} unit="%"
            onMinus={() => setIncline(v => Math.max(0, Math.round((v - 0.5) * 10) / 10))}
            onPlus={() => setIncline(v => Math.min(30, Math.round((v + 0.5) * 10) / 10))} />
        </div>

        {/* Fréquence cardiaque — capteur BLE (Web Bluetooth) */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{t('activities.heartRate')}</span>
            {hr.status === 'connected'
              ? <span className="rk-num" style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0 }}>{hr.bpm ?? '—'} <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>bpm</span></span>
              : hr.supported
                ? <button type="button" onClick={() => void hr.connect()} disabled={hr.status === 'connecting'} className="rk-press"
                    style={{ minHeight: 36, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                    {hr.status === 'connecting' ? 'Connexion…' : 'Connecter'}
                  </button>
                : null}
          </div>
          {hr.status === 'connected' && hr.samples.length > 1
            ? <HrSpark samples={hr.samples} ink="var(--danger)" dimInk="var(--text-mid)" />
            : <HrPlaceholder ink="var(--text-mid)" dimInk="var(--text-mid)" supported={hr.supported} />}
        </div>
      </div>

      {/* Contrôles : pause ronde + terminer · pause → Reprendre / Terminer */}
      <div style={{ flexShrink: 0, padding: '8px 0 calc(env(safe-area-inset-bottom) + 20px)', display: 'flex', justifyContent: 'center', minHeight: 118 }}>
        {running ? (
          <RkControlRow
            center={<RkBigButton label="Pause" onClick={() => setRunning(false)}><PauseGlyph /></RkBigButton>}
            right={<RkFab label={planComplete ? 'Terminer ✓' : 'Terminer'} size={56} onClick={() => { setRunning(false); setPhase('review') }}><RkIco d={RK_ICON.flag} size={22} /></RkFab>}
          />
        ) : (
          <RkPausePills resumeLabel="Reprendre" finishLabel={planComplete ? 'Terminer ✓' : 'Terminer'}
            onResume={() => setRunning(true)} onFinish={() => { setRunning(false); setPhase('review') }} />
        )}
      </div>
    </div>
  )

  // ── Écran 2 — données de séance ──
  const statCell = (l: string, v: string) => <RkCell key={l} label={l} value={v} size={22} />

  const dataScreen = (
    <div style={{ minHeight: '100%', background: 'var(--surface-page)', color: 'var(--text)', fontFamily: FB, padding: 'calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px' }}>
        <span style={{ fontSize: 19, fontWeight: 800 }}>{t('tm.sessionData')}</span>
        <span className="rk-num" style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0 }}>{formatSeconds(seconds)}</span>
      </div>

      {/* Bloc en cours */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <span className="rk-dot" style={{ width: 10, height: 10, background: zoneBg(step.zone) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{kindLabel(step.kind)}{step.of ? ` · ${step.rep}/${step.of}` : ''} · cible {targetLabel}</div>
        </div>
        <div className="rk-num" style={{ fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{isFree ? formatSeconds(seconds) : cd(remainingInStep)}</div>
      </div>

      {/* Stats spécifiques */}
      <div className="rk-card">
        <RkGrid>
          {statCell('Distance', `${(distM / 1000).toFixed(2).replace('.', ',')} km`)}
          {statCell('Allure moy', avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)} /km` : '—')}
          {statCell('Allure VAP', vapPaceSec != null ? `${fmtPaceSec(vapPaceSec)} /km` : '—')}
          {statCell('Dénivelé', `${Math.round(elevM)} m`)}
          {statCell('Calories', `${kcal} kcal`)}
          {statCell('Vitesse', `${speedKmh.toFixed(1).replace('.', ',')} km/h`)}
          {statCell('FC moy', hr.avg != null ? `${hr.avg} bpm` : '—')}
          {statCell('FC max', hr.max != null ? `${hr.max} bpm` : '—')}
        </RkGrid>
      </div>

      {/* Profil altimétrique (réel, cumulé) */}
      <RkSectionLabel>{t('tm.altitudeProfile')}</RkSectionLabel>
      <div style={{ ...card, padding: '10px 12px', marginTop: -4 }}>
        <AltProfile series={altSeriesRef.current} height={96} />
      </div>

      {/* Déroulé de la séance */}
      <RkSectionLabel>{t('tm.sessionFlow')}</RkSectionLabel>
      <RkGroup style={{ marginTop: -4 }}>
        {plan.steps.map((s, i) => {
          const state = i < stepIdx ? 'done' : i === stepIdx ? 'now' : 'next'
          return (
            <div key={i} className="rk-row" style={{ opacity: state === 'done' ? 0.55 : 1, background: state === 'now' ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : undefined }}>
              {state === 'done'
                ? <span style={{ color: 'var(--success)', display: 'flex' }}><RkIco d={RK_ICON.check} size={16} sw={3} /></span>
                : <span className="rk-dot" data-live={state === 'now' ? '1' : undefined} style={{ width: 10, height: 10, background: state === 'now' ? 'var(--primary)' : zoneBg(s.zone), opacity: state === 'next' ? 0.6 : 1 }} />}
              <span className="rk-row-t">
                <b style={{ fontSize: 15, textDecoration: state === 'done' ? 'line-through' : 'none' }}>{s.name}</b>
                <span>{kindLabel(s.kind)}{s.of ? ` · ${s.rep}/${s.of}` : ''} · {cd(s.durationS)}</span>
              </span>
              <span className="rk-row-v rk-num" style={{ letterSpacing: 0, fontSize: 14 }}>{fmtTarget(s)}{s.inclinePct > 0 ? ` · ${s.inclinePct}%` : ''}</span>
            </div>
          )
        })}
      </RkGroup>
    </div>
  )

  // ── LIVE : mobile = 2 écrans à défiler (élan natif) · desktop = double fenêtre ──
  const live = wide ? (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ position: 'relative', minHeight: 0 }}>{liveMain}</div>
      <div style={{ position: 'relative', minHeight: 0, overflowY: 'auto' }}>{dataScreen}</div>
    </div>
  ) : (
    <div className="tread-pager" onScroll={e => { const el = e.currentTarget; setTreadPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))) }}
      style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      <style>{`.tread-pager::-webkit-scrollbar{display:none}`}</style>
      <div style={{ minWidth: '100%', width: '100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', position: 'relative', flexShrink: 0 }}>
        {liveMain}
      </div>
      <div style={{ minWidth: '100%', width: '100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', overflowY: 'auto', flexShrink: 0 }}>
        {dataScreen}
      </div>
    </div>
  )

  // ── RÉCAP avant enregistrement (bouton Terminer) ────────────
  const review = (
    <RkScreenIn style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', color: 'var(--text)', fontFamily: FB }}>
      <div style={{ flexShrink: 0, textAlign: 'center', padding: 'calc(env(safe-area-inset-top) + 14px) 16px 8px' }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>{t('rec.saveTitle')}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t('record.homeTrainerSessionDone')}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontFamily: FD, fontSize: 26, fontWeight: 600, margin: '4px 4px 0' }}>{plan.title}</h2>
          <div className="rk-card">
            <RkGrid>
              {statCell('Distance', `${(distRef.current / 1000).toFixed(2).replace('.', ',')} km`)}
              {statCell('Durée', formatSeconds(seconds))}
              {statCell('Allure moy', avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)} /km` : '—')}
              {statCell('Allure VAP', vapPaceSec != null ? `${fmtPaceSec(vapPaceSec)} /km` : '—')}
              {statCell('Dénivelé', `${Math.round(elevRef.current)} m`)}
              {statCell('Calories', `${kcal} kcal`)}
              {hr.avg != null && statCell('FC moy', `${hr.avg} bpm`)}
              {hr.max != null && statCell('FC max', `${hr.max} bpm`)}
            </RkGrid>
          </div>

          {/* Comparaison PRÉVU vs RÉALISÉ (séance planifiée uniquement) */}
          {!isFree && (() => {
            const plannedElev = plan.steps.reduce((s, st) => s + ((st.targetKmh ?? 0) / 3.6) * st.durationS * Math.max(0, st.inclinePct) / 100, 0)
            const plannedPace = plan.totalDistanceM > 0 ? plan.totalS / (plan.totalDistanceM / 1000) : null
            const rows: { l: string; p: string; d: string }[] = [
              { l: 'Durée', p: formatSeconds(plan.totalS), d: formatSeconds(seconds) },
              { l: 'Distance', p: `${(plan.totalDistanceM / 1000).toFixed(2).replace('.', ',')} km`, d: `${(distRef.current / 1000).toFixed(2).replace('.', ',')} km` },
              { l: 'Allure moy', p: plannedPace != null ? `${fmtPaceSec(plannedPace)}/km` : '—', d: avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)}/km` : '—' },
              { l: 'Dénivelé', p: `${Math.round(plannedElev)} m`, d: `${Math.round(elevRef.current)} m` },
            ]
            return (
              <div style={{ ...card, padding: '14px 16px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{t('plnp.activity.planVsDone')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 18px', alignItems: 'baseline' }}>
                  <span />
                  <span className="rk-label" style={{ fontSize: 12 }}>Prévu</span>
                  <span className="rk-label" style={{ fontSize: 12 }}>{t('calendar.realized')}</span>
                  {rows.map(r => (
                    <FragmentRowTm key={r.l} r={r} />
                  ))}
                </div>
              </div>
            )
          })()}

          <RkSectionLabel>{t('tm.altitudeProfile')}</RkSectionLabel>
          <div style={{ ...card, padding: '10px 12px', marginTop: -4 }}>
            <AltProfile series={altSeriesRef.current} height={110} />
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 12px)', maxWidth: 600, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <RkCta variant="primary" onClick={() => { haptic('medium'); void handleSave() }}>Enregistrer la séance</RkCta>
        <div style={{ display: 'flex', gap: 4 }}>
          <RkCta variant="text" onClick={() => { setPhase('live'); setRunning(true) }}>Reprendre la séance</RkCta>
          <RkCta variant="text-danger" onClick={() => setConfirmDelete(true)}>Supprimer la séance</RkCta>
        </div>
      </div>

      {/* Confirmation de suppression */}
      <RkSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} zIndex={10001} label="Supprimer cette séance ?">
        <div style={{ textAlign: 'center', padding: '6px 4px 4px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Supprimer cette séance ?</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, margin: '8px 0 22px' }}>Elle ne sera pas enregistrée — toutes les données de cette session seront perdues.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RkCta variant="primary" onClick={() => setConfirmDelete(false)}>Annuler</RkCta>
            <RkCta variant="text-danger" onClick={() => { haptic('heavy'); onExit() }}>Supprimer</RkCta>
          </div>
        </div>
      </RkSheet>
    </RkScreenIn>
  )

  // ── Écran FINAL (après enregistrement) ──────────────────────
  const done = (
    <RkScreenIn style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, background: 'var(--surface-page)', color: 'var(--text)', fontFamily: FB, padding: '0 16px' }}>
      <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RkIco d={RK_ICON.check} size={28} sw={3} />
      </span>
      <p style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, margin: 0 }}>{t('activities.recordedSession')}</p>
      <div className="rk-card" style={{ width: '100%', maxWidth: 380 }}>
        <RkGrid>
          {statCell('Distance', `${(distRef.current / 1000).toFixed(2).replace('.', ',')} km`)}
          {statCell('Durée', formatSeconds(seconds))}
          {statCell('Allure moy.', distRef.current > 0 ? `${fmtPaceSec(seconds / (distRef.current / 1000))}/km` : '—')}
          {statCell('D+', `${Math.round(elevRef.current)} m`)}
        </RkGrid>
      </div>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <RkCta variant="primary" onClick={onFinished}>Terminer</RkCta>
      </div>
    </RkScreenIn>
  )

  const content = (
    <div className={rkScope(appDark)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--surface-page)' }}>
      {phase === 'summary' ? summary : phase === 'live' ? live : phase === 'review' ? review : done}
      {phase === 'live' && !wide && (
        <RkPageDots count={2} index={treadPage} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(env(safe-area-inset-top) + 58px)', zIndex: 5, pointerEvents: 'none' }} />
      )}
    </div>
  )
  return createPortal(content, document.body)
}

// Profil altimétrique cumulé (montée seule, le tapis ne descend pas) — SVG raw.
function AltProfile({ series, height }: { series: number[]; height: number }) {
  const pts = series.length > 240
    ? Array.from({ length: 240 }, (_, i) => series[Math.round((i / 239) * (series.length - 1))])
    : series
  if (pts.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
        Le profil se dessine au fil de la séance
      </div>
    )
  }
  const W = 600, PAD = 6
  const maxA = Math.max(...pts, 1)
  const X = (i: number) => (i / (pts.length - 1)) * W
  const Y = (v: number) => PAD + (1 - v / (maxA * 1.06)) * (height - PAD * 2)
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${W} ${height} L 0 ${height} Z`
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="treadAltGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#treadAltGrad)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <text x={W - 8} y={14} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--text-mid)" style={{ fontVariantNumeric: 'tabular-nums' }}>+{Math.round(pts[pts.length - 1])} m</text>
    </svg>
  )
}

// Section fréquence cardiaque — état vide tant qu'aucun capteur cardio n'est
// connecté. Ligne SVG plate + invite. Prête à recevoir une vraie série FC.
function HrPlaceholder({ ink, dimInk, supported }: { ink: string; dimInk: string; supported?: boolean }) {
  return (
    <div style={{ position: 'relative', height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-soft)', overflow: 'hidden' }}>
      <svg viewBox="0 0 300 56" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <line x1="0" y1="28" x2="300" y2="28" stroke={ink} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 5" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: dimInk, textAlign: 'center', padding: '0 12px' }}>
        {supported === false
          ? 'Bluetooth indisponible sur ce navigateur (iOS) — FC via l’app native à venir'
          : 'Connecte un capteur cardio pour voir ta FC'}
      </div>
    </div>
  )
}

// Courbe FC live (capteur BLE) — SVG raw, ~2 min d'historique.
function HrSpark({ samples, ink, dimInk }: { samples: number[]; ink: string; dimInk: string }) {
  const pts = samples.slice(-240)
  const lo = Math.min(...pts), hi = Math.max(...pts)
  const range = Math.max(8, hi - lo)
  const W = 300, H = 56, PAD = 5
  const X = (i: number) => (i / Math.max(1, pts.length - 1)) * W
  const Y = (v: number) => PAD + (1 - (v - lo) / range) * (H - PAD * 2)
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  return (
    <div style={{ position: 'relative', height: H, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={ink} opacity={0.12} />
        <path d={d} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 10, fontWeight: 800, color: dimInk, fontVariantNumeric: 'tabular-nums' }}>{lo}–{hi} bpm</span>
    </div>
  )
}

// Ligne du tableau Prévu vs réalisé du récap.
function FragmentRowTm({ r }: { r: { l: string; p: string; d: string } }) {
  return (
    <>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{r.l}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{r.p}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{r.d}</span>
    </>
  )
}
