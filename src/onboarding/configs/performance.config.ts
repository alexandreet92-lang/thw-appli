import type { PageOnboardingConfig } from '../system/types'

export const PERFORMANCE_ONBOARDING: PageOnboardingConfig = {
  pageId: 'performance',
  version: 2,
  slides: [
    {
      id: 'perf_metrics',
      badge: 'Métriques clés',
      title: 'CTL, ATL, TSB — comprendre sa forme',
      description: "Ces trois métriques issues du modèle de Banister définissent ton état physique objectif. CTL = charge chronique (forme long terme). ATL = charge aiguë (fatigue récente). TSB = fraîcheur = CTL - ATL.",
      keyPoints: [
        'CTL évolue lentement : représente ta forme de fond',
        'ATL réagit vite : la fatigue des derniers jours',
        'TSB positif = reposé et frais pour performer',
        'TSB très négatif = surentraînement potentiel',
      ],
      visual: 'chart',
      visualConfig: {
        type: 'ctl_atl_tsb',
        data_ctl: [60, 62, 65, 63, 67, 70, 68, 72, 71, 74, 73, 76, 75, 78],
        data_atl: [55, 68, 75, 62, 72, 82, 68, 80, 74, 84, 76, 72, 67, 62],
        data_tsb: [5, -6, -10, 1, -5, -12, 0, -8, -3, -10, -3, 4, 8, 16],
        color1: '#10B981',
        color2: '#EF4444',
        color3: '#06B6D4',
        label1: 'CTL',
        label2: 'ATL',
        label3: 'TSB',
      },
      features: ['ctl_chart', 'atl_chart', 'tsb_chart'],
    },
    {
      id: 'perf_zones',
      badge: 'Zones',
      title: 'Zones de puissance et FC',
      description: "Configure tes zones à partir de ton FTP (vélo) ou de ta VMA (running). La répartition du temps dans chaque zone te montre si tu t'entraînes dans les bonnes proportions.",
      keyPoints: [
        '6 zones de puissance basées sur le FTP',
        '5 zones de fréquence cardiaque',
        'Distribution du temps en zones sur N semaines',
        'Synchronisées avec le profil athlète',
      ],
      visual: 'mockup',
      visualConfig: { type: 'zone_distribution' },
      features: ['power_zones', 'hr_zones', 'zone_time_distribution'],
    },
    {
      id: 'perf_records',
      badge: 'Records',
      title: 'Tes records personnels',
      description: "L'app détecte automatiquement tes meilleurs efforts sur des durées standard (1min, 5min, 20min, 1h) et les compare à tes valeurs passées. Chaque PR est notifié en temps réel.",
      keyPoints: [
        'Meilleure puissance sur 1s, 5s, 1min, 5min, 20min, 1h',
        'Vitesse max, meilleur 5km, 10km, semi, marathon',
        'Courbe de puissance (Power Curve)',
        'Évolution des records dans le temps',
      ],
      visual: 'stats',
      visualConfig: {
        stats: [
          { label: 'FTP estimé', value: 248, suffix: 'w', color: '#06B6D4' },
          { label: '20min max', value: 268, suffix: 'w', color: '#F59E0B' },
          { label: '5min max', value: 315, suffix: 'w', color: '#EF4444' },
        ],
      },
      features: ['personal_records', 'power_curve', 'pr_notification'],
    },
    {
      id: 'perf_trends',
      badge: 'Progression',
      title: 'Ta progression sur le long terme',
      description: "Visualise l'évolution de tes indicateurs clés semaine après semaine. Identifie les périodes de progression, de stagnation ou de régression pour ajuster ton programme.",
      keyPoints: [
        'FTP, VMA, FC max sur N mois',
        'Comparaison avec les objectifs fixés',
        'Tendance linéaire calculée automatiquement',
      ],
      visual: 'chart',
      visualConfig: {
        type: 'progression_line',
        data: [225, 230, 228, 235, 232, 240, 238, 245, 242, 248],
        color: '#06B6D4',
        label: 'FTP (w)',
      },
      features: ['ftp_progression', 'vma_progression', 'trend_analysis'],
    },
  ],
}
