'use client'
// ══════════════════════════════════════════════════════════════════════════
// Réactions (pictogrammes SVG) sur les messages communauté. Agrégation côté client
// (message_id → [{emoji, count, mine}]) et toggle (pose/retrait).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId } from './shared'
import type { CommunityReaction } from '@/types/community'

// Palette de réactions rapides (contenu utilisateur, pas du chrome décoratif).
export type ReactionKey = 'like' | 'fire' | 'strong' | 'clap' | 'smile' | 'celebrate'
export const QUICK_REACTIONS: ReactionKey[] = ['like', 'fire', 'strong', 'clap', 'smile', 'celebrate']

// Anciennes valeurs stockées (caractères unicode) → clé canonique. Échappements : aucun glyphe dans le source.
const LEGACY: Record<string, ReactionKey> = {
  '\u{1F44D}': 'like', '\u{1F525}': 'fire', '\u{1F4AA}': 'strong',
  '\u{1F44F}': 'clap', '\u{1F604}': 'smile', '\u{1F64C}': 'celebrate',
}
export const normReaction = (v: string): string => LEGACY[v] ?? v
const variantsOf = (key: string): string[] => [key, ...Object.entries(LEGACY).filter(([, k]) => k === key).map(([g]) => g)]

interface ReactionRow { message_id: string; user_id: string; emoji: string }

/** Réactions agrégées pour un lot de messages : Map message_id → réactions. */
export async function getReactionsFor(messageIds: string[]): Promise<Map<string, CommunityReaction[]>> {
  const out = new Map<string, CommunityReaction[]>()
  const ids = Array.from(new Set(messageIds)).filter(Boolean)
  if (ids.length === 0) return out
  const me = await myId()
  const { data } = await createClient()
    .from('community_message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', ids)
  const rows = (data ?? []) as ReactionRow[]
  // message_id → emoji → { count, mine }
  const agg = new Map<string, Map<string, { count: number; mine: boolean }>>()
  for (const r of rows) {
    let byEmoji = agg.get(r.message_id)
    if (!byEmoji) { byEmoji = new Map(); agg.set(r.message_id, byEmoji) }
    const key = normReaction(r.emoji)
    const cur = byEmoji.get(key) ?? { count: 0, mine: false }
    cur.count += 1
    if (me && r.user_id === me) cur.mine = true
    byEmoji.set(key, cur)
  }
  for (const [mid, byEmoji] of agg) {
    out.set(mid, Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine })))
  }
  return out
}

/** Pose ou retire ma réaction sur un message. Retourne true si succès. */
export async function toggleReaction(messageId: string, emoji: string, mine: boolean): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const sb = createClient()
  if (mine) {
    const { error } = await sb.from('community_message_reactions')
      .delete().eq('message_id', messageId).eq('user_id', me).in('emoji', variantsOf(emoji))
    return !error
  }
  const { error } = await sb.from('community_message_reactions')
    .insert({ message_id: messageId, user_id: me, emoji })
  return !error
}
