import type { Seance } from './types'

export const SEANCES_VELOCITE: Seance[] = [
  { id:'velo-haute-cadence', nom:'Haute cadence 6×4', sport:'velo', bucket:'velocite', objectif:'Améliorer la fluidité du pédalage à haute cadence', dureeMinMin:90, dureeMaxMin:120, intensite:'modere', rpe:5, pourQui:'Base', phase:'Base', support:['route','home-trainer'], cadenceTag:'haute', tags:['velocite','haute-cadence','z3'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"Haute cadence 4'", puissance:'Z2-Z3', cadence:'haute', dureeSec:240, reps:6, recup:{ zone:'Z2', dureeSec:120, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Cadence 100-110 rpm sans rebond sur la selle.' },

  { id:'velo-spin-ups', nom:'Spin-ups 8×45″', sport:'velo', bucket:'velocite', objectif:'Monter la cadence maximale en restant relâché', dureeMinMin:60, dureeMaxMin:90, intensite:'modere', rpe:5, pourQui:'Base', phase:'Base', support:['home-trainer'], cadenceTag:'haute', tags:['velocite','spin-ups','z3'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:'Spin-up 45″', puissance:'Z2', cadence:'haute', dureeSec:45, reps:8, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Monter progressivement la cadence jusqu’au max (120+ rpm).' },

  { id:'velo-pedalage-unijambe', nom:'Pédalage unijambe 5×45″', sport:'velo', bucket:'velocite', objectif:'Corriger les points morts du coup de pédale', dureeMinMin:45, dureeMaxMin:75, intensite:'faible', rpe:4, pourQui:'Base', phase:'Base', support:['home-trainer'], cadenceTag:'haute', tags:['velocite','unijambe','z2'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z2', label:'Unijambe 45″ (par jambe)', puissance:'Z2', cadence:'haute', dureeSec:45, reps:5, recup:{ zone:'Z2', dureeSec:45, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Alterner chaque jambe, viser un coup de pédale rond.' },
]
