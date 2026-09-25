export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { rebuildAllAthleteInsights } from '@/lib/coach/insightRebuild'

// Cron (Vercel) — régénère la synthèse IA « vue coach » de chaque athlète suivi.
// Tourne la nuit APRÈS pmc-rebuild (charge à jour). Gardé par CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await rebuildAllAthleteInsights()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[coach/insight-rebuild]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
