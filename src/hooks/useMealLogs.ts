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

  // ── Full refetch ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!planId || !date) { setLogs([]); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await supabase
      .from('nutrition_meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .eq('date', date)
    if (error) console.error('[useMealLogs] load error:', error)
    setLogs((data ?? []) as MealLog[])
    setLoading(false)
  }, [supabase, planId, date])

  useEffect(() => { void load() }, [load])

  // ── Toggle validated ─────────────────────────────────────────────
  // Pattern: optimistic-first → await upsert → merge server row
  //          on error: rollback optimistic state (no blind refetch)
  async function toggleValidated(mealSlot: string, validated: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !planId) return

    // 1. Snapshot previous state for rollback
    const prev = logs

    // 2. Optimistic update immediately
    setLogs(current => {
      const exists = current.find(l => l.meal_slot === mealSlot)
      if (exists) {
        return current.map(l => l.meal_slot === mealSlot ? { ...l, validated } : l)
      }
      return [...current, {
        plan_id: planId, date, meal_slot: mealSlot, validated,
        actual_description: null, actual_kcal: null,
        actual_prot: null, actual_gluc: null, actual_lip: null,
      }]
    })

    // 3. Persist to DB — upsert and return the row
    const { data: row, error } = await supabase
      .from('nutrition_meal_logs')
      .upsert(
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
      .select()
      .single()

    if (error) {
      // Rollback optimistic update
      console.error('[useMealLogs] toggleValidated failed — rolling back:', error)
      setLogs(prev)
      return
    }

    // 4. Merge server row (captures id, timestamps) without a full refetch
    if (row) {
      setLogs(current =>
        current.map(l => l.meal_slot === mealSlot ? { ...(row as MealLog) } : l),
      )
    }
  }

  // ── Update actual nutrition values ───────────────────────────────
  async function updateLog(
    mealSlot: string,
    updates: Partial<Pick<MealLog,
      | 'actual_description'
      | 'actual_kcal'
      | 'actual_prot'
      | 'actual_gluc'
      | 'actual_lip'
      | 'validated'
    >>,
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !planId) return

    const prev = logs

    // Optimistic update
    setLogs(current => {
      const exists = current.find(l => l.meal_slot === mealSlot)
      if (exists) {
        return current.map(l => l.meal_slot === mealSlot ? { ...l, ...updates } : l)
      }
      return [...current, {
        plan_id: planId, date, meal_slot: mealSlot, validated: false,
        actual_description: null, actual_kcal: null,
        actual_prot: null, actual_gluc: null, actual_lip: null,
        ...updates,
      }]
    })

    const { data: row, error } = await supabase
      .from('nutrition_meal_logs')
      .upsert(
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
      .select()
      .single()

    if (error) {
      console.error('[useMealLogs] updateLog failed — rolling back:', error)
      setLogs(prev)
      return
    }

    if (row) {
      setLogs(current =>
        current.map(l => l.meal_slot === mealSlot ? { ...(row as MealLog) } : l),
      )
    }
  }

  // ── Totals: ONLY from validated logs ────────────────────────────
  // If a log is validated but has no actual values, we return 0 for that slot
  // (caller is responsible for adding plan-slot fallback if desired)
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

  const hasValidated = logs.some(l => l.validated)

  return { logs, loading, totals, hasValidated, toggleValidated, updateLog, reload: load }
}
