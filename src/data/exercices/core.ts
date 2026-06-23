import type { FamilleExercice } from './types'

export const CORE: FamilleExercice[] = [
  { id:'anti-rotation', nom:'Anti-rotation', sport:'muscu', groupe:'core',
    muscles:['obliques','transverse'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['elastique'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Apprend au tronc à RÉSISTER à la rotation — base de l'économie de course et de la transmission jambes↔bras en natation. Pour qui part en torsion en fin de course.",
      execution:["Profil à l'ancrage, élastique à hauteur de poitrine","Bras tendus devant","Résiste — fessiers serrés, côtes basses","Reviens lentement","Respiration continue"],
      erreurs:["Se pencher pour tricher le levier","Cambrer","Apnée"] }, variantes:[
      { id:'pallof-press', nom:'Pallof press', difficulteTechnique:2 },
      { id:'pallof-iso', nom:'Pallof iso hold', difficulteTechnique:2 },
      { id:'bird-dog', nom:'Bird dog', muscles:['obliques','erecteurs','fessiers'], equipement:['poids-de-corps'], difficulteTechnique:1 },
      { id:'dead-bug-decale', nom:'Dead bug à charge décalée', equipement:['halteres'], difficulteTechnique:3 },
      { id:'landmine-rotation', nom:'Landmine anti-rotation press', equipement:['barre'], difficulteTechnique:3 } ] },

  { id:'anti-extension', nom:'Anti-extension', sport:'muscu', groupe:'core',
    muscles:['transverse','obliques'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Résistance à l'extension lombaire — gainage fonctionnel transférable à la course (anti-affaissement). Base avant les versions dynamiques (ab wheel).",
      execution:["Avant-bras sous les épaules, corps en ligne","Rétroversion du bassin, côtes basses","Serre fessiers et abdos","Pas d'affaissement lombaire","Tension > durée"],
      erreurs:["Bassin qui plonge","Fesses en l'air","Apnée","Tenir longtemps en position molle"] }, variantes:[
      { id:'planche', nom:'Planche (avant-bras)', difficulteTechnique:1 },
      { id:'planche-lestee', nom:'Planche lestée', difficulteTechnique:3 },
      { id:'rkc-plank', nom:'RKC plank', difficulteTechnique:3, note:'Tension maximale volontaire.' },
      { id:'ab-wheel', nom:'Ab wheel (roue)', flags:['a-encadrer'], difficulteTechnique:6 },
      { id:'body-saw', nom:'Body saw', difficulteTechnique:4 },
      { id:'dead-bug', nom:'Dead bug', difficulteTechnique:1 },
      { id:'hollow-hold', nom:'Hollow hold', difficulteTechnique:3 },
      { id:'reverse-plank', nom:'Reverse plank', muscles:['transverse','fessiers','erecteurs'], difficulteTechnique:2 },
      { id:'stir-the-pot', nom:'Stir-the-pot (swiss ball)', difficulteTechnique:5 } ] },

  { id:'anti-flexion-laterale', nom:'Anti-flexion latérale', sport:'muscu', groupe:'core',
    muscles:['obliques','transverse'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Résistance à la flexion latérale (carré des lombes, obliques) — stabilise le bassin en appui unipodal (course). Complément direct des carries.",
      execution:["Appui avant-bras, corps en ligne de profil","Hanche haute, ne pas s'affaisser","Pieds empilés ou décalés","Côtes basses, gainage continu","Progression : lestée / jambe haute"],
      erreurs:["Bassin qui descend","Rotation du tronc","Épaule dans l'oreille","Durée au détriment de l'alignement"] }, variantes:[
      { id:'side-plank', nom:'Planche latérale', flags:['unilateral'], difficulteTechnique:2 },
      { id:'side-plank-lestee', nom:'Side plank lestée', flags:['unilateral'], difficulteTechnique:4 },
      { id:'side-bend-kb', nom:'Side bend KB', equipement:['kettlebell'], flags:['unilateral'], difficulteTechnique:2 } ] },

  { id:'copenhagen-plank', nom:'Copenhagen plank', sport:'muscu', groupe:'core',
    muscles:['adducteurs','obliques'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['poids-de-corps'], flags:['unilateral'], difficulteTechnique:4,
    fiche:{ utilite:"Un des rares exos qui chargent réellement les adducteurs en excentrique/iso. Prévention n°1 des pubalgies et tendinopathies d'adducteurs — coureurs et cyclistes.",
      execution:["Avant-bras au sol, jambe haute posée sur un banc","Corps en ligne, hanche haute","Jambe basse décollée ou en soutien selon niveau","Le bassin ne tombe pas","Progresse genou → cheville"],
      erreurs:["Bassin qui s'affaisse","Durée excessive d'emblée","Passer cheville trop vite"] }, variantes:[
      { id:'copenhagen-genou', nom:'Version genou', difficulteTechnique:2, note:'Régression principale.' },
      { id:'copenhagen-dynamique', nom:'Version dynamique', difficulteTechnique:6 } ] },

  { id:'carries', nom:'Portés / carries', sport:'muscu', groupe:'core',
    muscles:['obliques','erecteurs','grip','transverse'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['kettlebell','halteres'], flags:[], difficulteTechnique:1,
    fiche:{ utilite:"Portés chargés : gainage anti-mouvement réel sous charge, grip, posture. Transfert direct vers la stabilité du bassin en course. Zéro technique, scalable à l'infini.",
      execution:["Charge(s) saisie(s), épaules basses et arrière","Marche vertical, côtes basses","Pas réguliers, regard loin","Grip ferme, ne pas s'incliner","Distance ou temps fixés"],
      erreurs:["S'incliner (suitcase)","Hausser les épaules","Petits pas précipités","Charge qui casse la posture"] }, variantes:[
      { id:'farmer-carry', nom:'Farmer carry', difficulteTechnique:1 },
      { id:'suitcase-carry', nom:'Suitcase carry', flags:['unilateral'], difficulteTechnique:1 },
      { id:'zercher-carry', nom:'Zercher carry', muscles:['erecteurs','transverse','grip'], equipement:['barre'], difficulteTechnique:3 },
      { id:'front-rack-carry', nom:'Front rack carry', equipement:['kettlebell'], difficulteTechnique:2 },
      { id:'overhead-carry', nom:'Overhead carry', equipement:['kettlebell'], difficulteTechnique:4 },
      { id:'waiter-walk', nom:'Waiter walk', flags:['unilateral'], equipement:['kettlebell'], difficulteTechnique:4, note:'Un bras overhead : stabilité d\'épaule.' } ] },

  { id:'flexion-dynamique', nom:'Flexion dynamique du tronc', sport:'muscu', groupe:'core',
    muscles:['transverse','obliques'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2, variantes:[
      { id:'hanging-leg-raise', nom:'Hanging leg raise', difficulteTechnique:5 },
      { id:'toes-to-bar', nom:'Toes-to-bar', flags:['a-encadrer'], difficulteTechnique:6 },
      { id:'hanging-knee-raise', nom:'Hanging knee raise', difficulteTechnique:3 },
      { id:'v-up', nom:'V-up', difficulteTechnique:3 },
      { id:'sit-up', nom:'Sit-up', difficulteTechnique:1 },
      { id:'russian-twist', nom:'Russian twist', muscles:['obliques'], difficulteTechnique:2 },
      { id:'releve-jambes', nom:'Relevé de jambes au sol', difficulteTechnique:2 } ] },

  { id:'extenseurs-lombaires', nom:'Extenseurs lombaires / posture', sport:'muscu', groupe:'core',
    muscles:['erecteurs','fessiers'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2, variantes:[
      { id:'back-extension', nom:'Back extension (banc 45° / GHD)', difficulteTechnique:2 },
      { id:'superman', nom:'Superman', difficulteTechnique:1 },
      { id:'reverse-hyper', nom:'Reverse hyper (banc/box)', difficulteTechnique:3 } ] },
]
