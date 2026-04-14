// ══════════════════════════════════════════════════════════════
// COACH ENGINE — ORCHESTRATOR
// Point d'entrée unique pour tous les agents IA.
// Gère le séquençage, la parallélisation et les erreurs.
// ══════════════════════════════════════════════════════════════

import { runStrategyAgent }         from '@/lib/agents/strategyAgent'
import { runProgramAgent }           from '@/lib/agents/programAgent'
import { runSessionBuilderAgent }    from '@/lib/agents/sessionBuilderAgent'
import { runPlanningAnalysisAgent }  from '@/lib/agents/planningAnalysisAgent'
import { runReadinessAgent }         from '@/lib/agents/readinessAgent'
import { runPerformanceAgent }       from '@/lib/agents/performanceAgent'
import { runAdjustmentAgent }        from '@/lib/agents/adjustmentAgent'
import { runNutritionAgent }         from '@/lib/agents/nutritionAgent'
import { isValidAction }             from './mapping'

import type {
  CoachAction,
  CoachResult,
  StrategyInput,
  ProgramInput,
  SessionBuilderInput,
  PlanningAnalysisInput,
  ReadinessInput,
  AdjustmentInput,
  PerformanceInput,
  NutritionInput,
} from './schemas'

// ── Helpers ────────────────────────────────────────────────────

function agentError(agent: string, err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err)
  throw new Error(`[orchestrator] Agent "${agent}" failed: ${msg}`)
}

// ══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ══════════════════════════════════════════════════════════════

export async function runCoachEngine(
  action: string,
  payload: unknown
): Promise<CoachResult> {

  // Valider l'action
  if (!isValidAction(action)) {
    throw new Error(`[orchestrator] Unknown action: "${action}"`)
  }

  // ── CAS 1 : generate_program ──────────────────────────────
  if (action === 'generate_program') {
    const input = payload as StrategyInput

    // Étape 1 : Strategy
    let strategy
    try {
      strategy = await runStrategyAgent(input)
    } catch (err) {
      agentError('strategyAgent', err)
    }

    // Étape 2 : Program (utilise le résultat de strategy)
    const programInput: ProgramInput = {
      strategy,
      athleteProfile: input.athleteProfile,
      startDate: (payload as any).startDate ?? new Date().toISOString().split('T')[0],
      weekCount: (payload as any).weekCount ?? strategy.trainingPhases.reduce((t, p) => t + p.durationWeeks, 0),
    }
    let program
    try {
      program = await runProgramAgent(programInput)
    } catch (err) {
      agentError('programAgent', err)
    }

    return { action: 'generate_program', result: { strategy, program } } as CoachResult
  }

  // ── CAS 2 : analyze_planning ──────────────────────────────
  if (action === 'analyze_planning') {
    try {
      const result = await runPlanningAnalysisAgent(payload as PlanningAnalysisInput)
      return { action: 'analyze_planning', result } as CoachResult
    } catch (err) {
      agentError('planningAnalysisAgent', err)
    }
  }

  // ── CAS 3 : build_session ─────────────────────────────────
  if (action === 'build_session') {
    try {
      const result = await runSessionBuilderAgent(payload as SessionBuilderInput)
      return { action: 'build_session', result } as CoachResult
    } catch (err) {
      agentError('sessionBuilderAgent', err)
    }
  }

  // ── CAS 4 : readiness_check ───────────────────────────────
  if (action === 'readiness_check') {
    try {
      const result = await runReadinessAgent(payload as ReadinessInput)
      return { action: 'readiness_check', result } as CoachResult
    } catch (err) {
      agentError('readinessAgent', err)
    }
  }

  // ── CAS 5 : adjust_plan ───────────────────────────────────
  // Readiness + Performance en parallèle → Adjustment
  if (action === 'adjust_plan') {
    const input = payload as AdjustmentInput

    const [readiness, performance] = await Promise.all([
      runReadinessAgent({
        recentActivities: (input as any).recentActivities ?? [],
        sleepQuality:     (input as any).sleepQuality,
        subjectiveFeeling:(input as any).subjectiveFeeling,
        hrv:              (input as any).hrv,
        restingHR:        (input as any).restingHR,
      } as ReadinessInput).catch(err => agentError('readinessAgent', err)),

      runPerformanceAgent({
        activities: (input as any).activities ?? [],
        metrics:    (input as any).metrics,
        period:     (input as any).period ?? '30d',
      } as PerformanceInput).catch(err => agentError('performanceAgent', err)),
    ])

    let result
    try {
      result = await runAdjustmentAgent({
        readiness,
        performance,
        plannedSessions: input.plannedSessions,
        currentWeek:     input.currentWeek,
        constraints:     input.constraints,
      })
    } catch (err) {
      agentError('adjustmentAgent', err)
    }

    return { action: 'adjust_plan', result } as CoachResult
  }

  // ── CAS 6 : analyze_performance ──────────────────────────
  if (action === 'analyze_performance') {
    try {
      const result = await runPerformanceAgent(payload as PerformanceInput)
      return { action: 'analyze_performance', result } as CoachResult
    } catch (err) {
      agentError('performanceAgent', err)
    }
  }

  // ── CAS 7 : nutrition ─────────────────────────────────────
  if (action === 'nutrition') {
    try {
      const result = await runNutritionAgent(payload as NutritionInput)
      return { action: 'nutrition', result } as CoachResult
    } catch (err) {
      agentError('nutritionAgent', err)
    }
  }

  // Ne devrait jamais arriver (action validée plus haut)
  throw new Error(`[orchestrator] Unhandled action: "${action}"`)
}
