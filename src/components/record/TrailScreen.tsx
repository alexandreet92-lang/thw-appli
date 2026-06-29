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
import SessionSummary from './SessionSummary'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import { savePendingSession } from '@/lib/offlineStorage'
import { useTrailConfig } from '@/hooks/useTrailConfig'
import { useTrailSettings } from '@/hooks/useTrailSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import type { FinishedSession, SessionLap } from '@/types/session'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import type { NavRouteInput } from './RouteNavScreen'
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
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSession, setFinishedSession] = useState<FinishedSession | null>(null)
  const snapRef = useRef<SessionSnap | null>(null)
  const prevAltRef = useRef<number | null>(null)
  const lapPrevAltRef = useRef<number | null>(null)

  const { pages } = useTrailConfig('trail')
  const { settings, updateSetting } = useTrailSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled)
  useWakeLock(phase !== 'ready')
  const stopwatch = useStopwatch(phase === 'running')

  useEffect(() => { if (phase !== 'running') return; const i = setInterval(() => setCurrentLapSec(s => s + 1), 1000); return () => clearInterval(i) }, [phase])
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
    if (dy < -50) setPageIndex(i => { const n = Math.max(PAGE_COUNT, pages.length); return (i + 1) % n })
    else if (dy > 50) setPageIndex(i => { const n = Math.max(PAGE_COUNT, pages.length); return (i - 1 + n) % n })
  }

  const handleStart = () => { resetTracking(); setElevationLossM(0); prevAltRef.current = null; lapPrevAltRef.current = null; setStartedAt(Date.now()); setPhase('running') }
  const handlePause = () => setPhase('paused')
  const handleResume = () => setPhase('running')
  const handleStop = () => setPhase('confirming_stop')
  const handleGpsAuthorize = () => { localStorage.setItem('gps_permission_explained', 'true'); setShowPrePermission(false); setGpsEnabled(true) }
  const handleGpsDismiss = () => setShowPrePermission(false)

  const handleLap = () => {
    if (currentLapSec === 0) return
    setLaps(prev => [...prev, { number: prev.length + 1, duration: currentLapSec, distance: currentLapDistance, avgSpeed: currentLapDistance > 0 ? (currentLapDistance / currentLapSec) * 3.6 : 0, timestamp: Date.now() }])
    setCurrentLapSec(0); setLapStartDistance(gps.distance)
    setLapElevGain(0); setLapElevLoss(0); lapPrevAltRef.current = gps.currentAltitude
  }

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
        const { data: { user } } = await sb.auth.getUser()
        if (user) savePendingSession({ user_id: user.id, sport: 'trail', started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, laps: snap.lapsSnap, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment, activity_sport_type: 'trail', avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6 })
      } catch (e) { console.error('[trail] offline save error:', e) }
    } else {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          const { data } = await sb.from('workout_sessions').insert({ user_id: user.id, sport: 'trail', started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, laps: snap.lapsSnap, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment }).select('id').single()
          savedId = data?.id ?? null
          await sb.from('activities').insert({ user_id: user.id, sport_type: 'trail', title: formData.title, started_at: snap.startedAtISO, distance_m: snap.distM, moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec, elevation_gain_m: snap.elevM, avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6, calories: snap.calories })
        }
      } catch (e) { console.error('[trail] save error:', e) }
    }
    setShowSaveForm(false)
    setFinishedSession({ id: savedId, started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevM, elevation_loss_m: snap.elevLossM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, calories: snap.calories, gps_points: snap.gpsPts, laps: snap.lapsSnap, title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment, sport: 'trail' })
  }

  if (!mounted) return null
  const hour = new Date().getHours()
  const isDark = hour < 7 || hour > 20
  const bg = isDark ? '#0A0A0A' : '#FFFFFF', text = isDark ? '#FFFFFF' : '#0A0A0A'
  const labelColor = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const btnBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
  const trackPoints = gps.points.map(p => ({ lat: p.lat, lng: p.lng }))
  const currentPosition: [number, number] | null = gps.currentLat != null && gps.currentLng != null ? [gps.currentLat, gps.currentLng] : null
  const startedAtISO = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()
  const dotCount = Math.max(PAGE_COUNT, pages.length)

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, backgroundColor:bg, color:text, display:'flex', flexDirection:'column', width:'100vw', height:'100dvh', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ height:48, flexShrink:0, display:'flex', alignItems:'center', padding:'0 12px', position:'relative' }}>
        <button onClick={onExit} aria-label="Quitter" style={{ width:36, height:36, borderRadius:'50%', background:btnBg, color:text, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <span style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', fontSize:13, color:labelColor, fontFamily:'DM Sans, sans-serif' }}>Trail</span>
        <button onClick={() => setSettingsOpen(true)} aria-label="Réglages" style={{ marginLeft:'auto', width:36, height:36, borderRadius:'50%', background:btnBg, color:text, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', paddingBottom:'calc(120px + env(safe-area-inset-bottom))' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div key={pageIndex} style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflowY:'auto' }}>
          {pageIndex === 0 && <TrailPage1 isDark={isDark} durationSec={stopwatch.seconds} distanceM={gps.distance} speedKmh={gps.currentSpeed} elevationGainM={gps.elevationGain} elevationLossM={elevationLossM} dataFontFamily={dataFontFamily} />}
          {pageIndex === 1 && <TrailPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} />}
          {pageIndex === 2 && <TrailPage3 isDark={isDark} gradientPercent={gps.gradient ?? 0} elevationGainM={gps.elevationGain} elevationLossM={elevationLossM} altitudeM={gps.currentAltitude ?? 0} lapElevGainM={lapElevGain} lapElevLossM={lapElevLoss} dataFontFamily={dataFontFamily} />}
          {pageIndex === 3 && <TrailPage4 isDark={isDark} currentLapSec={currentLapSec} currentLapDistanceM={currentLapDistance} gradientPercent={gps.gradient ?? 0} lapElevGainM={lapElevGain} lapElevLossM={lapElevLoss} dataFontFamily={dataFontFamily} />}
        </div>
        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:8 }}>
          {Array.from({ length: dotCount }).map((_, i) => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background: i === pageIndex ? '#F59E0B' : labelColor, transition:'background 0.2s' }} />)}
        </div>
      </div>

      {/* Navigation plein écran du parcours (si un parcours est chargé) */}
      {route && (
        <button onClick={() => setNavOpen(true)} aria-label="Navigation plein écran"
          style={{ position: 'absolute', bottom: 'calc(130px + env(safe-area-inset-bottom))', right: 16, zIndex: 100, width: 48, height: 48, borderRadius: '50%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
        </button>
      )}
      {navOpen && route && (
        <RouteNavScreen route={route} sport="trail" showWatts={false} hr={null} onClose={() => setNavOpen(false)} />
      )}

      <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={handlePause} onResume={handleResume} onLap={handleLap} onFinish={handleStop} onConfirmFinish={handleOpenSaveForm} isDark={isDark} />
      <TrailSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} settings={settings} updateSetting={updateSetting} />

      {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
      {showPrePermission && <GPSPrePermissionScreen onAuthorize={handleGpsAuthorize} onDismiss={handleGpsDismiss} />}
      {showSaveForm && <SessionSaveForm sport="trail" startedAt={startedAtISO} onBack={() => setShowSaveForm(false)} onSave={handleSaveSession} isDark={isDark} />}
      {finishedSession && <SessionSummary session={finishedSession} isDark={isDark} onClose={onFinished} />}
    </div>,
    document.body
  )
}
