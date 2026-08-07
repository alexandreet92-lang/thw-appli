'use client'
// ══════════════════════════════════════════════════════════════════════════
// Modération & réglages d'espace (côté client). Les lectures/écritures simples
// passent par la RLS ; les actions sensibles (ban/kick) par /api/community/moderate.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { myId } from './shared'

export interface CommunitySettings {
  joinPolicy: 'open' | 'closed'
  slowModeSec: number
  maxMembers: number | null
  minAccountAgeDays: number
  requireRulesAccept: boolean
  rulesText: string | null
  blockedWords: string[]
}

interface SettingsRow {
  join_policy: 'open' | 'closed'
  slow_mode_sec: number
  max_members: number | null
  min_account_age_days: number
  require_rules_accept: boolean
  rules_text: string | null
  blocked_words: string[] | null
}

/** Réglages d'un espace (lisibles par les membres ; modifiables owner/admin). */
export async function getSpaceSettings(spaceId: string): Promise<CommunitySettings | null> {
  const { data } = await createClient()
    .from('community_spaces')
    .select('join_policy, slow_mode_sec, max_members, min_account_age_days, require_rules_accept, rules_text, blocked_words')
    .eq('id', spaceId).maybeSingle()
  const r = data as SettingsRow | null
  if (!r) return null
  return {
    joinPolicy: r.join_policy, slowModeSec: r.slow_mode_sec, maxMembers: r.max_members,
    minAccountAgeDays: r.min_account_age_days, requireRulesAccept: r.require_rules_accept,
    rulesText: r.rules_text, blockedWords: Array.isArray(r.blocked_words) ? r.blocked_words : [],
  }
}

/** Met à jour les réglages (RLS : owner/admin). Retourne true si succès. */
export async function updateSpaceSettings(spaceId: string, s: CommunitySettings): Promise<boolean> {
  const { error } = await createClient().from('community_spaces').update({
    join_policy: s.joinPolicy,
    slow_mode_sec: Math.max(0, Math.min(21600, Math.round(s.slowModeSec) || 0)),
    max_members: s.maxMembers && s.maxMembers > 0 ? Math.round(s.maxMembers) : null,
    min_account_age_days: Math.max(0, Math.min(3650, Math.round(s.minAccountAgeDays) || 0)),
    require_rules_accept: s.requireRulesAccept,
    rules_text: s.rulesText?.trim() ? s.rulesText.trim().slice(0, 4000) : null,
    blocked_words: s.blockedWords.map(w => w.trim().toLowerCase()).filter(Boolean).slice(0, 200),
  }).eq('id', spaceId)
  return !error
}

/** Action de modération (ban/unban/kick/suppression) via la route serveur. */
export async function moderate(
  spaceId: string,
  action: 'ban' | 'unban' | 'kick' | 'delete_message' | 'approve_request' | 'reject_request',
  opts: { targetUserId?: string; messageId?: string; reason?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/community/moderate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId, action, ...opts }),
    })
    if (!res.ok) { const j = await res.json().catch(() => ({})); return { ok: false, error: (j as { error?: string }).error } }
    return { ok: true }
  } catch { return { ok: false, error: 'Réseau' } }
}

/** Signale un message (RLS : membre). Retourne true si envoyé. */
export async function reportMessage(spaceId: string, channelId: string, messageId: string, reason: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient().from('community_reports').insert({
    space_id: spaceId, channel_id: channelId, message_id: messageId, reported_by: me, reason: reason.trim().slice(0, 400) || 'Signalé',
  })
  return !error
}

export interface ReportInfo {
  id: string
  channelId: string | null
  messageId: string | null
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
}

/** Signalements ouverts d'un espace (RLS : modération). */
export async function listReports(spaceId: string): Promise<ReportInfo[]> {
  const { data } = await createClient()
    .from('community_reports')
    .select('id, channel_id, message_id, reason, status, created_at')
    .eq('space_id', spaceId).eq('status', 'open').order('created_at', { ascending: false }).limit(100)
  return ((data ?? []) as { id: string; channel_id: string | null; message_id: string | null; reason: string; status: 'open' | 'resolved' | 'dismissed'; created_at: string }[])
    .map(r => ({ id: r.id, channelId: r.channel_id, messageId: r.message_id, reason: r.reason, status: r.status, createdAt: r.created_at }))
}

/** Marque un signalement traité/rejeté (RLS : modération). */
export async function resolveReport(id: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
  const { error } = await createClient().from('community_reports').update({ status }).eq('id', id)
  return !error
}

/** Ai-je accepté les règles de cet espace ? */
export async function hasAcceptedRules(spaceId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { data } = await createClient().from('community_rules_accepted').select('user_id').eq('space_id', spaceId).eq('user_id', me).maybeSingle()
  return !!data
}

/** Accepte les règles de l'espace. */
export async function acceptRules(spaceId: string): Promise<boolean> {
  const me = await myId()
  if (!me) return false
  const { error } = await createClient().from('community_rules_accepted').upsert(
    { space_id: spaceId, user_id: me }, { onConflict: 'space_id,user_id' },
  )
  return !error
}
