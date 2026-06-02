// POST /api/topup/verify-session — valide un token de session topup (page /topup)
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserTokenLimits } from '@/lib/tokens/limits'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { session_token } = await req.json() as { session_token?: string }
    if (!session_token) return NextResponse.json({ error: 'Token requis' }, { status: 400 })

    const sb = createServiceClient()
    const { data: session } = await sb
      .from('topup_sessions')
      .select('*')
      .eq('session_token', session_token)
      .maybeSingle()

    if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 404 })
    if (new Date(session.expires_at) < new Date()) return NextResponse.json({ error: 'Session expirée' }, { status: 410 })
    if (session.used_at) return NextResponse.json({ error: 'Session déjà utilisée' }, { status: 410 })

    const limits = await getUserTokenLimits(session.user_id)

    return NextResponse.json({
      user_id: session.user_id,
      email: session.email,
      plan: limits.plan,
      monthly: limits.monthly,
      rolling_6h: limits.rolling_6h,
      bonus_tokens: limits.bonus_tokens,
    })
  } catch (e) {
    console.error('[topup/verify-session] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
