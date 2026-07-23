'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet'
import { IconBike, IconMountain, IconRun, IconWalk } from '@tabler/icons-react'
import type L from 'leaflet'
import { createClient } from '@/lib/supabase/client'
import { snapRoute } from '@/lib/openrouteservice'
import type { Waypoint, SnappedPoint, Surface, ElevPoint } from '@/lib/openrouteservice'
import { parseGPX } from '@/lib/gpxParser'
import ElevationChart from './ElevationChart'
import RouteSaveForm from './RouteSaveForm'
import RouteLibrary from './RouteLibrary'
import { useI18n } from '@/lib/i18n'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const TILES = {
  std: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
  sat: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
  hyb: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
}
type Layer = keyof typeof TILES

function MapClickHandler({ onAdd }: { onAdd: (p: Waypoint) => void }) {
  useMapEvents({ click: e => onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}
function MapReady({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  mapRef.current = map
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
}

interface Props { onClose: () => void; onLoadRoute: (route: ActiveRoute) => void; isDark: boolean; initialView?: 'creating' | 'library' }

export default function RouteCreator({ onClose, onLoadRoute, isDark, initialView = 'creating' }: Props) {
  const { t } = useI18n()
  const LAYER_LABEL: Record<Layer, string> = { std: t('record.routeCreatorLayerPlan'), sat: t('record.routeCreatorLayerSatellite'), hyb: t('record.routeCreatorLayerHybrid') }
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [snappedPoints, setSnappedPoints] = useState<SnappedPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [elevGain, setElevGain] = useState(0)
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [elevationProfile, setElevationProfile] = useState<ElevPoint[]>([])
  const [redoStack, setRedoStack] = useState<Waypoint[]>([])
  const [view, setView] = useState<'creating' | 'library'>(initialView)
  const [sport, setSport] = useState('cycling')
  const [routeName, setRouteName] = useState('')
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

  // Panneau bas dépliable/glissable (poignée)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelH, setPanelH] = useState<number | null>(null)   // null = hauteur naturelle (contenu)
  const dragRef = useRef<{ y: number; h: number } | null>(null)

  const SPORT_CHIPS: { id: string; Icon: typeof IconBike; label: string }[] = [
    { id: 'cycling', Icon: IconBike, label: t('record.routeCreatorSportCycling') },
    { id: 'mtb', Icon: IconMountain, label: t('record.routeCreatorSportMtb') },
    { id: 'trail', Icon: IconRun, label: t('record.routeCreatorSportTrail') },
    { id: 'hiking', Icon: IconWalk, label: t('record.routeCreatorSportHiking') },
  ]

  const pickSport = (id: string) => {
    setSport(id)
    if (waypoints.length >= 2) void doSnap(waypoints, id)
  }

  const onHandleDown = (e: React.PointerEvent) => {
    const h = panelRef.current?.offsetHeight ?? 300
    dragRef.current = { y: e.clientY, h }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dy = dragRef.current.y - e.clientY   // vers le haut = agrandir
    const min = 130
    const max = Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.72)
    setPanelH(Math.max(min, Math.min(max, dragRef.current.h + dy)))
  }
  const onHandleUp = () => { dragRef.current = null }

  const doSnap = useCallback(async (pts: Waypoint[], sp: string) => {
    if (pts.length < 2) return
    setSnapping(true)
    try {
      const r = await snapRoute(pts, sp)
      setSnappedPoints(r.snappedPoints); setDistanceM(r.distanceM)
      setElevGain(r.elevGain); setSurfaces(r.surfaces); setElevationProfile(r.elevationProfile)
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
    if (next.length < 2) { setSnappedPoints([]); setDistanceM(0); setElevGain(0); setSurfaces([]); setElevationProfile([]) }
    else doSnap(next, sport)
  }, [waypoints, sport, doSnap])

  const redo = useCallback(async () => {
    if (!redoStack.length) return
    const pt = redoStack[redoStack.length - 1]
    const next = [...waypoints, pt]; setWaypoints(next); setRedoStack(r => r.slice(0, -1))
    await doSnap(next, sport)
  }, [redoStack, waypoints, sport, doSnap])

  const handleGPX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const parsed = parseGPX(await file.text())
    setWaypoints(parsed.waypoints); setElevationProfile(parsed.elevationProfile)
    setDistanceM(parsed.distanceM); setElevGain(parsed.elevGain); setRedoStack([])
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

  function recenter() {
    if (userPosition) mapRef.current?.setView(userPosition, 15)
    // Rafraîchit la position (le handler locationfound de GeolocateOnMount met à jour le marqueur).
    mapRef.current?.locate({ setView: false, enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  }

  const handleSave = async (name: string, isPublic: boolean) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    await supabase.from('routes').insert({
      user_id: user.id, name, sport, is_public: isPublic,
      distance_m: distanceM, elevation_gain_m: elevGain,
      waypoints, snapped_points: snappedPoints, elevation_profile: elevationProfile, surfaces,
    })
    setShowSave(false); onClose()
  }

  // Bouton flottant : plein, blanc le jour / noir la nuit (tokens), rond.
  const fb: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
  const editBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

  const displayPts: [number, number][] = snappedPoints.length >= 2
    ? snappedPoints.map(p => [p.lat, p.lng])
    : waypoints.length >= 2
    ? waypoints.map(p => [p.lat, p.lng])
    : []

  // Sortir de la création : retour à la liste si on y est entré par là, sinon fermer.
  const exitCreate = initialView === 'library' ? () => setView('library') : onClose

  if (view === 'library') return createPortal(
    <RouteLibrary isDark={isDark} onClose={onClose} onCreate={() => setView('creating')}
      onUseRoute={route => { onLoadRoute(route); onClose() }} />,
    document.body
  )

  const ui = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, fontFamily: 'var(--font-body)', animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <MapContainer center={[48.8566, 2.3522]} zoom={13} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
        <TileLayer url={TILES[layer]} tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20} attribution={ATTR} />
        <MapClickHandler onAdd={addWaypoint} />
        <MapReady mapRef={mapRef} />
        <GeolocateOnMount onPosition={setUserPosition} />
        {userPosition && (
          <>
            <CircleMarker center={userPosition} radius={16}
              pathOptions={{ fillColor: '#06B6D4', fillOpacity: 0.2, color: 'transparent', weight: 0 }} />
            <CircleMarker center={userPosition} radius={8}
              pathOptions={{ fillColor: '#06B6D4', fillOpacity: 1, color: 'white', weight: 2 }} />
          </>
        )}
        {displayPts.length > 1 && (
          <>
            {/* Halo blanc (casing) sous le tracé → contraste net sur carte & satellite */}
            <Polyline positions={displayPts} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.55, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={displayPts} pathOptions={{ color: '#06B6D4', weight: 4.5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
          </>
        )}
        {waypoints.map((wp, i) => {
          const isStart = i === 0, isEnd = i === waypoints.length - 1
          const mid = !isStart && !isEnd
          return (
            <CircleMarker key={i} center={[wp.lat, wp.lng]} radius={mid ? 4.5 : 7}
              pathOptions={{ fillColor: isStart ? '#10B981' : isEnd ? '#EF4444' : '#ffffff', fillOpacity: 1, color: mid ? '#06B6D4' : '#ffffff', weight: mid ? 2 : 3 }} />
          )
        })}
        {scrubPosition && (
          <CircleMarker center={[scrubPosition.lat, scrubPosition.lng]} radius={8}
            pathOptions={{ fillColor: '#EF4444', fillOpacity: 1, color: '#fff', weight: 2.5 }} />
        )}
      </MapContainer>

      {/* Croix — sortir (haut gauche) */}
      <button onClick={exitCreate} aria-label={t('record.routeCreatorClose')} style={{ ...fb, position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, zIndex: 1000 }}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
      </button>

      {/* Pile latérale droite : recherche · styles de carte · boussole */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setSearchOpen(true)} aria-label={t('record.routeCreatorSearch')} style={fb}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        </button>
        <button onClick={() => setLayersOpen(o => !o)} aria-label={t('record.routeCreatorMapStyles')} style={fb}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>
        </button>
        <button onClick={recenter} aria-label={t('record.routeCreatorCompass')} style={fb}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 5l2.4 6.6L21 14l-6.6-1.4z" fill="#EF4444"/><path d="M12 19l-2.4-6.6L3 10l6.6 1.4z" fill="currentColor" opacity="0.55"/></svg>
        </button>
      </div>

      {/* Popover styles de carte */}
      {layersOpen && (
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 62px)', right: 64, zIndex: 1001, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.22)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130 }}>
          {(['std', 'sat', 'hyb'] as Layer[]).map(l => {
            const on = layer === l
            return (
              <button key={l} onClick={() => { setLayer(l); setLayersOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)', fontSize: 13.5, fontWeight: on ? 600 : 500, cursor: 'pointer', textAlign: 'left' }}>
                {LAYER_LABEL[l]}
                {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
            )
          })}
        </div>
      )}

      {/* Recherche d'un lieu */}
      {searchOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1002, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: 'calc(env(safe-area-inset-top) + 10px) 12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '9px 12px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void geocode() }}
                placeholder={t('record.routeCreatorSearchPlaceholder')} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)' }} />
            </div>
            <button onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchQ('') }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '4px 6px' }}>{t('record.routeCreatorCancel')}</button>
          </div>
          {(searching || searchResults.length > 0) && (
            <div style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
              {searching && <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 4px', margin: 0 }}>{t('record.routeCreatorSearching')}</p>}
              {searchResults.map((res, i) => (
                <button key={i} onClick={() => { mapRef.current?.setView([res.lat, res.lng], 14); setSearchOpen(false); setSearchResults([]); setSearchQ('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '11px 8px', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{res.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panneau bas — dépliable : glisse la poignée pour l'agrandir / le réduire */}
      <div ref={panelRef} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--bg-card)', borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -6px 26px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)', height: panelH != null ? panelH : undefined, maxHeight: '80vh' }}>
        {/* Poignée : glisser vers le haut = déplier, vers le bas = replier */}
        <div onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
          style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', cursor: 'ns-resize', touchAction: 'none', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)' }} />
        </div>

        {/* Contenu (défile quand le panneau est déplié) */}
        <div style={{ flex: panelH != null ? 1 : undefined, minHeight: 0, overflowY: panelH != null ? 'auto' : 'visible' }}>
          {/* Sports — sélection par logos */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '2px 14px 8px', WebkitOverflowScrolling: 'touch' }}>
            {SPORT_CHIPS.map(({ id, Icon, label }) => {
              const on = sport === id
              return (
                <button key={id} onClick={() => pickSport(id)} aria-label={label} title={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '7px 13px', borderRadius: 999,
                    background: on ? 'var(--primary)' : 'var(--bg-card2)', border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                    color: on ? 'var(--on-primary)' : 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600 }}>
                  <Icon size={17} stroke={1.9} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {/* Point count + édition (annuler / refaire / import GPX) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 8px' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{snapping ? t('record.routeCreatorCalculating') : `${waypoints.length} point${waypoints.length !== 1 ? 's' : ''}`}</span>
            <div style={{ flex: 1 }} />
            <button onClick={undo} disabled={!waypoints.length} aria-label={t('record.routeCreatorUndo')} style={{ ...editBtn, opacity: waypoints.length ? 1 : 0.4 }}>
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 9a6 6 0 1 1 1.5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M3 5v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={redo} disabled={!redoStack.length} aria-label={t('record.routeCreatorRedo')} style={{ ...editBtn, opacity: redoStack.length ? 1 : 0.4 }}>
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M15 9a6 6 0 1 0-1.5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M15 5v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <label style={editBtn} aria-label={t('record.routeCreatorImportGpx')}>
              <input type="file" accept=".gpx" onChange={handleGPX} style={{ display: 'none' }} />
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4-4 4 4M3 15h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </label>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '4px 16px 6px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {[
              { label: t('record.routeCreatorDistance'), value: distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)}` : `${Math.round(distanceM)}`, unit: distanceM >= 1000 ? 'km' : 'm' },
              { label: 'D+', value: `${Math.round(elevGain)}`, unit: 'm' },
              { label: t('record.routeCreatorGrade'), value: distanceM > 0 ? (elevGain / distanceM * 100).toFixed(1) : '--', unit: '%' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 10px', flex: 1, borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '2px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}<span style={{ fontSize: 9, color: 'var(--text-dim)' }}> {s.unit}</span></p>
              </div>
            ))}
          </div>

          {/* Profil altimétrique — pleine largeur, lisse */}
          <div style={{ padding: '8px 12px 4px' }}>
            <ElevationChart data={elevationProfile} surfaces={surfaces} height={120} isDark={isDark} snappedPoints={snappedPoints} onPositionChange={setScrubPosition} />
          </div>
        </div>

        {/* Enregistrer — bouton compact, épinglé */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 16px 10px', flexShrink: 0 }}>
          <button onClick={() => setShowSave(true)} disabled={waypoints.length < 2}
            style={{ minWidth: 200, height: 44, padding: '0 34px', borderRadius: 999, background: waypoints.length < 2 ? 'var(--bg-card2)' : 'var(--primary)', border: 'none', color: waypoints.length < 2 ? 'var(--text-dim)' : 'var(--on-primary)', fontSize: 14.5, fontWeight: 700, cursor: waypoints.length < 2 ? 'default' : 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
            {t('record.routeCreatorSave')}
          </button>
        </div>
      </div>

      {showSave && <RouteSaveForm routeName={routeName} onChangeName={setRouteName} onSave={handleSave} onClose={() => setShowSave(false)} isDark={isDark} />}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
