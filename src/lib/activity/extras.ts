// ══════════════════════════════════════════════════════════════════
// activity_extras — lecture / écriture des données saisies manuellement par
// l'athlète et rattachées à une activité (journal muscu, longueur de bassin).
// Persisté en base (table activity_extras, RLS user-scoped) → synchronisé
// multi-appareils. Hook React simple : charge à l'ouverture, upsert au save.
// ══════════════════════════════════════════════════════════════════
'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Exo { id: string; name: string; sets: string; reps: string; load: string; rest: string }
export interface StrengthLog { circuits: string; exos: Exo[] }

export interface ActivityExtras {
  strength_log: StrengthLog | null
  pool_length_m: number | null
  workout_types: string[] | null
}

const BLANK: ActivityExtras = { strength_log: null, pool_length_m: null, workout_types: null }

export function useActivityExtras(activityId: string) {
  const [extras, setExtras] = useState<ActivityExtras>(BLANK)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const sb = createClient()
        const { data } = await sb
          .from('activity_extras')
          .select('strength_log, pool_length_m, workout_types')
          .eq('activity_id', activityId)
          .maybeSingle()
        if (alive) setExtras(data ? { strength_log: data.strength_log ?? null, pool_length_m: data.pool_length_m ?? null, workout_types: data.workout_types ?? null } : BLANK)
      } catch { /* hors-ligne / non connecté : on garde le blanc */ }
      finally { if (alive) setLoaded(true) }
    })()
    return () => { alive = false }
  }, [activityId])

  // Patch partiel : ne touche qu'aux champs fournis, conserve l'autre.
  const save = useCallback(async (patch: Partial<ActivityExtras>) => {
    const next = { ...extras, ...patch }
    setExtras(next)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('activity_extras').upsert({
        activity_id: activityId,
        user_id: user.id,
        strength_log: next.strength_log,
        pool_length_m: next.pool_length_m,
        workout_types: next.workout_types,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'activity_id' })
    } catch { /* best-effort */ }
  }, [activityId, extras])

  return { extras, loaded, save }
}
