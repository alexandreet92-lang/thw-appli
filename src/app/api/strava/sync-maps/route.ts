// ══════════════════════════════════════════════════════════════════
// STRAVA SYNC-MAPS — src/app/api/strava/sync-maps/route.ts
//
// Backfill summary_polyline pour les activités Strava qui n'en ont pas.
// Appeler UNE FOIS après le déploiement :
//   GET https://thw-appli.vercel.app/api/strava/sync-maps
//
// Rate-limit : 200ms entre chaque requête Strava.
// ══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken }       from '@/lib/oauth/tokens'

const STRAVA_API = 'https://www.strava.com/api/v3'

export async function GET() {
  const supabase = createServiceClient()

  // Récupérer toutes les activités Strava sans summary_polyline
  // (y compris celles qui ont un polyline dans raw_data.map)
  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, user_id, provider_id, raw_data')
    .eq('provider', 'strava')
    .is('summary_polyline', null)
    .not('provider_id', 'is', null)
    .order('started_at', { ascending: false })
    .limit(200)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!activities?.length) return Response.json({ updated: 0, message: 'Rien à backfiller' })

  // Migrer d'abord les polylines déjà présents dans raw_data.map
  let fromRawData = 0
  const toFetch: typeof activities = []

  for (const act of activities) {
    const mapObj = (act.raw_data as Record<string, unknown> | null)?.map as Record<string, unknown> | null
    const poly   = (mapObj?.summary_polyline ?? mapObj?.polyline) as string | null | undefined
    if (poly) {
      await supabase
        .from('activities')
        .update({ summary_polyline: poly })
        .eq('id', act.id)
      fromRawData++
    } else {
      toFetch.push(act)
    }
  }

  // Pour les autres, fetcher depuis Strava API
  // Grouper par user_id pour minimiser les appels getValidToken
  const tokenCache: Record<string, string | null> = {}
  let fromStrava = 0, failed = 0

  for (const act of toFetch) {
    if (!act.provider_id) continue

    // Récupérer le token (mis en cache par user)
    if (!(act.user_id in tokenCache)) {
      tokenCache[act.user_id] = await getValidToken(act.user_id, 'strava')
    }
    const token = tokenCache[act.user_id]
    if (!token) { failed++; continue }

    try {
      const res  = await fetch(`${STRAVA_API}/activities/${act.provider_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { failed++; continue }

      const detail = await res.json() as { map?: { summary_polyline?: string; polyline?: string } }
      const poly   = detail.map?.summary_polyline ?? detail.map?.polyline ?? null

      if (poly) {
        await supabase
          .from('activities')
          .update({ summary_polyline: poly })
          .eq('id', act.id)
        fromStrava++
      } else {
        failed++ // Activité sans tracé GPS (indoor, etc.)
      }
    } catch {
      failed++
    }

    // Respecter le rate-limit Strava (200ms)
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`[sync-maps] from raw_data: ${fromRawData}, from Strava: ${fromStrava}, failed/indoor: ${failed}`)
  return Response.json({
    updated:      fromRawData + fromStrava,
    from_raw_data: fromRawData,
    from_strava:   fromStrava,
    failed_or_indoor: failed,
  })
}
