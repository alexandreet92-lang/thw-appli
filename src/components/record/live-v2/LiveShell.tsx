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
import { useI18n } from '@/lib/i18n'
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
  rkScope, RkFab, RkIco, RK_ICON, RkStatusPill, RK_DOT, RkPageDots, RkControlDock, RkControlRow,
  RkBigButton, RkPausePills, RkUnlock, RkStartButton, RkBanner, RkBannerSlot, RkCta, PauseGlyph, PlayGlyph,
} from '../kit/RecordKit'
import {
  LIVE_INIT, liveReducer, isStarted, isTimerRunning, effectivePhase,
  TIMER_INIT, timerStart, timerPause, timerResume, timerElapsedSec,
  smoothWindow, formatHMS, frNum, type TimedSample, type LiveTimer,
} from './liveMachine'
import ConfigDataPage from './ConfigDataPage'
import { subscribeSensors, getSensorState, type SensorState } from '@/lib/sensors/bluetooth'
import { currentLiveShareId, pushPosition, stopLiveShare } from '@/lib/community/liveShare'
import type { DataPage } from '@/types/cycling'
import { DEFAULT_PAGES } from '@/types/cycling'
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
  restoreTracking: (seed: { points: GPSState['points']; distance: number; elevationGain: number; maxSpeed: number }) => void
  settings: CyclingSettings
  /** Config des pages de données (réglages) — pilote le carrousel live. */
  pages: DataPage[]
  route: NavRouteInput | null
  isDark: boolean
  onExit: () => void
  onFinished: () => void
  onOpenSettings: () => void
}

