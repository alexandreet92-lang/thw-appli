// ══════════════════════════════════════════════════════════════
// POST /api/activities/backfill-records
// Backfill : passe sur TOUTES les activités vélo de l'utilisateur
// (ordre chronologique), calcule les records et insère les nouveaux.
// ?force=true → reprocess même si records_processed=true.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse }                  from 'next/server'
import { createClient, createServiceClient }          from '@/lib/supabase/server'
import { processBikeActivityRecords }                 from '@/lib/records/processBikeActivity'
import { processPaceActivityRecords }                 from '@/lib/records/processPaceActivity'

export const maxDuration = 60 // s

interface ActivityIdRow { id: string; sport_type: string | null }

const BIKE_SET = ['bike', 'cycling', 'cycle', 'velo']
const PACE_SET = ['run', 'trail_run', 'swim', 'rowing']

export async function POST(req: NextRequest) {
  console.log('[backfill-records] handler atteint —', new Date().toISOString())
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  console.log('[backfill-records] user', user.id, '— démarrage backfill')
  const { searchParams } = new URL(req.url)
  const force = searchParams.get('force') === 'true'

  const sb = createServiceClient()

  // Sélection chronologique des activités vélo + sports « au temps » (course/natation/aviron)
  let q = sb.from('activities')
    .select('id, sport_type')
    .eq('user_id', user.id)
    .in('sport_type', [...BIKE_SET, ...PACE_SET])
    .order('started_at', { ascending: true })
    .limit(500)

  if (!force) q = q.eq('records_processed', false)

  const { data: rows, error: listErr } = await q
  if (listErr) {
    return NextResponse.json({ error: `Liste impossible : ${listErr.message}` }, { status: 500 })
  }

  const acts = (rows ?? []) as ActivityIdRow[]
  if (acts.length === 0) {
    return NextResponse.json({ processed: 0, beatenAllTime: 0, beatenYear: 0, total: 0 })
  }

  let processed       = 0
  let beatenAllTime   = 0
  let beatenYear      = 0
  let insertFailed    = 0
  const errors:    string[] = []

  for (const a of acts) {
    try {
      const isBike = BIKE_SET.includes((a.sport_type ?? '').toLowerCase())
      const r = isBike
        ? await processBikeActivityRecords(sb, user.id, a.id, { force })
        : await processPaceActivityRecords(sb, user.id, a.id, { force })
      if (r.processed) {
        processed++
        beatenAllTime += r.payload.allTime.length
        beatenYear    += r.payload.year.length
      }
      if (r.reason?.startsWith('insert_failed')) {
        insertFailed++
        errors.push(`${a.id}: ${r.reason}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${a.id}: ${msg}`)
    }
  }

  const warning = insertFailed > 0
    ? `${insertFailed} activité(s) ont échoué à l'insertion. Vérifier les logs serveur ([records] insert failed).`
    : null

  if (insertFailed > 0) {
    console.error('[backfill-records] insert_failed=', insertFailed, 'sur', acts.length, 'activités')
  }
  console.log('[backfill-records] résultat : processed=', processed,
              'beatenAllTime=', beatenAllTime, 'beatenYear=', beatenYear,
              'insert_failed=', insertFailed)

  return NextResponse.json({
    processed,
    beatenAllTime,
    beatenYear,
    total:         acts.length,
    insert_failed: insertFailed,
    warning,
    errors:        errors.slice(0, 10),
  })
}
