export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runDailySend } from '@/lib/prospection/service'

// Cron (Vercel) — envoi quotidien de la prospection par email. Gardé par CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await runDailySend(createServiceClient()))
  } catch (err) {
    console.error('[prospection-cron]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
