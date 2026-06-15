'use client'

// ══════════════════════════════════════════════════════════════
// MethodPicker — sélecteur de méthode d'entraînement dans le composer,
// à côté du sélecteur de modèle IA. Petit logo + liste groupée par sport.
// « Automatique » = l'IA choisit selon les données de l'athlète.
// Dropdown (desktop) / bottom sheet (mobile, via MobileSheet).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { MobileSheet } from './MobileSheet'
import { TRAINING_METHODS, methodById, type MethodSport } from '@/lib/coach/methods'

const ACCENT = '#3C90D5'
const SPORTS: { id: MethodSport; label: string }[] = [
  { id: 'cyclisme', label: 'Cyclisme' },
  { id: 'running', label: 'Running' },
  { id: 'triathlon', label: 'Triathlon' },
]

// Petit logo « méthode » : trois barres de périodisation montantes
function MethodGlyph({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 19V13M12 19V8M19 19V5" />
    </svg>
  )
}

export function MethodPicker({ method, onChange, disabled = false, isMobile = false }: {
  method: string
  onChange: (m: string) => void
  disabled?: boolean
  isMobile?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || isMobile) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, isMobile])

  const current = methodById(method)
  const label = current ? current.name : 'Auto'

  const row = (id: string, name: string, sub: string) => {
    const isA = method === id
    return (
      <button
        key={id}
        onClick={() => { onChange(id); setOpen(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%',
          padding: isMobile ? '11px 12px' : '8px 12px', border: 'none', borderRadius: 10,
          background: isA ? 'var(--ai-bg2)' : 'transparent', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => { if (!isA) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
        onMouseLeave={e => { if (!isA) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 13.5 : 12.5, fontWeight: isA ? 700 : 500, color: isA ? 'var(--ai-text)' : 'var(--ai-mid)', fontFamily: 'Syne,sans-serif' }}>{name}</div>
          {sub && <div style={{ fontSize: isMobile ? 11.5 : 10.5, color: 'var(--ai-dim)', marginTop: 1, lineHeight: 1.3 }}>{sub}</div>}
        </div>
        {isA && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
      </button>
    )
  }

  const list = (
    <>
      {row('auto', 'Automatique', "L'IA choisit la méthode selon tes données")}
      {SPORTS.map(s => (
        <div key={s.id}>
          <div style={{ padding: '8px 12px 3px', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif' }}>{s.label}</div>
          {TRAINING_METHODS.filter(m => m.sports.includes(s.id)).map(m => row(m.id, m.name, m.short))}
        </div>
      ))}
    </>
  )

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        title={current ? `Méthode : ${current.name}` : 'Méthode d\'entraînement'}
        className="aip-icon-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px', borderRadius: 8,
          color: method !== 'auto' ? ACCENT : 'var(--ai-dim)', cursor: disabled ? 'default' : 'pointer',
          maxWidth: 120,
        }}
      >
        <MethodGlyph size={13} />
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Syne,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </button>

      {open && (isMobile ? (
        <MobileSheet title="Méthode d'entraînement" onClose={() => setOpen(false)}>{list}</MobileSheet>
      ) : (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 13,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13)', overflowY: 'auto', maxHeight: '60vh',
          width: 256, zIndex: 50, padding: 4, animation: 'ai_slidein 0.14s ease',
        }}>
          {list}
        </div>
      ))}
    </div>
  )
}
