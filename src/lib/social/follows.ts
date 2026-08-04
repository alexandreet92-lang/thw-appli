'use client'
// ══════════════════════════════════════════════════════════════════
// Abonnements sociaux (follow) + compteurs (abonnés / abonnements / coachés).
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

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
  const { data: { user } } = await sb.auth.getUser()
  if (!user || user.id === userId) return false
  const { data } = await sb.from('follows')
    .select('follower_id').eq('follower_id', user.id).eq('following_id', userId).maybeSingle()
  return !!data
}

/** Suit / ne suit plus. Renvoie le nouvel état (true = suit). */
export async function toggleFollow(userId: string, currentlyFollowing: boolean): Promise<boolean> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Connecte-toi pour t’abonner.')
  if (user.id === userId) throw new Error('Tu ne peux pas t’abonner à toi-même.')
  if (currentlyFollowing) {
    await sb.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId)
    return false
  }
  await sb.from('follows').upsert({ follower_id: user.id, following_id: userId }, { onConflict: 'follower_id,following_id' })
  return true
}
