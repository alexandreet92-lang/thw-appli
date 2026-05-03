'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type MealKey = 'petit_dejeuner' | 'collation_matin' | 'dejeuner' | 'collation_apres_midi' | 'diner' | 'collation_soir'

export interface MealTemplate {
  id: string
  user_id?: string
  nom: string
  type_repas: MealKey
  description: string | null
  kcal: number | null
  proteines: number | null
  glucides: number | null
  lipides: number | null
  actif: boolean
  created_at: string
}

export interface NutritionPlan {
  id: string
  type: 'minimal' | 'maximal' | 'manuel'
  plan_data: NutritionPlanData
  created_at: string
  actif: boolean
}

export interface NutritionPlanData {
  description: string
  calories_low: number
  calories_mid: number
  calories_hard: number
  macros_low: MacroSet
  macros_mid: MacroSet
  macros_hard: MacroSet
  jours: PlanDay[]
}

export interface MacroSet {
  proteines: number
  glucides: number
  lipides: number
}

export interface PlanDay {
  date: string
  type_jour: 'low' | 'mid' | 'hard'
  kcal: number
  proteines: number
  glucides: number
  lipides: number
  repas: {
    option_A: MealSet
    option_B: MealSet
  }
}

// Nouveau format : object avec macros par repas
export interface MealSlot {
  description: string
  kcal: number
  proteines: number
  glucides: number
  lipides: number
}

// Union pour compat arrière : anciens plans stockent string, nouveaux stockent MealSlot
export type MealSlotValue = string | MealSlot

export interface MealSet {
  petit_dejeuner: MealSlotValue
  collation_matin: MealSlotValue
  dejeuner: MealSlotValue
  collation_apres_midi: MealSlotValue
  diner: MealSlotValue
  collation_soir: MealSlotValue
}

// Helpers pour lire le format old/new de manière transparente
export function slotText(v: MealSlotValue): string {
  return typeof v === 'string' ? v : v.description
}
export function slotMacros(v: MealSlotValue): MealSlot | null {
  if (typeof v === 'string') return null
  return v
}

export interface DailyLog {
  id?: string
  date: string
  kcal_consommees: number
  proteines: number
  glucides: number
  lipides: number
  repas_details: Record<string, { consumed: boolean; note?: string }>
  option_choisie: 'A' | 'B' | 'manuel'
}

export interface WeightLog {
  id?: string
  date: string
  poids: number | null
  mg: number | null
  mm: number | null
  source: 'balance_connectee' | 'manuel'
}

export function useNutrition() {
  const supabase = createClient()
  const [activePlan, setActivePlan] = useState<NutritionPlan | null>(null)
  const [dailyLogs,  setDailyLogs]  = useState<DailyLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [planRes, logsRes, weightRes] = await Promise.all([
      supabase.from('nutrition_plans').select('*').eq('user_id', user.id).eq('actif', true).order('created_at', { ascending: false }).limit(1),
      supabase.from('nutrition_daily_logs').select('*').eq('user_id', user.id).gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]).order('date', { ascending: false }),
      supabase.from('nutrition_weight_logs').select('*').eq('user_id', user.id).gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]).order('date', { ascending: false }),
    ])

    setActivePlan(planRes.data?.[0] ?? null)
    setDailyLogs((logsRes.data ?? []).map(r => ({ ...r, repas_details: (r.repas_details as Record<string, { consumed: boolean; note?: string }>) ?? {} })))
    setWeightLogs(weightRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  async function savePlan(planData: NutritionPlanData, type: 'minimal' | 'maximal' | 'manuel'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutrition_plans').update({ actif: false }).eq('user_id', user.id)
    await supabase.from('nutrition_plans').insert({ user_id: user.id, type, plan_data: planData, actif: true })
    await load()
  }

  async function saveDailyLog(log: Omit<DailyLog, 'id'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutrition_daily_logs').upsert({ user_id: user.id, ...log }, { onConflict: 'user_id,date' })
    await load()
  }

  async function saveWeightLog(log: Omit<WeightLog, 'id'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutrition_weight_logs').upsert({ user_id: user.id, ...log }, { onConflict: 'user_id,date' })
    await load()
  }

  return { activePlan, dailyLogs, weightLogs, loading, savePlan, saveDailyLog, saveWeightLog, reload: load }
}

export function useNutritionTemplates() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('nutrition_meal_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTemplates((data ?? []) as MealTemplate[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  async function addTemplate(t: Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutrition_meal_templates').insert({ user_id: user.id, ...t })
    await load()
  }

  async function updateTemplate(id: string, t: Partial<Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>>): Promise<void> {
    await supabase.from('nutrition_meal_templates').update(t).eq('id', id)
    await load()
  }

  async function deleteTemplate(id: string): Promise<void> {
    await supabase.from('nutrition_meal_templates').delete().eq('id', id)
    await load()
  }

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, reload: load }
}
