'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import CyclingPage2 from './CyclingPage2'
import CyclingPageData from './CyclingPageData'
import CyclingSettings from './CyclingSettings'
import { useCyclingConfig } from '@/hooks/useCyclingConfig'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'

interface Lap {
  number: number
  duration: number
  distance: number
  avgSpeed: number
  timestamp: number
}

interface Props {
  onExit: () => void
  onFinished: () => void
}

export default function CyclingScreen({ onExit, onFinished }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [phase, setPhase] = useState<CyclingPhase>('ready')
  const [pageIndex, setPageIndex] = useState(0)
  const [laps, setLaps] = useState<Lap[]>([])
  const [currentLapSec, setCurrentLapSec] = useState(0)
  const [currentLapDistance, setCurrentLapDistance] = useState(0)
  const [lapStartDistance, setLapStartDistance] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { pages } = useCyclingConfig('cycling')
  const { settings } = useCyclingSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  const { gps, resetTracking } = useGPSTracking(true)
  useWakeLock(phase !== 'ready')
  const stopwatch = useStopwatch(phase === 'running')

  // Safety: reset pageIndex if pages shrink
  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(Math.max(0, pages.length - 1))
  }, [pages.length, pageIndex])

  // Lap timing
  useEffect(() => {
    if (phase !== 'running') return
    const i = setInterval(() => setCurrentLapSec(s => s + 1), 1000)
    return () => clearInterval(i)
  }, [phase])
  useEffect(() => {
    setCurrentLapDistance(gps.distance - lapStartDistance)
  }, [gps.distance, lapStartDistance])

  // Swipe vertical
  const touchRef = useRef<{ y: number; t: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { y: e.touches[0].clientY, t: Date.now() }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    const dt = Date.now() - touchRef.current.t
    touchRef.current = null
    if (dt > 600) return
    if (dy < -50) setPageIndex(i => Math.min(pages.length - 1, i + 1))
    else if (dy > 50) setPageIndex(i => Math.max(0, i - 1))
  }

  const handleStart  = () => { resetTracking(); setStartedAt(Date.now()); setPhase('running') }
  const handlePause  = () => setPhase('paused')
  const handleResume = () => setPhase('running')
  const handleLap = () => {
    if (currentLapSec === 0) return
    const lap: Lap = {
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
  const handleFinish = async () => {
    if (saving) return
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user && startedAt) {
        await sb.from('workout_sessions').insert({
          user_id: user.id,
          sport: 'cycling',
          started_at: new Date(startedAt).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: stopwatch.seconds,
          distance_m: gps.distance,
          elevation_gain_m: gps.elevationGain,
          avg_speed_kmh: gps.distance > 0 && stopwatch.seconds > 0
            ? (gps.distance / stopwatch.seconds) * 3.6 : 0,
          max_speed_kmh: gps.maxSpeed,
          gps_track: gps.points,
          laps,
          status: 'completed',
        })
      }
    } catch (e) {
      console.error('[record] save error:', e)
    } finally {
      setSaving(false)
      onFinished()
    }
  }

  if (!mounted) return null

  // Theme jour/nuit
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
          onClick={onExit}
          aria-label="Quitter"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: btnBg, color: text, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
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
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Réglages"
          style={{
            marginLeft: 'auto',
            width: 36, height: 36, borderRadius: '50%',
            background: btnBg, color: text, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Pages — padding bottom pour ne pas etre cache par les controls fixed */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Page courante (re-mount sur change → animation fade-in via key) */}
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

        {/* Indicateurs de page */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {pages.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === pageIndex ? '#06B6D4' : labelColor,
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Controls (position fixed bottom, z-9999 — defini dans le composant) */}
      <CyclingControls
        phase={phase}
        gpsStatus={gps.status}
        gpsAccuracy={gps.accuracy}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onLap={handleLap}
        onFinish={handleFinish}
        isDark={isDark}
      />

      {/* Settings panel */}
      <CyclingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
      />

      {gps.status === GPSStatus.denied && (
        <GPSPermissionScreen isDark={isDark} />
      )}
    </div>,
    document.body
  )
}
