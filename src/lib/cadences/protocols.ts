// ══════════════════════════════════════════════════════════════════
// CADENCES — contenus de protocole par épreuve (§7). TEXTE uniquement :
// aucun chiffre de barème dupliqué (les seuils vivent dans la config §6).
// Versionné hors des composants (spéc §7). Les passages estimés / à relire
// portent `flag: true` (points ouverts §20).
// ══════════════════════════════════════════════════════════════════

export interface Protocol {
  objectif: string
  materiel: string[]
  etapes: string[]       // protocole pas à pas
  saisie: string         // ce qu'il faut entrer
  securite?: string
  flag?: boolean         // 🔶 contenu estimé / à faire relire
}

/** Échauffement général commun à toutes les épreuves (§7). */
export const ECHAUFFEMENT_GENERAL =
  "10 min de footing facile, mobilité (chevilles, hanches, épaules), puis 4 à 6 accélérations " +
  "progressives de 20–30 m. Agilité et 6×200 m sur gazon, jamais sur bitume. Les plots se " +
  "contournent de l'extérieur vers l'intérieur."

export const PROTOCOLS: Record<string, Protocol> = {
  // ── J1 · Haltérophilie ────────────────────────────────────────────
  clean_2rm: {
    objectif: 'Puissance et coordination du mouvement complet d\'épaulé.',
    materiel: ['Barre olympique + disques', 'Plateforme / zone de drop'],
    etapes: [
      'Échauffement spécifique : montées en charge par séries courtes jusqu\'au 2RM.',
      'Épaulé (clean) : barre du sol aux épaules en un mouvement, réception en squat.',
      'Chercher la charge la plus lourde réalisable pour 2 répétitions propres.',
    ],
    saisie: 'La charge (kg) du 2RM réussi, lest de la barre compris.',
    securite: 'Technique avant charge. Arrêter si la position de réception se dégrade.',
  },
  clean_and_press_2rm: {
    objectif: 'Puissance de la chaîne complète, du sol au-dessus de la tête.',
    materiel: ['Barre olympique + disques'],
    etapes: [
      'Épaulé puis développé (press) sur la même répétition : sol → épaules → au-dessus de la tête.',
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
  },

  // ── J2 · Sauts / Sprints / Agilité ─────────────────────────────────
  standing_long_jump: {
    objectif: 'Explosivité horizontale des membres inférieurs.',
    materiel: ['Zone plate non glissante', 'Mètre ruban'],
    etapes: [
      'Pieds derrière la ligne, sans élan (pas de pas avant le saut).',
      'Saut à pieds joints vers l\'avant, réception stabilisée.',
      'Mesurer du bord de la ligne au talon le plus proche. 3 essais.',
    ],
    saisie: 'La meilleure des 3 distances (m).',
  },
  standing_triple_jump: {
    objectif: 'Explosivité et coordination (enchaînement de 3 bonds).',
    materiel: ['Piste / zone longue plate', 'Mètre ruban'],
    etapes: [
      'Départ pieds joints, sans élan.',
      'Trois bonds enchaînés vers l\'avant, réception stabilisée.',
      'Mesurer jusqu\'au talon le plus proche. 3 essais.',
    ],
    saisie: 'La meilleure des 3 distances (m).',
  },
  sprint_30m: {
    objectif: 'Accélération pure (puissance et explosivité).',
    materiel: ['Piste ou gazon', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, sur signal.',
      'Sprint maximal sur 30 m. 2 essais, récupération complète entre les deux.',
    ],
    saisie: 'Le meilleur des 2 temps (s). Précise le chronométrage (manuel / cellules / montre) et les chaussures (pointes corrigées automatiquement).',
  },
  sprint_100m: {
    objectif: 'Vitesse maximale soutenue.',
    materiel: ['Piste', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, sur signal.',
      'Sprint maximal sur 100 m. 1 essai.',
    ],
    saisie: 'Le temps (s). Précise le chronométrage et les chaussures.',
  },
  agility_square: {
    objectif: 'Changements de direction (agilité, explosivité).',
    materiel: ['4 plots', 'Gazon', 'Chrono'],
    etapes: [
      'Deux carrés de 4 m accolés, parcours en changements d\'appui.',
      'Contourner les plots de l\'extérieur vers l\'intérieur. 2 essais.',
    ],
    saisie: 'Le meilleur des 2 temps (s).',
    flag: true,
  },
  agility_move: {
    objectif: 'Capacité à repartir en avant et en arrière (agilité).',
    materiel: ['Plots', 'Gazon', 'Chrono'],
    etapes: [
      '100 m au total dont 35 m parcourus en arrière, en 3 passages.',
      '1 minute de récupération entre chaque passage.',
    ],
    saisie: 'Les 3 temps de passage (s). Par défaut, c\'est le meilleur passage qui est retenu.',
    flag: true,
  },
  agility_slalom: {
    objectif: 'Vitesse en trajectoire brisée (agilité à haute vitesse).',
    materiel: ['Plots', 'Gazon', 'Chrono'],
    etapes: [
      'Slalom de 180 m sur 10 diagonales.',
      'Contourner les plots de l\'extérieur vers l\'intérieur. 2 essais.',
    ],
    saisie: 'Le meilleur des 2 temps (s).',
    flag: true,
  },

  // ── J3 · Natation ──────────────────────────────────────────────────
  swim_50m: {
    objectif: 'Vitesse et coordination en nage.',
    materiel: ['Piscine (25 ou 50 m)', 'Chrono'],
    etapes: [
      'Départ dans l\'eau (pas de plongeon).',
      '50 m nage libre, le plus vite possible.',
    ],
    saisie: 'Le temps (s). Précise la longueur du bassin (25 / 50 m).',
  },
  swim_200m: {
    objectif: 'Endurance et VO2max en nage.',
    materiel: ['Piscine', 'Chrono'],
    etapes: [
      '200 m nage libre à allure soutenue régulière.',
    ],
    saisie: 'Le temps (s). Précise la longueur du bassin.',
  },

  // ── J4 · Force (dead hang toujours en dernier) ─────────────────────
  squat_3rm: {
    objectif: 'Force maximale des jambes (squat arrière).',
    materiel: ['Barre + rack', 'Disques'],
    etapes: [
      'Barre sur le haut du dos.',
      'Descente cuisses parallèles (ou sous la parallèle), remontée complète.',
      'Chercher le 3RM propre.',
    ],
    saisie: 'La charge (kg) du 3RM. Indique si tu portes une ceinture (correction appliquée vers « sans ceinture »).',
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
  },
  deadlift_3rm: {
    objectif: 'Force maximale de la chaîne postérieure.',
    materiel: ['Barre + disques'],
    etapes: [
      'Soulevé de terre conventionnel, dos gainé.',
      'Verrouillage debout, puis repose contrôlée. Chercher le 3RM.',
    ],
    saisie: 'La charge (kg) du 3RM. Indique si tu portes une ceinture.',
  },
  military_press_3rm: {
    objectif: 'Force de poussée verticale, debout.',
    materiel: ['Barre + disques'],
    etapes: [
      'Debout, barre des épaules au-dessus de la tête sans à-coup des jambes (strict).',
      'Chercher le 3RM propre.',
    ],
    saisie: 'La charge (kg) du 3RM.',
  },
  weighted_pullup_3rm: {
    objectif: 'Force de tirage du haut du corps.',
    materiel: ['Barre de traction', 'Ceinture de lest'],
    etapes: [
      'Traction menton au-dessus de la barre, lest attaché.',
      'Chercher le 3RM propre sur la charge ajoutée.',
    ],
    saisie: 'Le lest ajouté (kg), hors poids de corps.',
  },
  dead_hang: {
    objectif: 'Endurance de force de préhension (grip).',
    materiel: ['Barre de traction', 'Chrono'],
    etapes: [
      'Suspension bras tendus, deux mains, immobile.',
      'Tenir le plus longtemps possible. À faire en toute dernière épreuve du jour.',
    ],
    saisie: 'La durée tenue (s).',
  },

  // ── J6 · 400 m + 6×200 ─────────────────────────────────────────────
  run_400m: {
    objectif: 'Endurance de vitesse (un tour de piste à bloc).',
    materiel: ['Piste', 'Chrono'],
    etapes: [
      'Départ arrêté. 400 m à l\'effort maximal régulier.',
    ],
    saisie: 'Le temps (s). Précise le chronométrage et les chaussures.',
  },
  repeat_200m_x6: {
    objectif: 'Endurance et capacité à répéter l\'effort (VO2max).',
    materiel: ['Gazon', 'Chrono'],
    etapes: [
      '6 × 200 m en aller-retour, 30 s de récupération entre chaque.',
      'Allure soutenue régulière sur les 6.',
    ],
    saisie: 'Les 6 temps (s) : le score est leur somme.',
  },

  // ── J7 · Vélo ──────────────────────────────────────────────────────
  bike_20min: {
    objectif: 'VO2max / puissance aérobie (test de 20 min).',
    materiel: ['Vélo ou home-trainer avec capteur de puissance'],
    etapes: [
      'Après échauffement, 20 min à bloc à allure régulière la plus haute tenable.',
      'Relever la puissance moyenne sur les 20 min.',
    ],
    saisie: 'La puissance moyenne (W) sur 20 min. Le W/kg et la FTP estimée (95 %) sont calculés pour info.',
  },

  // ── J8 · AMRAP ─────────────────────────────────────────────────────
  amrap_20min: {
    objectif: 'Endurance musculaire et cardio (le plus de tours en 20 min).',
    materiel: ['Barre de traction', 'Espace au sol'],
    etapes: [
      'Tour = 5 tractions + 10 pompes + 20 squats.',
      'Enchaîner le plus de tours possible en 20 min.',
    ],
    saisie: 'Le nombre de tours complets (les répétitions du tour entamé peuvent être ajoutées en partiel).',
  },

  // ── J10 · 3200 m ───────────────────────────────────────────────────
  run_3200m: {
    objectif: 'VO2max (course longue, 8 tours de piste).',
    materiel: ['Piste', 'Chrono'],
    etapes: [
      '3200 m (8 tours, ≈ 2 miles) à l\'effort maximal régulier.',
    ],
    saisie: 'Le temps total (s). Précise le chronométrage et les chaussures.',
  },

  // ── J12 · Hyrox ────────────────────────────────────────────────────
  hyrox_circuit: {
    objectif: 'Capacité hybride force-endurance sous fatigue.',
    materiel: ['Box', 'Barre/haltères (thrusters)', 'Rameur'],
    etapes: [
      'Un tour = 12 burpees box jump (ou 15 « to plate ») + 20 thrusters + 300 m rameur.',
      '1 minute de récupération entre les tours. 5 tours au total.',
      'Chronométrer chaque tour (hors récupération) : le score est la somme des 5.',
    ],
    saisie: 'Les 5 temps de tour (s), hors récupération : le score est leur somme. Indique la variante de burpee (box / to plate).',
    flag: true,
  },
}

/** Protocole d'une épreuve (ou undefined si contenu non défini). */
export function protocolFor(slug: string): Protocol | undefined {
  return PROTOCOLS[slug]
}
