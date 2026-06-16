// ══════════════════════════════════════════════════════════════
// src/lib/coach/methods.ts
// Bibliothèque de méthodes d'entraînement (la « doctrine » du coach).
//
// Uniquement les sports où une vraie MÉTHODOLOGIE de périodisation
// a du sens : cyclisme, running, triathlon.
// (Hyrox / muscu / natation = styles de séances, pas des méthodes.)
//
// Chaque méthode porte une connaissance profonde, injectée dans le
// system prompt du coach pour qu'il la maîtrise et l'applique.
// ══════════════════════════════════════════════════════════════

export type MethodSport = 'cyclisme' | 'running' | 'triathlon'

export interface TrainingMethod {
  id: string
  name: string
  sports: MethodSport[]
  short: string          // une ligne pour le sélecteur
  principe: string       // l'idée centrale
  structure: string      // organisation type (semaine / blocs / répartition d'intensité)
  pourQui: string        // profil/objectif adapté
  application: string    // comment le coach l'applique concrètement (séances clés)
}

export const TRAINING_METHODS: TrainingMethod[] = [
  // ── Transverses ──────────────────────────────────────────────
  {
    id: 'polarise',
    name: 'Polarisé (80/20)',
    sports: ['cyclisme', 'running', 'triathlon'],
    short: '80 % facile, 20 % très intense — peu de zone grise',
    principe: "Répartir l'intensité de façon bimodale : ~80 % du temps en endurance fondamentale (sous le 1er seuil, zone facile parlable) et ~20 % en haute intensité (au-dessus du 2e seuil), en évitant la zone grise du seuil au quotidien.",
    structure: "Semaine type : 4-6 séances faciles + 1 à 3 séances dures (VO2max, intervalles longs). La majorité du volume reste en Z1-Z2. Les séances dures sont franches et espacées.",
    pourQui: "Athlètes avec un volume conséquent, objectifs d'endurance longue. Maximise l'adaptation aérobie tout en limitant la fatigue chronique.",
    application: "Garder les sorties faciles VRAIMENT faciles (contrôle FC/allure), concentrer l'intensité sur 2-3 séances clés (ex : 5×4 min VO2max, 4×8 min seuil haut), surveiller la fraîcheur avant les séances dures.",
  },
  // ── Cyclisme ─────────────────────────────────────────────────
  {
    id: 'sweetspot',
    name: 'Sweet Spot (SST)',
    sports: ['cyclisme'],
    short: 'Volume autour de 88-94 % FTP — rendement en temps limité',
    principe: "Travailler juste sous le seuil (≈88-94 % de FTP), là où le rapport stimulus/fatigue est optimal pour élever le seuil sans le coût des séances au seuil strict.",
    structure: "2-3 séances SST/semaine (ex : 3×12-15 min, 2×20 min), reste en endurance. Progression par durée puis par densité des intervalles.",
    pourQui: "Cyclistes/triathlètes avec peu de temps, phase de construction du seuil, préparation cols/CLM.",
    application: "Blocs de 3-4 semaines en montée de charge SST, calibrés en watts depuis la FTP. Ajouter des sorties longues le week-end. Surveiller la lassitude (le SST est exigeant si abusé).",
  },
  {
    id: 'blocs_pma',
    name: 'Blocs PMA',
    sports: ['cyclisme'],
    short: 'Bloc concentré de PMA/VO2max puis assimilation',
    principe: "Concentrer un fort stimulus PMA (puissance maximale aérobie / VO2max) sur une courte période pour provoquer une surcharge, suivie d'une phase d'assimilation où la forme rebondit.",
    structure: "Bloc de 1-2 semaines avec 2-3 séances PMA (ex : 30/30, 40/20, 5×3-5 min à PMA), parfois une séance en pré-fatigue (endurance/SST avant les efforts PMA). Puis récup/assimilation.",
    pourQui: "Cyclistes confirmés cherchant un gain ciblé de PMA, avant un bloc seuil ou spécifique.",
    application: "Doser le bloc (risque de surentraînement), inclure une PMA en pré-fatigue pour le réalisme course, puis enchaîner sur du seuil. Calibrer en watts (% PMA/FTP).",
  },
  {
    id: 'pyramidal',
    name: 'Pyramidal',
    sports: ['cyclisme', 'running'],
    short: 'Beaucoup de facile, dose modérée de seuil, peu de VO2max',
    principe: "Distribution pyramidale de l'intensité : large base d'endurance, volume notable au seuil, et une petite pointe de VO2max. Plus de travail au seuil que le polarisé.",
    structure: "Endurance majoritaire + 1-2 séances seuil + occasionnellement VO2max. La part au seuil augmente à l'approche de l'objectif.",
    pourQui: "Polyvalent, prépa course route/longue distance, athlètes qui répondent bien au seuil.",
    application: "Construire le seuil progressivement (durée puis intensité), garder une touche de VO2max pour la cylindrée, basculer vers le spécifique en fin de prépa.",
  },
  {
    id: 'specifique_velo',
    name: 'Spécifique cols / CLM',
    sports: ['cyclisme'],
    short: 'Calé sur les exigences de la course (D+, allure cible)',
    principe: "Reproduire les contraintes de l'épreuve : efforts longs en bosse pour une cyclosportive montagneuse, ou tenue de l'allure cible pour un contre-la-montre.",
    structure: "Séances clés en conditions spécifiques (cols répétés, blocs à l'intensité de course, position CLM), volume soutenu en fin de prépa, affûtage avant l'objectif.",
    pourQui: "Phase finale de préparation d'un objectif vélo identifié (cols, CLM, étape reine).",
    application: "Caler les blocs sur le profil réel de la course (dénivelé, durée des montées), travailler l'allure/puissance cible, gérer le ravitaillement sur les longues.",
  },
  // ── Running ──────────────────────────────────────────────────
  {
    id: 'norvegienne',
    name: 'Norvégienne (double seuil)',
    sports: ['running', 'triathlon'],
    short: 'Gros volume au seuil contrôlé au lactate, parfois 2×/jour',
    principe: "Accumuler un grand volume d'intervalles JUSTE sous le 2e seuil (lactate maîtrisé, ~2-4 mmol/L), à intensité contrôlée plutôt que maximale, parfois en double séance de seuil sur une même journée, pour un fort stimulus avec une fatigue gérable.",
    structure: "2 jours/semaine de double seuil (matin + soir) en intervalles sous-seuil (ex : 5×6 min, 10×1000 m, 25×400 m) à allure contrôlée, le reste en endurance facile. Allure pilotée par les sensations/lactate, jamais en surrégime.",
    pourQui: "Coureurs/triathlètes intermédiaires à confirmés bien encadrés, qui tolèrent la fréquence ; demande de la rigueur sur le contrôle d'intensité.",
    application: "Cadrer STRICTEMENT l'intensité (rester sous le seuil, ne pas finir épuisé), volume progressif, rappels VO2max ponctuels. Sans lactatemètre, piloter par allure seuil précise + sensations.",
  },
  {
    id: 'seuil_vma',
    name: 'Seuil + rappels VMA',
    sports: ['running'],
    short: 'Blocs au seuil avec rappels VMA réguliers',
    principe: "Développer l'allure seuil (cœur de la performance sur 10 km à marathon) par des blocs au seuil, en entretenant la VMA par des rappels réguliers pour ne pas perdre la cylindrée.",
    structure: "1-2 séances seuil/semaine (tempo continu, intervalles au seuil) + 1 rappel VMA toutes les 2-3 semaines + endurance. Spécifique allure course en fin de prépa.",
    pourQui: "Coureurs visant 10 km / semi / marathon, profil endurant qui veut élever son seuil.",
    application: "Progresser la durée au seuil (ex : 3×8 min → 2×20 min), intercaler des rappels VMA (ex : 10×400 m, 6×800 m), finir sur du spécifique allure objectif.",
  },
  {
    id: 'vo2max',
    name: 'VO2max / intervalles',
    sports: ['running'],
    short: 'Priorité au développement de la VO2max',
    principe: "Maximiser le temps passé à haute fraction de VO2max via des intervalles intenses, pour élever le plafond aérobie.",
    structure: "1-2 séances VO2max/semaine (ex : 5×3 min, 30/30, 6×800 m à allure 3-5 km) + endurance. Bloc court car coûteux.",
    pourQui: "Phase de développement du plafond aérobie, coureurs ayant déjà une base, distances courtes à moyennes.",
    application: "Récupérations adaptées pour cumuler du temps à VO2max, qualité avant quantité, ne pas enchaîner trop de séances dures, basculer vers le seuil/spécifique ensuite.",
  },
  {
    id: 'allure_spe',
    name: 'Allure spécifique course',
    sports: ['running'],
    short: 'Centré sur l\'allure cible de l\'objectif',
    principe: "Habituer l'organisme à l'allure exacte de la course pour automatiser l'effort et la gestion le jour J.",
    structure: "Séances longues à allure spécifique, fractions à allure course de plus en plus longues, en fin de préparation et pendant l'affûtage.",
    pourQui: "Bloc spécifique/affûtage d'un objectif chronométré (semi, marathon).",
    application: "Augmenter progressivement le volume à allure cible (ex : 2×5 km → 1×15 km allure marathon), travailler ravitaillement et pacing, réduire le volume en affûtage en gardant des touches d'allure.",
  },
  {
    id: 'trail',
    name: 'Trail / côtes (D+)',
    sports: ['running'],
    short: 'Spécifique dénivelé : montée, descente, terrain',
    principe: "Préparer aux contraintes du dénivelé : force spécifique en montée, technique et résistance musculaire en descente, gestion de l'effort sur terrain varié.",
    structure: "Séances de côtes (force/seuil en montée), sorties longues avec D+ proche de l'objectif, travail de descente, renforcement spécifique.",
    pourQui: "Objectifs trail / courses vallonnées avec dénivelé significatif.",
    application: "Caler le D+ des longues sur celui de la course, intégrer des répétitions de côtes (force et seuil), travailler la descente (excentrique) pour limiter la casse musculaire.",
  },
  // ── Triathlon ────────────────────────────────────────────────
  {
    id: 'multisport',
    name: 'Périodisation multi-sport',
    sports: ['triathlon'],
    short: 'Orchestrer nage / vélo / run sur la semaine et la prépa',
    principe: "Gérer la charge combinée des 3 disciplines : alterner les accents (bloc à dominante d'une discipline) tout en maintenant les autres, pour progresser sans accumuler une fatigue ingérable.",
    structure: "Répartition hebdo équilibrée selon le niveau et les forces/faiblesses, blocs orientés (ex : bloc vélo) avec maintien des 2 autres, muscu/prévention en soutien.",
    pourQui: "Triathlètes toutes distances ; indispensable dès que les 3 disciplines doivent cohabiter.",
    application: "Prioriser la discipline la plus rentable / la plus faible selon l'objectif, placer les séances clés aux bons moments (fraîcheur), maintenir la nage en technique/seuil, surveiller la charge totale.",
  },
  {
    id: 'brick',
    name: 'Spécifique enchaînement (brick)',
    sports: ['triathlon'],
    short: 'Enchaînements vélo→run pour les jambes de transition',
    principe: "Habituer le corps aux transitions, surtout vélo→course, où les sensations sont spécifiques. Travailler la tenue d'allure en fatigue d'enchaînement.",
    structure: "Séances brick régulières (vélo puis run immédiat), de plus en plus spécifiques à l'allure et la durée de course en fin de prépa.",
    pourQui: "Tout triathlète, particulièrement en phase spécifique avant l'objectif.",
    application: "Démarrer court (ex : 45' vélo + 15' run), progresser vers l'enchaînement à allure course, inclure un brick au seuil et un long en endurance spécifique distance.",
  },
  {
    id: 'specifique_distance',
    name: 'Spécifique distance (Sprint / 70.3 / Ironman)',
    sports: ['triathlon'],
    short: 'Calé sur les exigences de la distance visée',
    principe: "Adapter volume, intensité et nutrition aux exigences réelles de la distance : explosivité/seuil sur Sprint, endurance soutenue sur 70.3, gros volume et stratégie nutrition/allure sur Ironman.",
    structure: "Plus la distance est longue, plus le volume et les sorties longues priment (jusqu'à des sorties proches de la distance de course), avec des touches d'intensité. Affûtage adapté.",
    pourQui: "Préparation ciblée d'une distance précise.",
    application: "Sur Ironman : longues nage (3500-4000 m), longues vélo + brick, gestion ravitaillement ; sur Sprint/70.3 : plus de seuil/VO2max. Caler les semaines spécifiques en fin de prépa.",
  },
]

