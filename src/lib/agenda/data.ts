// ══════════════════════════════════════════════════════════════════════════
// Planning Week — accès données de l'agenda (client).
// Agrège en un modèle unifié : séances (planned_sessions), courses
// (planned_races + race_events), objectifs/événements (calendar_events existant)
// et événements perso horodatés (agenda_events). CRUD sur agenda_events +
// création/déplacement de séances « light » (planned_sessions).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import type { AgendaCalendar, CalEvent, EventInput, SessionLightInput } from '@/lib/agenda/types'
import { sportColor } from '@/lib/agenda/types'

const DAY = 86400000
const iso = (d: Date) => d.toISOString()
const ymd = (d: Date) => d.toISOString().slice(0, 10)
function mondayOf(d: Date): Date { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setHours(0,0,0,0); x.setDate(x.getDate() - dow); return x }
function dayIndexOf(d: Date): number { return (d.getDay() + 6) % 7 } // lundi = 0
function hhmm(d: Date): string { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }

// Expansion d'une règle de récurrence (sous-ensemble iCal) sur une plage.
// Supporte FREQ=DAILY|WEEKLY|MONTHLY, BYDAY=MO,TU,…, INTERVAL=N (tou(te)s les N),
// COUNT=N (nombre max d'occurrences depuis baseStart) et UNTIL=YYYYMMDD (date de
// fin incluse). Retourne les débuts d'occurrence dans la plage.
const RRULE_DOW: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 }
function startOfLocalDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addLocalDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function parseUntil(s: string | undefined): Date | null {
  if (!s) return null
  const m = s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(23, 59, 59, 999) // fin de journée : UNTIL est inclusif
  return d
}
export function expandRRule(baseStart: Date, rrule: string, rangeStart: Date, rangeEnd: Date, cap = 400): Date[] {
  const parts = Object.fromEntries(rrule.split(';').map(p => p.split('=')) as [string, string][])
  const freq = parts.FREQ
  const interval = Math.max(1, parseInt(parts.INTERVAL ?? '1', 10) || 1)
  const count = parts.COUNT != null ? Math.max(0, parseInt(parts.COUNT, 10) || 0) : null
  const until = parseUntil(parts.UNTIL)
  const byday = parts.BYDAY ? parts.BYDAY.split(',').map(d => RRULE_DOW[d]).filter(n => n != null) : null
  const out: Date[] = []
  const hh = baseStart.getHours(), mm = baseStart.getMinutes()
  const baseDay = startOfLocalDay(baseStart)
  let n = 0 // occurrences vues depuis baseStart (pour COUNT)

  // Traite une date candidate (au jour). Retourne false pour arrêter l'énumération.
  const consider = (day: Date): boolean => {
    const x = new Date(day); x.setHours(hh, mm, 0, 0)
    if (count != null && n >= count) return false
    if (until && x > until) return false
    if (x >= rangeEnd) return false // toutes les suivantes seront aussi hors plage
    n++
    if (x >= rangeStart && x >= baseStart) out.push(x)
    return true
  }
  // Quand il n'y a pas de COUNT, on peut sauter directement près de rangeStart.
  const canFastForward = count == null

  if (freq === 'DAILY') {
    const stepDays = interval
    let start = new Date(baseDay)
    if (canFastForward && start < rangeStart) {
      const diff = Math.floor((startOfLocalDay(rangeStart).getTime() - baseDay.getTime()) / DAY)
      if (diff > 0) start = addLocalDays(baseDay, Math.floor(diff / stepDays) * stepDays)
    }
    for (let d = start, i = 0; i < cap; d = addLocalDays(d, stepDays), i++) if (!consider(d)) break
  } else if (freq === 'WEEKLY') {
    const targets = byday && byday.length ? byday : [baseStart.getDay()]
    // Début de semaine (dimanche) de baseStart, aligné sur INTERVAL semaines.
    let wk = addLocalDays(baseDay, -baseDay.getDay())
    if (canFastForward && wk < rangeStart) {
      const weeks = Math.floor((startOfLocalDay(rangeStart).getTime() - wk.getTime()) / (7 * DAY))
      if (weeks > 0) wk = addLocalDays(wk, Math.floor(weeks / interval) * interval * 7)
    }
    outer: for (let i = 0; i < cap; i++, wk = addLocalDays(wk, 7 * interval)) {
      for (let dow = 0; dow < 7; dow++) {
        const d = addLocalDays(wk, dow)
        if (!targets.includes(d.getDay())) continue
        if (d < baseDay) continue // avant l'origine dans la première semaine
        if (!consider(d)) break outer
      }
    }
  } else if (freq === 'MONTHLY') {
    const dom = baseStart.getDate()
    let i0 = 0
    if (canFastForward) {
      const monthsDiff = (rangeStart.getFullYear() - baseStart.getFullYear()) * 12 + (rangeStart.getMonth() - baseStart.getMonth())
      if (monthsDiff > 0) i0 = Math.floor(monthsDiff / interval)
    }
    for (let i = i0; i < i0 + cap; i++) {
      const d = new Date(baseStart.getFullYear(), baseStart.getMonth() + i * interval, dom)
      if (d.getDate() !== dom) { if (d >= rangeEnd) break; continue } // mois sans ce quantième
      if (!consider(d)) break
    }
  }
  return out
}

