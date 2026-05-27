import type { PageOnboardingConfig } from '../system/types'

export const PLANNING_ONBOARDING: PageOnboardingConfig = {
  pageId: 'planning',
  version: 1,
  slides: [
    {
      id: 'planning_overview',
      title: "Ton planning d'entraînement",
      description: "Visualise ta semaine d'un coup d'œil. Chaque bloc représente une séance planifiée, colorée par sport.",
      visual: 'mockup',
      visualConfig: {
        type: 'weekly_calendar',
        days: ['L','M','M','J','V','S','D'],
        sessions: [
          { day:0, color:'#06B6D4', label:'Vélo', duration:'1h30' },
          { day:1, color:'#10B981', label:'Muscu', duration:'1h' },
          { day:3, color:'#8B5CF6', label:'Running', duration:'45min' },
          { day:5, color:'#F59E0B', label:'Trail', duration:'2h' },
        ],
      },
      features: ['weekly_view', 'session_blocks'],
    },
    {
      id: 'planning_create',
      title: 'Créer et organiser',
      description: "Ajoute des séances pour chaque sport, définis les objectifs, la durée et les exercices. Glisse pour réorganiser.",
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label:'Vélo', color:'#06B6D4' },
          { label:'Running', color:'#10B981' },
          { label:'Muscu', color:'#8B5CF6' },
          { label:'Trail', color:'#F59E0B' },
          { label:'Natation', color:'#3B82F6' },
          { label:'Yoga', color:'#EC4899' },
        ],
      },
      features: ['create_session', 'sport_types'],
    },
    {
      id: 'planning_analysis',
      title: 'Charge et récupération',
      description: "Visualise ta charge hebdomadaire. L'app t'alerte si tu planifies trop ou pas assez.",
      visual: 'chart',
      visualConfig: {
        type: 'bar_chart',
        label: 'Charge semaine',
        data: [40, 65, 55, 80, 45, 70, 30],
        colors: ['#06B6D4'],
      },
      features: ['load_analysis', 'weekly_load'],
    },
  ],
}
