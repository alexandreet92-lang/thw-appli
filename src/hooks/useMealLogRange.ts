'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────
export interface DayMealTotal {
  kcal: number
  prot: number
  gluc: number
  lip:  number
}

// ── Hook ──────────────────────────────────────────────────────────
// Fetches nutrition_meal_logs rows (plan_id IS NULL) for a date range
// and groups them by date.
export function useMealLogRange(startDate: string, endDate: string) {
  const [totals,  setTotals]  = useState<Record<string, DayMealTotal>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('nutrition_meal_logs')
        .select('date, actual_kcal, actual_prot, actual_gluc, actual_lip')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .is('plan_id', null)

      if (error) throw error

      const grouped: Record<string, DayMealTotal> = {}
      for (const row of (data ?? [])) {
        if (!row.date) continue
        if (!grouped[row.date]) grouped[row.date] = { kcal: 0, prot: 0, gluc: 0, lip: 0 }
        grouped[row.date].kcal += row.actual_kcal ?? 0
        grouped[row.date].prot += row.actual_prot ?? 0
        grouped[row.date].gluc += row.actual_gluc ?? 0
        grouped[row.date].lip  += row.actual_lip  ?? 0
      }

      console.log('[useMealLogRange] historique data:', grouped)
      setTotals(grouped)
    } catch (err) {
      console.error('[useMealLogRange]', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { void load() }, [load])

  return { totals, loading, reload: load }
}
