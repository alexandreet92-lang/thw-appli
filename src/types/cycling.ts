// ── Types & defaults pour la config compteur vélo (V2) ─────────

export type FieldCategory =
  | 'temps' | 'vitesse' | 'distance' | 'denivele'
  | 'puissance' | 'fc' | 'cadence' | 'energie'
  | 'navigation' | 'environnement'

export type FieldType = 'numeric' | 'chart' | 'climb_profile'
export type SensorKind = 'hr' | 'power' | 'cadence'

export interface DataField {
  id: string
  label: string
  unit?: string
  category: FieldCategory
  type: FieldType
  requiresSensor?: SensorKind
  requiresRoute?: boolean
}

export type PageType = 'data' | 'map'

export interface DataPage {
  id: string
  name: string
  type: PageType
  fields: string[]
  bigFieldId?: string
  bigFieldPosition?: 'top' | 'middle'
}

export const FIELD_CATEGORIES: Record<FieldCategory, string> = {
  temps:         'Temps',
  vitesse:       'Vitesse',
  distance:      'Distance',
  denivele:      'Dénivelé & Altitude',
  puissance:     'Puissance',
  fc:            'Fréquence cardiaque',
  cadence:       'Cadence',
  energie:       'Énergie',
  navigation:    'Navigation',
  environnement: 'Environnement',
}

