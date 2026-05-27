import type { PageOnboardingConfig } from '../system/types'

export const RECOVERY_ONBOARDING: PageOnboardingConfig = {
  pageId: 'recovery',
  version: 1,
  slides: [
    {
      id: 'recovery_status',
      title: 'Ton état de récupération',
      description: "L'app analyse ta charge d'entraînement et estime ton niveau de récupération pour t'indiquer si tu peux t'entraîner.",
      visual: 'stats',
      visualConfig: {
        stats: [
          { label:'Forme', value:82, suffix:'%', color:'#10B981' },
          { label:'Fatigue', value:45, suffix:'%', color:'#EF4444' },
          { label:'État', value:'Bon', suffix:'', color:'#10B981' },
        ],
      },
      features: ['recovery_status', 'form_score'],
    },
    {
      id: 'recovery_tools',
      title: 'Outils de récupération',
      description: 'Sommeil, HRV, ressenti, étirements. Saisis tes données pour un suivi précis.',
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label:'Sommeil', color:'#8B5CF6' },
          { label:'HRV', color:'#EF4444' },
          { label:'Ressenti', color:'#F59E0B' },
          { label:'Mobilité', color:'#10B981' },
        ],
      },
      features: ['sleep_tracking', 'hrv', 'wellness'],
    },
    {
      id: 'recovery_chart',
      title: 'Tendances sur 4 semaines',
      description: "Visualise l'évolution de ta fatigue et de ta forme pour ajuster ton entraînement.",
      visual: 'chart',
      visualConfig: {
        type: 'dual_line',
        data1: [60,65,58,70,55,68,72,65,80,75,70,82,78,85],
        data2: [40,45,55,42,60,48,35,50,42,38,45,30,40,35],
        color1:'#10B981',
        color2:'#EF4444',
        label1:'Forme',
        label2:'Fatigue',
      },
      features: ['ctl_atl_tsb', 'trend_chart'],
    },
  ],
}
