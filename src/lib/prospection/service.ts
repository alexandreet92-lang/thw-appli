import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parisDay, parisHour, rampInfo } from './config'
import { renderEmail } from './template'
import { sendProspectEmail, sesConfigured } from './ses'
import type {
  DayPoint, ProspectContact, ProspectionOverview, ProspectSettings, SendRow,
} from './types'

const SETTINGS_COLS = 'enabled, daily_target, send_hour, ramp_start, subject, body, from_name, from_email, postal_address'

export async function loadSettings(sb: SupabaseClient): Promise<ProspectSettings> {
  const { data, error } = await sb.from('prospect_settings').select(SETTINGS_COLS).eq('id', 1).single()
  if (error || !data) throw new Error(error?.message ?? 'réglages introuvables')
  return data as ProspectSettings
}

interface SendJoin {
  id: number
  sent_at: string
  status: 'sent' | 'failed'
  error: string | null
  delivery_status: SendRow['delivery_status']
  click_count: number
  open_count: number
  clicked_at: string | null
  prospect_contacts: { email: string } | { email: string }[] | null
}

function emailOf(j: SendJoin['prospect_contacts']): string {
  if (!j) return ''
  return Array.isArray(j) ? (j[0]?.email ?? '') : j.email
}

/** Nombre d'envois réussis aujourd'hui (jour de Paris). */
async function sentTodayCount(sb: SupabaseClient): Promise<number> {
  const since = new Date(Date.now() - 36 * 3_600_000).toISOString()
  const { data } = await sb.from('prospect_sends').select('sent_at').eq('status', 'sent').gte('sent_at', since)
  const today = parisDay(new Date())
  return ((data ?? []) as { sent_at: string }[]).filter(r => parisDay(new Date(r.sent_at)) === today).length
}

export interface RunResult { ok: boolean; sent: number; failed: number; skipped?: string }

/** Cron quotidien : envoie jusqu'à la limite du jour (objectif réglé, borné par la montée en puissance). */
export async function runDailySend(sb: SupabaseClient): Promise<RunResult> {
  const s = await loadSettings(sb)
  if (!s.enabled) return { ok: true, sent: 0, failed: 0, skipped: 'envoi désactivé' }
  // Le cron tourne chaque heure : l'envoi n'a lieu qu'à l'heure réglée (heure de Paris).
  if (parisHour(new Date()) !== s.send_hour) return { ok: true, sent: 0, failed: 0, skipped: 'hors heure d’envoi' }
  if (!sesConfigured()) return { ok: false, sent: 0, failed: 0, skipped: 'SES non configuré' }
  if (!s.from_email.trim()) return { ok: false, sent: 0, failed: 0, skipped: 'adresse expéditeur manquante' }

  if (!s.ramp_start) {
    s.ramp_start = parisDay(new Date())
    await sb.from('prospect_settings').update({ ramp_start: s.ramp_start }).eq('id', 1)
  }
  const ramp = rampInfo(s.ramp_start, s.daily_target)
  const remaining = ramp.limit - await sentTodayCount(sb)
  if (remaining <= 0) return { ok: true, sent: 0, failed: 0, skipped: 'limite du jour atteinte' }

  const { data: queue } = await sb.from('prospect_contacts')
    .select('id, email, first_name, token')
    .eq('status', 'active').is('last_sent_at', null).lt('send_failures', 2)
    .order('created_at', { ascending: true }).limit(remaining)

  let sent = 0, failed = 0
  for (const c of (queue ?? []) as ProspectContact[]) {
    const mail = renderEmail(s, c)
    try {
      const messageId = await sendProspectEmail({
        to: c.email, fromName: s.from_name, fromEmail: s.from_email,
        subject: mail.subject, text: mail.text, html: mail.html, unsubscribeUrl: mail.unsubscribeUrl,
      })
      await sb.from('prospect_sends').insert({ contact_id: c.id, status: 'sent', ses_message_id: messageId })
      await sb.from('prospect_contacts').update({ last_sent_at: new Date().toISOString() }).eq('id', c.id)
      sent++
    } catch (e) {
      failed++
      const msg = e instanceof Error ? e.message : String(e)
      await sb.from('prospect_sends').insert({ contact_id: c.id, status: 'failed', error: msg.slice(0, 300) })
      const { data: cur } = await sb.from('prospect_contacts').select('send_failures').eq('id', c.id).single()
      await sb.from('prospect_contacts')
        .update({ send_failures: ((cur as { send_failures: number } | null)?.send_failures ?? 0) + 1 }).eq('id', c.id)
    }
    // SES autorise ~14 envois/s par défaut : on reste très en dessous.
    await new Promise(r => setTimeout(r, 120))
  }
  return { ok: true, sent, failed }
}

export async function getOverview(sb: SupabaseClient): Promise<ProspectionOverview> {
  const settings = await loadSettings(sb)
  const since = new Date(Date.now() - 8 * 86_400_000).toISOString()
  const { data: rows } = await sb.from('prospect_sends')
    .select('id, sent_at, status, error, delivery_status, click_count, open_count, clicked_at, prospect_contacts(email)')
    .gte('sent_at', since).order('sent_at', { ascending: false }).limit(2000)
  const sends = (rows ?? []) as unknown as SendJoin[]

  const today = parisDay(new Date())
  const days: DayPoint[] = []
  for (let i = 6; i >= 0; i--) days.push({ day: parisDay(new Date(Date.now() - i * 86_400_000)), sent: 0, clicks: 0 })
  const byDay = new Map(days.map(d => [d.day, d]))

  const t = { sent: 0, failed: 0, bounced: 0, clicks: 0, opens: 0, unsubscribes: 0 }
  const recent: SendRow[] = []
  for (const r of sends) {
    const d = parisDay(new Date(r.sent_at))
    const pt = byDay.get(d)
    if (pt && r.status === 'sent') { pt.sent++; if (r.click_count > 0) pt.clicks++ }
    if (d !== today) continue
    if (r.status === 'sent') t.sent++; else t.failed++
    if (r.delivery_status === 'bounced' || r.delivery_status === 'complained') t.bounced++
    if (r.click_count > 0) t.clicks++
    if (r.open_count > 0) t.opens++
    if (recent.length < 50) {
      recent.push({
        id: r.id, sent_at: r.sent_at, status: r.status, error: r.error,
        delivery_status: r.delivery_status, click_count: r.click_count, open_count: r.open_count,
        email: emailOf(r.prospect_contacts),
      })
    }
  }

  const { data: unsubs } = await sb.from('prospect_contacts')
    .select('unsubscribed_at').not('unsubscribed_at', 'is', null).gte('unsubscribed_at', since)
  t.unsubscribes = ((unsubs ?? []) as { unsubscribed_at: string }[])
    .filter(u => parisDay(new Date(u.unsubscribed_at)) === today).length

  const [{ count: queue }, { count: total }] = await Promise.all([
    sb.from('prospect_contacts').select('id', { count: 'exact', head: true })
      .eq('status', 'active').is('last_sent_at', null).lt('send_failures', 2),
    sb.from('prospect_contacts').select('id', { count: 'exact', head: true }),
  ])

  return {
    settings,
    ramp: rampInfo(settings.ramp_start, settings.daily_target),
    sesReady: sesConfigured(),
    today: t, queue: queue ?? 0, total: total ?? 0, week: days, recent,
  }
}
