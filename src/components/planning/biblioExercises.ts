// ══════════════════════════════════════════════════════════════════
// Pont bibliothèque Session → builder Planning.
// La bibliothèque d'exercices riche (familles + variantes, src/data/exercices)
// alimente la page Session. Ici on l'aplatit en ExoDefinition[] pour que le
// builder muscu du Planning propose EXACTEMENT les mêmes exercices (mêmes
// bulles, même persistance via les blocs JSONB). Aucun nouveau schéma.
// ══════════════════════════════════════════════════════════════════
import {
  FAMILLES_MUSCU, primaryMode, varianteEffective,
  type FamilleExercice, type Variante, type Groupe, type Mode, type Equipement,
} from '@/data/exercices'
import type { ExoCategory, ExoDefinition } from './exercises'

// groupe bibliothèque → catégorie builder (le builder n'a pas « haltéro » ni
// « core » : haltéro = mouvement full body → mixte ; core → abdos).
const GROUPE_TO_CAT: Record<Groupe, ExoCategory> = {
  push: 'push', pull: 'pull', legs: 'legs', core: 'abdos', haltero: 'mixte',
}

const WEIGHTED: Equipement[] = ['barre', 'halteres', 'kettlebell']
const hasWeightFrom = (equip: Equipement[]) => equip.some(e => WEIGHTED.includes(e))

// Réglages par défaut selon le mode primaire (séries × reps × repos).
const MODE_DEFAULTS: Record<Mode, { sets: number; reps: number; rest: number }> = {
  'strength':            { sets: 4, reps: 6,  rest: 120 },
  'explosivite':         { sets: 5, reps: 3,  rest: 150 },
  'strength-endurance':  { sets: 3, reps: 15, rest: 60 },
}

function toDef(id: string, nom: string, groupe: Groupe, mode: Mode, equip: Equipement[]): ExoDefinition {
  const d = MODE_DEFAULTS[mode] ?? { sets: 3, reps: 10, rest: 90 }
  return {
    id: `biblio_${id}`, name: nom, aliases: [], category: GROUPE_TO_CAT[groupe],
    hasWeight: hasWeightFrom(equip), hasDistance: false, hasKcal: false, hasTime: false,
    defaultReps: d.reps, defaultSets: d.sets, defaultRestSec: d.rest,
  }
}

function familleDefs(f: FamilleExercice): ExoDefinition[] {
  const head = toDef(f.id, f.nom, f.groupe, primaryMode(f.modes), f.equipement)
  const vars = f.variantes.map((v: Variante) => {
    const eff = varianteEffective(f, v)
    return toDef(v.id, v.nom, f.groupe, primaryMode(eff.modes), eff.equipement)
  })
  return [head, ...vars]
}

// Toutes les unités (familles + variantes) de la bibliothèque, prêtes pour le
// builder. ~plusieurs centaines d'exercices réels.
export const BIBLIO_EXO_DEFS: ExoDefinition[] = FAMILLES_MUSCU.flatMap(familleDefs)
