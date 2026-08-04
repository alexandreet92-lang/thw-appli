// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/events — crée un événement + notifie les membres.
// Insertion via client UTILISATEUR (RLS : membre + created_by = uid). Puis
// notification 'communaute.evenement' aux membres de l'espace (hors créateur,
// filtrée par leurs réglages).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyUsers } from '@/lib/notifications/dispatch'
import type { EventKind } from '@/types/community'

export const dynamic = 'force-dynamic'

const KINDS: EventKind[] = ['sortie', 'wod', 'defi', 'course', 'autre']

interface Body {
  spaceId?: string; title?: string; description?: string | null
  kind?: string; location?: string | null; startsAt?: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const b = (await req.json().catch(() => ({}))) as Body
    const title = (b.title ?? '').trim()
    if (!b.spaceId || title.length < 1 || title.length > 120) {
      return NextResponse.json({ error: 'Titre ou espace invalide' }, { status: 400 })
    }
    const when = b.startsAt ? new Date(b.startsAt) : null
    if (!when || isNaN(when.getTime())) return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    const kind: EventKind = (KINDS as string[]).includes(b.kind ?? '') ? (b.kind as EventKind) : 'sortie'

    const { data: ev, error } = await supabase
      .from('community_events')
      .insert({
        space_id: b.spaceId, created_by: user.id, title,
        description: (b.description ?? '').toString().slice(0, 2000) || null,
        kind, location: (b.location ?? '').toString().slice(0, 200) || null,
        starts_at: when.toISOString(),
      })
      .select('id')
      .single()
    if (error || !ev) return NextResponse.json({ error: 'Création impossible (accès refusé ?)' }, { status: 403 })

    // Le créateur est aussi RSVP « je viens » par défaut.
    await supabase.from('community_event_rsvps').insert({ event_id: ev.id, user_id: user.id, status: 'going' }).then(() => {}, () => {})

    // Notification aux membres (best-effort).
    try {
      const svc = createServiceClient()
      const [{ data: mem }, { data: sp }, { data: meProf }] = await Promise.all([
        svc.from('community_members').select('user_id').eq('space_id', b.spaceId),
        svc.from('community_spaces').select('name').eq('id', b.spaceId).maybeSingle(),
        svc.from('profiles').select('full_name, first_name').eq('id', user.id).maybeSingle(),
      ])
      const memberIds = (mem ?? []).map((m: { user_id: string }) => m.user_id).filter(id => id !== user.id)
      const spaceName = (sp?.name as string) ?? 'un espace'
      const authorName = ((meProf?.full_name as string) || (meProf?.first_name as string) || 'Un membre').trim()
      const dateLabel = when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      if (memberIds.length > 0) {
        await notifyUsers(memberIds, 'communaute.evenement', {
          title: `Nouvel événement dans ${spaceName}`,
          body: `${authorName} organise « ${title} » — ${dateLabel}`,
          url: '/community',
          dedupKey: `comm-event-${ev.id}`,
          once: true,
        })
      }
    } catch { /* best-effort */ }

    return NextResponse.json({ id: ev.id }, { status: 201 })
  } catch (e) {
    console.error('[community/events] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
