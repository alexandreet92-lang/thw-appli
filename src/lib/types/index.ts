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
  css_pace?: string
  run_threshold_pace?: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  athlete_id: string
  date: string
  sport: Sport
  title: string
  description?: string
  status: SessionStatus
  planned_tss?: number
  actual_tss?: number
  planned_duration_min?: number
  actual_duration_min?: number
  rpe?: number
  notes?: string
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
  target_hr_bpm?: number
  notes?: string
}

export interface TrainingLoad {
  date: string
  ctl: number
  atl: number
  tsb: number
  tss: number
}

export interface RecoveryLog {
  id: string
  athlete_id: string
  date: string
  hrv_ms?: number
  resting_hr_bpm?: number
  sleep_hours?: number
  sleep_quality?: number
  fatigue_score?: number
  stress_score?: number
  muscle_soreness?: number
  motivation?: number
  readiness_score?: number
}

export interface NutritionLog {
  id: string
  athlete_id: string
  date: string
  meal_type: MealType
  raw_input?: string
  parsed_foods?: FoodItem[]
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sodium_mg?: number
  potassium_mg?: number
  magnesium_mg?: number
  calcium_mg?: number
  iron_mg?: number
  created_at: string
}

export interface FoodItem {
  name: string
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface ChatMessage {
  id: string
  role: AIRole
  content: string
  timestamp: string
}
