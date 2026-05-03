'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MealLog {
  id?: string
  user_id?: string
  plan_id: string | null
  date: string
  meal_slot: string
  validated: boolean
  actual_description: string | null
  actual_kcal: number | null
  actual_prot: number | null
  actual_gluc: number | null
  actual_lip: number | null
  created_at?: string
  updated_at?: string
}

export interface MealLogTotals {
  kcal: number
  prot: number
  gluc: number
  lip: number
}

export function useMealLogs(
  planId: string | null | undefined,
  date: string,
) {
  const supabase = createClient()
  const [logs, setLogs]       = useState<MealLog[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!planId || !date) { setLogs([]); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('nutrition_meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .eq('date', date)
    setLogs((data ?? []) as MealLog[])
    setLoading(false)
  }, [supabase, planId, date])

  useEffect(() => { void load() }, [load])

  // ── Toggle validated ─────────────────────────────────────────────
  async function toggleValidated(mealSlot: string, validated: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !planId) return
    await supabase.from('nutrition_meal_logs').upsert(
      {
        user_id: user.id,
        plan_id: planId,
        date,
        meal_slot: mealSlot,
        validated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,plan_id,date,meal_slot' },
    )
    // Optimistic update
    setLogs(prev => {
      const exists = prev.find(l => l.meal_slot === mealSlot)
      if (exists) return prev.map(l => l.meal_slot === mealSlot ? { ...l, validated } : l)
      return [...prev, {
        plan_id: planId, date, meal_slot: mealSlot, validated,
        actual_description: null, actual_kcal: null,
        actual_prot: null, actual_gluc: null, actual_lip: null,
      }]
    })
    void load()
  }

  // ── Update actual values ─────────────────────────────────────────
  async function updateLog(
    mealSlot: string,
    updates: Partial<Pick<MealLog, 'actual_description' | 'actual_kcal' | 'actual_prot' | 'actual_gluc' | 'actual_lip' | 'validated'>>,
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !planId) return
    await supabase.from('nutrition_meal_logs').upsert(
      {
        user_id: user.id,
        plan_id: planId,
        date,
        meal_slot: mealSlot,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,plan_id,date,meal_slot' },
    )
    setLogs(prev => {
      const exists = prev.find(l => l.meal_slot === mealSlot)
      if (exists) return prev.map(l => l.meal_slot === mealSlot ? { ...l, ...updates } : l)
      return [...prev, {
        plan_id: planId, date, meal_slot: mealSlot, validated: false,
        actual_description: null, actual_kcal: null,
        actual_prot: null, actual_gluc: null, actual_lip: null,
        ...updates,
      }]
    })
    void load()
  }

  // ── Totals from validated logs ───────────────────────────────────
  const totals: MealLogTotals = logs
    .filter(l => l.validated)
    .reduce(
      (acc, l) => ({
        kcal: acc.kcal + (l.actual_kcal ?? 0),
        prot: acc.prot + (l.actual_prot ?? 0),
        gluc: acc.gluc + (l.actual_gluc ?? 0),
        lip:  acc.lip  + (l.actual_lip  ?? 0),
      }),
      { kcal: 0, prot: 0, gluc: 0, lip: 0 },
    )

  return { logs, loading, totals, toggleValidated, updateLog, reload: load }
}
