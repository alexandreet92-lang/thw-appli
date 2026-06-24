import type { Seance } from './types'

export const SEANCES_FORCE: Seance[] = [
  { id:'velo-sfr-cote', nom:'SFR en côte 5×6', sport:'velo', bucket:'force', objectif:'Force spécifique à basse cadence en montée', dureeMinMin:90, dureeMaxMin:150, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', cadenceTag:'basse', tags:['force','sfr','z3','cote'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SFR côte 6'", puissance:'88-94% FTP', cadence:'basse', dureeSec:360, reps:5, recup:{ zone:'Z1', dureeSec:300, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Cadence 50-60 rpm, rester assis et relâché.' },

  { id:'velo-force-couple', nom:'Force-couple 8×90″', sport:'velo', bucket:'force', objectif:'Développer le couple sur gros braquet au seuil', dureeMinMin:75, dureeMaxMin:105, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route','home-trainer'], cadenceTag:'basse', tags:['force','couple','z4'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:'Gros braquet 90″', puissance:'95-105% FTP', cadence:'basse', dureeSec:90, reps:8, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Cadence 45-55 rpm.' },

  { id:'velo-torque-big-gear', nom:'Torque big-gear 5×3', sport:'velo', bucket:'force', objectif:'Couple maximal sur très gros braquet', dureeMinMin:75, dureeMaxMin:105, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route','home-trainer'], cadenceTag:'basse', tags:['force','torque','z3'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"Big-gear 3'", puissance:'88-94% FTP', cadence:'basse', dureeSec:180, reps:5, recup:{ zone:'Z1', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Cadence ~50 rpm.' },
]
