import type { Exercice } from './types'

export const PUSH: Exercice[] = [
  { id:'landmine-press', nom:'Landmine press', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','triceps'], modes:[{mode:'strength',primaire:true}],
    equipement:['barre'], flags:['unilateral'], difficulteTechnique:3,
    fiche:{ utilite:"Poussée verticale sans la contrainte d'épaule du développé militaire — angle ami des épaules fragiles (nageurs). Engage le dentelé (santé scapulaire) et le tronc en anti-rotation.",
      execution:["Barre dans une main à hauteur d'épaule, pied opposé devant","Pousse vers le haut/avant en suivant l'arc","Gaine le tronc, ne tourne pas","Verrouille l'omoplate en haut","Contrôle la descente"],
      erreurs:["Cambrer pour pousser plus lourd","Laisser le tronc tourner","Épaule qui monte vers l'oreille"] } },

  { id:'push-press', nom:'Push press', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','deltoide-lateral','triceps'], modes:[{mode:'explosivite',primaire:true},{mode:'strength',primaire:false}],
    equipement:['barre'], flags:[], difficulteTechnique:5,
    fiche:{ utilite:"Apprend le transfert de force jambes→barre (triple extension) sur un patron simple. Dérivé sûr pour développer la puissance au-dessus de la tête sans la technique du jerk complet.",
      execution:["Barre en rack sur les épaules, gainé","Légère flexion de genoux (dip court)","Extension explosive jambes → la barre décolle","Finis bras tendus, tête qui traverse","Contrôle la descente en rack"],
      erreurs:["Dip trop profond et lent","Pousser avec les bras avant les jambes","Cambrer le bas du dos"] } },

  // BRIQUE SÈCHE
  { id:'developpe-couche', nom:'Développé couché', sport:'muscu', groupe:'push',
    muscles:['pectoraux','deltoide-anterieur','triceps'], modes:[{mode:'strength',primaire:true},{mode:'explosivite',primaire:false}],
    equipement:['barre','halteres'], flags:[], difficulteTechnique:2 },
]
