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
}
export interface ActivityShowcaseData {
  can_view: boolean
  visibility: ActivityVisibility
  ytd_count: number
  hours_by_sport: { sport: string; seconds: number }[]
  weekly: { week: string; count: number; distance_m: number; seconds: number }[]
  daily: { d: string; count: number; seconds: number }[]
  recent: RecentActivity[]
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
  }
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
