'use client'
// Charge le profil d'intervalles depuis la séance vélo planifiée du jour
// (planned_sessions, sport = 'bike'). Aucune valeur en dur : si aucune séance
// n'est trouvée ou qu'elle n'a pas de blocs, plan = null → sortie libre
// (enregistrement sans cible). Le FTP vient du profil (passé en argument).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildPlan, type PlannedBlock } from './buildPlan'
import type { RidePlan } from './types'

interface Row { title: string | null; blocks: PlannedBlock[] | null }

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function useRidePlan(ftp: number | null, enabled: boolean) {
  const [plan, setPlan] = useState<RidePlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled || ftp == null) { setLoading(false); return }
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const { data } = await sb
          .from('planned_sessions')
          .select('title,blocks')
          .eq('user_id', user.id)
          .eq('sport', 'bike')
          .eq('date', todayISO())
          .order('day_index', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        const row = (data ?? null) as Row | null
        if (row) setPlan(buildPlan(row.blocks, ftp, row.title ?? 'Séance vélo'))
      } catch { /* pas de séance → sortie libre */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [ftp, enabled])

  return { plan, loading }
}
