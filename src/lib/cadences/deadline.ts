// ══════════════════════════════════════════════════════════════════
// CADENCES — limite de durée d'un test (max_days) : jour courant et rappels.
// Pur (sans accès réseau) : utilisé par le cron des notifications et par validate.ts.
// ══════════════════════════════════════════════════════════════════

const DAY = 86400000

/** Jour du test (1 = jour de la première saisie) à la date `todayISO` (AAAA-MM-JJ). */
export function testDayNumber(firstISO: string, todayISO: string): number {
  return Math.round((Date.parse(todayISO + 'T12:00:00Z') - Date.parse(firstISO + 'T12:00:00Z')) / DAY) + 1
}

/** Rappel à envoyer ce jour-là (une seule fois par jalon), ou null. */
export function deadlineReminder(day: number, max: number): { m: 'J-3' | 'J-1' | 'depasse'; title: string; body: string } | null {
  if (!Number.isFinite(day) || !Number.isFinite(max) || max <= 3) return null
  if (day === max - 3) return { m: 'J-3', title: 'Decaform : plus que 3 jours', body: `Ton test doit être terminé en ${max} jours maximum pour que les résultats restent comparables. Il te reste 3 jours.` }
  if (day === max - 1) return { m: 'J-1', title: 'Decaform : dernier jour demain', body: `Tu as jusqu'à demain pour terminer ton test (${max} jours maximum).` }
  if (day === max + 1) return { m: 'depasse', title: 'Decaform : limite dépassée', body: `Ton test dépasse ${max} jours : les résultats seront moins comparables. Termine-le dès que possible, ou supprime-le pour recommencer.` }
  return null
}
