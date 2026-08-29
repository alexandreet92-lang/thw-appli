// ══════════════════════════════════════════════════════════════════
// Format DÉCLARATIF unique des actions rapides.
//   Une action = un objectif + les questions spécifiques à poser + la
//   directive de génération. `buildActionPrompt` assemble un prompt qui
//   dit au coach de poser CES questions via son outil de cartes
//   (ask_clarifying_questions → CoachQuestionCard, cf. la photo), en
//   s'ADAPTANT à l'athlète et à sa demande (profondeur variable), puis de
//   générer. Même mécanisme in-chat pour toutes les actions ; la
//   complexité est portée par la spec (nb de questions + richesse du
//   `produce`), pas par un composant sur-mesure.
//
//   Migration progressive : sans spec ici, l'action garde son comportement
//   actuel (flow wizard ou prompt libre).
// ══════════════════════════════════════════════════════════════════

// Type de champ d'une question. Par défaut déduit : options → 'single' (ou
// 'multi' si note contient « plusieurs »), sinon 'text'. Le moteur unique
// (QuickActionFlow) sait rendre tous ces types en cartes natives.
export type QAKind = 'single' | 'multi' | 'text' | 'slider' | 'duration'

export interface QAItem {
  q: string                    // la question
  options?: string[]           // propositions (cartes) ; absent = réponse libre
  note?: string                // précision (ex. « plusieurs choix possibles », « optionnel »)
  kind?: QAKind                // force le type de champ
  // slider : bornes + libellés d'extrémités
  min?: number; max?: number; minLabel?: string; maxLabel?: string
  // duration : pills de minutes (ex. [30, 45, 60, 90])
  durations?: number[]
  multiline?: boolean          // text : zone multi-lignes
  optional?: boolean           // question sautable
  recommend?: string           // libellé de l'option à mettre en avant (badge « Recommandé »)
  prefill?: 'mainSport'        // pré-réponse depuis les données connues (ex. sport principal du profil)
}

// ── Adaptation au composant « cartes qui défilent » (CoachQuestionCard) ────
// Une action = un jeu de cartes de questions swipeables. On convertit chaque
// champ de la spec en question à options (durée → pills en options, curseur →
// options étiquetées, texte → carte sans option = champ libre).
export interface ClarifyQ {
  header: string
  question: string
  multiSelect: boolean
  options: { label: string; description?: string; recommended?: boolean }[]
  free?: boolean               // true = question à réponse libre (pas d'options)
  prefill?: 'mainSport'
}
const durLabel = (m: number) => (m >= 60 ? `${m / 60 === Math.floor(m / 60) ? m / 60 + ' h' : Math.floor(m / 60) + ' h' + String(m % 60).padStart(2, '0')}` : `${m} min`)

/** Convertit une spec en questions à cartes (pour CoachQuestionCard). */
export function specToClarifyQuestions(spec: QuickActionSpec, header: string): ClarifyQ[] {
  return spec.questions.map((it): ClarifyQ => {
    const multi = it.kind === 'multi' || (!!it.note && /plusieurs|multiple/i.test(it.note))
    let opts: string[] = []
    if (it.kind === 'duration' || it.durations?.length) opts = (it.durations ?? [30, 45, 60, 90]).map(durLabel)
    else if (it.kind === 'slider') {
      const lo = it.minLabel ?? 'Facile', hi = it.maxLabel ?? 'Difficile'
      opts = [lo, 'Modéré', hi]
    } else if (it.options?.length) opts = it.options
    const free = opts.length === 0
    return {
      header,
      question: it.q,
      multiSelect: multi,
      options: opts.map(label => ({ label, recommended: it.recommend ? label === it.recommend : false })),
      free,
      prefill: it.prefill,
    }
  })
}

export interface QuickActionSpec {
  key: string                  // = QuickAction.key
  objective: string            // ce que l'action produit (1 phrase)
  questions: QAItem[]          // questions décisives, spécifiques (peut être vide)
  produce: string              // directive de génération finale
}

/** Assemble le prompt envoyé au coach : intelligent + adaptatif, questions via cartes, puis génération. */
export function buildActionPrompt(spec: QuickActionSpec): string {
  const hasQ = spec.questions.length > 0
  const qs = hasQ
    ? spec.questions.map((x, i) => {
        const opts = x.options?.length ? ` — propositions : ${x.options.join(' · ')}` : ' — réponse libre'
        const note = x.note ? ` (${x.note})` : ''
        return `${i + 1}. ${x.q}${opts}${note}`
      }).join('\n')
    : ''

  return [
    `[ACTION RAPIDE] Objectif : ${spec.objective}`,
    '',
    "Adapte-toi à MON niveau, MES données et MA demande : sois fin et approfondi si le cas est complexe, direct si c'est simple. Ne pose que ce qui est réellement décisif et ne redemande jamais une donnée déjà connue (profil, historique, zones, calendrier).",
    hasQ
      ? "Avant de générer, pose-moi les questions ci-dessous VIA ton outil de cartes de clarification (ask_clarifying_questions), regroupées en UN SEUL appel, avec les options indiquées + « Autre » en réponse libre. SAUTE celles dont tu connais déjà la réponse.\n\nQuestions à poser :\n" + qs
      : "Si une information décisive te manque, demande-la d'abord via ton outil de cartes de clarification (ask_clarifying_questions). Sinon, réponds directement à partir de mes données.",
    '',
    `Résultat attendu : ${spec.produce}`,
  ].join('\n')
}

