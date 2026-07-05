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
  labelKey?: string
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

// Clés i18n parallèles pour les catégories (rétro-compat : FIELD_CATEGORIES reste FR)
export const FIELD_CATEGORY_KEYS: Record<FieldCategory, string> = {
  temps:         'rectypes.catTemps',
  vitesse:       'rectypes.catVitesse',
  distance:      'rectypes.catDistance',
  denivele:      'rectypes.catDenivele',
  puissance:     'rectypes.catPuissance',
  fc:            'rectypes.catFc',
  cadence:       'rectypes.catCadence',
  energie:       'rectypes.catEnergie',
  navigation:    'rectypes.catNavigation',
  environnement: 'rectypes.catEnvironnement',
}

export const ALL_FIELDS: DataField[] = [
  // TEMPS
  { id: 'duration',          label: 'Durée totale',          labelKey: 'rectypes.fieldDurationTotal',   category: 'temps', type: 'numeric' },
  { id: 'moving_time',       label: 'Temps en mouvement',    labelKey: 'rectypes.fieldMovingTime',       category: 'temps', type: 'numeric' },
  { id: 'lap_duration',      label: 'Durée lap actuel',      labelKey: 'rectypes.fieldLapDurationCurrent', category: 'temps', type: 'numeric' },
  { id: 'prev_lap_duration', label: 'Durée lap précédent',   labelKey: 'rectypes.fieldLapDurationPrev',   category: 'temps', type: 'numeric' },
  { id: 'eta',               label: 'Heure arrivée est.',    labelKey: 'rectypes.fieldEta',              category: 'temps', type: 'numeric', requiresRoute: true },
  // VITESSE
  { id: 'speed',             label: 'Vitesse',               labelKey: 'rectypes.catVitesse',            unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'avg_speed',         label: 'Vitesse moyenne',       labelKey: 'rectypes.fieldAvgSpeed',         unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'max_speed',         label: 'Vitesse max',           labelKey: 'rectypes.fieldMaxSpeed',         unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'lap_speed',         label: 'Vitesse lap',           labelKey: 'rectypes.fieldLapSpeed',         unit: 'km/h', category: 'vitesse', type: 'numeric' },
  { id: 'prev_lap_speed',    label: 'Vitesse lap préc.',     labelKey: 'rectypes.fieldPrevLapSpeed',     unit: 'km/h', category: 'vitesse', type: 'numeric' },
  // DISTANCE
  { id: 'distance',          label: 'Distance',              labelKey: 'rectypes.catDistance',           unit: 'km', category: 'distance', type: 'numeric' },
  { id: 'lap_distance',      label: 'Distance lap',          labelKey: 'rectypes.fieldLapDistance',      unit: 'km', category: 'distance', type: 'numeric' },
  { id: 'prev_lap_distance', label: 'Distance lap préc.',    labelKey: 'rectypes.fieldPrevLapDistance',  unit: 'km', category: 'distance', type: 'numeric' },
  { id: 'remaining_dist',    label: 'Distance restante',     labelKey: 'rectypes.fieldRemainingDist',    unit: 'km', category: 'distance', type: 'numeric', requiresRoute: true },
  // DÉNIVELÉ
  { id: 'elevation_gain',    label: 'D+',                    labelKey: 'rectypes.fieldElevGain',         unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'elevation_loss',    label: 'D-',                    labelKey: 'rectypes.fieldElevLoss',         unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'altitude',          label: 'Altitude',              labelKey: 'rectypes.fieldAltitude',         unit: 'm', category: 'denivele', type: 'numeric' },
  { id: 'gradient',          label: 'Pente actuelle',        labelKey: 'rectypes.fieldGradientCurrent',  unit: '%', category: 'denivele', type: 'numeric' },
  { id: 'avg_gradient',      label: 'Pente moyenne',         labelKey: 'rectypes.fieldGradientAvg',      unit: '%', category: 'denivele', type: 'numeric' },
  // PUISSANCE
  { id: 'power',             label: 'Watts',                 labelKey: 'rectypes.fieldWatts',            unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'avg_power',         label: 'Watts moyens',          labelKey: 'rectypes.fieldAvgWatts',         unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'norm_power',        label: 'Watts normalisés',      labelKey: 'rectypes.fieldNormWatts',        unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'max_power',         label: 'Watts max',             labelKey: 'rectypes.fieldMaxWatts',         unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'lap_power',         label: 'Watts lap',             labelKey: 'rectypes.fieldLapWatts',         unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'prev_lap_power',    label: 'Watts lap préc.',       labelKey: 'rectypes.fieldPrevLapWatts',     unit: 'w', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'ftp_percent',       label: '% FTP',                 labelKey: 'rectypes.fieldFtpPercent',       unit: '%', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'tss',               label: 'SM',                    labelKey: 'rectypes.fieldTss',                         category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'if',                label: 'IF',                    labelKey: 'rectypes.fieldIf',                          category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'lr_balance',        label: 'Équilibre G/D',         labelKey: 'rectypes.fieldLrBalance',        unit: '%', category: 'puissance', type: 'numeric', requiresSensor: 'power' },
  { id: 'power_chart',       label: 'Courbe de puissance',   labelKey: 'rectypes.fieldPowerCurve',                  category: 'puissance', type: 'chart',   requiresSensor: 'power' },
  // FC
  { id: 'hr',                label: 'FC',                    labelKey: 'rectypes.fieldHr',               unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'avg_hr',            label: 'FC moyenne',            labelKey: 'rectypes.fieldAvgHr',            unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'max_hr',            label: 'FC max',                labelKey: 'rectypes.fieldMaxHr',            unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'lap_hr',            label: 'FC lap',                labelKey: 'rectypes.fieldLapHr',            unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'prev_lap_hr',       label: 'FC lap préc.',          labelKey: 'rectypes.fieldPrevLapHr',        unit: 'bpm', category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_zone',           label: 'Zone FC',               labelKey: 'rectypes.fieldHrZone',                        category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_percent',        label: '% FC max',              labelKey: 'rectypes.fieldHrPercent',        unit: '%',   category: 'fc', type: 'numeric', requiresSensor: 'hr' },
  { id: 'hr_chart',          label: 'Courbe de FC',          labelKey: 'rectypes.fieldHrCurve',                       category: 'fc', type: 'chart',   requiresSensor: 'hr' },
  // CADENCE
  { id: 'cadence',           label: 'Cadence',               labelKey: 'rectypes.catCadence',            unit: 'rpm', category: 'cadence', type: 'numeric', requiresSensor: 'cadence' },
  { id: 'avg_cadence',       label: 'Cadence moyenne',       labelKey: 'rectypes.fieldAvgCadence',       unit: 'rpm', category: 'cadence', type: 'numeric', requiresSensor: 'cadence' },
  { id: 'lap_cadence',       label: 'Cadence lap',           labelKey: 'rectypes.fieldLapCadence',       unit: 'rpm', category: 'cadence', type: 'numeric', requiresSensor: 'cadence' },
  // ÉNERGIE
  { id: 'calories',          label: 'Calories',              labelKey: 'rectypes.fieldCalories',         unit: 'kcal', category: 'energie', type: 'numeric' },
  { id: 'carbs',             label: 'Glucides brûlés',       labelKey: 'rectypes.fieldCarbs',            unit: 'g',    category: 'energie', type: 'numeric' },
  { id: 'fat',               label: 'Lipides brûlés',        labelKey: 'rectypes.fieldFat',              unit: 'g',    category: 'energie', type: 'numeric' },
  // NAVIGATION
  { id: 'next_turn_dist',    label: 'Distance virage',       labelKey: 'rectypes.fieldNextTurnDist',     unit: 'm', category: 'navigation', type: 'numeric',      requiresRoute: true },
  { id: 'next_turn_dir',     label: 'Direction virage',      labelKey: 'rectypes.fieldNextTurnDir',                 category: 'navigation', type: 'numeric',      requiresRoute: true },
  { id: 'remaining_elev',    label: 'Dénivelé restant',      labelKey: 'rectypes.fieldRemainingElev',    unit: 'm', category: 'navigation', type: 'numeric',      requiresRoute: true },
  { id: 'climb_profile',     label: 'Profil montée',         labelKey: 'rectypes.fieldClimbProfile',                category: 'navigation', type: 'climb_profile', requiresRoute: true },
  // ENVIRONNEMENT
  { id: 'temperature',       label: 'Température',            labelKey: 'rectypes.fieldTemperature',      unit: '°C',   category: 'environnement', type: 'numeric' },
  { id: 'wind',              label: 'Vent',                  labelKey: 'rectypes.fieldWind',             unit: 'km/h', category: 'environnement', type: 'numeric' },
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

export const FONT_OPTIONS: { id: DataFont; label: string; labelKey: string; fontFamily: string }[] = [
  { id: 'system',    label: 'Système',    labelKey: 'rectypes.fontSystem',    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { id: 'mono',      label: 'Monospace',  labelKey: 'rectypes.fontMono',      fontFamily: '"SF Mono", "Roboto Mono", "Courier New", monospace' },
  { id: 'rounded',   label: 'Arrondie',   labelKey: 'rectypes.fontRounded',   fontFamily: '"Nunito", "Varela Round", system-ui, sans-serif' },
  { id: 'condensed', label: 'Condensée',  labelKey: 'rectypes.fontCondensed', fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif' },
  { id: 'sport',     label: 'Sport',      labelKey: 'rectypes.fontSport',     fontFamily: '"Bebas Neue", "Impact", "Arial Black", sans-serif' },
]
