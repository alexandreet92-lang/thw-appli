import type { PageOnboardingConfig } from '../system/types'

export const SESSION_ONBOARDING: PageOnboardingConfig = {
  pageId: 'session',
  version: 2,
  slides: [
    {
      id: 'session_library',
      badge: 'Bibliothèque',
      title: 'Tes séances, toujours disponibles',
      description: "La bibliothèque centralise toutes tes séances créées, classées par sport. Retrouve-les en quelques secondes pour les réutiliser dans le planning ou les lancer directement.",
      keyPoints: [
        "Filtrage par sport, durée ou type d'effort",
        'Recherche par nom ou exercice',
        'Séances de la semaine en cours mises en avant',
      ],
      visual: 'mockup',
      visualConfig: { type: 'session_library_list' },
      features: ['session_library', 'search', 'filters'],
    },
    {
      id: 'session_circuit_types',
      badge: 'Types de circuits',
      title: '5 types de circuits disponibles',
      description: "Chaque type de circuit correspond à une logique d'entraînement différente. De la série classique au Tabata, chaque format est géré différemment en temps réel.",
      keyPoints: [
        'Séries : même exercice répété X fois avec repos',
        'Lap : plusieurs exos enchaînés, répétés en circuit',
        'Superset : 2-3 exos consécutifs sans repos entre eux',
        'EMOM : un exercice par minute, le reste est du repos',
        'Tabata : 20s effort / 10s repos × 8 rounds',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Séries', color: '#06B6D4' },
          { label: 'Lap', color: '#10B981' },
          { label: 'Superset', color: '#F59E0B' },
          { label: 'EMOM', color: '#EF4444' },
          { label: 'Tabata', color: '#8B5CF6' },
        ],
      },
      features: ['series_circuit', 'lap_circuit', 'superset', 'emom', 'tabata'],
    },
    {
      id: 'session_live',
      badge: 'En direct',
      title: 'Suivi en temps réel exercice par exercice',
      description: "Lance une séance et laisse-toi guider. L'app affiche un exercice à la fois avec le chrono, le nombre de séries, la charge et le temps de repos. Tu vois toujours l'exercice suivant.",
      keyPoints: [
        'Exercice actuel en grand avec toutes ses données',
        'Chrono de repos automatique entre les séries',
        'Modification de la charge ou des reps en direct',
        'FC et courbe cardiaque toujours visibles',
      ],
      visual: 'mockup',
      visualConfig: { type: 'live_workout' },
      features: ['live_session', 'rest_timer', 'hr_display'],
    },
    {
      id: 'session_exercises',
      badge: 'Exercices',
      title: "Une bibliothèque d'exercices complète",
      description: "Des centaines d'exercices classés par groupe musculaire, disponibles directement. Si un exercice est absent, crée-le en quelques secondes et il sera disponible pour toutes tes séances futures.",
      keyPoints: [
        'Recherche par nom ou groupe musculaire',
        'Créer un exercice custom en 3 champs',
        'Exercices sauvegardés pour toujours',
        'Poids de corps, machine, haltères, barres',
      ],
      visual: 'icon_grid',
      visualConfig: {
        icons: [
          { label: 'Pectoraux', color: '#EF4444' },
          { label: 'Dos', color: '#3B82F6' },
          { label: 'Jambes', color: '#10B981' },
          { label: 'Épaules', color: '#F59E0B' },
          { label: 'Bras', color: '#8B5CF6' },
          { label: 'Core', color: '#06B6D4' },
        ],
      },
      features: ['exercise_library', 'custom_exercise', 'muscle_groups'],
    },
    {
      id: 'session_summary',
      badge: 'Résumé',
      title: 'Analyse complète après chaque séance',
      description: "À la fin de chaque séance, retrouve le volume total soulevé, le nombre de séries complétées, la comparaison avec la séance précédente et les séries qui ont été des records personnels.",
      keyPoints: [
        'Volume total en kg calculé automatiquement',
        'Comparaison prévu vs réalisé',
        'Record personnel détecté et mis en avant',
        'Courbe FC de la séance complète',
      ],
      visual: 'stats',
      visualConfig: {
        stats: [
          { label: 'Volume', value: 4850, suffix: 'kg', color: '#06B6D4' },
          { label: 'Séries', value: 32, suffix: '', color: '#10B981' },
          { label: 'PR battus', value: 3, suffix: '', color: '#F59E0B' },
        ],
      },
      features: ['session_summary', 'volume_tracking', 'pr_detection'],
    },
  ],
}
