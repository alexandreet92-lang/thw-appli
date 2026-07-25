'use client'
// ════════════════════════════════════════════════════════════════════
// MapPage — page 2 de l'écran live : carte plein écran (tuiles Mapbox,
// Standard = outdoors-v12 EN COULEUR dans les deux thèmes), scrims, bouton
// couches UNIQUE avec menu Standard/Satellite/Hybride/Sombre, flèches de
// page, données posées À MÊME la carte (vitesse + W + FC en texte blanc à
// halo, façon compteur Garmin — aucune capsule), bandeau stats bas (totaux du
// parcours avant départ, restants pendant l'enregistrement, distance/D+/durée
// sans parcours), tracé parcouru en accent-track / restant en accent,
// position blanc 18⌀ + cœur cyan + halo pulsé, chip itinéraire avant départ.
// PROGRESSION : projection orthogonale du point GPS sur le SEGMENT le plus
// proche du tracé (pas le sommet), désambiguïsée par la progression
// précédente (un parcours en boucle ne saute plus à l'arrivée au départ).
// D+ : somme des gains positifs du profil avec hystérésis 1 m ; sans
// altitudes, la colonne D+ est MASQUÉE (jamais de faux « 1 m »).
// EMPILEMENT : la carte vit dans .lv2-map-wrap (z 0 + isolation) qui piège
// les panes Leaflet (z 200-700) ; tous les overlays frères sont à z >= 10.
// GUIDAGE VIRAGE-PAR-VIRAGE (spec §4, vague 2) : les manœuvres réelles ORS
// (navigationRoute — type, instruction FR, name, exit_number) alimentent le
// bandeau compact (icône, distance GPS → manœuvre, badge route, « puis … »)
// et le panneau déplié GuidePanel. Parcours sans steps ORS (trace GPX
// simple) → bandeau simple + panneau « Guidage détaillé indisponible ».
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { NavRouteInput } from '../RouteNavScreen'
import { navigationRoute, maneuverShortFR, type NavStep } from '@/lib/openrouteservice'
import { formatHMS, frNum } from './liveMachine'
import { distFactor, altFactor, getUnitLabel, formatDistShortU, type LiveUnits } from '../units'
import GuidePanel, { ManeuverIcon, maneuverKind, detectRoadBadge, RoadBadge } from './GuidePanel'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'

// Couleurs passées à Leaflet en littéral : les attributs SVG posés par Leaflet
// n'acceptent pas var(--token). Valeurs = tokens --live-accent / accent-track.
const ACCENT = '#06B6D4' // design-allow-color
const ACCENT_TRACK = '#155E6E' // design-allow-color

/** Couches proposées par les réglages (defaultMapType). */
type BaseLayerId = 'std' | 'sat' | 'hyb'
/** Couches du menu de la page carte : + option « Sombre » (dark-v11). */
type LayerId = BaseLayerId | 'dark'

