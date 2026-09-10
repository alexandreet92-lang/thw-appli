'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import type { SnappedPoint } from '@/lib/openrouteservice'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { routeToGpx, downloadGpx } from '@/lib/gpxExport'
import { elevationGainLoss } from '@/lib/elevation'
import { FinishFlag } from './finishFlag'

const RouteDetailView = dynamic(() => import('./RouteDetailView'), { ssr: false })

type RouteType = 'training' | 'race'

interface Route {
  id: string; name: string; sport: string; is_public: boolean; user_id?: string
  route_type: RouteType | null
  distance_m: number | null; elevation_gain_m: number | null
  surfaces: { type: string; percent: number }[] | null
  snapped_points: SnappedPoint[] | null; waypoints: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[] | null
  created_at: string
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

interface Props {
  onClose: () => void
  onUseRoute: (route: ActiveRoute) => void
  onCreate: () => void
  onEditRoute?: (route: Route) => void
  isDark: boolean
}

const ACCENT = '#06B6D4'
const SPEED_KMH: Record<string, number> = { cycling: 25, gravel: 22, mtb: 15, trail: 9, running: 10, hiking: 4.5, walking: 4.5 }
function estTimeLabel(distanceM: number | null, sport: string): string {
  if (!distanceM) return '—'
  const v = SPEED_KMH[sport] ?? 18
  const sec = (distanceM / 1000) / v * 3600
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

// Tracé normalisé en SVG (repli si pas de carte réelle).
function SvgTrace({ route, accent, mapBg, fallbackStroke }: { route: Route; accent: string; mapBg: string; fallbackStroke: string }) {
  const W = 240, H = 150, PAD = 18
  const pts = route.snapped_points ?? route.waypoints ?? []
  if (pts.length < 2) {
    return (
      <div style={{ width: '100%', aspectRatio: `${W} / ${H}`, background: mapBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M3 20l5-12 5 8 3-4 5 8H3z" stroke={fallbackStroke} strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
    )
  }
  const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const midLat = (minLat + maxLat) / 2
  const kx = Math.cos(midLat * Math.PI / 180) || 1
  const geoW = (maxLng - minLng) * kx || 1e-6
  const geoH = (maxLat - minLat) || 1e-6
  const scale = Math.min((W - 2 * PAD) / geoW, (H - 2 * PAD) / geoH)
  const drawW = geoW * scale, drawH = geoH * scale
  const offX = (W - drawW) / 2, offY = (H - drawH) / 2
  const xy = (p: { lat: number; lng: number }) => ({ x: offX + (p.lng - minLng) * kx * scale, y: offY + (maxLat - p.lat) * scale })
  const path = pts.map(p => { const c = xy(p); return `${c.x.toFixed(1)},${c.y.toFixed(1)}` }).join(' ')
  const s = xy(pts[0]), e = xy(pts[pts.length - 1])
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', aspectRatio: `${W} / ${H}`, background: mapBg }}>
      <polyline points={path} fill="none" stroke="#ffffff" strokeWidth={5} strokeOpacity={0.7} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={path} fill="none" stroke={accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={s.x} cy={s.y} r={4} fill="#10B981" stroke="#fff" strokeWidth={1.5} />
      <FinishFlag x={e.x} y={e.y} size={0.7} />
    </svg>
  )
}

// Vignette : vraie carte Mapbox avec le tracé ; repli SVG.
function RouteThumbnail(props: { route: Route; accent: string; mapBg: string; fallbackStroke: string }) {
  const [failed, setFailed] = useState(false)
  const pts = props.route.snapped_points ?? props.route.waypoints ?? []
  const url = pts.length >= 2 ? staticRouteMapUrl(pts, { width: 380, height: 238, pins: true }) : null
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" onError={() => setFailed(true)} style={{ display: 'block', width: '100%', aspectRatio: '380 / 238', objectFit: 'cover', background: props.mapBg }} />
  }
  return <SvgTrace {...props} />
}

function menuItem(color: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }
}

export default function RouteLibrary({ onClose, onUseRoute, onCreate, onEditRoute, isDark }: Props) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  const SPORT_LABELS: Record<string, string> = { cycling: t('record.routeLibrarySportCycling'), mtb: t('record.routeLibrarySportMtb'), trail: t('record.routeLibrarySportTrail'), hiking: t('record.routeLibrarySportHiking') }
  const sportLabel = (s: string) => SPORT_LABELS[s] ?? s
  const [routes, setRoutes] = useState<Route[]>([])
  const [showPublic, setShowPublic] = useState(false)
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)   // ouvert au survol (ou tap mobile)
  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openMenu = (id: string) => { if (menuTimer.current) clearTimeout(menuTimer.current); setMenuId(id) }
  const scheduleCloseMenu = () => { if (menuTimer.current) clearTimeout(menuTimer.current); menuTimer.current = setTimeout(() => setMenuId(null), 160) }
  const [detail, setDetail] = useState<Route | null>(null)
  // Envoi vers l'appareil (Garmin/Wahoo) — visible seulement si connecté.
  const [pushTargets, setPushTargets] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const DEVICE_NAME: Record<string, string> = { garmin: 'Garmin', wahoo: 'Wahoo' }

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/routes/push-to-device')
        const j = await r.json() as { connected?: string[] }
        setPushTargets(j.connected ?? [])
      } catch { /* ignore */ }
    })()
  }, [])

  const pushToDevice = async (route: Route, provider: string) => {
    setMenuId(null); setNotice(`Envoi vers ${DEVICE_NAME[provider] ?? provider}…`)
    try {
      const r = await fetch('/api/routes/push-to-device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routeId: route.id, provider }) })
      const j = await r.json() as { ok?: boolean; error?: string }
      setNotice(j.ok ? `Envoyé vers ${DEVICE_NAME[provider] ?? provider}.` : (j.error ?? 'Échec de l’envoi'))
    } catch { setNotice('Échec de l’envoi') }
    setTimeout(() => setNotice(null), 4000)
  }

  const bg = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const mapBg = isDark ? 'rgba(120,180,140,0.10)' : '#EAF1E6'
  const popover = isDark ? '#101317' : '#FFFFFF'

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) return
      const q = supabase.from('routes').select('*').order('created_at', { ascending: false })
      const { data } = await (showPublic ? q.eq('is_public', true) : q.eq('user_id', user.id))
      setRoutes((data ?? []) as Route[])
    }
    load()
  }, [showPublic])

  const handleDelete = async (id: string) => {
    setMenuId(null)
    await createClient().from('routes').delete().eq('id', id)
    setRoutes(r => r.filter(x => x.id !== id))
  }

  const handleDuplicate = async (route: Route) => {
    setMenuId(null)
    const sb = createClient()
    const user = await getCurrentUser()
    if (!user) return
    const { data } = await sb.from('routes').insert({
      user_id: user.id, name: `${route.name} (copie)`, sport: route.sport, is_public: false, route_type: route.route_type ?? 'training',
      distance_m: route.distance_m, elevation_gain_m: route.elevation_gain_m,
      waypoints: route.waypoints, snapped_points: route.snapped_points,
      elevation_profile: route.elevation_profile, surfaces: route.surfaces,
    }).select('*').single()
    if (data) setRoutes(r => [data as Route, ...r])
  }

  const handleExport = (route: Route) => {
    setMenuId(null)
    const pts = (route.snapped_points ?? route.waypoints ?? []).map(p => ({ lat: p.lat, lng: p.lng, altitude: (p as { altitude?: number }).altitude }))
    if (pts.length < 2) return
    downloadGpx(route.name, routeToGpx(route.name, pts, route.elevation_profile ?? undefined))
  }

  const useRoute = (route: Route) => onUseRoute({
    snapped_points: (route.snapped_points ?? route.waypoints).map(p => ({ lat: p.lat, lng: p.lng })),
    elevation_profile: route.elevation_profile ?? [],
    waypoints: route.waypoints?.map(p => ({ lat: p.lat, lng: p.lng })),
    sport: route.sport,
    name: route.name,
    distance_m: route.distance_m,
    elevation_gain_m: route.elevation_gain_m,
  })

  const filtered = routes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  const tabBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', fontSize: 14, fontWeight: active ? 800 : 600, color: active ? text : dim, borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`, fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', transform: shown && !closing ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 300ms cubic-bezier(0.32,0.72,0,1)' }}>
      {/* En-tête épuré : retour + titre */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${separator}`, flexShrink: 0 }}>
        <button onClick={requestClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ACCENT, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: 0, zIndex: 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {t('record.routeLibraryCancel')}
        </button>
        <p style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 17, fontWeight: 700, color: text, margin: 0, fontFamily: 'var(--font-display)', pointerEvents: 'none' }}>{t('record.routeLibraryTitle')}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '20px 16px 40px' }}>
          {/* Barre d'actions : Créer + onglets + recherche */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button onClick={onCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              {t('record.routeLibraryCreate')}
            </button>
            <div style={{ display: 'flex', gap: 16, marginLeft: 4 }}>
              {tabBtn(t('record.routeLibraryMine'), !showPublic, () => setShowPublic(false))}
              {tabBtn(t('record.routeLibraryPublic'), showPublic, () => setShowPublic(true))}
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 12px', marginLeft: 'auto' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dim} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('record.routeLibrarySearchPlaceholder')} style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: text, fontSize: 15, fontFamily: 'DM Sans, sans-serif' }} />
            </div>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: dim }}>
              <p style={{ fontSize: 14 }}>{
                showPublic
                  ? (search ? t('record.routeLibraryEmptyPublicSearch') : t('record.routeLibraryEmptyPublic'))
                  : (search ? t('record.routeLibraryEmptySearch') : t('record.routeLibraryEmpty'))
              }</p>
            </div>
          )}

          {/* Grille : mobile 1 colonne, desktop max 4 (→3→2→1 selon la largeur) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 18, marginTop: 14 }}>
            {filtered.map(route => (
              <div key={route.id} onClick={() => setDetail(route)}
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                <div style={{ position: 'relative' }}>
                  <RouteThumbnail route={route} accent={ACCENT} mapBg={mapBg} fallbackStroke={dim} />
                  {route.route_type === 'race' && (
                    <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'rgba(239,68,68,0.92)', padding: '3px 8px', borderRadius: 6 }}>{t('record.routeSaveUsageRace')}</span>
                  )}
                  {/* ⋯ sans bulle noire — s'ouvre au survol (et au tap sur mobile) */}
                  <div onMouseEnter={() => openMenu(route.id)} onMouseLeave={scheduleCloseMenu}
                    style={{ position: 'absolute', top: 4, right: 4, padding: 4 }}>
                    <button onClick={e => { e.stopPropagation(); setMenuId(m => m === route.id ? null : route.id) }} aria-label="Options"
                      style={{ width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                    </button>
                    {menuId === route.id && (
                      <div onMouseEnter={() => openMenu(route.id)} onMouseLeave={scheduleCloseMenu} onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 32, right: 0, zIndex: 5, background: popover, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.22)', padding: 5, minWidth: 158, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {onEditRoute && (
                          <button onClick={() => { setMenuId(null); onEditRoute(route) }} style={menuItem(text)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                            {t('record.routeLibraryEdit')}
                          </button>
                        )}
                        <button onClick={() => void handleDuplicate(route)} style={menuItem(text)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
                          {t('record.routeLibraryDuplicate')}
                        </button>
                        <button onClick={() => handleExport(route)} style={menuItem(text)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
                          {t('record.routeLibraryExport')}
                        </button>
                        <button onClick={() => void handleDelete(route.id)} style={menuItem('#EF4444')}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          {t('record.routeLibraryDelete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: '11px 13px 13px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.name}</p>
                  <p style={{ fontSize: 11.5, color: dim, margin: '0 0 9px' }}>{sportLabel(route.sport)} · {new Date(route.created_at).toLocaleDateString(currentLocale())}</p>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {route.distance_m != null && <Stat label="km" value={(route.distance_m / 1000).toFixed(1)} text={text} dim={dim} />}
                    <Stat label="D+" value={route.elevation_profile?.length ? `${elevationGainLoss(route.elevation_profile).gain} m` : (route.elevation_gain_m != null ? `${Math.round(route.elevation_gain_m)} m` : '—')} text={text} dim={dim} />
                    <Stat label="≈ temps" value={estTimeLabel(route.distance_m, route.sport)} text={text} dim={dim} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ferme le menu ⋯ (tap) au clic ailleurs */}
      {menuId && <div onClick={() => setMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 2 }} />}

      {/* Détail du parcours */}
      {detail && (
        <RouteDetailView
          route={detail} isDark={isDark} sportLabel={sportLabel(detail.sport)}
          pushTargets={pushTargets}
          onClose={() => setDetail(null)}
          onUse={() => { useRoute(detail); onClose() }}
          onEdit={onEditRoute ? () => onEditRoute(detail) : undefined}
          onDuplicate={() => void handleDuplicate(detail)}
          onExport={() => handleExport(detail)}
          onDelete={() => void handleDelete(detail.id)}
          onPush={(p) => void pushToDevice(detail, p)}
        />
      )}

      {/* Retour d'envoi vers l'appareil */}
      {notice && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 30, background: 'var(--bg-card, #12151C)', color: text, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 28px rgba(0,0,0,0.28)', maxWidth: '90vw', textAlign: 'center' }}>{notice}</div>
      )}
    </div>
  )
}

function Stat({ label, value, text, dim }: { label: string; value: string; text: string; dim: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: dim, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
    </span>
  )
}
