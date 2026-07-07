// ══════════════════════════════════════════════════════════════
// READ TOOLS — outils de LECTURE résolus côté serveur pour la
// boucle agentique du coach. Contrairement aux tools d'action
// (add_session, create_training_plan… = terminaux, rendus au front),
// ceux-ci interrogent Supabase et renvoient un résultat que le
// modèle peut RAISONNER, puis enchaîner. C'est ce qui fait passer
// le coach de « récite un contexte » à « enquête sur les données ».
//
// Toutes les résolutions sont défensives : une erreur renvoie un
// JSON { error } au modèle, jamais une exception qui casse le flux.
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeSportMetrics, type ActivityWithStreams } from '@/lib/analysis/sportMetrics'
import { queryCatalog, type LibrarySession } from '@/lib/coach/session-library'

const ACT_COLS =
  'id,title,sport_type,started_at,moving_time_s,distance_m,tss,average_heartrate,max_heartrate,average_speed,avg_cadence,is_race,avg_watts'
const ACT_COLS_STREAMS = ACT_COLS + ',streams'

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
}

function ymd(d: Date): string { return d.toISOString().slice(0, 10) }

function daysToGo(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const t = new Date(dateStr).getTime()
  if (!Number.isFinite(t)) return null
  return Math.round((t - Date.now()) / 86400000)
}

// ── Parcours : montées significatives (segments type 'climb') ──
interface ParcoursSegment {
  type?: string; startKm?: number; endKm?: number; distanceKm?: number
  avgGradient?: number; maxGradient?: number; elevationDeltaM?: number
}
function summarizeClimbs(segments: unknown): Array<Record<string, number>> {
  if (!Array.isArray(segments)) return []
  return (segments as ParcoursSegment[])
    .filter(s => s?.type === 'climb')
    .slice(0, 12)
    .map(s => ({
      startKm:        Math.round((s.startKm ?? 0) * 10) / 10,
      endKm:          Math.round((s.endKm ?? 0) * 10) / 10,
      distanceKm:     Math.round((s.distanceKm ?? 0) * 10) / 10,
      elevationGainM: Math.round(s.elevationDeltaM ?? 0),
      avgGradientPct: Math.round((s.avgGradient ?? 0) * 10) / 10,
      maxGradientPct: Math.round((s.maxGradient ?? 0) * 10) / 10,
    }))
}

// ── Stage (race_events.daily_program) : parsing défensif ──────
// Format : { sports, days:[{date, content, matin?, aprem?, parcours?}] }
// Rétrocompat : ancien format = tableau de jours directement.
interface StageSession { sport?: string; detail?: string; time?: string; title?: string }
interface StageParcours { name?: string; distance?: number | null; elevation?: number | null; points?: number; avgSpeed?: number | null }
interface StageDay {
  date?: string; content?: string
  matin?: StageSession[]; aprem?: StageSession[]; parcours?: StageParcours
}
function parseStageDays(raw: unknown): { sports: string[]; days: StageDay[] } {
  if (Array.isArray(raw)) return { sports: [], days: raw as StageDay[] }
  if (raw && typeof raw === 'object') {
    const o = raw as { sports?: string[]; days?: StageDay[] }
    return { sports: o.sports ?? [], days: o.days ?? [] }
  }
  return { sports: [], days: [] }
}
function compactStageSession(s: StageSession): string {
  return [s.time, s.sport, s.title, s.detail].filter(Boolean).join(' · ')
}
function compactStageParcours(p: StageParcours | undefined) {
  if (!p) return undefined
  return {
    name: p.name ?? null,
    distanceKm: typeof p.distance === 'number' ? Math.round(p.distance * 10) / 10 : null,
    elevationGainM: typeof p.elevation === 'number' ? Math.round(p.elevation) : null,
    points: p.points ?? null,
    avgSpeedKmh: typeof p.avgSpeed === 'number' ? Math.round(p.avgSpeed * 10) / 10 : null,
  }
}

// ── Séances perso (session_favorites) : forme permissive + résumé ──
interface PersoFav {
  id: string
  name: string
  sport: string | null
  training_type: string | null
  blocks_data: unknown
  duration_min: number | null
  rpe: number | null
  notes: string | null
  starred: boolean | null
}

