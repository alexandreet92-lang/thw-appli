'use client'
import { useEffect, useState } from 'react'

export type SportId = 'cycling' | 'running' | 'trail' | 'strength' | 'hyrox' | 'rowing'

const ACCENT = '#2563EB'

interface Sport {
  id: SportId
  label: string
  icon: React.ReactNode
}

// Note : `stroke` doit être déclaré AVANT `SPORTS` car les fonctions Icon
// le référencent et sont appelées immédiatement dans le tableau SPORTS.
// Sans cet ordre → TDZ ReferenceError au chargement du module (crash client).
const stroke = {
  stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' as const,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

function BikeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="7" cy="20" r="5" {...stroke}/>
      <circle cx="21" cy="20" r="5" {...stroke}/>
      <path d="M7 20l5-10h4l3 10M14 10l2-4h4" {...stroke}/>
      <path d="M7 20l7-10" {...stroke}/>
    </svg>
  )
}
function RunIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="18" cy="4" r="2" {...stroke}/>
      <path d="M15 8l-4 4-4 8h4l2-4 4 2 2 6h3l-3-8-4-2 1-3 3 3h4V8h-4l-4-3z" {...stroke}/>
    </svg>
  )
}
function MountainIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <path d="M4 24L14 6l10 18" {...stroke}/>
      <path d="M9 16h10" {...stroke}/>
      <path d="M14 6v18" {...stroke}/>
    </svg>
  )
}
function DumbbellIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <path d="M2 14h4M22 14h4M6 14h16" {...stroke}/>
      <rect x="5" y="11" width="3" height="6" rx="1" {...stroke}/>
      <rect x="20" y="11" width="3" height="6" rx="1" {...stroke}/>
      <rect x="3" y="12" width="2" height="4" rx="1" {...stroke}/>
      <rect x="23" y="12" width="2" height="4" rx="1" {...stroke}/>
    </svg>
  )
}
function FireIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <path d="M6 22L14 6l8 16" {...stroke}/>
      <path d="M10 16h8" {...stroke}/>
      <circle cx="14" cy="12" r="2" {...stroke}/>
    </svg>
  )
}
function RowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <path d="M4 20c4-4 8-4 12 0s8 4 8 0" {...stroke}/>
      <path d="M14 20V8" {...stroke}/>
      <path d="M10 8h8" {...stroke}/>
    </svg>
  )
}

const SPORTS: Sport[] = [
  { id: 'cycling',  label: 'Vélo',    icon: <BikeIcon /> },
  { id: 'running',  label: 'Running', icon: <RunIcon /> },
  { id: 'trail',    label: 'Trail',   icon: <MountainIcon /> },
  { id: 'strength', label: 'Muscu',   icon: <DumbbellIcon /> },
  { id: 'hyrox',    label: 'Hyrox',   icon: <FireIcon /> },
  { id: 'rowing',   label: 'Aviron',  icon: <RowIcon /> },
]

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (sport: SportId) => void
}

export default function SportSelector({ open, onClose, onSelect }: Props) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0, transition: 'opacity 200ms',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%', maxWidth: 520,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-mid)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>
        <h2 style={{
          margin: 0, padding: '12px 0 16px',
          textAlign: 'center',
          fontFamily: 'Syne, sans-serif',
          fontSize: 18, fontWeight: 700,
          color: 'var(--text)',
        }}>
          Choisir un sport
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          padding: '0 16px',
        }}>
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                background: 'var(--bg-card2)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '14px 8px',
                minHeight: 92,
                display: 'flex', flexDirection: 'column' as const,
                alignItems: 'center', justifyContent: 'center', gap: 8,
                color: ACCENT,
                cursor: 'pointer',
                transition: 'background-color 120ms, border-color 120ms, transform 120ms',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = ACCENT
                el.style.background = 'rgba(37,99,235,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'var(--border)'
                el.style.background = 'var(--bg-card2)'
              }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
              onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              <span style={{ display: 'flex' }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Petit helper pour récupérer l'icône d'un sport par ID (utilisé sur la page record). */
export function getSportIcon(id: SportId): React.ReactNode {
  return SPORTS.find(s => s.id === id)?.icon ?? null
}
export function getSportLabel(id: SportId): string {
  return SPORTS.find(s => s.id === id)?.label ?? id
}
