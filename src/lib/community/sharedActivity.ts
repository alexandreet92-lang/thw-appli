'use client'
// ══════════════════════════════════════════════════════════════════════════
// Détail complet d'une activité PARTAGÉE dans un canal, via la RPC sécurisée
// community_shared_activity_detail (autorisée par l'appartenance à l'espace,
// masques de données de l'athlète respectés). Renvoie la ligne brute (mêmes
// noms de colonnes que la table) + zones + can_view, ou null si non autorisé.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SharedActivityRow = any

export async function getSharedActivityDetail(activityId: string, channelId: string): Promise<SharedActivityRow | null> {
  const sb = createClient()
  const { data, error } = await sb.rpc('community_shared_activity_detail', { p_activity: activityId, p_channel: channelId })
  if (error || !data) return null
  const d = data as { can_view?: boolean }
  return d.can_view ? d : null
}
