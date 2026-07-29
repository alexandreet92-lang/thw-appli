// ══════════════════════════════════════════════════════════════
// MESSAGERIE coach ↔ athlète — helpers (côté client, RLS).
// Un fil = une paire (coach_id, athlete_id). Fonctionne dans les deux sens :
// côté coach (coach_id = moi) et côté athlète (athlete_id = moi).
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { listMyAthletes, listMyCoaches } from './relationships'

export interface Msg {
  id: string
  coach_id: string
  athlete_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
  mine: boolean
}
export interface Thread {
  otherId: string       // l'autre participant (athlète si je suis coach, coach sinon)
  coachId: string
  athleteId: string
  name: string
  avatar: string | null
  lastBody: string
  lastAt: string
  unread: number
}

async function uid(): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non connecté')
  return user.id
}

interface Row { id: string; coach_id: string; athlete_id: string; sender_id: string; body: string; created_at: string; read_at: string | null }

// Fils côté COACH : une entrée par athlète du roster (même sans message).
export async function getCoachThreads(): Promise<Thread[]> {
  const sb = createClient()
  const me = await uid()
  const [{ data: msgs }, athletes] = await Promise.all([
    sb.from('coach_messages').select('*').eq('coach_id', me).order('created_at', { ascending: false }),
    listMyAthletes(),
  ])
  const rows = (msgs ?? []) as Row[]
  const byOther = new Map<string, { last: Row | null; unread: number }>()
  for (const m of rows) {
    const cur = byOther.get(m.athlete_id) ?? { last: null, unread: 0 }
    if (!cur.last) cur.last = m
    if (m.sender_id !== me && !m.read_at) cur.unread++
    byOther.set(m.athlete_id, cur)
  }
  return athletes.map(a => {
    const t = byOther.get(a.id)
    return { otherId: a.id, coachId: me, athleteId: a.id, name: a.full_name || a.first_name || 'Athlète', avatar: a.avatar_url, lastBody: t?.last?.body ?? '', lastAt: t?.last?.created_at ?? '', unread: t?.unread ?? 0 }
  }).sort((x, y) => (y.lastAt || '').localeCompare(x.lastAt || ''))
}

// Fils côté ATHLÈTE : une entrée par coach accepté (nom via la RLS réciproque).
export async function getAthleteThreads(): Promise<Thread[]> {
  const sb = createClient()
  const me = await uid()
  const [{ data: msgs }, coaches] = await Promise.all([
    sb.from('coach_messages').select('*').eq('athlete_id', me).order('created_at', { ascending: false }),
    listMyCoaches(),
  ])
  const rows = (msgs ?? []) as Row[]
  const coachIds = coaches.map(c => c.coachId)
  const profs = coachIds.length
    ? (await sb.from('profiles').select('id, full_name, first_name, avatar_url').in('id', coachIds)).data ?? []
    : []
  const byId = new Map(profs.map(p => [p.id as string, p as Record<string, unknown>]))
  const byOther = new Map<string, { last: Row | null; unread: number }>()
  for (const m of rows) {
    const cur = byOther.get(m.coach_id) ?? { last: null, unread: 0 }
    if (!cur.last) cur.last = m
    if (m.sender_id !== me && !m.read_at) cur.unread++
    byOther.set(m.coach_id, cur)
  }
  return coaches.map(c => {
    const p = byId.get(c.coachId)
    const t = byOther.get(c.coachId)
    return { otherId: c.coachId, coachId: c.coachId, athleteId: me, name: (p?.full_name as string) || (p?.first_name as string) || 'Coach', avatar: (p?.avatar_url as string | null) ?? null, lastBody: t?.last?.body ?? '', lastAt: t?.last?.created_at ?? '', unread: t?.unread ?? 0 }
  }).sort((x, y) => (y.lastAt || '').localeCompare(x.lastAt || ''))
}

export async function getMessages(coachId: string, athleteId: string): Promise<Msg[]> {
  const sb = createClient()
  const me = await uid()
  const { data } = await sb.from('coach_messages').select('*')
    .eq('coach_id', coachId).eq('athlete_id', athleteId)
    .order('created_at', { ascending: true }).limit(500)
  return ((data ?? []) as Row[]).map(m => ({ ...m, mine: m.sender_id === me }))
}

export async function sendMessage(coachId: string, athleteId: string, body: string): Promise<void> {
  const sb = createClient()
  const me = await uid()
  const clean = body.trim().slice(0, 4000)
  if (!clean) return
  const { error } = await sb.from('coach_messages').insert({ coach_id: coachId, athlete_id: athleteId, sender_id: me, body: clean })
  if (error) throw new Error(error.message)
}

// Marque comme lus les messages du fil qui me sont adressés.
export async function markThreadRead(coachId: string, athleteId: string): Promise<void> {
  const sb = createClient()
  const me = await uid()
  await sb.from('coach_messages').update({ read_at: new Date().toISOString() })
    .eq('coach_id', coachId).eq('athlete_id', athleteId).neq('sender_id', me).is('read_at', null)
}

// Total de messages non lus qui me sont adressés (coach ou athlète).
export async function getUnreadTotal(): Promise<number> {
  const sb = createClient()
  const me = await uid()
  const { count } = await sb.from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', me).is('read_at', null).or(`coach_id.eq.${me},athlete_id.eq.${me}`)
  return count ?? 0
}
