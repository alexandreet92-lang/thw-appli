// Stockage partagé des COURSES (table planned_races + fichiers parcours race_files).
// Utilisé par la page Calendar ET la page Planning pour garantir que les deux
// écrivent/lisent EXACTEMENT le même modèle → une course créée d'un côté apparaît
// à l'identique de l'autre (données + parcours GPS).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Race, RaceSport, RaceLevel } from '@/app/calendar/components/types'
import { sanitizeFileName } from '@/lib/utils'

// Ligne SQL (planned_races) → objet Race (modèle Calendar : les détails hyrox/tri/segments
// vivent dans performanceData, pas en colonnes top-level).
export function mapRowToRace(x: Record<string, unknown>): Race {
  return {
    id: x.id as string, name: x.name as string,
    sport: x.sport as RaceSport, date: x.date as string, level: x.level as RaceLevel,
    goal: x.goal as string | undefined,
    runDistance: x.run_distance as string | undefined,
    triDistance: x.tri_distance as string | undefined,
    goalTime: x.goal_time as string | undefined,
    validated: (x.validated as boolean | undefined) ?? false,
    validationData: (x.validation_data as Record<string, unknown> | undefined) ?? {},
    status: (x.status as 'upcoming' | 'completed' | undefined) ?? 'upcoming',
    distance: x.distance as string | undefined,
    performanceData: (x.performance_data as Record<string, unknown> | undefined) ?? {},
    notes: x.notes as string | undefined,
  }
}

// Objet Race → colonnes planned_races.
function raceToRow(r: Omit<Race, 'id'>) {
  return {
    name: r.name, sport: r.sport, date: r.date, level: r.level,
    goal: r.goal ?? null,
    run_distance: r.runDistance ?? null, tri_distance: r.triDistance ?? null,
    goal_time: r.goalTime ?? null,
    status: r.status ?? 'upcoming', distance: r.distance ?? null,
    performance_data: r.performanceData ?? {}, notes: r.notes ?? null,
    validated: r.validated ?? false, validation_data: r.validationData ?? {},
  }
}

// Téléverse les parcours d'une course. En édition, on remplace le créneau (route
// générale / vélo / run) uniquement si de nouveaux fichiers sont fournis.
async function uploadFiles(
  sb: SupabaseClient, userId: string, raceId: string,
  files: File[], filesBike: File[], filesRun: File[], replaceExisting: boolean,
) {
  const groups: { list: File[]; label: string | null }[] = [
    { list: files, label: null },
    { list: filesBike, label: 'Parcours vélo' },
    { list: filesRun, label: 'Parcours run' },
  ]
  for (const { list, label } of groups) {
    if (list.length === 0) continue
    if (replaceExisting) {
      const del = sb.from('race_files').delete().eq('race_id', raceId)
      await (label === null ? del.is('label', null) : del.eq('label', label))
    }
    for (const file of list) {
      try {
        const path = `${userId}/${raceId}/${sanitizeFileName(file.name)}`
        const { data: up, error: upErr } = await sb.storage.from('race-files').upload(path, file, { upsert: true })
        if (upErr || !up) { console.error('[raceStore upload]', upErr); continue }
        const { data: urlData } = sb.storage.from('race-files').getPublicUrl(path)
        const { error: insErr } = await sb.from('race_files').insert({
          race_id: raceId, file_url: urlData.publicUrl,
          file_name: file.name, file_type: file.type, label,
        })
        if (insErr) console.error('[raceStore race_files insert]', insErr)
      } catch (e) { console.error('[raceStore file]', e) }
    }
  }
}

// Crée OU met à jour une course + ses parcours. Renvoie l'id de la course.
export async function saveRaceWithFiles(
  sb: SupabaseClient, userId: string,
  race: Omit<Race, 'id'>, files: File[] = [], filesBike: File[] = [], filesRun: File[] = [],
  existingId?: string,
): Promise<string | null> {
  let raceId = existingId ?? null
  if (existingId) {
    const { error } = await sb.from('planned_races').update({ ...raceToRow(race), updated_at: new Date().toISOString() }).eq('id', existingId)
    if (error) { console.error('[saveRaceWithFiles update]', error); return null }
  } else {
    const { data, error } = await sb.from('planned_races').insert({ user_id: userId, ...raceToRow(race) }).select('id').single()
    if (error || !data) { console.error('[saveRaceWithFiles insert]', error); return null }
    raceId = (data as { id: string }).id
  }
  if (raceId) await uploadFiles(sb, userId, raceId, files, filesBike, filesRun, !!existingId)
  return raceId
}

export async function deleteRaceById(sb: SupabaseClient, id: string): Promise<void> {
  await sb.from('planned_races').delete().eq('id', id)
}

// Parcours enregistrés d'une course, par créneau (route générale / vélo / run).
export interface RaceRoutes { route?: string; bike?: string; run?: string }
export async function loadRaceRoutes(sb: SupabaseClient, raceId: string): Promise<RaceRoutes> {
  const { data } = await sb.from('race_files').select('file_url, label').eq('race_id', raceId)
  const out: RaceRoutes = {}
  for (const f of (data ?? []) as { file_url: string; label: string | null }[]) {
    if (f.label === 'Parcours vélo') out.bike = f.file_url
    else if (f.label === 'Parcours run') out.run = f.file_url
    else out.route = f.file_url
  }
  return out
}
