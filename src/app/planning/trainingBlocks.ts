'use client'
// Données « Training Bloc » (A3 + B). Phase 0 : aucune table de blocs en base
// (training_plans / planned_sessions / planned_races existent, mais pas de table bloc).
// Migrations interdites dans ce prompt → persistance via localStorage (données RÉELLES de
// l'utilisateur, zéro mock). Colonnes DB nécessaires documentées dans le PROMPT pour une
// future migration. Couleurs sport via tokens --sport-*.
import { BLOC_TYPES } from '@/lib/constants/blocTypes'

export type BlockSport = 'bike' | 'run' | 'hyrox' | 'swim' | 'gym'
// Mappe l'id sport interne vers la clé de BLOC_TYPES (maquettes).
const TYPE_KEY: Record<BlockSport, string> = { bike: 'velo', run: 'running', hyrox: 'hyrox', swim: 'natation', gym: 'muscu' }

export const BLOCK_SPORTS: { id: BlockSport; label: string; color: string }[] = [
  { id: 'bike', label: 'Vélo', color: 'var(--sport-bike)' },
  { id: 'run', label: 'Running', color: 'var(--sport-run)' },
  { id: 'hyrox', label: 'Hyrox', color: 'var(--sport-hyrox)' },
  { id: 'swim', label: 'Natation', color: 'var(--sport-swim)' },
  { id: 'gym', label: 'Muscu', color: 'var(--sport-gym)' },
]
export const SPORT_LABEL: Record<BlockSport, string> = Object.fromEntries(BLOCK_SPORTS.map(s => [s.id, s.label])) as Record<BlockSport, string>
export const SPORT_COLOR: Record<BlockSport, string> = Object.fromEntries(BLOCK_SPORTS.map(s => [s.id, s.color])) as Record<BlockSport, string>

// Types initiaux = BLOC_TYPES (constante partagée), via la clé mappée.
function initialFor(sport: BlockSport): string[] { return BLOC_TYPES[TYPE_KEY[sport]] ?? [] }

export interface SportBlock {
  sport: BlockSport
  weekCurrent: number
  weekTotal: number
  focus: string[]
  sessions: (string | null)[]
}

const BLOCKS_KEY = 'thw_training_blocks_v1'
const TYPES_KEY = 'thw_block_custom_types_v1'

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback } catch { return fallback }
}
function write(key: string, v: unknown) { if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(v)) }

export function loadBlocks(): Partial<Record<BlockSport, SportBlock>> {
  return read<Partial<Record<BlockSport, SportBlock>>>(BLOCKS_KEY, {})
}
export function saveBlock(b: SportBlock) {
  const all = loadBlocks()
  all[b.sport] = b
  write(BLOCKS_KEY, all)
}
export function deleteBlock(sport: BlockSport) {
  const all = loadBlocks(); delete all[sport]; write(BLOCKS_KEY, all)
}
export function emptyBlock(sport: BlockSport): SportBlock {
  return { sport, weekCurrent: 1, weekTotal: 4, focus: [], sessions: [null, null, null] }
}

// Types = initiaux + customs persistés.
function customTypes(): Partial<Record<BlockSport, string[]>> {
  return read<Partial<Record<BlockSport, string[]>>>(TYPES_KEY, {})
}
export function typesFor(sport: BlockSport): string[] {
  const custom = customTypes()[sport] ?? []
  const seen = new Set<string>()
  return [...initialFor(sport), ...custom].filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}
export function addCustomType(sport: BlockSport, type: string) {
  const t = type.trim(); if (!t) return
  const all = customTypes()
  const list = all[sport] ?? []
  if (![...initialFor(sport), ...list].some(x => x.toLowerCase() === t.toLowerCase())) { list.push(t); all[sport] = list; write(TYPES_KEY, all) }
}
