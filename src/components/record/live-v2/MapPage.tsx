'use client'
// ════════════════════════════════════════════════════════════════════
// MapPage — page 2 de l'écran live : carte plein écran (tuiles Mapbox,
// dark-v11 en thème sombre / light-v11 en thème clair), scrims, bouton
// couches UNIQUE avec menu Standard/Satellite/Hybride, flèches de page,
// capsule vitesse, mini-pause, bandeau stats bas (D+ RESTANT / RESTANT /
// TEMPS EST.), tracé parcouru en accent-track / restant en accent, position
// blanc 18⌀ + cœur cyan + halo pulsé, chip itinéraire avant départ.
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

type LayerId = 'std' | 'sat' | 'hyb'

function tileUrl(layer: LayerId, isDark: boolean): string {
  const style = layer === 'sat'
    ? 'satellite-streets-v12'
    : layer === 'hyb'
      ? 'satellite-v9'
      // Style sombre obligatoire en thème dark (dark-v11), clair = light-v11 (spec §2).
      : isDark ? 'dark-v11' : 'light-v11'
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
  isDark: boolean
  started: boolean
  locked: boolean
  dim: boolean
  speedKmh: number
  distanceDoneM: number
  gainDoneM: number
  elapsedSec: number
  /** Trace GPS réellement parcourue. */
  points: LatLng[]
  currentPos: LatLng | null
  route: NavRouteInput | null
  defaultLayer: LayerId
  units?: LiveUnits
  onPrevPage: () => void
  onNextPage: () => void
  onMiniPause: () => void
}

