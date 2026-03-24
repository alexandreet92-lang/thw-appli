export type Sport =
  | 'running'
  | 'cycling'
  | 'swim'
  | 'triathlon'
  | 'hyrox'
  | 'rowing'
  | 'gym'

export type SessionStatus = 'planned' | 'completed' | 'partial' | 'skipped'
export type BlockType     = 'warmup' | 'effort' | 'interval' | 'recovery' | 'cooldown' | 'steady'
export type TrainingPhase = 'base' | 'build' | 'specific' | 'taper' | 'race' | 'recovery'
export type MealType      = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'
export type AIRole        = 'user' | 'assistant'
export type ThemeMode     = 'light' | 'dark'
export type ColorVariant  = 'brand' | 'blue' | 'red' | 'orange' | 'green' | 'default'

export interface Athlete {
  id: string
  user_id: string
  name: string
  email: string
  age: number
  weight_kg: number
  height_cm: number
  sport_focus: Sport[]
  ftp_watts?: number
  lthr_bpm?: number
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  athlete_id: string
  date: string
  sport: Sport
  title: string
  status: SessionStatus
  planned_tss?: number
  actual_tss?: number
  rpe?: number
  blocks?: SessionBlock[]
}

export interface SessionBlock {
  id: string
  session_id: string
  type: BlockType
  order_index: number
  duration_min: number
  zone?: number
  target_pace?: string
  target_watts?: number
}

export interface RecoveryLog {
  id: string
  athlete_id: string
  date: string
  hrv_ms?: number
  resting_hr_bpm?: number
  sleep_hours?: number
  fatigue_score?: number
  readiness_score?: number
}

export interface ChatMessage {
  id: string
  role: AIRole
  content: string
  timestamp: string
}
