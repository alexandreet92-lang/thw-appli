'use client'
import { useState, useRef, useEffect } from 'react'
import type { BodyMeasurement, WeightMetric } from '@/hooks/useBodyMetrics'
import { getMetricValue, computeTrendPerWeek } from '@/hooks/useBodyMetrics'
import { currentLocale } from '@/lib/i18n'

// ── Config ────────────────────────────────────────────────────────
const METRIC_CONFIG: Record<WeightMetric, { label: string; unit: string; color: string; dec: number }> = {
  weight_kg:        { label: 'Poids (kg)',       unit: 'kg',  color: '#06B6D4', dec: 1 },
  fat_mass_percent: { label: 'Masse grasse (%)',  unit: '%',   color: '#F97316', dec: 1 },
  muscle_mass_kg:   { label: 'Masse musc. (kg)',  unit: 'kg',  color: '#3B82F6', dec: 1 },
  bmi:              { label: 'IMC',               unit: '',    color: '#8B5CF6', dec: 1 },
  metabolic_age:    { label: 'Age metab.',         unit: 'ans', color: '#10B981', dec: 0 },
}
const METRICS: WeightMetric[] = ['weight_kg', 'fat_mass_percent', 'muscle_mass_kg', 'bmi', 'metabolic_age']
const SVG_H = 240
const PAD = { l: 44, r: 20, t: 28, b: 28 }

function smoothPath(pts: [number, number][]): string {
  if (!pts.length) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cx = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(1)
    d += ` C${cx},${pts[i-1][1].toFixed(1)} ${cx},${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`
  }
  return d
}

function yTicks(min: number, max: number): number[] {
  return Array.from({ length: 4 }, (_, i) => min + (i / 3) * (max - min))
}

// ── Props ─────────────────────────────────────────────────────────
interface Props {
  measurements: BodyMeasurement[]
  heightCm: number | null
  targetWeight: number | null
}

