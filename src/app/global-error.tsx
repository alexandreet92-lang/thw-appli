'use client'
// Frontière d'erreur RACINE : capture aussi les erreurs du layout racine (là où
// error.tsx ne peut pas). Doit rendre <html>/<body>. Même logique : écran de
// récupération lisible + auto-reload sur erreur de chunk (déploiement récent).
import { useEffect } from 'react'
import { isNativeApp } from '@/lib/native/platform'

// Langue lue depuis localStorage ('thw-lang') sans hook : la frontière racine peut
// se déclencher avant le montage du provider i18n.
const G_TXT: Record<string, Record<string, string>> = {
  fr: { updating: 'Mise à jour de l’application…', error: 'Une erreur est survenue',
    deployed: 'Nouvelle version déployée. Rechargement en cours…',
    reload_hint: 'Recharge la page. Si ça persiste, copie le message ci-dessous.', reload: 'Recharger' },
  en: { updating: 'Updating the app…', error: 'Something went wrong',
    deployed: 'New version deployed. Reloading…',
    reload_hint: 'Reload the page. If it persists, copy the message below.', reload: 'Reload' },
  es: { updating: 'Actualizando la aplicación…', error: 'Se produjo un error',
    deployed: 'Nueva versión desplegada. Recargando…',
    reload_hint: 'Recarga la página. Si persiste, copia el mensaje de abajo.', reload: 'Recargar' },
}
function gLang(): string {
  try { const v = localStorage.getItem('thw-lang'); if (v === 'en' || v === 'es') return v } catch { /* ignore */ }
  return 'fr'
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isChunk = /ChunkLoadError|Loading chunk|Importing a module script failed|dynamically imported module/i.test(`${error?.name} ${error?.message}`)
  const lang = gLang()
  const tx = G_TXT[lang] ?? G_TXT.fr

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global error boundary]', error)
    if (!isChunk) return
    // App native : NE PAS recharger (reload sur une route dynamique retombe sur
    // index.html = Dashboard). On ré-essaie le rendu à la place.
    if (isNativeApp()) {
      try {
        const last = Number(sessionStorage.getItem('thw_native_reset_ts') || 0)
        if (Date.now() - last > 2000) { sessionStorage.setItem('thw_native_reset_ts', String(Date.now())); reset() }
      } catch { /* ignore */ }
      return
    }
    try {
      if (!sessionStorage.getItem('thw_chunk_reloaded')) {
        sessionStorage.setItem('thw_chunk_reloaded', '1')
        location.reload()
      }
    } catch { /* ignore */ }
  }, [error, isChunk, reset])

  return (
    <html lang={lang}>
      <body style={{ margin: 0, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0b0b0f', color: '#e8e8ea', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
            {isChunk ? tx.updating : tx.error}
          </h1>
          <p style={{ fontSize: 14, color: '#9aa0a6', margin: '0 0 18px', lineHeight: 1.5 }}>
            {isChunk ? tx.deployed : tx.reload_hint}
          </p>
          <button onClick={() => { try { sessionStorage.removeItem('thw_chunk_reloaded') } catch { /* ignore */ } location.reload() }}
            style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: '#06B6D4', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{tx.reload}</button>
          {!isChunk && (error?.message || error?.digest) && (
            <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.5, color: '#6b7075', background: '#101014', border: '1px solid #26262b', borderRadius: 10, padding: '10px 12px', marginTop: 16, maxHeight: 200, overflow: 'auto' }}>
              {error?.message || ''}{error?.digest ? `\n\n[digest] ${error.digest}` : ''}
            </pre>
          )}
        </div>
      </body>
    </html>
  )
}
