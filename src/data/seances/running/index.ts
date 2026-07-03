// ══════════════════════════════════════════════════════════════════
// Agrégat des séances Running + dictionnaires d'affichage.
// Contenu réel (PROMPT_BIBLIO_RUNNING.md §8) — zéro mock.
// ══════════════════════════════════════════════════════════════════
import type { RunBucket, Filiere, Seance } from './types'
import { SEANCES_5K } from './5k'
import { SEANCES_10K } from './10k'
import { SEANCES_SEMI } from './semi'
import { SEANCES_MARATHON } from './marathon'
import { SEANCES_NEURO } from './neuro'

export const SEANCES_RUNNING: Seance[] = [
  ...SEANCES_5K, ...SEANCES_10K, ...SEANCES_SEMI, ...SEANCES_MARATHON, ...SEANCES_NEURO,
]

export function seancesParBucket(bucket: RunBucket): Seance[] {
  return SEANCES_RUNNING.filter(s => s.bucket === bucket)
}
export function seanceParId(id: string): Seance | undefined {
  return SEANCES_RUNNING.find(s => s.id === id)
}

export const BUCKET_ORDER: RunBucket[] = ['5k', '10k', 'semi', 'marathon', 'neuro']
export const BUCKET_LABEL: Record<RunBucket, string> = {
  '5k': '5 km', '10k': '10 km', semi: 'Semi', marathon: 'Marathon', neuro: 'Neuromusculaire',
}
export const BUCKET_SHORT: Record<RunBucket, string> = {
  '5k': '5k', '10k': '10k', semi: 'Semi', marathon: 'Marathon', neuro: 'Neuro',
}
export const BUCKET_SUBTITLE: Record<RunBucket, string> = {
  '5k': 'VO2max, vitesse spécifique, tolérance lactique',
  '10k': 'Seuil, VO2max long, endurance d\'allure',
  semi: 'Seuil, allure spécifique, endurance',
  marathon: 'Allure spécifique, sortie longue',
  neuro: 'Sprints, côtes, strides, vitesse pure',
}

export const FILIERE_ORDER: Filiere[] = [
  'aerobie', 'seuil', 'vma', 'specifique', 'neuromusculaire', 'mixte', 'test',
]
export const FILIERE_LABEL: Record<Filiere, string> = {
  aerobie: 'Aérobie', seuil: 'Seuil', vma: 'VMA', specifique: 'Spécifique',
  neuromusculaire: 'Neuromusculaire', mixte: 'Mixte', test: 'Test',
}

export const PHASE_ORDER = ['Base', 'Général', 'Spé', 'Affûtage'] as const
export const INTENSITE_LABEL = {
  faible: 'Faible', modere: 'Modéré', eleve: 'Élevé', maximum: 'Maximum',
} as const

export * from './types'
export * from './niveaux'
