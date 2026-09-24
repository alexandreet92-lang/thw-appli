export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendCoachDigests } from '@/lib/coach/digest'

// Cron (Vercel) — digest proactif au coach (Brique 2).
// Prévu pour tourner tous les matins :
//   • lundi        → digest HEBDO (toujours, si le coach a des athlètes) ;
//   • autres jours → digest QUOTIDIEN uniquement si COACH_DIGEST_DAILY=1
//     (et seulement s'il y a des priorités — géré dans buildCoachDigest).
// Gardé par CRON_SECRET, comme les autres crons.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const isMonday = ((new Date().getUTCDay() + 6) % 7) === 0
  const dailyEnabled = process.env.COACH_DIGEST_DAILY === '1'
  const mode: 'weekly' | 'daily' | null = isMonday ? 'weekly' : (dailyEnabled ? 'daily' : null)
  if (!mode) return NextResponse.json({ ok: true, skipped: 'not monday, daily disabled' })

  try {
    const sb = createServiceClient()
    const result = await sendCoachDigests(sb, mode)
    return NextResponse.json({ ok: true, mode, ...result })
  } catch (err) {
    console.error('[coach-digest]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
