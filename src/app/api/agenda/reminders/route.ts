export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { dispatchAgendaReminders } from '@/lib/agenda/reminders'

// Cron (Vercel) — rappels d'agenda (Planning Week). Toutes les 5 min pour une
// granularité fine (rappels « X min avant »). Gardé par CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await dispatchAgendaReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[agenda-reminders]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
