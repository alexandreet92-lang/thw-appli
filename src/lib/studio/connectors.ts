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
export async function readSource(key: StudioSourceKey): Promise<string> {
  const sb = createClient()
  const uid = await getUserId()
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

// ── ÉCRITURE : Envoyer un rapport en notification ─────────────
export async function saveReportNotification(title: string, body: string): Promise<void> {
  const sb = createClient()
  const uid = await getUserId()
  const { error } = await sb.from('notifications').insert({
    user_id: uid,
    type: 'studio.report',
    title,
    body: body.length > 2000 ? body.slice(0, 2000) + '…' : body,
    link: '/',
  })
  if (error) throw new Error(`Écriture Notification : ${error.message}`)
}
