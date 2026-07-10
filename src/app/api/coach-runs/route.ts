// ══════════════════════════════════════════════════════════════
// GET /api/coach-runs?conv_id=…
// Phase 1 — génération en arrière-plan : renvoie la DERNIÈRE réponse
// du coach enregistrée côté serveur pour une conversation. Sert à
// RETROUVER une réponse terminée pendant que l'app était fermée.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const convId = req.nextUrl.searchParams.get('conv_id')
    if (!convId) return NextResponse.json({ run: null })

    const { data, error } = await sb.from('coach_runs')
      .select('id,status,content,created_at')
      .eq('user_id', user.id)
      .eq('conv_id', convId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return NextResponse.json({ run: null })

    return NextResponse.json({ run: data ?? null })
  } catch {
    return NextResponse.json({ run: null })
  }
}
