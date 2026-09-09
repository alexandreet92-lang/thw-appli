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
  is_private: boolean | null
  themes: string[] | null
}

const CH_COLS = 'id, space_id, name, topic, position, kind, is_private, themes'

function mapChannel(c: ChannelRow): CommunityChannel {
  return {
    id: c.id,
    spaceId: c.space_id,
    name: c.name,
    topic: c.topic,
    position: c.position,
    kind: c.kind,
    isPrivate: !!c.is_private,
    themes: Array.isArray(c.themes) ? c.themes : [],
  }
}

/** Liste ordonnée des canaux d'un espace. */
export async function listChannels(spaceId: string): Promise<CommunityChannel[]> {
  const { data } = await createClient()
    .from('community_channels')
    .select(CH_COLS)
    .eq('space_id', spaceId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  return ((data ?? []) as ChannelRow[]).map(mapChannel)
}

/**
 * Crée un canal texte dans un espace. Réservé owner/admin (vérifié par la RLS
 * community_channels_insert). Retourne le canal créé, ou null.
 */
export async function createChannel(
  spaceId: string,
  name: string,
  kind: ChannelKind = 'text',
  opts?: { topic?: string | null; isPrivate?: boolean; themes?: string[] },
): Promise<CommunityChannel | null> {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9à-ÿ\- ]/gi, '').slice(0, 60)
  if (!clean) return null
  const sb = createClient()
  const position = await nextPosition(sb, spaceId)
  const { data, error } = await sb
    .from('community_channels')
    .insert({ space_id: spaceId, name: clean, topic: opts?.topic?.trim() || null, position, kind, is_private: !!opts?.isPrivate, themes: opts?.themes ?? [] })
    .select(CH_COLS)
    .single()
  if (error || !data) return null
  return mapChannel(data as ChannelRow)
}

async function nextPosition(sb: ReturnType<typeof createClient>, spaceId: string): Promise<number> {
  const { data: last } = await sb
    .from('community_channels')
    .select('position')
    .eq('space_id', spaceId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  return ((last as { position: number } | null)?.position ?? -1) + 1
}

/** Modifie un salon (nom, sujet, thèmes). Réservé owner/admin (RLS). */
export async function updateChannel(
  channelId: string,
  patch: { name?: string; topic?: string | null; themes?: string[] },
): Promise<boolean> {
  const upd: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    const clean = patch.name.trim().toLowerCase().replace(/[^a-z0-9à-ÿ\- ]/gi, '').slice(0, 60)
    if (!clean) return false
    upd.name = clean
  }
  if (patch.topic !== undefined) upd.topic = patch.topic?.trim() || null
  if (patch.themes !== undefined) upd.themes = patch.themes
  if (Object.keys(upd).length === 0) return true
  const { error } = await createClient().from('community_channels').update(upd).eq('id', channelId)
  return !error
}

/** Duplique un salon (nom « … copie », même type / sujet / thèmes). */
export async function duplicateChannel(channelId: string): Promise<CommunityChannel | null> {
  const sb = createClient()
  const { data: src } = await sb.from('community_channels').select(CH_COLS).eq('id', channelId).maybeSingle()
  if (!src) return null
  const s = mapChannel(src as ChannelRow)
  const copyName = `${s.name}-copie`.slice(0, 60)
  const position = await nextPosition(sb, s.spaceId)
  const { data, error } = await sb
    .from('community_channels')
    .insert({ space_id: s.spaceId, name: copyName, topic: s.topic, position, kind: s.kind, is_private: s.isPrivate, themes: s.themes })
    .select(CH_COLS)
    .single()
  if (error || !data) return null
  return mapChannel(data as ChannelRow)
}

/** Supprime un salon (owner/admin via RLS). */
export async function deleteChannel(channelId: string): Promise<boolean> {
  const { error } = await createClient().from('community_channels').delete().eq('id', channelId)
  return !error
}

/** Ids des salons que j'ai épinglés en haut (propre à l'utilisateur). */
export async function getPinnedChannelIds(): Promise<Set<string>> {
  const me = await myId()
  if (!me) return new Set()
  const { data } = await createClient().from('community_channel_pins').select('channel_id').eq('user_id', me)
  return new Set(((data ?? []) as { channel_id: string }[]).map(r => r.channel_id))
}

/** Épingle / désépingle un salon en haut. `pinned` = état ACTUEL. */
export async function toggleChannelPin(channelId: string, pinned: boolean): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const sb = createClient()
  if (pinned) {
    const { error } = await sb.from('community_channel_pins').delete().eq('user_id', me).eq('channel_id', channelId)
    return !error
  }
  const { error } = await sb.from('community_channel_pins').insert({ user_id: me, channel_id: channelId })
  return !error
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
