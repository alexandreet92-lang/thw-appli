// Agrégat des séances Aviron + labels de bulles. Zéro mock.
import type { Seance } from '../common'
import { SEANCES_AV_UT2 } from './ut2'
import { SEANCES_AV_UT1 } from './ut1'
import { SEANCES_AV_SEUIL } from './seuil'
import { SEANCES_AV_VO2 } from './vo2'
import { SEANCES_AV_SPRINTS } from './sprints'
import { SEANCES_AV_RACE } from './race'
import { SEANCES_AV_TECH } from './technique'

export const SEANCES_AVIRON: Seance[] = [
  ...SEANCES_AV_UT2, ...SEANCES_AV_UT1, ...SEANCES_AV_SEUIL, ...SEANCES_AV_VO2,
  ...SEANCES_AV_SPRINTS, ...SEANCES_AV_RACE, ...SEANCES_AV_TECH,
]

export const AVIRON_BUCKET_ORDER = ['ut2', 'ut1', 'seuil', 'vo2', 'sprints', 'race', 'technique'] as const
export const AVIRON_BUCKET_LABEL: Record<string, string> = {
  ut2: 'UT2', ut1: 'UT1', seuil: 'Seuil', vo2: 'VO2max', sprints: 'Sprints', race: 'Race pace', technique: 'Technique',
}
export const AVIRON_BUCKET_SUB: Record<string, string> = {
  ut2: 'Endurance fondamentale', ut1: 'Endurance soutenue', seuil: 'Seuil anaérobie', vo2: 'VO2max',
  sprints: 'Anaérobie / puissance', race: 'Allure 2k', technique: 'Coup & efficience',
}
