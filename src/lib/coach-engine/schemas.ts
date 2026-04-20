// ══════════════════════════════════════════════════════════════
// COACH ENGINE — SCHEMAS
// Tous les types TypeScript des inputs/outputs d'agents.
// Modifier ici → propagé automatiquement dans tout le système.
// ══════════════════════════════════════════════════════════════

// ── Commun ────────────────────────────────────────────────────

export interface AthleteProfile {
  age?: number
  gender?: 'male' | 'female' | 'other'
  weight?: number        // kg
  height?: number        // cm
  sport: string          // sport principal
  level?: 'beginner' | 'intermediate' | 'advanced' | 'elite'
  ftp?: number           // watts (vélo)
  thresholdPace?: number // secondes/km (run)
  css?: number           // secondes/100m (natation)
}

export interface CoachError {
  agent: string
  message: string
  raw?: string
}

// ── Actions disponibles ────────────────────────────────────────

export type CoachAction =
  | 'generate_program'
  | 'analyze_planning'
  | 'build_session'
  | 'readiness_check'
  | 'adjust_plan'
  | 'analyze_performance'
  | 'nutrition'
  | 'chat'

// ── STRATEGY AGENT ─────────────────────────────────────────────

export interface StrategyInput {
  athleteProfile: AthleteProfile
  goal: string                        // ex: "finir un marathon en < 3h30"
  currentLevel: string                // description libre
  availableHoursPerWeek: number
  targetDate?: string                 // ISO date
  constraints?: string[]              // ex: ["pas d'entraînement le dimanche"]
}

export interface TrainingPhase {
  name: string
  durationWeeks: number
  focus: string
  weeklyHoursTarget: number
}

export interface StrategyOutput {
  mainObjective: string
  keyFocusAreas: string[]
  trainingPhases: TrainingPhase[]
  weeklyHours: { min: number; max: number }
  keyPrinciples: string[]
  notes: string
}

// ── PROGRAM AGENT ──────────────────────────────────────────────

export interface ProgramInput {
  strategy: StrategyOutput
  athleteProfile: AthleteProfile
  startDate: string
  weekCount: number
}

export interface PlannedSession {
  day: 'Lun' | 'Mar' | 'Mer' | 'Jeu' | 'Ven' | 'Sam' | 'Dim'
  sport: string
  title: string
  durationMin: number
  tss: number
  type: 'endurance' | 'intervals' | 'strength' | 'recovery' | 'race'
  notes?: string
}

export interface ProgramWeek {
  weekNumber: number
  label: string
  focus: string
  sessions: PlannedSession[]
  totalTSS: number
  totalHours: number
}

export interface ProgramOutput {
  programName: string
  weeks: ProgramWeek[]
  notes: string
}

// ── SESSION BUILDER AGENT ──────────────────────────────────────

export interface SessionBuilderInput {
  sport: string
  type: 'endurance' | 'intervals' | 'strength' | 'recovery' | 'race-prep'
  targetDurationMin: number
  targetTSS?: number
  athleteProfile?: Partial<AthleteProfile>
  context?: string
}

export interface SessionBlock {
  type: 'warmup' | 'effort' | 'recovery' | 'cooldown'
  zone: number            // 1–5
  durationMin: number
  label: string
  description?: string
}

export interface SessionBuilderOutput {
  title: string
  blocks: SessionBlock[]
  totalDurationMin: number
  estimatedTSS: number
  coachNotes: string
}

// ── PLANNING ANALYSIS AGENT ────────────────────────────────────

export interface PlannedSessionSummary {
  sport: string
  title: string
  dayIndex: number        // 0 = Lun … 6 = Dim
  durationMin: number
  tss: number
  status: 'planned' | 'done'
  blocks?: { type: string; zone: number; durationMin: number }[]
}

export interface ActivitySummary {
  sport: string
  name: string
  dayIndex: number
  durationMin: number
  tss?: number
}

export interface PlanningAnalysisInput {
  weekStart: string
  sessions: PlannedSessionSummary[]
  activities: ActivitySummary[]
  intensities: Record<number, string>
  kpis: {
    plannedMin: number
    doneMin: number
    plannedTSS: number
    doneTSS: number
    plannedN: number
    doneN: number
  }
}

