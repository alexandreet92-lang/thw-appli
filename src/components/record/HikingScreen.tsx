'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import HikingPage1 from './HikingPage1'
import HikingPage2 from './HikingPage2'
import HikingPage3 from './HikingPage3'
import HikingSettings from './HikingSettings'
import LiveFrame from './kit/LiveFrame'
import LiveNoticeBanner, { useLiveNotice, useVibrate, useLapBeepSound } from './LiveNoticeBanner'
import { primeLapBeep, playLapBeep } from './lapBeep'
import ExitConfirmOverlay from './ExitConfirmOverlay'
import SessionSummary from './SessionSummary'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import { useHikingConfig } from '@/hooks/useHikingConfig'
import { useHikingSettings } from '@/hooks/useHikingSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import type { FinishedSession, SessionLap } from '@/types/session'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import PhotoButton, { type PhotoButtonHandle } from './PhotoButton'
import PhotoPreviewToast from './PhotoPreviewToast'

interface Props { onExit: () => void; onFinished: () => void }

interface SessionSnap {
  startedAtISO: string; endedAtISO: string; durationSec: number
  distM: number; elevM: number; elevLossM: number
  avgSpeedKmh: number; maxSpeedKmh: number
  calories: number; gpsPts: GPSPoint[]; lapsSnap: SessionLap[]
}

const PAGE_COUNT = 3

