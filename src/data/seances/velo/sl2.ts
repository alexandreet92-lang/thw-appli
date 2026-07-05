import type { Seance } from './types'

export const SEANCES_SL2: Seance[] = [
  { id:'velo-seuil-classique', nom:'Seuil classique 2×18', sport:'velo', bucket:'sl2', objectif:'Développer la puissance au seuil', dureeMinMin:90, dureeMaxMin:150, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['home-trainer','route'], tags:['seuil','sl2','z4'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Seuil 18'", puissance:'95-105% FTP', cadence:'normale', dureeSec:1080, reps:2,
        repsParNiveau:{ debutant:[1,2], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
        recup:{ zone:'Z2', dureeSec:420, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Puissance seuil stable, récup active franche.',
    conseils:{
      execution:"Le seuil se tient autour de 100% FTP : c'est l'intensité maximale que tu peux soutenir ~1h. Respiration profonde et rythmée, cadence normale, buste immobile. Chaque bloc doit être régulier de bout en bout.",
      erreurs:"Partir à 105% et finir à 92% : mieux vaut une puissance légèrement basse mais parfaitement stable qu'un bloc qui s'effondre.",
      progression:"Passe de 2 à 3 blocs, puis allonge-les (18' → 20') avant de raccourcir la récup (7' → 5').",
      quand:"Phase build : la séance-clé pour élever le FTP. 1 fois par semaine, jamais deux jours de suite.",
    },
    variantes:[
      { id:'velo-seuil-classique-court', nom:'Seuil fractionné 4×9',
        pourquoi:"Mêmes minutes au seuil découpées en blocs plus courts avec récup brève : la puissance seuil est plus facile à tenir, idéal pour aborder le format. Volume cumulé équivalent.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z4', label:"Seuil 9'", puissance:'98-105% FTP', cadence:'normale', dureeSec:540, reps:4,
            repsParNiveau:{ debutant:[3,3], intermediaire:[4,4], avance:[5,5], elite:[6,6] },
            recup:{ zone:'Z2', dureeSec:180, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Blocs courts un peu plus hauts, récup courte : garder la régularité.' },
    ] },

  { id:'velo-over-unders', nom:'Over-unders 3×10', sport:'velo', bucket:'sl2', objectif:'Tolérance lactique autour du seuil', dureeMinMin:90, dureeMaxMin:120, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['home-trainer'], tags:['over-unders','sl2','z4'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:'Over-under 10\' (×3)', reps:5,
        repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,7], elite:[8,8] },
        segments:[
          { zone:'Z4', label:"1' @105%", puissance:'105% FTP', dureeSec:60 },
          { zone:'Z3', label:"1' @90%", puissance:'90% FTP', dureeSec:60 },
        ],
        recup:{ zone:'Z2', dureeSec:300, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Alterner sans coupure 1\' au-dessus / 1\' en dessous du seuil.',
    conseils:{
      execution:"Le principe : passer au-dessus du seuil (« over », 105%) puis revenir juste dessous (« under », 90%) SANS jamais s'arrêter. Le « under » n'est pas une récup, c'est là que tu apprends à recycler le lactate en roulant.",
      erreurs:"Souffler complètement sur le « under » : l'écart devient trop grand et tu perds l'effet de tolérance lactique. Garde le « under » soutenu.",
      progression:"Augmente le nombre de cycles par bloc (fourchette de niveau) avant de creuser l'écart over/under.",
      quand:"Phase build : une des meilleures séances pour repousser le seuil et préparer les changements de rythme en course.",
    },
    variantes:[
      { id:'velo-over-unders-inverse', nom:'Under-over inversé',
        pourquoi:"On commence par le « under » puis on monte sur le « over » : plus dur à gérer car il faut accélérer alors qu'on est déjà chargé. À réserver aux athlètes à l'aise avec le format classique.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z4', label:'Under-over 10\' (×3)', reps:5,
            repsParNiveau:{ debutant:[3,3], intermediaire:[5,5], avance:[6,6], elite:[7,8] },
            segments:[
              { zone:'Z3', label:"1' @90%", puissance:'90% FTP', dureeSec:60 },
              { zone:'Z4', label:"1' @107%", puissance:'107% FTP', dureeSec:60 },
            ],
            recup:{ zone:'Z2', dureeSec:300, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Relancer au-dessus du seuil sur jambes déjà chargées : gestion fine.' },
    ] },

  { id:'velo-seuil-long', nom:'Seuil long 2×25', sport:'velo', bucket:'sl2', objectif:'Étendre la durée soutenue au seuil', dureeMinMin:105, dureeMaxMin:150, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['route','home-trainer'], tags:['seuil','sl2','z4'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Seuil 25'", puissance:'95-100% FTP', cadence:'normale', dureeSec:1500, reps:2,
        repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
        recup:{ zone:'Z2', dureeSec:480, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Bas de seuil, priorité à la régularité sur 25 min.',
    conseils:{
      execution:"Ici on privilégie la durée : reste dans le bas de la fourchette seuil (95-98%) pour pouvoir tenir 25 min proprement. C'est l'endurance de seuil, précieuse pour le contre-la-montre et la longue distance.",
      erreurs:"Attaquer à 100%+ : sur 25 min, la moindre survitesse initiale rend la fin du bloc ingérable.",
      progression:"Passe de 1 à 2 puis 3 blocs, puis allonge (25' → 30').",
      quand:"Phase build spécifique CLM ou longue distance, quand le FTP de base est déjà solide.",
    },
    variantes:[
      { id:'velo-seuil-long-progressif', nom:'Seuil progressif',
        pourquoi:"Chaque bloc de 25' monte doucement (95% → 102%) au lieu d'être plat : on finit chaque bloc plus fort, travail de négatif split. Charge équivalente, gestion plus fine.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z4', label:'Seuil progressif 25\'', reps:2,
            repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
            segments:[
              { zone:'Z4', label:"10' @95%", puissance:'95% FTP', dureeSec:600 },
              { zone:'Z4', label:"10' @99%", puissance:'99% FTP', dureeSec:600 },
              { zone:'Z4', label:"5' @103%", puissance:'103% FTP', dureeSec:300 },
            ],
            recup:{ zone:'Z2', dureeSec:480, actif:true } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Finir chaque bloc plus vite qu\'il n\'a commencé.' },
    ] },

  { id:'velo-seuil-cote', nom:'Seuil en côte 2×16', sport:'velo', bucket:'sl2', objectif:'Seuil en montée pour la spécificité grimpe', dureeMinMin:105, dureeMaxMin:135, intensite:'eleve', rpe:8, pourQui:'Build', phase:'Build', support:['route'], terrain:'cote', tags:['seuil','sl2','z4','cote'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:"Seuil côte 16'", puissance:'95-103% FTP', cadence:'normale', dureeSec:960, reps:2,
        repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
        recup:{ zone:'Z1', dureeSec:360, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
    ],
    conseil:'Seuil en montée, descente en récup complète.',
    conseils:{
      execution:"La côte cale la puissance : reste assis, cadence normale, respiration ample. Idéal pour rendre le seuil spécifique aux ascensions longues de course.",
      erreurs:"Se relever et sur-braquer en danseuse : tu passes en PMA et tu quittes le seuil. Descends toujours en récup basse.",
      progression:"Ajoute un bloc dans ta fourchette, puis allonge la côte (16' → 20').",
      quand:"Phase build spécifique montagne, sur une bosse régulière de 15-20 min.",
    },
    variantes:[
      { id:'velo-seuil-cote-over', nom:'Côte avec relances',
        pourquoi:"Le bloc en côte intègre des relances courtes au-dessus du seuil (pour simuler les changements de rythme d'un col de course) puis retour au seuil. Charge proche, spécificité course renforcée.",
        blocs:[
          { phase:'echauffement', zone:'Z2', label:'Échauffement', puissance:'Z2', dureeSec:900 },
          { phase:'corps', zone:'Z4', label:'Côte à relances 16\'', reps:2,
            repsParNiveau:{ debutant:[1,1], intermediaire:[2,2], avance:[2,3], elite:[3,3] },
            segments:[
              { zone:'Z4', label:"4' @98%", puissance:'98% FTP', dureeSec:240 },
              { zone:'Z5', label:"30\" relance @112%", puissance:'112% FTP', dureeSec:30 },
              { zone:'Z4', label:"3'30 @98%", puissance:'98% FTP', dureeSec:210 },
            ],
            recup:{ zone:'Z1', dureeSec:360, actif:false } },
          { phase:'retour-calme', zone:'Z2', label:'Retour au calme', puissance:'Z1', dureeSec:600 },
        ],
        conseil:'Revenir au seuil juste après chaque relance, sans souffler.' },
    ] },
]
