// ══════════════════════════════════════════════════════════════
// COACH — Roster enrichi pour la page Athlètes. Agrège en quelques requêtes
// groupées (IN) les signaux de chaque athlète : forme, dernière activité,
// charge 7 j (sparkline), adhérence au plan, fatigue, blessure active,
// prochaine course, messages non lus, groupe, note privée.
// Tout passe par la RLS coach (*_coach_read / coach_athlete).
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'

export type Forme = 'ok' | 'warn' | 'injured' | 'inactive'

export interface RosterAthlete {
  id: string                 // athlete user_id
  linkId: string
  name: string
  avatar: string | null
  sports: string[]
  level: string | null
  group: string | null
  note: string | null
  status: Forme
  reason: string | null      // pourquoi en alerte (bandeau priorité)
  lastActivity: string | null
  lastDays: number           // jours depuis la dernière activité (Infinity si aucune)
  load7: number[]            // TSS par jour, 7 derniers jours
  tss7: number               // somme
  fatigue: number | null     // moyenne 7 j
  adhDone: number
  adhTotal: number
  activeInjuries: number
  race: { name: string; days: number } | null
  unread: number
}

async function uid(): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non connecté')
  return user.id
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)
function mondayOf(d: Date): string {
  const x = new Date(d); const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow); return dayKey(x)
}
const RESOLVED = ['guérie', 'guerie', 'resolved', 'résolue', 'resolue', 'terminée', 'terminee', 'clos', 'closed']
const DONE = ['done', 'completed', 'valide', 'validé', 'validée', 'fait', 'faite', 'terminee', 'terminée']

