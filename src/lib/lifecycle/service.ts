import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendProspectEmail, mailConfigured } from '@/lib/prospection/mailer'
import { loadSettings } from '@/lib/prospection/service'
import { TRACK_BASE, LOGO_URL, INSTAGRAM_URL, INSTAGRAM_ICON } from '@/lib/prospection/config'
import { STEPS, copyFor } from './content'

function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
const secret = (): string => process.env.CRON_SECRET ?? ''

/** Jeton de désinscription : identifiant + signature HMAC (rien à stocker). */
export function unsubToken(userId: string): string {
  return `${userId}.${createHmac('sha256', secret()).update(userId).digest('hex').slice(0, 32)}`
}
export function verifyUnsubToken(token: string): string | null {
  const [id, sig] = token.split('.')
  if (!id || !sig || !secret()) return null
  const good = createHmac('sha256', secret()).update(id).digest('hex').slice(0, 32)
  const a = Buffer.from(sig), b = Buffer.from(good)
  return a.length === b.length && timingSafeEqual(a, b) ? id : null
}

interface Candidate { user_id: string; email: string; first_name: string | null; lang: string; created_at: string; sent_steps: string[] }

export async function runLifecycle(sb: SupabaseClient): Promise<{ ok: boolean; sent: number; failed: number; skipped?: string }> {
  if (!mailConfigured()) return { ok: false, sent: 0, failed: 0, skipped: 'envoi non configuré (clé Brevo)' }
  if (!secret()) return { ok: false, sent: 0, failed: 0, skipped: 'CRON_SECRET manquant' }
  const s = await loadSettings(sb)
  if (!s.from_email.trim()) return { ok: false, sent: 0, failed: 0, skipped: 'adresse expéditeur manquante' }
  const { data, error } = await sb.rpc('lifecycle_candidates')
  if (error) throw new Error(error.message)
  let sent = 0, failed = 0
  for (const c of (data ?? []) as Candidate[]) {
    const ageDays = (Date.now() - new Date(c.created_at).getTime()) / 86_400_000
    // Une seule étape par passage et par personne : la première due et pas encore envoyée.
    const step = STEPS.find(st => ageDays >= st.afterDays && !c.sent_steps.includes(st.id))
    if (!step) continue
    const copy = copyFor(c.lang, step.id)
    const link = `${TRACK_BASE}${step.path}?utm_source=email&utm_medium=lifecycle&utm_campaign=${step.id}`
    const unsub = `${TRACK_BASE}/api/lifecycle/unsubscribe/${unsubToken(c.user_id)}`
    const name = (c.first_name ?? '').trim()
    const addr = s.postal_address.trim()
    const text = [copy.hello(name), '', ...copy.body, '', `${copy.cta} : ${link}`, '', `Instagram : ${INSTAGRAM_URL}`, `${copy.unsub} : ${unsub}`, addr].filter(x => x !== undefined).join('\n')
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px">
<tr><td style="padding:28px 32px 8px"><img src="${LOGO_URL}" width="56" height="56" alt="THW" style="display:block;border:0"></td></tr>
<tr><td style="padding:8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111111"><p style="margin:0 0 12px">${esc(copy.hello(name))}</p>${copy.body.map(p => `<p style="margin:0 0 12px">${esc(p)}</p>`).join('')}</td></tr>
<tr><td style="padding:8px 32px 20px"><a href="${link}" style="display:inline-block;background:#0b6fa8;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px">${esc(copy.cta)}</a></td></tr>
<tr><td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7480"><a href="${INSTAGRAM_URL}" style="color:#6b7480;text-decoration:none"><img src="${INSTAGRAM_ICON}" width="20" height="20" alt="Instagram" style="vertical-align:middle;border:0;margin-right:6px">@thwthehybridway</a><br><br><a href="${unsub}" style="color:#6b7480">${esc(copy.unsub)}</a>${addr ? `<br>${esc(addr)}` : ''}</td></tr>
</table></td></tr></table></body></html>`
    try {
      await sendProspectEmail({ to: c.email, fromName: s.from_name, fromEmail: s.from_email, subject: copy.subject, text, html, unsubscribeUrl: unsub })
      await sb.from('lifecycle_sends').upsert({ user_id: c.user_id, step: step.id })
      sent++
    } catch (e) {
      console.error('[lifecycle] envoi échoué', c.user_id, step.id, e)
      failed++
    }
  }
  return { ok: true, sent, failed }
}
