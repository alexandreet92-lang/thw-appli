// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/channel-participants — qui est actuellement dans le VOCAL
// d'un canal (noms), pour l'écran de pré-jonction (« X est déjà là »). Membre de
// l'espace requis. Best-effort : liste vide si LiveKit non configuré.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function httpUrl(raw: string): string {
  const u = raw.trim()
  if (u.startsWith('wss://')) return 'https://' + u.slice(6)
  if (u.startsWith('ws://')) return 'http://' + u.slice(5)
  return u
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ participants: [] })

    const { channelId } = (await req.json().catch(() => ({}))) as { channelId?: string }
    if (!channelId) return NextResponse.json({ participants: [] })

    const url = process.env.LIVEKIT_URL?.trim(), key = process.env.LIVEKIT_API_KEY?.trim(), secret = process.env.LIVEKIT_API_SECRET?.trim()
    if (!url || !key || !secret) return NextResponse.json({ participants: [] })

    const svc = createServiceClient()
    const { data: ch } = await svc.from('community_channels').select('space_id').eq('id', channelId).maybeSingle()
    const spaceId = (ch as { space_id: string } | null)?.space_id
    if (!spaceId) return NextResponse.json({ participants: [] })
    const { data: mem } = await svc.from('community_members').select('user_id').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    if (!mem) return NextResponse.json({ participants: [] })

    const client = new RoomServiceClient(httpUrl(url), key, secret)
    let names: string[] = []
    try {
      const parts = await client.listParticipants(`comm-${channelId}`)
      names = parts.map(p => (p.name || '').trim()).filter(Boolean)
    } catch { /* salle inexistante = personne */ }
    return NextResponse.json({ participants: names })
  } catch {
    return NextResponse.json({ participants: [] })
  }
}
