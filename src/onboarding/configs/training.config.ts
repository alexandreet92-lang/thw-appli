import type { PageOnboardingConfig } from '../system/types'

export const TRAINING_ONBOARDING: PageOnboardingConfig = {
  pageId: 'training',
  version: 2,
  slides: [
    {
      id: 'training_feed',
      badge: 'Historique',
      title: 'Toutes tes activités en un lieu',
      description: "Training centralise l'intégralité de tes sorties et séances, qu'elles viennent de l'app, de Strava ou de Garmin. Chaque activité est cliquable pour voir son détail complet.",
      keyPoints: [
        'Import automatique depuis Strava et Garmin',
        "Activités enregistrées depuis l'app",
        'Filtrage par sport, date ou durée',
        'Photos attachées à chaque activité',
      ],
      visual: 'mockup',
      visualConfig: { type: 'activity_feed' },
      features: ['activity_list', 'strava_import', 'garmin_import', 'photos'],
    },
    {
      id: 'training_detail',
      badge: 'Détail',
      title: 'Analyse complète de chaque sortie',
      description: "Clique sur une activité pour voir la carte du tracé GPS, le profil altimétrique interactif (glisse le doigt pour voir ta position sur la carte), toutes les stats et les segments réalisés.",
      keyPoints: [
        'Carte du tracé avec profil altimétrique',
        'Doigt sur le graphique = point rouge sur la carte',
        'Statistiques page 1 : essentielles',
        'Statistiques page 2 : avancées (watts, FC, TSS)',
      ],
      visual: 'chart',
      visualConfig: {
        type: 'elevation_with_scrub',
        data: [115, 130, 148, 162, 155, 145, 168, 175, 158, 142, 135, 150, 162, 145, 130],
        color: '#06B6D4',
        label: 'Profil altimétrique',
      },
      features: ['activity_detail', 'elevation_profile', 'scrub_map'],
    },
    {
      id: 'training_segments',
      badge: 'Segments',
      title: 'Segments et classements',
      description: "Définis des segments sur tes parcours habituels — une montée, une ligne droite, un bout de piste. L'app détecte automatiquement quand tu les passes et chronomètre ton temps.",
      keyPoints: [
        'Création depuis la carte ou depuis une activité',
        'Détection automatique en temps réel',
        'Classement parmi tous les athlètes sur les segments publics',
        'Historique de tous tes passages avec progression',
      ],
      visual: 'mockup',
      visualConfig: { type: 'segment_leaderboard' },
      features: ['segments', 'leaderboard', 'auto_detection', 'segment_history'],
    },
    {
      id: 'training_stats',
      badge: 'Statistiques',
      title: 'Tes chiffres sur la durée',
      description: "Visualise tes totaux hebdomadaires, mensuels et annuels. Distance, dénivelé, durée, calories — tout est comptabilisé automatiquement par sport.",
      keyPoints: [
        'Totaux par semaine, mois, année',
        'Répartition par sport',
        'Comparaison période précédente',
      ],
      visual: 'stats',
      visualConfig: {
        stats: [
          { label: 'Ce mois', value: 480, suffix: 'km', color: '#06B6D4' },
          { label: 'D+ mois', value: 6200, suffix: 'm', color: '#F59E0B' },
          { label: 'Sorties', value: 18, suffix: '', color: '#10B981' },
        ],
      },
      features: ['weekly_stats', 'monthly_stats', 'sport_breakdown'],
    },
    {
      id: 'training_delete',
      badge: 'Gestion',
      title: 'Gérer ton historique',
      description: "Glisse vers la gauche sur une activité pour la supprimer avec confirmation. Chaque suppression est définitive et synchronisée avec Strava si l'activité y avait été uploadée.",
      keyPoints: [
        'Swipe gauche pour supprimer',
        'Confirmation avant suppression définitive',
        'Synchronisation avec Strava',
      ],
      visual: 'mockup',
      visualConfig: { type: 'swipe_delete' },
      features: ['delete_activity', 'swipe_gesture'],
    },
  ],
}
