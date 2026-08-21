'use client'
// Orchestrateur de la séance home trainer. Branche profil (FTP), séance
// planifiée, capteurs, moteur, enregistrement. Rendu en portail plein écran.
// Aucune valeur athlète en dur : le FTP vient de athlete_performance_profile.
// FTP absent → StartGate n'interdit plus le démarrage : la séance planifiée
// reste visible et lançable (cibles watts simplement indisponibles).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useSmSn } from '@/hooks/useSmSn'
import { useSensors } from './useSensors'
import { useRidePlan } from './useRidePlan'
import { useRideEngine } from './useRideEngine'
import { useRideRecorder } from './useRideRecorder'
import { derive, type RideView } from './viewModel'
import StartGate from './StartGate'
import RideMobile from './RideMobile'
import RideDesktop from './RideDesktop'
import RidePause from './RidePause'
import RampTestResult, { type RampStop } from './RampTestResult'
import RideSummary from './RideSummary'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

interface Props { onExit: () => void; onFinished: () => void; plannedIdOverride?: string | null }

function useIsDesktop(): boolean {
  const [desk, setDesk] = useState(false)
  useEffect(() => {
    const sync = () => setDesk(window.innerWidth >= 1024)
    sync(); window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  return desk
}

export default function RideScreen({ onExit, onFinished, plannedIdOverride }: Props) {
  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState(false)
  const [startedAt, setStartedAt] = useState('')
  const [massKg, setMassKg] = useState(0)
  const [rampStop, setRampStop] = useState<RampStop | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showSummary, setShowSummary] = useState(false)   // écran de résumé/validation avant enregistrement
  useEffect(() => { setMounted(true) }, [])

  // Poids athlète (W/kg en direct + affiché sur l'écran de résultat).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user || cancelled) return
        const { data } = await sb.from('profiles').select('weight_kg').eq('id', user.id).maybeSingle()
        if (!cancelled && data?.weight_kg) setMassKg(Number(data.weight_kg) || 0)
      } catch { /* poids indisponible → W/kg masqué */ }
    })()
    return () => { cancelled = true }
  }, [])

  const { benchmarks, ready, compute } = useSmSn()
  const ftp = benchmarks.ftp
  const fcMax = benchmarks.hrMax
  const { plan, plannedId, loading: planLoading } = useRidePlan(ftp, ready, plannedIdOverride)
  const sensors = useSensors()
  const engine = useRideEngine(ftp ?? 0, plan, sensors.live)
  const recorder = useRideRecorder()
  const isDesktop = useIsDesktop()

  const paused = started && !engine.running && !recorder.saving
  useWakeLock(started && engine.running)

  const onStart = useCallback(() => {
    setStartedAt(new Date().toISOString())
    setStarted(true)
    engine.start()
  }, [engine])

  // « Stop test » (rampe) : mémorise l'arrêt (palier + temps tenu) puis saute
  // à la récupération. Le résultat est confirmé à la fin de la séance.
  const onStopTest = useCallback(() => {
    const info = engine.stopRampTest()
    if (info) {
      setRampStop({
        startW: info.startW, stepW: info.stepW, stepMin: info.stepMin,
        validatedPaliers: Math.max(1, info.failedRep - 1),
        heldSecOnFailed: info.heldSecOnFailed,
      })
    }
  }, [engine])

  // Le plan contient-il un bloc de test ? (→ écran de résultat en fin de séance)
  const hasCp20 = useMemo(() => !!plan?.blocks.some(b => b.test === 'cp20'), [plan])
  const hasRampPlan = useMemo(() => !!plan?.blocks.some(b => b.test === 'ramp'), [plan])
  // Paramètres de la rampe pour l'écran de résultat : soit l'arrêt mémorisé
  // (bouton « Stop test »), soit un repli déduit du plan (athlète allé au bout).
  const resolvedRamp: RampStop | undefined = useMemo(() => {
    if (rampStop) return rampStop
    if (!hasRampPlan || !plan) return undefined
    const ramp = plan.blocks.filter(b => b.test === 'ramp')
    if (ramp.length === 0) return undefined
    const startW = ramp[0].targetW
    const stepW = ramp.length > 1 ? ramp[1].targetW - ramp[0].targetW : 20
    const stepMin = ramp[0].durationS / 60
    const done = ramp.filter(b => b.t1 <= engine.t).length
    const cur = ramp.find(b => engine.t >= b.t0 && engine.t < b.t1)
    return {
      startW, stepW, stepMin,
      validatedPaliers: Math.max(1, done),
      heldSecOnFailed: cur ? Math.max(0, engine.t - cur.t0) : 0,
    }
  }, [rampStop, hasRampPlan, plan, engine.t])
  // Moyenne mesurée sur la fenêtre du bloc CP20 (pour FTP = 0,95 × moyenne).
  const cp20Avg = useMemo(() => {
    const blk = plan?.blocks.find(b => b.test === 'cp20')
    if (!blk) return 0
    const inWin = engine.samples.current.filter(s => s.t > blk.t0 && s.t <= blk.t1 && s.power != null)
    if (inWin.length === 0) return 0
    return Math.round(inWin.reduce((s, x) => s + (x.power ?? 0), 0) / inWin.length)
  }, [plan, engine.samples, engine.t])

  // « Terminer » : on met la séance en pause et on ouvre l'écran de RÉSUMÉ.
  // Rien n'est enregistré tant que l'athlète n'a pas validé (titre/RPE/sensations).
  const onFinish = useCallback(() => {
    engine.pause()
    setShowSummary(true)
  }, [engine])

  // « Enregistrer » (depuis l'écran de résumé) : persiste l'activité avec le
  // titre, le RPE et les sensations, clôture la séance planifiée, puis sort.
  const doSave = useCallback(async (title: string, rpe: number, comment: string) => {
    // On enregistre TOUJOURS la séance, même sans FTP (ftp ?? 0 → charge/IF
    // non calculées mais la séance est bien sauvegardée).
    await recorder.save({
      samples: engine.samples.current, metrics: engine.metrics, ftp: ftp ?? 0,
      startedAt: startedAt || new Date().toISOString(), elapsedS: engine.t,
      title, rpe, comment, compute,
    })
    // Clôture la séance planifiée source (si lancée depuis le planning).
    if (plannedId) {
      try { await createClient().from('planned_sessions').update({ status: 'done' }).eq('id', plannedId) } catch { /* best-effort */ }
    }
    setShowSummary(false)
    // Séance de test → écran de résultat (PMA/FTP/zones) avant de quitter.
    if (rampStop || hasRampPlan || (hasCp20 && cp20Avg > 0)) { setShowResult(true); return }
    onFinished()
  }, [engine, ftp, recorder, startedAt, plannedId, compute, onFinished, rampStop, hasRampPlan, hasCp20, cp20Avg])

  const view: RideView = useMemo(() => ({
    ftp: ftp ?? 0, fcMax: fcMax ?? 200, massKg, plan, t: engine.t,
    metrics: engine.metrics, current: engine.current, samples: engine.samples.current,
  }), [ftp, fcMax, massKg, plan, engine.t, engine.metrics, engine.current, engine.samples])
  const d = useMemo(() => derive(view), [view])

  if (!mounted) return null

  let body: React.ReactNode
  if (showSummary) {
    body = (
      <RideSummary
        metrics={engine.metrics}
        elapsedS={engine.t}
        smEst={d.smEst}
        defaultTitle={plan?.title ?? 'Séance home trainer'}
        saving={recorder.saving}
        onSave={(title, rpe, comment) => { void doSave(title, rpe, comment) }} />
    )
  } else if (showResult) {
    body = (
      <RampTestResult
        mode={resolvedRamp ? 'ramp' : 'cp20'}
        ramp={resolvedRamp}
        cp20AvgWatts={cp20Avg}
        massKg={massKg}
        onDone={onFinished} />
    )
  } else if (!started) {
    body = (
      <StartGate ftp={ftp} fcMax={fcMax} plan={plan} loading={!ready || planLoading}
        available={sensors.available} status={sensors.status}
        onConnect={sensors.connect} onStart={onStart} onExit={onExit} />
    )
  } else {
    body = (
      <>
        {isDesktop
          ? <RideDesktop v={view} d={d} status={sensors.status} onTogglePause={engine.pause} onFinish={onFinish} onStopTest={onStopTest} />
          : <RideMobile v={view} d={d} status={sensors.status} soloProfile={!!plan && sensors.status.trainer !== 'connected'} onTogglePause={engine.pause} onFinish={onFinish} onStopTest={onStopTest} />}
        {paused && <RidePause onResume={engine.start} onFinish={onFinish} />}
      </>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{body}</div>,
    document.body,
  )
}
