export interface HTInterval {
  name: string
  nameKey?: string
  duration: number
  ftpPercent: number
}

export interface HTProgram {
  name: string
  nameKey?: string
  duration: number
  intervals: HTInterval[]
}

export const HT_PROGRAMS: HTProgram[] = [
  {
    name: 'Échauffement',
    nameKey: 'rectypes.htProgWarmup',
    duration: 600,
    intervals: [
      { name: 'Zone 1', nameKey: 'rectypes.htZone1Desc', duration: 600, ftpPercent: 50 },
    ],
  },
  {
    name: 'Sweet Spot',
    nameKey: 'rectypes.typeSweetSpotLabel',
    duration: 2700,
    intervals: [
      { name: 'Échauffement',  nameKey: 'rectypes.htProgWarmup',     duration: 600, ftpPercent: 55 },
      { name: 'Sweet Spot 1',  nameKey: 'rectypes.htIntSweetSpot1',  duration: 600, ftpPercent: 88 },
      { name: 'Récup',         nameKey: 'rectypes.typeRecupLabel',   duration: 180, ftpPercent: 55 },
      { name: 'Sweet Spot 2',  nameKey: 'rectypes.htIntSweetSpot2',  duration: 600, ftpPercent: 88 },
      { name: 'Récup',         nameKey: 'rectypes.typeRecupLabel',   duration: 180, ftpPercent: 55 },
      { name: 'Sweet Spot 3',  nameKey: 'rectypes.htIntSweetSpot3',  duration: 600, ftpPercent: 88 },
      { name: 'Retour calme',  nameKey: 'rectypes.htIntCooldown',    duration: 360, ftpPercent: 50 },
    ],
  },
  {
    name: 'VO2max',
    nameKey: 'rectypes.typeVo2maxLabel',
    duration: 2400,
    intervals: [
      { name: 'Échauffement', nameKey: 'rectypes.htProgWarmup',    duration: 600, ftpPercent: 55 },
      { name: 'Effort 1',     nameKey: 'rectypes.htIntEffort1',    duration: 180, ftpPercent: 110 },
      { name: 'Récup',        nameKey: 'rectypes.typeRecupLabel',  duration: 180, ftpPercent: 50 },
      { name: 'Effort 2',     nameKey: 'rectypes.htIntEffort2',    duration: 180, ftpPercent: 110 },
      { name: 'Récup',        nameKey: 'rectypes.typeRecupLabel',  duration: 180, ftpPercent: 50 },
      { name: 'Effort 3',     nameKey: 'rectypes.htIntEffort3',    duration: 180, ftpPercent: 110 },
      { name: 'Récup',        nameKey: 'rectypes.typeRecupLabel',  duration: 180, ftpPercent: 50 },
      { name: 'Effort 4',     nameKey: 'rectypes.htIntEffort4',    duration: 180, ftpPercent: 110 },
      { name: 'Retour calme', nameKey: 'rectypes.htIntCooldown',   duration: 360, ftpPercent: 50 },
    ],
  },
]

export const HT_TYPES = [
  { id: 'endurance', label: 'Endurance',  labelKey: 'rectypes.typeEnduranceLabel',  desc: 'Zone 2', descKey: 'rectypes.htZone2Desc' },
  { id: 'sweetspot', label: 'Sweet Spot', labelKey: 'rectypes.typeSweetSpotLabel',  desc: 'Zone 3-4', descKey: 'rectypes.htZone34Desc' },
  { id: 'threshold', label: 'Seuil',      labelKey: 'rectypes.typeSeuilLabel',      desc: 'Zone 4', descKey: 'rectypes.htZone4Desc' },
  { id: 'vo2max',    label: 'VO2max',     labelKey: 'rectypes.typeVo2maxLabel',     desc: 'Zone 5', descKey: 'rectypes.htZone5Desc' },
  { id: 'anaerobic', label: 'Anaérobie',  labelKey: 'rectypes.typeAnaerobieLabel',  desc: 'Zone 6', descKey: 'rectypes.htZone6Desc' },
  { id: 'recovery',  label: 'Récup',      labelKey: 'rectypes.typeRecupLabel',      desc: 'Zone 1', descKey: 'rectypes.htZone1Desc' },
]

export function getZoneColor(ftpPct: number): string {
  if (ftpPct < 55)  return '#94A3B8'
  if (ftpPct < 75)  return '#3B82F6'
  if (ftpPct < 90)  return '#22C55E'
  if (ftpPct < 105) return '#EAB308'
  if (ftpPct < 120) return '#F97316'
  return '#EF4444'
}

export function getZoneLabel(ftpPct: number): string {
  if (ftpPct < 55)  return 'Z1 — Récupération'
  if (ftpPct < 75)  return 'Z2 — Endurance'
  if (ftpPct < 90)  return 'Z3 — Tempo'
  if (ftpPct < 105) return 'Z4 — Seuil'
  if (ftpPct < 120) return 'Z5 — VO2max'
  return 'Z6 — Anaérobie'
}

// Clé i18n parallèle pour le libellé de zone (rétro-compat : getZoneLabel reste FR)
export function getZoneLabelKey(ftpPct: number): string {
  if (ftpPct < 55)  return 'rectypes.zoneZ1'
  if (ftpPct < 75)  return 'rectypes.zoneZ2'
  if (ftpPct < 90)  return 'rectypes.zoneZ3'
  if (ftpPct < 105) return 'rectypes.zoneZ4'
  if (ftpPct < 120) return 'rectypes.zoneZ5'
  return 'rectypes.zoneZ6'
}
