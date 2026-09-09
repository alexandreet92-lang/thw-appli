// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/invite — invite des utilisateurs (que l'on suit / connaît)
// dans un espace. L'invitant DOIT être membre de l'espace. Chaque invité reçoit
// une notification 'communaute.invitation' avec un lien vers la communauté.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyUsers } from '@/lib/notifications/dispatch'

export const dynamic = 'force-dynamic'

interface Body { spaceId?: string; userIds?: string[] }

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const b = (await req.json().catch(() => ({}))) as Body
    const spaceId = (b.spaceId ?? '').toString().trim()
    const userIds = Array.isArray(b.userIds) ? b.userIds.filter(x => typeof x === 'string').slice(0, 50) : []
    if (!spaceId || userIds.length === 0) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    // L'invitant doit être membre de l'espace.
    const { data: mem } = await supabase
      .from('community_members').select('user_id').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Tu dois être membre de cet espace' }, { status: 403 })

    // Best-effort : notifie chaque invité (hors membres déjà présents).
    try {
      const svc = createServiceClient()
      const [{ data: sp }, { data: meProf }, { data: already }] = await Promise.all([
        svc.from('community_spaces').select('name').eq('id', spaceId).maybeSingle(),
        svc.from('profiles').select('full_name, first_name, preferred_name').eq('id', user.id).maybeSingle(),
        svc.from('community_members').select('user_id').eq('space_id', spaceId).in('user_id', userIds),
      ])
      const present = new Set(((already ?? []) as { user_id: string }[]).map(r => r.user_id))
      const targets = userIds.filter(id => id !== user.id && !present.has(id))
      const spaceName = (sp?.name as string) ?? 'un espace'
      const inviter = (((meProf?.preferred_name as string) || (meProf?.full_name as string) || (meProf?.first_name as string) || 'Un membre')).trim()
      if (targets.length > 0) {
        await notifyUsers(targets, 'communaute.invitation', {
          title: `Invitation à rejoindre ${spaceName}`,
          body: `${inviter} t'invite à rejoindre l'espace « ${spaceName} »`,
          url: '/community',
          dedupKey: `comm-invite-${spaceId}-${user.id}`,
        })
      }
      return NextResponse.json({ invited: targets.length }, { status: 200 })
    } catch {
      return NextResponse.json({ invited: 0 }, { status: 200 })
    }
  } catch (e) {
    console.error('[community/invite] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
