'use client'
// Frontière d'erreur RACINE : capture aussi les erreurs du layout racine (là où
// error.tsx ne peut pas). Doit rendre <html>/<body>. Même logique : écran de
// récupération lisible + auto-reload sur erreur de chunk (déploiement récent).
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isChunk = /ChunkLoadError|Loading chunk|Importing a module script failed|dynamically imported module/i.test(`${error?.name} ${error?.message}`)

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global error boundary]', error)
    if (isChunk) {
      try {
        if (!sessionStorage.getItem('thw_chunk_reloaded')) {
          sessionStorage.setItem('thw_chunk_reloaded', '1')
          location.reload()
        }
      } catch { /* ignore */ }
    }
  }, [error, isChunk])

  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0b0b0f', color: '#e8e8ea', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
            {isChunk ? 'Mise à jour de l’application…' : 'Une erreur est survenue'}
          </h1>
          <p style={{ fontSize: 14, color: '#9aa0a6', margin: '0 0 18px', lineHeight: 1.5 }}>
            {isChunk ? 'Nouvelle version déployée. Rechargement en cours…' : 'Recharge la page. Si ça persiste, copie le message ci-dessous.'}
          </p>
          <button onClick={() => { try { sessionStorage.removeItem('thw_chunk_reloaded') } catch { /* ignore */ } location.reload() }}
            style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: '#06B6D4', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Recharger</button>
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
