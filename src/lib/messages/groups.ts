'use client'
// ══════════════════════════════════════════════════════════════
// GROUPES DE MESSAGES — création, membres, messages. Coach qui crée = admin
// (asAdmin=true → ajoute/retire) ; athlète qui crée = groupe plat (asAdmin=false,
// le créateur est rétrogradé « member » après le bootstrap → aucun chef).
// ══════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

export interface GroupSummary {
  id: string
  name: string
  adminManaged: boolean
  createdBy: string
  myRole: 'admin' | 'member'
  memberCount: number
  lastBody: string | null
  lastAt: string | null
}
export interface GroupMember {
  userId: string
  role: 'admin' | 'member'
  name: string
  avatar: string | null
}
export interface GroupMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
  senderName: string
  senderAvatar: string | null
}
export interface Addable { id: string; name: string; avatar: string | null }

async function myId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}

// Crée un groupe et renvoie son id. asAdmin=true (interface coach) → le créateur
// reste admin ; asAdmin=false (interface athlète) → rétrogradé « member ».
export async function createGroup(name: string, memberIds: string[], asAdmin: boolean): Promise<string | null> {
  const sb = createClient()
  const me = await myId()
  if (!me) return null
  const { data: g, error } = await sb.from('message_groups')
    .insert({ name: name.trim() || 'Groupe', created_by: me, admin_managed: asAdmin })
    .select('id').single()
  if (error || !g) return null
  const gid = (g as { id: string }).id
  // 1) le créateur d'abord (admin, pour pouvoir insérer les autres via RLS)
  await sb.from('message_group_members').insert({ group_id: gid, user_id: me, role: 'admin' })
  // 2) les autres membres
  const others = memberIds.filter(id => id && id !== me)
  if (others.length) {
    await sb.from('message_group_members').insert(others.map(id => ({ group_id: gid, user_id: id, role: 'member' as const })))
  }
  // 3) groupe athlète → plus de chef : on rétrograde le créateur
  if (!asAdmin) await sb.from('message_group_members').update({ role: 'member' }).eq('group_id', gid).eq('user_id', me)
  return gid
}

export async function listMyGroups(): Promise<GroupSummary[]> {
  const sb = createClient()
  const me = await myId()
  if (!me) return []
  const { data: mine } = await sb.from('message_group_members').select('group_id, role').eq('user_id', me)
  const rows = (mine ?? []) as { group_id: string; role: 'admin' | 'member' }[]
  if (rows.length === 0) return []
  const ids = rows.map(r => r.group_id)
  const roleById = new Map(rows.map(r => [r.group_id, r.role]))
  const [{ data: groups }, { data: members }, { data: msgs }] = await Promise.all([
    sb.from('message_groups').select('id, name, admin_managed, created_by').in('id', ids),
    sb.from('message_group_members').select('group_id').in('group_id', ids),
    sb.from('message_group_messages').select('group_id, body, created_at').in('group_id', ids).order('created_at', { ascending: false }),
  ])
  const countBy = new Map<string, number>()
  for (const m of (members ?? []) as { group_id: string }[]) countBy.set(m.group_id, (countBy.get(m.group_id) ?? 0) + 1)
  const lastBy = new Map<string, { body: string; created_at: string }>()
  for (const m of (msgs ?? []) as { group_id: string; body: string; created_at: string }[]) if (!lastBy.has(m.group_id)) lastBy.set(m.group_id, m)
  return ((groups ?? []) as { id: string; name: string; admin_managed: boolean; created_by: string }[]).map(g => ({
    id: g.id, name: g.name, adminManaged: g.admin_managed, createdBy: g.created_by,
    myRole: roleById.get(g.id) ?? 'member', memberCount: countBy.get(g.id) ?? 1,
    lastBody: lastBy.get(g.id)?.body ?? null, lastAt: lastBy.get(g.id)?.created_at ?? null,
  })).sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))
}

