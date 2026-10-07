'use client'
// ══════════════════════════════════════════════════════════════════
// RouteNavScreen — navigation plein écran d'un parcours (façon app Plan).
// Suit le thème jour/nuit (carte + panneaux). En haut : bannière de manœuvre
// que l'on tire VERS LE BAS pour dérouler toute la liste des changements de
// direction. En bas : restant (gros) + réalisé (petit) pour temps / km / D+ ;
// on tire VERS LE HAUT pour ouvrir le profil altimétrique avec la progression.
// Disponible même sans parcours (carte plein écran + vitesse) ; guidage virage
// par virage (ORS) + bip + vibration uniquement si un parcours est chargé.
// Même langage que la navigation vélo (maquette L6) : bandeau verre aux
// couleurs du thème (✕ intégré), pilule « puis … », feuille de données
// glissable (SnapSheet) masquée sous la grande liste des virages, parcouru gris.
// Mobile — overlay (portal).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { useReducedMotion } from 'motion/react'
import { navigationRoute, maneuverShortFR, type NavStep } from '@/lib/openrouteservice'
import { useI18n, currentLocale } from '@/lib/i18n'
import { watchPosition } from '@/lib/native/geo'
import { rkScope, RkFab, RkIco, RK_ICON, rkTileUrl } from './kit/RecordKit'
import SnapSheet, { useMeasure, useSafeTop } from './kit/SnapSheet'
import GuidePanel, { ManeuverIcon, maneuverKind, type ManeuverKind } from './live-v2/GuidePanel'
import { TurnBanner, ThenPill, NavStats, NavProfile } from './live-v2/NavUI'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'
// Leaflet : attributs SVG → couleurs littérales.
const CYAN = '#06B6D4' // design-allow-color — parcours restant (= --primary)
const RIDDEN = '#94A3B8' // design-allow-color — portion déjà parcourue (= --rk-ridden)
const CASING = '#FFFFFF' // design-allow-color — halo blanc du tracé
const DOT_BLUE = '#3B82F6' // design-allow-color — point de position

