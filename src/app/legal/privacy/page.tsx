'use client'
import { useEffect } from 'react'

// Le contenu réel de la Politique de confidentialité est servi en statique.
// Redirection CÔTÉ CLIENT (compatible export statique Capacitor).
const DEST = '/site/confidentialite.html'

export default function PrivacyPage() {
  useEffect(() => { window.location.replace(DEST) }, [])
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'var(--font-body)' }}>
      <p style={{ fontSize: 14, color: '#64748b' }}>
        Redirection…{' '}
        <a href={DEST} style={{ color: 'var(--primary)', fontWeight: 600 }}>Ouvrir la Politique de confidentialité</a>
      </p>
    </main>
  )
}
