'use client'
import { useState, useRef, useEffect } from 'react'
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
import CyclingPage2 from './CyclingPage2'
import CyclingPageData from './CyclingPageData'
import CyclingSettings from './CyclingSettings'
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
  const [mounted, setMounted] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
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
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSession, setFinishedSession] = useState<FinishedSession | null>(null)
  const snapRef = useRef<SessionSnap | null>(null)
  const photoRef = useRef<PhotoButtonHandle>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { pages } = useCyclingConfig('cycling')
  const { settings, updateSetting } = useCyclingSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled)
  useWakeLock(phase !== 'ready')
  const stopwatch = useStopwatch(phase === 'running')
  const { activeEffort, completedEfforts } = useSegmentDetection(
    gps.currentLat ?? null, gps.currentLng ?? null, 'cycling', phase === 'running'
  )

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(Math.max(0, pages.length - 1))
  }, [pages.length, pageIndex])

  useEffect(() => {
    if (phase !== 'running') return
    const i = setInterval(() => setCurrentLapSec(s => s + 1), 1000)
    return () => clearInterval(i)
  }, [phase])

  useEffect(() => {
    setCurrentLapDistance(gps.distance - lapStartDistance)
  }, [gps.distance, lapStartDistance])

  const touchRef = useRef<{ y: number; t: number } | null>(null)
  const swipeFromMap = useRef(false)
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeFromMap.current = !!(e.target as HTMLElement)?.closest?.('.leaflet-container')
    if (swipeFromMap.current) return
    touchRef.current = { y: e.touches[0].clientY, t: Date.now() }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeFromMap.current) { swipeFromMap.current = false; return }
    if (!touchRef.current) return
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    const dt = Date.now() - touchRef.current.t
    touchRef.current = null
    if (dt > 600) return
    if (dy < -50) setPageIndex(i => { const n = pages.length; return n === 0 ? i : (i + 1) % n })
    else if (dy > 50) setPageIndex(i => { const n = pages.length; return n === 0 ? i : (i - 1 + n) % n })
  }

  const handleGpsAuthorize = () => {
    localStorage.setItem('gps_permission_explained', 'true')
    setShowPrePermission(false)
    setGpsEnabled(true)
  }
  const handleGpsDismiss = () => setShowPrePermission(false)

  const handleStart  = () => { resetTracking(); setStartedAt(Date.now()); setPhase('running') }
  const handlePause  = () => setPhase('paused')
  const handleResume = () => setPhase('running')
  const handleStop   = () => setPhase('confirming_stop')

  const handleLap = () => {
    if (currentLapSec === 0) return
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

  const hour = new Date().getHours()
  const isDark = hour < 7 || hour > 20
  const bg         = isDark ? '#0A0A0A' : '#FFFFFF'
  const text       = isDark ? '#FFFFFF' : '#0A0A0A'
  const labelColor = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const btnBg      = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
  const trackPoints = gps.points.map(p => ({ lat: p.lat, lng: p.lng }))
  const currentPosition: [number, number] | null =
    gps.currentLat != null && gps.currentLng != null
      ? [gps.currentLat, gps.currentLng]
      : null

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
        <button onClick={onExit} aria-label="Quitter" style={{
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
          fontSize: 13, color: labelColor, fontFamily: 'DM Sans, sans-serif',
        }}>
          Vélo
        </span>
        <button onClick={() => setSettingsOpen(true)} aria-label="Réglages" style={{
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

      {/* Pages */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div key={pageIndex} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
          {(() => {
            const page = pages[pageIndex]
            if (!page) return null
            if (page.type === 'map') {
              return (
                <CyclingPage2
                  isDark={isDark}
                  distanceM={gps.distance}
                  trackPoints={trackPoints}
                  currentPosition={currentPosition}
                  onExpand={() => setNavOpen(true)}
                />
              )
            }
            return (
              <CyclingPageData
                page={page}
                isDark={isDark}
                durationSec={stopwatch.seconds}
                distanceM={gps.distance}
                speedKmh={gps.currentSpeed}
                elevationGainM={gps.elevationGain}
                altitudeM={gps.currentAltitude ?? 0}
                currentLapSec={currentLapSec}
                currentLapDistanceM={currentLapDistance}
                dataFontFamily={dataFontFamily}
              />
            )
          })()}
        </div>

        {/* Page dots */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {pages.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === pageIndex ? '#06B6D4' : labelColor,
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      </div>

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

      {/* Navigation plein écran (dispo même sans parcours ; guidage si parcours) */}
      {navOpen && (
        <RouteNavScreen route={route ?? null} sport="cycling" showWatts isDark={isDark} hr={null} watts={null} elapsedSec={stopwatch.seconds} distanceDoneM={gps.distance} gainDoneM={gps.elevationGain} onClose={() => setNavOpen(false)} />
      )}

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
