import type { Seance } from '../common'

export const SEANCES_TR_DESC: Seance[] = [
  {
    id: 'trail-desc-intervalles',
    nom: 'Intervalles de descente',
    sport: 'trail',
    bucket: 'descente',
    objectif: "Entraîner les quadriceps en excentrique (absorber l'impact en s'allongeant), le système nerveux et la technique de pose de pied ; c'est là que les courses se perdent, et c'est sous-entraîné.",
    dureeMinMin: 45,
    dureeMaxMin: 65,
    intensite: 'eleve',
    rpe: 7,
    pourQui: 'Build→Spé, progresser très graduellement (micro-déchirures, plusieurs jours de récup)',
    phase: 'Build',
    support: ['sentier'],
    tags: ['descente', 'intervalles', 'sentier'],
    blocs: [
      { phase: 'echauffement', zone: 'Z2', label: 'Échauffement', intensiteRef: 'RPE 3-4', dureeSec: 900 },
      { phase: 'corps', zone: 'Z4', label: 'Descente rapide 1-3′', intensiteRef: 'rapide contrôlé', gradient: 'descente', dureeSec: 120, reps: 8, recup: { zone: 'Z1', label: 'remontée trot', dureeSec: 150, actif: true } },
      { phase: 'retour-calme', zone: 'Z2', label: 'Retour au calme', intensiteRef: 'RPE 3-4', dureeSec: 600 },
    ],
    conseil: "Répète jusqu'à fatigue des quadris, pas au-delà ; terrain peu à modérément technique au début.",
  },
  {
    id: 'trail-desc-volume',
    nom: 'Volume de descente',
    sport: 'trail',
    bucket: 'descente',
    objectif: "« Tanner » les jambes à la charge excentrique pour qu'elles tiennent en fin de course.",
    dureeMinMin: 40,
    dureeMaxMin: 90,
    intensite: 'modere',
    rpe: 6,
    pourQui: 'Spé',
    phase: 'Spé',
    support: ['sentier'],
    tags: ['descente', 'volume', 'sentier'],
    blocs: [
      { phase: 'corps', zone: 'Z3', label: 'Descentes cumulées', intensiteRef: 'soutenu', gradient: 'descente', dureeSec: 1350 },
    ],
    conseil: "Augmente le volume de descente très progressivement d'une semaine à l'autre.",
  },
]
