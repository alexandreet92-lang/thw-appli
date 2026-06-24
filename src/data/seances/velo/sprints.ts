import type { Seance } from './types'

export const SEANCES_SPRINTS: Seance[] = [
  { id:'velo-sprints-max-courts', nom:'Sprints max courts 8×12″', sport:'velo', bucket:'sprints', objectif:'Puissance neuromusculaire maximale', dureeMinMin:90, dureeMaxMin:120, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['route'], tags:['sprints','neuromusculaire','z7'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'Sprint 12″', puissance:'Max', cadence:'normale', dureeSec:12, reps:8, recup:{ zone:'Z1', dureeSec:240, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Récup complète entre chaque sprint.' },

  { id:'velo-sprints-lances', nom:'Sprints lancés 7×18″', sport:'velo', bucket:'sprints', objectif:'Vitesse de pointe à partir d’une allure lancée', dureeMinMin:90, dureeMaxMin:120, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['route'], tags:['sprints','neuromusculaire','z7','lances'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'Sprint lancé 18″', puissance:'Max', cadence:'normale', dureeSec:18, reps:7, recup:{ zone:'Z1', dureeSec:270, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Démarrer lancé à vitesse modérée puis tout donner.' },

  { id:'velo-sprints-cote', nom:'Sprints en côte 7×12″', sport:'velo', bucket:'sprints', objectif:'Force-vitesse en montée raide', dureeMinMin:75, dureeMaxMin:105, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', tags:['sprints','force-vitesse','z7','cote'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'Sprint côte 12″', puissance:'Max', cadence:'normale', dureeSec:12, reps:7, recup:{ zone:'Z1', dureeSec:240, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Récup complète, montée raide.' },

  { id:'velo-sprints-longs-anaerobie', nom:'Sprints longs anaérobie 5×30″', sport:'velo', bucket:'sprints', objectif:'Capacité anaérobie all-out', dureeMinMin:90, dureeMaxMin:120, intensite:'maximum', rpe:9, pourQui:'Build', phase:'Build', support:['route','home-trainer'], tags:['sprints','anaerobie','z7'],
    blocs:[ { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'All-out 30″', puissance:'Max', cadence:'normale', dureeSec:30, reps:5, recup:{ zone:'Z1', dureeSec:270, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 } ], conseil:'Récup 4-5 min entre chaque effort.' },
]
