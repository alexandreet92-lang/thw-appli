// ══════════════════════════════════════════════════════════════════════
// syncStageToPlanning — projette les jours d'un stage (calendrier) vers des
// seances du planning (planned_sessions), pour que le MEME titre + parcours
// apparaissent dans le planning, ou l'utilisateur complete les donnees.
// Idempotent : retrouve les seances deja generees via source_event_id +
// source_event_date, puis upsert / delete selon le contenu du jour.
// ══════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import type { RouteParcoursData } from './parseRouteFile'

export interface StageDaySync {
  date:     string                    // YYYY-MM-DD
  title:    string
  sport:    string
  parcours: RouteParcoursData | null
  /** true = jour retire du stage -> supprimer la seance planning liee. */
  removed?: boolean
}

// Lundi (local) de la semaine d'une date — meme convention que usePlanning.
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - dow)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const da = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// Index de jour : Lundi = 0 … Dimanche = 6.
function dayIndexOf(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() === 0 ? 6 : d.getDay() - 1
}

export async function syncStageToPlanning(stageId: string, days: StageDaySync[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  for (const day of days) {
    const hasContent = !day.removed && (!!day.parcours || !!day.title.trim())

    // Seance deja generee pour ce jour de stage ?
    const { data: existingRows } = await supabase
      .from('planned_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_event_id', stageId)
      .eq('source_event_date', day.date)
    const existingId = (existingRows as { id: string }[] | null)?.[0]?.id ?? null

    if (!hasContent) {
      if (existingId) await supabase.from('planned_sessions').delete().eq('id', existingId)
      continue
    }

    const title = day.title.trim() || day.parcours?.name || 'Seance'
    const base = {
      sport:             day.sport,
      title,
      source:            'stage',
      source_event_id:   stageId,
      source_event_date: day.date,
    }

    if (existingId) {
      // N'ecrase parcours_data QUE si un nouveau parcours est fourni.
      const patch: Record<string, unknown> = { ...base, updated_at: new Date().toISOString() }
      if (day.parcours) patch.parcours_data = day.parcours
      await supabase.from('planned_sessions').update(patch).eq('id', existingId)
    } else {
      await supabase.from('planned_sessions').insert({
        user_id:     user.id,
        week_start:  mondayOf(day.date),
        day_index:   dayIndexOf(day.date),
        time:        '09:00',
        status:      'planned',
        plan_variant:'A',
        blocks:      [],
        validation_data: {},
        parcours_data: day.parcours ?? null,
        ...base,
      })
    }
  }
}

/** Supprime toutes les seances planning generees depuis un stage (suppression du stage). */
export async function removeStageFromPlanning(stageId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('planned_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('source_event_id', stageId)
}
