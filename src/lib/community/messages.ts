'use client'
// ══════════════════════════════════════════════════════════════════════════
// Messages d'un canal. Lecture batchée (auteurs résolus en une requête),
// envoi simple. L'append en direct est géré par Realtime côté composant, qui
// re-fetch via getChannelMessages (le payload brut n'a pas la jointure profil).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId, namesFor } from './shared'
import type { CommunityMessage } from '@/types/community'

interface MessageRow {
  id: string
  channel_id: string
  author_id: string
  body: string
  created_at: string
  edited_at: string | null
  reply_to: string | null
}

const PAGE = 100

/** Derniers messages d'un canal (ordre chronologique croissant). */
export async function getChannelMessages(channelId: string): Promise<CommunityMessage[]> {
  const { data } = await createClient()
    .from('community_messages')
    .select('id, channel_id, author_id, body, created_at, edited_at, reply_to')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(PAGE)
  const rows = ((data ?? []) as MessageRow[]).reverse() // → chronologique
  const people = await namesFor(rows.map(r => r.author_id))
  return rows.map((r): CommunityMessage => ({
    id: r.id,
    channelId: r.channel_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    replyTo: r.reply_to,
    authorName: people.get(r.author_id)?.name ?? 'Membre',
    authorAvatar: people.get(r.author_id)?.avatar ?? null,
  }))
}

/** Envoie un message dans un canal. Retourne true si succès. */
export async function sendChannelMessage(
  channelId: string,
  body: string,
  replyTo?: string | null,
): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 4000) return false
  const { error } = await createClient()
    .from('community_messages')
    .insert({ channel_id: channelId, author_id: me, body: trimmed, reply_to: replyTo ?? null })
  return !error
}

/** Édite un message dont on est l'auteur. */
export async function editChannelMessage(messageId: string, body: string): Promise<boolean> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 4000) return false
  const { error } = await createClient()
    .from('community_messages')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', messageId)
  return !error
}

/** Supprime un message (auteur, ou owner/admin via RLS). */
export async function deleteChannelMessage(messageId: string): Promise<boolean> {
  const { error } = await createClient()
    .from('community_messages')
    .delete()
    .eq('id', messageId)
  return !error
}
