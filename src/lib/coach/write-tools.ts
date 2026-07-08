// ══════════════════════════════════════════════════════════════
// WRITE TOOLS — l'IA ÉCRIT dans les pages de l'app (nutrition, récup,
// poids, hydratation, calendrier, records). Résolus CÔTÉ SERVEUR dans
// la boucle agentique (comme les read/memory tools, non terminaux) :
// on exécute l'écriture puis on renvoie une confirmation que le coach
// relaie. Écritures dans les MÊMES tables que les pages (mêmes clés
// d'upsert), donc visibles immédiatement dans l'app.
//
// Sécurité : n'écrire QUE sur demande explicite de l'athlète ; toutes
// les écritures sont sur SES propres données (RLS user_id) et
// réversibles dans l'app. Résolutions défensives : une erreur renvoie
// un JSON { ok:false, error }, jamais une exception qui casse le flux.
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

function ymd(d: Date): string { return d.toISOString().slice(0, 10) }
function today(): string { return ymd(new Date()) }
function clampInt(v: unknown, lo: number, hi: number): number | null {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null
}
function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function dateOr(v: unknown): string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : today()
}

export const writeTools: Anthropic.Tool[] = [
  {
    name: 'log_nutrition_day',
    description:
      "ÉCRIT dans la page Nutrition (journal) : enregistre, pour un ou plusieurs jours, les CIBLES/APPORTS " +
      "nutritionnels (kcal + macros) et le détail des repas. À utiliser quand l'athlète te demande d'« ajouter » " +
      "ou d'« enregistrer » un plan nutritionnel dans l'app. Un objet par jour (tu peux en passer plusieurs).",
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'array',
          description: 'Un objet par jour.',
          items: {
            type: 'object',
            properties: {
              date:       { type: 'string',  description: 'YYYY-MM-DD (défaut aujourd’hui).' },
              kcal:       { type: 'number',  description: 'Calories totales cibles du jour.' },
              proteines:  { type: 'number',  description: 'Protéines (g).' },
              glucides:   { type: 'number',  description: 'Glucides (g).' },
              lipides:    { type: 'number',  description: 'Lipides (g).' },
              repas:      { type: 'string',  description: 'Détail des repas du jour (texte lisible : petit-déj, midi, sur le vélo, dîner…).' },
            },
          },
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'log_body_weight',
    description: "ÉCRIT le POIDS du jour dans la page Récupération (suivi corporel). Sur demande de l'athlète.",
    input_schema: {
      type: 'object',
      properties: {
        weight_kg: { type: 'number', description: 'Poids en kg.' },
        date:      { type: 'string', description: 'YYYY-MM-DD (défaut aujourd’hui).' },
      },
      required: ['weight_kg'],
    },
  },
  {
    name: 'log_hydration',
    description: "ÉCRIT l'HYDRATATION du jour (litres) dans la page Récupération. Sur demande de l'athlète.",
    input_schema: {
      type: 'object',
      properties: {
        liters: { type: 'number', description: "Litres d'eau bus." },
        date:   { type: 'string', description: 'YYYY-MM-DD (défaut aujourd’hui).' },
      },
      required: ['liters'],
    },
  },
  {
    name: 'log_recovery_checkin',
    description:
      "ÉCRIT le CHECK-IN de récupération du jour (page Récupération) : qualité de sommeil, fatigue, courbatures, " +
      "humeur (échelles 1 à 5). Sur demande de l'athlète.",
    input_schema: {
      type: 'object',
      properties: {
        date:          { type: 'string',  description: 'YYYY-MM-DD (défaut aujourd’hui).' },
        sleep_quality: { type: 'integer', description: 'Qualité de sommeil 1–5.' },
        fatigue:       { type: 'integer', description: 'Fatigue 1–5.' },
        soreness:      { type: 'integer', description: 'Courbatures 1–5.' },
        mood:          { type: 'integer', description: 'Humeur 1–5.' },
      },
    },
  },
  {
    name: 'add_race',
    description:
      "AJOUTE une COURSE / objectif au Calendrier de l'athlète. Sur demande explicite. Déduis le sport et la " +
      "priorité du contexte si non précisés.",
    input_schema: {
      type: 'object',
      properties: {
        name:      { type: 'string', description: 'Nom de la course.' },
        sport:     { type: 'string', enum: ['run', 'trail', 'bike', 'swim', 'hyrox', 'triathlon', 'rowing'], description: 'Sport.' },
        date:      { type: 'string', description: 'YYYY-MM-DD de la course.' },
        level:     { type: 'string', enum: ['secondary', 'important', 'main', 'gty'], description: 'Priorité (défaut secondary).' },
        goal:      { type: 'string', description: "Objectif (texte)." },
        goal_time: { type: 'string', description: 'Chrono visé (hh:mm:ss).' },
        distance:  { type: 'string', description: 'Distance / format.' },
      },
      required: ['name', 'sport', 'date'],
    },
  },
  {
    name: 'add_personal_record',
    description:
      "AJOUTE un RECORD PERSONNEL (page Records) : sport, distance/épreuve, performance, date. Sur demande explicite.",
    input_schema: {
      type: 'object',
      properties: {
        sport:          { type: 'string', description: 'Sport.' },
        distance_label: { type: 'string', description: "Distance / épreuve (ex '10 km', 'FTP 20 min')." },
        performance:    { type: 'string', description: "Performance (ex '38:20', '302')." },
        unit:           { type: 'string', description: "Unité de la performance (ex 'min', 'W', 'km/h')." },
        achieved_at:    { type: 'string', description: 'YYYY-MM-DD (défaut aujourd’hui).' },
        race_name:      { type: 'string', description: 'Course associée (optionnel).' },
        notes:          { type: 'string', description: 'Note (optionnel).' },
      },
      required: ['sport', 'performance'],
    },
  },
]

