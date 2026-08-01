// ══════════════════════════════════════════════════════════════════
// Consentement écriture coach + journal des modifications (côté athlète).
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

export interface CoachChange {
  id: string
  action: string
  page: string | null
  summary: string | null
  created_at: string
}

export interface CoachLink {
  coachId: string
  writeEnabled: boolean
}

/** Relation coach ACCEPTÉE de l'athlète courant (null s'il n'a pas de coach). */
export async function getMyCoachLink(): Promise<CoachLink | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('coach_athlete')
    .select('coach_id, write_enabled')
    .eq('athlete_id', user.id).eq('status', 'accepted')
    .order('created_at', { ascending: true })
    .limit(1).maybeSingle()
  if (!data) return null
  return { coachId: data.coach_id as string, writeEnabled: (data as { write_enabled?: boolean }).write_enabled !== false }
}

/** Active / coupe l'autorisation d'écriture du coach sur les données de l'athlète. */
export async function setCoachWriteConsent(enabled: boolean): Promise<void> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  await sb.from('coach_athlete')
    .update({ write_enabled: enabled })
    .eq('athlete_id', user.id).eq('status', 'accepted')
}

/** Dernières modifications faites par le coach chez l'athlète courant. */
export async function listCoachChanges(limit = 8): Promise<CoachChange[]> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb.from('coach_audit_log')
    .select('id, action, page, summary, created_at')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as CoachChange[]
}
