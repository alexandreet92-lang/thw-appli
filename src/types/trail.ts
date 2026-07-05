import type { DataPage, DataField } from './cycling'
import { ALL_FIELDS } from './cycling'

export const TRAIL_SPECIFIC_FIELDS: DataField[] = [
  // Allure
  { id: 'pace',               label: 'Allure',           labelKey: 'rectypes.fieldPace',         unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'avg_pace',           label: 'Allure moyenne',   labelKey: 'rectypes.fieldAvgPace',      unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'best_pace',          label: 'Allure max',       labelKey: 'rectypes.fieldMaxPace',      unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'lap_pace',           label: 'Allure lap',       labelKey: 'rectypes.fieldLapPace',      unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'prev_lap_pace',      label: 'Allure lap préc.', labelKey: 'rectypes.fieldPrevLapPace',  unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'vap',                label: 'VAP',              labelKey: 'rectypes.fieldVap',          unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'avg_vap',            label: 'VAP moyenne',      labelKey: 'rectypes.fieldAvgVap',       unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  // Allure par segment de pente
  { id: 'uphill_pace',        label: 'Allure montée',    labelKey: 'rectypes.fieldUphillPace',   unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  { id: 'downhill_pace',      label: 'Allure descente',  labelKey: 'rectypes.fieldDownhillPace', unit: 'min/km', category: 'vitesse',  type: 'numeric' },
  // Dénivelé lap
  { id: 'elevation_gain_lap', label: 'D+ lap',           labelKey: 'rectypes.fieldElevGainLap',  unit: 'm',      category: 'denivele', type: 'numeric' },
  { id: 'elevation_loss_lap', label: 'D- lap',           labelKey: 'rectypes.fieldElevLossLap',  unit: 'm',      category: 'denivele', type: 'numeric' },
  { id: 'altitude_max',       label: 'Altitude max',     labelKey: 'rectypes.fieldAltitudeMax',  unit: 'm',      category: 'denivele', type: 'numeric' },
  { id: 'max_gradient',       label: 'Pente max',        labelKey: 'rectypes.fieldMaxGradient',  unit: '%',      category: 'denivele', type: 'numeric' },
  // Temps par segment
  { id: 'total_ascent_time',  label: 'Temps montée',     labelKey: 'rectypes.fieldAscentTime',                   category: 'temps',    type: 'numeric' },
  { id: 'total_descent_time', label: 'Temps descente',   labelKey: 'rectypes.fieldDescentTime',                   category: 'temps',    type: 'numeric' },
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
  { id: 'ef',       label: 'EF',             labelKey: 'rectypes.typeEfLabel',           desc: 'Endurance fondamentale',   descKey: 'rectypes.typeEnduranceFondaDesc' },
  { id: 'montee',   label: 'Montées',        labelKey: 'rectypes.typeMonteesLabel',      desc: 'Répétitions en montée',    descKey: 'rectypes.typeRepMonteeDesc' },
  { id: 'descente', label: 'Descente tech.', labelKey: 'rectypes.typeDescenteTechLabel', desc: 'Technique de descente',    descKey: 'rectypes.typeTechDescenteDesc' },
  { id: 'long',     label: 'Sortie longue',  labelKey: 'rectypes.typeSortieLongueLabel', desc: 'Longue distance en nature', descKey: 'rectypes.typeLongueDistanceNatureDesc' },
  { id: 'fraction', label: 'Fractionné',     labelKey: 'rectypes.typeFractionneLabel',   desc: 'Intervalles en côte',      descKey: 'rectypes.typeIntervallesCoteDesc' },
  { id: 'course',   label: 'Compétition',    labelKey: 'rectypes.typeCompetitionLabel',  desc: 'Simulation ou course',     descKey: 'rectypes.typeSimulationCourseDesc' },
  { id: 'recup',    label: 'Récup',          labelKey: 'rectypes.typeRecupLabel',        desc: 'Récupération active',      descKey: 'rectypes.typeRecupActiveDesc' },
]

export { formatPace, speedToMinKm, calculateVAP } from './running'
