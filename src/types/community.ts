// ══════════════════════════════════════════════════════════════════════════
// Types de la COMMUNAUTÉ « type Discord » (Phase 1).
// Modèle : Espace (≈ serveur) → Canaux (≈ channels texte/voix) → Messages.
// Les champs DB (snake_case) sont mappés en camelCase par la lib src/lib/community.
// ══════════════════════════════════════════════════════════════════════════

import type { Block, SportType } from '@/app/planning/page'
import type { NutritionItem } from '@/components/planning/SessionEditor'

export type SpaceKind = 'official' | 'user'
export type ChannelKind = 'text' | 'voice'
export type MemberRole = 'owner' | 'admin' | 'coach' | 'member'
export type CommunitySport = 'running' | 'cycling' | 'hyrox' | 'gym' | 'triathlon' | 'trail' | 'combat'

/** Un espace communautaire, enrichi de l'appartenance de l'utilisateur courant. */
export interface CommunitySpace {
  id: string
  name: string
  slug: string
  description: string | null
  kind: SpaceKind
  sport: CommunitySport | null
  iconEmoji: string
  iconUrl: string | null
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

/** Résumé dénormalisé d'une activité partagée (snapshot — les autres membres ne
 *  peuvent pas lire la ligne `activities` d'autrui, RLS oblige). */
export interface ActivityRef {
  id: string
  ownerId: string
  sport: string
  title: string | null
  distanceM: number | null
  durationS: number | null
  startedAt: string
  tss: number | null
  avgHr: number | null
  avgPaceSKm: number | null
  isRace: boolean
  // Enrichissements pour la carte + la surpage (snapshot : les autres membres ne
  // peuvent pas lire l'activité d'origine).
  polyline?: string | null       // tracé encodé (summary_polyline)
  elevation?: number[] | null    // altitudes échantillonnées (profil)
  elevGainM?: number | null
  difficulty?: number | null     // 0–10
  feeling?: number | null        // 0–5
}

/** Snapshot dénormalisé d'une séance de la bibliothèque partagée dans un canal.
 *  On embarque tout le contenu (blocs, nutrition) car les autres membres ne
 *  peuvent pas lire la ligne `session_favorites` d'autrui (RLS) : le destinataire
 *  doit pouvoir l'afficher, la copier ou la planifier sans lecture DB. */
export interface SessionRef {
  sport: SportType
  title: string
  durationMin: number | null
  rpe: number | null
  trainingTypes: string[] | null
  notes: string | null
  blocks: Block[]
  nutritionItems: NutritionItem[] | null
}

/** Pièce jointe d'un message : image, fichier, activité, ou séance partagée. */
export interface CommunityAttachment {
  type: 'image' | 'file' | 'activity' | 'session'
  url?: string          // image / fichier
  name?: string
  size?: number
  activity?: ActivityRef // type === 'activity'
  session?: SessionRef   // type === 'session'
}

/** Agrégat de réaction sur un message (un emoji + son compte). */
export interface CommunityReaction {
  emoji: string
  count: number
  mine: boolean
}

/** Aperçu léger du message auquel on répond. */
export interface ReplyPreview {
  id: string
  authorName: string
  body: string
  hasAttachment: boolean
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
  attachments: CommunityAttachment[]
  reactions: CommunityReaction[]
  replyPreview: ReplyPreview | null
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

export type EventKind = 'sortie' | 'wod' | 'defi' | 'course' | 'autre'
export type RsvpStatus = 'going' | 'maybe' | 'no'

/** Un événement / défi d'un espace, enrichi des compteurs RSVP + ma réponse. */
export interface CommunityEvent {
  id: string
  spaceId: string
  createdBy: string
  title: string
  description: string | null
  kind: EventKind
  location: string | null
  startsAt: string
  createdAt: string
  authorName: string
  goingCount: number
  maybeCount: number
  myRsvp: RsvpStatus | null
}
