// ══════════════════════════════════════════════════════════════
// API — /api/coach/insights  (curation, réservée compte créateur)
//
// GET    : liste tous les insights (service client).
// POST   : crée un insight (par défaut 'active' = validé manuellement).
// PATCH  : met à jour status / champs d'un insight (?id=…).
// DELETE : supprime un insight (?id=…).
//
// Base partagée → toutes les opérations passent par le service role,
// gardées par isCreatorAccount.
// ══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { invalidateInsightsCache } from '@/lib/coach/learned-insights'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await isCreatorAccount(user.id))) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true }
}

const SPORTS = new Set(['running', 'cycling', 'hyrox', 'gym'])
const STATUSES = new Set(['candidate', 'active', 'retired'])

function clip(s: unknown, n: number): string | null {
  if (typeof s !== 'string') return null
  const t = s.trim()
  if (!t) return null
  return t.length > n ? t.slice(0, n) : t
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('coach_insights')
    .select('id, sport, topic, insight_text, source, status, score, usage_count, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    console.error('[api/coach/insights] GET error:', error)
    return NextResponse.json({ error: 'Erreur lecture' }, { status: 500 })
  }
  return NextResponse.json({ insights: data ?? [] })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const body = await req.json().catch(() => ({}))
  const topic = clip(body?.topic, 120)
  const insightText = clip(body?.insight_text, 2000)
  if (!topic || !insightText) {
    return NextResponse.json({ error: 'topic et insight_text requis' }, { status: 400 })
  }
  const sport = typeof body?.sport === 'string' && SPORTS.has(body.sport) ? body.sport : null
  const status = typeof body?.status === 'string' && STATUSES.has(body.status) ? body.status : 'active'

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('coach_insights')
    .insert({ sport, topic, insight_text: insightText, status, source: 'curated' })
    .select('id')
    .single()
  if (error) {
    console.error('[api/coach/insights] POST error:', error)
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
  invalidateInsightsCache()
  return NextResponse.json({ ok: true, id: data?.id })
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body?.status === 'string' && STATUSES.has(body.status)) patch.status = body.status
  if (typeof body?.topic === 'string') { const t = clip(body.topic, 120); if (t) patch.topic = t }
  if (typeof body?.insight_text === 'string') { const t = clip(body.insight_text, 2000); if (t) patch.insight_text = t }
  if ('sport' in (body ?? {})) patch.sport = SPORTS.has(body?.sport) ? body.sport : null
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'aucun champ valide' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc.from('coach_insights').update(patch).eq('id', id)
  if (error) {
    console.error('[api/coach/insights] PATCH error:', error)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
  invalidateInsightsCache()
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const svc = createServiceClient()
  const { error } = await svc.from('coach_insights').delete().eq('id', id)
  if (error) {
    console.error('[api/coach/insights] DELETE error:', error)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
  invalidateInsightsCache()
  return NextResponse.json({ ok: true })
}
