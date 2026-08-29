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

  // ─── Analyses (le coach lit mes données ; peu ou pas de questions) ───
  analyser_semaine: {
    key: 'analyser_semaine',
    objective: "un bilan clair de ma semaine d'entraînement (charge, équilibre, risques)",
    questions: [],
    produce: "un bilan de ma semaine : charge totale et répartition par sport/intensité, équilibre entraînement/récupération, points forts, signaux de risque (surcharge, monotonie), et 2-3 recommandations concrètes pour la suite.",
  },
  analyser_recuperation: {
    key: 'analyser_recuperation',
    objective: "une analyse de mon état de forme et de ma récupération",
    questions: [],
    produce: "une lecture de ma récupération (HRV, sommeil, fatigue, charge récente), un état de forme global, et des recommandations concrètes (faut-il pousser, maintenir ou lever le pied) pour les prochains jours.",
  },
  analyser_progression: {
    key: 'analyser_progression',
    objective: "une analyse de l'évolution de mes performances dans le temps",
    questions: [
      { q: 'Sur quelle période veux-tu que j\'analyse ta progression ?', options: ['4 semaines', '3 mois', '6 mois', '1 an'] },
      { q: 'Un sport ou un aspect en particulier ?', options: ['Vue globale', 'Course', 'Vélo', 'Natation', 'Force'], note: 'optionnel' },
    ],
    produce: "une analyse d'évolution : tendances clés (progrès, stagnations, régressions) chiffrées à partir de mon historique, ce qui les explique, et les leviers prioritaires pour continuer à progresser.",
  },
  weakpoints: {
    key: 'weakpoints',
    objective: "l'identification de mes points faibles et de mes lacunes prioritaires",
    questions: [
      { q: 'Sur quel angle veux-tu que je cherche tes points faibles ?', options: ['Vue globale', 'Endurance', 'Force / puissance', 'Vitesse / seuil', 'Récupération', 'Technique'] },
    ],
    produce: "une analyse croisée de mes données révélant mes 2-3 points faibles prioritaires, pourquoi ce sont des freins, et un plan concret pour les corriger.",
  },
  conseils_sommeil: {
    key: 'conseils_sommeil',
    objective: "des conseils personnalisés pour mieux récupérer la nuit",
    questions: [
      { q: 'Quel est ton principal souci de sommeil en ce moment ?', options: ['Difficile de m\'endormir', 'Réveils nocturnes', 'Sommeil trop court', 'Réveil fatigué', 'Rien de précis'] },
    ],
    produce: "des recommandations sommeil concrètes et personnalisées (routine, timing, environnement, lien avec l'entraînement), priorisées et actionnables dès ce soir.",
  },

  // ═══════════════════════════════════════════════════════════════
  // PROGRAMMES (plusieurs semaines) — objectif clair, 2-3 questions décisives.
  // ═══════════════════════════════════════════════════════════════
  programme_cardio: {
    key: 'programme_cardio',
    objective: 'un programme cardio progressif pour développer mon endurance et mon moteur aérobie',
    questions: [
      { q: 'Ton objectif cardio principal ?', options: ['Endurance de base', 'Perdre du gras', 'Préparer une course', 'VO2max / vitesse'] },
      { q: 'Combien de séances cardio par semaine ?', options: ['2', '3', '4', '5+'] },
      { q: 'Sport(s) support ?', options: ['Course', 'Vélo', 'Rameur', 'Natation', 'Indifférent'], note: 'plusieurs choix possibles' },
    ],
    produce: "un programme polarisé sur 8-12 semaines (endurance fondamentale, seuil, VO2max), séances clés semaine par semaine avec durées et zones cibles (FC/allure/puissance selon mes zones), montée de charge, semaines d'assimilation, et comment tester ma progression.",
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
      { q: 'Depuis combien de temps es-tu à l\'arrêt / gêné ?', note: 'approximatif' },
      { q: 'Une zone ou un mouvement encore sensible ?', note: 'optionnel' },
    ],
    produce: "un retour progressif et sécurisé : phases (reprise douce → volume → intensité), charge de départ prudente basée sur mes données, critères pour passer à l'étape suivante, et signaux d'alerte pour ne pas rechuter.",
  },
  prepa_competition: {
    key: 'prepa_competition',
    objective: 'un plan de préparation ciblé vers ma prochaine compétition',
    questions: [
      { q: 'Quelle échéance / distance ?', note: 'si ce n\'est pas déjà dans mon calendrier' },
      { q: 'Combien de semaines avant l\'objectif ?', options: ['4', '8', '12', '16+'] },
      { q: 'Objectif de perf visé ?', note: 'chrono, finir, place… (optionnel)' },
    ],
    produce: "une périodisation jusqu'au jour J : phases (développement → spécifique → affûtage), séances clés par semaine, gestion de la charge et du taper, points de contrôle, en tenant compte de ma course dans le calendrier.",
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
      { q: 'Une priorité cette semaine ?', options: ['Volume', 'Intensité', 'Récup', 'Équilibre'], note: 'optionnel' },
    ],
    produce: "une semaine jour par jour cohérente avec ma forme, ma charge récente et mes objectifs : type de séance par jour, intensité, alternance dur/facile, prête à poser dans mon planning.",
  },
  reajuster_plan: {
    key: 'reajuster_plan',
    objective: 'un réajustement de mon plan quand la réalité a changé',
    questions: [
      { q: 'Qu\'est-ce qui a changé ?', options: ['Séance(s) manquée(s)', 'Fatigue / méforme', 'Emploi du temps', 'Petite douleur', 'Regain de forme'] },
    ],
    produce: "un plan corrigé pour les prochains jours qui absorbe le changement sans casser la progression : ce qu'on décale, allège ou remplace, et pourquoi, à partir de mon planning et de ma forme actuelle.",
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
      { q: 'Une intention pour aujourd\'hui ?', options: ['Suivre mon planning', 'Du facile / récup', 'De la qualité (intensité)', 'Du volume'], note: 'optionnel' },
      { q: 'Une contrainte du jour ?', note: 'optionnel — ex : petite gêne, pas de salle, chaleur…' },
    ],
    produce: "une séance prête à exécuter (échauffement, corps de séance, retour au calme, zones/allures/watts cibles selon MES zones), calibrée sur ma forme du jour et ce qui est prévu dans mon planning. Ajoute un profil d'intensité en graphique quand c'est pertinent.",
  },
  peu_de_temps: {
    key: 'peu_de_temps',
    objective: 'une séance efficace quand j\'ai très peu de temps',
    questions: [
      { q: 'Tu as combien de temps, vraiment ?', options: ['15 min', '20 min', '30 min'] },
      { q: 'Plutôt quel type ?', options: ['Cardio', 'Force', 'Mixte / HIIT'] },
    ],
    produce: "une séance courte à haut rendement (format, blocs, intensités) qui maximise le bénéfice dans le temps donné, réalisable avec ce que j'ai sous la main.",
  },
  sans_materiel: {
    key: 'sans_materiel',
    objective: 'une séance sans aucun matériel (poids du corps)',
    questions: [
      { q: 'Durée dispo ?', options: ['20 min', '30 min', '45 min'] },
      { q: 'Focus ?', options: ['Full body', 'Haut du corps', 'Bas du corps', 'Gainage / core', 'Cardio'] },
    ],
    produce: "une séance au poids du corps structurée (circuits, séries/répétitions ou temps, repos, progressions/régressions selon mon niveau), sans matériel.",
  },
  indoor: {
    key: 'indoor',
    objective: 'une séance à faire en intérieur (maison / home-trainer / tapis)',
    questions: [
      { q: 'Avec quoi t\'entraînes-tu en intérieur ?', options: ['Home-trainer', 'Tapis', 'Rameur', 'Rien / poids du corps'] },
      { q: 'Durée ?', options: ['30 min', '45 min', '1 h'] },
    ],
    produce: "une séance indoor guidée bloc par bloc (intensités précises adaptées au support et à mes zones), pensée pour rester efficace et pas ennuyeuse en intérieur.",
  },
  recup_active: {
    key: 'recup_active',
    objective: 'une séance de récupération active bien dosée',
    questions: [],
    produce: "une séance de récup active courte et vraiment facile (intensité plafonnée, durée, contenu) qui accélère la récup sans ajouter de fatigue, calée sur mon état de forme actuel.",
  },
  echauffement: {
    key: 'echauffement',
    objective: 'un échauffement adapté à ma séance',
    questions: [
      { q: 'Échauffement pour quel type d\'effort ?', options: ['Endurance', 'Fractionné / vitesse', 'Force / muscu', 'Compétition'] },
    ],
    produce: "un protocole d'échauffement progressif et précis (mobilité, montée en intensité, gammes/activation spécifiques), calibré pour préparer exactement l'effort visé sans fatiguer.",
  },
  seance_force: {
    key: 'seance_force',
    objective: 'une séance de force / musculation ciblée',
    questions: [
      { q: 'Focus de la séance ?', options: ['Full body', 'Haut', 'Bas', 'Poussée', 'Tirage', 'Force spécifique sport'] },
      { q: 'Matériel dispo ?', options: ['Salle complète', 'Haltères', 'Barre', 'Poids du corps'], note: 'plusieurs choix possibles' },
    ],
    produce: "une séance de force structurée (exercices, séries × répétitions, charges en %1RM ou RPE, repos, tempo) adaptée à mon niveau et à mon sport principal.",
  },
  renforcement: {
    key: 'renforcement',
    objective: 'une séance de renforcement / prévention pour soutenir mon sport',
    questions: [
      { q: 'Renforcement orienté quoi ?', options: ['Prévention blessure', 'Gainage / core', 'Stabilité', 'Explosivité', 'Général'] },
    ],
    produce: "une séance de renforcement ciblée (exercices, dosage, exécution) qui complète mon entraînement principal et réduit mes risques de blessure, adaptée à mes sports.",
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
      { q: 'Durée / matériel ?', note: 'ex : 45 min, sled + wall balls…' },
    ],
    produce: "une séance Hyrox structurée (blocs, stations, charges, transitions run/station, intensités) adaptée à mon niveau et à l'objectif choisi.",
  },
  velo_endurance: {
    key: 'velo_endurance',
    objective: 'une séance vélo d\'endurance (Z2)',
    questions: [{ q: 'Durée dispo ?', options: ['1 h', '1 h 30', '2 h', '3 h+'] }],
    produce: "une séance vélo d'endurance en zone 2 (durée, fenêtre de puissance/FC selon mes zones, cadence, éventuelles touches de tempo), pensée pour développer le foncier.",
  },
  velo_seuil: {
    key: 'velo_seuil',
    objective: 'une séance vélo au seuil (FTP)',
    questions: [{ q: 'Temps total dispo ?', options: ['1 h', '1 h 15', '1 h 30'] }],
    produce: "une séance seuil vélo (format d'intervalles, puissance cible autour de ma FTP, récup, volume total au seuil) calibrée sur mes zones actuelles.",
  },
  velo_vo2: {
    key: 'velo_vo2',
    objective: 'une séance vélo VO2max',
    questions: [{ q: 'Niveau de dureté visé ?', options: ['Découverte', 'Classique', 'Costaud'] }],
    produce: "une séance VO2max vélo (répétitions courtes à haute intensité, puissance cible, ratio effort/récup, volume) adaptée à mes zones et à ma fraîcheur du moment.",
  },
  run_ef: {
    key: 'run_ef',
    objective: 'une sortie course en endurance fondamentale',
    questions: [{ q: 'Durée dispo ?', options: ['30 min', '45 min', '1 h', '1 h 30+'] }],
    produce: "une sortie EF (durée, allure/FC cible selon mes zones, terrain, éventuelles lignes droites en fin) pour construire le foncier sans dériver.",
  },
  run_seuil: {
    key: 'run_seuil',
    objective: 'une séance course au seuil',
    questions: [{ q: 'Temps total dispo ?', options: ['40 min', '1 h', '1 h 15'] }],
    produce: "une séance seuil course (format, allure cible au seuil selon mes zones, récup, volume total qualité) avec échauffement et retour au calme.",
  },
  run_vo2: {
    key: 'run_vo2',
    objective: 'une séance course VO2max / VMA',
    questions: [
      { q: 'Format d\'intervalles préféré ?', options: ['Courts (30/30, 200-400 m)', 'Moyens (400-1000 m)', 'Longs (1000-1600 m)', 'Peu importe — choisis pour moi'] },
      { q: 'Temps total dispo (échauffement inclus) ?', kind: 'duration', durations: [40, 50, 60, 75] },
      { q: 'Dureté visée ?', kind: 'slider', min: 1, max: 5, minLabel: 'Découverte', maxLabel: 'Costaud', note: '1 = prudent · 5 = grosse séance' },
      { q: 'Où la fais-tu ?', options: ['Piste', 'Route / plat', 'Nature / vallonné', 'Tapis'], note: 'optionnel' },
      { q: 'Une contrainte ?', note: 'optionnel — ex : jambes lourdes, reprise, chaleur…' },
    ],
    produce: "une séance VMA/VO2max complète (échauffement, corps avec répétitions + allure cible en % VMA/allure et ratio effort/récup, retour au calme), calibrée sur MA VMA et ma fraîcheur, avec un profil d'intensité en graphique.",
  },
  run_power: {
    key: 'run_power',
    objective: 'une séance course en puissance (capteur de puissance à la course)',
    questions: [{ q: 'Objectif ?', options: ['Endurance', 'Seuil', 'VO2max'] }],
    produce: "une séance course pilotée en puissance (fenêtres de watts cibles, format, récup) adaptée à mes zones de puissance course.",
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
    questions: [{ q: 'Sur quelle distance veux-tu une prédiction ?', options: ['5 km', '10 km', 'Semi', 'Marathon', 'Autre'] }],
    produce: "une prédiction de chrono argumentée à partir de mes performances et de ma forme actuelle (fourchette réaliste, allure cible, conditions pour la tenir).",
  },

  // ═══════════════════════════════════════════════════════════════
  // NUTRITION (ponctuelle) — ciblée, actionnable.
  // ═══════════════════════════════════════════════════════════════
  nutrition_effort: {
    key: 'nutrition_effort',
    objective: 'ma stratégie nutritionnelle pendant l\'effort',
    questions: [{ q: 'Pour quel type d\'effort ?', options: ['Sortie longue', 'Course', 'Séance intense', 'Ultra'] }],
    produce: "un plan d'apport pendant l'effort (glucides/h, hydratation, sodium, timing, produits) adapté à la durée et à l'intensité, avec un exemple concret.",
  },
  hydratation: {
    key: 'hydratation', objective: 'un plan d\'hydratation adapté', questions: [
      { q: 'Contexte ?', options: ['Au quotidien', 'Autour de l\'effort', 'Chaleur', 'Compétition'] },
    ],
    produce: "des repères d'hydratation concrets (quantités, timing, électrolytes) adaptés au contexte et à mon volume d'entraînement.",
  },
  repas_post: {
    key: 'repas_post', objective: 'quoi manger après ma séance pour bien récupérer', questions: [
      { q: 'La séance était plutôt ?', options: ['Endurance longue', 'Intense / qualité', 'Force / muscu'] },
    ],
    produce: "une recommandation de repas/collation post-séance (fenêtre, protéines + glucides cibles, exemples concrets) pour optimiser la récup selon le type d'effort.",
  },
  besoins_macros: {
    key: 'besoins_macros', objective: 'mes besoins en calories et macros', questions: [
      { q: 'Objectif actuel ?', options: ['Maintien', 'Prise de muscle', 'Perte de gras', 'Performance'] },
    ],
    produce: "une estimation de mes besoins (calories, protéines/glucides/lipides en g et g/kg) selon mon objectif et ma dépense d'entraînement, avec une répartition simple à suivre.",
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
    ],
    produce: "une lecture prudente de la douleur (pistes possibles, drapeaux rouges qui imposent un avis médical), comment adapter mon entraînement en attendant, et des pistes de reprise — sans poser de diagnostic médical.",
  },
  etirements: {
    key: 'etirements', objective: 'une routine d\'étirements / mobilité adaptée', questions: [
      { q: 'Objectif ?', options: ['Après séance', 'Mobilité générale', 'Zone raide précise', 'Détente / sommeil'] },
    ],
    produce: "une routine d'étirements/mobilité guidée (mouvements, durées, respiration) ciblée sur l'objectif et sur les zones sollicitées par mes sports.",
  },
  gestion_stress: {
    key: 'gestion_stress', objective: 'gérer mon stress pour mieux récupérer et performer', questions: [
      { q: 'Le stress vient surtout ?', options: ['Compétition', 'Charge de vie', 'Sommeil / mental', 'Rien de précis'] },
    ],
    produce: "des stratégies concrètes et actionnables (respiration, routine, gestion de la charge mentale, lien avec l'entraînement et le sommeil) priorisées selon ma situation.",
  },
  expliquer_concept: {
    key: 'expliquer_concept', objective: 'm\'expliquer clairement un concept d\'entraînement', questions: [
      { q: 'Quel concept veux-tu comprendre ?', note: 'ex : CTL/ATL/TSB, seuil, polarisation, VO2max…' },
    ],
    produce: "une explication claire et imagée du concept, avec un exemple tiré de MES données quand c'est possible, et pourquoi ça compte pour ma pratique.",
  },

  // ─── Guide app (simple, conversationnel) ───
  app_guide: {
    key: 'app_guide',
    objective: "m'aider à comprendre et utiliser l'application",
    questions: [
      { q: 'Sur quoi veux-tu de l\'aide ?', options: ['Prise en main générale', 'Planning', 'Nutrition', 'Récupération', 'Connexions / calendrier', 'Autre'] },
    ],
    produce: "une explication claire et concrète (étapes, où cliquer) répondant précisément à ma demande, sans jargon.",
  },
}

export function hasQuickActionSpec(key: string): boolean {
  return Boolean(QUICK_ACTION_SPECS[key])
}
