'use client'
// ══════════════════════════════════════════════════════════════════════════
// Modération de la messagerie privée (coach ↔ athlète, groupes).
// Blocage utilisateur + signalement de contenu — exigence Apple (Guideline 1.2).
// Lecture/écriture via la RLS (tables user_blocks, dm_reports).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

async function myId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}

export type ReportContext = 'coach_dm' | 'group' | 'profile'

/** Bloque un utilisateur : plus aucun message échangé dans les deux sens. */
export async function blockUser(otherId: string): Promise<boolean> {
  const me = await myId()
  if (!me || me === otherId) return false
  const { error } = await createClient()
    .from('user_blocks')
    .upsert({ blocker_id: me, blocked_id: otherId }, { onConflict: 'blocker_id,blocked_id' })
  return !error
}

/** Débloque un utilisateur précédemment bloqué. */
export async function unblockUser(otherId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient()
    .from('user_blocks')
    .delete().eq('blocker_id', me).eq('blocked_id', otherId)
  return !error
}

/** Ai-je bloqué cet utilisateur ? */
export async function isBlocked(otherId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { data } = await createClient()
    .from('user_blocks')
    .select('blocked_id').eq('blocker_id', me).eq('blocked_id', otherId).maybeSingle()
  return !!data
}

/** Ensemble des ids que J'AI bloqués (pour masquer leurs messages en groupe). */
export async function myBlockedIds(): Promise<Set<string>> {
  const me = await myId()
  if (!me) return new Set()
  const { data } = await createClient()
    .from('user_blocks').select('blocked_id').eq('blocker_id', me)
  return new Set(((data ?? []) as { blocked_id: string }[]).map(r => r.blocked_id))
}

export interface BlockedUser { id: string; name: string; avatar: string | null }

/** Liste des utilisateurs que J'AI bloqués, avec nom + avatar (pour les réglages). */
export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const me = await myId()
  if (!me) return []
  const sb = createClient()
  const { data } = await sb.from('user_blocks').select('blocked_id, created_at')
    .eq('blocker_id', me).order('created_at', { ascending: false })
  const rows = (data ?? []) as { blocked_id: string }[]
  const ids = rows.map(r => r.blocked_id)
  if (ids.length === 0) return []
  const { data: profs } = await sb.from('profiles').select('id, full_name, first_name, avatar_url').in('id', ids)
  const byId = new Map(((profs ?? []) as { id: string; full_name: string | null; first_name: string | null; avatar_url: string | null }[]).map(p => [p.id, p]))
  return ids.map(id => {
    const p = byId.get(id)
    return { id, name: (p?.full_name || p?.first_name || 'Utilisateur').trim(), avatar: p?.avatar_url ?? null }
  })
}

/** Signale un message ou un utilisateur. `messageId`/`excerpt` optionnels. */
export async function reportUserOrMessage(opts: {
  reportedUserId?: string | null
  context: ReportContext
  messageId?: string | null
  messageExcerpt?: string | null
  reason: string
}): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const reason = opts.reason.trim().slice(0, 400) || 'Contenu signalé'
  const { error } = await createClient().from('dm_reports').insert({
    reporter_id: me,
    reported_user_id: opts.reportedUserId ?? null,
    context: opts.context,
    message_id: opts.messageId ?? null,
    message_excerpt: opts.messageExcerpt ? opts.messageExcerpt.slice(0, 1000) : null,
    reason,
  })
  return !error
}