export interface AnalysisIssue {
  title: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface PlanningAnalysisOutput {
  score: number           // 0–100
  summary: string
  issues: AnalysisIssue[]
  suggestions: string[]
  optimized_plan: PlannedSession[]
}

// ── READINESS AGENT ────────────────────────────────────────────

export interface RecentActivity {
  sport: string
  date: string            // ISO
  durationMin: number
  tss: number
  rpe?: number            // 1–10
}

export interface ReadinessInput {
  recentActivities: RecentActivity[]
  sleepQuality?: number   // 1–10
  subjectiveFeeling?: number // 1–10
  hrv?: number
  restingHR?: number
  notes?: string
}

export interface ReadinessOutput {
  score: number           // 0–100
  readinessLevel: 'low' | 'moderate' | 'good' | 'excellent'
  fatigue: number         // 0–100
  recommendation: string
  trainingLoad: 'reduce' | 'maintain' | 'increase'
  todayAdvice: string
}

// ── PERFORMANCE AGENT ──────────────────────────────────────────

export interface PerformanceActivity {
  sport: string
  date: string
  durationMin: number
  distance?: number       // metres
  avgPace?: string        // min:sec/km
  avgWatts?: number
  tss: number
  hrAvg?: number
}

export interface PerformanceInput {
  activities: PerformanceActivity[]
  metrics?: Pick<AthleteProfile, 'ftp' | 'thresholdPace' | 'css'>
  period: '7d' | '30d' | '90d'
}

export interface PerformanceTrend {
  metric: string
  direction: 'improving' | 'stable' | 'declining'
  change: string
}

export interface PerformanceOutput {
  summary: string
  trends: PerformanceTrend[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  fitnessScore: number    // 0–100
}

// ── ADJUSTMENT AGENT ───────────────────────────────────────────

export interface AdjustmentInput {
  readiness: ReadinessOutput
  performance: PerformanceOutput
  plannedSessions: PlannedSession[]
  currentWeek: string
  constraints?: string[]
}

export interface SessionAdjustment {
  day: PlannedSession['day']
  original: string
  adjusted: string
  durationMin: number
  tss: number
  reason: string
}

export interface AdjustmentOutput {
  adjustedSessions: PlannedSession[]
  changes: SessionAdjustment[]
  summary: string
  urgency: 'none' | 'minor' | 'significant'
}

// ── NUTRITION AGENT ────────────────────────────────────────────

export interface NutritionInput {
  athleteProfile: AthleteProfile
  goal: 'performance' | 'weight_loss' | 'weight_gain' | 'maintenance'
  activityToday?: {
    sport: string
    durationMin: number
    intensity: 'low' | 'moderate' | 'high'
  }
  currentIntake?: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }
  question?: string       // question libre de l'utilisateur
}

export interface MacroTargets {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface NutritionOutput {
  dailyTargets: MacroTargets
  timing: { meal: string; description: string }[]
  recommendations: string[]
  answer?: string         // réponse à la question libre
}

// ── ORCHESTRATOR — Payload union ───────────────────────────────

// ── CHAT AGENT ────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Modèles IA disponibles dans l'IA centrale
export type THWModelId = 'hermes' | 'athena' | 'zeus'

export interface ChatInput {
  agentId: string           // 'central' | 'planning' | 'readiness' | etc.
  messages: ChatMessage[]   // historique complet
  context?: Record<string, unknown>  // contexte page (stats, séances, etc.)
  modelId?: THWModelId      // modèle sélectionné (central uniquement)
}

export interface ChatOutput {
  reply: string             // réponse conversationnelle en texte
  agentId: string
}

// ── ORCHESTRATOR — Payload union ───────────────────────────────

export type CoachPayload =
  | StrategyInput
  | ProgramInput
  | SessionBuilderInput
  | PlanningAnalysisInput
  | ReadinessInput
  | AdjustmentInput
  | PerformanceInput
  | NutritionInput
  | ChatInput

export type CoachResult =
  | { action: 'generate_program';    result: { strategy: StrategyOutput; program: ProgramOutput } }
  | { action: 'analyze_planning';    result: PlanningAnalysisOutput }
  | { action: 'build_session';       result: SessionBuilderOutput }
  | { action: 'readiness_check';     result: ReadinessOutput }
  | { action: 'adjust_plan';         result: AdjustmentOutput }
  | { action: 'analyze_performance'; result: PerformanceOutput }
  | { action: 'nutrition';           result: NutritionOutput }
  | { action: 'chat';                result: ChatOutput }
