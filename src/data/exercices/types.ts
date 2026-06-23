// ══════════════════════════════════════════════════════════════════
// Bibliothèque — Exercices (Muscu / Renfo)
// Vocabulaires FERMÉS (unions). Pas de tags libres. Voir PROMPT_BIBLIO_EXOS.md §3.
// ══════════════════════════════════════════════════════════════════

export type Groupe = 'push' | 'pull' | 'legs' | 'haltero' | 'core'

export type Mode = 'strength' | 'explosivite' | 'strength-endurance'

export type Equipement =
  | 'barre' | 'halteres' | 'kettlebell' | 'poids-de-corps' | 'elastique'

export type FlagExo = 'unilateral' | 'a-encadrer' | 'combo'

// Muscles = vocabulaire fermé (filet de découverte transversal)
export type Muscle =
  // bas
  | 'quadriceps' | 'ischios' | 'fessiers' | 'adducteurs' | 'mollets' | 'tibial-anterieur'
  // push
  | 'pectoraux' | 'deltoide-anterieur' | 'deltoide-lateral' | 'triceps'
  // pull
  | 'grand-dorsal' | 'trapeze-inf-moy' | 'rhomboides' | 'deltoide-posterieur' | 'biceps' | 'grip'
  // tronc
  | 'erecteurs' | 'transverse' | 'obliques'

export type RegionMuscle = 'bas' | 'push' | 'pull' | 'tronc'

export interface ExerciceMode {
  mode: Mode
  primaire: boolean // exactement 1 primaire par exercice
}

export interface FicheExercice {
  utilite: string      // pourquoi/à qui le programmer
  execution: string[]  // 3-5 points clés
  erreurs: string[]    // erreurs fréquentes
}

export interface Exercice {
  id: string                   // slug stable
  nom: string
  sport: 'muscu'               // extensible plus tard (hyrox…)
  groupe: Groupe               // DOMICILE UNIQUE
  muscles: Muscle[]            // multi — filet transversal
  modes: ExerciceMode[]        // multi, 1 primaire
  equipement: Equipement[]
  flags: FlagExo[]
  difficulteTechnique: number  // 1..10
  fiche?: FicheExercice        // absente = « brique sèche » (§5)
}

// — Helpers dérivés (jamais stockés, cf §3)
export function modePrimaire(exo: Exercice): Mode {
  return (exo.modes.find(m => m.primaire) ?? exo.modes[0]).mode
}
export function aFiche(exo: Exercice): boolean {
  return exo.fiche !== undefined
}
