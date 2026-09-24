export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { processPendingAutoAnalyses } from '@/lib/ai/autoAnalyzeWorker'

// Cron (Vercel) — traite la file des analyses IA en attente.
// Gardé par CRON_SECRET, comme /api/notifications/dispatch et /api/coach/learn.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Désactivé tant que le kill-switch global n'est pas armé (contrôle du coût).
  if (process.env.AI_AUTO_ANALYZE !== '1') {
    return NextResponse.json({ ok: true, disabled: true })
  }
  try {
    const result = await processPendingAutoAnalyses()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[auto-analyze-run]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