interface LatLng { lat: number; lng: number }
export interface NavRouteInput {
  snapped_points: LatLng[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
  waypoints?: LatLng[]
  sport?: string
  /** Nom du parcours (bibliothèque) — affiché dans le panneau de guidage. */
  name?: string | null
  /** Totaux stockés en base — repli si la géométrie ne permet pas le calcul. */
  distance_m?: number | null
  elevation_gain_m?: number | null
}

interface Props {
  route?: NavRouteInput | null
  sport: string
  showWatts: boolean
  isDark: boolean
  hr?: number | null
  watts?: number | null
  elapsedSec?: number
  distanceDoneM?: number
  gainDoneM?: number
  onClose?: () => void
  /** Rendu en page intégrée (carrousel) : pas de portal, pas de bouton fermer,
      position absolue dans le parent au lieu d'un overlay plein écran. */
  embedded?: boolean
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

// Recadrage automatique sur la position — mais suspendu 15 s après chaque
// interaction manuelle (pan / zoom) pour laisser regarder le tracé en panoramique.
const RECENTER_DELAY_MS = 15000
// Position centrée dans la zone VISIBLE (entre bandeau et feuille du bas).
function Follow({ pos, padTop, padBottom, recenterKey }: { pos: LatLng | null; padTop: number; padBottom: number; recenterKey: number }) {
  const map = useMap()
  const reduce = useReducedMotion()
  const lastInteract = useRef(0)
  const selfMoving = useRef(false)
  useEffect(() => {
    const onUser = () => { if (!selfMoving.current) lastInteract.current = Date.now() }
    map.on('dragstart', onUser)
    map.on('zoomstart', onUser)
    return () => { map.off('dragstart', onUser); map.off('zoomstart', onUser) }
  }, [map])
  const center = (force: boolean) => {
    if (!pos) return
    if (!force && Date.now() - lastInteract.current < RECENTER_DELAY_MS) return
    const z = map.getZoom() < 14 ? 15 : map.getZoom()
    const target = map.unproject(map.project([pos.lat, pos.lng], z).add([0, (padBottom - padTop) / 2]), z)
    selfMoving.current = true
    map.setView(target, z, { animate: !reduce })
    map.once('moveend', () => { selfMoving.current = false })
  }
  useEffect(() => { center(false) }, [map, pos, padTop, padBottom]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (recenterKey) { lastInteract.current = 0; center(true) } }, [recenterKey]) // eslint-disable-line react-hooks/exhaustive-deps
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

export default function RouteNavScreen({ route, sport, showWatts, isDark, hr, watts, elapsedSec = 0, distanceDoneM = 0, gainDoneM = 0, onClose, embedded = false }: Props) {
  const { t } = useI18n()
  const [pos, setPos] = useState<LatLng | null>(null)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [steps, setSteps] = useState<NavStep[]>([])
  const [bannerOpen, setBannerOpen] = useState(false)  // liste des manœuvres déroulée
  const lastPosRef = useRef<{ p: LatLng; t: number } | null>(null)
  const announcedRef = useRef<Record<number, number>>({})
  const safeTop = useSafeTop()
  const [bannerRef, bannerH] = useMeasure<HTMLDivElement>()
  const [statsRef, statsH] = useMeasure<HTMLDivElement>()
  // Cran par défaut = aperçu (ligne live + Restant / Arrivée / D+) ; la
  // feuille y revient à la fermeture de la liste des virages.
  const [sheetSnap, setSheetSnap] = useState(0)
  useEffect(() => { if (bannerOpen) setSheetSnap(0) }, [bannerOpen])
  const [sheetSettledH, setSheetSettledH] = useState(220)
  const [recenterKey, setRecenterKey] = useState(0)
  const line = route?.snapped_points ?? []
  const hasRoute = line.length > 1

  const cum = useMemo(() => {
    const a = [0]; for (let i = 1; i < line.length; i++) a.push(a[i - 1] + haversine(line[i - 1], line[i])); return a
  }, [line])
  const totalM = cum[cum.length - 1] ?? 0
  const totalGain = useMemo(() => {
    const ep = route?.elevation_profile ?? []; let g = 0
    for (let i = 1; i < ep.length; i++) { const d = ep[i].altitudeM - ep[i - 1].altitudeM; if (d > 0) g += d }
    return g
  }, [route?.elevation_profile])

  // Étapes (manœuvres) — best effort.
  useEffect(() => {
    let alive = true
    const wps = route?.waypoints
    if (!wps || wps.length < 2) return
    navigationRoute(wps, route?.sport ?? sport).then(r => { if (alive) setSteps(r.steps) }).catch(() => {})
    return () => { alive = false }
  }, [route?.waypoints, route?.sport, sport])

  // Position live + vitesse.
  useEffect(() => {
    // Hub GPS partagé (natif : plugin Capacitor ; web : navigator.geolocation).
    const h = watchPosition(
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
    return () => h.clear()
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
    const ep = route?.elevation_profile ?? []; let g = 0
    for (let i = 1; i < ep.length; i++) { if (ep[i].distanceM < traveledM) continue; const d = ep[i].altitudeM - ep[i - 1].altitudeM; if (d > 0) g += d }
    return g || totalGain
  }, [route?.elevation_profile, traveledM, totalGain])
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

  const fmtKm = (m: number) => (m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',')
  const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`
  const fmtTime = (sec: number) => { const h = Math.floor(sec / 3600); const m = Math.round((sec % 3600) / 60); return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min` }
  const center: [number, number] = pos ? [pos.lat, pos.lng] : (line[0] ? [line[0].lat, line[0].lng] : [48.8566, 2.3522])
  const ep = route?.elevation_profile ?? []

  // ── Bandeau (maquette L6) ──
  const distToStart = pos && hasRoute ? haversine(pos, line[0]) : null
  const afterStep = nextStepIdx >= 0 && nextStepIdx + 1 < steps.length ? steps[nextStepIdx + 1] : null
  const afterGap = afterStep ? Math.max(0, stepCum[nextStepIdx + 1] - stepCum[nextStepIdx]) : null
  const banner: { big: string | null; instruction: string; road?: string | null; sub?: string | null; kind: ManeuverKind; pending?: boolean } =
    !hasRoute
      ? { big: null, instruction: t('record.routeNavNoGuidance'), kind: 'straight' }
      : pos == null
        ? { big: null, instruction: t('w2c.locating'), kind: 'straight', pending: true }
        : traveledM < 30 && distToStart != null && distToStart > 25
          ? { big: fmtDist(distToStart), instruction: t('w2c.joinRoute'), kind: 'join' }
          : nextStep && distToTurn != null
            ? { big: fmtDist(distToTurn), instruction: maneuverShortFR(nextStep.type), road: nextStep.name ?? null, kind: maneuverKind(nextStep.type) }
            : { big: null, instruction: steps.length ? t('record.routeNavFollowRoute') : (route?.waypoints ? t('record.routeNavGuidanceUnavailable') : t('record.routeNavFollowRoute')), sub: t('w2c.remaining', { d: fmtDist(remainingM) }), kind: 'straight' }

  // Restant + arrivée prévue (heure) + D+ restant.
  const arrival = new Date(Date.now() + remainMin * 60000).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' })
  const stats = {
    live: [
      { value: speedKmh.toFixed(1).replace('.', ','), unit: 'km/h' },
      ...(hr != null ? [{ value: String(Math.round(hr)), unit: 'bpm', dot: 'var(--danger)' }] : []),
      ...(showWatts && watts != null ? [{ value: String(Math.round(watts)), unit: 'W' }] : []),
    ],
    cols: [
      { label: t('record.routeNavRemaining'), value: fmtKm(remainingM), unit: 'km', sub: t('w2c.doneShort', { v: fmtKm(distanceDoneM) }) },
      { label: t('w2c.arrivalLabel'), value: arrival, sub: t('w2c.inTime', { d: fmtTime(remainMin * 60) }) },
      { label: t('record.routeNavGainRemaining'), value: String(Math.round(remainingGain)), unit: 'm', sub: t('w2c.doneShort', { v: Math.round(gainDoneM) }) },
    ],
  }
  const routeDone = hasRoute && traveledM > 5 ? line.slice(0, nearestIdx + 1) : []
  const routeLeft = hasRoute ? line.slice(Math.max(0, nearestIdx)) : []
  const bannerBottom = safeTop + (embedded ? 0 : 8) + bannerH

  const ui = (
    <div className={rkScope(isDark)} style={embedded
      ? { position: 'absolute', inset: 0, background: 'var(--surface-page)', overflow: 'hidden' }
      : { position: 'fixed', inset: 0, zIndex: 10010, background: 'var(--surface-page)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', zIndex: 0 }}>
        <MapContainer center={center} zoom={15} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
          <TileLayer url={rkTileUrl('std', TOKEN)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
          {routeLeft.length > 1 && <>
            <Polyline positions={routeLeft.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: CASING, weight: 12, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={routeLeft.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: CYAN, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
          </>}
          {routeDone.length > 1 && <>
            <Polyline positions={routeDone.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: CASING, weight: 11, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={routeDone.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: RIDDEN, weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
          </>}
          {pos && <>
            <CircleMarker center={[pos.lat, pos.lng]} radius={16} pathOptions={{ fillColor: DOT_BLUE, fillOpacity: 0.18, color: 'transparent', weight: 0 }} />
            <CircleMarker center={[pos.lat, pos.lng]} radius={8} pathOptions={{ fillColor: DOT_BLUE, fillOpacity: 1, color: CASING, weight: 3 }} />
          </>}
          <Follow pos={pos} padTop={bannerBottom} padBottom={hasRoute ? sheetSettledH : 0} recenterKey={recenterKey} />
        </MapContainer>
      </div>

      {/* Bandeau de virage (verre aux couleurs du thème) + « puis … » ;
          ✕ intégré au bandeau (bord gauche) en overlay plein écran */}
      <div ref={bannerRef} style={{
        position: 'absolute', top: embedded ? 8 : 'calc(env(safe-area-inset-top) + 8px)', left: 12, right: 12, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, pointerEvents: 'none',
      }}>
        {/* Liste des virages ouverte → bandeau (« Recherche de votre
            position… », ✕/chevron) masqué : il recouvrirait la liste. Il
            réapparaît dès la fermeture de la liste. */}
        {!(bannerOpen && hasRoute) && (
          <div style={{ width: '100%', pointerEvents: 'auto' }}>
            <TurnBanner big={banner.big} instruction={banner.instruction} road={banner.road} sub={banner.sub} kind={banner.kind} pending={banner.pending}
              onOpen={hasRoute ? () => setBannerOpen(o => !o) : undefined} open={bannerOpen} openLabel={t('record.routeNavFollowRoute')}
              onClose={!embedded && onClose ? onClose : undefined} closeLabel={t('record.routeNavClose')} />
          </div>
        )}
        {afterStep && afterGap != null && nextStep && !bannerOpen && (
          <div style={{ marginLeft: 10, pointerEvents: 'auto' }}>
            <ThenPill>
              <span>{t('w2c.then')}</span>
              <ManeuverIcon kind={maneuverKind(afterStep.type)} size={16} />
              <span>{t('w2c.maneuverIn', { man: maneuverShortFR(afterStep.type).toLowerCase(), d: fmtDist(afterGap) })}</span>
            </ThenPill>
          </div>
        )}
      </div>

      {/* Recentrer */}
      {!bannerOpen && (
        <div style={{ position: 'absolute', right: 12, top: bannerBottom + 12, zIndex: 30 }}>
          <RkFab label={t('rec.locateMe')} onClick={() => setRecenterKey(k => k + 1)} size={48}><RkIco d={RK_ICON.locate} size={21} /></RkFab>
        </div>
      )}

      {/* Liste des virages : grande feuille (~85 %) sous le bandeau, par-dessus
          la carte — la feuille de données est masquée tant qu'elle est ouverte. */}
      {bannerOpen && hasRoute && (
        <GuidePanel
          steps={steps}
          stepDistM={stepCum.map(c => Math.max(0, c - traveledM))}
          nextIdx={nextStepIdx}
          fmtDist={fmtDist}
          routeName={route?.name ?? null}
          distLabel={`${fmtKm(totalM)} km`}
          gainLabel={totalGain > 0 ? `${Math.round(totalGain)} m D+` : null}
          line={line}
          cum={cum}
          traveledM={traveledM}
          onClose={() => setBannerOpen(false)}
          topGap={(embedded ? 0 : 8) + bannerH + 8}
          bottomOffset={0}
        />
      )}

      {/* Feuille de données glissable : live · Restant / Arrivée / D+ restant · profil */}
      {hasRoute ? (bannerOpen ? null : (
        <SnapSheet snaps={[statsH, 'full']} index={sheetSnap} onIndexChange={setSheetSnap} onSettle={setSheetSettledH}
          zIndex={40} topGap={140} ariaLabel={t('record.routeNavRemaining')}
          footer={<div style={{ height: 'calc(10px + env(safe-area-inset-bottom))' }} />}>
          <NavStats ref={statsRef} live={stats.live} cols={stats.cols} />
          <div style={{ paddingBottom: 12 }}>
            <NavProfile ep={ep} totalM={totalM} traveledM={traveledM} height={72} />
            <div className="rk-num" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px 0', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: 0 }}>
              <span>{t('record.routeNavDone', { km: fmtKm(traveledM) })}</span>
              <span>{t('record.routeNavElapsed', { v: fmtTime(elapsedSec) })}</span>
            </div>
          </div>
        </SnapSheet>
      )) : (
        <div className="rk-banner rk-glass rk-num" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: embedded ? 20 : 'calc(20px + env(safe-area-inset-bottom))', zIndex: 30, animation: 'none', fontSize: 16, minHeight: 44, letterSpacing: 0 }}>
          {speedKmh.toFixed(1).replace('.', ',')} km/h
          {hr != null && <> · <span className="rk-dot" style={{ background: 'var(--danger)' }} />{Math.round(hr)} bpm</>}
          {showWatts && watts != null && <> · {Math.round(watts)} W</>}
        </div>
      )}
    </div>
  )

  if (embedded) return ui
  return typeof document !== 'undefined' ? createPortal(ui, document.body) : null
}
