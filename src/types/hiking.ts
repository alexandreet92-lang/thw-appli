import type { DataPage, DataField } from './cycling'
import { ALL_FIELDS } from './cycling'

export const HIKING_SPECIFIC_FIELDS: DataField[] = [
  { id: 'avg_walk_pace', label: 'Allure marche', labelKey: 'rectypes.fieldWalkPace', unit: 'min/km', category: 'vitesse', type: 'numeric' },
  { id: 'steps',         label: 'Pas',           labelKey: 'rectypes.fieldSteps',                   category: 'temps',   type: 'numeric' },
]

export const ALL_HIKING_FIELDS: DataField[] = [...ALL_FIELDS, ...HIKING_SPECIFIC_FIELDS]

export function hikingFieldById(id: string): DataField | undefined {
  return ALL_HIKING_FIELDS.find(f => f.id === id)
}

export const DEFAULT_HIKING_PAGES: DataPage[] = [
  {
    id: 'hike_1', name: 'Données', type: 'data',
    bigFieldId: 'duration', bigFieldPosition: 'top',
    fields: ['duration', 'distance', 'elevation_gain', 'elevation_loss', 'altitude', 'avg_walk_pace'],
  },
  { id: 'hike_2', name: 'Carte', type: 'map', fields: ['elevation_gain'] },
  {
    id: 'hike_3', name: 'Dénivelé', type: 'data',
    bigFieldId: 'gradient', bigFieldPosition: 'top',
    fields: ['gradient', 'altitude', 'elevation_gain', 'elevation_loss', 'avg_gradient'],
  },
]

export const HIKING_TYPES = [
  { id: 'balade',  label: 'Balade',       labelKey: 'rectypes.typeBaladeLabel',     desc: 'Sortie tranquille',    descKey: 'rectypes.typeSortieTranquilleDesc' },
  { id: 'rando',   label: 'Randonnée',    labelKey: 'rectypes.typeRandoLabel',      desc: 'Journée en montagne',  descKey: 'rectypes.typeJourneeMontagneDesc' },
  { id: 'trek',    label: 'Trek',         labelKey: 'rectypes.typeTrekLabel',       desc: 'Plusieurs jours',      descKey: 'rectypes.typePlusieursJoursDesc' },
  { id: 'nordic',  label: 'Marche nord.', labelKey: 'rectypes.typeMarcheNordLabel', desc: 'Avec bâtons nordiques', descKey: 'rectypes.typeBatonsNordiquesDesc' },
  { id: 'recup',   label: 'Récup',        labelKey: 'rectypes.typeRecupLabel',      desc: 'Récupération active',  descKey: 'rectypes.typeRecupActiveDesc' },
]
