// ══════════════════════════════════════════════════════════════
// PATCH  /api/routines/:id   → modifie une routine (nom, prompt, planning,
//                              modèle, écriture, pause)
// DELETE /api/routines/:id   → supprime la routine (et son historique)
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FREQ = new Set(['daily', 'weekdays', 'weekends', 'weekly'])
const MODELS = new Set(['hermes', 'athena', 'zeus'])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const b = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!b) return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim()
    if (typeof b.prompt === 'string' && b.prompt.trim()) patch.prompt = b.prompt.trim()
    if (FREQ.has(b.frequency as string)) patch.frequency = b.frequency
    if (b.hour != null) patch.hour = Math.max(0, Math.min(23, Number(b.hour) || 7))
    if ('weekday' in b) patch.weekday = b.weekday == null ? null : Math.max(0, Math.min(6, Number(b.weekday)))
    if (MODELS.has(b.model as string)) patch.model = b.model
    if (typeof b.allow_write === 'boolean') patch.allow_write = b.allow_write
    if (typeof b.enabled === 'boolean') patch.enabled = b.enabled

    const { data, error } = await sb.from('routines')
      .update(patch).eq('user_id', user.id).eq('id', id)
      .select('id,name,prompt,frequency,hour,weekday,timezone,model,allow_write,enabled,last_run_at,created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ routine: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    await sb.from('routines').delete().eq('user_id', user.id).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
