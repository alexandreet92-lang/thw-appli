// ══════════════════════════════════════════════════════════════
// Studio — lecture des sources (pages de l'app) avec un client
// Supabase INJECTÉ : utilisable côté navigateur (client RLS) ET
// côté serveur (service client + userId) pour les runs autonomes.
// ══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudioSourceKey } from './graph'

const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s)

export async function readSourceWith(sb: SupabaseClient, uid: string, key: StudioSourceKey): Promise<string> {
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

  if (key === 'records') {
    const { data, error } = await sb.from('personal_records')
      .select('sport,distance_label,performance,performance_unit,pace_s_km,event_type,race_name,achieved_at,rpe')
      .eq('user_id', uid).order('achieved_at', { ascending: false }).limit(30)
    if (error) throw new Error(`Lecture Records : ${error.message}`)
    if (!data?.length) return 'PAGE RECORDS — aucun record enregistré.'
    const lines = (data as Record<string, unknown>[]).map(r => {
      const perf = [r.performance, r.performance_unit].filter(Boolean).join(' ')
      const pace = r.pace_s_km ? `${Math.floor(Number(r.pace_s_km) / 60)}:${String(Math.round(Number(r.pace_s_km) % 60)).padStart(2, '0')}/km` : ''
      const when = r.achieved_at ? String(r.achieved_at).slice(0, 10) : ''
      return `- ${r.sport ?? '?'} · ${cap(String(r.distance_label ?? r.event_type ?? ''), 30)} · ${[perf, pace].filter(Boolean).join(' · ')}${r.race_name ? ` · ${cap(String(r.race_name), 30)}` : ''}${when ? ` · ${when}` : ''}`
    })
    return `PAGE RECORDS — ${data.length} performances de référence :\n${lines.join('\n')}`
  }

  if (key === 'races') {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await sb.from('race_events')
      .select('name,start_date,end_date,description')
      .eq('user_id', uid).gte('start_date', today).order('start_date', { ascending: true }).limit(20)
    if (error) throw new Error(`Lecture Compétitions : ${error.message}`)
    if (!data?.length) return 'PAGE COMPÉTITIONS — aucune compétition à venir.'
    const lines = (data as Record<string, unknown>[]).map(r => {
      const days = r.start_date ? Math.ceil((new Date(String(r.start_date) + 'T00:00:00').getTime() - Date.now()) / 86400_000) : null
      return `- ${String(r.start_date).slice(0, 10)} (J-${days ?? '?'}) · ${cap(String(r.name ?? 'Course'), 40)}${r.description ? ` · ${cap(String(r.description), 60)}` : ''}`
    })
    return `PAGE COMPÉTITIONS — objectifs à venir (aujourd'hui ${today}) :\n${lines.join('\n')}`
  }

  if (key === 'zones') {
    const { data, error } = await sb.from('athlete_zones')
      .select('sport,ftp,fthr,vma,css,hr_zones,power_zones,pace_zones,updated_at')
      .eq('user_id', uid).order('updated_at', { ascending: false }).limit(6)
    if (error) throw new Error(`Lecture Zones : ${error.message}`)
    if (!data?.length) return 'PAGE ZONES — aucune zone définie (FC / puissance / allure).'
    const lines = (data as Record<string, unknown>[]).map(z => {
      const refs = [z.ftp ? `FTP ${z.ftp}W` : '', z.fthr ? `FTHR ${z.fthr}` : '', z.vma ? `VMA ${z.vma}` : '', z.css ? `CSS ${z.css}` : ''].filter(Boolean).join(' · ')
      return `- ${z.sport ?? '?'}${refs ? ` · ${refs}` : ''}`
    })
    return `PAGE ZONES — repères d'intensité par sport :\n${lines.join('\n')}`
  }

  if (key === 'questionnaire') {
    const { data, error } = await sb.from('profiles')
      .select('primary_goal,sport_experience,weekly_sessions,weekly_volume,sport_hours_per_week,ideal_sleep_hours,work_hours_per_week,onboarding')
      .eq('id', uid).maybeSingle()
    if (error) throw new Error(`Lecture Questionnaire : ${error.message}`)
    if (!data) return 'PAGE QUESTIONNAIRE — aucune réponse.'
    const p = data as Record<string, unknown>
    const base = [
      p.primary_goal ? `Objectif principal : ${p.primary_goal}` : '',
      p.sport_experience ? `Expérience : ${p.sport_experience}` : '',
      p.weekly_sessions ? `Séances/sem : ${p.weekly_sessions}` : '',
      p.weekly_volume ? `Volume hebdo : ${p.weekly_volume}` : '',
      p.sport_hours_per_week ? `Heures sport/sem : ${p.sport_hours_per_week}` : '',
      p.work_hours_per_week ? `Heures travail/sem : ${p.work_hours_per_week}` : '',
      p.ideal_sleep_hours ? `Sommeil idéal : ${p.ideal_sleep_hours} h` : '',
    ].filter(Boolean)
    let onboard = ''
    if (p.onboarding && typeof p.onboarding === 'object') {
      try { onboard = cap(JSON.stringify(p.onboarding), 900) } catch { /* ignore */ }
    }
    if (!base.length && !onboard) return 'PAGE QUESTIONNAIRE — peu de données renseignées.'
    return `PAGE QUESTIONNAIRE & OBJECTIFS :\n${base.map(b => `- ${b}`).join('\n')}${onboard ? `\n- Onboarding : ${onboard}` : ''}`
  }

  if (key === 'messages') {
    const { data, error } = await sb.from('coach_messages')
      .select('sender_id,body,created_at')
      .or(`athlete_id.eq.${uid},coach_id.eq.${uid}`).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(20)
    if (error) throw new Error(`Lecture Messages : ${error.message}`)
    if (!data?.length) return 'PAGE MESSAGES — aucun échange coach ↔ athlète.'
    const lines = (data as Record<string, unknown>[]).reverse().map(m =>
      `- ${String(m.created_at ?? '').slice(0, 10)} · ${m.sender_id === uid ? 'athlète' : 'coach'} : ${cap(String(m.body ?? ''), 140)}`)
    return `PAGE MESSAGES — derniers échanges coach ↔ athlète :\n${lines.join('\n')}`
  }

  // ── Apps externes ──────────────────────────────────────────
  if (key === 'ext_strava') {
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
