// ══════════════════════════════════════════════════════════════════════════
// GET /api/community/voice-health — DIAGNOSTIC LiveKit (temporaire).
// N'expose AUCUN secret : seulement si les variables sont présentes, l'hôte
// utilisé, et si les identifiants sont valides côté serveur LiveKit (listRooms).
// Sert à localiser la cause d'un échec de connexion d'appel.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'

export const dynamic = 'force-dynamic'

function httpUrl(raw: string): string {
  const u = raw.trim()
  if (u.startsWith('wss://')) return 'https://' + u.slice('wss://'.length)
  if (u.startsWith('ws://')) return 'http://' + u.slice('ws://'.length)
  return u
}

export async function GET() {
  const url = (process.env.LIVEKIT_URL ?? '').trim()
  const key = (process.env.LIVEKIT_API_KEY ?? '').trim()
  const secret = (process.env.LIVEKIT_API_SECRET ?? '').trim()
  const rawLen = { url: (process.env.LIVEKIT_URL ?? '').length, key: (process.env.LIVEKIT_API_KEY ?? '').length, secret: (process.env.LIVEKIT_API_SECRET ?? '').length }
  const trimLen = { url: url.length, key: key.length, secret: secret.length }
  const base = {
    hasUrl: !!url, hasKey: !!key, hasSecret: !!secret,
    urlScheme: url.split('://')[0] || null,
    urlHost: (() => { try { return new URL(httpUrl(url)).host } catch { return url ? '(invalide)' : null } })(),
    keyPrefix: key ? key.slice(0, 4) + '…' : null,
    hadWhitespace: rawLen.url !== trimLen.url || rawLen.key !== trimLen.key || rawLen.secret !== trimLen.secret,
    secretLen: trimLen.secret,
  }
  if (!url || !key || !secret) return NextResponse.json({ ...base, ok: false, reason: 'missing_env' })
  try {
    const svc = new RoomServiceClient(httpUrl(url), key, secret)
    const rooms = await svc.listRooms()
    return NextResponse.json({ ...base, ok: true, roomsCount: rooms.length })
  } catch (e) {
    return NextResponse.json({ ...base, ok: false, reason: 'listRooms_failed', error: e instanceof Error ? e.message : String(e) })
  }
}
