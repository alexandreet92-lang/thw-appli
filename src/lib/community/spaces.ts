'use client'
// ══════════════════════════════════════════════════════════════════════════
// Espaces & membres de la Communauté.
// La RLS ne renvoie que les espaces publics OU dont l'utilisateur est membre.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId, namesFor } from './shared'
import type {
  CommunitySpace, CommunityMemberInfo, SpaceKind, MemberRole, CommunitySport,
} from '@/types/community'

interface SpaceRow {
  id: string
  name: string
  slug: string
  description: string | null
  kind: SpaceKind
  sport: CommunitySport | null
  icon_emoji: string
  banner_url: string | null
  is_public: boolean
  created_by: string | null
  created_at: string
}

/**
 * Liste tous les espaces visibles (officiels/publics + ceux dont je suis membre),
 * enrichis de mon rôle et du nombre de membres. Les espaces officiels d'abord.
 */
export async function listSpaces(): Promise<CommunitySpace[]> {
  const sb = createClient()
  const me = await myId()

  const [{ data: spacesData }, { data: memberData }] = await Promise.all([
    sb.from('community_spaces')
      .select('id, name, slug, description, kind, sport, icon_emoji, banner_url, is_public, created_by, created_at')
      .order('kind', { ascending: true })   // 'official' < 'user'
      .order('created_at', { ascending: true }),
    sb.from('community_members').select('space_id, user_id, role'),
  ])

  const spaces = (spacesData ?? []) as SpaceRow[]
  const members = (memberData ?? []) as { space_id: string; user_id: string; role: MemberRole }[]

  // Comptage des membres + rôle de l'utilisateur courant, en mémoire (RLS limite
  // déjà `members` aux espaces publics / dont je suis membre).
  const counts = new Map<string, number>()
  const myRoles = new Map<string, MemberRole>()
  for (const m of members) {
    counts.set(m.space_id, (counts.get(m.space_id) ?? 0) + 1)
    if (me && m.user_id === me) myRoles.set(m.space_id, m.role)
  }

  return spaces.map((s): CommunitySpace => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    kind: s.kind,
    sport: s.sport,
    iconEmoji: s.icon_emoji,
    bannerUrl: s.banner_url,
    isPublic: s.is_public,
    createdBy: s.created_by,
    createdAt: s.created_at,
    isMember: myRoles.has(s.id),
    myRole: myRoles.get(s.id) ?? null,
    memberCount: counts.get(s.id) ?? 0,
  }))
}

/** Rejoint un espace public (rôle 'member'). Retourne true si succès. */
export async function joinSpace(spaceId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient()
    .from('community_members')
    .insert({ space_id: spaceId, user_id: me, role: 'member' })
  return !error
}

/** Quitte un espace (retire ma propre appartenance). Retourne true si succès. */
export async function leaveSpace(spaceId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient()
    .from('community_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', me)
  return !error
}

/** Liste des membres d'un espace, avec nom/avatar. */
export async function listSpaceMembers(spaceId: string): Promise<CommunityMemberInfo[]> {
  const { data } = await createClient()
    .from('community_members')
    .select('user_id, role, joined_at')
    .eq('space_id', spaceId)
    .order('joined_at', { ascending: true })
  const rows = (data ?? []) as { user_id: string; role: MemberRole }[]
  const people = await namesFor(rows.map(r => r.user_id))
  return rows.map((r): CommunityMemberInfo => ({
    userId: r.user_id,
    role: r.role,
    name: people.get(r.user_id)?.name ?? 'Membre',
    avatar: people.get(r.user_id)?.avatar ?? null,
  }))
}
