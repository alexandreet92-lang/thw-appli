'use client'
import { useState, useEffect, useRef } from 'react'
import { haptic } from '@/lib/haptics'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import SportSelector, { type SportId, getSportIcon, getSportLabel, getSportColor } from '@/components/record/SportSelector'
import { stopLiveShare, currentLiveShareId } from '@/lib/community/liveShare'
import { motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { checkNativeGeoPermission, ensureNativeGeoPermission, type GeoPermission } from '@/lib/native/geo'
import { isNativeApp } from '@/lib/native/platform'
import { openAppSettings } from '@/lib/native/appSettings'
import { subscribeSensors, getSensorState, autoReconnectSensors, type SensorState } from '@/lib/sensors/bluetooth'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { weekStartStr, mondayIndex } from '@/lib/date/weekStart'
import {
  rkScope, RkFab, RkIco, RK_ICON, RkStatusPill, RK_DOT, RkGroup, RkRow, RkTile, RkToggle, RkChip,
  RkStartButton, RkSectionLabel, RkSheet, RkActionSheet, type RkMapLayer,
} from '@/components/record/kit/RecordKit'
import SnapSheet, { useMeasure, useSafeTop, useViewportHeight } from '@/components/record/kit/SnapSheet'
import Toast from '@/components/record/Toast'
import { useI18n } from '@/lib/i18n'
import type { WorkoutExercise } from '@/types/workout'
import { getGuideDemoId, GUIDE_DEMO_EVENT } from '@/components/guide/guideDemo'
import { GuideLiveDemo } from '@/components/guide/GuideLiveDemo'

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
const SensorSheet      = dynamic(() => import('@/components/record/SensorSheet'),      { ssr: false })
const GpsSettingsSheet = dynamic(() => import('@/components/record/GpsSettingsSheet'), { ssr: false })
const LiveShareSheet   = dynamic(() => import('@/components/record/LiveShareSheet'),   { ssr: false })
const PlannedLaunchSheet = dynamic(() => import('@/components/record/PlannedLaunchSheet'), { ssr: false })

type View = 'home' | 'cycling' | 'running' | 'trail' | 'hiking' | 'mtb' | 'swimming' | 'rowing' | 'workout' | 'ski' | 'yoga' | 'padel' | 'openwater' | 'hometrainer' | 'treadmill'

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: { lat: number; lng: number }[]
  sport?: string
  name?: string | null
  distance_m?: number | null
  elevation_gain_m?: number | null
}

// Convertit les blocs d'une séance rameur planifiée en pièces + totaux, pour
// pré-remplir le formulaire d'enregistrement (distance, durée, récup).
function rowingBlocksToPrefill(title: string, blocks: unknown[]): import('@/components/record/RowingForm').RowingPrefill {
  const pieces: { id: string; distanceM: number; durationSec: number; restSec: number }[] = []
  let seq = 0
  for (const raw of Array.isArray(blocks) ? blocks : []) {
    const b = raw as { mode?: string; reps?: number; distanceM?: number; durationMin?: number; effortMin?: number; recoveryMin?: number }
    const dist = Math.round(Number(b.distanceM) || 0)
    const reps = b.mode === 'interval' ? Math.max(1, Number(b.reps) || 1) : 1
    const durSec = Math.round((Number(b.effortMin ?? b.durationMin) || 0) * 60)
    const restSec = Math.round((Number(b.recoveryMin) || 0) * 60)
    for (let i = 0; i < reps; i++) pieces.push({ id: `p_${seq++}`, distanceM: dist, durationSec: durSec, restSec })
  }
  const distanceM = pieces.reduce((s, p) => s + p.distanceM, 0)
  const durationSec = pieces.reduce((s, p) => s + p.durationSec, 0)
  return { title, pieces: pieces.length ? pieces : undefined, distanceM: distanceM || undefined, durationSec: durationSec || undefined }
}

const EST_KMH: Record<string, number> = { cycling: 25, gravel: 22, mtb: 15, trail: 9, running: 10, hiking: 4.5, walking: 4.5, ski: 8 }
/** Durée estimée « 2 h 10 » / « 45 min » selon la vitesse moyenne du sport. */
function estDurationLabel(distanceM: number, sport: string): string {
  const sec = (distanceM / 1000) / (EST_KMH[sport] ?? 18) * 3600
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}
function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, r = Math.PI / 180
  const dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

