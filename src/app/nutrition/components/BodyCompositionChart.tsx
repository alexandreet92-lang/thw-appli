'use client'
import { useState } from 'react'
import { currentLocale } from '@/lib/i18n'

export type BodLog = {
  date: string
  poids: number | null
  mg: number | null
  mm: number | null
}

const W = 520
const H = 260
const PAD_L = 44
const PAD_R = 42
const PAD_T = 28
const PAD_B = 28

/** Smooth cubic-bezier path through an array of [x, y] points */
function smoothPath(pts: [number, number][]): string {
  if (!pts.length) return ''
  if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = ((x0 + x1) / 2).toFixed(1)
    d += ` C${cx},${y0.toFixed(1)} ${cx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }
  return d
}

function yTicks(min: number, max: number, count = 4): number[] {
  return Array.from({ length: count }, (_, i) => min + (i / (count - 1)) * (max - min))
}

// SVG balance-scale icon for empty state
function ScaleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-dim)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
      style={{ opacity: 0.5 }}>
      <line x1="12" y1="3" x2="12" y2="20" />
      <path d="M3 20h18" />
      <path d="M3 8l4 7H3" />
      <path d="M21 8l-4 7h4" />
      <path d="M3 8h18" />
    </svg>
  )
}

export default function BodyCompositionChart({ logs }: { logs: BodLog[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (!logs.length) {
    return (
      <div style={{
        height: 192, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <ScaleIcon />
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)' }}>
          Aucune mesure enregistree
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.7 }}>
          Ajoutez votre premiere mesure ci-dessous
        </div>
      </div>
    )
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const n = sorted.length

  const kgVals = sorted.flatMap(l => [l.poids, l.mm]).filter((v): v is number => v != null)
  const fatVals = sorted.map(l => l.mg).filter((v): v is number => v != null)
  const hasFat = fatVals.length > 0
  const hasMM  = sorted.some(l => l.mm != null)

  const rawKgMin = kgVals.length ? Math.min(...kgVals) : 50
  const rawKgMax = kgVals.length ? Math.max(...kgVals) : 100
  const kgMin = rawKgMin - Math.max(2, (rawKgMax - rawKgMin) * 0.15)
  const kgMax = rawKgMax + Math.max(2, (rawKgMax - rawKgMin) * 0.15)

  const fatMin = hasFat ? Math.max(0, Math.min(...fatVals) - 3) : 0
  const fatMax = hasFat ? Math.max(...fatVals) + 3 : 40

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const bottomY = PAD_T + chartH

  function toX(i: number) {
    return PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
  }
  function toYkg(v: number) {
    return PAD_T + chartH - ((v - kgMin) / (kgMax - kgMin || 1)) * chartH
  }
  function toYfat(v: number) {
    return PAD_T + chartH - ((v - fatMin) / (fatMax - fatMin || 1)) * chartH
  }

  const weightPts: [number, number][] = sorted
    .map((l, i) => l.poids != null ? [toX(i), toYkg(l.poids)] as [number, number] : null)
    .filter((p): p is [number, number] => p !== null)

  const mmPts: [number, number][] = sorted
    .map((l, i) => l.mm != null ? [toX(i), toYkg(l.mm)] as [number, number] : null)
    .filter((p): p is [number, number] => p !== null)

  const fatPts: [number, number][] = sorted
    .map((l, i) => l.mg != null ? [toX(i), toYfat(l.mg)] as [number, number] : null)
    .filter((p): p is [number, number] => p !== null)

  const linePath = smoothPath(weightPts)
  const areaPath = weightPts.length > 0
    ? linePath
      + ` L${weightPts[weightPts.length - 1][0].toFixed(1)},${bottomY}`
      + ` L${weightPts[0][0].toFixed(1)},${bottomY} Z`
    : ''
  const mmLine  = smoothPath(mmPts)
  const fatLine = smoothPath(fatPts)

  const kgTicksArr = yTicks(kgMin, kgMax, 4)
  const fatTicksArr = hasFat ? yTicks(fatMin, fatMax, 4) : []

  const step = Math.max(1, Math.floor(n / 6))
  const xTicks = sorted
    .map((l, i) => (i === 0 || i === n - 1 || i % step === 0 ? { i, l } : null))
    .filter(Boolean) as { i: number; l: BodLog }[]

  const zoneW = n > 1 ? chartW / (n - 1) : chartW
  const hRow  = hover !== null ? sorted[hover] : null

  // Show value labels only when dataset is small enough to avoid clutter
  const showLabels = n <= 14

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="bodyWeightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Horizontal grid */}
        {kgTicksArr.map((v, i) => (
          <line key={i}
            x1={PAD_L} y1={toYkg(v)} x2={W - PAD_R} y2={toYkg(v)}
            stroke="var(--border)" strokeWidth={0.6} strokeDasharray="4 4" opacity={0.6}
          />
        ))}

        {/* Y left labels (kg) */}
        {kgTicksArr.map((v, i) => (
          <text key={i} x={PAD_L - 6} y={toYkg(v) + 4}
            textAnchor="end" fill="var(--text-dim)"
            fontSize={9} fontFamily="DM Mono,monospace">
            {v.toFixed(0)}
          </text>
        ))}

        {/* Y right labels (% fat) */}
        {hasFat && fatTicksArr.map((v, i) => (
          <text key={i} x={W - PAD_R + 5} y={toYfat(v) + 4}
            textAnchor="start" fill="var(--text-dim)"
            fontSize={9} fontFamily="DM Mono,monospace">
            {v.toFixed(0)}%
          </text>
        ))}

        {/* Area fill under weight curve */}
        {areaPath && (
          <path d={areaPath} fill="url(#bodyWeightGrad)" />
        )}

        {/* Weight line */}
        {linePath && (
          <path d={linePath} fill="none"
            stroke="#06B6D4" strokeWidth={2.5}
            strokeLinejoin="round" strokeLinecap="round"
          />
        )}

        {/* Muscle mass line (dashed, same kg axis) */}
        {mmLine && (
          <path d={mmLine} fill="none"
            stroke="#3B82F6" strokeWidth={1.8}
            strokeDasharray="4 2" strokeLinejoin="round"
          />
        )}

        {/* Fat % line (dashed, right axis) */}
        {fatLine && (
          <path d={fatLine} fill="none"
            stroke="#F97316" strokeWidth={1.8}
            strokeDasharray="2 4" strokeLinejoin="round"
          />
        )}

        {/* Weight dots + optional value labels */}
        {sorted.map((l, i) => {
          if (l.poids == null) return null
          const x = toX(i)
          const y = toYkg(l.poids)
          const isHovered = hover === i
          return (
            <g key={i}>
              {showLabels && (
                <text x={x} y={y - 9}
                  textAnchor="middle"
                  fill="#06B6D4" fontSize={11} fontWeight={600}
                  fontFamily="DM Sans,sans-serif">
                  {l.poids.toFixed(1)}
                </text>
              )}
              <circle
                cx={x} cy={y}
                r={isHovered ? 6 : 5}
                fill="white" stroke="#06B6D4"
                strokeWidth={2}
                style={{ transition: 'r 0.1s' }}
              />
            </g>
          )
        })}

        {/* Hover: vertical rule + secondary dots */}
        {hover !== null && (() => {
          const l = sorted[hover]
          const x = toX(hover)
          return (
            <>
              <line x1={x} y1={PAD_T} x2={x} y2={bottomY}
                stroke="#06B6D4" strokeWidth={1}
                strokeDasharray="3 3" opacity={0.45}
              />
              {l.mm != null && (
                <circle cx={x} cy={toYkg(l.mm)} r={5}
                  fill="#3B82F6" stroke="white" strokeWidth={2} />
              )}
              {l.mg != null && (
                <circle cx={x} cy={toYfat(l.mg)} r={5}
                  fill="#F97316" stroke="white" strokeWidth={2} />
              )}
            </>
          )
        })()}

        {/* X axis labels */}
        {xTicks.map(({ i, l }) => {
          const parts = l.date.split('-')
          return (
            <text key={i} x={toX(i)} y={H - 6}
              textAnchor="middle" fill="var(--text-dim)"
              fontSize={9} fontFamily="DM Sans,sans-serif">
              {parts[2]}/{parts[1]}
            </text>
          )
        })}

        {/* Invisible hover hit areas */}
        {sorted.map((_, i) => (
          <rect key={i}
            x={toX(i) - zoneW / 2} y={PAD_T}
            width={zoneW} height={chartH}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hRow && (
        <div style={{
          position: 'absolute', top: 6, right: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 11px', fontSize: 11,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'none', zIndex: 10,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--text)', fontSize: 11 }}>
            {new Date(hRow.date + 'T00:00:00').toLocaleDateString(currentLocale(), {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </div>
          {hRow.poids != null && (
            <div style={{ color: '#06B6D4', marginBottom: 2 }}>
              Poids : {hRow.poids.toFixed(1)} kg
            </div>
          )}
          {hRow.mm != null && (
            <div style={{ color: '#3B82F6', marginBottom: 2 }}>
              Masse musc. : {hRow.mm.toFixed(1)} kg
            </div>
          )}
          {hRow.mg != null && (
            <div style={{ color: '#F97316' }}>
              Masse grasse : {hRow.mg.toFixed(1)} %
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width={20} height={8}>
            <line x1={0} y1={4} x2={20} y2={4} stroke="#06B6D4" strokeWidth={2} />
          </svg>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Poids (kg)</span>
        </div>
        {hasMM && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={20} height={8}>
              <line x1={0} y1={4} x2={20} y2={4} stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 2" />
            </svg>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Masse musc. (kg)</span>
          </div>
        )}
        {hasFat && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={20} height={8}>
              <line x1={0} y1={4} x2={20} y2={4} stroke="#F97316" strokeWidth={2} strokeDasharray="2 4" />
            </svg>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Masse grasse (%)</span>
          </div>
        )}
      </div>
    </div>
  )
}
