'use client'
import { useEffect, useState } from 'react'

interface Props {
  todayHrv: number
  avg7: number
  allTime: number[]
}

export default function HrvDaily({ todayHrv, avg7, allTime }: Props) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const id = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(id) }, [])

  const diff = todayHrv - avg7
  const arrowColor = diff >= 2 ? '#10B981' : diff <= -2 ? '#EF4444' : '#F59E0B'

  const min = Math.min(...allTime), max = Math.max(...allTime)
  const range = Math.max(max - min, 1)
  const pct = Math.min(Math.max((todayHrv - min) / range, 0), 1)

  // Context bar: 5 zones (bad-lo | warn-lo | good | warn-hi | bad-hi)
  const ZONES = [
    { w: 15, color: '#EF444435', label: '' },
    { w: 20, color: '#F59E0B35', label: '' },
    { w: 30, color: '#10B98135', label: '' },
    { w: 20, color: '#F59E0B35', label: '' },
    { w: 15, color: '#EF444435', label: '' },
  ]

  // Animated ring for value
  const R = 22, C = 2 * Math.PI * R
  const scorePct = pct
  const [offset, setOffset] = useState(C)
  useEffect(() => { setOffset(animated ? C - scorePct * C : C) }, [animated, scorePct, C])

  const ringColor = pct < 0.3 ? '#EF4444' : pct < 0.45 ? '#F59E0B' : pct < 0.75 ? '#10B981' : '#F59E0B'

  return (
    <div style={{
      padding: '18px', borderRadius: 14,
      background: 'var(--bg-card2)', border: '1px solid var(--border)',
    }}>
      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <svg width={54} height={54} viewBox="0 0 54 54" style={{ flexShrink: 0 }}>
          <circle cx={27} cy={27} r={R} fill="none" stroke="var(--border)" strokeWidth={5} />
          <circle cx={27} cy={27} r={R} fill="none" stroke={ringColor} strokeWidth={5}
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
            transform="rotate(-90 27 27)" style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
        </svg>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>
              {Math.round(todayHrv)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>ms</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: arrowColor }}>
              {diff >= 0 ? '↑' : '↓'} {Math.abs(Math.round(diff))} ms
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>vs moy. 7j</span>
          </div>
        </div>
      </div>

      {/* Context bar */}
      <div>
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
          {ZONES.map((z, i) => (
            <div key={i} style={{ width: `${z.w}%`, background: z.color }} />
          ))}
        </div>
        {/* Marker triangle */}
        <div style={{ position: 'relative', height: 10 }}>
          <div style={{
            position: 'absolute',
            left: `calc(${animated ? pct * 100 : 0}% - 4px)`,
            top: 1,
            transition: 'left 0.8s ease-out',
            width: 0, height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: `7px solid ${ringColor}`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-dim)', marginTop: 2 }}>
          <span>{Math.round(min)} ms</span>
          <span>Plage personnelle</span>
          <span>{Math.round(max)} ms</span>
        </div>
      </div>
    </div>
  )
}
