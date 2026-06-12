// Modèle de la frise : fenêtre de 12 semaines ancrée sur le lundi RÉEL (semaine courante − 2).
// Positions calculées par différence de dates réelles (robuste aux changements d'année) — on
// n'affiche jamais de numéro de semaine ISO.
import { getWeekStart } from '@/lib/utils/weekDates'

export const COLS = 12
export const LABEL_WIDTH = 80
export const TODAY_INDEX = 2
const WEEK_MS = 7 * 86400000

export function mondayOf(d: Date): Date {
  const x = new Date(d); const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x
}

export interface FriseCol { idx: number; monday: Date; day: number; month: string; isCurrent: boolean }
export interface MonthGroup { key: string; label: string; count: number; isActive: boolean }
export interface FriseWindow {
  windowStart: Date; baseMonday: Date; cols: FriseCol[]; months: MonthGroup[]
  indexOfDate: (dateStr: string) => number
  indexOfBloc: (year: number, week: number) => number
  mondayAtIndex: (i: number) => Date
}

export function buildFriseWindow(now: Date = new Date()): FriseWindow {
  const baseMonday = mondayOf(now)
  const windowStart = new Date(baseMonday); windowStart.setDate(baseMonday.getDate() - TODAY_INDEX * 7)
  const cols: FriseCol[] = Array.from({ length: COLS }, (_, i) => {
    const m = new Date(windowStart); m.setDate(windowStart.getDate() + i * 7)
    return { idx: i, monday: m, day: m.getDate(), month: m.toLocaleDateString('fr-FR', { month: 'short' }), isCurrent: m.getTime() === baseMonday.getTime() }
  })
  const months: MonthGroup[] = []
  cols.forEach(c => {
    const last = months[months.length - 1]
    if (last && last.label === c.month) { last.count++; if (c.isCurrent) last.isActive = true }
    else months.push({ key: `${c.month}-${c.idx}`, label: c.month, count: 1, isActive: c.isCurrent })
  })
  const idxOf = (m: Date) => Math.round((m.getTime() - windowStart.getTime()) / WEEK_MS)
  return {
    windowStart, baseMonday, cols, months,
    indexOfDate: (s: string) => idxOf(mondayOf(new Date(s))),
    indexOfBloc: (year: number, week: number) => idxOf(mondayOf(getWeekStart(year, week))),
    mondayAtIndex: (i: number) => { const d = new Date(windowStart); d.setDate(windowStart.getDate() + i * 7); return d },
  }
}
