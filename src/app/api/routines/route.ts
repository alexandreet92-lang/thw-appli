// ══════════════════════════════════════════════════════════════
// GET  /api/routines        → liste des routines de l'utilisateur
// POST /api/routines        → crée une routine (limite par abonnement)
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/lib/subscriptions/tier-limits'

const FREQ = new Set(['daily', 'weekdays', 'weekends', 'weekly'])
const MODELS = new Set(['hermes', 'athena', 'zeus'])

export async function GET() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data } = await sb.from('routines')
      .select('id,name,prompt,frequency,hour,weekday,timezone,model,allow_write,enabled,last_run_at,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    return NextResponse.json({ routines: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const b = await req.json().catch(() => null) as Record<string, unknown> | null
    const name = typeof b?.name === 'string' ? b.name.trim() : ''
    const prompt = typeof b?.prompt === 'string' ? b.prompt.trim() : ''
    if (!name || !prompt) return NextResponse.json({ error: 'Nom et description requis' }, { status: 400 })

    // Limite par abonnement.
    const { data: sub } = await sb.from('user_subscriptions').select('tier').eq('user_id', user.id).maybeSingle()
    const tier = ((sub as { tier?: string } | null)?.tier ?? 'premium') as keyof typeof TIER_LIMITS
    const max = TIER_LIMITS[tier]?.routines_max ?? TIER_LIMITS.premium.routines_max
    const { count } = await sb.from('routines').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((count ?? 0) >= max) {
      return NextResponse.json({ error: `Ton abonnement autorise ${max} routine${max > 1 ? 's' : ''}. Passe à un plan supérieur pour en créer davantage.`, limitReached: true }, { status: 403 })
    }

    const frequency = FREQ.has(b?.frequency as string) ? (b!.frequency as string) : 'daily'
    const hour = Math.max(0, Math.min(23, Number(b?.hour) || 7))
    const weekday = b?.weekday == null ? null : Math.max(0, Math.min(6, Number(b.weekday)))
    const model = MODELS.has(b?.model as string) ? (b!.model as string) : 'athena'
    const allowWrite = b?.allow_write === true
    const timezone = typeof b?.timezone === 'string' && b.timezone ? b.timezone : 'Europe/Paris'

    const { data, error } = await sb.from('routines').insert({
      user_id: user.id, name, prompt, frequency, hour, weekday, model, allow_write: allowWrite, timezone,
    }).select('id,name,prompt,frequency,hour,weekday,timezone,model,allow_write,enabled,last_run_at,created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ routine: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
