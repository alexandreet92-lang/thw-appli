import type { Seance } from './types'

export const SEANCES_MARATHON: Seance[] = [
  { id:'mara-classique-sortie-longue', nom:'Classique — Sortie longue', sport:'running', bucket:'marathon', filiere:'aerobie',
    objectif:'Endurance fondamentale', dureeEstimeeMin:90, intensite:'faible', rpe:4,
    pourQui:'Marathon · Général', phase:'Général', tags:['aerobie','marathon','sortie-longue'],
    blocs:[
      { phase:'corps', zone:'Z2', label:'SL 30 km @Z2', allure:'EF', distanceM:30000, dureeSec:9000 },
    ], conseil:'Allure facile et régulière, ravito si besoin.' },

  { id:'mara-alternances-1k-canova', nom:'Alternances 1k (Canova)', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:"Osciller autour de l'allure marathon", dureeEstimeeMin:90, intensite:'modere', rpe:6,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','alternances'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'1km @102%42', allure:'@42', distanceM:1000, reps:9 },
      { phase:'corps', zone:'Z3', label:'1km @95%42', allure:'@42', distanceM:1000, reps:9 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'18 km en alternance continue autour de @42.' },

  { id:'mara-specific-extensive-float', nom:'Specific extensive float (Canova)', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Volume @42 avec float actif', dureeEstimeeMin:95, intensite:'modere', rpe:6,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','float'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'5000 @42', allure:'@42', distanceM:5000, reps:4, recup:{ zone:'Z3', label:'1000 float @42 90%', distanceM:1000, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Float actif à 90%, jamais de marche.' },

  { id:'mara-longue-progressive-3temps', nom:'Longue progressive 3 temps (Canova)', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Monter progressivement vers @42', dureeEstimeeMin:120, intensite:'modere', rpe:6,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','progression'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'10000 @42 87%', allure:'@42', distanceM:10000 },
      { phase:'corps', zone:'Z3', label:'10000 @42 92%', allure:'@42', distanceM:10000 },
      { phase:'corps', zone:'Z3', label:'8000 @42 97%', allure:'@42', distanceM:8000 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Continu, accélération par tiers.' },

  { id:'mara-longue-a-blocs-42', nom:'Longue à blocs @42', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Spécifique marathon sur jambes fatiguées', dureeEstimeeMin:110, intensite:'modere', rpe:6,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','sortie-longue'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z2', label:'SL base 6 km', allure:'EF', distanceM:6000, dureeSec:2160 },
      { phase:'corps', zone:'Z3', label:'5000 @42', allure:'@42', distanceM:5000, reps:2, recup:{ zone:'Z3', label:'1 km steady', distanceM:1000, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'SL de base puis blocs @42.' },

  { id:'mara-specific-intensive-canova', nom:'Specific intensive (Canova)', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Travail @42 au-dessus avec float', dureeEstimeeMin:100, intensite:'modere', rpe:6,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','float'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'1000 @42 103%', allure:'@42', distanceM:1000, reps:8, recup:{ zone:'Z3', label:'1000 float @42', distanceM:1000, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Float actif entre chaque 1000.' },

  { id:'mara-blocs-chronos-42-10k', nom:'Blocs chronométrés 42/10k', sport:'running', bucket:'marathon', filiere:'mixte',
    objectif:'Alterner allure marathon et 10k', dureeEstimeeMin:85, intensite:'eleve', rpe:7,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['mixte','marathon','blocs'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'8\' @42', allure:'@42', dureeSec:480, reps:3, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'5\' @10k', allure:'@10k', dureeSec:300, reps:3, recup:{ zone:'Z1', dureeSec:300, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Enchaîner @42 puis @10k, r 5\' entre blocs.' },

  { id:'mara-echelle-fin-longue', nom:'Échelle fin de longue', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Accélérer en fin de sortie longue', dureeEstimeeMin:110, intensite:'eleve', rpe:7,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','echelle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'10000 @42', allure:'@42', distanceM:10000, recup:{ zone:'Z1', label:'1 km jog', distanceM:1000, actif:false } },
      { phase:'corps', zone:'Z4', label:'3000 @21', allure:'@21', distanceM:3000 },
      { phase:'corps', zone:'Z5', label:'2000 @10k', allure:'@10k', distanceM:2000 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Finir l\'échelle plus vite que l\'allure marathon.' },

  { id:'mara-sandwich-seuil-42', nom:'Sandwich seuil dans @42', sport:'running', bucket:'marathon', filiere:'seuil',
    objectif:'Insérer un bloc seuil entre deux blocs @42', dureeEstimeeMin:110, intensite:'eleve', rpe:7,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['seuil','marathon','sandwich'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'8000 @42', allure:'@42', distanceM:8000 },
      { phase:'corps', zone:'Z4', label:'4000 @seuil', allure:'@seuil', distanceM:4000 },
      { phase:'corps', zone:'Z3', label:'8000 @42', allure:'@42', distanceM:8000 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Le bloc seuil casse le rythme, revenir à @42 ensuite.' },

  { id:'mara-special-marathon', nom:'Spécial Marathon', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Reprise @42 rapide après une coupure jog', dureeEstimeeMin:105, intensite:'eleve', rpe:7,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','special'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'10000 @42', allure:'@42', distanceM:10000 },
      { phase:'corps', zone:'Z1', label:'1000 jog', allure:'jog', distanceM:1000 },
      { phase:'corps', zone:'Z3', label:'8000 @42 103%', allure:'@42', distanceM:8000 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Repartir vite après le jog, simuler la fin de course.' },

  { id:'mara-special-block-canova', nom:'Special block (Canova) — avancé', sport:'running', bucket:'marathon', filiere:'specifique',
    objectif:'Double séance spécifique sur jambes lourdes', dureeEstimeeMin:140, intensite:'eleve', rpe:8,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['specifique','marathon','special-block'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'AM 20000 @42', allure:'@42', distanceM:20000 },
      { phase:'corps', zone:'Z4', label:'PM 10000 @21', allure:'@21', distanceM:10000 },
      { phase:'corps', zone:'Z5', label:'PM 1000 @10k', allure:'@10k', distanceM:1000, reps:8, recup:{ zone:'Z1', label:'jog', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Séance avancée, jamais en fin de prépa.' },

  { id:'mara-surges-en-longue', nom:'Surges en longue', sport:'running', bucket:'marathon', filiere:'mixte',
    objectif:'Surges @42 dans une longue de 26 km', dureeEstimeeMin:120, intensite:'modere', rpe:6,
    pourQui:'Marathon · Général', phase:'Général', tags:['mixte','marathon','surges'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z2', label:'SL base 6 km', allure:'EF', distanceM:6000, dureeSec:2160 },
      { phase:'corps', zone:'Z3', label:'surge 1000 @42', allure:'@42', distanceM:1000, reps:10, recup:{ zone:'Z3', label:'1000 allure SL', distanceM:1000, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Surges régulières dans une longue à allure SL.' },

  { id:'mara-test-allure-marathon', nom:'Test allure marathon', sport:'running', bucket:'marathon', filiere:'test',
    objectif:"Valider l'allure marathon en continu", dureeEstimeeMin:130, intensite:'modere', rpe:6,
    pourQui:'Marathon · Spé', phase:'Spé', tags:['test','marathon','continu'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z3', label:'25000 @42', allure:'@42', distanceM:25000, reps:1 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Allure marathon stable, gestion de l\'effort.' },
]
