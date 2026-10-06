'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import TrailPage1 from './TrailPage1'
import TrailPage2 from './TrailPage2'
import TrailPage3 from './TrailPage3'
import TrailPage4 from './TrailPage4'
import TrailSettings from './TrailSettings'
import LiveFrame from './kit/LiveFrame'
import { useBackgroundTracking } from '@/hooks/useBackgroundTracking'
import LiveNoticeBanner, { useLiveNotice, useVibrate, useLapBeepSound } from './LiveNoticeBanner'
import { primeLapBeep, playLapBeep } from './lapBeep'
import ExitConfirmOverlay from './ExitConfirmOverlay'
import SessionSummary from './SessionSummary'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import { savePendingSession } from '@/lib/offlineStorage'
import { useTrailConfig } from '@/hooks/useTrailConfig'
import { useTrailSettings } from '@/hooks/useTrailSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import type { FinishedSession, SessionLap } from '@/types/session'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import type { NavRouteInput } from './RouteNavScreen'
import { useI18n } from '@/lib/i18n'
const RouteNavScreen = dynamic(() => import('./RouteNavScreen'), { ssr: false })

interface Props { onExit: () => void; onFinished: () => void; route?: NavRouteInput | null }

interface SessionSnap {
  startedAtISO: string; endedAtISO: string; durationSec: number
  distM: number; elevM: number; elevLossM: number
  avgSpeedKmh: number; maxSpeedKmh: number
  calories: number; gpsPts: GPSPoint[]; lapsSnap: SessionLap[]
}

const PAGE_COUNT = 4

