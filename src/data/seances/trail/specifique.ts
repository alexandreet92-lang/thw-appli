import type { Seance } from '../common'

export const SEANCES_TR_SPEC: Seance[] = [
  {
    id: 'trail-spec-simulation-course',
    nom: 'Simulation course',
    sport: 'trail',
    bucket: 'specifique',
    objectif: "Répéter toutes les composantes du jour J — montée/descente, fatigue, nutrition, hydratation, bâtons — pour ne pas découvrir les problèmes en course.",
    dureeMinMin: 90,
    dureeMaxMin: 120,
    intensite: 'eleve',
    rpe: 7,
    pourQui: 'milieu→fin de prépa',
    phase: 'Spé',
    support: ['sentier'],
    tags: ['simulation', 'specifique', 'batons'],
    blocs: [
      { phase: 'echauffement', zone: 'Z2', label: 'Échauffement', intensiteRef: 'RPE 3-4', dureeSec: 1200 },
      { phase: 'corps', zone: 'Z4', label: 'Effort cible', intensiteRef: 'FC cible', gradient: 'profil course', dureeSec: 360, reps: 4, recup: { zone: 'Z2', dureeSec: 240, actif: true } },
      { phase: 'corps', zone: 'Z2', label: 'Endurance profil', intensiteRef: 'AeT facile', dureeSec: 2400 },
    ],
    conseil: "« Mieux vaut rater une séance que rater le jour J » ; évite le terrain très technique (risque).",
  },
  {
    id: 'trail-spec-denivele',
    nom: 'Spécificité D+',
    sport: 'trail',
    bucket: 'specifique',
    objectif: "Préparer la musculature au dénivelé total de l'objectif ; monter le D+ progressivement, jamais trop vite (blessure).",
    dureeMinMin: 120,
    dureeMaxMin: 300,
    intensite: 'faible',
    rpe: 5,
    pourQui: 'Spé',
    phase: 'Spé',
    support: ['sentier'],
    tags: ['ultra', 'denivele', 'specifique'],
    blocs: [
      { phase: 'corps', zone: 'Z2', label: 'Volume D+', intensiteRef: 'facile, couru+marché', gradient: 'D+ cible', dureeSec: 10800 },
    ],
    conseil: "Compte couru ET marché ; la marche compte autant que la course en ultra.",
  },
]
