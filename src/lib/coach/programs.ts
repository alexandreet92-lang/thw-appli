// ══════════════════════════════════════════════════════════════════
// Programmes coach réutilisables : modèles que le coach construit, publie au
// catalogue public (accessible à tous) et/ou assigne. Distinct de training_plans.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import type { Block, SportType } from '@/app/planning/page'

export type ProgramLevel = 'debutant' | 'intermediaire' | 'avance' | 'tous'

/** Phase de préparation (définie par le coach). `color` = token var(--…). */
export interface ProgramPhase { label: string; fromWeek: number; toWeek: number; color?: string }

/** Palette de couleurs (tokens) proposée pour les phases de préparation. */
export const PHASE_PALETTE: string[] = [
  'var(--sport-run)', 'var(--sport-bike)', 'var(--sport-swim)',
  'var(--sport-gym)', 'var(--sport-hyrox)', 'var(--charge-mid)',
]

/**
 * Type de journée (comme le planning de base de l'athlète) : le coach qualifie
 * la charge attendue d'un jour de la semaine, indépendamment des séances.
 */
export type DayType = 'recup' | 'easy' | 'mid' | 'hard'
export const DAY_TYPES: DayType[] = ['recup', 'easy', 'mid', 'hard']
export const DAY_TYPE_LABEL: Record<DayType, string> = { recup: 'Récup', easy: 'Facile', mid: 'Modéré', hard: 'Dur' }
export const DAY_TYPE_COLOR: Record<DayType, string> = {
  recup: 'var(--zone-1)', easy: 'var(--charge-low)', mid: 'var(--charge-mid)', hard: 'var(--charge-hard)',
}

// ── Correspondance sport « éditeur planning » ↔ clé programme ─────────
export const SPORTTYPE_TO_KEY: Record<string, string> = {
  run: 'running', bike: 'cycling', swim: 'swim', hyrox: 'hyrox', rowing: 'rowing',
  gym: 'gym', elliptique: 'gym', hybrid: 'gym', boxe: 'gym', mobilite: 'gym',
}
export const KEY_TO_SPORTTYPE: Record<string, SportType> = {
  running: 'run', cycling: 'bike', swim: 'swim', gym: 'gym', hyrox: 'hyrox',
  trail: 'run', triathlon: 'run', rowing: 'rowing',
}

export type PrepType = 'endurance' | 'force' | 'hybride' | 'competition' | 'reprise' | 'perte_poids'

/**
 * Cible d'effort d'une séance — jamais une valeur absolue exacte (on ne connaît
 * pas les données précises de l'athlète), mais une FOURCHETTE et/ou une cible
 * RELATIVE. L'IA convertit ensuite le relatif en valeurs précises par athlète.
 */
export interface ProgramTarget {
  low?: string       // borne basse (ex. "4:30", "250", "150")
  high?: string      // borne haute (ex. "4:45", "270", "160")
  unit?: string      // "/km" | "W" | "bpm" | "/100m" | "km/h"
  zone?: number      // 1..7 (optionnel)
  relative?: string  // ex. "Zone 4", "85–90 % FTP", "allure 10k +10s"
}

/** Une séance d'un programme. Peut porter le DÉTAIL complet du vrai éditeur de
 * planning (blocks, zones, intervalles) ou rester une séance simple. */
export interface ProgramSession {
  nom: string
  sport: string             // clé programme (running/cycling/…) — dérivée du sportType
  type?: string
  duree?: number            // minutes
  distance?: number         // km (m pour la natation)
  rpe?: number              // 1..10
  target?: ProgramTarget    // cible d'effort (fourchette + relatif)
  intensite?: 'Faible' | 'Modéré' | 'Élevé' | 'Maximum'
  description?: string
  day?: number              // 0..6 (jour dans la semaine)
  key?: boolean             // séance clé de la semaine (étoile) — 2-3 par semaine
  // ── Détail « vrai planning » (éditeur SessionEditor) ──
  sportType?: SportType     // 'run' | 'bike' | …
  blocks?: Block[]          // blocs/zones/intervalles
  trainingTypes?: string[]
  notes?: string
}

/** Unité de cible par défaut selon le sport. */
export function defaultTargetUnit(sport: string): string {
  if (sport === 'cycling' || sport === 'rowing') return 'W'
  if (sport === 'swim') return '/100m'
  return '/km' // course, trail, triathlon
}

