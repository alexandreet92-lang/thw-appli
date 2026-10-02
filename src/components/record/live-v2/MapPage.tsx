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
import { useReducedMotion } from 'motion/react'
import type { NavRouteInput } from '../RouteNavScreen'
import { navigationRoute, maneuverShortFR, type NavStep } from '@/lib/openrouteservice'
import RouteSheet, { type VoiceVolume } from './RouteSheet'
import { elevationGainLoss } from '@/lib/elevation'
import { frNum } from './liveMachine'
import { distFactor, altFactor, getUnitLabel, formatDistShortU, type LiveUnits } from '../units'
import GuidePanel, { ManeuverIcon, maneuverKind, detectRoadBadge } from './GuidePanel'
import { TurnBanner, ThenPill } from './NavUI'
import { RkFab, RkIco, RK_ICON, RkActionSheet, rkTileUrl } from '../kit/RecordKit'
import { useMeasure, useSafeTop } from '../kit/SnapSheet'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTR = '© Mapbox © OpenStreetMap'

// Couleurs passées à Leaflet en littéral : les attributs SVG posés par Leaflet
// n'acceptent pas var(--token). Valeurs = tokens --live-accent / accent-track.
const ACCENT = '#06B6D4' // design-allow-color
const ACCENT_TRACK = '#155E6E' // design-allow-color
const RIDDEN = '#94A3B8' // design-allow-color — portion du parcours déjà roulée (gris, = --rk-ridden)
const CASING = '#FFFFFF' // design-allow-color — halo blanc du tracé

/** Couches proposées par les réglages (defaultMapType). */
type BaseLayerId = 'std' | 'sat' | 'hyb'
/** Couches du menu de la page carte : + option « Sombre » (dark-v11). */
type LayerId = BaseLayerId | 'dark'

// Standard = carte EN COULEUR (outdoors-v12) quel que soit le thème ;
// Satellite = imagerie seule (satellite-v9) ; Hybride = imagerie + routes.
function tileUrl(layer: LayerId): string {
  return rkTileUrl(layer, TOKEN)
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
// La position est centrée dans la zone VISIBLE (entre le bandeau et la
// feuille du bas) : décalage vertical = (bas − haut) / 2. « Recentrer »
// (recenterKey) relance le suivi immédiatement.
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
    const off = (padBottom - padTop) / 2
    const target = map.unproject(map.project([pos.lat, pos.lng], z).add([0, off]), z)
    selfMoving.current = true
    map.setView(target, z, { animate: !reduce })
    map.once('moveend', () => { selfMoving.current = false })
  }
  useEffect(() => { center(false) }, [map, pos, padTop, padBottom]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!recenterKey) return
    lastInteract.current = 0
    center(true)
  }, [recenterKey]) // eslint-disable-line react-hooks/exhaustive-deps
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
  /** Avant départ : Démarrer (désactivé tant que le GPS n'est pas prêt). */
  onStart: () => void
  canStart: boolean
  /** Verrouiller l'écran (pendant l'enregistrement). */
  onLock: () => void
  /** Permutation Pause/Lap (réglage). */
  swap?: boolean
  /** ✕ (avant départ / en pause) — absent = masqué. */
  onClose?: () => void
  /** Hauteur occupée en bas par la feuille de données (px) → pagination du shell. */
  onBottomInset?: (h: number) => void
}

