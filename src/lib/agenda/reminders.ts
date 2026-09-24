// ══════════════════════════════════════════════════════════════════════════
// Rappels d'agenda (Planning Week) — façon Google Agenda.
// Envoie une notif « X min avant » un événement/séance. Défaut : 30 min avant.
// reminder_min : null → 30 (défaut) ; -1 → aucun rappel ; sinon la valeur.
// Si l'utilisateur a connecté Google Agenda avec suppress_app_reminders=true,
// on NE double PAS les rappels de cette page (Google s'en charge).
// ══════════════════════════════════════════════════════════════════════════
import { createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'
import { DEFAULT_REMINDER_MIN } from '@/lib/agenda/types'

const MIN = 60000
const MAX_LEAD_MIN = 1440   // on regarde jusqu'à 24 h avant

function leadOf(reminderMin: number | null | undefined): number | null {
  if (reminderMin === -1) return null           // aucun rappel
  if (reminderMin == null) return DEFAULT_REMINDER_MIN
  return reminderMin
}

export interface ReminderRunResult { due: number; sent: number }

export async function dispatchAgendaReminders(): Promise<ReminderRunResult> {
  const sb = createServiceClient()
  const now = Date.now()
  const horizon = new Date(now + MAX_LEAD_MIN * MIN).toISOString()
  const nowIso = new Date(now).toISOString()
  const res: ReminderRunResult = { due: 0, sent: 0 }

  // Utilisateurs qui délèguent les rappels à Google → on les saute.
  const { data: sup } = await sb.from('google_calendar_connections').select('user_id').eq('suppress_app_reminders', true)
  const suppressed = new Set(((sup ?? []) as { user_id: string }[]).map(s => s.user_id))

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const fire = async (userId: string, id: string, source: string, title: string, startIso: string, reminderMin: number | null | undefined) => {
    const lead = leadOf(reminderMin)
    if (lead == null) return
    if (suppressed.has(userId)) return
    const start = new Date(startIso).getTime()
    const remAt = start - lead * MIN
    if (!(remAt <= now && now < start)) return   // pas encore l'heure, ou déjà passé
    res.due++
    const mins = Math.max(0, Math.round((start - now) / MIN))
    try {
      await notifyUser(userId, 'agenda.reminder', {
        title: `⏰ ${title}`,
        body: mins > 0 ? `Dans ${mins} min · ${fmt(startIso)}` : `C'est l'heure · ${fmt(startIso)}`,
        url: '/planning-week',
        dedupKey: `agenda-rem-${source}-${id}-${startIso}`,
        once: true,
      })
      res.sent++
    } catch { /* best-effort */ }
  }

  // Événements perso
  const { data: evs } = await sb.from('agenda_events')
    .select('id,user_id,title,starts_at,reminder_min')
    .gte('starts_at', nowIso).lte('starts_at', horizon)
  for (const e of (evs ?? []) as Record<string, unknown>[]) {
    await fire(e.user_id as string, e.id as string, 'event', (e.title as string) || 'Événement', e.starts_at as string, e.reminder_min as number | null)
  }

  // Séances placées sur l'agenda (starts_at renseigné)
  const { data: sess } = await sb.from('planned_sessions')
    .select('id,user_id,title,sport,starts_at,reminder_min')
    .not('starts_at', 'is', null).gte('starts_at', nowIso).lte('starts_at', horizon)
  for (const s of (sess ?? []) as Record<string, unknown>[]) {
    await fire(s.user_id as string, s.id as string, 'session', (s.title as string) || (s.sport as string) || 'Séance', s.starts_at as string, s.reminder_min as number | null)
  }

  return res
}
