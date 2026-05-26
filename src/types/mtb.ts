import type { DataPage, DataField } from './cycling'
import { ALL_FIELDS } from './cycling'

export const MTB_SPECIFIC_FIELDS: DataField[] = [
  { id: 'trail_type',         label: 'Type terrain', category: 'denivele', type: 'numeric' },
  { id: 'elevation_gain_lap', label: 'D+ lap',    unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'elevation_loss_lap', label: 'D- lap',    unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'max_gradient',       label: 'Pente max', unit: '%', category: 'denivele', type: 'numeric' },
]

export const ALL_MTB_FIELDS: DataField[] = [...ALL_FIELDS, ...MTB_SPECIFIC_FIELDS]

export function mtbFieldById(id: string): DataField | undefined {
  return ALL_MTB_FIELDS.find(f => f.id === id)
}

export const DEFAULT_MTB_PAGES: DataPage[] = [
  {
    id: 'mtb_1', name: 'Données', type: 'data',
    bigFieldId: 'speed', bigFieldPosition: 'top',
    fields: ['speed', 'duration', 'distance', 'elevation_gain', 'elevation_loss', 'hr'],
  },
  { id: 'mtb_2', name: 'Carte', type: 'map', fields: ['speed', 'elevation_gain'] },
  {
    id: 'mtb_3', name: 'Dénivelé', type: 'data',
    bigFieldId: 'gradient', bigFieldPosition: 'top',
    fields: ['gradient', 'max_gradient', 'elevation_gain_lap', 'elevation_loss_lap', 'avg_speed', 'altitude'],
  },
  {
    id: 'mtb_4', name: 'Lap', type: 'data',
    bigFieldId: 'lap_duration', bigFieldPosition: 'top',
    fields: ['lap_duration', 'lap_distance', 'avg_speed', 'elevation_gain_lap', 'elevation_loss_lap', 'hr'],
  },
]

export const MTB_TYPES = [
  { id: 'enduro',   label: 'Enduro',        desc: 'Descentes techniques' },
  { id: 'xco',      label: 'XCO',           desc: 'Cross-country olympique' },
  { id: 'ef',       label: 'EF',            desc: 'Endurance fondamentale' },
  { id: 'montee',   label: 'Montées',       desc: 'Répétitions en montée' },
  { id: 'descente', label: 'Descente',      desc: 'Technique de descente' },
  { id: 'long',     label: 'Sortie longue', desc: 'Longue distance' },
  { id: 'recup',    label: 'Récup',         desc: 'Récupération' },
]

export function detectTrailType(speedKmh: number, gradientPct: number, elevationGain: number): string {
  if (speedKmh < 5 && Math.abs(gradientPct) > 15) return 'Technique'
  if (speedKmh < 10 && elevationGain > 50) return 'Sous-bois'
  if (speedKmh > 20 && Math.abs(gradientPct) < 5) return 'Chemin empierré'
  if (speedKmh > 30) return 'Piste'
  return 'Mixte'
}
