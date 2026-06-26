// ══════════════════════════════════════════════════════════════════
// Fusion in-app ↔ Strava (lecture). Une séance muscu/hyrox enregistrée dans
// l'app vit dans `workout_sessions` (exercices, volume, séries) ; l'activité
// Strava correspondante vit dans `activities` (FC, calories). On les relie au
// moment de l'affichage :
//   1. lien déjà posé   : workout_sessions.strava_activity_id == activities.provider_id
//   2. sinon par créneau : même sport (gym/hyrox), started_at à ±4 h, non lié
// Quand on trouve un match par créneau, on PERSISTE le lien (idempotent) pour
// que la prochaine lecture soit directe. Aucune modification de la sync Strava.
// ══════════════════════════════════════════════════════════════════
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise } from '@/types/workout'

export interface LinkedWorkout {
  id: string
  title: string | null
  sport: string
  duration_seconds: number | null
  exercises_detail: WorkoutExercise[] | null
  total_volume_kg: number | null
  sets_completed: number | null
  training_types: string[] | null
  rpe: number | null
  comment: string | null
  started_at: string | null
}

const FIELDS = 'id, title, sport, duration_seconds, exercises_detail, total_volume_kg, sets_completed, training_types, rpe, comment, started_at'
const WINDOW_MS = 4 * 3600 * 1000

export function useLinkedWorkoutSession(
  activity: { id: string; sport_type: string; started_at: string; provider_id?: unknown },
) {
  const [session, setSession] = useState<LinkedWorkout | null>(null)
  const [loaded, setLoaded] = useState(false)
  const isGymLike = activity.sport_type === 'gym' || activity.sport_type === 'hyrox'
  const providerId = typeof activity.provider_id === 'string' ? activity.provider_id : null

  useEffect(() => {
    if (!isGymLike) { setLoaded(true); return }
    let alive = true
    void (async () => {
      try {
        const sb = createClient()
        // 1. Lien déjà posé.
        if (providerId) {
          const { data } = await sb.from('workout_sessions').select(FIELDS).eq('strava_activity_id', providerId).maybeSingle()
          if (data) { if (alive) setSession(data as LinkedWorkout); return }
        }
        // 2. Appariement par créneau (RLS scope déjà à l'utilisateur).
        const t = new Date(activity.started_at).getTime()
        const lo = new Date(t - WINDOW_MS).toISOString()
        const hi = new Date(t + WINDOW_MS).toISOString()
        const { data: cands } = await sb.from('workout_sessions')
          .select(FIELDS)
          .in('sport', ['gym', 'hyrox'])
          .is('strava_activity_id', null)
          .gte('started_at', lo).lte('started_at', hi)
        const best = (cands as LinkedWorkout[] | null)?.slice().sort((a, b) =>
          Math.abs(new Date(a.started_at ?? 0).getTime() - t) - Math.abs(new Date(b.started_at ?? 0).getTime() - t),
        )[0] ?? null
        if (best && providerId) {
          void sb.from('workout_sessions').update({ strava_activity_id: providerId }).eq('id', best.id)
        }
        if (alive) setSession(best)
      } catch { /* best-effort : pas de fusion si erreur */ }
      finally { if (alive) setLoaded(true) }
    })()
    return () => { alive = false }
  }, [activity.id, activity.started_at, isGymLike, providerId])

  return { session, loaded }
}
