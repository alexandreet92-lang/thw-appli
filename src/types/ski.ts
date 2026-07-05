import type { DataPage, DataField } from './cycling'

export const ALL_SKI_FIELDS: DataField[] = [
  // VITESSE
  { id: 'speed',          label: 'Vitesse',            labelKey: 'rectypes.catVitesse',        unit: 'km/h', category: 'vitesse',  type: 'numeric' },
  { id: 'max_speed',      label: 'Vitesse max',        labelKey: 'rectypes.fieldMaxSpeed',     unit: 'km/h', category: 'vitesse',  type: 'numeric' },
  { id: 'avg_speed_run',  label: 'Vitesse moy. desc.', labelKey: 'rectypes.fieldAvgSpeedRun',  unit: 'km/h', category: 'vitesse',  type: 'numeric' },
  // DESCENTES
  { id: 'run_count',      label: 'Descentes',          labelKey: 'rectypes.fieldRunCount',     unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'run_duration',   label: 'Durée descente',     labelKey: 'rectypes.fieldRunDuration',  unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'lift_duration',  label: 'Temps remontée',     labelKey: 'rectypes.fieldLiftDuration', unit: '',     category: 'temps',    type: 'numeric' },
  { id: 'current_phase',  label: 'Phase',              labelKey: 'rectypes.fieldPhase',        unit: '',     category: 'temps',    type: 'numeric' },
  // DÉNIVELÉ
  { id: 'elevation_loss', label: 'D-',                 labelKey: 'rectypes.fieldElevLoss',     unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'elevation_gain', label: 'D+',                 labelKey: 'rectypes.fieldElevGain',     unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'altitude',       label: 'Altitude',           labelKey: 'rectypes.fieldAltitude',     unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'altitude_max',   label: 'Altitude max',       labelKey: 'rectypes.fieldAltitudeMax',  unit: 'm',    category: 'denivele', type: 'numeric' },
  { id: 'gradient',       label: 'Pente',              labelKey: 'rectypes.fieldGradientSimple', unit: '%',  category: 'denivele', type: 'numeric' },
  // DISTANCE
  { id: 'distance',       label: 'Distance',           labelKey: 'rectypes.catDistance',       unit: 'km',   category: 'distance', type: 'numeric' },
  { id: 'run_distance',   label: 'Distance descente',  labelKey: 'rectypes.fieldRunDistance',  unit: 'km',   category: 'distance', type: 'numeric' },
  // FC
  { id: 'hr',             label: 'FC',                 labelKey: 'rectypes.fieldHr',           unit: 'bpm',  category: 'fc',       type: 'numeric', requiresSensor: 'hr' },
  { id: 'avg_hr',         label: 'FC moyenne',         labelKey: 'rectypes.fieldAvgHr',        unit: 'bpm',  category: 'fc',       type: 'numeric', requiresSensor: 'hr' },
  { id: 'max_hr',         label: 'FC max',             labelKey: 'rectypes.fieldMaxHr',        unit: 'bpm',  category: 'fc',       type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_chart',       label: 'Courbe FC',          labelKey: 'rectypes.fieldHrCurveShort',               category: 'fc',       type: 'chart',   requiresSensor: 'hr' },
  // ÉNERGIE
  { id: 'duration',       label: 'Durée totale',       labelKey: 'rectypes.fieldDurationTotal', unit: '',    category: 'temps',    type: 'numeric' },
  { id: 'calories',       label: 'Calories',           labelKey: 'rectypes.fieldCalories',     unit: 'kcal', category: 'energie',  type: 'numeric' },
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
  { id: 'freeride',  label: 'Freeride',     labelKey: 'rectypes.typeFreerideLabel',  desc: 'Hors piste',       descKey: 'rectypes.typeHorsPisteDesc' },
  { id: 'piste',     label: 'Piste',        labelKey: 'rectypes.typePisteLabel',     desc: 'Ski de piste',     descKey: 'rectypes.typeSkiPisteDesc' },
  { id: 'race',      label: 'Compétition',  labelKey: 'rectypes.typeCompetitionLabel', desc: 'Course / slalom', descKey: 'rectypes.typeCourseSlalomDesc' },
  { id: 'freestyle', label: 'Freestyle',    labelKey: 'rectypes.typeFreestyleLabel', desc: 'Sauts et tricks',  descKey: 'rectypes.typeSautsTricksDesc' },
  { id: 'rando',     label: 'Ski de rando', labelKey: 'rectypes.typeSkiRandoLabel',  desc: 'Montée + descente', descKey: 'rectypes.typeMonteeDescenteDesc' },
  { id: 'recup',     label: 'Récup',        labelKey: 'rectypes.typeRecupLabel',     desc: 'Sortie tranquille', descKey: 'rectypes.typeSortieTranquilleDesc' },
]
