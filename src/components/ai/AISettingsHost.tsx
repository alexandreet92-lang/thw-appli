'use client'

// ══════════════════════════════════════════════════════════════
// AISettingsHost — hôte UNIQUE de la fenêtre de réglages IA.
// ──────────────────────────────────────────────────────────────
// Plusieurs AIPanel sont montés en même temps (DesktopShell + MobileShell,
// bouton flottant…). Si chacun rendait sa propre fenêtre de réglages via un
// portail, on obtenait 2-3 fonds empilés → il fallait cliquer plusieurs fois
// pour sortir. On centralise ici : monté une seule fois (layout), il écoute
// l'événement « thw:open-ai-settings » et n'affiche QU'UNE fenêtre.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { SettingsSection } from './AISettingsModal'

// Chargé à la demande : le code de la fenêtre n'est téléchargé qu'à l'ouverture.
const AISettingsModal = dynamic(() => import('./AISettingsModal'), { ssr: false })

export function AISettingsHost() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<SettingsSection>('profil')

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { section?: SettingsSection } | undefined
      setSection(detail?.section ?? 'profil')
      setOpen(true)
    }
    window.addEventListener('thw:open-ai-settings', onOpen)
    return () => window.removeEventListener('thw:open-ai-settings', onOpen)
  }, [])

  if (!open) return null
  return <AISettingsModal open={open} initialSection={section} onClose={() => setOpen(false)} />
}

export default AISettingsHost
