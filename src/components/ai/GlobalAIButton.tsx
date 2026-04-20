'use client'

// ══════════════════════════════════════════════════════════════
// GLOBAL AI BUTTON
// Bouton Coach IA flottant — visible sur toutes les pages sauf /profile.
// S'insère dans le layout root ; utilise createPortal via AIPanel.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const AIPanel = dynamic(() => import('./AIPanel'), { ssr: false })

export default function GlobalAIButton() {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  // Caché sur la page profil (le bouton IA y est inutile)
  if (pathname === '/profile') return null

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Ouvrir Coach IA"
        style={{
          position:    'fixed',
          bottom:      24,
          right:       24,
          zIndex:      90,
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          padding:     '9px 16px 9px 12px',
          borderRadius: 14,
          border:      `1px solid ${open ? 'rgba(91,111,255,0.55)' : 'rgba(91,111,255,0.22)'}`,
          background:  open
            ? 'linear-gradient(135deg,rgba(0,200,224,0.18),rgba(91,111,255,0.25))'
            : 'var(--nav-bg)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          cursor:      'pointer',
          boxShadow:   open
            ? '0 0 0 3px rgba(91,111,255,0.13), 0 8px 32px rgba(0,0,0,0.22)'
            : '0 4px 20px rgba(0,0,0,0.18)',
          transition:  'all 0.18s',
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="THW Coach"
          style={{ height: 20, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />

        {/* Label */}
        <span style={{
          fontFamily:  'DM Sans, sans-serif',
          fontSize:    13,
          fontWeight:  600,
          background:  'linear-gradient(90deg,#00c8e0,#5b6fff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          whiteSpace:  'nowrap',
          letterSpacing: '0.01em',
        }}>
          Coach IA
        </span>
      </button>

      <AIPanel
        open={open}
        onClose={() => setOpen(false)}
        initialAgent="planning"
      />
    </>
  )
}
