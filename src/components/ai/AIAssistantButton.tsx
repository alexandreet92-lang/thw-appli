'use client'

// ══════════════════════════════════════════════════════════════
// AI ASSISTANT BUTTON — inline dans l'en-tête de chaque page
// Ouvre AIPanel (nouveau design premium).
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { PageAgent } from './agentConfig'

const AIPanel = dynamic(() => import('./AIPanel'), { ssr: false })

interface Props {
  agent: PageAgent
  context?: Record<string, unknown>
}

export default function AIAssistantButton({ agent, context }: Props) {
  const [open, setOpen]       = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <>
      {/* ── Bouton inline ── */}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Coach IA"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 12px 6px 8px',
          borderRadius: 10,
          border: '1px solid',
          borderColor: open
            ? 'rgba(91,111,255,0.55)'
            : hovered
            ? 'rgba(91,111,255,0.35)'
            : 'rgba(91,111,255,0.18)',
          background: open
            ? 'linear-gradient(135deg,rgba(0,200,224,0.15),rgba(91,111,255,0.20))'
            : hovered
            ? 'linear-gradient(135deg,rgba(0,200,224,0.08),rgba(91,111,255,0.12))'
            : 'linear-gradient(135deg,rgba(0,200,224,0.04),rgba(91,111,255,0.06))',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.16s',
          boxShadow: open
            ? '0 0 0 3px rgba(91,111,255,0.12), 0 2px 10px rgba(91,111,255,0.18)'
            : 'none',
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="THW Coach"
          style={{
            height: 20,
            width: 'auto',
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        {/* Label */}
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          background: 'linear-gradient(90deg,#00c8e0,#5b6fff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          whiteSpace: 'nowrap' as const,
          letterSpacing: '0.01em',
        }}>
          Coach IA
        </span>
      </button>

      {/* ── Panel ── */}
      <AIPanel
        open={open}
        onClose={() => setOpen(false)}
        initialAgent={agent}
        context={context}
      />
    </>
  )
}
