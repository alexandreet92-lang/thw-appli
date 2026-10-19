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
  stations?: string[]              // épreuve en plusieurs stations chronométrées une à une (Conditioning)
  stationsF?: string[]             // libellés des stations pour les femmes (variantes : australiennes, pompes sur les genoux)
  stationShare?: number[]          // part du temps total attendue par station à niveau Référence, hommes (somme = 1)
  stationShareF?: number[]         // idem pour les femmes (rameur +12 %, régressions)
  diagram?: 'square' | 'slalom' | 'move' | 'longjump' | 'triplejump' | 'chimere'   // schéma du mouvement / parcours
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
    titre: 'Conditioning / circuit',
    texte: "5–8 min de cardio léger (rameur, vélo ou corde) + mobilité, puis les mouvements du circuit à vide ou en " +
      "charge légère pour réviser la technique avant de lancer.",
  },
}

const WARMUP_FORCE = new Set(['squat_3rm', 'bench_press_3rm', 'deadlift_3rm', 'military_press_3rm', 'weighted_pullup_3rm', 'dead_hang'])
const WARMUP_HALTERO = new Set(['clean_2rm', 'clean_and_press_2rm', 'front_squat_3rm'])
const WARMUP_HYROX = new Set(['hyrox_circuit', 'conditioning', 'amrap_20min'])

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

/** Tranche de poids de corps : charge pour un poids ≤ `max` (kg) ; `max: null` = toutes les tranches au-dessus.
 *  Borne haute INCLUSIVE : à poids pile, on prend la charge la plus légère (sécurité). */
export interface LoadBand { max: number | null; kg: number }

/** Charges du circuit Conditioning (kg). Soulevé de terre = barre (allégée de 10-15 % vs la liste d'origine, effort sous fatigue,
 *  sans ceinture) ; thrusters et fentes = haltères PAR MAIN.
 *  Ces valeurs sont ensuite multipliées par le facteur de force de la tranche d'âge (voir `conditioningLoads`). */
export const CONDITIONING_LOADS: {
  deadlift: Record<'M' | 'F', LoadBand[]>
  thruster: LoadBand[]
  lunge: Record<'M' | 'F', LoadBand[]>
} = {
  deadlift: {
    M: [{ max: 60, kg: 45 }, { max: 70, kg: 50 }, { max: 75, kg: 55 }, { max: 80, kg: 65 }, { max: 85, kg: 75 }, { max: 90, kg: 85 }, { max: null, kg: 90 }],
    F: [{ max: 50, kg: 25 }, { max: 60, kg: 35 }, { max: 65, kg: 40 }, { max: 70, kg: 45 }, { max: 75, kg: 47.5 }, { max: 80, kg: 50 }, { max: null, kg: 55 }],
  },
  thruster: [{ max: 50, kg: 7.5 }, { max: 60, kg: 10 }, { max: 70, kg: 12.5 }, { max: 80, kg: 15 }, { max: 85, kg: 17.5 }, { max: null, kg: 20 }],
  lunge: {
    M: [{ max: 60, kg: 10 }, { max: 70, kg: 15 }, { max: 75, kg: 17.5 }, { max: 80, kg: 20 }, { max: 85, kg: 22.5 }, { max: 90, kg: 25 }, { max: null, kg: 27.5 }],
    F: [{ max: 60, kg: 7.5 }, { max: 70, kg: 12.5 }, { max: 75, kg: 15 }, { max: 80, kg: 17.5 }, { max: 85, kg: 20 }, { max: 90, kg: 22.5 }, { max: null, kg: 25 }],
  },
}

export interface ConditioningLoadsKg { deadlift: number; thruster: number; lunge: number }

function bandKg(bands: LoadBand[], weightKg: number): number {
  for (const b of bands) if (b.max === null || weightKg <= b.max) return b.kg
  return bands[bands.length - 1].kg
}
/** Arrondi à 2,5 kg avec plancher (une barre pèse au moins 20 kg, un haltère au moins 5 kg). */
function roundLoad(kg: number, floor: number): number { return Math.max(floor, Math.round(kg / 2.5) * 2.5) }

/** Charges du circuit Conditioning pour un sexe, un poids de corps et un facteur d'âge (= facteur de force de la
 *  tranche d'âge dans `config.age.pf`, 1 = pas de correction). */
export function conditioningLoads(sex: 'M' | 'F', weightKg: number, ageFactor = 1): ConditioningLoadsKg {
  const sx = sex === 'F' ? 'F' : 'M'
  const f = Number.isFinite(ageFactor) && ageFactor > 0 ? ageFactor : 1
  return {
    deadlift: roundLoad(bandKg(CONDITIONING_LOADS.deadlift[sx], weightKg) * f, 20),
    thruster: roundLoad(bandKg(CONDITIONING_LOADS.thruster, weightKg) * f, 5),
    lunge: roundLoad(bandKg(CONDITIONING_LOADS.lunge[sx], weightKg) * f, 5),
  }
}

/** Nombre maximum de stations du Conditioning qu'on peut « passer » (au-delà, le circuit entier est non passé). */
export const MAX_SKIPPED_STATIONS = 2

/** Parts attendues par station selon le sexe (repli sur la répartition des hommes). */
export function stationShareFor(sex: 'M' | 'F' | undefined): number[] {
  const p = PROTOCOLS.conditioning
  return (sex === 'F' ? p?.stationShareF : p?.stationShare) ?? p?.stationShare ?? []
}

