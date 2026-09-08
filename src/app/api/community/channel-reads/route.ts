// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/channel-reads — « Vu par » : renvoie, pour un canal, le
// dernier-lu (last_read_at) de chaque MEMBRE + son profil (nom, avatar). Le fil
// compare last_read_at à la date d'un message pour savoir qui l'a vu.
// Réservé aux membres de l'espace. Lecture via service client (les lignes des
// autres membres ne sont pas exposées par la RLS côté client).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export interface ChannelRead { userId: string; lastReadAt: string; name: string; avatar: string | null }

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ reads: [] })

    const { channelId } = (await req.json().catch(() => ({}))) as { channelId?: string }
    if (!channelId) return NextResponse.json({ reads: [] })

    const svc = createServiceClient()
    const { data: ch } = await svc.from('community_channels').select('space_id').eq('id', channelId).maybeSingle()
    const spaceId = (ch as { space_id: string } | null)?.space_id
    if (!spaceId) return NextResponse.json({ reads: [] })
    const { data: me } = await svc.from('community_members').select('user_id').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    if (!me) return NextResponse.json({ reads: [] })

    const { data: reads } = await svc.from('community_reads')
      .select('user_id, last_read_at').eq('channel_id', channelId)
    const rows = (reads ?? []) as { user_id: string; last_read_at: string }[]
    if (rows.length === 0) return NextResponse.json({ reads: [] })

    const ids = rows.map(r => r.user_id)
    const { data: profs } = await svc.from('profiles').select('id, full_name, first_name, avatar_url').in('id', ids)
    const byId = new Map((profs ?? []).map((p: Record<string, unknown>) => [p.id as string, p]))

    const result: ChannelRead[] = rows.map(r => {
      const p = byId.get(r.user_id)
      return {
        userId: r.user_id,
        lastReadAt: r.last_read_at,
        name: ((p?.full_name as string) || (p?.first_name as string) || 'Membre').trim(),
        avatar: (p?.avatar_url as string | null) ?? null,
      }
    })
    return NextResponse.json({ reads: result })
  } catch {
    return NextResponse.json({ reads: [] })
  }
}
