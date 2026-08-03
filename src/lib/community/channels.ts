'use client'
// ══════════════════════════════════════════════════════════════════════════
// Canaux d'un espace + marqueur de lecture (base du non-lu, complété en 1.5).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId } from './shared'
import type { CommunityChannel, ChannelKind } from '@/types/community'

interface ChannelRow {
  id: string
  space_id: string
  name: string
  topic: string | null
  position: number
  kind: ChannelKind
}

/** Liste ordonnée des canaux d'un espace. */
export async function listChannels(spaceId: string): Promise<CommunityChannel[]> {
  const { data } = await createClient()
    .from('community_channels')
    .select('id, space_id, name, topic, position, kind')
    .eq('space_id', spaceId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  return ((data ?? []) as ChannelRow[]).map((c): CommunityChannel => ({
    id: c.id,
    spaceId: c.space_id,
    name: c.name,
    topic: c.topic,
    position: c.position,
    kind: c.kind,
  }))
}

/** Marque un canal comme lu à l'instant (upsert du last_read_at). */
export async function markChannelRead(channelId: string): Promise<void> {
  const me = await myId()
  if (!me) return
  await createClient()
    .from('community_reads')
    .upsert(
      { user_id: me, channel_id: channelId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,channel_id' },
    )
}