export default function LiveShell({
  sportTitle, gps, resetTracking, restoreTracking, settings, pages, route, isDark, onExit, onFinished, onOpenSettings,
}: LiveShellProps) {
  const { t } = useI18n()
  const [machine, send] = useReducer(liveReducer, LIVE_INIT)
  const [timer, setTimer] = useState<LiveTimer>(TIMER_INIT)
  const [nowMs, setNowMs] = useState(() => Date.now())
  // Capteurs BLE (FC / puissance) : valeurs live du store partagé, affichées sur
  // le compteur dès qu'un capteur est connecté (Web Bluetooth Android/Chrome ;
  // iOS via build natif App Store — même store).
  const [sensors, setSensors] = useState<SensorState>(() => getSensorState())
  useEffect(() => subscribeSensors(() => setSensors(getSensorState())), [])
  const [pageIndex, setPageIndex] = useState(0)
  const [laps, setLaps] = useState<SessionLap[]>([])
  const [lapStart, setLapStart] = useState({ sec: 0, dist: 0 })
  const [summarySnap, setSummarySnap] = useState<LiveSnapshot | null>(null)
  const [pendingBackup, setPendingBackup] = useState<LiveBackup | null>(null)
  const [flash, setFlash] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [hold, setHold] = useState<{ active: boolean; progress: number }>({ active: false, progress: 0 })
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  // Vignettes des photos prises (affichées dans le résumé, envoyées après la séance).
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  // Clé de remontage du PhotoButton : vide sa file de photos en attente au reset.
  const [photoKey, setPhotoKey] = useState(0)

  const pagesRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<PhotoButtonHandle>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedSamples = useRef<TimedSample[]>([])
  // Vrai quand le résumé vient d'un arrêt de séance (reprenable) et non d'un
  // backup restauré au montage (rien à reprendre).
  const summaryFromLiveRef = useRef(false)

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
      if (n > lastHydrationRef.current) { lastHydrationRef.current = n; notify(t('w2c.hydrateReminder')) }
    }
    if (nut > 0) {
      const n = Math.floor(durationSec / (nut * 60))
      if (n > lastNutritionRef.current) { lastNutritionRef.current = n; notify(t('w2c.fuelReminder')) }
    }
  }, [durationSec, eff, settings.alerts.hydrationInterval, settings.alerts.nutritionInterval, notify])

  // ── Alerte perte de signal GPS (transition ok → perdu) ──
  const gpsWasOkRef = useRef(true)
  useEffect(() => {
    if (eff !== 'recording' || !settings.alerts.gpsLost) return
    const lost = gps.status === GPSStatus.poor || gps.status === GPSStatus.error || gps.status === GPSStatus.unavailable
    if (lost && gpsWasOkRef.current) { gpsWasOkRef.current = false; notify(t('w2c.gpsLost')) }
    if (!lost) gpsWasOkRef.current = true
  }, [gps.status, eff, settings.alerts.gpsLost, notify])

  // ── Partage de position en direct : durée + distance poussées toutes les
  // 10 s (la position seule part déjà via liveShare.ts). Sans partage actif :
  // rien. Le suivi public (/live/<id>) affiche ainsi les vraies stats. ──
  const liveShareRef = useRef({ dur: 0, dist: 0, lat: null as number | null, lng: null as number | null })
  liveShareRef.current = { dur: durationSec, dist: gps.distance, lat: gps.currentLat, lng: gps.currentLng }
  useEffect(() => {
    if (!started) return
    const push = () => {
      const id = currentLiveShareId()
      const c = liveShareRef.current
      if (!id || c.lat == null || c.lng == null) return
      void pushPosition(id, c.lat, c.lng, c.dur, c.dist)
    }
    push()
    const iv = setInterval(push, 10000)
    return () => clearInterval(iv)
  }, [started])

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

  // Sauvegarde IMMÉDIATE quand l'app passe en arrière-plan / se ferme : la
  // séance interrompue est toujours récupérable (pas d'attente du tick 10 s).
  useEffect(() => {
    if (!started) return
    const flush = () => { const s = buildSnapshot(); if (s) saveLiveBackup(s, true) }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush) }
  }, [started, buildSnapshot])

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
      showToast(t('w2c.finishOrDeleteFirst'))
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
    setPhotoUrls([])
    setPhotoKey(k => k + 1) // vide les photos en attente
    resetTracking()
  }, [resetTracking])

  // ── Navigation entre pages (par balayage horizontal) ──
  const pageCount = pages.length > 0 ? pages.length : DEFAULT_PAGES.length
  const onPagesScroll = useCallback(() => {
    const el = pagesRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setPageIndex(prev => (prev === i ? prev : Math.max(0, Math.min(pageCount - 1, i))))
  }, [pageCount])

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
  const handleClose = () => {
    if (machine.phase === 'idle') { onExit(); return }
    if (inSummaryFlow) { showToast(t('w2c.saveOrDeleteFirst')); return }
    send({ type: 'REQUEST_STOP' })
  }
  const handleFinish = () => {
    const snap = buildSnapshot()
    if (!snap) return
    summaryFromLiveRef.current = true
    saveLiveBackup(snap, false) // terminée : plus reprenable, à envoyer
    setSummarySnap(snap)
    send({ type: 'FINISH' })
  }
  // Drapeau (carte) : depuis la pause manuelle → fige la séance et ouvre le résumé.
  const handleFlagFinish = () => {
    if (machine.phase !== 'paused' && machine.phase !== 'autopaused') return
    send({ type: 'REQUEST_STOP' })
    const snap = buildSnapshot()
    if (!snap) return
    summaryFromLiveRef.current = true
    saveLiveBackup(snap, false)
    setSummarySnap(snap)
    send({ type: 'FINISH' })
  }
  // Reprise d'une séance interrompue (backup « live ») : on restaure le chrono
  // (figé en pause à la durée sauvegardée), les laps et l'état GPS, puis on
  // repasse en pause — l'utilisateur relance avec le bouton lecture.
  const handleResumeBackup = () => {
    if (!pendingBackup) return
    const s = pendingBackup.snap
    const now = Date.now()
    setTimer({ startedAt: now - s.durationSec * 1000, pausedAccum: 0, pauseStartedAt: now })
    setLaps(s.laps ?? [])
    setLapStart({ sec: s.durationSec, dist: s.distM })
    restoreTracking({ points: s.gpsPts ?? [], distance: s.distM, elevationGain: s.elevM, maxSpeed: s.maxSpeedKmh })
    setPendingBackup(null)
    send({ type: 'RESUME_BACKUP' })
  }
  const handleDeleteRecording = () => {
    clearLiveBackup()
    send({ type: 'DISCARD' })
    resetAll()
    setPendingBackup(null)
    showToast(t('w2c.activityDeleted'))
  }
  const handleDiscardSummary = () => {
    clearLiveBackup()
    send({ type: 'DISCARD' })
    resetAll()
    setPendingBackup(null)
    showToast(t('w2c.activityDeleted'))
  }
  const handleRestoreBackup = () => {
    if (!pendingBackup) return
    summaryFromLiveRef.current = false // backup restauré : rien à reprendre
    setSummarySnap(pendingBackup.snap)
    setPendingBackup(null)
    send({ type: 'RESTORE_SUMMARY' })
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

  // ── Ligne GPS (avant démarrage) ──
  const acc = gps.accuracy != null ? Math.max(1, Math.round(gps.accuracy)) : null
  const gpsLine = gps.status === GPSStatus.good
    ? { color: RK_DOT.ok, text: t('w2c.gpsGood', { acc: acc ?? 2 }) }
    : gps.status === GPSStatus.approximate
      ? { color: RK_DOT.warn, text: t('w2c.gpsMedium', { acc: acc ?? 12 }) }
      : { color: 'var(--danger)', text: t('w2c.gpsSearching') }

  // Garde-fou : au moins une page (repli sur les défauts si config vide).
  const livePages = pages.length > 0 ? pages : DEFAULT_PAGES
  const onMapPage = livePages[pageIndex]?.type === 'map'
  const hasRoute = (route?.snapped_points?.length ?? 0) > 1
  // Sur la carte avec un parcours, la feuille de données de MapPage porte les
  // commandes (Démarrer / verrou · pause · Lap / Reprendre · Terminer). Sans
  // parcours, ou écran verrouillé, le dock du shell reste visible.
  const mapOwnsControls = onMapPage && hasRoute && !locked
  const [mapSheetH, setMapSheetH] = useState(260)
  // Liste des virages ouverte sur la carte (grande feuille) → pagination masquée.
  const [mapOverlay, setMapOverlay] = useState(false)
  const dotsBottom = mapOwnsControls ? null : (machine.phase === 'idle' ? 222 : machine.phase === 'paused' ? 172 : 150)
  const currentPos = gps.currentLat != null && gps.currentLng != null
    ? { lat: gps.currentLat, lng: gps.currentLng }
    : null

  // ── Pilule d'état (en-tête) ──
  const statusPill = !started
    ? { dot: gpsLine.color, text: `${sportTitle} · ${t('rec.statusReady')}`, live: false }
    : eff === 'autopaused'
      ? { dot: RK_DOT.warn, text: `${sportTitle} · ${t('rec.statusAutoPaused')}`, live: false }
      : pausedLike
        ? { dot: RK_DOT.warn, text: `${sportTitle} · ${t('rec.statusPaused')}`, live: false }
        : { dot: RK_DOT.rec, text: `${sportTitle} · ${t('rec.statusRecording')}`, live: true }
  // Croix : au départ ou en pause (pas pendant l'effort, ni sur la carte).
  const showClose = !onMapPage && !locked && (machine.phase === 'idle' || pausedLike)

  const lapFab = (
    <RkFab label={t('w2c.lap')} onClick={doLap} size={56}>
      <span style={{ fontSize: 14, fontWeight: 800 }}>{t('w2c.lap')}</span>
    </RkFab>
  )
  const pauseCenter = (
    <RkBigButton label={showPlayIcon ? t('w2c.resume') : t('w2c.pause')} onClick={handlePauseToggle}>
      {showPlayIcon ? <PlayGlyph /> : <PauseGlyph />}
    </RkBigButton>
  )
  const lapCenter = (
    <RkBigButton label={t('w2c.lap')} onClick={doLap}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>{t('w2c.lap')}</span>
    </RkBigButton>
  )
  const pauseSide = (
    <RkFab label={showPlayIcon ? t('w2c.resume') : t('w2c.pause')} onClick={handlePauseToggle} size={56}>
      {showPlayIcon ? <PlayGlyph s={22} /> : <PauseGlyph s={22} />}
    </RkFab>
  )
  const dockKey = machine.phase === 'idle' ? 'idle'
    : locked ? 'locked'
    : machine.phase === 'paused' ? 'paused'
    : started ? 'rec' : 'none'

  return (
    <div data-live-shell="" data-live-theme={isDark ? undefined : 'light'} className={rkScope(isDark)}>

      {/* ── Carrousel PILOTÉ PAR LA CONFIG (réglages « Pages de données ») ──
          Chaque page : carte (MapPage) ou grille de champs (ConfigDataPage).
          Ajouter / réordonner / modifier une page dans les réglages se
          répercute directement ici. Défilement natif à élan (scroll-snap). ── */}
      <div
        ref={pagesRef}
        className={locked ? 'lv2-pages lv2-locked' : 'lv2-pages'}
        onScroll={onPagesScroll}
        onPointerDown={handlePagesPointerDown}
      >
        {livePages.map((page) => (
          <section className="lv2-page" key={page.id}>
            {page.type === 'map' ? (
              <MapPage
                started={started}
                locked={locked}
                dim={dim}
                speedKmh={smoothedSpeed}
                powerW={sensors.power}
                heartRateBpm={sensors.hr}
                distanceDoneM={gps.distance}
                gainDoneM={gps.elevationGain}
                elapsedSec={durationSec}
                points={gps.points}
                currentPos={currentPos}
                route={route}
                defaultLayer={settings.navigation.defaultMapType}
                units={settings.units}
                paused={pausedLike}
                showFlag={machine.phase === 'paused'}
                showPlayIcon={showPlayIcon}
                onCenter={handlePauseToggle}
                onLap={doLap}
                onFlag={handleFlagFinish}
                onStart={handleStart}
                canStart={canStart}
                onLock={() => send({ type: 'LOCK' })}
                swap={swap}
                onClose={!locked && (machine.phase === 'idle' || machine.phase === 'paused') ? handleClose : undefined}
                onBottomInset={setMapSheetH}
                onOverlayChange={setMapOverlay}
              />
            ) : (
              <ConfigDataPage
                page={page}
                ctx={{
                  started, dim,
                  durationSec, distanceM: gps.distance,
                  speedKmh: smoothedSpeed, avgSpeedKmh,
                  maxSpeedKmh: gps.maxSpeed, elevGainM: gps.elevationGain,
                  altitudeM: gps.currentAltitude, gradient: gps.gradient,
                  lapSec, lapDistM,
                  hr: sensors.hr, power: sensors.power,
                  units: settings.units,
                }}
                dataSize={settings.display.dataSize}
                gpsStatus={gps.status}
                gpsAccuracy={gps.accuracy}
                hrDevice={sensors.hrDevice}
                powerDevice={sensors.powerDevice}
                onSensorChipTap={() => showToast(t('w2c.sensorPairingSoon'))}
              />
            )}
          </section>
        ))}
      </div>

      {/* ── En-tête : × · pilule d'état · réglages (masqué sur la carte) ── */}
      {!onMapPage && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 7px)', left: 0, right: 0, zIndex: 55,
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', pointerEvents: 'none',
        }}>
          <div style={{ width: 44, pointerEvents: 'auto' }}>
            {showClose && (
              <RkFab label={t('w2c.close')} onClick={handleClose}>
                <RkIco d={RK_ICON.close} size={20} sw={2.2} />
              </RkFab>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <RkStatusPill dot={statusPill.dot} live={statusPill.live}>{statusPill.text}</RkStatusPill>
          </div>
          <div style={{ width: 44, pointerEvents: 'auto' }}>
            {!locked && (
              <RkFab label={t('w2c.settings')} onClick={onOpenSettings}>
                <RkIco d={RK_ICON.sliders} size={19} />
              </RkFab>
            )}
          </div>
        </div>
      )}

      {/* ── Bandeaux : auto-pause + toasts (pilules sous l'en-tête) ── */}
      <RkBannerSlot top={onMapPage ? 150 : 60}>
        {autoPausedNow && !onMapPage && <RkBanner dot={RK_DOT.warn}>{t('w2c.autoPaused')}</RkBanner>}
        {toast && <RkBanner key={toast}>{toast}</RkBanner>}
      </RkBannerSlot>

      {/* ── Séance interrompue : reprise (live) ou reprise d'envoi (terminée) ── */}
      {machine.phase === 'idle' && pendingBackup && (
        <div className="rk-card rk-fade-up" style={{
          position: 'absolute', left: 16, right: 16,
          bottom: 'calc(env(safe-area-inset-bottom) + 190px)', zIndex: 58,
          padding: 16, boxShadow: 'var(--shadow-capsule)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {pendingBackup.live ? t('w2c.sessionInProgress') : t('w2c.sessionNotSent')}
              </div>
              <div className="rk-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginTop: 2, letterSpacing: 0 }}>
                {formatHMS(pendingBackup.snap.durationSec, true)} · {frNum(pendingBackup.snap.distM / 1000, 1)} km
              </div>
            </div>
            <button
              type="button"
              onClick={() => { clearLiveBackup(); setPendingBackup(null); showToast(t('w2c.activityDeleted')) }}
              className="rk-press"
              style={{
                minHeight: 36, padding: '0 14px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
                background: 'var(--danger-soft)', border: 'none',
                color: 'var(--danger)', fontSize: 13, fontWeight: 800, flexShrink: 0,
              }}
            >
              {t('w2c.deleteShort')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {pendingBackup.live && (
              <RkCta variant="primary" onClick={handleResumeBackup} style={{ minHeight: 46, fontSize: 15 }}>
                {t('w2c.resumeSession')}
              </RkCta>
            )}
            <RkCta variant={pendingBackup.live ? 'white' : 'primary'} onClick={handleRestoreBackup} style={{ minHeight: 46, fontSize: 15, boxShadow: 'none', background: pendingBackup.live ? 'var(--surface-chip)' : undefined }}>
              {pendingBackup.live ? t('w2c.finishSession') : t('w2c.resumeUpload')}
            </RkCta>
          </div>
        </div>
      )}

      {/* ── Pagination : pilule active (masquée sous la liste des virages) ── */}
      {!(onMapPage && mapOverlay) && <RkPageDots
        count={livePages.length}
        index={pageIndex}
        onSelect={i => { const el = pagesRef.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }) }}
        style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 54,
          bottom: dotsBottom == null ? `${mapSheetH + 6}px` : `calc(env(safe-area-inset-bottom) + ${dotsBottom}px)`,
          transition: 'bottom 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      />}

      {/* ── Zone contrôles (transitions ressort entre états) ── */}
      {!mapOwnsControls && (
        <RkControlDock stateKey={dockKey}>
          {dockKey === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <RkBanner dot={gpsLine.color} live={!canStart} style={{ animation: 'none' }}>
                <span className="rk-num" style={{ letterSpacing: 0 }}>{gpsLine.text}</span>
              </RkBanner>
              <RkStartButton label={t('w2c.start')} onClick={handleStart} disabled={!canStart} size={96} />
            </div>
          )}
          {dockKey === 'rec' && (
            <RkControlRow
              left={<RkFab label={t('w2c.lockAction')} onClick={() => send({ type: 'LOCK' })} size={56}><RkIco d={RK_ICON.lock} size={22} /></RkFab>}
              center={swap ? lapCenter : pauseCenter}
              right={swap ? pauseSide : lapFab}
            />
          )}
          {dockKey === 'paused' && (
            <RkPausePills resumeLabel={t('w2c.resume')} finishLabel={t('rec.finish')} onResume={handlePauseToggle} onFinish={handleFlagFinish} />
          )}
          {dockKey === 'locked' && (
            <RkUnlock hint={t('w2c.doubleTapUnlock')} label={t('w2c.unlockAction')} onUnlock={() => send({ type: 'UNLOCK' })} />
          )}
        </RkControlDock>
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
              fontSize: 22, fontWeight: 800, letterSpacing: '0.13em', color: 'var(--live-text)',
            }}>
              LAP
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(40% + 92px)', textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: 'var(--live-text-2)' }}>
            {t('w2c.holdForLap')}
          </div>
        </div>
      )}

      {/* ── Flash lap : contour écran 300 ms ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none',
        border: '3px solid var(--live-flash)',
        opacity: flash ? 1 : 0, transition: 'opacity 0.12s',
      }} />

      {/* ── Bouton photo — AUCUN bouton visible sur la carte (spec) : monté
             en permanence mais toujours masqué, car sa file de photos en
             attente doit survivre jusqu'au flush post-envoi. ── */}
      <div
        className="lv2-photo"
        style={{ position: 'absolute', right: 18, bottom: 250, zIndex: 5, display: 'none' }}
      >
        <PhotoButton
          key={photoKey}
          ref={photoRef}
          onPreview={url => { setPhotoUrls(u => [...u, url]); if (!inSummaryFlow) setPhotoPreviewUrl(url) }}
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
        isDark={isDark}
      />

      {/* ── Résumé → envoi → confirmation ── */}
      {inSummaryFlow && summarySnap && (
        <SummaryScreen
          snap={summarySnap}
          units={settings.units}
          initialSport={route?.sport ?? null}
          canResume={summaryFromLiveRef.current}
          isDark={isDark}
          photos={photoUrls}
          onAddPhoto={() => photoRef.current?.pick()}
          onBack={() => send({ type: 'REOPEN_SESSION' })}
          onUploadStart={() => send({ type: 'UPLOAD' })}
          onUploadDone={() => {
            send({ type: 'UPLOAD_DONE' })
            // Sortie enregistrée → fin du suivi en direct (« Sortie terminée »).
            if (currentLiveShareId()) void stopLiveShare()
          }}
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