// "18:00" / "18h30" / "8h" → minutes depuis minuit ; null si non horaire.
function parseTimeToMin(t: string | null | undefined): number | null {
  if (!t) return null
  const m = t.match(/^(\d{1,2})\s*[:hH]\s*(\d{2})?/)
  if (!m) return null
  const h = Number(m[1]); const mn = m[2] ? Number(m[2]) : 0
  if (h > 23 || mn > 59) return null
  return h * 60 + mn
}

// ── Couches ────────────────────────────────────────────────────────────────
const DEFAULT_CALENDARS: Array<Pick<AgendaCalendar,'name'|'color'|'kind'|'sort'> & { isDefault: boolean }> = [
  { name: 'Entraînement', color: '#2563EB', kind: 'training',   sort: 0, isDefault: true },
  { name: 'Courses',      color: '#EF4444', kind: 'races',      sort: 1, isDefault: false },
  { name: 'Objectifs',    color: '#8B5CF6', kind: 'objectives', sort: 2, isDefault: false },
  { name: 'Perso',        color: '#0EA5E9', kind: 'personal',   sort: 3, isDefault: true },
]

function mapCalendarRow(r: Record<string, unknown>): AgendaCalendar {
  return {
    id: r.id as string,
    name: r.name as string,
    color: r.color as string,
    kind: r.kind as AgendaCalendar['kind'],
    visible: r.visible !== false,
    isDefault: !!r.is_default,
    googleCalendarId: (r.google_calendar_id as string | null) ?? null,
    sort: (r.sort as number) ?? 0,
  }
}

export async function getCalendars(): Promise<AgendaCalendar[]> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb)
  if (!uid) return []
  let { data } = await sb.from('agenda_calendars').select('*').eq('user_id', uid).order('sort')
  if (!data || data.length === 0) {
    // Seed des couches par défaut (une seule fois).
    await sb.from('agenda_calendars').insert(DEFAULT_CALENDARS.map(c => ({
      user_id: uid, name: c.name, color: c.color, kind: c.kind, sort: c.sort, is_default: c.isDefault,
    })))
    const res = await sb.from('agenda_calendars').select('*').eq('user_id', uid).order('sort')
    data = res.data
  }
  return (data ?? []).map(mapCalendarRow)
}

