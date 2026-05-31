'use client'
import { useEffect, useRef, useState } from 'react'
import { AgentIcon } from './AgentIcon'
import type { AgentId } from './AgentIcon'

interface Props {
  open: boolean
  onClose: () => void
  onInject: (prompt: string, agent: string) => void
  isMobile?: boolean
  onCamera?: () => void
  onPhotos?: () => void
  onFiles?: () => void
}

const ACTIONS: { label: string; desc: string; agent: AgentId; prompt: string }[] = [
  {
    label: "Creer un plan d'entrainement",
    desc:  'Planification sur mesure selon tes objectifs',
    agent: 'zeus',
    prompt: "Je souhaite creer un plan d'entrainement personnalise. Voici mes objectifs et mon niveau actuel :",
  },
  {
    label: 'Identifier mes points faibles',
    desc:  'Analyse de tes lacunes et axes de progression',
    agent: 'athena',
    prompt: "Analyse mes performances recentes pour identifier mes principaux points faibles et les axes de progression prioritaires.",
  },
  {
    label: 'Creer un plan nutritionnel',
    desc:  'Alimentation adaptee a tes objectifs sportifs',
    agent: 'athena',
    prompt: "Aide-moi a creer un plan nutritionnel adapte a mon profil et mes objectifs sportifs.",
  },
  {
    label: "Comprendre l'application",
    desc:  'Guide des fonctionnalites THW Coach',
    agent: 'hermes',
    prompt: "Explique-moi les principales fonctionnalites de l'application THW Coach et comment en tirer le meilleur parti.",
  },
]

export default function QuickActionsSheet({ open, onClose, onInject, isMobile, onCamera, onPhotos, onFiles }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  if (!open) return null

  const attachItems = [
    { label: 'Photos',   onClick: () => { onClose(); setTimeout(() => onPhotos?.(), 80) } },
    { label: 'Fichiers', onClick: () => { onClose(); setTimeout(() => onFiles?.(), 80) } },
    ...(isMobile ? [{ label: 'Camera', onClick: () => { onClose(); setTimeout(() => onCamera?.(), 80) } }] : []),
  ]

  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 30 }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
      <div
        ref={ref}
        style={{
          background: 'var(--aiq-bg)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
          maxHeight: '72vh',
          overflowY: 'auto',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 10px' }}>
            Joindre
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {attachItems.map(item => (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12,
                  background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)',
                  cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--ai-text)',
                  fontFamily: 'DM Sans,sans-serif',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-border)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px 4px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
            Actions rapides
          </p>
        </div>

        {ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => { onInject(action.prompt, action.agent); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '10px 16px',
              border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'DM Sans,sans-serif',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <AgentIcon agent={action.agent} size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--ai-text)' }}>{action.label}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--ai-dim)' }}>{action.desc}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ai-dim)' }}/>
            </svg>
          </button>
        ))}
        <div style={{ height: 12 }} />
      </div>
    </div>
  )
}
