'use client'
import { useEffect, useState } from 'react'

export type SportId =
  | 'cycling' | 'mtb'
  | 'running' | 'trail' | 'hiking'
  | 'strength' | 'hyrox'
  | 'rowing' | 'swim'

// ── Icons (déclarés AVANT SPORT_CATEGORIES — leçon TDZ V2) ────
const stroke = {
  stroke: 'currentColor', strokeWidth: 1.6, fill: 'none' as const,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
function BikeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="5.5" cy="17.5" r="3.5" {...stroke}/>
      <circle cx="18.5" cy="17.5" r="3.5" {...stroke}/>
      <path d="M15 6h3l2 4M5.5 17.5l4-7h6l3 7" {...stroke}/>
    </svg>
  )
}
function MtbIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="5" cy="18" r="3" {...stroke}/>
      <circle cx="19" cy="18" r="3" {...stroke}/>
      <path d="M5 18l5-9 4 5 5-4M9 9h4l1 5" {...stroke}/>
      <circle cx="14" cy="6" r="1.2" {...stroke}/>
    </svg>
  )
}
function RunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="16" cy="4" r="2" {...stroke}/>
      <path d="M13 7l-3 3-3 6h3l2-3 3 2 2 5h2l-3-6-3-2 1-3 3 2h3" {...stroke}/>
    </svg>
  )
}
function TrailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M3 21l6-12 4 7 3-4 5 9z" {...stroke}/>
      <path d="M8 13h6" {...stroke}/>
    </svg>
  )
}
function HikingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="13" cy="4" r="1.5" {...stroke}/>
      <path d="M10 8l-1 6 3 2v6M12 13l4-1 3 4" {...stroke}/>
      <path d="M6 22l3-1" {...stroke}/>
    </svg>
  )
}
function StrengthIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M2 12h2M20 12h2M5 12h14" {...stroke}/>
      <rect x="4" y="9" width="3" height="6" rx="0.8" {...stroke}/>
      <rect x="17" y="9" width="3" height="6" rx="0.8" {...stroke}/>
    </svg>
  )
}
function HyroxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M5 20L12 4l7 16" {...stroke}/>
      <path d="M9 14h6" {...stroke}/>
      <circle cx="12" cy="10" r="1.6" {...stroke}/>
    </svg>
  )
}
function RowingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M3 17c3-3 7-3 9 0s7 3 9 0" {...stroke}/>
      <path d="M12 17V7" {...stroke}/>
      <path d="M9 7h6" {...stroke}/>
    </svg>
  )
}
function SwimIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" {...stroke}/>
      <path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" {...stroke}/>
      <circle cx="17" cy="7" r="1.6" {...stroke}/>
      <path d="M8 10l4-2 3 3" {...stroke}/>
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────
interface Sport {
  id: SportId
  label: string
  icon: React.ReactNode
}

const SPORT_CATEGORIES: { name: string; sports: Sport[] }[] = [
  {
    name: 'Sports sur roues',
    sports: [
      { id: 'cycling', label: 'Vélo',  icon: <BikeIcon /> },
      { id: 'mtb',     label: 'VTT',   icon: <MtbIcon /> },
    ],
  },
  {
    name: 'Sports à pied',
    sports: [
      { id: 'running', label: 'Course à pied', icon: <RunIcon /> },
      { id: 'trail',   label: 'Trail',         icon: <TrailIcon /> },
      { id: 'hiking',  label: 'Randonnée',     icon: <HikingIcon /> },
    ],
  },
  {
    name: 'Musculation & fitness',
    sports: [
      { id: 'strength', label: 'Musculation', icon: <StrengthIcon /> },
      { id: 'hyrox',    label: 'Hyrox',       icon: <HyroxIcon /> },
    ],
  },
  {
    name: 'Sports nautiques',
    sports: [
      { id: 'rowing', label: 'Aviron',   icon: <RowingIcon /> },
      { id: 'swim',   label: 'Natation', icon: <SwimIcon /> },
    ],
  },
]

