// ══════════════════════════════════════════════════════════════════════════
// Types de la COMMUNAUTÉ « type Discord » (Phase 1).
// Modèle : Espace (≈ serveur) → Canaux (≈ channels texte/voix) → Messages.
// Les champs DB (snake_case) sont mappés en camelCase par la lib src/lib/community.
// ══════════════════════════════════════════════════════════════════════════

export type SpaceKind = 'official' | 'user'
export type ChannelKind = 'text' | 'voice'
export type MemberRole = 'owner' | 'admin' | 'coach' | 'member'
export type CommunitySport = 'running' | 'cycling' | 'hyrox' | 'gym'

/** Un espace communautaire, enrichi de l'appartenance de l'utilisateur courant. */
export interface CommunitySpace {
  id: string
  name: string
  slug: string
  description: string | null
  kind: SpaceKind
  sport: CommunitySport | null
  iconEmoji: string
  bannerUrl: string | null
  isPublic: boolean
  createdBy: string | null
  createdAt: string
  // ── Dérivés ──
  isMember: boolean
  myRole: MemberRole | null
  memberCount: number
}

/** Un canal d'un espace. */
export interface CommunityChannel {
  id: string
  spaceId: string
  name: string
  topic: string | null
  position: number
  kind: ChannelKind
}

/** Un message d'un canal, avec l'auteur résolu (nom/avatar). */
export interface CommunityMessage {
  id: string
  channelId: string
  authorId: string
  body: string
  createdAt: string
  editedAt: string | null
  replyTo: string | null
  authorName: string
  authorAvatar: string | null
}

/** Un membre d'un espace (liste des membres). */
export interface CommunityMemberInfo {
  userId: string
  role: MemberRole
  name: string
  avatar: string | null
}
