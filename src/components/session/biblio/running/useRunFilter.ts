'use client'
// Filtre à facettes Running — ET entre facettes, OU à l'intérieur.
import { useMemo, useState } from 'react'
import type { Seance, Filiere, RunBucket } from '@/data/seances/running'

export interface RunFiltreState {
  filieres: Filiere[]
  distances: RunBucket[]
  dureeMax: number       // min — 180 = toutes
  rpeMax: number         // 1..10 — 10 = toutes
  phases: string[]
}

export const RUN_FILTRE_VIDE: RunFiltreState = {
  filieres: [], distances: [], dureeMax: 180, rpeMax: 10, phases: [],
}

export function compteRunFiltres(f: RunFiltreState): number {
  return f.filieres.length + f.distances.length + f.phases.length
    + (f.dureeMax < 180 ? 1 : 0) + (f.rpeMax < 10 ? 1 : 0)
}

export function appliquerRunFiltre(
  seances: Seance[], f: RunFiltreState, bucket: RunBucket | null, query: string,
): Seance[] {
  const q = query.trim().toLowerCase()
  return seances.filter(s => {
    if (bucket && s.bucket !== bucket) return false
    if (q && !s.nom.toLowerCase().includes(q) && !s.tags.some(t => t.toLowerCase().includes(q))) return false
    if (f.filieres.length && !f.filieres.includes(s.filiere)) return false
    if (f.distances.length) {
      const d = s.distanceCible ?? [s.bucket]
      if (!d.some(x => f.distances.includes(x))) return false
    }
    if (s.dureeEstimeeMin > f.dureeMax) return false
    if (s.rpe > f.rpeMax) return false
    if (f.phases.length && !f.phases.includes(s.phase)) return false
    return true
  })
}

export function useRunFilter() {
  const [filtre, setFiltre] = useState<RunFiltreState>(RUN_FILTRE_VIDE)
  const toggleFiliere = (x: Filiere) => setFiltre(s => ({
    ...s, filieres: s.filieres.includes(x) ? s.filieres.filter(y => y !== x) : [...s.filieres, x],
  }))
  const toggleDistance = (x: RunBucket) => setFiltre(s => ({
    ...s, distances: s.distances.includes(x) ? s.distances.filter(y => y !== x) : [...s.distances, x],
  }))
  const togglePhase = (x: string) => setFiltre(s => ({
    ...s, phases: s.phases.includes(x) ? s.phases.filter(y => y !== x) : [...s.phases, x],
  }))
  const setDureeMax = (v: number) => setFiltre(s => ({ ...s, dureeMax: v }))
  const setRpeMax = (v: number) => setFiltre(s => ({ ...s, rpeMax: v }))
  const reset = () => setFiltre(RUN_FILTRE_VIDE)
  const nbActifs = useMemo(() => compteRunFiltres(filtre), [filtre])
  return { filtre, toggleFiliere, toggleDistance, togglePhase, setDureeMax, setRpeMax, reset, nbActifs }
}
