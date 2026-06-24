// Agrégat des séances Natation + labels de bulles. Zéro mock.
import type { Seance } from '../common'
import { SEANCES_NAT_TECH } from './technique'
import { SEANCES_NAT_AERO } from './aerobie'
import { SEANCES_NAT_SEUIL } from './seuil'
import { SEANCES_NAT_VO2 } from './vo2'
import { SEANCES_NAT_SPEC } from './specifique'

export const SEANCES_NATATION: Seance[] = [
  ...SEANCES_NAT_TECH, ...SEANCES_NAT_AERO, ...SEANCES_NAT_SEUIL, ...SEANCES_NAT_VO2, ...SEANCES_NAT_SPEC,
]

export const NATATION_BUCKET_ORDER = ['technique', 'aerobie', 'seuil', 'vo2', 'specifique'] as const
export const NATATION_BUCKET_LABEL: Record<string, string> = {
  technique: 'Technique', aerobie: 'Aérobie', seuil: 'Seuil / CSS', vo2: 'VO2 / Sprints', specifique: 'Spécifique course',
}
export const NATATION_BUCKET_SUB: Record<string, string> = {
  technique: 'Éducatifs & efficience', aerobie: 'Endurance EN1', seuil: 'Allure seuil (CSS)',
  vo2: 'Vitesse & VO2', specifique: 'Allure course (70.3 / Ironman)',
}
