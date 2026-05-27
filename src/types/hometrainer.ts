export interface HTInterval {
  name: string
  duration: number
  ftpPercent: number
}

export interface HTProgram {
  name: string
  duration: number
  intervals: HTInterval[]
}

export const HT_PROGRAMS: HTProgram[] = [
  {
    name: 'Échauffement',
    duration: 600,
    intervals: [
      { name: 'Zone 1', duration: 600, ftpPercent: 50 },
    ],
  },
  {
    name: 'Sweet Spot',
    duration: 2700,
    intervals: [
      { name: 'Échauffement',  duration: 600, ftpPercent: 55 },
      { name: 'Sweet Spot 1',  duration: 600, ftpPercent: 88 },
      { name: 'Récup',         duration: 180, ftpPercent: 55 },
      { name: 'Sweet Spot 2',  duration: 600, ftpPercent: 88 },
      { name: 'Récup',         duration: 180, ftpPercent: 55 },
      { name: 'Sweet Spot 3',  duration: 600, ftpPercent: 88 },
      { name: 'Retour calme',  duration: 360, ftpPercent: 50 },
    ],
  },
  {
    name: 'VO2max',
    duration: 2400,
    intervals: [
      { name: 'Échauffement', duration: 600, ftpPercent: 55 },
      { name: 'Effort 1',     duration: 180, ftpPercent: 110 },
      { name: 'Récup',        duration: 180, ftpPercent: 50 },
      { name: 'Effort 2',     duration: 180, ftpPercent: 110 },
      { name: 'Récup',        duration: 180, ftpPercent: 50 },
      { name: 'Effort 3',     duration: 180, ftpPercent: 110 },
      { name: 'Récup',        duration: 180, ftpPercent: 50 },
      { name: 'Effort 4',     duration: 180, ftpPercent: 110 },
      { name: 'Retour calme', duration: 360, ftpPercent: 50 },
    ],
  },
]

export const HT_TYPES = [
  { id: 'endurance', label: 'Endurance',  desc: 'Zone 2' },
  { id: 'sweetspot', label: 'Sweet Spot', desc: 'Zone 3-4' },
  { id: 'threshold', label: 'Seuil',      desc: 'Zone 4' },
  { id: 'vo2max',    label: 'VO2max',     desc: 'Zone 5' },
  { id: 'anaerobic', label: 'Anaérobie',  desc: 'Zone 6' },
  { id: 'recovery',  label: 'Récup',      desc: 'Zone 1' },
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
