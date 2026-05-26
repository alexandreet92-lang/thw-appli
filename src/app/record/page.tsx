'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import SportSelector, { type SportId, getSportIcon, getSportLabel } from '@/components/record/SportSelector'
import Toast from '@/components/record/Toast'
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
const FreeModeScreen   = dynamic(() => import('@/components/record/FreeModeScreen'),  { ssr: false })
const RouteCreator     = dynamic(() => import('@/components/record/RouteCreator'),    { ssr: false })
const ElevationChart   = dynamic(() => import('@/components/record/ElevationChart'),  { ssr: false })

type View = 'home' | 'cycling' | 'running' | 'trail' | 'hiking' | 'mtb' | 'swimming' | 'rowing' | 'workout'

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
}

export default function RecordPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const [sport, setSport] = useState<SportId>('cycling')
  const [sportSheetOpen, setSportSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [freeModeOpen, setFreeModeOpen] = useState(false)
  const [freeModesSport, setFreeModesSport] = useState<'gym' | 'hyrox'>('gym')
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [workoutTitle, setWorkoutTitle] = useState<string | undefined>()
  const [routeCreatorOpen, setRouteCreatorOpen] = useState(false)
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  const isDark = true

  const handleSelectSport = (s: SportId) => {
    setSport(s)
    setSportSheetOpen(false)
  }

  const handleStart = () => {
    if (sport === 'cycling') setView('cycling')
    else if (sport === 'running') setView('running')
    else if (sport === 'trail')   setView('trail')
    else if (sport === 'hiking')  setView('hiking')
    else if (sport === 'mtb')     setView('mtb')
    else if (sport === 'swim')    setView('swimming')
    else if (sport === 'rowing')  setView('rowing')
    else if (sport === 'strength' || sport === 'hyrox') setLauncherOpen(true)
    else setToast('Bientôt disponible')
  }

  if (view === 'cycling') {
    return (
      <>
        <CyclingScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast('Séance enregistrée'); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'running') {
    return (
      <>
        <RunningScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast('Séance enregistrée'); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'trail') {
    return (
      <>
        <TrailScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast('Séance enregistrée'); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'hiking') {
    return (
      <>
        <HikingScreen onExit={() => setView('home')} onFinished={() => { setToast('Séance enregistrée'); setView('home') }} />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'mtb') {
    return (
      <>
        <MTBScreen onExit={() => setView('home')} onFinished={() => { setToast('Séance enregistrée'); setView('home') }} />
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

  if (view === 'workout') {
    return (
      <WorkoutSession
        sport={sport === 'strength' ? 'gym' : 'hyrox'}
        exercises={workoutExercises}
        planTitle={workoutTitle}
        onClose={() => { setView('home'); setLauncherOpen(false) }}
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

      {/* Bouton retour — top-left, par-dessus la carte */}
      <button
        onClick={() => router.push('/')}
        aria-label="Retour"
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top))',
          left: 16,
          zIndex: 1000,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,0.60)',
          backdropFilter: 'blur(8px)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Panel bas — fixed, collé en bas de l'écran */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 999,
          height: activeRoute && activeRoute.elevation_profile.length > 1 ? 238 : 132,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.10)',
          transition: 'height 350ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>

        {/* Profil altimétrique si parcours chargé */}
        {activeRoute && activeRoute.elevation_profile.length > 1 && (
          <div style={{ padding: '8px 16px 0' }}>
            <ElevationChart data={activeRoute.elevation_profile} height={90} isDark={isDark} />
          </div>
        )}

        {/* 3 boutons */}
        <div style={{
          height: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 24px',
        }}>
          {/* GAUCHE — Sport */}
          <button
            onClick={() => setSportSheetOpen(true)}
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
            onClick={handleStart}
            aria-label="Démarrer"
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

          {/* DROITE — Parcours */}
          <button
            onClick={() => setRouteCreatorOpen(true)}
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
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Parcours</span>
          </button>
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
          onClose={() => setRouteCreatorOpen(false)}
          onLoadRoute={route => { setActiveRoute(route); setRouteCreatorOpen(false) }}
        />
      )}

      {(sport === 'strength' || sport === 'hyrox') && (
        <WorkoutLauncher
          sport={sport === 'strength' ? 'gym' : 'hyrox'}
          open={launcherOpen}
          onClose={() => setLauncherOpen(false)}
          onStart={(exs, title) => { setWorkoutExercises(exs); setWorkoutTitle(title); setLauncherOpen(false); setView('workout') }}
          onFreeMode={(s) => { setFreeModesSport(s); setLauncherOpen(false); setFreeModeOpen(true) }}
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
