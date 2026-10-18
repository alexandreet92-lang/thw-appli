// POST /api/auth/site-password  { password }
// Changement de mot de passe DEPUIS LE SITE (bulle de compte), pour une
// personne déjà connectée (cookies de session, même origine). Minimum aligné
// sur l'inscription de l'app (8 caractères).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PW_MIN = 8

export async function POST(req: Request) {
  try {
    const { password } = await req.json() as { password?: string }
    if (!password || password.length < PW_MIN) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: 'Impossible de changer le mot de passe. Réessaie.' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