const ALL_SPORTS: Sport[] = SPORT_CATEGORIES.flatMap(c => c.sports)
const RECENT_IDS: SportId[] = ['cycling', 'running', 'trail', 'strength', 'swim']
const RECENT_SPORTS = RECENT_IDS.map(id => ALL_SPORTS.find(s => s.id === id)!).filter(Boolean)

// ── Helpers exportés ──────────────────────────────────────────
export function getSportIcon(id: SportId): React.ReactNode {
  return ALL_SPORTS.find(s => s.id === id)?.icon ?? null
}
export function getSportLabel(id: SportId): string {
  return ALL_SPORTS.find(s => s.id === id)?.label ?? id
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  selectedSport: SportId
  onSelect: (sport: SportId) => void
}

export default function SportSelector({ open, onClose, selectedSport, onSelect }: Props) {
  const [closing, setClosing] = useState(false)
  const [search, setSearch] = useState('')
  useEffect(() => {
    if (open) setClosing(false)
    else setSearch('')
  }, [open])
  if (!open) return null

  const ACCENT = '#06B6D4'
  const handleClose = () => { setClosing(true); setTimeout(onClose, 210) }
  const filteredCats = SPORT_CATEGORIES.map(c => ({
    ...c,
    sports: c.sports.filter(s => s.label.toLowerCase().includes(search.toLowerCase())),
  })).filter(c => c.sports.length > 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
          animation: closing ? 'sportsel-fade-out 200ms ease-in forwards'
                             : 'sportsel-fade-in  200ms ease-out forwards',
        }}
      />
      <div
        className={closing ? 'sheet-close' : 'sheet-open'}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          height: '85vh',
          background: 'var(--bg-card)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          willChange: 'transform',
          color: 'var(--text)',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Choisir un sport
          </h2>
          <button
            onClick={handleClose}
            aria-label="Fermer"
            style={{
              color: 'var(--text-dim)', background: 'none', border: 'none',
              fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            background: 'var(--bg-card2)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--border)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#8C8C8C" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="#8C8C8C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              placeholder="Rechercher"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 15, flex: 1,
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>
        </div>

        {/* Recents */}
        {!search && (
          <div style={{
            padding: '0 16px 12px', overflowX: 'auto',
            display: 'flex', gap: 12, flexShrink: 0,
          }}>
            {RECENT_SPORTS.map(sport => {
              const active = selectedSport === sport.id
              return (
                <button
                  key={sport.id}
                  onClick={() => onSelect(sport.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    minWidth: 64, background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  <span style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: active ? ACCENT : 'var(--bg-card2)',
                    border: active ? 'none' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: active ? '#fff' : 'var(--text)',
                  }}>
                    {sport.icon}
                  </span>
                  <span style={{
                    fontSize: 11, lineHeight: 1.2, textAlign: 'center',
                    color: active ? ACCENT : 'var(--text-mid)',
                  }}>
                    {sport.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Liste par catégories */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
          {filteredCats.map(category => (
            <div key={category.name}>
              <p style={{
                fontSize: 12, fontWeight: 700, color: '#8C8C8C',
                padding: '10px 12px 4px', margin: 0,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {category.name}
              </p>
              {category.sports.map(sport => {
                const active = selectedSport === sport.id
                return (
                  <button
                    key={sport.id}
                    onClick={() => onSelect(sport.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderRadius: 10,
                      color: 'var(--text)',
                      textAlign: 'left',
                      transition: 'background-color 100ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                  >
                    <span style={{
                      width: 36, height: 36, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text)', opacity: 0.85,
                    }}>
                      {sport.icon}
                    </span>
                    <span style={{ fontSize: 16, color: 'var(--text)', fontWeight: 400, fontFamily: 'DM Sans, sans-serif' }}>
                      {sport.label}
                    </span>
                    {active && (
                      <svg style={{ marginLeft: 'auto' }} width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 9l4 4 8-8" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          {filteredCats.length === 0 && (
            <p style={{
              textAlign: 'center', color: '#8C8C8C',
              padding: '24px 16px', fontSize: 14,
            }}>
              Aucun sport trouvé
            </p>
          )}
        </div>
      </div>
      <style>{`
        @keyframes sportsel-fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sportsel-fade-out { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  )
}
