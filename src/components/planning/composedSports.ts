// ══════════════════════════════════════════════════════════════════
// Sports COMPOSÉS — Hybrid & Boxe. On compose une séance comme une liste de
// « moves » (exos machine / boxe), chacun avec ses champs et sa mesure.
// Persistance : tableau structuré dans planned_sessions.validation_data
// (clé `composed`), sans migration SQL. La durée de la séance est calculée
// automatiquement depuis les moves.
// ══════════════════════════════════════════════════════════════════

export type ComposedSport = 'hybrid' | 'boxe'
export type Measure = 'time' | 'distance' | 'jumps' | 'floors' | 'calories'
export type SpeedUnit = 'kmh' | 'minkm'
export type PaceWattsUnit = 'pace' | 'watts'   // rameur / skierg
export type RoundSupport = 'bag' | 'uppercut' | 'mitts' | 'sparring' | 'shadow'
export type Punch = 'jab' | 'direct' | 'hook' | 'uppercut'
export type PunchSide = 'left' | 'right'

export const PUNCH_LABEL: Record<Punch, string> = {
  jab: 'Jab', direct: 'Direct', hook: 'Crochet', uppercut: 'Uppercut',
}
// Coups qui nécessitent de préciser le bras (gauche/droit) : le crochet et
// l'uppercut. Le jab et le direct n'en ont pas besoin.
export const SIDE_PUNCHES: Punch[] = ['hook', 'uppercut']
export function needsSide(p: Punch): boolean { return SIDE_PUNCHES.includes(p) }
/** Suffixe de bras selon la langue : FR « G » / « D », EN « L » / « R ». */
export function sideSuffix(side: PunchSide, lang: string): string {
  if (lang === 'fr') return side === 'left' ? 'G' : 'D'
  return side === 'left' ? 'L' : 'R'
}
/** Libellé d'un coup, suffixé du bras pour crochet/uppercut (« Crochet G »). */
export function punchLabel(p: Punch, side: PunchSide | undefined, lang = 'fr'): string {
  const base = PUNCH_LABEL[p]
  return side && needsSide(p) ? `${base} ${sideSuffix(side, lang)}` : base
}
export const ROUND_SUPPORT_LABEL: Record<RoundSupport, string> = {
  bag: 'Sac classique', uppercut: 'Sac uppercut', mitts: 'Pâte d’ours',
  sparring: 'Sparring', shadow: 'Shadow boxing',
}
// Supports qui travaillent des combos (frappe ciblée).
export const SUPPORTS_WITH_COMBOS: RoundSupport[] = ['bag', 'mitts']

// Un move enregistré (instance dans une séance).
export interface ComposedMove {
  id: string
  kind: string            // clé du MOVE_DEF (bike, run, round, jumprope…)
  measure: Measure
  // mesures
  timeSec?: number
  distanceM?: number
  jumps?: number
  floors?: number
  calories?: number       // assault bike : mesure en kcal
  // champs cardio
  watts?: number
  hr?: number             // FC
  speedKmh?: number
  paceMinKm?: string      // « 4:30 »
  speedUnit?: SpeedUnit
  inclinePct?: number
  elevationM?: number     // calculé auto (pente ≥ 1 %)
  speedLevel?: number     // climber
  paceWattsUnit?: PaceWattsUnit
  paceSec500?: number     // rameur/skierg si unité = pace (sec / 500 m)
  // corde à sauter
  doubleUnders?: boolean
  // boxe round
  rounds?: number
  restSec?: number
  roundSupport?: RoundSupport
  combos?: string[]       // ex : ["Jab-Direct-Crochet"]
  // récup APRÈS cet exo (entre exos d'un même tour)
  restAfterSec?: number
}

// Circuit : la liste des moves est répétée N tours, avec une récup entre tours.
export interface ComposedCircuit { rounds: number; restSec: number }

