// POST /api/subscription/request-link
// Envoie par email un lien sécurisé pour CHANGER ou RÉSILIER l'abonnement.
// On ne redirige jamais directement vers une page de paiement : le lien passe
// par l'email (preuve de possession de l'adresse) avant d'atteindre la page.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const APP_BASE = process.env.APP_BASE_URL ?? 'https://thw-appli.vercel.app'
// Destinations (surchargables par variables d'env quand les pages du site sont prêtes).
const CHANGE_URL = process.env.SUBSCRIPTION_CHANGE_URL ?? `${APP_BASE}/decouvrir/abonnement.html`
const CANCEL_URL = process.env.SUBSCRIPTION_CANCEL_URL ?? `${APP_BASE}/decouvrir/cgu.html#resiliation`
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? 'https://thw-appli.vercel.app/branding/logo-thw-light.png'

type Action = 'change' | 'cancel'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, action } = await req.json() as { email?: string; action?: Action }
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    if (action !== 'change' && action !== 'cancel') {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }
    if (email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'Email non autorisé' }, { status: 403 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[subscription/request-link] RESEND_API_KEY manquant')
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

    const isCancel = action === 'cancel'
    const url = isCancel ? CANCEL_URL : CHANGE_URL
    const heading = isCancel ? 'Résilier ton abonnement' : "Changer d'abonnement"
    const intro = isCancel
      ? 'Voici ton lien sécurisé pour gérer la résiliation de ton abonnement.'
      : 'Voici ton lien sécurisé pour changer de formule.'
    const cta = isCancel ? 'Gérer la résiliation →' : 'Choisir ma formule →'
    const accent = isCancel ? '#ef4444' : '#06B6D4'
    const subject = isCancel
      ? `${firstName}, ton lien de résiliation est prêt`
      : `${firstName}, ton lien pour changer d'abonnement`

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
        <tr><td align="center" style="padding:8px 32px 32px;"><p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">🔒 Lien envoyé uniquement à ton adresse enregistrée<br>Si tu n'as pas fait cette demande, ignore cet email.</p></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;"><p style="margin:0;font-size:11px;color:#94A3B8;">© ${new Date().getFullYear()} THW · Hybrid Training</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const { error: mailErr } = await resend.emails.send({ from, to: email, subject, html })
    if (mailErr) {
      console.error('[subscription/request-link] resend error:', mailErr)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[subscription/request-link] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
