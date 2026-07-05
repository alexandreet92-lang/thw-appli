import type { DataPage, DataField } from './cycling'
import { ALL_FIELDS } from './cycling'

export const MTB_SPECIFIC_FIELDS: DataField[] = [
  { id: 'trail_type',         label: 'Type terrain', labelKey: 'rectypes.fieldTrailType',   category: 'denivele', type: 'numeric' },
  { id: 'elevation_gain_lap', label: 'D+ lap',    labelKey: 'rectypes.fieldElevGainLap', unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'elevation_loss_lap', label: 'D- lap',    labelKey: 'rectypes.fieldElevLossLap', unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'max_gradient',       label: 'Pente max', labelKey: 'rectypes.fieldMaxGradient', unit: '%', category: 'denivele', type: 'numeric' },
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
  { id: 'enduro',   label: 'Enduro',        labelKey: 'rectypes.typeEnduroLabel',       desc: 'Descentes techniques',   descKey: 'rectypes.typeDescentesTechDesc' },
  { id: 'xco',      label: 'XCO',           labelKey: 'rectypes.typeXcoLabel',          desc: 'Cross-country olympique', descKey: 'rectypes.typeXcoDesc' },
  { id: 'ef',       label: 'EF',            labelKey: 'rectypes.typeEfLabel',           desc: 'Endurance fondamentale', descKey: 'rectypes.typeEnduranceFondaDesc' },
  { id: 'montee',   label: 'Montées',       labelKey: 'rectypes.typeMonteesLabel',      desc: 'Répétitions en montée',  descKey: 'rectypes.typeRepMonteeDesc' },
  { id: 'descente', label: 'Descente',      labelKey: 'rectypes.typeDescenteLabel',     desc: 'Technique de descente',  descKey: 'rectypes.typeTechDescenteDesc' },
  { id: 'long',     label: 'Sortie longue', labelKey: 'rectypes.typeSortieLongueLabel', desc: 'Longue distance',        descKey: 'rectypes.typeLongueDistanceDesc' },
  { id: 'recup',    label: 'Récup',         labelKey: 'rectypes.typeRecupLabel',        desc: 'Récupération',           descKey: 'rectypes.typeRecuperationDesc' },
]

export function detectTrailType(speedKmh: number, gradientPct: number, elevationGain: number): string {
  if (speedKmh < 5 && Math.abs(gradientPct) > 15) return 'Technique'
  if (speedKmh < 10 && elevationGain > 50) return 'Sous-bois'
  if (speedKmh > 20 && Math.abs(gradientPct) < 5) return 'Chemin empierré'
  if (speedKmh > 30) return 'Piste'
  return 'Mixte'
}
