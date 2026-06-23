import type { Seance } from './types'

export const SEANCES_SEMI: Seance[] = [
  { id:'semi-specifique-excellence', nom:'Spécifique par excellence', sport:'running', bucket:'semi', filiere:'specifique',
    objectif:"Tenir l'allure semi sur de longs blocs", dureeEstimeeMin:72, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['specifique','semi','intervalle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'5500 @21', allure:'@21', distanceM:5500, reps:2, recup:{ zone:'Z1', label:'jog', dureeSec:240, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Allure semi régulière, jog de récup.' },

  { id:'semi-specifique-long-decompose', nom:'Spécifique long décomposé', sport:'running', bucket:'semi', filiere:'specifique',
    objectif:'Finir chaque bloc plus vite (@10k)', dureeEstimeeMin:70, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['specifique','semi','decompose'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'4000 (3000@21+1000@10k)', allure:'@21', distanceM:4000, reps:3, recup:{ zone:'Z1', label:'jog', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Accélérer sur le dernier km de chaque bloc.' },

  { id:'semi-echelle-descendante', nom:'Échelle descendante semi', sport:'running', bucket:'semi', filiere:'specifique',
    objectif:'Du semi vers le 5k en réduisant', dureeEstimeeMin:68, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['specifique','semi','echelle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'5000 @21', allure:'@21', distanceM:5000, recup:{ zone:'Z1', dureeSec:180, actif:false } },
      { phase:'corps', zone:'Z4', label:'3000 @21', allure:'@21', distanceM:3000, recup:{ zone:'Z1', dureeSec:150, actif:false } },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'1000 @5k', allure:'@5k', distanceM:1000, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup décroissante, finir rapide.' },

  { id:'semi-lactate-shuttle', nom:'Lactate shuttle semi', sport:'running', bucket:'semi', filiere:'seuil',
    objectif:'@21 continu avec float marathon actif', dureeEstimeeMin:70, intensite:'eleve', rpe:7,
    pourQui:'Semi · Spé', phase:'Spé', tags:['seuil','semi','float'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'1000 @21', allure:'@21', distanceM:1000, reps:8, recup:{ zone:'Z3', label:'500 float @42', distanceM:500, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Le float reste actif, continu.' },

  { id:'semi-over-under-21-10k', nom:'Over-under 21/10k', sport:'running', bucket:'semi', filiere:'seuil',
    objectif:'Alterner allure semi et allure 10k', dureeEstimeeMin:68, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['seuil','semi','over-under'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'800 @21 (×2 séries)', allure:'@21', distanceM:800, reps:4 },
      { phase:'corps', zone:'Z5', label:'400 @10k (×2 séries)', allure:'@10k', distanceM:400, reps:4, recup:{ zone:'Z1', label:'entre séries', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'2 séries, enchaîner 800/400 sans pause.' },

  { id:'semi-longue-a-blocs-21', nom:'Longue à blocs @21', sport:'running', bucket:'semi', filiere:'specifique',
    objectif:'Intégrer du spécifique dans une SL de 20 km', dureeEstimeeMin:95, intensite:'eleve', rpe:7,
    pourQui:'Semi · Spé', phase:'Spé', tags:['specifique','semi','sortie-longue'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z2', label:'SL base 6 km', allure:'EF', distanceM:6000, dureeSec:2160 },
      { phase:'corps', zone:'Z4', label:'3000 @21', allure:'@21', distanceM:3000, reps:3, recup:{ zone:'Z3', label:'1 km steady', distanceM:1000, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'SL de base puis blocs spécifiques sur jambes fatiguées.' },

  { id:'semi-tempo-ondule', nom:'Tempo ondulé seuil/semi', sport:'running', bucket:'semi', filiere:'seuil',
    objectif:'Continu au seuil avec légère ondulation', dureeEstimeeMin:72, intensite:'eleve', rpe:7,
    pourQui:'Semi · Général', phase:'Général', tags:['seuil','semi','continu'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:'1000 @seuil', allure:'@seuil', distanceM:1000, reps:8 },
      { phase:'corps', zone:'Z4', label:'1000 @21', allure:'@21', distanceM:1000, reps:8 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Continu, ondulation légère seuil↔semi.' },

  { id:'semi-1k1k', nom:'1k-1k semi / steady', sport:'running', bucket:'semi', filiere:'seuil',
    objectif:"Volume autour de l'allure semi sans récup totale", dureeEstimeeMin:70, intensite:'eleve', rpe:7,
    pourQui:'Semi · Général→Spé', phase:'Général', tags:['seuil','semi','continu'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:900 },
      { phase:'corps', zone:'Z4', label:'1 km @21', allure:'@21', distanceM:1000, reps:6, recup:{ zone:'Z3', label:'1 km steady', distanceM:1000, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Partir conservateur, monter petit à petit.' },

  { id:'semi-progression-multi-allures', nom:'Progression multi-allures', sport:'running', bucket:'semi', filiere:'mixte',
    objectif:'Monter de SL1 vers @10k par paliers', dureeEstimeeMin:72, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['mixte','semi','progression'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'4000 @SL1', allure:'@SL1', distanceM:4000, recup:{ zone:'Z1', dureeSec:240, actif:false } },
      { phase:'corps', zone:'Z3', label:'4000 @42', allure:'@42', distanceM:4000, recup:{ zone:'Z1', dureeSec:240, actif:false } },
      { phase:'corps', zone:'Z4', label:'3000 @21', allure:'@21', distanceM:3000, recup:{ zone:'Z1', dureeSec:240, actif:false } },
      { phase:'corps', zone:'Z5', label:'1000 @10k', allure:'@10k', distanceM:1000 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Progression continue, finir vite.' },

  { id:'semi-mixte-spe-descendant', nom:'Mixte spé descendant', sport:'running', bucket:'semi', filiere:'mixte',
    objectif:'Du semi au VMA en réduisant la durée', dureeEstimeeMin:60, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['mixte','semi','descendant'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'6\' @21', allure:'@21', dureeSec:360, reps:2, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'3\' @10k', allure:'@10k', dureeSec:180, reps:2, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'1\' @VMA', allure:'@VMA', dureeSec:60, reps:3, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Du plus long au plus rapide.' },

  { id:'semi-double-seuil-norvegien', nom:'Double seuil (norvégien)', sport:'running', bucket:'semi', filiere:'seuil',
    objectif:'Volume au seuil sous-maximal sur deux séances', dureeEstimeeMin:55, intensite:'modere', rpe:6,
    pourQui:'Semi · Base', phase:'Base', tags:['seuil','semi','double-seuil'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'AM 2000 @SL1', allure:'@SL1', distanceM:2000, reps:4, recup:{ zone:'Z1', dureeSec:60, actif:false } },
      { phase:'corps', zone:'Z3', label:'PM 400 @SL1', allure:'@SL1', distanceM:400, reps:8, recup:{ zone:'Z1', dureeSec:45, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Deux séances dans la journée, rester sous-maximal.' },

  { id:'semi-cotes-longues-seuil', nom:'Côtes longues @seuil', sport:'running', bucket:'semi', filiere:'seuil',
    objectif:'Force-endurance au seuil en côte', dureeEstimeeMin:54, intensite:'eleve', rpe:7,
    pourQui:'Semi · Général', phase:'Général', tags:['seuil','semi','cotes'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'3\' côte @seuil', allure:'@seuil', dureeSec:180, reps:6, recup:{ zone:'Z1', label:'descente', dureeSec:150, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Descente en récup, garder la posture.' },

  { id:'semi-fartlek-1-1', nom:'Fartlek 1\'-1\'', sport:'running', bucket:'semi', filiere:'mixte',
    objectif:'Alternance continue semi↔marathon', dureeEstimeeMin:56, intensite:'eleve', rpe:7,
    pourQui:'Semi · Général', phase:'Général', tags:['mixte','semi','fartlek'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'1\' @21', allure:'@21', dureeSec:60, reps:16 },
      { phase:'corps', zone:'Z3', label:'1\' @SL1', allure:'@SL1', dureeSec:60, reps:16 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Continu, alternance sans pause.' },

  { id:'semi-fractionne-test', nom:'Fractionné test semi', sport:'running', bucket:'semi', filiere:'test',
    objectif:"Valider l'allure semi", dureeEstimeeMin:58, intensite:'eleve', rpe:8,
    pourQui:'Semi · Affûtage', phase:'Affûtage', tags:['test','semi','fractionne'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'3000 @21', allure:'@21', distanceM:3000, reps:3, recup:{ zone:'Z1', label:'jog', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup 1\'30 jog, allure stable.' },

  { id:'semi-test-1200-decompose', nom:'Test 1200 décomposé', sport:'running', bucket:'semi', filiere:'test',
    objectif:'Travail spécifique progressif au semi', dureeEstimeeMin:60, intensite:'eleve', rpe:8,
    pourQui:'Semi · Spé', phase:'Spé', tags:['test','semi','decompose'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z4', label:'1200 (1000@21+200@10k)', allure:'@21', distanceM:1200, reps:9, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Progressif, accélérer sur les 200 finaux.' },
]
