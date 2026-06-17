'use client'
// Persistance des blocs d'entraînement. localStorage = cache local synchrone (lecture
// instantanée par l'UI) + synchronisation Supabase `training_blocs` pour le multi-appareils
// (un bloc créé sur desktop apparaît sur mobile). Données RÉELLES, zéro mock.
import { BLOC_TYPES, BLOC_SPORT_KEYS } from '@/lib/constants/blocTypes'
import { getCurrentWeek } from '@/lib/utils/weekDates'
import { createClient } from '@/lib/supabase/client'
import type { TrainingBlocData } from '@/types/trainingBloc'

export type { TrainingBlocData, SessionEntry } from '@/types/trainingBloc'
export const SPORT_KEYS = BLOC_SPORT_KEYS

const BLOCS_KEY = 'thw_training_blocs_v2'
const TYPES_KEY = 'thw_block_custom_types_v2'

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback } catch { return fallback }
}
function write(key: string, v: unknown) { if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(v)) }
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function loadBlocs(): TrainingBlocData[] {
  const list = read<TrainingBlocData[]>(BLOCS_KEY, [])
  // ⚠ BUG 2 — Training Blocs : stockage localStorage = données locales à l'appareil.
  // Symptôme reporté : "blocs créés sur Windows n'apparaissent pas sur iPhone/Mac".
  // CAUSE RÉELLE : pas une question de week_start ni de filtre Supabase — il n'y a
  // simplement AUCUNE table Supabase pour les Training Blocs. Solution permanente :
  // créer table `training_blocs` + migrer ce module vers Supabase (hors périmètre).
  if (typeof window !== 'undefined') {
    console.log('[training blocs]', {
      storage: 'localStorage',
      key: BLOCS_KEY,
      count: list.length,
      sync: 'NON — local à cet appareil seulement',
      fixRequired: 'créer table Supabase training_blocs + migrer trainingBlocks.ts',
    })
  }
  return list
}
export function saveBlocs(list: TrainingBlocData[]) { write(BLOCS_KEY, list) }

// ── Synchronisation Supabase (multi-appareils) ──────────────────────
interface BlocRow {
  id: string; sport: string; name: string
  start_year: number | null; start_week: number | null; duration_weeks: number | null
  focus: string[] | null; sessions: TrainingBlocData['sessions'] | null; created_at: string | null
}
function rowToBloc(r: BlocRow): TrainingBlocData {
  return {
    id: r.id, sport: r.sport, name: r.name,
    startYear: r.start_year ?? new Date().getFullYear(),
    startWeek: r.start_week ?? getCurrentWeek().week,
    durationWeeks: r.duration_weeks ?? 4,
    focus: r.focus ?? [], sessions: r.sessions ?? [],
    createdAt: r.created_at ?? new Date().toISOString(),
  }
}
function blocToRow(b: TrainingBlocData, userId: string) {
  return {
    id: b.id, user_id: userId, sport: b.sport, name: b.name,
    start_year: b.startYear, start_week: b.startWeek, duration_weeks: b.durationWeeks,
    focus: b.focus, sessions: b.sessions, created_at: b.createdAt, updated_at: new Date().toISOString(),
  }
}

/** Récupère les blocs du cloud, met à jour le cache local, et les retourne. */
export async function syncBlocsFromCloud(): Promise<TrainingBlocData[]> {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return loadBlocs()
    const { data, error } = await sb.from('training_blocs')
      .select('id,sport,name,start_year,start_week,duration_weeks,focus,sessions,created_at')
      .eq('user_id', user.id)
    if (error || !data) return loadBlocs()
    const list = (data as BlocRow[]).map(rowToBloc)
    saveBlocs(list)
    return list
  } catch { return loadBlocs() }
}
async function pushBlocCloud(b: TrainingBlocData) {
  try { const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) return; await sb.from('training_blocs').upsert(blocToRow(b, user.id)) } catch { /* best-effort */ }
}
async function removeBlocCloud(id: string) {
  try { const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) return; await sb.from('training_blocs').delete().eq('id', id).eq('user_id', user.id) } catch { /* best-effort */ }
}

export function upsertBloc(b: TrainingBlocData): TrainingBlocData[] {
  const list = loadBlocs()
  const i = list.findIndex(x => x.id === b.id)
  if (i >= 0) list[i] = b; else list.push(b)
  saveBlocs(list)
  void pushBlocCloud(b)
  return list
}
export function deleteBloc(id: string): TrainingBlocData[] {
  const list = loadBlocs().filter(b => b.id !== id)
  saveBlocs(list)
  void removeBlocCloud(id)
  return list
}

// Nouveau bloc : démarre la semaine ISO courante, 4 semaines, 3 séances non définies.
export function newBloc(sport: string): TrainingBlocData {
  const { year, week } = getCurrentWeek()
  return {
    id: genId(), sport, name: 'Nouveau bloc',
    startYear: year, startWeek: week, durationWeeks: 4,
    focus: [], sessions: [{ type: null }, { type: null }, { type: null }],
    createdAt: new Date().toISOString(),
  }
}

export function blocsCountBySport(list: TrainingBlocData[]): Record<string, number> {
  return list.reduce<Record<string, number>>((acc, b) => { acc[b.sport] = (acc[b.sport] ?? 0) + 1; return acc }, {})
}

// Types = initiaux (BLOC_TYPES) + customs persistés par sport.
function customTypes(): Record<string, string[]> { return read<Record<string, string[]>>(TYPES_KEY, {}) }
export function typesFor(sport: string): string[] {
  const initial = BLOC_TYPES[sport] ?? []
  const custom = customTypes()[sport] ?? []
  const seen = new Set<string>()
  return [...initial, ...custom].filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}
export function addCustomType(sport: string, type: string) {
  const t = type.trim(); if (!t) return
  const all = customTypes()
  const list = all[sport] ?? []
  if (![...(BLOC_TYPES[sport] ?? []), ...list].some(x => x.toLowerCase() === t.toLowerCase())) {
    list.push(t); all[sport] = list; write(TYPES_KEY, all)
  }
}
