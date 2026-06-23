import type { Exercice } from './types'

export const CORE: Exercice[] = [
  { id:'pallof-press', nom:'Pallof press', sport:'muscu', groupe:'core',
    muscles:['obliques','transverse'], modes:[{mode:'strength-endurance',primaire:true}],
    equipement:['elastique'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Apprend au tronc à RÉSISTER à la rotation au lieu de la produire — base de l'économie de course et de la transmission jambes↔bras en natation. Pour tout coureur qui « part en torsion » en fin de course.",
      execution:["Profil à l'ancrage, élastique à hauteur de poitrine","Bras tendus devant, l'élastique veut te faire tourner","Résiste — fessiers serrés, côtes basses","Reviens lentement à la poitrine","Respiration continue, jamais en apnée"],
      erreurs:["Se pencher pour tricher le levier","Cambrer","Retenir sa respiration"] } },

  { id:'copenhagen-plank', nom:'Copenhagen plank', sport:'muscu', groupe:'core',
    muscles:['adducteurs','obliques'], modes:[{mode:'strength-endurance',primaire:true}],
    equipement:['poids-de-corps'], flags:['unilateral'], difficulteTechnique:4,
    fiche:{ utilite:"Un des rares exos qui chargent réellement les adducteurs en excentrique/iso. Prévention n°1 des pubalgies et tendinopathies d'adducteurs — fréquent chez coureurs et cyclistes.",
      execution:["Appui sur l'avant-bras, jambe haute posée sur un banc","Corps en ligne, hanche haute","Jambe basse décollée ou en soutien selon niveau","Ne laisse pas le bassin tomber","Progresse genou → cheville sur le banc"],
      erreurs:["Bassin qui s'affaisse","Durée excessive d'emblée","Passer cheville trop vite"] } },

  { id:'suitcase-carry', nom:'Suitcase carry', sport:'muscu', groupe:'core',
    muscles:['obliques','erecteurs','grip'], modes:[{mode:'strength-endurance',primaire:true}],
    equipement:['kettlebell','halteres'], flags:['unilateral'], difficulteTechnique:1,
    fiche:{ utilite:"Porté asymétrique : le tronc lutte pour rester droit. Transfert direct vers la stabilité du bassin en course (le « drop » de hanche en appui unipodal). Zéro technique, scalable. Idéal débutants.",
      execution:["Charge dans une main, épaules à l'horizontale","Marche en restant parfaitement vertical","Côtes basses, regard loin","Grip ferme, épaule basse côté charge","Distance fixe, pas de course contre le temps"],
      erreurs:["S'incliner du côté opposé pour compenser","Hausser l'épaule","Trop lourd → perte de posture"] } },
]
