'use client'
// ══════════════════════════════════════════════════════════════════════════
// Événements / défis d'un espace (sorties de groupe, WOD, courses…) + RSVP.
// Création via la route serveur (notifie les membres) ; RSVP en direct (RLS).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId, namesFor } from './shared'
import type { CommunityEvent, EventKind, RsvpStatus } from '@/types/community'

interface EventRow {
  id: string; space_id: string; created_by: string; title: string; description: string | null
  kind: EventKind; location: string | null; starts_at: string; created_at: string
}

/** Événements à venir (et récents) d'un espace, avec compteurs RSVP + ma réponse. */
export async function listSpaceEvents(spaceId: string): Promise<CommunityEvent[]> {
  const sb = createClient()
  const me = await myId()
  const { data } = await sb
    .from('community_events')
    .select('id, space_id, created_by, title, description, kind, location, starts_at, created_at')
    .eq('space_id', spaceId)
    .order('starts_at', { ascending: true })
  const rows = (data ?? []) as EventRow[]
  if (rows.length === 0) return []

  const [people, rsvpRes] = await Promise.all([
    namesFor(rows.map(r => r.created_by)),
    sb.from('community_event_rsvps').select('event_id, user_id, status').in('event_id', rows.map(r => r.id)),
  ])
  const rsvps = (rsvpRes.data ?? []) as { event_id: string; user_id: string; status: RsvpStatus }[]
  const going = new Map<string, number>(), maybe = new Map<string, number>(), mine = new Map<string, RsvpStatus>()
  for (const r of rsvps) {
    if (r.status === 'going') going.set(r.event_id, (going.get(r.event_id) ?? 0) + 1)
    if (r.status === 'maybe') maybe.set(r.event_id, (maybe.get(r.event_id) ?? 0) + 1)
    if (me && r.user_id === me) mine.set(r.event_id, r.status)
  }
  return rows.map((r): CommunityEvent => ({
    id: r.id, spaceId: r.space_id, createdBy: r.created_by, title: r.title, description: r.description,
    kind: r.kind, location: r.location, startsAt: r.starts_at, createdAt: r.created_at,
    authorName: people.get(r.created_by)?.name ?? 'Membre',
    goingCount: going.get(r.id) ?? 0, maybeCount: maybe.get(r.id) ?? 0, myRsvp: mine.get(r.id) ?? null,
  }))
}

/** Crée un événement (via la route serveur → notifie les membres). */
export async function createEvent(input: {
  spaceId: string; title: string; description?: string | null; kind: EventKind; location?: string | null; startsAt: string
}): Promise<boolean> {
  const res = await fetch('/api/community/events', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  return res.ok
}

/** Pose / change / retire ma réponse à un événement. status=null → retire. */
export async function setRsvp(eventId: string, status: RsvpStatus | null): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const sb = createClient()
  if (status === null) {
    const { error } = await sb.from('community_event_rsvps').delete().eq('event_id', eventId).eq('user_id', me)
    return !error
  }
  const { error } = await sb.from('community_event_rsvps')
    .upsert({ event_id: eventId, user_id: me, status }, { onConflict: 'event_id,user_id' })
  return !error
}

/** Supprime un événement (créateur ou owner/admin via RLS). */
export async function deleteEvent(eventId: string): Promise<boolean> {
  const { error } = await createClient().from('community_events').delete().eq('id', eventId)
  return !error
}
