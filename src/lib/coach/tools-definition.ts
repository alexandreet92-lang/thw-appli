// ══════════════════════════════════════════════════════════════
// src/lib/coach/tools-definition.ts
// Définitions des tools Anthropic pour le coach IA.
// Format compatible @anthropic-ai/sdk (Anthropic.Tool).
//
// Colonnes exactes issues des migrations Supabase :
//
//   planned_sessions :
//     id, user_id, plan_id, week_start, day_index,
//     sport, title, time, duration_min, tss, status,
//     intensity, notes, rpe, blocks (jsonb), plan_variant,
//     source, original_content (jsonb), last_user_modified_at,
//     created_at, updated_at
//
//   training_plans :
//     id, user_id, name, objectif_principal, duree_semaines,
//     start_date, end_date, sports (text[]),
//     blocs_periodisation (jsonb), conseils_adaptation (jsonb),
//     points_cles (jsonb), ai_context (jsonb),
//     status, created_at, updated_at
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'

// ── Union des noms de tools ───────────────────────────────────

export type CoachToolName =
  | 'add_session'
  | 'update_session'
  | 'delete_session'
  | 'move_session'
  | 'add_week'
  | 'update_plan_periodisation'

// ── Types des inputs par tool ─────────────────────────────────

/** Bloc de séance — format stocké dans planned_sessions.blocks (JSONB) */
export interface SessionBlockInput {
  nom?: string
  duree_min?: number
  zone?: number           // 1–5
  repetitions?: number
  recup_min?: number
  watts?: number | null
  allure?: string | null
  consigne?: string
}

/** Séance dans le payload add_week.sessions */
export interface WeekSessionInput {
  day_index: number       // 0=lundi … 6=dimanche
  sport: 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym'
  title: string
  time?: string           // HH:MM
  duration_min: number
  tss?: number
  intensity?: 'low' | 'moderate' | 'high' | 'max'
  notes?: string
  rpe?: number
  blocks?: SessionBlockInput[]
}

/** Bloc de périodisation — élément de training_plans.blocs_periodisation */
export interface BlocPeriodisationInput {
  nom: string
  type: 'Base' | 'Intensité' | 'Spécifique' | 'Deload' | 'Compétition'
  semaine_debut: number   // 1-based
  semaine_fin: number     // 1-based
  description: string
  volume_hebdo_h: number
}

// ── Input typé de chaque tool ─────────────────────────────────

export interface AddSessionInput {
  training_plan_id: string
  week_start: string      // YYYY-MM-DD (lundi de la semaine)
  day_index: number       // 0=lundi … 6=dimanche
  sport: 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym'
  title: string
  time?: string           // HH:MM
  duration_min: number
  blocks?: SessionBlockInput[]
  tss?: number
  intensity?: 'low' | 'moderate' | 'high' | 'max'
  notes?: string
  rpe?: number
}

export interface UpdateSessionInput {
  session_id: string      // planned_sessions.id
  sport?: 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym'
  title?: string
  time?: string           // HH:MM
  duration_min?: number
  tss?: number
  intensity?: 'low' | 'moderate' | 'high' | 'max'
  notes?: string
  rpe?: number
  blocks?: SessionBlockInput[]
  status?: 'planned' | 'done'
}

export interface DeleteSessionInput {
  session_id: string      // planned_sessions.id
}

export interface MoveSessionInput {
  session_id: string      // planned_sessions.id
  new_week_start: string  // YYYY-MM-DD (lundi)
  new_day_index: number   // 0=lundi … 6=dimanche
}

export interface AddWeekInput {
  training_plan_id: string
  week_start: string      // YYYY-MM-DD (lundi)
  week_type: 'Base' | 'Spécifique' | 'Deload' | 'Compétition'
  sessions: WeekSessionInput[]
}

export interface UpdatePlanPeriodisationInput {
  training_plan_id: string
  blocs_periodisation: BlocPeriodisationInput[]
}

// ── Map CoachToolName → Input type ────────────────────────────

export interface CoachToolInputMap {
  add_session:               AddSessionInput
  update_session:            UpdateSessionInput
  delete_session:            DeleteSessionInput
  move_session:              MoveSessionInput
  add_week:                  AddWeekInput
  update_plan_periodisation: UpdatePlanPeriodisationInput
}

export type CoachToolInput<T extends CoachToolName> = CoachToolInputMap[T]

// ── Sous-schémas JSON Schema réutilisables ────────────────────

const SPORT_ENUM = ['run', 'bike', 'swim', 'hyrox', 'rowing', 'gym'] as const

const PROP_SPORT = {
  type: 'string',
  enum: [...SPORT_ENUM],
  description: "Sport de la séance. Valeurs : 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym'.",
} as const