// ── Registre des actions migrées ────────────────────────────────────
export const QUICK_ACTION_SPECS: Record<string, QuickActionSpec> = {
  // ─── Objectif / programme (référence) ───
  prise_de_masse: {
    key: 'prise_de_masse',
    objective: "un programme complet de PRISE DE MASSE (hypertrophie) + les apports nutritionnels associés",
    questions: [
      { q: 'Quel est ton niveau en musculation ?', options: ['Débutant', 'Intermédiaire', 'Avancé'] },
      { q: 'Combien de séances par semaine peux-tu faire ?', options: ['3', '4', '5', '6'] },
      { q: 'Quel matériel as-tu ?', options: ['Salle complète', 'Haltères', 'Barre', 'Poids du corps', 'Élastiques'], note: 'plusieurs choix possibles' },
      { q: 'Une contrainte ou une préférence à respecter ?', note: 'ex : dos sensible, max 1 h/séance, objectif de poids…' },
    ],
    produce: "un programme structuré (répartition des séances sur la semaine, exercices avec séries/répétitions/repos, schéma de progression) + un plan nutritionnel cohérent (calories + macros), en t'appuyant sur mes données déjà connues.",
  },

  // NB. weakpoints, analyser_semaine, analyser_recuperation, analyser_progression,
  // conseils_sommeil et app_guide ont chacun un FLOW dédié riche (WeakpointsFlow,
  // WeekAnalysisFlow, RecoveryAnalysisFlow, AnalyserProgressionFlow, SleepAdviceFlow,
  // AppGuideFlow) : on NE leur met PAS de spec ici, pour que ce flow (la référence)
  // reste prioritaire. Le moteur générique ne couvre que les actions SANS flow riche.

  // ═══════════════════════════════════════════════════════════════
  // PROGRAMMES (plusieurs semaines) — objectif clair, 2-3 questions décisives.
  // ═══════════════════════════════════════════════════════════════
  programme_cardio: {
    key: 'programme_cardio',
    objective: 'un programme cardio progressif pour développer mon endurance et mon moteur aérobie',
    questions: [
      { q: 'Ton objectif cardio principal ?', options: ['Endurance de base', 'Perdre du gras', 'Préparer une course', 'VO2max / vitesse'] },
      { q: 'Sport(s) support ?', options: ['Course', 'Vélo', 'Rameur', 'Natation', 'Indifférent'], note: 'plusieurs choix possibles' },
      { q: 'Combien de séances cardio par semaine ?', options: ['2', '3', '4', '5+'] },
      { q: 'Durée par séance en moyenne ?', kind: 'duration', durations: [30, 45, 60, 90] },
      { q: 'Sur combien de semaines ?', options: ['4', '8', '12', '16'] },
      { q: 'Ton niveau actuel ?', options: ['Débutant', 'Intermédiaire', 'Avancé'] },
      { q: 'Une contrainte à respecter ?', note: 'optionnel — ex : genou sensible, pas de fractionné dur, chaleur…' },
    ],
    produce: "un programme polarisé (endurance fondamentale, seuil, VO2max) sur la durée choisie, séances clés semaine par semaine avec durées et zones cibles (FC/allure/puissance selon MES zones), montée de charge, semaines d'assimilation, et comment tester ma progression.",
  },
  perte_de_poids: {
    key: 'perte_de_poids',
    objective: 'une stratégie de recomposition (perte de gras) : entraînement + déficit maîtrisé',
    questions: [
      { q: 'Ton point de départ / objectif de poids ?', note: 'ex : -5 kg en 3 mois, garder le muscle…' },
      { q: 'Combien de séances par semaine ?', options: ['2', '3', '4', '5+'] },
      { q: 'Une contrainte à respecter ?', note: 'ex : blessure, temps limité, régime particulier' },
    ],
    produce: "un plan combinant entraînement (mix force + cardio pour préserver le muscle) et cadrage nutritionnel (déficit raisonnable, protéines cibles g/kg), avec des repères de suivi hebdomadaires et des garde-fous pour ne pas casser la performance.",
  },
  reathletisation: {
    key: 'reathletisation',
    objective: 'un plan de reprise progressive (réathlétisation) après arrêt ou blessure',
    questions: [
      { q: 'Reprise après quoi ?', options: ['Blessure', 'Longue coupure', 'Maladie', 'Post-partum'] },
      { q: 'Depuis combien de temps es-tu à l\'arrêt / gêné ?', options: ['< 2 semaines', '2-6 semaines', '1-3 mois', '3 mois+'] },
      { q: 'Sport à reprendre en priorité ?', options: ['Course', 'Vélo', 'Muscu', 'Natation', 'Hyrox', 'Plusieurs'] },
      { q: 'Combien de séances par semaine au départ ?', options: ['2', '3', '4'] },
      { q: 'Une zone ou un mouvement encore sensible ?', note: 'optionnel' },
    ],
    produce: "un retour progressif et sécurisé sur plusieurs semaines : phases (reprise douce → volume → intensité), charge de départ prudente basée sur MES données, séances par semaine, critères pour passer à l'étape suivante, et signaux d'alerte pour ne pas rechuter.",
  },
  prepa_competition: {
    key: 'prepa_competition',
    objective: 'un plan de préparation ciblé vers ma prochaine compétition',
    questions: [
      { q: 'Quelle échéance / distance ?', note: 'si ce n\'est pas déjà dans mon calendrier' },
      { q: 'Combien de semaines avant l\'objectif ?', options: ['4', '8', '12', '16+'] },
      { q: 'Combien de séances par semaine ?', options: ['3', '4', '5', '6+'] },
      { q: 'Ton objectif de perf ?', options: ['Finir', 'Battre mon record', 'Viser un chrono précis', 'Jouer un classement'] },
      { q: 'Un point faible connu à travailler ?', note: 'optionnel — ex : fin de course, côtes, allure spécifique…' },
    ],
    produce: "une périodisation jusqu'au jour J : phases (développement → spécifique → affûtage), nombre de séances par semaine avec les séances clés, gestion de la charge et du taper, points de contrôle, en tenant compte de MA course dans le calendrier et de mon objectif.",
  },
  semaine_decharge: {
    key: 'semaine_decharge',
    objective: 'une semaine de décharge (récup) bien calibrée',
    questions: [],
    produce: "une semaine de décharge adaptée à ma charge récente : de combien réduire le volume/intensité, quelles séances garder pour ne pas perdre les acquis, et comment savoir que je suis rechargé — le tout à partir de ma charge et de ma récup actuelles.",
  },
  planifier_semaine: {
    key: 'planifier_semaine',
    objective: 'la planification de ma semaine d\'entraînement à venir',
    questions: [
      { q: 'Combien de jours dispo cette semaine ?', options: ['2', '3', '4', '5', '6'] },
      { q: 'Sport(s) de la semaine ?', options: ['Course', 'Vélo', 'Natation', 'Muscu', 'Hyrox'], note: 'plusieurs choix possibles' },
      { q: 'Priorité de la semaine ?', options: ['Volume', 'Intensité', 'Récup', 'Équilibre'] },
      { q: 'Volume horaire visé ?', options: ['< 4 h', '4-6 h', '6-9 h', '9 h+'], note: 'optionnel' },
      { q: 'Des jours imposés (off / obligatoires) ?', note: 'optionnel — ex : repos le lundi, long le dimanche…' },
    ],
    produce: "une semaine jour par jour cohérente avec ma forme, ma charge récente et mes objectifs : type de séance par jour et par sport, intensité, alternance dur/facile, respect des jours imposés, prête à poser dans mon planning.",
  },
  reajuster_plan: {
    key: 'reajuster_plan',
    objective: 'un réajustement de mon plan quand la réalité a changé',
    questions: [
      { q: 'Qu\'est-ce qui a changé ?', options: ['Séance(s) manquée(s)', 'Fatigue / méforme', 'Emploi du temps', 'Petite douleur', 'Regain de forme'], note: 'plusieurs choix possibles' },
      { q: 'Sur quel horizon je réajuste ?', options: ['Les 3 prochains jours', 'Cette semaine', 'Les 2 prochaines semaines'] },
      { q: 'Une priorité à préserver ?', options: ['Ma course cible', 'Le volume', 'La récup', 'Rester régulier'], note: 'optionnel' },
    ],
    produce: "un plan corrigé sur l'horizon choisi qui absorbe le changement sans casser la progression : ce qu'on décale, allège ou remplace, et pourquoi, à partir de mon planning et de ma forme actuelle, en préservant ma priorité.",
  },

  // ═══════════════════════════════════════════════════════════════
  // SÉANCES (une séance) — durée / matériel / intensité décisifs.
  // ═══════════════════════════════════════════════════════════════
  seance_du_jour: {
    key: 'seance_du_jour',
    objective: 'LA séance à faire aujourd\'hui, adaptée à ma forme du jour',
    questions: [
      { q: 'Quel sport aujourd\'hui ?', options: ['Course', 'Vélo', 'Muscu / Renfo', 'Natation', 'Hyrox', 'Peu importe — surprends-moi'] },
      { q: 'Combien de temps as-tu ?', kind: 'duration', durations: [30, 45, 60, 90, 120] },
      { q: 'Ta forme du jour ?', kind: 'slider', min: 1, max: 5, minLabel: 'Cramé', maxLabel: 'En feu', note: '1 = fatigué · 5 = frais et prêt' },
      { q: 'Une intention pour aujourd\'hui ?', options: ['Suivre mon planning', 'Du facile / récup', 'De la qualité (intensité)', 'Du volume'], recommend: 'Suivre mon planning', note: 'optionnel' },
      { q: 'Une contrainte du jour ?', note: 'optionnel — ex : petite gêne, pas de salle, chaleur…' },
    ],
    produce: "une séance prête à exécuter (échauffement, corps de séance, retour au calme, zones/allures/watts cibles selon MES zones), calibrée sur ma forme du jour et ce qui est prévu dans mon planning. Ajoute un profil d'intensité en graphique quand c'est pertinent.",
  },
  peu_de_temps: {
    key: 'peu_de_temps',
    objective: 'une séance efficace quand j\'ai très peu de temps',
    questions: [
      { q: 'Tu as combien de temps, vraiment ?', kind: 'duration', durations: [10, 15, 20, 30] },
      { q: 'Plutôt quel type ?', options: ['Cardio', 'Force', 'Mixte / HIIT'] },
      { q: 'Matériel dispo ?', options: ['Rien / poids du corps', 'Haltères', 'Home-trainer / tapis', 'Salle'] },
      { q: 'Intensité acceptable ?', kind: 'slider', min: 1, max: 5, minLabel: 'Doux', maxLabel: 'À fond' },
    ],
    produce: "une séance courte à haut rendement (format, blocs minutés, intensités) qui maximise le bénéfice dans le temps donné, réalisable avec le matériel indiqué.",
  },
  sans_materiel: {
    key: 'sans_materiel',
    objective: 'une séance sans aucun matériel (poids du corps)',
    questions: [
      { q: 'Durée dispo ?', kind: 'duration', durations: [15, 20, 30, 45] },
      { q: 'Focus ?', options: ['Full body', 'Haut du corps', 'Bas du corps', 'Gainage / core', 'Cardio'] },
      { q: 'Format préféré ?', options: ['Circuit (AMRAP/EMOM)', 'Séries classiques', 'Tabata / HIIT', 'Choisis pour moi'] },
      { q: 'Niveau de difficulté ?', kind: 'slider', min: 1, max: 5, minLabel: 'Facile', maxLabel: 'Costaud' },
    ],
    produce: "une séance au poids du corps structurée (échauffement, circuits/séries avec reps ou temps, repos, progressions/régressions selon mon niveau), sans matériel.",
  },
  indoor: {
    key: 'indoor',
    objective: 'une séance à faire en intérieur (maison / home-trainer / tapis)',
    questions: [
      { q: 'Avec quoi t\'entraînes-tu en intérieur ?', options: ['Home-trainer', 'Tapis', 'Rameur', 'Rien / poids du corps'] },
      { q: 'Durée ?', kind: 'duration', durations: [30, 45, 60] },
      { q: 'Objectif ?', options: ['Endurance', 'Seuil / qualité', 'VO2 / intensité', 'Récup'] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Tranquille', maxLabel: 'Costaud' },
    ],
    produce: "une séance indoor guidée bloc par bloc (intensités précises adaptées au support et à MES zones), pensée pour rester efficace et pas ennuyeuse en intérieur, avec un profil d'intensité en graphique.",
  },
  recup_active: {
    key: 'recup_active',
    objective: 'une séance de récupération active bien dosée',
    questions: [
      { q: 'Support pour ta récup ?', options: ['Marche', 'Vélo très facile', 'Footing lent', 'Natation', 'Mobilité / yoga'] },
      { q: 'Durée ?', kind: 'duration', durations: [20, 30, 45] },
    ],
    produce: "une séance de récup active courte et vraiment facile (intensité plafonnée, durée, contenu) qui accélère la récup sans ajouter de fatigue, calée sur mon état de forme actuel.",
  },
  echauffement: {
    key: 'echauffement',
    objective: 'un échauffement adapté à ma séance',
    questions: [
      { q: 'Échauffement pour quel type d\'effort ?', options: ['Endurance', 'Fractionné / vitesse', 'Force / muscu', 'Compétition'] },
      { q: 'Pour quel sport ?', options: ['Course', 'Vélo', 'Muscu', 'Hyrox', 'Natation', 'Autre'] },
      { q: 'Temps dispo pour t\'échauffer ?', kind: 'duration', durations: [10, 15, 20] },
    ],
    produce: "un protocole d'échauffement progressif et précis (mobilité, montée en intensité, gammes/activation spécifiques au sport et à l'effort), calibré pour préparer exactement l'effort visé sans fatiguer.",
  },
  seance_force: {
    key: 'seance_force',
    objective: 'une séance de force / musculation ciblée',
    questions: [
      { q: 'Focus de la séance ?', options: ['Full body', 'Haut', 'Bas', 'Poussée', 'Tirage', 'Force spécifique sport'] },
      { q: 'Matériel dispo ?', options: ['Salle complète', 'Haltères', 'Barre', 'Poids du corps', 'Kettlebells', 'Élastiques'], note: 'plusieurs choix possibles' },
      { q: 'Durée dispo ?', kind: 'duration', durations: [30, 45, 60, 75] },
      { q: 'Objectif d\'intensité ?', options: ['Force max (lourd)', 'Hypertrophie (volume)', 'Force-endurance', 'Explosivité'] },
      { q: 'Une contrainte ?', note: 'optionnel — ex : dos sensible, pas de sauts, épaule…' },
    ],
    produce: "une séance de force structurée (échauffement, exercices avec séries × répétitions, charges en %1RM ou RPE, repos, tempo) adaptée à mon niveau, mon sport principal, mon matériel et mon objectif d'intensité.",
  },
  renforcement: {
    key: 'renforcement',
    objective: 'une séance de renforcement / prévention pour soutenir mon sport',
    questions: [
      { q: 'Renforcement orienté quoi ?', options: ['Prévention blessure', 'Gainage / core', 'Stabilité', 'Explosivité', 'Général'] },
      { q: 'Pour quel sport le renforcer ?', options: ['Course', 'Vélo', 'Natation', 'Hyrox', 'Général'] },
      { q: 'Durée dispo ?', kind: 'duration', durations: [15, 20, 30, 45] },
      { q: 'Matériel dispo ?', options: ['Poids du corps', 'Élastiques', 'Haltères', 'Salle'], note: 'plusieurs choix possibles' },
    ],
    produce: "une séance de renforcement ciblée (exercices, dosage séries/reps/temps, exécution) qui complète mon entraînement principal et réduit mes risques de blessure, adaptée au sport visé et à mon matériel.",
  },
  desequilibre: {
    key: 'desequilibre',
    objective: 'corriger un déséquilibre musculaire ou une asymétrie',
    questions: [
      { q: 'Quel déséquilibre ressens-tu ?', note: 'ex : jambe gauche plus faible, dominante quadri, épaule…' },
    ],
    produce: "un mini-plan correctif : exercices unilatéraux/ciblés, dosage et fréquence, et comment réévaluer l'asymétrie dans le temps, en tenant compte de mon historique.",
  },
  wod_hyrox: {
    key: 'wod_hyrox',
    objective: 'un WOD / une séance type Hyrox',
    questions: [
      { q: 'Objectif de la séance ?', options: ['Endurance de force', 'Stations spécifiques', 'Simulation course', 'Intensité / gaz'] },
      { q: 'Durée dispo ?', kind: 'duration', durations: [30, 45, 60] },
      { q: 'Matériel dispo ?', options: ['Sled', 'Wall balls', 'Rameur / skierg', 'Kettlebells', 'Sac / sandbag', 'Poids du corps'], note: 'plusieurs choix possibles' },
      { q: 'Stations à cibler en priorité ?', note: 'optionnel — ex : sled push, burpees broad jumps, wall balls…' },
    ],
    produce: "une séance Hyrox structurée (échauffement, blocs avec stations + charges + reps, transitions run/station, intensités) adaptée à mon niveau, à l'objectif et au matériel dispo.",
  },
  velo_endurance: {
    key: 'velo_endurance',
    objective: 'une séance vélo d\'endurance (Z2)',
    questions: [
      { q: 'Durée dispo ?', kind: 'duration', durations: [60, 90, 120, 180] },
      { q: 'Où roules-tu ?', options: ['Home-trainer', 'Route / extérieur'] },
      { q: 'Ajouter une touche de qualité ?', options: ['Non, 100 % foncier', 'Quelques accélérations', 'Un peu de tempo / sweet spot'], note: 'optionnel' },
      { q: 'Une contrainte ?', note: 'optionnel — ex : vent, jambes fraîches, cadence à travailler…' },
    ],
    produce: "une séance vélo d'endurance en zone 2 (durée, fenêtre de puissance/FC selon MES zones, cadence, éventuelles touches de qualité si demandé), pensée pour développer le foncier, avec un profil d'intensité en graphique.",
  },
  velo_seuil: {
    key: 'velo_seuil',
    objective: 'une séance vélo au seuil (FTP)',
    questions: [
      { q: 'Temps total dispo (échauffement inclus) ?', kind: 'duration', durations: [60, 75, 90] },
      { q: 'Format d\'intervalles ?', options: ['Longs (2×20, 3×15)', 'Sweet spot (3×12-15)', 'Over-unders', 'Choisis pour moi'] },
      { q: 'Où roules-tu ?', options: ['Home-trainer', 'Route / extérieur'] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Prudent', maxLabel: 'Costaud' },
    ],
    produce: "une séance seuil vélo (échauffement, format d'intervalles + puissance cible autour de MA FTP, récup, volume total au seuil, retour au calme) calibrée sur mes zones, avec un profil d'intensité en graphique.",
  },
  velo_vo2: {
    key: 'velo_vo2',
    objective: 'une séance vélo VO2max',
    questions: [
      { q: 'Format préféré ?', options: ['Courts (30/30, 40/20)', 'Moyens (3-5 min)', 'Micro-intervalles', 'Choisis pour moi'] },
      { q: 'Temps total dispo ?', kind: 'duration', durations: [50, 60, 75] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Découverte', maxLabel: 'Costaud' },
      { q: 'Où roules-tu ?', options: ['Home-trainer', 'Route / extérieur'] },
    ],
    produce: "une séance VO2max vélo complète (échauffement, répétitions à haute intensité + puissance cible et ratio effort/récup, retour au calme) adaptée à MES zones et à ma fraîcheur, avec un profil d'intensité en graphique.",
  },
  run_ef: {
    key: 'run_ef',
    objective: 'une sortie course en endurance fondamentale',
    questions: [
      { q: 'Durée dispo ?', kind: 'duration', durations: [30, 45, 60, 90] },
      { q: 'Terrain ?', options: ['Plat / route', 'Vallonné / nature', 'Tapis'] },
      { q: 'Ajouter en fin de sortie ?', options: ['Rien', 'Quelques lignes droites', 'Côtes courtes', 'Gammes'], note: 'optionnel' },
      { q: 'Une contrainte ?', note: 'optionnel — ex : reprise, chaleur, jambes lourdes…' },
    ],
    produce: "une sortie EF (durée, allure/FC cible selon MES zones, terrain, éventuel travail de fin de sortie si demandé) pour construire le foncier sans dériver.",
  },
  run_seuil: {
    key: 'run_seuil',
    objective: 'une séance course au seuil',
    questions: [
      { q: 'Temps total dispo (échauffement inclus) ?', kind: 'duration', durations: [40, 60, 75] },
      { q: 'Format ?', options: ['Seuil continu (tempo)', 'Fractions au seuil (ex. 4-6×5\')', 'Progressif', 'Choisis pour moi'] },
      { q: 'Terrain ?', options: ['Piste', 'Route / plat', 'Tapis'] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Prudent', maxLabel: 'Costaud' },
    ],
    produce: "une séance seuil course complète (échauffement, format + allure cible au seuil selon MES zones, récup, volume total qualité, retour au calme), avec un profil d'intensité en graphique.",
  },
  run_vo2: {
    key: 'run_vo2',
    objective: 'une séance course VO2max / VMA',
    questions: [
      { q: 'Format d\'intervalles préféré ?', options: ['Courts (30/30, 200-400 m)', 'Moyens (400-1000 m)', 'Longs (1000-1600 m)', 'Peu importe — choisis pour moi'], recommend: 'Peu importe — choisis pour moi' },
      { q: 'Temps total dispo (échauffement inclus) ?', kind: 'duration', durations: [40, 50, 60, 75] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Découverte', maxLabel: 'Costaud', note: '1 = prudent · 5 = grosse séance' },
      { q: 'Où la fais-tu ?', options: ['Piste', 'Route / plat', 'Nature / vallonné', 'Tapis'], note: 'optionnel' },
      { q: 'Une contrainte ?', note: 'optionnel — ex : jambes lourdes, reprise, chaleur…' },
    ],
    produce: "une séance VMA/VO2max complète (échauffement, corps avec répétitions + allure cible en % VMA/allure et ratio effort/récup, retour au calme), calibrée sur MA VMA et ma fraîcheur, avec un profil d'intensité en graphique.",
  },
  run_power: {
    key: 'run_power',
    objective: 'une séance course pilotée en puissance (capteur de puissance à la course)',
    questions: [
      { q: 'Objectif de la séance ?', options: ['Endurance', 'Seuil', 'VO2max', 'Côtes / force'] },
      { q: 'Temps total dispo ?', kind: 'duration', durations: [40, 60, 75] },
      { q: 'Terrain ?', options: ['Plat', 'Vallonné', 'Tapis'] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Prudent', maxLabel: 'Costaud' },
    ],
    produce: "une séance course pilotée en puissance (échauffement, format + fenêtres de watts cibles selon MES zones de puissance course, récup, retour au calme), avec un profil d'intensité en graphique.",
  },

  // ═══════════════════════════════════════════════════════════════
  // ANALYSES (le coach lit mes données) — peu ou pas de questions.
  // ═══════════════════════════════════════════════════════════════
  derniere_activite: {
    key: 'derniere_activite', objective: 'une analyse de ma dernière activité', questions: [],
    produce: "une lecture concrète de ma dernière séance (charge, zones, allure/puissance, FC, dérive, points forts/faibles) et ce que j'en retiens pour la suite, avec des graphiques quand c'est parlant.",
  },
  bilan_mois: {
    key: 'bilan_mois', objective: 'un bilan de mon mois d\'entraînement', questions: [],
    produce: "un bilan mensuel : volume et charge par sport, tendance de forme, temps forts/faibles, adhérence au plan, et 2-3 axes pour le mois suivant, chiffrés depuis mon historique.",
  },
  surentrainement: {
    key: 'surentrainement', objective: 'vérifier si je montre des signes de surentraînement', questions: [],
    produce: "un état des lieux du risque de surcharge (charge aiguë vs chronique, HRV, sommeil, monotonie, ressenti) : verdict clair, signaux à surveiller, et quoi faire maintenant.",
  },
  derive_cardiaque: {
    key: 'derive_cardiaque', objective: 'analyser ma dérive cardiaque', questions: [],
    produce: "une lecture de ma dérive cardiaque sur mes sorties récentes (ce qu'elle vaut, ce qu'elle dit de mon endurance aérobie et de mon hydratation/chaleur) et comment l'améliorer.",
  },
  estimer_vo2max: {
    key: 'estimer_vo2max', objective: 'estimer mon VO2max à partir de mes données', questions: [],
    produce: "une estimation de mon VO2max déduite de mes performances (méthode utilisée, valeur, niveau relatif) et les leviers concrets pour le faire progresser.",
  },
  predire_chrono: {
    key: 'predire_chrono',
    objective: 'prédire un chrono réaliste sur une distance',
    questions: [
      { q: 'Sur quelle distance veux-tu une prédiction ?', options: ['5 km', '10 km', 'Semi', 'Marathon', 'Autre'] },
      { q: 'Pour quand ?', options: ['Aujourd\'hui (état actuel)', 'Dans 4 semaines', 'Dans 8-12 semaines', 'Jour de ma course'] },
      { q: 'Conditions attendues ?', options: ['Plat / idéal', 'Vallonné', 'Chaleur', 'Je ne sais pas'], note: 'optionnel' },
    ],
    produce: "une prédiction de chrono argumentée à partir de MES performances et de ma forme actuelle (fourchette réaliste, allure cible, effet des conditions et de l'échéance choisie, conditions pour la tenir).",
  },

  // ═══════════════════════════════════════════════════════════════
  // NUTRITION (ponctuelle) — ciblée, actionnable.
  // ═══════════════════════════════════════════════════════════════
  nutrition_effort: {
    key: 'nutrition_effort',
    objective: 'ma stratégie nutritionnelle pendant l\'effort',
    questions: [
      { q: 'Pour quel type d\'effort ?', options: ['Sortie longue', 'Course', 'Séance intense', 'Ultra'] },
      { q: 'Durée prévue de l\'effort ?', kind: 'duration', durations: [60, 90, 120, 180, 240] },
      { q: 'Ce que tu tolères / préfères ?', options: ['Gels', 'Boisson glucidique', 'Barres', 'Vrai food (solide)', 'Peu importe'], note: 'plusieurs choix possibles' },
      { q: 'Conditions ?', options: ['Tempéré', 'Chaleur', 'Froid'], note: 'optionnel' },
    ],
    produce: "un plan d'apport pendant l'effort (glucides/h, hydratation, sodium, timing, produits selon mes préférences) adapté à la durée, l'intensité et les conditions, avec un exemple concret minuté.",
  },
  hydratation: {
    key: 'hydratation', objective: 'un plan d\'hydratation adapté', questions: [
      { q: 'Contexte ?', options: ['Au quotidien', 'Autour de l\'effort', 'Chaleur', 'Compétition'] },
      { q: 'Tu transpires beaucoup ?', kind: 'slider', min: 1, max: 5, minLabel: 'Peu', maxLabel: 'Énormément' },
      { q: 'Un souci constaté ?', options: ['Crampes', 'Coup de moins bien', 'Rien de précis'], note: 'optionnel' },
    ],
    produce: "des repères d'hydratation concrets (quantités, timing, électrolytes/sodium) adaptés au contexte, à mon niveau de sudation et à mon volume d'entraînement.",
  },
  repas_post: {
    key: 'repas_post', objective: 'quoi manger après ma séance pour bien récupérer', questions: [
      { q: 'La séance était plutôt ?', options: ['Endurance longue', 'Intense / qualité', 'Force / muscu'] },
      { q: 'Objectif prioritaire après ?', options: ['Récupérer vite', 'Prendre du muscle', 'Rester léger / perte de gras'] },
      { q: 'Une contrainte alimentaire ?', options: ['Aucune', 'Végé / vegan', 'Sans lactose', 'Sans gluten'], note: 'optionnel' },
    ],
    produce: "une recommandation de repas/collation post-séance (fenêtre, protéines + glucides cibles, exemples concrets adaptés à ma contrainte alimentaire) pour optimiser la récup selon le type d'effort et mon objectif.",
  },
  besoins_macros: {
    key: 'besoins_macros', objective: 'mes besoins en calories et macros', questions: [
      { q: 'Objectif actuel ?', options: ['Maintien', 'Prise de muscle', 'Perte de gras', 'Performance'] },
      { q: 'Régime particulier ?', options: ['Aucun', 'Végé / vegan', 'Low-carb', 'Autre'], note: 'optionnel' },
      { q: 'Nombre de repas/jour préféré ?', options: ['2', '3', '4', '5+'], note: 'optionnel' },
    ],
    produce: "une estimation de mes besoins (calories, protéines/glucides/lipides en g et g/kg) selon mon objectif, mon régime et ma dépense d'entraînement, avec une répartition sur mes repas simple à suivre.",
  },

  // ═══════════════════════════════════════════════════════════════
  // SANTÉ / RÉCUP / MENTAL.
  // ═══════════════════════════════════════════════════════════════
  douleur_blessure: {
    key: 'douleur_blessure',
    objective: 'comprendre une douleur et savoir comment adapter',
    questions: [
      { q: 'Où as-tu mal ?', note: 'zone précise' },
      { q: 'Depuis quand et dans quel contexte ?', note: 'ex : depuis 3 jours, après une sortie longue' },
      { q: 'Intensité de la douleur ?', kind: 'slider', min: 1, max: 10, minLabel: 'Légère', maxLabel: 'Vive' },
      { q: 'Elle apparaît quand ?', options: ['Au repos', 'Au début de l\'effort', 'Pendant / après l\'effort', 'Tout le temps'] },
    ],
    produce: "une lecture prudente de la douleur (pistes possibles, drapeaux rouges qui imposent un avis médical selon l'intensité et le comportement décrits), comment adapter mon entraînement en attendant, et des pistes de reprise — sans poser de diagnostic médical.",
  },
  etirements: {
    key: 'etirements', objective: 'une routine d\'étirements / mobilité adaptée', questions: [
      { q: 'Objectif ?', options: ['Après séance', 'Mobilité générale', 'Zone raide précise', 'Détente / sommeil'] },
      { q: 'Zone(s) à cibler ?', options: ['Hanches', 'Ischios', 'Mollets', 'Dos', 'Épaules', 'Chevilles'], note: 'plusieurs choix possibles' },
      { q: 'Temps dispo ?', kind: 'duration', durations: [5, 10, 15, 20] },
    ],
    produce: "une routine d'étirements/mobilité guidée (mouvements, durées, respiration) ciblée sur l'objectif, les zones choisies et les sollicitations de mes sports, tenant dans le temps dispo.",
  },
  gestion_stress: {
    key: 'gestion_stress', objective: 'gérer mon stress pour mieux récupérer et performer', questions: [
      { q: 'Le stress vient surtout ?', options: ['Compétition', 'Charge de vie', 'Sommeil / mental', 'Rien de précis'] },
      { q: 'Comment il te touche ?', options: ['Sommeil', 'Tension / respiration', 'Motivation', 'Récup / HRV'], note: 'plusieurs choix possibles' },
      { q: 'Combien de temps par jour peux-tu y consacrer ?', kind: 'duration', durations: [5, 10, 15] },
    ],
    produce: "des stratégies concrètes et actionnables (respiration, routine, gestion de la charge mentale, lien avec l'entraînement et le sommeil) priorisées selon ma situation et tenant dans le temps que je peux y mettre.",
  },
  expliquer_concept: {
    key: 'expliquer_concept', objective: 'm\'expliquer clairement un concept d\'entraînement', questions: [
      { q: 'Quel concept veux-tu comprendre ?', note: 'ex : CTL/ATL/TSB, seuil, polarisation, VO2max…' },
    ],
    produce: "une explication claire et imagée du concept, avec un exemple tiré de MES données quand c'est possible, et pourquoi ça compte pour ma pratique.",
  },
  // app_guide : garde son AppGuideFlow (pas de spec, cf. note plus haut).
}

export function hasQuickActionSpec(key: string): boolean {
  return Boolean(QUICK_ACTION_SPECS[key])
}
