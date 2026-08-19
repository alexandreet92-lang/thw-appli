'use client'
// Charge les courses RÉELLES de l'utilisateur depuis Supabase (`planned_races`). Aucune donnée
// inventée : si vide, le composant affiche « Aucune course ».
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'

export interface RaceData { id: string; name: string; sport: string; date: string; level: string }

export function usePlannedRaces(): { races: RaceData[]; loading: boolean } {
  const [races, setRaces] = useState<RaceData[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const sb = createClient()
        // Athlète EFFECTIF (scope coach) et non le coach connecté : sinon les
        // courses DU COACH (ex. Ironman) fuitaient dans la planification de l'athlète.
        const uid = await resolvePlanningUid(sb)
        if (!uid) { if (alive) setLoading(false); return }
        const { data } = await sb.from('planned_races').select('id,name,sport,date,level').eq('user_id', uid).order('date', { ascending: true })
        if (alive) setRaces((data ?? []) as RaceData[])
      } catch { /* réseau indisponible → liste vide */ }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [])
  return { races, loading }
}
