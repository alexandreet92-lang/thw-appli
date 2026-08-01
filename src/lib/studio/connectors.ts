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
import { readSourceWith } from './source-readers'
import type { StudioSourceKey } from './graph'

const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s)

async function getUserId(): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Utilisateur non connecté')
  return user.id
}

// ── LECTURE ───────────────────────────────────────────────────
// Le détail des requêtes vit dans source-readers.ts (partagé avec le
// runner SERVEUR des runs autonomes).
// sourceUid : lire les données d'un AUTRE utilisateur (coach → athlète, via RLS
// coach). Défaut = utilisateur courant.
export async function readSource(key: StudioSourceKey, sourceUid?: string): Promise<string> {
  const sb = createClient()
  const uid = sourceUid ?? await getUserId()
  return readSourceWith(sb, uid, key)
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

// Lit les séances IA « planned » déjà présentes dans les semaines couvertes —
// sert à montrer un vrai AVANT/APRÈS avant d'écrire (aucune modif ici).
export async function readExistingAiSessions(weeks: string[]): Promise<PlanningSessionDraft[]> {
  if (!weeks.length) return []
  const sb = createClient()
  const uid = await getUserId()
  const { data, error } = await sb
    .from('planned_sessions')
    .select('week_start,day_index,sport,title,duration_min,intensity')
    .eq('user_id', uid).eq('source', 'ai').eq('status', 'planned')
    .in('week_start', weeks)
    .order('week_start', { ascending: true }).order('day_index', { ascending: true })
  if (error) return []
  return (data ?? []).map(r => ({
    week_start: String(r.week_start), day_index: Number(r.day_index),
    sport: String(r.sport ?? ''), title: String(r.title ?? ''),
    duration_min: (r.duration_min as number | null) ?? null, intensity: (r.intensity as string | null) ?? null,
  }))
}

// Résumé AVANT/APRÈS pour l'écran d'accord : ce qui est retiré, ce qui est ajouté.
export function describePlanningDiff(removed: PlanningSessionDraft[], added: PlanningSessionDraft[], replace: boolean): string {
  const blocks: string[] = []
  if (replace && removed.length) {
    blocks.push(`**Retiré du Planning** (${removed.length} séance${removed.length > 1 ? 's' : ''} IA) :\n${describeDrafts(removed)}`)
  } else if (!replace && removed.length) {
    blocks.push(`**Déjà au Planning cette semaine** (conservé) :\n${describeDrafts(removed)}`)
  }
  blocks.push(`**Ajouté au Planning** (${added.length} séance${added.length > 1 ? 's' : ''}) :\n${describeDrafts(added)}`)
  return blocks.join('\n\n')
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

// REMPLACE la (les) semaine(s) concernée(s) : supprime d'abord les séances
// générées par l'IA (source='ai', statut 'planned') des semaines couvertes,
// puis insère les nouvelles. Ne touche PAS aux séances créées par l'utilisateur.
export async function replacePlanningSessions(drafts: PlanningSessionDraft[]): Promise<{ inserted: number; removed: number }> {
  if (!drafts.length) return { inserted: 0, removed: 0 }
  const sb = createClient()
  const uid = await getUserId()
  const weeks = Array.from(new Set(drafts.map(d => d.week_start)))
  const { data: del, error: delErr } = await sb
    .from('planned_sessions')
    .delete()
    .eq('user_id', uid)
    .eq('source', 'ai')
    .eq('status', 'planned')
    .in('week_start', weeks)
    .select('id')
  if (delErr) throw new Error(`Nettoyage Planning : ${delErr.message}`)
  const inserted = await savePlanningSessions(drafts)
  return { inserted, removed: (del ?? []).length }
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

// ── ÉCRITURE : Créer une course/objectif au Calendrier ────────
export interface RaceDraft {
  name: string
  start_date: string        // YYYY-MM-DD
  end_date?: string | null  // YYYY-MM-DD (défaut = start_date)
  description?: string | null
}

export function describeRace(d: RaceDraft): string {
  const range = d.end_date && d.end_date !== d.start_date ? `${d.start_date} → ${d.end_date}` : d.start_date
  return `• ${d.name} — ${range}${d.description ? `\n  ${d.description}` : ''}`
}

export async function saveRaceEvent(d: RaceDraft): Promise<void> {
  const sb = createClient()
  const uid = await getUserId()
  const { error } = await sb.from('race_events').insert({
    user_id: uid,
    name: d.name,
    start_date: d.start_date,
    end_date: d.end_date ?? d.start_date,
    description: d.description ?? null,
    daily_program: [],
  })
  if (error) throw new Error(`Écriture Calendrier : ${error.message}`)
}

// ── ÉCRITURE : Enregistrer un plan nutrition (nutrition_plans) ─
// Le plan actif de l'app est un objet RICHE (plan_data JSONB) : calories par
// type de jour, macros, et des jours détaillés. On NORMALISE défensivement la
// sortie de l'IA pour ne JAMAIS insérer une structure cassée (la page Nutrition
// lit ce format). Les repas sont acceptés en texte (format compatible).
type MacroSet = { proteines: number; glucides: number; lipides: number }
type MealSet = { petit_dejeuner: string; collation_matin: string; dejeuner: string; collation_apres_midi: string; diner: string; collation_soir: string }
interface PlanDay {
  date: string
  type_jour: 'low' | 'mid' | 'hard'
  kcal: number
  proteines: number
  glucides: number
  lipides: number
  repas: { option_A: MealSet; option_B: MealSet }
}
export interface NutritionPlanData {
  description: string
  calories_low: number
  calories_mid: number
  calories_hard: number
  macros_low: MacroSet
  macros_mid: MacroSet
  macros_hard: MacroSet
  jours: PlanDay[]
}

const num = (v: unknown, d = 0): number => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : d }
const str = (v: unknown): string => (v == null ? '' : String(v)).slice(0, 400)
const macro = (v: unknown): MacroSet => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  return { proteines: num(o.proteines ?? o.protein ?? o.prot), glucides: num(o.glucides ?? o.carbs ?? o.gluc), lipides: num(o.lipides ?? o.fat ?? o.lip) }
}
const mealSet = (v: unknown): MealSet => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const pick = (...keys: string[]): string => { for (const k of keys) if (o[k] != null) { const val = o[k]; return typeof val === 'object' ? str((val as Record<string, unknown>).description) : str(val) } return '' }
  return {
    petit_dejeuner:       pick('petit_dejeuner', 'petit-dejeuner', 'breakfast'),
    collation_matin:      pick('collation_matin', 'snack_matin', 'morning_snack'),
    dejeuner:             pick('dejeuner', 'lunch'),
    collation_apres_midi: pick('collation_apres_midi', 'snack_aprem', 'afternoon_snack'),
    diner:                pick('diner', 'dinner'),
    collation_soir:       pick('collation_soir', 'snack_soir', 'evening_snack'),
  }
}
const TYPES: PlanDay['type_jour'][] = ['low', 'mid', 'hard']

