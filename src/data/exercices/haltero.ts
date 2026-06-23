import type { Exercice } from './types'

export const HALTERO: Exercice[] = [
  { id:'hang-power-clean', nom:'Hang power clean', sport:'muscu', groupe:'haltero',
    muscles:['quadriceps','fessiers','trapeze-inf-moy'], modes:[{mode:'explosivite',primaire:true}],
    equipement:['barre'], flags:['a-encadrer'], difficulteTechnique:7,
    fiche:{ utilite:"Dérivé olympique sûr (vs clean complet du sol) : développe la puissance et la triple extension transférables aux sprints et départs. À réserver à qui maîtrise déjà la charnière.",
      execution:["Barre au-dessus des genoux, dos gainé","Extension explosive hanches/genoux/chevilles","Tire les coudes haut, la barre reste proche","Réception coudes hauts, quart de squat","Repose contrôlé, reset chaque rep"],
      erreurs:["Tirer avec les bras avant la triple extension","Barre qui s'éloigne du corps","Réception bras tendus / dos rond"] } },

  { id:'thruster', nom:'Thruster', sport:'muscu', groupe:'haltero',
    muscles:['quadriceps','fessiers','deltoide-anterieur','triceps'], modes:[{mode:'explosivite',primaire:true},{mode:'strength-endurance',primaire:false}],
    equipement:['barre','halteres'], flags:['combo'], difficulteTechnique:5,
    fiche:{ utilite:"Combo front squat + développé : engrenage full-body sous fatigue, transfert direct Hyrox. Doit ressortir côté Legs ET Push via le filtre muscle — d'où l'intérêt du filet par muscle.",
      execution:["Barre en rack, descente front squat complète","Remontée explosive","La poussée des jambes lance la barre au-dessus de la tête","Finis bras tendus","Enchaîne en fluidité, pas en deux temps"],
      erreurs:["Couper l'amplitude du squat","Marquer une pause qui casse le transfert","Cambrer en fin de poussée"] } },

  { id:'turkish-get-up', nom:'Turkish get-up', sport:'muscu', groupe:'haltero',
    muscles:['obliques','deltoide-lateral','transverse'], modes:[{mode:'strength',primaire:true}],
    equipement:['kettlebell'], flags:['combo'], difficulteTechnique:7,
    fiche:{ utilite:"Patron complexe : stabilité d'épaule sous charge à travers toute l'amplitude — santé d'épaule des nageurs, robustesse globale. Apprend le contrôle, pas la performance brute. Long à maîtriser.",
      execution:["Au sol, KB poussée bras tendu, regard dessus","Roule sur le coude puis la main","Pont de hanche, ramène la jambe sous toi","Fente puis debout, bras toujours vertical","Inverse étape par étape pour redescendre"],
      erreurs:["Vouloir aller vite/lourd avant la maîtrise","Perdre l'alignement du bras","Lâcher le regard sur la KB"] } },
]
