'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import CyclingPage2 from './CyclingPage2'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import SessionTraceMap from './SessionTraceMap'
import { createClient } from '@/lib/supabase/client'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import { OPEN_WATER_BODIES } from '@/types/openwater'
import { useI18n } from '@/lib/i18n'

interface Props { onExit: () => void; onFinished: () => void }

function fmtPace(distM: number, sec: number) {
  if (distM < 5 || sec < 1) return '--:--'
  const s = Math.round(100 * sec / distM)
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
}

export default function OpenWaterScreen({ onExit, onFinished }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted]   = useState(false)
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [showPrePerm, setShowPrePerm] = useState(false)
  const [phase, setPhase]       = useState<CyclingPhase>('ready')
  const [waterBody, setWaterBody] = useState('lake')
  const [waterTemp, setWaterTemp] = useState(18)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryPts, setSummaryPts] = useState<GPSPoint[]>([])
  const snapRef = useRef<{ distM: number; durationSec: number; gpsPts: GPSPoint[]; calories: number }>( null as never)

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem('gps_permission_explained')) setGpsEnabled(true)
    else setShowPrePerm(true)
  }, [])

  const { gps, stopWatching, resetTracking } = useGPSTracking(gpsEnabled)
  useWakeLock(phase === 'running')
  const stopwatch = useStopwatch(phase === 'running')

  const isDark = true
  const bg = '#0A0A0A', text = '#FFF', dim = 'rgba(255,255,255,0.40)', btnBg = 'rgba(255,255,255,0.10)'
  const trackPoints = gps.points.map(p => ({ lat: p.lat, lng: p.lng }))
  const currentPosition: [number, number] | null = gps.currentLat != null && gps.currentLng != null ? [gps.currentLat, gps.currentLng] : null

  const handleStart = () => { resetTracking(); setStartedAt(Date.now()); setPhase('running') }
  const handleStop  = () => setPhase('confirming_stop')
  const handleOpenSave = () => {
    const distM = Math.round(gps.distance)
    const dur = stopwatch.seconds
    snapRef.current = { distM, durationSec: dur, gpsPts: [...gps.points], calories: Math.round(dur / 60 * 7) }
    stopWatching(); setPhase('paused'); setShowSaveForm(true)
  }

  const handleSave = async (formData: SessionFormData) => {
    const snap = snapRef.current
    if (!snap) return
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const now = Date.now()
        await sb.from('workout_sessions').insert({
          user_id: user.id, sport: 'openwater', title: formData.title,
          started_at: new Date(now - snap.durationSec * 1000).toISOString(), ended_at: new Date(now).toISOString(),
          duration_seconds: snap.durationSec, distance_m: snap.distM,
          gps_track: snap.gpsPts, calories: snap.calories, rpe: formData.rpe,
          comment: formData.comment, training_types: formData.trainingTypes, status: 'completed',
          water_body: waterBody, water_temp_c: waterTemp,
        })
        await sb.from('activities').insert({
          user_id: user.id, sport_type: 'openwater', title: formData.title,
          started_at: new Date(now - snap.durationSec * 1000).toISOString(),
          distance_m: snap.distM, moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec,
          avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, calories: snap.calories,
        })
      }
    } catch (e) { console.error('[openwater] save error:', e) }
    setSummaryPts(snapRef.current?.gpsPts ?? [])
    setShowSaveForm(false); setShowSummary(true)
  }

  if (!mounted) return null

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: bg, color: text, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Summary */}
      {showSummary && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: bg, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif' }}>{t('record.openWaterSessionDone')}</p>
            <button onClick={onFinished} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', borderRadius: 12, color: '#FFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('record.openWaterFinish')}</button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><SessionTraceMap points={summaryPts} isDark={isDark} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { l: t('record.openWaterDistance'), v: `${(snapRef.current?.distM ?? 0) / 1000 < 1 ? snapRef.current?.distM + 'm' : ((snapRef.current?.distM ?? 0) / 1000).toFixed(2) + 'km'}` },
              { l: t('record.openWaterDuration'),    v: `${String(Math.floor(stopwatch.seconds/60)).padStart(2,'0')}:${String(stopwatch.seconds%60).padStart(2,'0')}` },
              { l: t('record.openWaterPace100'), v: fmtPace(snapRef.current?.distM ?? 0, snapRef.current?.durationSec ?? 0) },
              { l: t('record.openWaterWaterShort'), v: `${waterTemp}°C — ${(() => { const b = OPEN_WATER_BODIES.find(b => b.id === waterBody); return b?.labelKey ? t(b.labelKey) : b?.label })()}` },
            ].map(({ l, v }) => (
              <div key={l} style={{ padding: '14px 8px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>{l}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
        <button onClick={onExit} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {OPEN_WATER_BODIES.map(b => (
            <button key={b.id} onClick={() => setWaterBody(b.id)} style={{ padding: '4px 12px', borderRadius: 8, background: waterBody === b.id ? 'rgba(6,182,212,0.15)' : btnBg, border: `1.5px solid ${waterBody === b.id ? '#06B6D4' : 'transparent'}`, color: waterBody === b.id ? '#06B6D4' : dim, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{b.labelKey ? t(b.labelKey) : b.label}</button>
          ))}
        </div>
      </div>

      {/* Main data */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
        {phase === 'ready' || phase === 'confirming_stop' ? (
          <div style={{ flex: 1, minHeight: 0 }}>
            <CyclingPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: dim, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>{t('record.openWaterDistance')}</p>
              <p style={{ fontSize: 64, fontWeight: 700, margin: 0, lineHeight: 1 }}>{gps.distance < 1000 ? `${Math.round(gps.distance)}m` : `${(gps.distance/1000).toFixed(2)}km`}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%', maxWidth: 300 }}>
              {[
                { l: t('record.openWaterDuration'),       v: stopwatch.formatted },
                { l: t('record.openWaterPace100'), v: fmtPace(gps.distance, stopwatch.seconds) },
                { l: t('record.openWaterWaterTemp'),   v: `${waterTemp}°C` },
                { l: t('record.openWaterCalories'),    v: `${Math.round(stopwatch.seconds / 60 * 7)} kcal` },
              ].map(({ l, v }) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>{l}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setWaterTemp(t => Math.max(0, t - 0.5))} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', fontSize: 18 }}>−</button>
              <span style={{ fontSize: 14, color: dim }}>{t('record.openWaterWaterShort')} {waterTemp}°C</span>
              <button onClick={() => setWaterTemp(t => Math.min(40, t + 0.5))} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', fontSize: 18 }}>+</button>
            </div>
          </div>
        )}
      </div>

      <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={() => setPhase('paused')} onResume={() => setPhase('running')} onLap={() => {}} onFinish={handleStop} onConfirmFinish={handleOpenSave} isDark={isDark} />
      {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
      {showPrePerm && <GPSPrePermissionScreen onAuthorize={() => { localStorage.setItem('gps_permission_explained','true'); setShowPrePerm(false); setGpsEnabled(true) }} onDismiss={() => setShowPrePerm(false)} />}
      {showSaveForm && <SessionSaveForm sport="openwater" startedAt={startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()} onBack={() => setShowSaveForm(false)} onSave={handleSave} isDark={isDark} />}
    </div>
  )

  return createPortal(content, document.body)
}
