// ══════════════════════════════════════════════════════════════════
// CADENCES — moteur de calcul (fonctions pures, aucun accès réseau/DB).
// Spéc §8. Validé contre les 3 cas de référence de la §13 (voir validate.ts).
//
// Règle d'or : ne jamais arrondir ici. L'arrondi est fait à l'affichage.
// ══════════════════════════════════════════════════════════════════

import type {
  CadencesConfig, Mode, Profile, QualityKey, QualityScore,
  TestConfig, TestInput, TestScore, CampaignScore, Weights,
} from './types'

const QUALITIES: QualityKey[] = ['vitesse', 'force', 'puissance', 'explosivite', 'endurance', 'vo2max', 'coordination']

/** Niveau nommé posé sur un pourcentage continu (habillage, ne change pas le calcul). */
export function levelFor(pct: number, config: CadencesConfig): string {
  let label = config.levels[0]?.label ?? ''
  for (const l of config.levels) if (pct >= l.min_pct) label = l.label
  return label
}

/** Facteur d'âge d'une épreuve = moyenne pondérée des PF de ses qualités (§8.5, §9). */
export function ageFactorForTest(test: TestConfig, ageBand: string, config: CadencesConfig): number {
  const pf = config.age.pf[ageBand]
  if (!pf) return 1
  let f = 0
  for (const q of QUALITIES) f += (test.weights[q] ?? 0) * (pf[q] ?? 1)
  return f
}

/** Seuils Réf/Max ajustés selon le sexe, l'âge et le sens de l'épreuve (§8.4–8.5). */
export function adjustedThresholds(
  test: TestConfig, profile: Profile, mode: Mode, config: CadencesConfig,
): { ref: number; max: number } {
  const base = profile.sex === 'M' ? test.male : test.female
  if (mode === 'general') return { ref: base.ref, max: base.max }
  const pf = ageFactorForTest(test, profile.ageBand, config)
  if (test.direction === 'higher_is_better') {
    return { ref: base.ref * pf, max: base.max * pf }
  }
  // tests chronométrés : division par PF^e, exposant propre à l'épreuve (§9).
  const e = test.age_time_exponent ?? 1
  const d = Math.pow(pf, e)
  return { ref: base.ref / d, max: base.max / d }
}

/** Applique la correction d'équipement (§12) à la valeur brute. */
export function applyEquipment(value: number, test: TestConfig, equipment?: string | null): number {
  const eq = test.equipment
  if (!eq || !equipment || equipment !== eq.applies_when) return value
  return eq.rule === 'result_x_(1-pct)' ? value * (1 - eq.pct) : value * (1 + eq.pct)
}

/** Score d'une épreuve (§8.1–8.8). `value` est déjà agrégée (best/sum). */
export function computeTest(
  test: TestConfig, input: TestInput, profile: Profile, mode: Mode, config: CadencesConfig,
): TestScore | null {
  if (input.value == null || !Number.isFinite(input.value)) return null

  // 2. équipement
  let x = applyEquipment(input.value, test, input.equipment)
  // 3. normalisation (ratio au poids de corps : kg→ratio, W→W/kg, lest→ratio)
  if (test.kind === 'ratio') x = x / profile.bodyWeightKg

  // 4–5. seuils ajustés
  const { ref, max } = adjustedThresholds(test, profile, mode, config)

  // 6. pourcentage : plancher 0, PAS de plafond. Fonctionne pour les deux sens
  //    car (max − ref) est négatif pour un temps.
  const pctOf = (v: number, r: number, m: number) =>
    Math.max(0, config.anchors.ref_pct + (config.anchors.max_pct - config.anchors.ref_pct) * (v - r) / (m - r))

  // 7. points — épreuve simple : pct × pts_max. Épreuve à critères (meilleur +
  //    total des essais) : chaque critère est noté sur les mêmes seuils (× n
  //    essais pour le total) ; le pct de l'épreuve = points / pts_max.
  if (test.criteria && test.criteria.length) {
    const n = Math.max(1, test.attempts ?? 1)
    const raw = (input.parts ?? []).filter((v) => Number.isFinite(v))
    // Sans détail des essais (anciennes saisies) : tous égaux à la valeur retenue.
    const parts = raw.length ? raw : new Array(n).fill(input.value)
    let points = 0
    for (const c of test.criteria) {
      let v: number, r = ref, m = max
      if (c.aggregate === 'sum') {
        let sum = 0
        for (const p of parts) {
          let y = applyEquipment(p, test, input.equipment)
          if (test.kind === 'ratio') y = y / profile.bodyWeightKg
          sum += y
        }
        // essais manquants : complétés par la moyenne des essais saisis (neutre)
        v = parts.length < n ? (sum / parts.length) * n : sum
        r = ref * n; m = max * n
      } else {
        v = x
      }
      points += pctOf(v, r, m) * c.pts_max
    }
    const pct = points / test.pts_max
    return { slug: test.slug, valueUsed: x, refAdj: ref, maxAdj: max, pct, points, level: levelFor(pct, config) }
  }

  const pct = pctOf(x, ref, max)
  const points = pct * test.pts_max

  return { slug: test.slug, valueUsed: x, refAdj: ref, maxAdj: max, pct, points, level: levelFor(pct, config) }
}

/** Score complet d'une campagne (§8 totaux). Ne somme que les épreuves passées. */
export function computeCampaign(
  inputs: TestInput[], profile: Profile, mode: Mode, config: CadencesConfig,
): CampaignScore {
  const bySlug = new Map(inputs.map((i) => [i.slug, i]))
  const byTest: Record<string, TestScore> = {}
  let total = 0

  // numérateur/dénominateur par qualité, sur les seules épreuves passées
  const qPoints = zeroQ()
  const qPtsMax = zeroQ()

  for (const test of config.tests) {
    const input = bySlug.get(test.slug)
    if (!input) continue
    const s = computeTest(test, input, profile, mode, config)
    if (!s) continue
    byTest[test.slug] = s
    total += s.points
    for (const q of QUALITIES) {
      const w = test.weights[q] ?? 0
      if (w === 0) continue
      qPoints[q] += s.points * w
      qPtsMax[q] += test.pts_max * w
    }
  }

  const byQuality = {} as Record<QualityKey, QualityScore>
  for (const q of QUALITIES) {
    const ptsMax = qPtsMax[q]
    const pct = ptsMax > 0 ? qPoints[q] / ptsMax : 0
    byQuality[q] = { points: qPoints[q], ptsMax, pct, level: levelFor(pct, config) }
  }

  const totalPctVs1000 = total / config.total_points
  return { total, totalPctVs1000, globalLevel: levelFor(totalPctVs1000, config), byTest, byQuality }
}

function zeroQ(): Record<QualityKey, number> {
  return { vitesse: 0, force: 0, puissance: 0, explosivite: 0, endurance: 0, vo2max: 0, coordination: 0 }
}

/** Agrège des valeurs multiples (6×200 m = somme, sauts = meilleur…) selon la config. */
export function aggregateParts(test: TestConfig, parts: number[]): number | null {
  const vals = parts.filter((v) => Number.isFinite(v))
  if (!vals.length) return null
  if (test.aggregate === 'sum') return vals.reduce((a, b) => a + b, 0)
  // 'best' : meilleur selon le sens (plus grand ou plus petit)
  return test.direction === 'higher_is_better' ? Math.max(...vals) : Math.min(...vals)
}

export const QUALITY_KEYS = QUALITIES
export type { Weights }
