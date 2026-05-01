import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeProfile,
  analyzeTest,
  explainData,
  getLacunes,
  getProgression,
  type AthleteProfile,
} from '@/lib/agents/performanceAgents'
import { createClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { logUsage } from '@/lib/subscriptions/check-quota'

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  let userId: string
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    userId = user.id
  } catch {
    return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 })
  }

  // ── Quota micro_agent ────────────────────────────────────────
  const check = await enforceQuota(userId, 'micro_agent')
  if (!check.allowed) return check.response

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
      case 'getLacunes': {
        const profile     = (payload.profile ?? {}) as AthleteProfile
        const testHistory = (payload.testHistory as Record<string, unknown>[]) ?? []
        reply = await getLacunes(profile, testHistory)
        break
      }
      case 'getProgression': {
        const profile    = (payload.profile ?? {}) as AthleteProfile
        const historique = (payload.historique as Record<string, unknown>[]) ?? []
        reply = await getProgression(profile, historique)
        break
      }
      default:
        return NextResponse.json(
          { error: `Action inconnue : ${action}` },
          { status: 400 },
        )
    }

    // ── Log usage micro_agent (fire-and-forget) ─────────────────
    void logUsage(userId, 'micro_agent', { action })
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[performance-agents]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
