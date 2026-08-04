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
  kind: ChannelKind = 'text',
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
    .insert({ space_id: spaceId, name: clean, topic: topic?.trim() || null, position, kind })
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

/** Ids des canaux que j'ai mis en sourdine. */
export async function getMutedChannelIds(): Promise<Set<string>> {
  const me = await myId()
  if (!me) return new Set()
  const { data } = await createClient().from('community_channel_mutes').select('channel_id').eq('user_id', me)
  return new Set(((data ?? []) as { channel_id: string }[]).map(r => r.channel_id))
}

/** Met en sourdine / réactive un canal. Retourne true si succès. */
export async function toggleChannelMute(channelId: string, muted: boolean): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const sb = createClient()
  if (muted) {
    const { error } = await sb.from('community_channel_mutes').delete().eq('user_id', me).eq('channel_id', channelId)
    return !error
  }
  const { error } = await sb.from('community_channel_mutes').insert({ user_id: me, channel_id: channelId })
  return !error
}

/**
 * Renvoie l'ensemble des canaux (parmi ceux fournis) qui ont au moins un message
 * plus récent que mon dernier last_read_at → base des badges « non-lus ».
 */
export async function getUnreadChannelIds(channelIds: string[]): Promise<Set<string>> {
  const unread = new Set<string>()
  const ids = Array.from(new Set(channelIds)).filter(Boolean)
  if (ids.length === 0) return unread
  const sb = createClient()
  const [readsRes, msgsRes] = await Promise.all([
    sb.from('community_reads').select('channel_id, last_read_at').in('channel_id', ids),
    sb.from('community_messages').select('channel_id, created_at')
      .in('channel_id', ids).order('created_at', { ascending: false }).limit(300),
  ])
  const lastRead = new Map<string, string>()
  for (const r of (readsRes.data ?? []) as { channel_id: string; last_read_at: string }[]) {
    lastRead.set(r.channel_id, r.last_read_at)
  }
  // Premier message rencontré par canal = le plus récent (tri desc).
  const latest = new Map<string, string>()
  for (const m of (msgsRes.data ?? []) as { channel_id: string; created_at: string }[]) {
    if (!latest.has(m.channel_id)) latest.set(m.channel_id, m.created_at)
  }
  for (const [cid, last] of latest) {
    const read = lastRead.get(cid)
    if (!read || new Date(last).getTime() > new Date(read).getTime()) unread.add(cid)
  }
  return unread
}
