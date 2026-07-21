// ══════════════════════════════════════════════════════════════
// Athlete Context Engine — socle de cohérence du coach IA.
//
// Construit, CÔTÉ SERVEUR, un instantané complet et factuel de
// l'athlète à partir de Supabase, puis le formate en un bloc texte
// compact (budget-token maîtrisé) injecté dans le system prompt du
// coach « central ». Objectif : que CHAQUE message — même une
// simple phrase tapée — soit raisonné sur les données réelles
// (charge CTL/ATL/TSB, activités, récup, planning, courses,
// blessures, plan en cours), exactement comme les actions rapides.
//
// Toutes les requêtes sont défensives : une table absente, une
// colonne manquante ou une erreur RLS n'interrompt jamais le coach,
// elle réduit simplement le contexte disponible.
// ══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { currentLocale } from '@/lib/i18n/locale'

const ACT_SELECT =
  'id,title,sport_type,started_at,moving_time_s,distance_m,tss,average_heartrate,is_race,avg_watts'

// ── Types de lignes (lecture défensive) ───────────────────────
interface ActivityRow {
  title?: string | null
  sport_type?: string | null
  started_at?: string | null
  moving_time_s?: number | null
  distance_m?: number | null
  tss?: number | null
  average_heartrate?: number | null
  is_race?: boolean | null
  avg_watts?: number | null
}
interface PlannedRow {
  sport?: string | null
  title?: string | null
  duration_min?: number | null
  tss?: number | null
  intensite?: string | null
  type_seance?: string | null
  status?: string | null
  day_index?: number | null
}
interface RaceRow {
  name?: string | null
  sport?: string | null
  date?: string | null
  level?: string | null
  goal_time?: string | null
}
interface MetricRow {
  date?: string | null
  hrv?: number | null
  sleep_score?: number | null
  rhr?: number | null
  fatigue?: number | null
  energy?: number | null
  [k: string]: unknown
}
interface InjuryRow {
  zone?: string | null
  side?: string | null
  structure?: string | null
  severity?: string | null
  phase?: string | null
  status?: string | null
  onset_date?: string | null
  intensity_effort?: number | null
}
interface PlanRow {
  name?: string | null
  objectif_principal?: string | null
  duree_semaines?: number | null
  start_date?: string | null
  end_date?: string | null
  sports?: string[] | null
  status?: string | null
}
interface ProfileRow {
  first_name?: string | null
  age?: number | null
  weight_kg?: number | null
  height_cm?: number | null
  main_goal?: string | null
  sports?: string[] | null
  preferred_name?: string | null
  work_profession?: string | null
  work_hours_per_week?: number | null
  ideal_sleep_hours?: number | null
  sport_hours_per_week?: number | null
}
interface PerfRow {
  ftp_watts?: number | null
  ftp?: number | null
  vma?: number | null
  lthr?: number | null
  css?: string | null
  vo2max?: number | null
}
interface ZoneRow {
  sport?: string | null
  ftp_watts?: number | null
  sl1?: string | null
  sl2?: string | null
  z1_value?: string | null
  z2_value?: string | null
  z3_value?: string | null
  z4_value?: string | null
  z5_value?: string | null
}

// ── Helpers requêtes défensives ───────────────────────────────
async function many<T>(q: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  try { const { data } = await q; return data ?? [] } catch { return [] }
}
async function single<T>(q: PromiseLike<{ data: T | null }>): Promise<T | null> {
  try { const { data } = await q; return data ?? null } catch { return null }
}

function ymd(d: Date): string { return d.toISOString().split('T')[0] }

