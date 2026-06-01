// Sports supportés
export type Sport =
  | 'running'
  | 'trail'
  | 'cyclisme'
  | 'triathlon'
  | 'natation'
  | 'rowing'
  | 'muscu'
  | 'hyrox'
  | 'transversale'

// Catégories de compétences
export type CategorieCompetence =
  | 'methodologie'
  | 'periodisation'
  | 'adaptation'
  | 'nutrition'
  | 'recuperation'
  | 'force'
  | 'hypertrophie'
  | 'performance'

// Compétence telle que stockée dans la DB
export interface Competence {
  id: string
  nom: string
  description_courte: string
  bullets: string[]
  sports: Sport[]
  categorie: CategorieCompetence
  prompt_base: string
  conflits: string[]
  is_predefined: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// Relation user <-> competence
export interface UserCompetence {
  id: string
  user_id: string
  competence_id: string
  active: boolean
  prompt_custom: string | null
  activated_at: string | null
  created_at: string
  updated_at: string
}

// Compétence enrichie avec l'état utilisateur (pour l'UI)
export interface CompetenceWithUserState extends Competence {
  user_state?: {
    active: boolean
    prompt_custom: string | null
    activated_at: string | null
  }
}

// Limites par plan d'abonnement
export const COMPETENCE_LIMITS = {
  free: 0,
  premium: 3,
  pro: 7,
  elite: 20,
} as const

export type PlanType = keyof typeof COMPETENCE_LIMITS