export default function MapPage({
  isDark, started, locked, dim, speedKmh, distanceDoneM, gainDoneM, elapsedSec,
  points, currentPos, route, defaultLayer, units, onPrevPage, onNextPage, onMiniPause,
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

  // Distances cumulées le long du parcours + index du point le plus proche.
  const cum = useMemo(() => {
    const a = [0]
    for (let i = 1; i < line.length; i++) a.push(a[i - 1] + haversine(line[i - 1], line[i]))
    return a
  }, [line])
  const totalM = cum[cum.length - 1] ?? 0
  const totalGain = useMemo(() => {
    const ep = route?.elevation_profile ?? []
    let g = 0
    for (let i = 1; i < ep.length; i++) {
      const d = ep[i].altitudeM - ep[i - 1].altitudeM
      if (d > 0) g += d
    }
    return g
  }, [route?.elevation_profile])

  // Le verrouillage prime : panneau replié tant que l'écran est verrouillé.
  useEffect(() => { if (locked) setGuideOpen(false) }, [locked])

  const nearestIdx = useMemo(() => {
    if (!currentPos || line.length === 0) return 0
    let best = 0
    let bd = Infinity
    for (let i = 0; i < line.length; i++) {
      const d = haversine(currentPos, line[i])
      if (d < bd) { bd = d; best = i }
    }
    return best
  }, [currentPos, line])

  const traveledOnRouteM = started ? (cum[nearestIdx] ?? 0) : 0
  const remainingM = Math.max(0, totalM - traveledOnRouteM)
  const remainingGain = useMemo(() => {
    if (!hasRoute) return 0
    const ep = route?.elevation_profile ?? []
    let g = 0
    for (let i = 1; i < ep.length; i++) {
      if (ep[i].distanceM < traveledOnRouteM) continue
      const d = ep[i].altitudeM - ep[i - 1].altitudeM
      if (d > 0) g += d
    }
    return ep.length > 1 ? g : Math.max(0, totalGain - gainDoneM)
  }, [hasRoute, route?.elevation_profile, traveledOnRouteM, totalGain, gainDoneM])

  const avgKmh = speedKmh > 3 ? speedKmh : 22
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
    <div style={{ position: 'absolute', inset: 0, background: 'var(--live-map-bg)' }}>
      <MapContainer
        center={center}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ position: 'absolute', inset: 0 }}
      >
        <TileLayer url={tileUrl(layer, isDark)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
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

      {/* Scrims */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'var(--live-scrim-top)', pointerEvents: 'none', zIndex: 2 }} />
      {!started && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 210, background: 'var(--live-scrim-bot)', pointerEvents: 'none', zIndex: 2 }} />
      )}

      {/* Bandeau guidage compact — à droite de la croix (spec §4) */}
      <div
        onClick={hasRoute && !locked ? () => setGuideOpen(true) : undefined}
        role={hasRoute ? 'button' : undefined}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 62px)', left: 68, right: 16,
          minHeight: 54, borderRadius: 16, zIndex: 6,
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

      {/* Panneau de guidage déplié (remplace l'ancien RouteNavScreen) */}
      {guideOpen && hasRoute && (
        <GuidePanel
          steps={steps ?? []}
          stepDistM={stepDistM}
          nextIdx={steps ? nextStepIdx : -1}
          fmtDist={fmtDist}
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
              width: 40, height: 40, borderRadius: '50%', zIndex: 6,
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
              position: 'absolute', top: 'calc(env(safe-area-inset-top) + 172px)', right: 24, zIndex: 7,
              background: 'var(--live-float)', border: '1px solid var(--live-hairline-2)',
              borderRadius: 14, overflow: 'hidden', minWidth: 150,
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}>
              {([['std', 'Standard'], ['sat', 'Satellite'], ['hyb', 'Hybride']] as [LayerId, string][]).map(([id, lbl], i) => (
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

      {/* Flèches ‹ › à mi-hauteur */}
      {[{ label: 'Page précédente', side: { left: 10 }, glyph: '‹', on: onPrevPage },
        { label: 'Page suivante', side: { right: 10 }, glyph: '›', on: onNextPage }].map(a => (
        <button
          key={a.glyph}
          onClick={a.on}
          aria-label={a.label}
          style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)', ...a.side,
            width: 32, height: 32, borderRadius: '50%', zIndex: 5,
            background: 'var(--live-arrow-bg)', border: '1px solid var(--live-hairline-2)',
            color: 'var(--live-text-2)', fontSize: 19, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 2,
          }}
        >
          {a.glyph}
        </button>
      ))}

      {/* Chip itinéraire — avant démarrage */}
      {!started && hasRoute && (
        <div className="lv2-num" style={{
          position: 'absolute', bottom: 220, left: '50%', transform: 'translateX(-50%)',
          height: 32, padding: '0 17px', borderRadius: 16, zIndex: 5,
          background: 'var(--live-btn-map)', border: '1px solid var(--live-hairline-2)',
          display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          fontSize: 12.5, fontWeight: 600, color: 'var(--live-text-2)',
        }}>
          Itinéraire · {frNum((totalM / 1000) * df, 1)} {getUnitLabel('km', units)} · {Math.round(totalGain * af)} {getUnitLabel('m', units)} D+
        </div>
      )}

      {/* Capsule vitesse — bas gauche (en enregistrement) */}
      {started && (
        <div style={{
          position: 'absolute', left: 16, bottom: 180, width: 140, borderRadius: 18, zIndex: 5,
          background: 'var(--live-float)', border: '1px solid var(--live-hairline-2)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          padding: '12px 14px',
        }}>
          <div className="lv2-eyebrow" style={{ fontSize: 10 }}>Vitesse</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="lv2-num" style={{ fontSize: 32, fontWeight: 800, color: dim ? 'var(--live-dim)' : 'var(--live-text)' }}>
              {frNum((dim ? 0 : speedKmh) * df, 1)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--live-label)' }}>{getUnitLabel('km/h', units)}</span>
          </div>
        </div>
      )}

      {/* Mini-pause — bas droite (tap → pause + retour page 1) */}
      {started && !locked && (
        <button
          onClick={onMiniPause}
          aria-label="Pause"
          className="lv2-press"
          style={{
            position: 'absolute', right: 18, bottom: 190, width: 48, height: 48,
            borderRadius: '50%', zIndex: 5,
            background: 'var(--live-float)', border: '1.5px solid var(--live-accent)',
            color: 'var(--live-accent)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="15" height="16" viewBox="0 0 14 16">
            <rect width="4.5" height="16" rx="2" fill="currentColor" />
            <rect x="9.5" width="4.5" height="16" rx="2" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Bandeau stats bas — h 160, 3 colonnes */}
      {started && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, zIndex: 4,
          background: 'var(--live-band-bg)', borderTop: '1px solid var(--live-hairline-2)',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          padding: '22px 6px 0',
        }}>
          {[
            {
              label: 'D+ restant',
              value: hasRoute ? String(Math.round(remainingGain * af)) : '—',
              unit: getUnitLabel('m', units),
              sub: `fait ${Math.round(gainDoneM * af)} ${getUnitLabel('m', units)}`,
            },
            {
              label: 'Restant',
              value: hasRoute ? frNum((remainingM / 1000) * df, 1) : '—',
              unit: getUnitLabel('km', units),
              sub: `fait ${frNum((distanceDoneM / 1000) * df, 2)} ${getUnitLabel('km', units)}`,
            },
            {
              label: 'Temps est.',
              value: hasRoute ? (estMin >= 60 ? formatHMS(Math.round(estMin * 60), true) : String(Math.round(estMin))) : '—',
              unit: hasRoute && estMin < 60 ? 'min' : undefined,
              sub: `écoulé ${Math.floor(elapsedSec / 60)} min`,
            },
          ].map((c, i) => (
            <div key={c.label} style={{ textAlign: 'center', position: 'relative' }}>
              {i > 0 && (
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 66, width: 1, background: 'var(--live-hairline)' }} />
              )}
              <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.15em' }}>{c.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: 8 }}>
                <span className="lv2-num" style={{ fontSize: 26, fontWeight: 800 }}>{c.value}</span>
                {c.unit && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--live-label)' }}>{c.unit}</span>}
              </div>
              <div className="lv2-num" style={{ fontSize: 11, fontWeight: 500, color: 'var(--live-dim-sub)', marginTop: 6 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
