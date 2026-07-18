'use client'

import { useState, useRef } from 'react'
import { useI18n } from '@/lib/i18n'

interface LapEntry {
  start_index?:  number
  end_index?:    number
  moving_time_s: number
  avg_watts?:    number | null
  avg_hr?:       number | null
  max_heartrate?: number | null
  distance_m:    number
}

interface StreamsPartial {
  watts?: number[]
  time?:  number[]
}

interface Props {
  laps:        LapEntry[]
  streams:     StreamsPartial | null
  avgWatts:    number | null
  hoveredLap:  number | null
  onHoverLap:  (i: number | null) => void
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function LapsChart({ laps, streams, avgWatts, hoveredLap, onHoverLap }: Props) {
  const { t } = useI18n()
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const watts = streams?.watts
  if (!watts || watts.length < 2) return null

  const N   = watts.length
  const W   = 1000
  const H   = 140
  const pad = 4
  const maxW = Math.max(...watts) * 1.1 || 1

  const yMap = (w: number) => H - pad - (w / maxW) * (H - pad * 2)
  const xMap = (idx: number) => (idx / (N - 1)) * W

  // Raw power curve (background)
  const curvePts = watts.map((w, i) => `${xMap(i).toFixed(1)},${yMap(w).toFixed(1)}`).join(' ')
  const fillPath = `M0,${H} L${curvePts} L${W},${H}Z`
  const linePath = `M${curvePts}`

  // Average watts dashed line
  const avgY = avgWatts != null ? yMap(avgWatts) : null

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxW * f))

  // X-axis: time labels from streams.time, or estimate from laps
  const timeArr = streams?.time
  const totalS  = timeArr ? timeArr[timeArr.length - 1] - timeArr[0] : laps.reduce((a, l) => a + l.moving_time_s, 0)
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    pct: f,
    label: fmtTime(Math.round(f * totalS)),
  }))

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const relX  = e.clientX - rect.left
    const relY  = e.clientY - rect.top
    setTooltipPos({ x: relX, y: relY })

    const pct  = relX / rect.width
    const idx  = Math.round(pct * (N - 1))
    const found = laps.findIndex((lap, i) => {
      const s = lap.start_index ?? 0
      const eIdx = lap.end_index ?? (i < laps.length - 1 ? (laps[i + 1].start_index ?? N - 1) : N - 1)
      return idx >= s && idx <= eIdx
    })
    onHoverLap(found >= 0 ? found : null)
  }

  function handleMouseLeave() {
    setTooltipPos(null)
    onHoverLap(null)
  }

  const hLap = hoveredLap !== null ? laps[hoveredLap] : null

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', marginBottom: 8, cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block' }}
        preserveAspectRatio="none"
      >
        {/* Background raw power area */}
        <path d={fillPath} fill="rgba(148,163,184,0.12)" />
        <path d={linePath} fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Lap rectangles */}
        {laps.map((lap, i) => {
          const s    = lap.start_index ?? 0
          const eIdx = lap.end_index ?? (i < laps.length - 1 ? (laps[i + 1].start_index ?? N - 1) : N - 1)
          const x1   = xMap(s)
          const x2   = xMap(eIdx)
          const w    = lap.avg_watts ?? 0
          const rH   = (w / maxW) * (H - pad * 2)
          const rY   = H - pad - rH
          const isHov = hoveredLap === i
          return (
            <rect
              key={i}
              x={x1}
              y={rY}
              width={Math.max(2, x2 - x1)}
              height={rH}
              fill={isHov ? 'rgba(129,140,248,0.85)' : 'rgba(129,140,248,0.6)'}
              stroke="rgba(129,140,248,1)"
              strokeWidth={isHov ? 1.5 : 0.5}
            />
          )
        })}

        {/* Lap index labels */}
        {laps.map((lap, i) => {
          const s    = lap.start_index ?? 0
          const eIdx = lap.end_index ?? (i < laps.length - 1 ? (laps[i + 1].start_index ?? N - 1) : N - 1)
          const midX = (xMap(s) + xMap(eIdx)) / 2
          return (
            <text key={i} x={midX} y={10} textAnchor="middle"
              fontSize="14" fill="rgba(129,140,248,0.9)" fontWeight="700">
              {i + 1}
            </text>
          )
        })}

        {/* Average watts horizontal dashed line */}
        {avgY !== null && (
          <line x1={0} y1={avgY} x2={W} y2={avgY}
            stroke="var(--border-mid)" strokeWidth="1" strokeDasharray="4 3" />
        )}
      </svg>

      {/* X axis */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {xLabels.map(({ pct, label }) => (
          <span key={pct} style={{ fontSize: 9, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
            {label}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {hLap && tooltipPos && (
        <div style={{
          position:      'absolute',
          left:          tooltipPos.x > 160 ? tooltipPos.x - 160 : tooltipPos.x + 12,
          top:           Math.max(0, tooltipPos.y - 70),
          background:    'var(--bg-card)',
          border:        '1px solid var(--border-mid)',
          borderRadius:  8,
          padding:       '8px 12px',
          pointerEvents: 'none',
          zIndex:        50,
          fontSize:      11,
          boxShadow:     '0 2px 8px rgba(0,0,0,0.15)',
          minWidth:      110,
        }}>
          <div style={{ fontWeight: 700, color: '#818CF8', marginBottom: 4 }}>
            {t('activities.lapNumber', { n: (hoveredLap ?? 0) + 1 })}
          </div>
          {hLap.avg_watts != null && (
            <div style={{ color: 'var(--text)' }}>{Math.round(hLap.avg_watts)} {t('activities.wAvg')}</div>
          )}
          {hLap.avg_hr != null && (
            <div style={{ color: 'var(--text-mid)' }}>{Math.round(hLap.avg_hr)} bpm</div>
          )}
          <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>{fmtTime(hLap.moving_time_s)}</div>
        </div>
      )}
    </div>
  )
}