export default function RecordPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const [sport, setSport] = useState<SportId>('cycling')
  const [sportSheetOpen, setSportSheetOpen] = useState(false)
  const [sensorSheetOpen, setSensorSheetOpen] = useState(false)
  const [gpsSheetOpen, setGpsSheetOpen] = useState(false)
  const [liveShareSheetOpen, setLiveShareSheetOpen] = useState(false)
  const [liveShareId, setLiveShareId] = useState<string | null>(null)
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
  // « Changer l'itinéraire » depuis la feuille de contrôle live (événement global).
  const [liveRoutePickerOpen, setLiveRoutePickerOpen] = useState(false)
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  // Point qui suit le survol du profil altimétrique → affiché sur la carte.
  const [routeCursor, setRouteCursor] = useState<{ lat: number; lng: number } | null>(null)
  const [yogaLauncherOpen, setYogaLauncherOpen] = useState(false)
  const [yogaSessionOpen, setYogaSessionOpen] = useState(false)
  const [boxeLauncherOpen, setBoxeLauncherOpen] = useState(false)
  const [hybridLauncherOpen, setHybridLauncherOpen] = useState(false)
  const [boxeConfig, setBoxeConfig] = useState<import('@/components/record/boxe/buildBoxeTimeline').BoxeSession | null>(null)
  // Rameur & Home trainer : launcher 3 sections (comme la muscu) avant de lancer.
  const [rowingLauncherOpen, setRowingLauncherOpen] = useState(false)
  const [rowingPrefill, setRowingPrefill] = useState<import('@/components/record/RowingForm').RowingPrefill | undefined>()
  const [htLauncherOpen, setHtLauncherOpen] = useState(false)
  // undefined = séance du jour (repli) ; null = sans programme ; string = séance choisie.
  const [htPlannedId, setHtPlannedId] = useState<string | null | undefined>(undefined)
  const [yogaExercises, setYogaExercises] = useState<import('@/types/yoga').YogaSessionExercise[]>([])
  const [yogaTitle, setYogaTitle] = useState('')
  // Course à pied : choix Dehors (GPS) / Tapis (séance guidée) avant de lancer.
  const [runChoiceOpen, setRunChoiceOpen] = useState(false)
  // Création manuelle d'activité (tous sports).
  const [manualOpen, setManualOpen] = useState(false)
  // DÉMO du guide : joue une vraie animation de séance live (chrono, blocs qui
  // défilent) sans toucher au vrai enregistrement. Piloté par « start:live-demo ».
  const [guideLive, setGuideLive] = useState(false)

  // Feuille du bas (façon Apple Plans), 3 crans glissés librement :
  // 0 = réduite (nom du parcours + Démarrer, carte entière visible),
  // 1 = moyenne (sport · parcours · séance du jour, profil, puces),
  // 2 = dépliée (+ réglages de séance).
  const [snap, setSnap] = useState(1)
  const sheetH = useMotionValue(0)
  const [sheetSettledH, setSheetSettledH] = useState(420)
  const safeTop = useSafeTop()
  const viewportH = useViewportHeight()
  const [mainRef, mainH] = useMeasure<HTMLDivElement>()
  const [summaryRef, summaryH] = useMeasure<HTMLDivElement>()
  const [footRef, footH] = useMeasure<HTMLDivElement>()
  const peekContentH = summaryH
  const defaultContentH = Math.max(summaryH + 1, mainH)
  // Hauteur visible au cran réduit (poignée 21 px + résumé + pied).
  const peekVis = 21 + summaryH + footH
  const peekVisRef = useRef(peekVis)
  peekVisRef.current = peekVis
  const summaryOpacity = useTransform(sheetH, h => Math.max(0, Math.min(1, 1 - (h - peekVisRef.current - 8) / 62)))
  const [summaryActive, setSummaryActive] = useState(false)
  useMotionValueEvent(sheetH, 'change', h => { const a = h < peekVisRef.current + 40; setSummaryActive(prev => (prev === a ? prev : a)) })
  const pillY = useTransform(sheetH, h => -(h + 12))
  // Fond de carte (Plan / Satellite / Hybride), « me localiser », position connue.
  const [mapLayer, setMapLayer] = useState<RkMapLayer>('std')
  const [layerSheetOpen, setLayerSheetOpen] = useState(false)
  const [recenterKey, setRecenterKey] = useState(0)
  const [mapPos, setMapPos] = useState<[number, number] | null>(null)
  useEffect(() => {
    try { const l = localStorage.getItem('thw-rec-layer'); if (l === 'std' || l === 'sat' || l === 'hyb') setMapLayer(l) } catch { /* ignore */ }
  }, [])
  // Réglages de session — togglés en local, mémorisés (logique détaillée plus tard).
  const [liveShare, setLiveShare]   = useState(false)
  const [audioAlerts, setAudioAlerts] = useState(false)
  const [autoPause, setAutoPause]   = useState(false)
  // Seuil de vitesse (km/h) sous lequel l'enregistrement se met en pause auto.
  const [autoPauseSpeed, setAutoPauseSpeed] = useState(3)
  useEffect(() => {
    try {
      // Partage en direct : « activé » seulement s'il existe VRAIMENT un partage
      // en cours (id en mémoire). Après un redémarrage, l'ancien 'true' mémorisé
      // donnait un interrupteur fantôme allumé sans partage actif.
      const activeId = currentLiveShareId()
      if (localStorage.getItem('thw-rec-liveshare') === 'true' && activeId) { setLiveShare(true); setLiveShareId(activeId) }
      else { setLiveShare(false); localStorage.setItem('thw-rec-liveshare', 'false') }
      setAudioAlerts(localStorage.getItem('thw-rec-audio') === 'true')
      setAutoPause(localStorage.getItem('thw-rec-autopause') === 'true')
      const sp = parseInt(localStorage.getItem('thw-rec-autopause-speed') ?? '3', 10)
      if ([1, 3, 5, 8].includes(sp)) setAutoPauseSpeed(sp)
    } catch { /* ignore */ }
  }, [])
  const persist = (key: string, v: boolean) => { try { localStorage.setItem(key, String(v)) } catch { /* ignore */ } }

  // Ordinateur (≥768px) : on ne lance pas d'activité de déplacement (vélo, trail…).
  const [isDesktopRec, setIsDesktopRec] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const u = () => setIsDesktopRec(mq.matches); u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
  }, [])
  // Défaut desktop : bascule un sport de déplacement vers Home Trainer.
  useEffect(() => {
    if (isDesktopRec && ['cycling', 'mtb', 'trail', 'hiking', 'swim', 'openwater', 'ski'].includes(sport)) {
      setSport('hometrainer')
    }
  }, [isDesktopRec]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Statut GPS de l'écran de départ (pilule centrale) ──
  // Montre la précision réelle avant de partir. Uniquement si l'athlète a déjà
  // accepté l'explication GPS (sinon la pré-permission reste gérée par l'écran live).
  const isGpsSport = ['cycling', 'mtb', 'running', 'trail', 'hiking', 'ski', 'openwater'].includes(sport)
  // Autorisation iOS RÉELLE (et non un simple drapeau local) : c'est elle qui
  // décide d'afficher « Autoriser la localisation » et d'activer le suivi.
  const [gpsPerm, setGpsPerm] = useState<GeoPermission>(isNativeApp() ? 'unknown' : 'granted')
  const gpsRequestedRef = useRef(false)
  // Demande l'autorisation (déclenche la fenêtre iOS). Refus / service coupé →
  // on ouvre les Réglages de l'app. Tap manuel (bouton) ou auto à l'ouverture.
  const requestGps = async (): Promise<void> => {
    if (!isNativeApp()) return
    // ensureNativeGeoPermission tente le natif PUIS, en repli, la voie WebKit
    // (navigator.geolocation) qui fonctionne sur iOS 15+ même quand la fenêtre
    // native ne s'affiche pas. Résout le blocage « Autoriser » en boucle.
    const r = await ensureNativeGeoPermission()
    setGpsPerm(r)
    // Refus réel (natif ET WebKit) ou service de localisation coupé → Réglages.
    if (r === 'denied' || r === 'disabled') void openAppSettings()
  }
  // À l'ouverture de l'écran (sport GPS, app native) : lit l'autorisation ;
  // si jamais demandée, affiche la fenêtre iOS tout de suite (comme Strava).
  useEffect(() => {
    if (!isNativeApp() || !isGpsSport || isDesktopRec || view !== 'home') return
    let alive = true
    void (async () => {
      const p = await checkNativeGeoPermission()
      if (!alive) return
      setGpsPerm(p)
      // Dès que ce n'est pas déjà accordé (y compris « refusé » côté natif), on
      // tente une fois : ensureNativeGeoPermission essaie le natif puis, en repli,
      // la voie WebKit (iOS 15+) qui débloque le cas où la fenêtre native ne
      // s'affiche jamais. Sans régression pour qui accorde le natif normalement
      // (la fenêtre native répond « granted » avant tout repli WebKit).
      if (p !== 'granted' && !gpsRequestedRef.current) {
        gpsRequestedRef.current = true
        const r = await ensureNativeGeoPermission()
        if (alive) setGpsPerm(r)
      }
    })()
    return () => { alive = false }
  }, [isGpsSport, isDesktopRec, view])
  // Retour au premier plan (ex. après être allé dans Réglages) : re-vérifie.
  useEffect(() => {
    if (!isNativeApp()) return
    let off: (() => void) | null = null
    void (async () => {
      try {
        const { App } = await import('@capacitor/app')
        const h = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void checkNativeGeoPermission().then(setGpsPerm)
        })
        off = () => { void h.remove() }
      } catch { /* plugin absent */ }
    })()
    return () => { off?.() }
  }, [])
  const gpsGranted = !isNativeApp() || gpsPerm === 'granted'
  const { gps: startGps } = useGPSTracking(view === 'home' && gpsGranted && isGpsSport && !isDesktopRec)

  // ── Capteurs BLE (puces Cardio / Puissance) ──
  const [sensors, setSensors] = useState<SensorState>(() => getSensorState())
  useEffect(() => subscribeSensors(() => setSensors(getSensorState())), [])
  // App native : reconnecte les capteurs mémorisés dès l'ouverture de l'écran.
  useEffect(() => { autoReconnectSensors() }, [])

  // ── Séance du jour (planning) pour le sport choisi ──
  interface TodaySession { id: string; title: string; durationMin: number | null; blocks: unknown[] }
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null)
  const [todayOn, setTodayOn] = useState(false)
  const plannedSport = (['cycling', 'mtb', 'hometrainer'].includes(sport) ? 'bike'
    : ['running', 'trail', 'hiking'].includes(sport) ? 'run'
    : ['swim', 'openwater'].includes(sport) ? 'swim'
    : sport === 'strength' ? 'gym'
    : ['hyrox', 'rowing', 'boxe', 'hybrid'].includes(sport) ? sport
    : null)
  useEffect(() => {
    setTodaySession(null); setTodayOn(false)
    if (!plannedSport) return
    let alive = true
    void (async () => {
      try {
        const user = await getCurrentUser()
        if (!user || !alive) return
        const now = new Date()
        const { data } = await createClient().from('planned_sessions')
          .select('id, title, duration_min, blocks')
          .eq('user_id', user.id).eq('sport', plannedSport)
          .eq('week_start', weekStartStr(now)).eq('day_index', mondayIndex(now))
          .limit(1)
        const row = (data ?? [])[0] as { id: string; title: string | null; duration_min: number | null; blocks: unknown[] | null } | undefined
        if (alive && row) setTodaySession({ id: row.id, title: row.title || t('rec.todaySession'), durationMin: row.duration_min, blocks: row.blocks ?? [] })
      } catch { /* silencieux : la ligne reste un lanceur */ }
    })()
    return () => { alive = false }
  }, [plannedSport, t])
  // Seuls le home trainer et le rameur pilotent leur lecteur depuis une séance planifiée.
  const todayDrivesPlayer = sport === 'hometrainer' || sport === 'rowing'

  // Le GUIDE lance / arrête la démo de séance live (« start:live-demo »).
  useEffect(() => {
    const apply = (id: string | null) => setGuideLive(id === 'start:live-demo')
    try { apply(getGuideDemoId()) } catch { /* ignore */ }
    const h = (e: Event) => apply((e as CustomEvent<{ id: string | null }>).detail?.id ?? null)
    window.addEventListener(GUIDE_DEMO_EVENT, h)
    return () => window.removeEventListener(GUIDE_DEMO_EVENT, h)
  }, [])

  // « Changer l'itinéraire » demandé depuis la feuille de contrôle live.
  // detail.mode : 'library' (parcours enregistrés) ou 'search' (adresse).
  const [liveRoutePickerMode, setLiveRoutePickerMode] = useState<'library' | 'search'>('library')
  useEffect(() => {
    const h = (e: Event) => {
      const mode = (e as CustomEvent<{ mode?: 'library' | 'search' }>).detail?.mode
      setLiveRoutePickerMode(mode === 'search' ? 'search' : 'library')
      setLiveRoutePickerOpen(true)
    }
    window.addEventListener('thw:live-change-route', h)
    return () => window.removeEventListener('thw:live-change-route', h)
  }, [])

  // Sélecteur de parcours réutilisable (bibliothèque OU recherche d'adresse),
  // monté par-dessus l'écran live pour changer l'itinéraire en cours.
  const liveRoutePicker = liveRoutePickerOpen ? (
    <RouteCreator
      isDark={isDark}
      initialView={liveRoutePickerMode === 'search' ? 'creating' : 'library'}
      onClose={() => setLiveRoutePickerOpen(false)}
      onLoadRoute={route => { setActiveRoute(route); setLiveRoutePickerOpen(false) }}
    />
  ) : null

  const handleSelectSport = (s: SportId) => {
    setSport(s)
    setSportSheetOpen(false)
  }

  const handleStart = () => {
    // Filet de sécurité : si on démarre un sport GPS sans autorisation, on la
    // demande (fenêtre iOS) — le suivi s'active dès qu'elle est accordée.
    if (isNativeApp() && isGpsSport && !isDesktopRec && gpsPerm !== 'granted') void requestGps()
    if (sport === 'cycling') setView('cycling')
    // Running : desktop → tapis direct (pas de sortie GPS possible sur ordi) ;
    // mobile → choix Dehors / Tapis.
    else if (sport === 'running') { if (isDesktopRec) setView('treadmill'); else setRunChoiceOpen(true) }
    else if (sport === 'trail')   setView('trail')
    else if (sport === 'hiking')  setView('hiking')
    else if (sport === 'mtb')     setView('mtb')
    else if (sport === 'swim')    setView('swimming')
    else if (sport === 'rowing') {
      if (todayOn && todaySession) { setRowingPrefill(rowingBlocksToPrefill(todaySession.title, todaySession.blocks)); setView('rowing') }
      else setRowingLauncherOpen(true)
    }
    else if (sport === 'ski')     setView('ski')
    else if (sport === 'strength' || sport === 'hyrox') openLauncher(sport === 'strength' ? 'gym' : 'hyrox')
    else if (sport === 'yoga')        setYogaLauncherOpen(true)
    else if (sport === 'boxe')        setBoxeLauncherOpen(true)
    else if (sport === 'hybrid')      setHybridLauncherOpen(true)
    else if (sport === 'padel')       setView('padel')
    else if (sport === 'openwater')   setView('openwater')
    else if (sport === 'hometrainer') {
      if (todayOn && todaySession) { setHtPlannedId(todaySession.id); setView('hometrainer') }
      else setHtLauncherOpen(true)
    }
    else setToast(t('record.pageComingSoon'))
  }

  // Démo guide : l'écran live animé prend tout l'espace (le halo du guide pointe
  // le chrono). Prioritaire sur toute autre vue tant que la démo est active.
  if (guideLive) {
    return <GuideLiveDemo dataGuide="rec-live-chrono" />
  }

  if (view === 'cycling') {
    return (
      <>
        <CyclingScreen
          route={activeRoute}
          onExit={() => setView('home')}
          onFinished={() => { setToast(t('record.pageWorkoutSaved')); setView('home') }}
        />
        {liveRoutePicker}
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
        {liveRoutePicker}
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
        {liveRoutePicker}
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
    return <RowingForm onClose={() => setView('home')} prefill={rowingPrefill} />
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
          plannedIdOverride={htPlannedId}
          // Séance terminée → enregistrée dans activities ; on emmène l'athlète
          // directement sur la page Training (/activities) pour la voir.
          onFinished={() => { setView('home'); router.push('/activities') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  if (view === 'workout') {
    const closeWorkout = () => { setView('home'); setActiveLauncherSport(null) }
    // Muscu ET Hyrox passent par le MÊME lecteur en direct que boxe/hybride
    // (BoxeScreen) : écran identique, données adaptées au sport.
    const liveSport = sport === 'strength' ? 'gym' : 'hyrox'
    return (
      <BoxeScreen
        session={{ title: workoutTitle || (liveSport === 'gym' ? 'Musculation' : 'Hyrox'), moves: [], circuits: [], sport: liveSport, workoutBlocks: workoutExercises }}
        isDark={isDark}
        onClose={closeWorkout}
      />
    )
  }

  // ── Pilule GPS (centre de l'en-tête) ──
  const gpsAcc = startGps.accuracy != null ? Math.max(1, Math.round(startGps.accuracy)) : null
  const gpsPill: { dot: string; text: string; live?: boolean } = !isGpsSport || isDesktopRec
    ? { dot: getSportColor(sport), text: t('rec.indoor') }
    : isNativeApp() && (gpsPerm === 'denied' || gpsPerm === 'disabled')
      ? { dot: 'var(--danger)', text: t('rec.gpsAllow') }
      : isNativeApp() && gpsPerm !== 'granted'
        ? { dot: RK_DOT.idle, text: t('rec.gpsAllow'), live: true }
        : startGps.status === GPSStatus.good
        ? { dot: RK_DOT.ok, text: t('rec.gpsPrecise', { acc: gpsAcc ?? 3 }) }
        : startGps.status === GPSStatus.approximate
          ? { dot: RK_DOT.warn, text: t('rec.gpsApprox', { acc: gpsAcc ?? 12 }) }
          : startGps.status === GPSStatus.denied || startGps.status === GPSStatus.error || startGps.status === GPSStatus.unavailable
            ? { dot: 'var(--danger)', text: t('rec.gpsOff') }
            : { dot: RK_DOT.idle, text: t('w2c.gpsSearching'), live: true }

  const route = activeRoute
  const routeKm = route?.distance_m != null ? (route.distance_m / 1000).toFixed(route.distance_m >= 100000 ? 0 : 1).replace('.', ',') : null
  const routeGain = route?.elevation_gain_m != null ? Math.round(route.elevation_gain_m) : null
  const routeEst = route?.distance_m ? estDurationLabel(route.distance_m, route.sport ?? sport) : null
  const routeStats = [routeKm ? `${routeKm} km` : null, routeGain != null ? `${routeGain} m D+` : null, routeEst ? `~${routeEst}` : null].filter(Boolean).join(' · ')
  const routeSub = route ? (routeStats || t('record.pageRoutes')) : t('rec.routeChoose')
  const todayDur = todaySession?.durationMin
    ? (todaySession.durationMin >= 60 ? `${Math.floor(todaySession.durationMin / 60)} h ${String(todaySession.durationMin % 60).padStart(2, '0')}` : `${todaySession.durationMin} min`)
    : null
  const showToday = !!plannedSport
  const profAlts = route && route.elevation_profile.length > 1 ? route.elevation_profile.map(p => p.altitudeM) : null
  const profMin = profAlts ? Math.round(Math.min(...profAlts)) : 0
  const profMax = profAlts ? Math.round(Math.max(...profAlts)) : 0
  const profKm = route && route.elevation_profile.length > 1 ? Math.round(route.elevation_profile[route.elevation_profile.length - 1].distanceM / 1000) : 0

  // Distance jusqu'au départ du parcours (pilule « Vous êtes à … du départ »).
  const userPos: [number, number] | null = startGps.currentLat != null && startGps.currentLng != null
    ? [startGps.currentLat, startGps.currentLng] : mapPos
  const distToStart = route && route.snapped_points.length > 1 && userPos
    ? haversineM(userPos[0], userPos[1], route.snapped_points[0].lat, route.snapped_points[0].lng) : null
  const distToStartLabel = distToStart == null ? null
    : distToStart < 1000 ? `${Math.max(10, Math.round(distToStart / 10) * 10)} m` : `${(distToStart / 1000).toFixed(1).replace('.', ',')} km`

  const openSettings = () => setSnap(2)
  // Zone visible de la carte : sous l'en-tête, au-dessus de la feuille.
  const fitTop = safeTop + 76
  const fitBottom = Math.min(sheetSettledH + 24, Math.max(160, viewportH - fitTop - 140))

  const settingRows = ([
    { key: 'liveshare', label: t('record.pageLiveShareLabel'), sub: t('record.pageLiveShareSub'), on: liveShare, color: 'var(--primary)', icon: RK_ICON.live,
      // Activé → la ligne ROUVRE la feuille (lien, arrêt) au lieu de couper le
      // partage. Seul cas de coupure directe : état fantôme sans id de partage.
      set: (v: boolean) => {
        if (!v && !liveShareId) { setLiveShare(false); persist('thw-rec-liveshare', false); void stopLiveShare(); return }
        setLiveShareSheetOpen(true)
      } },
    { key: 'audio', label: t('record.pageAudioLabel'), sub: t('record.pageAudioSub'), on: audioAlerts, color: 'var(--sport-gym)', icon: RK_ICON.sound,
      set: (v: boolean) => { setAudioAlerts(v); persist('thw-rec-audio', v) } },
    { key: 'autopause', label: t('record.pageAutoPauseLabel'), sub: t('record.pageAutoPauseSub'), on: autoPause, color: 'var(--sport-run)', icon: RK_ICON.pause,
      set: (v: boolean) => { setAutoPause(v); persist('thw-rec-autopause', v) } },
  ])

  const LAYER_LABEL: Record<RkMapLayer, string> = { std: t('record.routeCreatorLayerPlan'), sat: t('record.routeCreatorLayerSatellite'), hyb: t('record.routeCreatorLayerHybrid') }

  return (
    <div className={rkScope(isDark)} style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--surface-page)' }}>
      {/* Carte plein écran — cadrée sur la zone visible au-dessus de la feuille */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapBackground
          activeRoute={activeRoute}
          cursorPoint={routeCursor}
          currentPosition={userPos}
          layer={mapLayer}
          fitPadding={{ top: fitTop, bottom: fitBottom }}
          recenterKey={recenterKey}
          onPosition={p => { if (p && !mapPos) setMapPos(p) }}
        />
      </div>

      {/* En-tête flottant : retour · pilule GPS (verre) · couches + me localiser.
          Mobile : le retour recouvre exactement celui du shell (même action).
          Desktop : le retour est masqué (le rail de navigation gère la sortie). */}
      <style>{`
        .rk-rec-top { position: absolute; left: 0; right: 0; top: calc(env(safe-area-inset-top) + 7px); padding: 0 12px; z-index: 121; display: flex; align-items: flex-start; gap: 8px; pointer-events: none; }
        .rk-rec-top > * { pointer-events: auto; }
        @media (min-width: 768px) {
          .rk-rec-top { top: 12px; padding-left: 20px; }
          .rk-rec-close { visibility: hidden; }
          .rk-rec-sheet { left: 50% !important; right: auto !important; width: min(520px, calc(100% - 40px)); transform: translateX(-50%); }
        }
      `}</style>
      <div className="rk-rec-top">
        <span className="rk-rec-close">
          <RkFab label={t('w2c.close')} onClick={() => { if (window.history.length > 1) router.back(); else router.push('/') }}>
            <RkIco d={RK_ICON.back} size={22} sw={2.2} />
          </RkFab>
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', paddingTop: 0 }}>
          <RkStatusPill glass dot={gpsPill.dot} live={gpsPill.live} onClick={isGpsSport && !isDesktopRec ? () => {
            // Pas encore autorisé (natif) : la pilule déclenche la demande iOS
            // (ou ouvre les Réglages si refusé). Autorisé : réglages GPS & écran.
            if (isNativeApp() && gpsPerm !== 'granted') void requestGps()
            else setGpsSheetOpen(true)
          } : undefined}>
            {gpsPill.text}
          </RkStatusPill>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RkFab label={t('w2c.mapLayer')} onClick={() => setLayerSheetOpen(true)}>
            <RkIco d={RK_ICON.layers} size={19} />
          </RkFab>
          <RkFab label={t('rec.locateMe')} onClick={() => setRecenterKey(k => k + 1)}>
            <RkIco d={RK_ICON.locate} size={20} />
          </RkFab>
        </div>
      </div>

      {/* Pilule « Vous êtes à … du départ » : accompagne la feuille. */}
      {distToStartLabel && snap < 2 && (
        <motion.div style={{ y: pillY, position: 'absolute', left: 12, right: 12, bottom: 0, zIndex: 119, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <span className="rk-banner rk-glass rk-num" style={{ letterSpacing: 0, fontSize: 14, minHeight: 40, padding: '0 16px' }}>
            <RkIco d={RK_ICON.route} size={16} />
            {distToStart != null && distToStart < 30 ? t('rec.atStart') : t('rec.distToStart', { d: distToStartLabel })}
          </span>
        </motion.div>
      )}

      {/* Feuille du bas (façon Apple Plans) : 3 crans libres.
          Réduite = nom du parcours + Démarrer ; moyenne = sport · parcours ·
          séance du jour, profil, puces ; dépliée = réglages de séance. */}
      <SnapSheet
        className="rk-rec-sheet"
        snaps={[peekContentH, defaultContentH, 'full']}
        index={snap}
        onIndexChange={setSnap}
        onSettle={setSheetSettledH}
        heightMV={sheetH}
        topGap={64}
        ariaLabel={t('record.pageSessionSettings')}
        handleLabel={t('record.pageSessionSettings')}
        footer={
          <div ref={footRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 28px calc(14px + env(safe-area-inset-bottom))' }}>
            <SideAction label={t('record.pageRoutes')} onClick={() => setRouteCreatorOpen(true)}>
              <RkIco d={RK_ICON.route} size={22} />
            </SideAction>
            <RkStartButton guide="rec-start" label={t('w2c.start')} onClick={handleStart} size={96} />
            <SideAction label={t('w2c.settings')} active={snap === 2} onClick={() => setSnap(s => (s === 2 ? 1 : 2))}>
              <RkIco d={RK_ICON.sliders} size={22} />
            </SideAction>
          </div>
        }
      >
        <div style={{ position: 'relative', padding: '0 16px' }}>
          <div ref={mainRef} style={{ paddingBottom: 12 }}>
            {/* Sport · Parcours · Séance du jour */}
            <RkGroup tone="chip">
              <RkRow
                icon={<RkTile color={getSportColor(sport)}>{getSportIcon(sport)}</RkTile>}
                label={getSportLabel(sport)} sub={t('rec.sportRowSub')}
                onClick={() => setSportSheetOpen(true)} />
              <RkRow
                icon={<RkTile color={RK_DOT.ok}><RkIco d={RK_ICON.route} size={20} /></RkTile>}
                label={route?.name || t('rec.routeNone')} sub={routeSub}
                onClick={() => setRouteCreatorOpen(true)} />
              {showToday && (
                <RkRow
                  icon={<RkTile color="var(--primary)"><RkIco d={RK_ICON.calendar} size={20} /></RkTile>}
                  label={t('rec.todaySession')}
                  sub={todaySession ? [todaySession.title, todayDur].filter(Boolean).join(' · ') : t('rec.todayNone')}
                  onClick={todaySession && todayDrivesPlayer ? undefined : () => {
                    if (sport === 'hometrainer') setHtLauncherOpen(true)
                    else if (sport === 'rowing') setRowingLauncherOpen(true)
                    else if (sport === 'strength' || sport === 'hyrox') openLauncher(sport === 'strength' ? 'gym' : 'hyrox')
                    else router.push('/planning')
                  }}
                  right={todaySession && todayDrivesPlayer
                    ? <RkToggle on={todayOn} onChange={setTodayOn} label={t('rec.todaySession')} />
                    : undefined} />
              )}
            </RkGroup>

            {/* Profil altimétrique du parcours chargé (synchronisé avec la carte) */}
            {route && route.elevation_profile.length > 1 && (
              <div style={{ marginTop: 12, borderRadius: 'var(--r-lg)', background: 'var(--surface-soft)', padding: '12px 14px 10px', overflow: 'hidden' }}>
                <div className="rk-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>
                  <span>{t('rec.profileRange', { min: profMin, max: profMax })}</span>
                  <span>{profKm} km</span>
                </div>
                <ElevationChart
                  data={route.elevation_profile}
                  height={76}
                  compact
                  isDark={isDark}
                  snappedPoints={route.snapped_points}
                  onPositionChange={setRouteCursor}
                />
              </div>
            )}

            {/* Puces d'état : cardio, capteur, auto-pause (+ direct) */}
            <div className="rk-chips" style={{ margin: '12px -16px 0', padding: '2px 16px' }}>
              <RkChip dot={sensors.hrDevice ? RK_DOT.ok : RK_DOT.idle} off={!sensors.hrDevice} onClick={() => setSensorSheetOpen(true)}>
                {t('rec.chipCardio')}{sensors.hr != null ? <span className="rk-num" style={{ letterSpacing: 0 }}>{sensors.hr}</span> : null}
              </RkChip>
              <RkChip dot={sensors.powerDevice ? RK_DOT.ok : RK_DOT.idle} off={!sensors.powerDevice} onClick={() => setSensorSheetOpen(true)}>
                {t('rec.chipPower')}{sensors.power != null ? <span className="rk-num" style={{ letterSpacing: 0 }}>{sensors.power} W</span> : null}
              </RkChip>
              <RkChip dot={autoPause ? 'var(--primary)' : RK_DOT.idle} off={!autoPause} onClick={() => { const v = !autoPause; setAutoPause(v); persist('thw-rec-autopause', v) }}>
                {t('rec.chipAutoPause')}
              </RkChip>
              {liveShare && <RkChip dot={RK_DOT.rec} onClick={openSettings}>{t('rec.chipLive')}</RkChip>}
            </div>
          </div>

          {/* Réglages de séance (cran déplié) — listes groupées iOS */}
          <RkSectionLabel>{t('record.pageSessionSettings')}</RkSectionLabel>
          <RkGroup tone="chip">
            {settingRows.map(row => (
              <RkRow key={row.key}
                icon={<RkTile color={row.color}><RkIco d={row.icon} size={19} /></RkTile>}
                label={row.label} sub={row.sub}
                right={<RkToggle on={row.on} onChange={row.set} label={row.label} />} />
            ))}
            {/* Seuil de pause auto : l'enregistrement se met en pause sous cette vitesse. */}
            {autoPause && (
              <div className="rk-row" style={{ minHeight: 52 }}>
                <span className="rk-row-t"><b style={{ fontSize: 15 }}>{t('record.pageAutoPauseThreshold')}</b></span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {[1, 3, 5, 8].map(v => {
                    const on = autoPauseSpeed === v
                    return (
                      <button key={v} type="button" className="rk-press"
                        onClick={() => { setAutoPauseSpeed(v); try { localStorage.setItem('thw-rec-autopause-speed', String(v)) } catch { /* ignore */ } }}
                        style={{ minWidth: 44, height: 36, padding: '0 10px', borderRadius: 'var(--r-pill)', border: 'none', background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text)', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                        <span className="rk-num" style={{ letterSpacing: 0 }}>{v}</span>
                      </button>
                    )
                  })}
                  <span style={{ fontSize: 13, color: 'var(--text-mid)', marginLeft: 2 }}>km/h</span>
                </div>
              </div>
            )}
          </RkGroup>

          <RkGroup tone="chip" style={{ marginTop: 12 }}>
            <RkRow icon={<RkTile color="var(--danger)"><RkIco d={RK_ICON.pulse} size={19} /></RkTile>}
              label={t('record.pageAddSensorLabel')} sub={t('record.pageAddSensorSub')} onClick={() => setSensorSheetOpen(true)} />
            <RkRow icon={<RkTile color="var(--sport-bike)"><RkIco d={RK_ICON.gps} size={19} /></RkTile>}
              label={t('record.pageGpsLabel')} sub={t('record.pageGpsSub')} onClick={() => setGpsSheetOpen(true)} />
            {/* Saisie manuelle (ancien « + » de l'en-tête, qui ressemblait à un zoom). */}
            <RkRow icon={<RkTile color="var(--text-mid)"><RkIco d={RK_ICON.plus} size={20} /></RkTile>}
              label={t('record.createManualActivity')} sub={t('rec.manualEntrySub')} onClick={() => setManualOpen(true)} />
          </RkGroup>
          <div style={{ height: 12 }} />

          {/* Cran réduit : résumé du parcours (se fond dès qu'on remonte la feuille). */}
          <motion.div ref={summaryRef} style={{
            opacity: summaryOpacity, position: 'absolute', top: 0, left: 0, right: 0, padding: '2px 16px 14px',
            background: 'var(--surface-card)', display: 'flex', alignItems: 'center', gap: 12,
            pointerEvents: summaryActive ? 'auto' : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {route?.name || (route ? t('w2c.routeLabel') : t('rec.routeNone'))}
              </div>
              <div className="rk-num" style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 2, letterSpacing: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {route ? [getSportLabel(sport), routeStats].filter(Boolean).join(' · ') : t('rec.routeChoose')}
              </div>
            </div>
            <button type="button" className="rk-press" onClick={() => setRouteCreatorOpen(true)}
              style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: 15, fontWeight: 800, padding: '10px 2px', minHeight: 44, cursor: 'pointer', flexShrink: 0 }}>
              {route ? t('rec.change') : t('rec.choose')}
            </button>
          </motion.div>
        </div>
      </SnapSheet>

      <RkActionSheet open={layerSheetOpen} onClose={() => setLayerSheetOpen(false)} title={t('w2c.mapLayer')} isDark={isDark}
        actions={(['std', 'sat', 'hyb'] as RkMapLayer[]).map(l => ({
          key: l, label: LAYER_LABEL[l], checked: mapLayer === l,
          icon: <RkIco d={l === 'std' ? RK_ICON.route : l === 'sat' ? RK_ICON.globe : RK_ICON.layers} size={20} />,
          onClick: () => { setMapLayer(l); try { localStorage.setItem('thw-rec-layer', l) } catch { /* ignore */ } },
        }))} />

      <SportSelector
        open={sportSheetOpen}
        onClose={() => setSportSheetOpen(false)}
        onSelect={handleSelectSport}
        selectedSport={sport}
      />

      {sensorSheetOpen && <SensorSheet isDark={isDark} onClose={() => setSensorSheetOpen(false)} />}
      {gpsSheetOpen && <GpsSettingsSheet isDark={isDark} onClose={() => setGpsSheetOpen(false)} />}
      {liveShareSheetOpen && (
        <LiveShareSheet isDark={isDark} sport={sport}
          onStarted={id => { setLiveShareId(id); setLiveShare(true); persist('thw-rec-liveshare', true) }}
          onStopped={() => { setLiveShare(false); setLiveShareId(null); persist('thw-rec-liveshare', false) }}
          onClose={() => setLiveShareSheetOpen(false)} />
      )}

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
          sport="boxe"
        />
      )}

      {hybridLauncherOpen && (
        <BoxeLauncher
          open={hybridLauncherOpen}
          onClose={() => setHybridLauncherOpen(false)}
          onStart={(config) => { setBoxeConfig(config); setHybridLauncherOpen(false) }}
          sport="hybrid"
        />
      )}

      {boxeConfig && (
        <BoxeScreen
          session={boxeConfig}
          isDark={isDark}
          onClose={() => setBoxeConfig(null)}
        />
      )}

      {/* Rameur : launcher 3 sections → pré-remplit le formulaire d'enregistrement. */}
      {rowingLauncherOpen && (
        <PlannedLaunchSheet
          open={rowingLauncherOpen}
          onClose={() => setRowingLauncherOpen(false)}
          sport="rowing" label="Rameur" accent="var(--sport-rowing)"
          onPick={(r) => { setRowingPrefill(rowingBlocksToPrefill(r.title, r.blocks)); setRowingLauncherOpen(false); setView('rowing') }}
          onFree={() => { setRowingPrefill(undefined); setRowingLauncherOpen(false); setView('rowing') }}
        />
      )}

      {/* Home trainer : launcher 3 sections → charge la séance choisie dans le lecteur. */}
      {htLauncherOpen && (
        <PlannedLaunchSheet
          open={htLauncherOpen}
          onClose={() => setHtLauncherOpen(false)}
          sport="bike" label="Home trainer" accent="var(--sport-bike)"
          onPick={(r) => { setHtPlannedId(r.id); setHtLauncherOpen(false); setView('hometrainer') }}
          onFree={() => { setHtPlannedId(null); setHtLauncherOpen(false); setView('hometrainer') }}
        />
      )}

      {/* Course à pied : choix Dehors (GPS) ou Tapis (séance guidée) */}
      <RkSheet open={runChoiceOpen} onClose={() => setRunChoiceOpen(false)} title={t('w1a.sport_running')} isDark={isDark} zIndex={10040}>
        <RkGroup>
          <RkRow icon={<RkTile color="var(--sport-run)"><RkIco d={RK_ICON.gps} size={20} /></RkTile>}
            label={t('rec.runOutdoor')} sub={t('rec.runOutdoorSub')}
            onClick={() => { setRunChoiceOpen(false); setView('running') }} />
          <RkRow icon={<RkTile color="var(--sport-run)"><RkIco d={RK_ICON.layers} size={20} /></RkTile>}
            label={t('rec.runTreadmill')} sub={t('rec.runTreadmillSub')}
            onClick={() => { setRunChoiceOpen(false); setView('treadmill') }} />
        </RkGroup>
      </RkSheet>

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

/** Action latérale de la feuille de départ : rond gris + libellé dessous. */
function SideAction({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} aria-label={label} className="rk-press"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 72 }}>
      <span style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'var(--text)' : 'var(--surface-chip)', color: active ? 'var(--bg)' : 'var(--text)', transition: 'background-color 220ms ease, color 220ms ease' }}>
        {children}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{label}</span>
    </button>
  )
}
