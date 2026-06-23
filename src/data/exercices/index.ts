// ══════════════════════════════════════════════════════════════════
// Agrégat de la bibliothèque d'exercices Muscu / Renfo.
// Contenu réel (PROMPT_BIBLIO_EXOS.md §8) — zéro mock.
// ══════════════════════════════════════════════════════════════════
import type { Exercice, Groupe } from './types'
import { LEGS } from './legs'
import { PUSH } from './push'
import { PULL } from './pull'
import { HALTERO } from './haltero'
import { CORE } from './core'

export const EXERCICES_MUSCU: Exercice[] = [...PUSH, ...PULL, ...LEGS, ...HALTERO, ...CORE]

export function exercicesParGroupe(groupe: Groupe): Exercice[] {
  return EXERCICES_MUSCU.filter(e => e.groupe === groupe)
}

export function exerciceParId(id: string): Exercice | undefined {
  return EXERCICES_MUSCU.find(e => e.id === id)
}

export * from './types'
export * from './dictionaries'