// Définition d'un type de move (drive l'UI du builder).
export interface MoveDef {
  kind: string
  label: string
  sport: ComposedSport
  fields: {
    watts?: boolean; hr?: boolean; speed?: boolean; incline?: boolean
    speedLevel?: boolean; paceWatts?: boolean
    doubleUnders?: boolean; roundSupport?: boolean; roundsRest?: boolean
  }
  measures: Measure[]        // mesures possibles (l'utilisateur choisit si > 1)
  defaultMeasure: Measure
}

export const HYBRID_MOVES: MoveDef[] = [
  { kind: 'bike',    label: 'Bike',            sport: 'hybrid', fields: { watts: true, hr: true }, measures: ['time'], defaultMeasure: 'time' },
  { kind: 'assault', label: 'Assault bike',    sport: 'hybrid', fields: { watts: true, hr: true }, measures: ['time', 'distance', 'calories'], defaultMeasure: 'time' },
  { kind: 'ellip',   label: 'Elliptique bike', sport: 'hybrid', fields: { hr: true },             measures: ['time'], defaultMeasure: 'time' },
  { kind: 'climber', label: 'Climber step',    sport: 'hybrid', fields: { speedLevel: true },     measures: ['floors', 'time'], defaultMeasure: 'floors' },
  { kind: 'rower',   label: 'Rameur',          sport: 'hybrid', fields: { paceWatts: true, hr: true }, measures: ['time', 'distance'], defaultMeasure: 'time' },
  { kind: 'skierg',  label: 'SkiErg',          sport: 'hybrid', fields: { paceWatts: true, hr: true }, measures: ['time', 'distance'], defaultMeasure: 'time' },
  { kind: 'run',     label: 'Running',         sport: 'hybrid', fields: { speed: true, hr: true, incline: true }, measures: ['time', 'distance'], defaultMeasure: 'time' },
]

export const BOXE_MOVES: MoveDef[] = [
  { kind: 'jumprope',  label: 'Corde à sauter', sport: 'boxe', fields: { doubleUnders: true }, measures: ['jumps', 'time'], defaultMeasure: 'time' },
  { kind: 'round',     label: 'Round',          sport: 'boxe', fields: { roundSupport: true, roundsRest: true }, measures: ['time'], defaultMeasure: 'time' },
  { kind: 'battlerope',label: 'Battle rope',    sport: 'boxe', fields: {}, measures: ['time'], defaultMeasure: 'time' },
]

export function movesForSport(sport: ComposedSport): MoveDef[] {
  return sport === 'hybrid' ? HYBRID_MOVES : BOXE_MOVES
}
export function moveDef(sport: ComposedSport, kind: string): MoveDef | undefined {
  return movesForSport(sport).find(m => m.kind === kind)
}

// Dénivelé auto : distance (m) × pente % ÷ 100. Renvoie 0 si pente < 1 %.
export function elevationFromIncline(distanceM: number, inclinePct: number): number {
  if (!distanceM || !inclinePct || inclinePct < 1) return 0
  return Math.round(distanceM * inclinePct / 100)
}

// Distance d'un run planifié depuis vitesse (km/h) et temps (s).
export function runDistanceM(speedKmh: number | undefined, timeSec: number | undefined): number {
  if (!speedKmh || !timeSec) return 0
  return Math.round((speedKmh / 3.6) * timeSec)
}

// Minutes effectives d'un move (pour la durée totale de séance).
export function moveMinutes(m: ComposedMove): number {
  if (m.kind === 'round' && m.rounds) {
    return (m.rounds * ((m.timeSec ?? 0) + (m.restSec ?? 0))) / 60
  }
  if (m.timeSec) return m.timeSec / 60
  return 0
}

// Durée totale (min) : (Σ moves + récup inter-exos) × tours + récup inter-tours.
export function sumComposedMinutes(moves: ComposedMove[], circuit?: ComposedCircuit): number {
  const perRound = moves.reduce((s, m) => s + moveMinutes(m) + (m.restAfterSec ?? 0) / 60, 0)
  const rounds = Math.max(1, circuit?.rounds ?? 1)
  const restBetween = (rounds - 1) * ((circuit?.restSec ?? 0) / 60)
  return Math.round(perRound * rounds + restBetween)
}
