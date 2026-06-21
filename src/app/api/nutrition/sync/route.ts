// ══════════════════════════════════════════════════════════════
// API — /api/nutrition/sync
// Recalcule (et notifie) le plan nutrition d'un ou plusieurs jours après
// un changement de séance. Appelé en best-effort depuis le planning.
// Body : { week_start: 'YYYY-MM-DD', day_indexes: number[] }
// ══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncNutritionForDate } from '@/lib/nutrition/adapt'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const weekStart = typeof body?.week_start === 'string' ? body.week_start : null
    const dayIndexesRaw = Array.isArray(body?.day_indexes) ? body.day_indexes : []
    const dayIndexes = [...new Set(dayIndexesRaw)]
      .filter((d: unknown): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    if (!weekStart || dayIndexes.length === 0) {
      return NextResponse.json({ error: 'week_start et day_indexes requis' }, { status: 400 })
    }

    let changed = 0
    for (const di of dayIndexes) {
      const res = await syncNutritionForDate(supabase, user.id, weekStart, di)
      if (res.changed) changed++
    }
    return NextResponse.json({ ok: true, changed })
  } catch (e) {
    console.error('[api/nutrition/sync] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
