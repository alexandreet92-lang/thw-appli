// ══════════════════════════════════════════════════════════════
// Studio — connecteurs de pages : LECTURE des vraies données de l'app
// (Activités, Planning, Blessures, Récupération, Profil) et ÉCRITURE
// (enregistrer des séances dans le Planning).
// ──────────────────────────────────────────────────────────────
// Lecture : requêtes Supabase côté client (RLS = données de l'utilisateur).
// Le résultat est formaté en texte compact injecté dans le graphe.
// Écriture : insertion planned_sessions au format exact utilisé par le
// coach IA (execOneTool/add_week dans AIPanel) — plan_id nullable vérifié.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import type { StudioSourceKey } from './graph'

const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s)

async function getUserId(): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Utilisateur non connecté')
  return user.id
}

// ── LECTURE ───────────────────────────────────────────────────
export async function readSource(key: StudioSourceKey): Promise<string> {
  const sb = createClient()
  const uid = await getUserId()

  if (key === 'activities') {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    const { data, error } = await sb.from('activities')
      .select('title,sport_type,started_at,moving_time_s,distance_m,elevation_gain_m,tss,average_heartrate,is_race')
      .eq('user_id', uid).gte('started_at', since)
      .order('started_at', { ascending: false }).limit(40)
    if (error) throw new Error(`Lecture Activités : ${error.message}`)
    if (!data?.length) return 'PAGE ACTIVITÉS — aucune activité sur les 30 derniers jours.'
    const lines = data.map(a => {
      const d = a.started_at ? String(a.started_at).slice(0, 10) : '?'
      const dur = a.moving_time_s ? `${Math.round(Number(a.moving_time_s) / 60)}min` : ''
      const km = a.distance_m ? `${(Number(a.distance_m) / 1000).toFixed(1)}km` : ''
      const dplus = a.elevation_gain_m ? `D+${Math.round(Number(a.elevation_gain_m))}m` : ''
      const tss = a.tss ? `TSS ${a.tss}` : ''
      const fc = a.average_heartrate ? `FC ${Math.round(Number(a.average_heartrate))}` : ''
      return `- ${d} · ${a.sport_type ?? '?'} · ${cap(String(a.title ?? ''), 40)} · ${[dur, km, dplus, tss, fc].filter(Boolean).join(' · ')}${a.is_race ? ' · COURSE' : ''}`
    })
    return `PAGE ACTIVITÉS — ${data.length} activités sur 30 jours :\n${lines.join('\n')}`
  }

  if (key === 'planning') {
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    const { data, error } = await sb.from('planned_sessions')
      .select('week_start,day_index,sport,title,duration_min,intensity,intensite,notes,status')
      .eq('user_id', uid).gte('week_start', weekAgo)
      .order('week_start', { ascending: true }).order('day_index', { ascending: true }).limit(40)
    if (error) throw new Error(`Lecture Planning : ${error.message}`)
    if (!data?.length) return `PAGE PLANNING — aucune séance planifiée autour du ${today}.`
    const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const lines = data.map(s =>
      `- Semaine du ${s.week_start} ${DAYS[Number(s.day_index)] ?? '?'} · ${s.sport} · ${cap(String(s.title ?? ''), 46)}` +
      `${s.duration_min ? ` · ${s.duration_min}min` : ''}${(s.intensity ?? s.intensite) ? ` · ${s.intensity ?? s.intensite}` : ''}${s.status ? ` · ${s.status}` : ''}`)
    return `PAGE PLANNING — séances (S-1 → à venir), aujourd'hui ${today} :\n${lines.join('\n')}`
  }

  if (key === 'injuries') {
    const { data, error } = await sb.from('injuries').select('*')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(15)
    if (error) throw new Error(`Lecture Blessures : ${error.message}`)
    if (!data?.length) return 'PAGE BLESSURES — aucune blessure enregistrée.'
    const lines = (data as Record<string, unknown>[]).map(b => {
      const name = b.nom ?? b.name ?? b.title ?? 'Blessure'
      const zone = b.zone ?? b.type ?? ''
      const start = b.date_debut ?? b.onset_date ?? ''
      const end = b.date_fin ?? b.resolved_date ?? ''
      const status = b.status ?? (end ? 'guérie' : 'en cours')
      return `- ${String(name)}${zone ? ` (${String(zone)})` : ''} · début ${String(start).slice(0, 10)}${end ? ` · fin ${String(end).slice(0, 10)}` : ''} · ${String(status)}`
    })
    return `PAGE BLESSURES — ${data.length} entrées :\n${lines.join('\n')}`
  }

  if (key === 'recovery') {
    const since = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10)
    const { data, error } = await sb.from('recovery_checkin')
      .select('date,sleep_quality,fatigue,soreness,mood')
      .eq('user_id', uid).gte('date', since).order('date', { ascending: false }).limit(14)
    if (error) throw new Error(`Lecture Récupération : ${error.message}`)
    if (!data?.length) return 'PAGE RÉCUPÉRATION — aucun check-in sur 14 jours.'
    const lines = data.map(r =>
      `- ${r.date} · sommeil ${r.sleep_quality ?? '?'}/5 · fatigue ${r.fatigue ?? '?'}/5 · courbatures ${r.soreness ?? '?'}/5 · humeur ${r.mood ?? '?'}/5`)
    return `PAGE RÉCUPÉRATION — check-ins 14 jours :\n${lines.join('\n')}`
  }

  // ── Apps externes ──────────────────────────────────────────
  if (key === 'ext_strava') {
    // Strava alimente la table `activities` via la synchro. On lit les sorties
    // récentes (le service ne stocke pas de flux « brut Strava » à part).
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    const { data, error } = await sb.from('activities')
      .select('title,sport_type,started_at,moving_time_s,distance_m,elevation_gain_m,average_heartrate')
      .eq('user_id', uid).gte('started_at', since)
      .order('started_at', { ascending: false }).limit(40)
    if (error) throw new Error(`Lecture Strava : ${error.message}`)
    if (!data?.length) return 'APP STRAVA — aucune sortie synchronisée. Connecte Strava dans Connexions et lance une synchro.'
    const lines = data.map(a => {
      const d = a.started_at ? String(a.started_at).slice(0, 10) : '?'
      const dur = a.moving_time_s ? `${Math.round(Number(a.moving_time_s) / 60)}min` : ''
      const km = a.distance_m ? `${(Number(a.distance_m) / 1000).toFixed(1)}km` : ''
      const dplus = a.elevation_gain_m ? `D+${Math.round(Number(a.elevation_gain_m))}m` : ''
      const fc = a.average_heartrate ? `FC ${Math.round(Number(a.average_heartrate))}` : ''
      return `- ${d} · ${a.sport_type ?? '?'} · ${cap(String(a.title ?? ''), 40)} · ${[dur, km, dplus, fc].filter(Boolean).join(' · ')}`
    })
    return `APP STRAVA — ${data.length} sorties (30 j) :\n${lines.join('\n')}`
  }

  if (key === 'ext_withings') {
    const { data, error } = await sb.from('body_measurements')
      .select('measured_at,weight_kg,fat_mass_percent,muscle_mass_kg')
      .eq('user_id', uid).order('measured_at', { ascending: false }).limit(20)
    if (error) throw new Error(`Lecture Withings : ${error.message}`)
    if (!data?.length) return 'APP WITHINGS — aucune mesure. Connecte Withings dans Connexions.'
    const lines = (data as Record<string, unknown>[]).map(m =>
      `- ${String(m.measured_at ?? '').slice(0, 10)} · ${m.weight_kg ? `${m.weight_kg} kg` : '—'}` +
      `${m.fat_mass_percent ? ` · MG ${m.fat_mass_percent}%` : ''}${m.muscle_mass_kg ? ` · muscle ${m.muscle_mass_kg} kg` : ''}`)
    return `APP WITHINGS — ${data.length} mesures :\n${lines.join('\n')}`
  }

  if (key === 'ext_polar') {
    const since = new Date(Date.now() - 21 * 86400_000).toISOString().slice(0, 10)
    const { data, error } = await sb.from('health_data')
      .select('date,hrv_rmssd,readiness_score,fatigue_level,raw_data')
      .eq('user_id', uid).gte('date', since).order('date', { ascending: false }).limit(21)
    if (error) throw new Error(`Lecture Polar : ${error.message}`)
    if (!data?.length) return 'APP POLAR — aucune donnée récupération/sommeil. Connecte Polar (ou un wearable) dans Connexions.'
    const lines = (data as Record<string, unknown>[]).map(r => {
      const raw = (r.raw_data ?? {}) as Record<string, unknown>
      const hrv = r.hrv_rmssd ?? raw['hrv_rmssd'] ?? raw['hrv_ms']
      const sleep = raw['sleep_hours'] ?? raw['sleep_duration_h']
      return `- ${String(r.date ?? '').slice(0, 10)}` +
        `${hrv != null ? ` · HRV ${hrv}` : ''}${r.readiness_score != null ? ` · readiness ${r.readiness_score}` : ''}` +
        `${r.fatigue_level != null ? ` · fatigue ${r.fatigue_level}` : ''}${sleep != null ? ` · sommeil ${sleep}h` : ''}`
    })
    return `APP POLAR — récup/sommeil/HRV (21 j) :\n${lines.join('\n')}`
  }

  // profile
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle()
  if (error) throw new Error(`Lecture Profil : ${error.message}`)
  if (!data) return 'PAGE PROFIL — profil introuvable.'
  const p = data as Record<string, unknown>
  const keep = ['full_name', 'sport_principal', 'main_sport', 'level', 'niveau', 'objectif', 'goal', 'birth_date', 'weight_kg', 'height_cm', 'ftp', 'vma', 'fc_max', 'hr_max']
  const lines = keep.filter(k => p[k] !== undefined && p[k] !== null && p[k] !== '')
    .map(k => `- ${k} : ${String(p[k])}`)
  return `PAGE PROFIL :\n${lines.join('\n') || '- (peu de données renseignées)'}`
}

