// ══════════════════════════════════════════════════════════════════
// CADENCES — contenus de protocole par épreuve (§7).
// Détail réel tiré du « Protocole complet du test physique » d'Alex
// (géométrie des parcours, échauffements spécifiques, allures cibles,
// charges Hyrox). TEXTE uniquement : aucun chiffre de barème dupliqué
// (les seuils vivent dans la config §6). Les schémas des parcours à plots
// sont désignés par `diagram` et dessinés côté site (CadencesDiagrams).
// ══════════════════════════════════════════════════════════════════

export interface Protocol {
  objectif: string
  materiel: string[]
  etapes: string[]                 // protocole pas à pas
  saisie: string                   // ce qu'il faut entrer
  securite?: string
  echauffementSpecifique?: string  // en plus de l'échauffement général
  allure?: string                  // allures cibles indicatives
  box?: string                     // hauteur de box (Hyrox)
  diagram?: 'square' | 'slalom' | 'move' | 'longjump' | 'triplejump'   // schéma du mouvement / parcours
  flag?: boolean                   // contenu estimé / à faire relire
}

/** Profils d'échauffement : il n'est PAS le même selon la séance et le sport. */
export const ECHAUFFEMENTS: Record<string, { titre: string; texte: string }> = {
  haltero: {
    titre: 'Haltérophilie',
    texte: "Barre à vide : mobilité épaules, hanches, chevilles et quelques mouvements à vide. " +
      "Puis montée en charge par séries courtes (50 % ×5, 70 % ×3, 85 % ×2) avant de chercher le max. Technique avant charge.",
  },
  force: {
    titre: 'Force',
    texte: "Mobilité ciblée sur l'articulation sollicitée. Montée progressive : 50 % du 3RM estimé ×8, 70 % ×5, " +
      "85 % ×3, puis 1–2 tentatives proches du 3RM, 2–3 min de récup entre paliers. Dead hang toujours en toute fin de séance.",
  },
  explo: {
    titre: 'Explosivité · vitesse · agilité',
    texte: "10 min de footing + mobilité dynamique (montées de genoux, talons-fesses, pas chassés), puis 4 à 6 " +
      "accélérations progressives de 20–30 m et quelques bonds légers. À froid pour l'explosivité. Agilité sur gazon, " +
      "jamais sur bitume ; plots contournés de l'extérieur vers l'intérieur.",
  },
  natation: {
    titre: 'Natation',
    texte: "300–400 m en nage souple + quelques éducatifs, puis 4×25 m en accélération. 2 min de récup avant le départ.",
  },
  course: {
    titre: 'Course / endurance',
    texte: "10–15 min de footing facile + mobilité, puis quelques lignes progressives. Allure gérée : un départ trop " +
      "rapide fait s'effondrer le temps final.",
  },
  velo: {
    titre: 'Vélo',
    texte: "10 min progressif, 3 min facile, 3 accélérations de 1 min proches du seuil, puis 5 min facile avant le test.",
  },
  hyrox: {
    titre: 'Hyrox / circuit',
    texte: "5–8 min de cardio léger (rameur, vélo ou corde) + mobilité, puis les mouvements du circuit à vide ou en " +
      "charge légère (thrusters, burpees, tractions) pour réviser la technique avant de lancer.",
  },
}

const WARMUP_FORCE = new Set(['squat_3rm', 'bench_press_3rm', 'deadlift_3rm', 'military_press_3rm', 'weighted_pullup_3rm', 'dead_hang'])
const WARMUP_HALTERO = new Set(['clean_2rm', 'clean_and_press_2rm', 'front_squat_3rm'])
const WARMUP_HYROX = new Set(['hyrox_circuit', 'amrap_20min'])

/** Profil d'échauffement adapté à chaque épreuve (séance/sport). */
export function warmupForTest(slug: string): { titre: string; texte: string } {
  if (WARMUP_FORCE.has(slug)) return ECHAUFFEMENTS.force
  if (WARMUP_HALTERO.has(slug)) return ECHAUFFEMENTS.haltero
  if (WARMUP_HYROX.has(slug)) return ECHAUFFEMENTS.hyrox
  if (slug.startsWith('swim')) return ECHAUFFEMENTS.natation
  if (slug === 'bike_20min') return ECHAUFFEMENTS.velo
  if (slug.startsWith('run') || slug.startsWith('repeat_200')) return ECHAUFFEMENTS.course
  // sauts, sprints, agilité (square/move/slalom)
  return ECHAUFFEMENTS.explo
}

