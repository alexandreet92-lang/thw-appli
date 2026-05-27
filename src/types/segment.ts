export interface SegmentPoint {
  lat: number
  lng: number
}

export interface Segment {
  id: string
  user_id: string
  name: string
  sport: string
  is_public: boolean
  points: SegmentPoint[]
  distance_m: number
  elevation_gain_m: number
  created_at: string
}

export interface SegmentEffort {
  id: string
  segment_id: string
  user_id: string
  activity_id: string | null
  started_at: string
  duration_seconds: number
  distance_m: number
  created_at: string
}

export interface CompletedEffortLocal {
  segmentId: string
  segmentName: string
  durationSeconds: number
  distanceM: number
  startedAt: string
}

export interface ActiveEffort {
  segmentId: string
  segmentName: string
  startedAt: string
  elapsedSeconds: number
}
