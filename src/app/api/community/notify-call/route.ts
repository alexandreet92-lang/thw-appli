// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/notify-call — prévient les membres qu'un appel démarre
// dans un canal. Best-effort. Anti-spam : dédup par canal sur une fenêtre de
// 10 min ; exclut l'appelant et ceux qui ont mis le canal en sourdine.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { channelId } = (await req.json().catch(() => ({}))) as { channelId?: string }
    if (!channelId) return NextResponse.json({ ok: false }, { status: 400 })

    const svc = createServiceClient()
    const { data: ch } = await svc.from('community_channels').select('space_id, name').eq('id', channelId).maybeSingle()
    const chan = ch as { space_id: string; name: string } | null
    if (!chan) return NextResponse.json({ ok: false }, { status: 404 })
    const spaceId = chan.space_id

    const { data: me } = await svc.from('community_members').select('user_id').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    if (!me) return NextResponse.json({ ok: false }, { status: 403 })

    const { data: sp } = await svc.from('community_spaces').select('name').eq('id', spaceId).maybeSingle()
    const spaceName = (sp as { name: string } | null)?.name ?? 'un espace'

    const { data: prof } = await svc.from('profiles').select('full_name, first_name').eq('id', user.id).maybeSingle()
    const authorName = ((prof?.full_name as string) || (prof?.first_name as string) || 'Un membre').trim()

    const { data: members } = await svc.from('community_members').select('user_id').eq('space_id', spaceId)
    const others = (members ?? []).map((m: { user_id: string }) => m.user_id).filter(id => id !== user.id)
    if (others.length === 0) return NextResponse.json({ ok: true })

    // Exclut ceux qui ont mis le canal en sourdine.
    const { data: mutes } = await svc.from('community_channel_mutes').select('user_id').eq('channel_id', channelId).in('user_id', others)
    const muted = new Set((mutes ?? []).map((m: { user_id: string }) => m.user_id))
    const targets = others.filter(id => !muted.has(id))

    const bucket = Math.floor(Date.now() / 600_000) // fenêtre anti-spam de 10 min
    await Promise.all(targets.map(id =>
      notifyUser(id, 'communaute.appel', {
        title: `${authorName} a lancé un appel dans #${chan.name}`,
        body: spaceName,
        url: '/community',
        dedupKey: `comm-call-${channelId}-${bucket}-${id}`,
        once: true,
      }).catch(() => {}),
    ))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[community/notify-call] error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
