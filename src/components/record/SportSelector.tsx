'use client'
import { useEffect, useState } from 'react'

export type SportId = 'cycling' | 'running' | 'trail' | 'strength' | 'hyrox' | 'rowing'

interface Sport {
  id: SportId
  label: string
  color: string         // accent border-on-hover
  bg: string            // hover background tint
  icon: React.ReactNode
}

const SPORTS: Sport[] = [
  { id: 'cycling',  label: 'Vélo',    color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  icon: BikeIcon() },
  { id: 'running',  label: 'Running', color: '#f97316', bg: 'rgba(249,115,22,0.10)',  icon: RunIcon() },
  { id: 'trail',    label: 'Trail',   color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   icon: MountainIcon() },
  { id: 'strength', label: 'Muscu',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  icon: DumbbellIcon() },
  { id: 'hyrox',    label: 'Hyrox',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   icon: FireIcon() },
  { id: 'rowing',   label: 'Aviron',  color: '#14b8a6', bg: 'rgba(20,184,166,0.10)',  icon: RowIcon() },
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
          background: 'rgba(0,0,0,0.40)',
          backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms',
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
                color: 'var(--text)',
                cursor: 'pointer',
                transition: 'background-color 120ms, border-color 120ms, transform 120ms',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = s.bg
                el.style.borderColor = s.color
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'var(--bg-card2)'
                el.style.borderColor = 'var(--border)'
              }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
              onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BikeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
      <path d="M15 6h3l2 4M5.5 17.5l4-7h6l3 7"/>
    </svg>
  )
}
function RunIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="2"/>
      <path d="M4 22l4-6 3-3 3 3v6M11 13l2-4 4 1-1 4-3-1M6 10l2-3 5 1"/>
    </svg>
  )
}
function MountainIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20l5-9 4 6 3-4 6 7H3z"/>
    </svg>
  )
}
function DumbbellIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5L3 10l3.5 3.5M17.5 17.5L21 14l-3.5-3.5M8 8l8 8M5 8l3-3M16 19l3-3"/>
    </svg>
  )
}
function FireIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c1.5 3 4 4 4 7a4 4 0 1 1-8 0c0-1.5 1-2.5 1-4 0 1 1 1.5 1.5 2C11 5 11 3 12 2z"/>
      <path d="M9 14c0 3 1.5 5 3 6 1.5-1 3-3 3-6"/>
    </svg>
  )
}
function RowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="17" cy="5" r="2"/>
      <path d="M3 18l4-2 4 2 5-3 5 3M7 14l4-7 3 2"/>
    </svg>
  )
}
