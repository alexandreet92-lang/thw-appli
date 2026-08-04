'use client'
// ══════════════════════════════════════════════════════════════════════════
// Messages épinglés d'un canal (owner/admin). Table community_pins.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { namesFor } from './shared'
import type { CommunityMessage } from '@/types/community'

/** Ids des messages épinglés d'un canal (pour l'indicateur + l'état du bouton). */
export async function getPinnedIds(channelId: string): Promise<Set<string>> {
  const { data } = await createClient()
    .from('community_pins').select('message_id').eq('channel_id', channelId)
  return new Set(((data ?? []) as { message_id: string }[]).map(r => r.message_id))
}

/** Messages épinglés d'un canal, résolus (pour le panneau « Épinglés »). */
export async function getPinnedMessages(channelId: string): Promise<CommunityMessage[]> {
  const sb = createClient()
  const { data: pins } = await sb
    .from('community_pins').select('message_id, pinned_at').eq('channel_id', channelId)
    .order('pinned_at', { ascending: false })
  const ids = ((pins ?? []) as { message_id: string }[]).map(p => p.message_id)
  if (ids.length === 0) return []
  const { data: msgs } = await sb
    .from('community_messages')
    .select('id, channel_id, author_id, body, created_at, edited_at, reply_to, attachments')
    .in('id', ids)
  const rows = (msgs ?? []) as { id: string; channel_id: string; author_id: string; body: string; created_at: string; edited_at: string | null; reply_to: string | null; attachments: unknown }[]
  const order = new Map(ids.map((id, i) => [id, i]))
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  const people = await namesFor(rows.map(r => r.author_id))
  return rows.map((r): CommunityMessage => ({
    id: r.id, channelId: r.channel_id, authorId: r.author_id, body: r.body,
    createdAt: r.created_at, editedAt: r.edited_at, replyTo: r.reply_to,
    attachments: Array.isArray(r.attachments) ? r.attachments as CommunityMessage['attachments'] : [],
    reactions: [], replyPreview: null,
    authorName: people.get(r.author_id)?.name ?? 'Membre', authorAvatar: people.get(r.author_id)?.avatar ?? null,
  }))
}

/** Épingle / désépingle un message (owner/admin via RLS). */
export async function togglePin(
  spaceId: string, channelId: string, messageId: string, pinned: boolean,
): Promise<boolean> {
  const sb = createClient()
  if (pinned) {
    const { error } = await sb.from('community_pins').delete().eq('message_id', messageId)
    return !error
  }
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { error } = await sb.from('community_pins')
    .insert({ message_id: messageId, channel_id: channelId, space_id: spaceId, pinned_by: user.id })
  return !error
}
