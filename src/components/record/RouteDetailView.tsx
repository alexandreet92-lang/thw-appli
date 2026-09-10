'use client'
// ══════════════════════════════════════════════════════════════════════════
// Détail d'un parcours (façon Strava). Carte Leaflet interactive + profil
// altimétrique SVG synchronisés : survoler le profil déplace le point sur la
// carte, avec une bulle (distance / altitude) qui suit la souris. Bouton
// « Modifier » + menu déroulant (Dupliquer / Exporter / Supprimer), et un bouton
// principal « Utiliser ce parcours ». Slide coulissant entrée + sortie.
// Fichier chargé en dynamic(ssr:false) → Leaflet uniquement côté client.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { currentLocale } from '@/lib/i18n'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'
const tileUrl = (dark: boolean) => TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/${dark ? 'dark-v11' : 'outdoors-v12'}/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export interface RouteDetailData {
  id: string; name: string; sport: string; user_id?: string
  distance_m: number | null; elevation_gain_m: number | null
  snapped_points: { lat: number; lng: number; altitude?: number }[] | null
  waypoints: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[] | null
  created_at: string
}

interface Props {
  route: RouteDetailData
  isDark: boolean
  sportLabel: string
  onClose: () => void
  onUse: () => void
  onEdit?: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
  pushTargets?: string[]
  onPush?: (provider: string) => void
}

const SPEED_KMH: Record<string, number> = { cycling: 25, gravel: 22, mtb: 15, trail: 9, running: 10, hiking: 4.5, walking: 4.5 }
const ACCENT = '#06B6D4'

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}
function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