/** Temps forfaitaire (s) d'une station non faite : 1,5 × son temps attendu à niveau Référence (part attendue × Réf du barème). */
export function stationPenaltySec(refTotalSec: number, share: number): number {
  return Math.round(1.5 * share * refTotalSec)
}

/** Stations passées, lues dans `notes` (« stations_passees=3,5 » → [3, 5], indices à partir de 1). */
export function parseSkippedStations(notes: unknown): number[] {
  const m = typeof notes === 'string' ? notes.match(/stations_passees=([0-9,]+)/) : null
  if (!m) return []
  return Array.from(new Set(m[1].split(',').map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n >= 1)))
}

/** Distance à ramer sur un rameur qui surestime de `overPct` % (Concept2 = référence, 0 %). */
export function rowerDistanceM(overPct: number, baseM = 2000): number {
  const p = Number.isFinite(overPct) && overPct > 0 ? overPct : 0
  return Math.round(baseM * (1 + p / 100))
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
      'Chercher le 3RM propre (ou le 5RM, au choix : voir la saisie).',
    ],
    saisie: 'La charge (kg) du 3RM réussi. Au choix, tu peux saisir un 5RM : il est converti en équivalent 3RM (× 1,06) pour le score.',
    echauffementSpecifique: 'Montée progressive : 50 % du 3RM estimé ×8, 70 % ×5, 85 % ×3, 2–3 min de récup entre paliers.',
  },

  // ── J2 · Sauts / Sprints / Agilité ─────────────────────────────────
  standing_long_jump: {
    objectif: 'Explosivité horizontale des membres inférieurs.',
    materiel: ['Zone plate non glissante', 'Mètre ruban'],
    etapes: [
      'Départ pieds joints derrière la ligne, sans élan.',
      'Flexion-extension, saut vers l\'avant, réception stabilisée sur les deux pieds.',
      'Mesurer du bord de la ligne au talon le plus proche. 3 essais.',
      'Notation sur 2 critères : le meilleur saut (12 pts) + le total des 3 sauts (8 pts). Un saut raté compte 0 m.',
    ],
    saisie: 'Les 3 distances (m) — 0 pour un saut raté.',
    diagram: 'longjump',
  },
  standing_triple_jump: {
    objectif: 'Explosivité et coordination (enchaînement de 3 bonds).',
    materiel: ['Piste / zone longue plate', 'Mètre ruban'],
    etapes: [
      'Départ pieds joints, sans élan.',
      '3 bonds enchaînés sans arrêt : 1er et 3e appel sur un pied, réception finale sur les deux pieds.',
      'Mesurer jusqu\'au talon le plus proche. 3 essais.',
      'Notation sur 2 critères : le meilleur saut (12 pts) + le total des 3 sauts (8 pts). Un saut raté compte 0 m.',
    ],
    saisie: 'Les 3 distances (m) — 0 pour un saut raté.',
    diagram: 'triplejump',
  },
  sprint_30m: {
    objectif: 'Accélération pure (puissance et explosivité).',
    materiel: ['Piste ou gazon', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, un pied devant, déclenchement au signal.',
      'Sprint maximal jusqu\'à 30 m. 3 tentatives, récupération complète, seul le meilleur temps compte.',
    ],
    saisie: 'Les 3 temps (s) — le meilleur est retenu. Précise le chronométrage et les chaussures (pointes corrigées automatiquement).',
  },
  sprint_100m: {
    objectif: 'Vitesse maximale soutenue.',
    materiel: ['Piste ou terrain plat balisé à 100 m', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, comme le 30 m, sur signal.',
      'Sprint maximal sur 100 m. 3 tentatives, récupération complète, seul le meilleur temps compte.',
    ],
    saisie: 'Les 3 temps (s) — le meilleur est retenu. Précise le chronométrage et les chaussures.',
  },
  agility_square: {
    objectif: 'Changements de direction et déplacements multi-directionnels.',
    materiel: ['Plots', 'Gazon', 'Chrono'],
    etapes: [
      'Tout le parcours est sur une même ligne droite ; on ne la quitte que pour tourner autour des carrés. 2 carrés de 4 m × 4 m : le carré 1 en bas, à droite de la ligne ; le carré 2 plus loin, à gauche de la ligne.',
      'Départ au plot du bas du carré 1 (sur la ligne). Tour 1 en restant toujours face à l\'avant : avant → pas chassés → arrière → pas chassés.',
      'Tour 2 dans l\'autre sens : pas chassés → avant → pas chassés → arrière, en revenant en reculant jusqu\'à avoir les deux pieds derrière le plot.',
      'Course tout droit sur 10 m (mesurés du départ) jusqu\'au 1er plot du carré 2 (son plot du bas, sur la ligne), puis même chose : tour 1, tour 2 dans l\'autre sens, retour en reculant, deux pieds derrière le plot.',
      'Sprint tout droit sur 10 m jusqu\'au plot d\'arrivée.',
      'Plots contournés de l\'extérieur vers l\'intérieur.',
      '3 passages, 1 min 30 de récupération entre chaque.',
      'Notation sur 2 critères : le meilleur temps (12 pts) + le temps total des 3 passages (8 pts).',
    ],
    saisie: 'Les 3 temps (s).',
    diagram: 'square',
  },
  agility_move: {
    objectif: 'Capacité à repartir en avant et en arrière (agilité, réactivité).',
    materiel: ['Plots (à 5, 10 et 15 m)', 'Gazon', 'Chrono'],
    etapes: [
      'Depuis le départ : 5 m en avant jusqu\'au plot, le contourner, puis retour en course arrière.',
      'Même chose vers le plot à 10 m (avant, contourner, retour arrière), puis vers le plot à 15 m.',
      'Après le retour du plot à 15 m, sprint de 30 m droit devant.',
      '3 passages, 1 min 30 de récupération entre chaque.',
      'Notation sur 2 critères : le meilleur temps (12 pts) + le temps total des 3 passages (8 pts).',
    ],
    saisie: 'Les 3 temps (s).',
    diagram: 'move',
  },
  agility_slalom: {
    objectif: 'Vitesse en trajectoire brisée (agilité à haute vitesse).',
    materiel: ['Plots', 'Gazon', 'Chrono'],
    etapes: [
      'Parcours : 10 diagonales de 18,03 m chacune (environ 180 m au total), 9 changements de direction.',
      'Plots contournés de l\'extérieur vers l\'intérieur.',
      '3 passages, 1 min 30 de récupération entre chaque.',
      'Notation sur 2 critères : le meilleur temps (18 pts) + le temps total des 3 passages (12 pts).',
    ],
    saisie: 'Les 3 temps (s).',
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
      'Chercher la charge max sur 3 répétitions propres (3RM), ou sur 5 (5RM, au choix). Comparée au barème en ratio au poids de corps.',
    ],
    saisie: 'La charge (kg) du 3RM. Indique si tu portes une ceinture (correction vers « sans ceinture »). Au choix, tu peux saisir un 5RM : il est converti en équivalent 3RM (× 1,06) pour le score.',
    securite: 'Pas l\'habitude des charges lourdes ? Choisis le 5RM : technique stricte, dos gainé, montée progressive en charge, pareur ou stops de sécurité. Arrête dès que la technique se dégrade.',
    echauffementSpecifique: 'Paliers : 50 % du 3RM estimé ×8, 70 % ×5, 85 % ×3, puis 1–2 tentatives proches du 3RM. 2–3 min de récup entre paliers.',
  },
  bench_press_3rm: {
    objectif: 'Force maximale du haut du corps (poussée horizontale).',
    materiel: ['Banc + barre', 'Pareur conseillé'],
    etapes: [
      'Barre descendue à la poitrine, poussée complète bras tendus.',
      'Chercher le 3RM propre (ou le 5RM, au choix : voir la saisie).',
    ],
    saisie: 'La charge (kg) du 3RM. Au choix, tu peux saisir un 5RM : il est converti en équivalent 3RM (× 1,06) pour le score.',
    securite: 'Un pareur ou des stops de sécurité sont recommandés.',
    echauffementSpecifique: 'Paliers : 50 % ×8, 70 % ×5, 85 % ×3, 2–3 min de récup.',
  },
  deadlift_3rm: {
    objectif: 'Force maximale de la chaîne postérieure.',
    materiel: ['Barre + disques'],
    etapes: [
      'Soulevé de terre conventionnel, dos gainé, verrouillage debout.',
      'Chercher le 3RM propre (ou le 5RM, au choix : voir la saisie).',
    ],
    saisie: 'La charge (kg) du 3RM. Indique si tu portes une ceinture. Au choix, tu peux saisir un 5RM : il est converti en équivalent 3RM (× 1,06) pour le score.',
    securite: 'Pas l\'habitude des charges lourdes ? Choisis le 5RM : technique stricte, dos gainé, montée progressive en charge, pareur ou stops de sécurité. Arrête dès que la technique se dégrade.',
    echauffementSpecifique: 'Paliers : 50 % ×8, 70 % ×5, 85 % ×3, 2–3 min de récup.',
  },
  military_press_3rm: {
    objectif: 'Force de poussée verticale, debout.',
    materiel: ['Barre + disques'],
    etapes: [
      'Debout, barre des épaules au-dessus de la tête sans à-coup des jambes (strict).',
      'Chercher le 3RM propre (ou le 5RM, au choix : voir la saisie).',
    ],
    saisie: 'La charge (kg) du 3RM. Au choix, tu peux saisir un 5RM : il est converti en équivalent 3RM (× 1,06) pour le score.',
    echauffementSpecifique: 'Paliers : 50 % ×8, 70 % ×5, 85 % ×3, 2–3 min de récup.',
  },
  weighted_pullup_3rm: {
    objectif: 'Force de tirage du haut du corps.',
    materiel: ['Barre de traction', 'Ceinture ou gilet de lest'],
    etapes: [
      'Lest ajouté (ceinture ou gilet), mesuré en kilos ajoutés au poids de corps.',
      'Amplitude complète, menton au-dessus de la barre. Chercher le 3RM (ou le 5RM, au choix : voir la saisie).',
    ],
    saisie: 'Le lest ajouté (kg), hors poids de corps (3RM, ou 5RM au choix : converti en équivalent 3RM, × 1,06).',
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

  // ── J12 · Conditioning (remplace l'AMRAP et le circuit en 5 tours dans Decaform v1.2) ──
  conditioning: {
    objectif: 'Endurance musculaire et capacité hybride force-endurance : 7 stations enchaînées, un seul chrono (environ 35 à 70 min selon le niveau).',
    materiel: ['Barre olympique + disques (soulevé de terre, burpees to the bar)', 'Barre de traction (ou barre basse / anneaux pour les tractions australiennes)', 'Haltères (thrusters, fentes)', 'Rameur (Concept2 de préférence)', 'Chrono avec tours (lap)'],
    etapes: [
      '1. Burpees to the bar : 50. La barre du soulevé de terre est posée au sol : à chaque répétition, saute par-dessus la barre (les deux pieds au-dessus) et touche-la des deux mains en bas.',
      '2. Tractions : 100 tractions strictes (menton au-dessus de la barre, bras tendus en bas, sans élan). Femmes : 100 tractions australiennes (poitrine à la barre, corps gainé).',
      '3. Thrusters : 50 avec haltères (pas à la barre), un par main. Squat complet puis poussée au-dessus de la tête dans le même mouvement ; charge selon ton poids de corps et ton âge.',
      '4. Pompes : 100 (poitrine près du sol, corps gainé). Femmes : 100 pompes sur les genoux.',
      '5. Soulevé de terre : 50, sans ceinture, dos neutre (charge selon ton poids de corps et ton âge).',
      '6. Fentes : 100 répétitions au total, en alternant les jambes (50 par jambe), haltères dans les mains (charge selon ton poids de corps et ton âge).',
      '7. Rameur : 2 000 m. Le Concept2 est la référence : certains rameurs surestiment la distance. Si le tien surestime de x %, rame 2 000 m + x % (ex. 10 % → 2 200 m).',
      'Un seul passage, sans pause imposée : le chrono tourne en continu. Tu peux fractionner les séries comme tu veux ; la récupération se fait pendant les transitions et est comptée.',
      'Note ton temps à chaque changement de station (tour de chrono) : le score est le temps total, les temps par station servent à lire ta course.',
    ],
    saisie: 'Les 7 temps de station (m:ss ou s) dans l’ordre : le score est leur somme. Hommes : si tu fais les tractions en australiennes ou les pompes sur les genoux, indique-le (+5 % sur le temps).',
    securite: 'Effort très long et exigeant : avis médical conseillé. Les 100 tractions et les 100 pompes sollicitent fortement épaules, coudes et mains ; le soulevé de terre arrive sous fatigue, sans ceinture : dos neutre, séries fractionnées autorisées, arrête-toi dès que la technique se dégrade ou à la moindre douleur articulaire. Pas de sol glissant ; hydrate-toi et arrête-toi au moindre malaise.',
    echauffementSpecifique: '5–8 min de cardio léger (rameur, vélo ou corde) + mobilité des épaules, du dos et des hanches, puis une série de chaque mouvement à vide ou en charge légère.',
    stations: ['Burpees to the bar', 'Tractions', 'Thrusters', 'Pompes', 'Soulevé de terre', 'Fentes', 'Rameur 2 000 m'],
    stationsF: ['Burpees to the bar', 'Tractions australiennes', 'Thrusters', 'Pompes sur les genoux', 'Soulevé de terre', 'Fentes', 'Rameur 2 000 m'],
    // Temps de tour attendu à niveau Référence (transition incluse), ramené en parts du total.
    // Hommes : 5:30 · 11:30 · 5:00 · 5:30 · 3:00 · 7:30 · 8:20 (+ 6 transitions de 25 s) ; femmes : 6:00 · 10:30 · 5:30 · 5:15 · 3:15 · 8:30 · 9:20.
    stationShare: [0.121, 0.244, 0.111, 0.121, 0.070, 0.162, 0.171],
    stationShareF: [0.126, 0.215, 0.116, 0.111, 0.072, 0.175, 0.185],
    flag: true,
  },

  // ══════════════════════════════════════════════════════════════════
  // BATTERIES DÉDIÉES (Kids / Teens / Start / Senior) + épreuve mixte.
  // Contenus à relire (flag) : barèmes et détails calés avec Alex.
  // ══════════════════════════════════════════════════════════════════

  // ── Épreuves partagées (jeunes / adultes) ──
  shuttle_20m: {
    objectif: 'Endurance aérobie (VO₂max) par un test de navette progressif (type Léger).',
    materiel: ['2 plots à 20 m', 'Bande sonore des paliers (bips)', 'Espace plat ~25 m'],
    etapes: [
      'Faire des allers-retours entre deux lignes distantes de 20 m, au rythme des bips.',
      'La vitesse imposée augmente à chaque palier : il faut atteindre la ligne avant le bip.',
      'On s\'arrête quand on ne tient plus le rythme (deux retards consécutifs).',
    ],
    saisie: 'Le nombre de paliers atteints.',
    securite: 'Effort auto-régulé : on s\'arrête de soi-même. Bonnes chaussures, sol non glissant.',
    flag: true,
  },
  // ── Test de forme (batterie « forme ») ──
  forme_navette: {
    objectif: 'Mesurer le moteur aérobie (VO2max) avec le test de Léger : une course navette de 20 m dont la vitesse augmente à chaque palier.',
    materiel: ['2 plots espacés de 20 m', 'Espace plat de 25 m', 'Un appareil avec le son (bips)', 'Sangle cardio Bluetooth (facultatif)'],
    etapes: [
      'Échauffement de 8 minutes : footing léger, mobilité, 3 accélérations.',
      'Au signal, courir de plot en plot : il faut toucher la ligne avant chaque bip. La vitesse démarre à 8,5 km/h et augmente de 0,5 km/h chaque minute.',
      'Un triple bip annonce un nouveau palier. On s\'arrête quand on n\'atteint plus la ligne à temps, ou quand on ne peut plus continuer.',
    ],
    saisie: 'Le palier atteint et le nombre de navettes réalisées dans ce palier (l\'outil les enregistre seul).',
    securite: 'Effort maximal : avis médical conseillé, bonnes chaussures, sol non glissant, on s\'arrête à la moindre douleur ou gêne dans la poitrine.',
  },
  forme_circuit: {
    objectif: 'Mesurer l\'endurance de force : le même circuit au poids du corps, 3 fois, le plus vite possible.',
    materiel: ['Espace de 12 m pour la marche de l\'ours', 'Chrono (intégré à l\'outil)', 'Un partenaire pour lancer chaque exercice (ou mode autonome)'],
    etapes: [
      'Récupération de 20 minutes minimum après la navette.',
      'Un tour : 8 burpees, 12 pompes, 16 fentes alternées, 20 squats, 24 m de marche de l\'ours. Trois tours, le chrono ne s\'arrête pas.',
      'Burpees : poitrine au sol et saut en fin de répétition. Pompes : poitrine à 5 cm du sol, corps gainé. Fentes : sur place, genou arrière près du sol (16 = 8 par jambe). Squats : cuisses au moins parallèles au sol. Marche de l\'ours : genoux à 5 cm du sol, 24 m en tout.',
      'Le chrono s\'arrête à la fin du dernier exercice du troisième tour.',
    ],
    saisie: 'Le temps total, en secondes (l\'outil le chronomètre et enregistre aussi chaque exercice).',
    securite: 'Pas de répétition bâclée : une répétition non conforme ne compte pas. On peut se reposer mais le chrono continue.',
  },
  shuttle_10x5m: {
    objectif: 'Vitesse et coordination dans les changements de direction (test EUROFIT).',
    materiel: ['2 plots / lignes à 5 m', 'Chrono'],
    etapes: [
      'Deux lignes espacées de 5 m. Au signal, courir d\'une ligne à l\'autre.',
      'Faire 5 allers-retours (10 passages de 5 m). On franchit la ligne à chaque bout avant de repartir.',
      'Le chrono s\'arrête au 10e franchissement.',
    ],
    saisie: 'Le temps total (s).',
    securite: 'Sol non glissant. Demi-tours contrôlés.',
    flag: true,
  },
  flamingo_balance: {
    objectif: 'Équilibre statique et coordination.',
    materiel: ['Chrono', 'Surface plane'],
    etapes: [
      'Debout sur une jambe, l\'autre pied plaqué contre le genou d\'appui.',
      'Mains sur les hanches, yeux fermés.',
      'On tient le plus longtemps possible (plafonné à 45 s). Chez l\'adulte : 3 essais par pied, on retient le meilleur temps du pied droit + celui du pied gauche.',
    ],
    saisie: 'Le temps tenu (s) — adulte : somme du meilleur pied droit et du meilleur pied gauche.',
    securite: 'À proximité d\'un mur ou d\'un appui pour se rattraper.',
    flag: true,
  },
  row_2000m: {
    objectif: 'Puissance aérobie et endurance sur rameur.',
    materiel: ['Rameur (ergomètre)'],
    etapes: [
      'Régler l\'écran sur 2000 m. Départ à l\'arrêt.',
      'Couvrir les 2000 m le plus vite possible en gérant l\'allure.',
      'Variante débutant : 1000 m (barème dédié) si 2000 m est hors de portée.',
    ],
    saisie: 'Le temps (mm:ss) sur la distance réalisée.',
    allure: 'Partir prudemment : un départ trop rapide effondre le temps final.',
    flag: true,
  },

  // ── Kids 8-10 ──
  shoulder_tap_plank: {
    objectif: 'Gainage et coordination : stabilité du tronc sous mouvement.',
    materiel: ['Chrono', 'Tapis'],
    etapes: [
      'En position de pompe bras tendus, corps gainé et aligné.',
      'Toucher l\'épaule opposée avec la main (main droite → épaule gauche et inversement), sans faire bouger le bassin.',
      '3 séries de 30 s, 1 min de récup. On additionne le nombre de touches des 3 séries.',
    ],
    saisie: 'Le total des touches sur les 3 séries.',
    securite: 'Le bassin reste immobile : pas de balancier. Genoux au sol si besoin.',
    flag: true,
  },
  burpees_nopushup: {
    objectif: 'Explosivité et cardio (version enfant, sans pompe).',
    materiel: ['Chrono', 'Tapis'],
    etapes: [
      'Depuis debout : mains au sol, sauter les pieds en arrière (planche), revenir, puis saut vertical.',
      'Pas de pompe en bas (version allégée).',
      'Faire le maximum de répétitions propres en 40 s.',
    ],
    saisie: 'Le nombre de répétitions en 40 s.',
    securite: 'Réception souple. Rythme maîtrisé.',
    flag: true,
  },

  // ── Kids 11-12 ──
  knee_pushups_30s: {
    objectif: 'Force du haut du corps (version genoux).',
    materiel: ['Chrono', 'Tapis'],
    etapes: [
      'En appui sur les genoux, mains largeur d\'épaules.',
      'Descendre la poitrine près du sol puis remonter bras tendus, corps gainé.',
      'Maximum de répétitions propres en 30 s.',
    ],
    saisie: 'Le nombre de répétitions en 30 s.',
    securite: 'Amplitude complète ; on ne compte que les répétitions propres.',
    flag: true,
  },
  foot_tap: {
    objectif: 'Coordination et vitesse de jambes.',
    materiel: ['Chrono'],
    etapes: [
      'Debout, relever un genou pour amener le pied vers l\'avant et le toucher avec la main opposée (main droite → pied gauche et inversement).',
      'Alterner le plus vite possible, en restant équilibré.',
      '3 séries de 30 s ; on additionne le nombre de touches.',
    ],
    saisie: 'Le total des touches sur les 3 séries.',
    flag: true,
  },
  circuit_kids: {
    objectif: 'Endurance musculaire, force et coordination (circuit enfant).',
    materiel: ['Chrono', 'Repère de 20 m'],
    etapes: [
      'Un tour = 5 burpees sans pompe + 20 m de marche de l\'ours (dos horizontal, fesses non relevées) + 20 montées de genoux (mains au niveau du bassin, le genou touche la main) + 10 squats.',
      '3 tours, 1 min 30 de récup entre les tours.',
      'Chaque tour est chronométré ; le score est la somme des temps des 3 tours.',
    ],
    saisie: 'Les 3 temps de tour (s) ; le score est leur somme.',
    securite: 'Marche de l\'ours dos parallèle au sol. Squats contrôlés.',
    flag: true,
  },

  // ── Teens 13-14 ──
  repeat_50m_x10: {
    objectif: 'Vitesse endurance (capacité lactique).',
    materiel: ['Piste / ligne droite de 50 m', 'Chrono'],
    etapes: [
      '10 sprints de 50 m, avec seulement 20 s de récupération entre chaque.',
      'Chaque 50 m est chronométré.',
      'Le score est la somme des 10 temps.',
    ],
    saisie: 'Les 10 temps (s) ; le score est leur somme.',
    allure: 'Rester régulier : ne pas exploser sur les premiers.',
    flag: true,
  },
  pushups_max: {
    objectif: 'Force et endurance du haut du corps.',
    materiel: ['Tapis'],
    etapes: [
      'Position de pompe bras tendus, corps gainé, mains largeur d\'épaules.',
      'Descendre poitrine près du sol puis remonter, sans cadence imposée, jusqu\'à l\'échec.',
      'Variante genoux possible (comptée comme telle).',
    ],
    saisie: 'Le nombre de pompes propres.',
    flag: true,
  },
  circuit_teens: {
    objectif: 'Endurance musculaire et cardio (circuit ado 13-14).',
    materiel: ['Chrono', 'Tapis'],
    etapes: [
      'Un tour = 5 burpees complets + 10 fentes alternées + 15 squats + 20 mountain climbers.',
      '3 tours, 1 min de récup entre les tours.',
      'Le score est la somme des temps des 3 tours.',
    ],
    saisie: 'Les 3 temps de tour (s) ; le score est leur somme.',
    securite: 'Technique avant vitesse. Réceptions souples.',
    flag: true,
  },

  // ── Teens 15-17 ──
  sprint_50m: {
    objectif: 'Vitesse pure sur 50 m.',
    materiel: ['Piste de 50 m', 'Chrono (idéalement cellules)'],
    etapes: [
      'Départ arrêté, en ligne droite.',
      'Sprint maximal sur 50 m.',
      '2 essais, on retient le meilleur temps.',
    ],
    saisie: 'Le meilleur temps (s).',
    flag: true,
  },
  repeat_100m_x10: {
    objectif: 'Vitesse endurance (capacité lactique).',
    materiel: ['Piste de 100 m', 'Chrono'],
    etapes: [
      '10 courses de 100 m, 20 s de récupération entre chaque.',
      'Chaque 100 m est chronométré.',
      'Le score est la somme des 10 temps.',
    ],
    saisie: 'Les 10 temps (s) ; le score est leur somme.',
    allure: 'Gérer la régularité, ne pas partir trop vite.',
    flag: true,
  },
  agility_90: {
    objectif: 'Agilité et coordination dans les changements de direction à 90°.',
    materiel: ['Plots', 'Chrono', 'Repères au sol (10 / 8 / 6 / 4 / 2 m)'],
    etapes: [
      'Parcours en changements de direction à 90°, sur des segments décroissants : 10 m, puis 8, 6, 4 et 2 m.',
      'On parcourt un segment, on contourne le plot (de l\'extérieur vers l\'intérieur), puis virage à 90° vers le segment suivant, en alternant les côtés.',
      '2 essais, on retient le meilleur temps.',
    ],
    saisie: 'Le meilleur temps total (s).',
    securite: 'Sol non glissant. Appuis contrôlés dans les virages.',
    flag: true,
  },
  bench_5rm: {
    objectif: 'Force du haut du corps (poussée), rapportée au poids de corps.',
    materiel: ['Barre + banc', 'Pareur obligatoire'],
    etapes: [
      'Échauffement progressif (barre à vide, puis montée en charge).',
      'Développé couché : chercher la charge maximale réalisable pour 5 répétitions propres.',
      'Pas de 1RM : on reste sur un 5RM, plus sûr pour l\'ado.',
    ],
    saisie: 'La charge (kg) du 5RM réussi (barre comprise). Le score tient compte du poids de corps.',
    securite: 'Pareur présent, technique validée avant toute charge. Échauffement complet.',
    flag: true,
  },
  pullups_max: {
    objectif: 'Force de tirage du haut du corps.',
    materiel: ['Barre de traction'],
    etapes: [
      'Tractions : menton au-dessus de la barre, bras tendus en bas, sans élan.',
      'Maximum de répétitions propres.',
      'Variante si aucune traction possible : tenue bras fléchis en haut de la barre le plus longtemps (le temps tenu sert alors de résultat).',
    ],
    saisie: 'Le nombre de tractions (ou le temps de tenue, s, si variante).',
    flag: true,
  },
  swim_100m: {
    objectif: 'Endurance aquatique.',
    materiel: ['Bassin de 25 ou 50 m', 'Chrono'],
    etapes: [
      '100 m en nage libre, départ plongé ou poussée au mur.',
      'Allure gérée pour tenir la distance.',
    ],
    saisie: 'Le temps (s). Indique la longueur du bassin.',
    flag: true,
  },
  circuit_teens_salle: {
    objectif: 'Endurance musculaire et cardio (circuit ado 15-17, type Hyrox allégé).',
    materiel: ['Haltères (6 / 8 / 10 kg)', 'Corde à sauter', 'Chrono'],
    etapes: [
      'Un tour = 10 burpees complets + 10 goblet squats (haltère) + 10 thrusters + 30 sauts à la corde.',
      '3 tours, 1 min de récup entre les tours.',
      'Le score est la somme des temps des 3 tours.',
    ],
    saisie: 'Les 3 temps de tour (s) ; le score est leur somme.',
    securite: 'Charge adaptée au niveau. Technique des thrusters avant la vitesse.',
    flag: true,
  },

  // ── Start (adultes débutants) ──
  knee_pushups_max: {
    objectif: 'Force du haut du corps (poussée), version accessible.',
    materiel: ['Tapis'],
    etapes: [
      'Position de pompe, genoux au sol autorisés.',
      'Descendre la poitrine près du sol puis remonter, corps gainé.',
      'Maximum de répétitions propres.',
    ],
    saisie: 'Le nombre de pompes propres (précise si genoux au sol).',
    flag: true,
  },
  hang_hold: {
    objectif: 'Force de tirage (version accessible).',
    materiel: ['Barre de traction OU élastique'],
    etapes: [
      'Avec barre : suspension bras fléchis, menton près de la barre, on tient le plus longtemps.',
      'Sans barre : tirage élastique (rows) — dos droit, on tire le coude vers l\'arrière, contrôlé.',
    ],
    saisie: 'Le temps de tenue (s) ou le nombre de tirages élastiques.',
    flag: true,
  },
  plank_hold: {
    objectif: 'Gainage du tronc.',
    materiel: ['Tapis', 'Chrono'],
    etapes: [
      'Sur les avant-bras et la pointe des pieds, corps parfaitement aligné (ni fesses hautes ni creusées).',
      'Tenir le plus longtemps possible en gardant l\'alignement.',
    ],
    saisie: 'Le temps tenu (s).',
    securite: 'On arrête dès que l\'alignement se casse.',
    flag: true,
  },
  box_stepup_100: {
    objectif: 'Force et endurance des jambes.',
    materiel: ['Box (60 cm hommes / 40 cm femmes)', 'Chrono'],
    etapes: [
      'Monter et descendre de la box, les deux pieds montent sur la caisse, en alternant jambe droite et jambe gauche.',
      '100 montées le plus rapidement possible.',
      'Règle hauteur : 60 cm pour les hommes (40 cm si 60 impossible), 40 cm pour les femmes.',
    ],
    saisie: 'Le temps (s) pour 100 montées. Indique la hauteur de box.',
    securite: 'Pose complète du pied sur la box. S\'arrêter si fatigue des appuis.',
    flag: true,
  },
  circuit_plank_taps: {
    objectif: 'Coordination, gainage et cardio (circuit en position pompe).',
    materiel: ['Chrono', 'Tapis'],
    etapes: [
      'En position de pompe : 10 tape-pied + 10 tape-genou + 20 tape-épaule + 20 mountain climbers.',
      '3 tours, 45 s de récup entre les tours.',
      'Ceux qui ne peuvent pas : on divise le nombre de répétitions par 2. Le score est la somme des 3 temps.',
    ],
    saisie: 'Les 3 temps de tour (s) ; le score est leur somme.',
    securite: 'Bassin stable, dos gainé.',
    flag: true,
  },
  circuit_start: {
    objectif: 'Endurance musculaire et cardio (circuit accessible).',
    materiel: ['Chrono', 'Repère de 30 m'],
    etapes: [
      'Un tour = 5 burpees (sans descendre complètement) + 10 squats + 20 montées de genoux + 30 m de marche de l\'ours.',
      '3 tours, 1 min de récup entre les tours.',
      'Le score est la somme des temps des 3 tours.',
    ],
    saisie: 'Les 3 temps de tour (s) ; le score est leur somme.',
    flag: true,
  },

  // ── Decaform v1.2 — La Chimère (épreuve mixte « motricité ») ──
  // PARCOURS FIGÉ de 100 m, en sept étapes. Les distances « ≈ » sont celles du
  // schéma : à confirmer sur le terrain avec le tracé réel.
  mixed_course: {
    objectif: 'La Chimère : motricité globale, coordination et dissociation sur 100 m, en changeant de mode de déplacement à chaque étape — course, marche du canard, haies, marche de l\'ours, galipettes.',
    materiel: ['Couloir de 100 m balisé (lignes à 0, 50 et 100 m)', 'Haies de 50-60 cm espacées d\'environ 1 m : 4 pour les hommes, 2 pour les femmes', 'Tapis de réception pour les galipettes', 'Chrono'],
    etapes: [
      '1. Départ arrêté derrière la ligne : 20 m de course.',
      '2. 10 m de marche du canard (accroupi, on avance en restant bas).',
      '3. Sauts de haies espacées d\'environ 1 m : 4 sauts pour les hommes, 2 pour les femmes (haies de 50-60 cm).',
      '4. Course jusqu\'à la ligne des 50 m (≈ 16 m).',
      '5. 20 m de marche de l\'ours (à quatre pattes, mains et pieds au sol, genoux décollés).',
      '6. 3 galipettes enchaînées sur le tapis.',
      '7. Course jusqu\'à la ligne des 100 m (≈ 27 m) : le chrono s\'arrête au franchissement de la ligne.',
      '3 essais, avec une récupération importante (4 à 5 min). On retient le meilleur temps.',
    ],
    saisie: 'Le meilleur temps (s) sur les 3 essais.',
    securite: 'Galipettes sur tapis ; alternative (roulade épaule ou passage au sol) si elles ne sont pas maîtrisées. Haies franchies en sécurité, jamais sur sol glissant.',
    diagram: 'chimere',
    flag: true,
  },

  // ── Senior (+65) — base Senior Fitness Test (Rikli & Jones) ──
  chair_stand_30s: {
    objectif: 'Force des jambes et autonomie (se lever d\'une chaise).',
    materiel: ['Chaise stable (sans accoudoirs)', 'Chrono'],
    etapes: [
      'Assis, bras croisés sur la poitrine.',
      'Se lever complètement puis se rasseoir, le plus de fois possible en 30 s.',
    ],
    saisie: 'Le nombre de levers complets en 30 s.',
    securite: 'Chaise contre un mur. Arrêter en cas de vertige.',
    flag: true,
  },
  arm_curl_30s: {
    objectif: 'Force du haut du corps et autonomie (porter).',
    materiel: ['Haltère léger (~2-3 kg femmes / 3-4 kg hommes) ou bouteille', 'Chrono'],
    etapes: [
      'Assis, l\'haltère en main.',
      'Flexions-extensions complètes du coude, le plus de fois possible en 30 s.',
    ],
    saisie: 'Le nombre de flexions en 30 s. Indique la charge utilisée.',
    flag: true,
  },
  grip_strength: {
    objectif: 'Force de préhension — prédicteur de santé reconnu chez le senior.',
    materiel: ['Dynamomètre à main (ou charge à tenir)'],
    etapes: [
      'Serrer le dynamomètre à fond, bras le long du corps.',
      'Variante sans matériel : tenir une charge (sac / bouteille) bras le long du corps le plus longtemps (le temps sert alors de résultat).',
    ],
    saisie: 'La force (kg) ou le temps de tenue (s) si variante.',
    flag: true,
  },
  walk_6min: {
    objectif: 'Endurance aérobie fonctionnelle.',
    materiel: ['Parcours balisé (ou step)', 'Chrono'],
    etapes: [
      'Marcher le plus de distance possible en 6 min sur un parcours balisé, à allure soutenue mais sûre.',
      'Variante : step 2 min (montées de genou sur place), on compte les montées.',
    ],
    saisie: 'La distance (m) en 6 min, ou le nombre de montées (step 2 min).',
    securite: 'Marche, pas de course. S\'arrêter en cas d\'essoufflement anormal.',
    flag: true,
  },
  up_and_go: {
    objectif: 'Agilité et équilibre dynamique (mobilité du quotidien).',
    materiel: ['Chaise', 'Plot à 2,44 m', 'Chrono'],
    etapes: [
      'Assis sur une chaise. Au top : se lever, marcher 2,44 m, contourner un plot, revenir et se rasseoir.',
      'Le plus vite possible mais en sécurité.',
    ],
    saisie: 'Le temps (s).',
    securite: 'Chaussures adaptées, sol dégagé. En sécurité avant la vitesse.',
    flag: true,
  },
  single_leg_balance: {
    objectif: 'Équilibre statique (prévention des chutes).',
    materiel: ['Chrono', 'Appui à proximité'],
    etapes: [
      'Debout sur une jambe, mains sur les hanches.',
      'Tenir le plus longtemps possible (plafonné à 30 s).',
    ],
    saisie: 'Le temps tenu (s).',
    securite: 'Près d\'un mur ou d\'une chaise pour se rattraper.',
    flag: true,
  },
  functional_flex: {
    objectif: 'Souplesse fonctionnelle et autonomie (s\'habiller, attraper en hauteur).',
    materiel: ['Chaise', 'Règle / mètre'],
    etapes: [
      'Chair sit-and-reach : assis au bord de la chaise, une jambe tendue, avancer les mains vers le pied ; mesurer l\'écart (atteint le pied = 0, dépasse = positif, n\'atteint pas = négatif).',
      'Back-scratch : une main par-dessus l\'épaule, l\'autre dans le dos, mesurer l\'écart entre les doigts.',
    ],
    saisie: 'L\'atteinte en cm (négatif = n\'atteint pas).',
    flag: true,
  },
}

/** Protocole d'une épreuve (ou undefined si contenu non défini). */
export function protocolFor(slug: string): Protocol | undefined {
  return PROTOCOLS[slug]
}