/** Échauffement général commun à toutes les épreuves. */
export const ECHAUFFEMENT_GENERAL =
  "10 min de footing facile, mobilité articulaire, puis 4 à 6 accélérations " +
  "progressives de 20–30 m. Agilité et 6×200 m sur gazon, jamais sur bitume. Les " +
  "plots se contournent de l'extérieur vers l'intérieur. Ordre : vitesse/explosivité " +
  "à froid, force après échauffement progressif, tests longs en fin de séance."

/** Charge des thrusters Hyrox par tranche de poids de corps (kg), fournie par Alex. */
export const HYROX_THRUSTER_KG: Record<'M' | 'F', { lo: number; hi: number | null; kg: number }[]> = {
  M: [
    { lo: 0, hi: 60, kg: 20 }, { lo: 60, hi: 70, kg: 25 }, { lo: 70, hi: 80, kg: 30 },
    { lo: 80, hi: 90, kg: 32.5 }, { lo: 90, hi: null, kg: 35 },
  ],
  F: [
    { lo: 0, hi: 50, kg: 10 }, { lo: 50, hi: 60, kg: 15 }, { lo: 60, hi: 70, kg: 20 },
    { lo: 70, hi: 80, kg: 22.5 }, { lo: 80, hi: null, kg: 25 },
  ],
}

/** Charge de thrusters Hyrox pour un sexe + un poids de corps donné. */
export function hyroxThrusterKg(sex: 'M' | 'F', weightKg: number): number {
  const table = HYROX_THRUSTER_KG[sex] ?? HYROX_THRUSTER_KG.M
  for (const b of table) if (weightKg >= b.lo && (b.hi === null || weightKg < b.hi)) return b.kg
  return table[table.length - 1].kg
}

