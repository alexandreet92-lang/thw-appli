import type { PageOnboardingConfig } from '../system/types'

export const SESSION_ONBOARDING: PageOnboardingConfig = {
  pageId: 'session',
  version: 1,
  slides: [
    {
      id: 'session_library',
      title: 'Bibliothèque de séances',
      description: 'Retrouve toutes tes séances créées, classées par sport. Utilise-les dans le planning ou lors d\'un enregistrement.',
      visual: 'mockup',
      visualConfig: {
        type: 'session_list',
        sessions: [
          { name:'Endurance fondamentale', sport:'Vélo', duration:'2h', color:'#06B6D4' },
          { name:'Fractionné 30/30', sport:'Running', duration:'45min', color:'#10B981' },
          { name:'Force max', sport:'Muscu', duration:'1h', color:'#8B5CF6' },
        ],
      },
      features: ['session_library'],
    },
    {
      id: 'session_create',
      title: 'Créer une séance',
      description: "Définis les exercices, séries, charges, temps de repos. 5 types de circuits : Séries, Lap, Superset, EMOM, Tabata.",
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label:'Séries', color:'#06B6D4' },
          { label:'Lap', color:'#10B981' },
          { label:'Superset', color:'#F59E0B' },
          { label:'EMOM', color:'#EF4444' },
          { label:'Tabata', color:'#8B5CF6' },
        ],
      },
      features: ['circuit_types', 'exercise_builder'],
    },
    {
      id: 'session_launch',
      title: 'Lancer en direct',
      description: "Suis ta séance en temps réel. L'app te guide exercice par exercice avec chrono, repos et progression.",
      visual: 'stats',
      visualConfig: {
        stats: [
          { label:'Exercices', value:8, suffix:'' },
          { label:'Volume', value:4200, suffix:'kg' },
          { label:'Durée', value:52, suffix:'min' },
        ],
      },
      features: ['live_session', 'exercise_tracking'],
    },
  ],
}
