export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { runTrainingAnalysis, type AnalyzeTrainingInput } from '@/lib/ai/analyzeTraining'

// Déclenchement MANUEL de l'analyse depuis l'app. Le contexte (streams, zones,
// planifié, récup, séances similaires, métriques pré-calculées) est assemblé
// côté client puis passé ici. La logique de prompt + appel LLM vit désormais
// dans @/lib/ai/analyzeTraining (partagée avec le déclenchement automatique).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnalyzeTrainingInput
    const report = await runTrainingAnalysis(body)
    return NextResponse.json({ report })
  } catch (err) {
    console.error('[analyze-training]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
