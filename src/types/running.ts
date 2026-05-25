import type { DataPage, DataField } from './cycling'
import { ALL_FIELDS } from './cycling'

// Running-specific fields
export const RUNNING_SPECIFIC_FIELDS: DataField[] = [
  // Allure
  { id: 'pace',           label: 'Allure',            unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  { id: 'avg_pace',       label: 'Allure moyenne',    unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  { id: 'best_pace',      label: 'Allure max',        unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  { id: 'lap_pace',       label: 'Allure lap',        unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  { id: 'prev_lap_pace',  label: 'Allure lap préc.',  unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  // VAP — Vitesse Ajustée au Parcours
  { id: 'vap',            label: 'VAP',               unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  { id: 'avg_vap',        label: 'VAP moyenne',       unit: 'min/km',   category: 'vitesse',  type: 'numeric' },
  // Foulée (capteur optionnel)
  { id: 'stride_length',  label: 'Longueur foulée',   unit: 'm',        category: 'cadence',  type: 'numeric', requiresSensor: 'cadence' },
  { id: 'vertical_osc',   label: 'Oscillation vert.', unit: 'cm',       category: 'cadence',  type: 'numeric', requiresSensor: 'cadence' },
  { id: 'ground_contact', label: 'Contact sol',       unit: 'ms',       category: 'cadence',  type: 'numeric', requiresSensor: 'cadence' },
  // Performance
  { id: 'vo2max_est',     label: 'VO2max estimé',     unit: 'ml/kg/min', category: 'fc',      type: 'numeric' },
]

// All fields available in running (common + running-specific)
export const ALL_RUNNING_FIELDS: DataField[] = [...ALL_FIELDS, ...RUNNING_SPECIFIC_FIELDS]

export function runningFieldById(id: string): DataField | undefined {
  return ALL_RUNNING_FIELDS.find(f => f.id === id)
}

export const DEFAULT_RUNNING_PAGES: DataPage[] = [
  {
    id: 'run_page_1', name: 'Données', type: 'data',
    bigFieldId: 'pace', bigFieldPosition: 'top',
    fields: ['pace', 'duration', 'distance', 'elevation_gain', 'hr', 'avg_pace'],
  },
  { id: 'run_page_2', name: 'Carte', type: 'map', fields: ['pace', 'distance'] },
  {
    id: 'run_page_3', name: 'Lap', type: 'data',
    bigFieldId: 'lap_pace', bigFieldPosition: 'top',
    fields: ['lap_pace', 'lap_duration', 'lap_distance', 'lap_hr', 'cadence', 'vap'],
  },
]

export const RUNNING_TYPES = [
  { id: 'ef',       label: 'EF',            desc: 'Endurance fondamentale' },
  { id: 'seuil',    label: 'Seuil',         desc: 'Effort au seuil lactique' },
  { id: 'fraction', label: 'Fractionné',    desc: 'Intervalles courts/longs' },
  { id: 'cotes',    label: 'Côtes',         desc: 'Répétitions en montée' },
  { id: 'allure',   label: 'Allure spé',    desc: "Allure de compétition" },
  { id: 'recup',    label: 'Récup',         desc: 'Récupération active' },
  { id: 'sortie',   label: 'Sortie long.',  desc: 'Longue distance' },
]

// Pace helpers
export function formatPace(minPerKm: number): string {
  const min = Math.floor(minPerKm)
  const sec = Math.round((minPerKm - min) * 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function speedToMinKm(speedKmh: number): number | null {
  return speedKmh > 0.5 ? 60 / speedKmh : null
}

export function calculateVAP(paceMinKm: number, gradientPercent: number): number {
  if (gradientPercent > 0) return paceMinKm / (1 + gradientPercent * 0.033)
  return paceMinKm / (1 - Math.abs(gradientPercent) * 0.017)
}

export type RunningDataFont = 'system' | 'mono' | 'rounded' | 'condensed' | 'sport'
