// ══════════════════════════════════════════════════════════════════
// DECAFORM — catalogue multi-produits : plan des jours, regroupement des
// épreuves, tranche d'âge. S'appuie sur la config (source de vérité §6).
//
// Chaque batterie (Decaform, Kids, Teens, Start, Senior) = une config dans
// le REGISTRY, identifiée par `test_key`. Decaform reste la config par défaut
// (rétro-compatibilité : tout le code existant appelle les helpers sans config).
// ══════════════════════════════════════════════════════════════════

import { presentationOf } from '@/lib/cadences/presentations'
import decaform from './cadences.config.json'
import decaform_v1_2 from './configs/decaform_v1_2.config.json'
import kids_8_10 from './configs/kids_8_10.config.json'
import kids_11_12 from './configs/kids_11_12.config.json'
import teens_13_14 from './configs/teens_13_14.config.json'
import teens_15_17 from './configs/teens_15_17.config.json'
import start from './configs/start.config.json'
import senior from './configs/senior.config.json'
import senior_actif from './configs/senior_actif.config.json'
import forme from './configs/forme.config.json'
import type { CadencesConfig, TestConfig, DayPlan } from './types'

/** Config Decaform v1.1 (base de validation ; reference-cases.json). */
export const CONFIG_V1_1 = decaform as unknown as CadencesConfig
/** Config Decaform par défaut = la version en ligne (v1.2, épreuve mixte « motricité »).
 *  Sert de repli quand une campagne n'a pas de config épinglée lisible. */
export const CONFIG = decaform_v1_2 as unknown as CadencesConfig

// ── Registre des produits (batteries) ────────────────────────────────
// Clé = test_key. Ordre = ordre d'apparition dans le sélecteur.
// Decaform sert sa v1.2 (épreuve mixte « motricité ») pour la présentation et
// les nouvelles campagnes ; les campagnes existantes restent épinglées à leur version.
const REGISTRY: Record<string, CadencesConfig> = {
  decaform: decaform_v1_2 as unknown as CadencesConfig,
  kids_8_10: kids_8_10 as unknown as CadencesConfig,
  kids_11_12: kids_11_12 as unknown as CadencesConfig,
  teens_13_14: teens_13_14 as unknown as CadencesConfig,
  teens_15_17: teens_15_17 as unknown as CadencesConfig,
  start: start as unknown as CadencesConfig,
  senior: senior as unknown as CadencesConfig,
  senior_actif: senior_actif as unknown as CadencesConfig,
  forme: forme as unknown as CadencesConfig,
}

/** Clés de produits disponibles. */
export const TEST_KEYS = Object.keys(REGISTRY)

/** Config d'un produit (repli Decaform si inconnu/absent). */
export function getConfig(testKey?: string | null): CadencesConfig {
  return (testKey && REGISTRY[testKey]) || CONFIG
}

/** Métadonnées de chaque produit (pour le sélecteur de test au démarrage). */
export function productMeta(): { testKey: string; title: string; population: string; ageMin: number; ageMax: number; totalTests: number }[] {
  return Object.values(REGISTRY).map((c) => ({
    testKey: c.test_key ?? 'decaform',
    title: c.title ?? 'Decaform',
    population: c.population ?? '',
    ageMin: c.age.min,
    ageMax: c.age.max,
    totalTests: c.tests.length,
  }))
}

/** L'ordre d'affichage : par public, du plus jeune au plus âgé. */
const ORDRE_PRODUITS = ['kids_8_10', 'kids_11_12', 'teens_13_14', 'teens_15_17', 'forme', 'decaform', 'start', 'senior', 'senior_actif']

/** Part de chaque qualité dans le score (somme des points × poids), en fraction de 1. */
export function qualityShare(c: CadencesConfig): { key: string; label: string; share: number }[] {
  const total = c.tests.reduce((n, t) => n + t.pts_max, 0) || 1
  return c.qualities.map((q) => ({
    key: q.key,
    label: q.label,
    share: c.tests.reduce((n, t) => n + t.pts_max * (((t.weights as Record<string, number>)[q.key]) ?? 0), 0) / total,
  }))
}

