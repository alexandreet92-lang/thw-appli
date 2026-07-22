'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import SportSelector, { type SportId, getSportIcon, getSportLabel } from '@/components/record/SportSelector'
import Toast from '@/components/record/Toast'
import { useI18n } from '@/lib/i18n'
import type { WorkoutExercise } from '@/types/workout'

const MapBackground    = dynamic(() => import('@/components/record/MapBackground'),    { ssr: false })
const CyclingScreen    = dynamic(() => import('@/components/record/CyclingScreen'),    { ssr: false })
const RunningScreen    = dynamic(() => import('@/components/record/RunningScreen'),    { ssr: false })
const TrailScreen      = dynamic(() => import('@/components/record/TrailScreen'),      { ssr: false })
const HikingScreen     = dynamic(() => import('@/components/record/HikingScreen'),    { ssr: false })
const MTBScreen        = dynamic(() => import('@/components/record/MTBScreen'),        { ssr: false })
const SwimmingForm     = dynamic(() => import('@/components/record/SwimmingForm'),     { ssr: false })
const RowingForm       = dynamic(() => import('@/components/record/RowingForm'),       { ssr: false })
const WorkoutLauncher  = dynamic(() => import('@/components/record/WorkoutLauncher'), { ssr: false })
const WorkoutSession   = dynamic(() => import('@/components/record/WorkoutSession'),  { ssr: false })
const SessionRunner    = dynamic(() => import('@/components/record/live/SessionRunner'), { ssr: false })
const FreeModeScreen   = dynamic(() => import('@/components/record/FreeModeScreen'),  { ssr: false })
const RouteCreator     = dynamic(() => import('@/components/record/RouteCreator'),    { ssr: false })
const YogaLauncher     = dynamic(() => import('@/components/record/YogaLauncher'),    { ssr: false })
const YogaSession      = dynamic(() => import('@/components/record/YogaSession'),     { ssr: false })
const BoxeLauncher     = dynamic(() => import('@/components/record/BoxeLauncher'),    { ssr: false })
const BoxeScreen       = dynamic(() => import('@/components/record/BoxeScreen'),      { ssr: false })
const ElevationChart   = dynamic(() => import('@/components/record/ElevationChart'),  { ssr: false })
const SkiScreen        = dynamic(() => import('@/components/record/SkiScreen'),       { ssr: false })
const PadelForm        = dynamic(() => import('@/components/record/PadelForm'),        { ssr: false })
const OpenWaterScreen  = dynamic(() => import('@/components/record/OpenWaterScreen'), { ssr: false })
const HomeTrainerScreen = dynamic(() => import('@/components/record/ride/RideScreen'), { ssr: false })
const TreadmillScreen  = dynamic(() => import('@/components/record/treadmill/TreadmillScreen'), { ssr: false })
const ManualEntrySheet = dynamic(() => import('@/components/record/ManualEntrySheet'), { ssr: false })

type View = 'home' | 'cycling' | 'running' | 'trail' | 'hiking' | 'mtb' | 'swimming' | 'rowing' | 'workout' | 'ski' | 'yoga' | 'padel' | 'openwater' | 'hometrainer' | 'treadmill'

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: { lat: number; lng: number }[]
  sport?: string
}

