// ══════════════════════════════════════════════════════════════
// POST /api/activities/process-records
// Lance le traitement records sur UNE activité (idempotent).
// Logique partagée : lib/records/processBikeActivity.ts
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { processBikeActivityRecords } from '@/lib/records/processBikeActivity'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { activity_id?: string; force?: boolean }
  const activityId = body.activity_id
  if (!activityId) return NextResponse.json({ error: 'activity_id requis' }, { status: 400 })

  const sb = createServiceClient()
  const result = await processBikeActivityRecords(sb, user.id, activityId, { force: body.force })

  if (result.reason === 'not_found') {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 })
  }
  if (result.reason?.startsWith('insert_failed')) {
    return NextResponse.json({ error: result.reason }, { status: 500 })
  }

  return NextResponse.json(result.payload)
}
