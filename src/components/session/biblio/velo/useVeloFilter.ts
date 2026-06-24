'use client'
// Filtre à facettes Vélo — ET entre facettes, OU à l'intérieur.
import { useMemo, useState } from 'react'
import { seanceBars } from './VeloProfil'
import type { Seance, Zone, Cadence, Terrain, Support, VeloBucket } from '@/data/seances/velo'

export interface VeloFiltreState {
  zones: Zone[]
  cadences: Cadence[]
  terrains: Terrain[]
  supports: Support[]
  dureeMax: number       // min — 360 = toutes
  rpeMax: number         // 10 = tous
  phases: string[]
}

export const VELO_FILTRE_VIDE: VeloFiltreState = {
  zones: [], cadences: [], terrains: [], supports: [], dureeMax: 360, rpeMax: 10, phases: [],
}

export function compteVeloFiltres(f: VeloFiltreState): number {
  return f.zones.length + f.cadences.length + f.terrains.length + f.supports.length + f.phases.length
    + (f.dureeMax < 360 ? 1 : 0) + (f.rpeMax < 10 ? 1 : 0)
}

// Cadences présentes dans une séance (tag séance + blocs).
function cadencesDe(s: Seance): Cadence[] {
  const set = new Set<Cadence>()
  if (s.cadenceTag) set.add(s.cadenceTag)
  for (const b of s.blocs) if (b.cadence) set.add(b.cadence)
  return [...set]
}
// Zones d'effort présentes.
function zonesDe(s: Seance): Zone[] {
  return Array.from(new Set(seanceBars(s).filter(b => b.effort).map(b => b.zone)))
}

export function appliquerVeloFiltre(
  seances: Seance[], f: VeloFiltreState, bucket: VeloBucket | null, query: string,
): Seance[] {
  const q = query.trim().toLowerCase()
  return seances.filter(s => {
    if (bucket && s.bucket !== bucket) return false
    if (q && !s.nom.toLowerCase().includes(q) && !s.tags.some(t => t.toLowerCase().includes(q))) return false
    if (f.zones.length && !zonesDe(s).some(z => f.zones.includes(z))) return false
    if (f.cadences.length && !cadencesDe(s).some(c => f.cadences.includes(c))) return false
    if (f.terrains.length && !(s.terrain && f.terrains.includes(s.terrain))) return false
    if (f.supports.length && !s.support.some(sp => f.supports.includes(sp))) return false
    if (s.dureeMinMin > f.dureeMax) return false
    if (s.rpe > f.rpeMax) return false
    if (f.phases.length && !f.phases.includes(s.phase)) return false
    return true
  })
}

export function useVeloFilter() {
  const [filtre, setFiltre] = useState<VeloFiltreState>(VELO_FILTRE_VIDE)
  const tog = <K extends 'zones' | 'cadences' | 'terrains' | 'supports' | 'phases'>(k: K, v: VeloFiltreState[K][number]) =>
    setFiltre(s => ({ ...s, [k]: (s[k] as string[]).includes(v as string) ? (s[k] as string[]).filter(x => x !== v) : [...(s[k] as string[]), v] }))
  const toggleZone = (z: Zone) => tog('zones', z)
  const toggleCadence = (c: Cadence) => tog('cadences', c)
  const toggleTerrain = (t: Terrain) => tog('terrains', t)
  const toggleSupport = (sp: Support) => tog('supports', sp)
  const togglePhase = (p: string) => tog('phases', p)
  const setDureeMax = (v: number) => setFiltre(s => ({ ...s, dureeMax: v }))
  const setRpeMax = (v: number) => setFiltre(s => ({ ...s, rpeMax: v }))
  const reset = () => setFiltre(VELO_FILTRE_VIDE)
  const nbActifs = useMemo(() => compteVeloFiltres(filtre), [filtre])
  return { filtre, toggleZone, toggleCadence, toggleTerrain, toggleSupport, togglePhase, setDureeMax, setRpeMax, reset, nbActifs }
}
