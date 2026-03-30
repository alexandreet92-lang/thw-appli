import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const WAHOO_API = 'https://api.wahooligan.com/v1'

export async function syncWahooWorkouts(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'wahoo')
  if (!token) throw new Error('No valid Wahoo token')

  const supabase = createServiceClient()

  const { data: latest } = await supabase
    .from('activities')
    .select('started_at')
    .eq('user_id', userId)
    .eq('provider', 'wahoo')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  let all: any[] = []
  let page = 1
  while (true) {
    const params = new URLSearchParams({ page: String(page), per_page: '50' })
    const res = await fetch(`${WAHOO_API}/workouts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Wahoo API error: ${res.status}`)
    const json = await res.json()
    const batch = json.workouts ?? []
    if (!batch.length) break

    // Filtrage incrémental
    const filtered = latest?.started_at
      ? batch.filter((w: any) => new Date(w.starts) > new Date(latest.started_at))
      : batch

    all = [...all, ...filtered]
    if (batch.length < 50 || filtered.length < batch.length) break
    page++
  }

  if (!all.length) return 0

  const rows = all.map((w: any) => ({
    user_id:          userId,
    provider:         'wahoo',
    provider_id:      String(w.id),
    sport_type:       mapWahooSportType(w.workout_type?.name),
    title:            w.name,
    started_at:       w.starts,
    elapsed_time_s:   w.minutes ? w.minutes * 60 : null,
    moving_time_s:    w.minutes ? w.minutes * 60 : null,
    distance_m:       w.distance_accumulated ?? null,
    elevation_gain_m: w.ascent_accum         ?? null,
    avg_speed_ms:     w.speed_avg            ?? null,
    avg_watts:        w.power_avg            ?? null,
    max_watts:        w.power_max            ?? null,
    normalized_watts: w.power_bike_np_last   ?? null,
    kilojoules:       w.work_kj              ?? null,
    avg_hr:           w.heart_rate_avg       ?? null,
    max_hr:           w.heart_rate_max       ?? null,
    calories:         w.calories_accum       ?? null,
    raw_data:         w,
  }))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)
  return all.length
}

function mapWahooSportType(name: string = ''): string {
  const n = name.toLowerCase()
  if (n.includes('bike') || n.includes('cycling')) return 'bike'
  if (n.includes('run'))    return 'run'
  if (n.includes('swim'))   return 'swim'
  if (n.includes('row'))    return 'rowing'
  if (n.includes('strength') || n.includes('gym')) return 'gym'
  return 'other'
}
