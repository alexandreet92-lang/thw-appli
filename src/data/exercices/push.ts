import type { FamilleExercice } from './types'

export const PUSH: FamilleExercice[] = [
  { id:'developpe-couche-barre', nom:'Développé couché (barre)', sport:'muscu', groupe:'push',
    muscles:['pectoraux','deltoide-anterieur','triceps'], modes:[{mode:'strength',primaire:true},{mode:'explosivite',primaire:false}],
    equipement:['barre'], flags:[], difficulteTechnique:2, variantes:[
      { id:'dc-incline-barre', nom:'Incliné', difficulteTechnique:2, note:'Cible le haut des pectoraux.' },
      { id:'dc-decline-barre', nom:'Décliné', difficulteTechnique:2 },
      { id:'dc-prise-serree', nom:'Prise serrée', muscles:['triceps','pectoraux','deltoide-anterieur'], difficulteTechnique:2 },
      { id:'dc-floor-barre', nom:'Floor press', muscles:['triceps','pectoraux','deltoide-anterieur'], difficulteTechnique:2, note:'Amplitude réduite, épaule protégée.' },
      { id:'dc-spoto', nom:'Spoto press', difficulteTechnique:3, note:'Pause suspendue : tue le rebond.' },
      { id:'dc-pin', nom:'Pin press', difficulteTechnique:3, note:'Départ depuis pins, concentrique pur.' },
      { id:'dc-larsen', nom:'Larsen press', difficulteTechnique:3, note:'Jambes tendues, pas de leg drive.' },
      { id:'dc-board', nom:'Board press', difficulteTechnique:2 } ] },

  { id:'developpe-couche-halteres', nom:'Développé couché (haltères)', sport:'muscu', groupe:'push',
    muscles:['pectoraux','deltoide-anterieur','triceps'], modes:[{mode:'strength',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:2, variantes:[
      { id:'dch-incline', nom:'Incliné', difficulteTechnique:2 },
      { id:'dch-decline', nom:'Décliné', difficulteTechnique:2 },
      { id:'dch-neutre', nom:'Prise neutre (marteau)', difficulteTechnique:2, note:'Plus douce pour l\'épaule.' },
      { id:'dch-unilateral', nom:'Unilatéral', flags:['unilateral'], difficulteTechnique:3 },
      { id:'dch-alterne', nom:'Alterné', difficulteTechnique:3 },
      { id:'dch-squeeze', nom:'Squeeze press', difficulteTechnique:2 },
      { id:'dch-floor', nom:'Floor press haltères', muscles:['triceps','pectoraux','deltoide-anterieur'], difficulteTechnique:2 } ] },

  { id:'pompes', nom:'Pompes', sport:'muscu', groupe:'push',
    muscles:['pectoraux','deltoide-anterieur','triceps','transverse'], modes:[{mode:'strength-endurance',primaire:true},{mode:'strength',primaire:false}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:1,
    fiche:{ utilite:"Poussée horizontale fermée avec gainage intégré, scalable du débutant (inclinées) au très avancé (un bras). Densité et endurance de poussée, transfert Hyrox.",
      execution:["Corps gainé en planche, mains sous les épaules","Coudes ~45°, pas écartés à 90°","Descends poitrine près du sol, corps en ligne","Pousse en gardant les côtes basses","Amplitude complète, le bassin ne plonge pas"],
      erreurs:["Bassin qui s'affaisse ou pointe en l'air","Coudes en T","Amplitude partielle","Tête qui pique vers le sol"] }, variantes:[
      { id:'pompes-lestees', nom:'Lestées', modes:[{mode:'strength',primaire:true}], difficulteTechnique:3 },
      { id:'pompes-declinees', nom:'Déclinées (pieds surélevés)', difficulteTechnique:2 },
      { id:'pompes-inclinees', nom:'Inclinées (mains surélevées)', difficulteTechnique:1, note:'Régression principale.' },
      { id:'pompes-diamant', nom:'Diamant', muscles:['triceps','pectoraux'], difficulteTechnique:2 },
      { id:'pompes-large', nom:'Prise large', difficulteTechnique:1 },
      { id:'pompes-archer', nom:'Archer', flags:['unilateral'], difficulteTechnique:6 },
      { id:'pompes-un-bras', nom:'À un bras', flags:['unilateral','a-encadrer'], difficulteTechnique:9 },
      { id:'pompes-pseudo-planche', nom:'Pseudo-planche', difficulteTechnique:7, note:'Gros stress deltoïde antérieur.' },
      { id:'pompes-deficit', nom:'Déficit (sur barres)', difficulteTechnique:3 },
      { id:'pompes-anneaux', nom:'Aux anneaux', flags:['a-encadrer'], difficulteTechnique:6 },
      { id:'pompes-spiderman', nom:'Spiderman', difficulteTechnique:4 },
      { id:'pompes-scapulaires', nom:'Scapulaires', muscles:['deltoide-anterieur','rhomboides'], difficulteTechnique:1, note:'Santé scapulaire.' },
      { id:'pompes-claquees', nom:'Claquées / pliométriques', modes:[{mode:'explosivite',primaire:true}], difficulteTechnique:5 } ] },

  { id:'dips', nom:'Dips', sport:'muscu', groupe:'push',
    muscles:['pectoraux','triceps','deltoide-anterieur'], modes:[{mode:'strength',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:4,
    fiche:{ utilite:"Poussée verticale fermée pecs/triceps, fort potentiel de surcharge. Buste penché = pecs, vertical = triceps (réglage, pas deux exos). Surveiller l'épaule en bas.",
      execution:["Bras tendus, épaules basses","Descends jusqu'à ~90° au coude","Buste penché (pecs) ou vertical (triceps)","Remonte sans verrouillage brutal","Pas de rebond en bas"],
      erreurs:["Descendre trop bas","Hausser les épaules","Se balancer","Lester avant maîtrise"] }, variantes:[
      { id:'dips-lestes', nom:'Lestés', difficulteTechnique:5 },
      { id:'dips-anneaux', nom:'Aux anneaux', flags:['a-encadrer'], difficulteTechnique:7 },
      { id:'dips-banc', nom:'Sur banc', muscles:['triceps'], difficulteTechnique:2, note:'Régression.' } ] },

  { id:'developpe-landmine', nom:'Développé landmine', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','triceps'], modes:[{mode:'strength',primaire:true}], equipement:['barre'], flags:['unilateral'], difficulteTechnique:3,
    fiche:{ utilite:"Poussée verticale sans la contrainte d'épaule du militaire — ami des épaules fragiles (nageurs). Engage le dentelé et le tronc en anti-rotation.",
      execution:["Barre dans une main à hauteur d'épaule, pied opposé devant","Pousse en suivant l'arc","Gaine le tronc, ne tourne pas","Verrouille l'omoplate en haut","Contrôle la descente"],
      erreurs:["Cambrer","Laisser le tronc tourner","Épaule vers l'oreille"] }, variantes:[
      { id:'landmine-press-out', nom:'Bilatéral (press-out)', flags:[], difficulteTechnique:2 },
      { id:'landmine-half-kneeling', nom:'Half-kneeling', difficulteTechnique:3 },
      { id:'landmine-alterne', nom:'Alterné', difficulteTechnique:3 } ] },

  { id:'developpe-militaire-barre', nom:'Développé militaire (barre)', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','deltoide-lateral','triceps'], modes:[{mode:'strength',primaire:true}], equipement:['barre'], flags:[], difficulteTechnique:4, variantes:[
      { id:'dm-assis', nom:'Assis', difficulteTechnique:3 },
      { id:'dm-z-press', nom:'Z press', muscles:['deltoide-anterieur','deltoide-lateral','triceps','transverse'], difficulteTechnique:5, note:'Assis au sol jambes tendues.' },
      { id:'dm-nuque', nom:'Derrière la nuque', flags:['a-encadrer'], difficulteTechnique:6 } ] },

  { id:'push-press', nom:'Push press', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','deltoide-lateral','triceps'], modes:[{mode:'explosivite',primaire:true},{mode:'strength',primaire:false}], equipement:['barre'], flags:['a-encadrer'], difficulteTechnique:5,
    fiche:{ utilite:"Transfert jambes→barre (triple extension) sur un patron simple. Surcharge la poussée overhead, dérivé sûr du jerk. Pont vers l'haltérophilie.",
      execution:["Barre en rack, gainé","Dip court et vertical","Extension explosive des jambes","Bras tendus, tête traverse","Contrôle la descente"],
      erreurs:["Dip trop profond/lent","Bras avant les jambes","Dip vers l'avant","Cambrer"] }, variantes:[
      { id:'push-press-halteres', nom:'Haltères', equipement:['halteres'], difficulteTechnique:4 },
      { id:'push-press-kb', nom:'Kettlebell', equipement:['kettlebell'], difficulteTechnique:5 } ] },

  { id:'developpe-epaules-halteres', nom:'Développé épaules (haltères / KB)', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','deltoide-lateral','triceps'], modes:[{mode:'strength',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:3, variantes:[
      { id:'de-unilateral', nom:'Unilatéral', flags:['unilateral'], difficulteTechnique:4 },
      { id:'de-alterne', nom:'Alterné', difficulteTechnique:3 },
      { id:'de-arnold', nom:'Arnold press', difficulteTechnique:3 },
      { id:'de-kb-unilateral', nom:'KB unilatéral', equipement:['kettlebell'], flags:['unilateral'], difficulteTechnique:4 },
      { id:'de-kb-double', nom:'KB double', equipement:['kettlebell'], difficulteTechnique:5 },
      { id:'de-bottoms-up', nom:'Bottoms-up press', equipement:['kettlebell'], flags:['unilateral'], difficulteTechnique:6, note:'KB renversée : stabilité d\'épaule + grip max.' },
      { id:'de-half-kneeling', nom:'Half / tall-kneeling', difficulteTechnique:3 },
      { id:'de-z-press-halteres', nom:'Z press haltères', difficulteTechnique:5 } ] },

  { id:'overhead-gymnique', nom:'Poussée verticale gymnique (pike → HSPU)', sport:'muscu', groupe:'push',
    muscles:['deltoide-anterieur','deltoide-lateral','triceps','transverse'], modes:[{mode:'strength',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:4,
    fiche:{ utilite:"Progression vers la poussée verticale au poids de corps (pike → HSPU). Force et stabilité d'épaule tête en bas, robustesse pour les nageurs. Haute exigence de contrôle.",
      execution:["Position pike, bassin haut","Coudes ~45°, sommet du crâne vers le sol","Gainage, côtes basses","Pousse en grandissant les épaules","Progresse pieds surélevés → mur → libre"],
      erreurs:["Cambrer","Coudes qui s'écartent","Passer au mur/libre trop tôt","Perte de gainage"] }, variantes:[
      { id:'hspu-mur', nom:'HSPU au mur', flags:['a-encadrer'], difficulteTechnique:6 },
      { id:'hspu-deficit', nom:'HSPU déficit', flags:['a-encadrer'], difficulteTechnique:8 },
      { id:'hspu-libre', nom:'HSPU libre', flags:['a-encadrer'], difficulteTechnique:9 } ] },

  { id:'med-ball-push', nom:'Poussée explosive med ball', sport:'muscu', groupe:'push',
    muscles:['pectoraux','deltoide-anterieur','triceps'], modes:[{mode:'explosivite',primaire:true}], equipement:['poids-de-corps'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Puissance de poussée par le lancer, sans décélération en fin de course ni machine. Traduit la force en explosivité. Faible technique, gros transfert.",
      execution:["Position athlétique ou à genoux","Arme près de la poitrine","Pousse explosif et lâche la balle","Accompagne, ne retiens pas","Reset chaque rep"],
      erreurs:["Retenir la balle","Charge trop lourde","Gainage relâché","Volume trop élevé"] }, variantes:[
      { id:'mb-overhead-throw', nom:'Overhead throw', difficulteTechnique:2 },
      { id:'mb-put', nom:'Med ball put', flags:['unilateral'], difficulteTechnique:3 } ] },

  { id:'accessoires-triceps', nom:'Triceps (isolation)', sport:'muscu', groupe:'push',
    muscles:['triceps'], modes:[{mode:'strength',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:1, accessoire:true, variantes:[
      { id:'tri-overhead', nom:'Extension overhead', equipement:['halteres','kettlebell','elastique'], difficulteTechnique:1 },
      { id:'tri-skull', nom:'Skull crusher', equipement:['barre','halteres'], difficulteTechnique:2 },
      { id:'tri-jm', nom:'JM press', equipement:['barre'], difficulteTechnique:3 },
      { id:'tri-tate', nom:'Tate press', equipement:['halteres'], difficulteTechnique:2 },
      { id:'tri-kickback', nom:'Kickback élastique', equipement:['elastique'], difficulteTechnique:1 } ] },

  { id:'accessoires-epaules', nom:'Épaules (isolation)', sport:'muscu', groupe:'push',
    muscles:['deltoide-lateral'], modes:[{mode:'strength-endurance',primaire:true}], equipement:['halteres'], flags:[], difficulteTechnique:1, accessoire:true, variantes:[
      { id:'ep-laterales', nom:'Élévations latérales', equipement:['halteres','elastique'], difficulteTechnique:1 },
      { id:'ep-frontales', nom:'Élévations frontales', muscles:['deltoide-anterieur'], equipement:['halteres','elastique'], difficulteTechnique:1 },
      { id:'ep-l-raise', nom:'L-raise', difficulteTechnique:2 } ] },
]
