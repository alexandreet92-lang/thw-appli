import { currentLocale } from '@/lib/i18n/locale'
// ══════════════════════════════════════════════════════════════
// Dashboard — helpers dates partagés + tokens de style réutilisés.
// Tout passe par var(--token) ; aucune couleur en dur ici.
// ══════════════════════════════════════════════════════════════

export const FD = 'var(--font-display)'
export const FB = 'var(--font-body)'

/** Chiffres : Inter tabulaire, zéro barré, neutres. */
export const NUM: React.CSSProperties = {
  fontFamily: FB,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: "'zero' 0",
  color: 'var(--text)',
}

/** Date locale "YYYY-MM-DD". */
export function todayIso(): string {
  const d = new Date()
  return iso(d)
}

export function iso(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Lundi de la semaine courante (ISO, semaine commence lundi). */
export function weekStartIso(): string {
  const d = new Date()
  const dayIndex = (d.getDay() + 6) % 7 // 0 = lundi
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayIndex)
  return iso(monday)
}

/** Index du jour courant, 0 = lundi … 6 = dimanche. */
export function currentDayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

export const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

/** « mercredi 11 juin » capitalisé. */
export function formatLongDate(d = new Date()): string {
  const s = d.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** « 11 juin » court. */
export function formatShortDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + (isoDate.length === 10 ? 'T00:00:00' : ''))
    return d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })
  } catch {
    return isoDate
  }
}

/** Jours pleins entre aujourd'hui et une date ISO future (>= 0). */
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + 'T00:00:00').getTime()
  const now = new Date(todayIso() + 'T00:00:00').getTime()
  return Math.max(0, Math.round((target - now) / 86_400_000))
}

/** Durée minutes → « 1 h 05 » / « 45 min ». */
export function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

/** Distance mètres → « 12,4 km » / « 850 m ». */
export function formatDistance(meters: number | null | undefined): string {
  if (!meters || meters <= 0) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}
