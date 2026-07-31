// ══════════════════════════════════════════════════════════════
// COACH — Lecture des données d'UN athlète (par son user_id) pour la fiche
// 360°. Ces requêtes ne passent que grâce aux politiques RLS coach
// (*_coach_read via is_coach_of). Lecture seule, aucune écriture.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'

export interface AthleteProfile {
  id: string
  full_name: string | null
  first_name: string | null
  avatar_url: string | null
  last_seen_at: string | null
  primary_goal: string | null
  level: string | null
  sports: string[] | null
  birth_date: string | null
  weight_kg: number | null
  height_cm: number | null
  gender: string | null
  country: string | null
}
export interface ActivityRow { id: string; title: string | null; sport_type: string | null; started_at: string | null; moving_time_s: number | null; distance_m: number | null; elevation_gain_m: number | null; tss: number | null; average_heartrate: number | null; is_race: boolean | null }
export interface RecoveryRow { date: string; sleep_quality: number | null; fatigue: number | null; soreness: number | null; mood: number | null }
export interface InjuryRow { id: string; label: string; zone: string | null; status: string | null; active: boolean; onset_date: string | null; resolved_date: string | null; phase: string | null }
export interface PlannedRow { id: string; week_start: string; day_index: number; sport: string | null; title: string | null; duration_min: number | null; intensity: string | null; status: string | null; source: string | null }
export interface BodyRow { measured_at: string; weight_kg: number | null; fat_mass_percent: number | null; muscle_mass_kg: number | null }
export interface NutritionActive { calories_mid: number | null; proteines: number | null; glucides: number | null; lipides: number | null; description: string | null }

const RESOLVED = ['guérie', 'guerie', 'resolved', 'résolue', 'resolue', 'terminée', 'terminee', 'clos', 'closed']

export async function getAthleteProfile(id: string): Promise<AthleteProfile | null> {
  const sb = createClient()
  const { data } = await sb.from('profiles')
    .select('id, full_name, first_name, avatar_url, last_seen_at, primary_goal, level, sports, birth_date, weight_kg, height_cm, gender, country')
    .eq('id', id).maybeSingle()
  return (data as AthleteProfile | null) ?? null
}

export async function getActivities(id: string, days = 45): Promise<ActivityRow[]> {
  const sb = createClient()
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data } = await sb.from('activities')
    .select('id, title, sport_type, started_at, moving_time_s, distance_m, elevation_gain_m, tss, average_heartrate, is_race')
    .eq('user_id', id).gte('started_at', since).order('started_at', { ascending: false }).limit(60)
  return (data ?? []) as ActivityRow[]
}

export async function getRecovery(id: string, days = 21): Promise<RecoveryRow[]> {
  const sb = createClient()
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const { data } = await sb.from('recovery_checkin')
    .select('date, sleep_quality, fatigue, soreness, mood')
    .eq('user_id', id).gte('date', since).order('date', { ascending: false }).limit(days)
  return (data ?? []) as RecoveryRow[]
}

export async function getInjuries(id: string): Promise<InjuryRow[]> {
  const sb = createClient()
  const { data } = await sb.from('injuries').select('*').eq('user_id', id).order('onset_date', { ascending: false }).limit(30)
  return ((data ?? []) as Record<string, unknown>[]).map(b => {
    const zone = (b.zone as string | null) ?? null
    const structure = (b.structure as string | null) ?? null
    const status = (b.status as string | null) ?? null
    const resolved = (b.resolved_date as string | null) ?? null
    const active = !resolved && !(status && RESOLVED.includes(status.toLowerCase()))
    const label = [zone, structure].filter(Boolean).join(' — ') || (b.description as string | null) || 'Blessure'
    return { id: String(b.id), label, zone, status, active, onset_date: (b.onset_date as string | null) ?? null, resolved_date: resolved, phase: (b.phase as string | null) ?? null }
  })
}

export async function getPlanning(id: string): Promise<PlannedRow[]> {
  const sb = createClient()
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
  const { data } = await sb.from('planned_sessions')
    .select('id, week_start, day_index, sport, title, duration_min, intensity, intensite, status, source')
    .eq('user_id', id).gte('week_start', weekAgo)
    .order('week_start', { ascending: true }).order('day_index', { ascending: true }).limit(40)
  return ((data ?? []) as Record<string, unknown>[]).map(s => ({
    id: String(s.id), week_start: String(s.week_start), day_index: Number(s.day_index),
    sport: (s.sport as string | null) ?? null, title: (s.title as string | null) ?? null,
    duration_min: (s.duration_min as number | null) ?? null,
    intensity: ((s.intensity ?? s.intensite) as string | null) ?? null, status: (s.status as string | null) ?? null,
    source: (s.source as string | null) ?? null,
  }))
}

export async function getBody(id: string, days = 120): Promise<BodyRow[]> {
  const sb = createClient()
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data } = await sb.from('body_measurements')
    .select('measured_at, weight_kg, fat_mass_percent, muscle_mass_kg')
    .eq('user_id', id).gte('measured_at', since).order('measured_at', { ascending: true }).limit(120)
  return (data ?? []) as BodyRow[]
}

export interface RaceRow { id: string; name: string | null; start_date: string; end_date: string | null; description: string | null }
export async function getUpcomingRaces(id: string): Promise<RaceRow[]> {
  const sb = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb.from('race_events')
    .select('id, name, start_date, end_date, description')
    .eq('user_id', id).gte('start_date', today).order('start_date', { ascending: true }).limit(20)
  return (data ?? []) as RaceRow[]
}

export async function getActiveNutrition(id: string): Promise<NutritionActive | null> {
  const sb = createClient()
  const { data } = await sb.from('nutrition_plans')
    .select('plan_data').eq('user_id', id).eq('actif', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const pd = (data?.plan_data ?? null) as Record<string, unknown> | null
  if (!pd) return null
  const m = (pd.macros_mid ?? {}) as Record<string, unknown>
  return {
    calories_mid: (pd.calories_mid as number | null) ?? (pd.calories_target as number | null) ?? null,
    proteines: (m.proteines as number | null) ?? (pd.protein_g as number | null) ?? null,
    glucides: (m.glucides as number | null) ?? (pd.carbs_g as number | null) ?? null,
    lipides: (m.lipides as number | null) ?? (pd.fat_g as number | null) ?? null,
    description: (pd.description as string | null) ?? null,
  }
}
