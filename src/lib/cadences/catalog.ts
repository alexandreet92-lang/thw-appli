// ══════════════════════════════════════════════════════════════════
// DECAFORM — catalogue multi-produits : plan des jours, regroupement des
// épreuves, tranche d'âge. S'appuie sur la config (source de vérité §6).
//
// Chaque batterie (Decaform, Kids, Teens, Start, Senior) = une config dans
// le REGISTRY, identifiée par `test_key`. Decaform reste la config par défaut
// (rétro-compatibilité : tout le code existant appelle les helpers sans config).
// ══════════════════════════════════════════════════════════════════

import decaform from './cadences.config.json'
import type { CadencesConfig, TestConfig, DayPlan } from './types'

/** Config Decaform (défaut historique). */
export const CONFIG = decaform as unknown as CadencesConfig

// ── Registre des produits ────────────────────────────────────────────
// Stage B ajoutera ici kids_8_10, kids_11_12, teens_13_14, teens_15_17,
// start, senior (imports de leurs JSON). Pour l'instant : Decaform seul.
const REGISTRY: Record<string, CadencesConfig> = {
  decaform: CONFIG,
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
