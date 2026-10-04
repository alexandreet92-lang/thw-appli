// ══════════════════════════════════════════════════════════════════
// CADENCES — catalogue : plan des 12 jours, regroupement des épreuves,
// tranche d'âge. S'appuie sur la config (source de vérité §6).
// ══════════════════════════════════════════════════════════════════

import config from './cadences.config.json'
import type { CadencesConfig, TestConfig } from './types'

export const CONFIG = config as unknown as CadencesConfig

// Planning figé (§5). Les jours de repos n'ont pas d'épreuve.
export const DAYS: { day: number; label: string; rest: boolean }[] = [
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

/** Épreuves d'un jour, triées par ordre de passage. */
export function testsOfDay(day: number): TestConfig[] {
  return CONFIG.tests
    .filter((t) => t.day === day)
    .sort((a, b) => a.order_in_day - b.order_in_day)
}

/** Une épreuve par son slug. */
export function testBySlug(slug: string): TestConfig | undefined {
  return CONFIG.tests.find((t) => t.slug === slug)
}

/** Tranche d'âge (§9) depuis l'âge en années, ou null hors 18–80. */
export function ageBandFor(age: number): string | null {
  if (!Number.isFinite(age) || age < CONFIG.age.min || age > CONFIG.age.max) return null
  for (const band of CONFIG.age.bands) {
    const [lo, hi] = band.split('-').map(Number)
    if (age >= lo && age <= hi) return band
  }
  return null
}

/** Combien d'épreuves comporte le test au total (hors repos). */
export const TOTAL_TESTS = CONFIG.tests.length

/** Les 7 qualités (clé + libellé). */
export const QUALITIES = CONFIG.qualities

/** Niveau nommé + sa place dans l'échelle (pour les couleurs). */
export function levelIndex(label: string): number {
  return CONFIG.levels.findIndex((l) => l.label === label)
}
