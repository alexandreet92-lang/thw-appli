'use client'

// ══════════════════════════════════════════════════════════════
// AI ASSISTANT BUTTON — inline, positionné dans l'en-tête page
// Ouvre le drawer contextuel AIAssistantDrawer.
// ══════════════════════════════════════════════════════════════

import { useState, useId } from 'react'
import dynamic from 'next/dynamic'
import type { PageAgent } from './agentConfig'
import { AGENT_CONFIGS } from './agentConfig'

const AIAssistantDrawer = dynamic(() => import('./AIAssistantDrawer'), { ssr: false })

interface Props {
  agent: PageAgent
  context?: Record<string, unknown>
}

function AILogo({ size = 20 }: { size?: number }) {
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
      {/* Triangle */}
      <path d="M12 3L21 18H3L12 3Z" stroke={`url(#${gid})`} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      {/* Nœuds */}
      <circle cx="12" cy="9.5" r="1.5" fill={`url(#${gid})`} />
      <circle cx="8.5"  cy="16" r="1.2" fill={`url(#${gid})`} opacity="0.75" />
      <circle cx="15.5" cy="16" r="1.2" fill={`url(#${gid})`} opacity="0.75" />
      {/* Lignes de connexion */}
      <line x1="12"  y1="9.5" x2="8.5"  y2="16" stroke={`url(#${gid})`} strokeWidth="0.9" opacity="0.45" />
      <line x1="12"  y1="9.5" x2="15.5" y2="16" stroke={`url(#${gid})`} strokeWidth="0.9" opacity="0.45" />
      <line x1="8.5" y1="16"  x2="15.5" y2="16" stroke={`url(#${gid})`} strokeWidth="0.9" opacity="0.45" />
    </svg>
  )
}

export default function AIAssistantButton({ agent, context }: Props) {
  const [open, setOpen]       = useState(false)
  const [hovered, setHovered] = useState(false)
  const config = AGENT_CONFIGS[agent]

  return (
    <>
      {/* ── Bouton inline ── */}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`Ouvrir ${config.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px 8px 10px',
          borderRadius: 12,
          border: '1px solid',
          borderColor: open
            ? 'rgba(91,111,255,0.6)'
            : hovered
            ? 'rgba(91,111,255,0.4)'
            : 'rgba(91,111,255,0.2)',
          background: open
            ? 'linear-gradient(135deg,rgba(0,200,224,0.18),rgba(91,111,255,0.22))'
            : hovered
            ? 'linear-gradient(135deg,rgba(0,200,224,0.10),rgba(91,111,255,0.14))'
            : 'linear-gradient(135deg,rgba(0,200,224,0.05),rgba(91,111,255,0.08))',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.18s',
          boxShadow: open
            ? '0 0 0 3px rgba(91,111,255,0.15), 0 2px 12px rgba(91,111,255,0.2)'
            : 'none',
        }}
      >
        <AILogo size={20} />
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          background: 'linear-gradient(90deg,#00c8e0,#5b6fff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          whiteSpace: 'nowrap' as const,
        }}>
          IA
        </span>
      </button>

      {/* ── Drawer ── */}
      <AIAssistantDrawer
        open={open}
        onClose={() => setOpen(false)}
        agent={agent}
        context={context}
      />
    </>
  )
}
