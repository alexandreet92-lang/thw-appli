import type { Seance } from '../common'

export const SEANCES_TR_ENDU: Seance[] = [
  {
    id: 'trail-endu-sortie-longue',
    nom: 'Sortie longue trail',
    sport: 'trail',
    bucket: 'endurance',
    objectif: "Base aérobie et temps de pied — fondation de toute prépa trail/ultra ; habitue le corps aux heures debout et au terrain.",
    dureeMinMin: 90,
    dureeMaxMin: 300,
    intensite: 'faible',
    rpe: 4,
    pourQui: 'Base→toute la prépa',
    phase: 'Base',
    support: ['sentier'],
    tags: ['vallonné', 'continu', 'sentier'],
    blocs: [
      { phase: 'corps', zone: 'Z2', label: 'Sortie longue', intensiteRef: 'AeT facile', gradient: 'vallonné', dureeSec: 9000 },
    ],
    conseil: "Très facile (conversation possible), alterne course (plat/descente) et marche (raides).",
  },
  {
    id: 'trail-endu-back-to-back',
    nom: 'Back-to-back longues (ultra)',
    sport: 'trail',
    bucket: 'endurance',
    objectif: "Simuler la fatigue cumulée de l'ultra sans une seule sortie monstrueuse ; robustesse musculaire et mentale.",
    dureeMinMin: 120,
    dureeMaxMin: 240,
    intensite: 'faible',
    rpe: 5,
    pourQui: 'Spé ultra',
    phase: 'Spé',
    support: ['sentier'],
    tags: ['ultra', 'vallonné', 'sentier'],
    blocs: [
      { phase: 'corps', zone: 'Z2', label: 'J2 sur fatigue', intensiteRef: 'facile, jambes fatiguées', dureeSec: 7200 },
    ],
    conseil: "Le jour 2 reste facile ; l'intérêt est de courir fatigué, pas vite.",
  },
]
