// ══════════════════════════════════════════════════════════════════════════
// PMC côté serveur — calcule l'état de charge (CTL/ATL/TSB) d'un utilisateur à
// une date donnée, à partir de ses activités. Réutilise le modèle EWMA existant
// (loadAsOf) pour une cohérence parfaite avec les pages Forme/Récup.
// ══════════════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadAsOf, type LoadState } from '@/lib/training/pmc'
import type { ActivityRow } from '@/app/recovery/components/types'

export type { LoadState }

/** État de charge de `userId` à la date `asOf` (défaut : aujourd'hui). */
export async function computeUserLoad(sb: SupabaseClient, userId: string, asOf: Date = new Date()): Promise<LoadState | null> {
  const since = new Date(asOf.getTime() - 400 * 86400000).toISOString()
  const until = new Date(asOf.getTime() + 86400000).toISOString()
  const { data } = await sb.from('activities')
    .select('id,sport_type,started_at,moving_time_s,tss')
    .eq('user_id', userId).gte('started_at', since).lte('started_at', until)
    .order('started_at', { ascending: true })
  const rows = ((data ?? []) as Record<string, unknown>[]).map(a => ({
    id: a.id as string, sport_type: (a.sport_type as string) ?? null,
    started_at: a.started_at as string, moving_time_s: (a.moving_time_s as number) ?? null,
    elapsed_time_s: null, tss: (a.tss as number) ?? null,
  })) as ActivityRow[]
  return loadAsOf(rows, asOf)
}
