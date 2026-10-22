import { TRACK_BASE } from './config'
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
    const greeted = name ? tpl : tpl.replace(/\{prenom\}/g, '').replace(/Bonjour\s*,/, 'Bonjour,')
    return greeted
      .replace(/\{prenom\}/g, mode === 'html' ? esc(name) : name)
      .replace(/\{lien\}/g, mode === 'html' ? `<a href="${link}">${esc(link)}</a>` : link)
      .replace(/\{desinscription\}/g, mode === 'html' ? `<a href="${unsub}">Se désinscrire</a>` : unsubLine)
  }

  const text = fill(s.body, 'text') + footer
  const htmlBody = fill(esc(s.body).replace(/\{lien\}/g, '{lien}'), 'html')
    .split('\n').join('<br>')
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111">${htmlBody}${
    footer ? `<br><br><span style="font-size:12px;color:#555">${esc(footer.trim())}</span>` : ''
  }<img src="${pixelUrl(c)}" width="1" height="1" alt="" style="display:none"></div>`
  return { subject: s.subject.replace(/\{prenom\}/g, name), text, html, unsubscribeUrl: unsub }
}
