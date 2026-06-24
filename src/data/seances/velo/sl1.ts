import type { Seance } from './types'

export const SEANCES_SL1: Seance[] = [
  { id:'velo-sweetspot', nom:'Sweet Spot 3×18', sport:'velo', bucket:'sl1', objectif:'Progresser le FTP à moindre fatigue', dureeMinMin:90, dureeMaxMin:120, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['sweet-spot','sl1','z3'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SS 18'", puissance:'88-94% FTP', cadence:'normale', dureeSec:1080, reps:3, recup:{ zone:'Z2', dureeSec:360, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-tempo-continu', nom:'Tempo continu', sport:'velo', bucket:'sl1', objectif:'Soutenir un effort tempo prolongé', dureeMinMin:90, dureeMaxMin:180, intensite:'eleve', rpe:6, pourQui:'Build', phase:'Build', support:['route','home-trainer'], tags:['tempo','sl1','z3'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"Tempo 30'", puissance:'76-85% FTP', cadence:'normale', dureeSec:1800, reps:3, recup:{ zone:'Z2', dureeSec:300, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-sweetspot-longue', nom:'Sweet Spot longue 2×35', sport:'velo', bucket:'sl1', objectif:'Étendre la durée au sweet spot', dureeMinMin:120, dureeMaxMin:180, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['sweet-spot','sl1','z3'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SS 35'", puissance:'90-94% FTP', cadence:'normale', dureeSec:2100, reps:2, recup:{ zone:'Z2', dureeSec:360, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-sweetspot-cote', nom:'Sweet Spot en côte 4×10', sport:'velo', bucket:'sl1', objectif:'Sweet spot en montée pour cibler la spécificité grimpe', dureeMinMin:120, dureeMaxMin:180, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', tags:['sweet-spot','sl1','z3','cote'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SS côte 10'", puissance:'88-94% FTP', cadence:'normale', dureeSec:600, reps:4, recup:{ zone:'Z1', dureeSec:300, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },
]
