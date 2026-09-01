// ══════════════════════════════════════════════════════════════════
// ÉVÉNEMENTS de notification INTER-UTILISATEURS — source de vérité du
// TEXTE + de la DESTINATION (link) de chaque notif déclenchée par l'action
// d'un AUTRE utilisateur. Émis CÔTÉ SERVEUR (client service) car la RLS
// interdit d'écrire une notif pour autrui.
//
// Chaque fonction : résout le(s) destinataire(s), puis notifyUser(key, url…).
// Le `url` devient à la fois le lien in-app (router.push) et la destination
// du clic sur la push (sw.js data.url).
// ══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { notifyUser, notifyUsers } from '@/lib/notifications/dispatch'

async function nameOf(sb: ReturnType<typeof createServiceClient>, userId: string): Promise<string> {
  try {
    const { data } = await sb.from('profiles').select('full_name, first_name').eq('id', userId).maybeSingle()
    const p = data as { full_name?: string; first_name?: string } | null
    return (p?.full_name || p?.first_name || 'Ton athlète').trim()
  } catch { return 'Ton athlète' }
}

/** Coach (accepté) d'un athlète, ou null. */
async function coachOf(sb: ReturnType<typeof createServiceClient>, athleteId: string): Promise<string | null> {
  try {
    const { data } = await sb.from('coach_athlete').select('coach_id').eq('athlete_id', athleteId).eq('status', 'accepted').maybeSingle()
    return (data as { coach_id?: string } | null)?.coach_id ?? null
  } catch { return null }
}

/** Abonnés (followers) d'un utilisateur. */
async function followersOf(sb: ReturnType<typeof createServiceClient>, userId: string): Promise<string[]> {
  try {
    const { data } = await sb.from('follows').select('follower_id').eq('following_id', userId)
    return (data ?? []).map((r: { follower_id: string }) => r.follower_id)
  } catch { return [] }
}

const day = () => new Date().toISOString().slice(0, 10)

// ── COACH ENTRANT ─────────────────────────────────────────────────

/** Un athlète a enregistré une activité → prévient son coach (+ ses abonnés). */
export async function onAthleteActivity(athleteId: string, opts: { activityId?: string; sportLabel?: string } = {}): Promise<void> {
  const sb = createServiceClient()
  const [name, coachId, followers] = await Promise.all([nameOf(sb, athleteId), coachOf(sb, athleteId), followersOf(sb, athleteId)])
  const sport = opts.sportLabel ? ` (${opts.sportLabel})` : ''
  if (coachId) {
    await notifyUser(coachId, 'coach_in.activite', {
      title: `${name} a enregistré une séance`,
      body: `Nouvelle activité${sport} à consulter.`,
      url: `/coach/athlete?id=${athleteId}&tab=data`,
      dedupKey: `coach-act-${athleteId}-${opts.activityId ?? day()}`,
    })
  }
  if (followers.length) {
    // Deep-link : le profil de l'ami, avec l'activité ouverte si on la connaît.
    const url = opts.activityId ? `/u/${athleteId}?activity=${opts.activityId}` : `/u/${athleteId}`
    await notifyUsers(followers, 'social.activite_ami', {
      title: `${name} vient de s'entraîner`,
      body: `A enregistré une nouvelle activité${sport}. Va voir son profil.`,
      url,
      dedupKey: `friend-act-${athleteId}-${opts.activityId ?? day()}`,
    })
  }
}

/** Un athlète a envoyé un message à son coach → prévient le coach. */
export async function onAthleteMessage(coachId: string, athleteId: string, preview: string): Promise<void> {
  const sb = createServiceClient()
  const name = await nameOf(sb, athleteId)
  await notifyUser(coachId, 'coach_in.message', {
    title: `Message de ${name}`,
    body: preview.length > 90 ? preview.slice(0, 90) + '…' : preview,
    url: `/coach/messages?thread=${athleteId}`,
    dedupKey: `coach-msg-${athleteId}`,
  })
}

/** Un athlète a déclaré une blessure → prévient son coach. */
export async function onAthleteInjury(athleteId: string, opts: { zone?: string } = {}): Promise<void> {
  const sb = createServiceClient()
  const coachId = await coachOf(sb, athleteId)
  if (!coachId) return
  const name = await nameOf(sb, athleteId)
  await notifyUser(coachId, 'coach_in.blessure', {
    title: `${name} a déclaré une blessure`,
    body: opts.zone ? `Zone : ${opts.zone}. À prendre en compte dans sa charge.` : 'À prendre en compte dans sa charge.',
    url: `/coach/athlete?id=${athleteId}`,
    dedupKey: `coach-inj-${athleteId}-${day()}`,
  })
}