const PROP_INTENSITY = {
  type: 'string',
  enum: ['low', 'moderate', 'high', 'max'],
  description: "Intensité globale de la séance : 'low' | 'moderate' | 'high' | 'max'.",
} as const

const PROP_TIME = {
  type: 'string',
  description: "Heure de début au format HH:MM (ex: '07:30').",
} as const

const PROP_WEEK_START = {
  type: 'string',
  description: "Date ISO YYYY-MM-DD correspondant au lundi de la semaine cible (ex: '2025-06-02').",
} as const

const PROP_DAY_INDEX = {
  type: 'integer',
  description: '0 = lundi, 1 = mardi, 2 = mercredi, 3 = jeudi, 4 = vendredi, 5 = samedi, 6 = dimanche.',
} as const

const PROP_BLOCKS = {
  type: 'array',
  description: 'Blocs de séance (échauffement, effort, récupération…). Champ blocks dans planned_sessions.',
  items: {
    type: 'object',
    properties: {
      nom:         { type: 'string',  description: 'Nom du bloc (ex: Échauffement, Effort principal).' },
      duree_min:   { type: 'integer', description: 'Durée du bloc en minutes.' },
      zone:        { type: 'integer', description: "Zone d'effort 1–5." },
      repetitions: { type: 'integer', description: 'Nombre de répétitions (pour les intervalles).' },
      recup_min:   { type: 'integer', description: 'Durée de récupération entre répétitions en minutes.' },
      watts:       { type: 'number',  description: 'Puissance cible en watts (nullable).' },
      allure:      { type: 'string',  description: "Allure cible au km ex: '4:30/km' (nullable)." },
      consigne:    { type: 'string',  description: 'Consigne courte, ≤ 10 mots.' },
    },
  },
} as const

const BLOC_PERIODISATION_ITEM = {
  type: 'object',
  properties: {
    nom:            { type: 'string' },
    type:           { type: 'string', enum: ['Base', 'Intensité', 'Spécifique', 'Deload', 'Compétition'] },
    semaine_debut:  { type: 'integer', description: 'Numéro de semaine de début (1-based).' },
    semaine_fin:    { type: 'integer', description: 'Numéro de semaine de fin (1-based, inclus).' },
    description:    { type: 'string',  description: '1 phrase décrivant le bloc.' },
    volume_hebdo_h: { type: 'number',  description: 'Volume hebdomadaire cible en heures.' },
  },
  required: ['nom', 'type', 'semaine_debut', 'semaine_fin', 'description', 'volume_hebdo_h'],
} as const

// ── Définitions des tools ─────────────────────────────────────

