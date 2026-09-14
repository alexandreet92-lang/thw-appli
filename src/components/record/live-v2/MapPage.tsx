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
import { useI18n } from '@/lib/i18n'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { NavRouteInput } from '../RouteNavScreen'
import { navigationRoute, maneuverShortFR, type NavStep } from '@/lib/openrouteservice'
import RouteSheet, { type VoiceVolume } from './RouteSheet'
import { elevationGainLoss } from '@/lib/elevation'
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

// ── D+ du parcours : EXACTEMENT la même mesure que la fiche du parcours ──
// On réutilise `elevationGainLoss` (lissage + seuil 4 m, comme au moment de la
// sauvegarde du parcours) au lieu d'un recalcul maison qui surestimait le D+
// (ex. 858 m au lieu des ~540 m stockés). `fromM` ignore la partie déjà
// parcourue pour le D+ RESTANT.
function routeGainM(ep: { distanceM: number; altitudeM: number }[], fromM = 0): number {
  const slice = fromM > 0 ? ep.filter(p => p.distanceM >= fromM) : ep
  return elevationGainLoss(slice).gain
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

/** Drapeau de course à damier (bouton noir « enregistrer la sortie »). */
function RaceFlagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 3 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 4 H19 V13 H6 Z" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M6 4 h3.25 v2.25 H6 Z M12.5 4 h3.25 v2.25 H12.5 Z M9.25 6.25 h3.25 v2.25 H9.25 Z M15.75 6.25 H19 v2.25 h-3.25 Z M6 8.5 h3.25 v2.25 H6 Z M12.5 8.5 h3.25 v2.25 H12.5 Z M9.25 10.75 h3.25 V13 H9.25 Z M15.75 10.75 H19 V13 h-3.25 Z" fill="currentColor" />
    </svg>
  )
}

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
  /** Vrai quand la séance est en pause/pause auto (bouton central = reprendre, lap masqué). */
  paused: boolean
  /** Vrai uniquement en pause MANUELLE → drapeau « enregistrer » visible (pas en pause auto). */
  showFlag: boolean
  /** Icône de lecture (reprendre) sur le bouton central — sinon carré (arrêter). */
  showPlayIcon: boolean
  /** Bouton central : arrêter (pause) / reprendre. */
  onCenter: () => void
  /** Bouton lap (droite, pendant l'enregistrement). */
  onLap: () => void
  /** Drapeau de course (gauche, à l'arrêt) → ouvre le résumé. */
  onFlag: () => void
}

