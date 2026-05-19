// ── Recovery — Types partagés ─────────────────────────────────

export interface CheckInRow {
  id: string
  user_id: string
  date: string
  fatigue: number
  energy: number
  stress: number
  motivation: number
  pain: number
  pain_location?: string | null
  sleep_quality: number
  sleep_hours?: number | null
  notes?: string | null
  created_at: string
}

/** Données du check-in en cours de saisie dans le modal */
export interface CheckInDraft {
  fatigue: number
  energy: number
  stress: number
  motivation: number
  pain: number
  pain_location: string
  sleep_quality: number
  sleep_hours: string   // string pour l'input décimal
  notes: string
}

export interface SportLoad {
  sport: string
  hours: number
  color: string
}

export interface TrainingLoadData {
  thisWeekCount: number
  thisWeekHours: number
  prevWeekHours: number
  breakdown: SportLoad[]
}

export const BLANK_DRAFT: CheckInDraft = {
  fatigue: 5, energy: 5, stress: 5, motivation: 5, pain: 1,
  pain_location: '', sleep_quality: 5, sleep_hours: '', notes: '',
}
