// ══════════════════════════════════════════════════════════════════════════
// Assemblage serveur du contexte d'analyse d'une séance.
// Réplique ce que l'AIPanel fait côté client (zones, planifié, récup, séances
// similaires, TSS semaine, métriques dérivées) pour permettre le déclenchement
// AUTOMATIQUE sans interaction utilisateur. Mapping défensif des colonnes
// (la base contient des variantes : avg_hr / average_heartrate, etc.).
// ══════════════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeCardiacDrift } from '@/lib/ai/metrics'
import { computeZoneDistribution, type ZoneRowLite, type StreamsForZones } from '@/lib/analysis/zoneDistribution'
import type { AnalyzeTrainingInput, AnalyzeActivityInput, StreamData, LapData, AnalysisDetail } from '@/lib/ai/analyzeTraining'

// Ligne activité brute (colonnes réelles + variantes legacy), tout optionnel.
interface ActivityRow {
  id: string
  user_id: string
  sport_type: string
  title?: string | null
  started_at: string
  moving_time_s?: number | null
  distance_m?: number | null
  tss?: number | null
  avg_hr?: number | null
  average_heartrate?: number | null
  max_hr?: number | null
  max_heartrate?: number | null
  avg_speed_ms?: number | null
  average_speed?: number | null
  avg_watts?: number | null
  avg_cadence?: number | null
  avg_pace_s_km?: number | null
  intensity_factor?: number | null
  aerobic_decoupling?: number | null
  is_race?: boolean | null
  normalized_watts?: number | null
  streams?: StreamData
  laps?: LapData[] | null
  raw_data?: { streams?: StreamData; laps?: LapData[] } | null
}

const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : v != null && !Number.isNaN(Number(v)) ? Number(v) : null)

function isBikeSport(sport: string): boolean {
  const s = sport.toLowerCase()
  return s.includes('bike') || s.includes('cycl') || s.includes('velo') || s.includes('vélo')
}

/** Streams : r.streams ?? r.raw_data?.streams (règle CLAUDE.md). */
function extractStreams(row: ActivityRow): StreamData {
  return (row.streams ?? row.raw_data?.streams ?? null) as StreamData
}

function extractLaps(row: ActivityRow): LapData[] | undefined {
  return (row.laps ?? row.raw_data?.laps ?? undefined) as LapData[] | undefined
}

function toAnalyzeActivity(row: ActivityRow): AnalyzeActivityInput {
  const streams = extractStreams(row)
  return {
    id: row.id,
    sport_type: row.sport_type,
    title: row.title ?? null,
    started_at: row.started_at,
    moving_time_s: num(row.moving_time_s),
    distance_m: num(row.distance_m),
    tss: num(row.tss),
    avg_hr: num(row.avg_hr ?? row.average_heartrate),
    max_hr: num(row.max_hr ?? row.max_heartrate),
    avg_speed_ms: num(row.avg_speed_ms ?? row.average_speed),
    avg_watts: num(row.avg_watts),
    avg_cadence: num(row.avg_cadence),
    avg_pace_s_km: num(row.avg_pace_s_km),
    intensity_factor: num(row.intensity_factor),
    aerobic_decoupling: num(row.aerobic_decoupling),
    is_race: row.is_race ?? false,
    normalized_watts: num(row.normalized_watts),
    cardiac_drift_pct: computeCardiacDrift(streams),
    laps: extractLaps(row),
    streams,
  }
}

/** Efficiency Index à partir des agrégats (vélo: W/FC, course: v/FC×100). */
function efficiencyIndex(sport: string, hr: number | null, watts: number | null, speedMs: number | null): number | null {
  if (!hr || hr <= 0) return null
  if (isBikeSport(sport)) return watts != null ? watts / hr : null
  return speedMs != null ? (speedMs / hr) * 100 : null
}

/**
 * Assemble le payload complet pour runTrainingAnalysis à partir d'une activité.
 * Renvoie null si l'activité est introuvable.
 */
