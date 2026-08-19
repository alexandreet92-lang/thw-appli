// ══════════════════════════════════════════════════════════════════
// Moteur de STRATÉGIE NUTRITIONNELLE (coach). Calculs transparents et
// physiologiquement bornés : chaque étape est exposée (calc.steps) pour le
// bouton « Détail du calcul ». Aucune donnée inventée : tout dérive de la fiche
// d'intake + des données réelles de l'athlète (poids, taille, âge, sexe, séances).
//
// Références (bornes usuelles, pas des chiffres magiques — ajustées par le
// terrain de l'athlète) :
//   • BMR : Mifflin-St Jeor
//   • Protéines : 1,6–2,2 g/kg (prise de muscle), jusqu'à 2,4 en sèche
//   • 1 kg de masse ≈ 7700 kcal
//   • Rythme sûr : gain ≤ 0,35 %/sem du poids, perte ≤ 1 %/sem
// ══════════════════════════════════════════════════════════════════

export type GoalType = 'muscle' | 'cut' | 'recomp' | 'maintain' | 'perf'
export type WorkIntensity = 'low' | 'medium' | 'high'
export type Metabolism = 'gain_easy' | 'gain_hard' | 'lose_easy' | 'lose_hard' | 'neutral'
export type FoodQuality = 'poor' | 'average' | 'good' | 'excellent'
export type CycleMode = 'weekly' | 'biweekly' | 'training'
export type RangeMode = 'exact' | 'range'

export interface SportShare { sport: string; sessions: number }

export interface NutritionIntake {
  // Morphologie (pré-remplie depuis le profil quand dispo)
  weightKg: number
  bodyFatPct: number | null
  heightCm: number | null
  age: number | null
  sex: 'm' | 'f'
  // Objectif
  goalType: GoalType
  targetWeightKg: number            // obligatoire
  targetBodyFatPct: number | null   // optionnel
  timelineMode: RangeMode
  timelineWeeks: number
  timelineWeeksMax: number | null   // si fourchette
  // Dépense
  mealsPerDay: number               // 2..7
  workIntensity: WorkIntensity
  sessionsMode: RangeMode
  sessionsPerWeek: number
  sessionsPerWeekMax: number | null
  avgSessionHours: number
  sportBreakdown: SportShare[]
  // Terrain
  metabolism: Metabolism
  foodQuality: FoodQuality
  frictions: string[]               // clés (voir FRICTIONS)
  dietConstraints: string[]         // végé, sans lactose, halal…
  // Cyclage
  cycleMode: CycleMode
  notes: string
}

export interface WeekTarget {
  i: number             // index de semaine (0-based)
  start: string | null  // date de lundi (optionnel)
  weightKg: number      // poids projeté en début de semaine
  kcal: number          // kcal de référence (jour repos)
  proteines: number     // g/jour
  glucides: number
  lipides: number
  note?: string
}

export interface CalcStep { label: string; value: string; detail?: string }
export interface StrategyCalc {
  bmr: number
  neatFactor: number
  maintenanceRest: number      // kcal jour SANS séance
  perSessionKcal: number       // kcal moyenne d'une séance
  tdeeAvg: number              // maintenance moyenne (avec séances réparties)
  proteinPerKg: number
  weeklyKgChange: number       // + prise / − perte
  requestedKgChange: number    // avant plafonnement
  capped: boolean
  warnings: string[]
  steps: CalcStep[]
}

export interface Strategy { weeks: WeekTarget[]; calc: StrategyCalc }

export const GOAL_LABEL: Record<GoalType, string> = {
  muscle: 'Prise de muscle', cut: 'Sèche / perte de gras', recomp: 'Recomposition', maintain: 'Maintien', perf: 'Performance',
}
export const WORK_LABEL: Record<WorkIntensity, string> = { low: 'Peu intensif', medium: 'Intensif', high: 'Très intensif' }
export const METABO_LABEL: Record<Metabolism, string> = {
  gain_easy: 'Prend du poids facilement', gain_hard: 'Prend du poids difficilement',
  lose_easy: 'Maigrit facilement', lose_hard: 'Maigrit difficilement', neutral: 'Neutre',
}
export const FOOD_QUALITY_LABEL: Record<FoodQuality, string> = { poor: 'Mauvaise', average: 'Moyenne', good: 'Bonne', excellent: 'Très bonne' }
export const FRICTIONS: { key: string; label: string }[] = [
  { key: 'water', label: 'Boit pas assez d’eau' },
  { key: 'coffee', label: 'Boit trop de café' },
  { key: 'protein', label: 'Pas assez de protéines' },
  { key: 'snacking', label: 'Grignote trop' },
  { key: 'alcohol', label: 'Boit de l’alcool' },
  { key: 'smoking', label: 'Fume' },
  { key: 'sugar', label: 'Trop de sucreries' },
  { key: 'skips', label: 'Saute des repas' },
]
export const DIET_CONSTRAINTS: { key: string; label: string }[] = [
  { key: 'vegetarian', label: 'Végétarien' }, { key: 'vegan', label: 'Vegan' },
  { key: 'lactose', label: 'Sans lactose' }, { key: 'gluten', label: 'Sans gluten' },
  { key: 'halal', label: 'Halal' }, { key: 'pork_free', label: 'Sans porc' },
]
export const KCAL_PER_KG = 7700

