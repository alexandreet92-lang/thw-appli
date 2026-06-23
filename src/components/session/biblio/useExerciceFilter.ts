'use client'
// ══════════════════════════════════════════════════════════════════
// Filtre à facettes — modèle familles/variantes.
// Une famille matche si le mouvement-clé OU une variante satisfait les
// facettes (ET entre facettes, OU à l'intérieur d'une facette).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import {
  unitesMatch, type FamilleExercice, type Mode, type Muscle, type Equipement, type Groupe,
} from '@/data/exercices'

export interface FiltreState {
  modes: Mode[]
  muscles: Muscle[]
  equipement: Equipement[]
  difficulteMax: number      // 1..10 — 10 = toutes
  unilateral: boolean
  aEncadrer: boolean
  avecFiche: boolean
  masquerAccessoires: boolean
}

export const FILTRE_VIDE: FiltreState = {
  modes: [], muscles: [], equipement: [],
  difficulteMax: 10, unilateral: false, aEncadrer: false, avecFiche: false, masquerAccessoires: false,
}

export function compteFiltresActifs(f: FiltreState): number {
  return f.modes.length + f.muscles.length + f.equipement.length
    + (f.difficulteMax < 10 ? 1 : 0)
    + (f.unilateral ? 1 : 0) + (f.aEncadrer ? 1 : 0) + (f.avecFiche ? 1 : 0)
    + (f.masquerAccessoires ? 1 : 0)
}

// ET entre facettes · OU à l'intérieur d'une facette.
// `groupe` = verrou de browse (tuile). null = transversal (porte Filtrer).
export function appliquerFiltre(
  familles: FamilleExercice[],
  f: FiltreState,
  groupe: Groupe | null,
  query: string,
): FamilleExercice[] {
  const q = query.trim().toLowerCase()
  return familles.filter(fam => {
    if (groupe && fam.groupe !== groupe) return false
    if (f.masquerAccessoires && fam.accessoire) return false
    if (f.avecFiche && fam.fiche === undefined) return false
    if (q && !fam.nom.toLowerCase().includes(q) && !fam.variantes.some(v => v.nom.toLowerCase().includes(q))) return false
    // Au moins une unité (mouvement-clé ou variante) passe TOUTES les facettes.
    return unitesMatch(fam).some(u => {
      if (f.modes.length && !u.modes.some(m => f.modes.includes(m.mode))) return false
      if (f.muscles.length && !u.muscles.some(m => f.muscles.includes(m))) return false
      if (f.equipement.length && !u.equipement.some(e => f.equipement.includes(e))) return false
      if (u.difficulteTechnique > f.difficulteMax) return false
      if (f.unilateral && !u.flags.includes('unilateral')) return false
      if (f.aEncadrer && !u.flags.includes('a-encadrer')) return false
      return true
    })
  })
}

// — État + toggles immuables pour la sheet de filtre.
export function useExerciceFilter() {
  const [filtre, setFiltre] = useState<FiltreState>(FILTRE_VIDE)

  const toggleMode = (m: Mode) => setFiltre(s => ({
    ...s, modes: s.modes.includes(m) ? s.modes.filter(x => x !== m) : [...s.modes, m],
  }))
  const toggleMuscle = (m: Muscle) => setFiltre(s => ({
    ...s, muscles: s.muscles.includes(m) ? s.muscles.filter(x => x !== m) : [...s.muscles, m],
  }))
  const toggleEquip = (eq: Equipement) => setFiltre(s => ({
    ...s, equipement: s.equipement.includes(eq) ? s.equipement.filter(x => x !== eq) : [...s.equipement, eq],
  }))
  const setDifficulteMax = (v: number) => setFiltre(s => ({ ...s, difficulteMax: v }))
  const toggleFlag = (k: 'unilateral' | 'aEncadrer' | 'avecFiche' | 'masquerAccessoires') =>
    setFiltre(s => ({ ...s, [k]: !s[k] }))
  const reset = () => setFiltre(FILTRE_VIDE)

  const nbActifs = useMemo(() => compteFiltresActifs(filtre), [filtre])

  return { filtre, setFiltre, toggleMode, toggleMuscle, toggleEquip, setDifficulteMax, toggleFlag, reset, nbActifs }
}
