import 'server-only'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

// Envoi via Amazon SES. Variables d'environnement (Vercel) :
//   THW_AWS_ACCESS_KEY_ID, THW_AWS_SECRET_ACCESS_KEY, THW_AWS_REGION (ex. eu-west-3),
//   AWS_SES_CONFIGURATION_SET (optionnel : publie rebonds / plaintes vers SNS).
// Vercel réserve les noms AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION : on lit d'abord
// les noms THW_AWS_*, puis les noms standards en repli.

let client: SESv2Client | null = null

function cfg() {
  return {
    accessKeyId: process.env.THW_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.THW_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.THW_AWS_REGION || process.env.AWS_REGION || '',
  }
}

export function sesConfigured(): boolean {
  const c = cfg()
  return !!(c.accessKeyId && c.secretAccessKey && c.region)
}

function getClient(): SESv2Client {
  if (!client) {
    const c = cfg()
    client = new SESv2Client({ region: c.region, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } })
  }
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
