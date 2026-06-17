// ══════════════════════════════════════════════════════════════════
// Helpers builder Muscu / Hyrox (mobile). Réutilise le modèle existant
// (exercises.ts) — aucun nouveau schéma. Pattern = category ; temps cible
// de circuit = ExoCircuit.targetTimeSec ; tout est déjà persisté via les
// blocs JSONB (exercisesToBlocks, inchangé côté SessionEditor).
// ══════════════════════════════════════════════════════════════════
import type { Block } from '@/app/planning/page'
import {
  type ExoCategory, type ExoDefinition, type ExerciseItem, type ExoCircuit,
  EXERCISE_DATABASE,
} from '../exercises'

export type { ExerciseItem, ExoCircuit, ExoCategory, ExoDefinition } from '../exercises'

// Patterns muscu (5) → token couleur + libellé. abdos = Core, mixte = Full body.
export const MUSCU_PATTERNS: ExoCategory[] = ['push', 'pull', 'legs', 'abdos', 'mixte']
export const PATTERN_VAR: Record<ExoCategory, string> = {
  push: 'var(--pat-push)', pull: 'var(--pat-pull)', legs: 'var(--pat-legs)',
  abdos: 'var(--pat-core)', mixte: 'var(--pat-full)', hyrox: 'var(--pat-hyrox)',
}
export const PATTERN_LABEL: Record<ExoCategory, string> = {
  push: 'Push', pull: 'Pull', legs: 'Jambes', abdos: 'Core', mixte: 'Full body', hyrox: 'Hyrox',
}

// 8 stations Hyrox officielles (ids de EXERCISE_DATABASE) + leur ordre.
export const HYROX_STATION_IDS = [
  'hyrox_skierg', 'hyrox_sled_push', 'hyrox_sled_pull', 'hyrox_bbj',
  'hyrox_rowing', 'hyrox_farmer', 'hyrox_lunges', 'hyrox_wall_balls',
] as const
export function hyroxStations(): ExoDefinition[] {
  return HYROX_STATION_IDS.map(id => EXERCISE_DATABASE.find(e => e.id === id)).filter((e): e is ExoDefinition => !!e)
}

export const genExoId = () => `exo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
export const genCircuitId = () => `circuit_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`

export function itemFromDef(def: ExoDefinition): ExerciseItem {
  return {
    id: genExoId(), exoId: def.id, name: def.name, category: def.category,
    sets: def.defaultSets, reps: def.defaultReps,
    weightKg: def.hasWeight ? 0 : undefined,
    distanceM: def.hasDistance ? 0 : undefined,
    kcal: def.hasKcal ? 0 : undefined,
    targetTimeSec: def.hasTime ? 0 : undefined,
    restSec: def.defaultRestSec,
  }
}
export function customItem(name: string, category: ExoCategory): ExerciseItem {
  return { id: genExoId(), exoId: 'custom', name, category, sets: category === 'hyrox' ? 1 : 3, reps: category === 'hyrox' ? 1 : 10, restSec: 60, distanceM: category === 'hyrox' ? 0 : undefined, targetTimeSec: category === 'hyrox' ? 0 : undefined }
}

// ── Métriques bandeau ───────────────────────────────────────────────
/** Tonnage total (kg) = Σ séries × reps × charge. */
export function tonnageKg(exos: ExerciseItem[]): number {
  return exos.reduce((s, e) => s + e.sets * e.reps * (e.weightKg ?? 0), 0)
}
/** Durée estimée (min) : temps cible si présent, sinon séries × (repos + ~reps·3s). */
export function estDurationMin(exos: ExerciseItem[], circuits: ExoCircuit[]): number {
  let sec = 0
  for (const e of exos) sec += (e.targetTimeSec ?? e.sets * (e.restSec + e.reps * 3))
  for (const c of circuits) if (c.targetTimeSec) sec = Math.max(sec, c.targetTimeSec)
  return Math.round(sec / 60)
}
/** Temps cible total (s) : Σ temps cible des circuits, sinon Σ temps cible exos. */
export function targetTimeSec(exos: ExerciseItem[], circuits: ExoCircuit[]): number {
  const c = circuits.reduce((s, x) => s + (x.targetTimeSec ?? 0), 0)
  if (c > 0) return c
  return exos.reduce((s, e) => s + (e.targetTimeSec ?? 0), 0)
}

// ── Edit mode : blocs JSONB → exercices/circuits (best-effort) ───────
function lookupCategory(name: string, fallback: ExoCategory): ExoCategory {
  const n = name.toLowerCase().trim()
  const hit = EXERCISE_DATABASE.find(e => e.name.toLowerCase() === n || e.aliases.some(a => a.toLowerCase() === n))
  return hit?.category ?? fallback
}
export function blocksToExercises(blocks: Block[], sport: 'gym' | 'hyrox'): { exercises: ExerciseItem[]; circuits: ExoCircuit[]; map: Record<string, string> } {
  const exercises: ExerciseItem[] = []
  const circuits: ExoCircuit[] = []
  const map: Record<string, string> = {}
  let current: ExoCircuit | null = null
  const fallback: ExoCategory = sport === 'hyrox' ? 'hyrox' : 'mixte'
  for (const b of blocks) {
    if (b.type === 'circuit_header') {
      current = {
        id: b.id, name: b.label || 'Circuit', type: b.mode as string,
        rounds: b.zone || 3, restBetweenRoundsSec: Math.round((b.recoveryMin ?? 0) * 60),
        targetTimeSec: b.durationMin ? b.durationMin * 60 : undefined,
      }
      circuits.push(current)
    } else {
      if (!current) { current = { id: 'default', name: sport === 'hyrox' ? 'Circuit 1' : 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 }; circuits.push(current) }
      const label = b.label || ''
      const name = label.replace(/\s+\d+\s*×\s*\d+.*$/, '').trim() || label || 'Exercice'
      const distMatch = label.match(/(\d+)\s*m\b/)
      const notesMatch = label.match(/—\s*(.+)$/)
      exercises.push({
        id: b.id, exoId: 'custom', name, category: lookupCategory(name, fallback),
        sets: b.zone || 1, reps: b.reps ?? 0,
        weightKg: b.value ? parseFloat(b.value) || undefined : undefined,
        distanceM: distMatch ? parseInt(distMatch[1]) : undefined,
        kcal: b.hrAvg ? parseFloat(b.hrAvg) || undefined : undefined,
        targetTimeSec: b.effortMin ? Math.round(b.effortMin * 60) : undefined,
        restSec: Math.round((b.recoveryMin ?? 1) * 60),
        notes: notesMatch ? notesMatch[1].trim() : undefined,
      })
      map[b.id] = current.id
    }
  }
  if (circuits.length === 0) circuits.push({ id: 'default', name: sport === 'hyrox' ? 'Circuit 1' : 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 })
  return { exercises, circuits, map }
}

export function defaultCircuit(sport: 'gym' | 'hyrox'): ExoCircuit {
  return sport === 'hyrox'
    ? { id: 'default', name: 'Circuit 1', type: 'circuit', rounds: 1, restBetweenRoundsSec: 0, targetTimeSec: 0 }
    : { id: 'default', name: 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 }
}

export function fmtSec(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