/** Résumé textuel court des blocs d'une séance perso (builder Block[]). */
function summarizeFavBlocks(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const parts = raw.slice(0, 12).map(b => {
    const blk = (b ?? {}) as {
      label?: string; type?: string; durationMin?: number; zone?: number
      reps?: number; effortMin?: number; recoveryMin?: number
    }
    const name = blk.label || blk.type || 'bloc'
    const zone = typeof blk.zone === 'number' ? ` Z${blk.zone}` : ''
    if (blk.reps && blk.reps > 1) {
      const eff = blk.effortMin ? `${blk.effortMin}min` : (blk.durationMin ? `${blk.durationMin}min` : '')
      const rec = blk.recoveryMin ? ` / ${blk.recoveryMin}min récup` : ''
      return `${blk.reps}×(${eff}${zone}${rec})`.trim()
    }
    const dur = blk.durationMin ? `${blk.durationMin}min` : ''
    return `${dur}${zone} ${name}`.trim()
  })
  return parts.filter(Boolean).join(' · ') || undefined
}

// ── Définitions (schemas Anthropic) ───────────────────────────

export const readTools: Anthropic.Tool[] = [
  {
    name: 'get_activities',
    description:
      "Récupère la liste des activités RÉELLES de l'athlète au-delà de ce qui est déjà dans le contexte " +
      "(le contexte ne montre que les 14 dernières sur 8 semaines). Utilise-le pour analyser des tendances, " +
      "remonter plus loin dans le temps, ou isoler un type d'activité (un sport, les compétitions). " +
      "Renvoie par activité : date, sport, durée, distance, TSS, FC moy/max, watts moy, allure.",
    input_schema: {
      type: 'object',
      properties: {
        sport:      { type: 'string',  description: "Filtre sport optionnel (sous-chaîne de sport_type, ex: 'run', 'bike', 'swim'). Vide = tous." },
        since_days: { type: 'integer', description: 'Fenêtre en jours (défaut 90, max 365).' },
        limit:      { type: 'integer', description: "Nombre max d'activités (défaut 30, max 100)." },
        races_only: { type: 'boolean', description: 'Si true, ne renvoie que les compétitions (is_race=true).' },
      },
    },
  },
  {
    name: 'analyze_sport_metrics',
    description:
      "Calcule les MÉTRIQUES OBJECTIVES sport-spécifiques depuis les capteurs (streams) : " +
      "courbe de puissance + FTP estimée (vélo) ; profil d'allure et réserve de vitesse (course) ; " +
      "durabilité (fade de puissance/vitesse + découplage cardiaque sur les efforts longs). " +
      "Utilise-le pour diagnostiquer un point faible, évaluer un niveau réel ou justifier une prescription par des chiffres.",
    input_schema: {
      type: 'object',
      properties: {
        sport:      { type: 'string',  enum: ['cycling', 'running'], description: 'Sport à analyser.' },
        since_days: { type: 'integer', description: 'Fenêtre en jours (défaut 120, max 365).' },
      },
      required: ['sport'],
    },
  },
  {
    name: 'get_training_plan',
    description:
      "Récupère le plan d'entraînement ACTIF de l'athlète avec son id réel, sa périodisation et la liste " +
      "de ses séances (avec leurs id réels). INDISPENSABLE avant de modifier/déplacer/supprimer une séance " +
      "ou d'ajouter une semaine : ne jamais inventer d'identifiant, lis-les d'abord ici.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_planned_sessions',
    description:
      "Récupère les séances planifiées (planned_sessions) sur une fenêtre de semaines, avec leurs id réels. " +
      "Utile pour voir la charge déjà programmée ou cibler une séance précise à ajuster.",
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: "YYYY-MM-DD — début de fenêtre (défaut : aujourd'hui)." },
        to_date:   { type: 'string', description: 'YYYY-MM-DD — fin de fenêtre (défaut : +28 jours).' },
      },
    },
  },
  {
    name: 'get_session_library',
    description:
      "Pioche dans la BIBLIOTHÈQUE DE SÉANCES pour t'INSPIRER avant de prescrire ou de bâtir un plan : " +
      "structure, dosage, intention physiologique de séances de référence. Deux sources : le CATALOGUE curé " +
      "(running, vélo, trail, natation, aviron) et les séances PERSO enregistrées par l'athlète. " +
      "Utilise-le pour t'aligner sur la façon de construire une séance propre à cet athlète et proposer des " +
      "séances cohérentes avec ce qu'il aime — ne recopie pas à l'aveugle, adapte au profil et aux zones. " +
      "Renvoie par séance : nom, objectif, intention (filière/famille), intensité, RPE, durée, structure des blocs, tags.",
    input_schema: {
      type: 'object',
      properties: {
        sport:     { type: 'string',  description: "Sport ciblé : run/running, bike/vélo, trail, swim/natation, rowing/aviron. Vide = tous." },
        intention: { type: 'string',  description: "Filtre qualitatif libre (famille/objectif) : ex 'seuil', 'vo2max', 'pma', 'sweetspot', 'sortie longue', 'force', 'fractionné', 'endurance', 'côtes'." },
        zone:      { type: 'string',  description: "Zone d'intensité ciblée (ex 'Z4', 'Z5') : ne renvoie que les séances qui contiennent un bloc dans cette zone." },
        source:    { type: 'string',  enum: ['all', 'catalogue', 'perso'], description: "Source à interroger (défaut 'all')." },
        limit:     { type: 'integer', description: 'Nombre max de séances (défaut 12, max 40).' },
      },
    },
  },
  {
    name: 'get_stages',
    description:
      "Récupère les STAGES / camps d'entraînement de l'athlète (page Calendrier → événements). " +
      "Pour chaque stage : nom, dates, description, et le PROGRAMME JOUR PAR JOUR — séances du matin et " +
      "de l'après-midi (sport + détail), fichiers de parcours attachés, ET les TRACES/PARCOURS prévus " +
      "(nom, distance, dénivelé D+). Utilise-le dès que l'athlète parle de son « stage », de son « camp », " +
      "de ses « traces prévues » ou du programme d'un séjour d'entraînement, pour analyser ce qui est prévu " +
      "et pourquoi (charge, dénivelé, enchaînements).",
    input_schema: {
      type: 'object',
      properties: {
        include_past: { type: 'boolean', description: 'Inclure les stages déjà passés (défaut false : uniquement en cours / à venir).' },
      },
    },
  },
  {
    name: 'get_parcours',
    description:
      "Récupère les PARCOURS / traces GPS enregistrés par l'athlète (fichiers GPX/TCX importés). " +
      "Renvoie par parcours : nom, distance, D+ / D-, et l'analyse des MONTÉES SIGNIFICATIVES " +
      "(position, longueur, dénivelé, pente moy/max). Utilise-le pour analyser un parcours précis, " +
      "estimer sa difficulté, ou caler une séance/allure sur son profil altimétrique.",
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string',  description: 'Filtre optionnel sur le nom du parcours (sous-chaîne).' },
        limit:  { type: 'integer', description: 'Nombre max de parcours (défaut 20, max 50).' },
      },
    },
  },
  {
    name: 'get_races',
    description:
      "Récupère le CALENDRIER DES COURSES / objectifs de l'athlète (page Calendrier) avec tout le détail : " +
      "nom, sport, date (et J- restants), niveau/priorité, objectif chrono, distances, temps cibles par " +
      "discipline (natation/vélo/course), statut (à venir/terminée). Va au-delà des 3 prochaines déjà dans " +
      "le contexte : historique et objectifs lointains inclus. Sers-t'en pour périodiser, prioriser et caler " +
      "les blocs sur les échéances réelles.",
    input_schema: {
      type: 'object',
      properties: {
        include_past: { type: 'boolean', description: 'Inclure les courses passées (défaut false : uniquement à venir).' },
        limit:        { type: 'integer', description: 'Nombre max de courses (défaut 20, max 50).' },
      },
    },
  },
  {
    name: 'get_recovery',
    description:
      "Récupère l'HISTORIQUE DE RÉCUPÉRATION / bien-être (page Récupération) : HRV, sommeil (durée + score), " +
      "FC de repos, score de disponibilité (readiness), fatigue, stress, SpO2 — jour par jour sur une fenêtre. " +
      "Le contexte ne montre que le dernier point : utilise cet outil pour analyser une TENDANCE de récupération, " +
      "détecter une accumulation de fatigue, ou justifier un allègement.",
    input_schema: {
      type: 'object',
      properties: {
        since_days: { type: 'integer', description: 'Fenêtre en jours (défaut 30, max 180).' },
      },
    },
  },
  {
    name: 'get_injuries',
    description:
      "Récupère les BLESSURES / douleurs de l'athlète (page Blessures) avec tout le détail : zone, côté, " +
      "structure, sévérité, phase, douleur au repos/à l'effort, mécanisme, date d'apparition, estimation de " +
      "retour, rééducation, ET l'historique de suivi (évolution de la douleur). Le contexte ne liste que les " +
      "blessures actives en résumé : utilise cet outil pour le détail, l'historique, ou les blessures résolues.",
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'resolved', 'all'], description: "Filtre statut (défaut 'all')." },
      },
    },
  },
  {
    name: 'get_nutrition',
    description:
      "Récupère le PLAN NUTRITIONNEL actif de l'athlète (page Nutrition) : cibles caloriques et macros, " +
      "nombre de repas, régime, allergies, structure du plan. Utilise-le avant tout conseil nutritionnel " +
      "chiffré pour t'aligner sur ce qui est déjà en place plutôt que de partir de zéro.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_personal_records',
    description:
      "Récupère les RECORDS PERSONNELS (PR) de l'athlète (page Records) : par sport et distance, la perf, " +
      "l'allure, la course associée, la date, et les splits (natation/vélo/course, transitions, stations Hyrox). " +
      "Utilise-le pour situer le niveau réel, fixer des objectifs cohérents ou calibrer des allures cibles.",
    input_schema: {
      type: 'object',
      properties: {
        sport: { type: 'string',  description: "Filtre sport optionnel (sous-chaîne, ex 'run', 'bike')." },
        limit: { type: 'integer', description: 'Nombre max de records (défaut 30, max 100).' },
      },
    },
  },
  {
    name: 'get_body_metrics',
    description:
      "Récupère le suivi CORPOREL de l'athlète : poids (historique + tendance) et composition corporelle " +
      "(masse grasse, masse musculaire) quand disponible. Utilise-le pour suivre une évolution de poids, " +
      "un objectif de composition, ou pondérer des recommandations (W/kg, allures).",
    input_schema: {
      type: 'object',
      properties: {
        since_days: { type: 'integer', description: 'Fenêtre en jours (défaut 180, max 365).' },
      },
    },
  },
]

