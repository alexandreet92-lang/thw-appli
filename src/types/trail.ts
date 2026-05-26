import type { DataPage, DataField } from './cycling'
import { ALL_FIELDS } from './cycling'

export const TRAIL_SPECIFIC_FIELDS: DataField[] = [
  // Allure
  { id: 'pace',               label: 'Allure',           unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'avg_pace',           label: 'Allure moyenne',   unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'best_pace',          label: 'Allure max',       unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'lap_pace',           label: 'Allure lap',       unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'prev_lap_pace',      label: 'Allure lap préc.', unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'vap',                label: 'VAP',              unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'avg_vap',            label: 'VAP moyenne',      unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  // Allure par segment de pente
  { id: 'uphill_pace',        label: 'Allure montée',    unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'downhill_pace',      label: 'Allure descente',  unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  // Dénivelé lap
  { id: 'elevation_gain_lap', label: 'D+ lap',           unit: 'm',      category: 'denivele', type: 'numeric' },
  { id: 'elevation_loss_lap', label: 'D- lap',           unit: 'm',      category: 'denivele', type: 'numeric' },
  { id: 'altitude_max',       label: 'Altitude max',     unit: 'm',      category: 'denivele', type: 'numeric' },
  { id: 'max_gradient',       label: 'Pente max',        unit: '%',      category: 'denivele', type: 'numeric' },
  // Temps par segment
  { id: 'total_ascent_time',  label: 'Temps montée',                     category: 'temps',    type: 'numeric' },
  { id: 'total_descent_time', label: 'Temps descente',                    category: 'temps',    type: 'numeric' },
]

export const ALL_TRAIL_FIELDS: DataField[] = [...ALL_FIELDS, ...TRAIL_SPECIFIC_FIELDS]

export function trailFieldById(id: string): DataField | undefined {
  return ALL_TRAIL_FIELDS.find(f => f.id === id)
}

export const DEFAULT_TRAIL_PAGES: DataPage[] = [
  {
    id: 'trail_1', name: 'Données', type: 'data',
    bigFieldId: 'pace', bigFieldPosition: 'top',
    fields: ['pace', 'duration', 'distance', 'elevation_gain', 'elevation_loss', 'hr'],
  },
  {
    id: 'trail_2', name: 'Carte', type: 'map',
    fields: ['vap', 'elevation_gain'],
  },
  {
    id: 'trail_3', name: 'Dénivelé', type: 'data',
    bigFieldId: 'gradient', bigFieldPosition: 'top',
    fields: ['gradient', 'elevation_gain', 'elevation_loss', 'elevation_gain_lap', 'elevation_loss_lap', 'altitude'],
  },
  {
    id: 'trail_4', name: 'Lap', type: 'data',
    bigFieldId: 'lap_pace', bigFieldPosition: 'top',
    fields: ['lap_pace', 'lap_duration', 'lap_distance', 'elevation_gain_lap', 'elevation_loss_lap', 'lap_hr'],
  },
]

export const TRAIL_TYPES = [
  { id: 'ef',       label: 'EF',             desc: 'Endurance fondamentale' },
  { id: 'montee',   label: 'Montées',        desc: 'Répétitions en montée' },
  { id: 'descente', label: 'Descente tech.', desc: 'Technique de descente' },
  { id: 'long',     label: 'Sortie longue',  desc: 'Longue distance en nature' },
  { id: 'fraction', label: 'Fractionné',     desc: 'Intervalles en côte' },
  { id: 'course',   label: 'Compétition',    desc: 'Simulation ou course' },
  { id: 'recup',    label: 'Récup',          desc: 'Récupération active' },
]

export { formatPace, speedToMinKm, calculateVAP } from './running'
