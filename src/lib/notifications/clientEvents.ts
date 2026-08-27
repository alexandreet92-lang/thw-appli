// Client — signale au serveur un évènement inter-utilisateur à notifier
// (l'émission réelle se fait côté serveur : /api/notifications/event).
// Fire-and-forget : ne bloque jamais l'action de l'utilisateur.
export function emitServerEvent(event: string, payload: Record<string, unknown> = {}): void {
  try {
    void fetch('/api/notifications/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* best-effort */ }
}
