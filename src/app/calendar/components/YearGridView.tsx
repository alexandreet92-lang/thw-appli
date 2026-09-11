'use client'
// ════════════════════════════════════════════════════════════════════
// YearGridView — vue annuelle façon calendrier iOS (image 2) : 3 colonnes de
// 12 mini-mois. Mois courant en rouge, jour du jour en pastille rouge, jours
// portant un objectif colorés selon l'importance (interconnexion). Au tap sur
// un mois : animation de zoom (le mois grossit, les autres s'effacent) puis
// bascule vers la vue mensuelle.
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Race, RaceStage, MONTHS, RACE_CFG, getDaysInMonth, getFirstDayISO } from './types'

interface Props {
  year: number
  races: Race[]
  stages: RaceStage[]
  onMonthClick: (month: number) => void
}

const RED = '#ef4444' // design-allow-color (aujourd'hui / mois courant, façon iOS)

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function YearGridView({ year, races, stages, onMonthClick }: Props) {
  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()
  const todayISO = iso(curYear, curMonth, now.getDate())
  const [zooming, setZooming] = useState<number | null>(null)

  // Couleur d'objectif d'un jour donné (importance course, sinon stage bleu).
  const dayColor = (ds: string): string | null => {
    const r = races.find(x => x.date <= ds && (x.endDate || x.date) >= ds)
    if (r) return r.level === 'gty' ? RED : RACE_CFG[r.level].color
    const s = stages.find(x => x.startDate <= ds && x.endDate >= ds)
    if (s) return 'var(--cat-pro)'
    return null
  }

  const handleClick = (mi: number) => {
    setZooming(mi)
    setTimeout(() => onMonthClick(mi), 250)
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
      padding: '4px 2px',
    }}>
      {MONTHS.map((name, mi) => {
        const isCurrent = mi === curMonth && year === curYear
        const dim = getDaysInMonth(year, mi)
        const lead = getFirstDayISO(year, mi) - 1
        const zoomingThis = zooming === mi
        return (
          <button
            key={mi}
            onClick={() => handleClick(mi)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
              transformOrigin: 'center center',
              transform: zoomingThis ? 'scale(2.3)' : 'scale(1)',
              // Le mois choisi grossit (reste visible), les autres s'effacent.
              opacity: zooming == null ? 1 : (zoomingThis ? 1 : 0),
              transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1), opacity 0.26s ease',
              zIndex: zoomingThis ? 2 : 1, position: 'relative',
              pointerEvents: zooming == null ? 'auto' : 'none',
            }}
          >
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 6,
              color: isCurrent ? RED : 'var(--text)', fontFamily: 'Syne, sans-serif',
            }}>
              {name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
              {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
              {Array.from({ length: dim }, (_, i) => {
                const day = i + 1
                const ds = iso(year, mi, day)
                const isToday = ds === todayISO
                const c = dayColor(ds)
                return (
                  <span key={day} style={{
                    height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9.5, lineHeight: 1,
                    fontWeight: isToday || c ? 700 : 400,
                    borderRadius: '50%',
                    background: isToday ? RED : 'transparent',
                    color: isToday ? '#fff' : c ?? 'var(--text-mid)', // design-allow-color (#fff sur pastille)
                  }}>
                    {day}
                  </span>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
