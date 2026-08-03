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

/**
 * Crée un canal texte dans un espace. Réservé owner/admin (vérifié par la RLS
 * community_channels_insert). Retourne le canal créé, ou null.
 */
export async function createChannel(
  spaceId: string,
  name: string,
  topic?: string | null,
): Promise<CommunityChannel | null> {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9à-ÿ\- ]/gi, '').slice(0, 60)
  if (!clean) return null
  const sb = createClient()
  // Position = à la fin.
  const { data: last } = await sb
    .from('community_channels')
    .select('position')
    .eq('space_id', spaceId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const position = ((last as { position: number } | null)?.position ?? -1) + 1
  const { data, error } = await sb
    .from('community_channels')
    .insert({ space_id: spaceId, name: clean, topic: topic?.trim() || null, position, kind: 'text' })
    .select('id, space_id, name, topic, position, kind')
    .single()
  if (error || !data) return null
  const c = data as ChannelRow
  return { id: c.id, spaceId: c.space_id, name: c.name, topic: c.topic, position: c.position, kind: c.kind }
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
