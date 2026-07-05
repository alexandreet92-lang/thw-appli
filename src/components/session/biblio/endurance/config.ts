// Configuration par sport pour le module Séances d'endurance générique.
import type { Seance, Zone, SportEndurance } from '@/data/seances/common'
import type { RefPace } from './EnduranceProfil'
import { SEANCES_AVIRON, AVIRON_BUCKET_ORDER, AVIRON_BUCKET_LABEL, AVIRON_BUCKET_SUB } from '@/data/seances/aviron'
import { SEANCES_NATATION, NATATION_BUCKET_ORDER, NATATION_BUCKET_LABEL, NATATION_BUCKET_SUB } from '@/data/seances/natation'
import { SEANCES_TRAIL, TRAIL_BUCKET_ORDER, TRAIL_BUCKET_LABEL, TRAIL_BUCKET_SUB } from '@/data/seances/trail'

export interface EnduranceConfig {
  sport: SportEndurance
  seances: Seance[]
  bucketOrder: readonly string[]
  bucketLabel: Record<string, string>
  bucketSub: Record<string, string>
  dotColor: string
  refPace: RefPace
  backLabel: string         // libellé du retour vers les bulles
  backLabelKey: string      // clé i18n du libellé de retour
  searchPlaceholder: string
  searchPlaceholderKey: string
}

// Allures de référence (s/km) par zone — schématique, pilote la largeur du profil.
const REF_AVIRON: Record<Zone, number> = { Z1: 280, Z2: 250, Z3: 236, Z4: 220, Z5: 204, Z6: 196, Z7: 190 }
const REF_NATATION: Record<Zone, number> = { Z1: 1100, Z2: 950, Z3: 880, Z4: 820, Z5: 750, Z6: 700, Z7: 680 }
const REF_TRAIL: Record<Zone, number> = { Z1: 480, Z2: 420, Z3: 380, Z4: 340, Z5: 320, Z6: 300, Z7: 290 }

export const AVIRON_CONFIG: EnduranceConfig = {
  sport: 'aviron', seances: SEANCES_AVIRON,
  bucketOrder: AVIRON_BUCKET_ORDER, bucketLabel: AVIRON_BUCKET_LABEL, bucketSub: AVIRON_BUCKET_SUB,
  dotColor: 'var(--sport-rowing)', refPace: REF_AVIRON, backLabel: 'Intentions', backLabelKey: 'sessbiblio.enduBackIntentions', searchPlaceholder: 'Rechercher une séance…', searchPlaceholderKey: 'sessbiblio.searchSeance',
}
export const NATATION_CONFIG: EnduranceConfig = {
  sport: 'natation', seances: SEANCES_NATATION,
  bucketOrder: NATATION_BUCKET_ORDER, bucketLabel: NATATION_BUCKET_LABEL, bucketSub: NATATION_BUCKET_SUB,
  dotColor: 'var(--sport-swim)', refPace: REF_NATATION, backLabel: 'Filières', backLabelKey: 'sessbiblio.enduBackFilieres', searchPlaceholder: 'Rechercher une séance…', searchPlaceholderKey: 'sessbiblio.searchSeance',
}
export const TRAIL_CONFIG: EnduranceConfig = {
  sport: 'trail', seances: SEANCES_TRAIL,
  bucketOrder: TRAIL_BUCKET_ORDER, bucketLabel: TRAIL_BUCKET_LABEL, bucketSub: TRAIL_BUCKET_SUB,
  dotColor: 'var(--sport-run)', refPace: REF_TRAIL, backLabel: 'Qualités', backLabelKey: 'sessbiblio.enduBackQualites', searchPlaceholder: 'Rechercher une séance…', searchPlaceholderKey: 'sessbiblio.searchSeance',
}
