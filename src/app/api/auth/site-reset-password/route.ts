// POST /api/auth/site-reset-password  { email }
// « Mot de passe oublié » DEPUIS LE SITE : envoie le même e-mail de
// réinitialisation que l'app (lien → /auth/callback → /auth/reset-password).
// On répond TOUJOURS « envoyé » (sauf e-mail invalide) : ne pas révéler si une
// adresse a un compte (énumération de comptes).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authRedirectBase } from '@/lib/auth/redirect'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const { email } = await req.json() as { email?: string }
    const mail = (email ?? '').trim()
    if (!EMAIL_RE.test(mail)) {
      return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })
    }
    const supabase = await createClient()
    // Même URL de retour que l'app : elle figure déjà dans l'allowlist Supabase.
    const redirectTo = `${authRedirectBase()}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`
    await supabase.auth.resetPasswordForEmail(mail, { redirectTo })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
