export const ROWING_TYPES = [
  { id: 'ef',       label: 'EF',          labelKey: 'rectypes.typeEfLabel',         desc: 'Endurance fondamentale', descKey: 'rectypes.typeEnduranceFondaDesc' },
  { id: 'seuil',    label: 'Seuil',       labelKey: 'rectypes.typeSeuilLabel',      desc: 'Effort au seuil',        descKey: 'rectypes.typeEffortSeuilDesc' },
  { id: 'fraction', label: 'Fractionné',  labelKey: 'rectypes.typeFractionneLabel', desc: 'Séries courtes intenses', descKey: 'rectypes.typeSeriesCourtesIntensesDesc' },
  { id: 'longue',   label: 'Longue dist', labelKey: 'rectypes.typeLongueDistLabel', desc: '2000m et plus',          descKey: 'rectypes.type2000PlusDesc' },
  { id: 'piste',    label: 'Ergomètre',   labelKey: 'rectypes.typeErgometreLabel',  desc: 'Séance en salle',        descKey: 'rectypes.typeSeanceSalleDesc' },
  { id: 'recup',    label: 'Récup',       labelKey: 'rectypes.typeRecupLabel',      desc: 'Récupération active',    descKey: 'rectypes.typeRecupActiveDesc' },
]

export const ROWING_PRACTICE_TYPES = [
  { id: 'indoor',   label: 'Ergomètre',  labelKey: 'rectypes.typeErgometreLabel',  desc: 'Rameur en salle',  descKey: 'rectypes.practiceRameurSalleDesc' },
  { id: 'sculling', label: 'Skiff / 2x', labelKey: 'rectypes.practiceSkiffLabel',  desc: 'Aviron de couple', descKey: 'rectypes.practiceAvironCoupleDesc' },
  { id: 'sweep',    label: 'Pointe',     labelKey: 'rectypes.practicePointeLabel', desc: 'Aviron de pointe', descKey: 'rectypes.practiceAvironPointeDesc' },
  { id: 'kayak',    label: 'Kayak',      labelKey: 'rectypes.practiceKayakLabel',  desc: 'Pagaie double',    descKey: 'rectypes.practicePagaieDoubleDesc' },
  { id: 'canoe',    label: 'Canoë',      labelKey: 'rectypes.practiceCanoeLabel',  desc: 'Pagaie simple',    descKey: 'rectypes.practicePagaieSimpleDesc' },
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
