// ══════════════════════════════════════════════════════════════
// COACH — Assignation de séances au Planning de l'athlète (source='coach').
// Autorisé par la RLS planned_sessions_coach_* (lien accepté requis).
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'

export interface AssignDraft {
  date: string          // date choisie (YYYY-MM-DD)
  sport: string
  title: string
  duration_min?: number | null
  intensity?: string | null
  notes?: string | null
}

// Lundi (ISO) de la semaine contenant `date` + index de jour (0 = lundi).
export function weekParts(dateISO: string): { week_start: string; day_index: number } {
  const d = new Date(dateISO + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  const monday = new Date(d); monday.setDate(d.getDate() - dow)
  return { week_start: monday.toISOString().slice(0, 10), day_index: dow }
}

export async function assignSession(athleteId: string, draft: AssignDraft): Promise<void> {
  const sb = createClient()
  const { week_start, day_index } = weekParts(draft.date)
  const { error } = await sb.from('planned_sessions').insert({
    user_id: athleteId,
    week_start, day_index,
    sport: draft.sport,
    title: draft.title,
    duration_min: draft.duration_min ?? null,
    intensity: draft.intensity ?? null,
    notes: draft.notes ?? null,
    status: 'planned',
    source: 'coach',
  })
  if (error) throw new Error(error.message)
}

export async function deleteAssignedSession(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('planned_sessions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
