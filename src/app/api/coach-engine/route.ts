// ══════════════════════════════════════════════════════════════
// API — /api/coach-engine
// Point d'entrée HTTP unique pour le Coach Engine.
// POST { action, payload } → CoachResult | { error }
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { runCoachEngine } from '@/lib/coach-engine/orchestrator'
import { isValidAction, getActionDescription } from '@/lib/coach-engine/mapping'

export async function POST(req: NextRequest) {
  let body: { action?: string; payload?: unknown }

  // Parse du body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, payload } = body

  // Validation de l'action
  if (!action || typeof action !== 'string') {
    return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
  }
  if (!isValidAction(action)) {
    return NextResponse.json(
      { error: `Unknown action: "${action}"`, availableActions: ['generate_program','analyze_planning','build_session','readiness_check','adjust_plan','analyze_performance','nutrition'] },
      { status: 400 }
    )
  }
  if (payload === undefined || payload === null) {
    return NextResponse.json({ error: 'Missing required field: payload' }, { status: 400 })
  }

  // Exécution
  try {
    const result = await runCoachEngine(action, payload)
    return NextResponse.json({
      ok: true,
      description: getActionDescription(action),
      ...result,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[coach-engine] action="${action}"`, message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET — documentation rapide des actions disponibles
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/coach-engine',
    method: 'POST',
    body: { action: 'string', payload: 'object' },
    actions: {
      generate_program:    'StrategyInput + startDate + weekCount → { strategy, program }',
      analyze_planning:    'PlanningAnalysisInput → PlanningAnalysisOutput',
      build_session:       'SessionBuilderInput → SessionBuilderOutput',
      readiness_check:     'ReadinessInput → ReadinessOutput',
      adjust_plan:         'AdjustmentInput → AdjustmentOutput',
      analyze_performance: 'PerformanceInput → PerformanceOutput',
      nutrition:           'NutritionInput → NutritionOutput',
    },
  })
}