export default function RouteDetailView({ route, isDark, sportLabel, onClose, onUse, onEdit, onDuplicate, onExport, onDelete, pushTargets = [], onPush }: Props) {
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [author, setAuthor] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const profRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auteur du parcours (moi / autre).
  useEffect(() => {
    let alive = true
    void (async () => {
      if (!route.user_id) return
      const me = await getCurrentUser()
      if (me && me.id === route.user_id) { if (alive) setAuthor('Vous'); return }
      const { data } = await createClient().from('profiles').select('full_name, first_name, preferred_name').eq('id', route.user_id).maybeSingle()
      if (alive && data) setAuthor((data.preferred_name || data.full_name || data.first_name || null) as string | null)
    })()
    return () => { alive = false }
  }, [route.user_id])

  // Échantillons : lat/lng + distance cumulée + altitude (mesurée ou interpolée).
  const samples = useMemo(() => {
    const pts = (route.snapped_points && route.snapped_points.length >= 2 ? route.snapped_points : route.waypoints) ?? []
    if (pts.length < 2) return [] as { lat: number; lng: number; d: number; alt: number }[]
    const prof = route.elevation_profile ?? []
    const altAt = (d: number): number => {
      if (prof.length === 0) return 0
      if (d <= prof[0].distanceM) return prof[0].altitudeM
      if (d >= prof[prof.length - 1].distanceM) return prof[prof.length - 1].altitudeM
      for (let i = 1; i < prof.length; i++) {
        if (prof[i].distanceM >= d) {
          const a = prof[i - 1], b = prof[i], t = (d - a.distanceM) / Math.max(1e-6, b.distanceM - a.distanceM)
          return a.altitudeM + t * (b.altitudeM - a.altitudeM)
        }
      }
      return prof[prof.length - 1].altitudeM
    }
    let cum = 0
    const out: { lat: number; lng: number; d: number; alt: number }[] = []
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) cum += haversine(pts[i - 1], pts[i])
      const p = pts[i] as { lat: number; lng: number; altitude?: number }
      out.push({ lat: p.lat, lng: p.lng, d: cum, alt: typeof p.altitude === 'number' ? p.altitude : altAt(cum) })
    }
    return out
  }, [route])

  const totalM = samples.length ? samples[samples.length - 1].d : (route.distance_m ?? 0)
  const { gain, loss, minAlt, maxAlt } = useMemo(() => {
    let g = 0, l = 0, mn = Infinity, mx = -Infinity
    for (let i = 0; i < samples.length; i++) {
      const a = samples[i].alt; mn = Math.min(mn, a); mx = Math.max(mx, a)
      if (i > 0) { const dd = samples[i].alt - samples[i - 1].alt; if (dd > 0) g += dd; else l += -dd }
    }
    if (!isFinite(mn)) { mn = 0; mx = 0 }
    return { gain: route.elevation_gain_m ?? Math.round(g), loss: Math.round(l), minAlt: mn, maxAlt: mx }
  }, [samples, route.elevation_gain_m])

  const speed = SPEED_KMH[route.sport] ?? 18
  const estSec = (totalM / 1000) / speed * 3600
  const bounds = useMemo(() => {
    if (samples.length < 2) return null
    const lats = samples.map(s => s.lat), lngs = samples.map(s => s.lng)
    return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]] as [[number, number], [number, number]]
  }, [samples])

  // Palette (record flow = hors design-system enforced → couleurs directes ok).
  const bg = isDark ? '#0A0A0A' : '#FFFFFF'
  const panel = isDark ? '#101317' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#6B7280'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F8'
  const border = isDark ? 'rgba(255,255,255,0.09)' : '#E5E7EB'

  // Profil altimétrique — chemins SVG.
  const PW = 800, PH = 200, PB = 26
  const prof = useMemo(() => {
    if (samples.length < 2 || maxAlt <= minAlt) return null
    const x = (d: number) => (d / Math.max(1, totalM)) * PW
    const y = (a: number) => PH - PB - ((a - minAlt) / Math.max(1, maxAlt - minAlt)) * (PH - PB - 8)
    const line = samples.map(s => `${x(s.d).toFixed(1)},${y(s.alt).toFixed(1)}`).join(' ')
    const area = `0,${PH - PB} ${line} ${PW},${PH - PB}`
    return { x, y, line, area }
  }, [samples, totalM, minAlt, maxAlt])

  const onProfMove = (clientX: number) => {
    const el = profRef.current; if (!el || samples.length < 2) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const d = ratio * totalM
    // Recherche binaire de l'échantillon le plus proche par distance.
    let lo = 0, hi = samples.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (samples[mid].d < d) lo = mid + 1; else hi = mid }
    if (lo > 0 && Math.abs(samples[lo - 1].d - d) < Math.abs(samples[lo].d - d)) lo--
    setHover(lo)
  }

  const hp = hover != null ? samples[hover] : null
  const stat = (label: string, value: string, color = text) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: dim, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
    </div>
  )

  const menuItem = (label: string, danger = false, onClick?: () => void, icon?: React.ReactNode) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 11px', borderRadius: 8, border: 'none', background: 'transparent', color: danger ? '#EF4444' : text, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}>{icon}{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', transform: shown && !closing ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 300ms cubic-bezier(0.32,0.72,0,1)' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <button onClick={requestClose} aria-label="Retour" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ACCENT, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Itinéraires
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '22px 20px 40px', display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 28, alignItems: 'start' }} className="route-detail-grid">
          {/* Colonne gauche : titre, actions, stats */}
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: text, margin: '0 0 4px', lineHeight: 1.1 }}>{route.name}</h1>
            <p style={{ fontSize: 13, color: dim, margin: '0 0 18px' }}>
              {sportLabel} · {new Date(route.created_at).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}{author ? ` · ${author}` : ''}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              <button onClick={onUse} style={{ flex: '1 1 auto', minWidth: 150, height: 44, borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Utiliser ce parcours
              </button>
              <div style={{ position: 'relative', display: 'flex' }}>
                <button onClick={() => onEdit?.()} disabled={!onEdit} style={{ height: 44, padding: '0 16px', borderRadius: '12px 0 0 12px', border: `1px solid ${border}`, borderRight: 'none', background: surface, color: text, fontSize: 14, fontWeight: 700, cursor: onEdit ? 'pointer' : 'default', opacity: onEdit ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                  Modifier
                </button>
                <button onClick={() => setMenuOpen(o => !o)} aria-label="Plus d'options" style={{ height: 44, width: 40, borderRadius: '0 12px 12px 0', border: `1px solid ${border}`, background: surface, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {menuOpen && (
                  <>
                    <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
                    <div style={{ position: 'absolute', top: 48, right: 0, zIndex: 5, background: panel, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', padding: 5, minWidth: 190, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {menuItem('Dupliquer', false, () => { setMenuOpen(false); onDuplicate() }, <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>)}
                      {menuItem('Exporter en GPX', false, () => { setMenuOpen(false); onExport() }, <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>)}
                      {pushTargets.map(p => menuItem(`Envoyer vers ${p === 'garmin' ? 'Garmin' : p === 'wahoo' ? 'Wahoo' : p}`, false, () => { setMenuOpen(false); onPush?.(p) }, <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /></svg>))}
                      {menuItem('Supprimer', true, () => { setMenuOpen(false); setConfirmDel(true) }, <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px', padding: '18px 0', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
              {stat('Distance', `${(totalM / 1000).toFixed(1)} km`)}
              {stat('Temps estimé', fmtDuration(estSec))}
              {stat('Dénivelé +', `${Math.round(gain)} m`)}
              {stat('Dénivelé −', `${Math.round(loss)} m`)}
            </div>
            <p style={{ fontSize: 12, color: dim, margin: '12px 0 0' }}>Estimation à {speed} km/h de moyenne.</p>
          </div>

          {/* Colonne droite : carte + profil */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 16, overflow: 'hidden', border: `1px solid ${border}`, background: surface }}>
              {bounds ? (
                <MapContainer bounds={bounds} boundsOptions={{ padding: [24, 24] }} zoomControl scrollWheelZoom={false} attributionControl={false} style={{ position: 'absolute', inset: 0, background: surface }}>
                  <TileLayer url={tileUrl(isDark)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
                  <Polyline positions={samples.map(s => [s.lat, s.lng]) as [number, number][]} pathOptions={{ color: '#fff', weight: 6, opacity: 0.7 }} />
                  <Polyline positions={samples.map(s => [s.lat, s.lng]) as [number, number][]} pathOptions={{ color: ACCENT, weight: 3.5 }} />
                  <CircleMarker center={[samples[0].lat, samples[0].lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#10B981', fillOpacity: 1 }} />
                  <CircleMarker center={[samples[samples.length - 1].lat, samples[samples.length - 1].lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#EF4444', fillOpacity: 1 }} />
                  {hp && <CircleMarker center={[hp.lat, hp.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: ACCENT, fillOpacity: 1 }} />}
                </MapContainer>
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dim, fontSize: 13 }}>Aucun tracé</div>
              )}
            </div>

            {/* Profil altimétrique */}
            {prof && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: text }}>Profil altimétrique</span>
                  <span style={{ fontSize: 12, color: dim }}>{Math.round(minAlt)}–{Math.round(maxAlt)} m</span>
                </div>
                <div ref={profRef} onMouseMove={e => onProfMove(e.clientX)} onMouseLeave={() => setHover(null)}
                  onTouchMove={e => onProfMove(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}
                  style={{ position: 'relative', width: '100%', aspectRatio: `${PW} / ${PH}`, cursor: 'crosshair' }}>
                  <svg width="100%" viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="rdv-elev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <polygon points={prof.area} fill="url(#rdv-elev)" />
                    <polyline points={prof.line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    {hp && <line x1={prof.x(hp.d)} y1={0} x2={prof.x(hp.d)} y2={PH - PB} stroke={dim} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
                    {hp && <circle cx={prof.x(hp.d)} cy={prof.y(hp.alt)} r={4} fill={ACCENT} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
                  </svg>
                  {/* Bulle suivant la souris */}
                  {hp && (
                    <div style={{ position: 'absolute', top: 0, left: `${(hp.d / Math.max(1, totalM)) * 100}%`, transform: `translateX(${hp.d / Math.max(1, totalM) > 0.85 ? '-105%' : '8px'})`, pointerEvents: 'none', background: panel, border: `1px solid ${border}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.22)', padding: '6px 9px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: text, fontVariantNumeric: 'tabular-nums' }}>{Math.round(hp.alt)} m</div>
                      <div style={{ fontSize: 11, color: dim, fontVariantNumeric: 'tabular-nums' }}>km {(hp.d / 1000).toFixed(1)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation suppression */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(false)} style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: panel, borderRadius: 16, border: `1px solid ${border}`, padding: 22, maxWidth: 360, width: '100%' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: text, margin: '0 0 6px' }}>Supprimer ce parcours ?</p>
            <p style={{ fontSize: 13, color: dim, margin: '0 0 18px', lineHeight: 1.5 }}>« {route.name} » sera définitivement supprimé.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: 'none', background: surface, color: text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => { setConfirmDel(false); onDelete(); requestClose() }} style={{ flex: 1, height: 42, borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 820px) {
          .route-detail-grid { grid-template-columns: 1fr !important; }
        }
        .route-detail-grid .leaflet-container { background: ${surface}; }
      `}</style>
    </div>
  )
}
