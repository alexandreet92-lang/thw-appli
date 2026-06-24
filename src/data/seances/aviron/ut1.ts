import type { Seance } from '../common'

export const SEANCES_AV_UT1: Seance[] = [
  {
    id: 'aviron-ut1-continu',
    nom: 'UT1 continu',
    sport: 'aviron',
    bucket: 'ut1',
    objectif: "Aérobie haut de gamme — au-dessus de UT2, sous le seuil ; plus grand impact que le UT2 à durée égale mais plus coûteux.",
    dureeMinMin: 40,
    dureeMaxMin: 60,
    intensite: 'modere',
    rpe: 6,
    pourQui: 'Base→Build',
    phase: 'Base',
    support: ['erg', 'bateau'],
    tags: ['ut1'],
    blocs: [
      { phase: 'corps', zone: 'Z3', label: '40-60′ continu', intensiteRef: 'UT1 65-75% 2k', cadenceSpm: '20-22', dureeSec: 3000 },
    ],
    conseil: "« Confortablement soutenu », pas dur. HR 70-80%.",
  },
  {
    id: 'aviron-ut1-paliers-cadence',
    nom: 'UT1 en paliers de cadence',
    sport: 'aviron',
    bucket: 'ut1',
    objectif: "Tenir l'intensité aérobie en faisant monter la cadence — produire la puissance via longueur puis fréquence sans casser la technique.",
    dureeMinMin: 45,
    dureeMaxMin: 50,
    intensite: 'modere',
    rpe: 6,
    pourQui: 'Base→Build',
    phase: 'Base',
    support: ['erg', 'bateau'],
    tags: ['ut1'],
    blocs: [
      { phase: 'corps', zone: 'Z3', label: "5′@18 spm", intensiteRef: 'UT1 65-75% 2k', cadenceSpm: '18', dureeSec: 300, reps: 3 },
      { phase: 'corps', zone: 'Z3', label: "5′@22 spm", intensiteRef: 'UT1 65-75% 2k', cadenceSpm: '22', dureeSec: 300, reps: 3 },
      { phase: 'corps', zone: 'Z3', label: "5′@26 spm", intensiteRef: 'UT1 65-75% 2k', cadenceSpm: '26', dureeSec: 300, reps: 3 },
    ],
    conseil: "Monte la pression aux jambes en premier, laisse la cadence suivre.",
  },
]
