// ══════════════════════════════════════════════════════════════════
// POST /api/notifications/event — déclenche une notification INTER-UTILISATEUR
// à partir d'une action du client (activité enregistrée, message au coach,
// blessure, abonnement, invitation acceptée). L'ACTEUR = l'utilisateur
// authentifié (auth.uid) : on ne peut notifier QUE à propos de SA propre
// action. Les émetteurs (events.ts) tournent en client service (bypass RLS).
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  onAthleteActivity, onAthleteMessage, onAthleteInjury, onAthleteJoined, onNewFollower,
  onActivityKudos, onActivityComment,
} from '@/lib/notifications/events'

export async function POST(req: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    const actorId = user.id

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const event = typeof body.event === 'string' ? body.event : ''
    const svc = createServiceClient()

    switch (event) {
      case 'activity_saved': {
        await onAthleteActivity(actorId, {
          activityId: typeof body.activityId === 'string' ? body.activityId : undefined,
          sportLabel: typeof body.sportLabel === 'string' ? body.sportLabel : undefined,
        })
        break
      }
      case 'coach_message': {
        // L'acteur (athlète) a envoyé un message à son coach. On vérifie le lien.
        const coachId = typeof body.coachId === 'string' ? body.coachId : ''
        if (!coachId) return NextResponse.json({ ok: false, error: 'coachId requis' }, { status: 400 })
        const { data: rel } = await svc.from('coach_athlete').select('id')
          .eq('coach_id', coachId).eq('athlete_id', actorId).eq('status', 'accepted').maybeSingle()
        if (!rel) break   // pas de lien → on n'émet pas
        await onAthleteMessage(coachId, actorId, typeof body.preview === 'string' ? body.preview : 'Nouveau message')
        break
      }
      case 'injury': {
        await onAthleteInjury(actorId, { zone: typeof body.zone === 'string' ? body.zone : undefined })
        break
      }
      case 'joined': {
        // L'acteur (athlète) vient d'accepter une invitation → notifie son coach.
        const { data: rel } = await svc.from('coach_athlete').select('coach_id')
          .eq('athlete_id', actorId).eq('status', 'accepted').maybeSingle()
        const coachId = (rel as { coach_id?: string } | null)?.coach_id
        if (coachId) await onAthleteJoined(coachId, actorId)
        break
      }
      case 'follow': {
        // L'acteur suit `targetId`. On vérifie que le follow existe vraiment.
        const targetId = typeof body.targetId === 'string' ? body.targetId : ''
        if (!targetId) return NextResponse.json({ ok: false, error: 'targetId requis' }, { status: 400 })
        const { data: f } = await svc.from('follows').select('follower_id')
          .eq('follower_id', actorId).eq('following_id', targetId).maybeSingle()
        if (!f) break
        await onNewFollower(targetId, actorId)
        break
      }
      case 'kudos': {
        // L'acteur a mis un kudos sur une activité. onActivityKudos vérifie le
        // propriétaire (≠ acteur) côté service avant d'émettre.
        const activityId = typeof body.activityId === 'string' ? body.activityId : ''
        if (!activityId) return NextResponse.json({ ok: false, error: 'activityId requis' }, { status: 400 })
        await onActivityKudos(activityId, actorId)
        break
      }
      case 'comment': {
        const activityId = typeof body.activityId === 'string' ? body.activityId : ''
        if (!activityId) return NextResponse.json({ ok: false, error: 'activityId requis' }, { status: 400 })
        await onActivityComment(activityId, actorId, typeof body.preview === 'string' ? body.preview : 'Nouveau commentaire')
        break
      }
      default:
        return NextResponse.json({ ok: false, error: 'event inconnu' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
