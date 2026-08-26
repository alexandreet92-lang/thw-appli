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
import { snapRoute } from '@/lib/openrouteservice'

function ymd(d: Date): string { return d.toISOString().slice(0, 10) }

// Sport athlète → profil de routage ORS (cycling | mtb | trail | hiking).
function orsSport(sport: string): string {
  const s = sport.toLowerCase()
  if (s.includes('vtt') || s.includes('mtb') || s.includes('gravel')) return 'mtb'
  if (s.includes('trail')) return 'trail'
  if (s.includes('bike') || s.includes('vélo') || s.includes('velo') || s.includes('cycl')) return 'cycling'
  return 'hiking' // run / marche / rando / défaut
}

// Géocode un lieu (nom/adresse) → coordonnées, via Mapbox (comme le créateur de routes).
async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX ?? ''
  if (!token) return null
  try {
    const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&language=fr`)
    if (!r.ok) return null
    const j = await r.json() as { features?: Array<{ center?: [number, number] }> }
    const c = j.features?.[0]?.center
    return c ? { lng: c[0], lat: c[1] } : null
  } catch { return null }
}
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
function str(v: unknown): string { return typeof v === 'string' ? v.trim() : '' }
const okJ = (o: Record<string, unknown>) => JSON.stringify({ ok: true, ...o })
const errJ = (m: string) => JSON.stringify({ ok: false, error: m })
function ymdLocal(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
// Date cible (YYYY-MM-DD) + décalage de semaines → { week_start (lundi), day_index 0=lun..6=dim }.
function weekDayOf(dateStr: string, weekOffset: number): { week_start: string; day_index: number } {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + weekOffset * 7)
  const dow = (d.getDay() + 6) % 7
  const monday = new Date(d); monday.setDate(d.getDate() - dow)
  return { week_start: ymdLocal(monday), day_index: dow }
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
    name: 'set_nutrition_plan',
    description:
      "CRÉE / REMPLACE le PLAN NUTRITIONNEL PRESCRIT de l'athlète (onglet « Mon plan » de la page Nutrition). " +
      "À utiliser quand le coach demande de « créer / faire le plan nutritionnel de l'athlète ». Fixe les CIBLES " +
      "kcal + macros pour les 3 types de journée (légère / moyenne / intense) ; le plan devient actif immédiatement " +
      "chez l'athlète et remplace tout plan précédent. NE PAS confondre avec log_nutrition_day (journal des apports " +
      "réels). Calcule des cibles cohérentes avec le poids, les sports et la charge d'entraînement de l'athlète.",
    input_schema: {
      type: 'object',
      properties: {
        calories_low:  { type: 'number', description: 'Cible kcal — journée LÉGÈRE (repos / faible charge).' },
        calories_mid:  { type: 'number', description: 'Cible kcal — journée MOYENNE.' },
        calories_hard: { type: 'number', description: 'Cible kcal — journée INTENSE (grosse séance).' },
        macros_low:  { type: 'object', description: 'Macros journée légère (g).',  properties: { proteines: { type: 'number' }, glucides: { type: 'number' }, lipides: { type: 'number' } } },
        macros_mid:  { type: 'object', description: 'Macros journée moyenne (g).',  properties: { proteines: { type: 'number' }, glucides: { type: 'number' }, lipides: { type: 'number' } } },
        macros_hard: { type: 'object', description: 'Macros journée intense (g).',  properties: { proteines: { type: 'number' }, glucides: { type: 'number' }, lipides: { type: 'number' } } },
        regime: { type: 'string', description: 'Régime / cadre (ex. « omnivore », « végétarien », « sans lactose »). Optionnel.' },
        resume: { type: 'string', description: 'Résumé court de la logique du plan (1–2 phrases), affiché à l’athlète. Optionnel.' },
      },
      required: ['calories_low', 'calories_mid', 'calories_hard', 'macros_mid'],
    },
  },
  {
    name: 'clear_planned_sessions',
    description:
      "SUPPRIME des séances planifiées EN MASSE (page Planning). À utiliser quand l'athlète demande de supprimer " +
      "TOUTES ses séances (scope 'all'), toutes celles à venir ('future'), ou une plage de dates ('range'). " +
      "BEAUCOUP plus fiable que supprimer une par une (pas d'énumération d'ID, aucune séance oubliée). " +
      "Renvoie le nombre RÉELLEMENT supprimé — annonce ce nombre à l'athlète (ne prétends pas au succès sans lui).",
    input_schema: {
      type: 'object',
      properties: {
        scope:     { type: 'string', enum: ['all', 'future', 'range'], description: "Portée (défaut 'all')." },
        from_date: { type: 'string', description: "YYYY-MM-DD — début (scope 'range')." },
        to_date:   { type: 'string', description: "YYYY-MM-DD — fin (scope 'range')." },
        plan_id:   { type: 'string', description: "Limiter à un plan précis (UUID, optionnel)." },
      },
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
    name: 'create_route',
    description:
      "CRÉE un vrai PARCOURS GPS pour l'athlète, à partir de sa description, et l'enregistre dans ses parcours. " +
      "Tu fournis une SÉQUENCE DE POINTS (lieux nommés — villes, cols, sommets — ou coordonnées) que le tracé " +
      "doit relier ; le routage suit les vraies routes/chemins et calcule distance et dénivelé. " +
      "Utilise-le quand l'athlète te demande de lui créer/générer un parcours. " +
      "RÈGLE : s'il manque des infos décisives (point de départ précis, région, cols/points de passage, boucle ou " +
      "aller simple, sport), NE DEVINE PAS un lieu au hasard — demande-les d'abord via ask_clarifying_questions. " +
      "Pour un parcours en plusieurs étapes (stage), appelle create_route une fois par étape.",
    input_schema: {
      type: 'object',
      properties: {
        name:  { type: 'string', description: 'Nom du parcours (ex: « Boucle des cols du Galibier »).' },
        sport: { type: 'string', description: 'Sport : bike/cycling, vtt/mtb, trail, run/rando…' },
        points: {
          type: 'array',
          description: 'Points à relier DANS L’ORDRE (min 2). Chaque point : un lieu nommé (place) OU des coordonnées (lat/lng).',
          items: {
            type: 'object',
            properties: {
              place: { type: 'string', description: 'Lieu (ville, col, sommet, adresse).' },
              lat:   { type: 'number', description: 'Latitude (si connue).' },
              lng:   { type: 'number', description: 'Longitude (si connue).' },
            },
          },
        },
        loop:  { type: 'boolean', description: 'Si true, boucle (retour au point de départ).' },
      },
      required: ['name', 'sport', 'points'],
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
  {
    name: 'duplicate_session',
    description:
      "DUPLIQUE une séance planifiée existante vers une AUTRE date (page Planning). Fournis l'ID de la séance " +
      "SOURCE (obtenu via get_planned_sessions) et la date cible. Copie tout le contenu (blocs, allures, durée, RPE). " +
      "Optionnel : la répéter sur plusieurs semaines (repeat_weeks) et/ou changer de Plan (A/B). " +
      "Utilise-le quand on demande de « répéter / dupliquer / recopier » une séance.",
    input_schema: {
      type: 'object',
      properties: {
        session_id:   { type: 'string',  description: 'UUID de la séance source (via get_planned_sessions).' },
        target_date:  { type: 'string',  description: 'YYYY-MM-DD du jour cible de la copie.' },
        plan_variant: { type: 'string',  enum: ['A', 'B'], description: 'Plan cible (défaut : celui de la source).' },
        repeat_weeks: { type: 'integer', description: 'Répéter aussi sur N semaines suivantes (0 = seulement la date cible). Max 20.' },
      },
      required: ['session_id', 'target_date'],
    },
  },
  {
    name: 'mark_session_done',
    description: "Marque une séance planifiée comme RÉALISÉE (statut « done ») — page Planning. Fournis l'ID (via get_planned_sessions).",
    input_schema: {
      type: 'object',
      properties: { session_id: { type: 'string', description: 'UUID de la séance.' } },
      required: ['session_id'],
    },
  },
  {
    name: 'update_profile',
    description:
      "MET À JOUR le PROFIL de l'athlète : objectif principal, poids, taille, heures d'entraînement/semaine, " +
      "heures de sommeil idéales, sports pratiqués, profession, heures de travail. N'écris QUE les champs à changer. " +
      "Sur demande explicite (ex. « change mon objectif », « je peux m'entraîner 8 h/semaine »).",
    input_schema: {
      type: 'object',
      properties: {
        main_goal:            { type: 'string', description: 'Objectif principal (texte libre).' },
        weight_kg:            { type: 'number' },
        height_cm:            { type: 'number' },
        sport_hours_per_week: { type: 'number', description: "Heures d'entraînement disponibles par semaine." },
        ideal_sleep_hours:    { type: 'number' },
        sports:               { type: 'array', items: { type: 'string' }, description: 'Sports pratiqués.' },
        work_hours_per_week:  { type: 'number' },
        work_profession:      { type: 'string' },
      },
    },
  },
  {
    name: 'update_injury',
    description:
      "MET À JOUR une blessure existante (page Blessures) : phase de guérison, douleur repos/effort, date de retour " +
      "estimée, praticien, prochain RDV, description. Fournis l'ID (via get_injuries). Pour la clore (guérie), utilise resolve_injury.",
    input_schema: {
      type: 'object',
      properties: {
        injury_id:            { type: 'string',  description: 'UUID de la blessure (via get_injuries).' },
        phase:                { type: 'string',  description: 'Phase de guérison (ex. « aigue », « subaigue », « reprise », « resolu »).' },
        intensity_rest:       { type: 'integer', description: 'Douleur au repos 0–10.' },
        intensity_effort:     { type: 'integer', description: "Douleur à l'effort 0–10." },
        return_estimate_date: { type: 'string',  description: 'YYYY-MM-DD de retour estimé.' },
        practitioner:         { type: 'string' },
        next_appointment:     { type: 'string',  description: 'YYYY-MM-DD.' },
        description:          { type: 'string' },
      },
      required: ['injury_id'],
    },
  },
  {
    name: 'resolve_injury',
    description: "CLÔT une blessure (guérie) — page Blessures. Fournis l'ID (via get_injuries).",
    input_schema: {
      type: 'object',
      properties: { injury_id: { type: 'string', description: 'UUID de la blessure.' } },
      required: ['injury_id'],
    },
  },
  {
    name: 'log_injury_progress',
    description:
      "AJOUTE un point de SUIVI à une blessure (page Blessures) : note + douleur repos/effort du jour. " +
      "Fournis l'ID (via get_injuries). Utile pour suivre la guérison au fil des jours.",
    input_schema: {
      type: 'object',
      properties: {
        injury_id:        { type: 'string',  description: 'UUID de la blessure (via get_injuries).' },
        note:             { type: 'string',  description: 'Note du jour.' },
        intensity_rest:   { type: 'integer', description: 'Douleur au repos 0–10.' },
        intensity_effort: { type: 'integer', description: "Douleur à l'effort 0–10." },
        date:             { type: 'string',  description: 'YYYY-MM-DD (défaut aujourd’hui).' },
      },
      required: ['injury_id'],
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

      case 'set_nutrition_plan': {
        const cm = num(input.calories_mid)
        if (cm === null || cm <= 0) return JSON.stringify({ ok: false, error: 'calories_mid requis (> 0).' })
        const cl = num(input.calories_low), ch = num(input.calories_hard)
        const macro = (v: unknown) => {
          const o = (v ?? {}) as Record<string, unknown>
          return { proteines: num(o.proteines) ?? 0, glucides: num(o.glucides) ?? 0, lipides: num(o.lipides) ?? 0 }
        }
        const mMid = macro(input.macros_mid)
        const plan_data = {
          calories_low: cl ?? cm, calories_mid: cm, calories_hard: ch ?? cm,
          macros_low:  macro(input.macros_low ?? input.macros_mid),
          macros_mid:  mMid,
          macros_hard: macro(input.macros_hard ?? input.macros_mid),
          regime: typeof input.regime === 'string' && input.regime.trim() ? input.regime.trim() : null,
          resume: typeof input.resume === 'string' && input.resume.trim() ? input.resume.trim() : null,
          jours: [],
          source: 'coach',
        }
        await sb.from('nutrition_plans').update({ actif: false }).eq('user_id', userId).eq('actif', true)
        const { data, error } = await sb.from('nutrition_plans')
          .insert({ user_id: userId, type: 'coach', plan_data, actif: true })
          .select('id').single()
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Nutrition', plan_id: (data as { id: string })?.id, calories_mid: cm })
      }

      case 'clear_planned_sessions': {
        const scope = input.scope === 'future' || input.scope === 'range' ? input.scope : 'all'
        let q = sb.from('planned_sessions').delete().eq('user_id', userId)
        if (scope === 'future') {
          q = q.gte('week_start', today())
        } else if (scope === 'range') {
          const from = typeof input.from_date === 'string' ? input.from_date.slice(0, 10) : today()
          const to = typeof input.to_date === 'string' ? input.to_date.slice(0, 10) : ymd(new Date(Date.now() + 365 * 86400000))
          q = q.gte('week_start', from).lte('week_start', to)
        }
        if (typeof input.plan_id === 'string' && input.plan_id.trim()) q = q.eq('plan_id', input.plan_id.trim())
        const { data, error } = await q.select('id')
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({ ok: true, page: 'Planning', scope, deleted: (data ?? []).length })
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

      case 'create_route': {
        const name = typeof input.name === 'string' ? input.name.trim() : ''
        const sport = typeof input.sport === 'string' ? input.sport.trim() : ''
        const rawPts = Array.isArray(input.points) ? input.points as Array<Record<string, unknown>> : []
        if (!name || !sport) return JSON.stringify({ ok: false, error: 'Nom et sport requis.' })
        if (rawPts.length < 2) return JSON.stringify({ ok: false, error: 'Au moins 2 points (départ + arrivée/étape).' })

        // Résolution des points → coordonnées (géocodage des lieux nommés).
        const coords: Array<{ lat: number; lng: number }> = []
        for (const p of rawPts.slice(0, 25)) {
          if (num(p.lat) !== null && num(p.lng) !== null) {
            coords.push({ lat: num(p.lat) as number, lng: num(p.lng) as number })
          } else if (typeof p.place === 'string' && p.place.trim()) {
            const g = await geocodePlace(p.place.trim())
            if (!g) return JSON.stringify({ ok: false, error: `Lieu introuvable : « ${p.place} ». Précise (ville/région).` })
            coords.push(g)
          }
        }
        if (coords.length < 2) return JSON.stringify({ ok: false, error: 'Points insuffisants après géocodage.' })
        if (input.loop === true) coords.push({ ...coords[0] })

        let snap
        try {
          snap = await snapRoute(coords, orsSport(sport))
        } catch (e) {
          return JSON.stringify({ ok: false, error: `Routage impossible (${e instanceof Error ? e.message : 'erreur'}). Vérifie les points.` })
        }

        const { data, error } = await sb.from('routes').insert({
          user_id: userId, name, sport, is_public: false,
          distance_m: Math.round(snap.distanceM),
          elevation_gain_m: Math.round(snap.elevGain),
          waypoints: coords,
          snapped_points: snap.snappedPoints,
          elevation_profile: snap.elevationProfile,
          surfaces: snap.surfaces,
        }).select('id').single()
        if (error) return JSON.stringify({ ok: false, error: error.message })
        return JSON.stringify({
          ok: true, page: 'Parcours', id: (data as { id: string })?.id, name,
          distanceKm: Math.round(snap.distanceM / 100) / 10,
          elevationGainM: Math.round(snap.elevGain),
        })
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

      case 'duplicate_session': {
        const sid = str(input.session_id)
        const td = typeof input.target_date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input.target_date) ? input.target_date.slice(0, 10) : ''
        if (!sid || !td) return errJ('session_id et target_date (YYYY-MM-DD) requis.')
        const { data: src, error: e1 } = await sb.from('planned_sessions').select('*').eq('id', sid).eq('user_id', userId).maybeSingle()
        if (e1) return errJ(e1.message)
        if (!src) return errJ('Séance introuvable.')
        const b = src as Record<string, unknown>
        const variant = input.plan_variant === 'A' || input.plan_variant === 'B' ? input.plan_variant : (b.plan_variant ?? 'A')
        const rep = clampInt(input.repeat_weeks, 0, 20) ?? 0
        const rows: Record<string, unknown>[] = []
        for (let k = 0; k <= rep; k++) {
          const { week_start, day_index } = weekDayOf(td, k)
          rows.push({
            user_id: userId, plan_id: b.plan_id ?? null, week_start, day_index,
            sport: b.sport, title: b.title, time: b.time ?? null,
            duration_min: b.duration_min, tss: b.tss ?? null, status: 'planned',
            intensity: b.intensity ?? null, notes: b.notes ?? null, rpe: b.rpe ?? null,
            blocks: b.blocks ?? [], plan_variant: variant, validation_data: {},
            source: 'coach_duplicate', original_content: b.original_content ?? null,
            type_seance: b.type_seance ?? null,
          })
        }
        const { error: e2 } = await sb.from('planned_sessions').insert(rows)
        if (e2) return errJ(e2.message)
        return okJ({ page: 'Planning', duplicated: rows.length, plan_variant: variant, first_date: td })
      }

      case 'mark_session_done': {
        const sid = str(input.session_id)
        if (!sid) return errJ('session_id requis.')
        const { data, error } = await sb.from('planned_sessions').update({ status: 'done' }).eq('id', sid).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        if (!(data ?? []).length) return errJ('Séance introuvable.')
        return okJ({ page: 'Planning', session_id: sid, status: 'done' })
      }

      case 'update_profile': {
        const patch: Record<string, unknown> = {}
        if (str(input.main_goal)) patch.main_goal = str(input.main_goal)
        if (num(input.weight_kg) !== null) patch.weight_kg = num(input.weight_kg)
        if (num(input.height_cm) !== null) patch.height_cm = num(input.height_cm)
        if (num(input.sport_hours_per_week) !== null) patch.sport_hours_per_week = num(input.sport_hours_per_week)
        if (num(input.ideal_sleep_hours) !== null) patch.ideal_sleep_hours = num(input.ideal_sleep_hours)
        if (num(input.work_hours_per_week) !== null) patch.work_hours_per_week = num(input.work_hours_per_week)
        if (str(input.work_profession)) patch.work_profession = str(input.work_profession)
        if (Array.isArray(input.sports)) patch.sports = (input.sports as unknown[]).map(String)
        if (Object.keys(patch).length === 0) return errJ('Aucun champ à mettre à jour.')
        const { error } = await sb.from('profiles').update(patch).eq('id', userId)
        if (error) return errJ(error.message)
        return okJ({ page: 'Profil', updated: Object.keys(patch) })
      }

      case 'update_injury': {
        const iid = str(input.injury_id)
        if (!iid) return errJ('injury_id requis.')
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (str(input.phase)) patch.phase = str(input.phase)
        const ir = clampInt(input.intensity_rest, 0, 10); if (ir !== null) patch.intensity_rest = ir
        const ie = clampInt(input.intensity_effort, 0, 10); if (ie !== null) patch.intensity_effort = ie
        if (typeof input.return_estimate_date === 'string') patch.return_estimate_date = input.return_estimate_date.slice(0, 10)
        if (str(input.practitioner)) patch.practitioner = str(input.practitioner)
        if (typeof input.next_appointment === 'string') patch.next_appointment = input.next_appointment.slice(0, 10)
        if (str(input.description)) patch.description = str(input.description)
        const { data, error } = await sb.from('injuries').update(patch).eq('id', iid).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        if (!(data ?? []).length) return errJ('Blessure introuvable.')
        return okJ({ page: 'Blessures', injury_id: iid, updated: Object.keys(patch).filter(k => k !== 'updated_at') })
      }

      case 'resolve_injury': {
        const iid = str(input.injury_id)
        if (!iid) return errJ('injury_id requis.')
        const { data, error } = await sb.from('injuries')
          .update({ status: 'resolved', phase: 'resolu', resolved_date: today(), updated_at: new Date().toISOString() })
          .eq('id', iid).eq('user_id', userId).select('id')
        if (error) return errJ(error.message)
        if (!(data ?? []).length) return errJ('Blessure introuvable.')
        return okJ({ page: 'Blessures', injury_id: iid, status: 'resolved' })
      }

      case 'log_injury_progress': {
        const iid = str(input.injury_id)
        if (!iid) return errJ('injury_id requis.')
        const { data: inj } = await sb.from('injuries').select('id').eq('id', iid).eq('user_id', userId).maybeSingle()
        if (!inj) return errJ('Blessure introuvable.')
        const row: Record<string, unknown> = { injury_id: iid, log_date: dateOr(input.date) }
        if (str(input.note)) row.note = str(input.note)
        const ir = clampInt(input.intensity_rest, 0, 10); if (ir !== null) row.intensity_rest = ir
        const ie = clampInt(input.intensity_effort, 0, 10); if (ie !== null) row.intensity_effort = ie
        const { error } = await sb.from('injury_logs').insert(row)
        if (error) return errJ(error.message)
        return okJ({ page: 'Blessures', injury_id: iid, log_date: row.log_date })
      }

      default:
        return JSON.stringify({ ok: false, error: `Outil d'écriture inconnu : ${name}` })
    }
  } catch (e) {
    return JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
