// ══════════════════════════════════════════════════════════════════════════
// Persistance du PMC (CTL/ATL/TSB) dans metrics_daily.
// Calcule l'état de charge du jour pour chaque utilisateur actif récemment et
// l'écrit dans metrics_daily → lecture bon marché côté coach / digest / IA
// (au lieu de recalculer depuis tout l'historique à chaque fois).
// ══════════════════════════════════════════════════════════════════════════
import { createServiceClient } from '@/lib/supabase/server'
import { computeUserLoad } from '@/lib/training/pmcServer'

export async function rebuildAllPmc(): Promise<{ users: number; written: number }> {
  const sb = createServiceClient()
  const since = new Date(Date.now() - 120 * 86400000).toISOString()
  const { data } = await sb.from('activities').select('user_id').gte('started_at', since)
  const users = Array.from(new Set(((data ?? []) as { user_id: string }[]).map(r => r.user_id))).filter(Boolean)
  const today = new Date().toISOString().slice(0, 10)
  let written = 0
  for (const uid of users) {
    try {
      const load = await computeUserLoad(sb, uid)
      if (!load) continue
      const { data: ex } = await sb.from('metrics_daily').select('id').eq('user_id', uid).eq('date', today).maybeSingle()
      const row = { ctl: load.ctl, atl: load.atl, tsb: load.tsb, computed_at: new Date().toISOString() }
      if (ex) await sb.from('metrics_daily').update(row).eq('id', (ex as { id: string }).id)
      else await sb.from('metrics_daily').insert({ user_id: uid, date: today, ...row })
      written++
    } catch { /* best-effort */ }
  }
  return { users: users.length, written }
}