export const ALL_FIELDS: DataField[] = [
  // TEMPS
  { id: 'duration',          label: 'Durée totale',          category: 'temps', type: 'numeric' },
  { id: 'moving_time',       label: 'Temps en mouvement',    category: 'temps', type: 'numeric' },
  { id: 'lap_duration',      label: 'Durée lap actuel',      category: 'temps', type: 'numeric' },
  { id: 'prev_lap_duration', label: 'Durée lap précédent',   category: 'temps', type: 'numeric' },
  { id: 'eta',               label: 'Heure arrivée est.',    category: 'temps', type: 'numeric', requiresRoute: true },
  // VITESSE
  { id: 'speed',             label: 'Vitesse',               unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'avg_speed',         label: 'Vitesse moyenne',       unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'max_speed',         label: 'Vitesse max',           unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'lap_speed',         label: 'Vitesse lap',           unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'prev_lap_speed',    label: 'Vitesse lap préc.',     unit: 'km/h', category: 'vitesse', type: 'numeric' },
  // DISTANCE
  { id: 'distance',          label: 'Distance',              unit: 'km', category: 'distance', type: 'numeric' },
  { id: 'lap_distance',      label: 'Distance lap',          unit: 'km', category: 'distance', type: 'numeric' },
  { id: 'prev_lap_distance', label: 'Distance lap préc.',    unit: 'km', category: 'distance', type: 'numeric' },
  { id: 'remaining_dist',    label: 'Distance restante',     unit: 'km', category: 'distance', type: 'numeric', requiresRoute: true },
  // DÉNIVELÉ
  { id: 'elevation_gain',    label: 'D+',                    unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'elevation_loss',    label: 'D-',                    unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'altitude',          label: 'Altitude',              unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'gradient',          label: 'Pente actuelle',        unit: '%', category: 'denivele', type: 'numeric' },
  { id: 'avg_gradient',      label: 'Pente moyenne',         unit: '%', category: 'denivele', type: 'numeric' },
  // PUISSANCE
  { id: 'power',             label: 'Watts',                 unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'avg_power',         label: 'Watts moyens',          unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'norm_power',        label: 'Watts normalisés',      unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'max_power',         label: 'Watts max',             unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'lap_power',         label: 'Watts lap',             unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'prev_lap_power',    label: 'Watts lap préc.',       unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'ftp_percent',       label: '% FTP',                 unit: '%', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'tss',               label: 'TSS',                              category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'if',                label: 'IF',                               category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'lr_balance',        label: 'Équilibre G/D',         unit: '%', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'power_chart',       label: 'Courbe de puissance',              category: 'puissance', type: 'chart',   requiresSensor: 'power' },
  // FC
  { id: 'hr',                label: 'FC',                    unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'avg_hr',            label: 'FC moyenne',            unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'max_hr',            label: 'FC max',                unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'lap_hr',            label: 'FC lap',                unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'prev_lap_hr',       label: 'FC lap préc.',          unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_zone',           label: 'Zone FC',                            category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_percent',        label: '% FC max',              unit: '%',   category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_chart',          label: 'Courbe de FC',                       category: 'fc', type: 'chart',   requiresSensor: 'hr' },
  // CADENCE
  { id: 'cadence',           label: 'Cadence',               unit: 'rpm', category: 'cadence', type: 'numeric', requiresSensor: 'cadence' },
  { id: 'avg_cadence',       label: 'Cadence moyenne',       unit: 'rpm', category: 'cadence', type: 'numeric', requiresSensor: 'cadence' },
  { id: 'lap_cadence',       label: 'Cadence lap',           unit: 'rpm', category: 'cadence', type: 'numeric', requiresSensor: 'cadence' },
  // ÉNERGIE
  { id: 'calories',          label: 'Calories',              unit: 'kcal', category: 'energie', type: 'numeric' },
  { id: 'carbs',             label: 'Glucides brûlés',       unit: 'g',    category: 'energie', type: 'numeric' },
  { id: 'fat',               label: 'Lipides brûlés',        unit: 'g',    category: 'energie', type: 'numeric' },
  // NAVIGATION
  { id: 'next_turn_dist',    label: 'Distance virage',       unit: 'm', category: 'navigation', type: 'numeric',      requiresRoute: true },
  { id: 'next_turn_dir',     label: 'Direction virage',                 category: 'navigation', type: 'numeric',      requiresRoute: true },
  { id: 'remaining_elev',    label: 'Dénivelé restant',      unit: 'm', category: 'navigation', type: 'numeric',      requiresRoute: true },
  { id: 'climb_profile',     label: 'Profil montée',                    category: 'navigation', type: 'climb_profile', requiresRoute: true },
  // ENVIRONNEMENT
  { id: 'temperature',       label: 'Température',           unit: '°C',   category: 'environnement', type: 'numeric' },
  { id: 'wind',              label: 'Vent',                  unit: 'km/h', category: 'environnement', type: 'numeric' },
]

export const MAX_FIELDS = 12

export const DEFAULT_PAGES: DataPage[] = [
  {
    id: 'page_1', name: 'Données', type: 'data',
    fields: ['duration', 'distance', 'speed', 'elevation_gain', 'power', 'hr', 'avg_power'],
    bigFieldId: 'duration', bigFieldPosition: 'top',
  },
  { id: 'page_2', name: 'Carte', type: 'map', fields: ['power', 'distance'] },
  {
    id: 'page_3', name: 'Puissance / Lap', type: 'data',
    fields: ['power', 'lap_duration', 'lap_power', 'lap_hr', 'cadence', 'altitude', 'norm_power'],
    bigFieldId: 'power', bigFieldPosition: 'top',
  },
]

export function fieldById(id: string): DataField | undefined {
  return ALL_FIELDS.find(f => f.id === id)
}

export type DataFont = 'system' | 'mono' | 'rounded' | 'condensed' | 'sport'

export const FONT_OPTIONS: { id: DataFont; label: string; fontFamily: string }[] = [
  { id: 'system',    label: 'Système',    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { id: 'mono',      label: 'Monospace',  fontFamily: '"SF Mono", "Roboto Mono", "Courier New", monospace' },
  { id: 'rounded',   label: 'Arrondie',   fontFamily: '"Nunito", "Varela Round", system-ui, sans-serif' },
  { id: 'condensed', label: 'Condensée',  fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif' },
  { id: 'sport',     label: 'Sport',      fontFamily: '"Bebas Neue", "Impact", "Arial Black", sans-serif' },
]
