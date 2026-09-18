// POST /api/tokens/request-link
// Envoie par email un lien sécurisé vers la page d'achat des packs de tokens
// (recharge-tokens.html du SITE À JOUR). On ne redirige jamais directement vers
// le paiement : le lien passe par l'email (preuve de possession de l'adresse)
// avant d'atteindre la page. L'uid est porté dans l'URL → crédit instantané
// (client_reference_id Stripe) au retour de paiement.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const APP_BASE = process.env.APP_BASE_URL ?? 'https://thw-appli.vercel.app'
// Page d'achat des packs de tokens du site à jour. Surchargeable par env.
const TOKENS_URL = process.env.TOKENS_PURCHASE_URL ?? `${APP_BASE}/site/recharge-tokens.html`
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

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[tokens/request-link] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 })
    }
    const resend = new Resend(apiKey)
    const FALLBACK_FROM = 'Hybrid Training <noreply@the-hybridway.com>'
    const envFrom = process.env.RESEND_FROM
    const from = envFrom && !envFrom.includes('lavoiehybride') ? envFrom : FALLBACK_FROM

    // Prénom (best-effort).
    let firstName = 'athlète'
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const fn = (profile?.full_name as string | null)?.trim().split(/\s+/)[0]
      if (fn) firstName = fn
    } catch { /* fallback */ }

    // uid → client_reference_id Stripe (crédit instantané, sans dépendre de
    // l'email de paiement).
    const sep = TOKENS_URL.includes('?') ? '&' : '?'
    const url = `${TOKENS_URL}${sep}uid=${encodeURIComponent(user.id)}`

    const heading = 'Recharger tes tokens'
    const intro = 'Voici ton lien sécurisé pour acheter tes packs de tokens.'
    const cta = 'Choisir mon pack →'
    const accent = '#3B92D4' // design-allow-color (accent Studio, cohérent avec l'app)
    const subject = `${firstName}, ton lien pour recharger tes tokens`

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${heading}</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F8FAFC;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;">
        <tr><td align="center" style="padding:36px 32px 12px;">
          <img src="${LOGO_URL}" alt="THW" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:18px;">
          <div style="font-size:12px;color:#94A3B8;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Hybrid Training</div>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#0F172A;line-height:1.3;text-align:center;">${heading}</h1></td></tr>
        <tr><td style="padding:12px 32px 0;"><p style="margin:0;font-size:15px;color:#334155;line-height:1.6;text-align:center;">Salut <strong style="color:#0F172A;">${firstName}</strong>,<br>${intro} Il est valable 24 heures.</p></td></tr>
        <tr><td align="center" style="padding:28px 32px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="border-radius:12px;background-color:${accent};">
              <a href="${url}" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">${cta}</a>
            </td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 6px;"><p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Tes tokens sont crédités automatiquement sur ton compte après paiement. Les tokens de packs n'expirent pas.</p></td></tr>
        <tr><td align="center" style="padding:8px 32px 32px;"><p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">🔒 Lien envoyé uniquement à ton adresse enregistrée<br>Si tu n'as pas fait cette demande, ignore cet email.</p></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;"><p style="margin:0;font-size:11px;color:#94A3B8;">© ${new Date().getFullYear()} THW · Hybrid Training</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const { error: mailErr } = await resend.emails.send({ from, to: email, subject, html })
    if (mailErr) {
      console.error('[tokens/request-link] resend error:', mailErr)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[tokens/request-link] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
