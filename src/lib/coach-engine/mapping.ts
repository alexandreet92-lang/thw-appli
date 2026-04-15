// ══════════════════════════════════════════════════════════════
// COACH ENGINE — MAPPING
// Centralise la correspondance action → agents requis.
// Ajouter un cas = modifier uniquement ce fichier + orchestrator.
// ══════════════════════════════════════════════════════════════

import type { CoachAction } from './schemas'

export type AgentName =
  | 'strategy'
  | 'program'
  | 'sessionBuilder'
  | 'planningAnalysis'
  | 'readiness'
  | 'adjustment'
  | 'performance'
  | 'nutrition'
  | 'chat'

// Chaque action déclare les agents utilisés, dans l'ordre d'exécution.
// Les agents marqués "parallel" peuvent être appelés simultanément.
export interface ActionMapping {
  agents: AgentName[]
  parallel?: AgentName[][]  // groupes pouvant tourner en parallèle
  description: string
}

export const ACTION_MAP: Record<CoachAction, ActionMapping> = {
  generate_program: {
    agents: ['strategy', 'program'],
    description: 'Génère une stratégie puis un programme complet d\'entraînement',
  },
  analyze_planning: {
    agents: ['planningAnalysis'],
    description: 'Analyse la semaine planifiée et retourne score + suggestions',
  },
  build_session: {
    agents: ['sessionBuilder'],
    description: 'Construit une séance détaillée avec blocs et zones',
  },
  readiness_check: {
    agents: ['readiness'],
    description: 'Évalue la forme du jour à partir des activités récentes',
  },
  adjust_plan: {
    agents: ['readiness', 'performance', 'adjustment'],
    parallel: [['readiness', 'performance']],
    description: 'Ajuste le plan de la semaine selon forme + performance',
  },
  analyze_performance: {
    agents: ['performance'],
    description: 'Analyse les tendances de performance sur la période',
  },
  nutrition: {
    agents: ['nutrition'],
    description: 'Calcule les besoins nutritionnels et répond aux questions',
  },
  chat: {
    agents: ['chat'],
    description: 'Conversation contextuelle avec l\'assistant IA de la page',
  },
}

// Utilitaire : obtenir la description d'une action
export function getActionDescription(action: CoachAction): string {
  return ACTION_MAP[action]?.description ?? 'Action inconnue'
}

// Utilitaire : vérifier si une action existe
export function isValidAction(action: string): action is CoachAction {
  return action in ACTION_MAP
}
