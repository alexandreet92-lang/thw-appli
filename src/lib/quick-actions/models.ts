import { currentLocale } from '@/lib/i18n/locale'
// ══════════════════════════════════════════════════════════════
// Actions rapides : couleurs de badge par modèle + estimation
// (indicative) de tokens pondérés par action (clé = flow).
// Le modèle forcé d'une action = champ `model` de la QuickAction.
// ══════════════════════════════════════════════════════════════

type QAModel = 'hermes' | 'athena' | 'zeus'

export const MODEL_BADGE: Record<QAModel, { color: string; bg: string; border: string }> = {
  hermes: { color: '#16A34A', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)' },
  athena: { color: '#06B6D4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)' },
  zeus:   { color: '#A855F7', bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)' },
}

// Estimations pondérées indicatives (le coût réel dépend du contexte).
const ESTIMATES: Record<string, number> = {
  training_plan:         50000,
  prise_de_masse:        50000,
  programme_cardio:      50000,
  perte_de_poids:        50000,
  reathletisation:       50000,
  velo_endurance:        30000,
  velo_vo2:              30000,
  velo_seuil:            30000,
  run_ef:                30000,
  run_seuil:             30000,
  run_vo2:               30000,
  run_power:             30000,
  planifier_semaine:     30000,
  reajuster_plan:        12000,
  prepa_competition:     30000,
  semaine_decharge:      12000,
  bilan_mois:            30000,
  surentrainement:       12000,
  nutrition:             50000,
  weakpoints:            30000,
  strategie_course:      30000,
  analyser_progression:  30000,
  analyzetest:           12000,
  analyze_training:      8000,
  sessionbuilder:        8000,
  analyser_semaine:      8000,
  analyser_recuperation: 8000,
  recharge:              8000,
  estimer_zones:         8000,
  conseils_sommeil:      3000,
  app_guide:             3000,
}

export function quickActionEstimate(flow?: string | null): number {
  return (flow && ESTIMATES[flow]) || 8000
}

export function fmtEstimate(tokens: number): string {
  return `~${tokens.toLocaleString(currentLocale())} tokens`
}