function tileUrl(layer: LayerId): string {
  const style = layer === 'sat'
    ? 'satellite-streets-v12'
    : layer === 'hyb'
      ? 'satellite-v9'
      : layer === 'dark'
        ? 'dark-v11'
        // Standard = carte EN COULEUR (outdoors-v12) quel que soit le thème.
        : 'outdoors-v12'
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`
}

interface LatLng { lat: number; lng: number }

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

// ── Projection du point GPS sur le tracé (progression le long du parcours) ──
// Projette orthogonalement sur CHAQUE segment (plan local équirectangulaire,
// param clampé 0..1) puis, parmi les quasi-ex-æquo (± 30 m — cas d'une boucle
// où départ et arrivée se superposent), garde le candidat dont la progression
// est la plus proche de la progression précédente : au départ d'une boucle on
// reste à 0 km au lieu de sauter à l'arrivée.
interface RouteProjection { progressM: number; segIdx: number }

function projectOnRoute(
  pos: LatLng, line: LatLng[], cum: number[], prevProgressM: number,
): RouteProjection | null {
  if (line.length < 2) return null
  const R = 6371000
  const rad = Math.PI / 180
  const cosLat = Math.cos(pos.lat * rad)
  const px = pos.lng * rad * cosLat * R
  const py = pos.lat * rad * R
  const cand: { progressM: number; segIdx: number; d: number }[] = []
  let bestD = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const ax = line[i].lng * rad * cosLat * R
    const ay = line[i].lat * rad * R
    const bx = line[i + 1].lng * rad * cosLat * R
    const by = line[i + 1].lat * rad * R
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    const segLen = (cum[i + 1] ?? 0) - (cum[i] ?? 0)
    cand.push({ progressM: (cum[i] ?? 0) + t * segLen, segIdx: i, d })
    if (d < bestD) bestD = d
  }
  let best = cand[0]
  let bestScore = Infinity
  for (const c of cand) {
    if (c.d > bestD + 30) continue
    const score = Math.abs(c.progressM - prevProgressM)
    if (score < bestScore) { bestScore = score; best = c }
  }
  return best ? { progressM: best.progressM, segIdx: best.segIdx } : null
}

// ── D+ avec hystérésis 1 m (anti-bruit) sur le profil altimétrique ──
// Somme des montées d'au moins 1 m depuis la dernière altitude de référence ;
// `fromM` ignore la partie déjà parcourue (D+ restant).
function smoothedGainM(ep: { distanceM: number; altitudeM: number }[], fromM = 0): number {
  let g = 0
  let ref: number | null = null
  for (const p of ep) {
    if (p.distanceM < fromM) { ref = p.altitudeM; continue }
    if (ref == null) { ref = p.altitudeM; continue }
    const d = p.altitudeM - ref
    if (d >= 1) { g += d; ref = p.altitudeM }
    else if (d <= -1) ref = p.altitudeM
  }
  return g
}

// Recentrage auto sur la position, suspendu 15 s après un pan/zoom manuel.
const RECENTER_DELAY_MS = 15000
function Follow({ pos }: { pos: LatLng | null }) {
  const map = useMap()
  const lastInteract = useRef(0)
  const selfMoving = useRef(false)
  useEffect(() => {
    const onUser = () => { if (!selfMoving.current) lastInteract.current = Date.now() }
    map.on('dragstart', onUser)
    map.on('zoomstart', onUser)
    return () => { map.off('dragstart', onUser); map.off('zoomstart', onUser) }
  }, [map])
  useEffect(() => {
    if (!pos) return
    if (Date.now() - lastInteract.current < RECENTER_DELAY_MS) return
    selfMoving.current = true
    map.setView([pos.lat, pos.lng], map.getZoom() < 14 ? 15 : map.getZoom(), { animate: true })
    map.once('moveend', () => { selfMoving.current = false })
  }, [map, pos])
  return null
}

const gpsIcon = L.divIcon({
  className: 'lv2-gps-marker',
  html: '<div class="lv2-gps-halo"></div><div class="lv2-gps-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

interface Props {
  started: boolean
  locked: boolean
  dim: boolean
  speedKmh: number
  /** Puissance instantanée (W) — null si aucun capteur : affiche « — ». */
  powerW: number | null
  /** Fréquence cardiaque (bpm) — null si aucun capteur : affiche « — ». */
  heartRateBpm: number | null
  distanceDoneM: number
  gainDoneM: number
  elapsedSec: number
  /** Trace GPS réellement parcourue. */
  points: LatLng[]
  currentPos: LatLng | null
  route: NavRouteInput | null
  defaultLayer: BaseLayerId
  units?: LiveUnits
  onPrevPage: () => void
  onNextPage: () => void
}

export default function MapPage({
  started, locked, dim, speedKmh, powerW, heartRateBpm, distanceDoneM, gainDoneM, elapsedSec,
  points, currentPos, route, defaultLayer, units, onPrevPage, onNextPage,
}: Props) {
  const [layer, setLayer] = useState<LayerId>(defaultLayer)
  const [layersOpen, setLayersOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  // Manœuvres ORS du parcours — null tant que rien n'est chargé / disponible.
  const [steps, setSteps] = useState<NavStep[] | null>(null)

  const df = distFactor(units)
  const af = altFactor(units)
  const fmtDist = (m: number) => formatDistShortU(m, units)

  // Étapes de navigation réelles (ORS) — uniquement si le parcours porte ses
  // waypoints (parcours créés dans l'app). Échec / trace GPX simple → null,
  // le bandeau reste en mode simple, jamais de données inventées.
  useEffect(() => {
    let alive = true
    setSteps(null)
    const wps = route?.waypoints
    if (!wps || wps.length < 2) return
    navigationRoute(wps, route?.sport ?? 'cycling')
      .then(r => { if (alive) setSteps(r.steps.length > 0 ? r.steps : null) })
      .catch(() => { /* clé ORS absente / réseau — mode simple */ })
    return () => { alive = false }
  }, [route?.waypoints, route?.sport])

  const line = route?.snapped_points ?? []
  const hasRoute = line.length > 1

  // Distances cumulées le long du parcours (géométrie = source de vérité).
  const cum = useMemo(() => {
    const a = [0]
    for (let i = 1; i < line.length; i++) a.push(a[i - 1] + haversine(line[i - 1], line[i]))
    return a
  }, [line])
  const geomTotalM = cum[cum.length - 1] ?? 0
  // Repli sur le total stocké en base si la géométrie est inexploitable.
  const totalM = geomTotalM > 0 ? geomTotalM : (route?.distance_m ?? 0)

  // D+ : profil altimétrique si présent (hystérésis 1 m), sinon total stocké
  // en base, sinon null → colonne D+ MASQUÉE (jamais de valeur inventée).
  const ep = useMemo(() => route?.elevation_profile ?? [], [route?.elevation_profile])
  const hasElev = ep.length > 1
  const totalGainM: number | null = useMemo(() => {
    if (hasElev) return smoothedGainM(ep)
    return route?.elevation_gain_m ?? null
  }, [hasElev, ep, route?.elevation_gain_m])

  // Le verrouillage prime : panneau replié tant que l'écran est verrouillé.
  useEffect(() => { if (locked) setGuideOpen(false) }, [locked])

  // Progression le long du tracé : projection segment + mémoire de la
  // progression précédente (désambiguïsation boucle) — remise à 0 à l'arrêt.
  const progressRef = useRef(0)
  useEffect(() => { if (!started) progressRef.current = 0 }, [started])
  const proj = useMemo(
    () => (currentPos ? projectOnRoute(currentPos, line, cum, progressRef.current) : null),
    [currentPos, line, cum],
  )
  useEffect(() => { if (started && proj) progressRef.current = proj.progressM }, [started, proj])

  const nearestIdx = proj?.segIdx ?? 0
  const traveledOnRouteM = started && proj ? proj.progressM : 0
  const remainingM = Math.max(0, totalM - traveledOnRouteM)
  const remainingGainM: number | null = useMemo(() => {
    if (!hasRoute || !hasElev) return null
    return smoothedGainM(ep, traveledOnRouteM)
  }, [hasRoute, hasElev, ep, traveledOnRouteM])

  // Temps estimé = restant / vitesse lissée, ou 25 km/h par défaut à l'arrêt.
  const avgKmh = speedKmh > 3 ? speedKmh : 25
  const estMin = (remainingM / 1000) / avgKmh * 60

  // Distance jusqu'au départ du parcours (bandeau « Rejoignez l'itinéraire »).
  const distToStartM = hasRoute && currentPos ? haversine(currentPos, line[0]) : null

  // ── Guidage : projection des manœuvres sur le parcours ──
  // Distance cumulée de chaque manœuvre le long du tracé (point le plus proche).
  const stepCum = useMemo(() => (steps ?? []).map(s => {
    let best = 0
    let bd = Infinity
    for (let i = 0; i < line.length; i++) {
      const d = haversine(s, line[i])
      if (d < bd) { bd = d; best = i }
    }
    return cum[best] ?? 0
  }), [steps, line, cum])
  // Distance restante jusqu'à chaque manœuvre (le long du parcours).
  const stepDistM = useMemo(
    () => stepCum.map(c => Math.max(0, c - traveledOnRouteM)),
    [stepCum, traveledOnRouteM],
  )
  const nextStepIdx = useMemo(() => {
    for (let i = 0; i < stepCum.length; i++) {
      if (stepCum[i] > traveledOnRouteM + 8) return i
    }
    return -1
  }, [stepCum, traveledOnRouteM])
  const nextStep = steps && nextStepIdx >= 0 ? steps[nextStepIdx] : null
  // Distance affichée : position GPS réelle → point de la manœuvre (spec §4).
  const distToNextM = nextStep
    ? (currentPos ? haversine(currentPos, nextStep) : stepDistM[nextStepIdx])
    : null
  const afterStep = steps && nextStepIdx >= 0 && nextStepIdx + 1 < steps.length ? steps[nextStepIdx + 1] : null
  const afterGapM = afterStep ? Math.max(0, stepCum[nextStepIdx + 1] - stepCum[nextStepIdx]) : null

  // Mode du bandeau : manœuvre réelle en roulant si steps ORS, sinon simple.
  const turnMode = started && hasRoute && nextStep != null && distToNextM != null
  const nextBadge = turnMode ? detectRoadBadge(nextStep.name, nextStep.instruction) : null
  const afterBadge = afterStep ? detectRoadBadge(afterStep.name, afterStep.instruction) : null

  // Découpe du parcours : parcouru (accent-track) / restant (accent).
  const routeDone = hasRoute && started ? line.slice(0, nearestIdx + 1) : []
  const routeRemaining = hasRoute ? (started ? line.slice(nearestIdx) : line) : []

  const center: [number, number] = currentPos
    ? [currentPos.lat, currentPos.lng]
    : line[0] ? [line[0].lat, line[0].lng] : [48.8566, 2.3522]

  const chevron = (
    <svg width="12" height="8" viewBox="0 0 12 8">
      <path d="M1 1 L6 6.5 L11 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  // États simples du bandeau (parcours absent / avant départ / sans steps ORS).
  const guideTitle = !hasRoute
    ? 'Guidage indisponible'
    : started ? 'Suivez l’itinéraire' : 'Rejoignez l’itinéraire'
  const guideSub = !hasRoute
    ? 'Aucun parcours chargé'
    : started
      ? `${fmtDist(remainingM)} restants`
      : `Départ à ${distToStartM != null ? fmtDist(distToStartM) : '—'}`
  const bannerIconKind = hasRoute ? (started ? 'straight' : 'join') : 'straight'

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--live-map-bg)', isolation: 'isolate' }}>
      {/* Wrapper z 0 + isolation : les panes Leaflet (z 200-700) restent
          piégés ici — les overlays frères (z >= 10) passent devant. */}
      <div className="lv2-map-wrap">
      <MapContainer
        center={center}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ position: 'absolute', inset: 0 }}
      >
        <TileLayer url={tileUrl(layer)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
        {/* Trace réellement parcourue — accent-track */}
        {points.length > 1 && (
          <Polyline
            positions={points.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: ACCENT_TRACK, weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {/* Parcours : portion passée en accent-track, restant en accent */}
        {routeDone.length > 1 && (
          <Polyline
            positions={routeDone.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: ACCENT_TRACK, weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {routeRemaining.length > 1 && (
          <Polyline
            positions={routeRemaining.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: ACCENT, weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {currentPos && <Marker position={[currentPos.lat, currentPos.lng]} icon={gpsIcon} />}
        <Follow pos={currentPos} />
      </MapContainer>
      </div>

      {/* Scrims */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'var(--live-scrim-top)', pointerEvents: 'none', zIndex: 10 }} />
      {!started && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 210, background: 'var(--live-scrim-bot)', pointerEvents: 'none', zIndex: 10 }} />
      )}

      {/* Bandeau guidage compact — à droite de la croix (spec §4) */}
      <div
        onClick={hasRoute && !locked ? () => setGuideOpen(true) : undefined}
        role={hasRoute ? 'button' : undefined}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 62px)', left: 68, right: 16,
          minHeight: 54, borderRadius: 16, zIndex: 30,
          background: 'var(--live-float)', border: '1px solid var(--live-hairline-2)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
          cursor: hasRoute ? 'pointer' : 'default',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: hasRoute ? 'var(--live-accent-soft)' : 'var(--live-hairline)',
          color: hasRoute ? 'var(--live-accent)' : 'var(--live-label)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ManeuverIcon kind={turnMode && nextStep ? maneuverKind(nextStep.type) : bannerIconKind} size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {turnMode && nextStep && distToNextM != null ? (
            <>
              {/* Prochaine manœuvre réelle : distance 15/700 · instruction + badge route */}
              <div style={{
                fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="lv2-num" style={{ flexShrink: 0 }}>{fmtDist(distToNextM)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>· {maneuverShortFR(nextStep.type)}</span>
                {nextBadge && <RoadBadge info={nextBadge} />}
              </div>
              {/* Sous-ligne « puis <manœuvre suivante> dans X m » 12/500 */}
              <div className="lv2-num" style={{
                fontSize: 12, fontWeight: 500, color: 'var(--live-text-2)', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {afterStep && afterGapM != null ? (
                  <>
                    <span>puis</span>
                    {afterBadge && <RoadBadge info={afterBadge} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {maneuverShortFR(afterStep.type).toLowerCase()} dans {fmtDist(afterGapM)}
                    </span>
                  </>
                ) : (
                  <span>{fmtDist(remainingM)} restants</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guideTitle}</div>
              <div className="lv2-num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--live-text-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {guideSub}
              </div>
            </>
          )}
        </div>
        {hasRoute && <span style={{ color: 'var(--live-label)', flexShrink: 0 }}>{chevron}</span>}
      </div>

      {/* Panneau de guidage déplié (remplace l'ancien RouteNavScreen).
          Sans manœuvres ORS : détail du parcours (nom, totaux, profil). */}
      {guideOpen && hasRoute && (
        <GuidePanel
          steps={steps ?? []}
          stepDistM={stepDistM}
          nextIdx={steps ? nextStepIdx : -1}
          fmtDist={fmtDist}
          routeName={route?.name ?? null}
          distLabel={`${frNum((totalM / 1000) * df, 1)} ${getUnitLabel('km', units)}`}
          gainLabel={totalGainM != null ? `${Math.round(totalGainM * af)} ${getUnitLabel('m', units)} D+` : null}
          elevProfile={ep}
          traveledM={traveledOnRouteM}
          fmtAlt={m => `${Math.round(m * af)} ${getUnitLabel('m', units)}`}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {/* Bouton couches UNIQUE + menu (avant démarrage uniquement, cf. maquette) */}
      {!started && (
        <>
          <button
            onClick={() => setLayersOpen(o => !o)}
            aria-label="Fond de carte"
            className="lv2-press"
            style={{
              position: 'absolute', top: 'calc(env(safe-area-inset-top) + 126px)', right: 24,
              width: 40, height: 40, borderRadius: '50%', zIndex: 30,
              background: 'var(--live-btn-map)', border: '1px solid var(--live-hairline-2)',
              color: 'var(--live-text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M2 6.5 L9 2.5 L16 6.5 L9 10.5 Z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
              <path d="M2 11 L9 15 L16 11" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" opacity=".55" />
            </svg>
          </button>
          {layersOpen && (
            <div style={{
              position: 'absolute', top: 'calc(env(safe-area-inset-top) + 172px)', right: 24, zIndex: 31,
              background: 'var(--live-float)', border: '1px solid var(--live-hairline-2)',
              borderRadius: 14, overflow: 'hidden', minWidth: 150,
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}>
              {([['std', 'Standard'], ['sat', 'Satellite'], ['hyb', 'Hybride'], ['dark', 'Sombre']] as [LayerId, string][]).map(([id, lbl], i) => (
                <button
                  key={id}
                  onClick={() => { setLayer(id); setLayersOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '11px 14px', border: 'none', cursor: 'pointer',
                    background: 'transparent', textAlign: 'left',
                    borderTop: i > 0 ? '1px solid var(--live-hairline)' : 'none',
                    fontSize: 13.5, fontWeight: 600,
                    color: layer === id ? 'var(--live-accent)' : 'var(--live-text)',
                  }}
                >
                  {lbl}
                  {layer === id && (
                    <svg width="14" height="14" viewBox="0 0 24 24">
                      <path d="M4 12.5 L9.5 18 L20 6.5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Flèches ‹ › à mi-hauteur — TOUJOURS visibles, au-dessus de la carte */}
      {[{ label: 'Page précédente', side: { left: 10 }, glyph: '‹', on: onPrevPage },
        { label: 'Page suivante', side: { right: 10 }, glyph: '›', on: onNextPage }].map(a => (
        <button
          key={a.glyph}
          onClick={a.on}
          aria-label={a.label}
          style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)', ...a.side,
            width: 32, height: 32, borderRadius: '50%', zIndex: 20,
            background: 'var(--live-arrow-bg)', border: '1px solid var(--live-hairline-2)',
            color: 'var(--live-text-2)', fontSize: 19, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 2,
          }}
        >
          {a.glyph}
        </button>
      ))}

      {/* Chip itinéraire — avant démarrage, au-dessus du bandeau des totaux */}
      {!started && hasRoute && (
        <div className="lv2-num" style={{
          position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 282px)', left: '50%', transform: 'translateX(-50%)',
          height: 32, padding: '0 17px', borderRadius: 16, zIndex: 20,
          background: 'var(--live-btn-map)', border: '1px solid var(--live-hairline-2)',
          display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          fontSize: 12.5, fontWeight: 600, color: 'var(--live-text-2)',
        }}>
          Itinéraire · {frNum((totalM / 1000) * df, 1)} {getUnitLabel('km', units)}
          {totalGainM != null && ` · ${Math.round(totalGainM * af)} ${getUnitLabel('m', units)} D+`}
        </div>
      )}

      {/* Données À MÊME la carte — bas gauche, texte blanc + halo noir fort
          (lisible sur carte claire ET foncée, façon compteur Garmin) :
          ligne W · FC au-dessus, VITESSE en très grand en dessous. */}
      {started && (
        <div style={{
          position: 'absolute', left: 18, bottom: 178, zIndex: 20, pointerEvents: 'none',
          color: 'var(--live-map-ink)', textShadow: 'var(--live-map-halo)',
          opacity: dim ? 0.55 : 1, transition: 'opacity 0.2s',
        }}>
          <div style={{ display: 'flex', gap: 26, alignItems: 'flex-end' }}>
            {[
              { lb: 'W', v: powerW != null ? String(Math.round(powerW)) : '—' },
              { lb: 'FC', v: heartRateBpm != null ? String(Math.round(heartRateBpm)) : '—' },
            ].map(c => (
              <div key={c.lb}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', opacity: 0.85 }}>{c.lb}</div>
                <div className="lv2-num" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05, marginTop: 1 }}>
                  {c.v}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span className="lv2-num" style={{ fontSize: 60, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.01em' }}>
              {frNum((dim ? 0 : speedKmh) * df, 1)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>{getUnitLabel('km/h', units)}</span>
          </div>
        </div>
      )}

      {/* Bandeau stats bas — 3 colonnes. Visible dès qu'un parcours est chargé
          (avant départ : TOTAUX du parcours, au-dessus de la zone Démarrer) et
          pendant l'enregistrement (restants avec parcours, sinon distance /
          D+ fait / durée). */}
      {(started || hasRoute) && (() => {
        const estCol = {
          label: 'Temps est.',
          value: estMin >= 60 ? formatHMS(Math.round(estMin * 60), true) : String(Math.round(estMin)),
          unit: estMin < 60 ? 'min' : undefined,
          sub: started ? `écoulé ${Math.floor(elapsedSec / 60)} min` : null,
        }
        // Colonnes D+ uniquement si un dénivelé RÉEL est connu — jamais de
        // valeur inventée quand le parcours n'a pas d'altitudes.
        const cols: { label: string; value: string; unit?: string; sub: string | null }[] = started
          ? hasRoute
            ? [
              ...(remainingGainM != null ? [{
                label: 'D+ restant',
                value: String(Math.round(remainingGainM * af)),
                unit: getUnitLabel('m', units),
                sub: `fait ${Math.round(gainDoneM * af)} ${getUnitLabel('m', units)}`,
              }] : []),
              {
                label: 'Restant',
                value: frNum((remainingM / 1000) * df, 1),
                unit: getUnitLabel('km', units),
                sub: `fait ${frNum((distanceDoneM / 1000) * df, 2)} ${getUnitLabel('km', units)}`,
              },
              estCol,
            ]
            : [
              {
                label: 'Distance',
                value: frNum((distanceDoneM / 1000) * df, 2),
                unit: getUnitLabel('km', units),
                sub: null,
              },
              {
                label: 'D+ fait',
                value: String(Math.round(gainDoneM * af)),
                unit: getUnitLabel('m', units),
                sub: null,
              },
              { label: 'Durée', value: formatHMS(elapsedSec, true), unit: undefined, sub: null },
            ]
          : [
            ...(totalGainM != null ? [{
              label: 'D+ total',
              value: String(Math.round(totalGainM * af)),
              unit: getUnitLabel('m', units),
              sub: null,
            }] : []),
            {
              label: 'Distance',
              value: frNum((totalM / 1000) * df, 1),
              unit: getUnitLabel('km', units),
              sub: null,
            },
            estCol,
          ]
        return (
          <div style={{
            position: 'absolute', left: 0, right: 0, zIndex: 15,
            bottom: started ? 0 : 'calc(env(safe-area-inset-bottom) + 158px)',
            height: started ? 160 : 108,
            background: 'var(--live-band-bg)',
            borderTop: '1px solid var(--live-hairline-2)',
            borderBottom: started ? 'none' : '1px solid var(--live-hairline-2)',
            display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
            padding: started ? '22px 6px 0' : '16px 6px 0',
          }}>
            {cols.map((c, i) => (
              <div key={c.label} style={{ textAlign: 'center', position: 'relative' }}>
                {i > 0 && (
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: started ? 66 : 14, width: 1, background: 'var(--live-hairline)' }} />
                )}
                <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.15em' }}>{c.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: 8 }}>
                  <span className="lv2-num" style={{ fontSize: 26, fontWeight: 800 }}>{c.value}</span>
                  {c.unit && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--live-label)' }}>{c.unit}</span>}
                </div>
                {c.sub && (
                  <div className="lv2-num" style={{ fontSize: 11, fontWeight: 500, color: 'var(--live-dim-sub)', marginTop: 6 }}>{c.sub}</div>
                )}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
