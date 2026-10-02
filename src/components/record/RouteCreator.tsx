'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion, useMotionValue, useTransform } from 'motion/react'
import { rkScope, RkFab, RkIco, RK_ICON, RkActionSheet, RkSheet, RkCta, rkTileUrl, type RkMapLayer, type RkAction } from './kit/RecordKit'
import SnapSheet, { useMeasure } from './kit/SnapSheet'
import { ROUTE_SPORTS, ROUTE_SPEED_KMH } from './routeSports'
import { haptic } from '@/lib/haptics'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { snapRoute } from '@/lib/openrouteservice'
import type { Waypoint, SnappedPoint, Surface, ElevPoint } from '@/lib/openrouteservice'
import { parseGPX } from '@/lib/gpxParser'
import ElevationChart from './ElevationChart'
import RouteSaveForm, { type RouteType } from './RouteSaveForm'
import RouteLibrary from './RouteLibrary'
import SportPickerSheet from './SportPickerSheet'
import { FINISH_FLAG_HTML } from './finishFlag'

// Marqueur « arrivée » (drapeau à damier) — divIcon Leaflet, pied posé sur le point.
const FINISH_ICON = L.divIcon({ className: '', html: FINISH_FLAG_HTML, iconSize: [24, 24], iconAnchor: [5, 23] })
import { useI18n } from '@/lib/i18n'
import dynamic from 'next/dynamic'
import { routeToGpx, downloadGpx } from '@/lib/gpxExport'
import { elevationGainLoss } from '@/lib/elevation'

