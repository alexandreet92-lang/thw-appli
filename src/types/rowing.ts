export const ROWING_TYPES = [
  { id: 'ef',       label: 'EF',          desc: 'Endurance fondamentale' },
  { id: 'seuil',    label: 'Seuil',       desc: 'Effort au seuil' },
  { id: 'fraction', label: 'Fractionné',  desc: 'Séries courtes intenses' },
  { id: 'longue',   label: 'Longue dist', desc: '2000m et plus' },
  { id: 'piste',    label: 'Ergomètre',   desc: 'Séance en salle' },
  { id: 'recup',    label: 'Récup',       desc: 'Récupération active' },
]

export const ROWING_PRACTICE_TYPES = [
  { id: 'indoor',   label: 'Ergomètre',  desc: 'Rameur en salle' },
  { id: 'sculling', label: 'Skiff / 2x', desc: 'Aviron de couple' },
  { id: 'sweep',    label: 'Pointe',     desc: 'Aviron de pointe' },
  { id: 'kayak',    label: 'Kayak',      desc: 'Pagaie double' },
  { id: 'canoe',    label: 'Canoë',      desc: 'Pagaie simple' },
]

export interface RowingPiece {
  id: string
  distanceM: number
  durationSec: number
  restSec: number
}

export function formatSplit(s: number): string {
  if (!isFinite(s) || s <= 0) return '--:--'
  const min = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function calcSplit500(durationSec: number, distanceM: number): number {
  if (distanceM <= 0) return 0
  return durationSec / (distanceM / 500)
}

export function calcWatts(split500Sec: number): number {
  if (split500Sec <= 0) return 0
  return Math.round(2.8 * Math.pow(500 / split500Sec, 3))
}