// NEAT (dépense hors sport) par intensité de travail/vie quotidienne.
const NEAT_FACTOR: Record<WorkIntensity, number> = { low: 1.3, medium: 1.45, high: 1.6 }

export function ageFromBirth(birthISO: string | null | undefined): number | null {
  if (!birthISO) return null
  const b = new Date(birthISO); if (isNaN(b.getTime())) return null
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return a > 0 && a < 120 ? a : null
}

// BMR Mifflin-St Jeor. Repli poids-seul si taille/âge manquent (10 % marge d'incertitude).
function computeBMR(weightKg: number, heightCm: number | null, age: number | null, sex: 'm' | 'f'): number {
  if (heightCm && age) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age
    return Math.round(sex === 'f' ? base - 161 : base + 5)
  }
  // Repli : ~22 kcal/kg (approx. BMR moyen) — signalé comme estimation.
  return Math.round(weightKg * 22)
}

// Protéines g/kg par objectif, ajustées par le terrain de l'athlète.
function proteinPerKg(goal: GoalType, metabolism: Metabolism, quality: FoodQuality): number {
  let p = goal === 'cut' ? 2.2 : goal === 'muscle' ? 2.0 : goal === 'recomp' ? 1.9 : goal === 'perf' ? 1.7 : 1.6
  if (metabolism === 'gain_hard') p += 0.1          // hardgainer : un peu plus
  if (quality === 'poor') p += 0.1                  // marge si alim de mauvaise qualité
  return Math.round(p * 10) / 10
}

// Sens de la variation attendue selon l'objectif (+ prise, − perte, 0 maintien).
function goalDirection(goal: GoalType): 1 | -1 | 0 {
  if (goal === 'muscle') return 1
  if (goal === 'cut') return -1
  return 0 // recomp / maintain / perf : autour du maintien
}

// Plafond de sécurité du rythme hebdo (kg/sem) selon le sens + le poids.
function safeRate(direction: 1 | -1 | 0, weightKg: number): number {
  if (direction > 0) return weightKg * 0.0035  // prise ≤ 0,35 %/sem (limite le gras)
  if (direction < 0) return weightKg * 0.01    // perte ≤ 1 %/sem (préserve le muscle)
  return weightKg * 0.005
}

/**
 * Calcule la stratégie complète.
 * @param intake fiche d'intake
 * @param avgSessionsPerDay moyenne de séances/jour issue du planning réel (optionnel,
 *        sert au TDEE moyen ; le cyclage jour par jour se fait à l'affichage).
 */
