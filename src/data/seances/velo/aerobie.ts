import type { Seance } from './types'

export const SEANCES_AEROBIE: Seance[] = [
  { id:'velo-endurance-continue', nom:'Endurance continue (fond)', sport:'velo', bucket:'aerobie', objectif:'Construire la base aérobie sur longue durée', dureeMinMin:120, dureeMaxMin:360, intensite:'faible', rpe:4, pourQui:'Base', phase:'Base', support:['route'], tags:['aerobie','z2','fond'],
    blocs:[ { phase:'corps', zone:'Z2', label:'Endurance Z2', puissance:'65-75% FTP', dureeSec:10800 } ] },

  { id:'velo-endurance-haute', nom:'Endurance haute (High Z2)', sport:'velo', bucket:'aerobie', objectif:'Tenir le haut de la zone aérobie en steady', dureeMinMin:120, dureeMaxMin:240, intensite:'faible', rpe:5, pourQui:'Base', phase:'Base', support:['route','home-trainer'], tags:['aerobie','z2','high-z2'],
    blocs:[ { phase:'corps', zone:'Z2', label:'High Z2', puissance:'73-78% FTP', dureeSec:10800 } ] },

  { id:'velo-endurance-progressive', nom:'Endurance progressive', sport:'velo', bucket:'aerobie', objectif:'Robustesse, finir fort sur fatigue', dureeMinMin:150, dureeMaxMin:360, intensite:'modere', rpe:5, pourQui:'Base→Build', phase:'Base', support:['route'], tags:['aerobie','z2','progressif'],
    blocs:[ { phase:'corps', zone:'Z2', label:'Bas Z2', puissance:'~60% FTP', dureeSec:3600 },
      { phase:'corps', zone:'Z2', label:'Z2 moyen', puissance:'~68% FTP', dureeSec:3600 },
      { phase:'corps', zone:'Z2', label:'Haut Z2', puissance:'~74% FTP', dureeSec:3600 },
      { phase:'corps', zone:'Z2', label:'Top Z2 (fin)', puissance:'~77% FTP', dureeSec:1800 } ], conseil:'Montée graduelle, jamais basculer en tempo avant la fin.' },
]
