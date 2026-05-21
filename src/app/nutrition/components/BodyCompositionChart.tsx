'use client'
import { useState } from 'react'

export type BodLog = {
  date: string
  poids: number | null
  mg: number | null
  mm: number | null
}

const W = 520
const H = 200
const PAD_L = 42
const PAD_R = 38
const PAD_T = 14
const PAD_B = 26

function buildPath(
  sorted: BodLog[],
  getVal: (l: BodLog) => number | null,
  toX: (i: number) => number,
  toY: (v: number) => number,
): string {
  let d = ''
  sorted.forEach((l, i) => {
    const v = getVal(l)
    if (v == null) return
    const x = toX(i)
    const y = toY(v)
    d += d === '' ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`
  })
  return d
}

function yLabels(min: number, max: number, count = 3): number[] {
  return Array.from({ length: count }, (_, i) => min + (i / (count - 1)) * (max - min))
}

export default function BodyCompositionChart({ logs }: { logs: BodLog[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (!logs.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '32px 16px',
        color: 'var(--text-dim)', fontSize: 13,
      }}>
        Aucune mesure enregistree — ajoutez votre premiere mesure ci-dessous
      </div>
    )
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const n = sorted.length

  const kgVals = sorted.flatMap(l => [l.poids, l.mm]).filter((v): v is number => v != null)
  const fatVals = sorted.map(l => l.mg).filter((v): v is number => v != null)

  const kgMin = kgVals.length ? Math.min(...kgVals) - 2 : 0
  const kgMax = kgVals.length ? Math.max(...kgVals) + 2 : 100
  const fatMin = fatVals.length ? Math.max(0, Math.min(...fatVals) - 2) : 0
  const fatMax = fatVals.length ? Math.max(...fatVals) + 2 : 30

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  function toX(i: number) {
    return PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
  }
  function toYkg(v: number) {
    return PAD_T + chartH - ((v - kgMin) / (kgMax - kgMin || 1)) * chartH
  }
  function toYfat(v: number) {
    return PAD_T + chartH - ((v - fatMin) / (fatMax - fatMin || 1)) * chartH
  }

  const poidsPath = buildPath(sorted, l => l.poids, toX, toYkg)
  const mmPath = buildPath(sorted, l => l.mm, toX, toYkg)
  const mgPath = buildPath(sorted, l => l.mg, toX, toYfat)

  const kgY = yLabels(kgMin, kgMax, 3)
  const fatY = yLabels(fatMin, fatMax, 3)

  const step = Math.max(1, Math.floor(n / 5))
  const xTicks = sorted
    .map((l, i) => (i === 0 || i === n - 1 || i % step === 0 ? { i, l } : null))
    .filter(Boolean) as { i: number; l: BodLog }[]

  const hRow = hover !== null ? sorted[hover] : null
  const zoneW = n > 1 ? chartW / (n - 1) : chartW

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {kgY.map((v, i) => (
          <line key={i}
            x1={PAD_L} y1={toYkg(v)} x2={W - PAD_R} y2={toYkg(v)}
            stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3"
          />
        ))}

        {/* Y left labels (kg) */}
        {kgY.map((v, i) => (
          <text key={i} x={PAD_L - 5} y={toYkg(v) + 4}
            textAnchor="end" fill="var(--text-dim)" fontSize={9} fontFamily="DM Mono,monospace">
            {v.toFixed(0)}
          </text>
        ))}

        {/* Y right labels (%) */}
        {fatVals.length > 0 && fatY.map((v, i) => (
          <text key={i} x={W - PAD_R + 5} y={toYfat(v) + 4}
            textAnchor="start" fill="var(--text-dim)" fontSize={9} fontFamily="DM Mono,monospace">
            {v.toFixed(0)}%
          </text>
        ))}

        {/* Lines */}
        {poidsPath && (
          <path d={poidsPath} fill="none" stroke="#06B6D4" strokeWidth={2} strokeLinejoin="round" />
        )}
        {mmPath && (
          <path d={mmPath} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 2" />
        )}
        {mgPath && (
          <path d={mgPath} fill="none" stroke="#F97316" strokeWidth={2} strokeLinejoin="round" strokeDasharray="2 4" />
        )}

        {/* Hover dots */}
        {hover !== null && (() => {
          const l = sorted[hover]
          return (
            <>
              {l.poids != null && <circle cx={toX(hover)} cy={toYkg(l.poids)} r={5} fill="#06B6D4" stroke="white" strokeWidth={2} />}
              {l.mm != null && <circle cx={toX(hover)} cy={toYkg(l.mm)} r={5} fill="#3B82F6" stroke="white" strokeWidth={2} />}
              {l.mg != null && <circle cx={toX(hover)} cy={toYfat(l.mg)} r={5} fill="#F97316" stroke="white" strokeWidth={2} />}
            </>
          )
        })()}

        {/* X axis labels */}
        {xTicks.map(({ i, l }) => {
          const [, m, d] = l.date.split('-')
          return (
            <text key={i} x={toX(i)} y={H - 4}
              textAnchor="middle" fill="var(--text-dim)" fontSize={9} fontFamily="DM Sans,sans-serif">
              {d}/{m}
            </text>
          )
        })}

        {/* Invisible hover zones */}
        {sorted.map((_, i) => (
          <rect key={i}
            x={toX(i) - zoneW / 2}
            y={PAD_T}
            width={zoneW}
            height={chartH}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
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
            {new Date(hRow.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          {hRow.poids != null && (
            <div style={{ color: '#06B6D4', marginBottom: 2 }}>Poids : {hRow.poids.toFixed(1)} kg</div>
          )}
          {hRow.mm != null && (
            <div style={{ color: '#3B82F6', marginBottom: 2 }}>Masse musc. : {hRow.mm.toFixed(1)} kg</div>
          )}
          {hRow.mg != null && (
            <div style={{ color: '#F97316' }}>Masse grasse : {hRow.mg.toFixed(1)} %</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="#06B6D4" strokeWidth={2} /></svg>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Poids (kg)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 2" /></svg>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Masse musc. (kg)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="#F97316" strokeWidth={2} strokeDasharray="2 4" /></svg>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Masse grasse (%)</span>
        </div>
      </div>
    </div>
  )
}
