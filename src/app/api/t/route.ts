// ══════════════════════════════════════════════════════════════════
// Mesure d'audience anonyme (sans cookie). Reçoit les évènements du site et
// du site-app, les classe et les écrit dans site_hits (service role).
//  - L'IP n'est JAMAIS stockée : seule une empreinte journalière salée (vid)
//    sert à compter des visiteurs uniques du jour.
//  - sid = identifiant d'onglet (sessionStorage), fourni par le navigateur.
//  - Bots et en-tête Do Not Track ignorés.
//  - 'signup' / 'app_open' ne viennent que d'un utilisateur connecté, vérifié
//    côté serveur (le client ne peut pas se déclarer inscrit).
// Répond toujours 204 : jamais de message d'erreur utile à un tiers.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { browserOf, cleanText, deviceOf, isBot, sourceOf } from '@/lib/stats/classify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PUBLIC_EVENTS = new Set(['pageview', 'leave', 'cta', 'test_start', 'test_step', 'test_done'])
const LANGS = new Set(['fr', 'en', 'es', 'it', 'de'])
const done = () => new NextResponse(null, { status: 204 })

function smallProps(v: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (!v || typeof v !== 'object') return out
  let n = 0
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (n++ >= 8) break
    if (typeof val === 'string') out[k.slice(0, 32)] = val.slice(0, 80)
    else if (typeof val === 'number' && Number.isFinite(val)) out[k.slice(0, 32)] = val
    else if (typeof val === 'boolean') out[k.slice(0, 32)] = val
  }
  return out
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (request.headers.get('dnt') === '1') return done()
    const ua = request.headers.get('user-agent') ?? ''
    if (isBot(ua)) return done()

    const raw = await request.text()
    if (raw.length > 2048) return done()
    const body = JSON.parse(raw) as Record<string, unknown>
    const event = typeof body.e === 'string' ? body.e : ''
    const sid = cleanText(body.sid, 64)
    if (!sid) return done()

    // Le propriétaire (admin) n'est jamais compté : si la requête porte une session
    // Supabase, on vérifie côté serveur que ce n'est pas le compte admin.
    const adminEmail = (process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase()
    if (adminEmail && (request.headers.get('cookie') ?? '').includes('sb-')) {
      const { data: { user: viewer } } = await (await createClient()).auth.getUser()
      if (viewer?.email?.toLowerCase() === adminEmail) return done()
    }

    const sb = createServiceClient()
    let userId: string | null = null
    let finalEvent = event

    if (event === 'app_open') {
      // Utilisateur connecté, vérifié côté serveur ; signup si le compte a moins de 2 h.
      const { data: { user } } = await (await createClient()).auth.getUser()
      if (!user) return done()
      userId = user.id
      const { data: prof } = await sb.from('profiles').select('created_at').eq('id', user.id).maybeSingle()
      const age = prof?.created_at ? Date.now() - new Date(prof.created_at as string).getTime() : Infinity
      if (age < 2 * 3_600_000) {
        // Un seul 'signup' par compte.
        const { count } = await sb.from('site_hits').select('id', { count: 'exact', head: true }).eq('event', 'signup').eq('user_id', user.id)
        finalEvent = (count ?? 0) > 0 ? 'app_open' : 'signup'
      }
    } else if (!PUBLIC_EVENTS.has(event)) {
      return done()
    }

    const path = cleanText(body.p, 200)
    const refHost = cleanText(body.r, 100)
    const utm = cleanText(body.u, 60)
    const qr = cleanText(body.q, 60)
    const lang = typeof body.l === 'string' && LANGS.has(body.l) ? body.l : null
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
    const day = new Date().toISOString().slice(0, 10)
    const vid = createHash('sha256').update(`${ip}|${ua}|${day}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest('hex').slice(0, 20)

    await sb.from('site_hits').insert({
      sid,
      vid,
      event: finalEvent,
      path,
      ref_host: refHost,
      source: sourceOf({ qr, utm, refHost }),
      medium: utm ? 'utm' : refHost ? 'referrer' : null,
      campaign: cleanText(body.c, 60),
      qr_code: qr,
      device: deviceOf(ua),
      browser: browserOf(ua),
      country: request.headers.get('x-vercel-ip-country'),
      lang,
      props: smallProps(body.x),
      user_id: userId,
    })
  } catch {
    /* jamais d'erreur côté visiteur */
  }
  return done()
}
