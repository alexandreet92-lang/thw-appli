// ══════════════════════════════════════════════════════════════════════════
// Planning Week — modèle unifié d'événements d'agenda.
// La page agrège plusieurs sources (séances, courses, objectifs, events perso,
// Google) dans un même type CalEvent pour l'affichage sur la grille.
// ══════════════════════════════════════════════════════════════════════════

export type CalSource = 'session' | 'race' | 'race_event' | 'objective' | 'event' | 'google'

/** Couche d'agenda (couleur + visibilité). kind pilote quelles sources afficher. */
export interface AgendaCalendar {
  id: string
  name: string
  color: string
  kind: 'training' | 'races' | 'objectives' | 'personal' | 'google'
  visible: boolean
  isDefault: boolean
  googleCalendarId: string | null
  sort: number
}

/** Événement affiché sur la grille (vue unifiée, lecture). */
export interface CalEvent {
  id: string            // clé UI unique : `${source}:${rawId}`
  rawId: string
  source: CalSource
  calendarKind: AgendaCalendar['kind']
  title: string
  sport: string | null
  start: string         // ISO
  end: string           // ISO
  allDay: boolean
  color: string
  editable: boolean     // déplaçable/éditable directement sur la grille
  description: string | null
  rpe: number | null
  durationMin: number | null
  blocks: unknown | null
  reminderMin: number | null
  rrule: string | null
  meta: Record<string, unknown>
}

/** Payload de création/édition d'un événement perso. */
export interface EventInput {
  title: string
  description?: string | null
  location?: string | null
  start: string
  end: string
  allDay?: boolean
  color?: string | null
  calendarId?: string | null
  rrule?: string | null
  reminderMin?: number | null
}

/** Payload de création d'une séance « light » depuis l'agenda. */
export interface SessionLightInput {
  title: string
  sport: string
  start: string          // ISO
  durationMin: number
  rpe?: number | null
  description?: string | null
  reminderMin?: number | null
}

export const DEFAULT_REMINDER_MIN = 30

// Couleur auto par sport (les séances ont une couleur dédiée, modifiable ensuite).
export const SPORT_COLORS: Record<string, string> = {
  running: '#22C55E', run: '#22C55E', trail: '#16A34A',
  cycling: '#F97316', bike: '#F97316', velo: '#F97316',
  swim: '#06B6D4', natation: '#06B6D4',
  hyrox: '#8B5CF6',
  gym: '#EF4444', muscu: '#EF4444', force: '#EF4444',
  boxe: '#DC2626', boxing: '#DC2626',
  rowing: '#0EA5E9', aviron: '#0EA5E9',
}

export function sportColor(sport: string | null | undefined): string {
  const s = (sport ?? '').toLowerCase()
  for (const key of Object.keys(SPORT_COLORS)) if (s.includes(key)) return SPORT_COLORS[key]
  return '#3B82F6'
}
