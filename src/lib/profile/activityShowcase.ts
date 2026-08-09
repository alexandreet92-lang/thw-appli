'use client'
// ══════════════════════════════════════════════════════════════════
// Showcase d'activités d'un profil (façon Strava) — via la RPC sécurisée
// profile_activity_showcase(target) qui respecte la confidentialité choisie.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

export type ActivityVisibility = 'public' | 'followers' | 'private'

export interface RecentActivity {
  id: string; sport: string; title: string; started_at: string
  distance_m: number | null; seconds: number | null
  avg_pace_s_km: number | null; avg_watts: number | null; elevation_gain_m: number | null
  polyline: string | null
  sm: number | null; sn: number | null; is_race: boolean | null
}
export interface FeedActivity extends RecentActivity {
  author_id: string; author_name: string; author_avatar: string | null
}
export interface RecordItem { sport: string; label: string; perf: string; unit: string; at: string | null }
export interface ActivityShowcaseData {
  can_view: boolean
  visibility: ActivityVisibility
  ytd_count: number
  hours_by_sport: { sport: string; seconds: number }[]
  weekly: { week: string; count: number; distance_m: number; seconds: number }[]
  daily: { d: string; count: number; seconds: number }[]
  recent: RecentActivity[]
  records: RecordItem[]
}

// sport_type Strava → famille (clé sport de l'app) pour la couleur/le libellé.
const FAMILY: Record<string, string> = {
  run: 'running', trail_run: 'running', bike: 'cycling', virtual_bike: 'cycling',
  swim: 'swim', open_water_swim: 'swim', rowing: 'rowing',
  gym: 'gym', crossfit: 'gym', hiit: 'gym', yoga: 'gym', ski: 'other', hyrox: 'hyrox', other: 'other',
}
export const SPORT_META: Record<string, { label: string; color: string }> = {
  running: { label: 'Course', color: 'var(--sport-run)' },
  cycling: { label: 'Vélo', color: 'var(--sport-bike)' },
  swim: { label: 'Natation', color: 'var(--sport-swim)' },
  rowing: { label: 'Aviron', color: 'var(--sport-rowing)' },
  gym: { label: 'Renforcement', color: 'var(--sport-gym)' },
  hyrox: { label: 'Hyrox', color: 'var(--sport-hyrox)' },
  other: { label: 'Autre', color: 'var(--text-dim)' },
}
export function sportFamily(sportType: string): string { return FAMILY[sportType] ?? 'other' }
export function sportMeta(key: string): { label: string; color: string } { return SPORT_META[key] ?? SPORT_META.other }

export async function getProfileActivityShowcase(userId: string): Promise<ActivityShowcaseData | null> {
  const sb = createClient()
  const { data, error } = await sb.rpc('profile_activity_showcase', { target: userId })
  if (error || !data) return null
  const d = data as Partial<ActivityShowcaseData>
  return {
    can_view: !!d.can_view,
    visibility: (d.visibility as ActivityVisibility) ?? 'public',
    ytd_count: d.ytd_count ?? 0,
    hours_by_sport: Array.isArray(d.hours_by_sport) ? d.hours_by_sport : [],
    weekly: Array.isArray(d.weekly) ? d.weekly : [],
    daily: Array.isArray(d.daily) ? d.daily : [],
    recent: Array.isArray(d.recent) ? d.recent : [],
    records: Array.isArray(d.records) ? d.records : [],
  }
}