export async function setCalendarVisible(id: string, visible: boolean): Promise<void> {
  const sb = createClient()
  await sb.from('agenda_calendars').update({ visible }).eq('id', id)
}
export async function updateCalendar(id: string, patch: Partial<Pick<AgendaCalendar,'name'|'color'>>): Promise<void> {
  const sb = createClient()
  await sb.from('agenda_calendars').update(patch).eq('id', id)
}
export async function createCalendar(name: string, color: string): Promise<void> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb); if (!uid) return
  await sb.from('agenda_calendars').insert({ user_id: uid, name, color, kind: 'personal', sort: 99 })
}
export async function deleteCalendar(id: string): Promise<void> {
  const sb = createClient()
  await sb.from('agenda_calendars').delete().eq('id', id)
}

// ── Lecture agrégée d'une plage ──────────────────────────────────────────────
export async function fetchAgenda(startISO: string, endISO: string, calendars: AgendaCalendar[]): Promise<CalEvent[]> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb)
  if (!uid) return []

  const start = new Date(startISO)
  const end = new Date(endISO)
  const startDate = ymd(start)
  const endDate = ymd(end)
  const byKind = (k: AgendaCalendar['kind']) => calendars.find(c => c.kind === k)
  const visible = (k: AgendaCalendar['kind']) => { const c = byKind(k); return !c || c.visible }
  const trainingColor = byKind('training')?.color ?? '#2563EB'
  const racesColor = byKind('races')?.color ?? '#EF4444'
  const objColor = byKind('objectives')?.color ?? '#8B5CF6'
  const persoColor = byKind('personal')?.color ?? '#0EA5E9'
  const googleColor = byKind('google')?.color ?? '#10B981'

  const weekStartFrom = ymd(mondayOf(start))

  const [sessRes, prRes, reRes, ceRes, aeRes] = await Promise.all([
    visible('training')
      ? sb.from('planned_sessions').select('id,title,sport,week_start,day_index,time,duration_min,rpe,notes,blocks,status,starts_at,ends_at,color,reminder_min').eq('user_id', uid).gte('week_start', weekStartFrom).lte('week_start', endDate)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    visible('races')
      ? sb.from('planned_races').select('id,name,sport,date,level').eq('user_id', uid).gte('date', startDate).lte('date', endDate)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    visible('races')
      ? sb.from('race_events').select('id,name,start_date,end_date').eq('user_id', uid).lte('start_date', endDate)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    visible('objectives')
      ? sb.from('calendar_events').select('id,title,description,color,date,category,done').eq('user_id', uid).gte('date', startDate).lte('date', endDate)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    (visible('personal') || visible('google'))
      ? sb.from('agenda_events').select('*').eq('user_id', uid).lt('starts_at', endISO).gt('ends_at', startISO)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const out: CalEvent[] = []

  // Séances
  for (const s of (sessRes.data ?? []) as Record<string, unknown>[]) {
    let st: Date, en: Date, allDay = false
    if (s.starts_at) {
      st = new Date(s.starts_at as string)
      en = s.ends_at ? new Date(s.ends_at as string) : new Date(st.getTime() + ((s.duration_min as number) ?? 60) * 60000)
    } else {
      const base = new Date(new Date((s.week_start as string) + 'T00:00:00').getTime() + ((s.day_index as number) ?? 0) * DAY)
      const tmin = parseTimeToMin(s.time as string | null)
      if (tmin == null) { allDay = true; st = new Date(base); en = new Date(base) }
      else { st = new Date(base.getTime() + tmin * 60000); en = new Date(st.getTime() + ((s.duration_min as number) ?? 60) * 60000) }
    }
    if (en < start || st > end) continue
    out.push({
      id: `session:${s.id}`, rawId: s.id as string, source: 'session', calendarKind: 'training',
      title: (s.title as string) || (s.sport as string) || 'Séance', sport: (s.sport as string) ?? null,
      start: iso(st), end: iso(en), allDay,
      color: (s.color as string) || trainingColor,
      editable: true,
      description: (s.notes as string) ?? null, rpe: (s.rpe as number) ?? null,
      durationMin: (s.duration_min as number) ?? null, blocks: s.blocks ?? null,
      reminderMin: (s.reminder_min as number) ?? null, rrule: null,
      meta: { status: s.status },
    })
  }

  // Courses (planned_races) — all-day, lecture seule
  for (const r of (prRes.data ?? []) as Record<string, unknown>[]) {
    const d = new Date((r.date as string) + 'T00:00:00')
    out.push({
      id: `race:${r.id}`, rawId: r.id as string, source: 'race', calendarKind: 'races',
      title: (r.name as string) || 'Course', sport: (r.sport as string) ?? null,
      start: iso(d), end: iso(new Date(d.getTime() + DAY - 1)), allDay: true,
      color: racesColor, editable: false, description: null, rpe: null, durationMin: null, blocks: null,
      reminderMin: null, rrule: null, meta: { type: r.level ?? null },
    })
  }
  // Compétitions multi-jours (race_events)
  for (const r of (reRes.data ?? []) as Record<string, unknown>[]) {
    const d0 = new Date((r.start_date as string) + 'T00:00:00')
    const d1 = new Date(((r.end_date as string) || (r.start_date as string)) + 'T23:59:59')
    if (d1 < start || d0 > end) continue
    out.push({
      id: `race_event:${r.id}`, rawId: r.id as string, source: 'race_event', calendarKind: 'races',
      title: (r.name as string) || 'Compétition', sport: null,
      start: iso(d0), end: iso(d1), allDay: true,
      color: racesColor, editable: false, description: null, rpe: null, durationMin: null, blocks: null,
      reminderMin: null, rrule: null, meta: {},
    })
  }
  // Objectifs / événements (calendar_events existant) — all-day, lecture seule
  for (const e of (ceRes.data ?? []) as Record<string, unknown>[]) {
    const d = new Date((e.date as string) + 'T00:00:00')
    out.push({
      id: `objective:${e.id}`, rawId: e.id as string, source: 'objective', calendarKind: 'objectives',
      title: (e.title as string) || 'Objectif', sport: null,
      start: iso(d), end: iso(new Date(d.getTime() + DAY - 1)), allDay: true,
      color: (e.color as string) || objColor, editable: false,
      description: (e.description as string) ?? null, rpe: null, durationMin: null, blocks: null,
      reminderMin: null, rrule: null, meta: { category: e.category, done: e.done },
    })
  }
  // Événements perso (agenda_events)
  // Note : agenda_events récurrents (rrule) — l'occurrence originale peut être
  // hors plage, on requête donc large côté récurrence ci-dessous.
  const aeRes2 = await (async () => {
    const withR = (aeRes.data ?? []) as Record<string, unknown>[]
    // Récupère aussi les événements récurrents dont l'origine précède la plage.
    const { data: rec } = await sb.from('agenda_events').select('*').eq('user_id', uid).not('rrule', 'is', null).lt('starts_at', startISO)
    const seen = new Set(withR.map(r => r.id as string))
    return withR.concat(((rec ?? []) as Record<string, unknown>[]).filter(r => !seen.has(r.id as string)))
  })()

  for (const e of aeRes2) {
    const isGoogle = (e.source as string) === 'google'
    const kind: AgendaCalendar['kind'] = isGoogle ? 'google' : 'personal'
    if (!visible(kind)) continue
    const cal = calendars.find(c => c.id === (e.calendar_id as string))
    const base = {
      rawId: e.id as string, source: (isGoogle ? 'google' : 'event') as CalEvent['source'], calendarKind: kind,
      title: (e.title as string) || '(sans titre)', sport: null,
      allDay: !!e.all_day,
      color: (e.color as string) || cal?.color || (isGoogle ? googleColor : persoColor),
      editable: !isGoogle,
      description: (e.description as string) ?? null, rpe: null, durationMin: null as number | null, blocks: null,
      reminderMin: (e.reminder_min as number) ?? null, rrule: (e.rrule as string) ?? null,
      meta: { location: e.location, calendarId: e.calendar_id, googleEventId: e.google_event_id },
    }
    const bStart = new Date(e.starts_at as string)
    const durMs = new Date(e.ends_at as string).getTime() - bStart.getTime()
    if (e.rrule) {
      for (const occ of expandRRule(bStart, e.rrule as string, start, end)) {
        out.push({ ...base, id: `event:${e.id}:${occ.getTime()}`, start: iso(occ), end: iso(new Date(occ.getTime() + durMs)) })
      }
    } else {
      out.push({ ...base, id: `event:${e.id}`, start: e.starts_at as string, end: e.ends_at as string })
    }
  }

  return out
}

// ── CRUD événements perso ────────────────────────────────────────────────────
export async function createEvent(input: EventInput): Promise<string | null> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb); if (!uid) return null
  const { data } = await sb.from('agenda_events').insert({
    user_id: uid, calendar_id: input.calendarId ?? null,
    title: input.title, description: input.description ?? null, location: input.location ?? null,
    starts_at: input.start, ends_at: input.end, all_day: input.allDay ?? false,
    color: input.color ?? null, rrule: input.rrule ?? null, reminder_min: input.reminderMin ?? null,
  }).select('id').maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}
