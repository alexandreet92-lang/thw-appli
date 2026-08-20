// ══════════════════════════════════════════════════════════════════
// Sports COMPOSÉS — Hybrid & Boxe. On compose une séance comme une liste de
// « moves » (exos machine / boxe), chacun avec ses champs et sa mesure.
// Persistance : tableau structuré dans planned_sessions.validation_data
// (clé `composed`), sans migration SQL. La durée de la séance est calculée
// automatiquement depuis les moves.
// ══════════════════════════════════════════════════════════════════

export type ComposedSport = 'hybrid' | 'boxe'
export type Measure = 'time' | 'distance' | 'jumps' | 'floors' | 'calories' | 'reps'
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
  circuitId?: string      // circuit d'appartenance (multi-circuits). Absent = 1er circuit.
  roundIntensities?: number[] // boxe « round » : intensité 1→10 PAR round (modifiable)
  measure: Measure
  // mesures
  timeSec?: number
  distanceM?: number
  jumps?: number
  floors?: number
  calories?: number       // assault bike : mesure en kcal
  reps?: number           // exos boxe/renfo au nombre de répétitions
  // renfo boxe : charge + variante (pompes normal/points/claquées, medecine ball V/H)
  weightKg?: number
  variant?: string        // clé d'une variante du MOVE_DEF
  customName?: string     // exercice libre : nom saisi par l'utilisateur
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

// Circuit : un GROUPE de moves répété N tours, avec une récup entre tours. Une
// séance peut contenir PLUSIEURS circuits (ex. circuit 1 = 3× sac 8 min, puis
// circuit 2 = autre chose). Chaque move référence son circuit via circuitId.
export interface ComposedCircuit { id: string; name?: string; rounds: number; restSec: number }

// Définition d'un type de move (drive l'UI du builder).
export interface MoveDef {
  kind: string
  label: string
  sport: ComposedSport
  fields: {
    watts?: boolean; hr?: boolean; speed?: boolean; incline?: boolean
    speedLevel?: boolean; paceWatts?: boolean
    doubleUnders?: boolean; roundSupport?: boolean; roundsRest?: boolean
    weight?: boolean          // champ charge (kg) — jab lesté, medecine ball…
  }
  measures: Measure[]        // mesures possibles (l'utilisateur choisit si > 1)
  defaultMeasure: Measure
  variants?: { v: string; label: string }[]   // ex : pompes normal/points/claquées
  custom?: boolean            // exercice libre : nom saisi par l'utilisateur
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
  // Renfo spécifique boxe
  { kind: 'pompes',    label: 'Pompes',         sport: 'boxe', fields: {},              measures: ['reps', 'time'], defaultMeasure: 'reps',
    variants: [{ v: 'normal', label: 'Normal' }, { v: 'points', label: 'Sur les poings' }, { v: 'claquees', label: 'Claquées' }] },
  { kind: 'burpees',   label: 'Burpees',        sport: 'boxe', fields: {},              measures: ['reps', 'time'], defaultMeasure: 'reps' },
  { kind: 'jab_leste', label: 'Jab lesté',      sport: 'boxe', fields: { weight: true }, measures: ['reps', 'time'], defaultMeasure: 'reps' },
  { kind: 'medball',   label: 'Medecine ball',  sport: 'boxe', fields: { weight: true }, measures: ['reps', 'time'], defaultMeasure: 'reps',
    variants: [{ v: 'snatch_v', label: 'Snatch vertical' }, { v: 'snatch_h', label: 'Snatch horizontal' }] },
  { kind: 'dips',      label: 'Dips',           sport: 'boxe', fields: { weight: true }, measures: ['reps', 'time'], defaultMeasure: 'reps' },
  // Exercice libre : nom saisi à la main + mesure au choix.
  { kind: 'custom',    label: 'Exercice libre', sport: 'boxe', fields: { weight: true }, measures: ['reps', 'time', 'distance', 'calories'], defaultMeasure: 'reps', custom: true },
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
  // Exos au nombre de répétitions sans temps saisi : estimation ~3 s/rep.
  if (m.measure === 'reps' && m.reps) return (m.reps * 3) / 60
  return 0
}

// Libellé d'affichage d'un move composé (variante / nom libre inclus).
export function composedMoveLabel(m: ComposedMove, def?: MoveDef): string {
  if (m.kind === 'custom') return (m.customName || '').trim() || 'Exercice libre'
  const base = def?.label ?? m.kind
  const variant = def?.variants?.find(v => v.v === m.variant)
  return variant ? `${base} · ${variant.label}` : base
}

// Durée totale (min), sommée sur TOUS les circuits. Pour chaque circuit :
// (Σ moves du circuit + récup inter-exos) × tours + récup inter-tours.
// Rétro-compat : accepte un circuit unique OU un tableau ; les moves sans
// circuitId sont rattachés au premier circuit.
export function sumComposedMinutes(moves: ComposedMove[], circuits?: ComposedCircuit | ComposedCircuit[]): number {
  const list = Array.isArray(circuits) ? circuits : circuits ? [circuits] : []
  if (list.length === 0) {
    return Math.round(moves.reduce((s, m) => s + moveMinutes(m) + (m.restAfterSec ?? 0) / 60, 0))
  }
  const firstId = list[0].id
  let total = 0
  for (const c of list) {
    const cm = moves.filter(m => (m.circuitId ?? firstId) === c.id)
    const perRound = cm.reduce((s, m) => s + moveMinutes(m) + (m.restAfterSec ?? 0) / 60, 0)
    const rounds = Math.max(1, c.rounds)
    total += perRound * rounds + (rounds - 1) * ((c.restSec ?? 0) / 60)
  }
  return Math.round(total)
}

export function newCircuitId(): string { return `c_${Math.random().toString(36).slice(2, 8)}` }
