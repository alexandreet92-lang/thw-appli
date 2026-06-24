'use client'
// Filtre à facettes générique (endurance) — ET entre facettes, OU à l'intérieur.
import { useMemo, useState } from 'react'
import type { Seance, Zone } from '@/data/seances/common'

export interface EnduranceFiltreState {
  zones: Zone[]
  supports: string[]
  phases: string[]
  dureeMax: number       // min — 360 = toutes
  rpeMax: number         // 10 = tous
}

export const ENDU_FILTRE_VIDE: EnduranceFiltreState = {
  zones: [], supports: [], phases: [], dureeMax: 360, rpeMax: 10,
}

export function compteEnduFiltres(f: EnduranceFiltreState): number {
  return f.zones.length + f.supports.length + f.phases.length
    + (f.dureeMax < 360 ? 1 : 0) + (f.rpeMax < 10 ? 1 : 0)
}

function zonesDe(s: Seance): Zone[] {
  return Array.from(new Set(s.blocs.filter(b => b.phase === 'corps').map(b => b.zone)))
}

export function appliquerEnduFiltre(
  seances: Seance[], f: EnduranceFiltreState, bucket: string | null, query: string,
): Seance[] {
  const q = query.trim().toLowerCase()
  return seances.filter(s => {
    if (bucket && s.bucket !== bucket) return false
    if (q && !s.nom.toLowerCase().includes(q) && !s.tags.some(t => t.toLowerCase().includes(q))) return false
    if (f.zones.length && !zonesDe(s).some(z => f.zones.includes(z))) return false
    if (f.supports.length && !s.support.some(sp => f.supports.includes(sp))) return false
    if (f.phases.length && !f.phases.includes(s.phase)) return false
    if (s.dureeMinMin > f.dureeMax) return false
    if (s.rpe > f.rpeMax) return false
    return true
  })
}

// Options dérivées des données (supports + phases présents pour ce sport).
export function optionsDe(seances: Seance[]) {
  const supports = new Set<string>(), phases = new Set<string>(), zones = new Set<Zone>()
  for (const s of seances) {
    s.support.forEach(x => supports.add(x))
    phases.add(s.phase)
    s.blocs.filter(b => b.phase === 'corps').forEach(b => zones.add(b.zone))
  }
  const PHASE_RANK: Record<string, number> = { Base: 0, Build: 1, 'Spé': 2 }
  return {
    supports: [...supports],
    phases: [...phases].sort((a, b) => (PHASE_RANK[a] ?? 9) - (PHASE_RANK[b] ?? 9)),
    zones: (['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7'] as Zone[]).filter(z => zones.has(z)),
  }
}

export function useEnduranceFilter() {
  const [filtre, setFiltre] = useState<EnduranceFiltreState>(ENDU_FILTRE_VIDE)
  const tog = <K extends 'zones' | 'supports' | 'phases'>(k: K, v: EnduranceFiltreState[K][number]) =>
    setFiltre(s => ({ ...s, [k]: (s[k] as string[]).includes(v as string) ? (s[k] as string[]).filter(x => x !== v) : [...(s[k] as string[]), v] }))
  const toggleZone = (z: Zone) => tog('zones', z)
  const toggleSupport = (sp: string) => tog('supports', sp)
  const togglePhase = (p: string) => tog('phases', p)
  const setDureeMax = (v: number) => setFiltre(s => ({ ...s, dureeMax: v }))
  const setRpeMax = (v: number) => setFiltre(s => ({ ...s, rpeMax: v }))
  const reset = () => setFiltre(ENDU_FILTRE_VIDE)
  const nbActifs = useMemo(() => compteEnduFiltres(filtre), [filtre])
  return { filtre, toggleZone, toggleSupport, togglePhase, setDureeMax, setRpeMax, reset, nbActifs }
}
