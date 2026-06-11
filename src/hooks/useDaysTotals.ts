'use client'
// Totaux kcal réels par jour (table nutrition_meal_logs, plan_id NULL) pour la frise.
// Une seule requête sur l'ensemble des dates ; jour sans données → absent (= 0).
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDaysTotals(dates: string[]): Record<string, number> {
  const [map, setMap] = useState<Record<string, number>>({})
  const key = dates.join(',')
  useEffect(() => {
    let cancel = false
    void (async () => {
      if (dates.length === 0) return
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancel) return
      const { data } = await sb
        .from('nutrition_meal_logs')
        .select('date, actual_kcal')
        .eq('user_id', user.id)
        .is('plan_id', null)
        .in('date', dates)
      if (cancel) return
      const m: Record<string, number> = {}
      for (const row of (data ?? []) as { date: string; actual_kcal: number | null }[]) {
        m[row.date] = (m[row.date] ?? 0) + (row.actual_kcal ?? 0)
      }
      setMap(m)
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return map
}
