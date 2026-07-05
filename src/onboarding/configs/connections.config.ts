import type { PageOnboardingConfig } from '../system/types'

export const CONNECTIONS_ONBOARDING: PageOnboardingConfig = {
  pageId: 'connections',
  version: 2,
  slides: [
    {
      id: 'conn_ecosystem',
      badge: 'Écosystème',
      badgeKey: 'onbcfg.connEcosystemBadge',
      title: 'Connecte tout ton écosystème',
      titleKey: 'onbcfg.connEcosystemTitle',
      description: "THW Coaching se connecte à tes applications et appareils pour centraliser toutes tes données sportives. Une fois connecté, tout se synchronise automatiquement.",
      descriptionKey: 'onbcfg.connEcosystemDesc',
      keyPoints: [
        'Strava : import et upload automatique des activités',
        'Garmin Connect : sync des sorties GPS',
        'Apple Health : données santé (sommeil, HRV)',
        'Wahoo : connexion capteurs (sur App native)',
      ],
      keyPointsKeys: [
        'onbcfg.connEcosystemKp1',
        'onbcfg.connEcosystemKp2',
        'onbcfg.connEcosystemKp3',
        'onbcfg.connEcosystemKp4',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Strava', color: '#FC4C02' },
          { label: 'Garmin', color: '#007DC3' },
          { label: 'Apple Health', color: '#FF2D55' },
          { label: 'Wahoo', color: '#E31837' },
        ],
      },
      features: ['strava_connect', 'garmin_connect', 'apple_health'],
    },
    {
      id: 'conn_strava',
      badge: 'Strava',
      title: 'Strava — import et upload',
      titleKey: 'onbcfg.connStravaTitle',
      description: "La connexion Strava permet deux choses : importer tes activités passées et futures dans Training, et uploader automatiquement chaque nouvelle sortie enregistrée dans l'app.",
      descriptionKey: 'onbcfg.connStravaDesc',
      keyPoints: [
        'Import automatique de toutes tes activités Strava',
        'Upload automatique après chaque séance (optionnel)',
        "Activités enrichies avec les données de l'app",
        'Déconnexion possible à tout moment',
      ],
      keyPointsKeys: [
        'onbcfg.connStravaKp1',
        'onbcfg.connStravaKp2',
        'onbcfg.connStravaKp3',
        'onbcfg.connStravaKp4',
      ],
      visual: 'mockup',
      visualConfig: { type: 'strava_sync_flow' },
      features: ['strava_import', 'strava_upload', 'auto_upload'],
    },
    {
      id: 'conn_privacy',
      badge: 'Confidentialité',
      badgeKey: 'onbcfg.connPrivacyBadge',
      title: 'Tes données restent les tiennes',
      titleKey: 'onbcfg.connPrivacyTitle',
      description: "THW Coaching ne revend jamais tes données. Les connexions aux services tiers se font via OAuth sécurisé. Tu peux révoquer l'accès à tout moment depuis cette page.",
      descriptionKey: 'onbcfg.connPrivacyDesc',
      keyPoints: [
        "Connexion OAuth sécurisée (jamais ton mot de passe)",
        'Révocation en un clic',
        'Données stockées sur serveurs sécurisés',
        'Export de toutes tes données sur demande (RGPD)',
      ],
      keyPointsKeys: [
        'onbcfg.connPrivacyKp1',
        'onbcfg.connPrivacyKp2',
        'onbcfg.connPrivacyKp3',
        'onbcfg.connPrivacyKp4',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'OAuth', color: '#10B981' },
          { label: 'Chiffré', labelKey: 'onbcfg.iconChiffre', color: '#06B6D4' },
          { label: 'Privé', labelKey: 'onbcfg.iconPrive', color: '#8B5CF6' },
          { label: 'RGPD', labelKey: 'onbcfg.iconRgpd', color: '#F59E0B' },
        ],
      },
      features: ['oauth', 'privacy', 'data_export', 'revoke_access'],
    },
  ],
}
