'use client'
// ══════════════════════════════════════════════════════════════════════════
// Partage de séances de la bibliothèque (`session_favorites`) dans un canal.
// - listMyLibrarySessions : mes séances en réserve → snapshots partageables.
// - copySessionToLibrary  : enregistre une séance reçue dans MA bibliothèque.
// - addSessionToPlanning  : ajoute une séance reçue à MON planning à une date.
// Les blocs (`Block[]`) sont le même type que planned_sessions.blocks : aucune
// conversion nécessaire (round-trip direct).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId } from './shared'
import { weekStartStr, mondayIndex } from '@/lib/date/weekStart'
import type { SessionRef } from '@/types/community'
import type { Block, SportType } from '@/app/planning/page'
import type { NutritionItem } from '@/components/planning/SessionEditor'

/** Une séance de ma bibliothèque, prête à partager (id + snapshot). */
export interface LibrarySession extends SessionRef { id: string }

interface FavRow {
  id: string
  name: string | null
  sport: string | null
  training_type: string | null
  blocks_data: Block[] | null
  nutrition_data: NutritionItem[] | null
  duration_min: number | null
  rpe: number | null
  notes: string | null
}

function rowToSession(r: FavRow): LibrarySession {
  return {
    id: r.id,
    sport: (r.sport || 'run') as SportType,
    title: r.name || 'Séance',
    durationMin: r.duration_min,
    rpe: r.rpe,
    trainingTypes: r.training_type ? r.training_type.split('+').filter(Boolean) : null,
    notes: r.notes,
    blocks: Array.isArray(r.blocks_data) ? r.blocks_data : [],
    nutritionItems: Array.isArray(r.nutrition_data) ? r.nutrition_data : null,
  }
}

/** Mes séances de bibliothèque (les plus récentes d'abord). */
export async function listMyLibrarySessions(limit = 40): Promise<LibrarySession[]> {
  const me = await myId()
  if (!me) return []
  const { data } = await createClient()
    .from('session_favorites')
    .select('id, name, sport, training_type, blocks_data, nutrition_data, duration_min, rpe, notes')
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as FavRow[]).map(rowToSession)
}

/** Copie une séance reçue dans MA bibliothèque. Retourne true si succès. */
export async function copySessionToLibrary(s: SessionRef): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient().from('session_favorites').insert({
    user_id: me,
    name: s.title,
    sport: s.sport,
    training_type: s.trainingTypes?.length ? s.trainingTypes.join('+') : null,
    blocks_data: s.blocks,
    nutrition_data: s.nutritionItems ?? null,
    duration_min: s.durationMin,
    rpe: s.rpe,
    notes: s.notes,
  })
  return !error
}

/** Ajoute une séance reçue à MON planning, à la date choisie. Retourne true si succès. */
export async function addSessionToPlanning(s: SessionRef, date: Date): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient().from('planned_sessions').insert({
    user_id: me,
    week_start: weekStartStr(date),
    day_index: mondayIndex(date),
    sport: s.sport,
    title: s.title,
    duration_min: s.durationMin,
    status: 'planned',
    rpe: s.rpe,
    notes: s.notes,
    blocks: s.blocks,
    source: 'community',
  })
  if (error) return false
  try { window.dispatchEvent(new Event('thw:sessions-changed')) } catch { /* pas de window (SSR) */ }
  return true
}
