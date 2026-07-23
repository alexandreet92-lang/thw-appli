// ══════════════════════════════════════════════════════════════
// GET /api/studio/access
// Accès + solde Studio de l'utilisateur : tier autorisé (Pro/Expert),
// quota mensuel inclus, tokens de packs, disponibilité des packs.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStudioAccess } from '@/lib/tokens/studio'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const access = await getStudioAccess(user.id)
    return NextResponse.json(access)
  } catch (e) {
    console.error('[studio/access] error:', e)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
