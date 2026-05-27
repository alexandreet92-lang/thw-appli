import type { PageOnboardingConfig } from '../system/types'

export const CALENDAR_ONBOARDING: PageOnboardingConfig = {
  pageId: 'calendar',
  version: 2,
  slides: [
    {
      id: 'cal_month',
      badge: 'Vue mensuelle',
      title: "Un mois de séances en un coup d'œil",
      description: "Le calendrier mensuel affiche chaque séance planifiée et réalisée. Un point coloré par type de sport, plusieurs points si plusieurs séances le même jour.",
      keyPoints: [
        'Swipe gauche/droite pour changer de mois',
        'Point coloré par sport sur chaque journée',
        'Distinction séances planifiées / réalisées',
        'Jour actuel mis en évidence',
      ],
      visual: 'mockup',
      visualConfig: { type: 'month_grid' },
      features: ['month_view', 'sport_dots', 'day_navigation'],
    },
    {
      id: 'cal_day',
      badge: 'Vue journée',
      title: 'Le détail de chaque journée',
      description: "Appuie sur un jour pour voir toutes les séances planifiées et les activités enregistrées ce jour-là. Accès direct au détail de chaque activité.",
      keyPoints: [
        'Séances planifiées avec leur type et durée',
        'Activités réellement effectuées',
        'Lien direct vers le détail de chaque séance',
      ],
      visual: 'mockup',
      visualConfig: { type: 'day_detail' },
      features: ['day_view', 'session_detail_link', 'planned_vs_actual'],
    },
    {
      id: 'cal_stats',
      badge: 'Stats mensuelles',
      title: 'Totaux du mois',
      description: "En bas du calendrier, retrouve les totaux du mois : nombre de séances, distance cumulée, temps d'entraînement et dénivelé. Comparaison avec le mois précédent.",
      keyPoints: [
        'Totaux distance, durée, D+',
        'Nombre de séances par sport',
        'Comparaison mois M vs M-1',
      ],
      visual: 'stats',
      visualConfig: {
        stats: [
          { label: 'Séances', value: 22, suffix: '', color: '#06B6D4' },
          { label: 'Distance', value: 380, suffix: 'km', color: '#10B981' },
          { label: 'Durée', value: '28h', suffix: '', color: '#F59E0B' },
        ],
      },
      features: ['monthly_totals', 'month_comparison'],
    },
  ],
}
