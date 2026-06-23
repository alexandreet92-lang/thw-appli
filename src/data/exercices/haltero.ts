import type { FamilleExercice } from './types'

export const HALTERO: FamilleExercice[] = [
  { id:'arrache', nom:'Arraché (snatch)', sport:'muscu', groupe:'haltero',
    muscles:['quadriceps','fessiers','trapeze-inf-moy','deltoide-lateral','erecteurs'], modes:[{mode:'explosivite',primaire:true}], equipement:['barre'], flags:['a-encadrer'], difficulteTechnique:10, deriveRecommande:'power-snatch',
    fiche:{ utilite:"Le mouvement le plus technique et explosif : barre du sol à bout de bras en un temps. Puissance et coordination globales. Sans coach, privilégie les dérivés (power/hang).",
      execution:["Barre proche, dos gainé, épaules au-dessus de la barre","Premier tirage contrôlé jusqu'aux genoux","Extension explosive (triple extension)","Tire-toi sous la barre, réception overhead en squat","Stabilise bras verrouillés"],
      erreurs:["Tirer aux bras avant la triple extension","Barre qui s'éloigne","Réception bras non verrouillés","Monter en charge avant la technique"] }, variantes:[
      { id:'power-snatch', nom:'Power snatch', difficulteTechnique:8, note:'Réception au-dessus du parallèle : plus sûr.' },
      { id:'hang-snatch', nom:'Hang snatch', difficulteTechnique:8 },
      { id:'muscle-snatch', nom:'Muscle snatch', difficulteTechnique:6 },
      { id:'snatch-blocks', nom:'Snatch depuis blocks', difficulteTechnique:8 } ] },

  { id:'epaule', nom:'Épaulé (clean)', sport:'muscu', groupe:'haltero',
    muscles:['quadriceps','fessiers','trapeze-inf-moy','erecteurs'], modes:[{mode:'explosivite',primaire:true}], equipement:['barre'], flags:['a-encadrer'], difficulteTechnique:9, deriveRecommande:'hang-power-clean',
    fiche:{ utilite:"Barre du sol aux épaules en un temps. Puissance jambes/hanches transférable aux sprints. Sans coach, privilégie les dérivés (power/hang).",
      execution:["Barre proche, dos gainé, épaules au-dessus de la barre","Premier tirage contrôlé jusqu'aux genoux","Triple extension explosive","Coudes vite, réception coudes hauts en squat","Remonte, stabilise"],
      erreurs:["Tirer aux bras tôt","Barre loin du corps","Réception coudes bas / dos rond","Charge avant maîtrise"] }, variantes:[
      { id:'power-clean', nom:'Power clean', difficulteTechnique:7, note:'Réception haute : dérivé conseillé.' },
      { id:'hang-clean', nom:'Hang clean', difficulteTechnique:7 },
      { id:'hang-power-clean', nom:'Hang power clean', difficulteTechnique:7 },
      { id:'clean-blocks', nom:'Clean depuis blocks', difficulteTechnique:7 },
      { id:'muscle-clean', nom:'Muscle clean', difficulteTechnique:5 } ] },

  { id:'jete', nom:'Jeté (jerk)', sport:'muscu', groupe:'haltero',
    muscles:['deltoide-anterieur','deltoide-lateral','triceps','quadriceps'], modes:[{mode:'explosivite',primaire:true}], equipement:['barre'], flags:['a-encadrer'], difficulteTechnique:8, deriveRecommande:'push-press',
    fiche:{ utilite:"Passer une barre des épaules au-dessus de la tête avec impulsion des jambes. Finalise le clean & jerk. Le push press est le dérivé d'entrée conseillé.",
      execution:["Barre en rack, gainé","Dip vertical court","Extension explosive des jambes","Passe sous la barre (fente ou flexion)","Stabilise bras verrouillés, pieds alignés"],
      erreurs:["Dip vers l'avant","Bras avant les jambes","Réception instable","Cambrure excessive"] }, variantes:[
      { id:'power-jerk', nom:'Power jerk', difficulteTechnique:6 },
      { id:'split-jerk', nom:'Split jerk', difficulteTechnique:8 },
      { id:'push-jerk', nom:'Push jerk', difficulteTechnique:6 } ] },

  { id:'derives-olympiques', nom:'Dérivés / tirages olympiques', sport:'muscu', groupe:'haltero',
    muscles:['erecteurs','trapeze-inf-moy','fessiers','quadriceps'], modes:[{mode:'explosivite',primaire:true}], equipement:['barre'], flags:[], difficulteTechnique:5, variantes:[
      { id:'clean-pull', nom:'Clean pull', difficulteTechnique:5 },
      { id:'snatch-pull', nom:'Snatch pull', difficulteTechnique:6 },
      { id:'high-pull', nom:'High pull', muscles:['trapeze-inf-moy','deltoide-lateral','erecteurs'], difficulteTechnique:5 },
      { id:'jump-shrug', nom:'Jump shrug', difficulteTechnique:4 },
      { id:'snatch-deadlift', nom:'Snatch deadlift', muscles:['erecteurs','fessiers','ischios'], difficulteTechnique:5 },
      { id:'clean-deadlift', nom:'Clean deadlift', muscles:['erecteurs','fessiers','ischios'], difficulteTechnique:4 } ] },

  { id:'complexes', nom:'Complexes & full-body', sport:'muscu', groupe:'haltero',
    muscles:['quadriceps','fessiers','deltoide-anterieur','triceps'], modes:[{mode:'explosivite',primaire:true},{mode:'strength-endurance',primaire:false}], equipement:['barre','halteres'], flags:['combo'], difficulteTechnique:5,
    fiche:{ utilite:"Combos « plusieurs exos en une rep » : full-body sous fatigue, transfert direct Hyrox. Le mouvement-clé (thruster) doit ressortir côté Legs ET Push via le filtre muscle.",
      execution:["Thruster : front squat complet + poussée overhead enchaînés","La poussée des jambes lance la charge","Bras tendus en fin","Enchaîne en fluidité, pas en deux temps","Reset la posture entre les reps"],
      erreurs:["Couper l'amplitude du squat","Pause qui casse le transfert","Cambrer en fin de poussée"] }, variantes:[
      { id:'thruster', nom:'Thruster', difficulteTechnique:5 },
      { id:'clean-and-jerk', nom:'Clean & jerk', flags:['a-encadrer'], difficulteTechnique:9 },
      { id:'clean-and-press', nom:'Clean & press', difficulteTechnique:6 },
      { id:'devil-press', nom:'Devil press', equipement:['halteres'], difficulteTechnique:5 },
      { id:'man-maker', nom:'Man maker', equipement:['halteres'], difficulteTechnique:5 },
      { id:'db-snatch', nom:'Dumbbell snatch', equipement:['halteres'], flags:['unilateral'], difficulteTechnique:4 },
      { id:'squat-clean-thruster', nom:'Squat clean thruster', difficulteTechnique:7 },
      { id:'complexe-barre', nom:'Complexe barre (DT, Bear)', difficulteTechnique:7, note:'Enchaînement scripté de mouvements barre.' } ] },

  { id:'turkish-get-up', nom:'Turkish get-up', sport:'muscu', groupe:'haltero',
    muscles:['obliques','deltoide-lateral','transverse'], modes:[{mode:'strength',primaire:true}], equipement:['kettlebell'], flags:['combo'], difficulteTechnique:7,
    fiche:{ utilite:"Patron complexe : stabilité d'épaule sous charge sur toute l'amplitude — santé d'épaule des nageurs, robustesse globale. Apprend le contrôle. Long à maîtriser.",
      execution:["Au sol, KB bras tendu, regard dessus","Roule sur le coude puis la main","Pont de hanche, ramène la jambe sous toi","Fente puis debout, bras vertical","Inverse étape par étape"],
      erreurs:["Vite/lourd avant maîtrise","Perdre l'alignement du bras","Lâcher le regard sur la KB"] }, variantes:[
      { id:'tgu-half', nom:'Half get-up', difficulteTechnique:4, note:'S\'arrête au pont de hanche : apprentissage.' },
      { id:'tgu-lunge', nom:'Get-up to lunge', difficulteTechnique:6 } ] },
]
