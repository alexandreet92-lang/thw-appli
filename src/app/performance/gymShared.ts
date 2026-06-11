'use client'
// Données + utils Records/Muscu. Records dans personal_records (sport='gym',
// distance_label = `${exercice} — ${type}`). Les exercices personnalisés ajoutés via
// « + Exercice » sont stockés en localStorage (aucune migration ; les records eux-mêmes
// vivent dans personal_records).
import { createClient } from '@/lib/supabase/client'

export type GymUnit = 'kg' | 'reps' | 'addkg'
export interface GymExercise { name: string; types: string[] }

export const ALL_RECORD_TYPES = ['1RM', '3RM', '5RM', '10RM', 'Max reps PDC', '1RM+charge', 'Max charge', 'Max reps']

export const BUILTIN_EXERCISES: GymExercise[] = [
  { name: 'Bench Press', types: ['1RM', '3RM', '5RM', '10RM', 'Max reps PDC'] },
  { name: 'Squat', types: ['1RM', '3RM', '5RM', '10RM', 'Max reps PDC'] },
  { name: 'Deadlift', types: ['1RM', '3RM', '5RM', '10RM', 'Max reps PDC'] },
  { name: 'Tractions', types: ['Max reps PDC', '1RM+charge'] },
  { name: 'Dips', types: ['Max reps PDC', '1RM+charge'] },
  { name: 'Dev. militaire', types: ['Max charge'] },
  { name: 'Pompes', types: ['Max reps'] },
]

export function unitKind(type: string): GymUnit {
  if (type === '1RM+charge') return 'addkg'
  if (type.toLowerCase().includes('reps')) return 'reps'
  return 'kg'
}
export function unitLabel(type: string): 'kg' | 'reps' { return unitKind(type) === 'reps' ? 'reps' : 'kg' }
export function fmtValue(v: number, type: string): string {
  const k = unitKind(type)
  return k === 'reps' ? `${v} reps` : k === 'addkg' ? `+${v} kg` : `${v} kg`
}
export function typeLabel(type: string): string { return type === '1RM+charge' ? '1RM + charge' : type }

// ── Exercices personnalisés (localStorage) ──────────────────────────────────
const LS_KEY = 'thw_gym_custom_v1'
export function loadCustom(): GymExercise[] {
  if (typeof window === 'undefined') return []
  try { const v = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); return Array.isArray(v) ? v as GymExercise[] : [] }
  catch { return [] }
}
export function addCustom(ex: GymExercise) {
  const list = loadCustom().filter(e => e.name.toLowerCase() !== ex.name.toLowerCase())
  list.push(ex)
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}
export function allExercises(): GymExercise[] {
  const custom = loadCustom().filter(c => !BUILTIN_EXERCISES.some(b => b.name.toLowerCase() === c.name.toLowerCase()))
  return [...BUILTIN_EXERCISES, ...custom]
}

// ── Records ─────────────────────────────────────────────────────────────────
export interface GymRec { id: string; distance_label: string; performance: string; performance_unit: string; achieved_at: string }

export async function fetchGym(): Promise<GymRec[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('personal_records')
    .select('id, distance_label, performance, performance_unit, achieved_at')
    .eq('user_id', user.id).eq('sport', 'gym').order('achieved_at', { ascending: false })
  return (data ?? []) as GymRec[]
}

export async function upsertGym(p: { id: string | null; name: string; type: string; value: string; dateISO: string }): Promise<GymRec | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const unit = unitLabel(p.type)
  if (p.id) {
    await supabase.from('personal_records').update({ performance: p.value, performance_unit: unit, achieved_at: p.dateISO }).eq('id', p.id)
    return { id: p.id, distance_label: `${p.name} — ${p.type}`, performance: p.value, performance_unit: unit, achieved_at: p.dateISO }
  }
  const { data } = await supabase.from('personal_records').insert({
    user_id: user.id, sport: 'gym', distance_label: `${p.name} — ${p.type}`,
    performance: p.value, performance_unit: unit, event_type: 'training', achieved_at: p.dateISO, race_name: null,
  }).select('id, distance_label, performance, performance_unit, achieved_at').single()
  return (data as GymRec) ?? null
}
