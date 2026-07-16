'use client'
// Orchestrateur de la séance home trainer. Branche profil (FTP), séance
// planifiée, capteurs, moteur, enregistrement. Rendu en portail plein écran.
// Aucune valeur athlète en dur : le FTP vient de athlete_performance_profile ;
// sans FTP, StartGate bloque le démarrage.
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

interface Props { onExit: () => void; onFinished: () => void }

function useIsDesktop(): boolean {
  const [desk, setDesk] = useState(false)
  useEffect(() => {
    const sync = () => setDesk(window.innerWidth >= 1024)
    sync(); window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  return desk
}

export default function RideScreen({ onExit, onFinished }: Props) {
  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState(false)
  const [startedAt, setStartedAt] = useState('')
  useEffect(() => { setMounted(true) }, [])

  const { benchmarks, ready, compute } = useSmSn()
  const ftp = benchmarks.ftp
  const fcMax = benchmarks.hrMax
  const { plan, loading: planLoading } = useRidePlan(ftp, ready)
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

  const onFinish = useCallback(async () => {
    engine.pause()
    if (ftp == null) { onFinished(); return }
    await recorder.save({
      samples: engine.samples.current, metrics: engine.metrics, ftp,
      startedAt: startedAt || new Date().toISOString(), elapsedS: engine.t,
      title: plan?.title ?? 'Séance home trainer', compute,
    })
    onFinished()
  }, [engine, ftp, recorder, startedAt, plan, compute, onFinished])

  const view: RideView = useMemo(() => ({
    ftp: ftp ?? 0, fcMax: fcMax ?? 200, plan, t: engine.t,
    metrics: engine.metrics, current: engine.current, samples: engine.samples.current,
  }), [ftp, fcMax, plan, engine.t, engine.metrics, engine.current, engine.samples])
  const d = useMemo(() => derive(view), [view])

  if (!mounted) return null

  let body: React.ReactNode
  if (!started) {
    body = (
      <StartGate ftp={ftp} fcMax={fcMax} plan={plan} loading={!ready || planLoading}
        available={sensors.available} status={sensors.status}
        onConnect={sensors.connect} onStart={onStart} onExit={onExit} />
    )
  } else {
    body = (
      <>
        {isDesktop
          ? <RideDesktop v={view} d={d} status={sensors.status} onTogglePause={engine.pause} onFinish={onFinish} />
          : <RideMobile v={view} d={d} status={sensors.status} onTogglePause={engine.pause} onFinish={onFinish} />}
        {paused && <RidePause onResume={engine.start} onFinish={onFinish} />}
      </>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{body}</div>,
    document.body,
  )
}
