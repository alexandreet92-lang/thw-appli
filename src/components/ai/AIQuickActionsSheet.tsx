'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  open: boolean; onClose: () => void; isMobile: boolean
  onCamera: () => void; onPhotos: () => void; onFiles: () => void
  onPrepare: (label: string, apiPrompt: string) => void
  onEnriched: (id: string, label: string) => void
  onFlow: (f: string) => void
}

const CATS = [
  { label: 'Entrainement', items: [{ label: 'Creer une seance', flow: 'sessionbuilder' }, { label: 'Training Analyse', flow: 'analyze_training' }, { label: 'Analyser ma semaine', flow: 'analyser_semaine' }] },
  { label: 'Competition',  items: [{ label: 'Strategie de course', flow: 'strategie_course' }] },
  { label: 'Nutrition',    items: [{ label: 'Creer un plan nutritionnel', flow: 'nutrition' }, { label: 'Recharge glucidique', flow: 'recharge' }] },
  { label: 'Recuperation', items: [{ label: 'Analyser ma recuperation', flow: 'analyser_recuperation' }, { label: 'Conseils sommeil', flow: 'conseils_sommeil' }] },
  { label: 'Performance',  items: [{ label: 'Analyser ma progression', flow: 'analyser_progression' }, { label: 'Analyser un test', flow: 'analyzetest' }, { label: 'Estimer mes zones', flow: 'estimer_zones' }] },
  { label: 'Application',  items: [{ label: "Comprendre l'application", flow: 'app_guide' }] },
]

export default function AIQuickActionsSheet({ open, onClose, isMobile, onCamera, onPhotos, onFiles, onFlow }: Props) {
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
    { label: 'Photos',   onClick: () => { onClose(); setTimeout(onPhotos, 80) }, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
    { label: 'Fichiers', onClick: () => { onClose(); setTimeout(onFiles, 80) },  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 12v6M9 15h6"/></svg> },
    ...(isMobile ? [{ label: 'Camera', onClick: () => { onClose(); setTimeout(onCamera, 80) }, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> }] : []),
  ]

  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 30 }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
      <div ref={ref} style={{ background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: '14px 14px 0 0', boxShadow: '0 -12px 40px rgba(0,0,0,0.22)', maxHeight: '72vh', overflowY: 'auto', padding: '0 0 8px', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 14px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ai-border)' }} />
        </div>
        <div style={{ padding: '0 14px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 4px 10px' }}>Joindre</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${attachCards.length},1fr)`, gap: 10 }}>
            {attachCards.map(card => (
              <button key={card.label} onClick={card.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 8px', borderRadius: 16, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', cursor: 'pointer', color: 'var(--ai-text)' }}>
                {card.icon}<span style={{ fontSize: 11, fontWeight: 600 }}>{card.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--ai-border)', margin: '0 14px 8px' }} />
        {CATS.map((cat, ci) => (
          <div key={ci}>
            <div style={{ padding: '4px 18px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)' }}>{cat.label}</div>
            {cat.items.map((item, ii) => (
              <button key={ii} onClick={() => { onClose(); onFlow(item.flow) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: 'var(--ai-text)' }}>
                {item.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
            {ci < CATS.length - 1 && <div style={{ height: 1, background: 'var(--ai-border)', margin: '6px 14px' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
