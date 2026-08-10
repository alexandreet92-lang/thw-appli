/* ══════════════════════════════════════════════════════════════
 * Service worker THW Coaching — notifications Web Push.
 *
 * Rôle minimal et ciblé : recevoir les push du serveur et afficher une
 * notification QUAND l'app n'est pas déjà au premier plan. Si un onglet
 * est visible/focus, on n'affiche rien (l'utilisateur voit déjà la réponse).
 * ════════════════════════════════════════════════════════════════ */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch (e) { payload = {} }

  const title = payload.title || 'THW Coaching'
  const body  = payload.body || 'Ta réponse est prête.'
  const url   = payload.url || '/'
  const tag   = payload.tag || 'coach-done'

  event.waitUntil((async () => {
    // Si une fenêtre de l'app est déjà au premier plan → ne pas notifier.
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const focused = clientList.some((c) => c.focused || c.visibilityState === 'visible')
    if (focused) return

    await self.registration.showNotification(title, {
      body,
      tag,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url },
      renotify: true,
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Réutilise un onglet existant si possible.
    for (const c of clientList) {
      if ('focus' in c) {
        try { await c.focus() } catch (e) { /* ignore */ }
        if ('navigate' in c && url) { try { await c.navigate(url) } catch (e) { /* ignore */ } }
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url)
  })())
})

// ══════════════════════════════════════════════════════════════
// Cache des fichiers statiques IMMUABLES (bundles JS/CSS hashés + logos +
// polices) → démarrage à froid beaucoup plus rapide (on ne re-télécharge pas
// des Mo de JS à chaque ouverture). AUCUNE page HTML / API / donnée n'est mise
// en cache → zéro risque de contenu périmé ou de session cassée.
// ══════════════════════════════════════════════════════════════
const THW_STATIC_CACHE = 'thw-static-v1'

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  let url
  try { url = new URL(req.url) } catch (e) { return }
  if (url.origin !== self.location.origin) return

  // Uniquement les ressources à URL hashée / immuables.
  const cacheable =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/logos/') ||
    url.pathname.startsWith('/space-logos/') ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname)

  if (!cacheable) return // tout le reste : réseau normal (données toujours fraîches)

  event.respondWith(
    caches.open(THW_STATIC_CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        if (hit) return hit
        return fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        })
      })
    )
  )
})