export default function MapPage({
  started, locked, dim, speedKmh, powerW, heartRateBpm, distanceDoneM, gainDoneM, elapsedSec,
  points, currentPos, route, defaultLayer, units, paused, showFlag, showPlayIcon, onCenter, onLap, onFlag,
  onStart, canStart, onLock, swap, onClose, onBottomInset,
}: Props) {
  const { t } = useI18n()
  const safeTop = useSafeTop()
  const [bannerRef, bannerH] = useMeasure<HTMLDivElement>()
  const [sheetSettledH, setSheetSettledH] = useState(260)
  const [recenterKey, setRecenterKey] = useState(0)
  const [collapseKey, setCollapseKey] = useState(0)
  useEffect(() => { onBottomInset?.(sheetSettledH) }, [sheetSettledH, onBottomInset])
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
      const u = new SpeechSynthesisUtterance(`Dans ${Math.round(distToNextM)} mètres, ${nextStep.instruction ?? maneuverShortFR(nextStep.type)}`)
      u.lang = 'fr-FR'
      u.volume = volume === 'loud' ? 1 : volume === 'soft' ? 0.45 : 0.8
      synth.cancel(); synth.speak(u)
    } catch { /* TTS indisponible */ }
  }, [voiceOn, started, nextStepIdx, distToNextM, nextStep, volume])
  useEffect(() => { if (!started) spokenRef.current = -1 }, [started])

  // Parcours restant (cyan) + portion déjà roulée (gris), coupés au point
  // projeté sur le segment courant.
  const cutPoint: LatLng | null = useMemo(() => {
    if (!started || !hasRoute || !proj) return null
    const i = proj.segIdx
    const a = line[i], b = line[i + 1]
    if (!a || !b) return null
    const seg = (cum[i + 1] ?? 0) - (cum[i] ?? 0)
    const tt = seg > 0 ? Math.max(0, Math.min(1, (proj.progressM - (cum[i] ?? 0)) / seg)) : 0
    return { lat: a.lat + (b.lat - a.lat) * tt, lng: a.lng + (b.lng - a.lng) * tt }
  }, [started, hasRoute, proj, line, cum])
  const routeRemaining = hasRoute ? (started && cutPoint ? [cutPoint, ...line.slice(nearestIdx + 1)] : line) : []
  const routeRidden = hasRoute && started && cutPoint && traveledOnRouteM > 5 ? [...line.slice(0, nearestIdx + 1), cutPoint] : []
  // Liaison « rejoindre l'itinéraire » : visible tant qu'on est loin du départ
  // et qu'on n'a pas encore entamé le parcours.
  const showJoinLink = hasRoute && currentPos != null && distToStartM != null && distToStartM > 25 && traveledOnRouteM < 30

  const center: [number, number] = currentPos
    ? [currentPos.lat, currentPos.lng]
    : line[0] ? [line[0].lat, line[0].lng] : [48.8566, 2.3522]

  // ── Bandeau de guidage (maquette L6) ──
  // Sans fix GPS : « Recherche de votre position… » ; avant le parcours :
  // distance jusqu'au départ + « Rejoignez l'itinéraire » ; en roulant avec
  // manœuvres ORS : distance + instruction + voie ; sinon « Suivez l'itinéraire ».
  const onRouteNow = distToStartM != null && distToStartM <= 25
  const banner: { big: string | null; instruction: string; road?: string | null; sub?: string | null; kind: ReturnType<typeof maneuverKind> | 'join' | 'straight'; pending?: boolean } =
    !hasRoute
      ? { big: null, instruction: t('w2c.noRouteLoaded'), sub: null, kind: 'straight' }
      : turnMode && nextStep && distToNextM != null
        ? { big: fmtDist(distToNextM), instruction: maneuverShortFR(nextStep.type), road: nextStep.name || (nextBadge ? nextBadge.ref : null), kind: maneuverKind(nextStep.type) }
        : currentPos == null
          ? { big: null, instruction: t('w2c.locating'), sub: null, kind: 'straight', pending: true }
          : (!started || showJoinLink) && !onRouteNow && distToStartM != null
            ? { big: fmtDist(distToStartM), instruction: t('w2c.joinRoute'), kind: 'join' }
            : !started
              ? { big: null, instruction: t('rec.atStart'), sub: `${t('w2c.routeLabel')} · ${frNum((totalM / 1000) * df, 1)} ${getUnitLabel('km', units) ?? 'km'}`, kind: 'straight' }
              : { big: null, instruction: t('w2c.followRoute'), sub: t('w2c.remaining', { d: fmtDist(remainingM) }), kind: 'straight' }
  const thenPill = turnMode && afterStep && afterGapM != null
    ? (
      <ThenPill>
        <span>{t('w2c.then')}</span>
        <ManeuverIcon kind={maneuverKind(afterStep.type)} size={16} />
        <span>{t('w2c.maneuverIn', { man: afterBadge ? afterBadge.ref : maneuverShortFR(afterStep.type).toLowerCase(), d: fmtDist(afterGapM) })}</span>
      </ThenPill>
    )
    : null

  // Insets réels : bas du bandeau (safe-area + 8 + hauteur mesurée) et
  // hauteur de la feuille de données.
  const bannerBottom = safeTop + 8 + bannerH
  const bottomInset = hasRoute && !locked ? sheetSettledH : 0
  const kmUnit = getUnitLabel('km', units) ?? 'km'
  const mUnit = getUnitLabel('m', units) ?? 'm'

  // ── Données de la feuille (Restant · Arrivée · D+ restant) ──
  const etaMin = Math.max(0, Math.round(estMin))
  const etaLabel = etaMin >= 60 ? `${Math.floor(etaMin / 60)} h ${String(etaMin % 60).padStart(2, '0')}` : `${etaMin} min`
  const shownGain = started ? remainingGainM : totalGainM
  const stats = {
    live: [
      { value: powerW != null ? String(Math.round(powerW)) : '—', unit: 'W' },
      { value: heartRateBpm != null ? String(Math.round(heartRateBpm)) : '—', unit: 'bpm', dot: heartRateBpm != null ? 'var(--danger)' : undefined },
      { value: frNum(speedKmh * df, 1), unit: getUnitLabel('km/h', units) ?? 'km/h' },
    ],
    cols: [
      { label: t('w2c.remainingLabel'), value: frNum(((started ? remainingM : totalM) / 1000) * df, 1), unit: kmUnit, sub: started ? t('w2c.doneShort', { v: frNum((distanceDoneM / 1000) * df, 1) }) : null },
      { label: t('w2c.arrivalLabel'), value: arrivalClock, sub: t('w2c.inTime', { d: etaLabel }) },
      ...(shownGain != null ? [{ label: t('w2c.elevRemaining'), value: String(Math.round(shownGain * af)), unit: mUnit, sub: started ? t('w2c.doneShort', { v: Math.round(gainDoneM * af) }) : null }] : []),
    ],
  }

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
        preferCanvas
        zoomSnap={0}
        zoomDelta={0.4}
        wheelPxPerZoomLevel={90}
        style={{ position: 'absolute', inset: 0 }}
      >
        <TileLayer key={layer} url={tileUrl(layer)} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} keepBuffer={6} updateWhenZooming={false} updateWhenIdle attribution={ATTR} />
        {/* Trace réellement parcourue — fine et discrète (breadcrumb). */}
        {points.length > 1 && (
          <Polyline
            positions={points.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: ACCENT_TRACK, weight: 4, opacity: 0.45, lineCap: 'round', lineJoin: 'round' }}
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
        {/* Parcours RESTANT — gros trait cyan à halo blanc (façon Apple Plans). */}
        {routeRemaining.length > 1 && (
          <>
            <Polyline
              positions={routeRemaining.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: CASING, weight: 13, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routeRemaining.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: ACCENT, weight: 8, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}
        {/* Portion DÉJÀ ROULÉE — même tracé, en gris. */}
        {routeRidden.length > 1 && (
          <>
            <Polyline
              positions={routeRidden.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: CASING, weight: 12, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routeRidden.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: RIDDEN, weight: 7, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}
        {currentPos && <Marker position={[currentPos.lat, currentPos.lng]} icon={gpsIcon} />}
        <Follow pos={currentPos} padTop={bannerBottom} padBottom={bottomInset} recenterKey={recenterKey} />
      </MapContainer>
      </div>

      {/* Scrims (thème sombre uniquement) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'var(--live-scrim-top)', pointerEvents: 'none', zIndex: 10 }} />

      {/* Bandeau de guidage sombre + « puis … » (+ ✕ avant départ / en pause) */}
      <div ref={bannerRef} style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', left: 12, right: 12, zIndex: 30,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, pointerEvents: 'none',
      }}>
        <div className="rk-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', pointerEvents: 'auto' }}>
          {onClose && !locked && (
            <RkFab label={t('w2c.close')} onClick={onClose} size={48}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TurnBanner
              big={banner.big} instruction={banner.instruction} road={banner.road} sub={banner.sub}
              kind={banner.kind} pending={banner.pending}
              onOpen={hasRoute && !locked ? () => { setGuideOpen(o => !o); setCollapseKey(k => k + 1) } : undefined}
              open={guideOpen}
              openLabel={t('w3a.follow_route')}
            />
          </div>
        </div>
        {thenPill && <div style={{ marginLeft: onClose && !locked ? 70 : 10, pointerEvents: 'auto' }}>{thenPill}</div>}
      </div>

      {/* Panneau de guidage déplié : entre le bandeau et la feuille du bas. */}
      {guideOpen && hasRoute && (
        <GuidePanel
          steps={steps ?? []}
          stepDistM={stepDistM}
          nextIdx={steps ? nextStepIdx : -1}
          fmtDist={fmtDist}
          routeName={route?.name ?? null}
          distLabel={`${frNum((totalM / 1000) * df, 1)} ${kmUnit}`}
          gainLabel={totalGainM != null ? `${Math.round(totalGainM * af)} ${mUnit} D+` : null}
          line={line}
          cum={cum}
          traveledM={traveledOnRouteM}
          onClose={() => setGuideOpen(false)}
          topGap={bannerH + 16}
          bottomOffset={bottomInset + 8}
        />
      )}

      {/* Boutons ronds à droite : recentrer · guidage vocal (· fond de carte avant départ) */}
      {!locked && !guideOpen && (
        <div style={{ position: 'absolute', right: 12, top: bannerBottom + 12, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RkFab label={t('rec.locateMe')} onClick={() => setRecenterKey(k => k + 1)} size={48}><RkIco d={RK_ICON.locate} size={21} /></RkFab>
          {hasRoute && (
            <RkFab label={t('w2c.voiceGuidance')} onClick={() => setSheetView(v => (v === 'voice' ? 'main' : 'voice'))} size={48}>
              {voiceOn ? <RkIco d={RK_ICON.mic} size={20} /> : <RkIco d={<><path d="M2 2l20 20" /><path d="M9 9v2a3 3 0 0 0 5 2.2M15 9.3V6a3 3 0 0 0-5.7-1.3" /><path d="M5 11a7 7 0 0 0 11.3 5.5M19 11a7 7 0 0 1-.4 2.3M12 18v3" /></>} size={20} />}
            </RkFab>
          )}
          {!started && (
            <RkFab label={t('w2c.mapLayer')} onClick={() => setLayersOpen(true)} size={48}><RkIco d={RK_ICON.layers} size={20} /></RkFab>
          )}
        </div>
      )}

      {/* Feuille de données glissable (façon Apple Plans) */}
      {hasRoute && !locked && (
        <RouteSheet
          ep={ep}
          totalM={totalM}
          traveledM={started ? traveledOnRouteM : 0}
          stats={stats}
          phase={!started ? 'idle' : showFlag ? 'paused' : 'rec'}
          showPlayIcon={showPlayIcon}
          canLap={!paused}
          swap={swap}
          canStart={canStart}
          onStart={onStart}
          onPauseToggle={onCenter}
          onFinish={onFlag}
          onLap={onLap}
          onLock={onLock}
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
          onOpenLayers={() => setLayersOpen(true)}
          onSettle={setSheetSettledH}
          collapseKey={guideOpen ? collapseKey : 0}
        />
      )}

      {/* Fond de carte : Standard / Satellite / Hybride / Sombre */}
      <RkActionSheet open={layersOpen} onClose={() => setLayersOpen(false)} title={t('w2c.mapLayer')} zIndex={10090}
        actions={([['std', 'w2c.layerStandard'], ['sat', 'w2c.layerSatellite'], ['hyb', 'w2c.layerHybrid'], ['dark', 'w2c.layerDark']] as [LayerId, string][]).map(([id, lbl]) => ({
          key: id, label: t(lbl), checked: layer === id,
          icon: <RkIco d={id === 'std' ? RK_ICON.route : id === 'sat' ? RK_ICON.globe : RK_ICON.layers} size={19} />,
          onClick: () => setLayer(id),
        }))} />
    </div>
  )
}
