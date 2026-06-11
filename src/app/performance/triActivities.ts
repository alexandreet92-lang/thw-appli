'use client'
// Couche données « Lier une activité » pour la saisie Triathlon. N'expose QUE des
// colonnes réellement présentes dans la table `activities` (aucune donnée inventée).
import { createClient } from '@/lib/supabase/client'

export type Segment = 'swim' | 'bike' | 'run'

export interface ActivityLite {
  id: string
  title: string | null
  started_at: string
  sport_type: string
  distance_m: number | null
  moving_time_s: number | null
  avg_watts: number | null
  normalized_watts: number | null
  max_watts: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_cadence: number | null
  max_cadence: number | null
  elevation_gain_m: number | null
  avg_temp_c: number | null
  avg_pace_s_km: number | null
  avg_speed_ms: number | null
}

const SPORT_FILTER: Record<Segment, string[]> = {
  swim: ['swim'],
  bike: ['bike', 'virtual_bike'],
  run: ['run'],
}

const COLS = 'id, title, started_at, sport_type, distance_m, moving_time_s, avg_watts, normalized_watts, max_watts, avg_hr, max_hr, avg_cadence, max_cadence, elevation_gain_m, avg_temp_c, avg_pace_s_km, avg_speed_ms'

export async function fetchActivities(segment: Segment): Promise<ActivityLite[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('activities')
    .select(COLS)
    .eq('user_id', user.id)
    .in('sport_type', SPORT_FILTER[segment])
    .order('started_at', { ascending: false })
    .limit(120)
  return (data ?? []) as ActivityLite[]
}

// ── Formatage ──────────────────────────────────────────────────────────────
const r0 = (n: number) => Math.round(n)
export function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  if (p.some(n => isNaN(n))) return 0
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}
export function hmsFull(sec: number): string {
  if (!sec || sec <= 0) return ''
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = r0(sec % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
export function hms(sec: number): string {
  if (!sec || sec <= 0) return ''
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = r0(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}
function km(m: number | null): string | null { return m && m > 0 ? `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km` : null }
function meters(m: number | null): string | null { return m && m > 0 ? `${r0(m)} m` : null }
function paceKm(s: number | null): string | null {
  return s && s > 0 ? `${Math.floor(s / 60)}:${String(r0(s % 60)).padStart(2, '0')}/km` : null
}

// Champs éditables pré-remplis depuis l'activité (selon le segment).
export interface Prefill { time?: string; watts?: string; np?: string; hr?: string }
export function prefillFromActivity(segment: Segment, a: ActivityLite): Prefill {
  const time = a.moving_time_s ? hms(a.moving_time_s) : undefined
  if (segment === 'bike') return {
    time,
    watts: a.avg_watts ? String(r0(a.avg_watts)) : undefined,
    np: a.normalized_watts ? String(a.normalized_watts) : undefined,
    hr: a.avg_hr ? String(r0(a.avg_hr)) : undefined,
  }
  if (segment === 'run') return { time, hr: a.avg_hr ? String(r0(a.avg_hr)) : undefined }
  return { time } // swim
}

// Données supplémentaires RÉELLES (puces) — seulement les colonnes non nulles non déjà saisies.
export function extraChips(segment: Segment, a: ActivityLite): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  const push = (label: string, v: string | null) => { if (v) out.push({ label, value: v }) }
  if (segment === 'swim') {
    push('Distance', meters(a.distance_m))
    push('FC moy', a.avg_hr ? `${r0(a.avg_hr)} bpm` : null)
    push('FC max', a.max_hr ? `${a.max_hr} bpm` : null)
    push('Temp.', a.avg_temp_c != null ? `${r0(a.avg_temp_c)} °C` : null)
  } else if (segment === 'bike') {
    push('Distance', km(a.distance_m))
    push('W max', a.max_watts ? `${a.max_watts} W` : null)
    push('FC max', a.max_hr ? `${a.max_hr} bpm` : null)
    push('RPM moy', a.avg_cadence ? `${r0(a.avg_cadence)} rpm` : null)
    push('RPM max', a.max_cadence ? `${a.max_cadence} rpm` : null)
    push('D+', meters(a.elevation_gain_m))
    push('Temp.', a.avg_temp_c != null ? `${r0(a.avg_temp_c)} °C` : null)
  } else {
    push('Distance', km(a.distance_m))
    push('Allure', paceKm(a.avg_pace_s_km))
    push('FC max', a.max_hr ? `${a.max_hr} bpm` : null)
    push('D+', meters(a.elevation_gain_m))
    push('Temp.', a.avg_temp_c != null ? `${r0(a.avg_temp_c)} °C` : null)
  }
  return out
}

// Métriques résumées affichées dans la liste de la surpage (par sport).
export function summaryLine(segment: Segment, a: ActivityLite): string {
  const parts: string[] = []
  const d = km(a.distance_m); if (d) parts.push(segment === 'swim' ? (meters(a.distance_m) ?? d) : d)
  if (a.moving_time_s) parts.push(hms(a.moving_time_s))
  if (segment === 'bike' && a.avg_watts) parts.push(`${r0(a.avg_watts)} W`)
  if (segment === 'run' && a.avg_pace_s_km) parts.push(paceKm(a.avg_pace_s_km) ?? '')
  if (a.avg_hr) parts.push(`${r0(a.avg_hr)} bpm`)
  return parts.filter(Boolean).join(' · ')
}
