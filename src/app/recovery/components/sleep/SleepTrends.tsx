'use client'
import { useEffect, useMemo, useState } from 'react'

export interface TrendNight {
  date: string
  totalMin: number | null; deepMin: number | null; remMin: number | null
  lightMin: number | null; wakeMin: number | null
}

const CURVES = [
  { key: 'totalMin',  label: 'Durée',          color: '#3B82F6', dash: false, w: 2 },
  { key: 'deepMin',   label: 'Profond',         color: '#4338CA', dash: true,  w: 1.5 },
  { key: 'remMin',    label: 'REM',             color: '#7C3AED', dash: true,  w: 1.5 },
  { key: 'lightMin',  label: 'Léger',           color: '#60A5FA', dash: true,  w: 1.5 },
  { key: 'wakeMin',   label: 'Interruptions',   color: '#F97316', dash: true,  w: 1.5 },
] as const

const PERIODS = [{ label: '1 sem', days: 7 }, { label: '2 sem', days: 14 }, { label: '4 sem', days: 28 }]

function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = Math.round(m % 60)
  return h === 0 ? `${mm}min` : mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, '0')}`
}

function getVal(n: TrendNight, k: string): number | null {
  return (n as unknown as Record<string, number | null>)[k] ?? null
}

function avgOf(nights: TrendNight[], key: string): number | null {
  const vs = nights.map(n => getVal(n, key)).filter((v): v is number => v != null)
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function SleepTrends({ nights }: { nights: TrendNight[] }) {
  const [period, setPeriod] = useState(1)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(id)
  }, [period])

  const days = PERIODS[period].days
  const cutD = new Date(); cutD.setDate(cutD.getDate() - days + 1)
  const prevD = new Date(cutD); prevD.setDate(prevD.getDate() - days)
  const cs = isoDate(cutD), ps = isoDate(prevD)

  const cur  = useMemo(() => nights.filter(n => n.date >= cs).sort((a,b)=>a.date.localeCompare(b.date)), [nights, cs])
  const prev = useMemo(() => nights.filter(n => n.date >= ps && n.date < cs), [nights, ps, cs])

  const W = 500, H = 90, maxMin = 660
  const Y7h = H - (420 / maxMin) * H
  const Y9h = H - (540 / maxMin) * H
  const LEN = Math.max(cur.length - 1, 1)

  function linePath(key: string): string {
    const pts = cur
      .map((n, i) => { const v = getVal(n, key); return v != null ? { x: (i/LEN)*W, y: H-(v/maxMin)*H } : null })
      .filter((p): p is {x:number;y:number} => p != null)
    return pts.length < 2 ? '' : pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  }

  const curAvg = avgOf(cur, 'totalMin')
  const prevAvg = avgOf(prev, 'totalMin')
  const pct = curAvg != null && prevAvg != null && prevAvg > 0
    ? Math.round((curAvg - prevAvg) / prevAvg * 100) : null

  const toggle = (key: string) => setHidden(h => { const s = new Set(h); h.has(key) ? s.delete(key) : s.add(key); return s })
  const visible = (key: string) => !hidden.has(key)

  const hasPhases = nights.some(n => n.deepMin != null)
  const pathLen = W * 1.5

  return (
    <div>
      {/* Controls row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', gap:3 }}>
          {PERIODS.map((p, i) => (
            <button key={i} onClick={() => setPeriod(i)}
              style={{ padding:'3px 9px', borderRadius:6, border:'1px solid', fontSize:9, cursor:'pointer',
                borderColor: period===i ? '#3B82F6' : 'var(--border)',
                background: period===i ? 'rgba(59,130,246,0.10)' : 'transparent',
                color: period===i ? '#3B82F6' : 'var(--text-dim)', fontWeight: period===i ? 700 : 400 }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {curAvg != null && <span style={{ fontSize:10, color:'var(--text-dim)' }}>Moy. {fmtMin(Math.round(curAvg))}</span>}
          {pct != null && <span style={{ fontSize:10, fontWeight:700, color: pct >= 0 ? '#10B981' : '#EF4444' }}>
            {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
          </span>}
        </div>
      </div>
      {/* Curve toggles */}
      <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
        {CURVES.map(c => {
          if (c.key !== 'totalMin' && !hasPhases) return null
          const on = visible(c.key)
          return (
            <button key={c.key} onClick={() => toggle(c.key)}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:5, cursor:'pointer',
                background: on ? `${c.color}15` : 'transparent',
                border: `1px solid ${on ? c.color + '60' : 'var(--border)'}`, opacity: on ? 1 : 0.4 }}>
              <div style={{ width: c.dash ? 14 : 12, height: 2, background: c.color, borderRadius: 1,
                backgroundImage: c.dash
                  ? `repeating-linear-gradient(90deg,${c.color} 0,${c.color} 3px,transparent 3px,transparent 6px)`
                  : 'none' }} />
              <span style={{ fontSize:9, color: c.color, fontWeight:600 }}>{c.label}</span>
            </button>
          )
        })}
      </div>
      {/* Chart */}
      <div style={{ overflowX:'auto' }}>
        <svg viewBox={`0 0 ${W} ${H+18}`} style={{ width:'100%', minWidth:240, height:'auto', display:'block' }}>
          {/* 7–9h zone */}
          <rect x={0} y={Y9h} width={W} height={Y7h-Y9h} fill="rgba(16,185,129,0.07)" />
          <line x1={0} y1={Y7h} x2={W} y2={Y7h} stroke="rgba(16,185,129,0.3)" strokeWidth={0.7} strokeDasharray="3 4"/>
          <line x1={0} y1={Y9h} x2={W} y2={Y9h} stroke="rgba(16,185,129,0.3)" strokeWidth={0.7} strokeDasharray="3 4"/>
          <text x={W-3} y={Y7h-2} fill="rgba(16,185,129,0.6)" fontSize={7} textAnchor="end">7h</text>
          <text x={W-3} y={Y9h-2} fill="rgba(16,185,129,0.6)" fontSize={7} textAnchor="end">9h</text>
          {/* Curves */}
          {CURVES.map(c => {
            if (!visible(c.key)) return null
            const path = linePath(c.key)
            if (!path) return null
            return (
              <path key={c.key} d={path} fill="none" stroke={c.color} strokeWidth={c.w}
                strokeDasharray={c.dash ? `4 4` : `${pathLen}`}
                strokeDashoffset={c.dash ? 0 : animated ? 0 : pathLen}
                style={{ transition: c.dash ? 'none' : 'stroke-dashoffset 1.5s ease-out' }} />
            )
          })}
          {/* X axis */}
          {cur.map((n, i) => {
            if (i % Math.max(1, Math.floor(cur.length / 6)) !== 0) return null
            return <text key={i} x={(i/LEN)*W} y={H+14} fill="var(--text-dim)" fontSize={7} textAnchor="middle">{n.date.slice(5)}</text>
          })}
        </svg>
      </div>
    </div>
  )
}
