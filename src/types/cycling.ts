// ── Types & defaults pour la config compteur vélo ──────────────

export type SensorKind = 'hr' | 'power' | 'cadence'

export interface DataField {
  id: string
  label: string
  unit: string
  requiresSensor?: SensorKind
}

export type PageType = 'data' | 'map' | 'custom'

export interface DataPage {
  id: string
  name: string
  type: PageType
  fields: string[]   // tableau d'ids de DataField
}

export const ALL_FIELDS: DataField[] = [
  { id: 'duration',       label: 'Durée',         unit: ''      },
  { id: 'distance',       label: 'Distance',      unit: 'km'    },
  { id: 'speed',          label: 'Vitesse',       unit: 'km/h'  },
  { id: 'elevation_gain', label: 'D+',            unit: 'm'     },
  { id: 'altitude',       label: 'Altitude',      unit: 'm'     },
  { id: 'avg_speed',      label: 'Vitesse moy.',  unit: 'km/h'  },
  { id: 'power',          label: 'Watts',         unit: 'w',    requiresSensor: 'power'   },
  { id: 'avg_power',      label: 'Watts moy.',    unit: 'w',    requiresSensor: 'power'   },
  { id: 'norm_power',     label: 'Watts nor.',    unit: 'w',    requiresSensor: 'power'   },
  { id: 'hr',             label: 'FC',            unit: 'bpm',  requiresSensor: 'hr'      },
  { id: 'avg_hr',         label: 'FC moy.',       unit: 'bpm',  requiresSensor: 'hr'      },
  { id: 'cadence',        label: 'Cadence',       unit: 'rpm',  requiresSensor: 'cadence' },
  { id: 'lap_duration',   label: 'Durée lap',     unit: ''      },
  { id: 'lap_distance',   label: 'Distance lap',  unit: 'km'    },
  { id: 'lap_speed',      label: 'Vitesse lap',   unit: 'km/h'  },
  { id: 'lap_power',      label: 'Watts lap',     unit: 'w',    requiresSensor: 'power'   },
  { id: 'lap_hr',         label: 'FC lap',        unit: 'bpm',  requiresSensor: 'hr'      },
  { id: 'lap_cadence',    label: 'Cadence lap',   unit: 'rpm',  requiresSensor: 'cadence' },
]

export const DEFAULT_PAGES: DataPage[] = [
  {
    id: 'page_1',
    name: 'Données',
    type: 'data',
    fields: ['duration', 'distance', 'speed', 'elevation_gain', 'power', 'hr', 'avg_power'],
  },
  {
    id: 'page_2',
    name: 'Carte',
    type: 'map',
    fields: ['power', 'distance'],
  },
  {
    id: 'page_3',
    name: 'Puissance / Lap',
    type: 'data',
    fields: ['power', 'lap_duration', 'lap_power', 'lap_hr', 'cadence', 'altitude', 'norm_power'],
  },
]

/** Limite max de champs par type de page. */
export function maxFieldsForType(type: PageType): number {
  if (type === 'map') return 2
  return 7
}

export function fieldById(id: string): DataField | undefined {
  return ALL_FIELDS.find(f => f.id === id)
}
