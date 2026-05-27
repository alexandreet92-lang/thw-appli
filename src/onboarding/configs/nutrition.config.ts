import type { PageOnboardingConfig } from '../system/types'

export const NUTRITION_ONBOARDING: PageOnboardingConfig = {
  pageId: 'nutrition',
  version: 1,
  slides: [
    {
      id: 'nutrition_daily',
      title: 'Bilan du jour',
      description: 'Suis tes calories et macronutriments en temps réel. Les anneaux colorés montrent ta progression vers les objectifs.',
      visual: 'mockup',
      visualConfig: {
        type: 'donut_rings',
        rings: [
          { label:'Calories', percent:72, color:'#06B6D4' },
          { label:'Protéines', percent:85, color:'#10B981' },
          { label:'Glucides', percent:65, color:'#F59E0B' },
          { label:'Lipides', percent:58, color:'#EF4444' },
        ],
      },
      features: ['daily_intake', 'macro_tracking'],
    },
    {
      id: 'nutrition_meals',
      title: 'Gestion des repas',
      description: "6 créneaux repas par jour. Scanne les codes-barres, prends une photo de ton repas ou choisis parmi tes repas types.",
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label:'Scan', color:'#06B6D4' },
          { label:'Photo IA', color:'#8B5CF6' },
          { label:'Repas types', color:'#10B981' },
          { label:'Manuel', color:'#F59E0B' },
        ],
      },
      features: ['meal_logging', 'barcode_scan', 'ai_photo'],
    },
    {
      id: 'nutrition_trends',
      title: 'Historique et tendances',
      description: "Analyse ton historique nutritionnel sur 7, 14 ou 30 jours. Identifie les patterns et ajuste ton alimentation.",
      visual: 'chart',
      visualConfig: {
        type: 'bar_chart',
        data: [1850,2100,1950,2300,1800,2150,2050],
        color:'#06B6D4',
        label:'Calories / jour',
      },
      features: ['nutrition_history', 'trend_view'],
    },
    {
      id: 'nutrition_weight',
      title: 'Poids et composition',
      description: "Suis l'évolution de ton poids, masse grasse, masse musculaire et IMC sur le long terme.",
      visual: 'chart',
      visualConfig: {
        type: 'area_chart',
        data: [78.5,78.2,77.9,78.1,77.6,77.3,77.0],
        color:'#10B981',
        label:'Poids (kg)',
      },
      features: ['weight_tracking', 'body_composition'],
    },
  ],
}
