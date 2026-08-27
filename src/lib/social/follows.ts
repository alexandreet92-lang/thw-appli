'use client'
// ══════════════════════════════════════════════════════════════════
// Abonnements sociaux (follow) + compteurs (abonnés / abonnements / coachés).
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { emitServerEvent } from '@/lib/notifications/clientEvents'

export interface SocialCounts { followers: number; following: number; coached: number }

export async function getSocialCounts(userId: string): Promise<SocialCounts> {
  const sb = createClient()
  const { data } = await sb.rpc('social_counts', { uid: userId })
  const row = Array.isArray(data) ? data[0] : data
  return {
    followers: Number(row?.followers ?? 0),
    following: Number(row?.following ?? 0),
    coached: Number(row?.coached ?? 0),
  }
}

/** Est-ce que l'utilisateur connecté suit `userId` ? */
export async function amIFollowing(userId: string): Promise<boolean> {
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user || user.id === userId) return false
  const { data } = await sb.from('follows')
    .select('follower_id').eq('follower_id', user.id).eq('following_id', userId).maybeSingle()
  return !!data
}

/** Ensemble des id que je suis (pour afficher l'état Suivre/Suivi en masse). */
export async function getFollowingIds(): Promise<Set<string>> {
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user) return new Set()
  const { data } = await sb.from('follows').select('following_id').eq('follower_id', user.id)
  return new Set(((data ?? []) as { following_id: string }[]).map(r => r.following_id))
}

export interface Person { id: string; name: string; username: string | null; avatar: string | null; sports: string[] }
/** Recherche d'athlètes à suivre (nom / username). Exclut soi-même. */
export async function searchPeople(q: string, limit = 20): Promise<Person[]> {
  const sb = createClient()
  const user = await getCurrentUser()
  const term = q.trim()
  let query = sb.from('profiles').select('id, full_name, preferred_name, first_name, username, avatar_url, sports').limit(limit)
  if (term) query = query.or(`full_name.ilike.%${term}%,username.ilike.%${term}%,preferred_name.ilike.%${term}%,first_name.ilike.%${term}%`)
  else query = query.order('last_seen_at', { ascending: false, nullsFirst: false })
  const { data } = await query
  return ((data ?? []) as any[])
    .filter(r => r.id !== user?.id)
    .map(r => ({ id: r.id, name: r.preferred_name || r.full_name || r.first_name || r.username || 'Athlète', username: r.username ?? null, avatar: r.avatar_url ?? null, sports: Array.isArray(r.sports) ? r.sports : [] }))
}

/** Suit / ne suit plus. Renvoie le nouvel état (true = suit). */
export async function toggleFollow(userId: string, currentlyFollowing: boolean): Promise<boolean> {
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error('Connecte-toi pour t’abonner.')
  if (user.id === userId) throw new Error('Tu ne peux pas t’abonner à toi-même.')
  if (currentlyFollowing) {
    await sb.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId)
    return false
  }
  await sb.from('follows').upsert({ follower_id: user.id, following_id: userId }, { onConflict: 'follower_id,following_id' })
  // Prévient (côté serveur) l'utilisateur suivi qu'il a un nouvel abonné.
  emitServerEvent('follow', { targetId: userId })
  return true
}