/** Un athlète a rejoint le roster (invitation acceptée) → prévient le coach. */
export async function onAthleteJoined(coachId: string, athleteId: string): Promise<void> {
  const sb = createServiceClient()
  const name = await nameOf(sb, athleteId)
  await notifyUser(coachId, 'coach_in.nouvel_athlete', {
    title: `${name} a rejoint ton roster`,
    body: 'Ouvre sa fiche pour commencer le suivi.',
    url: `/coach/athlete?id=${athleteId}`,
    dedupKey: `coach-join-${athleteId}`,
  })
}

/** Un athlète a battu un record all-time → prévient son coach. */
export async function onAthleteRecord(athleteId: string, opts: { label?: string; activityId?: string } = {}): Promise<void> {
  const sb = createServiceClient()
  const coachId = await coachOf(sb, athleteId)
  if (!coachId) return
  const name = await nameOf(sb, athleteId)
  await notifyUser(coachId, 'coach_in.record', {
    title: `${name} a battu un record`,
    body: opts.label ? `Nouveau record all-time : ${opts.label}.` : 'Nouveau record all-time enregistré.',
    url: `/coach/athlete?id=${athleteId}&tab=data`,
    dedupKey: `coach-rec-${athleteId}-${opts.activityId ?? day()}-${opts.label ?? ''}`,
  })
}

/** Cron : un athlète n'a pas fait la séance du jour → prévient son coach. */
export async function onAthleteMissedSession(coachId: string, athleteId: string, sessionTitle?: string): Promise<void> {
  const sb = createServiceClient()
  const name = await nameOf(sb, athleteId)
  await notifyUser(coachId, 'coach_in.seance_manquee', {
    title: `${name} n'a pas fait sa séance`,
    body: sessionTitle ? `« ${sessionTitle} » non enregistrée aujourd'hui.` : `Séance du jour non enregistrée.`,
    url: `/coach/athlete?id=${athleteId}`,
    dedupKey: `coach-miss-${athleteId}-${day()}`,
  })
}

// ── SOCIAL ────────────────────────────────────────────────────────

/** Quelqu'un s'abonne à un utilisateur → prévient l'utilisateur suivi. */
export async function onNewFollower(followedId: string, followerId: string): Promise<void> {
  const sb = createServiceClient()
  const name = await nameOf(sb, followerId)
  await notifyUser(followedId, 'social.abonne', {
    title: `${name} s'est abonné à toi`,
    body: 'Découvre son profil.',
    url: `/u/${followerId}`,
    dedupKey: `follow-${followerId}-${followedId}`,
  })
}

/** Propriétaire d'une activité, ou null. */
async function activityOwner(sb: ReturnType<typeof createServiceClient>, activityId: string): Promise<string | null> {
  try {
    const { data } = await sb.from('activities').select('user_id').eq('id', activityId).maybeSingle()
    return (data as { user_id?: string } | null)?.user_id ?? null
  } catch { return null }
}

/** Quelqu'un met un kudos sur ton activité → prévient le propriétaire. */
export async function onActivityKudos(activityId: string, actorId: string): Promise<void> {
  const sb = createServiceClient()
  const owner = await activityOwner(sb, activityId)
  if (!owner || owner === actorId) return
  const name = await nameOf(sb, actorId)
  await notifyUser(owner, 'social.reaction', {
    title: `${name} a réagi à ton activité`,
    body: 'Ouvre ton activité pour voir.',
    url: `/activities?id=${activityId}`,
    dedupKey: `kudos-${activityId}-${actorId}`,
  })
}

/** Quelqu'un commente ton activité → prévient le propriétaire. */
export async function onActivityComment(activityId: string, actorId: string, preview: string): Promise<void> {
  const sb = createServiceClient()
  const owner = await activityOwner(sb, activityId)
  if (!owner || owner === actorId) return
  const name = await nameOf(sb, actorId)
  await notifyUser(owner, 'social.commentaire', {
    title: `${name} a commenté ton activité`,
    body: preview.length > 90 ? preview.slice(0, 90) + '…' : preview,
    url: `/activities?id=${activityId}`,
    dedupKey: `comment-${activityId}-${actorId}-${day()}`,
  })
}
