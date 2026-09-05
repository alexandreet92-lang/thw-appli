// ══════════════════════════════════════════════════════════════════
// Configuration du questionnaire d'onboarding /bienvenue.
// Piloté par la DONNÉE : 3 profils (athlète / athlète-coach / coach), 2
// versions (complète & express), la plupart des questions en choix multiple
// (+ champ « Autre »). Le rendu générique vit dans page.tsx.
// ══════════════════════════════════════════════════════════════════

export type ObProfile = 'athlete' | 'coach' | 'both'
export type ObVersion = 'full' | 'express'
export type ObBlock = 'athlete' | 'coach'
export type ObKind = 'single' | 'multi' | 'number' | 'text' | 'perSport' | 'timeframes'

export interface ObOption { value: string; hasDesc?: boolean }
export interface ObPerSportField { id: string; kind: 'single' | 'number' | 'text'; options?: string[]; unit?: string }
export interface ObTimeframe { id: string }

export interface ObQuestion {
  id: string
  kind: ObKind
  block: ObBlock
  /** Présente en version express (sinon uniquement en version complète). */
  express?: boolean
  /** Sautable (bouton « Passer »). */
  optional?: boolean
  /** single/multi : options (labels i18n = `ob.<id>.<value>`). */
  options?: ObOption[]
  /** single/multi : ajoute un champ libre « Autre ». */
  other?: boolean
  /** number : unité affichée. */
  unit?: string
  /** perSport : sous-champs répétés pour chaque sport coché. */
  perSportFields?: ObPerSportField[]
  /** timeframes : horizons (labels i18n = `ob.<id>.<tf>`). */
  timeframes?: ObTimeframe[]
  /** Condition d'affichage selon les réponses déjà données. */
  showIf?: (a: Record<string, unknown>) => boolean
}

const opt = (...values: string[]): ObOption[] => values.map(v => ({ value: v }))
const optD = (...values: string[]): ObOption[] => values.map(v => ({ value: v, hasDesc: true }))

// ── Bloc ATHLÈTE ──────────────────────────────────────────────────
export const ATHLETE_QUESTIONS: ObQuestion[] = [
  { id: 'a_sports', kind: 'multi', block: 'athlete', express: true, other: true,
    options: opt('running', 'velo', 'natation', 'trail', 'triathlon', 'aviron', 'boxe', 'hyrox', 'force', 'crossfit') },
  { id: 'a_perSport', kind: 'perSport', block: 'athlete', optional: true,
    perSportFields: [
      { id: 'freq', kind: 'number', unit: 'x/sem' },
      { id: 'hours', kind: 'number', unit: 'h/sem' },
      { id: 'since', kind: 'single', options: ['m6', 'm6_12', 'y1_3', 'y3_5', 'y5_10', 'y10'] },
      { id: 'best', kind: 'text' },
      { id: 'competed', kind: 'single', options: ['oui', 'non'] },
    ] },
  { id: 'a_goalType', kind: 'single', block: 'athlete', express: true, other: true,
    options: optD('forme', 'performance', 'perte_poids', 'sante', 'mixte') },
  { id: 'a_mainGoal', kind: 'text', block: 'athlete', express: true },
  { id: 'a_timeframes', kind: 'timeframes', block: 'athlete', optional: true,
    timeframes: [{ id: 'm3' }, { id: 'm6' }, { id: 'y1' }, { id: 'y10' }] },
  { id: 'a_volume', kind: 'single', block: 'athlete', express: true,
    options: opt('lt4', 'v4_7', 'v7_12', 'gt12') },
  { id: 'a_level', kind: 'single', block: 'athlete',
    options: optD('debutant', 'intermediaire', 'confirme', 'elite') },
  { id: 'a_days', kind: 'multi', block: 'athlete', optional: true,
    options: opt('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche') },
  { id: 'a_equipment', kind: 'multi', block: 'athlete', optional: true,
    options: opt('montre_gps', 'capteur_puissance', 'home_trainer', 'tapis', 'salle') },
  // ── C.5 (compléments validés) ──
  { id: 'a_injuries', kind: 'text', block: 'athlete', optional: true },
  { id: 'a_sleep', kind: 'single', block: 'athlete', optional: true,
    options: opt('lt6', 's6_7', 's7_8', 'gt8') },
  { id: 'a_job', kind: 'single', block: 'athlete', optional: true,
    options: opt('sedentaire', 'mixte', 'physique') },
  { id: 'a_nutrition', kind: 'single', block: 'athlete', optional: true,
    options: opt('suivie', 'parfois', 'non') },
  { id: 'a_env', kind: 'single', block: 'athlete', optional: true,
    options: opt('indoor', 'outdoor', 'mixte') },
  { id: 'a_hadCoach', kind: 'single', block: 'athlete', optional: true,
    options: opt('oui', 'non') },
]

// ── Bloc COACH ────────────────────────────────────────────────────
export const COACH_QUESTIONS: ObQuestion[] = [
  { id: 'c_since', kind: 'single', block: 'coach', express: true,
    options: opt('lt1', 'y1_3', 'y3_5', 'y5_10', 'y10') },
  { id: 'c_fulltime', kind: 'single', block: 'coach', express: true,
    options: opt('plein_temps', 'a_cote') },
  { id: 'c_hours', kind: 'number', block: 'coach', unit: 'h/sem',
    showIf: a => a.c_fulltime === 'a_cote' },
  { id: 'c_athleteType', kind: 'multi', block: 'coach', express: true, other: true,
    options: opt('debutant', 'confirme', 'elite', 'loisir', 'jeune', 'senior') },
  { id: 'c_sports', kind: 'multi', block: 'coach', express: true, other: true,
    options: opt('running', 'velo', 'natation', 'trail', 'triathlon', 'hyrox', 'force', 'boxe') },
  { id: 'c_current', kind: 'number', block: 'coach', express: true, unit: '' },
  { id: 'c_target', kind: 'number', block: 'coach', express: true, unit: '' },
  { id: 'c_targetTime', kind: 'single', block: 'coach',
    options: opt('m3', 'm6', 'y1', 'y2') },
  // ── D.7 (compléments validés) ──
  { id: 'c_certifs', kind: 'text', block: 'coach', optional: true },
  { id: 'c_method', kind: 'multi', block: 'coach', optional: true,
    options: opt('endurance', 'force', 'hybride') },
  { id: 'c_format', kind: 'single', block: 'coach', optional: true,
    options: opt('en_ligne', 'presentiel', 'mixte') },
  { id: 'c_tools', kind: 'multi', block: 'coach', optional: true, other: true,
    options: opt('trainingpeaks', 'tableur', 'autre_app', 'aucun') },
  { id: 'c_pricing', kind: 'text', block: 'coach', optional: true },
  { id: 'c_expectations', kind: 'text', block: 'coach', optional: true },
]

/** Liste ordonnée des questions selon le profil et la version choisis. */
export function buildQuestionList(profile: ObProfile, version: ObVersion): ObQuestion[] {
  const blocks: ObQuestion[] = []
  if (profile === 'athlete' || profile === 'both') blocks.push(...ATHLETE_QUESTIONS)
  if (profile === 'coach' || profile === 'both') blocks.push(...COACH_QUESTIONS)
  return version === 'express' ? blocks.filter(q => q.express) : blocks
}