const RouteDetailView = dynamic(() => import('./RouteDetailView'), { ssr: false })
const SPEED_KMH = ROUTE_SPEED_KMH
function fmtDur(sec: number): string { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// Plan = outdoors ; Satellite = imagerie seule ; Hybride = imagerie + routes (cf. rkTileUrl).
type Layer = RkMapLayer
// Leaflet : attributs SVG → couleurs littérales.
const TRACE_CYAN = '#06B6D4' // design-allow-color — tracé (= --primary)
const TRACE_CASING = '#FFFFFF' // design-allow-color — halo du tracé / pastilles
const START_GREEN = '#10B981' // design-allow-color — pastille départ

function MapClickHandler({ onAdd }: { onAdd: (p: Waypoint) => void }) {
  useMapEvents({ click: e => onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}
function MapReady({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  mapRef.current = map
  return null
}

// La carte s'initialise pendant que la sur-page est encore translatée hors écran
// (slide bas→haut). Leaflet mémorise alors une position de conteneur erronée → sur
// mobile (événements tactiles), les taps tombent à côté et n'ajoutent aucun point.
// On recalcule la taille/position dès que l'éditeur est affiché (après l'anim) et à
// chaque redimensionnement, ce qui rétablit le hit-testing des taps.
function MapInvalidateOnShow({ shown }: { shown: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!shown) return
    const ids = [80, 340, 620].map(d => window.setTimeout(() => map.invalidateSize(false), d))
    return () => ids.forEach(clearTimeout)
  }, [map, shown])
  useEffect(() => {
    const f = () => map.invalidateSize(false)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [map])
  return null
}

// Géoloc via l'API Leaflet (map.locate) : plus robuste que getCurrentPosition brut
// (gère la reprise, les events, et le fallback). On tente une localisation précise ;
// à défaut on recentre sur la France sans bloquer l'utilisateur.
function GeolocateOnMount({ onPosition }: { onPosition: (pos: [number, number]) => void }) {
  const map = useMap()
  useEffect(() => {
    let found = false
    const onFound = (e: L.LocationEvent) => {
      found = true
      const p: [number, number] = [e.latlng.lat, e.latlng.lng]
      map.setView(p, 14)
      onPosition(p)
    }
    const onErr = () => { if (!found) map.setView([46.603354, 1.888334], 6) }
    map.on('locationfound', onFound)
    map.on('locationerror', onErr)
    map.locate({ setView: false, enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
    return () => { map.off('locationfound', onFound); map.off('locationerror', onErr) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: { lat: number; lng: number }[]
  sport?: string
  name?: string | null
  distance_m?: number | null
  elevation_gain_m?: number | null
}

// Parcours enregistré (tel que renvoyé par la bibliothèque) — pour l'édition.
interface SavedRoute {
  id: string; name: string; sport: string
  route_type?: RouteType | null
  distance_m: number | null; elevation_gain_m: number | null
  surfaces: Surface[] | null
  snapped_points: SnappedPoint[] | null
  waypoints: Waypoint[]
  elevation_profile: ElevPoint[] | null
}

interface Props { onClose: () => void; onLoadRoute: (route: ActiveRoute) => void; isDark: boolean; initialView?: 'creating' | 'library' }

export default function RouteCreator({ onClose, onLoadRoute, isDark, initialView = 'creating' }: Props) {
  const { t } = useI18n()
  const LAYER_LABEL: Record<Layer, string> = { std: t('record.routeCreatorLayerPlan'), sat: t('record.routeCreatorLayerSatellite'), hyb: t('record.routeCreatorLayerHybrid') }
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [snappedPoints, setSnappedPoints] = useState<SnappedPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [elevGain, setElevGain] = useState(0)
  const [elevLoss, setElevLoss] = useState(0)
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [elevationProfile, setElevationProfile] = useState<ElevPoint[]>([])
  const [redoStack, setRedoStack] = useState<Waypoint[]>([])
  const [view, setView] = useState<'creating' | 'library' | 'detail'>(initialView)
  const [sport, setSport] = useState('cycling')
  const [routeName, setRouteName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<RouteType>('training')
  const [layer, setLayer] = useState<Layer>('std')
  const [layersOpen, setLayersOpen] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [scrubPosition, setScrubPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([])
  const [searching, setSearching] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  // Desktop vs mobile : l'éditeur adopte une disposition « Strava » sur ordinateur
  // (barre d'outils en haut à gauche + bandeau bas pleine largeur), et garde la
  // feuille du bas coulissante sur mobile (adaptée plus tard).
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  // Instantané du dernier état enregistré (pour « Effacer les modifications »).
  const snapshotRef = useRef<SavedRoute | null>(null)
  const [savedRoute, setSavedRoute] = useState<null | { id: string; name: string; sport: string; distance_m: number | null; elevation_gain_m: number | null; snapped_points: SnappedPoint[]; waypoints: Waypoint[]; elevation_profile: ElevPoint[]; created_at: string; user_id?: string }>(null)

  // Mobile : feuille de sélection du sport (bas → haut) + menu ⋯ (supprimer / inverser).
  const [sportPickerOpen, setSportPickerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // Confirmation de sortie quand un tracé non enregistré est en cours.
  const [confirmExit, setConfirmExit] = useState(false)
  // Feuille du bas (mobile) : 0 = stats + sport, 1 = + profil / revêtements.
  const [sheetSnap, setSheetSnap] = useState(1)
  const sheetH = useMotionValue(0)
  const floatY = useTransform(sheetH, h => -(h + 12))
  const [statsRef, statsH] = useMeasure<HTMLDivElement>()
  const gpxInputRef = useRef<HTMLInputElement>(null)
  // Recherche de lieu : géocodage automatique après une courte pause de frappe.
  useEffect(() => {
    if (searchQ.trim().length < 3) { setSearchResults([]); return }
    const id = window.setTimeout(() => { void geocodeRef.current() }, 450)
    return () => clearTimeout(id)
  }, [searchQ])

  // Sur-page plein écran : slide bas→haut à l'ouverture, haut→bas à la fermeture.
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = useCallback(() => { setClosing(true); setShown(false); setTimeout(onClose, 300) }, [onClose])
  // Slide de l'éditeur (bas→haut à l'ouverture, haut→bas à la fermeture) même
  // quand on arrive depuis la bibliothèque (la surface reste montée).
  const [editorShown, setEditorShown] = useState(false)

  // Sports (ordre demandé) : Course à pied, Trail, VTT, Vélo, Randonnée, Ski.
  const SPORT_CHIPS = ROUTE_SPORTS.map(s => ({ id: s.id, Icon: s.Icon, label: t(s.labelKey) }))
  const currentSport = SPORT_CHIPS.find(c => c.id === sport) ?? SPORT_CHIPS[0]

  const pickSport = (id: string) => {
    setSport(id)
    if (waypoints.length >= 2) void doSnap(waypoints, id)
  }

  // Durée estimée (s) selon la vitesse moyenne du sport.
  const estDurationSec = distanceM > 0 ? (distanceM / 1000) / (SPEED_KMH[sport] ?? 18) * 3600 : 0

  const doSnap = useCallback(async (pts: Waypoint[], sp: string) => {
    if (pts.length < 2) return
    setSnapping(true)
    try {
      const r = await snapRoute(pts, sp)
      setSnappedPoints(r.snappedPoints); setDistanceM(r.distanceM)
      setSurfaces(r.surfaces); setElevationProfile(r.elevationProfile)
      // D+ / D- réalistes (lissés + seuil) au lieu de la somme brute des deltas.
      const gl = elevationGainLoss(r.elevationProfile)
      setElevGain(gl.gain); setElevLoss(gl.loss)
    } catch {
      // Fallback : segments en ligne droite quand ORS est indisponible
      setSnappedPoints(pts.map(p => ({ ...p, altitude: 0 })))
    }
    setSnapping(false)
  }, [])

  const addWaypoint = useCallback(async (p: Waypoint) => {
    const next = [...waypoints, p]; setWaypoints(next); setRedoStack([])
    await doSnap(next, sport)
  }, [waypoints, sport, doSnap])

  const undo = useCallback(() => {
    if (!waypoints.length) return
    const next = waypoints.slice(0, -1)
    setRedoStack(r => [...r, waypoints[waypoints.length - 1]]); setWaypoints(next)
    if (next.length < 2) { setSnappedPoints([]); setDistanceM(0); setElevGain(0); setElevLoss(0); setSurfaces([]); setElevationProfile([]) }
    else doSnap(next, sport)
  }, [waypoints, sport, doSnap])

  const redo = useCallback(async () => {
    if (!redoStack.length) return
    const pt = redoStack[redoStack.length - 1]
    const next = [...waypoints, pt]; setWaypoints(next); setRedoStack(r => r.slice(0, -1))
    await doSnap(next, sport)
  }, [redoStack, waypoints, sport, doSnap])

  // « Inverser le parcours » : mêmes points, sens opposé (départ ↔ arrivée).
  const reverseRoute = useCallback(() => {
    if (waypoints.length < 2) return
    const rev = [...waypoints].reverse()
    setWaypoints(rev); setRedoStack([])
    void doSnap(rev, sport)
  }, [waypoints, sport, doSnap])

  const handleGPX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const parsed = parseGPX(await file.text())
    setWaypoints(parsed.waypoints); setElevationProfile(parsed.elevationProfile)
    setDistanceM(parsed.distanceM); setRedoStack([])
    { const gl = elevationGainLoss(parsed.elevationProfile); setElevGain(gl.gain); setElevLoss(gl.loss) }
    await doSnap(parsed.waypoints, sport)
  }

  // Recherche d'un lieu (ville / rue) pour démarrer l'itinéraire — géocodage Mapbox.
  const geocode = useCallback(async () => {
    const q = searchQ.trim(); if (!q) return
    setSearching(true)
    try {
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${TOKEN}&limit=6&language=fr`)
      const j = await r.json() as { features?: { place_name: string; center: [number, number] }[] }
      setSearchResults((j.features ?? []).map(f => ({ name: f.place_name, lat: f.center[1], lng: f.center[0] })))
    } catch { setSearchResults([]) } finally { setSearching(false) }
  }, [searchQ])

  const geocodeRef = useRef(geocode)
  geocodeRef.current = geocode

  function recenter() {
    if (userPosition) mapRef.current?.setView(userPosition, 15)
    // Rafraîchit la position (le handler locationfound de GeolocateOnMount met à jour le marqueur).
    mapRef.current?.locate({ setView: false, enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  }

  // « Modifier » depuis la bibliothèque : charge le parcours dans l'éditeur.
  const loadRouteForEdit = (route: SavedRoute) => {
    snapshotRef.current = route
    const wps: Waypoint[] = (route.waypoints ?? []).map(p => ({ lat: p.lat, lng: p.lng }))
    setWaypoints(wps)
    setSnappedPoints(route.snapped_points ?? [])
    setDistanceM(route.distance_m ?? 0)
    setSurfaces(route.surfaces ?? [])
    setElevationProfile(route.elevation_profile ?? [])
    // Recalcule D+/D- lissés depuis le profil (corrige les anciens parcours surestimés).
    { const gl = elevationGainLoss(route.elevation_profile); setElevGain(route.elevation_profile?.length ? gl.gain : (route.elevation_gain_m ?? 0)); setElevLoss(gl.loss) }
    setSport(route.sport || 'cycling')
    setRouteName(route.name || '')
    setEditingId(route.id)
    setEditingType(route.route_type ?? 'training')
    setRedoStack([])
    setView('creating')
    const pts = route.snapped_points?.length ? route.snapped_points : wps
    if (pts.length) {
      const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
      const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
      setTimeout(() => mapRef.current?.setView([lat, lng], 13), 60)
    }
  }
  const resetEditor = () => {
    snapshotRef.current = null
    setEditingId(null); setEditingType('training'); setWaypoints([]); setSnappedPoints([]); setDistanceM(0)
    setElevGain(0); setElevLoss(0); setSurfaces([]); setElevationProfile([]); setRouteName(''); setRedoStack([])
  }

  // « Effacer les modifications » : revient au dernier état enregistré (ou vide
  // pour un nouveau parcours jamais sauvegardé).
  const clearRevert = () => {
    if (snapshotRef.current) loadRouteForEdit(snapshotRef.current)
    else resetEditor()
    setRedoStack([])
  }

  const handleSave = async (name: string, isPublic: boolean, routeType: RouteType) => {
    const supabase = createClient()
    const user = await getCurrentUser(); if (!user) return
    const payload = {
      user_id: user.id, name, sport, is_public: isPublic, route_type: routeType,
      distance_m: distanceM, elevation_gain_m: elevGain,
      waypoints, snapped_points: snappedPoints, elevation_profile: elevationProfile, surfaces,
    }
    // Édition d'un parcours existant → mise à jour ; sinon création.
    let id = editingId
    if (editingId) await supabase.from('routes').update(payload).eq('id', editingId)
    else {
      const { data } = await supabase.from('routes').insert(payload).select('id').single()
      id = (data as { id: string } | null)?.id ?? null
    }
    setShowSave(false)
    if (!id) { requestClose(); return }
    // Enregistré → page détail (façon Strava).
    setEditingId(id); setRouteName(name); setEditingType(routeType)
    snapshotRef.current = { id, name, sport, route_type: routeType, distance_m: distanceM, elevation_gain_m: elevGain, surfaces, snapped_points: snappedPoints, waypoints, elevation_profile: elevationProfile }
    setSavedRoute({ id, name, sport, distance_m: distanceM, elevation_gain_m: elevGain, snapped_points: snappedPoints, waypoints, elevation_profile: elevationProfile, created_at: new Date().toISOString(), user_id: user.id })
    setView('detail')
  }

  // Boutons d'édition regroupés (annuler / refaire / GPX) — cluster à séparateurs
  const groupBtn: React.CSSProperties = { width: 40, height: 34, background: 'transparent', color: 'var(--text)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const groupSep = <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

  const displayPts: [number, number][] = snappedPoints.length >= 2
    ? snappedPoints.map(p => [p.lat, p.lng])
    : waypoints.length >= 2
    ? waypoints.map(p => [p.lat, p.lng])
    : []

  // Anime l'éditeur : monte quand on entre en création, redescend quand on sort.
  useEffect(() => {
    if (view === 'creating') { const r = requestAnimationFrame(() => setEditorShown(true)); return () => cancelAnimationFrame(r) }
    setEditorShown(false)
  }, [view])

  // Sortir de la création : retour à la liste (slide bas) si on y est entré par
  // là, sinon fermeture complète.
  const exitCreate = initialView === 'library'
    ? () => { setEditorShown(false); setTimeout(() => setView('library'), 300) }
    : requestClose
  // Flèche retour : si un tracé est en cours (≥ 2 points), on demande d'abord si
  // l'utilisateur veut l'enregistrer ou quitter sans enregistrer.
  const requestExit = () => { if (waypoints.length >= 2) setConfirmExit(true); else exitCreate() }

  if (view === 'library') return createPortal(
    <RouteLibrary isDark={isDark} onClose={onClose}
      onCreate={() => { resetEditor(); setView('creating') }}
      onEditRoute={loadRouteForEdit}
      onUseRoute={route => { onLoadRoute(route); onClose() }} />,
    document.body
  )

  // Après enregistrement → page détail (façon Strava). Flèche retour = page précédente.
  if (view === 'detail' && savedRoute) return createPortal(
    <RouteDetailView
      route={savedRoute} isDark={isDark}
      sportLabel={SPORT_CHIPS.find(c => c.id === savedRoute.sport)?.label ?? savedRoute.sport}
      onClose={() => setView(initialView === 'library' ? 'library' : 'creating')}
      onUse={() => { onLoadRoute({ snapped_points: savedRoute.snapped_points.map(p => ({ lat: p.lat, lng: p.lng })), elevation_profile: savedRoute.elevation_profile, waypoints: savedRoute.waypoints, sport: savedRoute.sport, name: savedRoute.name, distance_m: savedRoute.distance_m, elevation_gain_m: savedRoute.elevation_gain_m }); onClose() }}
      onEdit={() => setView('creating')}
      onDuplicate={async () => {
        const sb = createClient(); const u = await getCurrentUser(); if (!u) return
        await sb.from('routes').insert({ user_id: u.id, name: `${savedRoute.name} (copie)`, sport: savedRoute.sport, is_public: false, route_type: editingType, distance_m: savedRoute.distance_m, elevation_gain_m: savedRoute.elevation_gain_m, waypoints: savedRoute.waypoints, snapped_points: savedRoute.snapped_points, elevation_profile: savedRoute.elevation_profile, surfaces })
        setView(initialView === 'library' ? 'library' : 'creating')
      }}
      onExport={() => { const pts = (savedRoute.snapped_points.length ? savedRoute.snapped_points : savedRoute.waypoints).map(p => ({ lat: p.lat, lng: p.lng })); if (pts.length >= 2) downloadGpx(savedRoute.name, routeToGpx(savedRoute.name, pts, savedRoute.elevation_profile)) }}
      onDelete={async () => { await createClient().from('routes').delete().eq('id', savedRoute.id); requestClose() }}
    />,
    document.body
  )

  const hasPts = waypoints.length > 0
  const canSave = waypoints.length >= 2
  const closeSearch = () => { setSearchOpen(false); setSearchResults([]); setSearchQ('') }

  // Menu ⋯ (mobile) : inverser, importer un GPX, effacer les modifications, supprimer.
  const moreActions: RkAction[] = [
    { key: 'reverse', label: t('record.routeCreatorReverseRoute'), icon: <RkIco d={RK_ICON.reverse} size={19} />, disabled: !canSave, onClick: reverseRoute },
    { key: 'gpx', label: t('record.routeCreatorImportGpx'), icon: <RkIco d={RK_ICON.upload} size={19} />, onClick: () => gpxInputRef.current?.click() },
    { key: 'revert', label: t('record.routeCreatorClearEdits'), icon: <RkIco d={RK_ICON.undo} size={19} />, disabled: !hasPts, onClick: clearRevert },
    { key: 'delete', label: t('record.routeCreatorDeleteRoute'), icon: <RkIco d={RK_ICON.trash} size={19} />, danger: true, disabled: !hasPts, onClick: resetEditor },
  ]
  const layerActions: RkAction[] = (['std', 'sat', 'hyb'] as Layer[]).map(l => ({
    key: l, label: LAYER_LABEL[l], checked: layer === l,
    icon: <RkIco d={l === 'std' ? RK_ICON.route : l === 'sat' ? RK_ICON.globe : RK_ICON.layers} size={19} />,
    onClick: () => setLayer(l),
  }))

  const stat = (label: string, value: string, unit?: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{label}</div>
      <div className="rk-num" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, marginTop: 2, whiteSpace: 'nowrap' }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}> {unit}</span>}
      </div>
    </div>
  )
  const durParts = (() => {
    if (estDurationSec <= 0) return { v: '--', u: '' }
    const h = Math.floor(estDurationSec / 3600), m = Math.round((estDurationSec % 3600) / 60)
    return h > 0 ? { v: `${h} h ${String(m).padStart(2, '0')}`, u: '' } : { v: String(m), u: 'min' }
  })()

  const ui = (
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 9999, transform: editorShown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`
        /* Curseur en petite croix sur la carte (placement précis des points), façon Strava. */
        .rk-creator .leaflet-container, .rk-creator .leaflet-container .leaflet-grab { cursor: crosshair !important; }
        .rk-creator .leaflet-container.leaflet-dragging, .rk-creator .leaflet-container.leaflet-dragging .leaflet-grab { cursor: crosshair !important; }
      `}</style>
      <div className="rk-creator" style={{ position: 'absolute', inset: 0 }}>
        <MapContainer center={[48.8566, 2.3522]} zoom={13} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
          <TileLayer key={layer} url={rkTileUrl(layer, TOKEN)} tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20} attribution={ATTR} />
          <MapClickHandler onAdd={addWaypoint} />
          <MapReady mapRef={mapRef} />
          <MapInvalidateOnShow shown={editorShown && !closing} />
          <GeolocateOnMount onPosition={setUserPosition} />
          {userPosition && (
            <>
              <CircleMarker center={userPosition} radius={16}
                pathOptions={{ fillColor: TRACE_CYAN, fillOpacity: 0.2, color: 'transparent', weight: 0 }} />
              <CircleMarker center={userPosition} radius={8}
                pathOptions={{ fillColor: TRACE_CYAN, fillOpacity: 1, color: TRACE_CASING, weight: 2 }} />
            </>
          )}
          {displayPts.length > 1 && (
            <>
              {/* Halo blanc (casing) sous le tracé → contraste net sur carte & satellite */}
              <Polyline positions={displayPts} pathOptions={{ color: TRACE_CASING, weight: 11, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }} />
              <Polyline positions={displayPts} pathOptions={{ color: TRACE_CYAN, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
            </>
          )}
          {waypoints.map((wp, i) => {
            const isStart = i === 0, isEnd = i === waypoints.length - 1 && waypoints.length > 1
            // Arrivée = drapeau à damier (fin de course) ; départ = pastille verte.
            if (isEnd) return <Marker key={i} position={[wp.lat, wp.lng]} icon={FINISH_ICON} />
            const mid = !isStart
            return (
              <CircleMarker key={i} center={[wp.lat, wp.lng]} radius={mid ? 4.5 : 7}
                pathOptions={{ fillColor: isStart ? START_GREEN : TRACE_CASING, fillOpacity: 1, color: mid ? TRACE_CYAN : TRACE_CASING, weight: mid ? 2 : 3 }} />
            )
          })}
          {scrubPosition && (
            <CircleMarker center={[scrubPosition.lat, scrubPosition.lng]} radius={8}
              pathOptions={{ fillColor: TRACE_CYAN, fillOpacity: 1, color: TRACE_CASING, weight: 3 }} />
          )}
        </MapContainer>
      </div>

      {/* Haut : retour · champ de recherche (verre) · fond de carte */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', left: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10 }}>
        <RkFab label={t('record.routeCreatorClose')} onClick={requestExit}><RkIco d={RK_ICON.back} size={22} sw={2.2} /></RkFab>
        <form onSubmit={e => { e.preventDefault(); void geocode() }} className="rk-glass"
          style={{ flex: 1, minWidth: 0, maxWidth: isNarrow ? undefined : 460, display: 'flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '0 14px', borderRadius: 'var(--r-pill)', color: 'var(--text-mid)' }}>
          <RkIco d={RK_ICON.search} size={18} />
          <input className="rk-input" value={searchQ} onChange={e => { setSearchQ(e.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)}
            placeholder={t('record.routeCreatorSearchPlaceholder')} aria-label={t('record.routeCreatorSearch')} enterKeyHint="search"
            style={{ flex: 1, minWidth: 0, fontSize: 16 }} />
          {(searchQ || searchOpen) && (
            <button type="button" onClick={closeSearch} aria-label={t('record.routeCreatorCancel')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', padding: 6, cursor: 'pointer', display: 'flex' }}>
              <RkIco d={RK_ICON.close} size={16} sw={2.4} />
            </button>
          )}
        </form>
        {!isNarrow && <span style={{ flex: 1 }} />}
        <RkFab label={t('record.routeCreatorMapStyles')} onClick={() => setLayersOpen(true)}><RkIco d={RK_ICON.layers} size={19} /></RkFab>
      </div>

      {/* Résultats de recherche */}
      {searchOpen && (searching || searchResults.length > 0) && (
        <div className="rk-card rk-fade-up" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 62px)', left: 66, right: isNarrow ? 66 : 'auto', width: isNarrow ? undefined : 460, zIndex: 1002, boxShadow: 'var(--shadow-float)', maxHeight: '50vh', overflowY: 'auto' }}>
          {searching && searchResults.length === 0 && <p style={{ fontSize: 14, color: 'var(--text-mid)', padding: '14px 16px', margin: 0 }}>{t('record.routeCreatorSearching')}</p>}
          {searchResults.map((res, i) => (
            <button key={i} type="button" className="rk-row" data-icon="1"
              onClick={() => { haptic('light'); mapRef.current?.setView([res.lat, res.lng], 14); closeSearch() }}>
              <span style={{ color: 'var(--text-mid)', display: 'flex' }}><RkIco d={RK_ICON.pin} size={18} /></span>
              <span className="rk-row-t"><b style={{ fontSize: 15, whiteSpace: 'normal' }}>{res.name}</b></span>
            </button>
          ))}
        </div>
      )}

      {/* Droite : me localiser */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 64px)', right: 12, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <RkFab label={t('rec.locateMe')} onClick={recenter}><RkIco d={RK_ICON.locate} size={20} /></RkFab>
      </div>

      {/* DESKTOP — outils d'édition + Enregistrer (sous l'en-tête, à gauche) */}
      {!isNarrow && (
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 64px)', left: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--float-bg)', borderRadius: 'var(--r-pill)', boxShadow: 'var(--shadow-capsule)', overflow: 'hidden', height: 44 }}>
            <button onClick={undo} disabled={!waypoints.length} aria-label={t('record.routeCreatorUndo')} title={t('record.routeCreatorUndo')} style={{ ...groupBtn, height: 44, opacity: waypoints.length ? 1 : 0.35 }}>
              <RkIco d={RK_ICON.undo} size={18} />
            </button>
            {groupSep}
            <button onClick={redo} disabled={!redoStack.length} aria-label={t('record.routeCreatorRedo')} title={t('record.routeCreatorRedo')} style={{ ...groupBtn, height: 44, opacity: redoStack.length ? 1 : 0.35 }}>
              <RkIco d={RK_ICON.redo} size={18} />
            </button>
            {groupSep}
            <button onClick={clearRevert} disabled={!waypoints.length} aria-label={t('record.routeCreatorClearEdits')} title={t('record.routeCreatorClearEdits')} style={{ ...groupBtn, height: 44, opacity: waypoints.length ? 1 : 0.35 }}>
              <RkIco d={RK_ICON.trash} size={17} />
            </button>
          </div>
          <RkCta variant="primary" disabled={!canSave} onClick={() => setShowSave(true)} style={{ width: 'auto', minHeight: 44, padding: '0 20px', fontSize: 15 }}>
            {t('record.routeSaveTitle')}
          </RkCta>
        </div>
      )}

      {/* Fichier GPX (déclenché depuis le menu ⋯ ou la barre desktop) */}
      <input ref={gpxInputRef} type="file" accept=".gpx" onChange={handleGPX} style={{ display: 'none' }} />

      {/* MOBILE — annuler / refaire / ⋯ + indice, au-dessus de la feuille */}
      {isNarrow && (
        <motion.div style={{ y: floatY, position: 'absolute', left: 12, right: 12, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <span style={{ pointerEvents: 'auto' }}><RkFab label={t('record.routeCreatorUndo')} onClick={undo} disabled={!hasPts}><RkIco d={RK_ICON.undo} size={19} /></RkFab></span>
          <span style={{ pointerEvents: 'auto' }}><RkFab label={t('record.routeCreatorRedo')} onClick={() => void redo()} disabled={!redoStack.length}><RkIco d={RK_ICON.redo} size={19} /></RkFab></span>
          <span style={{ pointerEvents: 'auto' }}><RkFab label={t('record.routeCreatorMore')} onClick={() => setMoreOpen(true)}><RkIco d={RK_ICON.dots} size={21} /></RkFab></span>
          <span style={{ flex: 1 }} />
          {snapping
            ? <span className="rk-banner rk-glass" style={{ animation: 'none' }}><span className="rk-dot" data-live="1" style={{ background: 'var(--primary)' }} />{t('record.routeCreatorCalculating')}</span>
            : waypoints.length < 2 && <span className="rk-banner rk-glass" style={{ animation: 'none', fontSize: 14, minHeight: 40 }}>{t('record.routeCreatorTapHint')}</span>}
        </motion.div>
      )}

      {/* MOBILE — feuille glissable : stats + sport, profil, revêtements, Enregistrer */}
      {isNarrow && (
        <SnapSheet
          snaps={[statsH, 'full']}
          index={sheetSnap}
          onIndexChange={setSheetSnap}
          heightMV={sheetH}
          zIndex={1001}
          topGap={120}
          ariaLabel={t('record.routeSaveTitle')}
          footer={
            <div style={{ padding: '8px 16px calc(14px + env(safe-area-inset-bottom))' }}>
              <RkCta variant="primary" disabled={!canSave} onClick={() => { haptic('medium'); setShowSave(true) }}>{t('record.routeSaveTitle')}</RkCta>
            </div>
          }
        >
          <div style={{ padding: '0 16px 14px' }}>
            <div ref={statsRef} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14 }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {stat(t('record.routeCreatorDistance'), distanceM > 0 ? (distanceM / 1000).toFixed(1).replace('.', ',') : '--', 'km')}
                {stat('D+', `${Math.round(elevGain)}`, 'm')}
                {stat(t('record.routeCreatorDuration'), durParts.v, durParts.u)}
              </div>
              <button type="button" className="rk-chip rk-press" onClick={() => setSportPickerOpen(true)} aria-label={currentSport.label}
                style={{ minHeight: 44, padding: '0 12px', gap: 6 }}>
                <currentSport.Icon size={18} stroke={2} />
                <span>{currentSport.label}</span>
                <RkIco d={RK_ICON.down} size={15} sw={2.4} />
              </button>
            </div>
            <div style={{ background: 'var(--surface-soft)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
              {elevationProfile.length > 1
                ? <ElevationChart data={elevationProfile} surfaces={surfaces} surfaceStyle="bar" compact height={84} isDark={isDark} snappedPoints={snappedPoints} onPositionChange={setScrubPosition} />
                : <p style={{ margin: 0, padding: '18px 0', textAlign: 'center', fontSize: 14, color: 'var(--text-mid)' }}>{t('record.routeCreatorProfileEmpty')}</p>}
            </div>
          </div>
        </SnapSheet>
      )}

      {/* DESKTOP — bandeau bas pleine largeur : sport + stats + gros profil (façon Strava) */}
      {!isNarrow && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--surface-card)', boxShadow: 'var(--shadow-float)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '12px 20px', flexWrap: 'wrap' }}>
            <div className="rk-seg" style={{ padding: 3 }}>
              {SPORT_CHIPS.map(({ id, Icon, label }) => (
                <button key={id} type="button" aria-pressed={sport === id} onClick={() => pickSport(id)} title={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', minHeight: 36, fontSize: 13 }}>
                  <Icon size={16} stroke={2} /><span>{label}</span>
                </button>
              ))}
            </div>
            {stat(t('record.routeCreatorDistance'), distanceM >= 1000 ? (distanceM / 1000).toFixed(2).replace('.', ',') : `${Math.round(distanceM)}`, distanceM >= 1000 ? 'km' : 'm')}
            {stat('D+', `${Math.round(elevGain)}`, 'm')}
            {stat('D-', `${elevLoss}`, 'm')}
            {stat(t('record.routeCreatorEstDuration'), distanceM > 0 ? fmtDur((distanceM / 1000) / (SPEED_KMH[sport] ?? 18) * 3600) : '--')}
            <div style={{ flex: 1 }} />
            <span className="rk-num" style={{ fontSize: 13, color: 'var(--text-mid)', letterSpacing: 0 }}>{snapping ? t('record.routeCreatorCalculating') : `${waypoints.length} point${waypoints.length !== 1 ? 's' : ''}`}</span>
            <RkFab label={t('record.routeCreatorImportGpx')} variant="ghost" onClick={() => gpxInputRef.current?.click()}><RkIco d={RK_ICON.upload} size={18} /></RkFab>
          </div>
          <div style={{ padding: '0 12px 12px' }}>
            <ElevationChart data={elevationProfile} surfaces={surfaces} height={180} isDark={isDark} snappedPoints={snappedPoints} onPositionChange={setScrubPosition} />
          </div>
        </div>
      )}

      <RkActionSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('record.routeCreatorMore')} isDark={isDark} actions={moreActions} zIndex={20010} />
      <RkActionSheet open={layersOpen} onClose={() => setLayersOpen(false)} title={t('record.routeCreatorMapStyles')} isDark={isDark} actions={layerActions} zIndex={20010} />

      {sportPickerOpen && (
        <SportPickerSheet title={t('record.routeSportPickerTitle')} sports={SPORT_CHIPS} current={sport}
          onPick={pickSport} onClose={() => setSportPickerOpen(false)} isDark={isDark} />
      )}

      {/* Confirmation de sortie : enregistrer ou quitter sans enregistrer */}
      <RkSheet open={confirmExit} onClose={() => setConfirmExit(false)} title={t('record.routeExitTitle')} isDark={isDark} zIndex={20005}
        footer={<>
          <RkCta variant="primary" onClick={() => { setConfirmExit(false); setShowSave(true) }}>{t('record.routeExitSave')}</RkCta>
          <RkCta variant="text-danger" onClick={() => { setConfirmExit(false); exitCreate() }}>{t('record.routeExitDiscard')}</RkCta>
          <RkCta variant="text" onClick={() => setConfirmExit(false)}>{t('record.routeExitCancel')}</RkCta>
        </>}>
        <p style={{ margin: '2px 4px 6px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45, textAlign: 'center' }}>{t('record.routeExitSub')}</p>
      </RkSheet>

      {showSave && <RouteSaveForm routeName={routeName} onChangeName={setRouteName} onSave={handleSave} onClose={() => setShowSave(false)} isDark={isDark} initialType={editingType}
        distanceM={distanceM} elevGain={elevGain} durationSec={estDurationSec} sportLabel={currentSport.label} />}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
