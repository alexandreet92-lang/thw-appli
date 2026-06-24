import type { Seance } from './types'

export const SEANCES_PMA: Seance[] = [
  { id:'velo-pma-5x5', nom:'PMA 5×5', sport:'velo', bucket:'pma', objectif:'Développer la PMA/VO2max', dureeMinMin:75, dureeMaxMin:105, intensite:'maximum', rpe:9, pourQui:'Build→Spé · jambes fraîches', phase:'Build', support:['home-trainer','route'], tags:['pma','vo2max','z5'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:"5' @PMA", puissance:'106-120% FTP', cadence:'normale', dureeSec:300, reps:5, recup:{ zone:'Z1', dureeSec:300, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Couper si la puissance chute sous la cible.' },

  { id:'velo-40-20', nom:'40/20 (3×9)', sport:'velo', bucket:'pma', objectif:'Soutenir un fort volume au-dessus de PMA en intermittent', dureeMinMin:75, dureeMaxMin:105, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['home-trainer'], tags:['pma','vo2max','z5','intermittent'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'40" @120% (×9, 3 séries)', puissance:'120% FTP', cadence:'normale', dureeSec:40, reps:9, recup:{ zone:'Z1', dureeSec:20, actif:false } },
      { phase:'recup', zone:'Z2', label:'Récup série', puissance:'Z2', dureeSec:300 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'3 séries de 9 reps, récup 5 min Z2 entre les séries.' },

  { id:'velo-vo2-3min', nom:'VO2 3′ (5×3)', sport:'velo', bucket:'pma', objectif:'Maximiser le temps à VO2max', dureeMinMin:75, dureeMaxMin:105, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['pma','vo2max','z5'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:"3' @VO2", puissance:'110-115% FTP', cadence:'normale', dureeSec:180, reps:5, recup:{ zone:'Z1', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-vo2-long-extensif', nom:'VO2 long extensif 4×8', sport:'velo', bucket:'pma', objectif:'Cumuler du temps à PMA basse en extensif', dureeMinMin:90, dureeMaxMin:120, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['route','home-trainer'], tags:['pma','vo2max','z5','extensif'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:"8' @PMA basse", puissance:'106-110% FTP', cadence:'normale', dureeSec:480, reps:4, recup:{ zone:'Z2', dureeSec:240, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-microbursts', nom:'Microbursts (2×13)', sport:'velo', bucket:'pma', objectif:'Stimuler VO2max via micro-intervalles supramaximaux', dureeMinMin:75, dureeMaxMin:105, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['home-trainer'], tags:['pma','vo2max','z6','microbursts'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'15" @150% (×13, 2 séries)', puissance:'150% FTP', cadence:'normale', dureeSec:15, reps:13, recup:{ zone:'Z1', dureeSec:15, actif:false } },
      { phase:'recup', zone:'Z2', label:'Récup série', puissance:'Z2', dureeSec:300 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'2 séries de 13 reps, récup 5 min Z2 entre les séries.' },
]
