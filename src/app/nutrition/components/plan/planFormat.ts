// Helpers de formatage + tokens de charge pour l'onglet « Mon plan ».
// Aucune couleur littérale ici : la sémantique de charge passe par des tokens CSS
// (DESIGN_SYSTEM.md §2 — points uniquement).

export type DayType = 'low' | 'mid' | 'hard'

export const CHARGE_COLOR: Record<DayType, string> = {
  low:  'var(--charge-low)',
  mid:  'var(--charge-mid)',
  hard: 'var(--charge-hard)',
}

export const CHARGE_LABEL: Record<DayType, string> = {
  low: 'Low', mid: 'Mid', hard: 'Hard',
}

const WD       = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const WD_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
const MO       = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function parse(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

// « Aujourd'hui, mercredi 10 juin »
export function todayHeadline(dateStr: string): string {
  const d = parse(dateStr)
  return `Aujourd'hui, ${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`
}

// « semaine du 9 juin » (lundi de la semaine courante)
export function weekOf(dateStr: string): string {
  const d = parse(dateStr)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return `semaine du ${d.getDate()} ${MO[d.getMonth()]}`
}

// Étiquette compacte sous les barres du rythme.
export function dayShort(dateStr: string): { wd: string; day: number } {
  const d = parse(dateStr)
  return { wd: WD_SHORT[d.getDay()], day: d.getDate() }
}
