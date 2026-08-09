// ══════════════════════════════════════════════════════════════
// Stats matériel calculées dynamiquement depuis activities. Une
// activité compte pour un matériel si elle lui est rattachée
// manuellement (bike_id / shoes_id) OU via le matching Strava
// (strava_gear_id). Colonnes : distance_m, moving_time_s,
// elevation_gain_m.
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'

export interface GearStats {
  total_sessions: number
  total_km: number
  total_hours: number
  total_elev_m: number
}

const ZERO: GearStats = { total_sessions: 0, total_km: 0, total_hours: 0, total_elev_m: 0 }

async function statsForGear(userId: string, table: 'user_bikes' | 'user_running_shoes', gearRowId: string): Promise<GearStats> {
  const sb = createServiceClient()

  const { data: gear } = await sb
    .from(table)
    .select('strava_gear_id')
    .eq('id', gearRowId)
    .eq('user_id', userId)
    .maybeSingle()

  const stravaGearId = (gear as { strava_gear_id: string | null } | null)?.strava_gear_id
  const fkCol = table === 'user_bikes' ? 'bike_id' : 'shoes_id'

  const ors = [`${fkCol}.eq.${gearRowId}`]
  if (stravaGearId) ors.push(`strava_gear_id.eq.${stravaGearId}`)

  const { data: acts } = await sb
    .from('activities')
    .select('distance_m, moving_time_s, elevation_gain_m')
    .eq('user_id', userId)
    .or(ors.join(','))

  const rows = (acts as { distance_m: number | null; moving_time_s: number | null; elevation_gain_m: number | null }[] | null) ?? []
  if (rows.length === 0) return ZERO

  const totalMeters = rows.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalSeconds = rows.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalElev = rows.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)

  return {
    total_sessions: rows.length,
    total_km: Math.round(totalMeters / 1000),
    total_hours: Math.round(totalSeconds / 3600),
    total_elev_m: Math.round(totalElev),
  }
}

export function getBikeStats(userId: string, bikeId: string): Promise<GearStats> {
  return statsForGear(userId, 'user_bikes', bikeId)
}

export function getShoesStats(userId: string, shoesId: string): Promise<GearStats> {
  return statsForGear(userId, 'user_running_shoes', shoesId)
}