/** Une semaine du programme. */
export interface ProgramWeek {
  label: string
  sessions: ProgramSession[]
  /** Conseil global du coach pour la semaine (texte libre, colonne gauche). */
  notes?: string
  /** Type de journée par jour (0..6) — récup / facile / modéré / dur. */
  dayTypes?: (DayType | null)[]
}

/** Une question du questionnaire d'onboarding (programme IA). */
export interface QuestionItem {
  id: string
  label: string
  type: 'text' | 'number' | 'choice'
  options?: string[]
}

export interface CoachProgram {
  id: string
  coach_id: string
  title: string
  description: string | null
  objective: string | null
  prep_type: PrepType | null
  sports: string[]
  level: ProgramLevel | null
  duration_weeks: number
  structure: ProgramWeek[]
  cover_url: string | null
  published: boolean
  // ── Marketplace / IA ──
  price_cents: number          // 0 = gratuit
  currency: string
  pricing_model: 'one_time'
  trial_days: number
  ai_enabled: boolean
  questionnaire: QuestionItem[]
  phases: ProgramPhase[]
  created_at: string
  updated_at: string
}

const COLS = 'id, coach_id, title, description, objective, prep_type, sports, level, duration_weeks, structure, cover_url, published, price_cents, currency, pricing_model, trial_days, ai_enabled, questionnaire, phases, created_at, updated_at'

function norm(r: unknown): CoachProgram {
  const p = r as CoachProgram
  return {
    ...p,
    sports: Array.isArray(p.sports) ? p.sports : [],
    structure: Array.isArray(p.structure) ? p.structure : [],
    questionnaire: Array.isArray(p.questionnaire) ? p.questionnaire : [],
    phases: Array.isArray(p.phases) ? p.phases : [],
    price_cents: p.price_cents ?? 0,
    currency: p.currency ?? 'eur',
    ai_enabled: !!p.ai_enabled,
    trial_days: p.trial_days ?? 0,
  }
}

/** Commission plateforme (part retenue) : 10 % standard, 30 % si IA. */
export function platformFeePct(ai: boolean): number { return ai ? 30 : 10 }

/** Instance personnalisée (IA) de l'utilisateur pour ce programme, si elle existe. */
export async function getMyProgramInstance(programId: string): Promise<ProgramWeek[] | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('program_instances').select('structure').eq('program_id', programId).eq('user_id', user.id).maybeSingle()
  const st = (data as { structure?: ProgramWeek[] } | null)?.structure
  return Array.isArray(st) ? st : null
}

/** L'utilisateur connecté a-t-il accès au programme (gratuit, propriétaire, ou acheté) ? */
export async function hasProgramAccess(program: CoachProgram): Promise<boolean> {
  if (program.price_cents === 0) return true
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  if (user.id === program.coach_id) return true
  const { data } = await sb.from('program_purchases')
    .select('id').eq('program_id', program.id).eq('buyer_id', user.id).eq('status', 'active').maybeSingle()
  return !!data
}

/** Programmes du coach connecté (brouillons + publiés). */
export async function listMyPrograms(): Promise<CoachProgram[]> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb.from('coach_programs').select(COLS)
    .eq('coach_id', user.id).order('updated_at', { ascending: false })
  return (data ?? []).map(norm)
}

/** Un programme par id (respecte la RLS : le sien, ou tout programme publié). */
export async function getProgram(id: string): Promise<CoachProgram | null> {
  const sb = createClient()
  const { data } = await sb.from('coach_programs').select(COLS).eq('id', id).maybeSingle()
  return data ? norm(data) : null
}

/** Catalogue public : programmes publiés (accessible à tout le monde). */
export async function listPublishedPrograms(): Promise<CoachProgram[]> {
  const sb = createClient()
  const { data } = await sb.from('coach_programs').select(COLS)
    .eq('published', true).order('updated_at', { ascending: false }).limit(120)
  return (data ?? []).map(norm)
}

/** Programmes PUBLIÉS d'un coach donné (pour sa vitrine publique). */
export async function listCoachPublishedPrograms(coachId: string): Promise<CoachProgram[]> {
  const sb = createClient()
  const { data } = await sb.from('coach_programs').select(COLS)
    .eq('coach_id', coachId).eq('published', true).order('updated_at', { ascending: false })
  return (data ?? []).map(norm)
}