export const coachTools: Anthropic.Tool[] = [
  // ── 1. add_session ──────────────────────────────────────────
  {
    name: 'add_session',
    description:
      "Ajoute une nouvelle séance d'entraînement à un plan existant dans planned_sessions. " +
      "Appelle ce tool quand l'athlète demande d'ajouter, créer ou intercaler une séance " +
      "dans une semaine précise du plan. " +
      "Le champ training_plan_id lie la séance au plan parent (training_plans.id).",
    input_schema: {
      type: 'object' as const,
      properties: {
        training_plan_id: {
          type: 'string',
          description: "UUID du plan d'entraînement parent (training_plans.id).",
        },
        week_start:   PROP_WEEK_START,
        day_index:    PROP_DAY_INDEX,
        sport:        PROP_SPORT,
        title: {
          type: 'string',
          description: 'Titre court de la séance (ex: "Sortie longue Z2", "Fractionné 10x400m").',
        },
        time:         PROP_TIME,
        duration_min: {
          type: 'integer',
          description: 'Durée totale de la séance en minutes. Colonne duration_min.',
        },
        blocks:    PROP_BLOCKS,
        tss:       { type: 'number',  description: 'Training Stress Score estimé. Colonne tss.' },
        intensity: PROP_INTENSITY,
        notes:     { type: 'string',  description: 'Notes à afficher à l\'athlète, 1 phrase max. Colonne notes.' },
        rpe:       { type: 'integer', description: 'RPE cible 1–10. Colonne rpe.' },
      },
      required: ['training_plan_id', 'week_start', 'day_index', 'sport', 'title', 'duration_min'],
    },
  },

  // ── 2. update_session ────────────────────────────────────────
  {
    name: 'update_session',
    description:
      "Modifie un ou plusieurs champs d'une séance existante dans planned_sessions. " +
      "Appelle ce tool pour changer la durée, le sport, l'intensité, les blocs, les notes, le RPE " +
      "ou tout autre attribut d'une séance identifiée par son session_id. " +
      "Seuls les champs explicitement fournis sont mis à jour — les autres restent inchangés.",
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la séance à modifier. Correspond à planned_sessions.id.',
        },
        sport:        PROP_SPORT,
        title:        { type: 'string',  description: 'Nouveau titre de la séance.' },
        time:         PROP_TIME,
        duration_min: { type: 'integer', description: 'Nouvelle durée en minutes.' },
        tss:          { type: 'number',  description: 'Nouveau TSS estimé.' },
        intensity:    PROP_INTENSITY,
        notes:        { type: 'string',  description: 'Nouvelles notes pour l\'athlète.' },
        rpe:          { type: 'integer', description: 'Nouveau RPE cible 1–10.' },
        blocks:       PROP_BLOCKS,
        status: {
          type: 'string',
          enum: ['planned', 'done'],
          description: "Statut de la séance : 'planned' | 'done'.",
        },
      },
      required: ['session_id'],
    },
  },

  // ── 3. delete_session ────────────────────────────────────────
  {
    name: 'delete_session',
    description:
      "Supprime définitivement une séance du plan (DELETE dans planned_sessions). " +
      "Appelle ce tool quand l'athlète demande à retirer ou annuler une séance précise. " +
      "Action irréversible : si la demande est ambiguë, confirme d'abord avec l'athlète.",
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la séance à supprimer. Correspond à planned_sessions.id.',
        },
      },
      required: ['session_id'],
    },
  },

  // ── 4. move_session ──────────────────────────────────────────
  {
    name: 'move_session',
    description:
      "Déplace une séance vers un autre jour ou une autre semaine sans modifier son contenu. " +
      "Appelle ce tool quand l'athlète veut reporter ou décaler une séance. " +
      "Met à jour les colonnes week_start et day_index de planned_sessions.",
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID de la séance à déplacer. Correspond à planned_sessions.id.',
        },
        new_week_start: {
          type: 'string',
          description: "Nouveau lundi de semaine au format YYYY-MM-DD. Colonne week_start.",
        },
        new_day_index: {
          type: 'integer',
          description: '0 = lundi … 6 = dimanche. Nouveau jour cible. Colonne day_index.',
        },
      },
      required: ['session_id', 'new_week_start', 'new_day_index'],
    },
  },

  // ── 5. add_week ──────────────────────────────────────────────
  {
    name: 'add_week',
    description:
      "Ajoute une semaine complète au plan avec toutes ses séances en une seule opération. " +
      "Appelle ce tool pour prolonger le plan, insérer une semaine de deload oubliée " +
      "ou ajouter une semaine de compétition. " +
      "Crée N lignes dans planned_sessions (une par séance dans sessions[]).",
    input_schema: {
      type: 'object' as const,
      properties: {
        training_plan_id: {
          type: 'string',
          description: "UUID du plan d'entraînement (training_plans.id).",
        },
        week_start: PROP_WEEK_START,
        week_type: {
          type: 'string',
          enum: ['Base', 'Spécifique', 'Deload', 'Compétition'],
          description: "Type de la semaine : 'Base' | 'Spécifique' | 'Deload' | 'Compétition'.",
        },
        sessions: {
          type: 'array',
          description: 'Séances à créer dans cette semaine. Chaque item génère une ligne planned_sessions.',
          items: {
            type: 'object',
            properties: {
              day_index:    PROP_DAY_INDEX,
              sport:        PROP_SPORT,
              title:        { type: 'string' },
              time:         PROP_TIME,
              duration_min: { type: 'integer', description: 'Durée en minutes.' },
              tss:          { type: 'number' },
              intensity:    PROP_INTENSITY,
              notes:        { type: 'string' },
              rpe:          { type: 'integer', description: 'RPE cible 1–10.' },
              blocks:       PROP_BLOCKS,
            },
            required: ['day_index', 'sport', 'title', 'duration_min'],
          },
        },
      },
      required: ['training_plan_id', 'week_start', 'week_type', 'sessions'],
    },
  },

  // ── 6. update_plan_periodisation ─────────────────────────────
  {
    name: 'update_plan_periodisation',
    description:
      "Met à jour la périodisation macro du plan en remplaçant training_plans.blocs_periodisation. " +
      "Appelle ce tool quand la structure globale du plan change : réorganisation des blocs " +
      "(Base → Intensité → Spécifique → Compétition), ajustement des semaines de début/fin, " +
      "ou révision des volumes hebdomadaires cibles. " +
      "Envoie le tableau complet mis à jour — il remplace intégralement l'existant.",
    input_schema: {
      type: 'object' as const,
      properties: {
        training_plan_id: {
          type: 'string',
          description: 'UUID du plan à mettre à jour (training_plans.id).',
        },
        blocs_periodisation: {
          type: 'array',
          description:
            "Tableau complet des blocs de périodisation. " +
            "Remplace intégralement training_plans.blocs_periodisation. " +
            "Chaque bloc couvre un intervalle de semaines (semaine_debut..semaine_fin).",
          items: BLOC_PERIODISATION_ITEM,
        },
      },
      required: ['training_plan_id', 'blocs_periodisation'],
    },
  },
]
