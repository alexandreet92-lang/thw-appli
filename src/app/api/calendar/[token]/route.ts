// ══════════════════════════════════════════════════════════════════
// GET /api/calendar/{token}.ics
//   Flux iCalendar (ICS) privé par utilisateur, résolu via le jeton secret
//   `calendar_feeds.token`. Agrège séances (planned_sessions), courses
//   (planned_races) et objectifs/événements (calendar_events) en VEVENTs.
//   Lecture via service role (bypass RLS) → on scope TOUT par user_id résolu.
//   À sens unique (app → Apple/Google/Outlook). Apple rafraîchit à son rythme.
// ══════════════════════════════════════════════════════════════════
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DOMAIN = 'thw-coaching'

// Un flux par catégorie → une couleur par calendrier dans Apple (les couleurs
// par-événement sont ignorées pour un calendrier abonné). `cal` (query param)
// sélectionne le sous-ensemble ; X-APPLE-CALENDAR-COLOR fixe la couleur par défaut.
const CATS: Record<string, { label: string; color: string }> = {
  all:      { label: 'Entraînements', color: '#1D6FF2' }, // combiné (rétro-compat)
  training: { label: 'Entraînements', color: '#1D6FF2' }, // bleu
  races:    { label: 'Courses',       color: '#FF3B30' }, // rouge
  pro:      { label: 'Professionnel', color: '#34C759' }, // vert
  perso:    { label: 'Personnel',     color: '#AF52DE' }, // violet
}

const SPORT_EMOJI: Record<string, string> = {
  running: '🏃', run: '🏃', trail: '⛰️', cycling: '🚴', bike: '🚴', velo: '🚴',
  swim: '🏊', natation: '🏊', gym: '🏋️', muscu: '🏋️', hyrox: '🔥', yoga: '🧘',
  row: '🚣', rowing: '🚣', triathlon: '🔺',
}

