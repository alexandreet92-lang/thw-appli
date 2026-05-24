'use client'
import { useState, useRef, useEffect } from 'react'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import CyclingDataPage from './CyclingDataPage'
import type { Lap } from './LapsList'
import { createClient } from '@/lib/supabase/client'

const PAGES = 3

interface Props {
  onExit: () => void
  onFinished: () => void
}

export default function CyclingScreen({ onExit, onFinished }: Props) {
  const [phase, setPhase] = useState<CyclingPhase>('ready')
  const [pageIndex, setPageIndex] = useState(0)
  const [laps, setLaps] = useState<Lap[]>([])
  const [currentLapSec, setCurrentLapSec] = useState(0)
  const [currentLapDistance, setCurrentLapDistance] = useState(0)
  const [lapStartDistance, setLapStartDistance] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const gps = useGPSTracking(phase === 'running')
  const stopwatch = useStopwatch(phase === 'running')

  // Track current lap timing
  useEffect(() => {
    if (phase !== 'running') return
    const i = setInterval(() => setCurrentLapSec(s => s + 1), 1000)
    return () => clearInterval(i)
  }, [phase])
  useEffect(() => {
    setCurrentLapDistance(gps.distance - lapStartDistance)
  }, [gps.distance, lapStartDistance])

  // Swipe pages (vertical)
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
    if (dy < -50) setPageIndex(i => Math.min(PAGES - 1, i + 1))
    else if (dy > 50) setPageIndex(i => Math.max(0, i - 1))
  }

  const handleStart = () => { setStartedAt(Date.now()); setPhase('running') }
  const handlePause = () => setPhase('paused')
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

  const trackPoints = gps.points.map(p => ({ lat: p.lat, lng: p.lng }))

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-[#0A0A0A] text-white"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="h-12 flex-shrink-0 flex items-center px-3 relative">
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="Quitter"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-sm text-white/60">Vélo</span>
        <button
          className="ml-auto w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="Paramètres"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Pages */}
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <CyclingDataPage
          pageIndex={pageIndex}
          speedKmh={gps.currentSpeed}
          distanceM={gps.distance}
          durationSec={stopwatch.seconds}
          elevationGainM={gps.elevationGain}
          laps={laps}
          currentLapSec={currentLapSec}
          currentLapDistance={currentLapDistance}
          trackPoints={trackPoints}
        />
        {/* Page indicators */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {Array.from({ length: PAGES }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors
                          ${i === pageIndex ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <CyclingControls
        phase={phase}
        gpsReady={gps.available}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onLap={handleLap}
        onFinish={handleFinish}
      />
    </div>
  )
}
