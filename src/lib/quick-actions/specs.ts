// ══════════════════════════════════════════════════════════════════
// Format DÉCLARATIF des actions rapides (nouveau système unifié).
//   Une action = des questions spécifiques + un assembleur de prompt.
//   Le moteur (QuickActionIntake) choisit le rendu selon le nombre de
//   questions : 0 → envoi direct · 1-4 → guidé (une question à la fois)
//   · 5+ → mini-formulaire compact. Puis il envoie le prompt assemblé au
//   coach (send → /api/coach-stream), comme une action « prompt » classique.
//
//   Migration progressive : tant qu'une action n'a pas de spec ici, elle
//   garde son comportement actuel (flow wizard ou prompt simple).
// ══════════════════════════════════════════════════════════════════

export type QAQuestionType = 'choice' | 'multi' | 'number' | 'text'

export interface QAQuestion {
  id: string
  q: string                    // libellé de la question
  type: QAQuestionType
  options?: string[]           // choice / multi
  min?: number; max?: number; step?: number; unit?: string  // number
  placeholder?: string         // text
  optional?: boolean           // peut être laissée vide
  default?: string             // valeur pré-remplie (choice/number/text)
  hint?: string                // petite aide sous la question
}

export interface QuickActionSpec {
  key: string                  // = QuickAction.key
  intro?: string               // phrase d'accroche en tête de l'intake
  questions: QAQuestion[]
  /** Construit le prompt final envoyé au coach à partir des réponses. */
  assemble: (a: Record<string, string>) => string
}

// ── Registre des actions migrées ────────────────────────────────────
export const QUICK_ACTION_SPECS: Record<string, QuickActionSpec> = {
  // Action de référence (validation du moteur auto).
  prise_de_masse: {
    key: 'prise_de_masse',
    intro: 'On cale ta prise de masse. Quelques précisions et je te génère le tout.',
    questions: [
      { id: 'niveau', q: 'Ton niveau en musculation ?', type: 'choice',
        options: ['Débutant', 'Intermédiaire', 'Avancé'], default: 'Intermédiaire' },
      { id: 'jours', q: 'Combien de séances par semaine ?', type: 'number',
        min: 2, max: 7, step: 1, unit: 'séances', default: '4' },
      { id: 'materiel', q: 'Quel matériel as-tu ?', type: 'multi',
        options: ['Salle complète', 'Haltères', 'Barre', 'Poids du corps', 'Élastiques'],
        hint: 'Plusieurs choix possibles.' },
      { id: 'contraintes', q: 'Une contrainte ou une précision ? (optionnel)', type: 'text',
        optional: true, placeholder: 'Ex : dos sensible, max 1 h par séance, objectif +5 kg…' },
    ],
    assemble: (a) => [
      'Construis-moi un programme complet de PRISE DE MASSE (hypertrophie) avec les apports nutritionnels associés.',
      `Niveau : ${a.niveau || 'intermédiaire'}.`,
      `Séances par semaine : ${a.jours || '4'}.`,
      a.materiel ? `Matériel disponible : ${a.materiel}.` : '',
      a.contraintes ? `Contraintes / précisions : ${a.contraintes}.` : '',
      "Appuie-toi sur mes données déjà connues (profil, historique d'entraînement, zones).",
      'Structure clairement : répartition des séances sur la semaine, exercices avec séries/répétitions/repos, schéma de progression, et un plan nutritionnel (calories + macros) cohérent avec l\'objectif.',
    ].filter(Boolean).join('\n'),
  },
}

export function hasQuickActionSpec(key: string): boolean {
  return Boolean(QUICK_ACTION_SPECS[key])
}
