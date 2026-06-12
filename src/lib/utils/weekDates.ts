// Dates de semaine ISO pour les blocs d'entraînement. RÈGLE UI : on n'affiche JAMAIS un
// numéro de semaine ISO (« S22 »), uniquement des plages de dates réelles (lundi→dimanche).

// Lundi de la semaine ISO donnée.
export function getWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const firstMonday = new Date(jan4)
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1)
  const result = new Date(firstMonday)
  result.setDate(firstMonday.getDate() + (week - 1) * 7)
  return result
}

// Dimanche de la semaine ISO donnée.
export function getWeekEnd(year: number, week: number): Date {
  const start = getWeekStart(year, week)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

const fmtDM = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// « 25 mai »
export function formatWeekStart(year: number, week: number): string {
  return fmtDM(getWeekStart(year, week))
}

// « 31 mai » (dimanche de la semaine)
export function formatWeekEnd(year: number, week: number): string {
  return fmtDM(getWeekEnd(year, week))
}

// Phase d'un bloc relative à aujourd'hui (dates réelles, robuste cross-année).
export function blocPhase(startYear: number, startWeek: number, durationWeeks: number): 'past' | 'current' | 'future' {
  const start = getWeekStart(startYear, startWeek)
  const end = getWeekEnd(startYear, startWeek + durationWeeks - 1)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  if (now.getTime() > end.getTime()) return 'past'
  if (now.getTime() < start.getTime()) return 'future'
  return 'current'
}

// « 25 mai – 21 jun » (départ → fin du bloc)
export function formatBlocRange(startYear: number, startWeek: number, durationWeeks: number): string {
  const start = getWeekStart(startYear, startWeek)
  const end = getWeekEnd(startYear, startWeek + durationWeeks - 1)
  return `${fmtDM(start)} – ${fmtDM(end)}`
}

// Semaine + année ISO d'une date (algorithme ISO canonique).
export function isoWeekYear(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: date.getUTCFullYear(), week }
}

// Semaine ISO courante.
export function getCurrentWeek(): { year: number; week: number } {
  return isoWeekYear(new Date())
}

// Position (1-based) de la semaine courante dans un bloc, bornée à [1, durationWeeks].
export function currentWeekInBloc(startWeek: number, durationWeeks: number): number {
  const { week } = getCurrentWeek()
  return Math.max(1, Math.min(durationWeeks, week - startWeek + 1))
}

// Options de lundis pour le sélecteur « début du bloc » — dates réelles, aucun numéro ISO en UI.
export interface WeekOption { year: number; week: number; day: string; month: string; key: string }
export function weekStartOptions(count = 12, startOffset = -1): WeekOption[] {
  const today = new Date()
  const dow = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow + startOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i * 7)
    const { year, week } = isoWeekYear(d)
    return { year, week, day: String(d.getDate()), month: d.toLocaleDateString('fr-FR', { month: 'short' }), key: `${year}-${week}` }
  })
}
