'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type MealCourse = 'entree' | 'plat' | 'dessert'

export interface MealIngredient {
  name: string
  qty:  string
  unit: string
  // Macros par aliment — stockées dans la colonne jsonb `ingredients` (aucune migration).
  kcal?: number
  prot?: number
  gluc?: number
  lip?:  number
  // Sous-section (déjeuner / dîner) — purement UI, stockée dans le jsonb (aucune migration).
  course?: MealCourse
}

export interface DailyMealEntry {
  id?:           string
  plan_id:       string | null
  date:          string
  meal_slot:     string
  meal_name:     string | null
  ingredients:   MealIngredient[] | null
  actual_kcal:   number | null
  actual_prot:   number | null
  actual_gluc:   number | null
  actual_lip:    number | null
  photo_url:     string | null
  photos:        string[] | null
  source:        string | null
  validated:     boolean
}

export type MealSlotKey =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack'

export const SLOT_LABELS: Record<MealSlotKey, string> = {
  breakfast:       'Petit-dejeuner',
  morning_snack:   'Collation matin',
  lunch:           'Dejeuner',
  afternoon_snack: 'Collation apres-midi',
  dinner:          'Diner',
  evening_snack:   'Collation soir',
}

export const SLOT_KEYS: MealSlotKey[] = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'evening_snack',
]

export function useDailyMeals(date: string) {
  const [entries,  setEntries]  = useState<DailyMealEntry[]>([])
  const [loading,  setLoading]  = useState(false)

  const load = useCallback(async () => {
    if (!date) return
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await sb
      .from('nutrition_meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .is('plan_id', null)
    if (error) console.error('[useDailyMeals] load:', error)
    setEntries((data ?? []) as DailyMealEntry[])
    setLoading(false)
  }, [date])

  useEffect(() => { void load() }, [load])

  const saveEntry = useCallback(async (
    slot: MealSlotKey,
    patch: Partial<Omit<DailyMealEntry, 'id' | 'plan_id' | 'date' | 'meal_slot'>>,
  ): Promise<void> => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const existing = entries.find(e => e.meal_slot === slot)
    if (existing?.id) {
      const { error } = await sb
        .from('nutrition_meal_logs')
        .update(patch)
        .eq('id', existing.id)
      if (error) { console.error('[useDailyMeals] update:', error); throw error }
    } else {
      const { error } = await sb
        .from('nutrition_meal_logs')
        .insert({
          user_id:              user.id,
          plan_id:              null,
          date,
          meal_slot:            slot,
          validated:            false,
          actual_description:   null,
          ...patch,
        })
      if (error) { console.error('[useDailyMeals] insert:', error); throw error }
    }
    await load()
  }, [entries, date, load])

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    const sb = createClient()
    const { error } = await sb
      .from('nutrition_meal_logs')
      .delete()
      .eq('id', id)
    if (error) { console.error('[useDailyMeals] delete:', error); throw error }
    await load()
  }, [load])

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + (e.actual_kcal ?? 0),
      prot: acc.prot + (e.actual_prot ?? 0),
      gluc: acc.gluc + (e.actual_gluc ?? 0),
      lip:  acc.lip  + (e.actual_lip  ?? 0),
    }),
    { kcal: 0, prot: 0, gluc: 0, lip: 0 },
  )

  return { entries, loading, totals, saveEntry, deleteEntry, reload: load }
}
