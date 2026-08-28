// ══════════════════════════════════════════════════════════════
// Moteur de SUGGESTIONS PROACTIVES — détecte des signaux dans les vraies
// données de l'athlète (récupération, blessures, activité) et renvoie des
// signaux structurés. La mise en forme (i18n + CTA) est faite côté UI.
// Zéro donnée inventée : tout vient de Supabase (RLS = l'utilisateur courant).
// ══════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'

export type SignalKind = 'recovery' | 'injury' | 'inactivity' | 'plan'
export type SignalTone = 'warn' | 'info'

export interface Signal {
  kind: SignalKind
  tone: SignalTone
  // Données brutes utiles à l'UI (noms de blessures, nb de jours…).
  detail?: string
  days?: number
}

const RESOLVED = ['guérie', 'guerie', 'resolved', 'résolue', 'resolue', 'terminée', 'terminee']

// Blessure(s) active(s) → adapter la charge.
async function injurySignal(sb: SupabaseClient, userId: string): Promise<Signal | null> {
  try {
    const { data } = await sb.from('injuries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(12)
    const active = ((data ?? []) as Record<string, unknown>[]).filter(b => {
      const end = b.date_fin ?? b.resolved_date
      const status = String(b.status ?? '').toLowerCase()
      return !end && !RESOLVED.includes(status)
    })
    if (!active.length) return null
    const names = active.map(b => String(b.nom ?? b.name ?? b.title ?? b.zone ?? '')).filter(Boolean).slice(0, 3).join(', ')
    return { kind: 'injury', tone: 'warn', detail: names }
  } catch { return null }
}

// Récupération au plancher sur 7 jours (fatigue/courbatures hautes ou sommeil bas).
async function recoverySignal(sb: SupabaseClient, userId: string): Promise<Signal | null> {
  try {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    const { data } = await sb.from('recovery_checkin').select('sleep_quality,fatigue,soreness').eq('user_id', userId).gte('date', since)
    const rows = (data ?? []) as Record<string, number | null>[]
    if (rows.length < 2) return null
    const avg = (k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0) / rows.length
    const fatigue = avg('fatigue'), soreness = avg('soreness'), sleep = avg('sleep_quality')
    if (fatigue >= 4 || soreness >= 4 || (sleep > 0 && sleep <= 2)) return { kind: 'recovery', tone: 'warn' }
    return null
  } catch { return null }
}

// Inactivité : aucune activité depuis >= 5 jours (mais au moins une dans l'historique).
async function inactivitySignal(sb: SupabaseClient, userId: string): Promise<Signal | null> {
  try {
    const { data } = await sb.from('activities').select('started_at').eq('user_id', userId).order('started_at', { ascending: false }).limit(1).maybeSingle()
    if (!data?.started_at) return null
    const days = Math.floor((Date.now() - new Date(data.started_at as string).getTime()) / 86400_000)
    if (days >= 5) return { kind: 'inactivity', tone: 'info', days }
    return null
  } catch { return null }
}

// Aucun plan d'entraînement actif → proposer d'en créer un.
async function planSignal(sb: SupabaseClient, userId: string): Promise<Signal | null> {
  try {
    const { count } = await sb.from('training_plans').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('actif', true)
    if ((count ?? 0) > 0) return null
    // Ne proposer un plan que si l'athlète est un minimum actif (a des activités).
    const { count: actCount } = await sb.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    if ((actCount ?? 0) < 3) return null
    return { kind: 'plan', tone: 'info' }
  } catch { return null }
}

// Détecte tous les signaux, triés par priorité (santé d'abord).
export async function detectSignals(sb: SupabaseClient, userId: string): Promise<Signal[]> {
  const [injury, recovery, inactivity, plan] = await Promise.all([
    injurySignal(sb, userId),
    recoverySignal(sb, userId),
    inactivitySignal(sb, userId),
    planSignal(sb, userId),
  ])
  return [injury, recovery, inactivity, plan].filter((s): s is Signal => s != null)
}
