export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runLifecycle } from '@/lib/lifecycle/service'

// Cron (Vercel) — série de bienvenue des comptes ayant accepté les e-mails. Gardé par CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await runLifecycle(createServiceClient()))
  } catch (err) {
    console.error('[lifecycle-cron]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
