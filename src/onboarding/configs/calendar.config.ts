import type { PageOnboardingConfig } from '../system/types'

export const CALENDAR_ONBOARDING: PageOnboardingConfig = {
  pageId: 'calendar',
  version: 2,
  slides: [
    {
      id: 'cal_month',
      badge: 'Vue mensuelle',
      badgeKey: 'onbcfg.calMonthBadge',
      title: "Un mois de séances en un coup d'œil",
      titleKey: 'onbcfg.calMonthTitle',
      description: "Le calendrier mensuel affiche chaque séance planifiée et réalisée. Un point coloré par type de sport, plusieurs points si plusieurs séances le même jour.",
      descriptionKey: 'onbcfg.calMonthDesc',
      keyPoints: [
        'Swipe gauche/droite pour changer de mois',
        'Point coloré par sport sur chaque journée',
        'Distinction séances planifiées / réalisées',
        'Jour actuel mis en évidence',
      ],
      keyPointsKeys: [
        'onbcfg.calMonthKp1',
        'onbcfg.calMonthKp2',
        'onbcfg.calMonthKp3',
        'onbcfg.calMonthKp4',
      ],
      visual: 'mockup',
      visualConfig: { type: 'month_grid' },
      features: ['month_view', 'sport_dots', 'day_navigation'],
    },
    {
      id: 'cal_day',
      badge: 'Vue journée',
      badgeKey: 'onbcfg.calDayBadge',
      title: 'Le détail de chaque journée',
      titleKey: 'onbcfg.calDayTitle',
      description: "Appuie sur un jour pour voir toutes les séances planifiées et les activités enregistrées ce jour-là. Accès direct au détail de chaque activité.",
      descriptionKey: 'onbcfg.calDayDesc',
      keyPoints: [
        'Séances planifiées avec leur type et durée',
        'Activités réellement effectuées',
        'Lien direct vers le détail de chaque séance',
      ],
      keyPointsKeys: [
        'onbcfg.calDayKp1',
        'onbcfg.calDayKp2',
        'onbcfg.calDayKp3',
      ],
      visual: 'mockup',
      visualConfig: { type: 'day_detail' },
      features: ['day_view', 'session_detail_link', 'planned_vs_actual'],
    },
    {
      id: 'cal_stats',
      badge: 'Stats mensuelles',
      badgeKey: 'onbcfg.calStatsBadge',
      title: 'Totaux du mois',
      titleKey: 'onbcfg.calStatsTitle',
      description: "En bas du calendrier, retrouve les totaux du mois : nombre de séances, distance cumulée, temps d'entraînement et dénivelé. Comparaison avec le mois précédent.",
      descriptionKey: 'onbcfg.calStatsDesc',
      keyPoints: [
        'Totaux distance, durée, D+',
        'Nombre de séances par sport',
        'Comparaison mois M vs M-1',
      ],
      keyPointsKeys: [
        'onbcfg.calStatsKp1',
        'onbcfg.calStatsKp2',
        'onbcfg.calStatsKp3',
      ],
      visual: 'stats',
      visualConfig: {
        stats: [
          { label: 'Séances', labelKey: 'onbcfg.statSeances', value: 22, suffix: '', color: '#06B6D4' },
          { label: 'Distance', labelKey: 'onbcfg.statDistance', value: 380, suffix: 'km', color: '#10B981' },
          { label: 'Durée', labelKey: 'onbcfg.statDuree', value: '28h', suffix: '', color: '#F59E0B' },
        ],
      },
      features: ['monthly_totals', 'month_comparison'],
    },
  ],
}
