'use client'
// Totaux réels par jour (table nutrition_meal_logs, plan_id NULL) pour la frise :
// kcal + macros (protéines / glucides / lipides). Une seule requête sur l'ensemble
// des dates ; jour sans données → absent (= 0).
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DayTotals { kcal: number; prot: number; gluc: number; lip: number }

export function useDaysTotals(dates: string[]): Record<string, DayTotals> {
  const [map, setMap] = useState<Record<string, DayTotals>>({})
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
        .select('date, actual_kcal, actual_prot, actual_gluc, actual_lip')
        .eq('user_id', user.id)
        .is('plan_id', null)
        .in('date', dates)
      if (cancel) return
      const m: Record<string, DayTotals> = {}
      for (const row of (data ?? []) as { date: string; actual_kcal: number | null; actual_prot: number | null; actual_gluc: number | null; actual_lip: number | null }[]) {
        const cur = m[row.date] ?? { kcal: 0, prot: 0, gluc: 0, lip: 0 }
        m[row.date] = {
          kcal: cur.kcal + (row.actual_kcal ?? 0),
          prot: cur.prot + (row.actual_prot ?? 0),
          gluc: cur.gluc + (row.actual_gluc ?? 0),
          lip:  cur.lip  + (row.actual_lip  ?? 0),
        }
      }
      setMap(m)
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return map
}
