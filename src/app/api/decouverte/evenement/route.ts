// ══════════════════════════════════════════════════════════════════
// DÉCOUVERTE — enregistrement d'une participation (PUBLIC, anonyme).
//
// Appelé par la page /defi quand quelqu'un ouvre le test via un QR, le
// commence, le termine, ou laisse un commentaire. Écrit via le service role
// (l'insert anonyme est interdit par la RLS). Ne lit ni n'écrit aucune donnée
// utilisateur — seulement la table decouverte_participations.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ETAPES = ['ouvert', 'commence', 'termine'] as const
type Etape = (typeof ETAPES)[number]

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ erreur: 'Corps invalide.' }, { status: 400 })

  const codeBrut = typeof body.s === 'string' ? body.s.trim().slice(0, 64) : null
  const tableNum = toInt(body.t)
  const etape: Etape = ETAPES.includes(body.etape as Etape) ? (body.etape as Etape) : 'ouvert'
  const score = body.score ?? null
  const commentaire = typeof body.commentaire === 'string' ? body.commentaire.trim().slice(0, 2000) : null
  const participationId = typeof body.participationId === 'string' ? body.participationId : null

  const sb = createServiceClient()

  // ── Mise à jour d'une participation existante (avancement, score, commentaire) ──
  if (participationId) {
    const maj: Record<string, unknown> = { etape, updated_at: new Date().toISOString() }
    if (score !== null) maj.score = score
    if (commentaire !== null) maj.commentaire = commentaire
    const { error } = await sb.from('decouverte_participations').update(maj).eq('id', participationId)
    if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
    return NextResponse.json({ ok: true, id: participationId })
  }

  // ── Nouvelle participation. On ne garde le code que s'il existe vraiment
  //    (sinon la contrainte de clé étrangère échouerait) ; sinon on enregistre
  //    quand même la participation, juste sans source. ──
  let code: string | null = null
  if (codeBrut) {
    const { data } = await sb.from('decouverte_sources').select('code').eq('code', codeBrut).maybeSingle()
    code = data?.code ?? null
  }

  const { data, error } = await sb
    .from('decouverte_participations')
    .insert({ code, table_no: tableNum && tableNum > 0 ? tableNum : null, etape, score, commentaire })
    .select('id')
    .single()
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true, id: data.id })
}

function toInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10)
  return null
}
