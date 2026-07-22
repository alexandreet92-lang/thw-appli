// ══════════════════════════════════════════════════════════════════
// Format DÉCLARATIF unique des actions rapides.
//   Une action = un objectif + les questions spécifiques à poser + la
//   directive de génération. `buildActionPrompt` assemble un prompt qui
//   dit au coach de poser CES questions via son outil de cartes
//   (ask_clarifying_questions → CoachQuestionCard, cf. la photo), en
//   sautant celles dont il connaît déjà la réponse, puis de générer.
//   → même mécanisme d'affichage in-chat pour les 53 actions, mais des
//     questions propres à chacune. Aucune modale, aucun wizard sur-mesure.
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
  questions: QAItem[]          // questions décisives, spécifiques à l'action
  produce: string              // directive de génération finale
}

/** Assemble le prompt envoyé au coach : pose les questions via cartes, puis génère. */
export function buildActionPrompt(spec: QuickActionSpec): string {
  const qs = spec.questions.map((x, i) => {
    const opts = x.options?.length ? ` — propositions : ${x.options.join(' · ')}` : ' — réponse libre'
    const note = x.note ? ` (${x.note})` : ''
    return `${i + 1}. ${x.q}${opts}${note}`
  }).join('\n')

  return [
    `[ACTION RAPIDE] Objectif : ${spec.objective}`,
    '',
    "Avant de générer, pose-moi les questions décisives ci-dessous VIA ton outil de cartes de clarification (ask_clarifying_questions), regroupées en UN SEUL appel.",
    "Règles : propose les options indiquées + « Autre » en réponse libre ; SAUTE toute question dont tu connais déjà la réponse dans mon profil / mes données ; ne redemande jamais une donnée déjà connue.",
    '',
    'Questions à poser :',
    qs,
    '',
    `Une fois mes réponses reçues : ${spec.produce}`,
  ].join('\n')
}

// ── Registre des actions migrées ────────────────────────────────────
export const QUICK_ACTION_SPECS: Record<string, QuickActionSpec> = {
  // Action de référence (validation du mécanisme in-chat).
  prise_de_masse: {
    key: 'prise_de_masse',
    objective: "un programme complet de PRISE DE MASSE (hypertrophie) + les apports nutritionnels associés",
    questions: [
      { q: 'Quel est ton niveau en musculation ?', options: ['Débutant', 'Intermédiaire', 'Avancé'] },
      { q: 'Combien de séances par semaine peux-tu faire ?', options: ['3', '4', '5', '6'] },
      { q: 'Quel matériel as-tu ?', options: ['Salle complète', 'Haltères', 'Barre', 'Poids du corps', 'Élastiques'], note: 'plusieurs choix possibles' },
      { q: 'Une contrainte ou une préférence à respecter ?', note: 'ex : dos sensible, max 1 h/séance, objectif de poids…' },
    ],
    produce: "génère un programme structuré (répartition des séances sur la semaine, exercices avec séries/répétitions/repos, schéma de progression) + un plan nutritionnel cohérent (calories + macros). Appuie-toi sur mes données déjà connues (profil, historique, zones).",
  },
}

export function hasQuickActionSpec(key: string): boolean {
  return Boolean(QUICK_ACTION_SPECS[key])
}
