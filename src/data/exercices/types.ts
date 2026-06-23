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

// ══════════════════════════════════════════════════════════════════
// Modèle familles + variantes (mode C) — Push · Pull · Haltéro · Core.
// Une variante hérite de la famille pour tout champ non redéfini.
// ══════════════════════════════════════════════════════════════════
export interface Variante {
  id: string
  nom: string
  difficulteTechnique: number          // obligatoire
  muscles?: Muscle[]                    // hérite de la famille si absent
  modes?: ExerciceMode[]
  equipement?: Equipement[]
  flags?: FlagExo[]
  note?: string                        // 1 ligne, variante non-évidente (pas une fiche)
  deriveRecommande?: string
}

export interface FamilleExercice {
  id: string
  nom: string
  sport: 'muscu'
  groupe: Groupe                       // domicile unique
  muscles: Muscle[]
  modes: ExerciceMode[]
  equipement: Equipement[]
  flags: FlagExo[]
  difficulteTechnique: number
  fiche?: FicheExercice                // sur le mouvement-clé ; absente = brique
  accessoire?: boolean                 // transfert faible, à doser
  deriveRecommande?: string            // id d'un dérivé plus sûr (proposition)
  variantes: Variante[]
}

export function primaryMode(modes: ExerciceMode[]): Mode {
  return (modes.find(m => m.primaire) ?? modes[0]).mode
}

// Champs effectifs d'une variante (héritage depuis la famille).
export interface UniteMatch {
  nom: string
  muscles: Muscle[]
  modes: ExerciceMode[]
  equipement: Equipement[]
  flags: FlagExo[]
  difficulteTechnique: number
}
export function varianteEffective(f: FamilleExercice, v: Variante): UniteMatch {
  return {
    nom: v.nom,
    muscles: v.muscles ?? f.muscles,
    modes: v.modes ?? f.modes,
    equipement: v.equipement ?? f.equipement,
    flags: v.flags ?? f.flags,
    difficulteTechnique: v.difficulteTechnique,
  }
}
// Famille + ses variantes, sous forme d'unités comparables par le filtre.
export function unitesMatch(f: FamilleExercice): UniteMatch[] {
  const tete: UniteMatch = {
    nom: f.nom, muscles: f.muscles, modes: f.modes,
    equipement: f.equipement, flags: f.flags, difficulteTechnique: f.difficulteTechnique,
  }
  return [tete, ...f.variantes.map(v => varianteEffective(f, v))]
}

