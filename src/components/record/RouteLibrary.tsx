'use client'
// ══════════════════════════════════════════════════════════════════════════
// Bibliothèque d'itinéraires (maquette L3) : ✕ · « Itinéraires » · + cyan,
// recherche, Mes parcours / Publics (segmenté), pilules de filtre (sport,
// distance, dénivelé), grandes cartes blanches (vignette carte pleine
// largeur + étiquette sport en verre, nom, « 54,0 km · 523 m D+ · 2 h 10 »,
// ville de départ, menu ⋯ : Modifier / Dupliquer / Exporter GPX / Supprimer).
// Mobile : une colonne ; desktop : grille. Logique (chargement, filtres,
// duplication, export, envoi appareil) inchangée.
// ══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { rkScope, RkFab, RkIco, RK_ICON, RkActionSheet, RkSheet, RkCta, RkBanner, RK_EASE, type RkAction } from './kit/RecordKit'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import type { SnappedPoint } from '@/lib/openrouteservice'
import { useI18n } from '@/lib/i18n'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { routeToGpx, downloadGpx } from '@/lib/gpxExport'
import { elevationGainLoss } from '@/lib/elevation'
import { reverseGeocode, cachedPlace } from '@/lib/reverseGeocode'
import { haptic } from '@/lib/haptics'
import { FinishFlag } from './finishFlag'
import RouteFilterSheet, { type FilterState } from './RouteFilterSheet'
import { routeSport, routeEstLabel, routeKmLabel, fmtInt } from './routeSports'

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

// Leaflet/SVG : couleurs littérales (attributs SVG).
const TRACE_CYAN = '#06B6D4' // design-allow-color — tracé (= --primary)
const TRACE_CASING = '#FFFFFF' // design-allow-color — halo du tracé
const START_GREEN = '#10B981' // design-allow-color — pastille départ

// Tracé normalisé en SVG (repli si pas de carte réelle).
function SvgTrace({ route }: { route: Route }) {
  const W = 400, H = 170, PAD = 18
  const pts = route.snapped_points ?? route.waypoints ?? []
  if (pts.length < 2) {
    return (
      <div style={{ width: '100%', height: '100%', background: 'var(--surface-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
        <RkIco d={RK_ICON.route} size={30} sw={1.6} />
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
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ display: 'block', background: 'var(--surface-soft)' }}>
      <polyline points={path} fill="none" stroke={TRACE_CASING} strokeWidth={6} strokeOpacity={0.7} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={path} fill="none" stroke={TRACE_CYAN} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={s.x} cy={s.y} r={4.5} fill={START_GREEN} stroke={TRACE_CASING} strokeWidth={1.5} />
      <FinishFlag x={e.x} y={e.y} size={0.7} />
    </svg>
  )
}

// Vignette : vraie carte Mapbox avec le tracé ; repli SVG.
function RouteThumbnail({ route }: { route: Route }) {
  const [failed, setFailed] = useState(false)
  const pts = route.snapped_points ?? route.waypoints ?? []
  const url = pts.length >= 2 ? staticRouteMapUrl(pts, { width: 640, height: 272, pins: true }) : null
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', background: 'var(--surface-soft)' }} />
  }
  return <SvgTrace route={route} />
}

