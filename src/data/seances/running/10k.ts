import type { Seance } from './types'

export const SEANCES_10K: Seance[] = [
  { id:'10k-classique-intervalles', nom:'Classique intervalles @10k', sport:'running', bucket:'10k', filiere:'vma',
    objectif:"Soutenir l'allure 10k sur fractions longues", dureeEstimeeMin:58, intensite:'eleve', rpe:8,
    pourQui:'10k · Général', phase:'Général', tags:['vma','10k','intervalle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000, reps:4, recup:{ zone:'Z1', dureeSec:150, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Allure régulière, récup 2\'30 trot.' },

  { id:'10k-echelle-descendante', nom:'Échelle descendante 10k→5k', sport:'running', bucket:'10k', filiere:'specifique',
    objectif:'Passer de @10k à @3000 en réduisant', dureeEstimeeMin:60, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['specifique','10k','echelle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'3000 @10k', allure:'@10k', distanceM:3000, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'1000 @5k', allure:'@5k', distanceM:1000, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'500 @3000', allure:'@3000', distanceM:500, reps:2, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup décroissante, finir vite.' },

  { id:'10k-decompose-2000', nom:'Décomposé 2000', sport:'running', bucket:'10k', filiere:'specifique',
    objectif:'Finir chaque 2000 sous l\'allure 10k', dureeEstimeeMin:58, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['specifique','10k','intervalle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'2000 (1600@10k+400@5k)', allure:'@10k', distanceM:2000, reps:5, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Accélérer sur les 400 finaux.' },

  { id:'10k-lactate-shuttle-float', nom:'Lactate shuttle 10k (float Canova)', sport:'running', bucket:'10k', filiere:'seuil',
    objectif:'Continu @10k avec récup active float', dureeEstimeeMin:60, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['seuil','10k','float'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1500 @10k', allure:'@10k', distanceM:1500, reps:4, recup:{ zone:'Z3', label:'500 float @42', distanceM:500, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Le float reste actif, jamais marche.' },

  { id:'10k-over-under', nom:'Over-under seuil/10k', sport:'running', bucket:'10k', filiere:'seuil',
    objectif:'Alterner seuil et allure 10k', dureeEstimeeMin:58, intensite:'eleve', rpe:8,
    pourQui:'10k · Général', phase:'Général', tags:['seuil','10k','over-under'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'500 @seuil (×2-3 séries)', allure:'@seuil', distanceM:500, reps:5 },
      { phase:'corps', zone:'Z5', label:'500 @10k (×2-3 séries)', allure:'@10k', distanceM:500, reps:5, recup:{ zone:'Z1', label:'entre séries', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'2 à 3 séries, r 3\' entre séries.' },

  { id:'10k-tempo-progressif-paliers', nom:'Tempo progressif paliers', sport:'running', bucket:'10k', filiere:'seuil',
    objectif:'Monter progressivement seuil→5k', dureeEstimeeMin:56, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['seuil','10k','tempo'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'2000 @seuil', allure:'@seuil', distanceM:2000 },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000 },
      { phase:'corps', zone:'Z5', label:'1500 @5k', allure:'@5k', distanceM:1500 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Continu sans pause, accélération par paliers.' },

  { id:'10k-tempo-continu-6km', nom:'Tempo continu 6 km @10k', sport:'running', bucket:'10k', filiere:'seuil',
    objectif:"Tenir l'allure 10k en continu", dureeEstimeeMin:54, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['seuil','10k','continu'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'6000 @10k', allure:'@10k', distanceM:6000, reps:1 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Effort soutenu mais régulier de bout en bout.' },

  { id:'10k-vo2-court', nom:'VO2 court 1\'45', sport:'running', bucket:'10k', filiere:'vma',
    objectif:'Stimulation VO2max sur fractions courtes', dureeEstimeeMin:52, intensite:'eleve', rpe:8,
    pourQui:'10k · Général', phase:'Général', tags:['vma','10k','vo2'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1\'45 @10k+ (×2 séries)', allure:'@10k', dureeSec:105, reps:5, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'2 séries de 5, r 4\' entre séries.' },

  { id:'10k-continu-sl1-10k', nom:'Continu SL1↔10k', sport:'running', bucket:'10k', filiere:'seuil',
    objectif:'Alternance continue marathon↔10k', dureeEstimeeMin:54, intensite:'eleve', rpe:7,
    pourQui:'10k · Général', phase:'Général', tags:['seuil','10k','continu'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'1\'30 @SL1', allure:'@SL1', dureeSec:90, reps:10 },
      { phase:'corps', zone:'Z5', label:'1\'30 @10k', allure:'@10k', dureeSec:90, reps:10 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Enchaîner sans pause, ondulation continue.' },

  { id:'10k-mixte-multi-allures', nom:'Mixte multi-allures', sport:'running', bucket:'10k', filiere:'mixte',
    objectif:'Combiner seuil, 10k et VMA', dureeEstimeeMin:56, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['mixte','10k','multi-allures'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'8\' @21', allure:'@21', dureeSec:480, reps:2, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'4\' @10k', allure:'@10k', dureeSec:240, reps:2, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'1\' @VMA', allure:'@VMA', dureeSec:60, reps:3, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Du plus long au plus rapide.' },

  { id:'10k-sandwich', nom:'Sandwich 10k', sport:'running', bucket:'10k', filiere:'vma',
    objectif:'Encadrer un bloc VMA par du spécifique', dureeEstimeeMin:56, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['vma','10k','sandwich'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000, recup:{ zone:'Z1', dureeSec:180, actif:false } },
      { phase:'corps', zone:'Z5', label:'400 @VMA', allure:'@VMA', distanceM:400, reps:5, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Garder du jus pour le dernier 2000.' },

  { id:'10k-cotes-longues-seuil', nom:'Côtes longues seuil + plat', sport:'running', bucket:'10k', filiere:'seuil',
    objectif:'Force-vitesse en côte puis relance plat', dureeEstimeeMin:54, intensite:'eleve', rpe:8,
    pourQui:'10k · Général', phase:'Général', tags:['seuil','10k','cotes'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'3\' côte @seuil', allure:'@seuil', dureeSec:180, reps:5, recup:{ zone:'Z1', label:'descente', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'1\' plat @10k', allure:'@10k', dureeSec:60, reps:5 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Enchaîner côte puis plat sans coupure.' },

  { id:'10k-amorce-lactique-spe', nom:'Amorce lactique + spé', sport:'running', bucket:'10k', filiere:'specifique',
    objectif:'Pré-activer la vitesse avant le spécifique', dureeEstimeeMin:58, intensite:'eleve', rpe:8,
    pourQui:'10k · Spé', phase:'Spé', tags:['specifique','10k','lactique'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'200 @1500', allure:'@1500', distanceM:200, reps:7, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'corps', zone:'Z5', label:'1500 @10k', allure:'@10k', distanceM:1500, reps:4, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Amorce courte puis travail spécifique 10k.' },

  { id:'10k-fractionne-test', nom:'Fractionné test 10k', sport:'running', bucket:'10k', filiere:'test',
    objectif:"Valider l'allure 10k", dureeEstimeeMin:54, intensite:'eleve', rpe:8,
    pourQui:'10k · Affûtage', phase:'Affûtage', tags:['test','10k','fractionne'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'3000 @10k', allure:'@10k', distanceM:3000, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'1000 @10k', allure:'@10k', distanceM:1000, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup 1\'30, allure de course stable.' },
]
