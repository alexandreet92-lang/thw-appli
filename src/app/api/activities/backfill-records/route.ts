// ══════════════════════════════════════════════════════════════
// POST /api/activities/backfill-records
// Backfill : passe sur TOUTES les activités vélo de l'utilisateur
// (ordre chronologique), calcule les records et insère les nouveaux.
// ?force=true → reprocess même si records_processed=true.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse }                  from 'next/server'
import { createClient, createServiceClient }          from '@/lib/supabase/server'
import { processBikeActivityRecords }                 from '@/lib/records/processBikeActivity'

export const maxDuration = 60 // s

interface ActivityIdRow { id: string }

export async function POST(req: NextRequest) {
  console.log('[backfill-records] handler atteint —', new Date().toISOString())
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  console.log('[backfill-records] user', user.id, '— démarrage backfill')
  const { searchParams } = new URL(req.url)
  const force = searchParams.get('force') === 'true'

  const sb = createServiceClient()

  // Sélection chronologique des activités vélo
  let q = sb.from('activities')
    .select('id')
    .eq('user_id', user.id)
    .in('sport_type', ['bike', 'cycling', 'cycle', 'velo'])
    .order('started_at', { ascending: true })
    .limit(500)

  if (!force) q = q.eq('records_processed', false)

  const { data: rows, error: listErr } = await q
  if (listErr) {
    return NextResponse.json({ error: `Liste impossible : ${listErr.message}` }, { status: 500 })
  }

  const ids = ((rows ?? []) as ActivityIdRow[]).map(r => r.id)
  if (ids.length === 0) {
    return NextResponse.json({ processed: 0, beatenAllTime: 0, beatenYear: 0, total: 0 })
  }

  let processed     = 0
  let beatenAllTime = 0
  let beatenYear    = 0
  const errors:    string[] = []

  for (const id of ids) {
    try {
      const r = await processBikeActivityRecords(sb, user.id, id, { force })
      if (r.processed) {
        processed++
        beatenAllTime += r.payload.allTime.length
        beatenYear    += r.payload.year.length
      }
      if (r.reason?.startsWith('insert_failed')) {
        errors.push(`${id}: ${r.reason}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${id}: ${msg}`)
    }
  }

  return NextResponse.json({
    processed,
    beatenAllTime,
    beatenYear,
    total:  ids.length,
    errors: errors.slice(0, 10),
  })
}
