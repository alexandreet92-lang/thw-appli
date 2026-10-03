// ══════════════════════════════════════════════════════════════════════════
// GET /api/live/<id> — lecture PUBLIQUE (sans compte) d'un partage de position
// en direct, pour la page /live/<id> ouverte depuis WhatsApp / Messages.
// La RLS de live_shares réserve la lecture au propriétaire et aux destinataires
// in-app : on passe donc par le service role, en ne renvoyant que le strict
// nécessaire (prénom, sport, position, durée, distance, horodatages).
// L'id (UUID v4 aléatoire) fait office de jeton : lecture par id exact
// uniquement, jamais de liste. Le lien expire 24 h après la fin du partage
// (position masquée), comme Garmin LiveTrack.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXPIRE_AFTER_END_MS = 24 * 3600 * 1000

interface ShareRow {
  id: string; owner_id: string; sport: string | null; active: boolean
  lat: number | null; lng: number | null; elapsed_s: number | null; distance_m: number | null
  started_at: string; updated_at: string; ended_at: string | null
}
interface ProfileRow { preferred_name?: string | null; first_name?: string | null; full_name?: string | null; avatar_url?: string | null }

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id || !UUID.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })

    const svc = createServiceClient()
    const { data } = await svc.from('live_shares')
      .select('id, owner_id, sport, active, lat, lng, elapsed_s, distance_m, started_at, updated_at, ended_at')
      .eq('id', id).maybeSingle()
    const row = data as ShareRow | null
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })

    const { data: p } = await svc.from('profiles')
      .select('preferred_name, first_name, full_name, avatar_url').eq('id', row.owner_id).maybeSingle()
    const prof = p as ProfileRow | null
    // Prénom seulement (vie privée) : premier mot du nom affiché.
    const display = (prof?.preferred_name || prof?.first_name || prof?.full_name || '').trim()
    const name = display ? display.split(/\s+/)[0] : null

    const expired = !row.active && !!row.ended_at && Date.now() - new Date(row.ended_at).getTime() > EXPIRE_AFTER_END_MS
    return NextResponse.json({
      share: {
        id: row.id,
        name,
        avatar: prof?.avatar_url ?? null,
        sport: row.sport,
        active: row.active,
        expired,
        lat: expired ? null : row.lat,
        lng: expired ? null : row.lng,
        elapsedS: row.elapsed_s ?? 0,
        distanceM: row.distance_m ?? 0,
        startedAt: row.started_at,
        updatedAt: row.updated_at,
        endedAt: row.ended_at,
      },
    }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: NO_STORE })
  }
}
