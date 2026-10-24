import 'server-only'

// Envoi via Brevo (API transactionnelle v3). Variable d'environnement (Vercel) :
//   BREVO_API_KEY — clé d'API Brevo (SMTP & API > Clés API).
// L'adresse expéditeur doit être un expéditeur validé dans Brevo (domaine authentifié par DKIM).

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export function mailConfigured(): boolean {
  return !!process.env.BREVO_API_KEY
}

export interface OutgoingEmail {
  to: string
  fromName: string
  fromEmail: string
  subject: string
  text: string
  html: string
  unsubscribeUrl: string
}

export async function sendProspectEmail(m: OutgoingEmail): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY ?? '', 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: m.fromName, email: m.fromEmail },
      to: [{ email: m.to }],
      subject: m.subject,
      htmlContent: m.html,
      textContent: m.text,
      headers: {
        'List-Unsubscribe': `<${m.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`Brevo ${res.status} : ${raw.slice(0, 600)}`)
  try { return (JSON.parse(raw) as { messageId?: string }).messageId ?? '' } catch { return '' }
}
