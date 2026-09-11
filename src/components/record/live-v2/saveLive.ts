// ════════════════════════════════════════════════════════════════════
// saveLive — envoi de la séance live vers Supabase avec PROGRESSION RÉELLE.
// Reprend le flux d'insertion existant de CyclingScreen (mêmes tables, mêmes
// colonnes, même format de données) mais découpé en étapes pondérées pour la
// jauge : 1. insert workout_sessions · 2. update gps_track (streams) ·
// 3. update laps · 4. insert activities (agrégats).
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import type { LiveSnapshot } from './useLocalBackup'

/** Bornes de progression par étape (pondération réelle du travail d'envoi). */
const STEP_PCT = { auth: 6, session: 45, streams: 70, laps: 85, aggregates: 100 } as const

export const DEFAULT_LIVE_TITLE = 'Sortie vélo'

/** Métadonnées éditées dans le résumé (titre, ressenti, visibilité, matériel…). */
export interface LiveSaveMeta {
  title: string
  comment: string
  /** RPE /10 (0 = non renseigné). */
  rpe: number
  visibility: 'public' | 'followers' | 'private'
  /** Sport de la ligne workout_sessions (cycling, mtb, running, trail, hiking). */
  wsSport: string
  /** sport_type de la ligne activities (bike, mtb, running, trail, hiking). */
  sportType: string
  /** Vélo sélectionné (activities.bike_id) — null si aucun / sport à pied. */
  bikeId: string | null
  /** Chaussures sélectionnées (activities.shoes_id) — null si aucune / vélo. */
  shoesId: string | null
}

export interface LiveUploadResult {
  /** Id de la ligne `activities` créée (mise en avant sur la page Training). */
  activityId: string | null
  /** Id de la ligne `workout_sessions` créée (rattachement des photos). */
  sessionId: string | null
}

/**
 * Envoie la séance : résout aux ids créés (`activities` pour la mise en avant
 * Training, `workout_sessions` pour les photos), rejette en cas d'échec
 * réseau/DB — l'appelant conserve alors le backup local et propose « Réessayer ».
 * `meta` porte les champs saisis dans le résumé (titre, commentaire, RPE,
 * visibilité, sport, matériel) ; repli sur les valeurs vélo par défaut.
 */
export async function uploadLiveSession(
  snap: LiveSnapshot,
  onProgress: (pct: number) => void,
  meta?: Partial<LiveSaveMeta>,
): Promise<LiveUploadResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('offline')
  }

  const title = meta?.title?.trim() || DEFAULT_LIVE_TITLE
  const wsSport = meta?.wsSport || 'cycling'
  const sportType = meta?.sportType || 'bike'

  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  onProgress(STEP_PCT.auth)

  // 1 — création de l'activité (ligne workout_sessions, format existant).
  const { data: ws, error: e1 } = await sb.from('workout_sessions').insert({
    user_id: user.id,
    sport: wsSport,
    started_at: snap.startedAtISO,
    ended_at: snap.endedAtISO,
    duration_seconds: snap.durationSec,
    distance_m: snap.distM,
    elevation_gain_m: snap.elevM,
    avg_speed_kmh: snap.avgSpeedKmh,
    max_speed_kmh: snap.maxSpeedKmh,
    calories: snap.calories,
    status: 'completed',
    title,
    comment: meta?.comment?.trim() || null,
    rpe: meta?.rpe && meta.rpe > 0 ? meta.rpe : null,
  }).select('id').single()
  if (e1) throw e1
  const sessionId = (ws as { id: string } | null)?.id ?? null
  onProgress(STEP_PCT.session)

  // 2 — streams (trace GPS).
  if (sessionId) {
    const { error: e2 } = await sb.from('workout_sessions')
      .update({ gps_track: snap.gpsPts })
      .eq('id', sessionId)
    if (e2) throw e2
  }
  onProgress(STEP_PCT.streams)

  // 3 — laps.
  if (sessionId) {
    const { error: e3 } = await sb.from('workout_sessions')
      .update({ laps: snap.laps })
      .eq('id', sessionId)
    if (e3) throw e3
  }
  onProgress(STEP_PCT.laps)

  // 4 — agrégats (ligne activities, format existant de CyclingScreen).
  const { data: act, error: e4 } = await sb.from('activities').insert({
    user_id: user.id,
    sport_type: sportType,
    title,
    started_at: snap.startedAtISO,
    distance_m: snap.distM,
    moving_time_s: snap.durationSec,
    elapsed_time_s: snap.durationSec,
    elevation_gain_m: snap.elevM,
    avg_speed_ms: snap.durationSec > 0 ? snap.distM / snap.durationSec : 0,
    max_speed_ms: snap.maxSpeedKmh / 3.6,
    calories: snap.calories,
    visibility: meta?.visibility ?? 'public',
    bike_id: meta?.bikeId ?? null,
    shoes_id: meta?.shoesId ?? null,
  }).select('id').single()
  if (e4) throw e4
  onProgress(STEP_PCT.aggregates)

  return { activityId: (act as { id: string } | null)?.id ?? null, sessionId }
}
