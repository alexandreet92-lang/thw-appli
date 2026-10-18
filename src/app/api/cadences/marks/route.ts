// ══════════════════════════════════════════════════════════════════
// CADENCES — objectifs et événements de l'utilisateur sur sa courbe d'historique.
// Cookie → 401 natif. Tolérant : si la table n'existe pas encore (migration
// 20261018 non appliquée), on répond { available: false } et le site masque la
// fonction, sans erreur.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Row = { id: string; kind: 'goal' | 'event'; test_key: string; metric: string | null; target: number | null; on_date: string | null; label: string }

const unavailable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /cadences_marks/.test(e.message ?? ''))

export async function GET(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })
  const testKey = new URL(request.url).searchParams.get('test_key') ?? 'decaform'
  const { data, error } = await sb
    .from('cadences_marks')
    .select('id, kind, test_key, metric, target, on_date, label')
    .eq('test_key', testKey)
    .order('on_date', { ascending: true })
  if (error) return NextResponse.json({ available: !unavailable(error), marks: [] })
  return NextResponse.json({ available: true, marks: (data ?? []) as Row[] })
}

export async function POST(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const kind = b?.kind === 'goal' ? 'goal' : b?.kind === 'event' ? 'event' : null
  const label = typeof b?.label === 'string' ? b.label.trim().slice(0, 80) : ''
  if (!kind || !label) return NextResponse.json({ erreur: 'Libellé manquant.' }, { status: 400 })
  const testKey = typeof b?.test_key === 'string' && b.test_key ? b.test_key : 'decaform'
  let row: Record<string, unknown>
  if (kind === 'goal') {
    const metric = typeof b?.metric === 'string' && /^(global|q:[a-z_0-9]+|t:[a-z_0-9]+)$/.test(b.metric) ? b.metric : null
    const target = Number(b?.target)
    if (!metric || !Number.isFinite(target)) return NextResponse.json({ erreur: 'Objectif invalide.' }, { status: 400 })
    row = { user_id: user.id, kind, test_key: testKey, metric, target, label }
  } else {
    const d = typeof b?.on_date === 'string' ? b.on_date.slice(0, 10) : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return NextResponse.json({ erreur: 'Date invalide.' }, { status: 400 })
    row = { user_id: user.id, kind, test_key: testKey, on_date: d, label }
  }
  const { data, error } = await sb.from('cadences_marks').insert(row).select('id, kind, test_key, metric, target, on_date, label').single()
  if (error) {
    if (unavailable(error)) return NextResponse.json({ available: false, erreur: 'Fonction pas encore activée.' }, { status: 503 })
    return NextResponse.json({ erreur: 'Enregistrement impossible.' }, { status: 500 })
  }
  return NextResponse.json({ available: true, mark: data as Row })
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ erreur: 'Identifiant invalide.' }, { status: 400 })
  const { error } = await sb.from('cadences_marks').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ erreur: 'Suppression impossible.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
