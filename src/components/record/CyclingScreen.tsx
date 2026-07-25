'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { NavRouteInput } from './RouteNavScreen'
const RouteNavScreen = dynamic(() => import('./RouteNavScreen'), { ssr: false })
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import CyclingPageData from './CyclingPageData'
import { primeLapBeep, playLapBeep, setLapBeepSoundEnabled } from './lapBeep'
import CyclingSettings from './CyclingSettings'
import AutoPauseBadge from './AutoPauseBadge'
import ExitConfirmOverlay from './ExitConfirmOverlay'
import SessionSummary from './SessionSummary'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import { useSegmentDetection } from '@/hooks/useSegmentDetection'
import { savePendingSession } from '@/lib/offlineStorage'
import PhotoButton, { type PhotoButtonHandle } from './PhotoButton'
import PhotoPreviewToast from './PhotoPreviewToast'
import { useCyclingConfig } from '@/hooks/useCyclingConfig'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import type { FinishedSession, SessionLap } from '@/types/session'
import type { GPSPoint } from '@/hooks/useGPSTracking'

interface Props {
  onExit: () => void
  onFinished: () => void
  route?: NavRouteInput | null
}

interface SessionSnap {
  startedAtISO: string
  endedAtISO: string
  durationSec: number
  distM: number
  elevM: number
  avgSpeedKmh: number
  maxSpeedKmh: number
  calories: number
  gpsPts: GPSPoint[]
  lapsSnap: SessionLap[]
}

