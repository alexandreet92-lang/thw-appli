'use client'
// Frontière d'erreur au niveau des pages : au lieu d'un écran blanc « Application
// error » cryptique, on affiche un écran de récupération lisible AVEC le message
// d'erreur (pour pouvoir le rapporter sans ouvrir la console) + un bouton
// Recharger. Les erreurs de « chunk » (fréquentes juste après un déploiement,
// quand le navigateur a de vieux fichiers en cache) déclenchent un rechargement
// automatique unique.
import { useEffect } from 'react'

// Écran de récupération : la frontière d'erreur peut se déclencher avant que le
// provider i18n ne soit monté (ex. erreur de chunk après déploiement). On lit donc
// la langue directement depuis localStorage ('thw-lang'), sans hook.
const ERR_TXT: Record<string, Record<string, string>> = {
  fr: { updating: 'Mise à jour de l’application…', error: 'Une erreur est survenue',
    deployed: 'Une nouvelle version vient d’être déployée. Rechargement en cours…',
    reload_hint: 'Recharge la page. Si le problème persiste, copie le message ci-dessous et envoie-le.',
    retry: 'Réessayer', reload: 'Recharger' },
  en: { updating: 'Updating the app…', error: 'Something went wrong',
    deployed: 'A new version was just deployed. Reloading…',
    reload_hint: 'Reload the page. If the problem persists, copy the message below and send it.',
    retry: 'Try again', reload: 'Reload' },
  es: { updating: 'Actualizando la aplicación…', error: 'Se produjo un error',
    deployed: 'Se acaba de desplegar una nueva versión. Recargando…',
    reload_hint: 'Recarga la página. Si el problema persiste, copia el mensaje de abajo y envíalo.',
    retry: 'Reintentar', reload: 'Recargar' },
}
function errTxt(): Record<string, string> {
  let l = 'fr'
  try { const v = localStorage.getItem('thw-lang'); if (v === 'en' || v === 'es') l = v } catch { /* ignore */ }
  return ERR_TXT[l] ?? ERR_TXT.fr
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isChunk = /ChunkLoadError|Loading chunk|Importing a module script failed|dynamically imported module/i.test(`${error?.name} ${error?.message}`)
  const tx = errTxt()

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
          {isChunk ? tx.updating : tx.error}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid, #9aa0a6)', margin: '0 0 18px', lineHeight: 1.5 }}>
          {isChunk ? tx.deployed : tx.reload_hint}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => reset()} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border, #26262b)', background: 'var(--bg-card, #16161a)', color: 'var(--text, #e8e8ea)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{tx.retry}</button>
          <button onClick={hardReload} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: 'var(--primary, #06B6D4)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{tx.reload}</button>
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