// ══════════════════════════════════════════════════════════════
// Calcul charge — CTL / ATL / TSB / monotonie / strain / risque
// (EWMA 42j / 7j sur la TSS quotidienne des 56 derniers jours)
// ══════════════════════════════════════════════════════════════
function computeLoad(activities: ActivityRow[], since: Date) {
  const tssPerDay: number[] = []
  for (let d = 0; d < 56; d++) {
    const dayStart = new Date(since.getTime() + d * 86400000)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)
    const dayTss = activities
      .filter(a => { const t = a.started_at ? new Date(a.started_at).getTime() : 0; return t >= dayStart.getTime() && t <= dayEnd.getTime() })
      .reduce((s, a) => s + (a.tss ?? 0), 0)
    tssPerDay.push(dayTss)
  }
  let ctl = 0; for (const t of tssPerDay) ctl += (t - ctl) / 42
  let atl = 0; for (const t of tssPerDay) atl += (t - atl) / 7
  const ctlFinal = Math.round(ctl)
  const atlFinal = Math.round(atl)
  const tsbFinal = ctlFinal - atlFinal

  const last28 = tssPerDay.slice(-28)
  const avg = last28.reduce((a, b) => a + b, 0) / 28
  const std = Math.sqrt(last28.reduce((s, t) => s + (t - avg) ** 2, 0) / 28)
  const monotonie = std > 0 ? Math.round((avg / std) * 100) / 100 : 0
  const tss7d = tssPerDay.slice(-7).reduce((a, b) => a + b, 0)
  const strain = Math.round(tss7d * monotonie)

  const weekly: number[] = [0, 0, 0, 0]
  for (let w = 0; w < 4; w++) {
    weekly[w] = Math.round(tssPerDay.slice(28 + w * 7, 28 + (w + 1) * 7).reduce((a, b) => a + b, 0))
  }
  const rampePct = weekly[2] > 0 ? Math.round(((weekly[3] - weekly[2]) / weekly[2]) * 100) : null

  let risk = 0
  if (tsbFinal < -30) risk += 35; else if (tsbFinal < -20) risk += 25; else if (tsbFinal < -10) risk += 15
  if (monotonie > 2.5) risk += 25; else if (monotonie > 2.0) risk += 15; else if (monotonie > 1.5) risk += 5
  if (strain > 5000) risk += 25; else if (strain > 4000) risk += 15; else if (strain > 3000) risk += 5
  if (rampePct !== null && rampePct > 15) risk += 10
  const riskLabel = risk > 60 ? 'ÉLEVÉ' : risk > 35 ? 'MODÉRÉ' : 'FAIBLE'

  return { ctlFinal, atlFinal, tsbFinal, monotonie, strain, tss7d, weekly, rampePct, risk, riskLabel }
}

