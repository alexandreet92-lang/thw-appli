import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeProfile,
  analyzeTest,
  explainData,
  type AthleteProfile,
} from '@/lib/agents/performanceAgents'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, payload } = body as {
      action: string
      payload: Record<string, unknown>
    }

    let reply: string

    switch (action) {
      case 'analyzeProfile': {
        const profile = (payload.profile ?? {}) as AthleteProfile
        reply = await analyzeProfile(profile)
        break
      }
      case 'analyzeTest': {
        const testName    = (payload.testName as string) ?? 'Test inconnu'
        const testResults = (payload.testResults as Record<string, string>) ?? {}
        const profile     = (payload.profile as AthleteProfile | undefined)
        reply = await analyzeTest(testName, testResults, profile)
        break
      }
      case 'explainData': {
        const dataName  = (payload.dataName as string) ?? ''
        const dataValue = (payload.dataValue as string) ?? ''
        const context   = (payload.context as { sport?: string; period?: string } | undefined)
        reply = await explainData(dataName, dataValue, context)
        break
      }
      default:
        return NextResponse.json(
          { error: `Action inconnue : ${action}` },
          { status: 400 },
        )
    }

    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[performance-agents]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
