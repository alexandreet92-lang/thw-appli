// POST /api/topup/request-link — envoie par email un lien sécurisé vers /topup
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserTokenLimits } from '@/lib/tokens/limits'
import { isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { Resend } from 'resend'
import crypto from 'crypto'
import { currentLocale } from '@/lib/i18n/locale'

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

    // ── Données personnalisées (best-effort) ──
    let firstName = 'athlète'
    let planLabel = 'Premium'
    let formattedRemaining = '0'
    try {
      const { data: profile } = await sb
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      const fn = (profile?.full_name as string | null)?.trim().split(/\s+/)[0]
      if (fn) firstName = fn

      const limits = await getUserTokenLimits(user.id)
      const unlimited = await isCreatorAccount(user.id)
      const planName = unlimited ? 'creator' : limits.plan
      const PLAN_LABELS: Record<string, string> = {
        trial: 'Essai gratuit', premium: 'Premium', pro: 'Pro',
        expert: 'Expert', creator: 'Créateur', unlimited: 'Créateur',
      }
      planLabel = PLAN_LABELS[planName] ?? 'Premium'

      const monthlyRemaining = Math.max(0, limits.monthly.limit - limits.monthly.used)
      const totalAvailable = monthlyRemaining + limits.bonus_tokens
      formattedRemaining = totalAvailable.toLocaleString(currentLocale())
    } catch (e) {
      console.error('[topup/request-link] perso data error (fallback):', e)
    }

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

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ton lien d'achat de tokens</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F8FAFC;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden;">

          <tr>
            <td align="center" style="padding: 36px 32px 20px;">
              <img src="${LOGO_URL}" alt="THW Coaching" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 18px;">
              <div style="font-size: 12px; color: #94A3B8; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Hybrid Training</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 8px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1.3; text-align: center;">Voici ton lien d'achat</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 12px 32px 0;">
              <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.6; text-align: center;">
                Salut <strong style="color: #0F172A;">${firstName}</strong>,<br>
                Ton lien sécurisé est prêt. Il est valide pendant 24 heures.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 32px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F1F5F9; border-radius: 12px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr><td style="font-size: 11px; color: #94A3B8; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; padding-bottom: 4px;">Ton plan actuel</td></tr>
                      <tr><td style="font-size: 16px; font-weight: 600; color: #0F172A; padding-bottom: 14px;">${planLabel}</td></tr>
                      <tr><td style="font-size: 11px; color: #94A3B8; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; padding-bottom: 4px;">Solde disponible</td></tr>
                      <tr><td style="font-size: 22px; font-weight: 700; color: #06B6D4;">${formattedRemaining} <span style="font-size: 14px; color: #475569; font-weight: 500;">tokens</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 32px 32px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius: 12px; background-color: #06B6D4;">
                    <a href="${topupUrl}" style="display: inline-block; padding: 16px 40px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 12px;">Choisir mon pack &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 8px 32px 32px;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">🔒 Paiement sécurisé via Stripe<br>Lien valide pendant 24 heures</p>
            </td>
          </tr>

          <tr><td style="padding: 0 32px;"><div style="height: 1px; background-color: #E2E8F0;"></div></td></tr>

          <tr>
            <td style="padding: 28px 32px 8px;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; padding-bottom: 12px;">Pourquoi des tokens ?</p>
              <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.65;">Les tokens permettent à ton coach IA de répondre, analyser tes données et générer tes plans. Chaque interaction en consomme — plus le modèle est puissant, plus l'usage est rapide.</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 32px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="https://thw-appli.vercel.app" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #475569; text-decoration: none;">Retour à l'app</a>
                    <span style="color: #CBD5E1;">·</span>
                    <a href="mailto:support@the-hybridway.com" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #475569; text-decoration: none;">Support</a>
                    <span style="color: #CBD5E1;">·</span>
                    <a href="https://thw-appli.vercel.app/legal" style="display: inline-block; margin: 0 8px; font-size: 12px; color: #475569; text-decoration: none;">Mentions légales</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 1.5;">Si tu n'as pas demandé ce lien, ignore cet email.<br>© ${new Date().getFullYear()} THW Coaching · Hybrid Training</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { error: mailErr } = await resend.emails.send({
      from,
      to: email,
      subject: `${firstName}, ton lien d'achat de tokens est prêt`,
      html: htmlContent,
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