// ══════════════════════════════════════════════════════════════
// Point d'entrée — instantané formaté pour le system prompt
// ══════════════════════════════════════════════════════════════
export async function buildAthleteContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any, any, any>,
  userId: string,
): Promise<string> {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999)
  const since56 = new Date(weekStart); since56.setDate(since56.getDate() - 56)

  const [profile, perf, zones, activities56, plannedWeek, races, metrics, injuries, plan] = await Promise.all([
    single<ProfileRow>(sb.from('profiles').select('first_name,age,weight_kg,height_cm,main_goal,sports,preferred_name,work_profession,work_hours_per_week,ideal_sleep_hours,sport_hours_per_week').eq('id', userId).maybeSingle()),
    single<PerfRow>(sb.from('athlete_performance_profile').select('*').eq('user_id', userId).maybeSingle()),
    many<ZoneRow>(sb.from('training_zones').select('sport,ftp_watts,sl1,sl2,z1_value,z2_value,z3_value,z4_value,z5_value').eq('user_id', userId).eq('is_current', true)),
    many<ActivityRow>(sb.from('activities').select(ACT_SELECT).eq('user_id', userId).gte('started_at', since56.toISOString()).order('started_at', { ascending: true })),
    many<PlannedRow>(sb.from('planned_sessions').select('sport,title,duration_min,tss,intensite,type_seance,status,day_index').eq('user_id', userId).gte('week_start', ymd(weekStart)).lte('week_start', ymd(weekEnd))),
    many<RaceRow>(sb.from('planned_races').select('name,sport,date,level,goal_time').eq('user_id', userId).gte('date', ymd(now)).order('date', { ascending: true }).limit(3)),
    many<MetricRow>(sb.from('metrics_daily').select('*').eq('user_id', userId).gte('date', ymd(since56)).order('date', { ascending: true })),
    many<InjuryRow>(sb.from('injuries').select('zone,side,structure,severity,phase,status,onset_date,intensity_effort').eq('user_id', userId).eq('status', 'active').order('onset_date', { ascending: false })),
    single<PlanRow>(sb.from('training_plans').select('name,objectif_principal,duree_semaines,start_date,end_date,sports,status').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()),
  ])

  const load = computeLoad(activities56, since56)
  const thisWeekActs = activities56.filter(a => { const t = a.started_at ? new Date(a.started_at).getTime() : 0; return t >= weekStart.getTime() && t <= weekEnd.getTime() })
  const sportsUsed = [...new Set(activities56.map(a => a.sport_type).filter(Boolean))] as string[]

  // ── Composition du bloc ──────────────────────────────────────
  const L: string[] = []
  L.push('========== CONTEXTE ATHLÈTE (données réelles de l\'app — NE JAMAIS les redemander) ==========')

  // Profil
  const pParts: string[] = []
  if (profile?.preferred_name) pParts.push(`Appeler l'athlète : ${profile.preferred_name}`)
  else if (profile?.first_name) pParts.push(`Prénom : ${profile.first_name}`)
  if (profile?.first_name && profile?.preferred_name && profile.preferred_name !== profile.first_name) pParts.push(`Prénom : ${profile.first_name}`)
  if (profile?.age) pParts.push(`${profile.age} ans`)
  if (profile?.weight_kg) pParts.push(`${profile.weight_kg} kg`)
  if (profile?.height_cm) pParts.push(`${profile.height_cm} cm`)
  if (profile?.main_goal) pParts.push(`Objectif : ${profile.main_goal}`)
  if (profile?.work_profession) pParts.push(`Métier : ${profile.work_profession}`)
  if (profile?.work_hours_per_week) pParts.push(`Travail : ${profile.work_hours_per_week} h/sem`)
  if (profile?.ideal_sleep_hours) pParts.push(`Sommeil idéal : ${profile.ideal_sleep_hours} h`)
  if (profile?.sport_hours_per_week) pParts.push(`Sport visé : ${profile.sport_hours_per_week} h/sem`)
  if (sportsUsed.length) pParts.push(`Sports pratiqués (8 sem.) : ${sportsUsed.join(', ')}`)
  else if (profile?.sports?.length) pParts.push(`Sports : ${profile.sports.join(', ')}`)
  if (pParts.length) L.push(`\nPROFIL — ${pParts.join(' · ')}`)

  // Repères physiologiques
  const ftp = perf?.ftp_watts ?? perf?.ftp ?? null
  const phys: string[] = []
  if (ftp) phys.push(`FTP ${ftp} W`)
  if (perf?.vma) phys.push(`VMA ${perf.vma} km/h`)
  if (perf?.lthr) phys.push(`LTHR ${perf.lthr} bpm`)
  if (perf?.css) phys.push(`CSS ${perf.css}`)
  if (perf?.vo2max) phys.push(`VO2max ${perf.vo2max}`)
  if (phys.length) L.push(`REPÈRES : ${phys.join(' · ')}`)

  // Zones (compact)
  if (zones.length) {
    const zLines = zones.map(z => {
      const segs: string[] = []
      if (z.z1_value) segs.push(`Z1 ${z.z1_value}`)
      if (z.z2_value) segs.push(`Z2 ${z.z2_value}`)
      if (z.z3_value) segs.push(`Z3 ${z.z3_value}`)
      if (z.z4_value) segs.push(`Z4 ${z.z4_value}`)
      if (z.z5_value) segs.push(`Z5 ${z.z5_value}`)
      return segs.length ? `  ${z.sport} : ${segs.join(' · ')}` : ''
    }).filter(Boolean)
    if (zLines.length) L.push(`ZONES :\n${zLines.join('\n')}`)
  }

  // Charge d'entraînement
  if (activities56.length) {
    L.push(`\nCHARGE (calculée sur 8 sem.) :`)
    L.push(`  CTL (forme) ${load.ctlFinal} · ATL (fatigue) ${load.atlFinal} · TSB (fraîcheur) ${load.tsbFinal} ${load.tsbFinal > 5 ? '(frais)' : load.tsbFinal < -10 ? '(fatigué)' : '(neutre)'}`)
    L.push(`  Monotonie ${load.monotonie}${load.monotonie > 2.0 ? ' ⚠️' : ''} · Strain ${load.strain}${load.strain > 4000 ? ' ⚠️' : ''} · TSS 7j ${load.tss7d}`)
    L.push(`  TSS/sem (4 dern.) ${load.weekly.join(' → ')}${load.rampePct !== null ? ` · Rampe ${load.rampePct > 0 ? '+' : ''}${load.rampePct}%` : ''}`)
    L.push(`  Score de risque ${load.risk}/100 (${load.riskLabel})`)
  }

  // Activités récentes (14 dernières)
  if (activities56.length) {
    const recent = activities56.slice(-14).reverse()
    L.push(`\nACTIVITÉS RÉCENTES (${activities56.length} sur 8 sem., ${recent.length} affichées) :`)
    for (const a of recent) {
      const d = a.started_at ? new Date(a.started_at).toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit' }) : '?'
      const dur = a.moving_time_s ? `${Math.round(a.moving_time_s / 60)}min` : ''
      const dist = a.distance_m ? `${(a.distance_m / 1000).toFixed(1)}km` : ''
      const seg = [d, a.sport_type ?? '', dur, dist, a.tss != null ? `TSS ${a.tss}` : '', a.average_heartrate ? `${a.average_heartrate}bpm` : '', a.avg_watts ? `${a.avg_watts}W` : '', a.is_race ? '🏁course' : ''].filter(Boolean)
      L.push(`  - ${seg.join(' · ')}`)
    }
  }

  // Semaine planifiée
  if (plannedWeek.length) {
    const done = plannedWeek.filter(p => p.status === 'done' || p.status === 'completed').length
    L.push(`\nSEMAINE PLANIFIÉE (${plannedWeek.length} séances, ${done} faites) :`)
    for (const p of [...plannedWeek].sort((a, b) => (a.day_index ?? 0) - (b.day_index ?? 0))) {
      const seg = [`J${p.day_index ?? '?'}`, p.sport ?? '', p.title ?? '', p.duration_min ? `${p.duration_min}min` : '', p.intensite ?? '', p.tss != null ? `TSS ${p.tss}` : '', p.status ?? ''].filter(Boolean)
      L.push(`  - ${seg.join(' · ')}`)
    }
  }

  // Récupération (dernier point)
  if (metrics.length) {
    const last = metrics[metrics.length - 1]
    const seg: string[] = []
    if (last.hrv != null) seg.push(`HRV ${last.hrv}`)
    if (last.sleep_score != null) seg.push(`Sommeil ${last.sleep_score}`)
    if (last.rhr != null) seg.push(`FC repos ${last.rhr}`)
    if (last.fatigue != null) seg.push(`Fatigue ${last.fatigue}`)
    if (last.energy != null) seg.push(`Énergie ${last.energy}`)
    if (seg.length) L.push(`\nRÉCUPÉRATION (${last.date ?? 'récent'}) : ${seg.join(' · ')}`)
  }

  // Blessures actives
  if (injuries.length) {
    L.push(`\n⚠️ BLESSURES ACTIVES (${injuries.length}) — adapte les séances en conséquence :`)
    for (const inj of injuries) {
      const seg = [inj.zone ?? '', inj.side ?? '', inj.structure ?? '', inj.severity ? `sévérité ${inj.severity}` : '', inj.phase ?? '', inj.intensity_effort != null ? `douleur effort ${inj.intensity_effort}/10` : ''].filter(Boolean)
      L.push(`  - ${seg.join(' · ')}`)
    }
  }

  // Prochaines courses
  if (races.length) {
    L.push(`\nPROCHAINES COURSES :`)
    for (const r of races) {
      const dToGo = r.date ? Math.round((new Date(r.date).getTime() - now.getTime()) / 86400000) : null
      const seg = [r.name ?? '', r.sport ?? '', dToGo !== null ? `J-${dToGo}` : '', r.level ?? '', r.goal_time ? `objectif ${r.goal_time}` : ''].filter(Boolean)
      L.push(`  - ${seg.join(' · ')}`)
    }
  }

  // Plan en cours
  if (plan) {
    const seg = [plan.name ?? 'Plan', plan.objectif_principal ?? '', plan.duree_semaines ? `${plan.duree_semaines} sem.` : '', plan.sports?.length ? plan.sports.join('/') : '', plan.start_date && plan.end_date ? `${plan.start_date} → ${plan.end_date}` : ''].filter(Boolean)
    L.push(`\nPLAN EN COURS : ${seg.join(' · ')}`)
  }

  // Si vraiment rien
  const hasData = activities56.length || plannedWeek.length || zones.length || profile || races.length || plan
  if (!hasData) {
    L.push('\n(Aucune donnée encore synchronisée — invite l\'athlète à connecter Strava / remplir son profil, sans bloquer la conversation.)')
  }

  L.push('\n========== FIN CONTEXTE ATHLÈTE ==========')
  return L.join('\n')
}

// ══════════════════════════════════════════════════════════════
// Wrapper requête — résout l'utilisateur authentifié (cookie) et
// construit le contexte. Toujours défensif : renvoie '' si pas
// d'utilisateur ou en cas d'erreur (ne bloque jamais la route).
// ══════════════════════════════════════════════════════════════
export async function buildAthleteContextSafe(): Promise<string> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return ''
    return await buildAthleteContext(sb, user.id)
  } catch (e) {
    console.error('[athlete-context] buildAthleteContextSafe failed:', e)
    return ''
  }
}
