import type { Seance } from '../common'

export const SEANCES_NAT_TECH: Seance[] = [
  {
    id: 'natation-educatifs-set',
    nom: "Set d'éducatifs",
    sport: 'natation',
    bucket: 'technique',
    objectif: "Améliorer la prise d'appui, l'alignement, le roulis — en natation la technique est le plus gros levier (réduire la traînée vaut plus que pousser plus fort).",
    dureeMinMin: 30,
    dureeMaxMin: 45,
    intensite: 'faible',
    rpe: 3,
    pourQui: 'Toute saison, idéal sur jambes fatiguées',
    phase: 'Base',
    support: ['piscine'],
    tags: ['technique', 'educatifs', 'crawl'],
    blocs: [
      { phase: 'echauffement', zone: 'Z2', label: 'Échauffement + éducatifs', intensiteRef: 'EN1', distanceM: 600 },
      { phase: 'corps', zone: 'Z1', label: 'Éducatifs 50', nage: 'crawl', distanceM: 50, reps: 7, recup: { zone: 'Z1', dureeSec: 15, actif: false } },
    ],
    conseil: "1 focus par éducatif, qualité > distance.",
  },
  {
    id: 'natation-dps-8x50',
    nom: 'Distance par cycle (DPS)',
    sport: 'natation',
    bucket: 'technique',
    objectif: "Nager plus loin à chaque coup (efficience) — mesure directe de l'amélioration technique.",
    dureeMinMin: 30,
    dureeMaxMin: 40,
    intensite: 'faible',
    rpe: 4,
    pourQui: 'Toute saison',
    phase: 'Base',
    support: ['piscine'],
    tags: ['technique', 'dps', 'crawl'],
    blocs: [
      { phase: 'echauffement', zone: 'Z2', label: 'Échauffement + éducatifs', intensiteRef: 'EN1', distanceM: 400 },
      { phase: 'corps', zone: 'Z1', label: 'DPS 50', nage: 'crawl', distanceM: 50, reps: 8, recup: { zone: 'Z1', dureeSec: 20, actif: false } },
    ],
    conseil: "Compte tes coups ; vise -1 à -2 par 50 sans casser la vitesse.",
  },
]
