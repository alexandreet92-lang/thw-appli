'use client'

// Élément signature de « Mon plan » : rythme des 14 jours.
// SVG brut (aucune lib de chart). Hauteur de barre ∝ kcal cible du jour, couleur
// de charge (low/mid/hard) ; le jour courant est surligné par un fond --bg-card2
// et sa barre passe en couleur pleine. Chaque jour reste cliquable vers la modal.

import type { PlanDay } from '@/hooks/useNutrition'
import { CHARGE_COLOR, dayShort, type DayType } from './planFormat'

export interface RhythmDay {
  date: string
  type: DayType
  kcal: number
  isToday: boolean
  planDay: PlanDay | null
}

const COL = 26, BARW = 14, TOP = 8, BOT = 92, LBL1 = 104, LBL2 = 116, H = 124

export function PlanRhythm({ days, onOpenDay }: { days: RhythmDay[]; onOpenDay: (d: PlanDay) => void }) {
  const maxKcal = Math.max(...days.map(d => d.kcal), 1)
  const W = days.length * COL

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {days.map((d, i) => {
        const cx = i * COL + COL / 2
        const barH = d.kcal > 0 ? Math.max((d.kcal / maxKcal) * (BOT - TOP), 2) : 0
        const { wd, day } = dayShort(d.date)
        const clickable = !!d.planDay
        return (
          <g
            key={d.date}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
            onClick={() => { if (d.planDay) onOpenDay(d.planDay) }}
          >
            {clickable && <title>{`${wd} ${day} · ${d.kcal} kcal`}</title>}
            {d.isToday && (
              <rect x={cx - COL / 2 + 2} y={TOP - 4} width={COL - 4} height={BOT - TOP + 8} rx={8} fill="var(--bg-card2)" />
            )}
            {barH > 0 && (
              <rect
                x={cx - BARW / 2} y={BOT - barH} width={BARW} height={barH} rx={3}
                fill={CHARGE_COLOR[d.type]} opacity={d.isToday ? 1 : 0.45}
              />
            )}
            <text x={cx} y={LBL1} textAnchor="middle" fontFamily="var(--font-body)" fontSize={9} fill="var(--text-dim)">{wd}</text>
            <text x={cx} y={LBL2} textAnchor="middle" fontFamily="var(--font-body)" fontSize={9} fill={d.isToday ? 'var(--text)' : 'var(--text-dim)'}>{day}</text>
          </g>
        )
      })}
    </svg>
  )
}
