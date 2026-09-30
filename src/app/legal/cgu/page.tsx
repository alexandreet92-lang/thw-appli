'use client'
import { useEffect } from 'react'

// Le contenu réel des Conditions d'utilisation est servi en statique.
// Redirection CÔTÉ CLIENT (compatible export statique Capacitor : un redirect
// serveur / force-dynamic casse `output: 'export'`).
const DEST = '/site/conditions-utilisation.html'

export default function CguPage() {
  useEffect(() => { window.location.replace(DEST) }, [])
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 14, color: '#64748b' }}>
        Redirection…{' '}
        <a href={DEST} style={{ color: 'var(--primary)', fontWeight: 600 }}>Ouvrir les Conditions d’utilisation</a>
      </p>
    </main>
  )
}
