'use client'
// ════════════════════════════════════════════════════════════════════
// LiveShell — orchestrateur de l'écran live vélo v2 (PROMPT_LIVE_VELO).
// Header (croix / titre + point REC / engrenage), carrousel horizontal 3 pages
// en scroll-snap (Données · Carte · Laps), pagination, zone contrôles,
// verrouillage, auto-pause, laps (bouton + auto-lap + appui long opt-in),
// sheet de sortie, résumé + envoi avec jauge réelle + backup local.
// Machine à états pure + timer par timestamps : voir liveMachine.ts.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import './tokens.css'
import type { GPSState } from '@/hooks/useGPSTracking'
import { GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import type { CyclingSettings } from '@/hooks/useCyclingSettings'
import type { NavRouteInput } from '../RouteNavScreen'
import type { SessionLap } from '@/types/session'
import { primeLapBeep, playLapBeep, setLapBeepSoundEnabled } from '../lapBeep'
import PhotoButton, { type PhotoButtonHandle } from '../PhotoButton'
import PhotoPreviewToast from '../PhotoPreviewToast'
import {
  LIVE_INIT, liveReducer, isStarted, isTimerRunning, effectivePhase,
  TIMER_INIT, timerStart, timerPause, timerResume, timerElapsedSec,
  smoothWindow, formatHMS, frNum, type TimedSample, type LiveTimer,
} from './liveMachine'
import DataPage from './DataPage'
import LapsPage from './LapsPage'
import ExitSheet from './ExitSheet'
import SummaryScreen from './SummaryScreen'
import {
  useLocalBackup, loadLiveBackup, saveLiveBackup, clearLiveBackup,
  type LiveSnapshot, type LiveBackup,
} from './useLocalBackup'

const MapPage = dynamic(() => import('./MapPage'), { ssr: false })

const HOLD_LAP_MS = 2000
const RING_CIRC = 2 * Math.PI * 58 // anneau 132⌀, r 58

export interface LiveShellProps {
  sportTitle: string
  gps: GPSState
  resetTracking: () => void
  settings: CyclingSettings
  route: NavRouteInput | null
  isDark: boolean
  onExit: () => void
  onFinished: () => void
  onOpenSettings: () => void
}

export default function LiveShell({
  sportTitle, gps, resetTracking, settings, route, isDark, onExit, onFinished, onOpenSettings,
}: LiveShellProps) {
  const [machine, send] = useReducer(liveReducer, LIVE_INIT)
  const [timer, setTimer] = useState<LiveTimer>(TIMER_INIT)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [pageIndex, setPageIndex] = useState(0)
  const [laps, setLaps] = useState<SessionLap[]>([])
  const [lapStart, setLapStart] = useState({ sec: 0, dist: 0 })
  const [summarySnap, setSummarySnap] = useState<LiveSnapshot | null>(null)
  const [pendingBackup, setPendingBackup] = useState<LiveBackup | null>(null)
  const [flash, setFlash] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [hold, setHold] = useState<{ active: boolean; progress: number }>({ active: false, progress: 0 })
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  // Clé de remontage du PhotoButton : vide sa file de photos en attente au reset.
  const [photoKey, setPhotoKey] = useState(0)

  const pagesRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<PhotoButtonHandle>(null)
  const bigLockRef = useRef<HTMLButtonElement>(null)
  const lastLockTap = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedSamples = useRef<TimedSample[]>([])

  const started = isStarted(machine)
  const locked = machine.phase === 'locked'
  const running = isTimerRunning(machine)
  const eff = effectivePhase(machine)
  const autoPausedNow = eff === 'autopaused'
  const pausedLike = eff === 'paused' || eff === 'autopaused'
  const dim = started && pausedLike
  const inSummaryFlow = machine.phase === 'summary' || machine.phase === 'uploading' || machine.phase === 'uploaded'

  const durationSec = timerElapsedSec(timer, nowMs)
  const lapSec = Math.max(0, durationSec - lapStart.sec)
  const lapDistM = Math.max(0, gps.distance - lapStart.dist)
  const avgSpeedKmh = durationSec > 0 ? (gps.distance / 1000) / (durationSec / 3600) : 0

  // ── Toast (capsule sous header, auto-dismiss 2,6 s — jamais alert()) ──
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (flashTimer.current) clearTimeout(flashTimer.current)
  }, [])

  // ── Réglages alertes : son (lapBeep) + vibration ──
  useEffect(() => {
    setLapBeepSoundEnabled(settings.alerts.sound)
    return () => setLapBeepSoundEnabled(true)
  }, [settings.alerts.sound])
  const vibrate = useCallback((pattern: number | number[]) => {
    if (!settings.alerts.vibration) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* non supporté */ }
    }
  }, [settings.alerts.vibration])

  // ── Wake lock pendant la séance (réglage display.keepAwake) ──
  useWakeLock(started && settings.display.keepAwake)

  // ── Timer par timestamps : synchronisé sur l'état effectif de la machine ──
  useEffect(() => {
    const now = Date.now()
    setTimer(t => {
      if (running) return t.startedAt == null ? timerStart(now) : timerResume(t, now)
      return timerPause(t, now)
    })
  }, [running])

  // Tick d'affichage : la durée est RECALCULÉE depuis Date.now() à chaque tick
  // ET sur visibilitychange — jamais incrémentée.
  useEffect(() => {
    if (!started) return
    const iv = setInterval(() => setNowMs(Date.now()), 500)
    const onVis = () => setNowMs(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [started])

  // ── Lissage 3 s de la vitesse (héro) ──
  useEffect(() => {
    const t = Date.now()
    speedSamples.current.push({ t, v: gps.currentSpeed ?? 0 })
    while (speedSamples.current.length > 0 && t - speedSamples.current[0].t > 6000) {
      speedSamples.current.shift()
    }
  }, [gps.currentSpeed])
  const smoothedSpeed = smoothWindow(speedSamples.current, nowMs, 3000)

  // ── Auto-pause : réutilise la détection existante (vitesse < seuil) ──
  useEffect(() => {
    if (!settings.recording.autoPause) return
    const below = (gps.currentSpeed ?? 0) < settings.recording.autoPauseThreshold
    if (machine.phase === 'recording' && below) send({ type: 'AUTO_PAUSE' })
    else if (machine.phase === 'autopaused' && !below) send({ type: 'AUTO_RESUME' })
    else if (machine.phase === 'locked') {
      if (machine.lockedFrom === 'recording' && below) send({ type: 'AUTO_PAUSE' })
      else if (machine.lockedFrom === 'autopaused' && !below) send({ type: 'AUTO_RESUME' })
    }
  }, [gps.currentSpeed, machine.phase, machine.lockedFrom, settings.recording.autoPause, settings.recording.autoPauseThreshold])

  // ── Feedback lap : bip + vibration + flash 300 ms ──
  const doFlash = useCallback(() => {
    setFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(false), 300)
  }, [])

  const doLap = useCallback(() => {
    if (lapSec <= 0) return
    playLapBeep()
    vibrate(200)
    doFlash()
    setLaps(prev => [...prev, {
      number: prev.length + 1,
      duration: lapSec,
      distance: lapDistM,
      avgSpeed: lapDistM > 0 && lapSec > 0 ? (lapDistM / lapSec) * 3.6 : 0,
      timestamp: Date.now(),
    }])
    setLapStart({ sec: durationSec, dist: gps.distance })
  }, [lapSec, lapDistM, durationSec, gps.distance, vibrate, doFlash])
  const doLapRef = useRef(doLap)
  doLapRef.current = doLap

  // Auto-lap (recording.autoLap, km) — même feedback que le lap manuel.
  useEffect(() => {
    const km = settings.recording.autoLap
    if (eff !== 'recording' || km <= 0) return
    if (lapDistM >= km * 1000) doLapRef.current()
  }, [lapDistM, settings.recording.autoLap, eff])

  // ── Rappels hydratation / nutrition (minutes de chrono) ──
  const lastHydrationRef = useRef(0)
  const lastNutritionRef = useRef(0)
  const notify = useCallback((msg: string) => {
    showToast(msg)
    playLapBeep()
    vibrate([120, 80, 120])
  }, [showToast, vibrate])
  useEffect(() => {
    if (eff !== 'recording') return
    const hyd = settings.alerts.hydrationInterval
    const nut = settings.alerts.nutritionInterval
    if (hyd > 0) {
      const n = Math.floor(durationSec / (hyd * 60))
      if (n > lastHydrationRef.current) { lastHydrationRef.current = n; notify('Pensez à vous hydrater') }
    }
    if (nut > 0) {
      const n = Math.floor(durationSec / (nut * 60))
      if (n > lastNutritionRef.current) { lastNutritionRef.current = n; notify('Pensez à vous alimenter') }
    }
  }, [durationSec, eff, settings.alerts.hydrationInterval, settings.alerts.nutritionInterval, notify])

  // ── Alerte perte de signal GPS (transition ok → perdu) ──
  const gpsWasOkRef = useRef(true)
  useEffect(() => {
    if (eff !== 'recording' || !settings.alerts.gpsLost) return
    const lost = gps.status === GPSStatus.poor || gps.status === GPSStatus.error || gps.status === GPSStatus.unavailable
    if (lost && gpsWasOkRef.current) { gpsWasOkRef.current = false; notify('Signal GPS perdu') }
    if (!lost) gpsWasOkRef.current = true
  }, [gps.status, eff, settings.alerts.gpsLost, notify])

  // ── Snapshot + backup local (10 s pendant l'enregistrement + à l'arrêt) ──
  const buildSnapshot = useCallback((): LiveSnapshot | null => {
    if (timer.startedAt == null) return null
    const now = Date.now()
    const dur = timerElapsedSec(timer, now)
    const distM = Math.round(gps.distance)
    return {
      sport: 'cycling',
      startedAtISO: new Date(timer.startedAt).toISOString(),
      endedAtISO: new Date(now).toISOString(),
      durationSec: dur,
      distM,
      elevM: Math.round(gps.elevationGain),
      avgSpeedKmh: distM > 0 && dur > 0 ? parseFloat(((distM / 1000) / (dur / 3600)).toFixed(1)) : 0,
      maxSpeedKmh: parseFloat(gps.maxSpeed.toFixed(1)),
      calories: Math.round((dur / 3600) * 600),
      gpsPts: [...gps.points],
      laps: [...laps],
    }
  }, [timer, gps.distance, gps.elevationGain, gps.maxSpeed, gps.points, laps])
  useLocalBackup(started, buildSnapshot)

  // Backup non envoyé au montage → proposer la reprise d'envoi.
  useEffect(() => { setPendingBackup(loadLiveBackup()) }, [])

  // ── Blocage du retour navigateur pendant résumé / envoi (spec §7) ──
  // Sentinelle pushState au montage du flux ; popstate → re-push + toast.
  // Nettoyage au démontage : listener retiré, sentinelle dépilée si encore là
  // (après router.push vers Training, l'état d'historique n'est plus le nôtre).
  useEffect(() => {
    if (!inSummaryFlow || typeof window === 'undefined') return
    const pushSentinel = () => {
      try {
        window.history.pushState({ ...(window.history.state ?? {}), __lv2Block: true }, '', window.location.href)
      } catch { /* historique indisponible */ }
    }
    const onPop = () => {
      pushSentinel()
      showToast('Termine ou supprime l’activité d’abord')
    }
    pushSentinel()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      try {
        const st = window.history.state as { __lv2Block?: boolean } | null
        if (st?.__lv2Block) window.history.back()
      } catch { /* ignore */ }
    }
  }, [inSummaryFlow, showToast])

  // ── Reset complet (suppression / retour idle) ──
  const resetAll = useCallback(() => {
    setTimer(TIMER_INIT)
    setLaps([])
    setLapStart({ sec: 0, dist: 0 })
    setSummarySnap(null)
    speedSamples.current = []
    lastHydrationRef.current = 0
    lastNutritionRef.current = 0
    gpsWasOkRef.current = true
    setPhotoPreviewUrl(null)
    setPhotoKey(k => k + 1) // vide les photos en attente
    resetTracking()
  }, [resetTracking])

  // ── Navigation entre pages ──
  const goPage = useCallback((i: number) => {
    const el = pagesRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])
  const onPagesScroll = useCallback(() => {
    const el = pagesRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setPageIndex(prev => (prev === i ? prev : Math.max(0, Math.min(2, i))))
  }, [])

  // ── Actions principales ──
  const canStart = gps.status === GPSStatus.good || gps.status === GPSStatus.approximate
  const handleStart = () => {
    if (!canStart) return
    primeLapBeep() // l'AudioContext doit naître sur un geste utilisateur (iOS)
    resetAll()
    setPendingBackup(null)
    send({ type: 'START' })
  }
  const handlePauseToggle = () => {
    if (eff === 'recording') send({ type: 'PAUSE' })
    else send({ type: 'RESUME' })
  }
  const handleMiniPause = () => {
    handlePauseToggle()
    goPage(0)
  }
  const handleClose = () => {
    if (machine.phase === 'idle') { onExit(); return }
    if (inSummaryFlow) { showToast('Enregistre ou supprime la séance d’abord'); return }
    send({ type: 'REQUEST_STOP' })
  }
  const handleFinish = () => {
    const snap = buildSnapshot()
    if (!snap) return
    saveLiveBackup(snap)
    setSummarySnap(snap)
    send({ type: 'FINISH' })
  }
  const handleDeleteRecording = () => {
    clearLiveBackup()
    send({ type: 'DISCARD' })
    resetAll()
    setPendingBackup(null)
    showToast('Activité supprimée')
  }
  const handleDiscardSummary = () => {
    clearLiveBackup()
    send({ type: 'DISCARD' })
    resetAll()
    setPendingBackup(null)
    showToast('Activité supprimée')
  }
  const handleRestoreBackup = () => {
    if (!pendingBackup) return
    setSummarySnap(pendingBackup.snap)
    setPendingBackup(null)
    send({ type: 'RESTORE_SUMMARY' })
  }

  // ── Verrouillage : double tap (400 ms) déverrouille, tap simple pulse ──
  const handleBigLockTap = () => {
    const now = Date.now()
    if (now - lastLockTap.current < 400) {
      send({ type: 'UNLOCK' })
    } else {
      const el = bigLockRef.current
      if (el) {
        el.classList.remove('lv2-lock-pulse')
        void el.offsetWidth
        el.classList.add('lv2-lock-pulse')
      }
    }
    lastLockTap.current = now
  }

  // ── Lap par appui long 2 s (OPT-IN, désactivé par défaut) ──
  const holdRaf = useRef(0)
  const holdActiveRef = useRef(false)
  const endHold = useCallback((completed: boolean) => {
    if (!holdActiveRef.current) return
    holdActiveRef.current = false
    cancelAnimationFrame(holdRaf.current)
    setHold({ active: false, progress: 0 })
    if (completed) doLapRef.current()
  }, [])
  const handlePagesPointerDown = (e: React.PointerEvent) => {
    if (!settings.recording.longPressLap) return
    if (locked || eff !== 'recording') return // le verrouillage prime
    const target = e.target as HTMLElement
    if (target.closest('button, a, [role="button"], .leaflet-container')) return
    holdActiveRef.current = true
    const startAt = performance.now()
    const step = () => {
      if (!holdActiveRef.current) return
      const p = Math.min((performance.now() - startAt) / HOLD_LAP_MS, 1)
      setHold({ active: true, progress: p })
      if (p >= 1) { endHold(true); return }
      holdRaf.current = requestAnimationFrame(step)
    }
    holdRaf.current = requestAnimationFrame(step)
  }
  useEffect(() => {
    const cancel = () => endHold(false)
    document.addEventListener('pointerup', cancel)
    document.addEventListener('pointercancel', cancel)
    return () => {
      document.removeEventListener('pointerup', cancel)
      document.removeEventListener('pointercancel', cancel)
      cancelAnimationFrame(holdRaf.current)
    }
  }, [endHold])

  // ── Permutation Pause/Lap (réglage) ──
  const swap = settings.recording.swapPauseLap
  const showPlayIcon = pausedLike

  // ── GPS line (avant démarrage) ──
  const acc = gps.accuracy != null ? Math.max(1, Math.round(gps.accuracy)) : null
  const gpsLine = gps.status === GPSStatus.good
    ? { color: 'var(--live-success)', text: `Bon signal (±${acc ?? 2} m)` }
    : gps.status === GPSStatus.approximate
      ? { color: 'var(--live-warn)', text: `Signal moyen (±${acc ?? 12} m)` }
      : { color: 'var(--live-danger)', text: 'Recherche GPS…' }

  const onMapPage = pageIndex === 1
  const controlsHidden = started && onMapPage
  const dotsBottom = controlsHidden ? 34 : 168
  const currentPos = gps.currentLat != null && gps.currentLng != null
    ? { lat: gps.currentLat, lng: gps.currentLng }
    : null

  const pauseIcon = (
    <svg width="22" height="26" viewBox="0 0 22 26">
      <rect width="7" height="26" rx="3" fill="var(--live-accent-on)" />
      <rect x="15" width="7" height="26" rx="3" fill="var(--live-accent-on)" />
    </svg>
  )
  const playIcon = (
    <svg width="26" height="30" viewBox="0 0 26 30">
      <path d="M3 3 L23 15 L3 27 Z" fill="var(--live-accent-on)" stroke="var(--live-accent-on)" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  )
  const lockOpenIcon = (
    <svg width="19" height="20" viewBox="0 0 19 20">
      <rect x="2.5" y="8.5" width="14" height="10" rx="3" fill="currentColor" />
      <path d="M5.5 8.5 V5.5 a4 4 0 0 1 8 0 V7" stroke="currentColor" strokeWidth="2.3" fill="none" />
    </svg>
  )
  const lockClosedIcon = (
    <svg width="20" height="21" viewBox="0 0 19 20">
      <rect x="2.5" y="8.5" width="14" height="10" rx="3" fill="currentColor" />
      <path d="M5.5 8.5 V5.5 a4 4 0 0 1 8 0 V8.5" stroke="currentColor" strokeWidth="2.3" fill="none" />
    </svg>
  )

  const sideBtnStyle: React.CSSProperties = {
    width: 52, height: 52, borderRadius: '50%',
    background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
    color: 'var(--live-text-2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const centerIsPause = !swap
  const centerBtn = (
    <button
      onClick={centerIsPause ? handlePauseToggle : doLap}
      aria-label={centerIsPause ? (showPlayIcon ? 'Reprendre' : 'Pause') : 'Lap'}
      className="lv2-press"
      style={{
        width: 84, height: 84, borderRadius: '50%',
        background: 'var(--live-accent)', border: 'none', cursor: 'pointer',
        boxShadow: 'var(--live-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {centerIsPause
        ? (showPlayIcon ? playIcon : pauseIcon)
        : <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--live-accent-on)' }}>LAP</span>}
    </button>
  )
  const rightBtn = (
    <button
      onClick={swap ? handlePauseToggle : doLap}
      aria-label={swap ? (showPlayIcon ? 'Reprendre' : 'Pause') : 'Lap'}
      className="lv2-press"
      style={{ ...sideBtnStyle, color: 'var(--live-text)' }}
    >
      {swap
        ? (
          <svg width="16" height="18" viewBox="0 0 14 16">
            {showPlayIcon
              ? <path d="M2 1.5 L12.5 8 L2 14.5 Z" fill="currentColor" />
              : <><rect width="4.5" height="16" rx="2" fill="currentColor" /><rect x="9.5" width="4.5" height="16" rx="2" fill="currentColor" /></>}
          </svg>
        )
        : <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em' }}>LAP</span>}
    </button>
  )

  return (
    <div data-live-shell="" data-live-theme={isDark ? undefined : 'light'}>

      {/* ── Carrousel 3 pages ── */}
      <div
        ref={pagesRef}
        className={locked ? 'lv2-pages lv2-locked' : 'lv2-pages'}
        onScroll={onPagesScroll}
        onPointerDown={handlePagesPointerDown}
      >
        <section className="lv2-page">
          <DataPage
            started={started}
            dim={dim}
            durationSec={durationSec}
            distanceM={gps.distance}
            speedKmh={smoothedSpeed}
            avgSpeedKmh={avgSpeedKmh}
            elevGainM={gps.elevationGain}
            heartRate={null}
            cadence={null}
            powerW={null}
            avgPowerW={null}
            npW={null}
            heroSource="speed"
            gpsStatus={gps.status}
            gpsAccuracy={gps.accuracy}
            dataSize={settings.display.dataSize}
            units={settings.units}
            onSensorChipTap={() => showToast('Appairage capteurs — bientôt disponible')}
          />
        </section>
        <section className="lv2-page">
          <MapPage
            started={started}
            locked={locked}
            dim={dim}
            speedKmh={smoothedSpeed}
            powerW={null}
            heartRateBpm={null}
            distanceDoneM={gps.distance}
            gainDoneM={gps.elevationGain}
            elapsedSec={durationSec}
            points={gps.points}
            currentPos={currentPos}
            route={route}
            defaultLayer={settings.navigation.defaultMapType}
            units={settings.units}
            onPrevPage={() => goPage(0)}
            onNextPage={() => goPage(2)}
            onMiniPause={handleMiniPause}
          />
        </section>
        <section className="lv2-page">
          <LapsPage
            started={started}
            dim={dim}
            lapNumber={laps.length + 1}
            lapSec={lapSec}
            totalSec={durationSec}
            distanceM={gps.distance}
            altitudeM={gps.currentAltitude}
            laps={laps}
            dataSize={settings.display.dataSize}
            units={settings.units}
          />
        </section>
      </div>

      {/* ── Header ── */}
      <div style={{
        position: 'absolute', top: 'env(safe-area-inset-top)', left: 0, right: 0, height: 60, zIndex: 55,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px',
        pointerEvents: 'none',
      }}>
        <button
          onClick={handleClose}
          aria-label="Fermer"
          className="lv2-press"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: onMapPage ? '1px solid var(--live-hairline-2)' : 'none',
            background: onMapPage ? 'var(--live-btn-map)' : 'var(--live-surface-2)',
            color: 'var(--live-text)', cursor: 'pointer', flex: 'none', pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {!onMapPage && (
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 600,
          }}>
            {started && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: 'var(--live-danger)',
                boxShadow: '0 0 0 3px var(--live-danger-halo)',
              }} />
            )}
            {sportTitle}
          </div>
        )}
        {/* Engrenage — masqué sur la page carte */}
        {!onMapPage ? (
          <button
            onClick={onOpenSettings}
            aria-label="Réglages"
            className="lv2-press"
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: 'var(--live-surface-2)', color: 'var(--live-text)',
              cursor: 'pointer', flex: 'none', pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 20 20">
              <path d="M10 6.5 a3.5 3.5 0 1 0 0 7 a3.5 3.5 0 1 0 0 -7 M10 1 v2.4 M10 16.6 V19 M1 10 h2.4 M16.6 10 H19 M3.6 3.6 l1.7 1.7 M14.7 14.7 l1.7 1.7 M16.4 3.6 l-1.7 1.7 M5.3 14.7 l-1.7 1.7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        ) : <span style={{ width: 36 }} />}
      </div>

      {/* ── Badge auto-pause (pill 140×30 orange, aucun clignotement) ── */}
      {autoPausedNow && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 122px)', left: '50%', transform: 'translateX(-50%)',
          width: 140, height: 30, borderRadius: 15, zIndex: 56,
          background: 'var(--live-warn-bg)', border: '1px solid var(--live-warn-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 12.5, fontWeight: 700, color: 'var(--live-warn)',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live-warn)' }} />
          En pause auto
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 126px)', left: '50%', transform: 'translateX(-50%)',
          height: 36, padding: '0 18px', borderRadius: 18, zIndex: 90,
          background: 'var(--live-toast-bg)', border: '1px solid var(--live-hairline-2)',
          display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          fontSize: 13, fontWeight: 600, color: 'var(--live-text)', pointerEvents: 'none',
          animation: 'lv2ToastIn 0.25s ease-out',
        }}>
          {toast}
        </div>
      )}

      {/* ── Reprise d'envoi d'un backup local non envoyé ── */}
      {machine.phase === 'idle' && pendingBackup && (
        <div style={{
          position: 'absolute', left: 16, right: 16,
          bottom: 'calc(env(safe-area-inset-bottom) + 172px)', zIndex: 58,
          background: 'var(--live-float)', border: '1px solid var(--live-hairline-2)',
          borderRadius: 18, padding: '12px 14px',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Séance non envoyée</div>
            <div className="lv2-num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--live-text-2)', marginTop: 2 }}>
              {formatHMS(pendingBackup.snap.durationSec, true)} · {frNum(pendingBackup.snap.distM / 1000, 1)} km
            </div>
          </div>
          <button
            onClick={handleRestoreBackup}
            className="lv2-press"
            style={{
              height: 36, padding: '0 16px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: 'var(--live-accent)', color: 'var(--live-accent-on)', fontSize: 13, fontWeight: 800,
            }}
          >
            Reprendre l’envoi
          </button>
          <button
            onClick={() => { clearLiveBackup(); setPendingBackup(null) }}
            aria-label="Ignorer"
            className="lv2-press"
            style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--live-surface-2)', color: 'var(--live-text-2)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 14 14">
              <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Pagination : 3 points, actif 7⌀ cyan ── */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        bottom: `calc(env(safe-area-inset-bottom) + ${dotsBottom}px)`,
        display: 'flex', gap: 11, zIndex: 54, transition: 'bottom 0.2s',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: i === pageIndex ? 7 : 6, height: i === pageIndex ? 7 : 6,
            borderRadius: '50%', transition: 'all 0.2s',
            background: i === pageIndex ? 'var(--live-accent)' : 'var(--live-dim)',
          }} />
        ))}
      </div>

      {/* ── Zone contrôles ── */}
      {!controlsHidden && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 'calc(env(safe-area-inset-bottom) + 158px)', zIndex: 54,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {machine.phase === 'idle' && (
            <>
              {/* Ligne GPS */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                fontSize: 13, fontWeight: 500, color: 'var(--live-text-2)',
              }}>
                <span className="lv2-num" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: gpsLine.color }} />
                  {gpsLine.text}
                </span>
              </div>
              {/* Démarrer 88⌀ + glow 3 anneaux */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                aria-label="Démarrer"
                className="lv2-press"
                style={{
                  position: 'absolute', left: '50%', top: 26, transform: 'translateX(-50%)',
                  width: 88, height: 88, borderRadius: '50%',
                  background: 'var(--live-accent)', border: 'none',
                  cursor: canStart ? 'pointer' : 'not-allowed',
                  boxShadow: canStart ? 'var(--live-glow)' : 'none',
                  opacity: canStart ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="30" height="34" viewBox="0 0 30 34">
                  <path d="M4 3 L27 17 L4 31 Z" fill="var(--live-accent-on)" stroke="var(--live-accent-on)" strokeWidth="4" strokeLinejoin="round" />
                </svg>
              </button>
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 124, textAlign: 'center',
                fontSize: 13, fontWeight: 800, letterSpacing: '0.19em',
                color: canStart ? 'var(--live-accent)' : 'var(--live-label)',
              }}>
                DÉMARRER
              </div>
            </>
          )}

          {started && !locked && (
            <div style={{
              position: 'absolute', top: 42, left: 0, right: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 44,
            }}>
              <button onClick={() => send({ type: 'LOCK' })} aria-label="Verrouiller" className="lv2-press" style={sideBtnStyle}>
                {lockOpenIcon}
              </button>
              <div style={{ marginTop: -16 }}>{centerBtn}</div>
              {rightBtn}
            </div>
          )}

          {locked && (
            <>
              <div style={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', fontSize: 12.5, color: 'var(--live-label)' }}>
                Double tap pour déverrouiller
              </div>
              <button
                ref={bigLockRef}
                onClick={handleBigLockTap}
                aria-label="Déverrouiller"
                style={{
                  position: 'absolute', left: '50%', top: 38, transform: 'translateX(-50%)',
                  width: 56, height: 56, borderRadius: '50%', cursor: 'pointer',
                  background: 'var(--live-accent-dim)', border: '1.5px solid var(--live-accent)',
                  color: 'var(--live-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {lockClosedIcon}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Overlay lap appui long (anneau de progression 132⌀) ── */}
      {hold.active && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 72, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--live-veil)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', width: 132, height: 132 }}>
            <svg width="132" height="132" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="66" cy="66" r="58" stroke="var(--live-hold-track)" strokeWidth="6" fill="none" />
              <circle
                cx="66" cy="66" r="58"
                stroke="var(--live-accent)" strokeWidth="6" fill="none" strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC * (1 - hold.progress)}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 21, fontWeight: 800, letterSpacing: '0.13em', color: 'var(--live-text)',
            }}>
              LAP
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(40% + 92px)', textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: 'var(--live-text-2)' }}>
            Maintenez 2 s pour marquer un lap
          </div>
        </div>
      )}

      {/* ── Flash lap : contour écran 300 ms ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none',
        border: '3px solid var(--live-flash)',
        opacity: flash ? 1 : 0, transition: 'opacity 0.12s',
      }} />

      {/* ── Bouton photo — discret sur la page carte, au-dessus du mini-pause.
             Monté en permanence (display) : la file de photos en attente doit
             survivre aux changements de page jusqu'au flush post-envoi. ── */}
      <div
        className="lv2-photo"
        style={{
          position: 'absolute', right: 18, bottom: 250, zIndex: 5,
          display: started && onMapPage && !locked ? 'block' : 'none',
        }}
      >
        <PhotoButton
          key={photoKey}
          ref={photoRef}
          onPreview={setPhotoPreviewUrl}
          currentLat={gps.currentLat ?? undefined}
          currentLng={gps.currentLng ?? undefined}
        />
      </div>
      {photoPreviewUrl && <PhotoPreviewToast url={photoPreviewUrl} onDismiss={() => setPhotoPreviewUrl(null)} />}

      {/* ── Sheet de sortie ── */}
      <ExitSheet
        open={machine.phase === 'stopping'}
        durationSec={durationSec}
        distanceM={gps.distance}
        onResume={() => send({ type: 'CANCEL_STOP' })}
        onFinish={handleFinish}
        onDelete={handleDeleteRecording}
      />

      {/* ── Résumé → envoi → confirmation ── */}
      {inSummaryFlow && summarySnap && (
        <SummaryScreen
          snap={summarySnap}
          units={settings.units}
          onUploadStart={() => send({ type: 'UPLOAD' })}
          onUploadDone={() => send({ type: 'UPLOAD_DONE' })}
          onUploadFail={() => send({ type: 'UPLOAD_FAIL' })}
          onDiscard={handleDiscardSummary}
          flushPhotos={async sessionId => {
            await photoRef.current?.flushToSession(sessionId, gps.currentLat ?? undefined, gps.currentLng ?? undefined)
          }}
          onFinished={onFinished}
        />
      )}
    </div>
  )
}
