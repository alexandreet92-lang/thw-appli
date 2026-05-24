'use client'
import { useEffect, useState } from 'react'

export type SportId = 'cycling' | 'running' | 'trail' | 'strength' | 'hyrox' | 'rowing'

interface Sport {
  id: SportId
  label: string
  icon: React.ReactNode
}

const SPORTS: Sport[] = [
  { id: 'cycling',  label: 'Vélo',    icon: BikeIcon() },
  { id: 'running',  label: 'Running', icon: RunIcon() },
  { id: 'trail',    label: 'Trail',   icon: MountainIcon() },
  { id: 'strength', label: 'Muscu',   icon: DumbbellIcon() },
  { id: 'hyrox',    label: 'Hyrox',   icon: FireIcon() },
  { id: 'rowing',   label: 'Aviron',  icon: RowIcon() },
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
    <div className="fixed inset-0 z-[1100] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200
                    ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-[520px]
                    bg-[var(--bg)] border-t border-[var(--border)]
                    rounded-t-3xl
                    pb-[max(20px,env(safe-area-inset-bottom))]
                    transition-transform duration-[280ms] ease-out
                    ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 rounded-full bg-foreground/15" />
        </div>
        <h2 className="text-base font-semibold text-center pt-3 pb-4 text-[var(--text)]">
          Choisir un sport
        </h2>
        <div className="grid grid-cols-3 gap-2.5 px-4">
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="bg-[var(--bg-card)] rounded-2xl p-4 flex flex-col items-center gap-2
                         border border-[var(--border)]
                         hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/20
                         transition-colors min-h-[90px]"
            >
              <span className="text-[var(--text)]">{s.icon}</span>
              <span className="text-sm font-medium text-[var(--text)]">{s.label}</span>
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
