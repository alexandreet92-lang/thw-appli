// POST /api/auth/site-login
// Connexion email + mot de passe DEPUIS LE SITE (compte.html), même origine →
// les cookies de session sont posés directement. Permet une vraie page de
// connexion sur le site (champs email/mot de passe), sans repasser par l'app.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as { email?: string; password?: string }
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
