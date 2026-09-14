// ══════════════════════════════════════════════════════════════════════════
// Proxy OpenRouteService (calage du tracé sur les routes / navigation).
// L'app native (Capacitor) ne peut PAS appeler api.openrouteservice.org
// directement (clé non embarquée + CORS depuis l'origine capacitor://). Elle
// appelle donc CET endpoint sur Vercel (via le patch fetch natif → /api/*),
// qui relaie vers ORS avec la clé côté serveur. Le web l'utilise aussi
// (même origine) → clé jamais exposée au client.
// ══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'

const ORS_KEY = process.env.ORS_KEY || process.env.NEXT_PUBLIC_ORS_KEY || ''

export async function POST(req: NextRequest) {
  if (!ORS_KEY) return NextResponse.json({ error: 'ORS key not configured' }, { status: 500 })
  let payload: { profile?: string; [k: string]: unknown }
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const { profile, ...body } = payload
  const p = typeof profile === 'string' && profile ? profile : 'foot-hiking'
  try {
    const res = await fetch(`https://api.openrouteservice.org/v2/directions/${p}/geojson`, {
      method: 'POST',
      headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
