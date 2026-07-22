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

export interface QAItem {
  q: string                    // la question
  options?: string[]           // propositions (cartes) ; absent = réponse libre
  note?: string                // précision optionnelle pour le coach
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