export async function assembleAnalysisContext(
  sb: SupabaseClient,
  userId: string,
  activityId: string,
  detail: AnalysisDetail = 'advanced',
): Promise<AnalyzeTrainingInput | null> {
  const { data: actData } = await sb.from('activities').select('*').eq('id', activityId).eq('user_id', userId).maybeSingle()
  if (!actData) return null
  const row = actData as ActivityRow

  const actDate = row.started_at.slice(0, 10)
  const d3before = new Date(new Date(actDate).getTime() - 3 * 86400000).toISOString().slice(0, 10)
  const weekStartDate = (() => {
    const d = new Date(actDate)
    const day = d.getDay()
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    return d.toISOString().slice(0, 10)
  })()
  const movingS = num(row.moving_time_s) ?? 3600

  const [rulesRes, zonesRes, recoveryRes, plannedRes, similarRes, weekActsRes] = await Promise.all([
    sb.from('ai_rules').select('category,rule_text').eq('user_id', userId).eq('active', true),
    sb.from('training_zones').select('*').eq('user_id', userId).eq('sport', row.sport_type).eq('is_current', true).maybeSingle(),
    sb.from('metrics_daily').select('*').eq('user_id', userId).gte('date', d3before).lte('date', actDate),
    sb.from('planned_sessions').select('*').eq('user_id', userId).eq('sport', row.sport_type).eq('week_start', weekStartDate).maybeSingle(),
    sb.from('activities').select('*').eq('user_id', userId).eq('sport_type', row.sport_type)
      .gte('moving_time_s', Math.round(movingS * 0.7))
      .lte('moving_time_s', Math.round(movingS * 1.3))
      .neq('id', activityId)
      .order('started_at', { ascending: false }).limit(10),
    sb.from('activities').select('tss').eq('user_id', userId)
      .gte('started_at', weekStartDate + 'T00:00:00').lt('started_at', row.started_at),
  ])

  const tssWeekBefore = ((weekActsRes.data ?? []) as { tss: number | null }[]).reduce((s, a) => s + (num(a.tss) ?? 0), 0)

  const main = toAnalyzeActivity(row)

  // EI de la séance + moyenne des séances similaires (agrégats).
  const mainEI = efficiencyIndex(row.sport_type, main.avg_hr, main.avg_watts, main.avg_speed_ms)
  const similarRows = (similarRes.data ?? []) as ActivityRow[]
  const eiList = similarRows
    .map(r => efficiencyIndex(r.sport_type, num(r.avg_hr ?? r.average_heartrate), num(r.avg_watts), num(r.avg_speed_ms ?? r.average_speed)))
    .filter((v): v is number => v != null && v > 0)
  const eiSimilarAvg = eiList.length > 0 ? eiList.reduce((s, v) => s + v, 0) / eiList.length : null
  const eiDelta = mainEI != null && eiSimilarAvg != null && eiSimilarAvg > 0 ? ((mainEI - eiSimilarAvg) / eiSimilarAvg) * 100 : null

  // Répartition en zones calculée sur les vrais streams (Brique 3) — remplace
  // l'estimation par l'IA. null si non calculable (l'IA retombe sur l'estimation).
  const zoneDist = computeZoneDistribution(main.streams as StreamsForZones | null, zonesRes.data as ZoneRowLite | null, row.sport_type)

  return {
    activities: [main],
    zones: zonesRes.data ?? null,
    planned: plannedRes.data ?? null,
    recovery: (recoveryRes.data ?? []) as unknown[],
    similar: similarRows,
    tssWeekBefore,
    isRace: row.is_race ?? false,
    sport: row.sport_type,
    aiRules: (rulesRes.data ?? []) as { category: string; rule_text: string }[],
    cardiac_drift_pct: main.cardiac_drift_pct ?? null,
    efficiency_index: mainEI,
    ei_vs_similar_avg: eiDelta,
    zone_distribution: zoneDist,
    detail,
  }
}
