'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useBackgroundTracking } from '@/hooks/useBackgroundTracking'
import { useStopwatch } from '@/hooks/useStopwatch'
import CyclingControls, { type CyclingPhase } from './CyclingControls'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import CyclingPage2 from './CyclingPage2'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import SessionTraceMap from './SessionTraceMap'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import { OPEN_WATER_BODIES } from '@/types/openwater'
import { useI18n } from '@/lib/i18n'
import LiveFrame, { LegacyCell, LegacyGrid } from './kit/LiveFrame'
import { useAppDark, rkScope, RkScreenIn, RkFab, RkFabSpacer, RkCta, RkHero, RkGrid, RkCell } from './kit/RecordKit'

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
  // Suivi GPS en arrière-plan tant que la séance tourne (pause incluse).
  useBackgroundTracking(phase !== 'ready')
  const stopwatch = useStopwatch(phase === 'running')

  // Suit le thème de l'app (cartes et carte claires le jour, sombres la nuit).
  const isDark = useAppDark()
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
      const user = await getCurrentUser()
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

  const waterLabel = (() => { const b = OPEN_WATER_BODIES.find(b => b.id === waterBody); return b?.labelKey ? t(b.labelKey) : b?.label })()
  const liveCells = [
    { l: t('record.openWaterDuration'), v: stopwatch.formatted },
    { l: t('record.openWaterPace100'), v: fmtPace(gps.distance, stopwatch.seconds), u: '/100 m' },
    { l: t('record.openWaterWaterTemp'), v: String(waterTemp), u: '°C' },
    { l: t('record.openWaterCalories'), v: String(Math.round(stopwatch.seconds / 60 * 7)), u: 'kcal' },
  ]

  const content = (
    <LiveFrame
      isDark={isDark}
      title={waterLabel ?? t('record.sportLabelOpenwater')}
      phase={phase}
      gpsStatus={gps.status}
      gpsAccuracy={gps.accuracy}
      onClose={onExit}
      closeLabel={t('w2c.close')}
      pageCount={1}
      pageIndex={0}
      onPageChange={() => { /* page unique */ }}
      below={phase === 'ready' ? (
        // Plan d'eau : puces sous l'en-tête (avant le départ).
        <div className="rk-chips" style={{ justifyContent: 'center', padding: '0 16px 8px', flexWrap: 'wrap' }}>
          {OPEN_WATER_BODIES.map(b => {
            const on = waterBody === b.id
            return (
              <button key={b.id} type="button" onClick={() => setWaterBody(b.id)} className="rk-chip rk-press"
                style={{ background: on ? 'var(--text)' : 'var(--surface-card)', color: on ? 'var(--bg)' : 'var(--text)' }}>
                {b.labelKey ? t(b.labelKey) : b.label}
              </button>
            )
          })}
        </div>
      ) : undefined}
      overlays={<>
        <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={() => setPhase('paused')} onResume={() => setPhase('running')} onLap={() => {}} noLap onFinish={handleStop} onConfirmFinish={handleOpenSave} isDark={isDark} />
        {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
        {showPrePerm && <GPSPrePermissionScreen onAuthorize={() => { localStorage.setItem('gps_permission_explained','true'); setShowPrePerm(false); setGpsEnabled(true) }} onDismiss={() => setShowPrePerm(false)} />}
        {showSaveForm && <SessionSaveForm sport="openwater" startedAt={startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()} onBack={() => setShowSaveForm(false)} onSave={handleSave} isDark={isDark} onDiscard={() => { setShowSaveForm(false); onExit() }} />}

        {/* Résumé (après enregistrement) */}
        {showSummary && (
          <RkScreenIn className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px', flexShrink: 0 }}>
              <RkFabSpacer />
              <div style={{ flex: 1, textAlign: 'center', fontSize: 19, fontWeight: 800 }}>{t('record.openWaterSessionDone')}</div>
              <RkFabSpacer />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ height: 260, flexShrink: 0, borderRadius: 'calc(var(--r-lg) + 4px)', overflow: 'hidden', background: 'var(--surface-card)' }}>
                <SessionTraceMap points={summaryPts} isDark={isDark} />
              </div>
              <LegacyGrid>
                <LegacyCell label={t('record.openWaterDistance')} value={(snapRef.current?.distM ?? 0) < 1000 ? String(snapRef.current?.distM ?? 0) : ((snapRef.current?.distM ?? 0) / 1000).toFixed(2)} unit={(snapRef.current?.distM ?? 0) < 1000 ? 'm' : 'km'} />
                <LegacyCell label={t('record.openWaterDuration')} value={`${String(Math.floor(stopwatch.seconds / 60)).padStart(2, '0')}:${String(stopwatch.seconds % 60).padStart(2, '0')}`} />
                <LegacyCell label={t('record.openWaterPace100')} value={fmtPace(snapRef.current?.distM ?? 0, snapRef.current?.durationSec ?? 0)} />
                <LegacyCell label={t('record.openWaterWaterShort')} value={`${waterTemp}°C`} unit={waterLabel} />
              </LegacyGrid>
            </div>
            <div style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)' }}>
              <RkCta variant="primary" onClick={onFinished}>{t('record.openWaterFinish')}</RkCta>
            </div>
          </RkScreenIn>
        )}
      </>}
    >
      {phase === 'ready' || phase === 'confirming_stop' ? (
        <CyclingPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} />
      ) : (
        <>
          <div className="rk-card" style={{ flexShrink: 0 }}>
            <RkHero label={t('record.openWaterDistance')} value={gps.distance < 1000 ? String(Math.round(gps.distance)) : (gps.distance / 1000).toFixed(2)} unit={gps.distance < 1000 ? 'm' : 'km'} size={72} />
            <RkGrid>
              {liveCells.map(c => <RkCell key={c.l} label={c.l} value={c.v} unit={c.u} size={34} />)}
            </RkGrid>
          </div>
          {/* Température de l'eau : réglage fin pendant la séance */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 }}>
            <RkFab label="−" onClick={() => setWaterTemp(v => Math.max(0, v - 0.5))}><span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>−</span></RkFab>
            <span className="rk-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>{t('record.openWaterWaterShort')} {waterTemp}°C</span>
            <RkFab label="+" onClick={() => setWaterTemp(v => Math.min(40, v + 0.5))}><span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>+</span></RkFab>
          </div>
        </>
      )}
    </LiveFrame>
  )

  return createPortal(content, document.body)
}
