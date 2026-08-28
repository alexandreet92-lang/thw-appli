'use client'
// Frontière d'erreur au niveau des pages : au lieu d'un écran blanc « Application
// error » cryptique, on affiche un écran de récupération lisible AVEC le message
// d'erreur (pour pouvoir le rapporter sans ouvrir la console) + un bouton
// Recharger. Les erreurs de « chunk » (fréquentes juste après un déploiement,
// quand le navigateur a de vieux fichiers en cache) déclenchent un rechargement
// automatique unique.
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isChunk = /ChunkLoadError|Loading chunk|Importing a module script failed|dynamically imported module/i.test(`${error?.name} ${error?.message}`)

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app error boundary]', error)
    if (isChunk) {
      try {
        if (!sessionStorage.getItem('thw_chunk_reloaded')) {
          sessionStorage.setItem('thw_chunk_reloaded', '1')
          location.reload()
        }
      } catch { /* ignore */ }
    }
  }, [error, isChunk])

  const hardReload = () => {
    try { sessionStorage.removeItem('thw_chunk_reloaded') } catch { /* ignore */ }
    location.reload()
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg, #0b0b0f)', color: 'var(--text, #e8e8ea)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
          {isChunk ? 'Mise à jour de l’application…' : 'Une erreur est survenue'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid, #9aa0a6)', margin: '0 0 18px', lineHeight: 1.5 }}>
          {isChunk
            ? 'Une nouvelle version vient d’être déployée. Rechargement en cours…'
            : 'Recharge la page. Si le problème persiste, copie le message ci-dessous et envoie-le.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => reset()} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border, #26262b)', background: 'var(--bg-card, #16161a)', color: 'var(--text, #e8e8ea)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Réessayer</button>
          <button onClick={hardReload} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: 'var(--primary, #06B6D4)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Recharger</button>
        </div>
        {!isChunk && (error?.message || error?.digest) && (
          <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-dim, #6b7075)', background: 'var(--bg-alt, #101014)', border: '1px solid var(--border, #26262b)', borderRadius: 10, padding: '10px 12px', maxHeight: 200, overflow: 'auto' }}>
            {error?.message || ''}{error?.digest ? `\n\n[digest] ${error.digest}` : ''}
          </pre>
        )}
      </div>
    </div>
  )
}
