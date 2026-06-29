'use client'
// ══════════════════════════════════════════════════════════════════
// RouteNavScreen — navigation plein écran d'un parcours (façon app Plan).
// Carte plein écran + tracé + position live ; en haut une bannière coulissante
// (haut→bas) avec la prochaine manœuvre ; en bas km restants / temps estimé /
// D+ restant ; en surimpression (sans bulle) vitesse / FC / watts instantanés.
// Guidage virage par virage via OpenRouteService + bip + vibration.
// Mobile — monté en overlay (portal) par les écrans d'activité.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { navigationRoute, type NavStep } from '@/lib/openrouteservice'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'
const TILE = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`

interface LatLng { lat: number; lng: number }
export interface NavRouteInput {
  snapped_points: LatLng[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: LatLng[]
  sport?: string
}

interface Props {
  route?: NavRouteInput | null
  sport: string
  showWatts: boolean
  hr?: number | null
  watts?: number | null
  onClose: () => void
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
const DEFAULT_SPEED: Record<string, number> = { cycling: 22, mtb: 16, running: 10, trail: 8, hiking: 5 }

function Follow({ pos }: { pos: LatLng | null }) {
  const map = useMap()
  useEffect(() => { if (pos) map.setView([pos.lat, pos.lng], map.getZoom() < 14 ? 15 : map.getZoom(), { animate: true }) }, [map, pos])
  return null
}

function beep() {
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    const ctx = new AC()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880; o.type = 'sine'
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
    o.start(); o.stop(ctx.currentTime + 0.26)
    setTimeout(() => ctx.close().catch(() => {}), 400)
  } catch { /* ignore */ }
}

export default function RouteNavScreen({ route, sport, showWatts, hr, watts, onClose }: Props) {
  const [pos, setPos] = useState<LatLng | null>(null)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [steps, setSteps] = useState<NavStep[]>([])
  const [bannerUp, setBannerUp] = useState(true)   // bannière déroulée
  const lastPosRef = useRef<{ p: LatLng; t: number } | null>(null)
  const announcedRef = useRef<Record<number, number>>({})   // stepIdx → dernier palier annoncé
  const bannerStartY = useRef(0)

  const line = route?.snapped_points ?? []
  const hasRoute = line.length > 1
  const totalM = useMemo(() => {
    let d = 0; for (let i = 1; i < line.length; i++) d += haversine(line[i - 1], line[i]); return d
  }, [line])
  const cum = useMemo(() => {
    const a = [0]; for (let i = 1; i < line.length; i++) a.push(a[i - 1] + haversine(line[i - 1], line[i])); return a
  }, [line])
  const totalGain = useMemo(() => {
    const ep = route?.elevation_profile ?? []; let g = 0
    for (let i = 1; i < ep.length; i++) { const d = ep[i].altitudeM - ep[i - 1].altitudeM; if (d > 0) g += d }
    return g
  }, [route?.elevation_profile])

  // Étapes de navigation (manœuvres) — best effort.
  useEffect(() => {
    let alive = true
    const wps = route?.waypoints
    if (!wps || wps.length < 2) return
    navigationRoute(wps, route?.sport ?? sport)
      .then(r => { if (alive) setSteps(r.steps) })
      .catch(() => { /* pas de guidage si ORS indisponible */ })
    return () => { alive = false }
  }, [route?.waypoints, route?.sport, sport])

  // Position live (watchPosition) + vitesse.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      p => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude }
        setPos(next)
        const now = Date.now()
        if (typeof p.coords.speed === 'number' && p.coords.speed >= 0) {
          setSpeedKmh(p.coords.speed * 3.6)
        } else if (lastPosRef.current) {
          const dt = (now - lastPosRef.current.t) / 1000
          if (dt > 0.5) { const d = haversine(lastPosRef.current.p, next); setSpeedKmh(Math.min(120, (d / dt) * 3.6)) }
        }
        lastPosRef.current = { p: next, t: now }
      },
      () => {}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // Progression le long du tracé.
  const nearestIdx = useMemo(() => {
    if (!pos || line.length === 0) return 0
    let best = 0, bd = Infinity
    for (let i = 0; i < line.length; i++) { const d = haversine(pos, line[i]); if (d < bd) { bd = d; best = i } }
    return best
  }, [pos, line])
  const traveledM = cum[nearestIdx] ?? 0
  const remainingM = Math.max(0, totalM - traveledM)
  const remainingGain = useMemo(() => {
    const ep = route?.elevation_profile ?? []; let g = 0
    for (let i = 1; i < ep.length; i++) { if (ep[i].distanceM < traveledM) continue; const d = ep[i].altitudeM - ep[i - 1].altitudeM; if (d > 0) g += d }
    return g || totalGain
  }, [route?.elevation_profile, traveledM, totalGain])
  const avgKmh = speedKmh > 3 ? speedKmh : (DEFAULT_SPEED[sport] ?? 10)
  const remainMin = (remainingM / 1000) / avgKmh * 60

  // Prochaine manœuvre.
  const stepCum = useMemo(() => steps.map(s => {
    let best = 0, bd = Infinity
    for (let i = 0; i < line.length; i++) { const d = haversine(s, line[i]); if (d < bd) { bd = d; best = i } }
    return cum[best] ?? 0
  }), [steps, line, cum])
  const nextStepIdx = useMemo(() => {
    for (let i = 0; i < stepCum.length; i++) { if (stepCum[i] > traveledM + 8) return i }
    return -1
  }, [stepCum, traveledM])
  const distToTurn = nextStepIdx >= 0 ? Math.max(0, stepCum[nextStepIdx] - traveledM) : null
  const nextStep = nextStepIdx >= 0 ? steps[nextStepIdx] : null

  // Annonces (bip + vibration) aux paliers 200 / 80 / 20 m.
  useEffect(() => {
    if (nextStepIdx < 0 || distToTurn == null) return
    const paliers = [200, 80, 20]
    const last = announcedRef.current[nextStepIdx] ?? Infinity
    for (const pa of paliers) {
      if (distToTurn <= pa && last > pa) {
        announcedRef.current[nextStepIdx] = pa
        beep()
        try { navigator.vibrate?.([120, 60, 120]) } catch { /* ignore */ }
        setBannerUp(true)
        break
      }
    }
  }, [distToTurn, nextStepIdx])

  const fmtKm = (m: number) => (m / 1000).toFixed(m < 10000 ? 2 : 1)
  const fmtTime = (min: number) => { const h = Math.floor(min / 60); const m = Math.round(min % 60); return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min` }
  const center: [number, number] = pos ? [pos.lat, pos.lng] : (line[0] ? [line[0].lat, line[0].lng] : [48.8566, 2.3522])

  const metric = (label: string, value: string) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )

  const ui = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'var(--bg)' }}>
      <MapContainer center={center} zoom={15} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
        <TileLayer url={TILE} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
        {line.length > 1 && <Polyline positions={line.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#2563EB', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />}
        {pos && <>
          <CircleMarker center={[pos.lat, pos.lng]} radius={15} pathOptions={{ fillColor: '#06B6D4', fillOpacity: 0.18, color: 'transparent', weight: 0 }} />
          <CircleMarker center={[pos.lat, pos.lng]} radius={8} pathOptions={{ fillColor: '#06B6D4', fillOpacity: 1, color: '#fff', weight: 3 }} />
        </>}
        <Follow pos={pos} />
      </MapContainer>

      {/* Fermer — au-dessus des panes Leaflet (z-index interne jusqu'à 700) */}
      <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, zIndex: 1200, width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
      </button>

      {/* Bannière prochaine manœuvre — coulissante (haut → bas). Guidage seulement si parcours. */}
      {hasRoute && (
      <div
        onTouchStart={e => { bannerStartY.current = e.touches[0].clientY }}
        onTouchEnd={e => { const dy = e.changedTouches[0].clientY - bannerStartY.current; if (dy > 30) setBannerUp(false); else if (dy < -30) setBannerUp(true) }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1100, paddingTop: 'env(safe-area-inset-top)', transform: bannerUp ? 'translateY(0)' : 'translateY(-78%)', transition: 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}
      >
        <div style={{ margin: '8px 64px 0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {nextStep && (nextStep.type === 1 || nextStep.type === 3 || nextStep.type === 5)
                ? <path d="M5 19V11a4 4 0 014-4h8M13 3l4 4-4 4" />
                : nextStep && (nextStep.type === 0 || nextStep.type === 2 || nextStep.type === 4)
                ? <path d="M19 19V11a4 4 0 00-4-4H7M11 3L7 7l4 4" />
                : <path d="M12 19V5M6 11l6-6 6 6" />}
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {nextStep
              ? <>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextStep.instruction}</p>
                  <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, margin: '2px 0 0' }}>{distToTurn != null ? (distToTurn >= 1000 ? `dans ${(distToTurn / 1000).toFixed(1)} km` : `dans ${Math.round(distToTurn / 10) * 10} m`) : ''}</p>
                </>
              : <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0 }}>{steps.length ? 'Suivez l’itinéraire' : (route?.waypoints ? 'Guidage indisponible' : 'Pas de guidage (parcours sans points)')}</p>}
          </div>
        </div>
        <div onClick={() => setBannerUp(u => !u)} style={{ width: 44, height: 5, borderRadius: 5, background: 'var(--border-mid)', margin: '6px auto 0', cursor: 'pointer' }} />
      </div>
      )}

      {/* Surimpression : vitesse / FC / watts (sans bulle, par-dessus la carte) */}
      <div style={{ position: 'absolute', right: 14, bottom: `calc(${hasRoute ? 116 : 28}px + env(safe-area-inset-bottom))`, zIndex: 1100, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
        <div><span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{speedKmh.toFixed(1)}</span><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginLeft: 3 }}>km/h</span></div>
        {hr != null && <div><span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{Math.round(hr)}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginLeft: 3 }}>bpm</span></div>}
        {showWatts && watts != null && <div><span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{Math.round(watts)}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginLeft: 3 }}>W</span></div>}
      </div>

      {/* Bas : km restants / temps estimé / D+ restant — seulement avec un parcours */}
      {hasRoute && (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1100, background: 'var(--bg)', borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -6px 26px rgba(0,0,0,0.18)', padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center' }}>
        {metric('D+ restant', `${Math.round(remainingGain)} m`)}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
        {metric('Restant', `${fmtKm(remainingM)} km`)}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
        {metric('Temps est.', fmtTime(remainMin))}
      </div>
      )}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
