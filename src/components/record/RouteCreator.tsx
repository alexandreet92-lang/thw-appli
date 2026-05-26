'use client'
import { useState, useCallback, useRef } from 'react'
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

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''
const ATTR = '<a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a>'
const TILES = {
  std: `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${KEY}`,
  sat: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${KEY}`,
  hyb: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${KEY}`,
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

interface Props { onClose: () => void; onLoadRoute: (pts: { lat: number; lng: number }[]) => void; isDark: boolean }

export default function RouteCreator({ onClose, onLoadRoute, isDark }: Props) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [snappedPoints, setSnappedPoints] = useState<SnappedPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [elevGain, setElevGain] = useState(0)
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [elevationProfile, setElevationProfile] = useState<ElevPoint[]>([])
  const [redoStack, setRedoStack] = useState<Waypoint[]>([])
  const [view, setView] = useState<'creating' | 'library'>('creating')
  const [sport, setSport] = useState('cycling')
  const [routeName, setRouteName] = useState('')
  const [layer, setLayer] = useState<Layer>('std')
  const [showSave, setShowSave] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  const PANEL_H = 270

  const doSnap = useCallback(async (pts: Waypoint[], sp: string) => {
    if (pts.length < 2) return
    setSnapping(true)
    try {
      const r = await snapRoute(pts, sp)
      setSnappedPoints(r.snappedPoints); setDistanceM(r.distanceM)
      setElevGain(r.elevGain); setSurfaces(r.surfaces); setElevationProfile(r.elevationProfile)
    } catch { /* ORS not configured or error — skip silently */ }
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

  const fb: React.CSSProperties = { width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const polyPts = snappedPoints.map(p => [p.lat, p.lng] as [number, number])

  if (view === 'library') return createPortal(
    <RouteLibrary isDark={isDark} onClose={() => setView('creating')}
      onUseRoute={pts => { onLoadRoute(pts); onClose() }} />,
    document.body
  )

  const ui = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, fontFamily: 'DM Sans, sans-serif', animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <MapContainer center={[48.8566, 2.3522]} zoom={13} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
        <TileLayer url={TILES[layer]} tileSize={512} zoomOffset={-1} maxZoom={20} attribution={ATTR} />
        <MapClickHandler onAdd={addWaypoint} />
        <MapReady mapRef={mapRef} />
        {polyPts.length > 1 && <Polyline positions={polyPts} color="#06B6D4" weight={4} opacity={0.9} />}
        {waypoints.map((wp, i) => (
          <CircleMarker key={i} center={[wp.lat, wp.lng]} radius={7}
            pathOptions={{ fillColor: i === 0 ? '#10B981' : i === waypoints.length - 1 ? '#EF4444' : '#2563EB', fillOpacity: 1, color: 'white', weight: 2 }} />
        ))}
      </MapContainer>

      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={fb}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 1l14 14M15 1L1 15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{routeName || 'Nouveau parcours'}</span>
          <select value={sport} onChange={e => setSport(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="cycling">Vélo</option><option value="mtb">VTT</option>
            <option value="trail">Trail</option><option value="hiking">Randonnée</option>
          </select>
        </div>
        <button onClick={() => setView('library')} style={fb}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h14M2 14h14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
      </div>

      {/* Floating buttons */}
      <div style={{ position: 'absolute', bottom: PANEL_H + 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 10 }}>
        <button onClick={undo} disabled={!waypoints.length} style={{ ...fb, opacity: waypoints.length ? 1 : 0.4 }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9a6 6 0 1 1 1.5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M3 5v4h4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <label style={fb}><input type="file" accept=".gpx" onChange={handleGPX} style={{ display: 'none' }} /><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4-4 4 4M3 14h12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></label>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => mapRef.current?.setView([p.coords.latitude, p.coords.longitude], 15))} style={fb}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white"/><path d="M9 1v3M9 14v3M1 9h3M14 9h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        <button onClick={redo} disabled={!redoStack.length} style={{ ...fb, opacity: redoStack.length ? 1 : 0.4 }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 9a6 6 0 1 0-1.5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M15 5v4h-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      </div>

      {/* Layer selector */}
      <div style={{ position: 'absolute', right: 12, bottom: PANEL_H + 60, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(['std', 'sat', 'hyb'] as Layer[]).map(l => (
          <button key={l} onClick={() => setLayer(l)} style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', background: layer === l ? '#fff' : 'rgba(0,0,0,0.55)', color: layer === l ? '#0A0A0A' : '#fff', backdropFilter: 'blur(8px)', fontSize: 11, fontWeight: 700 }}>
            {l === 'std' ? 'Std' : l === 'sat' ? 'Sat' : 'Hyb'}
          </button>
        ))}
      </div>

      {/* Bottom panel */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, height: PANEL_H, background: isDark ? '#0A0A0A' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0 }}><div style={{ width: 40, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }} /></div>
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
        <div style={{ flex: 1, padding: '4px 16px 0', overflow: 'hidden' }}>
          <ElevationChart data={elevationProfile} surfaces={surfaces} height={110} isDark={isDark} />
        </div>
        <div style={{ padding: '6px 16px 8px', flexShrink: 0 }}>
          <button onClick={() => setShowSave(true)} disabled={waypoints.length < 2}
            style={{ width: '100%', height: 44, borderRadius: 14, background: waypoints.length < 2 ? (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6') : 'linear-gradient(135deg, #06B6D4, #2563EB)', border: 'none', color: waypoints.length < 2 ? '#8C8C8C' : '#fff', fontSize: 14, fontWeight: 600, cursor: waypoints.length < 2 ? 'default' : 'pointer' }}>
            Enregistrer
          </button>
        </div>
      </div>

      {showSave && <RouteSaveForm routeName={routeName} onChangeName={setRouteName} onSave={handleSave} onClose={() => setShowSave(false)} isDark={isDark} />}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
