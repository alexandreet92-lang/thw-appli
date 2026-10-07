// ══════════════════════════════════════════════════════════════════
// CADENCES — types du moteur et de la configuration.
// Source de vérité des chiffres : cadences.config.json (spéc §6).
// ══════════════════════════════════════════════════════════════════

export type QualityKey =
  | 'vitesse' | 'force' | 'puissance' | 'explosivite'
  | 'endurance' | 'vo2max' | 'coordination'

export type Sex = 'M' | 'F'
export type Mode = 'general' | 'age'
export type Direction = 'higher_is_better' | 'lower_is_better'
export type Kind = 'abs' | 'ratio'
export type Aggregate = 'best' | 'sum'

export type Weights = Record<QualityKey, number>

export interface EquipmentRule {
  field: string            // 'chaussures' | 'ceinture'
  applies_when: string     // 'pointes' | 'ceinture'
  pct: number
  rule: 'result_x_(1+pct)' | 'result_x_(1-pct)'
}

export interface Threshold { ref: number; max: number }

export interface TestConfig {
  slug: string
  group: string
  name: string
  unit: string
  direction: Direction
  kind: Kind
  pts_max: number
  male: Threshold
  female: Threshold
  weights: Weights
  day: number
  order_in_day: number
  equipment?: EquipmentRule
  age_time_exponent?: number
  attempts?: number
  aggregate?: Aggregate
  /** Notation à plusieurs critères (ex. sauts : meilleur essai + total des essais).
   *  La somme des pts_max des critères = pts_max de l'épreuve. */
  criteria?: Criterion[]
}

/** Un critère de notation : agrégat des essais + points attribués. Pour 'sum',
 *  les seuils Réf/Max sont multipliés par le nombre d'essais (`attempts`). */
export interface Criterion {
  aggregate: Aggregate
  pts_max: number
}

export interface CadencesConfig {
  version: string
  total_points: number
  anchors: { ref_pct: number; max_pct: number }
  age: {
    min: number
    max: number
    bands: string[]
    pf: Record<string, Record<QualityKey, number>>
  }
  qualities: { key: QualityKey; label: string }[]
  levels: { min_pct: number; label: string }[]
  tests: TestConfig[]
}

/** Profil de la personne qui passe le test. */
export interface Profile {
  sex: Sex
  bodyWeightKg: number
  ageBand: string          // ex. '36-40'
}

/** Résultat saisi pour une épreuve (valeur déjà agrégée : best/sum). */
export interface TestInput {
  slug: string
  value: number | null     // null = non passée → ignorée
  equipment?: string | null // 'pointes' | 'ceinture' | 'normales' | 'sans' | null
  parts?: number[] | null  // essais bruts (épreuves à critères : meilleur + total)
}

/** Score calculé d'une épreuve. */
export interface TestScore {
  slug: string
  valueUsed: number        // valeur après équipement + normalisation (ratio si kind=ratio)
  refAdj: number           // seuil Réf après âge (dans l'unité de comparaison)
  maxAdj: number           // seuil Max après âge
  pct: number              // continu, plancher 0, pas de plafond
  points: number
  level: string
}

export interface QualityScore {
  points: number
  ptsMax: number
  pct: number
  level: string
}

export interface CampaignScore {
  total: number            // somme des points (réf 1000, peut dépasser)
  totalPctVs1000: number   // total / 1000
  globalLevel: string
  byTest: Record<string, TestScore>
  byQuality: Record<QualityKey, QualityScore>
}
