// ══════════════════════════════════════════════════════════════
// POST /api/activities/process-records
// Calcule les MMP de la séance, compare aux records existants,
// insère les nouveaux records (All Time + Année) dans personal_records,
// et stocke le résultat dans activities.records_beaten (idempotent).
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ── Définition des durées suivies ─────────────────────────────
// d = durée en secondes ; label = distance_label DB ; display = label UI
const BIKE_RECORD_DURS: { d: number; label: string; display: string }[] = [
  { d: 1,     label: 'Pmax',  display: 'Pmax' },
  { d: 10,    label: '10s',   display: "10''" },
  { d: 30,    label: '30s',   display: "30''" },
  { d: 60,    label: '1min',  display: "1'" },
  { d: 180,   label: '3min',  display: "3'" },
  { d: 300,   label: '5min',  display: "5'" },
  { d: 480,   label: '8min',  display: "8'" },
  { d: 600,   label: '10min', display: "10'" },
  { d: 720,   label: '12min', display: "12'" },
  { d: 900,   label: '15min', display: "15'" },
  { d: 1200,  label: '20min', display: "20'" },
  { d: 1800,  label: '30min', display: "30'" },
  { d: 2700,  label: '45min', display: "45'" },
  { d: 3600,  label: '1h',    display: '1h' },
  { d: 5400,  label: '90min', display: '1h30' },
  { d: 7200,  label: '2h',    display: '2h' },
  { d: 10800, label: '3h',    display: '3h' },
  { d: 14400, label: '4h',    display: '4h' },
  { d: 18000, label: '5h',    display: '5h' },
  { d: 21600, label: '6h',    display: '6h' },
]

interface BeatenEntry { label: string; display: string; watts: number }
interface BeatenPayload {
  allTime: BeatenEntry[]
  year:    BeatenEntry[]
}

// ── MMP sliding window (cap 1500W) ───────────────────────────
function computeMmp(wStream: number[], dur: number): number {
  const N = wStream.length
  if (dur > N) return 0
  const cleaned = wStream.map(w => Math.min(Math.max(0, Number(w) || 0), 1500))
  const prefix = new Array(N + 1).fill(0)
  for (let i = 0; i < N; i++) prefix[i + 1] = prefix[i] + cleaned[i]
  let max = 0
  for (let i = 0; i <= N - dur; i++) {
    const avg = (prefix[i + dur] - prefix[i]) / dur
    if (avg > max) max = avg
  }
  return Math.round(max)
}

interface StreamsShape { watts?: number[] | null }
interface ActivityRow {
  user_id:            string
  sport_type:         string | null
  started_at:         string | null
  streams:            StreamsShape | null
  raw_data:           { streams?: StreamsShape | null } | null
  records_processed:  boolean | null
  records_beaten:     BeatenPayload | null
}