export default function RecordPage() {
  const { t } = useI18n()
  const [view, setView] = useState<View>('home')
  const [sport, setSport] = useState<SportId>('cycling')
  const [sportSheetOpen, setSportSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeLauncherSport, setActiveLauncherSport] = useState<'gym' | 'hyrox' | null>(null)

  const openLauncher = (sport: 'gym' | 'hyrox') => {
    if (activeLauncherSport && activeLauncherSport !== sport) {
      setActiveLauncherSport(null)
      setTimeout(() => setActiveLauncherSport(sport), 280)
    } else {
      setActiveLauncherSport(sport)
    }
  }
  const [freeModeOpen, setFreeModeOpen] = useState(false)
  const [freeModesSport, setFreeModesSport] = useState<'gym' | 'hyrox'>('gym')
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [workoutTitle, setWorkoutTitle] = useState<string | undefined>()
  const [routeCreatorOpen, setRouteCreatorOpen] = useState(false)
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  const [yogaLauncherOpen, setYogaLauncherOpen] = useState(false)
  const [yogaSessionOpen, setYogaSessionOpen] = useState(false)
  const [boxeLauncherOpen, setBoxeLauncherOpen] = useState(false)
  const [boxeConfig, setBoxeConfig] = useState<import('@/components/record/BoxeScreen').BoxeConfig | null>(null)
  const [yogaExercises, setYogaExercises] = useState<import('@/types/yoga').YogaSessionExercise[]>([])
  const [yogaTitle, setYogaTitle] = useState('')
  // Course à pied : choix Dehors (GPS) / Tapis (séance guidée) avant de lancer.
  const [runChoiceOpen, setRunChoiceOpen] = useState(false)
  // Création manuelle d'activité (tous sports).
  const [manualOpen, setManualOpen] = useState(false)

  // Sheet du bas (façon Strava) : replié = 3 boutons ; déplié = paramètres.
  // Drag qui suit le doigt en temps réel (hauteur pilotée en DOM, 0 re-render).
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const sheetTouchStartY = useRef(0)
  const sheetBaseH = useRef(0)
  const sheetDragged = useRef(false)
  const collapsedH = () => (activeRoute && activeRoute.elevation_profile.length > 1 ? 238 : 132)
  const expandedH = () => Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.82 : 560, 560)
  function sheetDragStart(e: React.TouchEvent) {
    const el = sheetRef.current; if (!el) return
    sheetTouchStartY.current = e.touches[0].clientY
    sheetBaseH.current = el.offsetHeight
    sheetDragged.current = false
    el.style.transition = 'none'
  }
  function sheetDragMove(e: React.TouchEvent) {
    const el = sheetRef.current; if (!el) return
    const dy = sheetTouchStartY.current - e.touches[0].clientY  // vers le haut = positif
    if (Math.abs(dy) > 5) sheetDragged.current = true
    const h = Math.max(collapsedH(), Math.min(expandedH(), sheetBaseH.current + dy))
    el.style.height = `${h}px`
  }
  function sheetDragEnd() {
    const el = sheetRef.current; if (!el) return
    el.style.transition = 'height 350ms cubic-bezier(0.16, 1, 0.3, 1)'
    const next = el.offsetHeight > (collapsedH() + expandedH()) / 2
    el.style.height = next ? 'min(82dvh, 560px)' : `${collapsedH()}px`
    setSheetExpanded(next)
  }
  // Réglages de session — togglés en local, mémorisés (logique détaillée plus tard).
  const [liveShare, setLiveShare]   = useState(false)
  const [audioAlerts, setAudioAlerts] = useState(false)
  const [autoPause, setAutoPause]   = useState(false)
  useEffect(() => {
    try {
      setLiveShare(localStorage.getItem('thw-rec-liveshare') === 'true')
      setAudioAlerts(localStorage.getItem('thw-rec-audio') === 'true')
      setAutoPause(localStorage.getItem('thw-rec-autopause') === 'true')
    } catch { /* ignore */ }
  }, [])
  const persist = (key: string, v: boolean) => { try { localStorage.setItem(key, String(v)) } catch { /* ignore */ } }

  // Suit le thème réel de l'app (classe html.dark) au lieu d'être figé en noir.
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const sync = () => setIsDark(el.classList.contains('dark'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const handleSelectSport = (s: SportId) => {
    setSport(s)
    setSportSheetOpen(false)
  }

  const handleStart = () => {
    if (sport === 'cycling') setView('cycling')
    else if (sport === 'running') setRunChoiceOpen(true)   // Dehors ou Tapis ?
    else if (sport === 'trail')   setView('trail')
    else if (sport === 'hiking')  setView('hiking')
    else if (sport === 'mtb')     setView('mtb')
    else if (sport === 'swim')    setView('swimming')
    else if (sport === 'rowing')  setView('rowing')
    else if (sport === 'ski')     setView('ski')
    else if (sport === 'strength' || sport === 'hyrox') openLauncher(sport === 'strength' ? 'gym' : 'hyrox')
    else if (sport === 'yoga')        setYogaLauncherOpen(true)
    else if (sport === 'boxe')        setBoxeLauncherOpen(true)
    else if (sport === 'padel')       setView('padel')
    else if (sport === 'openwater')   setView('openwater')
    else if (sport === 'hometrainer') setView('hometrainer')
    else setToast(t('record.pageComingSoon'))
  }

  if (view === 'cycling') {
    return (
      <>
        <CyclingScreen
          route={activeRoute}
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'running') {
    return (
      <>
        <RunningScreen
          route={activeRoute}
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'treadmill') {
    return (
      <>
        <TreadmillScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'trail') {
    return (
      <>
        <TrailScreen
          route={activeRoute}
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'hiking') {
    return (
      <>
        <HikingScreen onExit={() => setView('home')} onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }} />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'mtb') {
    return (
      <>
        <MTBScreen onExit={() => setView('home')} onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }} />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'ski') {
    return (
      <>
        <SkiScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'swimming') {
    return <SwimmingForm onClose={() => setView('home')} />
  }

  if (view === 'rowing') {
    return <RowingForm onClose={() => setView('home')} />
  }

  if (view === 'padel') {
    return <PadelForm onClose={() => setView('home')} />
  }

  if (view === 'openwater') {
    return (
      <>
        <OpenWaterScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'hometrainer') {
    return (
      <>
        <HomeTrainerScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'workout') {
    const closeWorkout = () => { setView('home'); setActiveLauncherSport(null) }
    // Muscu → nouveau moteur « Séance en direct » (plein écran, phases colorées).
    // Hyrox reste sur l'écran existant (hors périmètre de ce lot).
    if (sport === 'strength') {
      return <SessionRunner blocks={workoutExercises} planTitle={workoutTitle} onClose={closeWorkout} isDark={isDark} />
    }
    return (
      <WorkoutSession
        sport="hyrox"
        exercises={workoutExercises}
        planTitle={workoutTitle}
        onClose={closeWorkout}
        isDark={isDark}
      />
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Carte plein écran */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapBackground activeRoute={activeRoute} />
      </div>

      {/* Bulle « + » — saisie manuelle d'une activité (tous sports).
          Mobile : haut à DROITE (à hauteur du hamburger, le coin est libre).
          Desktop : à GAUCHE du bouton « Démarrer » du shell (qui occupe ~right
          108→228) pour ne PAS être caché par le bouton IA (shuriken, right 16).
          Visible uniquement sur /record (ce composant n'existe que là). */}
      <style>{`
        .thw-record-plus { position: fixed; top: calc(env(safe-area-inset-top) + 10px); right: 12px; }
        @media (min-width: 768px) { .thw-record-plus { top: 12px; right: 240px; } }
      `}</style>
      <button
        className="thw-record-plus"
        aria-label="Créer une activité manuellement"
        onClick={() => setManualOpen(true)}
        style={{
          width: 38, height: 38, borderRadius: 12, zIndex: 121,
          background: 'var(--bg)', border: '1px solid var(--border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>

      {/* Pas de bouton retour ici : la navigation passe par le hamburger
          (sidebar) du shell. Le retour réapparaît dans l'écran « créer un
          itinéraire » (RouteCreator), qui remplace le hamburger. */}

      {/* Panel bas — sheet glissable (replié : 3 boutons · déplié : paramètres) */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 999,
          height: sheetExpanded
            ? 'min(82dvh, 560px)'
            : (activeRoute && activeRoute.elevation_profile.length > 1 ? 238 : 132),
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.10)',
          transition: 'height 350ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Zone de préhension : un swipe vers le haut (n'importe où sur cette zone)
            déplie ; on attrape le haut et on tire vers le bas pour replier. Drag
            qui suit le doigt. Tap sur la poignée = bascule. */}
        <div
          onTouchStart={sheetDragStart}
          onTouchMove={sheetDragMove}
          onTouchEnd={sheetDragEnd}
          style={{ flexShrink: 0, touchAction: 'none' }}
        >
          <div onClick={() => { if (!sheetDragged.current) setSheetExpanded(e => !e) }}
            style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
          </div>

          {/* Profil altimétrique si parcours chargé */}
          {activeRoute && activeRoute.elevation_profile.length > 1 && (
            <div style={{ padding: '4px 16px 0' }}>
              <ElevationChart data={activeRoute.elevation_profile} height={90} isDark={isDark} />
            </div>
          )}

          {/* 3 boutons — toujours visibles */}
          <div style={{
            height: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            padding: '0 24px',
          }}>
          {/* GAUCHE — Sport */}
          <button
            onClick={() => { if (sheetDragged.current) return; setSportSheetOpen(true) }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--bg-card2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text)',
            }}>
              {getSportIcon(sport)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>
              {getSportLabel(sport)}
            </span>
          </button>

          {/* CENTRE — Démarrer */}
          <button
            onClick={() => { if (sheetDragged.current) return; handleStart() }}
            aria-label={t('record.pageStart')}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
              boxShadow: '0 4px 20px rgba(6,182,212,0.40)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.12s',
            }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
            onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          {/* DROITE — Parcours (ouvre la liste des parcours enregistrés) */}
          <button
            onClick={() => { if (sheetDragged.current) return; setRouteCreatorOpen(true) }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--bg-card2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="2.5"/>
                <circle cx="18" cy="18" r="2.5"/>
                <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>
              </svg>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>{t('record.pageRoutes')}</span>
          </button>
          </div>
        </div>

        {/* Paramètres de la séance — révélés en dépliant le sheet */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 4px 10px' }}>{t('record.pageSessionSettings')}</p>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {([
              { key: 'liveshare', label: t('record.pageLiveShareLabel'), sub: t('record.pageLiveShareSub'), on: liveShare,   set: (v: boolean) => { setLiveShare(v); persist('thw-rec-liveshare', v) },
                icon: <><circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M4.5 4.5a10 10 0 0 0 0 15M19.5 4.5a10 10 0 0 1 0 15"/></> },
              { key: 'audio',     label: t('record.pageAudioLabel'),        sub: t('record.pageAudioSub'),        on: audioAlerts, set: (v: boolean) => { setAudioAlerts(v); persist('thw-rec-audio', v) },
                icon: <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></> },
              { key: 'autopause', label: t('record.pageAutoPauseLabel'),     sub: t('record.pageAutoPauseSub'), on: autoPause,  set: (v: boolean) => { setAutoPause(v); persist('thw-rec-autopause', v) },
                icon: <><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></> },
            ] as const).map((row, i) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', color: 'var(--text-mid)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{row.icon}</svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{row.label}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: '2px 0 0', lineHeight: 1.4 }}>{row.sub}</p>
                </div>
                <button onClick={() => row.set(!row.on)} aria-label={row.label} style={{ width: 40, height: 23, borderRadius: 12, background: row.on ? 'var(--primary)' : 'var(--border-mid)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                  <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: row.on ? 20 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginTop: 12 }}>
            {([
              { key: 'sensor', label: t('record.pageAddSensorLabel'), sub: t('record.pageAddSensorSub'), icon: <><path d="M4 12h3l2-7 4 14 2-7h5"/></> },
              { key: 'gps',    label: t('record.pageGpsLabel'), sub: t('record.pageGpsSub'), icon: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></> },
            ] as const).map((row, i) => (
              <button key={row.key} onClick={() => setToast(t('record.pageComingSoon'))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'transparent', border: 'none', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', color: 'var(--text-mid)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{row.icon}</svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{row.label}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: '2px 0 0', lineHeight: 1.4 }}>{row.sub}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      <SportSelector
        open={sportSheetOpen}
        onClose={() => setSportSheetOpen(false)}
        onSelect={handleSelectSport}
        selectedSport={sport}
      />

      {routeCreatorOpen && (
        <RouteCreator
          isDark={isDark}
          initialView="library"
          onClose={() => setRouteCreatorOpen(false)}
          onLoadRoute={route => { setActiveRoute(route); setRouteCreatorOpen(false) }}
        />
      )}

      {activeLauncherSport && (
        <WorkoutLauncher
          key={activeLauncherSport}
          sport={activeLauncherSport}
          open={true}
          onClose={() => setActiveLauncherSport(null)}
          onStart={(exs, title) => { setWorkoutExercises(exs); setWorkoutTitle(title); setActiveLauncherSport(null); setView('workout') }}
          onFreeMode={(s) => { setFreeModesSport(s); setActiveLauncherSport(null); setFreeModeOpen(true) }}
          isDark={isDark}
        />
      )}

      {freeModeOpen && (
        <FreeModeScreen
          sport={freeModesSport}
          onClose={() => setFreeModeOpen(false)}
          isDark={isDark}
        />
      )}

      {yogaLauncherOpen && (
        <YogaLauncher
          open={yogaLauncherOpen}
          onClose={() => setYogaLauncherOpen(false)}
          onStart={(exs, title) => { setYogaExercises(exs); setYogaTitle(title); setYogaLauncherOpen(false); setYogaSessionOpen(true) }}
          isDark={isDark}
        />
      )}

      {yogaSessionOpen && (
        <YogaSession
          exercises={yogaExercises}
          title={yogaTitle}
          isDark={isDark}
          onClose={() => setYogaSessionOpen(false)}
        />
      )}

      {boxeLauncherOpen && (
        <BoxeLauncher
          open={boxeLauncherOpen}
          onClose={() => setBoxeLauncherOpen(false)}
          onStart={(config) => { setBoxeConfig(config); setBoxeLauncherOpen(false) }}
        />
      )}

      {boxeConfig && (
        <BoxeScreen
          config={boxeConfig}
          isDark={isDark}
          onClose={() => setBoxeConfig(null)}
        />
      )}

      {/* Course à pied : choix Dehors (GPS) ou Tapis (séance guidée) */}
      {runChoiceOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10040, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setRunChoiceOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 520, background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '18px 18px calc(env(safe-area-inset-bottom) + 20px)', color: 'var(--text)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 14px' }}>Course à pied</h2>
            {[
              { id: 'outdoor', label: 'Dehors', desc: 'Suivi GPS en extérieur', go: () => { setRunChoiceOpen(false); setView('running') } },
              { id: 'treadmill', label: 'Tapis', desc: 'Séance guidée · allure & pente', go: () => { setRunChoiceOpen(false); setView('treadmill') } },
            ].map(o => (
              <button key={o.id} onClick={o.go} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', marginBottom: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{o.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{o.desc}</div>
                </div>
                <span style={{ fontSize: 20, color: 'var(--text-dim)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {manualOpen && (
        <ManualEntrySheet
          onClose={() => setManualOpen(false)}
          onSaved={() => setToast(t('record.pageWorkoutSaved'))}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