// ── Records : parsing + meilleur par créneau cible ──
/** "17:58" | "1:27:00" | "3'30" | "1:14:30" → secondes. null si non parsable. */
export function perfToSeconds(perf: string): number | null {
  if (!perf) return null
  const s = perf.trim().replace(/["″]/g, '').replace(/[',]/g, ':').replace(/\s+/g, '')
  const parts = s.split(':').map(x => parseInt(x, 10))
  if (parts.some(isNaN) || parts.length === 0) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}
export function secondsToPerf(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'’.-]/g, '')

/** Meilleur record (temps → min ; watts → max) d'un sport dont le label matche l'un des alias. */
export function bestRecord(records: RecordItem[], sport: string, aliases: string[]): { value: string; at: string | null } | null {
  const wanted = aliases.map(norm)
  const rows = records.filter(r => r.sport === sport && wanted.includes(norm(r.label)))
  if (!rows.length) return null
  const isWatts = rows[0].unit === 'watts'
  if (isWatts) {
    const best = rows.reduce((b, r) => (parseInt(r.perf) || 0) > (parseInt(b.perf) || 0) ? r : b)
    return { value: `${parseInt(best.perf)} W`, at: best.at }
  }
  const scored = rows.map(r => ({ r, sec: perfToSeconds(r.perf) })).filter(x => x.sec != null) as { r: RecordItem; sec: number }[]
  if (!scored.length) return null
  const best = scored.reduce((b, x) => x.sec < b.sec ? x : b)
  return { value: secondsToPerf(best.sec), at: best.r.at }
}

/** Tous les records d'un sport (pour Hyrox : formats variables). */
export function recordsForSport(records: RecordItem[], sport: string): RecordItem[] {
  return records.filter(r => r.sport === sport)
}

/** Durée lisible « 6h30 » (jamais « 6.5h »). */
export function fmtHoursSec(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  if (h <= 0) return `${m} min`
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export interface ActivityStreams {
  time?: number[]; distance?: number[]; altitude?: number[]; heartrate?: number[]
  cadence?: number[]; temp?: number[]; velocity?: number[]; watts?: number[]
}
export interface ActivityDetail {
  can_view: boolean
  id: string; sport: string; sport_type: string; title: string; started_at: string; is_race: boolean | null
  distance_m: number | null; seconds: number | null; elapsed_s: number | null
  moving_time_s: number | null; elapsed_time_s: number | null
  avg_pace_s_km: number | null; avg_speed_ms: number | null; max_speed_ms: number | null
  avg_watts: number | null; max_watts: number | null; normalized_watts: number | null; kilojoules: number | null
  elevation_gain_m: number | null; elevation_loss_m: number | null; avg_hr: number | null; max_hr: number | null
  avg_cadence: number | null; max_cadence: number | null; calories: number | null
  avg_temp_c: number | null; sm: number | null; sn: number | null; rpe: number | null
  external_url: string | null
  polyline: string | null; summary_polyline: string | null; streams: ActivityStreams | null
}

/** Fil d'activités des athlètes suivis (confidentialité respectée par la RPC). */
export async function getActivityFeed(beforeTs?: string | null, max = 40): Promise<FeedActivity[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('activity_feed', { max_rows: max, before_ts: beforeTs ?? null })
  if (error || !Array.isArray(data)) return []
  return data as FeedActivity[]
}

/** Ligne d'activité complète (toutes les colonnes sauf raw_data) + zones du
 * propriétaire + can_view — pour hydrater la vue détaillée training (lecture
 * seule). Renvoie l'objet brut (mêmes noms de colonnes que la table). */
export type ActivityDetailRow = Record<string, unknown> & { can_view: boolean; zones: unknown[] }
export async function getActivityDetailRow(id: string): Promise<ActivityDetailRow | null> {
  const sb = createClient()
  const { data, error } = await sb.rpc('activity_detail', { act_id: id })
  if (error || !data) return null
  const d = data as ActivityDetailRow
  return d.can_view ? d : null
}

/** Décode un polyline Google encodé → liste de points [lat, lng]. */
export function decodePolyline(str: string | null): [number, number][] {
  if (!str) return []
  const pts: [number, number][] = []
  let index = 0, lat = 0, lng = 0
  while (index < str.length) {
    let shift = 0, result = 0, b: number
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    pts.push([lat * 1e-5, lng * 1e-5])
  }
  return pts
}

/** Chemin SVG normalisé (viewBox 0 0 w h) à partir d'un polyline encodé. */
export function polylineToSvgPath(encoded: string | null, w: number, h: number, pad = 4): string | null {
  const pts = decodePolyline(encoded)
  if (pts.length < 2) return null
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const [la, lo] of pts) { if (la < minLat) minLat = la; if (la > maxLat) maxLat = la; if (lo < minLng) minLng = lo; if (lo > maxLng) maxLng = lo }
  const spanLat = Math.max(1e-6, maxLat - minLat), spanLng = Math.max(1e-6, maxLng - minLng)
  const scale = Math.min((w - pad * 2) / spanLng, (h - pad * 2) / spanLat)
  const ox = (w - spanLng * scale) / 2, oy = (h - spanLat * scale) / 2
  return pts.map(([la, lo], i) => {
    const x = ox + (lo - minLng) * scale
    const y = h - (oy + (la - minLat) * scale) // lat inversé (nord en haut)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

/** Heures par famille de sport (agrégées), triées décroissant. */
export function hoursByFamily(rows: { sport: string; seconds: number }[]): { key: string; hours: number; seconds: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) { const k = sportFamily(r.sport); m.set(k, (m.get(k) ?? 0) + (r.seconds || 0)) }
  return Array.from(m.entries()).map(([key, seconds]) => ({ key, seconds, hours: Math.round(seconds / 3600 * 10) / 10 }))
    .sort((a, b) => b.seconds - a.seconds)
}

/** Régularité : nb de semaines actives consécutives en terminant à la semaine courante. */
export function activeWeekStreak(weekly: { week: string; count: number }[]): number {
  if (!weekly.length) return 0
  const active = new Set(weekly.filter(w => w.count > 0).map(w => w.week))
  const monday = (dt: Date) => { const d = new Date(dt); const off = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - off); d.setUTCHours(0, 0, 0, 0); return d }
  let streak = 0
  const cursor = monday(new Date())
  // On saute une éventuelle semaine courante encore vide (sans casser la série).
  if (!active.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 7)
  for (;;) {
    const key = cursor.toISOString().slice(0, 10)
    if (active.has(key)) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 7) } else break
  }
  return streak
}

/** Met à jour la confidentialité des activités de l'utilisateur connecté. */
export async function setActivityVisibility(v: ActivityVisibility): Promise<void> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  await sb.from('profiles').update({ activity_visibility: v }).eq('id', user.id)
}

/** Confidentialité actuelle de l'utilisateur connecté. */
export async function getMyActivityVisibility(): Promise<ActivityVisibility> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return 'public'
  const { data } = await sb.from('profiles').select('activity_visibility').eq('id', user.id).maybeSingle()
  return ((data as { activity_visibility?: ActivityVisibility } | null)?.activity_visibility) ?? 'public'
}
