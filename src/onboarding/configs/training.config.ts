import type { PageOnboardingConfig } from '../system/types'

export const TRAINING_ONBOARDING: PageOnboardingConfig = {
  pageId: 'training',
  version: 1,
  slides: [
    {
      id: 'training_history',
      title: 'Ton historique complet',
      description: "Retrouve toutes tes activités enregistrées et importées depuis Strava, Garmin ou d'autres apps.",
      visual: 'mockup',
      visualConfig: {
        type: 'activity_list',
        activities: [
          { sport:'Vélo', title:'Sortie matinale', distance:'42km', duration:'1h24', color:'#06B6D4' },
          { sport:'Running', title:'Fractionné piste', distance:'8km', duration:'38min', color:'#10B981' },
          { sport:'Trail', title:'Reco Fontainebleau', distance:'18km', duration:'2h15', color:'#F59E0B' },
        ],
      },
      features: ['activity_list', 'strava_import'],
    },
    {
      id: 'training_detail',
      title: 'Analyse chaque sortie',
      description: "Carte du tracé, profil altimétrique, stats détaillées, segments réalisés. Tout est là.",
      visual: 'chart',
      visualConfig: {
        type: 'elevation_profile',
        data: [120,135,145,160,155,170,140,130,150,165,155,145,135],
        color:'#06B6D4',
        label:"Profil d'altitude",
      },
      features: ['activity_detail', 'elevation_profile', 'segments'],
    },
    {
      id: 'training_segments',
      title: 'Segments et classements',
      description: 'Compare tes temps sur des segments définis. Classe-toi parmi les autres athlètes sur les segments publics.',
      visual: 'stats',
      visualConfig: {
        stats: [
          { label:'Ton rang', value:3, suffix:'e' },
          { label:'Ton PR', value:'4:32', suffix:'' },
          { label:'Écart leader', value:'+0:18', suffix:'' },
        ],
      },
      features: ['segments', 'leaderboard'],
    },
  ],
}
