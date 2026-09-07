// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/incoming-calls — appels EN COURS dans tous les espaces de
// l'utilisateur, avec métadonnées (canal, espace, participants). Sert à faire
// SONNER l'appareil et proposer Répondre / Refuser (comme Discord / WhatsApp).
// L'appelant est exclu côté client (il est déjà dans l'appel). Best-effort :
// si LiveKit n'est pas configuré, renvoie une liste vide sans erreur.
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

export interface IncomingCall {
  channelId: string
  channelName: string
  spaceId: string
  spaceName: string
  participants: number
  names: string[]      // noms des participants présents (pour « X vous appelle »)
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ calls: [] })

    const url = process.env.LIVEKIT_URL?.trim(), key = process.env.LIVEKIT_API_KEY?.trim(), secret = process.env.LIVEKIT_API_SECRET?.trim()
    if (!url || !key || !secret) return NextResponse.json({ calls: [] })

    const svc = createServiceClient()
    // Espaces de l'utilisateur.
    const { data: mems } = await svc.from('community_members').select('space_id').eq('user_id', user.id)
    const spaceIds = Array.from(new Set((mems ?? []).map((m: { space_id: string }) => m.space_id)))
    if (spaceIds.length === 0) return NextResponse.json({ calls: [] })

    // Canaux non mis en sourdine.
    const { data: chans } = await svc.from('community_channels').select('id, name, space_id').in('space_id', spaceIds)
    const channels = (chans ?? []) as { id: string; name: string; space_id: string }[]
    if (channels.length === 0) return NextResponse.json({ calls: [] })

    const { data: mutes } = await svc.from('community_channel_mutes').select('channel_id').eq('user_id', user.id)
    const muted = new Set((mutes ?? []).map((m: { channel_id: string }) => m.channel_id))

    const { data: spaces } = await svc.from('community_spaces').select('id, name').in('id', spaceIds)
    const spaceName = new Map((spaces ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

    const roomToChannel = new Map(channels.filter(c => !muted.has(c.id)).map(c => [`comm-${c.id}`, c]))
    if (roomToChannel.size === 0) return NextResponse.json({ calls: [] })

    const client = new RoomServiceClient(httpUrl(url), key, secret)
    const rooms = await client.listRooms(Array.from(roomToChannel.keys()))
    const calls: IncomingCall[] = []
    for (const r of rooms) {
      const ch = roomToChannel.get(r.name)
      if (!ch || r.numParticipants <= 0) continue
      let names: string[] = []
      try {
        const parts = await client.listParticipants(r.name)
        names = parts.map(p => (p.name || '').trim()).filter(Boolean)
      } catch { /* non bloquant */ }
      calls.push({
        channelId: ch.id, channelName: ch.name, spaceId: ch.space_id,
        spaceName: spaceName.get(ch.space_id) ?? '', participants: r.numParticipants, names,
      })
    }
    return NextResponse.json({ calls })
  } catch {
    return NextResponse.json({ calls: [] })
  }
}
