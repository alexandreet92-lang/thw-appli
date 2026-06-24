import type { Seance } from './types'

export const SEANCES_SL2: Seance[] = [
  { id:'velo-seuil-classique', nom:'Seuil classique 2×18', sport:'velo', bucket:'sl2', objectif:'Développer la puissance au seuil', dureeMinMin:90, dureeMaxMin:150, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['seuil','sl2','z4'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Seuil 18'", puissance:'95-105% FTP', cadence:'normale', dureeSec:1080, reps:2, recup:{ zone:'Z2', dureeSec:420, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-over-unders', nom:'Over-unders 3×10', sport:'velo', bucket:'sl2', objectif:'Tolérance lactique autour du seuil', dureeMinMin:90, dureeMaxMin:120, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['home-trainer'], tags:['over-unders','sl2','z4'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Over 1' @105%", puissance:'105% FTP', cadence:'normale', dureeSec:60, reps:5, recup:{ zone:'Z3', dureeSec:60, actif:true } },
      { phase:'recup', zone:'Z2', label:'Récup série', puissance:'Z2', dureeSec:300 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Alterner 1 min @105% et 1 min @90%, 3 séries de 10 min, récup 5 min entre séries.' },

  { id:'velo-seuil-long', nom:'Seuil long 2×25', sport:'velo', bucket:'sl2', objectif:'Étendre la durée soutenue au seuil', dureeMinMin:105, dureeMaxMin:150, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['route','home-trainer'], tags:['seuil','sl2','z4'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Seuil 25'", puissance:'95-100% FTP', cadence:'normale', dureeSec:1500, reps:2, recup:{ zone:'Z2', dureeSec:480, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },

  { id:'velo-seuil-cote', nom:'Seuil en côte 2×16', sport:'velo', bucket:'sl2', objectif:'Seuil en montée pour la spécificité grimpe', dureeMinMin:105, dureeMaxMin:135, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', tags:['seuil','sl2','z4','cote'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Seuil côte 16'", puissance:'95-103% FTP', cadence:'normale', dureeSec:960, reps:2, recup:{ zone:'Z1', dureeSec:360, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ] },
]
