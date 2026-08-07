'use client'
// ══════════════════════════════════════════════════════════════════════════
// Découverte de groupes (recherche) + demandes d'adhésion (groupes privés).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId, namesFor } from './shared'

export interface DiscoverSpace {
  id: string
  name: string
  slug: string
  description: string | null
  iconUrl: string | null
  isPublic: boolean
  memberCount: number
  myStatus: 'member' | 'requested' | 'none'
}

/** Recherche de groupes (publics + privés découvrables). */
export async function discoverSpaces(q: string): Promise<DiscoverSpace[]> {
  try {
    const res = await fetch('/api/community/discover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { spaces?: DiscoverSpace[] }
    return data.spaces ?? []
  } catch { return [] }
}

/** Demande à rejoindre un groupe privé (RLS : self_insert). */
export async function requestJoin(spaceId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient().from('community_join_requests').upsert(
    { space_id: spaceId, user_id: me, status: 'pending' }, { onConflict: 'space_id,user_id' },
  )
  return !error
}

export interface JoinRequestInfo { userId: string; name: string; avatar: string | null; createdAt: string }

/** Demandes d'adhésion en attente d'un espace (RLS : modération). */
export async function listJoinRequests(spaceId: string): Promise<JoinRequestInfo[]> {
  const { data } = await createClient()
    .from('community_join_requests')
    .select('user_id, created_at')
    .eq('space_id', spaceId).eq('status', 'pending')
    .order('created_at', { ascending: true }).limit(100)
  const rows = (data ?? []) as { user_id: string; created_at: string }[]
  const people = await namesFor(rows.map(r => r.user_id))
  return rows.map(r => ({
    userId: r.user_id,
    name: people.get(r.user_id)?.name ?? 'Membre',
    avatar: people.get(r.user_id)?.avatar ?? null,
    createdAt: r.created_at,
  }))
}
