// ══════════════════════════════════════════════════════════════════
// CADENCES — tests personnalisés PRIVÉS de l'utilisateur (épreuves libres + passages).
// Cookie → 401. Tolérant : si les tables n'existent pas encore (migration 20261019 non
// appliquée), on répond { available: false } et le site masque la fonction.
// Aucune lecture d'un autre utilisateur : RLS + filtre user_id explicite.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Item = { id: string; name: string; measure: string; direction: 'lower' | 'higher'; ref: number | null; goal: number | null; weight: number }
const MEASURES = ['time', 'distance', 'weight', 'reps', 'count', 'percent']
const SCORING = ['values', 'per_item', 'weighted']
const ID_RE = /^[a-z0-9_-]{1,40}$/i
const UUID_RE = /^[0-9a-f-]{36}$/i

const unavailable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /cadences_custom/.test(e.message ?? ''))

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

function cleanItems(raw: unknown): Item[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 40) return null
  const out: Item[] = []
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] as Record<string, unknown>
    const name = typeof r?.name === 'string' ? r.name.trim().slice(0, 60) : ''
    const measure = typeof r?.measure === 'string' && MEASURES.includes(r.measure) ? r.measure : ''
    const direction = r?.direction === 'lower' ? 'lower' : r?.direction === 'higher' ? 'higher' : null
    if (!name || !measure || !direction) return null
    const id = typeof r?.id === 'string' && ID_RE.test(r.id) ? r.id : 'i' + (i + 1)
    const w = num(r?.weight)
    out.push({ id, name, measure, direction, ref: num(r?.ref), goal: num(r?.goal), weight: w !== null && w > 0 && w <= 10 ? w : 1 })
  }
  return out
}

async function auth() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return { sb, user }
}

export async function GET(): Promise<NextResponse> {
  const { sb, user } = await auth()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })
  const t = await sb.from('cadences_custom_tests').select('id, name, sport, scoring, remind_months, items, created_at').eq('user_id', user.id).order('created_at', { ascending: true })
  if (t.error) return NextResponse.json({ available: !unavailable(t.error), tests: [], runs: [] })
  const r = await sb.from('cadences_custom_runs').select('id, test_id, performed_on, values_json, conditions').eq('user_id', user.id).order('performed_on', { ascending: true })
  if (r.error) return NextResponse.json({ available: !unavailable(r.error), tests: [], runs: [] })
  return NextResponse.json({ available: true, tests: t.data ?? [], runs: r.data ?? [] })
}

export async function POST(request: Request): Promise<NextResponse> {
  const { sb, user } = await auth()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const action = b?.action
  if (action === 'create_test') {
    const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 80) : ''
    const sport = typeof b?.sport === 'string' ? b.sport.trim().slice(0, 40) : ''
    const scoring = typeof b?.scoring === 'string' && SCORING.includes(b.scoring) ? b.scoring : 'per_item'
    const remind = num(b?.remind_months)
    const items = cleanItems(b?.items)
    if (!name) return NextResponse.json({ erreur: 'Donne un nom à ton test.' }, { status: 400 })
    if (!items) return NextResponse.json({ erreur: 'Ajoute au moins une épreuve complète (nom, mesure, sens).' }, { status: 400 })
    if (scoring !== 'values' && items.some((i) => i.ref === null || i.goal === null || i.ref === i.goal)) {
      return NextResponse.json({ erreur: 'Pour une note, chaque épreuve a besoin d’un repère et d’un objectif différents.' }, { status: 400 })
    }
    const { data, error } = await sb.from('cadences_custom_tests')
      .insert({ user_id: user.id, name, sport, scoring, remind_months: remind !== null && remind >= 1 && remind <= 24 ? Math.round(remind) : null, items })
      .select('id, name, sport, scoring, remind_months, items, created_at').single()
    if (error) {
      if (unavailable(error)) return NextResponse.json({ available: false, erreur: 'Fonction pas encore activée.' }, { status: 503 })
      return NextResponse.json({ erreur: 'Enregistrement impossible.' }, { status: 500 })
    }
    return NextResponse.json({ available: true, test: data })
  }
  if (action === 'add_run') {
    const testId = typeof b?.test_id === 'string' && UUID_RE.test(b.test_id) ? b.test_id : ''
    const d = typeof b?.performed_on === 'string' ? b.performed_on.slice(0, 10) : ''
    if (!testId || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return NextResponse.json({ erreur: 'Données invalides.' }, { status: 400 })
    const own = await sb.from('cadences_custom_tests').select('id, items').eq('id', testId).eq('user_id', user.id).maybeSingle()
    if (own.error || !own.data) return NextResponse.json({ erreur: 'Test introuvable.' }, { status: 404 })
    const ids = new Set((own.data.items as Item[]).map((i) => i.id))
    const vals: Record<string, number> = {}
    const given = (b?.values ?? {}) as Record<string, unknown>
    for (const k of Object.keys(given)) { const v = num(given[k]); if (ids.has(k) && v !== null && v >= 0) vals[k] = v }
    if (!Object.keys(vals).length) return NextResponse.json({ erreur: 'Saisis au moins un résultat.' }, { status: 400 })
    const conditions = typeof b?.conditions === 'string' ? b.conditions.trim().slice(0, 120) : ''
    const { data, error } = await sb.from('cadences_custom_runs')
      .insert({ test_id: testId, user_id: user.id, performed_on: d, values_json: vals, conditions })
      .select('id, test_id, performed_on, values_json, conditions').single()
    if (error) return NextResponse.json({ erreur: 'Enregistrement impossible.' }, { status: 500 })
    return NextResponse.json({ available: true, run: data })
  }
  return NextResponse.json({ erreur: 'Action inconnue.' }, { status: 400 })
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const { sb, user } = await auth()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })
  const u = new URL(request.url)
  const kind = u.searchParams.get('kind') === 'run' ? 'cadences_custom_runs' : 'cadences_custom_tests'
  const id = u.searchParams.get('id') ?? ''
  if (!UUID_RE.test(id)) return NextResponse.json({ erreur: 'Identifiant invalide.' }, { status: 400 })
  const { error } = await sb.from(kind).delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ erreur: 'Suppression impossible.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
