// ══════════════════════════════════════════════════════════════════
// Analyse de profil par sport et par ANNÉE, à partir des activités réelles.
// Ne calcule QUE les axes fiables (puissance vélo W/kg, VMA estimée en course,
// run compromised Hyrox) ; les axes qui exigent un vrai test restent à 0 (saisie
// manuelle ultérieure). Signale « pas assez de données » quand le sport a trop
// peu d'activités exploitables.
//
// Persistance : table `sport_profiles` (params jsonb par sport+année, category =
// année, effective_from = 1er janvier, is_current = année courante).
// ══════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'

export type SportKey = 'running' | 'cycling' | 'hyrox'

// Seuil minimal d'activités exploitables pour une analyse « correcte ».
const MIN_ACTS: Record<SportKey, number> = { running: 3, cycling: 3, hyrox: 1 }

export interface SportAxes {
  scores: Record<string, number>   // axis-id → 0..100
  count: number                    // activités exploitables trouvées
  enough: boolean                  // assez de données ?
}
export interface AnalyzeResult {
  year: number
  sports: Record<SportKey, SportAxes>
}

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))
const num = (x: unknown): number => (typeof x === 'number' && isFinite(x) ? x : 0)

// power_curve / pace_curve sont stockés en jsonb Record<string(secondes|mètres), valeur>.
function curveVal(curve: any, key: string): number {
  if (!curve || typeof curve !== 'object') return 0
  return num(curve[key])
}

const BIKE_RE = /bike|ride|cycl|v[ée]lo|velo|virtual/i
const RUN_RE = /run|course|trail/i

interface ActRow {
  sport_type: string | null
  started_at: string | null
  power_curve: any
  pace_curve: any
  distance_m: number | null
  moving_time_s: number | null
}

// Analyse une année (ou 'all' pour tout l'historique).
export async function analyzeYear(sb: SupabaseClient, uid: string, year: number | 'all'): Promise<AnalyzeResult> {
  const yr = year === 'all' ? new Date().getFullYear() : year
  let q = sb.from('activities')
    .select('sport_type, started_at, power_curve, pace_curve, distance_m, moving_time_s')
    .eq('user_id', uid)
  if (year !== 'all') {
    q = q.gte('started_at', `${year}-01-01`).lt('started_at', `${year + 1}-01-01`)
  }
  const { data } = await q
  const acts = (data ?? []) as ActRow[]

  // ── Cyclisme : meilleure puissance 20′ / 5′ / 1′ (W) → W/kg via poids ──
  let weight = 0
  { const { data: prof } = await sb.from('profiles').select('weight_kg').eq('id', uid).maybeSingle(); weight = num(prof?.weight_kg) }

  const bike = acts.filter(a => BIKE_RE.test(a.sport_type ?? '') && a.power_curve)
  let p20 = 0, p5 = 0, p1 = 0
  for (const a of bike) {
    p20 = Math.max(p20, curveVal(a.power_curve, '1200'))
    p5 = Math.max(p5, curveVal(a.power_curve, '300'))
    p1 = Math.max(p1, curveVal(a.power_curve, '60'))
  }
  const wkg20 = weight > 0 ? p20 / weight : 0
  const wkg5 = weight > 0 ? p5 / weight : 0
  const cyclingScores: Record<string, number> = {
    puissance: wkg20 > 0 ? clamp((wkg20 - 1) / 5 * 100) : 0,   // 10′/20′/30′ (20′ retenu, fiable)
    sprintpma: wkg5 > 0 ? clamp((wkg5 - 2) / 6 * 100) : 0,     // PMA ~5′ ; sprint 1′ dispo aussi
    // endurance / resistance / grimpeur → test/analyse dédiée (laissés à 0)
  }
  const bikeUsable = bike.filter(a => curveVal(a.power_curve, '1200') > 0).length

  // ── Running : VMA estimée = meilleure vitesse ~6′ (pace_curve 1500/2000 m) ──
  const run = acts.filter(a => RUN_RE.test(a.sport_type ?? '') && a.pace_curve)
  let vmaEst = 0
  for (const a of run) {
    for (const [distKey, dist] of [['1500', 1500], ['2000', 2000], ['1609.34', 1609.34], ['1000', 1000]] as [string, number][]) {
      const tSec = curveVal(a.pace_curve, distKey)
      if (tSec > 0) vmaEst = Math.max(vmaEst, (dist / tSec) * 3.6)  // km/h
    }
  }
  const runningScores: Record<string, number> = {
    vma: vmaEst > 0 ? clamp((vmaEst - 10) / 12 * 100) : 0,
    // sprint / explo / seuil / eco / endur → test dédié (laissés à 0)
  }
  const runUsable = run.filter(a => (a.pace_curve && (curveVal(a.pace_curve, '1500') > 0 || curveVal(a.pace_curve, '2000') > 0 || curveVal(a.pace_curve, '1000') > 0))).length

  // ── Hyrox : run compromised = allure moyenne des courses (temps_run_total / 8 km) ──
  let hyroxScores: Record<string, number> = { runcomp: 0 }
  let hyroxCount = 0
  {
    let hq = sb.from('hyrox_races').select('date, temps_run_total').eq('user_id', uid)
    if (year !== 'all') hq = hq.gte('date', `${year}-01-01`).lt('date', `${year + 1}-01-01`)
    const { data: hr } = await hq
    const races = (hr ?? []) as { date: string; temps_run_total: string | null }[]
    hyroxCount = races.length
    const paces: number[] = []
    for (const r of races) {
      const parts = (r.temps_run_total ?? '').split(':').map(Number)
      const totSec = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : 0
      if (totSec > 0) paces.push(totSec / 8)  // 8 km de run au total
    }
    if (paces.length) {
      const avgPerKm = paces.reduce((a, b) => a + b, 0) / paces.length
      hyroxScores = { runcomp: clamp((360 - avgPerKm) / 180 * 100) }  // 6:00/km=0, 3:00/km=100
    }
  }

  return {
    year: yr,
    sports: {
      cycling: { scores: cyclingScores, count: bikeUsable, enough: bikeUsable >= MIN_ACTS.cycling },
      running: { scores: runningScores, count: runUsable, enough: runUsable >= MIN_ACTS.running },
      hyrox:   { scores: hyroxScores,   count: hyroxCount, enough: hyroxCount >= MIN_ACTS.hyrox },
    },
  }
}

