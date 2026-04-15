'use client'

// ══════════════════════════════════════════════════════════════
// AI ASSISTANT BUTTON
// Bouton flottant fixe en haut à droite de chaque page.
// Ouvre le drawer contextuel AIAssistantDrawer.
// ══════════════════════════════════════════════════════════════

import { useState, useId } from 'react'
import dynamic from 'next/dynamic'
import type { PageAgent } from './agentConfig'

// Lazy load le drawer (évite d'alourdir le bundle initial)
const AIAssistantDrawer = dynamic(() => import('./AIAssistantDrawer'), { ssr: false })

interface Props {
  agent: PageAgent
  context?: Record<string, unknown>
}

function AILogoBtn({ size = 18 }: { size?: number }) {
  const uid = useId().replace(/:/g, '')
  const gid = `aibtn-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c8e0" />
          <stop offset="100%" stopColor="#5b6fff" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L22 19H2L12 2Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="9" r="1.4" fill={`url(#${gid})`} />
      <circle cx="8.5" cy="16" r="1.2" fill={`url(#${gid})`} opacity="0.7" />
      <circle cx="15.5" cy="16" r="1.2" fill={`url(#${gid})`} opacity="0.7" />
      <line x1="12" y1="9" x2="8.5" y2="16" stroke={`url(#${gid})`} strokeWidth="1" opacity="0.5" />
      <line x1="12" y1="9" x2="15.5" y2="16" stroke={`url(#${gid})`} strokeWidth="1" opacity="0.5" />
      <line x1="8.5" y1="16" x2="15.5" y2="16" stroke={`url(#${gid})`} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export default function AIAssistantButton({ agent, context }: Props) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Assistant IA"
        style={{
          position: 'fixed',
          top: 14,
          right: 20,
          zIndex: 997,
          width: 36,
          height: 36,
          borderRadius: 10,
          border: '1px solid',
          borderColor: hovered || open
            ? 'rgba(91,111,255,0.5)'
            : 'rgba(91,111,255,0.2)',
          background: hovered || open
            ? 'linear-gradient(135deg,rgba(0,200,224,0.15),rgba(91,111,255,0.2))'
            : 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.34,1.1,0.64,1)',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          boxShadow: open
            ? '0 0 0 3px rgba(91,111,255,0.2), 0 4px 16px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <AILogoBtn size={18} />
      </button>

      {/* Drawer */}
      <AIAssistantDrawer
        open={open}
        onClose={() => setOpen(false)}
        agent={agent}
        context={context}
      />
    </>
  )
}
