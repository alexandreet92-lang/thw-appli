// ══════════════════════════════════════════════════════════════════
// CADENCES — métadonnées d'affichage pour LE SITE (public, lecture seule).
// Le site (public/site, sans bundler) ne peut pas importer le moteur TS :
// il récupère ici le plan des jours, les épreuves, les protocoles, les
// qualités, les niveaux et la palette. Aucun secret, aucun calcul.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { CONFIG, DAYS } from '@/lib/cadences/catalog'
import { PROTOCOLS, ECHAUFFEMENT_GENERAL, HYROX_THRUSTER_KG } from '@/lib/cadences/protocols'
import { LEVEL_COLORS } from '@/lib/cadences/palette'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRACK = new Set(['sprint_30m', 'sprint_100m', 'run_400m', 'run_3200m'])
const SWIM = new Set(['swim_50m', 'swim_200m'])

export async function GET(): Promise<NextResponse> {
  const tests = CONFIG.tests.map((t) => ({
    slug: t.slug,
    group: t.group,
    name: t.name,
    unit: t.unit,
    direction: t.direction,
    kind: t.kind,                                   // 'abs' | 'ratio'
    pts_max: t.pts_max,
    day: t.day,
    order_in_day: t.order_in_day,
    aggregate: t.aggregate ?? 'best',
    partCount: t.slug === 'amrap_20min' ? 1 : (t.attempts && t.attempts > 1 ? t.attempts : 1),
    equipmentField: t.equipment?.field ?? null,     // 'chaussures' | 'ceinture' | null
    hasTiming: TRACK.has(t.slug),
    hasPool: SWIM.has(t.slug),
    hasVariant: t.slug === 'hyrox_circuit',
    isAmrap: t.slug === 'amrap_20min',
    // Barème publié (pour les tableaux Réf/Max H/F) + corrections d'équipement.
    male: t.male,
    female: t.female,
    weights: t.weights,
    equipment: t.equipment ?? null,                 // {field,applies_when,pct,rule}
    ageTimeExponent: t.age_time_exponent ?? null,
  }))

  const res = NextResponse.json({
    version: CONFIG.version,
    totalPoints: CONFIG.total_points,
    totalTests: CONFIG.tests.length,
    anchors: CONFIG.anchors,                         // {ref_pct, max_pct}
    age: CONFIG.age,                                 // {min,max,bands,pf}
    days: DAYS,
    tests,
    protocols: PROTOCOLS,
    echauffement: ECHAUFFEMENT_GENERAL,
    hyroxThrusterKg: HYROX_THRUSTER_KG,
    qualities: CONFIG.qualities,
    levels: CONFIG.levels,
    palette: LEVEL_COLORS,
  })
  // Lecture publique, stable sur la durée d'une version de barème.
  res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return res
}
