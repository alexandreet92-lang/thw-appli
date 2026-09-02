// GET /api/auth/signout
// Déconnexion depuis le SITE (compte.html) : on invalide la session Supabase
// (les cookies sont effacés via l'adaptateur serveur), puis on renvoie sur
// l'espace compte — qui, sans session, redirige vers la page de connexion.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch { /* on redirige quand même */ }
  const base = new URL(req.url).origin
  return NextResponse.redirect(`${base}/site/compte.html`, { status: 303 })
}
