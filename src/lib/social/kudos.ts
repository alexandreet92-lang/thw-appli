'use client'
// ══════════════════════════════════════════════════════════════════
// Couche sociale du Fil : kudos (👏) + commentaires sur les activités.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

export interface Engagement { kudos: number; mine: boolean; comments: number }

/** Compteurs kudos/commentaires (+ « j'ai kudos ? ») pour une liste d'activités. */
export async function getEngagement(activityIds: string[]): Promise<Record<string, Engagement>> {
  const out: Record<string, Engagement> = {}
  const ids = Array.from(new Set(activityIds)).filter(Boolean)
  if (ids.length === 0) return out
  for (const id of ids) out[id] = { kudos: 0, mine: false, comments: 0 }
  const sb = createClient()
  const user = await getCurrentUser()
  const [{ data: kud }, { data: com }] = await Promise.all([
    sb.from('activity_kudos').select('activity_id, user_id').in('activity_id', ids),
    sb.from('activity_comments').select('activity_id').in('activity_id', ids),
  ])
  for (const k of (kud ?? []) as { activity_id: string; user_id: string }[]) {
    const e = out[k.activity_id]; if (!e) continue
    e.kudos++; if (user && k.user_id === user.id) e.mine = true
  }
  for (const c of (com ?? []) as { activity_id: string }[]) { const e = out[c.activity_id]; if (e) e.comments++ }
  return out
}

/** Ajoute / retire un kudos. Renvoie le nouvel état (true = kudos donné). */
export async function toggleKudos(activityId: string, currently: boolean): Promise<boolean> {
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error('Connecte-toi pour réagir.')
  if (currently) {
    await sb.from('activity_kudos').delete().eq('activity_id', activityId).eq('user_id', user.id)
    return false
  }
  await sb.from('activity_kudos').upsert({ activity_id: activityId, user_id: user.id }, { onConflict: 'activity_id,user_id' })
  return true
}

export interface ActivityComment { id: string; userId: string; name: string; avatar: string | null; body: string; createdAt: string; mine: boolean }

/** Liste des commentaires d'une activité (avec l'auteur). */
export async function listComments(activityId: string): Promise<ActivityComment[]> {
  const sb = createClient()
  const user = await getCurrentUser()
  const { data } = await sb.from('activity_comments')
    .select('id, user_id, body, created_at').eq('activity_id', activityId).order('created_at', { ascending: true })
  const rows = (data ?? []) as { id: string; user_id: string; body: string; created_at: string }[]
  if (rows.length === 0) return []
  const uids = Array.from(new Set(rows.map(r => r.user_id)))
  const { data: profs } = await sb.from('profiles').select('id, full_name, preferred_name, first_name, username, avatar_url').in('id', uids)
  const pmap = new Map<string, any>(((profs ?? []) as any[]).map(p => [p.id, p]))
  return rows.map(r => {
    const p = pmap.get(r.user_id)
    return { id: r.id, userId: r.user_id, name: p?.preferred_name || p?.full_name || p?.first_name || p?.username || 'Athlète', avatar: p?.avatar_url ?? null, body: r.body, createdAt: r.created_at, mine: !!user && r.user_id === user.id }
  })
}

export async function addComment(activityId: string, body: string): Promise<ActivityComment | null> {
  const text = body.trim()
  if (!text) return null
  const sb = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error('Connecte-toi pour commenter.')
  const { data } = await sb.from('activity_comments').insert({ activity_id: activityId, user_id: user.id, body: text.slice(0, 2000) }).select('id, created_at').single()
  const { data: p } = await sb.from('profiles').select('full_name, preferred_name, first_name, username, avatar_url').eq('id', user.id).maybeSingle()
  const pr = p as any
  return data ? { id: (data as any).id, userId: user.id, name: pr?.preferred_name || pr?.full_name || pr?.first_name || pr?.username || 'Moi', avatar: pr?.avatar_url ?? null, body: text, createdAt: (data as any).created_at, mine: true } : null
}

export async function deleteComment(id: string): Promise<void> {
  const sb = createClient()
  await sb.from('activity_comments').delete().eq('id', id)
}