// ── ÉCRITURE : Enregistrer des séances dans le Planning ───────
export interface PlanningSessionDraft {
  week_start: string      // date ISO (lundi de la semaine)
  day_index: number       // 0 = lundi … 6 = dimanche
  sport: string           // run | bike | gym | hyrox | swim | other…
  title: string
  duration_min?: number | null
  intensity?: string | null
  notes?: string | null
}

export function describeDrafts(drafts: PlanningSessionDraft[]): string {
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  return drafts.map(d =>
    `• ${DAYS[d.day_index] ?? '?'} (sem. du ${d.week_start}) — ${d.sport} · ${d.title}` +
    `${d.duration_min ? ` · ${d.duration_min}min` : ''}${d.intensity ? ` · ${d.intensity}` : ''}`).join('\n')
}

export async function savePlanningSessions(drafts: PlanningSessionDraft[]): Promise<number> {
  if (!drafts.length) return 0
  const sb = createClient()
  const uid = await getUserId()
  // Format aligné sur l'insertion du coach IA (execOneTool add_week).
  const rows = drafts.map(d => ({
    user_id:      uid,
    plan_id:      null,
    week_start:   d.week_start,
    day_index:    Math.max(0, Math.min(6, Math.round(d.day_index))),
    sport:        d.sport,
    title:        d.title,
    duration_min: d.duration_min ?? null,
    intensity:    d.intensity ?? null,
    notes:        d.notes ?? null,
    status:       'planned',
    source:       'ai',
  }))
  const { error } = await sb.from('planned_sessions').insert(rows)
  if (error) throw new Error(`Écriture Planning : ${error.message}`)
  try { window.dispatchEvent(new CustomEvent('thw:sessions-changed')) } catch { /* ignore */ }
  return rows.length
}

// Extraction JSON robuste depuis une réponse IA (tolère le texte autour).
export function extractJson<T>(raw: string): T {
  const s = raw.indexOf('['); const s2 = raw.indexOf('{')
  const start = s === -1 ? s2 : (s2 === -1 ? s : Math.min(s, s2))
  if (start === -1) throw new Error('Réponse IA sans JSON')
  const end = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'))
  if (end <= start) throw new Error('JSON incomplet dans la réponse IA')
  return JSON.parse(raw.slice(start, end + 1)) as T
}
