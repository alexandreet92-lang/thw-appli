import type { Exercice } from './types'

export const LEGS: Exercice[] = [
  { id:'single-leg-rdl', nom:'Single-leg RDL', sport:'muscu', groupe:'legs',
    muscles:['ischios','fessiers'], modes:[{mode:'strength',primaire:true}],
    equipement:['kettlebell','halteres'], flags:['unilateral'], difficulteTechnique:5,
    fiche:{ utilite:"Reproduit la phase d'appui unipodal de la course sous charge : chaîne postérieure + équilibre + anti-rotation en un geste. Révèle et corrige les asymétries D/G que la course masque. Exercice signature pour un public endurance.",
      execution:["Charge dans la main opposée à la jambe d'appui","Charnière de hanche, jambe libre tendue en arrière (corps en T)","Hanches carrées — ne pas ouvrir","Dos neutre, regard au sol devant","Remonte sans poser la jambe libre"],
      erreurs:["Ouvrir la hanche (rotation externe)","Arrondir le dos","Chercher le bas avec le buste au lieu de reculer la jambe"] } },

  { id:'b-stance-rdl', nom:'B-stance RDL', sport:'muscu', groupe:'legs',
    muscles:['ischios','fessiers'], modes:[{mode:'strength',primaire:true}],
    equipement:['halteres','kettlebell'], flags:['unilateral'], difficulteTechnique:4,
    fiche:{ utilite:"Le pont entre RDL bilatéral et single-leg : tu charges majoritairement une jambe sans le casse-tête d'équilibre. Corrige une asymétrie ischio. Chaîne postérieure faible = quasi universel chez les coureurs.",
      execution:["Un pied avant à plat, l'autre en arrière sur la pointe","~70% du poids sur la jambe avant","Charnière de hanche, dos neutre, charge proche des jambes","Descends jusqu'à étirement des ischios","Remonte par poussée de hanche"],
      erreurs:["Arrondir le dos","Plier le genou avant (ça devient un squat)","Trop de poids sur la jambe arrière"] } },

  { id:'nordic-curl', nom:'Nordic curl', sport:'muscu', groupe:'legs',
    muscles:['ischios'], modes:[{mode:'strength',primaire:true}],
    equipement:['poids-de-corps'], flags:['a-encadrer'], difficulteTechnique:2,
    fiche:{ utilite:"Standard prouvé de réduction du risque de claquage ischio (excentrique maximal). Pour un coureur de vitesse ou un triathlète : assurance-blessure. Très courbaturant : à introduire très progressivement.",
      execution:["À genoux, chevilles bloquées","Corps gainé en ligne genoux→tête","Descends le buste le plus lentement possible en freinant","Rattrape avec les mains en bas","Remonte en t'aidant des bras"],
      erreurs:["Casser à la hanche (fesses en arrière)","Chute non freinée","Volume trop élevé d'emblée"] } },

  { id:'cossack-squat', nom:'Cossack squat', sport:'muscu', groupe:'legs',
    muscles:['quadriceps','adducteurs','fessiers'], modes:[{mode:'strength',primaire:true}],
    equipement:['poids-de-corps','kettlebell'], flags:[], difficulteTechnique:5,
    fiche:{ utilite:"Charge le plan frontal (latéral), grand absent du running/vélo. Renforce les adducteurs en amplitude + ouvre la hanche. Excellent Hyrox et prévention.",
      execution:["Pieds très écartés, pointes légèrement ouvertes","Descends sur une jambe, l'autre tendue talon au sol","Buste droit, poitrine ouverte","Reste talon ancré côté fléchi","Passe d'un côté à l'autre fluidement"],
      erreurs:["Talon qui décolle","Buste qui s'effondre vers l'avant","Genou qui rentre"] } },

  { id:'atg-split-squat', nom:'ATG split squat', sport:'muscu', groupe:'legs',
    muscles:['quadriceps'], modes:[{mode:'strength',primaire:true}],
    equipement:['poids-de-corps','halteres'], flags:['unilateral','a-encadrer'], difficulteTechnique:4,
    fiche:{ utilite:"Renforce le genou en amplitude complète, là où il est vulnérable (descente, freinage). Prévention des tendinopathies rotuliennes. Robustesse de genou pour coureurs et triathlètes.",
      execution:["Fente avant, avant-pied surélevé sur une cale","Genou avant loin devant la pointe, talon collé","Amplitude maximale contrôlée","Buste droit","Remonte sans à-coup"],
      erreurs:["Talon avant qui décolle","Amplitude trop grande trop vite","Charger avant que la technique soit propre"] } },

  { id:'skater-squat', nom:'Skater squat', sport:'muscu', groupe:'legs',
    muscles:['quadriceps','fessiers'], modes:[{mode:'strength',primaire:true}],
    equipement:['poids-de-corps'], flags:['unilateral'], difficulteTechnique:6,
    fiche:{ utilite:"Force unilatérale genou-dominant sans charge axiale sur la colonne — idéal dos sensible. Transfert vers la descente en trail et la stabilité du genou.",
      execution:["Sur une jambe, l'autre repliée derrière","Descends jusqu'à effleurer le genou arrière (sur un coussin)","Buste légèrement penché, tibia avant contrôlé","Remonte par poussée de la jambe d'appui","Contrepoids devant pour l'équilibre"],
      erreurs:["Se laisser tomber sur le genou arrière","Genou avant qui s'effondre vers l'intérieur","Chercher l'amplitude avant le contrôle"] } },

  { id:'tibialis-raise', nom:'Tibialis raise', sport:'muscu', groupe:'legs',
    muscles:['tibial-anterieur'], modes:[{mode:'strength-endurance',primaire:true}],
    equipement:['poids-de-corps','elastique'], flags:[], difficulteTechnique:1,
    fiche:{ utilite:"Muscle quasi jamais renforcé, pourtant clé dans l'amorti et le contrôle de la pose de pied. Prévention des périostites tibiales et du syndrome de loge antérieure. Coût quasi nul, gros rendement.",
      execution:["Dos au mur, talons à ~30 cm, jambes tendues","Charge sur l'avant-pied","Lève les pointes vers les tibias au max","Descends lentement","Amplitude complète, pas d'élan"],
      erreurs:["Plier les genoux pour tricher","Amplitude partielle","Aller trop lourd"] } },

  { id:'mollet-unipodal', nom:'Mollet unipodal (soléaire + gastroc)', sport:'muscu', groupe:'legs',
    muscles:['mollets'], modes:[{mode:'strength-endurance',primaire:true},{mode:'strength',primaire:false}],
    equipement:['poids-de-corps','halteres'], flags:[], difficulteTechnique:2,
    fiche:{ utilite:"Le mollet encaisse des forces énormes en course (le soléaire surtout). Le renforcer en unipodal et dans les deux positions de genou prévient tendinopathies d'Achille et fractures de fatigue. La plupart négligent le soléaire.",
      execution:["Avant-pied sur le bord d'une marche, une jambe","Version 1 : genou tendu (gastrocnémiens)","Version 2 : genou fléchi ~30° (soléaire)","Monte complet, descends sous l'horizontale","Amplitude pleine, pas de rebond"],
      erreurs:["Rebondir (élastique tendineux au lieu du muscle)","Amplitude partielle","Oublier la version soléaire"] } },

  { id:'pogo-hops', nom:'Pogo hops', sport:'muscu', groupe:'legs',
    muscles:['mollets'], modes:[{mode:'explosivite',primaire:true}],
    equipement:['poids-de-corps'], flags:[], difficulteTechnique:3,
    fiche:{ utilite:"Entraîne la raideur élastique de la cheville — déterminant majeur de l'économie de course, quasi jamais travaillé. Faible amplitude, faible risque, gros transfert. Porte d'entrée vers la pliométrie.",
      execution:["Sur l'avant-pied, jambes quasi tendues","Petits rebonds rapides, contact sol minimal","Chevilles « ressort », genoux peu fléchis","Reste haut, contacts brefs","Qualité > hauteur"],
      erreurs:["Trop fléchir les genoux (squat jump)","Contacts longs et mous","Volume excessif (ménager Achille)"] } },

  // BRIQUE SÈCHE
  { id:'back-squat', nom:'Back squat', sport:'muscu', groupe:'legs',
    muscles:['quadriceps','fessiers'], modes:[{mode:'strength',primaire:true},{mode:'explosivite',primaire:false}],
    equipement:['barre'], flags:[], difficulteTechnique:4 },
]
