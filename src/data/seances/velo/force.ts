import type { Seance } from './types'

export const SEANCES_FORCE: Seance[] = [
  { id:'velo-sfr-cote', nom:'SFR en côte 5×6', sport:'velo', bucket:'force', objectif:'Force spécifique à basse cadence en montée', dureeMinMin:90, dureeMaxMin:150, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', cadenceTag:'basse', tags:['force','sfr','z3','cote'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"SFR côte 6'", puissance:'88-94% FTP', cadence:'basse', dureeSec:360, reps:5,
        repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[7,8] },
        recup:{ zone:'Z1', dureeSec:300, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Cadence 50-60 rpm, rester assis et relâché.',
    conseils:{
      execution:"Sous-force / répétitions (SFR) : gros braquet, cadence 50-60 rpm, assis, buste immobile. La puissance reste sweet spot mais c'est le couple musculaire qui travaille. Coup de pédale rond, on « pousse et on tire ».",
      erreurs:"Descendre trop bas en cadence (<45 rpm) au point de forcer sur les genoux : la SFR muscle, elle ne doit pas traumatiser les articulations. Se lever en danseuse fausse l'exercice.",
      progression:"Ajoute des répétitions dans ta fourchette avant d'allonger la côte (6' → 8'). Ne baisse pas la cadence sous 50 rpm pour « durcir ».",
      quand:"Début de phase build : socle de force spécifique avant les intensités hautes. À éviter si historique de douleurs de genou.",
    },
    variantes:[
      { id:'velo-sfr-cote-longue', nom:'SFR longue 3×10',
        pourquoi:"Répétitions plus longues en côte : plus de temps sous tension musculaire par bloc, endurance de force renforcée. Volume cumulé équivalent, moins de transitions.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:"SFR côte 10'", puissance:'85-92% FTP', cadence:'basse', dureeSec:600, reps:3,
            repsParNiveau:{ debutant:[2,2], intermediaire:[3,3], avance:[3,4], elite:[4,5] },
            recup:{ zone:'Z1', dureeSec:360, actif:false } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Tenir la cadence basse 10 min : concentration sur le geste.' },
    ] },

  { id:'velo-force-couple', nom:'Force-couple 8×90″', sport:'velo', bucket:'force', objectif:'Développer le couple sur gros braquet au seuil', dureeMinMin:75, dureeMaxMin:105, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route','home-trainer'], cadenceTag:'basse', tags:['force','couple','z4'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:'Gros braquet 90″', puissance:'95-105% FTP', cadence:'basse', dureeSec:90, reps:8,
        repsParNiveau:{ debutant:[5,5], intermediaire:[8,8], avance:[10,10], elite:[10,12] },
        recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Cadence 45-55 rpm, puissance seuil.',
    conseils:{
      execution:"Départ quasi arrêté sur gros braquet, on met la puissance seuil en montant progressivement la cadence de 45 vers 55 rpm. C'est un travail de couple maximal spécifique aux relances et aux démarrages en côte.",
      erreurs:"Tirer sur le dos et les bras : l'effort doit rester dans les jambes, buste calme. Cadence trop basse = risque articulaire.",
      progression:"Monte le nombre de reps dans ta fourchette avant d'augmenter le braquet.",
      quand:"Phase build : complément de force explosive, à distance des séances VO2.",
    },
    variantes:[
      { id:'velo-force-couple-depart-arrete', nom:'Départs arrêtés',
        pourquoi:"Chaque rep part à l'arrêt complet sur très gros braquet : sollicitation neuromusculaire maximale sur les 5-6 premiers coups de pédale. Idéal pour la puissance de démarrage. Reps plus courtes, plus explosives.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z6', label:'Départ arrêté 20″', puissance:'Max couple', cadence:'basse', dureeSec:20, reps:8,
            repsParNiveau:{ debutant:[5,5], intermediaire:[8,8], avance:[9,10], elite:[10,12] },
            recup:{ zone:'Z1', dureeSec:160, actif:false } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Tout donner sur les premiers coups de pédale, récup complète.' },
    ] },

  { id:'velo-torque-big-gear', nom:'Torque big-gear 5×3', sport:'velo', bucket:'force', objectif:'Couple maximal sur très gros braquet', dureeMinMin:75, dureeMaxMin:105, intensite:'eleve', rpe:7, pourQui:'Build', phase:'Build', support:['route','home-trainer'], cadenceTag:'basse', tags:['force','torque','z3'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"Big-gear 3'", puissance:'88-94% FTP', cadence:'basse', dureeSec:180, reps:5,
        repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[6,7] },
        recup:{ zone:'Z1', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Cadence ~50 rpm, geste rond et contrôlé.',
    conseils:{
      execution:"Très gros braquet, cadence ~50 rpm, puissance sweet spot tenue 3 min. On cherche la qualité du coup de pédale et l'endurance de force, pas la puissance de pointe.",
      erreurs:"Forcer sous 45 rpm ou compenser en tirant sur le cintre : reste assis, gainé, jambes seules au travail.",
      progression:"Ajoute une répétition dans ta fourchette avant d'allonger (3' → 4').",
      quand:"Phase build, idéalement en côte régulière ou sur home-trainer à résistance fixe.",
    },
    variantes:[
      { id:'velo-torque-progressif', nom:'Big-gear progressif',
        pourquoi:"Chaque bloc démarre à ~50 rpm et monte progressivement la cadence vers 75 rpm à puissance constante : on relie la force à la vélocité. Charge proche, transfert vers le pédalage rapide.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:'Big-gear cadence montante 3\'', puissance:'88-94% FTP', dureeSec:180, reps:5,
            repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[6,7] },
            recup:{ zone:'Z1', dureeSec:180, actif:false } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Monter la cadence sans augmenter la puissance : le braquet reste gros.' },
    ] },
]