export const READ_TOOL_NAMES: ReadonlySet<string> = new Set(readTools.map(t => t.name))

// ── Résolution ────────────────────────────────────────────────

interface ActRow {
  id: string; title: string | null; sport_type: string | null; started_at: string | null
  moving_time_s: number | null; distance_m: number | null; tss: number | null
  average_heartrate: number | null; max_heartrate: number | null
  average_speed: number | null; avg_cadence: number | null; is_race: boolean | null; avg_watts: number | null
}

function compactActivity(a: ActRow) {
  const durMin = a.moving_time_s ? Math.round(a.moving_time_s / 60) : null
  const distKm = a.distance_m ? Math.round(a.distance_m / 100) / 10 : null
  const paceSecPerKm = a.average_speed && a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null
  return {
    date: a.started_at ? a.started_at.slice(0, 10) : null,
    sport: a.sport_type,
    title: a.title,
    durMin, distKm,
    tss: a.tss,
    hrAvg: a.average_heartrate, hrMax: a.max_heartrate,
    watts: a.avg_watts,
    paceSecPerKm,
    cadence: a.avg_cadence,
    race: a.is_race ?? false,
  }
}

export async function resolveReadTool(
  name: string,
  input: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any, any, any>,
  userId: string,
): Promise<string> {
  try {
    switch (name) {
      // ── get_activities ──────────────────────────────────────
      case 'get_activities': {
        const sport     = typeof input.sport === 'string' ? input.sport.trim() : ''
        const sinceDays = clamp(Number(input.since_days) || 90, 1, 365)
        const limit     = clamp(Number(input.limit) || 30, 1, 100)
        const racesOnly = input.races_only === true
        const since     = new Date(Date.now() - sinceDays * 86400000).toISOString()

        let q = sb.from('activities').select(ACT_COLS)
          .eq('user_id', userId)
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .limit(limit)
        if (sport)     q = q.ilike('sport_type', `%${sport}%`)
        if (racesOnly) q = q.eq('is_race', true)

        const { data, error } = await q
        if (error) return JSON.stringify({ error: error.message })
        const rows = (data ?? []) as ActRow[]
        return JSON.stringify({
          window_days: sinceDays,
          count: rows.length,
          activities: rows.map(compactActivity),
        })
      }

      // ── analyze_sport_metrics ───────────────────────────────
      case 'analyze_sport_metrics': {
        const sport     = input.sport === 'cycling' ? 'cycling' : 'running'
        const sinceDays = clamp(Number(input.since_days) || 120, 1, 365)
        const since     = new Date(Date.now() - sinceDays * 86400000).toISOString()

        const { data, error } = await sb.from('activities').select(ACT_COLS_STREAMS)
          .eq('user_id', userId)
          .gte('started_at', since)
          .not('streams', 'is', null)
          .order('started_at', { ascending: false })
          .limit(60)
        if (error) return JSON.stringify({ error: error.message })

        const metrics = computeSportMetrics((data ?? []) as unknown as ActivityWithStreams[], sport)
        if (!metrics) {
          return JSON.stringify({
            error: `Pas assez de données capteurs exploitables pour ${sport} sur ${sinceDays} jours.`,
          })
        }
        return JSON.stringify(metrics)
      }

      // ── get_training_plan ───────────────────────────────────
      case 'get_training_plan': {
        const { data: plan, error } = await sb.from('training_plans')
          .select('id,name,objectif_principal,duree_semaines,start_date,end_date,sports,blocs_periodisation,status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) return JSON.stringify({ error: error.message })
        if (!plan) return JSON.stringify({ plan: null, message: 'Aucun plan actif.' })

        const { data: sessions } = await sb.from('planned_sessions')
          .select('id,week_start,day_index,sport,title,duration_min,tss,status,intensity')
          .eq('user_id', userId)
          .eq('plan_id', (plan as { id: string }).id)
          .order('week_start', { ascending: true })
          .order('day_index', { ascending: true })

        return JSON.stringify({ plan, sessions: sessions ?? [] })
      }

      // ── get_planned_sessions ────────────────────────────────
      case 'get_planned_sessions': {
        const from = typeof input.from_date === 'string' ? input.from_date : ymd(new Date())
        const to   = typeof input.to_date === 'string'   ? input.to_date   : ymd(new Date(Date.now() + 28 * 86400000))

        const { data, error } = await sb.from('planned_sessions')
          .select('id,plan_id,week_start,day_index,sport,title,time,duration_min,tss,status,intensity')
          .eq('user_id', userId)
          .gte('week_start', from.slice(0, 10))
          .lte('week_start', to.slice(0, 10))
          .order('week_start', { ascending: true })
          .order('day_index', { ascending: true })
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ from, to, count: (data ?? []).length, sessions: data ?? [] })
      }

      // ── get_session_library ─────────────────────────────────
      case 'get_session_library': {
        const sport     = typeof input.sport === 'string' ? input.sport : ''
        const intention = typeof input.intention === 'string' ? input.intention : ''
        const zone      = typeof input.zone === 'string' ? input.zone : ''
        const source    = input.source === 'catalogue' || input.source === 'perso' ? input.source : 'all'
        const limit     = clamp(Number(input.limit) || 12, 1, 40)

        // 1) Catalogue curé (données statiques, pas de DB)
        const catalogue: LibrarySession[] = source === 'perso'
          ? []
          : queryCatalog({ sport, intention, zone, limit })

        // 2) Séances PERSO de l'athlète (session_favorites)
        let perso: Record<string, unknown>[] = []
        if (source !== 'catalogue') {
          const { data } = await sb.from('session_favorites')
            .select('id,name,sport,training_type,blocks_data,duration_min,rpe,notes,starred')
            .eq('user_id', userId)
            .order('starred', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(60)
          const sq = sport.trim().toLowerCase()
          const iq = intention.trim().toLowerCase()
          perso = ((data ?? []) as PersoFav[])
            .filter(f => {
              if (sq && !(f.sport ?? '').toLowerCase().includes(sq)) return false
              if (iq) {
                const hay = [f.name, f.training_type, f.notes].filter(Boolean).join(' ').toLowerCase()
                if (!hay.includes(iq)) return false
              }
              return true
            })
            .slice(0, limit)
            .map(f => ({
              source: 'perso',
              sport: f.sport,
              id: f.id,
              nom: f.name,
              intention: f.training_type ?? undefined,
              rpe: f.rpe ?? undefined,
              duree: typeof f.duration_min === 'number' ? `${f.duration_min}min` : undefined,
              structure: summarizeFavBlocks(f.blocks_data),
              conseil: f.notes ?? undefined,
              favori: !!f.starred,
            }))
        }

        return JSON.stringify({
          hint: "Séances de référence — inspire-t'en (structure, intention, dosage) puis ADAPTE au profil et aux zones réelles de l'athlète. Ne recopie pas tel quel.",
          catalogue_count: catalogue.length,
          perso_count: perso.length,
          sessions: [...catalogue, ...perso],
        })
      }

      // ── get_stages ──────────────────────────────────────────
      case 'get_stages': {
        const includePast = input.include_past === true
        const { data: stages, error } = await sb.from('race_events')
          .select('id,name,start_date,end_date,description,daily_program')
          .eq('user_id', userId)
          .order('start_date', { ascending: true })
        if (error) return JSON.stringify({ error: error.message })

        const today = ymd(new Date())
        let rows = (stages ?? []) as Array<{
          id: string; name: string | null; start_date: string | null
          end_date: string | null; description: string | null; daily_program: unknown
        }>
        if (!includePast) rows = rows.filter(s => !s.end_date || s.end_date >= today)

        // Fichiers de parcours attachés (par event)
        const ids = rows.map(s => s.id)
        let filesByEvent: Record<string, Array<{ date: string | null; name: string | null }>> = {}
        if (ids.length) {
          const { data: files } = await sb.from('race_event_files')
            .select('event_id,file_name,event_date')
            .in('event_id', ids)
          filesByEvent = (files ?? []).reduce((acc, f) => {
            const row = f as { event_id: string; file_name: string | null; event_date: string | null }
            ;(acc[row.event_id] ??= []).push({ date: row.event_date, name: row.file_name })
            return acc
          }, {} as Record<string, Array<{ date: string | null; name: string | null }>>)
        }

        const stagesOut = rows.map(s => {
          const { sports, days } = parseStageDays(s.daily_program)
          const files = filesByEvent[s.id] ?? []
          return {
            id: s.id,
            name: s.name,
            start_date: s.start_date,
            end_date: s.end_date,
            days_to_go: daysToGo(s.start_date),
            description: s.description ?? undefined,
            sports: sports.length ? sports : undefined,
            program: days.map(d => {
              const seances = [
                ...(d.matin ?? []).map(x => `matin: ${compactStageSession(x)}`),
                ...(d.aprem ?? []).map(x => `aprem: ${compactStageSession(x)}`),
              ].filter(Boolean)
              const dayFiles = files.filter(f => f.date === d.date).map(f => f.name).filter(Boolean)
              return {
                date: d.date,
                content: d.content?.trim() || undefined,
                seances: seances.length ? seances : undefined,
                parcours: compactStageParcours(d.parcours),
                fichiers: dayFiles.length ? dayFiles : undefined,
              }
            }),
          }
        })
        return JSON.stringify({ count: stagesOut.length, stages: stagesOut })
      }

      // ── get_parcours ────────────────────────────────────────
      case 'get_parcours': {
        const search = typeof input.search === 'string' ? input.search.trim().toLowerCase() : ''
        const limit  = clamp(Number(input.limit) || 20, 1, 50)

        const { data, error } = await sb.from('parcours')
          .select('id,name,total_km,elevation_gain_m,elevation_loss_m,segments,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(80)
        if (error) return JSON.stringify({ error: error.message })

        const rows = ((data ?? []) as Array<{
          id: string; name: string | null; total_km: number | null
          elevation_gain_m: number | null; elevation_loss_m: number | null
          segments: unknown; created_at: string | null
        }>)
          .filter(p => !search || (p.name ?? '').toLowerCase().includes(search))
          .slice(0, limit)
          .map(p => {
            const climbs = summarizeClimbs(p.segments)
            return {
              id: p.id,
              name: p.name,
              distanceKm: p.total_km != null ? Math.round(p.total_km * 10) / 10 : null,
              elevationGainM: p.elevation_gain_m,
              elevationLossM: p.elevation_loss_m,
              date: p.created_at ? p.created_at.slice(0, 10) : null,
              climbCount: climbs.length,
              climbs: climbs.length ? climbs : undefined,
            }
          })
        return JSON.stringify({ count: rows.length, parcours: rows })
      }

      // ── get_races ───────────────────────────────────────────
      case 'get_races': {
        const includePast = input.include_past === true
        const limit = clamp(Number(input.limit) || 20, 1, 50)

        let q = sb.from('planned_races')
          .select('id,name,sport,date,level,goal,goal_time,distance,run_distance,tri_distance,goal_swim_time,goal_bike_time,goal_run_time,status,notes')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .limit(limit)
        if (!includePast) q = q.gte('date', ymd(new Date()))

        const { data, error } = await q
        if (error) return JSON.stringify({ error: error.message })
        const races = ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
          id: r.id,
          name: r.name,
          sport: r.sport,
          date: r.date,
          days_to_go: daysToGo(r.date as string | null),
          level: r.level ?? undefined,
          goal: r.goal ?? undefined,
          goalTime: r.goal_time ?? undefined,
          distance: r.distance ?? r.run_distance ?? r.tri_distance ?? undefined,
          splits: [r.goal_swim_time, r.goal_bike_time, r.goal_run_time].some(Boolean)
            ? { swim: r.goal_swim_time ?? undefined, bike: r.goal_bike_time ?? undefined, run: r.goal_run_time ?? undefined }
            : undefined,
          status: r.status ?? undefined,
          notes: r.notes ?? undefined,
        }))
        return JSON.stringify({ count: races.length, races })
      }

      // ── get_recovery ────────────────────────────────────────
      case 'get_recovery': {
        const sinceDays = clamp(Number(input.since_days) || 30, 1, 180)
        const since = ymd(new Date(Date.now() - sinceDays * 86400000))

        const [{ data: md }, { data: hd }] = await Promise.all([
          sb.from('metrics_daily')
            .select('date,hrv_rmssd,hrv_score,sleep_hours,sleep_score,resting_hr,readiness_score,fatigue_level')
            .eq('user_id', userId).gte('date', since).order('date', { ascending: true }),
          sb.from('health_data')
            .select('date,hrv_rmssd,sleep_score,sleep_duration_min,hr_resting,readiness_score,recovery_score,fatigue_level,stress_level,spo2_pct')
            .eq('user_id', userId).gte('date', since).order('date', { ascending: true }),
        ])

        // Fusion par jour (metrics_daily prioritaire, complété par health_data)
        const byDate: Record<string, Record<string, number | null>> = {}
        for (const r of (hd ?? []) as Array<Record<string, unknown>>) {
          const d = r.date as string
          byDate[d] = {
            hrv: (r.hrv_rmssd as number) ?? null,
            sleepScore: (r.sleep_score as number) ?? null,
            sleepH: r.sleep_duration_min != null ? Math.round((r.sleep_duration_min as number) / 6) / 10 : null,
            rhr: (r.hr_resting as number) ?? null,
            readiness: (r.readiness_score as number) ?? (r.recovery_score as number) ?? null,
            fatigue: (r.fatigue_level as number) ?? null,
            stress: (r.stress_level as number) ?? null,
            spo2: (r.spo2_pct as number) ?? null,
          }
        }
        for (const r of (md ?? []) as Array<Record<string, unknown>>) {
          const d = r.date as string
          const prev = byDate[d] ?? {}
          byDate[d] = {
            ...prev,
            hrv: (r.hrv_rmssd as number) ?? (r.hrv_score as number) ?? prev.hrv ?? null,
            sleepScore: (r.sleep_score as number) ?? prev.sleepScore ?? null,
            sleepH: (r.sleep_hours as number) ?? prev.sleepH ?? null,
            rhr: (r.resting_hr as number) ?? prev.rhr ?? null,
            readiness: (r.readiness_score as number) ?? prev.readiness ?? null,
            fatigue: (r.fatigue_level as number) ?? prev.fatigue ?? null,
          }
        }
        const days = Object.keys(byDate).sort().map(d => ({ date: d, ...byDate[d] }))
        if (!days.length) {
          return JSON.stringify({ error: `Aucune donnée de récupération sur ${sinceDays} jours.`, window_days: sinceDays })
        }
        const avg = (k: string) => {
          const vals = days.map(d => (d as unknown as Record<string, number | null>)[k]).filter((v): v is number => typeof v === 'number')
          return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
        }
        return JSON.stringify({
          window_days: sinceDays,
          count: days.length,
          latest: days[days.length - 1],
          averages: { hrv: avg('hrv'), sleepScore: avg('sleepScore'), sleepH: avg('sleepH'), rhr: avg('rhr'), readiness: avg('readiness') },
          days: days.slice(-30),
        })
      }

      // ── get_injuries ────────────────────────────────────────
      case 'get_injuries': {
        const status = input.status === 'active' || input.status === 'resolved' ? input.status : 'all'
        let q = sb.from('injuries')
          .select('id,severity,zone,side,structure,precision,intensity_rest,intensity_effort,onset_date,mechanism,activity,evolution,description,phase,return_estimate_date,status,resolved_date,practitioner,next_appointment')
          .eq('user_id', userId)
          .order('onset_date', { ascending: false })
        if (status !== 'all') q = q.eq('status', status)

        const { data, error } = await q
        if (error) return JSON.stringify({ error: error.message })
        const rows = (data ?? []) as Array<Record<string, unknown>>

        // Historique de suivi (injury_logs) pour ces blessures
        let logsByInjury: Record<string, Array<Record<string, unknown>>> = {}
        if (rows.length) {
          const { data: logs } = await sb.from('injury_logs')
            .select('injury_id,log_date,note,intensity_rest,intensity_effort')
            .in('injury_id', rows.map(r => r.id as string))
            .order('log_date', { ascending: false })
          logsByInjury = (logs ?? []).reduce((acc, l) => {
            const row = l as Record<string, unknown>
            ;(acc[row.injury_id as string] ??= []).push({
              date: row.log_date, note: row.note ?? undefined,
              douleurRepos: row.intensity_rest ?? undefined, douleurEffort: row.intensity_effort ?? undefined,
            })
            return acc
          }, {} as Record<string, Array<Record<string, unknown>>>)
        }

        const injuries = rows.map(r => ({
          id: r.id,
          zone: r.zone, side: r.side, structure: r.structure, precision: r.precision ?? undefined,
          severity: r.severity, phase: r.phase ?? undefined, status: r.status,
          douleurRepos: r.intensity_rest ?? undefined, douleurEffort: r.intensity_effort ?? undefined,
          onset_date: r.onset_date ?? undefined, return_estimate_date: r.return_estimate_date ?? undefined,
          resolved_date: r.resolved_date ?? undefined,
          mechanism: r.mechanism ?? undefined, activity: r.activity ?? undefined, evolution: r.evolution ?? undefined,
          description: r.description ?? undefined, practitioner: r.practitioner ?? undefined,
          next_appointment: r.next_appointment ?? undefined,
          suivi: logsByInjury[r.id as string]?.slice(0, 8),
        }))
        return JSON.stringify({ count: injuries.length, injuries })
      }

      // ── get_nutrition ───────────────────────────────────────
      case 'get_nutrition': {
        const { data, error } = await sb.from('nutrition_plans')
          .select('id,type,plan_data,actif,created_at')
          .eq('user_id', userId)
          .order('actif', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) return JSON.stringify({ error: error.message })
        if (!data) return JSON.stringify({ plan: null, message: 'Aucun plan nutritionnel enregistré.' })
        const row = data as { id: string; type: string | null; plan_data: unknown; actif: boolean | null; created_at: string | null }
        return JSON.stringify({
          id: row.id,
          type: row.type,
          actif: row.actif ?? false,
          date: row.created_at ? row.created_at.slice(0, 10) : null,
          plan: row.plan_data ?? null,
        })
      }

      // ── get_personal_records ────────────────────────────────
      case 'get_personal_records': {
        const sport = typeof input.sport === 'string' ? input.sport.trim() : ''
        const limit = clamp(Number(input.limit) || 30, 1, 100)

        let q = sb.from('personal_records')
          .select('sport,distance_label,distance_m,performance,performance_unit,pace_s_km,event_type,race_name,achieved_at,split_swim,split_bike,split_run,split_t1,split_t2,station_times,elevation_gain_m,terrain_type,rpe')
          .eq('user_id', userId)
          .order('achieved_at', { ascending: false })
          .limit(limit)
        if (sport) q = q.ilike('sport', `%${sport}%`)

        const { data, error } = await q
        if (error) return JSON.stringify({ error: error.message })
        const records = ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
          sport: r.sport,
          distance: r.distance_label ?? (r.distance_m != null ? `${r.distance_m}m` : undefined),
          perf: [r.performance, r.performance_unit].filter(Boolean).join(' ') || undefined,
          paceSecPerKm: r.pace_s_km ?? undefined,
          type: r.event_type ?? undefined,
          race: r.race_name ?? undefined,
          date: r.achieved_at ?? undefined,
          elevationGainM: r.elevation_gain_m ?? undefined,
          terrain: r.terrain_type ?? undefined,
          rpe: r.rpe ?? undefined,
          splits: [r.split_swim, r.split_bike, r.split_run, r.split_t1, r.split_t2].some(Boolean)
            ? { swim: r.split_swim ?? undefined, bike: r.split_bike ?? undefined, run: r.split_run ?? undefined, t1: r.split_t1 ?? undefined, t2: r.split_t2 ?? undefined }
            : undefined,
          stations: r.station_times ?? undefined,
        }))
        return JSON.stringify({ count: records.length, records })
      }

      // ── get_body_metrics ────────────────────────────────────
      case 'get_body_metrics': {
        const sinceDays = clamp(Number(input.since_days) || 180, 1, 365)
        const since = ymd(new Date(Date.now() - sinceDays * 86400000))

        const [{ data: bw }, { data: hd }] = await Promise.all([
          sb.from('body_weight').select('date,weight_kg')
            .eq('user_id', userId).gte('date', since).order('date', { ascending: true }),
          sb.from('health_data').select('date,weight_kg,body_fat_pct,muscle_mass_kg')
            .eq('user_id', userId).gte('date', since).not('weight_kg', 'is', null).order('date', { ascending: true }),
        ])

        const byDate: Record<string, { weightKg?: number | null; bodyFatPct?: number | null; muscleKg?: number | null }> = {}
        for (const r of (bw ?? []) as Array<{ date: string; weight_kg: number | null }>) {
          byDate[r.date] = { weightKg: r.weight_kg ?? null }
        }
        for (const r of (hd ?? []) as Array<{ date: string; weight_kg: number | null; body_fat_pct: number | null; muscle_mass_kg: number | null }>) {
          byDate[r.date] = {
            weightKg: byDate[r.date]?.weightKg ?? r.weight_kg ?? null,
            bodyFatPct: r.body_fat_pct ?? null,
            muscleKg: r.muscle_mass_kg ?? null,
          }
        }
        const points = Object.keys(byDate).sort().map(d => ({ date: d, ...byDate[d] }))
        if (!points.length) {
          return JSON.stringify({ error: `Aucune donnée corporelle sur ${sinceDays} jours.`, window_days: sinceDays })
        }
        const weights = points.map(p => p.weightKg).filter((v): v is number => typeof v === 'number')
        const trendKg = weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null
        return JSON.stringify({
          window_days: sinceDays,
          count: points.length,
          latest: points[points.length - 1],
          trendKg,
          points: points.slice(-40),
        })
      }

      default:
        return JSON.stringify({ error: `Outil de lecture inconnu : ${name}` })
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
  }
}
