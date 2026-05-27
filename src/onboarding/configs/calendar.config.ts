import type { PageOnboardingConfig } from '../system/types'

export const CALENDAR_ONBOARDING: PageOnboardingConfig = {
  pageId: 'calendar',
  version: 1,
  slides: [
    {
      id: 'cal_overview',
      title: 'Vue calendrier',
      description: 'Retrouve toutes tes séances sur un calendrier mensuel. Chaque point coloré représente un sport différent.',
      visual: 'mockup',
      visualConfig: { type: 'month_calendar' },
      features: ['month_view', 'sport_colors'],
    },
    {
      id: 'cal_navigate',
      title: 'Navigation rapide',
      description: "Swipe pour changer de mois. Appuie sur un jour pour voir le détail des séances.",
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label:'Passé', color:'#8C8C8C' },
          { label:"Aujourd'hui", color:'#06B6D4' },
          { label:'Planifié', color:'#10B981' },
          { label:'Manqué', color:'#EF4444' },
        ],
      },
      features: ['day_detail', 'month_navigation'],
    },
  ],
}
