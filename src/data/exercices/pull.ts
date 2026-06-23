import type { FamilleExercice } from './types'

export const PULL: FamilleExercice[] = [
  { id:'tractions', nom:'Tractions', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','biceps','rhomboides','trapeze-inf-moy'], modes:[{mode:'strength',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:3,
    fiche:{ utilite:"Tirage vertical fermé, référence du haut du dos et du grip. Scalable (assistées → lestées → un bras). Équilibre les poussées et la posture du cycliste/triathlète.",
      execution:["Suspension active, omoplates engagées","Tire les coudes vers les hanches, menton vers la barre","Corps gainé, pas de balancier","Descends jusqu'à bras tendus","Amplitude complète"],
      erreurs:["Balancier involontaire","Demi-amplitude","Épaules qui montent","Descente lâchée"] }, variantes:[
      { id:'tr-supination', nom:'Supination (chin-up)', muscles:['grand-dorsal','biceps'], difficulteTechnique:2 },
      { id:'tr-neutre', nom:'Prise neutre', difficulteTechnique:2 },
      { id:'tr-large', nom:'Prise large', difficulteTechnique:4 },
      { id:'tr-lestees', nom:'Lestées', difficulteTechnique:5 },
      { id:'tr-un-bras', nom:'Un bras (assistée)', flags:['unilateral','a-encadrer'], difficulteTechnique:9 },
      { id:'tr-lsit', nom:'L-sit pull-up', muscles:['grand-dorsal','biceps','transverse'], difficulteTechnique:6 },
      { id:'tr-commando', nom:'Commando (prise mixte)', difficulteTechnique:4 },
      { id:'tr-archer', nom:'Archer', flags:['unilateral','a-encadrer'], difficulteTechnique:7 } ] },

  { id:'tirage-barre', nom:'Tirage horizontal (barre)', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','rhomboides','trapeze-inf-moy','deltoide-posterieur','biceps','erecteurs'], modes:[{mode:'strength',primaire:true}], equipement:['barre'], flags:[], difficulteTechnique:4, variantes:[
      { id:'row-yates', nom:'Yates row', muscles:['grand-dorsal','biceps','trapeze-inf-moy'], difficulteTechnique:3, note:'Buste plus haut, supination.' },
      { id:'row-large', nom:'Prise large', muscles:['rhomboides','trapeze-inf-moy','deltoide-posterieur'], difficulteTechnique:4 },
      { id:'row-serre', nom:'Prise serrée / supination', muscles:['grand-dorsal','biceps'], difficulteTechnique:4 },
      { id:'row-seal', nom:'Seal row', difficulteTechnique:2, note:'Allongé sur banc : retire la triche du bas du dos.' } ] },

  { id:'tirage-halteres', nom:'Tirage horizontal (haltères)', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','rhomboides','trapeze-inf-moy','biceps'], modes:[{mode:'strength',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:2, variantes:[
      { id:'rowh-un-bras', nom:'Un bras (appui banc)', flags:['unilateral'], difficulteTechnique:2 },
      { id:'rowh-bilateral', nom:'Bilatéral buste penché', difficulteTechnique:3 },
      { id:'rowh-neutre', nom:'Prise neutre', difficulteTechnique:2 },
      { id:'rowh-chest-supported', nom:'Chest-supported (banc incliné)', difficulteTechnique:2, note:'Buste calé : isole le dos.' },
      { id:'rowh-kroc', nom:'Kroc row', flags:['unilateral'], difficulteTechnique:3, note:'Unilatéral lourd, reps hautes.' } ] },

  { id:'tirage-kb', nom:'Tirage horizontal (kettlebell)', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','rhomboides','trapeze-inf-moy','biceps'], modes:[{mode:'strength',primaire:true}], equipement:['kettlebell'], flags:[], difficulteTechnique:3, variantes:[
      { id:'kb-row-un-bras', nom:'Un bras', flags:['unilateral'], difficulteTechnique:2 },
      { id:'kb-renegade', nom:'Renegade row', muscles:['grand-dorsal','obliques','transverse'], flags:['unilateral'], difficulteTechnique:5, note:'En planche : anti-rotation lourde.' },
      { id:'kb-gorilla', nom:'Gorilla row', difficulteTechnique:3 } ] },

  { id:'tirage-poids-de-corps', nom:'Tirage horizontal (poids de corps)', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','rhomboides','trapeze-inf-moy','biceps'], modes:[{mode:'strength-endurance',primaire:true},{mode:'strength',primaire:false}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Tirage horizontal au poids de corps, scalable par l'angle. Excellent pour le dos postural et la santé scapulaire sans charger la colonne. Idéal volume et débutants.",
      execution:["Corps gainé en ligne, talons au sol","Tire la poitrine vers la barre/les anneaux","Serre les omoplates en fin de course","Plus horizontal = plus dur","Descends en contrôle"],
      erreurs:["Bassin qui tombe","Tirer sans les omoplates","Amplitude partielle","Tête en avant"] }, variantes:[
      { id:'inv-row-barre', nom:'Inverted row barre', difficulteTechnique:2 },
      { id:'ring-row', nom:'Ring row', equipement:['poids-de-corps'], difficulteTechnique:3 },
      { id:'ring-row-archer', nom:'Archer ring row', flags:['unilateral'], difficulteTechnique:5 },
      { id:'inv-row-pieds-sureleves', nom:'Pieds surélevés', difficulteTechnique:4 },
      { id:'front-lever-row', nom:'Front lever row', flags:['a-encadrer'], difficulteTechnique:9 } ] },

  { id:'postural-scapulaire', nom:'Postural / scapulaire', sport:'muscu', groupe:'pull',
    muscles:['trapeze-inf-moy','deltoide-posterieur','rhomboides'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Contre la posture enroulée du cycliste/triathlète, équilibre le sur-développement dorsal des nageurs. Trap inf + delt post = cartouche anti-dos-rond. Travail léger, préventif.",
      execution:["À plat ventre ou banc incliné, bras pendants","Y : bras à 45°, pouces au plafond","T : bras à 90°, serre les omoplates","W : coudes pliés, rétraction basse","Initie par les omoplates"],
      erreurs:["Trop lourd → trapèze supérieur prend tout","Hausser les épaules","Cambrer"] }, variantes:[
      { id:'face-pull', nom:'Face pull élastique', equipement:['elastique'], difficulteTechnique:2 },
      { id:'band-pull-apart', nom:'Band pull-apart', equipement:['elastique'], difficulteTechnique:1 },
      { id:'scapular-pull-up', nom:'Scapular pull-up', equipement:['poids-de-corps'], difficulteTechnique:2 },
      { id:'reverse-fly', nom:'Reverse fly (oiseau)', muscles:['deltoide-posterieur','rhomboides'], difficulteTechnique:1 },
      { id:'prone-trap-raise', nom:'Prone trap raise (Y)', difficulteTechnique:1 },
      { id:'wall-slides', nom:'Wall slides', equipement:['poids-de-corps'], difficulteTechnique:1, note:'Mobilité + activation scapulaire.' } ] },

  { id:'tirage-explosif', nom:'Tirage explosif (med ball)', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','obliques','transverse','erecteurs'], modes:[{mode:'explosivite',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2, variantes:[
      { id:'mb-slam', nom:'Med ball slam (overhead)', difficulteTechnique:2 },
      { id:'mb-slam-rot', nom:'Rotational slam', muscles:['obliques','grand-dorsal'], difficulteTechnique:3 } ] },

  { id:'accessoires-biceps-trapezes', nom:'Biceps / trapèzes (isolation)', sport:'muscu', groupe:'pull',
    muscles:['biceps'], modes:[{mode:'strength',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:1, accessoire:true, variantes:[
      { id:'curl-barre', nom:'Curl barre', equipement:['barre'], difficulteTechnique:1 },
      { id:'curl-marteau', nom:'Curl marteau', difficulteTechnique:1 },
      { id:'curl-incline', nom:'Curl incliné', difficulteTechnique:1 },
      { id:'curl-concentration', nom:'Curl concentration', flags:['unilateral'], difficulteTechnique:1 },
      { id:'curl-elastique', nom:'Curl élastique', equipement:['elastique'], difficulteTechnique:1 },
      { id:'reverse-curl', nom:'Reverse curl', muscles:['biceps','grip'], difficulteTechnique:1 },
      { id:'shrugs', nom:'Shrugs', muscles:['trapeze-inf-moy'], equipement:['halteres','barre'], difficulteTechnique:1, note:'Haussements : trapèzes supérieurs.' } ] },
]
