// ══════════════════════════════════════════════════════════════
// AGENT CONFIG
// Configuration des agents IA par page : nom, actions rapides,
// couleur accent, hints système.
// ══════════════════════════════════════════════════════════════

export type PageAgent =
  | 'planning'
  | 'strategy'
  | 'adjustment'
  | 'readiness'
  | 'sessionBuilder'
  | 'nutrition'
  | 'performance'

export interface QuickAction {
  label: string
  prompt: string
}

export interface AgentConfig {
  id: PageAgent
  name: string
  subtitle: string
  accent: string
  quickActions: QuickAction[]
}

// Agents affichés dans la sidebar du panel IA
export const MAIN_AGENTS: PageAgent[] = [
  'planning',
  'strategy',
  'sessionBuilder',
  'performance',
  'readiness',
  'nutrition',
]

// Noms d'affichage courts pour le dropdown / sidebar
export const AGENT_DISPLAY: Record<PageAgent, string> = {
  planning:       'Planning',
  strategy:       'Calendrier',
  readiness:      'Récupération',
  sessionBuilder: 'Séances',
  nutrition:      'Nutrition',
  performance:    'Training',
  adjustment:     'Adaptation',
}

export const AGENT_CONFIGS: Record<PageAgent, AgentConfig> = {
  planning: {
    id: 'planning',
    name: 'Coach Planning',
    subtitle: 'Optimise ta semaine d\'entraînement',
    accent: '#5b6fff',
    quickActions: [
      {
        label: 'Analyse ma semaine',
        prompt: 'Analyse ma semaine d\'entraînement actuelle. Dis-moi si la charge est équilibrée, si les intensités sont bien réparties et si tu vois des risques.',
      },
      {
        label: 'Ajuste mon plan',
        prompt: 'Je me sens un peu fatigué cette semaine. Comment devrais-je ajuster mon planning ? Quelles séances conserver en priorité ?',
      },
      {
        label: 'Optimise ma charge',
        prompt: 'Donne-moi des conseils pour optimiser ma charge d\'entraînement cette semaine. Comment progresser sans risquer le surmenage ?',
      },
      {
        label: 'Semaine de récupération',
        prompt: 'J\'ai besoin d\'une semaine de récupération. Comment devrais-je organiser mes séances pour décharger sans perdre ma forme ?',
      },
    ],
  },

  strategy: {
    id: 'strategy',
    name: 'Coach Stratégie',
    subtitle: 'Construit ta progression à long terme',
    accent: '#5b6fff',
    quickActions: [
      {
        label: 'Définis mon objectif',
        prompt: 'Aide-moi à définir un objectif sportif réaliste et ambitieux pour les 3 prochains mois.',
      },
      {
        label: 'Planifie mes cycles',
        prompt: 'Comment devrais-je structurer mes cycles d\'entraînement pour progresser de façon optimale ?',
      },
      {
        label: 'Évalue ma progression',
        prompt: 'Donne-moi une évaluation honnête de ma progression et dis-moi sur quoi me concentrer maintenant.',
      },
      {
        label: 'Prépare une compétition',
        prompt: 'J\'ai une compétition dans 8 semaines. Comment préparer au mieux ces dernières semaines ?',
      },
    ],
  },

  adjustment: {
    id: 'adjustment',
    name: 'Coach Adaptation',
    subtitle: 'Adapte ton plan selon ta forme',
    accent: '#f97316',
    quickActions: [
      {
        label: 'Douleurs dans les jambes',
        prompt: 'J\'ai des douleurs dans les jambes depuis hier. Dois-je m\'entraîner aujourd\'hui ? Que me conseilles-tu ?',
      },
      {
        label: 'Récupération express',
        prompt: 'J\'ai fait une grosse séance hier. Comment récupérer rapidement pour être prêt demain ?',
      },
      {
        label: 'Stress et fatigue',
        prompt: 'Je suis très stressé au travail en ce moment. Comment adapter mon entraînement sans sacrifier ma progression ?',
      },
      {
        label: 'Reprise après pause',
        prompt: 'Je n\'ai pas pu m\'entraîner pendant 10 jours. Comment reprendre intelligemment sans me blesser ?',
      },
    ],
  },

  readiness: {
    id: 'readiness',
    name: 'Coach Récupération',
    subtitle: 'Gère ta forme et ta fatigue',
    accent: '#22c55e',
    quickActions: [
      {
        label: 'Analyse mes données',
        prompt: 'Analyse mes données de récupération et dis-moi objectivement comment je me sens aujourd\'hui.',
      },
      {
        label: 'Intensité du jour',
        prompt: 'Vu ma forme actuelle, quelle intensité d\'entraînement me recommandes-tu pour aujourd\'hui ?',
      },
      {
        label: 'Améliorer le sommeil',
        prompt: 'Mon sommeil n\'est pas optimal. Quels conseils pratiques peux-tu me donner pour mieux récupérer la nuit ?',
      },
      {
        label: 'Signes de surmenage',
        prompt: 'Comment savoir si je suis en surmenage ? Quels signes dois-je surveiller ?',
      },
    ],
  },

  sessionBuilder: {
    id: 'sessionBuilder',
    name: 'Coach Séances',
    subtitle: 'Crée des séances sur-mesure',
    accent: '#00c8e0',
    quickActions: [
      {
        label: 'Séance endurance',
        prompt: 'Crée-moi une séance d\'endurance fondamentale pour aujourd\'hui. J\'ai environ 1h disponible.',
      },
      {
        label: 'Fractionné intense',
        prompt: 'Je veux faire du fractionné intensif aujourd\'hui. Construis-moi une séance efficace de 45-60 minutes.',
      },
      {
        label: 'Récupération active',
        prompt: 'J\'ai besoin d\'une séance de récupération active. Quelque chose de doux mais qui me permette quand même de bouger.',
      },
      {
        label: 'Séance originale',
        prompt: 'Construis une séance originale et motivante pour aujourd\'hui selon ma discipline et ma forme.',
      },
    ],
  },

  nutrition: {
    id: 'nutrition',
    name: 'Coach Nutrition',
    subtitle: 'Optimise ton alimentation sportive',
    accent: '#22c55e',
    quickActions: [
      {
        label: 'Mes macros du jour',
        prompt: 'Calcule mes besoins en macronutriments pour aujourd\'hui selon mon activité prévue.',
      },
      {
        label: 'Repas avant séance',
        prompt: 'Que dois-je manger avant ma séance d\'aujourd\'hui ? Donne-moi des options pratiques.',
      },
      {
        label: 'Récupération nutritionnelle',
        prompt: 'J\'ai fini une séance intense. Que dois-je manger pour optimiser ma récupération ?',
      },
      {
        label: 'Plan d\'hydratation',
        prompt: 'Donne-moi un plan d\'hydratation optimal pour aujourd\'hui avec ma séance prévue.',
      },
    ],
  },

  performance: {
    id: 'performance',
    name: 'Coach Performance',
    subtitle: 'Analyse ta progression et tes trends',
    accent: '#f97316',
    quickActions: [
      {
        label: 'Analyse mes activités',
        prompt: 'Analyse mes activités récentes. Qu\'est-ce que tu observes comme tendances ? Je progresse ?',
      },
      {
        label: 'Identifie mes points faibles',
        prompt: 'Identifie mes points faibles dans mes données d\'entraînement et dis-moi comment les améliorer.',
      },
      {
        label: 'Pic de forme',
        prompt: 'Comment atteindre un pic de forme pour une compétition dans 6 semaines ?',
      },
      {
        label: 'Analyse mes zones',
        prompt: 'Analyse ma répartition par zones d\'intensité. Est-ce que je m\'entraîne dans les bonnes zones ?',
      },
    ],
  },
}
