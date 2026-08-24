// ══════════════════════════════════════════════════════════════════
// Modèle de blocs pour le builder SPRINTS (famille course « Sprints »).
// Chaque bloc reste un MBlock (id + durationMin + zone) pour persister tel
// quel dans la colonne blocks (JSONB) et s'afficher partout. Les données
// riches propres au sprint sont portées par le champ additif `sx`.
// ══════════════════════════════════════════════════════════════════
import type { Block } from '@/app/planning/page'
import type { MBlock } from './blocks'

const uid = () => `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// ── Gammes / éducatifs (drills) proposés à l'échauffement ──
export const SPRINT_DRILLS = [
  'Montées de genoux', 'Talons-fesses', 'Pas chassés', 'Griffés', 'Foulées bondissantes',
  'Jambes tendues', 'Skipping', 'Karaoké', 'Accélérations progressives', 'Déroulé de cheville',
] as const

export interface WarmupExt {
  kind: 'warmup'
  easyRunMin: number          // footing d'échauffement (min)
  easyPace: string            // allure du footing (m:ss /km)
  wuDistanceM: number         // sprints d'échauffement — distance
  wuReps: number              // — répétitions
  wuRecoverySec: number       // — récup entre reps
  drills: { type: string; durationSec: number }[]   // gammes/éducatifs
}
export interface SprintExt {
  kind: 'sprint'
  distanceM: number
  tMinSec: number             // temps cible bas (s)
  tMaxSec: number             // temps cible haut (s)
  reps: number
  progPct: number             // progressivité : % de l'allure à atteindre en fin (0 = constant)
  surface: 'flat' | 'uphill'
  gradientPct: number         // pente (%) si côte
  startingBlocks: boolean     // départ en starting-blocks
  recoverySec: number         // récup entre reps
  hurdles: { count: number; spacingM: number; heightCm: number } | null   // haies
}
export interface StairsExt {
  kind: 'stairs'
  steps: number               // nb de marches
  exoName: string             // nom de l'exo (ex. « Montée 2 par 2 »)
  reps: number                // nb de répétitions (pas de repos entre reps)
  restBetweenSec: number      // repos entre blocs
}
export type SprintSx = WarmupExt | SprintExt | StairsExt

export type SprintBlock = MBlock & { sx: SprintSx }

// Vitesse moyenne (km/h) d'un sprint sur le temps cible médian.
export function sprintSpeedKmh(distanceM: number, tMinSec: number, tMaxSec: number): number {
  const t = (tMinSec + tMaxSec) / 2
  return t > 0 && distanceM > 0 ? (distanceM / t) * 3.6 : 0
}

// Durée (min) approximative d'un bloc — pour le total séance (SM/SN).
function warmupMin(x: WarmupExt): number {
  const drills = x.drills.reduce((s, d) => s + (d.durationSec || 0), 0)
  const wu = x.wuReps * ((x.wuDistanceM / 6) + x.wuRecoverySec)   // ~6 m/s + récup
  return Math.round((x.easyRunMin * 60 + drills + wu) / 60)
}
function sprintMin(x: SprintExt): number {
  const effort = (x.tMinSec + x.tMaxSec) / 2
  return Math.max(1, Math.round((x.reps * (effort + x.recoverySec)) / 60))
}
function stairsMin(x: StairsExt): number {
  const perRep = x.steps * 0.4   // ~0,4 s / marche en montée rapide
  return Math.max(1, Math.round((x.reps * perRep) / 60))
}
export function sprintBlockMin(sx: SprintSx): number {
  return sx.kind === 'warmup' ? warmupMin(sx) : sx.kind === 'sprint' ? sprintMin(sx) : stairsMin(sx)
}

// Zone canonique (1–5) : échauffement Z1/Z2, sprint/escaliers Z5 (neuromusculaire).
function sxZone(sx: SprintSx): number { return sx.kind === 'warmup' ? 2 : 5 }

// Reconstruit un MBlock cohérent (durationMin/zone/label) à partir de son `sx`.
export function syncSprintBlock(b: SprintBlock): SprintBlock {
  const durationMin = sprintBlockMin(b.sx)
  const zone = sxZone(b.sx)
  const label = b.sx.kind === 'warmup' ? 'Échauffement'
    : b.sx.kind === 'sprint' ? `Sprint ${b.sx.distanceM} m`
    : `Escaliers · ${b.sx.exoName || 'montée'}`
  const type: Block['type'] = b.sx.kind === 'warmup' ? 'warmup' : 'effort'
  return { ...b, durationMin, zone, label, type, mode: 'single', value: b.value ?? '', hrAvg: b.hrAvg ?? '' }
}

export function newSprintWarmup(): SprintBlock {
  return syncSprintBlock({
    id: uid(), mode: 'single', type: 'warmup', durationMin: 0, zone: 2, value: '', hrAvg: '', label: 'Échauffement',
    sx: { kind: 'warmup', easyRunMin: 15, easyPace: '6:00', wuDistanceM: 40, wuReps: 4, wuRecoverySec: 60,
      drills: [{ type: 'Montées de genoux', durationSec: 20 }, { type: 'Talons-fesses', durationSec: 20 }, { type: 'Griffés', durationSec: 20 }] },
  })
}
export function newSprint(): SprintBlock {
  return syncSprintBlock({
    id: uid(), mode: 'single', type: 'effort', durationMin: 0, zone: 5, value: '', hrAvg: '', label: 'Sprint',
    sx: { kind: 'sprint', distanceM: 100, tMinSec: 12, tMaxSec: 13, reps: 6, progPct: 0,
      surface: 'flat', gradientPct: 0, startingBlocks: false, recoverySec: 240, hurdles: null },
  })
}
export function newStairs(): SprintBlock {
  return syncSprintBlock({
    id: uid(), mode: 'single', type: 'effort', durationMin: 0, zone: 5, value: '', hrAvg: '', label: 'Escaliers',
    sx: { kind: 'stairs', steps: 40, exoName: 'Montée 1 par 1', reps: 8, restBetweenSec: 120 },
  })
}

// Un bloc est-il un bloc sprint (porteur de `sx`) ?
export function isSprintBlock(b: Block | MBlock): b is SprintBlock {
  return !!(b as SprintBlock).sx && typeof (b as SprintBlock).sx.kind === 'string'
}
