// Agrégat des séances Trail + labels de bulles. Zéro mock.
import type { Seance } from '../common'
import { SEANCES_TR_ENDU } from './endurance'
import { SEANCES_TR_COTES } from './cotes'
import { SEANCES_TR_HIKE } from './power-hiking'
import { SEANCES_TR_DESC } from './descente'
import { SEANCES_TR_SEUIL } from './seuil'
import { SEANCES_TR_VO2 } from './vo2'
import { SEANCES_TR_SPEC } from './specifique'

export const SEANCES_TRAIL: Seance[] = [
  ...SEANCES_TR_ENDU, ...SEANCES_TR_COTES, ...SEANCES_TR_HIKE, ...SEANCES_TR_DESC,
  ...SEANCES_TR_SEUIL, ...SEANCES_TR_VO2, ...SEANCES_TR_SPEC,
]

export const TRAIL_BUCKET_ORDER = ['endurance', 'cotes', 'power-hiking', 'descente', 'seuil', 'vo2', 'specifique'] as const
export const TRAIL_BUCKET_LABEL: Record<string, string> = {
  endurance: 'Endurance / Sortie longue', cotes: 'Côtes / Montée', 'power-hiking': 'Power hiking',
  descente: 'Descente', seuil: 'Seuil / Tempo', vo2: 'VO2 / Intervalles', specifique: 'Spécifique / Simulation',
}
export const TRAIL_BUCKET_SUB: Record<string, string> = {
  endurance: 'Base aérobie & temps de pied', cotes: 'Puissance de grimpe', 'power-hiking': 'Marche active',
  descente: 'Excentrique & technique', seuil: 'Endurance de seuil', vo2: 'VO2 (souvent en montée)', specifique: 'Simulation course',
}
