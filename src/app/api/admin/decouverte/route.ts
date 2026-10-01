// ══════════════════════════════════════════════════════════════════
// DÉCOUVERTE — gestion des sources QR (ADMIN UNIQUEMENT).
//
// GET    liste les établissements + statistiques (ouvertures / commencés /
//        terminés) + derniers commentaires.
// POST   crée une source (établissement + option « tables »).
// DELETE supprime une source (les participations déjà reçues sont conservées,
//        leur code passe simplement à NULL).
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Source { code: string; etablissement: string; metier: string | null; tables: number; ville: string | null; note: string | null; created_at: string }
interface Part { code: string | null; table_no: number | null; etape: string; commentaire: string | null; created_at: string }

export async function GET(): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })

  const sb = createServiceClient()
  const [{ data: sources, error: e1 }, { data: parts, error: e2 }] = await Promise.all([
    sb.from('decouverte_sources').select('*').order('created_at', { ascending: false }),
    sb.from('decouverte_participations').select('code, table_no, etape, commentaire, created_at').order('created_at', { ascending: false }).limit(5000),
  ])
  if (e1) return NextResponse.json({ erreur: e1.message }, { status: 502 })
  if (e2) return NextResponse.json({ erreur: e2.message }, { status: 502 })

  const toutes = (parts ?? []) as Part[]
  const liste = (sources ?? []).map((s: Source) => {
    const miennes = toutes.filter((p) => p.code === s.code)
    const termine = miennes.filter((p) => p.etape === 'termine').length
    const commence = miennes.filter((p) => p.etape === 'commence').length + termine
    const commentaires = miennes
      .filter((p) => p.commentaire && p.commentaire.trim())
      .slice(0, 20)
      .map((p) => ({ texte: p.commentaire as string, table: p.table_no, date: p.created_at }))
    return {
      ...s,
      stats: { ouvertures: miennes.length, commence, termine },
      commentaires,
    }
  })

  // Participations sans source (code NULL) — scans d'un QR supprimé, ou test direct.
  const orphelines = toutes.filter((p) => !p.code).length

  return NextResponse.json({ sources: liste, orphelines })
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const etablissement = typeof body?.etablissement === 'string' ? body.etablissement.trim().slice(0, 120) : ''
  if (!etablissement) return NextResponse.json({ erreur: 'Nom d’établissement manquant.' }, { status: 400 })
  const metier = typeof body?.metier === 'string' ? body.metier.trim().slice(0, 60) : null
  const ville = typeof body?.ville === 'string' ? body.ville.trim().slice(0, 80) : null
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : null
  const tables = Number.isFinite(body?.tables) ? Math.max(0, Math.min(200, Math.trunc(body?.tables as number))) : 0

  const sb = createServiceClient()

  // Code unique : slug du nom + suffixe aléatoire. On réessaie si collision.
  let code = ''
  for (let essai = 0; essai < 6; essai++) {
    const candidat = `${slug(etablissement)}-${suffixe()}`.slice(0, 48)
    const { data } = await sb.from('decouverte_sources').select('code').eq('code', candidat).maybeSingle()
    if (!data) { code = candidat; break }
  }
  if (!code) return NextResponse.json({ erreur: 'Impossible de générer un code unique, réessaie.' }, { status: 500 })

  const { data, error } = await sb
    .from('decouverte_sources')
    .insert({ code, etablissement, metier, ville, note, tables })
    .select('*')
    .single()
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true, source: data })
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const code = typeof body?.code === 'string' ? body.code : ''
  if (!code) return NextResponse.json({ erreur: 'Code manquant.' }, { status: 400 })

  const sb = createServiceClient()
  const { error } = await sb.from('decouverte_sources').delete().eq('code', code)
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'etab'
}
function suffixe(): string {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  let r = ''
  for (let i = 0; i < 4; i++) r += a[Math.floor(Math.random() * a.length)]
  return r
}
