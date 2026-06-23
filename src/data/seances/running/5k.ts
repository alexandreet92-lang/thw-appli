import type { Seance } from './types'

export const SEANCES_5K: Seance[] = [
  { id:'5k-classique-1000', nom:'Classique 1000 @5k', sport:'running', bucket:'5k', filiere:'vma',
    objectif:"Progressif, prédit l'allure course", dureeEstimeeMin:50, intensite:'eleve', rpe:8,
    pourQui:'5k · séance clé', phase:'Spé', tags:['vma','5k','intervalle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1000 @5k', allure:'@5k', distanceM:1000, reps:7, recup:{ zone:'Z1', label:'marche', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Régulier, négatif sur les dernières si sensations.' },

  { id:'5k-echelle-multi-allures', nom:'Échelle multi-allures', sport:'running', bucket:'5k', filiere:'mixte',
    objectif:'Travailler tout le spectre VMA→3000', dureeEstimeeMin:58, intensite:'eleve', rpe:8,
    pourQui:'5k · Spé', phase:'Spé', tags:['mixte','5k','echelle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'300 @3000', allure:'@3000', distanceM:300, reps:4, recup:{ zone:'Z1', label:'marche', dureeSec:50, actif:false } },
      { phase:'corps', zone:'Z5', label:'1200 @5k', allure:'@5k', distanceM:1200, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'1000 @5k', allure:'@5k', distanceM:1000, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'800 @3000', allure:'@3000', distanceM:800, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z6', label:'600 @2000', allure:'@2000', distanceM:600, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'corps', zone:'Z5', label:'400 @VMA', allure:'@VMA', distanceM:400, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup décroissante entre blocs, garder la fraîcheur sur le rapide.' },

  { id:'5k-1000-decompose-glissant', nom:'1000 décomposé glissant', sport:'running', bucket:'5k', filiere:'vma',
    objectif:'Finir plus vite que le début sur chaque 1000', dureeEstimeeMin:55, intensite:'eleve', rpe:8,
    pourQui:'5k · Général', phase:'Général', tags:['vma','5k','intervalle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1000 (800@10k+200@5k)', allure:'@5k', distanceM:1000, reps:6, recup:{ zone:'Z1', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Glisser progressivement de @10k vers @5k.' },

  { id:'5k-pyramide-vma-descendante', nom:'Pyramide VMA descendante', sport:'running', bucket:'5k', filiere:'vma',
    objectif:'Soutenir la VMA en réduisant la distance', dureeEstimeeMin:56, intensite:'eleve', rpe:8,
    pourQui:'5k · Général', phase:'Général', tags:['vma','5k','pyramide'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1000 @5k', allure:'@5k', distanceM:1000, reps:3, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'600 @98%VMA', allure:'@98%VMA', distanceM:600, reps:3, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'400 @VMA', allure:'@VMA', distanceM:400, reps:3, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'3 blocs descendants, garder le contrôle.' },

  { id:'5k-lactate-shuttle', nom:'Lactate shuttle 5k', sport:'running', bucket:'5k', filiere:'vma',
    objectif:'Tolérance lactique avec relances courtes', dureeEstimeeMin:52, intensite:'eleve', rpe:8,
    pourQui:'5k · Général', phase:'Général', tags:['vma','5k','shuttle'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'300 @5k (×3 séries)', allure:'@5k', distanceM:300, reps:5, recup:{ zone:'Z3', label:'100 float @42', distanceM:100, actif:true } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'3 séries de 5×300, r 3\' entre séries.' },

  { id:'5k-over-under', nom:'Over-under 5k/seuil', sport:'running', bucket:'5k', filiere:'seuil',
    objectif:'Alterner au-dessus et en-dessous de la course', dureeEstimeeMin:54, intensite:'eleve', rpe:8,
    pourQui:'5k · Spé', phase:'Spé', tags:['seuil','5k','over-under'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'400 @5k', allure:'@5k', distanceM:400, reps:11 },
      { phase:'corps', zone:'Z4', label:'400 @seuil', allure:'@seuil', distanceM:400, reps:11 },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Enchaîner sans récup, 400 rapide / 400 seuil.' },

  { id:'5k-sandwich-vo2', nom:'Sandwich VO2/spé/VO2', sport:'running', bucket:'5k', filiere:'vma',
    objectif:'Encadrer le travail spécifique de VO2max', dureeEstimeeMin:56, intensite:'eleve', rpe:8,
    pourQui:'5k · Spé', phase:'Spé', tags:['vma','5k','sandwich'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'500 @VMA', allure:'@VMA', distanceM:500, reps:4, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z5', label:'2000 @5k', allure:'@5k', distanceM:2000, recup:{ zone:'Z1', dureeSec:180, actif:false } },
      { phase:'corps', zone:'Z5', label:'500 @VMA', allure:'@VMA', distanceM:500, reps:4, recup:{ zone:'Z1', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Bloc spé au milieu, à allure soutenue mais contrôlée.' },

  { id:'5k-cluster-vitesse', nom:'Cluster vitesse', sport:'running', bucket:'5k', filiere:'neuromusculaire',
    objectif:'Vitesse pure en clusters courts', dureeEstimeeMin:48, intensite:'maximum', rpe:9,
    pourQui:'5k · Base', phase:'Base', tags:['neuromusculaire','5k','cluster'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'200 @1500 (×3 séries)', allure:'@1500', distanceM:200, reps:5, recup:{ zone:'Z1', label:'100 trot', distanceM:100, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'3 séries de 5×200, vitesse maîtrisée.' },

  { id:'5k-broken-negatif', nom:'Broken 5k négatif', sport:'running', bucket:'5k', filiere:'specifique',
    objectif:'Reproduire la course en blocs plus rapides', dureeEstimeeMin:52, intensite:'eleve', rpe:8,
    pourQui:'5k · Spé', phase:'Spé', tags:['specifique','5k','broken'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1000 @5k (broken, blocs + rapides)', allure:'@5k', distanceM:1000, reps:7, recup:{ zone:'Z1', dureeSec:45, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup courte, chaque bloc un peu plus rapide.' },

  { id:'5k-fractionne-test', nom:'Fractionné test 5k', sport:'running', bucket:'5k', filiere:'test',
    objectif:"Valider l'allure 5k avant compétition", dureeEstimeeMin:50, intensite:'eleve', rpe:8,
    pourQui:'5k · Affûtage', phase:'Affûtage', tags:['test','5k','fractionne'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'1600 @5k', allure:'@5k', distanceM:1600, recup:{ zone:'Z1', dureeSec:150, actif:false } },
      { phase:'corps', zone:'Z5', label:'1200 @5k', allure:'@5k', distanceM:1200, recup:{ zone:'Z1', dureeSec:150, actif:false } },
      { phase:'corps', zone:'Z5', label:'800 @5k', allure:'@5k', distanceM:800, recup:{ zone:'Z1', dureeSec:150, actif:false } },
      { phase:'corps', zone:'Z5', label:'400 @5k', allure:'@5k', distanceM:400, recup:{ zone:'Z1', dureeSec:150, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup 2\'30 entre blocs, allure de course stable.' },
]
