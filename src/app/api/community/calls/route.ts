// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/calls — canaux d'un espace ayant un appel en cours.
// Interroge LiveKit (RoomServiceClient.listRooms sur les salles comm-<channelId>)
// et renvoie, par canal, le nombre de participants. Sert à afficher « X en appel »
// et une pastille sur les canaux (comme Discord).
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
    if (!user) return NextResponse.json({ calls: {} })

    const { spaceId } = (await req.json().catch(() => ({}))) as { spaceId?: string }
    if (!spaceId) return NextResponse.json({ calls: {} })

    const url = process.env.LIVEKIT_URL?.trim(), key = process.env.LIVEKIT_API_KEY?.trim(), secret = process.env.LIVEKIT_API_SECRET?.trim()
    if (!url || !key || !secret) return NextResponse.json({ calls: {} })

    const svc = createServiceClient()
    // Membre de l'espace requis (pas de fuite d'info sur d'autres espaces).
    const { data: mem } = await svc.from('community_members').select('user_id').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    if (!mem) return NextResponse.json({ calls: {} })

    const { data: chans } = await svc.from('community_channels').select('id').eq('space_id', spaceId)
    const channelIds = (chans ?? []).map((c: { id: string }) => c.id)
    if (channelIds.length === 0) return NextResponse.json({ calls: {} })

    const roomToChannel = new Map(channelIds.map(id => [`comm-${id}`, id]))
    const client = new RoomServiceClient(httpUrl(url), key, secret)
    const rooms = await client.listRooms(Array.from(roomToChannel.keys()))
    const calls: Record<string, number> = {}
    for (const r of rooms) {
      const cid = roomToChannel.get(r.name)
      if (cid && r.numParticipants > 0) calls[cid] = r.numParticipants
    }
    return NextResponse.json({ calls })
  } catch {
    return NextResponse.json({ calls: {} })
  }
}
