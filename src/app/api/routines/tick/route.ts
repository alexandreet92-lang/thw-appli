// ══════════════════════════════════════════════════════════════
// CRON horaire des routines. Déclenché chaque heure (Vercel Cron, gardé par
// CRON_SECRET). Pour chaque routine ACTIVE dont l'heure locale + le jour
// correspondent au planning, on exécute le coach headless, on enregistre le
// run et on notifie. Garde anti-doublon via last_run_at.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { executeRoutine, type RoutineRow } from '@/lib/routines/execute'

type Routine = RoutineRow & {
  frequency: string
  hour: number
  weekday: number | null
  timezone: string
  enabled: boolean
  last_run_at: string | null
}

// Heure (0-23) et jour de semaine (lundi=0) dans le fuseau de la routine.
function localParts(tz: string, now: Date): { hour: number; weekdayMon: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10) % 24
    const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
    const weekdayMon = map[parts.find(p => p.type === 'weekday')?.value ?? 'Mon'] ?? 0
    return { hour, weekdayMon }
  } catch {
    return { hour: now.getUTCHours(), weekdayMon: (now.getUTCDay() + 6) % 7 }
  }
}

function isDue(r: Routine, now: Date): boolean {
  const { hour, weekdayMon } = localParts(r.timezone || 'Europe/Paris', now)
  if (hour !== r.hour) return false
  const dayOk =
    r.frequency === 'daily' ? true
    : r.frequency === 'weekdays' ? weekdayMon <= 4
    : r.frequency === 'weekends' ? weekdayMon >= 5
    : r.frequency === 'weekly' ? weekdayMon === (r.weekday ?? 0)
    : false
  if (!dayOk) return false
  // Anti-doublon : déjà lancée dans les 50 dernières minutes → on saute.
  if (r.last_run_at && now.getTime() - new Date(r.last_run_at).getTime() < 50 * 60 * 1000) return false
  return true
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServiceClient()
  const now = new Date()

  const { data } = await sb.from('routines')
    .select('id,user_id,name,prompt,model,allow_write,frequency,hour,weekday,timezone,enabled,last_run_at')
    .eq('enabled', true)
  const routines = (data ?? []) as Routine[]
  const due = routines.filter(r => isDue(r, now)).slice(0, 30)   // garde-fou

  let ran = 0
  // Exécution par lots (concurrence limitée) pour rester dans maxDuration.
  const BATCH = 4
  for (let i = 0; i < due.length; i += BATCH) {
    const slice = due.slice(i, i + BATCH)
    await Promise.all(slice.map(async (r) => {
      try { await executeRoutine(sb, r); ran++ } catch { /* best-effort */ }
    }))
  }

  return NextResponse.json({ ok: true, checked: routines.length, due: due.length, ran })
}