// Transforme une sortie IA quelconque en NutritionPlanData toujours valide.
export function normalizeNutritionPlan(raw: unknown): NutritionPlanData {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const cMid = num(o.calories_mid ?? o.calories_target ?? o.kcal, 2200)
  const cLow = num(o.calories_low, Math.round(cMid * 0.9))
  const cHard = num(o.calories_hard, Math.round(cMid * 1.15))
  const mMid = macro(o.macros_mid ?? o.macros ?? o)
  if (!mMid.proteines && !mMid.glucides && !mMid.lipides) { mMid.proteines = num(o.protein_g); mMid.glucides = num(o.carbs_g); mMid.lipides = num(o.fat_g) }
  const rawDays = Array.isArray(o.jours) ? o.jours : []
  let jours: PlanDay[] = rawDays.slice(0, 7).map((d, i) => {
    const dd = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>
    const tj = TYPES.includes(dd.type_jour as PlanDay['type_jour']) ? dd.type_jour as PlanDay['type_jour'] : 'mid'
    const rep = (dd.repas && typeof dd.repas === 'object' ? dd.repas : {}) as Record<string, unknown>
    return {
      date: str(dd.date) || `Jour ${i + 1}`,
      type_jour: tj,
      kcal: num(dd.kcal, tj === 'low' ? cLow : tj === 'hard' ? cHard : cMid),
      proteines: num(dd.proteines, mMid.proteines), glucides: num(dd.glucides, mMid.glucides), lipides: num(dd.lipides, mMid.lipides),
      repas: { option_A: mealSet(rep.option_A ?? rep.A ?? rep), option_B: mealSet(rep.option_B ?? rep.B) },
    }
  })
  if (!jours.length) {
    // Filet : au moins un jour « mid » pour que la page ait quelque chose à afficher.
    jours = [{ date: 'Jour type', type_jour: 'mid', kcal: cMid, proteines: mMid.proteines, glucides: mMid.glucides, lipides: mMid.lipides,
      repas: { option_A: mealSet(null), option_B: mealSet(null) } }]
  }
  return {
    description: str(o.description) || 'Plan nutrition généré par le Studio',
    calories_low: cLow, calories_mid: cMid, calories_hard: cHard,
    macros_low: macro(o.macros_low) ?? mMid, macros_mid: mMid, macros_hard: macro(o.macros_hard) ?? mMid,
    jours,
  }
}

export function describeNutritionPlan(p: NutritionPlanData): string {
  const m = p.macros_mid
  return `**${p.description}**\n\n` +
    `• Calories : ${p.calories_low} (repos) · ${p.calories_mid} (moyen) · ${p.calories_hard} (dur) kcal\n` +
    `• Macros (jour moyen) : ${m.proteines}g protéines · ${m.glucides}g glucides · ${m.lipides}g lipides\n` +
    `• ${p.jours.length} jour(s) détaillé(s), 2 options de repas chacun`
}

// Désactive le plan actif puis insère le nouveau (comme la page Nutrition).
export async function saveNutritionPlan(p: NutritionPlanData): Promise<void> {
  const sb = createClient()
  const uid = await getUserId()
  await sb.from('nutrition_plans').update({ actif: false }).eq('user_id', uid).eq('actif', true)
  const { error } = await sb.from('nutrition_plans').insert({ user_id: uid, type: 'manuel', plan_data: p, actif: true })
  if (error) throw new Error(`Écriture Nutrition : ${error.message}`)
  try { window.dispatchEvent(new CustomEvent('thw:nutrition-changed')) } catch { /* ignore */ }
}

// ── ÉCRITURE : Envoyer un rapport en notification ─────────────
export async function saveReportNotification(title: string, body: string): Promise<void> {
  const sb = createClient()
  const uid = await getUserId()
  const { error } = await sb.from('notifications').insert({
    user_id: uid,
    type: 'studio.report',
    title,
    body: body.length > 2000 ? body.slice(0, 2000) + '…' : body,
    link: '/?studio=1',
  })
  if (error) throw new Error(`Écriture Notification : ${error.message}`)
}
