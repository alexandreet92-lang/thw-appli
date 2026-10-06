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
import LiveFrame from './kit/LiveFrame'
import { useBackgroundTracking } from '@/hooks/useBackgroundTracking'
import LiveNoticeBanner, { useLiveNotice, useVibrate, useLapBeepSound } from './LiveNoticeBanner'
import { primeLapBeep } from './lapBeep'
import ExitConfirmOverlay from './ExitConfirmOverlay'
import SkiSummary, { type SkiSnap } from './SkiSummary'
import SessionSaveForm, { type SessionFormData } from './SessionSaveForm'
import { useSkiConfig } from '@/hooks/useSkiConfig'
import { useSkiSettings } from '@/hooks/useSkiSettings'
import { useSkiTracking } from '@/hooks/useSkiTracking'
import { FONT_OPTIONS } from '@/types/cycling'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import PhotoButton, { type PhotoButtonHandle } from './PhotoButton'
import PhotoPreviewToast from './PhotoPreviewToast'

const PAGE_COUNT = 3
interface Props { onExit: () => void; onFinished: () => void }

export default function SkiScreen({ onExit, onFinished }: Props) {
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
  const [skiType, setSkiType] = useState<'ski' | 'snowboard'>('ski')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [finishedSnap, setFinishedSnap] = useState<SkiSnap | null>(null)
  const snapRef = useRef<SkiSnap | null>(null)
  const photoRef = useRef<PhotoButtonHandle>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { pages } = useSkiConfig()
  const { settings, updateSetting } = useSkiSettings()
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
  // Suivi GPS en arrière-plan tant que la séance tourne (pause incluse).
  useBackgroundTracking(phase !== 'ready', () => showNotice('rec.bgLockHint'))
  const stopwatch = useStopwatch(phase === 'running' && !autoPaused)
  const { stats: ski, update: skiUpdate, reset: skiReset } = useSkiTracking(phase === 'running')

  // Alerte perte de signal GPS (alerts.gpsLost) — sur transition ok → perdu.
  const gpsLostOn = settings.alerts.gpsLost
  const gpsWasOkRef = useRef(true)
  useEffect(() => {
    if (phase !== 'running' || !gpsLostOn) return
    const lost = gps.status === GPSStatus.poor || gps.status === GPSStatus.error || gps.status === GPSStatus.unavailable
    if (lost && gpsWasOkRef.current) { gpsWasOkRef.current = false; showNotice('record.alertGpsLost') }
    if (!lost) gpsWasOkRef.current = true
  }, [gps.status, phase, gpsLostOn, showNotice])

  // Alerte vitesse max (alerts.maxSpeedAlert, km/h, 0 = off) — sur
  // franchissement du seuil, réarmée quand la vitesse redescend en dessous.
  const maxSpeedTh = settings.alerts.maxSpeedAlert
  const speedArmedRef = useRef(true)
  useEffect(() => {
    if (phase !== 'running' || maxSpeedTh <= 0) return
    const over = (gps.currentSpeed ?? 0) >= maxSpeedTh
    if (over && speedArmedRef.current) { speedArmedRef.current = false; showNotice('record.alertMaxSpeed') }
    if (!over) speedArmedRef.current = true
  }, [gps.currentSpeed, phase, maxSpeedTh, showNotice])

  useEffect(() => {
    if (phase !== 'running') return
    skiUpdate(gps.currentSpeed, gps.gradient ?? 0, gps.distance, gps.currentAltitude ?? 0)
  }, [gps.currentSpeed, gps.gradient, gps.distance, gps.currentAltitude, phase, skiUpdate])



  // primeLapBeep : l'AudioContext doit naître sur un geste utilisateur (iOS).
  const handleStart = () => { primeLapBeep(); resetTracking(); skiReset(); gpsWasOkRef.current = true; speedArmedRef.current = true; setStartedAt(Date.now()); setPhase('running') }
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
      const user = await getCurrentUser()
      if (user) {
        const { data: skiData } = await sb.from('workout_sessions').insert({ user_id: user.id, sport: snap.skiType, started_at: snap.startedAtISO, ended_at: snap.endedAtISO, duration_seconds: snap.durationSec, distance_m: snap.distM, elevation_gain_m: snap.elevGainM, avg_speed_kmh: snap.avgSpeedKmh, max_speed_kmh: snap.maxSpeedKmh, gps_track: snap.gpsPts, calories: snap.calories, status: 'completed', title: formData.title, training_types: formData.trainingTypes, rpe: formData.rpe, comment: formData.comment }).select('id').single()
        const skiSavedId = skiData?.id ?? null
        if (skiSavedId) await photoRef.current?.flushToSession(skiSavedId, gps.currentLat ?? undefined, gps.currentLng ?? undefined)
        await sb.from('activities').insert({ user_id: user.id, sport_type: snap.skiType, title: formData.title, started_at: snap.startedAtISO, distance_m: snap.distM, moving_time_s: snap.durationSec, elapsed_time_s: snap.durationSec, elevation_gain_m: snap.elevGainM, avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0, max_speed_ms: snap.maxSpeedKmh / 3.6, calories: snap.calories })
      }
    } catch (e) { console.error('[ski] save error:', e) }
    setShowSaveForm(false)
    // Réglage postRun.showSummary : si désactivé, on ferme directement.
    if (!settings.postRun.showSummary) { onFinished(); return }
    setFinishedSnap(snapRef.current)
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
      title={skiType === 'ski' ? 'Ski' : 'Snowboard'}
      phase={phase}
      autoPaused={autoPaused}
      gpsStatus={gps.status}
      gpsAccuracy={gps.accuracy}
      onClose={() => { if (phase === 'ready') onExit(); else setExitConfirmOpen(true) }}
      closeLabel={t('record.skiExit')}
      onSettings={() => setSettingsOpen(true)}
      settingsLabel={t('record.skiSettingsAria')}
      pageCount={dotCount}
      pageIndex={pageIndex}
      onPageChange={setPageIndex}
      below={phase === 'ready' ? (
        // Ski / Snowboard : segment iOS sous l'en-tête (avant le départ).
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 8px' }}>
          <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)' }}>
            {(['ski', 'snowboard'] as const).map(type => (
              <button key={type} type="button" onClick={() => setSkiType(type)} className="rk-press"
                style={{ minHeight: 40, padding: '0 18px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: skiType === type ? 800 : 600,
                  background: skiType === type ? 'var(--surface-card)' : 'transparent', color: skiType === type ? 'var(--text)' : 'var(--text-mid)',
                  boxShadow: skiType === type ? 'var(--shadow-capsule)' : 'none', transition: 'background-color 200ms ease, color 200ms ease' }}>
                {type === 'ski' ? 'Ski' : 'Snowboard'}
              </button>
            ))}
          </div>
        </div>
      ) : undefined}
      banners={<LiveNoticeBanner noticeKey={noticeKey} />}
      overlays={<>
        {(phase === 'running' || phase === 'paused') && (
          <div style={{ position: 'absolute', bottom: 'calc(150px + env(safe-area-inset-bottom))', left: 16, zIndex: 100 }}>
            <PhotoButton ref={photoRef} onPreview={url => setPreviewUrl(url)} currentLat={gps.currentLat ?? undefined} currentLng={gps.currentLng ?? undefined} />
          </div>
        )}
        {previewUrl && <PhotoPreviewToast url={previewUrl} onDismiss={() => setPreviewUrl(null)} />}
        <CyclingControls phase={phase} gpsStatus={gps.status} gpsAccuracy={gps.accuracy} onStart={handleStart} onPause={handlePause} onResume={handleResume} onLap={() => {}} noLap onFinish={handleStop} onConfirmFinish={handleOpenSaveForm} isDark={isDark} />
        <SkiSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} settings={settings} updateSetting={updateSetting} />

        <ExitConfirmOverlay open={exitConfirmOpen} isDark={isDark} onQuit={() => { setExitConfirmOpen(false); onExit() }} onStay={() => setExitConfirmOpen(false)} />

        {gps.status === GPSStatus.denied && <GPSPermissionScreen isDark={isDark} />}
        {showPrePermission && <GPSPrePermissionScreen onAuthorize={handleGpsAuthorize} onDismiss={handleGpsDismiss} />}
        {showSaveForm && <SessionSaveForm sport="ski" startedAt={startedAtISO} onBack={() => setShowSaveForm(false)} onSave={handleSaveSession} isDark={isDark} onDiscard={() => { setShowSaveForm(false); onExit() }} />}
        {finishedSnap && <SkiSummary snap={finishedSnap} isDark={isDark} onClose={onFinished} />}
      </>}
    >
      {pageIndex === 0 && <SkiPage1 isDark={isDark} durationSec={stopwatch.seconds} speedKmh={gps.currentSpeed} maxSpeedKmh={gps.maxSpeed} distanceM={gps.distance} elevationLossM={ski.elevationLossM} altitudeM={gps.currentAltitude ?? 0} runCount={ski.runCount} dataFontFamily={dataFontFamily} units={settings.units} dataSize={settings.display.dataSize} />}
      {pageIndex === 1 && <SkiPage2 isDark={isDark} distanceM={gps.distance} trackPoints={trackPoints} currentPosition={currentPosition} />}
      {pageIndex === 2 && <SkiPage3 isDark={isDark} maxSpeedKmh={ski.maxSpeedRunKmh} avgSpeedRunKmh={ski.avgSpeedRunKmh} runCount={ski.runCount} totalRunDistanceM={ski.totalRunDistanceM} elevationLossM={ski.elevationLossM} phase={ski.phase} dataFontFamily={dataFontFamily} units={settings.units} dataSize={settings.display.dataSize} />}
    </LiveFrame>,
    document.body
  )
}
