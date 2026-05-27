import type { PageOnboardingConfig } from '../system/types'

export const PLANNING_ONBOARDING: PageOnboardingConfig = {
  pageId: 'planning',
  version: 2,
  slides: [
    {
      id: 'planning_week',
      badge: 'Planning',
      title: "Ta semaine d'entraînement",
      description: "Le planning hebdomadaire est le cœur de ton organisation. Chaque jour de la semaine peut contenir une ou plusieurs séances, chacune identifiée par sport et durée.",
      keyPoints: [
        'Vue 7 jours avec navigation semaine par semaine',
        'Code couleur par sport pour identifier d\'un coup d\'œil',
        'Durée et type de chaque séance visibles directement',
      ],
      visual: 'mockup',
      visualConfig: { type: 'weekly_grid' },
      features: ['weekly_view', 'session_blocks', 'sport_colors'],
    },
    {
      id: 'planning_create',
      badge: 'Création',
      title: 'Planifie chaque séance en détail',
      description: "Crée une séance avec son sport, sa durée estimée, son type d'effort (EF, seuil, PMA...) et ses exercices détaillés pour muscu et yoga. Chaque séance est réutilisable.",
      keyPoints: [
        '15 sports disponibles avec leurs types d\'entraînement',
        'Exercices détaillés pour muscu : sets, reps, charge, repos',
        '5 types de circuits : Séries, Lap, Superset, EMOM, Tabata',
        'Séances réutilisables dans la bibliothèque Session',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Vélo', color: '#06B6D4' },
          { label: 'Running', color: '#10B981' },
          { label: 'Trail', color: '#F59E0B' },
          { label: 'Muscu', color: '#8B5CF6' },
          { label: 'Yoga', color: '#EC4899' },
          { label: 'Natation', color: '#3B82F6' },
        ],
      },
      features: ['create_session', 'sport_types', 'exercise_builder'],
    },
    {
      id: 'planning_load',
      badge: 'Charge',
      title: 'Équilibre charge et récupération',
      description: "Visualise la charge totale planifiée chaque semaine. L'app calcule automatiquement si ta semaine est trop chargée ou trop légère par rapport à tes objectifs.",
      keyPoints: [
        'Charge hebdomadaire calculée en temps réel',
        'Alerte si déséquilibre détecté',
        'Comparaison avec la semaine précédente',
      ],
      visual: 'chart',
      visualConfig: {
        type: 'bar_chart',
        data: [55, 70, 60, 85, 50, 75, 35],
        colors: ['#06B6D4', '#06B6D4', '#06B6D4', '#EF4444', '#06B6D4', '#06B6D4', '#10B981'],
        labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
        label: 'Charge par jour',
      },
      features: ['load_analysis', 'weekly_load', 'load_balance'],
    },
    {
      id: 'planning_link',
      badge: 'Connexion',
      title: 'Prévu vs réalisé',
      description: "Quand tu enregistres une activité, elle est automatiquement liée à la séance planifiée. Tu vois en un coup d'œil ce qui était prévu et ce que tu as vraiment fait.",
      keyPoints: [
        'Lien automatique entre activité enregistrée et séance planifiée',
        'Comparaison durée prévue vs durée réelle',
        'Statut : Complété, Modifié, Manqué',
      ],
      visual: 'mockup',
      visualConfig: { type: 'planned_vs_done' },
      features: ['planned_vs_actual', 'session_linking'],
    },
    {
      id: 'planning_recurring',
      badge: 'Organisation',
      title: 'Séances récurrentes et modèles',
      description: 'Crée des modèles de semaine type et duplique-les rapidement. Idéal pour les cycles d\'entraînement répétitifs.',
      keyPoints: [
        'Dupliquer une semaine entière en un clic',
        'Modèles de semaine sauvegardables',
        'Glisser-déposer pour réorganiser les séances',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Modèle', color: '#06B6D4' },
          { label: 'Dupliquer', color: '#10B981' },
          { label: 'Glisser', color: '#F59E0B' },
          { label: 'Cycle', color: '#8B5CF6' },
        ],
      },
      features: ['recurring_sessions', 'week_templates', 'drag_drop'],
    },
  ],
}