export const PROTOCOLS: Record<string, Protocol> = {
  // ── J1 · Haltérophilie (épreuves récentes — hors doc protocole v1) ──
  clean_2rm: {
    objectif: 'Puissance et coordination de l\'épaulé complet.',
    materiel: ['Barre olympique + disques', 'Plateforme / zone de drop'],
    etapes: [
      'Échauffement : montées en charge par séries courtes jusqu\'au 2RM.',
      'Épaulé (clean) : barre du sol aux épaules en un mouvement, réception en squat.',
      'Chercher la charge la plus lourde réalisable pour 2 répétitions propres.',
    ],
    saisie: 'La charge (kg) du 2RM réussi, lest de la barre compris.',
    securite: 'Technique avant charge. Arrêter si la réception se dégrade.',
  },
  clean_and_press_2rm: {
    objectif: 'Puissance de la chaîne complète, du sol au-dessus de la tête.',
    materiel: ['Barre olympique + disques'],
    etapes: [
      'Épaulé puis développé sur la même répétition : sol → épaules → au-dessus de la tête.',
      'Chercher le 2RM propre (gainage, verrouillage bras tendus).',
    ],
    saisie: 'La charge (kg) du 2RM réussi.',
  },
  front_squat_3rm: {
    objectif: 'Force des jambes, barre en position avant (front rack).',
    materiel: ['Barre + rack', 'Disques'],
    etapes: [
      'Barre sur les épaules en front rack, coudes hauts.',
      'Descente contrôlée cuisses parallèles (ou sous la parallèle), remontée complète.',
      'Chercher le 3RM propre.',
    ],
    saisie: 'La charge (kg) du 3RM réussi.',
    echauffementSpecifique: 'Montée progressive : 50 % du 3RM estimé ×8, 70 % ×5, 85 % ×3, 2–3 min de récup entre paliers.',
  },

  // ── J2 · Sauts / Sprints / Agilité ─────────────────────────────────
  standing_long_jump: {
    objectif: 'Explosivité horizontale des membres inférieurs.',
    materiel: ['Zone plate non glissante', 'Mètre ruban'],
    etapes: [
      'Départ pieds joints derrière la ligne, sans élan.',
      'Flexion-extension, saut vers l\'avant, réception stabilisée sur les deux pieds.',
      'Mesurer du bord de la ligne au talon le plus proche. 3 essais, le meilleur compte.',
    ],
    saisie: 'La meilleure des 3 distances (m).',
    diagram: 'longjump',
  },
  standing_triple_jump: {
    objectif: 'Explosivité et coordination (enchaînement de 3 bonds).',
    materiel: ['Piste / zone longue plate', 'Mètre ruban'],
    etapes: [
      'Départ pieds joints, sans élan.',
      '3 bonds enchaînés sans arrêt : 1er et 3e appel sur un pied, réception finale sur les deux pieds.',
      'Mesurer jusqu\'au talon le plus proche. 3 essais, le meilleur compte.',
    ],
    saisie: 'La meilleure des 3 distances (m).',
    diagram: 'triplejump',
  },
  sprint_30m: {
    objectif: 'Accélération pure (puissance et explosivité).',
    materiel: ['Piste ou gazon', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, un pied devant, déclenchement au signal.',
      'Sprint maximal jusqu\'à 30 m. 2 essais, récupération complète, le meilleur compte.',
    ],
    saisie: 'Le meilleur des 2 temps (s). Précise le chronométrage et les chaussures (pointes corrigées automatiquement).',
  },
  sprint_100m: {
    objectif: 'Vitesse maximale soutenue.',
    materiel: ['Piste ou terrain plat balisé à 100 m', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, comme le 30 m, sur signal.',
      'Sprint maximal sur 100 m. 1 essai.',
    ],
    saisie: 'Le temps (s). Précise le chronométrage et les chaussures.',
  },
  agility_square: {
    objectif: 'Changements de direction et déplacements multi-directionnels.',
    materiel: ['Plots', 'Gazon', 'Chrono'],
    etapes: [
      'Parcours : 2 carrés de 4 m × 4 m, alignés sur le même axe, séparés de 10 m (mesuré de départ de carré à départ de carré). Un 2e segment de 10 m va du départ du carré 2 jusqu\'à l\'arrivée.',
      'Dans chaque carré : avant (1 côté) → pas chassés (1 côté) → arrière (1 côté) → pas chassés (1 côté).',
      'Carré 1 dans un sens, carré 2 dans le sens inverse. Plots contournés de l\'extérieur vers l\'intérieur.',
      '2 essais, le meilleur compte, 1 min de récupération entre les deux.',
    ],
    saisie: 'Le meilleur des 2 temps (s).',
    diagram: 'square',
  },
  agility_move: {
    objectif: 'Capacité à repartir en avant et en arrière (agilité, réactivité).',
    materiel: ['Plots (à 5, 10 et 15 m)', 'Gazon', 'Chrono'],
    etapes: [
      'Depuis le départ : 5 m en avant jusqu\'au plot, le contourner, puis retour en course arrière.',
      'Même chose vers le plot à 10 m (avant, contourner, retour arrière), puis vers le plot à 15 m.',
      'Après le retour du plot à 15 m, sprint de 30 m droit devant.',
      '1 min de récupération, 3 passages, le meilleur compte.',
    ],
    saisie: 'Le meilleur des 3 passages (s).',
    diagram: 'move',
  },
  agility_slalom: {
    objectif: 'Vitesse en trajectoire brisée (agilité à haute vitesse).',
    materiel: ['Plots', 'Gazon', 'Chrono'],
    etapes: [
      'Parcours : 10 diagonales de 18,03 m chacune (environ 180 m au total), 9 changements de direction.',
      'Plots contournés de l\'extérieur vers l\'intérieur. 2 essais, le meilleur compte.',
    ],
    saisie: 'Le meilleur des 2 temps (s).',
    diagram: 'slalom',
  },

  // ── J3 · Natation ──────────────────────────────────────────────────
  swim_50m: {
    objectif: 'Vitesse et coordination en nage.',
    materiel: ['Piscine (25 ou 50 m)', 'Chrono'],
    etapes: [
      'Départ dans l\'eau (pas de plongeon), nage libre.',
      '50 m le plus vite possible.',
    ],
    saisie: 'Le temps (s). Précise la longueur du bassin (25 / 50 m).',
  },
  swim_200m: {
    objectif: 'Endurance et VO2max en nage.',
    materiel: ['Piscine', 'Chrono'],
    etapes: [
      'Départ dans l\'eau, nage libre.',
      '200 m à allure soutenue régulière.',
    ],
    saisie: 'Le temps (s). Précise la longueur du bassin.',
  },

  // ── J4 · Force (dead hang toujours en dernier) ─────────────────────
  squat_3rm: {
    objectif: 'Force maximale des jambes (squat arrière).',
    materiel: ['Barre + rack', 'Disques'],
    etapes: [
      'Barre sur le haut du dos, descente cuisses parallèles (ou sous la parallèle), remontée complète.',
      'Chercher la charge max sur 3 répétitions propres (3RM). Comparée au barème en ratio au poids de corps.',
    ],
    saisie: 'La charge (kg) du 3RM. Indique si tu portes une ceinture (correction vers « sans ceinture »).',
    echauffementSpecifique: 'Paliers : 50 % du 3RM estimé ×8, 70 % ×5, 85 % ×3, puis 1–2 tentatives proches du 3RM. 2–3 min de récup entre paliers.',
  },
  bench_press_3rm: {
    objectif: 'Force maximale du haut du corps (poussée horizontale).',
    materiel: ['Banc + barre', 'Pareur conseillé'],
    etapes: [
      'Barre descendue à la poitrine, poussée complète bras tendus.',
      'Chercher le 3RM propre.',
    ],
    saisie: 'La charge (kg) du 3RM.',
    securite: 'Un pareur ou des stops de sécurité sont recommandés.',
    echauffementSpecifique: 'Paliers : 50 % ×8, 70 % ×5, 85 % ×3, 2–3 min de récup.',
  },
  deadlift_3rm: {
    objectif: 'Force maximale de la chaîne postérieure.',
    materiel: ['Barre + disques'],
    etapes: [
      'Soulevé de terre conventionnel, dos gainé, verrouillage debout.',
      'Chercher le 3RM propre.',
    ],
    saisie: 'La charge (kg) du 3RM. Indique si tu portes une ceinture.',
    echauffementSpecifique: 'Paliers : 50 % ×8, 70 % ×5, 85 % ×3, 2–3 min de récup.',
  },
  military_press_3rm: {
    objectif: 'Force de poussée verticale, debout.',
    materiel: ['Barre + disques'],
    etapes: [
      'Debout, barre des épaules au-dessus de la tête sans à-coup des jambes (strict).',
      'Chercher le 3RM propre.',
    ],
    saisie: 'La charge (kg) du 3RM.',
    echauffementSpecifique: 'Paliers : 50 % ×8, 70 % ×5, 85 % ×3, 2–3 min de récup.',
  },
  weighted_pullup_3rm: {
    objectif: 'Force de tirage du haut du corps.',
    materiel: ['Barre de traction', 'Ceinture ou gilet de lest'],
    etapes: [
      'Lest ajouté (ceinture ou gilet), mesuré en kilos ajoutés au poids de corps.',
      'Amplitude complète, menton au-dessus de la barre. Chercher le 3RM.',
    ],
    saisie: 'Le lest ajouté (kg), hors poids de corps.',
  },
  dead_hang: {
    objectif: 'Endurance de force de préhension (grip).',
    materiel: ['Barre de traction', 'Chrono'],
    etapes: [
      'Suspension à la barre, bras tendus, deux mains, immobile, jusqu\'au lâcher.',
      'Toujours en toute fin de séance de force (fatigue la préhension).',
    ],
    saisie: 'La durée tenue (s).',
  },

  // ── J6 · 400 m + 6×200 ─────────────────────────────────────────────
  run_400m: {
    objectif: 'Endurance de vitesse (un tour de piste à bloc).',
    materiel: ['Piste ou terrain plat balisé à 400 m', 'Chrono'],
    etapes: [
      'Départ debout. 400 m (1 tour de piste standard) à l\'effort maximal régulier.',
    ],
    saisie: 'Le temps (s). Précise le chronométrage et les chaussures.',
    allure: 'Repère H : Réf 1:05 ≈ 2:43/km · Max 0:50 ≈ 2:05/km.',
  },
  repeat_200m_x6: {
    objectif: 'Endurance et capacité à répéter l\'effort (VO2max).',
    materiel: ['Gazon', 'Chrono'],
    etapes: [
      '6 répétitions de 200 m en aller-retour (100 m aller, virage, 100 m retour).',
      'Chaque 200 m chronométré individuellement, 30 s de récupération entre chaque.',
      'Score = somme des 6 temps (la récup n\'est jamais comptée).',
    ],
    saisie: 'Les 6 temps (s) : le score est leur somme.',
    echauffementSpecifique: 'Après l\'échauffement général : 1 répétition de 200 m à allure modérée, puis 2 min de récup avant le 1er essai.',
    allure: 'Repère H : Réf 40 s/200 m ≈ 18 km/h · Max 31 s/200 m ≈ 23 km/h.',
  },

  // ── J7 · Vélo ──────────────────────────────────────────────────────
  bike_20min: {
    objectif: 'VO2max / puissance aérobie (test de 20 min).',
    materiel: ['Vélo ou home-trainer avec capteur de puissance'],
    etapes: [
      '20 min à la puissance la plus élevée et constante possible.',
      'Relever la puissance moyenne sur les 20 min complètes.',
    ],
    saisie: 'La puissance moyenne (W) sur 20 min. Le W/kg et la FTP estimée (95 %) sont calculés pour info.',
    echauffementSpecifique: '10 min progressif, 3 min facile, 3 accélérations de 1 min proches du seuil, 5 min facile avant le test.',
  },

  // ── J8 · AMRAP ─────────────────────────────────────────────────────
  amrap_20min: {
    objectif: 'Endurance musculaire et anaérobie (le plus de tours en 20 min).',
    materiel: ['Barre de traction', 'Espace au sol'],
    etapes: [
      'Tour = 5 tractions + 10 pompes + 20 squats au poids de corps (benchmark CrossFit « Cindy »).',
      'Enchaîner le plus de tours possible en 20 min.',
    ],
    saisie: 'Le nombre de tours complets (les répétitions du tour entamé peuvent être ajoutées en partiel).',
  },

  // ── J10 · 3200 m ───────────────────────────────────────────────────
  run_3200m: {
    objectif: 'VO2max (course longue, 8 tours de piste).',
    materiel: ['Piste', 'Chrono'],
    etapes: [
      '3200 m (8 tours de 400 m, ≈ 2 miles). Départ debout, allure gérée.',
      'Un départ trop rapide fait s\'effondrer le temps final.',
    ],
    saisie: 'Le temps total (s). Précise le chronométrage et les chaussures.',
    echauffementSpecifique: '10–15 min de footing très facile + mobilité, sans accélérations.',
    allure: 'Repère H : Réf 12:50 ≈ 4:01/km · Max 9:10 ≈ 2:52/km.',
  },

  // ── J12 · Hyrox ────────────────────────────────────────────────────
  hyrox_circuit: {
    objectif: 'Capacité hybride force-endurance sous fatigue.',
    materiel: ['Box (60 cm H / 40 cm F)', 'Barre/haltères (thrusters)', 'Rameur'],
    etapes: [
      'Un tour = 12 burpees box jump + 20 thrusters (charge selon ta tranche de poids) + rameur.',
      '5 tours. Chaque tour chronométré séparément ; le score est la somme des temps de travail.',
      'La récupération entre les tours n\'est jamais comptée.',
    ],
    saisie: 'Les 5 temps de tour (s), hors récupération : le score est leur somme. Indique la variante de burpee (box / to plate).',
    box: 'Box : 60 cm (hommes) / 40 cm (femmes), 12 burpees box jump par tour.',
  },
}

/** Protocole d'une épreuve (ou undefined si contenu non défini). */
export function protocolFor(slug: string): Protocol | undefined {
  return PROTOCOLS[slug]
}
