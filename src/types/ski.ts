import type { DataPage, DataField } from './cycling'

export const ALL_SKI_FIELDS: DataField[] = [
  // VITESSE
  { id: 'speed',          label: 'Vitesse',            unit: 'km/h', category: 'vitesse',  type: 'numeric' },
  { id: 'max_speed',      label: 'Vitesse max',        unit: 'km/h', category: 'vitesse',  type: 'numeric' },
  { id: 'avg_speed_run',  label: 'Vitesse moy. desc.', unit: 'km/h', category: 'vitesse',  type: 'numeric' },
  // DESCENTES
  { id: 'run_count',      label: 'Descentes',          unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'run_duration',   label: 'Durée descente',     unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'lift_duration',  label: 'Temps remontée',     unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'current_phase',  label: 'Phase',              unit: '',     category: 'temps',    type: 'numeric' },
  // DÉNIVELÉ
  { id: 'elevation_loss', label: 'D-',                 unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'elevation_gain', label: 'D+',                 unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'altitude',       label: 'Altitude',           unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'altitude_max',   label: 'Altitude max',       unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'gradient',       label: 'Pente',              unit: '%',    category: 'denivele', type: 'numeric' },
  // DISTANCE
  { id: 'distance',       label: 'Distance',           unit: 'km',   category: 'distance', type: 'numeric' },
  { id: 'run_distance',   label: 'Distance descente',  unit: 'km',   category: 'distance', type: 'numeric' },
  // FC
  { id: 'hr',             label: 'FC',                 unit: 'bpm',  category: 'fc',       type: 'numeric', requiresSensor: 'hr' },
  { id: 'avg_hr',         label: 'FC moyenne',         unit: 'bpm',  category: 'fc',       type: 'numeric', requiresSensor: 'hr' },
  { id: 'max_hr',         label: 'FC max',             unit: 'bpm',  category: 'fc',       type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_chart',       label: 'Courbe FC',                        category: 'fc',       type: 'chart',   requiresSensor: 'hr' },
  // ÉNERGIE
  { id: 'duration',       label: 'Durée totale',       unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'calories',       label: 'Calories',           unit: 'kcal', category: 'energie',  type: 'numeric' },
]

export function skiFieldById(id: string): DataField | undefined {
  return ALL_SKI_FIELDS.find(f => f.id === id)
}

export const DEFAULT_SKI_PAGES: DataPage[] = [
  {
    id: 'ski_1', name: 'Données', type: 'data',
    bigFieldId: 'speed', bigFieldPosition: 'top',
    fields: ['speed', 'duration', 'run_count', 'elevation_loss', 'altitude', 'max_speed'],
  },
  {
    id: 'ski_2', name: 'Carte', type: 'map',
    fields: ['speed', 'altitude'],
  },
  {
    id: 'ski_3', name: 'Descente', type: 'data',
    bigFieldId: 'max_speed', bigFieldPosition: 'top',
    fields: ['max_speed', 'run_count', 'run_distance', 'elevation_loss', 'avg_speed_run', 'current_phase'],
  },
]

export const SKI_TYPES = [
  { id: 'freeride',  label: 'Freeride',     desc: 'Hors piste' },
  { id: 'piste',     label: 'Piste',        desc: 'Ski de piste' },
  { id: 'race',      label: 'Compétition',  desc: 'Course / slalom' },
  { id: 'freestyle', label: 'Freestyle',    desc: 'Sauts et tricks' },
  { id: 'rando',     label: 'Ski de rando', desc: 'Montée + descente' },
  { id: 'recup',     label: 'Récup',        desc: 'Sortie tranquille' },
]