export default function HikingScreen({ onExit, onFinished }: Props) {
  const { t } = useI18n()
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
  const [elevationLossM, setElevationLossM] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSession, setFinishedSession] = useState<FinishedSession | null>(null)
  const snapRef = useRef<SessionSnap | null>(null)
  const prevAltRef = useRef<number | null>(null)
  const photoRef = useRef<PhotoButtonHandle>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { pages } = useHikingConfig('hiking')
  const { settings, updateSetting } = useHikingSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  // Réglage recording.gpsFrequency : throttling des positions dans le hook GPS.
  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled, settings.recording.gpsFrequency)
  // Réglage display.keepAwake : wake lock actif uniquement si autorisé.
  useWakeLock(phase !== 'ready' && settings.display.keepAwake)
  // Auto-pause : sous le seuil (km/h) le chrono se met en pause automatiquement
  // et reprend dès que la vitesse repasse au-dessus.
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
    }
    prevAltRef.current = alt
  }, [gps.currentAltitude, phase])



  // primeLapBeep : l'AudioContext doit naître sur un geste utilisateur (iOS).
  const handleStart = () => { primeLapBeep(); resetTracking(); setElevationLossM(0); prevAltRef.current = null; lastHydrationRef.current = 0; lastNutritionRef.current = 0; lastPhotoRef.current = 0; gpsWasOkRef.current = true; setStartedAt(Date.now()); setPhase('running') }
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
  }

  // Auto-lap (recording.autoLap, en km) : déclenche le même handleLap.
  const autoLapKm = settings.recording.autoLap
  const handleLapRef = useRef(handleLap)
  handleLapRef.current = handleLap
  useEffect(() => {
    if (phase !== 'running' || autoLapKm <= 0) return
    if (currentLapDistance >= autoLapKm * 1000) handleLapRef.current()
  }, [currentLapDistance, autoLapKm, phase])

  // Rappels hydratation / nutrition / photo (alerts.*Interval, minutes de chrono).
  const hydrationMin = settings.alerts.hydrationInterval
  const nutritionMin = settings.alerts.nutritionInterval
  const photoMin = settings.alerts.photoReminderInterval
  const lastHydrationRef = useRef(0)
  const lastNutritionRef = useRef(0)
  const lastPhotoRef = useRef(0)
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
    if (photoMin > 0) {
      const n = Math.floor(sec / (photoMin * 60))
      if (n > lastPhotoRef.current) { lastPhotoRef.current = n; showNotice('record.reminderPhoto') }
    }
  }, [stopwatch.seconds, phase, hydrationMin, nutritionMin, photoMin, showNotice])

  // Alerte perte de signal GPS (alerts.gpsLost) — sur transition ok → perdu.
  const gpsLostOn = settings.alerts.gpsLost
  const gpsWasOkRef = useRef(true)
  useEffect(() => {
    if (phase !== 'running' || !gpsLostOn) return
    const lost = gps.status === GPSStatus.poor || gps.status === GPSStatus.error || gps.status === GPSStatus.unavailable
    if (lost && gpsWasOkRef.current) { gpsWasOkRef.current = false; showNotice('record.alertGpsLost') }
    if (!lost) gpsWasOkRef.current = true
  }, [gps.status, phase, gpsLostOn, showNotice])

  const handleOpenSaveForm = () => {
    const endedAt = new Date()
    const durationSec = stopwatch.seconds
    const distM = Math.round(gps.distance)
    const elevM = Math.round(gps.elevationGain)
    const elevLossM = Math.round(elevationLossM)
    const avgSpeedKmh = distM > 0 && durationSec > 0 ? parseFloat(((distM / 1000) / (durationSec / 3600)).toFixed(1)) : 0
    snapRef.current = { startedAtISO: startedAt ? new Date(startedAt).toISOString() : endedAt.toISOString(), endedAtISO: endedAt.toISOString(), durationSec, distM, elevM, elevLossM, avgSpeedKmh, maxSpeedKmh: parseFloat(gps.maxSpeed.toFixed(1)), calories: Math.round((durationSec / 3600) * 350), gpsPts: [...gps.points], lapsSnap: [...laps] }
    stopWatching(); setPhase('paused'); setShowSaveForm(true)
  }

  const handleSaveSession = async (formData: SessionFormData) => {
    const snap = snapRef.current
    if (!snap) return
    let savedId: string | null = null
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (user) {
        const { data } = await sb.from('workout_sessions').insert({ user_id: user.id, sport: 'hiking', started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, laps: snap.lapsSnap, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment }).select('id').single()
        savedId = data?.id ?? null
        if (savedId) await photoRef.current?.flushToSession(savedId, gps.currentLat ?? undefined, gps.currentLng ?? undefined)
        await sb.from('activities').insert({ user_id: user.id, sport_type: 'hiking', title: formData.title, started_at: snap.startedAtISO, distance_m: snap.distM, moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec, elevation_gain_m: snap.elevM, avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6, calories: snap.calories })
      }
    } catch (e) { console.error('[hiking] save error:', e) }
    setShowSaveForm(false)
    // Réglage postRun.showSummary : si désactivé, on ferme directement.
    if (!settings.postRun.showSummary) { onFinished(); return }
    setFinishedSession({ id: savedId, started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, elevation_loss_m: snap.elevLossM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, calories: snap.calories, gps_points: snap.gpsPts, laps: snap.lapsSnap, title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment, sport: 'hiking' })
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
      title={t('record.hikingScreenTitle')}
      phase={phase}
      autoPaused={autoPaused}
      gpsStatus={gps.status}
      gpsAccuracy={gps.accuracy}
      onClose={() => { if (phase === 'ready') onExit(); else setExitConfirmOpen(true) }}
      closeLabel={t('record.commonQuit')}
      onSettings={() => setSettingsOpen(true)}
      settingsLabel={t('record.commonSettings')}
      pageCount={dotCount}
      pageIndex={pageIndex}
      onPageChange={setPageIndex}
      banners={<LiveNoticeBanner noticeKey={noticeKey} />}
      overlays={<>

          {(phase === 'running' || phase === 'paused') && (
            <div style={{ position: 'absolute', bottom: 'calc(150px + env(safe-area-inset-bottom))', left: 16, zIndex: 100 }}>
              <PhotoButton ref={photoRef} onPreview={url => setPreviewUrl(url)} currentLat={gps.currentLat ?? undefined} currentLng={gps.currentLng ?? undefined} />
            </div>
          )}
          {previewUrl && <PhotoPreviewToast url={previewUrl} onDismiss={() => setPreviewUrl(null)} />}
          <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={handlePause} onResume={handleResume} onLap={handleLap} onFinish={handleStop} onConfirmFinish={handleOpenSaveForm} isDark={isDark} />
          <HikingSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} settings={settings} updateSetting={updateSetting} />

          <ExitConfirmOverlay open={exitConfirmOpen} isDark={isDark} onQuit={() => { setExitConfirmOpen(false); onExit() }} onStay={() => setExitConfirmOpen(false)} />

          {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
          {showPrePermission && <GPSPrePermissionScreen onAuthorize={handleGpsAuthorize} onDismiss={handleGpsDismiss} />}
          {showSaveForm && <SessionSaveForm sport="hiking" startedAt={startedAtISO} onBack={() => setShowSaveForm(false)} onSave={handleSaveSession} isDark={isDark} onDiscard={() => { setShowSaveForm(false); onExit() }} />}
          {finishedSession && <SessionSummary session={finishedSession} isDark={isDark} onClose={onFinished} />}
      </>}
    >
        {pageIndex === 0 && <HikingPage1 isDark={isDark} durationSec={stopwatch.seconds} distanceM={gps.distance} elevationGainM={gps.elevationGain} elevationLossM={elevationLossM} altitudeM={gps.currentAltitude ?? 0} dataFontFamily={dataFontFamily} units={settings.units} paceUnit={settings.display.paceUnit} dataSize={settings.display.dataSize} />}
        {pageIndex === 1 && <HikingPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} />}
        {pageIndex === 2 && <HikingPage3 isDark={isDark} gradientPercent={gps.gradient ?? 0} elevationGainM={gps.elevationGain} elevationLossM={elevationLossM} altitudeM={gps.currentAltitude ?? 0} distanceM={gps.distance} dataFontFamily={dataFontFamily} units={settings.units} dataSize={settings.display.dataSize} />}
    </LiveFrame>,
    document.body
  )
}
