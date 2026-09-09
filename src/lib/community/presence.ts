'use client'
// ══════════════════════════════════════════════════════════════════════════
// Présence temps réel (Supabase Realtime Presence) : nombre de membres en ligne
// sur un espace. Registre module-level RÉFÉRENCÉ par topic : la page est montée
// dans les deux shells (desktop + mobile), donc le hook s'exécute en double —
// on partage UN seul canal de présence par topic pour éviter les doublons et le
// « cannot subscribe twice ». Clé de présence = userId → 1 utilisateur = 1 unité.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Entry {
  channel: ReturnType<ReturnType<typeof createClient>['channel']>
  refs: number
  ids: string[]                       // ids des utilisateurs EN LIGNE (clés de présence)
  subs: Set<(ids: string[]) => void>
}

const registry = new Map<string, Entry>()

// S'abonne au topic de présence (registre partagé) et appelle onIds à chaque
// changement. Renvoie une fonction de désabonnement.
function subscribe(topic: string, meId: string, onIds: (ids: string[]) => void): () => void {
  let entry = registry.get(topic)
  if (!entry) {
    const sb = createClient()
    const channel = sb.channel(topic, { config: { presence: { key: meId } } })
    const e: Entry = { channel, refs: 0, ids: [], subs: new Set() }
    registry.set(topic, e)
    channel.on('presence', { event: 'sync' }, () => {
      const ids = Object.keys(channel.presenceState())
      e.ids = ids
      e.subs.forEach(fn => fn(ids))
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ online: true })
    })
    entry = e
  }
  entry.refs += 1
  entry.subs.add(onIds)
  onIds(entry.ids)
  return () => {
    const e = registry.get(topic)
    if (!e) return
    e.subs.delete(onIds)
    e.refs -= 1
    if (e.refs <= 0) {
      const sb = createClient()
      void sb.removeChannel(e.channel)
      registry.delete(topic)
    }
  }
}

export function usePresenceCount(topic: string | null, meId: string | null): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!topic || !meId) return
    return subscribe(topic, meId, ids => setCount(ids.length))
  }, [topic, meId])
  return count
}

// Ensemble des utilisateurs EN LIGNE sur ce topic (pour séparer en ligne / hors ligne).
export function usePresenceIds(topic: string | null, meId: string | null): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!topic || !meId) return
    return subscribe(topic, meId, arr => setIds(new Set(arr)))
  }, [topic, meId])
  return ids
}
