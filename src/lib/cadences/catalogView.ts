// ══════════════════════════════════════════════════════════════════
// CADENCES — « vue catalogue » d'une configuration : tout ce que le site affiche
// (épreuves, jours, protocoles, qualités, barème d'âge…). Partagée par
// /api/cadences/catalog (version active du produit) et /api/cadences/report
// (version ÉPINGLÉE d'un test plus ancien : sinon ses épreuves disparaîtraient de
// l'affichage dès qu'une version retire une épreuve).
// ══════════════════════════════════════════════════════════════════
import { daysOf, qualityShare } from './catalog'
import { PROTOCOLS, protocolFor, ECHAUFFEMENT_GENERAL, HYROX_THRUSTER_KG, CONDITIONING_LOADS, warmupForTest } from './protocols'
import { LEVEL_COLORS } from './palette'
import { presentationOf } from './presentations'
import type { CadencesConfig } from './types'

const TRACK = new Set(['sprint_30m', 'sprint_100m', 'run_400m', 'run_3200m'])
const SWIM = new Set(['swim_50m', 'swim_200m'])

export function buildTestsMeta(config: CadencesConfig) {
  return config.tests.map((t) => ({
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
    partLabels: protocolFor(t.slug, config.test_key)?.stations ?? null,        // libellés des parts (stations du Conditioning)
    partLabelsF: PROTOCOLS[t.slug]?.stationsF ?? null,      // libellés pour les femmes (australiennes, pompes sur les genoux)
    partShare: PROTOCOLS[t.slug]?.stationShare ?? null,     // part du temps attendue par station (niveau Référence, hommes)
    partShareF: PROTOCOLS[t.slug]?.stationShareF ?? null,   // idem pour les femmes
    equipmentField: t.equipment?.field ?? null,     // 'chaussures' | 'ceinture' | 'regression' | null
    rmChoice: t.rm_choice === true,                 // 3RM ou 5RM au choix (converti en équivalent 3RM)
    hasTiming: TRACK.has(t.slug),
    hasPool: SWIM.has(t.slug),
    hasVariant: t.slug === 'hyrox_circuit',
    isConditioning: t.slug === 'conditioning',
    isAmrap: t.slug === 'amrap_20min',
    // Barème publié (pour les tableaux Réf/Max H/F) + corrections d'équipement.
    male: t.male,
    female: t.female,
    weights: t.weights,
    equipment: t.equipment ?? null,                 // {field,applies_when,pct,rule}
    ageTimeExponent: t.age_time_exponent ?? null,
  }))
}

export function buildCatalogView(config: CadencesConfig) {
  return {
    testKey: config.test_key ?? 'decaform',
    title: config.title ?? 'Decaform',
    population: config.population ?? '',
    version: config.version,
    totalPoints: config.total_points,
    totalTests: config.tests.length,
    rm5Factor: config.rm5_to_3rm ?? 1.06,            // 5RM → équivalent 3RM
    anchors: config.anchors,                         // {ref_pct, max_pct}
    age: config.age,                                 // {min,max,bands,pf}
    days: daysOf(config),
    tests: buildTestsMeta(config),
    // Protocoles par épreuve DU PRODUIT : protocole dédié s'il existe (slugs
    // Decaform réutilisés), sinon protocole minimal synthétisé (nouvelles épreuves).
    protocols: Object.fromEntries(
      config.tests.map((t) => {
        const p = protocolFor(t.slug, config.test_key)
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
    conditioningLoads: CONDITIONING_LOADS,           // charges du Conditioning par tranche de poids (× facteur de force de l'âge côté site)
    maxDays: config.max_days ?? null,                // durée maximale conseillée pour passer tout le test
    qualities: config.qualities,
    presentation: presentationOf(config.test_key ?? 'decaform'),
    qualityShare: qualityShare(config),
    levels: config.levels,
    palette: LEVEL_COLORS,
  }
}

/** Épreuves présentes dans une config ÉPINGLÉE mais absentes de la config servie : affichées comme « ancienne version ». */
export function legacyTestsOf(pinned: CadencesConfig, current: CadencesConfig) {
  const cur = new Set(current.tests.map((t) => t.slug))
  return buildTestsMeta({ ...pinned, tests: pinned.tests.filter((t) => !cur.has(t.slug)) })
}
