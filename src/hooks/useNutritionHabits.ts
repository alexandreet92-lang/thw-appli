'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface HabitIngredient {
  name: string
  quantity_g: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

export interface NutritionHabit {
  id: string
  user_id?: string
  habit_type: 'regular_meal' | 'training_fuel'
  name: string
  ingredients: HabitIngredient[] | null
  total_calories: number | null
  total_carbs_g: number | null
  total_protein_g: number | null
  created_at: string
}

export function useNutritionHabits() {
  const [habits, setHabits] = useState<NutritionHabit[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await sb
        .from('nutrition_habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setHabits((data as NutritionHabit[]) ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const addHabit = useCallback(async (
    habit: Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>
  ): Promise<void> => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb
      .from('nutrition_habits')
      .insert({ ...habit, user_id: user.id })
      .select()
      .single()
    if (data) setHabits(prev => [...prev, data as NutritionHabit])
  }, [])

  const updateHabit = useCallback(async (
    id: string,
    patch: Partial<Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>>
  ): Promise<void> => {
    const sb = createClient()
    await sb.from('nutrition_habits').update(patch).eq('id', id)
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h))
  }, [])

  const deleteHabit = useCallback(async (id: string): Promise<void> => {
    const sb = createClient()
    await sb.from('nutrition_habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }, [])

  return { habits, loading, addHabit, updateHabit, deleteHabit }
}
