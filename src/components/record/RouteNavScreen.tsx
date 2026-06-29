'use client'
// ══════════════════════════════════════════════════════════════════
// RouteNavScreen — navigation plein écran d'un parcours (façon app Plan).
// Suit le thème jour/nuit (carte + panneaux). En haut : bannière de manœuvre
// que l'on tire VERS LE BAS pour dérouler toute la liste des changements de
// direction. En bas : restant (gros) + réalisé (petit) pour temps / km / D+ ;
// on tire VERS LE HAUT pour ouvrir le profil altimétrique avec la progression.
// Guidage virage par virage (ORS) + bip + vibration. Mobile — overlay (portal).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { navigationRoute, type NavStep } from '@/lib/openrouteservice'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'
const tileUrl = (dark: boolean) => `https://api.mapbox.com/styles/v1/mapbox/${dark ? 'dark-v11' : 'outdoors-v12'}/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`

interface LatLng { lat: number; lng: number }
export interface NavRouteInput {
  snapped_points: LatLng[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: LatLng[]
  sport?: string
}

interface Props {
  route: NavRouteInput
  sport: string
  showWatts: boolean
  isDark: boolean
  hr?: number | null
  watts?: number | null
  elapsedSec?: number
  distanceDoneM?: number
  gainDoneM?: number
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

// Icône de manœuvre (gauche / droite / tout droit) d'après le type ORS.
function ManeuverIcon({ type, size = 24 }: { type: number; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const right = type === 1 || type === 3 || type === 5 || type === 13
  const left = type === 0 || type === 2 || type === 4 || type === 12
  if (right) return <svg {...p}><path d="M5 19V11a4 4 0 014-4h8M13 3l4 4-4 4" /></svg>
  if (left)  return <svg {...p}><path d="M19 19V11a4 4 0 00-4-4H7M11 3L7 7l4 4" /></svg>
  return <svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
}

export default function RouteNavScreen({ route, sport, showWatts, isDark, hr, watts, elapsedSec = 0, distanceDoneM = 0, gainDoneM = 0, onClose }: Props) {
  const [pos, setPos] = useState<LatLng | null>(null)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [steps, setSteps] = useState<NavStep[]>([])
  const [bannerOpen, setBannerOpen] = useState(false)  // liste des manœuvres déroulée
  const [profileOpen, setProfileOpen] = useState(false) // profil altimétrique déroulé
  const lastPosRef = useRef<{ p: LatLng; t: number } | null>(null)
  const announcedRef = useRef<Record<number, number>>({})
  const bStartY = useRef(0)
  const pStartY = useRef(0)

  const txt = isDark ? '#fff' : '#0A0A0A'
  const txtShadow = isDark ? '0 1px 4px rgba(0,0,0,0.55)' : '0 1px 4px rgba(255,255,255,0.65)'
  const line = route.snapped_points

  const cum = useMemo(() => {
    const a = [0]; for (let i = 1; i < line.length; i++) a.push(a[i - 1] + haversine(line[i - 1], line[i])); return a
  }, [line])
  const totalM = cum[cum.length - 1] ?? 0
  const totalGain = useMemo(() => {
    const ep = route.elevation_profile ?? []; let g = 0
    for (let i = 1; i < ep.length; i++) { const d = ep[i].altitudeM - ep[i - 1].altitudeM; if (d > 0) g += d }
    return g
  }, [route.elevation_profile])

  // Étapes (manœuvres) — best effort.
  useEffect(() => {
    let alive = true
    const wps = route.waypoints
    if (!wps || wps.length < 2) return
    navigationRoute(wps, route.sport ?? sport).then(r => { if (alive) setSteps(r.steps) }).catch(() => {})
    return () => { alive = false }
  }, [route.waypoints, route.sport, sport])

  // Position live + vitesse.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      p => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude }
        setPos(next)
        const now = Date.now()
        if (typeof p.coords.speed === 'number' && p.coords.speed >= 0) setSpeedKmh(p.coords.speed * 3.6)
        else if (lastPosRef.current) { const dt = (now - lastPosRef.current.t) / 1000; if (dt > 0.5) { const d = haversine(lastPosRef.current.p, next); setSpeedKmh(Math.min(120, (d / dt) * 3.6)) } }
        lastPosRef.current = { p: next, t: now }
      },
      () => {}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const nearestIdx = useMemo(() => {
    if (!pos || line.length === 0) return 0
    let best = 0, bd = Infinity
    for (let i = 0; i < line.length; i++) { const d = haversine(pos, line[i]); if (d < bd) { bd = d; best = i } }
    return best
  }, [pos, line])
  const traveledM = cum[nearestIdx] ?? 0
  const remainingM = Math.max(0, totalM - traveledM)
  const remainingGain = useMemo(() => {
    const ep = route.elevation_profile ?? []; let g = 0
    for (let i = 1; i < ep.length; i++) { if (ep[i].distanceM < traveledM) continue; const d = ep[i].altitudeM - ep[i - 1].altitudeM; if (d > 0) g += d }
    return g || totalGain
  }, [route.elevation_profile, traveledM, totalGain])
  const avgKmh = speedKmh > 3 ? speedKmh : (DEFAULT_SPEED[sport] ?? 10)
  const remainMin = (remainingM / 1000) / avgKmh * 60

  const stepCum = useMemo(() => steps.map(s => {
    let best = 0, bd = Infinity
    for (let i = 0; i < line.length; i++) { const d = haversine(s, line[i]); if (d < bd) { bd = d; best = i } }
    return cum[best] ?? 0
  }), [steps, line, cum])
  const nextStepIdx = useMemo(() => { for (let i = 0; i < stepCum.length; i++) if (stepCum[i] > traveledM + 8) return i; return -1 }, [stepCum, traveledM])
  const distToTurn = nextStepIdx >= 0 ? Math.max(0, stepCum[nextStepIdx] - traveledM) : null
  const nextStep = nextStepIdx >= 0 ? steps[nextStepIdx] : null

  useEffect(() => {
    if (nextStepIdx < 0 || distToTurn == null) return
    const last = announcedRef.current[nextStepIdx] ?? Infinity
    for (const pa of [200, 80, 20]) {
      if (distToTurn <= pa && last > pa) { announcedRef.current[nextStepIdx] = pa; beep(); try { navigator.vibrate?.([120, 60, 120]) } catch {} ; break }
    }
  }, [distToTurn, nextStepIdx])

  const fmtKm = (m: number) => (m / 1000).toFixed(m < 10000 ? 2 : 1)
  const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
  const fmtTime = (sec: number) => { const h = Math.floor(sec / 3600); const m = Math.round((sec % 3600) / 60); return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min` }
  const center: [number, number] = pos ? [pos.lat, pos.lng] : (line[0] ? [line[0].lat, line[0].lng] : [48.8566, 2.3522])

  // Profil altimétrique (SVG) — partie réalisée colorée, reste estompé.
  const ep = route.elevation_profile ?? []
  const W = 320, H = 90
  const alts = ep.map(e => e.altitudeM)
  const aMin = alts.length ? Math.min(...alts) : 0, aMax = alts.length ? Math.max(...alts) : 1
  const aR = (aMax - aMin) || 1
  const px = (d: number) => (totalM ? (d / totalM) * W : 0)
  const py = (a: number) => H - ((a - aMin) / aR) * H
  const ptsAll = ep.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`).join(' ')
  const doneEp = ep.filter(e => e.distanceM <= traveledM)
  const ptsDone = doneEp.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`).join(' ')
  const doneAreaPts = doneEp.length ? `0,${H} ${ptsDone} ${px(traveledM).toFixed(1)},${H}` : ''

  const Metric = ({ label, big, small }: { label: string; big: string; small: string }) => (
    <div style={{ flex: 1, textAlign: 'center', padding: '0 6px' }}>
      <p style={{ fontSize: 22, fontWeight: 800, color: txt, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{big}</p>
      <p style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.45)' : 'var(--text-dim)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--text-mid)', margin: '3px 0 0', fontVariantNumeric: 'tabular-nums' }}>{small}</p>
    </div>
  )

  const ui = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'var(--bg)' }}>
      <MapContainer center={center} zoom={15} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
        <TileLayer url={tileUrl(isDark)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
        {line.length > 1 && <Polyline positions={line.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#2563EB', weight: 5, opacity: 0.92, lineCap: 'round', lineJoin: 'round' }} />}
        {pos && <>
          <CircleMarker center={[pos.lat, pos.lng]} radius={15} pathOptions={{ fillColor: '#06B6D4', fillOpacity: 0.18, color: 'transparent', weight: 0 }} />
          <CircleMarker center={[pos.lat, pos.lng]} radius={8} pathOptions={{ fillColor: '#06B6D4', fillOpacity: 1, color: '#fff', weight: 3 }} />
        </>}
        <Follow pos={pos} />
      </MapContainer>

      {/* Fermer */}
      <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, zIndex: 1200, width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
      </button>

      {/* Bannière manœuvre — tirer VERS LE BAS pour dérouler toute la liste */}
      <div
        onTouchStart={e => { bStartY.current = e.touches[0].clientY }}
        onTouchEnd={e => { const dy = e.changedTouches[0].clientY - bStartY.current; if (dy > 30) setBannerOpen(true); else if (dy < -30) setBannerOpen(false) }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1100, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div style={{ margin: '8px 12px 0 64px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 6px 24px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
          {/* Prochaine manœuvre (toujours visible) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ManeuverIcon type={nextStep?.type ?? 6} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {nextStep
                ? <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextStep.instruction}</p>
                    <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, margin: '2px 0 0' }}>{distToTurn != null ? (distToTurn >= 1000 ? `dans ${(distToTurn / 1000).toFixed(1)} km` : `dans ${Math.round(distToTurn / 10) * 10} m`) : ''}</p>
                  </>
                : <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0 }}>{steps.length ? 'Suivez l’itinéraire' : (route.waypoints ? 'Guidage indisponible' : 'Pas de guidage (parcours sans points)')}</p>}
            </div>
          </div>
          {/* Liste complète des manœuvres (dépliée) */}
          {bannerOpen && steps.length > 0 && (
            <div style={{ maxHeight: '46vh', overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
              {steps.map((s, i) => {
                const ahead = stepCum[i] > traveledM + 8
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: ahead ? 1 : 0.4 }}>
                    <span style={{ color: i === nextStepIdx ? 'var(--primary)' : 'var(--text-mid)', flexShrink: 0 }}><ManeuverIcon type={s.type} size={20} /></span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)' }}>{s.instruction}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtDist(Math.max(0, stepCum[i] - traveledM))}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Poignée : tirer vers le bas = dérouler */}
        <div onClick={() => setBannerOpen(o => !o)} style={{ width: 44, height: 5, borderRadius: 5, background: 'var(--border-mid)', margin: '6px auto 0', cursor: 'pointer' }} />
      </div>

      {/* Surimpression : vitesse / FC / watts (par-dessus la carte, sans bulle) */}
      <div style={{ position: 'absolute', right: 14, bottom: 'calc(150px + env(safe-area-inset-bottom))', zIndex: 1100, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, textShadow: txtShadow }}>
        <div><span style={{ fontSize: 26, fontWeight: 800, color: txt, fontVariantNumeric: 'tabular-nums' }}>{speedKmh.toFixed(1)}</span><span style={{ fontSize: 12, color: txt, opacity: 0.8, marginLeft: 3 }}>km/h</span></div>
        {hr != null && <div><span style={{ fontSize: 20, fontWeight: 700, color: txt }}>{Math.round(hr)}</span><span style={{ fontSize: 11, color: txt, opacity: 0.8, marginLeft: 3 }}>bpm</span></div>}
        {showWatts && watts != null && <div><span style={{ fontSize: 20, fontWeight: 700, color: txt }}>{Math.round(watts)}</span><span style={{ fontSize: 11, color: txt, opacity: 0.8, marginLeft: 3 }}>W</span></div>}
      </div>

      {/* Bas : restant (gros) + réalisé (petit) ; tirer vers le HAUT = profil */}
      <div
        onTouchStart={e => { pStartY.current = e.touches[0].clientY }}
        onTouchEnd={e => { const dy = e.changedTouches[0].clientY - pStartY.current; if (dy < -30) setProfileOpen(true); else if (dy > 30) setProfileOpen(false) }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1100, background: 'var(--bg)', borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -6px 26px rgba(0,0,0,0.2)', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <div onClick={() => setProfileOpen(o => !o)} style={{ width: 44, height: 5, borderRadius: 5, background: 'var(--border-mid)', margin: '8px auto 4px', cursor: 'pointer' }} />

        {/* Profil altimétrique (déplié) */}
        {profileOpen && ep.length > 1 && (
          <div style={{ padding: '4px 14px 8px' }}>
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
              <polygon points={`0,${H} ${ptsAll} ${W},${H}`} fill="var(--border)" opacity={0.5} />
              {doneAreaPts && <polygon points={doneAreaPts} fill="var(--primary-dim)" />}
              <polyline points={ptsAll} fill="none" stroke="var(--text-dim)" strokeWidth="1.5" />
              {ptsDone && <polyline points={ptsDone} fill="none" stroke="var(--primary)" strokeWidth="2" />}
              <line x1={px(traveledM)} y1={0} x2={px(traveledM)} y2={H} stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3,3" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>Réalisé {fmtKm(traveledM)} km</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>Total {fmtKm(totalM)} km · D+ {Math.round(totalGain)} m</span>
            </div>
          </div>
        )}

        {/* Données restant / réalisé */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 4px 6px' }}>
          <Metric label="D+ restant" big={`${Math.round(remainingGain)} m`} small={`fait ${Math.round(gainDoneM)} m`} />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          <Metric label="Restant" big={`${fmtKm(remainingM)} km`} small={`fait ${fmtKm(distanceDoneM)} km`} />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          <Metric label="Temps est." big={fmtTime(remainMin * 60)} small={`écoulé ${fmtTime(elapsedSec)}`} />
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
