// ══════════════════════════════════════════════════════════════════
// POST /api/calendar/subscribe
//   Génère (ou récupère) le jeton de flux calendrier de l'utilisateur et
//   renvoie les URLs d'abonnement (https + webcal). Idempotent.
// GET /api/calendar/subscribe
//   Renvoie l'état d'abonnement courant (token présent ou non).
// ══════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function buildUrls(req: Request, token: string) {
  const origin = new URL(req.url).origin
  const host = origin.replace(/^https?:\/\//, '')
  return {
    token,
    url: `${origin}/api/calendar/${token}.ics`,
    webcal: `webcal://${host}/api/calendar/${token}.ics`,
  }
}

export async function GET(req: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data } = await sb.from('calendar_feeds').select('token').eq('user_id', user.id).maybeSingle()
    if (!data?.token) return NextResponse.json({ connected: false })
    return NextResponse.json({ connected: true, ...buildUrls(req, data.token as string) })
  } catch (e) {
    console.error('[api/calendar/subscribe GET] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Jeton existant ?
    const { data: existing } = await sb.from('calendar_feeds').select('token').eq('user_id', user.id).maybeSingle()
    let token = existing?.token as string | undefined

    if (!token) {
      // Insert : le DEFAULT SQL génère le jeton ; on le récupère.
      const { data: created, error } = await sb.from('calendar_feeds').insert({ user_id: user.id }).select('token').single()
      if (error || !created?.token) {
        console.error('[api/calendar/subscribe POST] insert error:', error)
        return NextResponse.json({ error: 'Création impossible' }, { status: 500 })
      }
      token = created.token as string
    }

    return NextResponse.json({ connected: true, ...buildUrls(req, token) })
  } catch (e) {
    console.error('[api/calendar/subscribe POST] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
