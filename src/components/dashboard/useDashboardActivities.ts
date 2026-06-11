'use client'
// ══════════════════════════════════════════════════════════════
// Charge les activités nécessaires au PMC du Dashboard Datas.
// (~180 j : seed EWMA + 4 semaines visibles). Source unique
// d'activités partagée par FormeArc / LoadKpis / PmcChart.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityRow } from '@/lib/training/pmc'

export function useDashboardActivities(): { activities: ActivityRow[]; loading: boolean } {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const since = new Date()
      since.setDate(since.getDate() - 180)
      const { data } = await supabase
        .from('activities')
        .select('id, sport_type, started_at, moving_time_s, elapsed_time_s, tss')
        .eq('user_id', user.id)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: true })
      if (cancelled) return
      setActivities(((data as ActivityRow[] | null) ?? []))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  return { activities, loading }
}
