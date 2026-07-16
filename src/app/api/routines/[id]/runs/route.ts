// ══════════════════════════════════════════════════════════════
// GET /api/routines/:id/runs  → historique des exécutions d'une routine
// (chaque exécution : date, statut, sortie complète du coach).
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data } = await sb.from('routine_runs')
      .select('id,status,output,error,created_at')
      .eq('user_id', user.id).eq('routine_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ runs: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
