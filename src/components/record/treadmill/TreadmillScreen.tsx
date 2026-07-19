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
import { useI18n } from '@/lib/i18n'
import { useTreadmillPlan } from './useTreadmillPlan'
import {
  type TreadmillPlan, type TreadStep,
  zoneBg, zoneInk, fmtPaceSec, kmhToPaceSec,
} from './treadmillPlan'

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
  const { plan: loadedPlan, loading } = useTreadmillPlan(true)
  const [phase, setPhase] = useState<'summary' | 'live' | 'done'>('summary')
  const [running, setRunning] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())

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
      lastStepRef.current = stepIdx
      if (step.targetKmh != null) setSpeedKmh(step.targetKmh)
      setIncline(step.inclinePct)
    }
  }, [stepIdx, step.targetKmh, step.inclinePct])

  // Distance parcourue (intègre la vitesse réelle chaque seconde).
  const distRef = useRef(0)
  const [distM, setDistM] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      distRef.current += (speedKmh / 3.6)
      setDistM(distRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [running, speedKmh])

  const bg = zoneBg(step.zone)
  const ink = zoneInk(step.zone)
  const dimInk = step.zone >= 5 ? 'rgba(255,255,255,0.62)' : 'rgba(10,12,16,0.55)'
  const chipBg = step.zone >= 5 ? 'rgba(255,255,255,0.16)' : 'rgba(10,12,16,0.10)'

  const kcal = Math.round((seconds / 60) * 10)   // ≈10 kcal/min (repli sans poids)

  async function handleSave() {
    setRunning(false)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const durationSec = seconds
        const distanceM = Math.round(distRef.current)
        const start = new Date(Date.now() - durationSec * 1000).toISOString()
        const avgSpeedMs = durationSec > 0 ? distanceM / durationSec : 0
        await sb.from('workout_sessions').insert({
          user_id: user.id, sport: 'running',
          started_at: start, ended_at: new Date().toISOString(),
          duration_seconds: durationSec, distance_m: distanceM,
          avg_speed_kmh: avgSpeedMs * 3.6, calories: kcal, status: 'completed',
          title: plan.title, training_types: ['tapis'],
        })
        await sb.from('activities').insert({
          user_id: user.id, sport_type: 'running', title: plan.title,
          started_at: start, moving_time_s: durationSec, elapsed_time_s: durationSec,
          distance_m: distanceM, avg_speed_ms: avgSpeedMs, calories: kcal,
        })
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
        {isFree && (
          <div style={{ fontSize: 13, color: 'var(--text-mid)', background: 'var(--bg-card2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            Aucune séance tapis planifiée aujourd'hui — mode libre. Ajuste vitesse et pente à la volée.
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
          Démarrer la séance
        </button>
      </div>
    </div>
  )

  // ── Mode LIVE ───────────────────────────────────────────────
  const targetLabel = step.targetKmh != null
    ? `${step.targetKmh.toFixed(1).replace('.', ',')} km/h`
    : (step.targetPaceSecPerKm != null ? `${fmtPaceSec(step.targetPaceSecPerKm)}/km` : '—')
  const curPaceSec = speedKmh > 0 ? kmhToPaceSec(speedKmh) : null

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

  const live = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: bg, color: ink, transition: 'background 0.4s ease', fontFamily: FB, paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{formatSeconds(seconds)}</span>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.85 }}>{kindLabel(step.kind)}{step.of ? ` ${step.rep}/${step.of}` : ''}</span>
        <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.85 }}>{(distM / 1000).toFixed(2).replace('.', ',')} km</span>
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
        <div style={{ fontSize: 'min(30vw, 128px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {isFree ? formatSeconds(seconds) : cd(remainingInStep)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, opacity: 0.85 }}>
          Cible · {targetLabel}{step.inclinePct > 0 ? ` · pente ${step.inclinePct}%` : ''}
        </div>
      </div>

      {/* Réglages vitesse + pente */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 12px 14px', flexShrink: 0 }}>
        <Stepper label="Vitesse" value={speedKmh.toFixed(1).replace('.', ',')} unit="km/h"
          onMinus={() => setSpeedKmh(v => Math.max(0.5, Math.round((v - 0.5) * 10) / 10))}
          onPlus={() => setSpeedKmh(v => Math.min(30, Math.round((v + 0.5) * 10) / 10))} />
        <Stepper label="Pente" value={String(incline)} unit="%"
          onMinus={() => setIncline(v => Math.max(0, v - 1))}
          onPlus={() => setIncline(v => Math.min(30, v + 1))} />
      </div>

      {/* Allure courante + section FC */}
      <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>
          <span>Allure {curPaceSec != null ? `${fmtPaceSec(curPaceSec)}/km` : '—'}</span>
          <span>Fréquence cardiaque</span>
        </div>
        <HrPlaceholder ink={ink} dimInk={dimInk} />
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px calc(env(safe-area-inset-bottom) + 16px)', flexShrink: 0 }}>
        <button onClick={() => setRunning(r => !r)} style={{ flex: 1, height: 52, borderRadius: 14, background: chipBg, border: 'none', color: ink, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: FB }}>
          {running ? 'Pause' : 'Reprendre'}
        </button>
        <button onClick={handleSave} style={{ flex: 1, height: 52, borderRadius: 14, background: step.zone >= 5 ? 'rgba(255,255,255,0.2)' : 'rgba(10,12,16,0.14)', border: 'none', color: ink, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: FB }}>
          {planComplete ? 'Terminer ✓' : 'Terminer'}
        </button>
      </div>
    </div>
  )

  // ── Écran FINAL ─────────────────────────────────────────────
  const done = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: 'var(--bg)', color: 'var(--text)', fontFamily: FB, padding: '0 24px' }}>
      <p style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, margin: 0 }}>Séance tapis terminée</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340 }}>
        {[
          { l: 'Distance', v: `${(distRef.current / 1000).toFixed(2).replace('.', ',')} km` },
          { l: 'Durée', v: formatSeconds(seconds) },
          { l: 'Allure moy.', v: distRef.current > 0 ? `${fmtPaceSec(seconds / (distRef.current / 1000))}/km` : '—' },
          { l: 'Calories', v: `${kcal} kcal` },
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
      {phase === 'summary' ? summary : phase === 'live' ? live : done}
    </div>
  )
  return createPortal(content, document.body)
}

// Section fréquence cardiaque — état vide tant qu'aucun capteur cardio n'est
// connecté. Ligne SVG plate + invite. Prête à recevoir une vraie série FC.
function HrPlaceholder({ ink, dimInk }: { ink: string; dimInk: string }) {
  return (
    <div style={{ position: 'relative', height: 56, borderRadius: 12, background: 'transparent', border: `1px dashed ${dimInk}`, overflow: 'hidden' }}>
      <svg viewBox="0 0 300 56" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <line x1="0" y1="28" x2="300" y2="28" stroke={ink} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 5" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: dimInk }}>
        Connecte un capteur cardio pour voir ta FC
      </div>
    </div>
  )
}
