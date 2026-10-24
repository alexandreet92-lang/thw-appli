// ══════════════════════════════════════════════════════════════
// GET /api/account/overview
// Compléments de la page « Mon compte » du site : date d'inscription, photo de
// profil et consommation de tokens (chat + Studio) mois par mois sur 12 mois.
// Lecture seule, scoping strict sur l'utilisateur connecté.
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface UsageRow { tokens_used: number | null; created_at: string }
interface ActRow { id: string; sport_type: string | null; title: string | null; started_at: string; distance_m: number | null; moving_time_s: number | null }
interface ActRow { id: string; sport_type: string | null; title: string | null; started_at: string; distance_m: number | null; moving_time_s: number | null }

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ loggedIn: false })

  try {
    const sb = createServiceClient()
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
    const months: string[] = []
    for (let i = 0; i < 12; i++) months.push(monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))))
    const chat: Record<string, number> = {}
    const studio: Record<string, number> = {}
    for (const m of months) { chat[m] = 0; studio[m] = 0 }

    const since30 = new Date(now.getTime() - 30 * 86400000).toISOString()
    const since7 = now.getTime() - 7 * 86400000
    const [{ data: prof }, { data: chatRows }, { data: studioRows }, { data: actRows }] = await Promise.all([
      sb.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle(),
      sb.from('token_usage').select('tokens_used, created_at').eq('user_id', user.id).gte('created_at', start.toISOString()).limit(50000),
      sb.from('studio_usage').select('tokens_used, created_at').eq('user_id', user.id).gte('created_at', start.toISOString()).limit(50000),
      sb.from('activities').select('id, sport_type, title, started_at, distance_m, moving_time_s')
        .eq('user_id', user.id).eq('flagged', false).gte('started_at', since30)
        .order('started_at', { ascending: false }).limit(500),
    ])
    const acts = (actRows ?? []) as ActRow[]
    const week = acts.filter(a => new Date(a.started_at).getTime() >= since7)
    const sum = (rows: ActRow[], k: 'distance_m' | 'moving_time_s') => rows.reduce((t, a) => t + (a[k] ?? 0), 0)
    const training = {
      week: { count: week.length, seconds: sum(week, 'moving_time_s'), meters: sum(week, 'distance_m') },
      month: { count: acts.length, seconds: sum(acts, 'moving_time_s'), meters: sum(acts, 'distance_m') },
      recent: acts.slice(0, 5).map(a => ({ id: a.id, sport: a.sport_type, title: a.title, date: a.started_at, meters: a.distance_m, seconds: a.moving_time_s })),
    }

    for (const r of (chatRows ?? []) as UsageRow[]) {
      const k = monthKey(new Date(r.created_at))
      if (k in chat) chat[k] += r.tokens_used ?? 0
    }
    for (const r of (studioRows ?? []) as UsageRow[]) {
      const k = monthKey(new Date(r.created_at))
      if (k in studio) studio[k] += r.tokens_used ?? 0
    }

    return NextResponse.json({
      loggedIn: true,
      memberSince: user.created_at ?? null,
      avatarUrl: (prof?.avatar_url as string | null) ?? null,
      training,
      usage: months.map(m => ({ month: m, chat: chat[m], studio: studio[m] })),
    })
  } catch (e) {
    console.error('[account/overview] error:', e)
    return NextResponse.json({ loggedIn: true, error: 'overview_failed' })
  }
}