// ── Helpers ─────────────────────────────────────────────────────

export function methodById(id: string | null | undefined): TrainingMethod | undefined {
  if (!id) return undefined
  return TRAINING_METHODS.find(m => m.id === id)
}

export function methodsForSport(sport: MethodSport): TrainingMethod[] {
  return TRAINING_METHODS.filter(m => m.sports.includes(sport))
}

const SPORT_LABEL: Record<MethodSport, string> = {
  cyclisme: 'Cyclisme', running: 'Running', triathlon: 'Triathlon',
}

/** Index court de toutes les méthodes, groupé par sport — pour que le coach
 *  sache QUELLES méthodes proposer (toujours injecté, léger). */
export function methodsIndexText(): string {
  const lines: string[] = ['BIBLIOTHÈQUE DE MÉTHODES (cyclisme, running, triathlon — ne JAMAIS imposer, proposer/choisir) :']
  ;(['cyclisme', 'running', 'triathlon'] as MethodSport[]).forEach(sport => {
    lines.push(`${SPORT_LABEL[sport]} :`)
    methodsForSport(sport).forEach(m => lines.push(`  - ${m.name} — ${m.short}`))
  })
  return lines.join('\n')
}

/** Connaissance PROFONDE d'une méthode — injectée quand elle est sélectionnée
 *  ou retenue, pour que le coach l'applique avec maîtrise. */
export function methodDoctrineText(id: string): string {
  const m = methodById(id)
  if (!m) return ''
  return `MÉTHODE RETENUE : ${m.name} (${m.sports.map(s => SPORT_LABEL[s]).join(', ')}).
- Principe : ${m.principe}
- Structure : ${m.structure}
- Pour qui : ${m.pourQui}
- Application concrète : ${m.application}
Construis le plan EN APPLIQUANT cette méthode avec rigueur, adaptée aux données réelles de l'athlète.`
}