// Instantané persistant (une ligne par sport et par année).
export async function saveSnapshot(sb: SupabaseClient, uid: string, res: AnalyzeResult): Promise<void> {
  const currentYear = new Date().getFullYear()
  const category = String(res.year)
  const sports = Object.keys(res.sports) as SportKey[]
  // Remplace les instantanés existants de cette année pour ces sports.
  await sb.from('sport_profiles').delete().eq('user_id', uid).eq('category', category).in('sport', sports)
  const rows = sports
    .filter(s => res.sports[s].enough)   // n'enregistre que les analyses valides
    .map(s => ({
      user_id: uid,
      sport: s,
      category,
      params: { scores: res.sports[s].scores, count: res.sports[s].count, year: res.year },
      effective_from: `${res.year}-01-01`,
      is_current: res.year === currentYear,
      updated_at: new Date().toISOString(),
    }))
  if (rows.length) await sb.from('sport_profiles').insert(rows)
}

// Charge tous les instantanés → { [year]: { [sport]: scores } } + années dispo.
export interface Snapshots {
  byYear: Record<string, Partial<Record<SportKey, Record<string, number>>>>
  years: number[]
}
export async function loadSnapshots(sb: SupabaseClient, uid: string): Promise<Snapshots> {
  const { data } = await sb.from('sport_profiles')
    .select('sport, category, params').eq('user_id', uid)
  const byYear: Record<string, Partial<Record<SportKey, Record<string, number>>>> = {}
  const yearSet = new Set<number>()
  for (const row of (data ?? []) as { sport: string; category: string | null; params: any }[]) {
    const yr = row.category ?? ''
    if (!yr) continue
    yearSet.add(parseInt(yr))
    if (!byYear[yr]) byYear[yr] = {}
    byYear[yr][row.sport as SportKey] = (row.params?.scores ?? {}) as Record<string, number>
  }
  return { byYear, years: [...yearSet].sort((a, b) => b - a) }
}