// ── Helpers ICS ─────────────────────────────────────────────────────
function esc(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
/** Pliage des lignes > 74 octets (RFC 5545). */
function fold(line: string): string {
  if (line.length <= 74) return line
  const out: string[] = []
  let rest = line
  out.push(rest.slice(0, 74)); rest = rest.slice(74)
  while (rest.length > 73) { out.push(' ' + rest.slice(0, 73)); rest = rest.slice(73) }
  if (rest.length) out.push(' ' + rest)
  return out.join('\r\n')
}
/** 'YYYY-MM-DD' → 'YYYYMMDD'. */
function ymd(dateStr: string): string { return dateStr.slice(0, 10).replace(/-/g, '') }
/** Décale une date-only de n jours, renvoie 'YYYYMMDD'. */
function shiftYmd(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
/** week_start + day_index → 'YYYYMMDD'. */
function sessionYmd(weekStart: string, dayIndex: number): string {
  return shiftYmd(weekStart, dayIndex || 0)
}
/** Datetime flottant (heure murale, sans TZ) start+end depuis 'YYYYMMDD', 'HH:MM', durée min. */
function floatingRange(dateYmd: string, time: string, durMin: number): { start: string; end: string } | null {
  const m = time?.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const y = +dateYmd.slice(0, 4), mo = +dateYmd.slice(4, 6), d = +dateYmd.slice(6, 8)
  const hh = Math.min(23, +m[1]), mm = Math.min(59, +m[2])
  const startMs = Date.UTC(y, mo - 1, d, hh, mm)
  const endMs = startMs + Math.max(5, durMin || 60) * 60000
  const fmt = (ms: number) => {
    const t = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`
  }
  return { start: fmt(startMs), end: fmt(endMs) }
}

function dtstampNow(): string {
  const t = new Date(); const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}${p(t.getUTCSeconds())}Z`
}

interface VEventInput {
  uid: string; summary: string; description?: string
  allDay?: { start: string; endExclusive: string }   // 'YYYYMMDD'
  timed?: { start: string; end: string }              // floating 'YYYYMMDDTHHMMSS'
}
function vevent(e: VEventInput, stamp: string): string {
  const lines = ['BEGIN:VEVENT', `UID:${e.uid}@${DOMAIN}`, `DTSTAMP:${stamp}`]
  if (e.timed) { lines.push(`DTSTART:${e.timed.start}`, `DTEND:${e.timed.end}`) }
  else if (e.allDay) { lines.push(`DTSTART;VALUE=DATE:${e.allDay.start}`, `DTEND;VALUE=DATE:${e.allDay.endExclusive}`) }
  lines.push(`SUMMARY:${esc(e.summary)}`)
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
  lines.push('END:VEVENT')
  return lines.map(fold).join('\r\n')
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token: raw } = await ctx.params
    const token = (raw || '').replace(/\.ics$/i, '').trim()
    if (!token) return new Response('Not found', { status: 404 })

    let cal = (new URL(req.url).searchParams.get('cal') || 'all').toLowerCase()
    if (!CATS[cal]) cal = 'all'
    const catCfg = CATS[cal]

    const sb = createServiceClient()
    const { data: feed } = await sb.from('calendar_feeds').select('user_id').eq('token', token).maybeSingle()
    if (!feed?.user_id) return new Response('Not found', { status: 404 })
    const uid = feed.user_id as string

    // Fenêtre : passé récent + tout le futur (flux borné mais utile).
    const today = new Date()
    const past180 = new Date(today.getTime() - 180 * 86400000).toISOString().slice(0, 10)
    const past365 = new Date(today.getTime() - 365 * 86400000).toISOString().slice(0, 10)

    // Sélection des sources selon la catégorie du flux.
    const needSessions = cal === 'all' || cal === 'training'
    const needRaces = cal === 'all' || cal === 'races'
    const needEvents = cal === 'all' || cal === 'races' || cal === 'pro' || cal === 'perso'
    // Filtre catégorie sur calendar_events : races→'race', pro→'pro', perso→'perso', all→tout.
    const eventCat = cal === 'races' ? 'race' : cal === 'pro' ? 'pro' : cal === 'perso' ? 'perso' : null

    const eventsQuery = () => {
      const q = sb.from('calendar_events').select('id, category, date, title, description')
        .eq('user_id', uid).gte('date', past365).limit(1000)
      return eventCat ? q.eq('category', eventCat) : q
    }

    const [sessionsRes, racesRes, eventsRes] = await Promise.all([
      needSessions
        ? sb.from('planned_sessions').select('id, week_start, day_index, sport, title, time, duration_min, tss, intensity, notes')
            .eq('user_id', uid).gte('week_start', past180).limit(2000)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      needRaces
        ? sb.from('planned_races').select('id, name, sport, date, level, goal, goal_time, distance, notes')
            .eq('user_id', uid).gte('date', past365).limit(500)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      needEvents ? eventsQuery() : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ])

    const stamp = dtstampNow()
    const events: string[] = []

    for (const s of sessionsRes.data ?? []) {
      const date = sessionYmd(s.week_start as string, s.day_index as number)
      const emoji = SPORT_EMOJI[(s.sport || '').toLowerCase()] ?? '🏋️'
      const summary = `${emoji} ${s.title || s.sport || 'Séance'}`
      const desc = [
        s.duration_min ? `Durée : ${s.duration_min} min` : null,
        s.intensity ? `Intensité : ${s.intensity}` : null,
        s.tss ? `TSS : ${s.tss}` : null,
        s.notes || null,
      ].filter(Boolean).join('\n')
      const timed = floatingRange(date, s.time as string, s.duration_min as number)
      events.push(vevent({
        uid: `session-${s.id}`, summary, description: desc || undefined,
        ...(timed ? { timed } : { allDay: { start: date, endExclusive: shiftYmd(s.week_start as string, (s.day_index as number) + 1) } }),
      }, stamp))
    }

    for (const r of racesRes.data ?? []) {
      const date = ymd(r.date as string)
      const desc = [
        r.distance ? `Distance : ${r.distance}` : null,
        r.goal_time ? `Objectif : ${r.goal_time}` : null,
        r.goal || null, r.notes || null,
      ].filter(Boolean).join('\n')
      events.push(vevent({
        uid: `race-${r.id}`, summary: `🏁 ${r.name || 'Course'}`, description: desc || undefined,
        allDay: { start: date, endExclusive: shiftYmd(r.date as string, 1) },
      }, stamp))
    }

    for (const e of eventsRes.data ?? []) {
      const date = ymd(e.date as string)
      const icon = e.category === 'race' ? '🏁' : e.category === 'pro' ? '💼' : '🎯'
      events.push(vevent({
        uid: `event-${e.id}`, summary: `${icon} ${e.title || 'Événement'}`, description: (e.description as string) || undefined,
        allDay: { start: date, endExclusive: shiftYmd(e.date as string, 1) },
      }, stamp))
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//THW Coaching//Hybrid//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc('Hybrid — ' + catCfg.label)}`,
      `NAME:${esc('Hybrid — ' + catCfg.label)}`,
      `X-APPLE-CALENDAR-COLOR:${catCfg.color}`,
      'X-PUBLISHED-TTL:PT15M',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="hybrid-${cal}.ics"`,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (e) {
    console.error('[api/calendar/[token]] error:', e)
    return new Response('Server error', { status: 500 })
  }
}
