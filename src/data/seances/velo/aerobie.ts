import type { Seance } from './types'

export const SEANCES_AEROBIE: Seance[] = [
  { id:'velo-endurance-continue', nom:'Endurance continue (fond)', sport:'velo', bucket:'aerobie', objectif:'Construire la base aérobie sur longue durée', dureeMinMin:120, dureeMaxMin:360, intensite:'faible', rpe:4, pourQui:'Base', phase:'Base', support:['route'], tags:['aerobie','z2','fond'],
    blocs:[ { phase:'corps', zone:'Z2', label:'Endurance Z2', puissance:'65-75% FTP', dureeSec:10800,
      dureeSecParNiveau:{ debutant:[3600,5400], intermediaire:[5400,7200], avance:[9000,10800], elite:[10800,14400] } } ],
    conseil:'Allure facile et régulière, ravito si besoin.',
    conseils:{
      execution:"Reste dans le bas de la zone : tu dois pouvoir tenir une conversation complète. C'est le volume, pas l'intensité, qui construit le moteur aérobie (capillarisation, utilisation des lipides).",
      erreurs:"Dériver en tempo dès que ça monte ou qu'un copain accélère : une endurance courue trop haut fatigue sans apporter l'adaptation de fond recherchée.",
      progression:"Augmente la durée avant l'intensité (+15-20 min par palier). Le passage débutant→élite se fait surtout en allongeant la sortie.",
      quand:"Toute l'année comme socle, plusieurs fois par semaine. Non négociable en phase de base.",
    },
    variantes:[
      { id:'velo-endurance-continue-openers', nom:'Fond + openers',
        pourquoi:"Même volume d'endurance mais ponctué de 5-6 accélérations courtes (openers) pour garder la vivacité neuromusculaire sans casser l'aérobie. À préférer la veille d'une séance intense ou en fin de bloc de volume.",
        blocs:[
          { phase:'corps', zone:'Z2', label:'Endurance Z2', puissance:'65-75% FTP', dureeSec:9000,
            dureeSecParNiveau:{ debutant:[3600,5400], intermediaire:[5400,7200], avance:[7200,9000], elite:[9000,12600] } },
          { phase:'corps', zone:'Z6', label:'Opener 10"', puissance:'130% FTP', dureeSec:10, reps:6,
            repsParNiveau:{ debutant:[4,4], intermediaire:[6,6], avance:[6,7], elite:[8,8] },
            recup:{ zone:'Z2', dureeSec:290, actif:true } } ],
        conseil:'Openers courts et relâchés, sans jamais entrer dans le rouge.' },
    ] },

  { id:'velo-endurance-haute', nom:'Endurance haute (High Z2)', sport:'velo', bucket:'aerobie', objectif:'Tenir le haut de la zone aérobie en steady', dureeMinMin:120, dureeMaxMin:240, intensite:'faible', rpe:5, pourQui:'Base', phase:'Base', support:['route','home-trainer'], tags:['aerobie','z2','high-z2'],
    blocs:[ { phase:'corps', zone:'Z2', label:'High Z2', puissance:'73-78% FTP', dureeSec:10800,
      dureeSecParNiveau:{ debutant:[3600,4800], intermediaire:[5400,7200], avance:[7200,9000], elite:[9000,10800] } } ],
    conseil:'Haut de Z2 stable, ne pas glisser en tempo.',
    conseils:{
      execution:"Le High Z2 se tient juste sous le tempo : effort présent mais toujours confortable, respiration nasale possible. C'est le meilleur rapport bénéfice/fatigue pour épaissir la base aérobie.",
      erreurs:"Laisser la puissance grimper en Z3 sur les bosses : la frontière est fine, surveille le capteur plutôt que les sensations qui trompent en fin de sortie.",
      progression:"Allonge la durée du bloc steady ; quand tu tiens 90 min sans dériver, monte d'un niveau de volume.",
      quand:"Phase de base, sur home-trainer ou parcours roulant où l'allure est facile à verrouiller.",
    },
    variantes:[
      { id:'velo-endurance-haute-blocs', nom:'High Z2 par blocs',
        pourquoi:"Le volume High Z2 est découpé en blocs entrecoupés de courtes récup basses : mentalement plus facile à tenir, même temps cumulé en haut de Z2. Idéal quand le steady continu devient monotone.",
        blocs:[
          { phase:'corps', zone:'Z2', label:"High Z2 20'", puissance:'73-78% FTP', dureeSec:1200, reps:4,
            repsParNiveau:{ debutant:[2,2], intermediaire:[3,4], avance:[4,5], elite:[5,6] },
            recup:{ zone:'Z1', dureeSec:180, actif:true } } ],
        conseil:'Chaque bloc rigoureusement en haut de Z2, récup vraiment basse.' },
    ] },

  { id:'velo-endurance-progressive', nom:'Endurance progressive', sport:'velo', bucket:'aerobie', objectif:'Robustesse, finir fort sur fatigue', dureeMinMin:150, dureeMaxMin:360, intensite:'modere', rpe:5, pourQui:'Base→Build', phase:'Base', support:['route'], tags:['aerobie','z2','progressif'],
    blocs:[
      { phase:'corps', zone:'Z2', label:'Bas Z2', puissance:'~60% FTP', dureeSec:3600,
        dureeSecParNiveau:{ debutant:[2400,3000], intermediaire:[3000,3600], avance:[3600,4200], elite:[4200,4800] } },
      { phase:'corps', zone:'Z2', label:'Z2 moyen', puissance:'~68% FTP', dureeSec:3600,
        dureeSecParNiveau:{ debutant:[2400,3000], intermediaire:[3000,3600], avance:[3600,4200], elite:[4200,4800] } },
      { phase:'corps', zone:'Z2', label:'Haut Z2', puissance:'~74% FTP', dureeSec:3600,
        dureeSecParNiveau:{ debutant:[1800,2400], intermediaire:[3000,3600], avance:[3600,4200], elite:[4200,4800] } },
      { phase:'corps', zone:'Z3', label:'Top / tempo (fin)', puissance:'~80% FTP', dureeSec:1800,
        dureeSecParNiveau:{ debutant:[900,1200], intermediaire:[1500,1800], avance:[1800,2400], elite:[2400,3000] } },
    ],
    conseil:'Montée graduelle, ne basculer en tempo qu\'à la toute fin.',
    conseils:{
      execution:"Quatre paliers de puissance qui montent doucement : bas Z2, Z2 moyen, haut Z2, puis une touche de tempo pour finir. Chaque palier est un cran au-dessus, sans à-coup — tu dois finir la sortie plus fort que tu l'as commencée.",
      erreurs:"Partir trop haut sur les premiers paliers : tu n'as plus de marge pour progresser et tu termines en subissant au lieu de finir fort.",
      progression:"Allonge d'abord les paliers de base, puis étire le palier tempo final à mesure que la robustesse s'installe.",
      quand:"Fin de phase de base ou entrée en build : excellente séance de robustesse pour apprendre à durcir sur fatigue.",
    },
    variantes:[
      { id:'velo-endurance-progressive-2temps', nom:'Progressive 2 temps',
        pourquoi:"Deux grands paliers seulement (endurance basse puis haut Z2/tempo) sur durée équivalente : transition plus marquée, gestion plus simple. Bonne entrée en matière avant la version en 4 paliers.",
        blocs:[
          { phase:'corps', zone:'Z2', label:'Endurance basse', puissance:'~63% FTP', dureeSec:5400,
            dureeSecParNiveau:{ debutant:[3600,4200], intermediaire:[4800,5400], avance:[5400,6000], elite:[6000,7200] } },
          { phase:'corps', zone:'Z3', label:'Haut Z2 → tempo', puissance:'~78% FTP', dureeSec:3600,
            dureeSecParNiveau:{ debutant:[2400,3000], intermediaire:[3000,3600], avance:[3600,4200], elite:[4200,5400] } },
        ],
        conseil:'Une seule bascule nette vers le haut de zone à mi-sortie.' },
    ] },

  { id:'velo-endurance-tempo-diesel', nom:'Diesel — endurance à blocs tempo', sport:'velo', bucket:'aerobie', objectif:'Volume aérobie densifié par des blocs tempo espacés', dureeMinMin:120, dureeMaxMin:240, intensite:'modere', rpe:6, pourQui:'Base→Build', phase:'Base', support:['route','home-trainer'], tags:['aerobie','z3','tempo','diesel'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:1800 },
      { phase:'corps', zone:'Z3', label:"Tempo 12'", puissance:'80-85% FTP', cadence:'normale', dureeSec:720, reps:3,
        repsParNiveau:{ debutant:[2,2], intermediaire:[3,3], avance:[4,4], elite:[4,5] },
        recup:{ zone:'Z2', dureeSec:600, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Blocs tempo « diesel » posés dans une sortie d\'endurance.',
    conseils:{
      execution:"Les blocs tempo se roulent en force tranquille (« diesel »), gros braquet cadence normale, sans jamais monter dans le rouge. L'entre-blocs reste à allure endurance, jamais un jog mou.",
      erreurs:"Transformer le tempo en seuil : le diesel doit rester sous le seuil, c'est ce qui permet d'en accumuler beaucoup sans casser.",
      progression:"Ajoute un bloc tempo dans ta fourchette avant d'allonger chaque bloc (12' → 15').",
      quand:"Phase de base à build : pont idéal entre l'endurance pure et le travail au sweet spot.",
    },
    variantes:[
      { id:'velo-diesel-continu', nom:'Tempo diesel continu',
        pourquoi:"Un seul long bloc tempo continu au lieu des répétitions : gestion d'allure sur la durée, plus proche d'un effort de bosse longue. Volume tempo cumulé équivalent.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Endurance', puissance:'Z2', dureeSec:1800 },
          { phase:'corps', zone:'Z3', label:'Tempo continu', puissance:'80-85% FTP', cadence:'normale', dureeSec:2400,
            dureeSecParNiveau:{ debutant:[1500,1800], intermediaire:[2400,2400], avance:[2700,3000], elite:[3000,3600] } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Puissance tempo rigoureusement stable, cadence souple.' },
    ] },
]
