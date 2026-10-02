'use client'
// ══════════════════════════════════════════════════════════════════════════
// Détail d'un parcours (maquette L4). Carte plein cadre en haut (tracé cadré
// dans la zone visible, départ / arrivée), boutons ronds retour · partager ·
// ⋯ par-dessus ; feuille glissable (SnapSheet) : titre, « Vélo · créé le … ·
// ville », 3 tuiles (Distance, D+, Temps est.), profil altimétrique lié à la
// carte (survol → point sur le tracé), actions « Modifier » + « ▶ Utiliser
// ce parcours ». Dupliquer / Exporter / Envoyer / Supprimer dans le menu ⋯.
// Fichier chargé en dynamic(ssr:false) → Leaflet uniquement côté client.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useReducedMotion } from 'motion/react'
import { rkScope, RkFab, RkIco, RK_ICON, RkActionSheet, RkSheet, RkCta, rkTileUrl, type RkAction } from './kit/RecordKit'
import SnapSheet, { useSafeTop, useMeasure } from './kit/SnapSheet'
import ElevationChart from './ElevationChart'
import { useI18n, currentLocale } from '@/lib/i18n'
import { elevationGainLoss } from '@/lib/elevation'
import { reverseGeocode, cachedPlace } from '@/lib/reverseGeocode'
import { routeToGpx, downloadGpx } from '@/lib/gpxExport'
import { haptic } from '@/lib/haptics'
import { FINISH_FLAG_HTML } from './finishFlag'
import { routeEstLabel, fmtInt } from './routeSports'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'
// Leaflet : attributs SVG → couleurs littérales.
const TRACE_CYAN = '#06B6D4' // design-allow-color — tracé (= --primary)
const TRACE_CASING = '#FFFFFF' // design-allow-color — halo du tracé
const START_GREEN = '#10B981' // design-allow-color — pastille départ
const FINISH_ICON = L.divIcon({ className: '', html: FINISH_FLAG_HTML, iconSize: [24, 24], iconAnchor: [5, 23] })

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

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Cadre le tracé dans la zone visible (sous les boutons, au-dessus de la feuille). */
function FitVisible({ bounds, top, bottom }: { bounds: L.LatLngBoundsExpression; top: number; bottom: number }) {
  const map = useMap()
  const reduce = useReducedMotion()
  useEffect(() => { const id = window.setTimeout(() => map.invalidateSize(false), 80); return () => clearTimeout(id) }, [map])
  useEffect(() => {
    map.fitBounds(bounds, { paddingTopLeft: [28, top], paddingBottomRight: [28, bottom], animate: !reduce, duration: 0.45 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, top, bottom])
  return null
}

export default function RouteDetailView({ route, isDark, sportLabel, onClose, onUse, onEdit, onDuplicate, onExport, onDelete, pushTargets = [], onPush }: Props) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const safeTop = useSafeTop()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const [snap, setSnap] = useState(1)
  const [sheetH, setSheetH] = useState(420)
  const [headRef, headH] = useMeasure<HTMLDivElement>()
  const start = (route.snapped_points && route.snapped_points[0]) || route.waypoints[0]
  const [place, setPlace] = useState<string>(() => (start ? (cachedPlace(start.lat, start.lng) ?? '') : ''))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, reduce ? 120 : 280) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Ville de départ (géocodage inverse mis en cache).
  useEffect(() => {
    if (!start || place) return
    let alive = true
    void reverseGeocode(start.lat, start.lng).then(p => { if (alive) setPlace(p) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.lat, start?.lng])

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
          const a = prof[i - 1], b = prof[i], tt = (d - a.distanceM) / Math.max(1e-6, b.distanceM - a.distanceM)
          return a.altitudeM + tt * (b.altitudeM - a.altitudeM)
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
  const { gain, minAlt, maxAlt } = useMemo(() => {
    let mn = Infinity, mx = -Infinity
    for (const s of samples) { mn = Math.min(mn, s.alt); mx = Math.max(mx, s.alt) }
    if (!isFinite(mn)) { mn = 0; mx = 0 }
    // D+ réaliste (lissé + seuil), pas la somme brute des deltas.
    const gl = elevationGainLoss(samples.map(s => ({ distanceM: s.d, altitudeM: s.alt })))
    return { gain: gl.gain, minAlt: mn, maxAlt: mx }
  }, [samples])
  const profile = useMemo(
    () => (route.elevation_profile && route.elevation_profile.length > 1 ? route.elevation_profile : samples.map(s => ({ distanceM: s.d, altitudeM: s.alt }))),
    [route.elevation_profile, samples],
  )
  const hasProfile = profile.length > 1 && maxAlt > minAlt
  const line = useMemo(() => samples.map(s => [s.lat, s.lng] as [number, number]), [samples])
  const bounds = useMemo(() => (line.length >= 2 ? L.latLngBounds(line) : null), [line])

  const kmTxt = (totalM / 1000).toFixed(1).replace('.', ',')
  const date = new Date(route.created_at).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
  const town = place ? place.split(',')[0] : ''
  const meta = [sportLabel, t('record.routeCreatedOnShort', { date }), town].filter(Boolean).join(' · ')

  // Partager : fichier GPX via la feuille de partage native ; repli = téléchargement.
  const share = async () => {
    haptic('light')
    const pts = samples.map(s => ({ lat: s.lat, lng: s.lng, altitude: s.alt }))
    if (pts.length < 2) return
    const gpx = routeToGpx(route.name, pts, route.elevation_profile ?? undefined)
    try {
      const file = new File([gpx], `${(route.name || 'parcours').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim() || 'parcours'}.gpx`, { type: 'application/gpx+xml' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: route.name }); return }
    } catch { /* annulé / non supporté → téléchargement */ }
    downloadGpx(route.name, gpx)
  }

  const actions: RkAction[] = [
    { key: 'dup', label: t('record.routeLibraryDuplicate'), icon: <RkIco d={RK_ICON.copy} size={19} />, onClick: onDuplicate },
    { key: 'gpx', label: t('record.routeLibraryExport'), icon: <RkIco d={RK_ICON.download} size={19} />, onClick: onExport },
    ...pushTargets.map(p => ({ key: `push-${p}`, label: t('record.routeSendTo', { device: p === 'garmin' ? 'Garmin' : p === 'wahoo' ? 'Wahoo' : p }), icon: <RkIco d={RK_ICON.device} size={19} />, onClick: () => onPush?.(p) })),
    { key: 'del', label: t('record.routeLibraryDelete'), icon: <RkIco d={RK_ICON.trash} size={19} />, danger: true, onClick: () => setConfirmDel(true) },
  ]

  const tile = (label: string, value: string, unit?: string) => (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--surface-soft)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{label}</div>
      <div className="rk-num" style={{ fontSize: 24, fontWeight: 800, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}> {unit}</span>}
      </div>
    </div>
  )

  return (
    <div className={rkScope(isDark)} style={{
      position: 'fixed', inset: 0, zIndex: 10010, background: 'var(--surface-page)', overflow: 'hidden',
      transform: shown && !closing ? 'translateX(0)' : (reduce ? 'none' : 'translateX(100%)'),
      opacity: reduce && !(shown && !closing) ? 0 : 1,
      transition: 'transform 320ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
    }}>
      {/* Carte plein cadre : le tracé tient dans la zone visible au-dessus de la feuille */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, isolation: 'isolate' }}>
        {bounds ? (
          <MapContainer bounds={bounds} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0, background: 'var(--surface-soft)' }}>
            <TileLayer url={rkTileUrl('std', TOKEN)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
            <FitVisible bounds={bounds} top={safeTop + 72} bottom={sheetH + 24} />
            <Polyline positions={line} pathOptions={{ color: TRACE_CASING, weight: 10, opacity: 0.75, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={line} pathOptions={{ color: TRACE_CYAN, weight: 6, lineCap: 'round', lineJoin: 'round' }} />
            <CircleMarker center={line[0]} radius={7} pathOptions={{ color: TRACE_CASING, weight: 3, fillColor: START_GREEN, fillOpacity: 1 }} />
            <Marker position={line[line.length - 1]} icon={FINISH_ICON} />
            {cursor && <CircleMarker center={[cursor.lat, cursor.lng]} radius={8} pathOptions={{ color: TRACE_CASING, weight: 3, fillColor: TRACE_CYAN, fillOpacity: 1 }} />}
          </MapContainer>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', fontSize: 15 }}>{t('record.routeNoTrace')}</div>
        )}
      </div>

      {/* Boutons ronds sur la carte : retour · partager · ⋯ */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', left: 12, right: 12, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
        <span style={{ pointerEvents: 'auto' }}><RkFab label={t('common.back')} onClick={requestClose}><RkIco d={RK_ICON.back} size={22} sw={2.2} /></RkFab></span>
        <span style={{ flex: 1 }} />
        <span style={{ pointerEvents: 'auto' }}><RkFab label={t('record.routeShare')} onClick={() => void share()}><RkIco d={RK_ICON.share} size={19} /></RkFab></span>
        <span style={{ pointerEvents: 'auto' }}><RkFab label={t('record.routeCreatorMore')} onClick={() => setMenuOpen(true)}><RkIco d={RK_ICON.dots} size={22} /></RkFab></span>
      </div>

      <SnapSheet
        className="rk-detail-sheet"
        snaps={[headH, 'full']}
        index={snap}
        onIndexChange={setSnap}
        onSettle={setSheetH}
        topGap={72}
        zIndex={30}
        ariaLabel={route.name}
        footer={
          <div style={{ display: 'flex', gap: 10, padding: '8px 16px calc(14px + env(safe-area-inset-bottom))' }}>
            <RkCta variant="white" disabled={!onEdit} onClick={() => { haptic('light'); onEdit?.() }}
              style={{ flex: 1, boxShadow: 'none', background: 'var(--surface-chip)', fontSize: 16 }}>
              <RkIco d={RK_ICON.edit} size={18} />{t('record.routeLibraryEdit')}
            </RkCta>
            {/* « Utiliser » = démarrer une activité avec ce parcours → mobile uniquement. */}
            {isNarrow && (
              <RkCta variant="primary" onClick={() => { haptic('medium'); onUse() }} style={{ flex: 1.8, fontSize: 16 }}>
                <RkIco d={RK_ICON.play} size={16} fill="currentColor" sw={0} />{t('record.routeUse')}
              </RkCta>
            )}
          </div>
        }
      >
        <div style={{ padding: '0 16px 14px' }}>
          <div ref={headRef} style={{ paddingBottom: 14 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{route.name}</h1>
            <p className="rk-num" style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--text-mid)', letterSpacing: 0 }}>{meta}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tile(t('record.routeCreatorDistance'), kmTxt, 'km')}
            {tile('D+', fmtInt(gain), 'm')}
            {tile(t('record.routeNavEstTime'), routeEstLabel(totalM, route.sport))}
          </div>
          {hasProfile && (
            <div style={{ marginTop: 12, background: 'var(--surface-soft)', borderRadius: 'var(--r-lg)', padding: '12px 14px 10px' }}>
              <div className="rk-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>
                <span>{t('w2c.elevProfile')}</span>
                <span>{Math.round(minAlt)} – {Math.round(maxAlt)} m</span>
              </div>
              <ElevationChart data={profile} height={84} compact isDark={isDark}
                snappedPoints={samples.map(s => ({ lat: s.lat, lng: s.lng }))} onPositionChange={setCursor} />
            </div>
          )}
        </div>
      </SnapSheet>

      <style>{`
        @media (min-width: 768px) {
          .rk-detail-sheet { left: 50% !important; right: auto !important; width: min(560px, calc(100% - 40px)); transform: translateX(-50%); }
        }
      `}</style>

      <RkActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={route.name} isDark={isDark} actions={actions} zIndex={10095} />

      <RkSheet open={confirmDel} onClose={() => setConfirmDel(false)} title={t('record.routeDeleteTitle')} isDark={isDark} zIndex={10096}
        footer={<>
          <RkCta variant="danger" onClick={() => { setConfirmDel(false); onDelete(); requestClose() }}>{t('record.routeLibraryDelete')}</RkCta>
          <RkCta variant="text" onClick={() => setConfirmDel(false)}>{t('record.routeCreatorCancel')}</RkCta>
        </>}>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '4px 4px 8px', lineHeight: 1.5, textAlign: 'center' }}>
          {t('record.routeDeleteSub', { name: route.name })}
        </p>
      </RkSheet>
    </div>
  )
}
