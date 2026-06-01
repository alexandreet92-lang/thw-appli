// GET /api/tokens/limits — jauges de tokens de l'utilisateur connecté
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTokenLimits } from '@/lib/tokens/limits'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limits = await getUserTokenLimits(user.id)
    return NextResponse.json(limits)
  } catch (e) {
    console.error('[api/tokens/limits] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
