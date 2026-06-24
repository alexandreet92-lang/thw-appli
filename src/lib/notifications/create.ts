// ══════════════════════════════════════════════════════════════════
// Helper de création de notifications in-app (table `notifications`).
// Centralise le pattern dédup + insert. RLS : l'utilisateur insère les
// siennes. Tout est best-effort (jamais bloquant pour l'UI).
// ══════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'

export interface NewNotification {
  type: string
  title: string
  body?: string
  link?: string
  dedupKey?: string
}

// Remplace une notif NON LUE de même dedup_key par la version récente
// (ex. plusieurs ajustements du même jour) puis insère.
export async function createNotification(
  sb: SupabaseClient, userId: string, n: NewNotification,
): Promise<void> {
  try {
    if (n.dedupKey) {
      await sb.from('notifications').delete()
        .eq('user_id', userId).eq('dedup_key', n.dedupKey).eq('read', false)
    }
    await sb.from('notifications').insert({
      user_id: userId, type: n.type, title: n.title,
      body: n.body ?? null, link: n.link ?? null, dedup_key: n.dedupKey ?? null,
    })
  } catch { /* best-effort */ }
}

// Insère UNE SEULE FOIS pour un dedup_key donné (jalon one-shot, ex. « J-7 »).
// N'écrase rien : si une notif existe déjà (lue ou non), on ne fait rien.
export async function createNotificationOnce(
  sb: SupabaseClient, userId: string, n: NewNotification,
): Promise<void> {
  try {
    if (n.dedupKey) {
      const { count } = await sb.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('dedup_key', n.dedupKey)
      if ((count ?? 0) > 0) return
    }
    await sb.from('notifications').insert({
      user_id: userId, type: n.type, title: n.title,
      body: n.body ?? null, link: n.link ?? null, dedup_key: n.dedupKey ?? null,
    })
  } catch { /* best-effort */ }
}
