import type { Seance } from '../common'

export const SEANCES_AV_TECH: Seance[] = [
  {
    id: 'aviron-tech-rate-ladder',
    nom: 'Échelle de cadence (rate ladder)',
    sport: 'aviron',
    bucket: 'technique',
    objectif: "Efficience des changements de rate, maîtrise du coup à cadence montante sans la fatigue d'une séance dure.",
    dureeMinMin: 35,
    dureeMaxMin: 40,
    intensite: 'faible',
    rpe: 3,
    pourQui: 'toute saison',
    phase: 'Base',
    support: ['erg', 'bateau'],
    tags: ['technique'],
    blocs: [
      { phase: 'corps', zone: 'Z1', label: 'Rate ladder 18→24', cadenceSpm: '18-24', dureeSec: 600, reps: 3 },
    ],
    conseil: "La longueur du coup ne raccourcit pas quand le rate monte.",
  },
  {
    id: 'aviron-tech-drills',
    nom: "Drills coup d'aviron",
    sport: 'aviron',
    bucket: 'technique',
    objectif: "Reconstruire la séquence jambes-tronc-bras, la prise d'eau, l'équilibre — la technique est aussi déterminante que le physique sur l'erg.",
    dureeMinMin: 30,
    dureeMaxMin: 45,
    intensite: 'faible',
    rpe: 3,
    pourQui: 'toute saison',
    phase: 'Base',
    support: ['erg', 'bateau'],
    tags: ['technique'],
    blocs: [
      { phase: 'corps', zone: 'Z2', label: 'UT2 + drills', intensiteRef: 'UT2 55-65% 2k', dureeSec: 2100 },
    ],
    conseil: "Vise une courbe de force lisse en cloche, sans à-coups.",
  },
]