async function namesFor(ids: string[]): Promise<Map<string, { name: string; avatar: string | null }>> {
  const map = new Map<string, { name: string; avatar: string | null }>()
  if (ids.length === 0) return map
  const { data } = await createClient().from('profiles').select('id, full_name, first_name, avatar_url').in('id', ids)
  for (const p of (data ?? []) as { id: string; full_name: string | null; first_name: string | null; avatar_url: string | null }[]) {
    map.set(p.id, { name: p.full_name || p.first_name || 'Membre', avatar: p.avatar_url })
  }
  return map
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const sb = createClient()
  const { data } = await sb.from('message_group_members').select('user_id, role').eq('group_id', groupId)
  const rows = (data ?? []) as { user_id: string; role: 'admin' | 'member' }[]
  const names = await namesFor(rows.map(r => r.user_id))
  return rows.map(r => ({ userId: r.user_id, role: r.role, name: names.get(r.user_id)?.name ?? 'Membre', avatar: names.get(r.user_id)?.avatar ?? null }))
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : 1))
}

export async function getGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const sb = createClient()
  const { data } = await sb.from('message_group_messages').select('id, sender_id, body, created_at').eq('group_id', groupId).order('created_at', { ascending: true }).limit(500)
  const rows = (data ?? []) as { id: string; sender_id: string; body: string; created_at: string }[]
  const names = await namesFor([...new Set(rows.map(r => r.sender_id))])
  return rows.map(r => ({ id: r.id, senderId: r.sender_id, body: r.body, createdAt: r.created_at, senderName: names.get(r.sender_id)?.name ?? 'Membre', senderAvatar: names.get(r.sender_id)?.avatar ?? null }))
}

export async function sendGroupMessage(groupId: string, body: string): Promise<boolean> {
  const sb = createClient()
  const me = await myId()
  if (!me || !body.trim()) return false
  const { error } = await sb.from('message_group_messages').insert({ group_id: groupId, sender_id: me, body: body.trim() })
  return !error
}

export async function addMembers(groupId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await createClient().from('message_group_members').insert(ids.map(id => ({ group_id: groupId, user_id: id, role: 'member' as const })))
}
export async function removeMember(groupId: string, userId: string): Promise<void> {
  await createClient().from('message_group_members').delete().eq('group_id', groupId).eq('user_id', userId)
}
export async function renameGroup(groupId: string, name: string): Promise<void> {
  await createClient().from('message_groups').update({ name: name.trim() || 'Groupe' }).eq('id', groupId)
}
export async function leaveGroup(groupId: string): Promise<void> {
  const me = await myId(); if (!me) return
  await createClient().from('message_group_members').delete().eq('group_id', groupId).eq('user_id', me)
}
export async function deleteGroup(groupId: string): Promise<void> {
  await createClient().from('message_groups').delete().eq('id', groupId)
}

// Pool de personnes ajoutables : le réseau du user (ses athlètes s'il est coach,
// ses coachs s'il est athlète), via coach_athlete accepté, dédupliqué.
export async function getAddablePeople(): Promise<Addable[]> {
  const sb = createClient()
  const me = await myId()
  if (!me) return []
  const { data } = await sb.from('coach_athlete').select('coach_id, athlete_id, status').or(`coach_id.eq.${me},athlete_id.eq.${me}`)
  const links = (data ?? []) as { coach_id: string; athlete_id: string; status: string | null }[]
  const ids = new Set<string>()
  for (const l of links) {
    if (l.status && l.status !== 'accepted' && l.status !== 'active') continue
    if (l.coach_id === me) ids.add(l.athlete_id)
    if (l.athlete_id === me) ids.add(l.coach_id)
  }
  ids.delete(me)
  const names = await namesFor([...ids])
  return [...ids].map(id => ({ id, name: names.get(id)?.name ?? 'Membre', avatar: names.get(id)?.avatar ?? null }))
}