export default function MapPage({
  started, locked, dim, speedKmh, powerW, heartRateBpm, distanceDoneM, gainDoneM, elapsedSec,
  points, currentPos, route, defaultLayer, units, paused, showFlag, showPlayIcon, onCenter, onLap, onFlag,
}: Props) {
  const { t } = useI18n()
  const [layer, setLayer] = useState<LayerId>(defaultLayer)
  const [layersOpen, setLayersOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  // Feuille de contrôle (ouverte au tap sur le bandeau stats bas).
  // Vue de la feuille de contrôle : main (peek/données) | voice | route.
  const [sheetView, setSheetView] = useState<'main' | 'voice' | 'route'>('main')
  // Guidage vocal (persisté) — off par défaut.
  const [voiceOn, setVoiceOn] = useState(false)
  const [volume, setVolume] = useState<VoiceVolume>('normal')
  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem('thw_live_voice_on') === '1')
      const v = localStorage.getItem('thw_live_voice_vol')
      if (v === 'loud' || v === 'normal' || v === 'soft') setVolume(v)
    } catch { /* ignore */ }
  }, [])
  const changeVoiceOn = (v: boolean) => { setVoiceOn(v); try { localStorage.setItem('thw_live_voice_on', v ? '1' : '0') } catch { /* ignore */ } }
  const changeVolume = (v: VoiceVolume) => { setVolume(v); try { localStorage.setItem('thw_live_voice_vol', v) } catch { /* ignore */ } }
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
  // Priorité au D+ STOCKÉ (fiche parcours) : c'est la valeur de référence que
  // l'utilisateur a vue en enregistrant le parcours. Recalcul (même algo) en
  // repli seulement si la base n'a pas de dénivelé stocké.
  const totalGainM: number | null = useMemo(() => {
    if (route?.elevation_gain_m != null) return route.elevation_gain_m
    if (hasElev) return routeGainM(ep)
    return null
  }, [route?.elevation_gain_m, hasElev, ep])

  // Le verrouillage prime : panneaux repliés tant que l'écran est verrouillé.
  useEffect(() => { if (locked) { setGuideOpen(false); setSheetView('main') } }, [locked])

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
    // D+ restant = D+ du profil au-delà de la progression, plafonné au total
    // de référence (cohérence avec la valeur stockée affichée en haut).
    const rem = routeGainM(ep, traveledOnRouteM)
    return totalGainM != null ? Math.min(rem, totalGainM) : rem
  }, [hasRoute, hasElev, ep, traveledOnRouteM, totalGainM])

  // Temps estimé = restant / vitesse lissée, ou 25 km/h par défaut à l'arrêt.
  const avgKmh = speedKmh > 3 ? speedKmh : 25
  const estMin = (remainingM / 1000) / avgKmh * 60
  // Heure d'arrivée prévue (maintenant + temps estimé) — fluctue avec l'allure.
  const arrivalClock = new Date(Date.now() + estMin * 60000)
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

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

  // ── Guidage vocal : annonce la prochaine manœuvre à l'approche (best-effort
  // via l'API navigateur de synthèse vocale ; nécessite un geste utilisateur sur
  // iOS pour démarrer l'audio). Une annonce par manœuvre. ──
  const spokenRef = useRef<number>(-1)
  useEffect(() => {
    if (!voiceOn || !started || nextStepIdx < 0 || !nextStep || distToNextM == null) return
    if (distToNextM > 140) return
    if (spokenRef.current === nextStepIdx) return
    spokenRef.current = nextStepIdx
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      const u = new SpeechSynthesisUtterance(`Dans ${Math.round(distToNextM)} mètres, ${nextStep.instruction ?? maneuverShortFR(nextStep)}`)
      u.lang = 'fr-FR'
      u.volume = volume === 'loud' ? 1 : volume === 'soft' ? 0.45 : 0.8
      synth.cancel(); synth.speak(u)
    } catch { /* TTS indisponible */ }
  }, [voiceOn, started, nextStepIdx, distToNextM, nextStep, volume])
  useEffect(() => { if (!started) spokenRef.current = -1 }, [started])

  // Parcours restant (le parcouru s'efface, plus dessiné).
  const routeRemaining = hasRoute ? (started ? line.slice(nearestIdx) : line) : []
  // Liaison « rejoindre l'itinéraire » : visible tant qu'on est loin du départ
  // et qu'on n'a pas encore entamé le parcours.
  const showJoinLink = hasRoute && currentPos != null && distToStartM != null && distToStartM > 25 && traveledOnRouteM < 30

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
    ? t('w2c.guidanceUnavailable')
    : started ? t('w2c.followRoute') : t('w2c.joinRoute')
  const guideSub = !hasRoute
    ? t('w2c.noRouteLoaded')
    : started
      ? t('w2c.remaining', { d: fmtDist(remainingM) })
      : t('w2c.startAt', { d: distToStartM != null ? fmtDist(distToStartM) : '—' })
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
        {/* Trace réellement parcourue — fine et discrète (breadcrumb gris). */}
        {points.length > 1 && (
          <Polyline
            positions={points.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: ACCENT_TRACK, weight: 4, opacity: 0.55, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {/* Trait de liaison pour REJOINDRE l'itinéraire (pointillés) quand on n'est
            pas encore dessus. Disparaît une fois le parcours entamé. */}
        {showJoinLink && currentPos && line[0] && (
          <Polyline
            positions={[[currentPos.lat, currentPos.lng], [line[0].lat, line[0].lng]]}
            pathOptions={{ color: ACCENT, weight: 5, opacity: 0.85, dashArray: '2 12', lineCap: 'round' }}
          />
        )}
        {/* Parcours RESTANT — gros trait bleu à halo blanc (façon Apple Plans).
            La portion DÉJÀ PARCOURUE n'est plus dessinée (elle s'efface). */}
        {routeRemaining.length > 1 && (
          <>
            <Polyline
              positions={routeRemaining.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#ffffff', weight: 13, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routeRemaining.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: ACCENT, weight: 8, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
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
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 62px)', left: 16, right: 16,
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
                    <span>{t('w2c.then')}</span>
                    {afterBadge && <RoadBadge info={afterBadge} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t('w2c.maneuverIn', { man: maneuverShortFR(afterStep.type).toLowerCase(), d: fmtDist(afterGapM) })}
                    </span>
                  </>
                ) : (
                  <span>{t('w2c.remaining', { d: fmtDist(remainingM) })}</span>
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
          line={line}
          cum={cum}
          traveledM={traveledOnRouteM}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {/* Boutons ronds (bulles) à droite pendant l'enregistrement — façon Apple Plans :
          Parcours (changer d'itinéraire) · Son (commandes vocales). */}
      {started && !locked && (
        <div style={{ position: 'absolute', right: 16, top: 'calc(env(safe-area-inset-top) + 120px)', zIndex: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'route', label: t('w2c.changeRoute'), on: () => setSheetView('route'), icon: (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/></svg>
            ) },
            { key: 'voice', label: t('w2c.voiceGuidance'), on: () => setSheetView('voice'), icon: (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/>{voiceOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /> : <path d="M22 9l-6 6M16 9l6 6" />}</svg>
            ) },
          ].map(b => (
            <button key={b.key} onClick={b.on} aria-label={b.label} className="lv2-press"
              style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--live-btn-map)', border: '1px solid var(--live-hairline-2)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: 'var(--live-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', padding: 0 }}>
              {b.icon}
            </button>
          ))}
        </div>
      )}

      {/* Feuille de contrôle (façon Apple Plans) — visible pendant l'enregistrement.
          Repliée : données (W/FC + distance/temps/D+ restants). Dépliée : profil,
          changer d'itinéraire, commandes vocales, Pause/Lap/Terminer. */}
      {started && !locked && (
        <RouteSheet
          routeName={route?.name ?? null}
          distLabel={`${frNum((totalM / 1000) * df, 1)} ${getUnitLabel('km', units)}`}
          gainLabel={totalGainM != null ? `${Math.round(totalGainM * af)} ${getUnitLabel('m', units)} D+` : null}
          ep={ep}
          totalM={totalM}
          traveledM={traveledOnRouteM}
          started={started}
          paused={paused}
          showPlayIcon={showPlayIcon}
          onPauseToggle={onCenter}
          onFinish={onFlag}
          onLap={onLap}
          canLap={!paused}
          voiceOn={voiceOn}
          setVoiceOn={changeVoiceOn}
          volume={volume}
          setVolume={changeVolume}
          view={sheetView}
          onSetView={setSheetView}
          onOpenRoutePicker={mode => {
            setSheetView('main')
            try { window.dispatchEvent(new CustomEvent('thw:live-change-route', { detail: { mode } })) } catch { /* ignore */ }
          }}
          watts={powerW != null ? String(Math.round(powerW)) : '—'}
          hr={heartRateBpm != null ? String(Math.round(heartRateBpm)) : '—'}
          remainDistLabel={frNum((remainingM / 1000) * df, 1)}
          remainDistUnit={getUnitLabel('km', units)}
          remainTimeLabel={estMin >= 60 ? formatHMS(Math.round(estMin * 60), true) : String(Math.round(estMin))}
          remainTimeUnit={estMin < 60 ? 'min' : undefined}
          arrivalLabel={hasRoute ? t('w2c.arrivalAt', { h: arrivalClock }) : null}
          remainGainLabel={remainingGainM != null ? String(Math.round(remainingGainM * af)) : null}
          remainGainUnit={getUnitLabel('m', units)}
        />
      )}

      {/* Bouton couches UNIQUE + menu (avant démarrage uniquement, cf. maquette) */}
      {!started && (
        <>
          <button
            onClick={() => setLayersOpen(o => !o)}
            aria-label={t('w2c.mapLayer')}
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
              {([['std', 'w2c.layerStandard'], ['sat', 'w2c.layerSatellite'], ['hyb', 'w2c.layerHybrid'], ['dark', 'w2c.layerDark']] as [LayerId, string][]).map(([id, lbl], i) => (
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
                  {t(lbl)}
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

      {/* (Flèches de page retirées — on change de page par balayage horizontal.) */}

      {/* Chip itinéraire — avant démarrage, au-dessus du bandeau des totaux */}
      {!started && hasRoute && (
        <div className="lv2-num" style={{
          position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 282px)', left: '50%', transform: 'translateX(-50%)',
          height: 32, padding: '0 17px', borderRadius: 16, zIndex: 20,
          background: 'var(--live-btn-map)', border: '1px solid var(--live-hairline-2)',
          display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          fontSize: 12.5, fontWeight: 600, color: 'var(--live-text-2)',
        }}>
          {t('w2c.routeLabel')} · {frNum((totalM / 1000) * df, 1)} {getUnitLabel('km', units)}
          {totalGainM != null && ` · ${Math.round(totalGainM * af)} ${getUnitLabel('m', units)} D+`}
        </div>
      )}

      {/* Bandeau stats bas — AVANT DÉPART uniquement (totaux du parcours au-dessus
          de la zone Démarrer). Pendant l'enregistrement, les données vivent dans
          la feuille de contrôle (RouteSheet). */}
      {!started && hasRoute && (() => {
        const estCol = {
          label: t('w2c.estTime'),
          value: estMin >= 60 ? formatHMS(Math.round(estMin * 60), true) : String(Math.round(estMin)),
          unit: estMin < 60 ? 'min' : undefined,
          sub: null as string | null,
        }
        const cols: { label: string; value: string; unit?: string; sub: string | null }[] = [
          ...(totalGainM != null ? [{
            label: t('w2c.elevTotal'),
            value: String(Math.round(totalGainM * af)),
            unit: getUnitLabel('m', units),
            sub: null,
          }] : []),
          {
            label: t('w2c.distance'),
            value: frNum((totalM / 1000) * df, 1),
            unit: getUnitLabel('km', units),
            sub: null,
          },
          estCol,
        ]
        return (
          <div
            style={{
              position: 'absolute', zIndex: 15,
              display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
              left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom) + 158px)', height: 108,
              padding: '16px 6px 0',
              background: 'var(--live-band-bg)', borderTop: '1px solid var(--live-hairline-2)', borderBottom: '1px solid var(--live-hairline-2)',
              backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            }}>
            {cols.map((c, i) => (
              <div key={c.label} style={{ textAlign: 'center', position: 'relative' }}>
                {i > 0 && (
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: 14, width: 1, background: 'var(--live-hairline)' }} />
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
