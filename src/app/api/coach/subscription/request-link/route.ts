// POST /api/coach/subscription/request-link
// Envoie par email le lien de paiement Stripe (Payment Link) d'un pack coach.
// Comme pour l'abonnement athlète : on ne redirige jamais directement vers le
// paiement, on passe par l'email (preuve de possession de l'adresse) avant que
// le coach n'atteigne la page de paiement Stripe. Le lien porte déjà l'identité
// du coach (client_reference_id) pour que le webhook le rattache à son compte.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { getCoachPack, buildCoachPackCheckoutUrl, type CoachPackKey } from '@/lib/subscriptions/coach-packs'

export const dynamic = 'force-dynamic'

const LOGO_URL = process.env.EMAIL_LOGO_URL ?? 'https://thw-appli.vercel.app/branding/logo-thw-light.png'

type Period = 'monthly' | 'yearly'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, coachPack, billingPeriod } = await req.json() as {
      email?: string; coachPack?: string; billingPeriod?: Period
    }
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    if (email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'Email non autorisé' }, { status: 403 })
    }
    const period: Period = billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    const pack = getCoachPack(coachPack)
    if (!pack) return NextResponse.json({ error: 'Pack coach invalide' }, { status: 400 })

    const url = buildCoachPackCheckoutUrl(pack.key as CoachPackKey, period, user.id, user.email)
    if (!url) return NextResponse.json({ error: 'Lien de paiement indisponible' }, { status: 500 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[coach/subscription/request-link] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 })
    }
    const resend = new Resend(apiKey)
    const FALLBACK_FROM = 'Hybrid Training <noreply@the-hybridway.com>'
    const envFrom = process.env.RESEND_FROM
    const from = envFrom && !envFrom.includes('lavoiehybride') ? envFrom : FALLBACK_FROM

    // Prénom (best-effort).
    let firstName = 'coach'
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const fn = (profile?.full_name as string | null)?.trim().split(/\s+/)[0]
      if (fn) firstName = fn
    } catch { /* fallback */ }

    const price = period === 'yearly' ? pack.yearlyEur : pack.monthlyEur
    const per = period === 'yearly' ? 'an' : 'mois'
    const subject = `${firstName}, ton lien pour l'abonnement coach ${pack.name} est prêt`

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Abonnement coach ${pack.name}</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F8FAFC;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;">
        <tr><td align="center" style="padding:36px 32px 12px;">
          <img src="${LOGO_URL}" alt="THW" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:18px;">
          <div style="font-size:12px;color:#94A3B8;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Hybrid Training</div>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#0F172A;line-height:1.3;text-align:center;">Abonnement coach ${pack.name}</h1></td></tr>
        <tr><td style="padding:12px 32px 0;"><p style="margin:0;font-size:15px;color:#334155;line-height:1.6;text-align:center;">Salut <strong style="color:#0F172A;">${firstName}</strong>,<br>Voici ton lien sécurisé pour activer le pack <strong style="color:#0F172A;">${pack.name}</strong> (${pack.label.toLowerCase()}). Il est valable 24 heures.</p></td></tr>
        <tr><td align="center" style="padding:18px 32px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F8FAFC;border-radius:14px;"><tr><td align="center" style="padding:18px;">
            <div style="font-size:30px;font-weight:700;color:#0F172A;line-height:1;">${price} €<span style="font-size:14px;font-weight:500;color:#64748B;"> / ${per}</span></div>
            <div style="font-size:12.5px;color:#64748B;margin-top:6px;">Compte Premium inclus · toutes les fonctions coach · 1 M tokens Studio / mois</div>
          </td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="border-radius:12px;background-color:#06B6D4;">
              <a href="${url}" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Activer mon abonnement →</a>
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
      console.error('[coach/subscription/request-link] resend error:', mailErr)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[coach/subscription/request-link] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
