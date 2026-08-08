'use client'
// ══════════════════════════════════════════════════════════════════════════
// Appels en cours par canal d'un espace (nombre de participants) → « X en appel ».
// ══════════════════════════════════════════════════════════════════════════

/** Récupère { channelId: nbParticipants } pour les canaux en appel d'un espace. */
export async function getActiveCalls(spaceId: string): Promise<Record<string, number>> {
  try {
    const res = await fetch('/api/community/calls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId }),
    })
    if (!res.ok) return {}
    const data = (await res.json()) as { calls?: Record<string, number> }
    return data.calls ?? {}
  } catch { return {} }
}
