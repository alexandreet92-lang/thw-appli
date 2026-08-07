// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/discover — recherche de groupes (publics ET privés).
// Les groupes privés ne sont pas lisibles via la RLS par les non-membres : on
// passe donc par le service role pour les rendre DÉCOUVRABLES (infos minimales),
// afin qu'on puisse demander à les rejoindre. Retourne, pour chacun, mon statut
// (membre / demande en attente / rien).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface SpaceRow {
  id: string; name: string; slug: string; description: string | null
  icon_url: string | null; is_public: boolean; kind: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { q } = (await req.json().catch(() => ({}))) as { q?: string }
    const query = (q ?? '').trim().slice(0, 80)

    const svc = createServiceClient()
    let sel = svc.from('community_spaces')
      .select('id, name, slug, description, icon_url, is_public, kind')
      .order('created_at', { ascending: false })
      .limit(40)
    if (query) sel = sel.ilike('name', `%${query}%`)
    const { data: spacesData } = await sel
    const spaces = (spacesData ?? []) as SpaceRow[]
    if (spaces.length === 0) return NextResponse.json({ spaces: [] })

    const ids = spaces.map(s => s.id)
    const [{ data: memData }, { data: reqData }, { data: cntData }] = await Promise.all([
      svc.from('community_members').select('space_id').eq('user_id', user.id).in('space_id', ids),
      svc.from('community_join_requests').select('space_id, status').eq('user_id', user.id).in('space_id', ids),
      svc.from('community_members').select('space_id').in('space_id', ids),
    ])
    const myMember = new Set((memData ?? []).map((m: { space_id: string }) => m.space_id))
    const myReq = new Map((reqData ?? []).map((r: { space_id: string; status: string }) => [r.space_id, r.status]))
    const counts = new Map<string, number>()
    for (const m of (cntData ?? []) as { space_id: string }[]) counts.set(m.space_id, (counts.get(m.space_id) ?? 0) + 1)

    const result = spaces.map(s => ({
      id: s.id, name: s.name, slug: s.slug, description: s.description,
      iconUrl: s.icon_url, isPublic: s.is_public, memberCount: counts.get(s.id) ?? 0,
      myStatus: myMember.has(s.id) ? 'member' : (myReq.get(s.id) === 'pending' ? 'requested' : 'none') as 'member' | 'requested' | 'none',
    }))
    return NextResponse.json({ spaces: result })
  } catch (e) {
    console.error('[community/discover] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