export default function TrailScreen({ onExit, onFinished, route }: Props) {
  const { t } = useI18n()
  const [navOpen, setNavOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [showPrePermission, setShowPrePermission] = useState(false)
  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem('gps_permission_explained')) setGpsEnabled(true)
    else setShowPrePermission(true)
  }, [])

  const [phase, setPhase] = useState<CyclingPhase>('ready')
  const [pageIndex, setPageIndex] = useState(0)
  const [laps, setLaps] = useState<SessionLap[]>([])
  const [currentLapSec, setCurrentLapSec] = useState(0)
  const [currentLapDistance, setCurrentLapDistance] = useState(0)
  const [lapStartDistance, setLapStartDistance] = useState(0)
  const [lapElevGain, setLapElevGain] = useState(0)
  const [lapElevLoss, setLapElevLoss] = useState(0)
  const [elevationLossM, setElevationLossM] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSession, setFinishedSession] = useState<FinishedSession | null>(null)
  const snapRef = useRef<SessionSnap | null>(null)
  const prevAltRef = useRef<number | null>(null)
  const lapPrevAltRef = useRef<number | null>(null)

  const { pages } = useTrailConfig('trail')
  const { settings, updateSetting } = useTrailSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  // Réglage recording.gpsFrequency : throttling des positions dans le hook GPS.
  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled, settings.recording.gpsFrequency)
  // Réglage display.keepAwake : wake lock actif uniquement si autorisé.
  useWakeLock(phase !== 'ready' && settings.display.keepAwake)
  const autoPauseOn = settings.recording.autoPause
  const autoPauseTh = settings.recording.autoPauseThreshold
  const [autoPaused, setAutoPaused] = useState(false)
  useEffect(() => {
    if (phase !== 'running' || !autoPauseOn) { setAutoPaused(false); return }
    setAutoPaused((gps.currentSpeed ?? 0) < autoPauseTh)
  }, [gps.currentSpeed, phase, autoPauseOn, autoPauseTh])
  // Réglages alertes — son (module lapBeep) + vibration + bandeau transitoire.
  useLapBeepSound(settings.alerts.sound)
  const vibrate = useVibrate(settings.alerts.vibration)
  const { noticeKey, showNotice } = useLiveNotice(vibrate)
  // Suivi GPS en arrière-plan tant que la séance tourne (pause incluse).
  useBackgroundTracking(phase !== 'ready', () => showNotice('rec.bgLockHint'))
  const stopwatch = useStopwatch(phase === 'running' && !autoPaused)

  useEffect(() => { if (phase !== 'running' || autoPaused) return; const i = setInterval(() => setCurrentLapSec(s => s + 1), 1000); return () => clearInterval(i) }, [phase, autoPaused])
  useEffect(() => { setCurrentLapDistance(gps.distance - lapStartDistance) }, [gps.distance, lapStartDistance])

  useEffect(() => {
    if (phase !== 'running') return
    const alt = gps.currentAltitude
    if (alt == null) return
    if (prevAltRef.current != null) {
      const diff = alt - prevAltRef.current
      if (diff < -0.3) setElevationLossM(p => p + Math.abs(diff))
      if (lapPrevAltRef.current != null) {
        const lapDiff = alt - lapPrevAltRef.current
        if (lapDiff > 0.3) setLapElevGain(p => p + lapDiff)
        if (lapDiff < -0.3) setLapElevLoss(p => p + Math.abs(lapDiff))
      }
    }
    prevAltRef.current = alt
    lapPrevAltRef.current = alt
  }, [gps.currentAltitude, phase])



  // primeLapBeep : l'AudioContext doit naître sur un geste utilisateur (iOS).
  const handleStart = () => { primeLapBeep(); resetTracking(); setElevationLossM(0); prevAltRef.current = null; lapPrevAltRef.current = null; lastHydrationRef.current = 0; lastNutritionRef.current = 0; gpsWasOkRef.current = true; slopeArmedRef.current = true; setStartedAt(Date.now()); setPhase('running') }
  const handlePause = () => setPhase('paused')
  const handleResume = () => setPhase('running')
  const handleStop = () => setPhase('confirming_stop')
  const handleGpsAuthorize = () => { localStorage.setItem('gps_permission_explained', 'true'); setShowPrePermission(false); setGpsEnabled(true) }
  const handleGpsDismiss = () => setShowPrePermission(false)

  const handleLap = () => {
    if (currentLapSec === 0) return
    playLapBeep() // muet si alerts.sound est désactivé (setLapBeepSoundEnabled)
    vibrate(200)  // alerts.vibration
    setLaps(prev => [...prev, { number: prev.length + 1, duration: currentLapSec, distance: currentLapDistance, avgSpeed: currentLapDistance > 0 ? (currentLapDistance / currentLapSec) * 3.6 : 0, timestamp: Date.now() }])
    setCurrentLapSec(0); setLapStartDistance(gps.distance)
    setLapElevGain(0); setLapElevLoss(0); lapPrevAltRef.current = gps.currentAltitude
  }

  // Auto-lap (recording.autoLap, en km) : déclenche le même handleLap.
  const autoLapKm = settings.recording.autoLap
  const handleLapRef = useRef(handleLap)
  handleLapRef.current = handleLap
  useEffect(() => {
    if (phase !== 'running' || autoLapKm <= 0) return
    if (currentLapDistance >= autoLapKm * 1000) handleLapRef.current()
  }, [currentLapDistance, autoLapKm, phase])

  // Rappels hydratation / nutrition (alerts.*Interval, minutes de chrono).
  const hydrationMin = settings.alerts.hydrationInterval
  const nutritionMin = settings.alerts.nutritionInterval
  const lastHydrationRef = useRef(0)
  const lastNutritionRef = useRef(0)
  useEffect(() => {
    if (phase !== 'running') return
    const sec = stopwatch.seconds
    if (hydrationMin > 0) {
      const n = Math.floor(sec / (hydrationMin * 60))
      if (n > lastHydrationRef.current) { lastHydrationRef.current = n; showNotice('record.reminderHydration') }
    }
    if (nutritionMin > 0) {
      const n = Math.floor(sec / (nutritionMin * 60))
      if (n > lastNutritionRef.current) { lastNutritionRef.current = n; showNotice('record.reminderNutrition') }
    }
  }, [stopwatch.seconds, phase, hydrationMin, nutritionMin, showNotice])

  // Alerte perte de signal GPS (alerts.gpsLost) — sur transition ok → perdu.
  const gpsLostOn = settings.alerts.gpsLost
  const gpsWasOkRef = useRef(true)
  useEffect(() => {
    if (phase !== 'running' || !gpsLostOn) return
    const lost = gps.status === GPSStatus.poor || gps.status === GPSStatus.error || gps.status === GPSStatus.unavailable
    if (lost && gpsWasOkRef.current) { gpsWasOkRef.current = false; showNotice('record.alertGpsLost') }
    if (!lost) gpsWasOkRef.current = true
  }, [gps.status, phase, gpsLostOn, showNotice])

  // Alerte pente raide (alerts.steepSlopeThreshold, %, 0 = off) — sur
  // franchissement du seuil, réarmée quand la pente redescend en dessous.
  const steepSlopeTh = settings.alerts.steepSlopeThreshold
  const slopeArmedRef = useRef(true)
  useEffect(() => {
    if (phase !== 'running' || steepSlopeTh <= 0) return
    const steep = Math.abs(gps.gradient ?? 0) >= steepSlopeTh
    if (steep && slopeArmedRef.current) { slopeArmedRef.current = false; showNotice('record.alertSteepSlope') }
    if (!steep) slopeArmedRef.current = true
  }, [gps.gradient, phase, steepSlopeTh, showNotice])

  const handleOpenSaveForm = () => {
    const endedAt = new Date()
    const durationSec = stopwatch.seconds
    const distM = Math.round(gps.distance)
    const elevM = Math.round(gps.elevationGain)
    const elevLossM = Math.round(elevationLossM)
    const avgSpeedKmh = distM > 0 && durationSec > 0 ? parseFloat(((distM / 1000) / (durationSec / 3600)).toFixed(1)) : 0
    snapRef.current = { startedAtISO: startedAt ? new Date(startedAt).toISOString() : endedAt.toISOString(), endedAtISO: endedAt.toISOString(), durationSec, distM, elevM, elevLossM, avgSpeedKmh, maxSpeedKmh: parseFloat(gps.maxSpeed.toFixed(1)), calories: Math.round((durationSec / 3600) * 550), gpsPts: [...gps.points], lapsSnap: [...laps] }
    stopWatching(); setPhase('paused'); setShowSaveForm(true)
  }

  const handleSaveSession = async (formData: SessionFormData) => {
    const snap = snapRef.current
    if (!snap) return
    let savedId: string | null = null
    if (!navigator.onLine) {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (user) savePendingSession({ user_id: user.id, sport: 'trail', started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, laps: snap.lapsSnap, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment, activity_sport_type: 'trail', avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6 })
      } catch (e) { console.error('[trail] offline save error:', e) }
    } else {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (user) {
          const { data } = await sb.from('workout_sessions').insert({ user_id: user.id, sport: 'trail', started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, laps: snap.lapsSnap, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment }).select('id').single()
          savedId = data?.id ?? null
          await sb.from('activities').insert({ user_id: user.id, sport_type: 'trail', title: formData.title, started_at: snap.startedAtISO, distance_m: snap.distM, moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec, elevation_gain_m: snap.elevM, avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6, calories: snap.calories })
        }
      } catch (e) { console.error('[trail] save error:', e) }
    }
    setShowSaveForm(false)
    // Réglage postRun.showSummary : si désactivé, on ferme directement.
    if (!settings.postRun.showSummary) { onFinished(); return }
    setFinishedSession({ id: savedId, started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, elevation_loss_m: snap.elevLossM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, calories: snap.calories, gps_points: snap.gpsPts, laps: snap.lapsSnap, title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment, sport: 'trail' })
  }

  if (!mounted) return null
  // Réglage display.theme : auto = thème système, sinon forçage clair/sombre.
  const systemDark = document.documentElement.classList.contains('dark')
  const isDark = settings.display.theme === 'dark' ? true
    : settings.display.theme === 'light' ? false
    : systemDark
  const trackPoints = gps.points.map(p => ({ lat: p.lat, lng: p.lng }))
  const currentPosition: [number, number] | null = gps.currentLat != null && gps.currentLng != null ? [gps.currentLat, gps.currentLng] : null
  const startedAtISO = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()
  const dotCount = Math.max(PAGE_COUNT, pages.length)

  return createPortal(
    <LiveFrame
      isDark={isDark}
      title={'Trail'}
      phase={phase}
      autoPaused={autoPaused}
      gpsStatus={gps.status}
      gpsAccuracy={gps.accuracy}
      onClose={() => { if (phase === 'ready') onExit(); else setExitConfirmOpen(true) }}
      closeLabel={t('record.trailExit')}
      onSettings={() => setSettingsOpen(true)}
      settingsLabel={t('record.trailSettingsAria')}
      pageCount={dotCount}
      pageIndex={pageIndex}
      onPageChange={setPageIndex}
      banners={<LiveNoticeBanner noticeKey={noticeKey} />}
      overlays={<>

          {/* Navigation plein écran (dispo même sans parcours ; guidage si parcours) */}
          {navOpen && (
            <RouteNavScreen route={route ?? null} sport="trail" showWatts={false} isDark={isDark} hr={null} elapsedSec={stopwatch.seconds} distanceDoneM={gps.distance} gainDoneM={gps.elevationGain} onClose={() => setNavOpen(false)} />
          )}

          <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={handlePause} onResume={handleResume} onLap={handleLap} onFinish={handleStop} onConfirmFinish={handleOpenSaveForm} isDark={isDark} />
          <TrailSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} settings={settings} updateSetting={updateSetting} />

          <ExitConfirmOverlay open={exitConfirmOpen} isDark={isDark} onQuit={() => { setExitConfirmOpen(false); onExit() }} onStay={() => setExitConfirmOpen(false)} />

          {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
          {showPrePermission && <GPSPrePermissionScreen onAuthorize={handleGpsAuthorize} onDismiss={handleGpsDismiss} />}
          {showSaveForm && <SessionSaveForm sport="trail" startedAt={startedAtISO} onBack={() => setShowSaveForm(false)} onSave={handleSaveSession} isDark={isDark} onDiscard={() => { setShowSaveForm(false); onExit() }} />}
          {finishedSession && <SessionSummary session={finishedSession} isDark={isDark} onClose={onFinished} />}
      </>}
    >
        {pageIndex === 0 && <TrailPage1 isDark={isDark} durationSec={stopwatch.seconds} distanceM={gps.distance} speedKmh={gps.currentSpeed} elevationGainM={gps.elevationGain} elevationLossM={elevationLossM} dataFontFamily={dataFontFamily} units={settings.units} paceUnit={settings.display.paceUnit} dataSize={settings.display.dataSize} />}
        {pageIndex === 1 && <TrailPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} onExpand={() => setNavOpen(true)} paused={autoPaused} />}
        {pageIndex === 2 && <TrailPage3 isDark={isDark} gradientPercent={gps.gradient ?? 0} elevationGainM={gps.elevationGain} elevationLossM={elevationLossM} altitudeM={gps.currentAltitude ?? 0} lapElevGainM={lapElevGain} lapElevLossM={lapElevLoss} dataFontFamily={dataFontFamily} units={settings.units} dataSize={settings.display.dataSize} />}
        {pageIndex === 3 && <TrailPage4 isDark={isDark} currentLapSec={currentLapSec} currentLapDistanceM={currentLapDistance} gradientPercent={gps.gradient ?? 0} lapElevGainM={lapElevGain} lapElevLossM={lapElevLoss} dataFontFamily={dataFontFamily} units={settings.units} paceUnit={settings.display.paceUnit} dataSize={settings.display.dataSize} />}
    </LiveFrame>,
    document.body
  )
}
