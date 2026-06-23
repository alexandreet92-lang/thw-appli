import type { Exercice } from './types'

export const PULL: Exercice[] = [
  { id:'prone-ytw', nom:'Prone Y-T-W', sport:'muscu', groupe:'pull',
    muscles:['trapeze-inf-moy','deltoide-posterieur','rhomboides'], modes:[{mode:'strength-endurance',primaire:true}],
    equipement:['halteres'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Contre la posture enroulée du cycliste/triathlète et équilibre le sur-développement dorsal des nageurs. Trap inf + delt post = cartouche anti-dos-rond.",
      execution:["À plat ventre ou banc incliné, bras pendants","Y : bras à 45°, pouces vers le plafond","T : bras à 90°, serre les omoplates","W : coudes pliés, rétraction basse","Initie par les omoplates, pas par les mains"],
      erreurs:["Trop lourd → le trapèze supérieur prend tout","Hausser les épaules","Cambrer le bas du dos"] } },

  // BRIQUES SÈCHES
  { id:'tractions', nom:'Tractions', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','biceps','rhomboides'], modes:[{mode:'strength',primaire:true}],
    equipement:['poids-de-corps'], flags:[], difficulteTechnique:3 },

  { id:'pendlay-row', nom:'Pendlay row', sport:'muscu', groupe:'pull',
    muscles:['grand-dorsal','rhomboides','trapeze-inf-moy'], modes:[{mode:'strength',primaire:true}],
    equipement:['barre'], flags:[], difficulteTechnique:4 },
]
