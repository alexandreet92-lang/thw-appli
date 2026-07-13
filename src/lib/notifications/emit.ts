// ══════════════════════════════════════════════════════════════
// Helper client : émet une notification (in-app + push) pour un événement
// déclenché côté navigateur. Best-effort, ne jette jamais.
// ══════════════════════════════════════════════════════════════

export type EmitPayload = {
  key: string
  title: string
  body: string
  url?: string
  dedupKey?: string
  once?: boolean
}

export function emitNotification(payload: EmitPayload): void {
  try {
    void fetch('/api/notifications/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { /* silencieux */ })
  } catch { /* silencieux */ }
}
