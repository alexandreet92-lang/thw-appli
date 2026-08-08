'use client'
// ══════════════════════════════════════════════════════════════════════════
// Partage d'activité : liste des activités récentes de l'utilisateur, mappées en
// snapshot dénormalisé (ActivityRef) — les autres membres ne peuvent pas lire la
// ligne `activities` d'autrui (RLS). Le snapshot embarque le tracé (polyline) et
// le profil altimétrique pour un rendu complet dans le chat, sans lecture DB.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import type { ActivityRef } from '@/types/community'

interface Streams { altitude?: number[] }
interface ActRow {
  id: string; user_id: string; sport_type: string | null; title: string | null; race_name: string | null
  distance_m: number | null; moving_time_s: number | null; started_at: string
  tss: number | null; avg_hr: number | null; avg_pace_s_km: number | null; is_race: boolean | null
  summary_polyline: string | null; elevation_gain_m: number | null
  difficulty: number | null; feeling: number | null
}

// Échantillonne un tableau numérique à `max` points max (profil compact).
function downsampleNums(arr: number[], max: number): number[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)] ?? arr[arr.length - 1])
}

// Liste légère (pas de streams JSONB : trop lourd pour 25 activités). Le tracé
// (summary_polyline) est une colonne légère et suffit à la vignette ; le profil
// altimétrique est ajouté à la volée au moment du partage (enrichActivity).
export async function listMyRecentActivities(limit = 20): Promise<ActivityRef[]> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb
    .from('activities')
    .select('id, user_id, sport_type, title, race_name, distance_m, moving_time_s, started_at, tss, avg_hr, avg_pace_s_km, is_race, summary_polyline, elevation_gain_m, difficulty, feeling')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as ActRow[]).map((r): ActivityRef => ({
    id: r.id,
    ownerId: r.user_id,
    sport: r.sport_type ?? 'autre',
    title: r.title || r.race_name || null,
    distanceM: r.distance_m,
    durationS: r.moving_time_s,
    startedAt: r.started_at,
    tss: r.tss,
    avgHr: r.avg_hr,
    avgPaceSKm: r.avg_pace_s_km,
    isRace: !!r.is_race,
    polyline: r.summary_polyline ?? null,
    elevation: null,
    elevGainM: r.elevation_gain_m,
    difficulty: r.difficulty,
    feeling: r.feeling,
  }))
}

// Ajoute le profil altimétrique (streams de MON activité) au snapshot, au moment
// du partage. Best-effort : renvoie le ref inchangé si indisponible.
export async function enrichActivity(ref: ActivityRef): Promise<ActivityRef> {
  try {
    const sb = createClient()
    const { data } = await sb.from('activities').select('streams, raw_data').eq('id', ref.id).maybeSingle()
    const row = data as { streams: Streams | null; raw_data: { streams?: Streams } | null } | null
    const streams = (row?.streams ?? row?.raw_data?.streams) ?? null
    const alt = Array.isArray(streams?.altitude) ? streams!.altitude.filter(n => typeof n === 'number') : null
    if (alt && alt.length > 1) return { ...ref, elevation: downsampleNums(alt, 120).map(n => Math.round(n)) }
    return ref
  } catch { return ref }
}
