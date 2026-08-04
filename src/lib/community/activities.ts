'use client'
// ══════════════════════════════════════════════════════════════════════════
// Partage d'activité : liste des activités récentes de l'utilisateur, mappées en
// snapshot dénormalisé (ActivityRef) car les autres membres ne peuvent pas lire
// la ligne `activities` d'autrui (RLS propriétaire/coach).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import type { ActivityRef } from '@/types/community'

interface ActRow {
  id: string; user_id: string; sport_type: string | null; title: string | null; race_name: string | null
  distance_m: number | null; moving_time_s: number | null; started_at: string
  tss: number | null; avg_hr: number | null; avg_pace_s_km: number | null; is_race: boolean | null
}

export async function listMyRecentActivities(limit = 20): Promise<ActivityRef[]> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb
    .from('activities')
    .select('id, user_id, sport_type, title, race_name, distance_m, moving_time_s, started_at, tss, avg_hr, avg_pace_s_km, is_race')
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
  }))
}
