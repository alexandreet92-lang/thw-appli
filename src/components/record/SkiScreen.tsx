'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import SkiPage1 from './SkiPage1'
import SkiPage2 from './SkiPage2'
import SkiPage3 from './SkiPage3'
import SkiSettings from './SkiSettings'
import SkiSummary, { type SkiSnap } from './SkiSummary'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import { useSkiConfig } from '@/hooks/useSkiConfig'
import { useSkiSettings } from '@/hooks/useSkiSettings'
import { useSkiTracking } from '@/hooks/useSkiTracking'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'

const PAGE_COUNT = 3
interface Props { onExit: () => void; onFinished: () => void }

export default function SkiScreen({ onExit, onFinished }: Props) {
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
  const [skiType, setSkiType] = useState<'ski' | 'snowboard'>('ski')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSnap, setFinishedSnap] = useState<SkiSnap | null>(null)
  const snapRef = useRef<SkiSnap | null>(null)

  const { pages } = useSkiConfig()
  const { settings } = useSkiSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled)
  useWakeLock(phase !== 'ready')
  const stopwatch = useStopwatch(phase === 'running')
  const { stats: ski, update: skiUpdate, reset: skiReset } = useSkiTracking(phase === 'running')

  useEffect(() => {
    if (phase !== 'running') return
    skiUpdate(gps.currentSpeed, gps.gradient ?? 0, gps.distance, gps.currentAltitude ?? 0)
  }, [gps.currentSpeed, gps.gradient, gps.distance, gps.currentAltitude, phase, skiUpdate])

  const touchRef = useRef<{ y: number; t: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchRef.current = { y: e.touches[0].clientY, t: Date.now() } }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    const dt = Date.now() - touchRef.current.t
    touchRef.current = null
    if (dt > 600) return
    if (dy < -50) setPageIndex(i => Math.min(Math.max(PAGE_COUNT, pages.length) - 1, i + 1))
    else if (dy > 50) setPageIndex(i => Math.max(0, i - 1))
  }

  const handleStart = () => { resetTracking(); skiReset(); setStartedAt(Date.now()); setPhase('running') }
  const handlePause = () => setPhase('paused')
  const handleResume = () => setPhase('running')
  const handleStop = () => setPhase('confirming_stop')
  const handleGpsAuthorize = () => { localStorage.setItem('gps_permission_explained', 'true'); setShowPrePermission(false); setGpsEnabled(true) }
  const handleGpsDismiss = () => setShowPrePermission(false)

  const handleOpenSaveForm = () => {
    const endedAt = new Date()
    const durationSec = stopwatch.seconds
    const distM = Math.round(gps.distance)
    const avgSpeedKmh = distM > 0 && durationSec > 0 ? parseFloat(((distM / 1000) / (durationSec / 3600)).toFixed(1)) : 0
    snapRef.current = {
      startedAtISO: startedAt ? new Date(startedAt).toISOString() : endedAt.toISOString(),
      endedAtISO: endedAt.toISOString(), durationSec, distM,
      elevGainM: Math.round(gps.elevationGain), elevLossM: Math.round(ski.elevationLossM),
      avgSpeedKmh, maxSpeedKmh: parseFloat(gps.maxSpeed.toFixed(1)),
      maxSpeedRunKmh: parseFloat(ski.maxSpeedRunKmh.toFixed(1)),
      avgSpeedRunKmh: ski.avgSpeedRunKmh,
      totalRunSec: ski.totalRunSec + ski.currentRunSec, totalLiftSec: ski.totalLiftSec,
      runCount: ski.runCount, totalRunDistM: Math.round(ski.totalRunDistanceM),
      maxAltM: Math.round(ski.maxAltitudeM),
      calories: Math.round((durationSec / 3600) * 500), gpsPts: [...gps.points], skiType,
    }
    stopWatching(); setPhase('paused'); setShowSaveForm(true)
  }

  const handleSaveSession = async (formData: SessionFormData) => {
    const snap = snapRef.current
    if (!snap) return
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('workout_sessions').insert({ user_id: user.id, sport: snap.skiType, started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevGainM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment })
        await sb.from('activities').insert({ user_id: user.id, sport_type: snap.skiType, title: formData.title, started_at: snap.startedAtISO, distance_m: snap.distM, moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec, elevation_gain_m: snap.elevGainM, avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6, calories: snap.calories })
      }
    } catch (e) { console.error('[ski] save error:', e) }
    setShowSaveForm(false)
    setFinishedSnap(snapRef.current)
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
      {/* Header */}
      <div style={{ height:48, flexShrink:0, display:'flex', alignItems:'center', padding:'0 12px', gap:8 }}>
        <button onClick={onExit} aria-label="Quitter" style={{ width:36, height:36, borderRadius:'50%', background:btnBg, color:text, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <div style={{ display:'flex', gap:6, flex:1, justifyContent:'center' }}>
          {(['ski', 'snowboard'] as const).map(type => (
            <button key={type} onClick={() => setSkiType(type)} style={{ padding:'5px 14px', borderRadius:8, background: skiType===type ? 'rgba(6,182,212,0.15)' : btnBg, border:`1.5px solid ${skiType===type ? '#06B6D4' : 'transparent'}`, color: skiType===type ? '#06B6D4' : labelColor, fontSize:13, fontWeight:500, cursor:'pointer' }}>
              {type === 'ski' ? 'Ski' : 'Snowboard'}
            </button>
          ))}
        </div>
        <button onClick={() => setSettingsOpen(true)} aria-label="Réglages" style={{ width:36, height:36, borderRadius:'50%', background:btnBg, color:text, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      {/* Pages */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', paddingBottom:'calc(120px + env(safe-area-inset-bottom))' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div key={pageIndex} style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflowY:'auto' }}>
          {pageIndex === 0 && <SkiPage1 isDark={isDark} durationSec={stopwatch.seconds} speedKmh={gps.currentSpeed} maxSpeedKmh={gps.maxSpeed} distanceM={gps.distance} elevationLossM={ski.elevationLossM} altitudeM={gps.currentAltitude ?? 0} runCount={ski.runCount} dataFontFamily={dataFontFamily} />}
          {pageIndex === 1 && <SkiPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} />}
          {pageIndex === 2 && <SkiPage3 isDark={isDark} maxSpeedKmh={ski.maxSpeedRunKmh} avgSpeedRunKmh={ski.avgSpeedRunKmh} runCount={ski.runCount} totalRunDistanceM={ski.totalRunDistanceM} elevationLossM={ski.elevationLossM} phase={ski.phase} dataFontFamily={dataFontFamily} />}
        </div>
        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:8 }}>
          {Array.from({ length: dotCount }).map((_, i) => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background: i === pageIndex ? '#06B6D4' : labelColor, transition:'background 0.2s' }} />)}
        </div>
      </div>

      <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={handlePause} onResume={handleResume} onLap={() => {}} onFinish={handleStop} onConfirmFinish={handleOpenSaveForm} isDark={isDark} />
      <SkiSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} />

      {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
      {showPrePermission && <GPSPrePermissionScreen onAuthorize={handleGpsAuthorize} onDismiss={handleGpsDismiss} />}
      {showSaveForm && <SessionSaveForm sport="ski" startedAt={startedAtISO} onBack={() => setShowSaveForm(false)} onSave={handleSaveSession} isDark={isDark} />}
      {finishedSnap && <SkiSummary snap={finishedSnap} isDark={isDark} onClose={onFinished} />}
    </div>,
    document.body
  )
}
