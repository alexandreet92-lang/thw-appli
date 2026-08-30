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
  const dimInk = step.zone >= 5 ? 'rgba(255,255,255,0.62)' : 'rgba(10,12,16,0.55)'
  const chipBg = step.zone >= 5 ? 'rgba(255,255,255,0.16)' : 'rgba(10,12,16,0.10)'

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

  // ── Écran RÉSUMÉ ────────────────────────────────────────────
  const summary = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: FB, paddingTop: 'env(safe-area-inset-top)' }}>
      <header style={{ padding: '14px 20px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={onExit} aria-label="Retour" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
          <span style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>Tapis · prêt à démarrer</span>
        </div>
        <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 600, margin: '0 0 14px', color: 'var(--text)' }}>{plan.title}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: `~${Math.round(plan.totalS / 60)}`, l: 'min' },
            { v: `${(plan.totalDistanceM / 1000).toFixed(1).replace('.', ',')}`, l: 'km prévus' },
            { v: String(plan.steps.length), l: 'intervalles' },
          ].map(s => (
            <div key={s.l} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px 12px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 700, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 8px' }}>
        {/* ── Mes séances planifiées (semaine courante + suivante) : un clic charge la séance ── */}
        {options.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '2px 2px 8px' }}>
              Mes séances planifiées
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
              {/* Course libre */}
              <button onClick={() => select(null)}
                style={{ flexShrink: 0, textAlign: 'left', padding: '10px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: FB,
                  border: selectedId == null ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: selectedId == null ? 'color-mix(in srgb, var(--primary) 8%, var(--bg-card))' : 'var(--bg-card)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: selectedId == null ? 'var(--primary)' : 'var(--text)' }}>Course libre</div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2 }}>Vitesse et pente à la volée</div>
              </button>
              {options.map(o => {
                const on = selectedId === o.id
                return (
                  <button key={o.id} onClick={() => select(o.id)}
                    style={{ flexShrink: 0, textAlign: 'left', padding: '10px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: FB, maxWidth: 220,
                      border: on ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: on ? 'color-mix(in srgb, var(--primary) 8%, var(--bg-card))' : 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: on ? 'var(--primary)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                      {o.isTreadmill && (
                        <span style={{ flexShrink: 0, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 14%, transparent)', borderRadius: 5, padding: '2px 5px' }}>Tapis</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2, textTransform: 'capitalize' }}>
                      {o.isToday ? "Aujourd'hui" : o.dayLabel}{o.durationMin ? ` · ${o.durationMin} min` : ''}{!o.hasBlocks ? ' · sans blocs' : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {isFree && options.length === 0 && !loading && (
          <div style={{ fontSize: 13, color: 'var(--text-mid)', background: 'var(--bg-card2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            Aucune séance course planifiée ces deux semaines — mode libre. Ajuste vitesse et pente à la volée.
          </div>
        )}
        {isFree && selectedId != null && (
          <div style={{ fontSize: 13, color: 'var(--text-mid)', background: 'var(--bg-card2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            Cette séance n'a pas de blocs détaillés — elle se lance en mode libre.
          </div>
        )}
        {plan.steps.map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '13px 15px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: zoneBg(s.zone), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>
                {kindLabel(s.kind)}{s.of ? ` · ${s.rep}/${s.of}` : ''} · {cd(s.durationS)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {s.targetKmh != null ? `${s.targetKmh.toFixed(1).replace('.', ',')} km/h` : (s.targetPaceSecPerKm != null ? `${fmtPaceSec(s.targetPaceSecPerKm)}/km` : '—')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>{s.inclinePct > 0 ? `pente ${s.inclinePct}%` : 'à plat'}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px calc(env(safe-area-inset-bottom) + 16px)', flexShrink: 0 }}>
        <button
          onClick={() => { setPhase('live'); setRunning(true) }}
          disabled={loading}
          style={{ width: '100%', height: 54, border: 'none', borderRadius: 15, cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 17, fontWeight: 800, fontFamily: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {t('record.startSession')}
        </button>
      </div>
    </div>
  )

  // ── Mode LIVE ───────────────────────────────────────────────
  const targetLabel = step.targetKmh != null
    ? `${step.targetKmh.toFixed(1).replace('.', ',')} km/h`
    : (step.targetPaceSecPerKm != null ? `${fmtPaceSec(step.targetPaceSecPerKm)}/km` : '—')
  const curPaceSec = speedKmh > 0 ? kmhToPaceSec(speedKmh) : null
  const avgPaceSec = distM > 50 ? seconds / (distM / 1000) : null
  const vapPaceSec = adjM > 50 ? seconds / (adjM / 1000) : null

  const Stepper = ({ label, value, unit, onMinus, onPlus }: { label: string; value: string; unit: string; onMinus: () => void; onPlus: () => void }) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: dimInk, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <button onClick={onMinus} aria-label={`${label} moins`} style={{ width: 42, height: 42, borderRadius: '50%', background: chipBg, border: 'none', color: ink, fontSize: 22, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>−</button>
        <div style={{ minWidth: 62, textAlign: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: ink, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: dimInk, marginLeft: 2 }}>{unit}</span>
        </div>
        <button onClick={onPlus} aria-label={`${label} plus`} style={{ width: 42, height: 42, borderRadius: '50%', background: chipBg, border: 'none', color: ink, fontSize: 22, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>+</button>
      </div>
    </div>
  )

  // ── Écran 1 — cadran live (fond zone) ───────────────────────
  const liveMain = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bg, color: ink, transition: 'background 0.4s ease', fontFamily: FB, paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      {/* Top bar : durée + bloc + distance — bien visibles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatSeconds(seconds)}</span>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.85 }}>{kindLabel(step.kind)}{step.of ? ` ${step.rep}/${step.of}` : ''}</span>
        <span style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{(distM / 1000).toFixed(2).replace('.', ',')} km</span>
      </div>

      {/* Barre de progression des intervalles */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0', flexShrink: 0 }}>
        {plan.steps.map((s, i) => (
          <span key={i} style={{ flex: Math.max(1, s.durationS), height: 5, borderRadius: 3, background: 'currentColor', opacity: i < stepIdx ? 0.85 : i === stepIdx ? 1 : 0.28 }} />
        ))}
      </div>

      {/* Cœur : décompte + cible */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', opacity: 0.9, textAlign: 'center' }}>{step.name}</div>
        <div style={{ fontSize: 'min(28vw, 118px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {isFree ? formatSeconds(seconds) : cd(remainingInStep)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, opacity: 0.85 }}>
          Cible · {targetLabel}{step.inclinePct > 0 ? ` · pente ${step.inclinePct}%` : ''}
        </div>
      </div>

      {/* Bande de stats live : D+ (fluctue), allures — à côté du temps/km */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', flexShrink: 0 }}>
        {[
          { l: 'Dénivelé', v: `${Math.round(elevM)} m` },
          { l: 'Allure moy', v: avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)}` : '—' },
          { l: 'Allure', v: curPaceSec != null ? `${fmtPaceSec(curPaceSec)}` : '—' },
          { l: 'Kcal', v: String(kcal) },
        ].map(s => (
          <div key={s.l} style={{ flex: 1, background: chipBg, borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: dimInk }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Réglages vitesse + pente (pente : pas de 0,5 %) */}
      <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px', flexShrink: 0 }}>
        <Stepper label="Vitesse" value={speedKmh.toFixed(1).replace('.', ',')} unit="km/h"
          onMinus={() => setSpeedKmh(v => Math.max(0.5, Math.round((v - 0.5) * 10) / 10))}
          onPlus={() => setSpeedKmh(v => Math.min(30, Math.round((v + 0.5) * 10) / 10))} />
        <Stepper label="Pente" value={incline.toFixed(incline % 1 !== 0 ? 1 : 0).replace('.', ',')} unit="%"
          onMinus={() => setIncline(v => Math.max(0, Math.round((v - 0.5) * 10) / 10))}
          onPlus={() => setIncline(v => Math.min(30, Math.round((v + 0.5) * 10) / 10))} />
      </div>

      {/* Section FC — capteur BLE (Web Bluetooth) */}
      <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 6 }}>
          <span>Fréquence cardiaque</span>
          {hr.status === 'connected'
            ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{hr.bpm ?? '—'} bpm</span>
            : hr.supported
              ? <button onClick={() => void hr.connect()} disabled={hr.status === 'connecting'}
                  style={{ background: chipBg, border: 'none', color: ink, borderRadius: 9, padding: '5px 12px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: FB }}>
                  {hr.status === 'connecting' ? 'Connexion…' : 'Connecter'}
                </button>
              : null}
        </div>
        {hr.status === 'connected' && hr.samples.length > 1
          ? <HrSpark samples={hr.samples} ink={ink} dimInk={dimInk} />
          : <HrPlaceholder ink={ink} dimInk={dimInk} supported={hr.supported} />}
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px calc(env(safe-area-inset-bottom) + 16px)', flexShrink: 0 }}>
        <button onClick={() => setRunning(r => !r)} style={{ flex: 1, height: 52, borderRadius: 14, background: chipBg, border: 'none', color: ink, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: FB }}>
          {running ? 'Pause' : 'Reprendre'}
        </button>
        <button onClick={() => { setRunning(false); setPhase('review') }} style={{ flex: 1, height: 52, borderRadius: 14, background: step.zone >= 5 ? 'rgba(255,255,255,0.2)' : 'rgba(10,12,16,0.14)', border: 'none', color: ink, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: FB }}>
          {planComplete ? 'Terminer ✓' : 'Terminer'}
        </button>
      </div>
    </div>
  )

  // ── Écran 2 — données de séance (fond du thème : noir en sombre, blanc en clair) ──
  const statCell = (l: string, v: string) => (
    <div key={l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>{l}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginTop: 3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{v}</div>
    </div>
  )

  const dataScreen = (
    <div style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', fontFamily: FB, padding: 'calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 20px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Données de séance</span>
        <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatSeconds(seconds)}</span>
      </div>

      {/* Bloc en cours */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px 14px', marginBottom: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 4, background: zoneBg(step.zone), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-mid)', marginTop: 1 }}>{kindLabel(step.kind)}{step.of ? ` · ${step.rep}/${step.of}` : ''} · cible {targetLabel}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{isFree ? formatSeconds(seconds) : cd(remainingInStep)}</div>
      </div>

      {/* Stats spécifiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
        {statCell('Distance', `${(distM / 1000).toFixed(2).replace('.', ',')} km`)}
        {statCell('Allure moy', avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)} /km` : '—')}
        {statCell('Allure VAP', vapPaceSec != null ? `${fmtPaceSec(vapPaceSec)} /km` : '—')}
        {statCell('Dénivelé', `${Math.round(elevM)} m`)}
        {statCell('Calories', `${kcal} kcal`)}
        {statCell('Vitesse', `${speedKmh.toFixed(1).replace('.', ',')} km/h`)}
        {statCell('FC moy', hr.avg != null ? `${hr.avg} bpm` : '—')}
        {statCell('FC max', hr.max != null ? `${hr.max} bpm` : '—')}
      </div>

      {/* Profil altimétrique (réel, cumulé) */}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 2px 8px' }}>Profil altimétrique</div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px', marginBottom: 14 }}>
        <AltProfile series={altSeriesRef.current} height={96} />
      </div>

      {/* Déroulé de la séance */}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 2px 8px' }}>Déroulé de la séance</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.steps.map((s, i) => {
          const state = i < stepIdx ? 'done' : i === stepIdx ? 'now' : 'next'
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: '9px 12px',
              background: state === 'now' ? 'color-mix(in srgb, var(--primary) 8%, var(--bg-card))' : 'var(--bg-card)',
              border: state === 'now' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              opacity: state === 'done' ? 0.65 : 1 }}>
              {state === 'done' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>
              ) : (
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: state === 'now' ? 'var(--primary)' : zoneBg(s.zone), flexShrink: 0, opacity: state === 'next' ? 0.6 : 1 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textDecoration: state === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 1 }}>{kindLabel(s.kind)}{s.of ? ` · ${s.rep}/${s.of}` : ''} · {cd(s.durationS)}</div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {s.targetKmh != null ? `${s.targetKmh.toFixed(1).replace('.', ',')} km/h` : (s.targetPaceSecPerKm != null ? `${fmtPaceSec(s.targetPaceSecPerKm)}/km` : '—')}
                {s.inclinePct > 0 ? ` · ${s.inclinePct}%` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── LIVE : mobile = 2 écrans à défiler · desktop = double fenêtre ──
  const live = wide ? (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ position: 'relative', minHeight: 0 }}>{liveMain}</div>
      <div style={{ position: 'relative', minHeight: 0, overflowY: 'auto', borderLeft: '1px solid var(--border)' }}>{dataScreen}</div>
    </div>
  ) : (
    <div className="tread-pager" style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
      <style>{`.tread-pager::-webkit-scrollbar{display:none}`}</style>
      <div style={{ minWidth: '100%', width: '100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', position: 'relative', flexShrink: 0 }}>
        {liveMain}
        {/* Indicateur : un 2e écran existe à droite */}
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 44px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, pointerEvents: 'none' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.9 }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.35 }} />
        </div>
      </div>
      <div style={{ minWidth: '100%', width: '100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', overflowY: 'auto', flexShrink: 0 }}>
        {dataScreen}
      </div>
    </div>
  )

  // ── RÉCAP avant enregistrement (bouton Terminer) ────────────
  const review = (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--bg)', color: 'var(--text)', fontFamily: FB, padding: 'calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 18px)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6 }}>Séance terminée</div>
        <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, margin: '0 0 16px' }}>{plan.title}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
          {statCell('Distance', `${(distRef.current / 1000).toFixed(2).replace('.', ',')} km`)}
          {statCell('Durée', formatSeconds(seconds))}
          {statCell('Allure moy', avgPaceSec != null ? `${fmtPaceSec(avgPaceSec)} /km` : '—')}
          {statCell('Allure VAP', vapPaceSec != null ? `${fmtPaceSec(vapPaceSec)} /km` : '—')}
          {statCell('Dénivelé', `${Math.round(elevRef.current)} m`)}
          {statCell('Calories', `${kcal} kcal`)}
          {hr.avg != null && statCell('FC moy', `${hr.avg} bpm`)}
          {hr.max != null && statCell('FC max', `${hr.max} bpm`)}
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
            <>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 2px 8px' }}>Prévu vs réalisé</div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '5px 18px', alignItems: 'baseline' }}>
                  <span />
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>Prévu</span>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>Réalisé</span>
                  {rows.map(r => (
                    <FragmentRowTm key={r.l} r={r} />
                  ))}
                </div>
              </div>
            </>
          )
        })()}

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 2px 8px' }}>Profil altimétrique</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px', marginBottom: 18 }}>
          <AltProfile series={altSeriesRef.current} height={110} />
        </div>

        <button onClick={handleSave}
          style={{ width: '100%', height: 54, borderRadius: 15, background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: FB, marginBottom: 10 }}>
          Enregistrer la séance
        </button>
        <button onClick={() => setConfirmDelete(true)}
          style={{ width: '100%', height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB, marginBottom: 10 }}>
          Supprimer la séance
        </button>
        <button onClick={() => { setPhase('live'); setRunning(true) }}
          style={{ width: '100%', padding: '10px 0', borderRadius: 12, background: 'transparent', border: 'none', color: 'var(--text-mid)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>
          Reprendre la séance
        </button>
      </div>

      {/* Confirmation de suppression */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setConfirmDelete(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(360px, 100%)', background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '20px 20px 16px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Supprimer cette séance ?</div>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 16px' }}>Elle ne sera pas enregistrée — toutes les données de cette session seront perdues.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>
                Annuler
              </button>
              <button onClick={onExit}
                style={{ flex: 1, height: 44, borderRadius: 12, background: '#EF4444', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── Écran FINAL (après enregistrement) ──────────────────────
  const done = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: 'var(--bg)', color: 'var(--text)', fontFamily: FB, padding: '0 24px' }}>
      <p style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, margin: 0 }}>Séance enregistrée</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340 }}>
        {[
          { l: 'Distance', v: `${(distRef.current / 1000).toFixed(2).replace('.', ',')} km` },
          { l: 'Durée', v: formatSeconds(seconds) },
          { l: 'Allure moy.', v: distRef.current > 0 ? `${fmtPaceSec(seconds / (distRef.current / 1000))}/km` : '—' },
          { l: 'D+', v: `${Math.round(elevRef.current)} m` },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px', fontWeight: 700 }}>{s.l}</p>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{s.v}</p>
          </div>
        ))}
      </div>
      <button onClick={onFinished} style={{ padding: '14px 48px', borderRadius: 15, background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: FB }}>Terminer</button>
    </div>
  )

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)' }}>
      {phase === 'summary' ? summary : phase === 'live' ? live : phase === 'review' ? review : done}
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
    <div style={{ position: 'relative', height: 56, borderRadius: 12, background: 'transparent', border: `1px dashed ${dimInk}`, overflow: 'hidden' }}>
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
    <div style={{ position: 'relative', height: H, borderRadius: 12, overflow: 'hidden' }}>
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
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)' }}>{r.l}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{r.p}</span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{r.d}</span>
    </>
  )
}
