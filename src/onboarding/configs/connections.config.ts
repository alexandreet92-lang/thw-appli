import type { PageOnboardingConfig } from '../system/types'

export const CONNECTIONS_ONBOARDING: PageOnboardingConfig = {
  pageId: 'connections',
  version: 1,
  slides: [
    {
      id: 'conn_overview',
      title: 'Connecte tes apps',
      description: 'Synchronise THW Coaching avec tes applications et appareils favoris pour centraliser toutes tes données.',
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label:'Strava', color:'#FC4C02' },
          { label:'Garmin', color:'#007DC3' },
          { label:'Wahoo', color:'#E31837' },
          { label:'Apple Health', color:'#FF2D55' },
        ],
      },
      features: ['strava_sync', 'garmin_sync', 'wahoo_connect'],
    },
    {
      id: 'conn_sync',
      title: 'Synchronisation automatique',
      description: "Une fois connecté, tes activités s'importent automatiquement. Upload automatique après chaque séance si tu le souhaites.",
      visual: 'stats',
      visualConfig: {
        stats: [
          { label:'Auto-import', value:'ON', suffix:'', color:'#10B981' },
          { label:'Upload Strava', value:'ON', suffix:'', color:'#FC4C02' },
          { label:'Sync Garmin', value:'ON', suffix:'', color:'#007DC3' },
        ],
      },
      features: ['auto_import', 'auto_upload', 'strava_upload'],
    },
  ],
}
