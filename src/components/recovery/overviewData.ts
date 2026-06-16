// ══════════════════════════════════════════════════════════════
// overviewData — construit le scaffold de semaines pour la Vue
// d'ensemble Récupération. Tant qu'aucune source (health_data /
// check-in) n'est branchée, toutes les séries sont `null` : le
// graphe affiche son état "non synchronisé". Aucune donnée mock.
// ══════════════════════════════════════════════════════════════

import type { Serie, WeekData } from './RecoveryTrendChart'

const MONTHS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const KEYS: Serie[] = ['hrv', 'sommeil', 'readiness', 'fc', 'fatigue']

function mondayOf(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // 0 = lundi
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const a = `${monday.getDate()}${monday.getMonth() !== sunday.getMonth() ? ' ' + MONTHS[monday.getMonth()] : ''}`
  const b = `${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`
  return `${a} – ${b}`
}

/** N dernières semaines (ordre chronologique, dernière = courante). Toutes séries null. */
export function buildEmptyWeeks(count = 4, today: Date = new Date()): WeekData[] {
  const base = mondayOf(today)
  const empty = () => Array<number | null>(7).fill(null)
  const weeks: WeekData[] = []
  for (let i = count - 1; i >= 0; i--) {
    const monday = new Date(base)
    monday.setDate(base.getDate() - i * 7)
    weeks.push({
      label: weekLabel(monday),
      values: Object.fromEntries(KEYS.map(k => [k, empty()])) as Record<Serie, (number | null)[]>,
    })
  }
  return weeks
}
