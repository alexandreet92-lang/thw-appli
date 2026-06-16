// ══════════════════════════════════════════════════════════════
// overviewData — construit le scaffold de semaines pour la Vue
// d'ensemble Récupération. La série `hrv` est remplie depuis les
// vraies valeurs (health_data). Les autres séries restent `null`
// tant que leur source n'est pas branchée (sommeil = en attente Polar,
// readiness/fc/fatigue = à venir via check-in). Aucune donnée mock.
// ══════════════════════════════════════════════════════════════

import type { Serie, WeekData } from './RecoveryTrendChart'

const MONTHS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function mondayOf(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // 0 = lundi
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const a = `${monday.getDate()}${monday.getMonth() !== sunday.getMonth() ? ' ' + MONTHS[monday.getMonth()] : ''}`
  const b = `${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`
  return `${a} – ${b}`
}

/**
 * N dernières semaines (ordre chronologique, dernière = la plus récente).
 * Série `hrv` remplie depuis `hrvByDate` (clé 'YYYY-MM-DD' → valeur ms) ;
 * autres séries `null`. `today` ancre la fenêtre (ex. dernière nuit HRV reçue).
 */
export function buildWeeks(
  hrvByDate?: Map<string, number>,
  count = 4,
  today: Date = new Date(),
): WeekData[] {
  const base = mondayOf(today)
  const nulls = () => Array<number | null>(7).fill(null)
  const weeks: WeekData[] = []

  for (let i = count - 1; i >= 0; i--) {
    const monday = new Date(base)
    monday.setDate(base.getDate() - i * 7)

    const hrv: (number | null)[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + d)
      hrv.push(hrvByDate?.get(ymd(day)) ?? null)
    }

    weeks.push({
      label: weekLabel(monday),
      values: { hrv, sommeil: nulls(), readiness: nulls(), fc: nulls(), fatigue: nulls() },
    })
  }
  return weeks
}
