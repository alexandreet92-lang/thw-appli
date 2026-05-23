'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onInject: (prompt: string, agent: string) => void
  isMobile?: boolean
  onCamera?: () => void
  onPhotos?: () => void
  onFiles?: () => void
}

const ACTIONS = [
  { label: "Creer un plan d'entrainement", desc: 'Planification sur mesure selon tes objectifs', agent: 'zeus',   prompt: "Je souhaite creer un plan d'entrainement personnalise. Voici mes objectifs et mon niveau actuel :" },
  { label: 'Identifier mes points faibles', desc: 'Analyse de tes lacunes et axes de progression', agent: 'athena', prompt: "Analyse mes performances recentes pour identifier mes principaux points faibles et les axes de progression prioritaires." },
  { label: 'Creer un plan nutritionnel',    desc: 'Alimentation adaptee a tes objectifs sportifs', agent: 'athena', prompt: "Aide-moi a creer un plan nutritionnel adapte a mon profil et mes objectifs sportifs." },
  { label: "Comprendre l'application",      desc: 'Guide des fonctionnalites THW Coach',           agent: 'hermes', prompt: "Explique-moi les principales fonctionnalites de l'application THW Coach et comment en tirer le meilleur parti." },
]

export default function AIQuickActionsSheet({ open, onClose, onInject, isMobile, onCamera, onPhotos, onFiles }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  if (!open) return null

  const attachCards = [
    { label: 'Photos',   onClick: () => { onClose(); setTimeout(() => onPhotos?.(), 80) }, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
    { label: 'Fichiers', onClick: () => { onClose(); setTimeout(() => onFiles?.(), 80) },  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 12v6M9 15h6"/></svg> },
    ...(isMobile ? [{ label: 'Camera', onClick: () => { onClose(); setTimeout(() => onCamera?.(), 80) }, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> }] : []),
  ]

  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 30 }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
      <div ref={ref} style={{ background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: '14px 14px 0 0', boxShadow: '0 -12px 40px rgba(0,0,0,0.22)', maxHeight: '72vh', overflowY: 'auto', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 14px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ai-border)' }} />
        </div>

        <div style={{ padding: '0 14px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 4px 10px' }}>Joindre</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${attachCards.length},1fr)`, gap: 10 }}>
            {attachCards.map(card => (
              <button key={card.label} onClick={card.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 8px', borderRadius: 14, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', cursor: 'pointer', color: 'var(--ai-text)' }}>
                {card.icon}
                <span style={{ fontSize: 11, fontWeight: 600 }}>{card.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--ai-border)', margin: '0 14px 8px' }} />
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '4px 18px 8px' }}>Actions rapides</p>

        {ACTIONS.map((action, i) => (
          <button key={i} onClick={() => { onInject(action.prompt, action.agent) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans,sans-serif' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ai-text)', fontWeight: 500 }}>{action.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ai-dim)', marginTop: 1 }}>{action.desc}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ))}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