/** Les cartes de la page « Les tests » : tout vient de la config, plus la présentation. */
export function productCards() {
  const cards = Object.values(REGISTRY).map((c) => {
    const key = c.test_key ?? 'decaform'
    const days = daysOf(c)
    const groups: string[] = []
    for (const t of c.tests) if (!groups.includes(t.group)) groups.push(t.group)
    const p = presentationOf(key)
    return {
      testKey: key,
      title: c.title ?? 'Decaform',
      population: c.population ?? '',
      ageMin: c.age.min,
      ageMax: c.age.max,
      totalTests: c.tests.length,
      totalPoints: c.total_points,
      days: days.length,
      testDays: days.filter((d) => !d.rest).length,
      groups,
      qualityShare: qualityShare(c),
      audience: p.audience,
      audienceLabel: p.audienceLabel,
      tagline: p.tagline,
      perDay: p.perDay,
    }
  })
  return cards.sort((a, b) => ORDRE_PRODUITS.indexOf(a.testKey) - ORDRE_PRODUITS.indexOf(b.testKey))
}

/** Test auto-sélectionné selon l'âge (dégrade vers Decaform tant qu'un produit
 *  n'est pas enregistré). 18-64 → Decaform (Start reste un choix explicite). */
export function autoTestKeyForAge(age: number): string {
  if (!Number.isFinite(age)) return 'decaform'
  if (age <= 10 && REGISTRY['kids_8_10']) return 'kids_8_10'
  if (age <= 12 && REGISTRY['kids_11_12']) return 'kids_11_12'
  if (age <= 14 && REGISTRY['teens_13_14']) return 'teens_13_14'
  if (age <= 17 && REGISTRY['teens_15_17']) return 'teens_15_17'
  if (age >= 65 && REGISTRY['senior']) return 'senior'
  return 'decaform'
}

// ── Plan des jours ───────────────────────────────────────────────────
const DECAFORM_DAYS: DayPlan[] = [
  { day: 1, label: 'Haltérophilie', rest: false },
  { day: 2, label: 'Sauts / Sprints / Agilité', rest: false },
  { day: 3, label: 'Natation', rest: false },
  { day: 4, label: 'Force', rest: false },
  { day: 5, label: 'Repos', rest: true },
  { day: 6, label: '400 m + 6.200', rest: false },
  { day: 7, label: 'Vélo (20 min)', rest: false },
  { day: 8, label: 'AMRAP', rest: false },
  { day: 9, label: 'Repos', rest: true },
  { day: 10, label: '3200 m', rest: false },
  { day: 11, label: 'Repos', rest: true },
  { day: 12, label: 'Hyrox', rest: false },
]

/** Plan des jours d'un produit (config.days si présent, sinon plan Decaform). */
export function daysOf(config: CadencesConfig = CONFIG): DayPlan[] {
  return config.days && config.days.length ? config.days : DECAFORM_DAYS
}

/** Plan des jours Decaform (rétro-compat : import direct `DAYS`). */
export const DAYS: DayPlan[] = daysOf(CONFIG)

/** Épreuves d'un jour, triées par ordre de passage. */
export function testsOfDay(day: number, config: CadencesConfig = CONFIG): TestConfig[] {
  return config.tests
    .filter((t) => t.day === day)
    .sort((a, b) => a.order_in_day - b.order_in_day)
}

/** Une épreuve par son slug. */
export function testBySlug(slug: string, config: CadencesConfig = CONFIG): TestConfig | undefined {
  return config.tests.find((t) => t.slug === slug)
}

/** Tranche d'âge (§9) depuis l'âge en années, ou null hors bornes du produit. */
export function ageBandFor(age: number, config: CadencesConfig = CONFIG): string | null {
  if (!Number.isFinite(age) || age < config.age.min || age > config.age.max) return null
  for (const band of config.age.bands) {
    const [lo, hi] = band.split('-').map(Number)
    if (age >= lo && age <= hi) return band
  }
  return null
}

/** Combien d'épreuves comporte Decaform (rétro-compat). */
export const TOTAL_TESTS = CONFIG.tests.length

/** Les qualités Decaform (clé + libellé) — rétro-compat. */
export const QUALITIES = CONFIG.qualities

/** Niveau nommé + sa place dans l'échelle (pour les couleurs). */
export function levelIndex(label: string, config: CadencesConfig = CONFIG): number {
  return config.levels.findIndex((l) => l.label === label)
}