export default function RouteLibrary({ onClose, onUseRoute, onCreate, onEditRoute, isDark }: Props) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  const sportLabel = (s: string) => t(routeSport(s).labelKey)
  const [routes, setRoutes] = useState<Route[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showPublic, setShowPublic] = useState(false)
  const [search, setSearch] = useState('')
  const [menuRoute, setMenuRoute] = useState<Route | null>(null)
  const [confirmDel, setConfirmDel] = useState<Route | null>(null)
  // Dernières valeurs affichées : la feuille garde son contenu pendant sa sortie.
  const lastMenu = useRef<Route | null>(null)
  if (menuRoute) lastMenu.current = menuRoute
  const lastDel = useRef<Route | null>(null)
  if (confirmDel) lastDel.current = confirmDel
  const [detail, setDetail] = useState<Route | null>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  const [filter, setFilter] = useState<FilterState>({ dist: [0, 160], elev: [0, 3000], sport: 'all' })
  const [activeFilter, setActiveFilter] = useState<'dist' | 'elev' | 'sport' | null>(null)
  // Envoi vers l'appareil (Garmin/Wahoo) — visible seulement si connecté.
  const [pushTargets, setPushTargets] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const DEVICE_NAME: Record<string, string> = { garmin: 'Garmin', wahoo: 'Wahoo' }
  const showNotice = (msg: string, ms = 4000) => {
    setNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), ms)
  }
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])

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
    const name = DEVICE_NAME[provider] ?? provider
    showNotice(t('record.routeSending', { device: name }), 60000)
    try {
      const r = await fetch('/api/routes/push-to-device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routeId: route.id, provider }) })
      const j = await r.json() as { ok?: boolean; error?: string }
      showNotice(j.ok ? t('record.routeSent', { device: name }) : (j.error ?? t('record.routeSendFailed')))
    } catch { showNotice(t('record.routeSendFailed')) }
  }

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) { setLoaded(true); return }
      const q = supabase.from('routes').select('*').order('created_at', { ascending: false })
      const { data } = await (showPublic ? q.eq('is_public', true) : q.eq('user_id', user.id))
      setRoutes((data ?? []) as Route[])
      setLoaded(true)
    }
    setLoaded(false)
    void load()
  }, [showPublic])

  const handleDelete = async (id: string) => {
    await createClient().from('routes').delete().eq('id', id)
    setRoutes(r => r.filter(x => x.id !== id))
  }

  const handleDuplicate = async (route: Route) => {
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

  const dPlusOf = (r: Route) => r.elevation_profile?.length ? elevationGainLoss(r.elevation_profile).gain : Math.round(r.elevation_gain_m ?? 0)
  const filtered = routes.filter(r => {
    if (!r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter.sport !== 'all' && r.sport !== filter.sport) return false
    const km = (r.distance_m ?? 0) / 1000
    if (km < filter.dist[0]) return false
    if (filter.dist[1] < 160 && km > filter.dist[1]) return false
    const dp = dPlusOf(r)
    if (dp < filter.elev[0]) return false
    if (filter.elev[1] < 3000 && dp > filter.elev[1]) return false
    return true
  })

  const distOn = filter.dist[0] > 0 || filter.dist[1] < 160
  const elevOn = filter.elev[0] > 0 || filter.elev[1] < 3000
  const rangeLabel = (r: [number, number], max: number, unit: string) =>
    `${r[0]}–${r[1] >= max ? `${max}+` : r[1]} ${unit}`

  // Menu ⋯ (mobile ET desktop) : feuille d'actions iOS.
  const menuActions = (route: Route): RkAction[] => [
    ...(onEditRoute ? [{ key: 'edit', label: t('record.routeLibraryEdit'), icon: <RkIco d={RK_ICON.edit} size={19} />, onClick: () => onEditRoute(route) }] : []),
    { key: 'dup', label: t('record.routeLibraryDuplicate'), icon: <RkIco d={RK_ICON.copy} size={19} />, onClick: () => void handleDuplicate(route) },
    { key: 'gpx', label: t('record.routeLibraryExport'), icon: <RkIco d={RK_ICON.download} size={19} />, onClick: () => handleExport(route) },
    ...pushTargets.map(p => ({ key: `push-${p}`, label: t('record.routeSendTo', { device: DEVICE_NAME[p] ?? p }), icon: <RkIco d={RK_ICON.device} size={19} />, onClick: () => void pushToDevice(route, p) })),
    { key: 'del', label: t('record.routeLibraryDelete'), icon: <RkIco d={RK_ICON.trash} size={19} />, danger: true, onClick: () => setConfirmDel(route) },
  ]

  const emptyText = showPublic
    ? (search ? t('record.routeLibraryEmptyPublicSearch') : t('record.routeLibraryEmptyPublic'))
    : (search ? t('record.routeLibraryEmptySearch') : t('record.routeLibraryEmpty'))

  return (
    <div className={rkScope(isDark)} style={{
      position: 'fixed', inset: 0, zIndex: 10005, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
      transform: shown && !closing ? 'translateX(0)' : (reduce ? 'none' : 'translateX(100%)'),
      opacity: reduce && !(shown && !closing) ? 0 : 1,
      transition: 'transform 320ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
    }}>
      {/* En-tête : ✕ · Itinéraires · + cyan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 10px', maxWidth: 1160, width: '100%', margin: '0 auto' }}>
        <RkFab label={t('w2c.close')} onClick={requestClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>{t('record.routeLibraryTitle')}</span>
        <RkFab label={t('record.routeLibraryCreate')} variant="primary" onClick={onCreate}><RkIco d={RK_ICON.plus} size={22} sw={2.4} /></RkFab>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '2px 16px calc(28px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Recherche */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-card)', borderRadius: 'var(--r-pill)', padding: '0 16px', minHeight: 48, boxShadow: 'var(--shadow-capsule)', color: 'var(--text-mid)' }}>
            <RkIco d={RK_ICON.search} size={18} />
            <input className="rk-input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('record.routeLibrarySearchPlaceholder')}
              aria-label={t('record.routeLibrarySearchPlaceholder')} style={{ flex: 1, minWidth: 0, fontSize: 16 }} />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label={t('record.routeCreatorCancel')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', padding: 6, cursor: 'pointer', display: 'flex' }}>
                <RkIco d={RK_ICON.close} size={16} sw={2.4} />
              </button>
            )}
          </label>

          {/* Mes parcours / Publics */}
          <div className="rk-seg" role="tablist">
            <button type="button" role="tab" aria-pressed={!showPublic} aria-selected={!showPublic} onClick={() => { haptic('light'); setShowPublic(false) }}>{t('record.routeLibraryMine')}</button>
            <button type="button" role="tab" aria-pressed={showPublic} aria-selected={showPublic} onClick={() => { haptic('light'); setShowPublic(true) }}>{t('record.routeLibraryPublic')}</button>
          </div>

          {/* Pilules de filtre (défilables) */}
          <div className="rk-chips" style={{ margin: '0 -16px', padding: '2px 16px 6px' }}>
            <button type="button" className="rk-fpill rk-press" data-on={filter.sport !== 'all' ? '1' : undefined} onClick={() => setActiveFilter('sport')}>
              {filter.sport === 'all' ? t('record.routeLibraryAllSports') : sportLabel(filter.sport)}
              <RkIco d={RK_ICON.down} size={15} sw={2.4} />
            </button>
            <button type="button" className="rk-fpill rk-press rk-num" data-on={distOn ? '1' : undefined} onClick={() => setActiveFilter('dist')} style={{ letterSpacing: 0 }}>
              {distOn ? rangeLabel(filter.dist, 160, 'km') : t('record.routeCreatorDistance')}
              <RkIco d={RK_ICON.down} size={15} sw={2.4} />
            </button>
            <button type="button" className="rk-fpill rk-press rk-num" data-on={elevOn ? '1' : undefined} onClick={() => setActiveFilter('elev')} style={{ letterSpacing: 0 }}>
              {elevOn ? rangeLabel(filter.elev, 3000, 'm') : t('record.routeFilterElev')}
              <RkIco d={RK_ICON.down} size={15} sw={2.4} />
            </button>
          </div>

          {/* Cartes */}
          {!loaded ? (
            <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="rk-card" style={{ boxShadow: 'var(--shadow-capsule)' }}>
                  <div style={{ aspectRatio: '640 / 272', background: 'var(--surface-soft)' }} />
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ width: '45%', height: 18, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)' }} />
                    <div style={{ width: '70%', height: 13, borderRadius: 'var(--r-sm)', background: 'var(--surface-soft)', marginTop: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-mid)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)' }}>
                <RkIco d={RK_ICON.route} size={28} />
              </span>
              <p style={{ fontSize: 15, margin: 0 }}>{emptyText}</p>
              {!showPublic && !search && (
                <RkCta variant="primary" onClick={onCreate} style={{ width: 'auto', padding: '0 24px', minHeight: 48, fontSize: 16 }}>
                  <RkIco d={RK_ICON.plus} size={18} sw={2.4} />{t('record.routeLibraryCreate')}
                </RkCta>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              <AnimatePresence initial={false}>
                {filtered.map((route, i) => {
                  const sp = routeSport(route.sport)
                  return (
                    <motion.div key={route.id} layout={!reduce}
                      initial={{ opacity: 0, y: reduce ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
                      transition={{ duration: reduce ? 0.12 : 0.32, ease: RK_EASE, delay: reduce ? 0 : Math.min(i, 6) * 0.03 }}
                      className="rk-card" style={{ boxShadow: 'var(--shadow-capsule)', position: 'relative' }}>
                      <div role="button" tabIndex={0} aria-label={route.name}
                        onClick={() => { haptic('light'); setDetail(route) }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(route) } }}
                        style={{ cursor: 'pointer', color: 'var(--text)' }}>
                        <div style={{ position: 'relative', aspectRatio: '640 / 272', overflow: 'hidden', background: 'var(--surface-soft)' }}>
                          <RouteThumbnail route={route} />
                          <span className="rk-banner rk-glass" style={{ position: 'absolute', top: 10, left: 10, animation: 'none', minHeight: 32, padding: '0 12px', fontSize: 14 }}>
                            <sp.Icon size={16} stroke={2} />{sportLabel(route.sport)}
                          </span>
                          {route.route_type === 'race' && (
                            <span className="rk-banner rk-glass" style={{ position: 'absolute', top: 10, right: 10, animation: 'none', minHeight: 32, padding: '0 12px', fontSize: 13 }}>
                              <span className="rk-dot" style={{ background: 'var(--danger)' }} />{t('record.routeSaveUsageRace')}
                            </span>
                          )}
                        </div>
                        <div style={{ position: 'relative', padding: '12px 56px 14px 16px' }}>
                          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.name}</div>
                          <div className="rk-num" style={{ fontSize: 15, color: 'var(--text-mid)', marginTop: 3, letterSpacing: 0 }}>
                            {routeKmLabel(route.distance_m)} · {fmtInt(dPlusOf(route))} m D+ · {routeEstLabel(route.distance_m, route.sport)}
                          </div>
                          <PlaceLine route={route} />
                          <button type="button" aria-label={t('record.routeCreatorMore')} className="rk-press"
                            onClick={e => { e.stopPropagation(); haptic('light'); setMenuRoute(route) }}
                            onKeyDown={e => e.stopPropagation()}
                            style={{ position: 'absolute', right: 6, top: 4, width: 44, height: 44, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RkIco d={RK_ICON.dots} size={22} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Menu ⋯ */}
      <RkActionSheet open={menuRoute != null} onClose={() => setMenuRoute(null)} title={lastMenu.current?.name} isDark={isDark}
        actions={lastMenu.current ? menuActions(lastMenu.current) : []} />

      {/* Confirmation de suppression */}
      <RkSheet open={confirmDel != null} onClose={() => setConfirmDel(null)} title={t('record.routeDeleteTitle')} isDark={isDark} zIndex={10095}
        footer={<>
          <RkCta variant="danger" onClick={() => { const r = confirmDel; setConfirmDel(null); if (r) void handleDelete(r.id) }}>{t('record.routeLibraryDelete')}</RkCta>
          <RkCta variant="text" onClick={() => setConfirmDel(null)}>{t('record.routeCreatorCancel')}</RkCta>
        </>}>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '4px 4px 8px', lineHeight: 1.5, textAlign: 'center' }}>
          {t('record.routeDeleteSub', { name: lastDel.current?.name ?? '' })}
        </p>
      </RkSheet>

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
      {activeFilter && (
        <RouteFilterSheet kind={activeFilter} value={filter} isDark={isDark}
          onApply={p => setFilter(f => ({ ...f, ...p }))} onClose={() => setActiveFilter(null)} />
      )}
      {notice && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom))', zIndex: 10100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <RkBanner key={notice}>{notice}</RkBanner>
        </div>
      )}
    </div>
  )
}

// Lieu (ville) du point de départ — géocodage inverse mis en cache.
function PlaceLine({ route }: { route: Route }) {
  const pts = route.snapped_points ?? route.waypoints ?? []
  const start = pts[0]
  const [place, setPlace] = useState<string>(() => (start ? (cachedPlace(start.lat, start.lng) ?? '') : ''))
  useEffect(() => {
    if (!start || place) return
    let alive = true
    void reverseGeocode(start.lat, start.lng).then(p => { if (alive) setPlace(p) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.lat, start?.lng])
  if (!place) return null
  const town = place.split(',')[0]
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-dim)', marginTop: 4, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <RkIco d={RK_ICON.flag} size={15} sw={1.8} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{town}</span>
    </span>
  )
}
