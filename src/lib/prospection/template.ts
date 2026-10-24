import { LOGO_URL, TRACK_BASE, INSTAGRAM_URL, INSTAGRAM_ICON, HERO_GIF } from './config'
import type { ProspectContact, ProspectSettings } from './types'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function clickUrl(c: ProspectContact): string { return `${TRACK_BASE}/api/p/c/${c.token}` }
export function unsubscribeUrl(c: ProspectContact): string { return `${TRACK_BASE}/api/p/u/${c.token}` }
export function pixelUrl(c: ProspectContact): string { return `${TRACK_BASE}/api/p/o/${c.token}` }

export interface RenderedEmail { subject: string; text: string; html: string; unsubscribeUrl: string }

/**
 * Variables : {prenom}, {lien} (lien suivi vers le site), {desinscription}.
 * L'adresse postale de l'expéditeur est ajoutée en pied (obligation d'identification).
 */
export function renderEmail(s: ProspectSettings, c: ProspectContact): RenderedEmail {
  const name = c.first_name?.trim() || ''
  const link = clickUrl(c)
  const unsub = unsubscribeUrl(c)
  const unsubLine = `Pour ne plus recevoir ces messages : ${unsub}`
  const footer = s.postal_address.trim() ? `\n\n${s.postal_address.trim()}` : ''

  const fill = (tpl: string, mode: 'text' | 'html'): string => {
    const greeted = name ? tpl : tpl.replace(/^\s*\{prenom\}\s*,\s*/, '').replace(/\{prenom\}/g, '').replace(/Bonjour\s*,/, 'Bonjour,')
    return greeted
      .replace(/\{prenom\}/g, mode === 'html' ? esc(name) : name)
      .replace(/\{lien\}/g, mode === 'html' ? `<a href="${link}" style="color:#0b6fa8;font-weight:600">the-hybridway.com/test-de-forme</a>` : link)
      .replace(/\{desinscription\}/g, mode === 'html' ? `<a href="${unsub}" style="font-size:12px;color:#6b7480">Se désinscrire</a>` : unsubLine)
  }

  const text = fill(s.body, 'text') + `\n\nInstagram : ${INSTAGRAM_URL}` + footer
  const htmlBody = fill(esc(s.body), 'html').split('\n').join('<br>')
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px">
<tr><td style="padding:28px 32px 8px"><img src="${LOGO_URL}" width="56" height="56" alt="THW" style="display:block;border:0;width:56px;height:56px"></td></tr>
${HERO_GIF ? `<tr><td style="padding:8px 32px 0"><a href="${link}"><img src="${HERO_GIF}" width="496" alt="Aperçu de l’application THW" style="display:block;border:0;width:100%;max-width:496px;height:auto;border-radius:8px"></a></td></tr>` : ''}
<tr><td style="padding:8px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111111">${htmlBody}</td></tr>
<tr><td style="padding:8px 32px 20px"><a href="${link}" style="display:inline-block;background:#0b6fa8;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px">Faire le test</a></td></tr>
<tr><td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7480"><a href="${INSTAGRAM_URL}" style="color:#6b7480;text-decoration:none"><img src="${INSTAGRAM_ICON}" width="20" height="20" alt="Instagram" style="vertical-align:middle;border:0;margin-right:6px">@thwthehybridway</a>${
    footer ? `<br><br>${esc(footer.trim())}` : ''
  }</td></tr>
</table></td></tr></table>
<img src="${pixelUrl(c)}" width="1" height="1" alt="" style="display:none">
</body></html>`
  return { subject: s.subject.replace(/\{prenom\}/g, name), text, html, unsubscribeUrl: unsub }
}
