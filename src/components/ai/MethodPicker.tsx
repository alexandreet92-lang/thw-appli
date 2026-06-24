'use client'

// ══════════════════════════════════════════════════════════════
// MethodPicker — sélecteur de méthode d'entraînement dans le composer.
// Navigation à 2 niveaux : 1) Automatique + 3 sports (Cyclisme / Running /
// Triathlon) → 2) liste des méthodes du sport choisi.
// Couleurs neutres (tokens app), pas de bleu sauf la pastille active.
// Dropdown (desktop) / bottom sheet (mobile, via MobileSheet).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { MobileSheet } from './MobileSheet'
import { methodsForSport, methodById, type MethodSport } from '@/lib/coach/methods'

const SPORTS: { id: MethodSport; label: string }[] = [
  { id: 'cyclisme', label: 'Cyclisme' },
  { id: 'running', label: 'Running' },
  { id: 'triathlon', label: 'Triathlon' },
]

function MethodGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 19V13M12 19V8M19 19V5" />
    </svg>
  )
}

const Chevron = ({ dir = 'right' }: { dir?: 'right' | 'left' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'right' ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
  </svg>
)

export function MethodPicker({ method, onChange, disabled = false, isMobile = false }: {
  method: string
  onChange: (m: string) => void
  disabled?: boolean
  isMobile?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'sports' | MethodSport>('sports')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || isMobile) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, isMobile])

  const current = methodById(method)
  const label = current ? current.name : 'Auto'

  const close = () => { setOpen(false); setView('sports') }

  const rowBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: isMobile ? '12px 12px' : '9px 12px', border: 'none', borderRadius: 10,
    background: 'transparent', cursor: 'pointer', textAlign: 'left',
  }
  const hoverOn = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)' }
  const hoverOff = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }

  // ── Niveau 1 : Automatique + 3 sports ──────────────────────
  const sportsView = (
    <>
      <button
        onClick={() => { onChange('auto'); close() }}
        style={{ ...rowBase, background: method === 'auto' ? 'var(--bg-alt)' : 'transparent' }}
        onMouseEnter={hoverOn} onMouseLeave={e => { if (method !== 'auto') hoverOff(e) }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>Automatique</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>L&apos;IA choisit la méthode selon tes données</div>
        </div>
        {method === 'auto' && <Check />}
      </button>
      <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />
      {SPORTS.map(s => (
        <button key={s.id} onClick={() => setView(s.id)} style={rowBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>{s.label}</span>
          <span style={{ color: 'var(--text-dim)' }}><Chevron /></span>
        </button>
      ))}
    </>
  )

  // ── Niveau 2 : méthodes du sport choisi ─────────────────────
  const methodsView = (sport: MethodSport) => (
    <>
      <button onClick={() => setView('sports')} style={{ ...rowBase, gap: 8 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <span style={{ color: 'var(--text-mid)', display: 'flex' }}><Chevron dir="left" /></span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>
          {SPORTS.find(s => s.id === sport)?.label}
        </span>
      </button>
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px 6px' }} />
      {methodsForSport(sport).map(m => {
        const isA = method === m.id
        return (
          <button
            key={m.id}
            onClick={() => { onChange(m.id); close() }}
            style={{ ...rowBase, background: isA ? 'var(--bg-alt)' : 'transparent' }}
            onMouseEnter={hoverOn} onMouseLeave={e => { if (!isA) hoverOff(e) }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: isA ? 700 : 600, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>{m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1, lineHeight: 1.35 }}>{m.short}</div>
            </div>
            {isA && <Check />}
          </button>
        )
      })}
    </>
  )

  const content = view === 'sports' ? sportsView : methodsView(view)

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => { if (!disabled) { setView('sports'); setOpen(o => !o) } }}
        title={current ? `Méthode : ${current.name}` : 'Méthode d\'entraînement'}
        className="aip-icon-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px', borderRadius: 8,
          color: 'var(--ai-mid)', cursor: disabled ? 'default' : 'pointer', maxWidth: 120,
        }}
      >
        <MethodGlyph size={13} />
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Syne,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </button>

      {open && (isMobile ? (
        <MobileSheet title="Méthode d'entraînement" onClose={close}>{content}</MobileSheet>
      ) : (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)', overflowY: 'auto', maxHeight: '60vh',
          width: 264, zIndex: 50, padding: 6, color: 'var(--text)', animation: 'ai_slidein_center 0.14s ease',
        }}>
          {content}
        </div>
      ))}
    </div>
  )
}

const Check = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3C90D5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
)
