// ══════════════════════════════════════════════════════════════════
// Agrégat des séances Vélo + dictionnaires d'affichage. Zéro mock.
// ══════════════════════════════════════════════════════════════════
import type { VeloBucket, Cadence, Support, Seance } from './types'
import { SEANCES_AEROBIE } from './aerobie'
import { SEANCES_SL1 } from './sl1'
import { SEANCES_SL2 } from './sl2'
import { SEANCES_PMA } from './pma'
import { SEANCES_FORCE } from './force'
import { SEANCES_VELOCITE } from './velocite'
import { SEANCES_SPRINTS } from './sprints'
import { SEANCES_MIXTE } from './mixte'

export const SEANCES_VELO: Seance[] = [
  ...SEANCES_AEROBIE, ...SEANCES_SL1, ...SEANCES_SL2, ...SEANCES_PMA,
  ...SEANCES_FORCE, ...SEANCES_VELOCITE, ...SEANCES_SPRINTS, ...SEANCES_MIXTE,
]

export function seancesVeloParBucket(b: VeloBucket): Seance[] {
  return SEANCES_VELO.filter(s => s.bucket === b)
}
export function seanceVeloParId(id: string): Seance | undefined {
  return SEANCES_VELO.find(s => s.id === id)
}

export const VELO_BUCKET_ORDER: VeloBucket[] = [
  'aerobie', 'sl1', 'sl2', 'pma', 'force', 'velocite', 'sprints', 'mixte',
]
export const VELO_BUCKET_LABEL: Record<VeloBucket, string> = {
  aerobie: 'Aérobie', sl1: 'SL1', sl2: 'SL2', pma: 'PMA',
  force: 'Force', velocite: 'Vélocité', sprints: 'Sprints', mixte: 'Mixte',
}
export const VELO_BUCKET_SUB: Record<VeloBucket, string> = {
  aerobie: 'Endurance / fond', sl1: 'Tempo / sweet spot', sl2: 'Seuil', pma: 'PMA / VO2max',
  force: 'Basse cadence', velocite: 'Haute cadence', sprints: 'Neuromusculaire', mixte: 'Sortie longue à efforts',
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  basse: 'Cadence basse', normale: 'Cadence normale', haute: 'Cadence haute',
}
export const SUPPORT_LABEL: Record<Support, string> = {
  route: 'Route', 'home-trainer': 'Home trainer',
}
export const VELO_PHASE_ORDER = ['Base', 'Build', 'Spé'] as const

export * from './types'
export * from './niveaux'
