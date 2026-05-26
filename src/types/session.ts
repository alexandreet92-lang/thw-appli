import type { GPSPoint } from '@/hooks/useGPSTracking'

export interface SessionLap {
  number: number
  duration: number
  distance: number
  avgSpeed: number
  timestamp: number
}

export interface FinishedSession {
  id: string | null
  started_at: string
  ended_at: string
  duration_seconds: number
  distance_m: number
  elevation_gain_m: number
  avg_speed_kmh: number
  max_speed_kmh: number
  calories: number
  gps_points: GPSPoint[]
  laps: SessionLap[]
  title?: string
  training_types?: string[]
  rpe?: number
  comment?: string
  sport?: string
  elevation_loss_m?: number
}