export default function CyclingScreen({ onExit, onFinished, route }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [showPrePermission, setShowPrePermission] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem('gps_permission_explained')) {
      setGpsEnabled(true)
    } else {
      setShowPrePermission(true)
    }
  }, [])

  const [phase, setPhase] = useState<CyclingPhase>('ready')
  const [pageIndex, setPageIndex] = useState(0)
  const [laps, setLaps] = useState<SessionLap[]>([])
  const [currentLapSec, setCurrentLapSec] = useState(0)
  const [currentLapDistance, setCurrentLapDistance] = useState(0)
  const [lapStartDistance, setLapStartDistance] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSession, setFinishedSession] = useState<FinishedSession | null>(null)
  const snapRef = useRef<SessionSnap | null>(null)
  const photoRef = useRef<PhotoButtonHandle>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { pages } = useCyclingConfig('cycling')
  const { settings, updateSetting } = useCyclingSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled)
  // Réglage display.keepAwake : wake lock actif uniquement si autorisé.
  useWakeLock(phase !== 'ready' && settings.display.keepAwake)
  // Auto-pause : sous le seuil (km/h, défaut 5) la séance se met en pause
  // automatiquement et reprend dès que la vitesse repasse au-dessus.
  const autoPauseOn = settings.recording.autoPause
  const autoPauseTh = settings.recording.autoPauseThreshold
  const [autoPaused, setAutoPaused] = useState(false)
  useEffect(() => {
    if (phase !== 'running' || !autoPauseOn) { setAutoPaused(false); return }
    setAutoPaused((gps.currentSpeed ?? 0) < autoPauseTh)
  }, [gps.currentSpeed, phase, autoPauseOn, autoPauseTh])

  // Réglages alertes — son (module lapBeep) + vibration.
  const soundOn = settings.alerts.sound
  const vibrationOn = settings.alerts.vibration
  useEffect(() => {
    setLapBeepSoundEnabled(soundOn)
    return () => setLapBeepSoundEnabled(true) // ne pas laisser le mute fuiter hors de l'écran
  }, [soundOn])
  const vibrate = useCallback((pattern: number | number[]) => {
    if (!vibrationOn) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern) } catch { /* non supporté */ }
    }
  }, [vibrationOn])

  // Rappels hydratation / nutrition + alerte perte GPS → bandeau transitoire.
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showNotice = useCallback((key: string) => {
    setNoticeKey(key)
    playLapBeep()
    vibrate([120, 80, 120])
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNoticeKey(null), 6000)
  }, [vibrate])
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])
  const stopwatch = useStopwatch(phase === 'running' && !autoPaused)
  const { activeEffort, completedEfforts } = useSegmentDetection(
    gps.currentLat ?? null, gps.currentLng ?? null, 'cycling', phase === 'running'
  )

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(Math.max(0, pages.length - 1))
  }, [pages.length, pageIndex])

  useEffect(() => {
    if (phase !== 'running' || autoPaused) return
    const i = setInterval(() => setCurrentLapSec(s => s + 1), 1000)
    return () => clearInterval(i)
  }, [phase, autoPaused])

  useEffect(() => {
    setCurrentLapDistance(gps.distance - lapStartDistance)
  }, [gps.distance, lapStartDistance])

  // ── Carrousel horizontal — swipe gauche/droite (seuil 50px), translateX.
  // Sur la page carte, le swipe est désactivé (la carte garde pan & zoom) :
  // la navigation s'y fait uniquement par les flèches latérales.
  const [dragX, setDragX] = useState(0)
  const dragRef = useRef<{ x: number; y: number; locked: 'h' | 'v' | null } | null>(null)
  const onMapPage = pages[pageIndex]?.type === 'map'
  const goTo = (i: number) => { const n = pages.length; if (n > 0) setPageIndex(((i % n) + n) % n) }
  const handleTouchStart = (e: React.TouchEvent) => {
    if (onMapPage) return
    if ((e.target as HTMLElement)?.closest?.('.leaflet-container')) return
    dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: null }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.touches[0].clientX - d.x
    const dy = e.touches[0].clientY - d.y
    if (!d.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      d.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (d.locked === 'h') setDragX(dx)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const d = dragRef.current
    dragRef.current = null
    setDragX(0)
    if (!d || d.locked !== 'h') return
    const dx = e.changedTouches[0].clientX - d.x
    if (Math.abs(dx) < 50) return
    goTo(dx < 0 ? pageIndex + 1 : pageIndex - 1)
  }

  const handleGpsAuthorize = () => {
    localStorage.setItem('gps_permission_explained', 'true')
    setShowPrePermission(false)
    setGpsEnabled(true)
  }
  const handleGpsDismiss = () => setShowPrePermission(false)

  // primeLapBeep : l'AudioContext doit naître sur un geste utilisateur (iOS)
  // pour que le bip de lap soit audible ensuite.
  const handleStart  = () => {
    primeLapBeep(); resetTracking()
    lastHydrationRef.current = 0; lastNutritionRef.current = 0; gpsWasOkRef.current = true
    setStartedAt(Date.now()); setPhase('running')
  }
  const handlePause  = () => setPhase('paused')
  const handleResume = () => setPhase('running')
  const handleStop   = () => setPhase('confirming_stop')

  const handleLap = () => {
    if (currentLapSec === 0) return
    playLapBeep() // muet si alerts.sound est désactivé (setLapBeepSoundEnabled)
    vibrate(200)  // alerts.vibration
    const lap: SessionLap = {
      number: laps.length + 1,
      duration: currentLapSec,
      distance: currentLapDistance,
      avgSpeed: currentLapDistance > 0 ? (currentLapDistance / currentLapSec) * 3.6 : 0,
      timestamp: Date.now(),
    }
    setLaps(prev => [...prev, lap])
    setCurrentLapSec(0)
    setLapStartDistance(gps.distance)
  }

  // Auto-lap (recording.autoLap, en km) : déclenche le même handleLap (bip +
  // vibration inclus) dès que la distance du lap courant atteint le seuil.
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

  // TERMINER pressed → snapshot GPS state, stop tracking, show form
  const handleOpenSaveForm = () => {
    const endedAt = new Date()
    const durationSec = stopwatch.seconds
    const distM = Math.round(gps.distance)
    const elevM = Math.round(gps.elevationGain)
    const avgSpeedKmh = distM > 0 && durationSec > 0
      ? parseFloat(((distM / 1000) / (durationSec / 3600)).toFixed(1))
      : 0
    const maxSpeedKmh = parseFloat(gps.maxSpeed.toFixed(1))
    const calories = Math.round((durationSec / 3600) * 600)
    const startedAtISO = startedAt ? new Date(startedAt).toISOString() : endedAt.toISOString()
    snapRef.current = {
      startedAtISO,
      endedAtISO: endedAt.toISOString(),
      durationSec,
      distM,
      elevM,
      avgSpeedKmh,
      maxSpeedKmh,
      calories,
      gpsPts: [...gps.points],
      lapsSnap: [...laps],
    }
    stopWatching()
    setPhase('paused')
    setShowSaveForm(true)
  }

  const handleBackFromForm = () => {
    setShowSaveForm(false)
  }

  const handleSaveSession = async (formData: SessionFormData) => {
    const snap = snapRef.current
    if (!snap) return

    let savedId: string | null = null

    if (!navigator.onLine) {
      // Hors ligne — stocker localement pour sync ultérieure
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          savePendingSession({
            user_id: user.id, sport: 'cycling',
            started_at: snap.startedAtISO, ended_at: snap.endedAtISO,
            duration_seconds: snap.durationSec, distance_m: snap.distM,
            elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh,
            max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts,
            laps: snap.lapsSnap, calories: snap.calories, status: 'completed',
            title: formData.title, training_types: formData.trainingTypes,
            rpe: formData.rpe, comment: formData.comment,
            activity_sport_type: 'bike',
            avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0,
            max_speed_ms: snap.maxSpeedKmh / 3.6,
          })
        }
      } catch (e) { console.error('[record] offline save error:', e) }
    } else {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          const { data } = await sb.from('workout_sessions').insert({
            user_id: user.id, sport: 'cycling',
            started_at: snap.startedAtISO, ended_at: snap.endedAtISO,
            duration_seconds: snap.durationSec, distance_m: snap.distM,
            elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh,
            max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts,
            laps: snap.lapsSnap, calories: snap.calories, status: 'completed',
            title: formData.title, training_types: formData.trainingTypes,
            rpe: formData.rpe, comment: formData.comment,
          }).select('id').single()
          savedId = data?.id ?? null
          if (savedId) await photoRef.current?.flushToSession(savedId, gps.currentLat ?? undefined, gps.currentLng ?? undefined)
          await sb.from('activities').insert({
            user_id: user.id, sport_type: 'bike', title: formData.title,
            started_at: snap.startedAtISO, distance_m: snap.distM,
            moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec,
            elevation_gain_m: snap.elevM,
            avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0,
            max_speed_ms: snap.maxSpeedKmh / 3.6, calories: snap.calories,
          })
        }
      } catch (e) { console.error('[record] save error:', e) }
    }

    setShowSaveForm(false)
    // Réglage postRide.showSummary : si désactivé, on ferme directement.
    if (!settings.postRide.showSummary) { onFinished(); return }
    setFinishedSession({
      id: savedId,
      started_at: snap.startedAtISO,
      ended_at: snap.endedAtISO,
      duration_seconds: snap.durationSec,
      distance_m: snap.distM,
      elevation_gain_m: snap.elevM,
      avg_speed_kmh: snap.avgSpeedKmh,
      max_speed_kmh: snap.maxSpeedKmh,
      calories: snap.calories,
      gps_points: snap.gpsPts,
      laps: snap.lapsSnap,
      title: formData.title,
      training_types: formData.trainingTypes,
      rpe: formData.rpe,
      comment: formData.comment,
    })
  }

  if (!mounted) return null

  // Réglage display.theme : auto = thème système, sinon forçage clair/sombre.
  const systemDark = document.documentElement.classList.contains('dark')
  const isDark = settings.display.theme === 'dark' ? true
    : settings.display.theme === 'light' ? false
    : systemDark
  const bg         = isDark ? '#0A0A0A' : '#FFFFFF'
  const text       = isDark ? '#FFFFFF' : '#0A0A0A'
  const labelColor = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const btnBg      = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'

  const startedAtISO = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: bg, color: text,
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100dvh',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 12px',
        position: 'relative',
      }}>
        <button
          onClick={() => { if (phase === 'ready') onExit(); else setExitConfirmOpen(true) }}
          aria-label={t('record.commonQuit')}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: btnBg, color: text, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 13, fontWeight: 500, letterSpacing: '0.02em',
          color: labelColor, fontFamily: 'var(--font-body)',
        }}>
          {t('record.cyclingScreenTitle')}
        </span>
        <button onClick={() => setSettingsOpen(true)} aria-label={t('record.commonSettings')} style={{
          marginLeft: 'auto',
          width: 36, height: 36, borderRadius: '50%',
          background: btnBg, color: text, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Pages — carrousel horizontal (translateX + drag tactile) */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          display: 'flex', flex: 1, minHeight: 0,
          width: `${Math.max(pages.length, 1) * 100}%`,
          transform: `translateX(calc(${-pageIndex * (100 / Math.max(pages.length, 1))}% + ${dragX}px))`,
          transition: dragX !== 0 ? 'none' : 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)',
          willChange: 'transform',
        }}>
          {pages.map(page => (
            <div
              key={page.id}
              style={{
                width: `${100 / Math.max(pages.length, 1)}%`, height: '100%',
                position: 'relative', display: 'flex', flexDirection: 'column',
                minHeight: 0, overflowY: page.type === 'map' ? 'hidden' : 'auto',
              }}
            >
              {page.type === 'map' ? (
                /* Page 2 : pleine carte de navigation permanente (vitesse,
                   D+ restant / km restant / temps est. si parcours chargé). */
                <RouteNavScreen
                  embedded
                  route={route ?? null}
                  sport="cycling"
                  showWatts
                  isDark={isDark}
                  hr={null}
                  watts={null}
                  elapsedSec={stopwatch.seconds}
                  distanceDoneM={gps.distance}
                  gainDoneM={gps.elevationGain}
                />
              ) : (
                <CyclingPageData
                  page={page}
                  isDark={isDark}
                  durationSec={stopwatch.seconds}
                  distanceM={gps.distance}
                  speedKmh={gps.currentSpeed}
                  maxSpeedKmh={gps.maxSpeed}
                  elevationGainM={gps.elevationGain}
                  altitudeM={gps.currentAltitude ?? 0}
                  gradientPercent={gps.gradient}
                  currentLapSec={currentLapSec}
                  currentLapDistanceM={currentLapDistance}
                  dataFontFamily={dataFontFamily}
                  units={settings.units}
                  dataSize={settings.display.dataSize}
                />
              )}
            </div>
          ))}
        </div>

        {/* Flèches de page — uniquement sur la carte (le pan y capture le swipe) */}
        {onMapPage && pages.length > 1 && (
          <>
            {[{ dir: -1 as const, side: { left: 10 }, label: t('record.pagePrev'), path: 'M14 6l-6 6 6 6' },
              { dir: 1 as const, side: { right: 10 }, label: t('record.pageNext'), path: 'M10 6l6 6-6 6' }].map(a => (
              <button
                key={a.dir}
                onClick={() => goTo(pageIndex + a.dir)}
                aria-label={a.label}
                style={{
                  position: 'absolute', top: 'calc(50% - 60px)', transform: 'translateY(-50%)', ...a.side,
                  zIndex: 1400, width: 40, height: 40, borderRadius: '50%',
                  background: btnBg, color: text, border: 'none', cursor: 'pointer',
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.18)', // design-allow-color
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={a.path} />
                </svg>
              </button>
            ))}
          </>
        )}

        {/* Points de pagination — bas centre (masqués sur la carte : flèches) */}
        {!onMapPage && (
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: 'calc(128px + env(safe-area-inset-bottom))',
            display: 'flex', justifyContent: 'center', gap: 7, pointerEvents: 'none',
          }}>
            {pages.map((_, i) => (
              <span key={i} style={{
                width: i === pageIndex ? 18 : 6, height: 6, borderRadius: 999,
                background: i === pageIndex ? '#06B6D4' : labelColor,
                transition: 'width 0.25s ease, background 0.25s ease',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Badge auto-pause — visible quelle que soit la page active */}
      <AutoPauseBadge active={autoPaused} isDark={isDark} />

      {/* Bandeau transitoire : rappels hydratation/nutrition, perte GPS */}
      {noticeKey && (
        <div style={{ position: 'fixed', top: 'calc(100px + env(safe-area-inset-top))', left: 16, right: 16, zIndex: 1000, background: 'rgba(6,182,212,0.92)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}> {/* design-allow-color */}
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', flexShrink: 0 }} /> {/* design-allow-color */}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t(noticeKey)}</span> {/* design-allow-color */}
        </div>
      )}

      {/* Active segment effort bandeau */}
      {activeEffort && (
        <div style={{ position: 'fixed', top: 'calc(56px + env(safe-area-inset-top))', left: 16, right: 16, zIndex: 1000, background: 'rgba(6,182,212,0.92)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{activeEffort.segmentName}</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {String(Math.floor(activeEffort.elapsedSeconds / 60)).padStart(2, '0')}:{String(activeEffort.elapsedSeconds % 60).padStart(2, '0')}
          </span>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Photo button — visible during recording */}
      {(phase === 'running' || phase === 'paused') && (
        <div style={{ position: 'absolute', bottom: 'calc(130px + env(safe-area-inset-bottom))', left: 16, zIndex: 100 }}>
          <PhotoButton ref={photoRef} onPreview={url => setPreviewUrl(url)} currentLat={gps.currentLat ?? undefined} currentLng={gps.currentLng ?? undefined} />
        </div>
      )}
      {previewUrl && <PhotoPreviewToast url={previewUrl} onDismiss={() => setPreviewUrl(null)} />}

      <CyclingControls
        phase={phase}
        gpsStatus={gps.status}
        gpsAccuracy={gps.accuracy}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onLap={handleLap}
        onFinish={handleStop}
        onConfirmFinish={handleOpenSaveForm}
        isDark={isDark}
      />

      <CyclingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        settings={settings}
        updateSetting={updateSetting}
      />

      <ExitConfirmOverlay
        open={exitConfirmOpen}
        isDark={isDark}
        onQuit={() => { setExitConfirmOpen(false); onExit() }}
        onStay={() => setExitConfirmOpen(false)}
      />

      {gps.status === GPSStatus.denied && (
        <GPSPermissionScreen isDark={isDark} />
      )}

      {showPrePermission && (
        <GPSPrePermissionScreen
          onAuthorize={handleGpsAuthorize}
          onDismiss={handleGpsDismiss}
        />
      )}

      {showSaveForm && (
        <SessionSaveForm
          sport="cycling"
          startedAt={startedAtISO}
          onBack={handleBackFromForm}
          onSave={handleSaveSession}
          isDark={isDark}
        />
      )}

      {finishedSession && (
        <SessionSummary
          session={finishedSession}
          isDark={isDark}
          onClose={onFinished}
          completedEfforts={completedEfforts}
        />
      )}
    </div>,
    document.body
  )
}
