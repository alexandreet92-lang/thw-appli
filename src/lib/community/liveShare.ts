'use client'
// ══════════════════════════════════════════════════════════════════════════
// Partage de position en direct (v1). L'athlète démarre un partage vers des
// proches choisis (personnes qu'il suit) : chacun reçoit un MP avec un lien
// /live/<id>, et suit la position en temps réel (Supabase Realtime). La position
// est poussée toutes les ~8 s via geolocation.watchPosition, indépendamment de
// l'écran d'enregistrement (tourne tant que le partage est actif).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { getOrCreateDirectThread, sendGroupMessage } from '@/lib/messages/groups'

export interface LiveShareRow {
  id: string; owner_id: string; sport: string | null; active: boolean
  lat: number | null; lng: number | null; elapsed_s: number | null; distance_m: number | null
  started_at: string; updated_at: string; ended_at: string | null
}

let watchId: number | null = null
let activeShareId: string | null = null
let lastPush = 0

export function currentLiveShareId(): string | null { return activeShareId }

/** Démarre un partage : crée la ligne + les destinataires, envoie le lien en MP,
 *  puis pousse la position toutes les ~8 s. Renvoie l'id du partage (ou null). */
export async function startLiveShare(sport: string | null, recipientIds: string[]): Promise<string | null> {
  const sb = createClient()
  const user = await getCurrentUser(); if (!user) return null
  const { data, error } = await sb.from('live_shares').insert({ owner_id: user.id, sport, active: true }).select('id').single()
  if (error || !data) return null
  const id = (data as { id: string }).id
  if (recipientIds.length) {
    await sb.from('live_share_recipients').insert(recipientIds.map(uid => ({ share_id: id, user_id: uid })))
  }
  activeShareId = id
  // Lien de suivi envoyé en message privé à chaque proche.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${origin}/live/${id}`
  void (async () => {
    for (const uid of recipientIds) {
      try { const gid = await getOrCreateDirectThread(uid); if (gid) await sendGroupMessage(gid, `📍 Je partage ma position en direct : ${link}`) } catch { /* best-effort */ }
    }
  })()
  startWatch(id)
  return id
}

function startWatch(id: string) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  watchId = navigator.geolocation.watchPosition(
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
  if (watchId != null && typeof navigator !== 'undefined') { navigator.geolocation.clearWatch(watchId); watchId = null }
  activeShareId = null
  if (!target) return
  try { await createClient().from('live_shares').update({ active: false, ended_at: new Date().toISOString() }).eq('id', target) } catch { /* ignore */ }
}
