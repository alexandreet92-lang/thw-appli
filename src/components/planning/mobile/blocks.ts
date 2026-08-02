// ══════════════════════════════════════════════════════════════════
// Modèle de blocs pour le builder mobile. `durationMin` reste la durée
// canonique (utilisée par le calcul SM/SN — INCHANGÉ) ; `distanceM` est
// un champ auxiliaire additif (course/natation) pour l'affichage/saisie
// en mode distance. On dérive toujours durationMin depuis distance×allure
// pour ne pas casser SM/SN.
// ══════════════════════════════════════════════════════════════════
import { getZone, type Block, type SportType } from '@/app/planning/page'
import { paceToSec, secToPace } from './editorial'
import { elevationFromIncline } from '../composedSports'

/** km/h → allure « m:ss » /km (pour dériver la zone en mode tapis). */
export function kmhToPace(kmh: number): string {
  if (!kmh || kmh <= 0) return ''
  const sec = Math.round(3600 / kmh)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** Vitesse équivalente plat (km/h) tenant compte de la pente (éq. ACSM :
 *  courir en pente coûte plus cher — v_eq = v·(1 + 4,5·pente)). */
export function kmhEquivalent(kmh: number, inclinePct: number): number {
  return kmh * (1 + 4.5 * Math.max(0, inclinePct || 0) / 100)
}

export type EffortUnit = 'watts' | 'zone' | 'pace' | 'pctvma' | 'kmh'
export type InputMode = 'time' | 'distance'

export type MBlock = Block & {
  distanceM?: number
  recoveryDistanceM?: number
  inputMode?: InputMode
  effortUnit?: EffortUnit
  recoveryStyle?: string   // course : 'trot' | 'marche'
  nage?: string            // natation : Crawl / Dos / Brasse / Pap
  machineLevel?: number    // elliptique : niveau de résistance de la machine (info)
  // Natation : matériel du bloc (pull buoy, planche, plaquettes, palmes).
  equipment?: string[]
  // Natation : exercice HYPOXIE. Deux modes :
  //  • 'distance' : apnée sur 12,5 / 25 / 50 / 100 m (distanceM porte la distance)
  //  • 'strokes'  : respiration tous les N coups de bras (breathEvery) sur la
  //    distance saisie, récup « à l'arrêt » (stop) ou « nage continue » (continue).
  hypoxie?: { mode: 'distance' | 'strokes'; breathEvery?: number; recovery?: 'stop' | 'continue' }
  // ── Progressif (course) — séance CONTINUE à allure croissante ──
  // `progSteps` paliers de `progStepMin` minutes, allure de DÉPART portée par
  // `value` (m:ss /km), accélérée de `progStepSec` secondes par km à CHAQUE palier.
  // Ex. 6 × 5 min, départ 5:30/km, −10 s/km → 5:30 · 5:20 · … · 4:40.
  progSteps?: number
  progStepMin?: number
  progStepSec?: number
  // ── Intervalle progressif — chaque RÉPÉTITION a sa propre allure/vitesse/watts ──
  /** Ex. 3×10' : 4:10 → 4:00 → 3:50. Actif quand `progressive` = true ;
   *  longueur de `repValues` alignée sur `reps`. Distinct de progSteps (continu). */
  progressive?: boolean
  repValues?: string[]
  // ── Parcours (vélo) ──
  /** Bloc de FOND « endurance Z2 » couvrant tout le parcours. Ses segments
   *  réels sont recalculés autour des blocs d'intensité (cf. parcoursBase.ts). */
  _base?: boolean
  /** Segments restants du fond Z2 (km) — dérivés, jamais saisis à la main. */
  _baseSegments?: { startKm: number; endKm: number }[]
}

export const NAGES = ['Crawl', 'Dos', 'Brasse', 'Pap'] as const
export const RECUP_STYLES = ['trot', 'marche'] as const
// Natation — matériel sélectionnable par bloc.
export const SWIM_EQUIPMENT = ['Pull buoy', 'Planche', 'Plaquettes', 'Palmes'] as const
// Hypoxie — distances d'apnée et cadences de respiration proposées.
export const HYPOXIE_DISTANCES = [12.5, 25, 50, 100] as const
export const HYPOXIE_STROKES = [4, 6, 8, 10] as const

const uid = () => `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

/** Durée (min) d'un bloc en mode distance, dérivée de l'allure. */
export function durFromDistance(sport: SportType, distanceM: number, paceStr: string): number {
  const sec = paceToSec(paceStr)
  if (isNaN(sec) || !distanceM) return 0
  if (sport === 'swim') return (distanceM / 100) * sec / 60      // /100m
  if (sport === 'rowing') return (distanceM / 500) * sec / 60    // /500m
  return (distanceM / 1000) * sec / 60   // course : allure /km
}

/** Distance (m) parcourue par UNE répétition d'effort (course/natation) en mode
 *  TEMPS, dérivée de l'allure (min/km ou /100m) ou de la vitesse (km/h).
 *  0 si non calculable (ex. %VMA sans VMA connue). */
export function effortDistanceM(sport: SportType, effortUnit: EffortUnit | undefined, value: string, minutes: number): number {
  if (!(minutes > 0)) return 0
  if (effortUnit === 'kmh') {
    const kmh = parseFloat(value || '0') || 0
    return kmh > 0 ? Math.round((kmh / 3.6) * minutes * 60) : 0
  }
  if (effortUnit === 'pace' && (sport === 'run' || sport === 'swim')) {
    const paceSec = paceToSec(value)   // sec/km (course) ou sec/100m (natation)
    if (!(paceSec > 0)) return 0
    const unit = sport === 'swim' ? 100 : 1000
    return Math.round((minutes * 60 / paceSec) * unit)
  }
  return 0   // %VMA / zone : distance inconnue ici
}

/** Recalcule durationMin / effortMin si le bloc est en mode distance. */
export function recalc(sport: SportType, b: MBlock): MBlock {
  const nb = { ...b }
  // Progressif (course) CONTINU : durée = paliers × durée/palier. La zone canonique
  // (SM/SN, badge) est celle du palier MÉDIAN — représentative de l'effort moyen.
  if (nb.mode === 'progressive') {
    const steps = Math.max(1, nb.progSteps ?? 1)
    nb.durationMin = steps * Math.max(0, nb.progStepMin ?? 0)
    const startSec = paceToSec(nb.value ?? '')
    if (!isNaN(startSec) && startSec > 0) {
      const midSec = Math.max(120, startSec - Math.floor((steps - 1) / 2) * (nb.progStepSec ?? 0))
      nb.zone = getZone(sport, secToPace(midSec))
    }
    return nb
  }
  // Intervalle progressif : la liste des allures par répétition suit toujours `reps`.
  if (nb.progressive && nb.mode === 'interval' && nb.reps) {
    const src = nb.repValues ?? []
    nb.repValues = Array.from({ length: nb.reps }, (_, i) => src[i] ?? src[src.length - 1] ?? nb.value)
  } else if (!nb.progressive && nb.repValues) {
    nb.repValues = undefined
  }
  // Tapis : vitesse km/h → distance = vitesse × temps → dénivelé auto (pente %).
  // La zone est calculée sur la vitesse ÉQUIVALENTE PLAT : courir en pente coûte
  // bien plus cher (éq. ACSM : v_eq = v·(1 + 4,5·pente)). Ainsi 11 km/h à 10 %
  // n'est PAS de la Z1 — l'effort réel équivaut à ~16 km/h sur plat.
  if (nb.effortUnit === 'kmh') {
    const kmh = parseFloat(nb.value || '0') || 0
    const isIv = nb.mode === 'interval' && !!nb.reps
    const effMin = isIv ? (nb.effortMin ?? 0) : nb.durationMin
    const distM = kmh > 0 ? Math.round((kmh / 3.6) * effMin * 60) : 0
    nb.distanceM = distM
    nb.elevationM = elevationFromIncline(distM, nb.inclinePct ?? 0)
    if (kmh > 0) nb.zone = getZone(sport, kmhToPace(kmhEquivalent(kmh, nb.inclinePct ?? 0)))
    if (isIv && nb.reps != null) nb.durationMin = nb.reps * ((nb.effortMin ?? 0) + (nb.recoveryMin ?? 0))
    return nb
  }
  if (nb.inputMode === 'distance' && (sport === 'run' || sport === 'swim' || sport === 'rowing')) {
    if (nb.mode === 'interval' && nb.reps) {
      nb.effortMin = durFromDistance(sport, nb.distanceM ?? 0, nb.value)
      const rec = nb.recoveryDistanceM != null
        ? durFromDistance(sport, nb.recoveryDistanceM, nb.recoveryValue ?? nb.value)
        : (nb.recoveryMin ?? 0)
      nb.recoveryMin = rec
      nb.durationMin = nb.reps * ((nb.effortMin ?? 0) + (nb.recoveryMin ?? 0))
    } else {
      nb.durationMin = durFromDistance(sport, nb.distanceM ?? 0, nb.value)
    }
  } else if (nb.mode === 'interval' && nb.reps && nb.effortMin != null && nb.recoveryMin != null) {
    nb.durationMin = nb.reps * (nb.effortMin + nb.recoveryMin)
  }
  // Mode TEMPS (course/natation) : recalcule la distance par répétition depuis
  // l'allure/vitesse. Sans ça, distanceM garderait une valeur périmée du mode
  // distance (bug : 2×10' figés à 800 m ⇒ 1,60 km au lieu de ~5,3 km).
  if (nb.inputMode !== 'distance' && (sport === 'run' || sport === 'swim')) {
    const perRepMin = (nb.mode === 'interval' && nb.reps) ? (nb.effortMin ?? 0) : nb.durationMin
    nb.distanceM = effortDistanceM(sport, nb.effortUnit, nb.value, perRepMin)
  }
  if (nb.value) nb.zone = getZone(sport, nb.value)
  return nb
}

/** Bloc simple par défaut, calibré par sport (cf. maquettes). */
export function newSingle(sport: SportType, treadmill = false): MBlock {
  const base: MBlock = { id: uid(), mode: 'single', type: 'effort', durationMin: 20, zone: 2, value: '', hrAvg: '', label: 'Bloc' }
  if (sport === 'bike') return recalc(sport, { ...base, value: '190', effortUnit: 'watts', durationMin: 30 })
  if (sport === 'run' && treadmill) return recalc(sport, { ...base, inputMode: 'time', value: '10', durationMin: 15, effortUnit: 'kmh', inclinePct: 0 })
  if (sport === 'run') return recalc(sport, { ...base, inputMode: 'time', value: '5:30', durationMin: 15, effortUnit: 'pace' })
  if (sport === 'swim') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 400, value: '2:10', effortUnit: 'pace' })
  // Aviron : allure /500m (ou watts). Elliptique : zone + niveau machine (jamais /km).
  if (sport === 'rowing') return recalc(sport, { ...base, inputMode: 'time', value: '2:00', durationMin: 20, effortUnit: 'pace' })
  if (sport === 'elliptique') return recalc(sport, { ...base, effortUnit: 'zone', zone: 2, machineLevel: 8, durationMin: 20 })
  return recalc(sport, base)
}

/** Bloc HYPOXIE (natation) : série d'apnées par distance (défaut 8×25 m). */
export function newHypoxie(): MBlock {
  return recalc('swim', {
    id: uid(), mode: 'interval', type: 'effort', durationMin: 0, zone: 4, value: '2:00', hrAvg: '',
    label: 'Hypoxie', reps: 8, effortMin: 0, recoveryMin: 0.25, recoveryZone: 1, recoveryValue: '',
    inputMode: 'distance', distanceM: 25, effortUnit: 'pace', nage: 'Crawl',
    hypoxie: { mode: 'distance' },
  })
}

/** Bloc intervalle / série par défaut, calibré par sport. */
export function newInterval(sport: SportType, treadmill = false): MBlock {
  const base: MBlock = {
    id: uid(), mode: 'interval', type: 'effort', durationMin: 0, zone: 5, value: '', hrAvg: '', label: '',
    reps: 6, effortMin: 1, recoveryMin: 1, recoveryZone: 1, recoveryValue: '',
  }
  if (sport === 'bike') return recalc(sport, { ...base, reps: 10, effortMin: 0.5, value: '360', effortUnit: 'watts', recoveryValue: '150', recoveryMin: 1 })
  if (sport === 'run' && treadmill) return recalc(sport, { ...base, inputMode: 'time', value: '15', effortMin: 1, effortUnit: 'kmh', inclinePct: 0, recoveryMin: 1.5, recoveryStyle: 'trot' })
  if (sport === 'run') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 800, value: '3:45', effortUnit: 'pace', recoveryMin: 1.5, recoveryStyle: 'trot' })
  if (sport === 'swim') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 100, reps: 8, zone: 4, value: '1:35', effortUnit: 'pace', nage: 'Crawl', recoveryMin: 0.25 })
  if (sport === 'rowing') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 500, reps: 6, zone: 4, value: '1:50', effortUnit: 'pace', recoveryMin: 1.5 })
  if (sport === 'elliptique') return recalc(sport, { ...base, reps: 6, effortMin: 1, effortUnit: 'zone', zone: 5, machineLevel: 12, recoveryMin: 1 })
  return recalc(sport, base)
}

/** Bloc PROGRESSIF (course) par défaut : 6 paliers de 5 min, départ 5:30/km,
 *  accéléré de 10 s/km à chaque palier (→ 4:40/km au dernier). */
export function newProgressive(sport: SportType): MBlock {
  return recalc(sport, {
    id: uid(), mode: 'progressive', type: 'effort', durationMin: 30, zone: 3,
    value: '5:30', hrAvg: '', label: 'Progressif',
    progSteps: 6, progStepMin: 5, progStepSec: 10, inputMode: 'time', effortUnit: 'pace',
  })
}

/** Paliers (allure /km) d'un bloc progressif — départ `value`, −progStepSec s/km/palier. */
export function progressiveSteps(b: MBlock): { min: number; paceStr: string; zone: number }[] {
  const steps = Math.max(1, b.progSteps ?? 1)
  const stepMin = Math.max(0, b.progStepMin ?? 0)
  const startSec = paceToSec(b.value || '')
  const stepSec = b.progStepSec ?? 0
  const out: { min: number; paceStr: string; zone: number }[] = []
  for (let i = 0; i < steps; i++) {
    const paceSec = isNaN(startSec) ? NaN : Math.max(120, startSec - i * stepSec)
    const paceStr = isNaN(paceSec) ? (b.value || '') : secToPace(paceSec)
    out.push({ min: stepMin, paceStr, zone: isNaN(paceSec) ? b.zone : (getZone('run', paceStr) || b.zone) })
  }
  return out
}

export interface Bar { id: string; min: number; zone: number; recovery: boolean; value?: string; speedKmhEq?: number; startKm?: number }

/** Vitesse équivalente plat d'une valeur (km/h) — pour la hauteur de barre tapis. */
function eqFor(b: MBlock, value: string): number | undefined {
  return b.effortUnit === 'kmh' ? kmhEquivalent(parseFloat(value || '0') || 0, b.inclinePct ?? 0) : undefined
}
/** Zone d'une valeur d'effort (progressif : chaque répétition a la sienne). */
function zoneFor(sport: SportType, b: MBlock, value: string): number {
  if (b.effortUnit === 'kmh') return getZone(sport, kmhToPace(kmhEquivalent(parseFloat(value || '0') || 0, b.inclinePct ?? 0)))
  return value ? getZone(sport, value) : b.zone
}

/** Barres d'un bloc isolé (1 par effort + 1 par récup d'intervalle). */
function blockBars(b: MBlock, sport?: SportType): Bar[] {
  // Progressif CONTINU : une barre par palier, allure croissante → escalier montant.
  if (b.mode === 'progressive') {
    return progressiveSteps(b).map((s, i) => ({
      id: `${b.id}_p${i}`, min: s.min, zone: s.zone, recovery: false, value: s.paceStr,
    }))
  }
  const out: Bar[] = []
  if (b.mode === 'interval' && b.reps && b.effortMin) {
    // Progressif : chaque répétition porte sa propre allure/vitesse (donc sa zone).
    const prog = b.progressive && b.repValues && b.repValues.length ? b.repValues : null
    for (let r = 0; r < b.reps; r++) {
      const val = prog ? (prog[r] ?? prog[prog.length - 1]) : b.value
      const zn = prog && sport ? zoneFor(sport, b, val) : b.zone
      out.push({ id: `${b.id}_e${r}`, min: b.effortMin, zone: zn, recovery: false, value: val, speedKmhEq: eqFor(b, val), startKm: b._startKm })
      if (b.recoveryMin && b.recoveryMin > 0) out.push({ id: `${b.id}_r${r}`, min: b.recoveryMin, zone: b.recoveryZone ?? 1, recovery: true, value: b.recoveryValue, startKm: b._startKm })
    }
  } else {
    out.push({ id: b.id, min: b.durationMin, zone: b.zone, recovery: false, value: b.value, speedKmhEq: eqFor(b, b.value), startKm: b._startKm })
  }
  return out
}

/**
 * Aplatit les blocs en barres du PROFIL D'INTENSITÉ.
 *
 * • Séance SANS parcours → ordre de la liste (inchangé).
 * • Séance AVEC parcours (blocs porteurs de `_startKm`/`_endKm`) → ordre
 *   CHRONOLOGIQUE le long du tracé, exactement comme les portions dessinées
 *   sur le profil altimétrique. Le bloc de FOND est alors ÉCLATÉ en une barre
 *   par segment (`_baseSegments`), chacune d'une durée au prorata de sa
 *   distance : on lit fond → effort → fond → effort → fond.
 *   La somme des durées est conservée (totalMin reste identique).
 */
export function toBars(blocks: MBlock[], sport?: SportType): Bar[] {
  const hasKm = blocks.some(b => b._startKm != null && b._endKm != null)
  if (!hasKm) return blocks.flatMap(b => blockBars(b, sport))

  const entries: { km: number; seq: number; bars: Bar[] }[] = []
  blocks.forEach((b, i) => {
    const segs = b._base ? (b._baseSegments ?? []) : []
    if (segs.length > 0) {
      const totalKm = segs.reduce((s, x) => s + Math.max(0, x.endKm - x.startKm), 0)
      segs.forEach((s, k) => {
        const len = Math.max(0, s.endKm - s.startKm)
        const min = totalKm > 0 ? (b.durationMin * len) / totalKm : b.durationMin / segs.length
        entries.push({
          km: s.startKm, seq: i,
          bars: [{ id: `${b.id}_s${k}`, min, zone: b.zone, recovery: false, value: b.value, startKm: s.startKm }],
        })
      })
      return
    }
    // Bloc sans repère km (séance mixte) → rejeté en fin, ordre de liste préservé.
    entries.push({ km: b._startKm ?? Number.POSITIVE_INFINITY, seq: i, bars: blockBars(b, sport) })
  })
  entries.sort((a, z) => (a.km === z.km ? a.seq - z.seq : a.km - z.km))
  return entries.flatMap(e => e.bars)
}

// ══════════════════════════════════════════════════════════════════
// Hauteur des barres du PROFIL D'INTENSITÉ — SOURCE DE VÉRITÉ UNIQUE
// (builder mobile/desktop + popover de survol du planning).
//
// La hauteur doit RACONTER l'intensité d'un COUP D'ŒIL : une sortie
// d'endurance (Z2) doit être VISIBLEMENT BASSE, un effort au seuil/VO2max
// (Z4/Z5) doit dominer le graphe. On abandonne donc l'échelle linéaire
// (z×20 %, qui plaçait Z2 à 40 % — bien trop haut) au profit d'un ESCALIER
// à fort contraste, calé par zone :
//
//   Z1 récup 10 % · Z2 endurance 26 % · Z3 tempo 50 % · Z4 seuil 76 % ·
//   Z5/Z6/Z7 VO2max+ 100 %
//
// Une nuance intra-zone de ±6 % différencie 200 W de 210 W sans jamais
// franchir la bande de la zone voisine. Z6 et Z7 rejoignent Z5 au sommet :
// au-delà du seuil, la hauteur ne raconte plus rien d'utile.
// ══════════════════════════════════════════════════════════════════
export const BAR_ZONE_CAP = 5
/** Hauteur cible (% du graphe) par zone (index = zone 1…5). */
export const ZONE_TARGET_PCT: Record<number, number> = { 1: 10, 2: 26, 3: 50, 4: 76, 5: 100 }
/** Nuance intra-zone maximale (±%) — reste dans la bande de la zone. */
export const ZONE_NUANCE_PCT = 6

/** Bornes hautes de zone, en ratio de la référence de seuil. */
const ZONE_TOPS_POWER = [0.55, 0.75, 0.87, 1.05, 1.20, 1.50, 1.85]   // % FTP (7 zones)
const ZONE_TOPS_PACE = [0.78, 0.87, 0.94, 1.02, 1.35]                // % allure seuil (5 zones)

/** Références athlète (repli aligné sur le modèle de zones du planning). */
export interface BarRefs { ftp?: number | null; runThresholdPaceSec?: number | null; cssSecPer100m?: number | null }
const FALLBACK_FTP = 301, FALLBACK_RUN = 248, FALLBACK_CSS = 88

function isPowerSport(sport: SportType): boolean { return sport === 'bike' || sport === 'elliptique' }

/** Nombre de graduations de l'axe (Z1…Z5, Z6/Z7 confondues avec Z5). */
export const BAR_AXIS_TICKS = BAR_ZONE_CAP

/** Intensité de la barre rapportée au seuil (null si non exploitable). */
function intensityRatio(bar: { value?: string; speedKmhEq?: number }, sport: SportType, refs?: BarRefs): number | null {
  if (isPowerSport(sport)) {
    const w = parseInt(bar.value ?? '') || 0
    const ftp = refs?.ftp && refs.ftp > 0 ? refs.ftp : FALLBACK_FTP
    return w > 0 ? w / ftp : null
  }
  const runRef = refs?.runThresholdPaceSec && refs.runThresholdPaceSec > 0 ? refs.runThresholdPaceSec : FALLBACK_RUN
  // Tapis : la barre reflète la vitesse ÉQUIVALENTE PLAT (pente incluse).
  if (bar.speedKmhEq != null && bar.speedKmhEq > 0) return (bar.speedKmhEq * runRef) / 3600
  const p = paceToSec(bar.value ?? '')
  if (isNaN(p) || p <= 0) return null
  const ref = sport === 'swim'
    ? (refs?.cssSecPer100m && refs.cssSecPer100m > 0 ? refs.cssSecPer100m : FALLBACK_CSS)
    : runRef
  return ref / p
}

/** Hauteur (%) d'une barre du profil d'intensité. Voir le bandeau ci-dessus. */
export function barHeightPct(
  bar: { zone: number; value?: string; speedKmhEq?: number },
  sport: SportType,
  refs?: BarRefs,
): number {
  const z = Math.max(1, Math.min(BAR_ZONE_CAP, Math.round(bar.zone || 1)))
  const base = ZONE_TARGET_PCT[z] ?? (z * (100 / BAR_ZONE_CAP))
  if (z >= BAR_ZONE_CAP) return 100          // Z5 = Z6 = Z7, au sommet
  const ratio = intensityRatio(bar, sport, refs)
  if (ratio == null) return base
  const tops = isPowerSport(sport) ? ZONE_TOPS_POWER : ZONE_TOPS_PACE
  const hi = tops[z - 1] ?? 1
  const lo = z >= 2 ? (tops[z - 2] ?? 0) : 0
  if (hi - lo <= 0) return base
  const frac = Math.max(0, Math.min(1, (ratio - lo) / (hi - lo)))
  const nuance = (frac - 0.5) * 2 * ZONE_NUANCE_PCT
  return Math.max(base - ZONE_NUANCE_PCT, Math.min(base + ZONE_NUANCE_PCT, base + nuance))
}

// ══════════════════════════════════════════════════════════════════
// Profil ALTIMÉTRIQUE d'une séance de TAPIS (course indoor).
// Le tapis n'a pas de trace GPS : le « dénivelé » vient de la PENTE (%) de
// chaque bloc. On reconstruit donc une courbe d'altitude en marchant les
// blocs dans l'ordre — distance = vitesse×temps, montée = distance×pente/100
// (le tapis ne descend jamais → l'altitude croît ou reste plate). Les
// intervalles sont éclatés en effort/récup (récup à plat). Format identique
// au profil de parcours (RouteElevationProfile) : { distKm, ele }.
// ══════════════════════════════════════════════════════════════════
export interface ElevPoint { distKm: number; ele: number }
export function treadmillProfile(blocks: MBlock[]): ElevPoint[] {
  const pts: ElevPoint[] = [{ distKm: 0, ele: 0 }]
  let distM = 0, ele = 0
  const seg = (kmh: number, minutes: number, inclinePct: number) => {
    if (!(kmh > 0) || !(minutes > 0)) return
    const m = (kmh / 3.6) * minutes * 60
    distM += m
    ele += inclinePct > 0 ? (m * inclinePct) / 100 : 0
    pts.push({ distKm: distM / 1000, ele })
  }
  for (const b of blocks) {
    if (b.effortUnit !== 'kmh') continue
    const kmh = parseFloat(b.value || '0') || 0
    const inc = b.inclinePct ?? 0
    if (b.mode === 'interval' && b.reps && b.effortMin) {
      const recKmh = parseFloat(b.recoveryValue || '0') || 0
      for (let r = 0; r < b.reps; r++) {
        seg(kmh, b.effortMin, inc)
        if (b.recoveryMin && b.recoveryMin > 0) seg(recKmh > 0 ? recKmh : kmh * 0.6, b.recoveryMin, 0)
      }
    } else {
      seg(kmh, b.durationMin, inc)
    }
  }
  return pts
}
/** D+ total (m) d'une séance de tapis (pente × distance cumulée). */
export function treadmillGainM(blocks: MBlock[]): number {
  const p = treadmillProfile(blocks)
  return p.length ? Math.round(p[p.length - 1].ele) : 0
}

/** Durée totale (min) de tous les blocs. */
export function totalMin(blocks: MBlock[]): number {
  return toBars(blocks).reduce((s, b) => s + (b.min || 0), 0)
}
/** Distance (m) d'un bloc — mesurée si saisie, sinon DÉRIVÉE de la durée × allure.
 *  Course/natation : la distance doit TOUJOURS être connue, même en mode temps
 *  (10×1′ à 4:00/km → 2500 m), pour l'affichage et les totaux du mémo. */
export function blockDistanceM(sport: SportType, b: MBlock): number {
  // Progressif CONTINU : somme des distances palier par palier (durée/palier ÷ allure).
  if (b.mode === 'progressive') {
    return Math.round(progressiveSteps(b).reduce((s, p) => {
      const paceSec = paceToSec(p.paceStr)
      return s + (isNaN(paceSec) || paceSec <= 0 || p.min <= 0 ? 0 : (p.min * 60 / paceSec) * 1000)
    }, 0))
  }
  const reps = b.mode === 'interval' && b.reps ? b.reps : 1
  // Intervalle PROGRESSIF : chaque répétition a sa propre allure/vitesse → on somme.
  if (b.progressive && b.repValues && b.repValues.length && b.mode === 'interval' && b.reps && b.inputMode !== 'distance') {
    return Math.round(b.repValues.slice(0, b.reps).reduce((d, val) => d + effortDistanceM(sport, b.effortUnit, val, b.effortMin ?? 0), 0))
  }
  if (b.distanceM && b.distanceM > 0) return b.distanceM * reps
  // Tapis : distance déjà dérivée par recalc (effortUnit kmh) et stockée dans distanceM.
  if (sport !== 'run' && sport !== 'swim' && sport !== 'rowing') return 0
  const paceSec = paceToSec(b.value ?? '')
  if (isNaN(paceSec) || paceSec <= 0) return 0
  const effMin = b.mode === 'interval' && b.reps ? (b.effortMin ?? 0) : b.durationMin
  if (effMin <= 0) return 0
  const effSec = effMin * 60
  // paceSec = temps pour l'unité de distance (km : 1000 m, 100m natation, 500m aviron).
  const unitM = sport === 'swim' ? 100 : sport === 'rowing' ? 500 : 1000
  return (effSec / paceSec) * unitM * reps
}

/** Distance totale (m) — somme des distances de bloc (course/natation). */
export function totalDistance(blocks: MBlock[], sport: SportType = 'run'): number {
  return blocks.reduce((s, b) => s + blockDistanceM(sport, b), 0)
}

export const BLOCK_NAME: Record<string, string> = {
  warmup: 'Échauffement', effort: 'Bloc', recovery: 'Récupération', cooldown: 'Retour au calme',
}
// Clés i18n parallèles (résolues via t() au site d'affichage). Le libellé FR
// ci-dessus est conservé pour rétro-compat / fallback.
export const BLOCK_NAME_KEY: Record<string, string> = {
  warmup: 'plandata.blockWarmup', effort: 'plandata.blockEffort',
  recovery: 'plandata.blockRecovery', cooldown: 'plandata.blockCooldown',
}
