import type { Seance } from '../common'

export const SEANCES_AV_UT2: Seance[] = [
  {
    id: 'aviron-ut2-long-continu',
    nom: 'UT2 long continu',
    sport: 'aviron',
    bucket: 'ut2',
    objectif: "Construire la base aérobie (capillarisation, densité mitochondriale, métabolisme lipidique) ; la pièce reine du volume.",
    dureeMinMin: 60,
    dureeMaxMin: 90,
    intensite: 'faible',
    rpe: 4,
    pourQui: 'Base et toute la saison',
    phase: 'Base',
    support: ['erg', 'bateau'],
    tags: ['ut2'],
    blocs: [
      { phase: 'corps', zone: 'Z2', label: '60-90′ continu', intensiteRef: 'UT2 55-65% 2k', cadenceSpm: '18-20', dureeSec: 4500 },
    ],
    conseil: "Discipline absolue sur le split bas et la cadence basse — ne dérive pas vers le haut. HR 65-75% max.",
  },
  {
    id: 'aviron-ut2-blocs',
    nom: 'UT2 fractionné en blocs',
    sport: 'aviron',
    bucket: 'ut2',
    objectif: "Même stimulus aérobie que le long continu, mais les micro-pauses d'1′ cassent la monotonie et soulagent le rachis lombaire — utile sur erg fixe.",
    dureeMinMin: 80,
    dureeMaxMin: 90,
    intensite: 'faible',
    rpe: 4,
    pourQui: 'Base',
    phase: 'Base',
    support: ['erg', 'bateau'],
    tags: ['ut2'],
    blocs: [
      { phase: 'corps', zone: 'Z2', label: "4×20′", intensiteRef: 'UT2 55-65% 2k', cadenceSpm: '18-20', dureeSec: 1200, reps: 4, recup: { zone: 'Z1', dureeSec: 60, actif: false } },
    ],
    conseil: "Vise un split qui te tient en bas de UT2 sur les 4 blocs ; si le HR dérive, ralentis.",
  },
]
