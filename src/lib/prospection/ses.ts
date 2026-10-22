import 'server-only'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

// Envoi via Amazon SES. Variables d'environnement (Vercel) :
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (ex. eu-west-3),
//   AWS_SES_CONFIGURATION_SET (optionnel : publie rebonds / plaintes vers SNS).

let client: SESv2Client | null = null

export function sesConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION)
}

function getClient(): SESv2Client {
  if (!client) client = new SESv2Client({ region: process.env.AWS_REGION })
  return client
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
  const out = await getClient().send(new SendEmailCommand({
    FromEmailAddress: `${m.fromName} <${m.fromEmail}>`,
    Destination: { ToAddresses: [m.to] },
    ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET || undefined,
    Content: {
      Simple: {
        Subject: { Data: m.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: m.text, Charset: 'UTF-8' },
          Html: { Data: m.html, Charset: 'UTF-8' },
        },
        Headers: [
          { Name: 'List-Unsubscribe', Value: `<${m.unsubscribeUrl}>` },
          { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
        ],
      },
    },
  }))
  return out.MessageId ?? ''
}
