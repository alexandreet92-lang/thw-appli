export interface PendingSession {
  pendingId: string
  createdOffline: boolean
  // workout_sessions
  user_id: string
  sport: string
  started_at: string
  ended_at: string
  duration_seconds: number
  distance_m: number
  elevation_gain_m?: number
  avg_speed_kmh?: number
  max_speed_kmh?: number
  gps_track?: unknown
  laps?: unknown
  calories?: number
  status: string
  title?: string
  training_types?: string[]
  rpe?: number
  comment?: string
  // activities mirror fields
  activity_sport_type: string
  avg_speed_ms?: number
  max_speed_ms?: number
}

const KEY = 'pending_sessions'

export function savePendingSession(session: Omit<PendingSession, 'pendingId' | 'createdOffline'>) {
  const existing = getPendingSessions()
  const updated = [...existing, { ...session, pendingId: `pending_${Date.now()}`, createdOffline: true }]
  try {
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    console.warn('[offline] localStorage full — could not save pending session')
  }
}

export function getPendingSessions(): PendingSession[] {
  try {
    const data = localStorage.getItem(KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function removePendingSession(pendingId: string) {
  const existing = getPendingSessions()
  localStorage.setItem(KEY, JSON.stringify(existing.filter(s => s.pendingId !== pendingId)))
}
