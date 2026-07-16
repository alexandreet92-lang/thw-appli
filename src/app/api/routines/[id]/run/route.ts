// ══════════════════════════════════════════════════════════════
// POST /api/routines/:id/run  → « Exécuter maintenant » : lance la routine
// tout de suite (coach headless), enregistre l'exécution et notifie.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeRoutine, type RoutineRow } from '@/lib/routines/execute'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: routine } = await sb.from('routines')
      .select('id,user_id,name,prompt,model,allow_write')
      .eq('user_id', user.id).eq('id', id).maybeSingle()
    if (!routine) return NextResponse.json({ error: 'Routine introuvable' }, { status: 404 })

    const result = await executeRoutine(sb, routine as RoutineRow)
    return NextResponse.json({ ok: result.ok, runId: result.runId, error: result.error })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
