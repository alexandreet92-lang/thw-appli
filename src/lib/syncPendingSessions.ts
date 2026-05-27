import { createClient } from '@/lib/supabase/client'
import { getPendingSessions, removePendingSession } from '@/lib/offlineStorage'

export async function syncPendingSessions(): Promise<number> {
  const pending = getPendingSessions()
  if (pending.length === 0) return 0

  const sb = createClient()
  let synced = 0

  for (const session of pending) {
    try {
      const { pendingId, createdOffline, activity_sport_type, avg_speed_ms, max_speed_ms, ...workoutData } = session

      const { error } = await sb.from('workout_sessions').insert(workoutData)
      if (error) continue

      await sb.from('activities').insert({
        user_id: session.user_id,
        sport_type: activity_sport_type,
        title: session.title,
        started_at: session.started_at,
        distance_m: session.distance_m,
        moving_time_s: session.duration_seconds,
        elapsed_time_s: session.duration_seconds,
        elevation_gain_m: session.elevation_gain_m,
        avg_speed_ms,
        max_speed_ms,
        calories: session.calories,
      })

      removePendingSession(pendingId)
      synced++
    } catch {
      // Garder en local si échec réseau
    }
  }

  return synced
}