export async function getRoster(): Promise<RosterAthlete[]> {
  const sb = createClient()
  const me = await uid()

  const { data: links } = await sb.from('coach_athlete')
    .select('id, athlete_id, group_name, coach_note, accepted_at')
    .eq('coach_id', me).eq('status', 'accepted')
  const rows = (links ?? []) as { id: string; athlete_id: string; group_name: string | null; coach_note: string | null }[]
  if (!rows.length) return []
  const ids = rows.map(r => r.athlete_id)

  const now = Date.now()
  const since30 = new Date(now - 30 * 86400_000).toISOString()
  const since7d = new Date(now - 7 * 86400_000).toISOString().slice(0, 10)
  const monday = mondayOf(new Date())
  const today = new Date().toISOString().slice(0, 10)

  const [profRes, actRes, recRes, injRes, planRes, raceRes, msgRes] = await Promise.all([
    sb.from('profiles').select('id, full_name, first_name, avatar_url, sports, level').in('id', ids),
    sb.from('activities').select('user_id, started_at, tss, moving_time_s').in('user_id', ids).gte('started_at', since30).order('started_at', { ascending: false }),
    sb.from('recovery_checkin').select('user_id, fatigue, soreness, sleep_quality').in('user_id', ids).gte('date', since7d),
    sb.from('injuries').select('user_id, status, resolved_date').in('user_id', ids),
    sb.from('planned_sessions').select('user_id, status').in('user_id', ids).eq('week_start', monday),
    sb.from('race_events').select('user_id, name, start_date').in('user_id', ids).gte('start_date', today).order('start_date', { ascending: true }),
    sb.from('coach_messages').select('athlete_id, sender_id, read_at').eq('coach_id', me).in('athlete_id', ids).is('read_at', null),
  ])

  const profById = new Map((profRes.data ?? []).map(p => [p.id as string, p as Record<string, unknown>]))
  const actAll = actRes.data
  const acts = (actAll ?? []) as { user_id: string; started_at: string; tss: number | null; moving_time_s: number | null }[]
  const recs = (recRes.data ?? []) as { user_id: string; fatigue: number | null; soreness: number | null; sleep_quality: number | null }[]
  const injs = (injRes.data ?? []) as { user_id: string; status: string | null; resolved_date: string | null }[]
  const plans = (planRes.data ?? []) as { user_id: string; status: string | null }[]
  const races = (raceRes.data ?? []) as { user_id: string; name: string | null; start_date: string }[]
  const msgs = (msgRes.data ?? []) as { athlete_id: string; sender_id: string; read_at: string | null }[]

  // Index par athlète.
  const day0 = new Date(now - 6 * 86400_000); day0.setHours(0, 0, 0, 0)
  const bucketIndex = (iso: string) => {
    const d = new Date(iso); const diff = Math.floor((d.getTime() - day0.getTime()) / 86400_000)
    return diff >= 0 && diff <= 6 ? diff : -1
  }

  return rows.map(r => {
    const id = r.athlete_id
    const p = profById.get(id)
    const myActs = acts.filter(a => a.user_id === id)
    const load7 = [0, 0, 0, 0, 0, 0, 0]
    for (const a of myActs) {
      const bi = a.started_at ? bucketIndex(a.started_at) : -1
      if (bi >= 0) load7[bi] += Number(a.tss ?? (a.moving_time_s ? Math.round(Number(a.moving_time_s) / 60) : 0)) || 0
    }
    const tss7 = load7.reduce((s, x) => s + x, 0)
    const lastAt = myActs[0]?.started_at ?? null
    const lastDays = lastAt ? Math.floor((now - new Date(lastAt).getTime()) / 86400_000) : Infinity

    const myRec = recs.filter(x => x.user_id === id)
    const fatVals = myRec.map(x => Number(x.fatigue)).filter(n => Number.isFinite(n) && n > 0)
    const fatigue = fatVals.length ? fatVals.reduce((s, x) => s + x, 0) / fatVals.length : null
    const soreVals = myRec.map(x => Number(x.soreness)).filter(n => Number.isFinite(n) && n > 0)
    const soreAvg = soreVals.length ? soreVals.reduce((s, x) => s + x, 0) / soreVals.length : 0

    const activeInjuries = injs.filter(x => x.user_id === id && !x.resolved_date && !(x.status && RESOLVED.includes(x.status.toLowerCase()))).length

    const myPlan = plans.filter(x => x.user_id === id)
    const adhTotal = myPlan.length
    const adhDone = myPlan.filter(x => x.status && DONE.includes(x.status.toLowerCase())).length

    const race = races.find(x => x.user_id === id)
    const raceObj = race ? { name: race.name || 'Course', days: Math.max(0, Math.ceil((new Date(race.start_date + 'T00:00:00').getTime() - now) / 86400_000)) } : null

    const unread = msgs.filter(m => m.athlete_id === id && m.sender_id !== me).length

    // Forme + raison (priorité : blessé > inactif > attention > ok).
    let status: Forme = 'ok'; let reason: string | null = null
    if (activeInjuries > 0) { status = 'injured'; reason = `${activeInjuries} blessure${activeInjuries > 1 ? 's' : ''} active${activeInjuries > 1 ? 's' : ''}.` }
    else if (lastDays > 10) { status = 'inactive'; reason = lastDays === Infinity ? 'Aucune activité enregistrée.' : `Inactif depuis ${lastDays} jours.` }
    else if ((fatigue ?? 0) >= 4 || soreAvg >= 4) { status = 'warn'; reason = 'Fatigue / courbatures élevées sur 7 jours.' }

    const name = (p?.full_name as string) || (p?.first_name as string) || 'Athlète'
    return {
      id, linkId: r.id, name, avatar: (p?.avatar_url as string | null) ?? null,
      sports: Array.isArray(p?.sports) ? (p!.sports as string[]) : [],
      level: (p?.level as string | null) ?? null,
      group: r.group_name, note: r.coach_note,
      status, reason,
      lastActivity: lastAt, lastDays,
      load7, tss7, fatigue,
      adhDone, adhTotal, activeInjuries,
      race: raceObj, unread,
    }
  })
}

// Assigne / retire un athlète d'un groupe (nom libre ; null = aucun).
export async function setAthleteGroup(linkId: string, group: string | null): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('coach_athlete').update({ group_name: group }).eq('id', linkId)
  if (error) throw new Error(error.message)
}

// Note privée du coach sur un athlète.
export async function setAthleteNote(linkId: string, note: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('coach_athlete').update({ coach_note: note.slice(0, 2000) || null }).eq('id', linkId)
  if (error) throw new Error(error.message)
}