export function computeStrategy(intake: NutritionIntake, avgSessionsPerDay?: number): Strategy {
  const steps: CalcStep[] = []
  const warnings: string[] = []
  const w0 = Math.max(30, intake.weightKg)

  const bmr = computeBMR(w0, intake.heightCm, intake.age, intake.sex)
  steps.push({ label: 'Métabolisme de base (BMR)', value: `${bmr} kcal`, detail: intake.heightCm && intake.age ? 'Mifflin-St Jeor (poids, taille, âge, sexe)' : 'Estimation ~22 kcal/kg (taille/âge manquants)' })
  if (!intake.heightCm || !intake.age) warnings.push('Taille ou âge manquant : BMR estimé, renseigne le profil pour plus de précision.')

  const neat = NEAT_FACTOR[intake.workIntensity]
  const maintenanceRest = Math.round(bmr * neat)
  steps.push({ label: 'Maintien jour SANS séance', value: `${maintenanceRest} kcal`, detail: `BMR × ${neat} (activité quotidienne « ${WORK_LABEL[intake.workIntensity]} »)` })

  // kcal moyenne d'une séance : durée moy × intensité sport (~600 kcal/h de base).
  const perSessionKcal = Math.round(Math.max(0.4, intake.avgSessionHours) * 600)
  const sessPerWeek = intake.sessionsMode === 'range' && intake.sessionsPerWeekMax
    ? (intake.sessionsPerWeek + intake.sessionsPerWeekMax) / 2 : intake.sessionsPerWeek
  const trainKcalPerDayAvg = (perSessionKcal * sessPerWeek) / 7
  const tdeeAvg = Math.round(maintenanceRest + trainKcalPerDayAvg)
  steps.push({ label: 'Dépense d’une séance', value: `${perSessionKcal} kcal`, detail: `${intake.avgSessionHours} h × 600 kcal/h` })
  steps.push({ label: 'Maintien MOYEN (séances réparties)', value: `${tdeeAvg} kcal`, detail: `${maintenanceRest} + (${perSessionKcal} × ${sessPerWeek.toFixed(1)} séances ÷ 7 j)` })

  // Rythme demandé vs plafond de sécurité.
  const direction = goalDirection(intake.goalType)
  const delta = intake.targetWeightKg - w0
  const weeksExact = intake.timelineMode === 'range' && intake.timelineWeeksMax
    ? (intake.timelineWeeks + intake.timelineWeeksMax) / 2 : intake.timelineWeeks
  const weeks = Math.max(1, Math.round(weeksExact))
  const requestedKgChange = delta / weeks
  const cap = safeRate(direction, w0) * (direction === 0 ? 1 : Math.sign(requestedKgChange) === direction ? 1 : 1)
  let weeklyKgChange = requestedKgChange
  let capped = false
  if (Math.abs(requestedKgChange) > cap) {
    weeklyKgChange = Math.sign(requestedKgChange) * cap
    capped = true
    warnings.push(`Objectif trop rapide pour la durée : rythme plafonné à ${Math.abs(weeklyKgChange).toFixed(2)} kg/sem (sécurité). Il faudra ~${Math.ceil(Math.abs(delta) / cap)} sem pour atteindre ${intake.targetWeightKg} kg.`)
  }
  steps.push({ label: 'Variation de poids visée', value: `${weeklyKgChange >= 0 ? '+' : ''}${weeklyKgChange.toFixed(2)} kg/sem`, detail: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg ÷ ${weeks} sem${capped ? ' (plafonné sécurité)' : ''}` })

  const dailyAdjust = Math.round((weeklyKgChange * KCAL_PER_KG) / 7)
  steps.push({ label: 'Ajustement calorique / jour', value: `${dailyAdjust >= 0 ? '+' : ''}${dailyAdjust} kcal`, detail: `${weeklyKgChange.toFixed(2)} kg × ${KCAL_PER_KG} kcal ÷ 7 j` })

  const pPerKg = proteinPerKg(intake.goalType, intake.metabolism, intake.foodQuality)
  steps.push({ label: 'Protéines', value: `${pPerKg} g/kg`, detail: `Objectif « ${GOAL_LABEL[intake.goalType]} »${intake.metabolism === 'gain_hard' ? ' + hardgainer' : ''}` })

  void avgSessionsPerDay // (le cyclage jour par jour est appliqué à l'affichage)

  // Génération des semaines : poids projeté linéaire, kcal = maintien(poids) + ajustement.
  const out: WeekTarget[] = []
  for (let i = 0; i < weeks; i++) {
    const wk = Math.round((w0 + weeklyKgChange * i) * 10) / 10
    const bmrWk = computeBMR(wk, intake.heightCm, intake.age, intake.sex)
    const maintRestWk = Math.round(bmrWk * neat)
    const kcalRef = Math.max(Math.round(bmrWk * 1.1), maintRestWk + dailyAdjust) // jamais sous ~1,1×BMR
    const prot = Math.round(pPerKg * wk)
    const fatKcal = kcalRef * 0.28
    const lip = Math.max(Math.round(0.8 * wk), Math.round(fatKcal / 9))
    const gluc = Math.max(0, Math.round((kcalRef - prot * 4 - lip * 9) / 4))
    out.push({ i, start: null, weightKg: wk, kcal: kcalRef, proteines: prot, glucides: gluc, lipides: lip })
  }

  return {
    weeks: out,
    calc: { bmr, neatFactor: neat, maintenanceRest, perSessionKcal, tdeeAvg, proteinPerKg: pPerKg, weeklyKgChange, requestedKgChange, capped, warnings, steps },
  }
}

// Cyclage d'un jour selon le nombre de séances planifiées ce jour-là.
// Base = kcal de référence (jour repos) ; on ajoute la dépense des séances.
export function dayKcal(refKcal: number, perSessionKcal: number, sessionsThatDay: number): number {
  return Math.round(refKcal + perSessionKcal * Math.max(0, sessionsThatDay))
}
