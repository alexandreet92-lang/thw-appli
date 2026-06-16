// ══════════════════════════════════════════════════════════════
// Synchro des conversations IA entre appareils (Supabase).
// Le contenu complet de chaque conversation est stocké en JSONB dans
// public.ai_conversations.data, indexé par (user_id, client_id).
// La fusion (au chargement) garde la version la plus récente par id.
// ══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

export interface SyncConv {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  isPinned?: boolean
  agent?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msgs: any[]
}

/** Récupère toutes les conversations distantes de l'utilisateur. */
export async function fetchRemoteConvs(sb: Sb, userId: string): Promise<SyncConv[]> {
  try {
    const { data, error } = await sb.from('ai_conversations').select('data').eq('user_id', userId)
    if (error || !data) return []
    return (data as { data: SyncConv | null }[])
      .map(r => r.data)
      .filter((c): c is SyncConv => !!c && typeof c.id === 'string')
  } catch {
    return []
  }
}

/** Pousse (upsert) un lot de conversations vers le serveur. */
export async function pushConvs(sb: Sb, userId: string, convs: SyncConv[]): Promise<void> {
  if (!convs.length) return
  try {
    const rows = convs.map(c => ({
      user_id:    userId,
      client_id:  c.id,
      title:      c.title ?? null,
      agent:      c.agent ?? 'training',
      is_project: false,
      data:       c,
      updated_at: new Date(c.updatedAt || Date.now()).toISOString(),
    }))
    await sb.from('ai_conversations').upsert(rows, { onConflict: 'user_id,client_id' })
  } catch { /* non-bloquant */ }
}

/** Supprime une conversation côté serveur (suppression explicite). */
export async function deleteRemoteConv(sb: Sb, userId: string, convId: string): Promise<void> {
  try {
    await sb.from('ai_conversations').delete().eq('user_id', userId).eq('client_id', convId)
  } catch { /* non-bloquant */ }
}

/** Fusionne local + distant : pour chaque id, garde la version la plus récente. */
export function mergeConvs(local: SyncConv[], remote: SyncConv[], max: number): SyncConv[] {
  const map = new Map<string, SyncConv>()
  for (const c of remote) map.set(c.id, c)
  for (const c of local) {
    const ex = map.get(c.id)
    if (!ex || (c.updatedAt ?? 0) >= (ex.updatedAt ?? 0)) map.set(c.id, c)
  }
  return [...map.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, max)
}
