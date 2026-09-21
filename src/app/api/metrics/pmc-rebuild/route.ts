export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { rebuildAllPmc } from '@/lib/training/pmcRebuild'

// Cron (Vercel) — recalcule et persiste le PMC (CTL/ATL/TSB) du jour dans
// metrics_daily pour tous les utilisateurs actifs. Gardé par CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await rebuildAllPmc()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[pmc-rebuild]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
