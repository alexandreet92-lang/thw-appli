// ══════════════════════════════════════════════════════════════════
// Agrégat de la bibliothèque d'exercices Muscu / Renfo.
// Push · Pull · Haltéro · Core = modèle familles/variantes (mode C).
// Legs = lot 1 (modèle plat), conservé tel quel et adapté en famille
// sans variante à l'agrégation. Contenu réel — zéro mock.
// ══════════════════════════════════════════════════════════════════
import type { Exercice, FamilleExercice, Groupe } from './types'
import { LEGS } from './legs'
import { PUSH } from './push'
import { PULL } from './pull'
import { HALTERO } from './haltero'
import { CORE } from './core'

// Adapte un exercice plat (Legs) en famille à 0 variante.
function exoToFamille(e: Exercice): FamilleExercice {
  return {
    id: e.id, nom: e.nom, sport: 'muscu', groupe: e.groupe,
    muscles: e.muscles, modes: e.modes, equipement: e.equipement,
    flags: e.flags, difficulteTechnique: e.difficulteTechnique,
    fiche: e.fiche, variantes: [],
  }
}

export const FAMILLES_MUSCU: FamilleExercice[] = [
  ...PUSH, ...PULL, ...LEGS.map(exoToFamille), ...HALTERO, ...CORE,
]

export function famillesParGroupe(groupe: Groupe): FamilleExercice[] {
  return FAMILLES_MUSCU.filter(f => f.groupe === groupe)
}

export function familleParId(id: string): FamilleExercice | undefined {
  return FAMILLES_MUSCU.find(f => f.id === id)
}

// Nom affichable d'un dérivé recommandé (id de variante ou de famille).
export function nomDerive(famille: FamilleExercice, id: string): string | undefined {
  if (famille.id === id) return famille.nom
  const v = famille.variantes.find(x => x.id === id)
  if (v) return v.nom
  return familleParId(id)?.nom
}

export * from './types'
export * from './dictionaries'
