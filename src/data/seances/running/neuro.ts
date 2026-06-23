import type { Seance } from './types'

export const SEANCES_NEURO: Seance[] = [
  { id:'neuro-strides-classiques', nom:'Strides classiques', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Économie de course', dureeEstimeeMin:35, intensite:'modere', rpe:7,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','strides'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'100 m @95%', allure:'@95%', distanceM:100, reps:8, recup:{ zone:'Z1', label:'marche', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Relâché et fluide, vitesse contrôlée.' },

  { id:'neuro-build-ups', nom:'Build-ups', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Accélérations progressives', dureeEstimeeMin:35, intensite:'modere', rpe:7,
    pourQui:'Toutes distances · Base', phase:'Base', tags:['neuromusculaire','neuro','build-ups'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'100 m progressifs', allure:'@95%', distanceM:100, reps:7, recup:{ zone:'Z1', label:'récup complète', dureeSec:90, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Monter en vitesse sans à-coup, finir vite.' },

  { id:'neuro-strides-herbe', nom:'Strides sur herbe', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Économie à faible impact', dureeEstimeeMin:35, intensite:'modere', rpe:7,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','herbe'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'100 m @95% herbe', allure:'@95%', distanceM:100, reps:10, recup:{ zone:'Z1', label:'marche', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Surface souple, ressenti d\'appui.' },

  { id:'neuro-sprints-courts-max', nom:'Sprints courts max', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Vitesse maximale alactique', dureeEstimeeMin:35, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Base', phase:'Base', tags:['neuromusculaire','neuro','sprint'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'40 m @max', allure:'@max', distanceM:40, reps:8, recup:{ zone:'Z1', label:'récup complète', dureeSec:150, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Vitesse maximale, récup complète.' },

  { id:'neuro-flying-sprints', nom:'Flying sprints', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Vitesse pure lancée', dureeEstimeeMin:35, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','flying'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'30 m lancés @max', allure:'@max', distanceM:30, reps:6, recup:{ zone:'Z1', label:'récup complète', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Lancer avant la zone chronométrée, vitesse max.' },

  { id:'neuro-cluster-vitesse', nom:'Cluster vitesse', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Vitesse en clusters max', dureeEstimeeMin:35, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','cluster'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'40 m @max (×3 séries)', allure:'@max', distanceM:40, reps:3, recup:{ zone:'Z1', label:'marche', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'3 séries de 3×40 m, r 4\' entre séries.' },

  { id:'neuro-sprints-resistes', nom:'Sprints résistés', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Puissance avec résistance', dureeEstimeeMin:35, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','resiste'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'25 m résistés @max', allure:'@max', distanceM:25, reps:7, recup:{ zone:'Z1', label:'récup complète', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Matériel (traîneau/élastique), à encadrer.' },

  { id:'neuro-hill-sprints', nom:'Hill sprints courts (alactiques)', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Puissance et recrutement à faible impact', dureeEstimeeMin:35, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · jambes fraîches', phase:'Base', tags:['neuromusculaire','cotes','sprint'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'8-12" côte @max', allure:'@max', dureeSec:10, reps:8, recup:{ zone:'Z1', label:'descente marche', dureeSec:150, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Couper dès que la vitesse chute.' },

  { id:'neuro-cotes-puissance-moyennes', nom:'Côtes puissance moyennes', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Puissance en côte à VMA', dureeEstimeeMin:38, intensite:'eleve', rpe:8,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','cotes'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z5', label:'40" côte @VMA', allure:'@VMA', dureeSec:40, reps:8, recup:{ zone:'Z1', label:'descente', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Descente en récup, garder la fréquence.' },

  { id:'neuro-bounding-cote', nom:'Bounding en côte', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Force explosive et amplitude', dureeEstimeeMin:35, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','bounding'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'35 m bounding', allure:'@max', distanceM:35, reps:5, recup:{ zone:'Z1', label:'récup complète', dureeSec:180, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Amplitude maximale à chaque bond.' },

  { id:'neuro-drills-techniques', nom:'Drills techniques', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Technique de foulée', dureeEstimeeMin:32, intensite:'modere', rpe:5,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','drills'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'A-skip/B-skip/montées genoux/talons-fesses', allure:'@95%', distanceM:30, reps:3, recup:{ zone:'Z1', label:'marche', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Qualité technique avant tout.' },

  { id:'neuro-pliometrie-reactive', nom:'Pliométrie réactive', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Raideur et réactivité', dureeEstimeeMin:34, intensite:'maximum', rpe:8,
    pourQui:'Toutes distances · Base', phase:'Base', tags:['neuromusculaire','neuro','pliometrie'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'15 contacts pogos/ankle hops/bonds', allure:'@max', dureeSec:20, reps:4, recup:{ zone:'Z1', label:'récup complète', dureeSec:120, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Temps de contact minimal au sol.' },

  { id:'neuro-combo-economie', nom:'Combo économie', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Drills, pliométrie et strides', dureeEstimeeMin:38, intensite:'maximum', rpe:8,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','combo'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'drills 30 m', allure:'@95%', distanceM:30, reps:3, recup:{ zone:'Z1', label:'marche', dureeSec:60, actif:false } },
      { phase:'corps', zone:'Z7', label:'pogos 10 contacts', allure:'@max', dureeSec:15, recup:{ zone:'Z1', label:'récup', dureeSec:90, actif:false } },
      { phase:'corps', zone:'Z6', label:'strides 80 m', allure:'@95%', distanceM:80, reps:5, recup:{ zone:'Z1', label:'marche', dureeSec:60, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Enchaînement complet pour l\'économie.' },

  { id:'neuro-100-100', nom:'100-100 (format foot)', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Endurance de vitesse à récup courte', dureeEstimeeMin:40, intensite:'eleve', rpe:8,
    pourQui:'Toutes distances · Général', phase:'Général', tags:['neuromusculaire','neuro','speed-endurance'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'100 m @rapide', allure:'@95%', distanceM:100, reps:16, recup:{ zone:'Z1', label:'récup courte', dureeSec:20, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Récup courte, rythme soutenu et régulier.' },

  { id:'neuro-speed-endurance-longue', nom:'Speed-endurance longue', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Endurance de vitesse @1500', dureeEstimeeMin:40, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Spé', phase:'Spé', tags:['neuromusculaire','neuro','speed-endurance'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z6', label:'175 m @1500', allure:'@1500', distanceM:175, reps:8, recup:{ zone:'Z1', label:'récup courte', dureeSec:50, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'Dur, à doser.' },

  { id:'neuro-rsa', nom:'RSA — répétition de sprints', sport:'running', bucket:'neuro', filiere:'neuromusculaire',
    distanceCible:['5k','10k','semi','marathon'], objectif:'Capacité à répéter des sprints', dureeEstimeeMin:38, intensite:'maximum', rpe:9,
    pourQui:'Toutes distances · Spé', phase:'Spé', tags:['neuromusculaire','neuro','rsa'],
    blocs:[
      { phase:'echauffement', zone:'Z2', label:'Échauffement + gammes', allure:'EF', dureeSec:1200 },
      { phase:'corps', zone:'Z7', label:'35 m @max (×2 séries)', allure:'@max', distanceM:35, reps:7, recup:{ zone:'Z1', label:'récup courte', dureeSec:25, actif:false } },
      { phase:'retour-calme', zone:'Z2', label:'Retour au calme', allure:'EF', dureeSec:600 },
    ], conseil:'2 séries de 7×35 m, r 3\' entre séries.' },
]
