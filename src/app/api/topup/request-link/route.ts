// POST /api/topup/request-link — envoie par email un lien sécurisé vers /topup
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const TOPUP_BASE_URL = process.env.TOPUP_BASE_URL ?? 'https://thwcoaching.com/topup'
// Logo email — URL absolue (les clients mail exigent une URL publique).
// Variante "light" (cyan foncé) pour fond clair du mail.
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? 'https://thw-appli.vercel.app/branding/logo-thw-light.png'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await req.json() as { email?: string }
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    if (email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'Email non autorisé' }, { status: 403 })
    }

    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const sb = createServiceClient()
    const { error: insertErr } = await sb.from('topup_sessions').insert({
      user_id: user.id,
      session_token: sessionToken,
      email,
      expires_at: expiresAt.toISOString(),
    })
    if (insertErr) {
      console.error('[topup/request-link] insert error:', insertErr)
      return NextResponse.json({ error: 'Erreur création session' }, { status: 500 })
    }

    const topupUrl = `${TOPUP_BASE_URL}?session=${sessionToken}`

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[topup/request-link] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 })
    }
    const resend = new Resend(apiKey)
    // Domaine vérifié = the-hybridway.com. On ignore tout RESEND_FROM résiduel
    // pointant vers le domaine NON vérifié (lavoiehybride.com), même si l'env
    // Vercel n'a pas encore été corrigée → garantit l'absence d'erreur 403.
    const FALLBACK_FROM = 'Hybrid Training <noreply@the-hybridway.com>'
    const envFrom = process.env.RESEND_FROM
    const from = envFrom && !envFrom.includes('lavoiehybride') ? envFrom : FALLBACK_FROM

    const { error: mailErr } = await resend.emails.send({
      from,
      to: email,
      subject: 'Ton lien pour acheter des tokens',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0F172A;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${LOGO_URL}" alt="THW" width="80" height="80" style="display: inline-block; width: 80px; height: 80px; border-radius: 18px;" />
          </div>
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px; text-align: center;">Achète tes tokens</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; text-align: center; margin: 0 0 24px;">
            Clique sur le bouton ci-dessous pour accéder à la page d'achat sécurisée. Le lien est valide pendant 24 heures.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${topupUrl}" style="display: inline-block; background: #06B6D4; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 500; font-size: 14px;">
              Acheter des tokens
            </a>
          </div>
          <p style="font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5; margin-top: 32px;">
            Ce lien expire dans 24 heures.<br>
            Si tu n'as pas demandé ce lien, ignore cet email.
          </p>
        </div>
      `,
    })
    if (mailErr) {
      console.error('[topup/request-link] resend error:', mailErr)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[topup/request-link] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
