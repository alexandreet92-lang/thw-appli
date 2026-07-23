import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  DEVICE_PROVIDERS, isDeviceProviderConfigured, configuredDeviceProviders,
  type DevicePushProvider,
} from '@/lib/deviceProviders'

// ── GET : capacités ────────────────────────────────────────────
// Renvoie les providers ACTIVÉS (clés présentes) et, parmi eux, ceux que
// l'utilisateur a CONNECTÉS (token OAuth). L'UI n'affiche « Envoyer vers X »
// que pour les providers connectés → rien tant que l'accès n'est pas en place.
export async function GET() {
  const available = configuredDeviceProviders()
  let connected: DevicePushProvider[] = []
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && available.length) {
      const db = createServiceClient()
      const { data } = await db.from('oauth_tokens')
        .select('provider').eq('user_id', user.id).eq('is_active', true)
      const set = new Set((data ?? []).map((r: { provider: string }) => r.provider))
      connected = available.filter(p => set.has(p))
    }
  } catch { /* ignore */ }
  return NextResponse.json({ available, connected })
}

// ── POST : envoyer un parcours vers l'appareil ────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { routeId, provider } = await req.json() as { routeId?: string; provider?: DevicePushProvider }
  if (!provider || !DEVICE_PROVIDERS[provider]) return NextResponse.json({ error: 'Provider inconnu' }, { status: 400 })
  const meta = DEVICE_PROVIDERS[provider]

  // 1) Le connecteur est-il activé (clés d'API présentes) ?
  if (!isDeviceProviderConfigured(provider)) {
    return NextResponse.json(
      { error: `L'envoi direct vers ${meta.name} n'est pas encore activé (accès API constructeur requis). Utilise l'export GPX en attendant.`, code: 'not_configured' },
      { status: 501 },
    )
  }

  // 2) L'utilisateur a-t-il connecté son compte ?
  const db = createServiceClient()
  const { data: tokenRow } = await db.from('oauth_tokens')
    .select('access_token, refresh_token, expires_at').eq('user_id', user.id).eq('provider', provider).eq('is_active', true).maybeSingle()
  if (!tokenRow) {
    return NextResponse.json({ error: `Connecte d'abord ${meta.name} dans Connexions.`, code: 'not_connected' }, { status: 403 })
  }

  // 3) Charger le parcours (RLS : propriété vérifiée).
  if (!routeId) return NextResponse.json({ error: 'Parcours manquant' }, { status: 400 })
  const { data: route } = await supabase.from('routes')
    .select('name, snapped_points, waypoints, elevation_profile').eq('id', routeId).maybeSingle()
  if (!route) return NextResponse.json({ error: 'Parcours introuvable' }, { status: 404 })
  const pts = (route.snapped_points ?? route.waypoints ?? []) as { lat: number; lng: number; altitude?: number }[]
  if (pts.length < 2) return NextResponse.json({ error: 'Parcours vide' }, { status: 400 })

  // 4) Pousser vers le service.
  try {
    await pushCourse(provider, tokenRow as OAuthToken, { name: route.name as string, points: pts })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Échec de l’envoi'
    const pending = msg.startsWith('PENDING')
    return NextResponse.json({ error: pending ? `Intégration ${meta.name} à finaliser (voir docs/DEVICE_EXPORT.md).` : msg, code: pending ? 'pending_impl' : 'push_failed' }, { status: pending ? 501 : 502 })
  }
}

interface OAuthToken { access_token: string; refresh_token: string | null; expires_at: string | null }

// Envoi effectif vers le service constructeur. Le plumbing (auth, token,
// chargement du parcours) est fait ; l'appel API SIGNÉ se termine une fois les
// identifiants partenaires obtenus (schéma exact à valider). Voir la doc.
async function pushCourse(
  provider: DevicePushProvider,
  _token: OAuthToken,
  _course: { name: string; points: { lat: number; lng: number; altitude?: number }[] },
): Promise<void> {
  // TODO(clés partenaires) :
  //  • Garmin : OAuth 1.0a (signature HMAC-SHA1) + POST Training API « Courses »
  //             (schéma coursePoints/geoPoints). Consumer Key/Secret requis.
  //  • Wahoo  : OAuth 2.0 (token déjà en base) + POST /v1/routes (scope écriture).
  // Tant que ce n'est pas finalisé, on signale clairement l'état « à finaliser ».
  throw new Error(`PENDING:${provider}`)
}
