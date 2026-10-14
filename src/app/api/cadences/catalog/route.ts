// ══════════════════════════════════════════════════════════════════
// CADENCES — métadonnées d'affichage pour LE SITE (public, lecture seule).
// Le site (public/site, sans bundler) ne peut pas importer le moteur TS :
// il récupère ici le plan des jours, les épreuves, les protocoles, les
// qualités, les niveaux et la palette. Aucun secret, aucun calcul.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { getConfig, daysOf, qualityShare } from '@/lib/cadences/catalog'
import { PROTOCOLS, ECHAUFFEMENT_GENERAL, HYROX_THRUSTER_KG, HYROX_LOADS_KG, warmupForTest } from '@/lib/cadences/protocols'
import { LEVEL_COLORS } from '@/lib/cadences/palette'
import { presentationOf } from '@/lib/cadences/presentations'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRACK = new Set(['sprint_30m', 'sprint_100m', 'run_400m', 'run_3200m'])
const SWIM = new Set(['swim_50m', 'swim_200m'])

export async function GET(request: Request): Promise<NextResponse> {
  // Produit demandé (?test_key=) — repli Decaform.
  const testKey = new URL(request.url).searchParams.get('test_key')
  const CONFIG = getConfig(testKey)
  const DAYS = daysOf(CONFIG)

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
    venue: t.venue ?? 'indoor',                     // 'indoor' | 'outdoor' | 'toggle' (vélo)
    aggregate: t.aggregate ?? 'best',
    criteria: t.criteria ?? null,                   // [{aggregate,pts_max}] : meilleur + total des essais
    partCount: t.slug === 'amrap_20min' ? 1 : (t.attempts && t.attempts > 1 ? t.attempts : 1),
    partLabels: PROTOCOLS[t.slug]?.stations ?? null,        // libellés des parts (stations du Hyrox continu)
    partShare: PROTOCOLS[t.slug]?.stationShare ?? null,     // part du temps attendue par station (niveau Référence)
    equipmentField: t.equipment?.field ?? null,     // 'chaussures' | 'ceinture' | null
    rmChoice: t.rm_choice === true,                 // 3RM ou 5RM au choix (converti en équivalent 3RM)
    hasTiming: TRACK.has(t.slug),
    hasPool: SWIM.has(t.slug),
    hasVariant: t.slug === 'hyrox_circuit',
    isHyroxContinu: t.slug === 'hyrox_continu',
    isAmrap: t.slug === 'amrap_20min',
    // Barème publié (pour les tableaux Réf/Max H/F) + corrections d'équipement.
    male: t.male,
    female: t.female,
    weights: t.weights,
    equipment: t.equipment ?? null,                 // {field,applies_when,pct,rule}
    ageTimeExponent: t.age_time_exponent ?? null,
  }))

  const res = NextResponse.json({
    testKey: CONFIG.test_key ?? 'decaform',
    title: CONFIG.title ?? 'Decaform',
    population: CONFIG.population ?? '',
    version: CONFIG.version,
    totalPoints: CONFIG.total_points,
    totalTests: CONFIG.tests.length,
    rm5Factor: CONFIG.rm5_to_3rm ?? 1.06,            // 5RM → équivalent 3RM
    anchors: CONFIG.anchors,                         // {ref_pct, max_pct}
    age: CONFIG.age,                                 // {min,max,bands,pf}
    days: DAYS,
    tests,
    // Protocoles par épreuve DU PRODUIT : protocole dédié s'il existe (slugs
    // Decaform réutilisés), sinon protocole minimal synthétisé (nouvelles épreuves).
    protocols: Object.fromEntries(
      CONFIG.tests.map((t) => {
        const p = PROTOCOLS[t.slug]
        if (p) return [t.slug, { ...p, warmup: warmupForTest(t.slug) }]
        return [t.slug, {
          objectif: t.name,
          materiel: [] as string[],
          etapes: ['Réalise l’épreuve « ' + t.name + ' » selon les consignes de ton encadrant.'],
          saisie: 'Saisis ton résultat (' + t.unit + ').',
          warmup: null,
        }]
      }),
    ),
    echauffement: ECHAUFFEMENT_GENERAL,
    hyroxThrusterKg: HYROX_THRUSTER_KG,
    hyroxLoads: HYROX_LOADS_KG,                      // charges du Hyrox continu (thruster / fentes / soulevé de terre)
    maxDays: CONFIG.max_days ?? null,                // durée maximale conseillée pour passer tout le test
    qualities: CONFIG.qualities,
    presentation: presentationOf(CONFIG.test_key ?? 'decaform'),
    qualityShare: qualityShare(CONFIG),
    levels: CONFIG.levels,
    palette: LEVEL_COLORS,
  })
  // Lecture publique, stable sur la durée d'une version de barème.
  res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return res
}
