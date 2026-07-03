'use client'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface HrvRow { date: string; hrv: number }
interface Props { rows: HrvRow[] }

const PERIODS = [{ labelKey: 'recovery.period.1w', days: 7 }, { labelKey: 'recovery.period.2w', days: 14 }, { labelKey: 'recovery.period.4w', days: 28 }]

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function movingAvg(data: HrvRow[], window = 7): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i < data.length; i++) {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1)
    map.set(data[i].date, slice.reduce((s, r) => s + r.hrv, 0) / slice.length)
  }
  return map
}

export default function HrvTrend({ rows }: Props) {
  const { t } = useI18n()
  const [period, setPeriod] = useState(1)
  const [animated, setAnimated] = useState(false)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; val: number; date: string } | null>(null)

  useEffect(() => { setAnimated(false); const id = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(id) }, [period])

  const days = PERIODS[period].days
  const cutD = new Date(); cutD.setDate(cutD.getDate() - days + 1)
  const prevD = new Date(cutD); prevD.setDate(prevD.getDate() - days)
  const cs = isoDate(cutD), ps = isoDate(prevD)

  const sorted = useMemo(() => [...rows].sort((a, b) => a.date.localeCompare(b.date)), [rows])
  const cur  = useMemo(() => sorted.filter(r => r.date >= cs), [sorted, cs])
  const prev = useMemo(() => sorted.filter(r => r.date >= ps && r.date < cs), [sorted, ps, cs])

  const maMap = useMemo(() => movingAvg(sorted), [sorted])
  const personalAvg = sorted.length ? sorted.reduce((s, r) => s + r.hrv, 0) / sorted.length : 0

  const curAvg  = cur.length  ? cur.reduce((s, r)  => s + r.hrv, 0) / cur.length  : null
  const prevAvg = prev.length ? prev.reduce((s, r) => s + r.hrv, 0) / prev.length : null
  const pct = curAvg && prevAvg && prevAvg > 0 ? Math.round((curAvg - prevAvg) / prevAvg * 100) : null

  const W = 500, H = 90
  const vals = cur.map(r => r.hrv)
  const minV = Math.min(...vals, personalAvg * 0.8)
  const maxV = Math.max(...vals, personalAvg * 1.2)
  const range = Math.max(maxV - minV, 1)
  const LEN = Math.max(cur.length - 1, 1)

  function yOf(v: number): number { return H - ((v - minV) / range) * H }
  function xOf(i: number): number { return (i / LEN) * W }

  const mainPath = cur.map((r, i) => `${i===0?'M':'L'}${xOf(i).toFixed(1)} ${yOf(r.hrv).toFixed(1)}`).join(' ')

  const maPath = cur
    .map((r, i) => { const ma = maMap.get(r.date); return ma != null ? `${i===0?'M':'L'}${xOf(i).toFixed(1)} ${yOf(ma).toFixed(1)}` : null })
    .filter(Boolean).join(' ')

  const avgY = yOf(personalAvg)
  const pathLen = W * 1.5

  // Fill areas above/below personalAvg
  const abovePts = cur.map((r, i) => ({ x: xOf(i), y: Math.min(yOf(r.hrv), avgY) }))
  const belowPts = cur.map((r, i) => ({ x: xOf(i), y: Math.max(yOf(r.hrv), avgY) }))
  const fillAbove = abovePts.length > 1
    ? `${abovePts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} L${W} ${avgY.toFixed(1)} L0 ${avgY.toFixed(1)} Z`
    : ''
  const fillBelow = belowPts.length > 1
    ? `${belowPts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} L${W} ${avgY.toFixed(1)} L0 ${avgY.toFixed(1)} Z`
    : ''

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {PERIODS.map((p, i) => (
            <button key={i} onClick={() => setPeriod(i)}
              style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid', fontSize: 9, cursor: 'pointer',
                borderColor: period===i ? '#7C3AED' : 'var(--border)',
                background: period===i ? 'rgba(124,58,237,0.1)' : 'transparent',
                color: period===i ? '#7C3AED' : 'var(--text-dim)', fontWeight: period===i ? 700 : 400 }}>
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {curAvg != null && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t('recovery.avgShort')} {Math.round(curAvg)} ms</span>}
          {pct != null && <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 0 ? '#10B981' : '#EF4444' }}>{pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%</span>}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }} onMouseLeave={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${W} ${H+18}`} style={{ width: '100%', minWidth: 240, height: 'auto', display: 'block' }}>
          {fillAbove && <path d={fillAbove} fill="rgba(16,185,129,0.10)" />}
          {fillBelow && <path d={fillBelow} fill="rgba(239,68,68,0.08)" />}
          <line x1={0} y1={avgY} x2={W} y2={avgY} stroke="rgba(124,58,237,0.25)" strokeWidth={1} strokeDasharray="3 4" />
          {maPath && (
            <path d={maPath} fill="none" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
          )}
          {mainPath && (
            <path d={mainPath} fill="none" stroke="#7C3AED" strokeWidth={2}
              strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
              style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
          )}
          {cur.map((r, i) => (
            <circle key={r.date} cx={xOf(i)} cy={yOf(r.hrv)} r={3} fill="#7C3AED" opacity={0.8}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ x: xOf(i), y: yOf(r.hrv), val: r.hrv, date: r.date })} />
          ))}
          {tooltip && (
            <g>
              <rect x={Math.min(tooltip.x - 38, W - 86)} y={Math.max(tooltip.y - 30, 2)} width={86} height={22} rx={4}
                fill="var(--bg-card)" stroke="var(--border)" strokeWidth={0.8} />
              <text x={Math.min(tooltip.x - 38, W - 86) + 6} y={Math.max(tooltip.y - 30, 2) + 14}
                fill="var(--text)" fontSize={8}>{tooltip.date.slice(5)} · {Math.round(tooltip.val)} ms</text>
            </g>
          )}
          {cur.map((r, i) => i % Math.max(1, Math.floor(cur.length / 6)) !== 0 ? null : (
            <text key={r.date} x={xOf(i)} y={H+14} fill="var(--text-dim)" fontSize={7} textAnchor="middle">{r.date.slice(5)}</text>
          ))}
        </svg>
      </div>
    </div>
  )
}
