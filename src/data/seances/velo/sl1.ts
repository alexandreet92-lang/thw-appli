import type { Seance } from './types'

export const SEANCES_SL1: Seance[] = [
  { id:'velo-sweetspot', nom:'Sweet Spot 3×18', sport:'velo', bucket:'sl1', objectif:'Progresser le FTP à moindre fatigue', dureeMinMin:90, dureeMaxMin:120, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['sweet-spot','sl1','z3'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SS 18'", puissance:'88-94% FTP', cadence:'normale', dureeSec:1080, reps:3,
        repsParNiveau:{ debutant:[2,2], intermediaire:[3,3], avance:[3,4], elite:[4,5] },
        recup:{ zone:'Z2', dureeSec:360, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Cale-toi à 90% FTP et tiens sans dériver.',
    conseils:{
      execution:"Le sweet spot est le meilleur compromis charge/fatigue : ~90% FTP, cadence normale, respiration ample mais contrôlée. Tu dois finir chaque bloc en te disant que tu aurais pu tenir 2-3 min de plus.",
      erreurs:"Grimper vers 95-100% FTP « parce que ça passe » : tu bascules alors en seuil, la fatigue explose et tu ne tiens plus le volume qui fait tout l'intérêt du sweet spot.",
      progression:"Ajoute un bloc dans ta fourchette, puis allonge chaque bloc (18' → 20') avant de raccourcir la récup.",
      quand:"Colonne vertébrale de la phase build : 1 à 2 fois par semaine, sur home-trainer pour verrouiller la puissance.",
    },
    variantes:[
      { id:'velo-sweetspot-longue-2x', nom:'Format long 2×27',
        pourquoi:"Moins de blocs mais plus longs : plus proche de l'effort continu d'une longue bosse. Volume au sweet spot cumulé équivalent, exigence de concentration supérieure.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:"SS 27'", puissance:'88-93% FTP', cadence:'normale', dureeSec:1620, reps:2,
            repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
            recup:{ zone:'Z2', dureeSec:480, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Blocs longs : la difficulté vient de la durée, garde la puissance basse dans la fourchette.' },
    ] },

  { id:'velo-tempo-continu', nom:'Tempo continu', sport:'velo', bucket:'sl1', objectif:'Soutenir un effort tempo prolongé', dureeMinMin:90, dureeMaxMin:180, intensite:'eleve', rpe:6, pourQui:'Build', phase:'Build', support:['route','home-trainer'], tags:['tempo','sl1','z3'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"Tempo 30'", puissance:'76-85% FTP', cadence:'normale', dureeSec:1800, reps:3,
        repsParNiveau:{ debutant:[2,2], intermediaire:[3,3], avance:[3,4], elite:[4,4] },
        recup:{ zone:'Z2', dureeSec:300, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Tempo soutenu mais confortable, cadence souple.',
    conseils:{
      execution:"Le tempo se roule sous le sweet spot : effort net mais loin du seuil, tu pourrais parler par phrases courtes. Objectif : accumuler du temps de qualité sans coût de récupération élevé.",
      erreurs:"Monter en sweet spot ou en seuil : le tempo perd son rôle de volume qualitatif si tu le durcis trop.",
      progression:"Ajoute un bloc de 30' ou allonge-les ; c'est le temps cumulé qui compte, pas l'intensité.",
      quand:"Phase build, ou en semaine de reprise après une coupure : dose d'intensité douce et payante.",
    },
    variantes:[
      { id:'velo-tempo-continu-unique', nom:'Un seul long tempo',
        pourquoi:"Un unique bloc tempo continu plutôt que des répétitions : test de régularité et de gestion mentale sur la durée. Volume proche, monotonie assumée.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:'Tempo continu', puissance:'78-84% FTP', cadence:'normale', dureeSec:3600,
            dureeSecParNiveau:{ debutant:[2400,2700], intermediaire:[3600,3600], avance:[4200,4800], elite:[4800,5400] } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Puissance tempo stable du début à la fin, sans à-coup.' },
    ] },

  { id:'velo-sweetspot-longue', nom:'Sweet Spot longue 2×35', sport:'velo', bucket:'sl1', objectif:'Étendre la durée au sweet spot', dureeMinMin:120, dureeMaxMin:180, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['sweet-spot','sl1','z3'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SS 35'", puissance:'90-94% FTP', cadence:'normale', dureeSec:2100, reps:2,
        repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
        recup:{ zone:'Z2', dureeSec:360, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Blocs longs, garder la puissance stable jusqu\'au bout.',
    conseils:{
      execution:"Version « endurance de puissance » du sweet spot : des blocs de 35 min qui musclent la capacité à tenir haut longtemps. Cadence normale, ravitaille pendant les récups.",
      erreurs:"Partir en haut de fourchette : sur 35 min, 1-2% FTP de trop au départ se paient cher sur la fin du bloc.",
      progression:"Passe de 1 à 2 puis 3 blocs ; l'objectif final est 3×35 tenus à puissance stable.",
      quand:"Cœur de la phase build spécifique longue distance (gran fondo, ultra-distance, cyclosportives).",
    },
    variantes:[
      { id:'velo-sweetspot-longue-ondule', nom:'Sweet spot ondulé',
        pourquoi:"Dans chaque bloc, la puissance ondule légèrement (2' sweet spot / 1' tempo) au lieu d'être plate : plus facile à tenir sur 35 min, même charge cumulée. Utile pour les athlètes qui saturent sur le steady.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:'Ondulation SS/tempo', reps:8,
            repsParNiveau:{ debutant:[5,5], intermediaire:[8,8], avance:[9,10], elite:[11,12] },
            segments:[
              { zone:'Z3', label:"2' @93%", puissance:'93% FTP', dureeSec:120 },
              { zone:'Z3', label:"1' @82%", puissance:'82% FTP', dureeSec:60 },
            ],
            recup:{ zone:'Z2', dureeSec:240, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Ondulation douce, jamais un à-coup : la moyenne reste au sweet spot.' },
    ] },

  { id:'velo-sweetspot-cote', nom:'Sweet Spot en côte 4×10', sport:'velo', bucket:'sl1', objectif:'Sweet spot en montée pour cibler la spécificité grimpe', dureeMinMin:120, dureeMaxMin:180, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', tags:['sweet-spot','sl1','z3','cote'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SS côte 10'", puissance:'88-94% FTP', cadence:'normale', dureeSec:600, reps:4,
        repsParNiveau:{ debutant:[2,3], intermediaire:[4,4], avance:[5,5], elite:[5,6] },
        recup:{ zone:'Z1', dureeSec:300, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Sweet spot en montée, descente en récup.',
    conseils:{
      execution:"La pente stabilise naturellement la puissance : reste assis, cadence normale, buste calme. C'est la meilleure façon de rendre le sweet spot spécifique à la grimpe.",
      erreurs:"Se mettre en danseuse et sur-braquer : tu montes en seuil et tu perds le caractère extensif. Descends toujours en récup complète.",
      progression:"Ajoute des répétitions dans ta fourchette avant d'allonger la côte (10' → 12').",
      quand:"Phase build spécifique montagne, sur une bosse régulière de 8-12 min.",
    },
    variantes:[
      { id:'velo-sweetspot-cote-longue', nom:'Côte longue 2×20',
        pourquoi:"Deux longues ascensions au sweet spot au lieu de quatre courtes : simulation d'un vrai col. Volume cumulé équivalent, gestion d'effort sur la durée plus exigeante.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:"SS côte 20'", puissance:'88-92% FTP', cadence:'normale', dureeSec:1200, reps:2,
            repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
            recup:{ zone:'Z1', dureeSec:420, actif:false } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Gérer la puissance comme sur un col : bas de fourchette au départ.' },
    ] },
]
