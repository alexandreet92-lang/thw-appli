'use client'
import { useState } from 'react'
import { currentLocale } from '@/lib/i18n'

export type KcalEntry = {
  date: string
  label: string   // "Lun 14"
  consumed: number
  planned: number
}

const H = 190
const PAD_T = 10
const PAD_B = 36
const PAD_L = 38
const PAD_R = 12

export default function KcalBarChart({ entries }: { entries: KcalEntry[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (!entries.length) return null

  const n = entries.length
  const chartH = H - PAD_T - PAD_B
  const W = Math.max(400, n * 50 + PAD_L + PAD_R)
  const chartW = W - PAD_L - PAD_R
  const slotW = chartW / n
  const barW = Math.min(Math.floor(slotW * 0.3), 18)
  const gap = Math.floor(barW * 0.35)

  const maxVal = Math.max(...entries.flatMap(e => [e.consumed, e.planned]), 500)

  function barBaseY() { return PAD_T + chartH }
  function toH(v: number) { return maxVal > 0 ? (v / maxVal) * chartH : 0 }
  function slotCX(i: number) { return PAD_L + i * slotW + slotW / 2 }
  function xP(i: number) { return slotCX(i) - barW - gap / 2 }
  function xC(i: number) { return slotCX(i) + gap / 2 }

  const yTicks = [0, 0.33, 0.67, 1].map(f => Math.round(maxVal * f))
  const hEntry = hover !== null ? entries[hover] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid + Y labels */}
        {yTicks.map((v, i) => {
          const y = PAD_T + chartH - toH(v)
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
              <text x={PAD_L - 4} y={y + 4} textAnchor="end"
                fill="var(--text-dim)" fontSize={8} fontFamily="DM Mono,monospace">
                {v === 0 ? '' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {entries.map((e, i) => {
          const ph = Math.max(toH(e.planned), e.planned > 0 ? 3 : 0)
          const ch = Math.max(toH(e.consumed), 3)
          const by = barBaseY()
          const isHov = hover === i
          return (
            <g key={e.date}>
              {/* Planned */}
              <rect x={xP(i)} y={by - ph} width={barW} height={ph}
                fill="var(--border)" rx={3} opacity={isHov ? 0.7 : 0.45} />
              {/* Consumed */}
              <rect x={xC(i)} y={by - ch} width={barW} height={ch}
                fill="#06B6D4" rx={3} opacity={isHov ? 1 : 0.85} />
              {/* X day name */}
              <text x={slotCX(i)} y={by + 14} textAnchor="middle"
                fill={isHov ? 'var(--text)' : 'var(--text-dim)'} fontSize={9} fontFamily="DM Sans,sans-serif">
                {e.label.split(' ')[0]}
              </text>
              {/* X date number */}
              <text x={slotCX(i)} y={by + 25} textAnchor="middle"
                fill={isHov ? 'var(--text)' : 'var(--text-dim)'} fontSize={8} fontFamily="DM Mono,monospace">
                {e.label.split(' ')[1]}
              </text>
              {/* Hover zone */}
              <rect x={PAD_L + i * slotW} y={PAD_T} width={slotW} height={chartH + PAD_B}
                fill="transparent" style={{ cursor: 'default' }}
                onMouseEnter={() => setHover(i)} />
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hEntry && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 11px', fontSize: 11,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'none', zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>
            {new Date(hEntry.date + 'T00:00:00').toLocaleDateString(currentLocale(), {
              weekday: 'long', day: '2-digit', month: '2-digit',
            })}
          </div>
          <div style={{ color: '#06B6D4', marginBottom: 2 }}>
            Consomme : {hEntry.consumed.toLocaleString(currentLocale())} kcal
          </div>
          {hEntry.planned > 0 && (
            <div style={{ color: 'var(--text-dim)' }}>
              Planifie : {hEntry.planned.toLocaleString(currentLocale())} kcal
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: '#06B6D4' }} />
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Consomme</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--border)', opacity: 0.7 }} />
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Planifie</span>
        </div>
      </div>
    </div>
  )
}