/** Crée un programme vierge et renvoie son id. */
export async function createProgram(title: string): Promise<string | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('coach_programs')
    .insert({ coach_id: user.id, title: title.trim() || 'Nouveau programme' })
    .select('id').single()
  return (data as { id: string } | null)?.id ?? null
}

/** Met à jour un programme (le sien uniquement, garanti par la RLS). */
export async function updateProgram(id: string, patch: Partial<CoachProgram>): Promise<void> {
  const sb = createClient()
  const allowed: Partial<CoachProgram> = {}
  for (const k of ['title', 'description', 'objective', 'prep_type', 'sports', 'level', 'duration_weeks', 'structure', 'cover_url', 'published', 'price_cents', 'currency', 'trial_days', 'ai_enabled', 'questionnaire', 'phases'] as const) {
    if (k in patch) (allowed as Record<string, unknown>)[k] = patch[k]
  }
  await sb.from('coach_programs').update(allowed).eq('id', id)
}

export async function deleteProgram(id: string): Promise<void> {
  const sb = createClient()
  await sb.from('coach_programs').delete().eq('id', id)
}

/**
 * Matérialise un programme dans le planning de l'utilisateur connecté :
 * une ligne planned_sessions par séance, à partir du lundi de la semaine en cours.
 * Les séances d'une semaine sont réparties sur les jours. Renvoie le nombre créé.
 */
export async function addProgramToMyPlanning(program: CoachProgram): Promise<number> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Connecte-toi pour ajouter ce programme à ton planning.')

  const now = new Date()
  const dow = (now.getDay() + 6) % 7            // lundi = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  monday.setHours(0, 0, 0, 0)

  const rows: Record<string, unknown>[] = []
  program.structure.forEach((w, wi) => {
    const ws = new Date(monday)
    ws.setDate(monday.getDate() + wi * 7)
    const weekStart = ws.toISOString().slice(0, 10)
    const n = Math.max(1, w.sessions.length)
    w.sessions.forEach((s, si) => {
      const day = Math.min(6, Math.floor((si * 7) / n))   // réparti sur la semaine
      rows.push({
        user_id: user.id,
        week_start: weekStart,
        day_index: day,
        sport: s.sport || 'running',
        title: s.nom || 'Séance',
        duration_min: s.duree ?? null,
        intensite: s.intensite ?? null,
        plan_variant: 'A',
        source: 'program',
      })
    })
  })
  if (!rows.length) return 0
  const { error } = await sb.from('planned_sessions').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}

// ── Libellés ────────────────────────────────────────────────────────
export const LEVEL_LABEL: Record<ProgramLevel, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', tous: 'Tous niveaux',
}
export const PREP_LABEL: Record<PrepType, string> = {
  endurance: 'Endurance', force: 'Force', hybride: 'Hybride',
  competition: 'Compétition', reprise: 'Reprise', perte_poids: 'Perte de poids',
}

export interface SportStat { sport: string; sessions: number; minutes: number; rpe: number | null; distance: number | null }
export interface ProgramStats { total: number; minutes: number; bySport: SportStat[] }

/** Agrège les séances d'un programme : total + par sport (nb, durée, RPE moyen, distance). */
export function computeProgramStats(structure: ProgramWeek[]): ProgramStats {
  const all = structure.flatMap(w => w.sessions)
  const map = new Map<string, { sessions: number; minutes: number; rpeSum: number; rpeN: number; distance: number }>()
  for (const s of all) {
    const k = s.sport || 'running'
    const cur = map.get(k) ?? { sessions: 0, minutes: 0, rpeSum: 0, rpeN: 0, distance: 0 }
    cur.sessions += 1
    cur.minutes += s.duree ?? 0
    if (typeof s.rpe === 'number' && s.rpe > 0) { cur.rpeSum += s.rpe; cur.rpeN += 1 }
    if (typeof s.distance === 'number') cur.distance += s.distance
    map.set(k, cur)
  }
  const bySport: SportStat[] = Array.from(map.entries()).map(([sport, v]) => ({
    sport, sessions: v.sessions, minutes: v.minutes,
    rpe: v.rpeN ? Math.round((v.rpeSum / v.rpeN) * 10) / 10 : null,
    distance: v.distance > 0 ? Math.round(v.distance * 10) / 10 : null,
  }))
  return { total: all.length, minutes: all.reduce((n, s) => n + (s.duree ?? 0), 0), bySport }
}

