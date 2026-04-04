import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const POLAR_API = 'https://www.polaraccesslink.com/v3'

export async function registerPolarUser(userId: string): Promise<void> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  // Enregistre l'utilisateur dans Polar Accesslink (obligatoire avant tout appel)
  const res = await fetch(`${POLAR_API}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ 'member-id': userId }),
  })

  // 409 = déjà enregistré, OK
  if (!res.ok && res.status !== 409) {
    const err = await res.text()
    throw new Error(`Polar register error: ${err}`)
  }
}

export async function syncPolarActivities(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  const supabase = createServiceClient()

  // Crée une transaction de synchronisation
  const txRes = await fetch(`${POLAR_API}/users/${userId}/activity-transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (txRes.status === 204) return 0 // Rien de nouveau
  if (!txRes.ok) throw new Error(`Polar transaction error: ${txRes.status}`)

  const tx = await txRes.json()
  const txId = tx['transaction-id']

  // Récupère la liste des activités dans la transaction
  const listRes = await fetch(`${POLAR_API}/users/${userId}/activity-transactions/${txId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!listRes.ok) return 0

  const list = await listRes.json()
  const activityUrls: string[] = list['activity-log'] ?? []
  if (!activityUrls.length) return 0

  const rows: any[] = []

  for (const url of activityUrls) {
    try {
      const actRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      if (!actRes.ok) continue
      const a = await actRes.json()

      rows.push({
        user_id:             userId,
        provider:            'polar',
        provider_id:         String(a.id),
        sport_type:          mapPolarSport(a['detailed-sport-info'] ?? a['sport']),
        title:               a['detailed-sport-info'] ?? 'Polar Activity',
        started_at:          a['start-time'],
        elapsed_time_s:      parsePolarDuration(a.duration),
        moving_time_s:       parsePolarDuration(a['active-time']),
        distance_m:          a.distance ?? null,
        elevation_gain_m:    a['ascent'] ?? null,
        avg_hr:              a['heart-rate']?.['average'] ?? null,
        max_hr:              a['heart-rate']?.['maximum'] ?? null,
        calories:            a['calories'] ?? null,
        avg_speed_ms:        a['speed']?.['average'] ? a['speed']['average'] / 3.6 : null,
        max_speed_ms:        a['speed']?.['maximum'] ? a['speed']['maximum'] / 3.6 : null,
        raw_data:            a,
      })
    } catch {
      // Continue sur les autres activités si une échoue
    }
  }

  // Commit la transaction
  await fetch(`${POLAR_API}/users/${userId}/activity-transactions/${txId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!rows.length) return 0

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)
  return rows.length
}

export async function syncPolarSleep(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  const supabase = createServiceClient()

  const today = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const res = await fetch(`${POLAR_API}/users/${userId}/sleep?from=${from}&to=${today}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) return 0
  const data = await res.json()
  const nights = data['nights'] ?? []

  const rows = nights.map((n: any) => ({
    user_id:            userId,
    provider:           'polar',
    provider_id:        `sleep_${n.date}`,
    measured_at:        n['sleep-start-time'],
    date:               n.date,
    data_type:          'sleep',
    sleep_duration_min: n['total-sleep-time'] ? Math.round(parsePolarDuration(n['total-sleep-time']) / 60) : null,
    sleep_score:        n['sleep-score'] ?? null,
    rem_duration_min:   n['rem-sleep'] ? Math.round(parsePolarDuration(n['rem-sleep']) / 60) : null,
    deep_duration_min:  n['deep-sleep'] ? Math.round(parsePolarDuration(n['deep-sleep']) / 60) : null,
    light_duration_min: n['light-sleep'] ? Math.round(parsePolarDuration(n['light-sleep']) / 60) : null,
    sleep_start:        n['sleep-start-time'],
    sleep_end:          n['sleep-end-time'],
    raw_data:           n,
  }))

  if (!rows.length) return 0

  const { error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })

  if (error) throw new Error(error.message)
  return rows.length
}

// Parse duration ISO8601 (PT1H30M45S) → secondes
function parsePolarDuration(iso?: string): number {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] ?? '0') * 3600) + (parseInt(match[2] ?? '0') * 60) + parseInt(match[3] ?? '0')
}

function mapPolarSport(sport?: string): string {
  if (!sport) return 'other'
  const s = sport.toLowerCase()
  if (s.includes('running') || s.includes('trail')) return s.includes('trail') ? 'trail_run' : 'run'
  if (s.includes('cycling') || s.includes('bike'))  return 'bike'
  if (s.includes('swimming'))                        return 'swim'
  if (s.includes('rowing'))                          return 'rowing'
  if (s.includes('strength') || s.includes('gym'))  return 'gym'
  return 'other'
}
