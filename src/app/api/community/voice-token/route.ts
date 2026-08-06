// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/voice-token — jeton d'accès à un salon vocal (LiveKit).
//
// Phase 2 (voix). Gating Pro+/coach (community_voice). Le jeton LiveKit est un JWT
// HS256 standard (grant `video`) forgé sans dépendance externe. Tant que les
// variables d'env LIVEKIT_* ne sont pas configurées, la route renvoie 501 +
// { configured:false } → l'UI affiche « activation LiveKit requise ».
//
// Pour activer : créer un projet LiveKit (Cloud ou self-host) et définir sur Vercel
//   LIVEKIT_URL        (wss://…livekit.cloud)
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { communityEntitlements } from '@/lib/subscriptions/tier-limits'

export const dynamic = 'force-dynamic'

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url')

function mintToken(apiKey: string, apiSecret: string, identity: string, name: string, room: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: apiKey, sub: identity, name, nbf: now, exp: now + 3600, jti: identity,
    video: { room, roomJoin: true, canPublish: true, canSubscribe: true },
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const sig = createHmac('sha256', apiSecret).update(unsigned).digest('base64url')
  return `${unsigned}.${sig}`
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // La salle d'appel se rattache soit à un canal vocal (channelId), soit
    // directement à un espace (spaceId → appel de groupe de l'espace, sans avoir
    // à créer un canal vocal). L'un des deux est requis.
    const { channelId, spaceId } = (await req.json().catch(() => ({}))) as { channelId?: string; spaceId?: string }
    if (!channelId && !spaceId) return NextResponse.json({ error: 'Salle manquante' }, { status: 400 })

    // Entitlement voix (Pro+/coach).
    const unlimited = await isCreatorAccount(user.id)
    const tier = await getUserTier(user.id)
    if (!communityEntitlements(tier, unlimited).canVoice) {
      return NextResponse.json({ error: 'Les appels sont réservés à l\'abonnement Pro.', code: 'upgrade_required', upgrade_url: '/settings/subscription' }, { status: 403 })
    }

    // Résout l'espace cible + la clé de salle, puis vérifie l'appartenance.
    const svc = createServiceClient()
    let targetSpaceId: string
    let room: string
    if (channelId) {
      // Tout canal peut héberger un appel (le salon vocal vit dans chaque canal).
      const { data: ch } = await svc.from('community_channels').select('space_id').eq('id', channelId).maybeSingle()
      const chan = ch as { space_id: string } | null
      if (!chan) return NextResponse.json({ error: 'Canal introuvable' }, { status: 404 })
      targetSpaceId = chan.space_id
      room = `comm-${channelId}`
    } else {
      const { data: sp } = await svc.from('community_spaces').select('id').eq('id', spaceId!).maybeSingle()
      if (!sp) return NextResponse.json({ error: 'Espace introuvable' }, { status: 404 })
      targetSpaceId = spaceId!
      room = `comm-space-${spaceId}`
    }
    const { data: mem } = await svc.from('community_members').select('user_id').eq('space_id', targetSpaceId).eq('user_id', user.id).maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Rejoins l\'espace pour parler.' }, { status: 403 })

    const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET
    if (!url || !key || !secret) {
      return NextResponse.json({ error: 'Voix non configurée (LiveKit).', configured: false }, { status: 501 })
    }

    let name = 'Membre'
    try {
      const { data: p } = await svc.from('profiles').select('full_name, first_name').eq('id', user.id).maybeSingle()
      name = ((p?.full_name as string) || (p?.first_name as string) || 'Membre').trim()
    } catch { /* fallback */ }

    const token = mintToken(key, secret, user.id, name, room)
    return NextResponse.json({ token, url, room, identity: user.id })
  } catch (e) {
    console.error('[community/voice-token] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
