'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Hook hydratation ────────────────────────────────────────────────
// Lit/écrit la table `hydration` (une ligne par user/jour, en litres).
// Pattern identique à recovery/BodyTracking : upsert sur (user_id, date).
export function useHydration(date: string) {
  const [liters, setLitersState] = useState<number>(0)
  const [loading, setLoading]    = useState(false)

  const load = useCallback(async () => {
    if (!date) return
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await sb
      .from('hydration')
      .select('liters')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle()
    if (error) console.error('[useHydration] load:', error)
    setLitersState(data?.liters ?? 0)
    setLoading(false)
  }, [date])

  useEffect(() => { void load() }, [load])

  const setLiters = useCallback(async (next: number): Promise<void> => {
    const value = Math.max(0, Math.round(next * 100) / 100)
    setLitersState(value)   // optimiste
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { error } = await sb
      .from('hydration')
      .upsert({ user_id: user.id, date, liters: value }, { onConflict: 'user_id,date' })
    if (error) { console.error('[useHydration] upsert:', error); void load() }
  }, [date, load])

  const addLiters = useCallback((delta: number) => setLiters(liters + delta), [liters, setLiters])

  return { liters, loading, setLiters, addLiters, reload: load }
}
