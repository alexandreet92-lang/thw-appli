// ══════════════════════════════════════════════════════════════════
// Programmes coach réutilisables : modèles que le coach construit, publie au
// catalogue public (accessible à tous) et/ou assigne. Distinct de training_plans.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

export type ProgramLevel = 'debutant' | 'intermediaire' | 'avance' | 'tous'

/** Une séance d'un programme (forme allégée, alignée sur session_library). */
export interface ProgramSession {
  nom: string
  sport: string
  type?: string
  duree?: number            // minutes
  intensite?: 'Faible' | 'Modéré' | 'Élevé' | 'Maximum'
  description?: string
}

/** Une semaine du programme. */
export interface ProgramWeek {
  label: string
  sessions: ProgramSession[]
}

export interface CoachProgram {
  id: string
  coach_id: string
  title: string
  description: string | null
  sports: string[]
  level: ProgramLevel | null
  duration_weeks: number
  structure: ProgramWeek[]
  cover_url: string | null
  published: boolean
  created_at: string
  updated_at: string
}

const COLS = 'id, coach_id, title, description, sports, level, duration_weeks, structure, cover_url, published, created_at, updated_at'

function norm(r: unknown): CoachProgram {
  const p = r as CoachProgram
  return {
    ...p,
    sports: Array.isArray(p.sports) ? p.sports : [],
    structure: Array.isArray(p.structure) ? p.structure : [],
  }
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
  for (const k of ['title', 'description', 'sports', 'level', 'duration_weeks', 'structure', 'cover_url', 'published'] as const) {
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
