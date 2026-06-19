// ══════════════════════════════════════════════════════════════
// API — /api/coach/learn  (passage d'apprentissage, phase 3)
//
// GET  : déclenché par le cron Vercel — gardé par CRON_SECRET.
// POST : déclenché manuellement depuis la page admin — gardé compte créateur.
//
// Les deux exécutent runLearningPass() : distillation des nouveaux retours
// en insights 'candidate' (à valider) + recalcul des scores + retrait auto.
// ══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { runLearningPass } from '@/lib/coach/distill-insights'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runLearningPass()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[api/coach/learn] GET error:', e)
    return NextResponse.json({ error: 'Erreur passage apprentissage' }, { status: 500 })
  }
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isCreatorAccount(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const result = await runLearningPass()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[api/coach/learn] POST error:', e)
    return NextResponse.json({ error: 'Erreur passage apprentissage' }, { status: 500 })
  }
}
