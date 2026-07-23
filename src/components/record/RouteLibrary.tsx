'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SnappedPoint } from '@/lib/openrouteservice'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

interface Route {
  id: string; name: string; sport: string; is_public: boolean
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
}

interface Props {
  onClose: () => void
  onUseRoute: (route: ActiveRoute) => void
  onCreate: () => void
  onEditRoute?: (route: Route) => void
  isDark: boolean
}

// Vignette du parcours en SVG raw (aucune clé/API externe) : tracé normalisé,
// ratio géographique respecté (longitude corrigée par cos(lat)), nord en haut.
// Grande carte pleine largeur, fond légèrement teinté « carte ». Façon Strava.
function RouteThumbnail({ route, accent, mapBg, fallbackStroke }: {
  route: Route; accent: string; mapBg: string; fallbackStroke: string
}) {
  const W = 240, H = 150, PAD = 16
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
  const xy = (p: { lat: number; lng: number }) => ({
    x: offX + (p.lng - minLng) * kx * scale,
    y: offY + (maxLat - p.lat) * scale,
  })
  const path = pts.map(p => { const c = xy(p); return `${c.x.toFixed(1)},${c.y.toFixed(1)}` }).join(' ')
  const s = xy(pts[0]), e = xy(pts[pts.length - 1])

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', aspectRatio: `${W} / ${H}`, background: mapBg }}>
      <polyline points={path} fill="none" stroke="#ffffff" strokeWidth={5} strokeOpacity={0.7} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={path} fill="none" stroke={accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={s.x} cy={s.y} r={4} fill="#10B981" stroke="#fff" strokeWidth={1.5} />
      <circle cx={e.x} cy={e.y} r={4} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
    </svg>
  )
}

function menuItem(color: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }
}

export default function RouteLibrary({ onClose, onUseRoute, onCreate, onEditRoute, isDark }: Props) {
  const { t } = useI18n()
  const SPORT_LABELS: Record<string, string> = { cycling: t('record.routeLibrarySportCycling'), mtb: t('record.routeLibrarySportMtb'), trail: t('record.routeLibrarySportTrail'), hiking: t('record.routeLibrarySportHiking') }
  const [routes, setRoutes] = useState<Route[]>([])
  const [showPublic, setShowPublic] = useState(false)
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const bg = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const mapBg = isDark ? 'rgba(120,180,140,0.10)' : '#EAF1E6'  // teinte « carte » discrète

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb.from('routes').insert({
      user_id: user.id, name: `${route.name} (copie)`, sport: route.sport, is_public: false,
      distance_m: route.distance_m, elevation_gain_m: route.elevation_gain_m,
      waypoints: route.waypoints, snapped_points: route.snapped_points,
      elevation_profile: route.elevation_profile, surfaces: route.surfaces,
    }).select('*').single()
    if (data) setRoutes(r => [data as Route, ...r])
  }

  const useRoute = (route: Route) => onUseRoute({
    snapped_points: (route.snapped_points ?? route.waypoints).map(p => ({ lat: p.lat, lng: p.lng })),
    elevation_profile: route.elevation_profile ?? [],
    waypoints: route.waypoints?.map(p => ({ lat: p.lat, lng: p.lng })),
    sport: route.sport,
  })

  const filtered = routes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* En-tête : Annuler · titre centré · crayon (créer) */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${separator}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#06B6D4', fontSize: 16, fontWeight: 500, cursor: 'pointer', padding: 0, zIndex: 1 }}>{t('record.routeLibraryCancel')}</button>
        <p style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 17, fontWeight: 700, color: text, margin: 0, fontFamily: 'var(--font-display)', pointerEvents: 'none' }}>{t('record.routeLibraryTitle')}</p>
        <button onClick={onCreate} aria-label={t('record.routeLibraryCreate')} style={{ background: 'none', border: 'none', color: text, cursor: 'pointer', padding: 0, zIndex: 1, display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
      </div>

      {/* Recherche + bascule Mes / Publics */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dim} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('record.routeLibrarySearchPlaceholder')} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: text, fontSize: 15, fontFamily: 'DM Sans, sans-serif' }} />
        </div>
        <div style={{ display: 'flex', background: surface, borderRadius: 10, padding: 3, gap: 2, alignSelf: 'flex-start' }}>
          {[t('record.routeLibraryMine'), t('record.routeLibraryPublic')].map((label, i) => (
            <button key={i} onClick={() => setShowPublic(i === 1)}
              style={{ padding: '6px 14px', borderRadius: 8, background: showPublic === (i === 1) ? '#06B6D4' : 'transparent', border: 'none', color: showPublic === (i === 1) ? '#fff' : dim, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: dim }}>
            <p style={{ fontSize: 14 }}>{
              showPublic
                ? (search ? t('record.routeLibraryEmptyPublicSearch') : t('record.routeLibraryEmptyPublic'))
                : (search ? t('record.routeLibraryEmptySearch') : t('record.routeLibraryEmpty'))
            }</p>
          </div>
        )}

        {/* Grille de cartes — grandes vignettes, 4 par ligne sur desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
          {filtered.map(route => (
            <div key={route.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', zIndex: menuId === route.id ? 3 : undefined }}>
              {/* Vignette carte — clic = utiliser le parcours */}
              <div onClick={() => useRoute(route)} style={{ position: 'relative', cursor: 'pointer' }} title={t('record.routeLibraryUse')}>
                <RouteThumbnail route={route} accent="#06B6D4" mapBg={mapBg} fallbackStroke={dim} />
                {/* Bouton ⋯ (menu) */}
                <button onClick={e => { e.stopPropagation(); setMenuId(m => m === route.id ? null : route.id) }} aria-label="Options"
                  style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </button>
                {menuId === route.id && (
                  <div style={{ position: 'absolute', top: 42, right: 8, zIndex: 5, background: bg, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.22)', padding: 5, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {onEditRoute && (
                      <button onClick={e => { e.stopPropagation(); setMenuId(null); onEditRoute(route) }} style={menuItem(text)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                        {t('record.routeLibraryEdit')}
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); void handleDuplicate(route) }} style={menuItem(text)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
                      {t('record.routeLibraryDuplicate')}
                    </button>
                    <button onClick={e => { e.stopPropagation(); void handleDelete(route.id) }} style={menuItem('#EF4444')}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      {t('record.routeLibraryDelete')}
                    </button>
                  </div>
                )}
              </div>
              {/* Infos — clic = utiliser aussi */}
              <div onClick={() => useRoute(route)} style={{ padding: '10px 12px 12px', cursor: 'pointer' }}>
                <p style={{ fontSize: 14.5, fontWeight: 700, color: text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.name}</p>
                <p style={{ fontSize: 11.5, color: dim, margin: '0 0 7px' }}>{SPORT_LABELS[route.sport] ?? route.sport} · {new Date(route.created_at).toLocaleDateString(currentLocale())}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {route.distance_m != null && <span style={{ fontSize: 12.5, fontWeight: 600, color: text }}>{(route.distance_m / 1000).toFixed(1)} km</span>}
                  {route.elevation_gain_m != null && <span style={{ fontSize: 12.5, fontWeight: 600, color: dim }}>D+ {Math.round(route.elevation_gain_m)} m</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ferme le menu ⋯ au clic ailleurs */}
      {menuId && <div onClick={() => setMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 2 }} />}
    </div>
  )
}
