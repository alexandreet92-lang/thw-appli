// POST /api/auth/site-session
// Auto-connexion du SITE depuis l'app : l'app transmet ses jetons de session
// (access + refresh) ; on établit la session côté site (pose les cookies) pour
// que l'utilisateur soit connecté automatiquement, sans retaper son mot de passe.
// Même origine → les cookies posés ici sont utilisés par /api/account/summary etc.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json() as {
      access_token?: string; refresh_token?: string
    }
    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Jetons manquants' }, { status: 400 })
    }
    const supabase = await createClient()
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
