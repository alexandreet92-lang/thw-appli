'use client'
// ══════════════════════════════════════════════════════════════════════════
// Détail d'un membre (sur-page profil) : bio, statut athlète/coach, date de
// création du COMPTE (profiles.created_at). La date d'adhésion AU GROUPE vient
// de CommunityMemberInfo.joinedAt (déjà chargé). Suivi via la table `follows`.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { amIFollowing } from '@/lib/social/follows'

export interface MemberProfileDetail {
  userId: string
  name: string
  avatar: string | null
  bio: string | null
  accountCreatedAt: string | null   // ancienneté du COMPTE sur l'app
  isCoach: boolean
  following: boolean                 // je le suis déjà ?
}

export async function getMemberProfile(userId: string): Promise<MemberProfileDetail | null> {
  const sb = createClient()
  const { data } = await sb.from('profiles')
    .select('id, full_name, first_name, avatar_url, bio, created_at, coach_subscribed')
    .eq('id', userId).maybeSingle()
  if (!data) return null
  const p = data as {
    full_name?: string | null; first_name?: string | null; avatar_url?: string | null
    bio?: string | null; created_at?: string | null; coach_subscribed?: boolean | null
  }
  let following = false
  try { following = await amIFollowing(userId) } catch { /* ignore */ }
  return {
    userId,
    name: (p.full_name || p.first_name || 'Membre').trim(),
    avatar: p.avatar_url ?? null,
    bio: p.bio ?? null,
    accountCreatedAt: p.created_at ?? null,
    isCoach: !!p.coach_subscribed,
    following,
  }
}
