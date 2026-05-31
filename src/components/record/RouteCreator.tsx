'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet'
import type L from 'leaflet'
import { createClient } from '@/lib/supabase/client'
import { snapRoute } from '@/lib/openrouteservice'
import type { Waypoint, SnappedPoint, Surface, ElevPoint } from '@/lib/openrouteservice'
import { parseGPX } from '@/lib/gpxParser'
import ElevationChart from './ElevationChart'
import RouteSaveForm from './RouteSaveForm'
import RouteLibrary from './RouteLibrary'
import SegmentSaveForm from '../segments/SegmentSaveForm'

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

function GeolocateOnMount({ onPosition }: { onPosition: (pos: [number, number]) => void }) {
  const map = useMap()
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      map.setView([46.603354, 1.888334], 6)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        map.setView(p, 14)
        onPosition(p)
      },
      () => map.setView([46.603354, 1.888334], 6),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
}

interface Props { onClose: () => void; onLoadRoute: (route: ActiveRoute) => void; isDark: boolean }

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function RouteCreator({ onClose, onLoadRoute, isDark }: Props) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [snappedPoints, setSnappedPoints] = useState<SnappedPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [elevGain, setElevGain] = useState(0)
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [elevationProfile, setElevationProfile] = useState<ElevPoint[]>([])
  const [redoStack, setRedoStack] = useState<Waypoint[]>([])
  const [view, setView] = useState<'creating' | 'library'>('creating')
  const [mode, setMode] = useState<'route' | 'segment'>('route')
  const [sport, setSport] = useState('cycling')
  const [routeName, setRouteName] = useState('')
  const [layer, setLayer] = useState<Layer>('std')
  const [showSave, setShowSave] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(true)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [scrubPosition, setScrubPosition] = useState<{ lat: number; lng: number } | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const touchStartY = useRef(0)
  const panelH = panelExpanded ? '45vh' : '72px'

  const doSnap = useCallback(async (pts: Waypoint[], sp: string) => {
    if (pts.length < 2) return
    console.log('Snapping with waypoints:', pts, 'sport:', sp, 'ORS key present:', !!process.env.NEXT_PUBLIC_ORS_KEY)
    setSnapping(true)
    try {
      const r = await snapRoute(pts, sp)
      console.log('ORS response: snappedPoints', r.snappedPoints.length, 'distanceM', r.distanceM)
      setSnappedPoints(r.snappedPoints); setDistanceM(r.distanceM)
      setElevGain(r.elevGain); setSurfaces(r.surfaces); setElevationProfile(r.elevationProfile)
    } catch (err) {
      console.log('ORS error:', err, '— falling back to straight-line segments')
      // Fallback: draw straight lines between waypoints when ORS is unavailable
      setSnappedPoints(pts.map(p => ({ ...p, altitude: 0 })))
    }
    setSnapping(false)
  }, [])

  const addWaypoint = useCallback(async (p: Waypoint) => {
    const next = [...waypoints, p]; setWaypoints(next); setRedoStack([])
    if (mode === 'segment') {
      // Skip ORS — compute straight-line distance between waypoints
      let d = 0
      for (let i = 1; i < next.length; i++) d += haversineM(next[i-1].lat, next[i-1].lng, next[i].lat, next[i].lng)
      setDistanceM(d)
      setSnappedPoints(next.map(pt => ({ ...pt, altitude: 0 })))
    } else {
      await doSnap(next, sport)
    }
  }, [waypoints, sport, mode, doSnap])

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

  const handleSave = async (name: string, isPublic: boolean) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    if (mode === 'segment') {
      await supabase.from('segments').insert({
        user_id: user.id, name, sport, is_public: isPublic,
        distance_m: distanceM, elevation_gain_m: elevGain,
        points: waypoints,
      })
    } else {
      await supabase.from('routes').insert({
        user_id: user.id, name, sport, is_public: isPublic,
        distance_m: distanceM, elevation_gain_m: elevGain,
        waypoints, snapped_points: snappedPoints, elevation_profile: elevationProfile, surfaces,
      })
    }
    setShowSave(false); onClose()
  }

  const fb: React.CSSProperties = { width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  // Use snapped route if available, otherwise draw straight lines between waypoints as fallback
  const displayPts: [number, number][] = snappedPoints.length >= 2
    ? snappedPoints.map(p => [p.lat, p.lng])
    : waypoints.length >= 2
    ? waypoints.map(p => [p.lat, p.lng])
    : []

  if (view === 'library') return createPortal(
    <RouteLibrary isDark={isDark} onClose={() => setView('creating')}
      onUseRoute={route => { onLoadRoute(route); onClose() }} />,
    document.body
  )

  const ui = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, fontFamily: 'DM Sans, sans-serif', animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1)' }}>
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
          <Polyline positions={displayPts} pathOptions={{ color: '#06B6D4', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
        )}
        {waypoints.map((wp, i) => (
          <CircleMarker key={i} center={[wp.lat, wp.lng]} radius={7}
            pathOptions={{ fillColor: i === 0 ? '#10B981' : i === waypoints.length - 1 ? '#EF4444' : '#2563EB', fillOpacity: 1, color: 'white', weight: 2 }} />
        ))}
        {scrubPosition && (
          <CircleMarker
            center={[scrubPosition.lat, scrubPosition.lng]}
            radius={8}
            pathOptions={{ fillColor: '#EF4444', fillOpacity: 1, color: '#fff', weight: 2.5 }}
          />
        )}
      </MapContainer>

      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={fb}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 1l14 14M15 1L1 15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 2, gap: 2 }}>
            {(['route', 'segment'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setWaypoints([]); setSnappedPoints([]); setDistanceM(0); setElevGain(0) }}
                style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: mode === m ? 'white' : 'transparent', color: mode === m ? '#0A0A0A' : 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}>
                {m === 'route' ? 'Parcours' : 'Segment'}
              </button>
            ))}
          </div>
          <select value={sport} onChange={e => setSport(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="cycling">Vélo</option><option value="mtb">VTT</option>
            <option value="trail">Trail</option><option value="hiking">Randonnée</option>
          </select>
        </div>
        <button onClick={() => setView('library')} style={fb}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h14M2 14h14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
      </div>

      {/* Floating buttons */}
      <div style={{ position: 'absolute', bottom: `calc(${panelH} + 16px)`, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 10 }}>
        <button onClick={undo} disabled={!waypoints.length} style={{ ...fb, opacity: waypoints.length ? 1 : 0.4 }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9a6 6 0 1 1 1.5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M3 5v4h4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <label style={fb}><input type="file" accept=".gpx" onChange={handleGPX} style={{ display: 'none' }} /><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4-4 4 4M3 14h12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></label>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => { const pos: [number, number] = [p.coords.latitude, p.coords.longitude]; mapRef.current?.setView(pos, 15); setUserPosition(pos) })} style={fb}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white"/><path d="M9 1v3M9 14v3M1 9h3M14 9h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        <button onClick={redo} disabled={!redoStack.length} style={{ ...fb, opacity: redoStack.length ? 1 : 0.4 }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 9a6 6 0 1 0-1.5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M15 5v4h-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      </div>

      {/* Layer selector */}
      <div style={{ position: 'absolute', right: 12, bottom: `calc(${panelH} + 60px)`, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(['std', 'sat', 'hyb'] as Layer[]).map(l => (
          <button key={l} onClick={() => setLayer(l)} style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', background: layer === l ? '#fff' : 'rgba(0,0,0,0.55)', color: layer === l ? '#0A0A0A' : '#fff', backdropFilter: 'blur(8px)', fontSize: 11, fontWeight: 700 }}>
            {l === 'std' ? 'Std' : l === 'sat' ? 'Sat' : 'Hyb'}
          </button>
        ))}
      </div>

      {/* Bottom panel — draggable */}
      <div
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => {
          const delta = e.changedTouches[0].clientY - touchStartY.current
          if (delta > 50) setPanelExpanded(false)
          if (delta < -50) setPanelExpanded(true)
        }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, height: panelH, background: isDark ? '#0A0A0A' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)', transition: 'height 350ms cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}
      >
        {/* Drag indicator — click to toggle */}
        <div onClick={() => setPanelExpanded(p => !p)}
          style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(150,150,150,0.4)', margin: '8px auto', cursor: 'pointer', flexShrink: 0 }} />

        {/* Stats bar — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'}`, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>{snapping ? 'Calcul…' : `${waypoints.length} point${waypoints.length !== 1 ? 's' : ''}`}</span>
          <div style={{ flex: 1 }} />
          {[{ label: 'Distance', value: distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)}` : `${Math.round(distanceM)}`, unit: distanceM >= 1000 ? 'km' : 'm' }, { label: 'D+', value: `${Math.round(elevGain)}`, unit: 'm' }, { label: 'Pente', value: distanceM > 0 ? (elevGain / distanceM * 100).toFixed(1) : '--', unit: '%' }].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '0 10px', borderLeft: i > 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'}` : 'none' }}>
              <p style={{ fontSize: 9, color: '#8C8C8C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#fff' : '#0A0A0A', margin: '1px 0 0', lineHeight: 1 }}>{s.value}<span style={{ fontSize: 9, color: '#8C8C8C' }}> {s.unit}</span></p>
            </div>
          ))}
        </div>

        {/* Elevation + save — masqués si collapsed */}
        {panelExpanded && (
          <>
            <div style={{ flex: 1, padding: '4px 16px 0', overflow: 'hidden' }}>
              <div style={{ opacity: 1, transition: 'opacity 200ms' }}>
                <ElevationChart data={elevationProfile} surfaces={surfaces} height={110} isDark={isDark} snappedPoints={snappedPoints} onPositionChange={setScrubPosition} />
              </div>
            </div>
            <div style={{ padding: '6px 16px 8px', flexShrink: 0 }}>
              <button onClick={() => setShowSave(true)} disabled={waypoints.length < 2}
                style={{ width: '100%', height: 44, borderRadius: 14, background: waypoints.length < 2 ? (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6') : 'linear-gradient(135deg, #06B6D4, #2563EB)', border: 'none', color: waypoints.length < 2 ? '#8C8C8C' : '#fff', fontSize: 14, fontWeight: 600, cursor: waypoints.length < 2 ? 'default' : 'pointer' }}>
                {mode === 'segment' ? 'Créer le segment' : 'Enregistrer'}
              </button>
            </div>
          </>
        )}
      </div>

      {showSave && mode === 'route' && <RouteSaveForm routeName={routeName} onChangeName={setRouteName} onSave={handleSave} onClose={() => setShowSave(false)} isDark={isDark} />}
      {showSave && mode === 'segment' && <SegmentSaveForm sport={sport} onSave={handleSave} onClose={() => setShowSave(false)} isDark={isDark} />}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