export default function WeightChart({ measurements, heightCm, targetWeight }: Props) {
  const [metric, setMetric] = useState<WeightMetric>('weight_kg')
  const [hover, setHover] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cfg = METRIC_CONFIG[metric]
  const sorted = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const data = sorted.filter(m => getMetricValue(m, metric, heightCm) != null)
  const n = data.length

  // Trend badge
  const trend = computeTrendPerWeek(sorted, m => getMetricValue(m, metric, heightCm))
  const trendIsGood = metric === 'muscle_mass_kg'
    ? (trend ?? 0) > 0
    : (trend ?? 0) < 0

  // SVG dimensions
  const svgW = Math.max(containerW, n * 60)
  const chartW = svgW - PAD.l - PAD.r
  const chartH = SVG_H - PAD.t - PAD.b
  const bottomY = PAD.t + chartH

  const vals = data.map(m => getMetricValue(m, metric, heightCm) as number)
  const rawMin = n ? Math.min(...vals) : 0
  const rawMax = n ? Math.max(...vals) : 1
  const spread = Math.max(rawMax - rawMin, 1)
  const yMin = rawMin - spread * 0.12
  const yMax = rawMax + spread * 0.12

  function toX(i: number) { return PAD.l + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW) }
  function toY(v: number) { return PAD.t + chartH - ((v - yMin) / (yMax - yMin)) * chartH }

  const pts: [number, number][] = data.map((m, i) => [toX(i), toY(getMetricValue(m, metric, heightCm) as number)])
  const linePath = smoothPath(pts)
  const areaPath = pts.length
    ? linePath + ` L${pts[pts.length-1][0].toFixed(1)},${bottomY} L${pts[0][0].toFixed(1)},${bottomY} Z`
    : ''

  const ticks = n ? yTicks(yMin, yMax) : []
  const step = Math.max(1, Math.floor(n / 6))
  const xTicks = data.map((m, i) => (i === 0 || i === n - 1 || i % step === 0) ? { i, m } : null).filter(Boolean) as { i: number; m: BodyMeasurement }[]

  const hRow = hover !== null ? data[hover] : null
  const hVal = hRow ? getMetricValue(hRow, metric, heightCm) : null
  const zoneW = n > 1 ? chartW / (n - 1) : chartW
  const gradId = `gradient-${metric}`

  return (
    <div>
      {/* Metric selector pills */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 6, paddingBottom: 4, marginBottom: 6 }}>
        {METRICS.map(m => {
          const disabled = m === 'bmi' && !heightCm
          const active = metric === m
          return (
            <button key={m}
              onClick={() => { if (!disabled) { setMetric(m); setHover(null) } }}
              disabled={disabled}
              style={{
                padding: '5px 12px', borderRadius: 20, border: active ? 'none' : '1px solid var(--border)',
                background: active ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'transparent',
                color: active ? '#fff' : disabled ? 'var(--text-dim)' : 'var(--text-dim)',
                fontSize: 11, fontFamily: 'Syne,sans-serif', fontWeight: active ? 700 : 400,
                cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {METRIC_CONFIG[m].label}
              {m === 'bmi' && !heightCm ? ' (renseigner taille)' : ''}
            </button>
          )
        })}
      </div>

      {/* Trend badge */}
      {trend !== null && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, fontFamily: 'DM Mono,monospace',
            color: trendIsGood ? '#22C55E' : '#EF4444',
          }}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)} {cfg.unit || 'pt'}/sem
          </span>
        </div>
      )}

      {/* Chart area */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div style={{ overflowX: 'auto', height: SVG_H }} onMouseLeave={() => setHover(null)}>
          {n === 0 ? (
            <div style={{ height: SVG_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Aucune donnee pour cette metrique
            </div>
          ) : (
            <svg width={svgW} height={SVG_H} style={{ display: 'block', userSelect: 'none' }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={cfg.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0"   />
                </linearGradient>
              </defs>
              {/* Grid + Y labels */}
              {ticks.map((v, i) => (
                <g key={i}>
                  <line x1={PAD.l} y1={toY(v)} x2={svgW - PAD.r} y2={toY(v)}
                    stroke="var(--border)" strokeWidth={0.6} strokeDasharray="4 4" opacity={0.5} />
                  <text x={PAD.l - 5} y={toY(v) + 4} textAnchor="end"
                    fill="var(--text-dim)" fontSize={9} fontFamily="DM Mono,monospace">
                    {v.toFixed(cfg.dec)}
                  </text>
                </g>
              ))}
              {/* Target weight reference line */}
              {metric === 'weight_kg' && targetWeight != null && targetWeight > yMin && targetWeight < yMax && (
                <g>
                  <line x1={PAD.l} y1={toY(targetWeight)} x2={svgW - PAD.r} y2={toY(targetWeight)}
                    stroke="#6B7280" strokeWidth={1} strokeDasharray="6 3" />
                  <text x={svgW - PAD.r + 3} y={toY(targetWeight) + 4}
                    fill="#6B7280" fontSize={9} fontFamily="DM Sans,sans-serif">Objectif</text>
                </g>
              )}
              {/* Area + line */}
              {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
              {linePath && <path d={linePath} fill="none" stroke={cfg.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {/* Dots */}
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={hover === i ? 6 : 4}
                  fill="white" stroke={cfg.color} strokeWidth={2} style={{ transition: 'r 0.1s' }} />
              ))}
              {/* Hover vertical rule */}
              {hover !== null && (
                <line x1={pts[hover][0]} y1={PAD.t} x2={pts[hover][0]} y2={bottomY}
                  stroke={cfg.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
              )}
              {/* X labels */}
              {xTicks.map(({ i, m }) => {
                const [, mo, d] = m.measured_at.split('-')
                return (
                  <text key={i} x={toX(i)} y={SVG_H - 6} textAnchor="middle"
                    fill="var(--text-dim)" fontSize={9} fontFamily="DM Sans,sans-serif">
                    {d}/{mo}
                  </text>
                )
              })}
              {/* Hit zones */}
              {data.map((_, i) => (
                <rect key={i} x={toX(i) - zoneW / 2} y={PAD.t} width={zoneW} height={chartH}
                  fill="transparent" style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHover(i)} />
              ))}
            </svg>
          )}
        </div>

        {/* Tooltip (outside scroll container) */}
        {hRow && hVal != null && (
          <div style={{
            position: 'absolute', top: 6, right: 4, zIndex: 10, pointerEvents: 'none',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px', fontSize: 11,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
              {new Date(hRow.measured_at + 'T00:00:00').toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div style={{ color: cfg.color, fontWeight: 600 }}>
              {hVal.toFixed(cfg.dec)}{cfg.unit ? ' ' + cfg.unit : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
