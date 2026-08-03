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
  count: number
  subs: Set<(n: number) => void>
}

const registry = new Map<string, Entry>()

export function usePresenceCount(topic: string | null, meId: string | null): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!topic || !meId) return
    let entry = registry.get(topic)
    if (!entry) {
      const sb = createClient()
      const channel = sb.channel(topic, { config: { presence: { key: meId } } })
      const e: Entry = { channel, refs: 0, count: 0, subs: new Set() }
      registry.set(topic, e)
      channel.on('presence', { event: 'sync' }, () => {
        const n = Object.keys(channel.presenceState()).length
        e.count = n
        e.subs.forEach(fn => fn(n))
      }).subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ online: true })
      })
      entry = e
    }
    entry.refs += 1
    const onChange = (n: number) => setCount(n)
    entry.subs.add(onChange)
    setCount(entry.count)

    return () => {
      const e = registry.get(topic)
      if (!e) return
      e.subs.delete(onChange)
      e.refs -= 1
      if (e.refs <= 0) {
        const sb = createClient()
        void sb.removeChannel(e.channel)
        registry.delete(topic)
      }
    }
  }, [topic, meId])

  return count
}