export const WRITE_TOOL_NAMES: ReadonlySet<string> = new Set(writeTools.map(t => t.name))

export async function resolveWriteTool(
  name: string,
  input: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any, any, any>,
  userId: string,
): Promise<string> {
  try {
    switch (name) {
      case 'log_nutrition_day': {
        const days = Array.isArray(input.days) ? input.days as Array<Record<string, unknown>> : []
        if (!days.length) return JSON.stringify({ ok: false, error: 'Aucun jour fourni.' })
        const rows = days.slice(0, 21).map(d => ({
          user_id: userId,
          date: dateOr(d.date),
          kcal_consommees: num(d.kcal),
          proteines: num(d.proteines),
          glucides: num(d.glucides),
          lipides: num(d.lipides),
          repas_details: typeof d.repas === 'string' && d.repas.trim() ? { texte: d.repas.trim(), source: 'coach' } : null,
        }))
        const { error } = await sb.from('nutrition_daily_logs').upsert(rows, { onConflict: 'user_id,date' })
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Nutrition', days: rows.map(r => r.date) })
      }

      case 'log_body_weight': {
        const w = num(input.weight_kg)
        if (w === null || w <= 0) return JSON.stringify({ ok: false, error: 'Poids invalide.' })
        const date = dateOr(input.date)
        const { error } = await sb.from('body_weight').upsert({ user_id: userId, date, weight_kg: w }, { onConflict: 'user_id,date' })
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Récupération', weight_kg: w, date })
      }

      case 'log_hydration': {
        const l = num(input.liters)
        if (l === null || l < 0) return JSON.stringify({ ok: false, error: 'Litres invalides.' })
        const date = dateOr(input.date)
        const { error } = await sb.from('hydration').upsert({ user_id: userId, date, liters: l }, { onConflict: 'user_id,date' })
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Récupération', liters: l, date })
      }

      case 'log_recovery_checkin': {
        const date = dateOr(input.date)
        const row: Record<string, unknown> = { user_id: userId, date }
        const sq = clampInt(input.sleep_quality, 1, 5); if (sq !== null) row.sleep_quality = sq
        const fa = clampInt(input.fatigue, 1, 5);       if (fa !== null) row.fatigue = fa
        const so = clampInt(input.soreness, 1, 5);      if (so !== null) row.soreness = so
        const mo = clampInt(input.mood, 1, 5);          if (mo !== null) row.mood = mo
        if (Object.keys(row).length <= 2) return JSON.stringify({ ok: false, error: 'Aucune valeur fournie.' })
        const { error } = await sb.from('recovery_checkin').upsert(row, { onConflict: 'user_id,date' })
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Récupération', date, saved: Object.keys(row).filter(k => k !== 'user_id' && k !== 'date') })
      }

      case 'add_race': {
        const nm = typeof input.name === 'string' ? input.name.trim() : ''
        const sport = typeof input.sport === 'string' ? input.sport : ''
        const date = typeof input.date === 'string' ? input.date.slice(0, 10) : ''
        if (!nm || !sport || !/^\d{4}-\d{2}-\d{2}/.test(date)) return JSON.stringify({ ok: false, error: 'Nom, sport et date valides requis.' })
        const level = typeof input.level === 'string' ? input.level : 'secondary'
        const { data, error } = await sb.from('planned_races').insert({
          user_id: userId, name: nm, sport, date, level,
          goal: (input.goal as string) ?? null,
          goal_time: (input.goal_time as string) ?? null,
          distance: (input.distance as string) ?? null,
          status: 'upcoming', validated: false, validation_data: {},
        }).select('id').single()
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Calendrier', id: (data as { id: string })?.id, name: nm, date })
      }

      case 'add_personal_record': {
        const sport = typeof input.sport === 'string' ? input.sport.trim() : ''
        const perf = typeof input.performance === 'string' ? input.performance.trim() : String(input.performance ?? '').trim()
        if (!sport || !perf) return JSON.stringify({ ok: false, error: 'Sport et performance requis.' })
        const { data, error } = await sb.from('personal_records').insert({
          user_id: userId, sport,
          distance_label: (input.distance_label as string) ?? null,
          performance: perf,
          performance_unit: (input.unit as string) ?? null,
          achieved_at: dateOr(input.achieved_at),
          race_name: (input.race_name as string) ?? null,
          notes: (input.notes as string) ?? null,
        }).select('id').single()
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Records', id: (data as { id: string })?.id, sport, performance: perf })
      }

      default:
        return JSON.stringify({ ok: false, error: `Outil d'écriture inconnu : ${name}` })
    }
  } catch (e) {
    return JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
