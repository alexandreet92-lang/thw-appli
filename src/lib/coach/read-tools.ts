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

const ACT_COLS =
  'id,title,sport_type,started_at,moving_time_s,distance_m,tss,average_heartrate,max_heartrate,average_speed,avg_cadence,is_race,avg_watts'
const ACT_COLS_STREAMS = ACT_COLS + ',streams'

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
}

function ymd(d: Date): string { return d.toISOString().slice(0, 10) }

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

      default:
        return JSON.stringify({ error: `Outil de lecture inconnu : ${name}` })
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
  }
}
