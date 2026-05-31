'use client'

import { useMemo } from 'react'

interface Props {
  watts:     number[]
  heartrate: number[]
  time?:     number[]
}

function linReg(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 1.5 }
  let sx = 0, sy = 0, sxy = 0, sx2 = 0
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i]; sx2 += xs[i] * xs[i] }
  const denom = n * sx2 - sx * sx
  if (denom === 0) return { slope: 0, intercept: sy / n }
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}

function smooth(arr: number[], w = 8): number[] {
  return arr.map((_, i) => {
    const s = arr.slice(Math.max(0, i - w), i + w + 1)
    return s.reduce((a, b) => a + b, 0) / s.length
  })
}

export function AerobicEfficiency({ watts, heartrate, time }: Props) {
  const WINDOW = 300 // 5 min at 1 Hz

  const { efPoints, avgEF, trend, trendLabel } = useMemo(() => {
    const N = Math.min(watts.length, heartrate.length)
    if (N < WINDOW + 10) return { efPoints: [], avgEF: 0, trend: 0, trendLabel: '→' as const }

    // Sliding window EF with running sums
    let sumW  = 0
    let sumHr = 0
    for (let i = 0; i < WINDOW; i++) { sumW += watts[i]; sumHr += heartrate[i] }

    const raw: number[] = []
    for (let i = WINDOW; i < N; i++) {
      sumW  += watts[i]     - watts[i - WINDOW]
      sumHr += heartrate[i] - heartrate[i - WINDOW]
      const avgHr = sumHr / WINDOW
      if (avgHr < 100) { raw.push(NaN); continue }
      raw.push((sumW / WINDOW) / avgHr)
    }

    // Filter NaN
    const valid = raw.filter(v => !isNaN(v))
    if (valid.length < 10) return { efPoints: [], avgEF: 0, trend: 0, trendLabel: '→' as const }

    const avgEF = valid.reduce((a, b) => a + b, 0) / valid.length

    // Downsample to ≤ 400 points for rendering
    const step = Math.max(1, Math.floor(raw.length / 400))
    const sampled: number[] = []
    for (let i = 0; i < raw.length; i += step) sampled.push(raw[i])

    // Fill NaN gaps with linear interpolation for smooth rendering
    const filled = sampled.slice()
    for (let i = 0; i < filled.length; i++) {
      if (isNaN(filled[i])) {
        // find nearest valid neighbors
        let prev = i - 1; while (prev >= 0 && isNaN(filled[prev])) prev--
        let next = i + 1; while (next < filled.length && isNaN(filled[next])) next++
        if (prev >= 0 && next < filled.length) {
          filled[i] = filled[prev] + (filled[next] - filled[prev]) * ((i - prev) / (next - prev))
        } else if (prev >= 0) {
          filled[i] = filled[prev]
        } else if (next < filled.length) {
          filled[i] = filled[next]
        }
      }
    }

    // Smooth for rendering
    const smoothed = smooth(filled.filter(v => !isNaN(v)))
    const efPoints = smoothed

    // Trend via linear regression on raw valid values (not smoothed)
    const validIdx = raw.reduce<number[]>((acc, v, i) => { if (!isNaN(v)) acc.push(i); return acc }, [])
    const validVals = validIdx.map(i => raw[i])
    const reg = linReg(validIdx.map(i => i / raw.length), validVals)
    const slope = reg.slope
    const trendLabel = slope > 0.05 ? '↑' as const : slope < -0.05 ? '↓' as const : '→' as const

    return { efPoints, avgEF, trend: slope, trendLabel }
  }, [watts, heartrate, WINDOW])

  if (efPoints.length < 5) return null

  const W = 1000, H = 100, pad = 8
  const minEF = Math.max(0, Math.min(...efPoints) - 0.05)
  const maxEF = Math.max(...efPoints) + 0.05
  const range = maxEF - minEF || 0.1

  const xMap = (i: number) => (i / (efPoints.length - 1)) * W
  const yMap = (v: number) => H - pad - ((v - minEF) / range) * (H - pad * 2)

  const pts = efPoints.map((v, i) => `${xMap(i).toFixed(1)},${yMap(v).toFixed(1)}`)
  const linePath = `M${pts.join(' L')}`
  const fillPath = `M0,${H} L${pts.join(' L')} L${W},${H}Z`

  // Trend line endpoints
  const { slope, intercept } = linReg(
    efPoints.map((_, i) => i / (efPoints.length - 1)),
    efPoints,
  )
  const trendY1 = yMap(intercept)
  const trendY2 = yMap(intercept + slope)

  const trendColor = trendLabel === '↑' ? '#10B981' : trendLabel === '↓' ? '#EF4444' : 'var(--text-dim)'

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Sub-header with stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>
          EF moyenne&nbsp;
          <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {avgEF.toFixed(2)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>
          {trendLabel}&nbsp;
          {trendLabel === '↑' ? 'En progression' : trendLabel === '↓' ? 'En baisse' : 'Stable'}
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="efFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Fill area */}
        <path d={fillPath} fill="url(#efFill)" />

        {/* EF line */}
        <path d={linePath} fill="none" stroke="#06B6D4" strokeWidth="1.8" strokeLinejoin="round" />

        {/* Trend line */}
        <line
          x1={0}  y1={trendY1}
          x2={W}  y2={trendY2}
          stroke="#64748B" strokeWidth="1" strokeDasharray="5 3"
        />

        {/* Avg EF reference line */}
        <line
          x1={0}  y1={yMap(avgEF)}
          x2={W}  y2={yMap(avgEF)}
          stroke="#06B6D4" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.4"
        />
      </svg>

      {/* Note */}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
        L&apos;EF mesure combien de watts tu produis par battement cardiaque. Une courbe stable = bonne endurance fondamentale.
      </div>
    </div>
  )
}