export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<void> {
  const sb = createClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title != null) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.location !== undefined) row.location = patch.location
  if (patch.start != null) row.starts_at = patch.start
  if (patch.end != null) row.ends_at = patch.end
  if (patch.allDay != null) row.all_day = patch.allDay
  if (patch.color !== undefined) row.color = patch.color
  if (patch.calendarId !== undefined) row.calendar_id = patch.calendarId
  if (patch.rrule !== undefined) row.rrule = patch.rrule
  if (patch.reminderMin !== undefined) row.reminder_min = patch.reminderMin
  await sb.from('agenda_events').update(row).eq('id', id)
}
export async function deleteEvent(id: string): Promise<void> {
  const sb = createClient()
  await sb.from('agenda_events').delete().eq('id', id)
}
export async function moveEvent(id: string, startISO: string, endISO: string): Promise<void> {
  const sb = createClient()
  await sb.from('agenda_events').update({ starts_at: startISO, ends_at: endISO, updated_at: new Date().toISOString() }).eq('id', id)
}

// ── Séances « light » (planned_sessions) ─────────────────────────────────────
export async function createSessionLight(input: SessionLightInput): Promise<string | null> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb); if (!uid) return null
  const st = new Date(input.start)
  const en = new Date(st.getTime() + input.durationMin * 60000)
  const { data } = await sb.from('planned_sessions').insert({
    user_id: uid,
    title: input.title, sport: input.sport,
    week_start: ymd(mondayOf(st)), day_index: dayIndexOf(st), time: hhmm(st),
    duration_min: input.durationMin, rpe: input.rpe ?? null, notes: input.description ?? null,
    starts_at: iso(st), ends_at: iso(en), color: input.color ?? null,
    reminder_min: input.reminderMin ?? null, status: 'planned',
  }).select('id').maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}
export async function updateSessionLight(id: string, patch: Partial<SessionLightInput>): Promise<void> {
  const sb = createClient()
  const row: Record<string, unknown> = {}
  if (patch.title != null) row.title = patch.title
  if (patch.sport != null) row.sport = patch.sport
  if (patch.rpe !== undefined) row.rpe = patch.rpe
  if (patch.description !== undefined) row.notes = patch.description
  if (patch.reminderMin !== undefined) row.reminder_min = patch.reminderMin
  if (patch.color !== undefined) row.color = patch.color
  if (patch.start != null || patch.durationMin != null) {
    // recalcul des heures si start/durée changent
  }
  await sb.from('planned_sessions').update(row).eq('id', id)
}
export async function moveSession(id: string, startISO: string, durationMin: number): Promise<void> {
  const sb = createClient()
  const st = new Date(startISO)
  const en = new Date(st.getTime() + durationMin * 60000)
  await sb.from('planned_sessions').update({
    starts_at: iso(st), ends_at: iso(en),
    week_start: ymd(mondayOf(st)), day_index: dayIndexOf(st), time: hhmm(st),
  }).eq('id', id)
}

export { sportColor }
