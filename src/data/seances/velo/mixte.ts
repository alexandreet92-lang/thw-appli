import type { Seance } from './types'

export const SEANCES_MIXTE: Seance[] = [
  { id:'velo-mixte-prefatigue', nom:'Pré-fatigue PMA (simulation course)', sport:'velo', bucket:'mixte', objectif:'PMA sur grosse pré-fatigue : simuler la course', dureeMinMin:180, dureeMaxMin:300, intensite:'eleve', rpe:8, pourQui:'Spé · cycliste entraîné', phase:'Spé', support:['route'], tags:['mixte','specifique','sweet-spot','pma'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:2400 },
      { phase:'corps', zone:'Z3', label:"SS 20'", puissance:'88-94% FTP', dureeSec:1200, reps:3, recup:{ zone:'Z2', dureeSec:600, actif:true } },
      { phase:'corps', zone:'Z2', label:'Endurance (pré-fatigue)', puissance:'Z2', dureeSec:3600 },
      { phase:'corps', zone:'Z5', label:"1' @PMA", puissance:'110-120% FTP', dureeSec:60, reps:10, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'La fin PMA doit tomber sur jambes déjà entamées.' },

  { id:'velo-mixte-surges', nom:'Simulation course / surges', sport:'velo', bucket:'mixte', objectif:'Sortie longue Z2 ponctuée de surges PMA-sprint dispersés', dureeMinMin:180, dureeMaxMin:300, intensite:'eleve', rpe:7, pourQui:'Spé', phase:'Spé', support:['route'], tags:['mixte','specifique','pma','surges'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:3600 },
      { phase:'corps', zone:'Z5', label:'Surge 45"', puissance:'PMA-sprint', dureeSec:45, reps:12, recup:{ zone:'Z2', dureeSec:600, actif:true } },
      { phase:'corps', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:3600 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Disperser les surges au feeling sur toute la sortie.' },

  { id:'velo-fartlek-libre', nom:'Fartlek libre', sport:'velo', bucket:'mixte', objectif:'Efforts variés au feeling sur sortie longue', dureeMinMin:120, dureeMaxMin:180, intensite:'eleve', rpe:6, pourQui:'Build', phase:'Build', support:['route'], tags:['mixte','fartlek','z4'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:3600 },
      { phase:'corps', zone:'Z4', label:'Efforts variés', puissance:'Z4', dureeSec:300, reps:6, recup:{ zone:'Z2', dureeSec:300, actif:true } },
      { phase:'corps', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:1800 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Au ressenti, pas de structure rigide.' },
]
