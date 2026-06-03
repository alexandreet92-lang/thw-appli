// ══════════════════════════════════════════════════════════════
// Format des durées de records de puissance (vélo).
// Partagé entre RecordsBeaten et ActivityCard.
// ══════════════════════════════════════════════════════════════

// Ordre canonique des durées (évite le tri lexicographique)
export const DURATION_ORDER: string[] = [
  'Pmax',
  '5s', '10s', '30s',
  '1min', '3min', '5min', '8min', '10min', '12min', '15min',
  '20min', '30min', '45min',
  '1h', '1h30', '90min',
  '2h', '3h', '4h', '5h', '6h',
]

export function durationRank(label: string): number {
  const i = DURATION_ORDER.indexOf(label)
  return i === -1 ? 9999 : i
}

/**
 * Transforme un `distance_label` DB en libellé court UI.
 *  Pmax            → Pmax
 *  5s / 10s / 30s  → tels quels
 *  Nmin            → N' (1' / 3' / … / 45')
 *  90min / 1h30    → 1h30
 *  Nh              → tels quels (1h, 2h, …, 6h)
 */
export function formatRecordDuration(label: string): string {
  if (!label) return '—'
  if (label === 'Pmax') return 'Pmax'
  if (label === '90min' || label === '1h30') return '1h30'
  if (/^\d+s$/.test(label)) return label
  const mMatch = label.match(/^(\d+)min$/)
  if (mMatch) return `${mMatch[1]}'`
  if (/^\d+h$/.test(label)) return label
  return label
}
