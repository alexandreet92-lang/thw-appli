// ══════════════════════════════════════════════════════════════════
// CADENCES — historique des tests terminés pour LE SITE (cookie → 401 natif).
// Lit les instantanés figés à la clôture (cadences_snapshots) + le profil de
// chaque campagne. Renvoie une liste prête pour la page « Mon historique ».
// Aucun recalcul : source de vérité = les snapshots de clôture.
// Les conditions (température / météo) ne sont pas encore collectées → null.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { levelFor } from '@/lib/cadences/engine'
import { CONFIG, getConfig } from '@/lib/cadences/catalog'
import { legacyTestsOf } from '@/lib/cadences/catalogView'
import { parseSkippedStations } from '@/lib/cadences/protocols'
import type { CadencesConfig } from '@/lib/cadences/types'

// Épreuves retirées du barème (remplacées par le Conditioning).
const RETIRED = new Set(['amrap_20min', 'hyrox_circuit', 'hyrox_circuit_5', 'circuit_5_tours'])

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const url = new URL(request.url)
  // Filtre produit optionnel : l'historique d'une batterie ne mélange pas les
  // tests d'autres produits (comparaisons intra-produit uniquement).
  const testKey = url.searchParams.get('test_key')

  // Campagnes terminées de l'utilisateur (RLS), les plus anciennes d'abord.
  let q = sb
    .from('cadences_campaigns')
    .select('id, test_key, scale_version_id, scale_sex, age_at_start, body_weight_kg, started_on, completed_on')
    .eq('status', 'completed')
    .order('completed_on', { ascending: true })
  if (testKey) q = q.eq('test_key', testKey)
  const { data: camps } = await q
  if (!camps || !camps.length) return NextResponse.json({ tests: [] })

  // Config épinglée de chaque campagne (barème de son produit), repli Decaform.
  const svIds = Array.from(new Set(camps.map((c) => c.scale_version_id).filter(Boolean)))
  const cfgById = new Map<string, CadencesConfig>()
  if (svIds.length) {
    const { data: scales } = await sb.from('cadences_scale_versions').select('id, config').in('id', svIds)
    for (const s of scales ?? []) if (s.config) cfgById.set(s.id, s.config as unknown as CadencesConfig)
  }
  const configFor = (svId: string | null): CadencesConfig => (svId && cfgById.get(svId)) || CONFIG

  // Instantanés des DEUX modes (général + ajusté à l'âge) pour ces campagnes.
  const ids = camps.map((c) => c.id)
  const { data: snaps } = await sb
    .from('cadences_snapshots')
    .select('campaign_id, age_mode, total_points, quality_scores, test_scores')
    .in('campaign_id', ids)
  const byCamp = new Map<string, { general?: Snap; age?: Snap }>()
  for (const s of (snaps ?? []) as Snap[]) {
    const e = byCamp.get(s.campaign_id) ?? {}
    if (s.age_mode === 'age') e.age = s; else e.general = s
    byCamp.set(s.campaign_id, e)
  }

  // Conditions (température / météo) des épreuves extérieures, agrégées par
  // campagne. Tolérant : si les colonnes n'existent pas encore (migration non
  // appliquée), on continue sans conditions (tempC = null).
  const condByCamp = new Map<string, { temps: number[]; weathers: string[] }>()
  const { data: conds } = await sb
    .from('cadences_results')
    .select('campaign_id, venue, temperature_c, weather')
    .in('campaign_id', ids)
    .eq('venue', 'outdoor')
  for (const r of conds ?? []) {
    const c = condByCamp.get(r.campaign_id) ?? { temps: [], weathers: [] }
    if (r.temperature_c != null && Number.isFinite(Number(r.temperature_c))) c.temps.push(Number(r.temperature_c))
    if (typeof r.weather === 'string' && r.weather.trim()) c.weathers.push(r.weather.trim())
    condByCamp.set(r.campaign_id, c)
  }
  const condOf = (id: string) => {
    const c = condByCamp.get(id)
    if (!c || !c.temps.length) return { outdoor: false, tempC: null as number | null, weatherLabel: '' }
    const avg = Math.round(c.temps.reduce((a, b) => a + b, 0) / c.temps.length)
    const uniq = Array.from(new Set(c.weathers))
    return { outdoor: true, tempC: avg, weatherLabel: uniq.slice(0, 3).join(', ') }
  }

  // Durée réelle du test : premier → dernier jour de saisie (tested_on). Au-delà de
  // `max_days` du produit, les résultats sont moins comparables (affichage d'une alerte).
  const spanByCamp = new Map<string, { first: string; last: string }>()
  const { data: dates } = await sb.from('cadences_results').select('campaign_id, tested_on').in('campaign_id', ids)
  for (const r of dates ?? []) {
    if (!r.tested_on) continue
    const d = String(r.tested_on).slice(0, 10)
    const c = spanByCamp.get(r.campaign_id) ?? { first: d, last: d }
    if (d < c.first) c.first = d
    if (d > c.last) c.last = d
    spanByCamp.set(r.campaign_id, c)
  }
  const durationOf = (id: string): number | null => {
    const c = spanByCamp.get(id)
    if (!c) return null
    return Math.round((Date.parse(c.last + 'T12:00:00Z') - Date.parse(c.first + 'T12:00:00Z')) / 86400000) + 1
  }

  // Stations du Conditioning « passées » (forfait), pour la pastille du grand tableau.
  const skippedByCamp = new Map<string, number>()
  const { data: notesRows } = await sb.from('cadences_results').select('campaign_id, notes').in('campaign_id', ids).like('notes', 'stations_passees=%')
  for (const r of notesRows ?? []) skippedByCamp.set(r.campaign_id, parseSkippedStations(r.notes).length)

  // Valeurs brutes saisies (charge en kg, temps total, temps de chaque répétition) par campagne et épreuve :
  // le snapshot ne garde que la valeur normalisée (ratio au poids de corps), insuffisante pour l'affichage.
  type RawRes = { raw: number | null; parts: number[] | null; variant: string | null }
  const rawByCamp = new Map<string, Map<string, RawRes>>()
  const { data: rawRows } = await sb
    .from('cadences_results')
    .select('campaign_id, test_slug, raw_value, raw_parts, variant, status')
    .in('campaign_id', ids)
  for (const r of rawRows ?? []) {
    if (r.status && r.status !== 'validated') continue
    const m = rawByCamp.get(r.campaign_id) ?? new Map<string, RawRes>()
    const parts = Array.isArray(r.raw_parts) ? (r.raw_parts as unknown[]).map(Number).filter((n) => Number.isFinite(n)) : null
    m.set(r.test_slug, { raw: r.raw_value != null ? Number(r.raw_value) : null, parts: parts && parts.length ? parts : null, variant: r.variant ?? null })
    rawByCamp.set(r.campaign_id, m)
  }

  // Un instantané (jsonb) → { total, level, tests{slug}, qualities{key} } selon la config du produit.
  const mapSnap = (s: Snap | undefined, config: CadencesConfig, campId: string) => {
    if (!s) return null
    const max = config.total_points
    const ptsMax: Record<string, number> = {}
    config.tests.forEach((t) => { ptsMax[t.slug] = t.pts_max })
    const total = Number(s.total_points)
    const byTest = (s.test_scores ?? {}) as Record<string, { points?: number; level?: string; valueUsed?: number }>
    const testsMap: Record<string, { points: number; level: string; value: number | null; max: number; raw: number | null; parts: number[] | null; variant: string | null }> = {}
    for (const slug of Object.keys(byTest)) {
      const r = byTest[slug]
      const rr = rawByCamp.get(campId)?.get(slug)
      testsMap[slug] = {
        points: Number(r.points ?? 0), level: String(r.level ?? ''), value: r.valueUsed ?? null, max: ptsMax[slug] ?? 0,
        raw: rr?.raw ?? null, parts: rr?.parts ?? null, variant: rr?.variant ?? null,
      }
    }
    const byQual = (s.quality_scores ?? {}) as Record<string, { pct?: number; level?: string }>
    const qualMap: Record<string, { pct: number; level: string }> = {}
    for (const key of Object.keys(byQual)) {
      qualMap[key] = { pct: Number(byQual[key].pct ?? 0), level: String(byQual[key].level ?? '') }
    }
    return { total: Math.round(total), level: levelFor(total / max, config), tests: testsMap, qualities: qualMap }
  }

  const tests = camps.flatMap((c) => {
    const config = configFor(c.scale_version_id)
    const e = byCamp.get(c.id)
    const g = mapSnap(e?.general, config, c.id)
    const a = mapSnap(e?.age, config, c.id) ?? g
    if (!g) return []
    const cond = condOf(c.id)
    return [{
      id: c.id,
      test_key: c.test_key ?? 'decaform',
      date: c.completed_on ?? c.started_on,
      sex: c.scale_sex,
      age: c.age_at_start,
      weight: Number(c.body_weight_kg),
      tempC: cond.tempC,
      outdoor: cond.outdoor,
      weatherLabel: cond.weatherLabel,
      scoreMax: config.total_points,                // total du barème (1000 pour Decaform, 100 pour le test de forme…)
      version: config.version,                      // version du barème épinglée à ce test
      stationsPassees: skippedByCamp.get(c.id) ?? 0, // stations du Conditioning passées (forfait)
      durationDays: durationOf(c.id),               // jours entre la 1re et la dernière saisie
      maxDays: config.max_days ?? null,             // durée maximale conseillée (produit)
      // Général (primaire)
      score: g.total, level: g.level, tests: g.tests, qualities: g.qualities,
      // Ajusté à l'âge
      scoreA: a!.total, levelA: a!.level, testsA: a!.tests, qualitiesA: a!.qualities,
    }]
  })

  // Épreuves d'anciennes versions absentes du catalogue servi (ex. AMRAP / circuit Hyrox v1.x) : le site les garde en colonnes.
  const legacy = new Map<string, ReturnType<typeof legacyTestsOf>[number]>()
  for (const c of camps) {
    for (const t of legacyTestsOf(configFor(c.scale_version_id), getConfig(c.test_key as string | undefined))) {
      if (RETIRED.has(t.slug)) continue   // AMRAP et circuit 5 tours : remplacés par le Conditioning, plus affichés
      if (!legacy.has(t.slug)) legacy.set(t.slug, t)
    }
  }
  return NextResponse.json({ tests, legacyTests: Array.from(legacy.values()) })
}

type Snap = { campaign_id: string; age_mode: string; total_points: number; quality_scores: unknown; test_scores: unknown }
