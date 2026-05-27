import type { PageOnboardingConfig } from '../system/types'

export const PERFORMANCE_ONBOARDING: PageOnboardingConfig = {
  pageId: 'performance',
  version: 1,
  slides: [
    {
      id: 'perf_overview',
      title: 'Analyse de performance',
      description: "Tous tes indicateurs clés réunis : CTL, ATL, TSB, zones d'entraînement, évolution des records.",
      visual: 'stats',
      visualConfig: {
        stats: [
          { label:'CTL (Forme)', value:68, suffix:'', color:'#10B981' },
          { label:'ATL (Fatigue)', value:82, suffix:'', color:'#EF4444' },
          { label:'TSB (Fraîcheur)', value:-14, suffix:'', color:'#F59E0B' },
        ],
      },
      features: ['ctl_atl_tsb', 'performance_metrics'],
    },
    {
      id: 'perf_zones',
      title: "Zones d'entraînement",
      description: 'Configure tes zones FC et puissance. Visualise combien de temps tu passes dans chaque zone.',
      visual: 'mockup',
      visualConfig: {
        type: 'zone_bars',
        zones: [
          { name:'Z1', percent:35, color:'#6B7280' },
          { name:'Z2', percent:42, color:'#3B82F6' },
          { name:'Z3', percent:15, color:'#10B981' },
          { name:'Z4', percent:6,  color:'#F59E0B' },
          { name:'Z5', percent:2,  color:'#EF4444' },
        ],
      },
      features: ['power_zones', 'hr_zones', 'zone_distribution'],
    },
    {
      id: 'perf_records',
      title: 'Records personnels',
      description: 'Tes meilleurs efforts automatiquement détectés. 1min, 5min, 20min en puissance, vitesse max, distances.',
      visual: 'chart',
      visualConfig: {
        type: 'pr_timeline',
        data: [210,218,215,225,222,230,228],
        color:'#06B6D4',
        label:'FTP estimé (w)',
      },
      features: ['personal_records', 'pr_detection'],
    },
  ],
}
