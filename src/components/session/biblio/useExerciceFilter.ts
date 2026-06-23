'use client'
// ══════════════════════════════════════════════════════════════════
// Filtre à facettes — logique ET entre facettes, OU à l'intérieur.
// Paramétrable par sport (ici, vocabulaire Muscu). Cf PROMPT_BIBLIO_EXOS.md §6.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import type { Exercice, Mode, Muscle, Equipement, Groupe } from '@/data/exercices'

export interface FiltreState {
  modes: Mode[]
  muscles: Muscle[]
  equipement: Equipement[]
  difficulteMax: number     // 1..10 — 10 = toutes
  unilateral: boolean
  aEncadrer: boolean
  avecFiche: boolean
}

export const FILTRE_VIDE: FiltreState = {
  modes: [], muscles: [], equipement: [],
  difficulteMax: 10, unilateral: false, aEncadrer: false, avecFiche: false,
}

export function compteFiltresActifs(f: FiltreState): number {
  return f.modes.length + f.muscles.length + f.equipement.length
    + (f.difficulteMax < 10 ? 1 : 0)
    + (f.unilateral ? 1 : 0) + (f.aEncadrer ? 1 : 0) + (f.avecFiche ? 1 : 0)
}

// ET entre facettes · OU à l'intérieur d'une facette.
// `groupe` = verrou de browse (tuile). null = transversal (porte Filtrer).
export function appliquerFiltre(
  exos: Exercice[],
  f: FiltreState,
  groupe: Groupe | null,
  query: string,
): Exercice[] {
  const q = query.trim().toLowerCase()
  return exos.filter(e => {
    if (groupe && e.groupe !== groupe) return false
    if (q && !e.nom.toLowerCase().includes(q)) return false
    if (f.modes.length && !e.modes.some(m => f.modes.includes(m.mode))) return false
    if (f.muscles.length && !e.muscles.some(m => f.muscles.includes(m))) return false
    if (f.equipement.length && !e.equipement.some(eq => f.equipement.includes(eq))) return false
    if (e.difficulteTechnique > f.difficulteMax) return false
    if (f.unilateral && !e.flags.includes('unilateral')) return false
    if (f.aEncadrer && !e.flags.includes('a-encadrer')) return false
    if (f.avecFiche && e.fiche === undefined) return false
    return true
  })
}

// Petit helper d'état + toggles immuables pour la sheet de filtre.
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
  const toggleFlag = (k: 'unilateral' | 'aEncadrer' | 'avecFiche') =>
    setFiltre(s => ({ ...s, [k]: !s[k] }))
  const reset = () => setFiltre(FILTRE_VIDE)

  const nbActifs = useMemo(() => compteFiltresActifs(filtre), [filtre])

  return { filtre, setFiltre, toggleMode, toggleMuscle, toggleEquip, setDifficulteMax, toggleFlag, reset, nbActifs }
}
