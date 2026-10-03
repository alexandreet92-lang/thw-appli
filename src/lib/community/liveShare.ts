'use client'
// ══════════════════════════════════════════════════════════════════════════
// Partage de position en direct (façon Strava Beacon / Garmin LiveTrack).
// L'athlète démarre un partage : une session `live_shares` est créée et son
// LIEN PUBLIC (/live/<id> sur le site déployé) est envoyé par la feuille de
// partage native (WhatsApp, Messages…). La page /live/<id> s'ouvre SANS compte :
// elle lit la session via /api/live/<id> (service role, champs minimaux — l'id
// UUID v4 non devinable fait office de jeton). En option, le lien peut aussi
// partir en MP à des membres suivis dans l'app (live_share_recipients).
// La position est poussée toutes les ~8 s via geolocation.watchPosition,
// indépendamment de l'écran d'enregistrement (tourne tant que le partage est
// actif) ; l'écran live ajoute durée + distance (pushPosition).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { getOrCreateDirectThread, sendGroupMessage } from '@/lib/messages/groups'
import { authRedirectBase } from '@/lib/auth/redirect'
import { watchPosition, type GeoHandle } from '@/lib/native/geo'

export interface LiveShareRow {
  id: string; owner_id: string; sport: string | null; active: boolean
  lat: number | null; lng: number | null; elapsed_s: number | null; distance_m: number | null
  started_at: string; updated_at: string; ended_at: string | null
}

let watchHandle: GeoHandle | null = null
let activeShareId: string | null = null
let lastPush = 0

export function currentLiveShareId(): string | null { return activeShareId }

/** Lien PUBLIC de suivi : toujours sur le site déployé (jamais capacitor://
 *  localhost, inaccessible au destinataire). NEXT_PUBLIC_SITE_URL >
 *  NEXT_PUBLIC_API_BASE > origine web > domaine de production. */
export function liveShareUrl(id: string): string {
  return `${authRedirectBase()}/live/${id}`
}

/** Démarre un partage : crée la ligne (+ destinataires in-app éventuels, qui
 *  reçoivent le lien en MP), puis pousse la position toutes les ~8 s.
 *  `recipientIds` vide = partage par lien uniquement. Renvoie l'id (ou null). */
export async function startLiveShare(sport: string | null, recipientIds: string[] = []): Promise<string | null> {
  const sb = createClient()
  const user = await getCurrentUser(); if (!user) return null
  const { data, error } = await sb.from('live_shares').insert({ owner_id: user.id, sport, active: true }).select('id').single()
  if (error || !data) return null
  const id = (data as { id: string }).id
  activeShareId = id
  startWatch(id)
  if (recipientIds.length) void addLiveShareRecipients(id, recipientIds)
  return id
}

/** Envoie AUSSI le lien en message privé à des membres suivis dans l'app
 *  (accès en lecture via RLS + MP). Renvoie le nombre de MP envoyés. */
export async function addLiveShareRecipients(id: string, recipientIds: string[]): Promise<number> {
  if (!recipientIds.length) return 0
  const sb = createClient()
  try {
    await sb.from('live_share_recipients').upsert(
      recipientIds.map(uid => ({ share_id: id, user_id: uid })),
      { onConflict: 'share_id,user_id', ignoreDuplicates: true },
    )
  } catch { /* best-effort : le lien reste public */ }
  const link = liveShareUrl(id)
  let sent = 0
  for (const uid of recipientIds) {
    try {
      const gid = await getOrCreateDirectThread(uid)
      if (gid && await sendGroupMessage(gid, `📍 Je partage ma position en direct : ${link}`)) sent++
    } catch { /* best-effort */ }
  }
  return sent
}

function startWatch(id: string) {
  // Hub GPS partagé (natif : plugin Capacitor ; web : navigator.geolocation).
  watchHandle?.clear()
  watchHandle = watchPosition(
    pos => { void pushPosition(id, pos.coords.latitude, pos.coords.longitude) },
    () => { /* position indisponible : on réessaiera au prochain fix */ },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  )
}

/** Pousse la position (débit limité à ~8 s). Peut aussi être appelée par le
 *  lecteur d'activité pour transmettre temps écoulé / distance. */
export async function pushPosition(id: string, lat: number, lng: number, elapsedS?: number, distanceM?: number): Promise<void> {
  const now = Date.now()
  if (now - lastPush < 7500 && elapsedS === undefined) return
  lastPush = now
  try {
    const patch: Record<string, unknown> = { lat, lng, updated_at: new Date().toISOString() }
    if (elapsedS !== undefined) patch.elapsed_s = Math.round(elapsedS)
    if (distanceM !== undefined) patch.distance_m = Math.round(distanceM)
    await createClient().from('live_shares').update(patch).eq('id', id)
  } catch { /* best-effort */ }
}

/** Arrête le partage : coupe le suivi GPS et marque la ligne inactive. */
export async function stopLiveShare(id?: string): Promise<void> {
  const target = id ?? activeShareId
  if (watchHandle) { watchHandle.clear(); watchHandle = null }
  activeShareId = null
  if (!target) return
  try { await createClient().from('live_shares').update({ active: false, ended_at: new Date().toISOString() }).eq('id', target) } catch { /* ignore */ }
}
