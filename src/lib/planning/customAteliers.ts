// Ateliers d'agilité RÉUTILISABLES créés par l'athlète (table custom_ateliers,
// RLS par user). Alimentent la section « Mes ateliers » du builder Strides.
import { createClient } from '@/lib/supabase/client'

export interface CustomAtelier {
  id: string
  name: string
  zone: number
  reps: number
  recovery_sec: number
  rest_between_sec: number
  note: string | null
  svg: string | null
}

export async function listCustomAteliers(): Promise<CustomAtelier[]> {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return []
    const { data } = await sb.from('custom_ateliers').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    return (data as CustomAtelier[] | null) ?? []
  } catch { return [] }
}

export async function saveCustomAtelier(a: Omit<CustomAtelier, 'id'>): Promise<CustomAtelier | null> {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data } = await sb.from('custom_ateliers').insert({ ...a, user_id: user.id }).select().single()
    return (data as CustomAtelier) ?? null
  } catch { return null }
}

export async function deleteCustomAtelier(id: string): Promise<void> {
  try {
    const sb = createClient()
    await sb.from('custom_ateliers').delete().eq('id', id)
  } catch { /* ignore */ }
}
