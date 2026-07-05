import type { Seance } from './types'

export const SEANCES_VELOCITE: Seance[] = [
  { id:'velo-haute-cadence', nom:'Haute cadence 6×4', sport:'velo', bucket:'velocite', objectif:'Améliorer la fluidité du pédalage à haute cadence', dureeMinMin:90, dureeMaxMin:120, intensite:'modere', rpe:5, pourQui:'Base', phase:'Base', support:['route','home-trainer'], cadenceTag:'haute', tags:['velocite','haute-cadence','z3'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:"Haute cadence 4'", puissance:'Z2-Z3', cadence:'haute', dureeSec:240, reps:6,
        repsParNiveau:{ debutant:[4,4], intermediaire:[6,6], avance:[7,8], elite:[8,10] },
        recup:{ zone:'Z2', dureeSec:120, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Cadence 100-110 rpm sans rebond sur la selle.',
    conseils:{
      execution:"Objectif souplesse : pédale à 100-110 rpm en gardant le bassin parfaitement stable, sans rebondir sur la selle. La puissance reste basse (Z2-Z3), c'est le geste qui travaille, pas le cardio.",
      erreurs:"Rebondir sur la selle ou crisper le haut du corps : signe que la cadence est trop haute pour ton niveau actuel. Redescends de 5 rpm et cherche la fluidité.",
      progression:"Augmente le nombre de blocs, puis la cadence cible (+5 rpm) une fois le bassin stable.",
      quand:"Phase de base, souvent en complément d'une sortie d'endurance : entretient la vélocité toute l'année.",
    },
    variantes:[
      { id:'velo-haute-cadence-pyramide', nom:'Cadence pyramidale',
        pourquoi:"La cadence monte par paliers dans chaque bloc (95 → 105 → 115 rpm) puis redescend : on explore toute la plage de vélocité. Même temps de travail, stimulus plus varié.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:'Pyramide cadence 5\'', puissance:'Z2-Z3', cadence:'haute', dureeSec:300, reps:5,
            repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[7,8] },
            recup:{ zone:'Z2', dureeSec:120, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Monter puis redescendre la cadence dans chaque bloc, bassin fixe.' },
    ] },

  { id:'velo-spin-ups', nom:'Spin-ups 8×45″', sport:'velo', bucket:'velocite', objectif:'Monter la cadence maximale en restant relâché', dureeMinMin:60, dureeMaxMin:90, intensite:'modere', rpe:5, pourQui:'Base', phase:'Base', support:['home-trainer'], cadenceTag:'haute', tags:['velocite','spin-ups','z3'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z3', label:'Spin-up 45″', puissance:'Z2', cadence:'haute', dureeSec:45, reps:8,
        repsParNiveau:{ debutant:[5,5], intermediaire:[8,8], avance:[10,10], elite:[10,12] },
        recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Monter progressivement la cadence jusqu\'au max (120+ rpm).',
    conseils:{
      execution:"Sur chaque spin-up, pars à ~90 rpm et monte progressivement jusqu'à ta cadence maximale contrôlée (120+ rpm) sur les dernières secondes. Le but : repousser le seuil où le pédalage devient désordonné.",
      erreurs:"Monter d'un coup à fond et rebondir : la montée doit être graduelle. Petit braquet obligatoire pour que la vitesse vienne des jambes, pas de la puissance.",
      progression:"Augmente le nombre de reps, puis vise une cadence max plus haute en gardant le bassin stable.",
      quand:"Phase de base, en début de séance sur home-trainer : parfait échauffement neuromusculaire.",
    },
    variantes:[
      { id:'velo-spin-ups-tenue', nom:'Cadence max tenue',
        pourquoi:"Au lieu de monter puis relâcher, on atteint la cadence max et on la TIENT 20\" : travail d'endurance de vélocité. Plus difficile à gérer proprement, même volume.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z3', label:'Cadence max tenue 30″', puissance:'Z2', cadence:'haute', dureeSec:30, reps:8,
            repsParNiveau:{ debutant:[5,5], intermediaire:[8,8], avance:[9,10], elite:[10,12] },
            recup:{ zone:'Z1', dureeSec:90, actif:false } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Tenir la cadence haute sans rebondir : couper dès que le geste se dégrade.' },
    ] },

  { id:'velo-pedalage-unijambe', nom:'Pédalage unijambe 5×45″', sport:'velo', bucket:'velocite', objectif:'Corriger les points morts du coup de pédale', dureeMinMin:45, dureeMaxMin:75, intensite:'faible', rpe:4, pourQui:'Base', phase:'Base', support:['home-trainer'], cadenceTag:'haute', tags:['velocite','unijambe','z2'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z2', label:'Unijambe 45″ (par jambe)', puissance:'Z2', cadence:'haute', dureeSec:45, reps:5,
        repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[6,8] },
        recup:{ zone:'Z2', dureeSec:45, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Alterner chaque jambe, viser un coup de pédale rond.',
    conseils:{
      execution:"Une jambe pédale, l'autre repose (sur home-trainer). Concentre-toi sur le passage du point mort haut et bas : « essuie tes chaussures » en bas, « remonte le genou » en haut. Le pédalage doit rester silencieux et régulier.",
      erreurs:"Cadence trop élevée qui masque les à-coups : reste modéré pour vraiment sentir les points morts. Ne force pas, c'est un exercice technique.",
      progression:"Augmente le nombre de reps par jambe, puis la durée (45\" → 60\").",
      quand:"Phase de base, sur home-trainer uniquement : idéal en fin d'échauffement ou en récup active.",
    },
    variantes:[
      { id:'velo-unijambe-transitions', nom:'Transitions fluides',
        pourquoi:"On alterne 30\" unijambe / 30\" deux jambes en cherchant à garder le même geste rond : transfert immédiat du travail technique vers le pédalage normal. Même durée, focus sur le report.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z2', label:'Unijambe → deux jambes', cadence:'haute', reps:5,
            repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[7,8] },
            segments:[
              { zone:'Z2', label:'30" jambe droite', puissance:'Z2', dureeSec:30 },
              { zone:'Z2', label:'30" jambe gauche', puissance:'Z2', dureeSec:30 },
              { zone:'Z2', label:'30" deux jambes', puissance:'Z2', dureeSec:30 },
            ],
            recup:{ zone:'Z2', dureeSec:60, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Reporter la sensation « ronde » de l\'unijambe sur le pédalage normal.' },
    ] },
]