// ── Classification endurance vs qualité (séances seuil/max/allure spécifique) ──
const QUALITY_KW = ['seuil', 'vma', 'vo2', 'fractionn', 'tempo', 'spécif', 'specif', 'intervall', 'côte', 'cote', 'sprint', 'allure', 'pma', 'ppm']
const ENDURANCE_KW = ['endurance', 'ef', 'fondamental', 'sortie longue', 'longue', 'récup', 'recup', 'footing', 'z2', 'facile', 'aérobie', 'aerobie']

/** Une séance est-elle « qualité » (seuil/max/allure spé) ou « endurance » ? */
export function sessionQuality(s: ProgramSession): 'quality' | 'endurance' {
  const hay = [s.type ?? '', ...(s.trainingTypes ?? [])].join(' ').toLowerCase()
  if (QUALITY_KW.some(k => hay.includes(k))) return 'quality'
  if (ENDURANCE_KW.some(k => hay.includes(k))) return 'endurance'
  if (typeof s.rpe === 'number' && s.rpe >= 7) return 'quality'
  return 'endurance'
}

/** Estimation de charge (proxy TSS/fatigue) d'une séance à partir durée × RPE². */
export function sessionLoad(s: ProgramSession): number {
  const h = (s.duree ?? 0) / 60
  const rpe = typeof s.rpe === 'number' && s.rpe > 0 ? s.rpe : 5
  return Math.round(h * (rpe / 10) * (rpe / 10) * 100)
}

export interface WeekAgg {
  index: number
  hours: number
  load: number                               // proxy fatigue/TSS de la semaine
  minutesBySport: Record<string, number>     // minutes par sport (barres empilées)
}
export interface ProgramFullStats {
  base: ProgramStats
  totalHours: number
  enduranceSessions: number
  qualitySessions: number
  avgRpe: number | null
  busiestWeek: { index: number; hours: number } | null
  longestSession: { nom: string; duree: number; weekIndex: number; day: number } | null
  weekly: WeekAgg[]
}

/** Stats complètes pour le récap : volume global, endurance/qualité, semaine la
 *  plus chargée, séance la plus longue, RPE moyen, agrégat hebdo (barres + charge). */
export function computeProgramFullStats(structure: ProgramWeek[]): ProgramFullStats {
  const base = computeProgramStats(structure)
  let endurance = 0, quality = 0, rpeSum = 0, rpeN = 0
  const weekly: WeekAgg[] = structure.map((w, index) => {
    const minutesBySport: Record<string, number> = {}
    let hours = 0, load = 0
    for (const s of w.sessions) {
      const k = s.sport || 'running'
      minutesBySport[k] = (minutesBySport[k] ?? 0) + (s.duree ?? 0)
      hours += (s.duree ?? 0) / 60
      load += sessionLoad(s)
      if (sessionQuality(s) === 'quality') quality += 1; else endurance += 1
      if (typeof s.rpe === 'number' && s.rpe > 0) { rpeSum += s.rpe; rpeN += 1 }
    }
    return { index, hours: Math.round(hours * 10) / 10, load, minutesBySport }
  })
  // Séance la plus longue — reduce (le type de l'accumulateur est explicite, ce
  // qui évite le rétrécissement CFA d'un `let` muté dans une closure).
  type Longest = NonNullable<ProgramFullStats['longestSession']>
  const flat = structure.flatMap((w, wi) => w.sessions.map(s => ({ s, wi })))
  const longest = flat.reduce<Longest | null>((best, { s, wi }) => {
    const d = s.duree ?? 0
    if (d <= 0) return best
    return !best || d > best.duree ? { nom: s.nom || 'Séance', duree: d, weekIndex: wi, day: s.day ?? 0 } : best
  }, null)
  const busiest = weekly.reduce<{ index: number; hours: number } | null>((best, w) =>
    !best || w.hours > best.hours ? { index: w.index, hours: w.hours } : best, null)
  return {
    base,
    totalHours: Math.round((base.minutes / 60) * 10) / 10,
    enduranceSessions: endurance,
    qualitySessions: quality,
    avgRpe: rpeN ? Math.round((rpeSum / rpeN) * 10) / 10 : null,
    busiestWeek: busiest && busiest.hours > 0 ? busiest : null,
    longestSession: longest,
    weekly,
  }
}
