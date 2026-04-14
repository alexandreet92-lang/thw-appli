// ══════════════════════════════════════════════════════════════
// COACH ENGINE — CLIENT
// Fonction générique utilisable dans tous les composants React.
// Import : import { runCoachAction } from '@/lib/coach-engine/client'
// ══════════════════════════════════════════════════════════════

import type {
  CoachAction,
  CoachResult,
  StrategyInput,
  SessionBuilderInput,
  PlanningAnalysisInput,
  ReadinessInput,
  AdjustmentInput,
  PerformanceInput,
  NutritionInput,
} from './schemas'

// ── Types utilitaires ─────────────────────────────────────────

export interface CoachResponse<T> {
  ok: boolean
  action: CoachAction
  result?: T
  error?: string
}

// ── Fonction principale ────────────────────────────────────────

export async function runCoachAction<T = unknown>(
  action: CoachAction,
  payload: unknown,
  options?: { signal?: AbortSignal }
): Promise<CoachResponse<T>> {
  const res = await fetch('/api/coach-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
    signal: options?.signal,
  })

  const data = await res.json()

  if (!res.ok || !data.ok) {
    return { ok: false, action, error: data.error ?? `HTTP ${res.status}` }
  }

  return { ok: true, action, result: data.result as T }
}

// ── Helpers typés par action ──────────────────────────────────
// Usage : import { coachGenerateProgram } from '@/lib/coach-engine/client'
// Permet l'autocomplétion des types sans connaître les schemas.

type ExtractResult<A extends CoachAction> = Extract<CoachResult, { action: A }>['result']

export const coachGenerateProgram = (payload: StrategyInput & { startDate?: string; weekCount?: number }) =>
  runCoachAction<ExtractResult<'generate_program'>>('generate_program', payload)

export const coachAnalyzePlanning = (payload: PlanningAnalysisInput) =>
  runCoachAction<ExtractResult<'analyze_planning'>>('analyze_planning', payload)

export const coachBuildSession = (payload: SessionBuilderInput) =>
  runCoachAction<ExtractResult<'build_session'>>('build_session', payload)

export const coachReadinessCheck = (payload: ReadinessInput) =>
  runCoachAction<ExtractResult<'readiness_check'>>('readiness_check', payload)

export const coachAdjustPlan = (payload: AdjustmentInput & { recentActivities?: unknown[]; activities?: unknown[]; period?: string }) =>
  runCoachAction<ExtractResult<'adjust_plan'>>('adjust_plan', payload)

export const coachAnalyzePerformance = (payload: PerformanceInput) =>
  runCoachAction<ExtractResult<'analyze_performance'>>('analyze_performance', payload)

export const coachNutrition = (payload: NutritionInput) =>
  runCoachAction<ExtractResult<'nutrition'>>('nutrition', payload)