interface PersonalRecordRow { distance_label: string; performance: string; achieved_at: string }

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { activity_id?: string }
  const activityId = body.activity_id
  if (!activityId) return NextResponse.json({ error: 'activity_id requis' }, { status: 400 })

  const sb = createServiceClient()

  // ── Charge l'activité ────────────────────────────────────────
  const { data: actRaw } = await sb
    .from('activities')
    .select('user_id, sport_type, started_at, streams, raw_data, records_processed, records_beaten')
    .eq('id', activityId)
    .eq('user_id', user.id)
    .single()

  const activity = actRaw as ActivityRow | null
  if (!activity) return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 })

  // ── Seul le vélo est concerné ────────────────────────────────
  const sport = (activity.sport_type ?? '').toLowerCase()
  if (sport !== 'bike' && sport !== 'cycling' && sport !== 'cycle' && sport !== 'velo') {
    return NextResponse.json({ allTime: [], year: [] })
  }

  // ── Idempotence : si déjà traité, renvoyer le résultat caché ─
  if (activity.records_processed && activity.records_beaten) {
    return NextResponse.json(activity.records_beaten)
  }

  // ── Watts stream (avec fallback raw_data) ────────────────────
  const watts = activity.streams?.watts ?? activity.raw_data?.streams?.watts ?? null
  if (!watts || !Array.isArray(watts) || watts.length < 5) {
    // Pas de données exploitables → on marque traité avec résultat vide
    await sb.from('activities')
      .update({ records_processed: true, records_beaten: { allTime: [], year: [] } })
      .eq('id', activityId)
    return NextResponse.json({ allTime: [], year: [] })
  }

  // ── Date de l'activité + année ───────────────────────────────
  const startedAt = activity.started_at ?? new Date().toISOString()
  const activityDate = startedAt.slice(0, 10)
  const activityYear = startedAt.slice(0, 4)
  const currentYear  = String(new Date().getFullYear())

  // ── Records existants pour le user (bike, toutes durées suivies) ─
  const labels = BIKE_RECORD_DURS.map(d => d.label)
  const { data: prRows } = await sb
    .from('personal_records')
    .select('distance_label, performance, achieved_at')
    .eq('user_id', user.id)
    .eq('sport', 'bike')
    .in('distance_label', labels)

  const existing = (prRows ?? []) as PersonalRecordRow[]
  // Best All Time + best Year par distance_label
  const bestAll:  Record<string, number> = {}
  const bestYear: Record<string, number> = {}
  for (const r of existing) {
    const w = parseInt(r.performance) || 0
    if (w <= 0) continue
    if (w > (bestAll[r.distance_label] ?? 0)) bestAll[r.distance_label] = w
    if (r.achieved_at.slice(0, 4) === currentYear && w > (bestYear[r.distance_label] ?? 0)) {
      bestYear[r.distance_label] = w
    }
  }

  // ── Calcule session MMP par durée + détecte records battus ───
  const allTimeBeaten: BeatenEntry[] = []
  const yearBeaten:    BeatenEntry[] = []
  const toInsert:      { distance_label: string; watts: number }[] = []

  for (const { d, label, display } of BIKE_RECORD_DURS) {
    if (d > watts.length) continue
    const sessionW = computeMmp(watts, d)
    if (sessionW <= 0) continue

    const prevAll  = bestAll[label]  ?? 0
    const prevYear = bestYear[label] ?? 0

    const beatsAll  = sessionW > prevAll
    const beatsYear = activityYear === currentYear && sessionW > prevYear && !beatsAll

    if (beatsAll) {
      allTimeBeaten.push({ label, display, watts: sessionW })
      toInsert.push({ distance_label: label, watts: sessionW })
    } else if (beatsYear) {
      yearBeaten.push({ label, display, watts: sessionW })
      toInsert.push({ distance_label: label, watts: sessionW })
    }
  }

  // ── Inserts personal_records ─────────────────────────────────
  if (toInsert.length > 0) {
    const rows = toInsert.map(t => ({
      user_id:          user.id,
      sport:            'bike',
      distance_label:   t.distance_label,
      performance:      String(t.watts),
      performance_unit: 'watts',
      event_type:       'auto_session',
      achieved_at:      activityDate,
      race_name:        null,
      pace_s_km:        null,
      elevation_gain_m: null,
      split_swim:       null,
      split_bike:       null,
      split_run:        null,
      station_times:    null,
      notes:            `Auto-détecté depuis l'activité du ${activityDate}`,
    }))
    const { error: insErr } = await sb.from('personal_records').insert(rows)
    if (insErr) {
      console.error('[process-records] insert error:', insErr.message)
      // Ne pas marquer comme processed si l'insert a échoué
      return NextResponse.json({ error: 'Insertion échouée', detail: insErr.message }, { status: 500 })
    }
  }

  // ── Marque comme traité + cache le résultat ──────────────────
  const payload: BeatenPayload = { allTime: allTimeBeaten, year: yearBeaten }
  await sb.from('activities')
    .update({ records_processed: true, records_beaten: payload })
    .eq('id', activityId)

  return NextResponse.json(payload)
}
