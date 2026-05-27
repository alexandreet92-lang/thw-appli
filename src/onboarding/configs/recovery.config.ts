import type { PageOnboardingConfig } from '../system/types'

export const RECOVERY_ONBOARDING: PageOnboardingConfig = {
  pageId: 'recovery',
  version: 2,
  slides: [
    {
      id: 'recovery_status',
      badge: 'État du jour',
      title: 'Ton état de forme en temps réel',
      description: "La page Récupération analyse ta charge d'entraînement des derniers jours pour estimer si ton corps est prêt pour un effort intense, modéré ou s'il a besoin de repos.",
      keyPoints: [
        'Score de forme basé sur CTL, ATL et TSB',
        'Recommandation du jour : Intensif / Modéré / Repos',
        'Tendance sur 7 jours',
      ],
      visual: 'stats',
      visualConfig: {
        stats: [
          { label: 'Forme (CTL)', value: 71, suffix: '', color: '#10B981' },
          { label: 'Fatigue (ATL)', value: 88, suffix: '', color: '#EF4444' },
          { label: 'Fraîcheur', value: -17, suffix: '', color: '#F59E0B' },
        ],
      },
      features: ['recovery_status', 'ctl_atl_tsb', 'daily_recommendation'],
    },
    {
      id: 'recovery_wellness',
      badge: 'Bien-être',
      title: 'Saisis tes données de bien-être',
      description: "Chaque matin, note ton sommeil, ton HRV, ta fatigue musculaire et ton humeur. Ces données enrichissent l'analyse et personnalisent les recommandations.",
      keyPoints: [
        'Durée et qualité de sommeil',
        'HRV (variabilité cardiaque)',
        'Fatigue musculaire de 1 à 10',
        'Humeur et motivation',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Sommeil', color: '#8B5CF6' },
          { label: 'HRV', color: '#EF4444' },
          { label: 'Muscles', color: '#F59E0B' },
          { label: 'Humeur', color: '#10B981' },
        ],
      },
      features: ['sleep_tracking', 'hrv_input', 'muscle_fatigue', 'mood'],
    },
    {
      id: 'recovery_trends',
      badge: 'Tendances',
      title: 'Évolution sur 4 semaines',
      description: "Le graphique CTL/ATL/TSB te montre comment évolue ta forme, ta fatigue et ta fraîcheur sur le long terme. Identifie les pics de fatigue et anticipe les phases de super-compensation.",
      keyPoints: [
        'CTL (Forme) : charge chronique, évolue lentement',
        'ATL (Fatigue) : charge aiguë, réagit vite',
        'TSB (Fraîcheur) : différence CTL - ATL',
        'Optimal pour compétition : TSB positif',
      ],
      visual: 'chart',
      visualConfig: {
        type: 'triple_line',
        data1: [55, 58, 62, 60, 65, 68, 66, 70, 68, 72, 71, 74, 73, 76],
        data2: [50, 65, 72, 58, 70, 80, 65, 78, 72, 82, 75, 70, 65, 60],
        data3: [5, -7, -10, 2, -5, -12, 1, -8, -4, -10, -4, 4, 8, 16],
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
      id: 'recovery_protocol',
      badge: 'Protocoles',
      title: 'Protocoles de récupération',
      description: "Accède à des protocoles guidés : étirements post-séance, bains froids, massages, nutrition de récupération. Chaque protocole est adapté au sport pratiqué.",
      keyPoints: [
        'Étirements guidés par groupe musculaire',
        'Nutrition post-effort recommandée',
        "Durée de récupération estimée selon l'effort",
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Étirements', color: '#06B6D4' },
          { label: 'Nutrition', color: '#10B981' },
          { label: 'Bain froid', color: '#3B82F6' },
          { label: 'Sommeil', color: '#8B5CF6' },
        ],
      },
      features: ['recovery_protocols', 'stretching_guide', 'nutrition_recovery'],
    },
  ],
}
