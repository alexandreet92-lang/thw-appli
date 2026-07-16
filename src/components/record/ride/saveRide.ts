// Persistance d'une séance home trainer terminée. Écrit dans `activities` via le
// client navigateur (même chemin que les autres écrans record), AVEC les streams
// 1 Hz — ce que l'ancien écran ne faisait pas. Le SM/SN réutilise le moteur
// existant (src/lib/metrics) : on force sport_type='cycling' pour le CALCUL
// (modèle vélo), tout en stockant l'activité en 'hometrainer'.
import { createClient } from '@/lib/supabase/client'
import type { SmSn } from '@/lib/metrics/smSn'
import type { RideSample, RideMetrics } from './types'

export interface RideStreams {
  watts: number[]; heartrate: number[]; cadence: number[]; velocity: number[]; altitude: number[]
}

export interface ComputeRow {
  sport_type: string; moving_time_s: number; normalized_watts: number | null
  ftp_at_time: number | null; avg_hr: number | null; streams: RideStreams
}

export interface SaveRideParams {
  samples: RideSample[]
  metrics: RideMetrics
  ftp: number
  startedAt: string
  elapsedS: number
  title: string
  compute: (row: ComputeRow) => SmSn
}

function buildStreams(samples: RideSample[]): RideStreams {
  const s: RideStreams = { watts: [], heartrate: [], cadence: [], velocity: [], altitude: [] }
  for (const x of samples) {
    s.watts.push(x.power ?? 0)
    s.heartrate.push(x.hr ?? 0)
    s.cadence.push(x.cadence ?? 0)
  }
  return s
}

function buildComputeRow(m: RideMetrics, ftp: number, elapsedS: number, streams: RideStreams): ComputeRow {
  return {
    sport_type: 'cycling',
    moving_time_s: elapsedS,
    normalized_watts: m.np || null,
    ftp_at_time: ftp,
    avg_hr: m.hrAvg || null,
    streams,
  }
}

export async function saveRide(p: SaveRideParams): Promise<void> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const streams = buildStreams(p.samples)
  const smsn: SmSn = p.compute(buildComputeRow(p.metrics, p.ftp, p.elapsedS, streams))

  const { error } = await sb.from('activities').insert({
    user_id: user.id,
    sport_type: 'hometrainer',
    title: p.title,
    started_at: p.startedAt,
    moving_time_s: p.elapsedS,
    elapsed_time_s: p.elapsedS,
    avg_watts: p.metrics.avgW || null,
    normalized_watts: p.metrics.np || null,
    ftp_at_time: p.ftp,
    avg_hr: p.metrics.hrAvg || null,
    calories: p.metrics.kj || null,
    streams,
    sm_score: Math.round(smsn.sm),
    sn_score: Math.round(smsn.sn),
  })
  if (error) throw error
}
