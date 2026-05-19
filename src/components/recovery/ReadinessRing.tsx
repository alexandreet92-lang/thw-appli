'use client'

import { useState, useEffect } from 'react'
import { scoreStatus, metricColor } from './helpers'

// ── Readiness Ring ─────────────────────────────────────────────
interface RingProps { score: number | null; size?: number }

export function ReadinessRing({ score, size = 140 }: RingProps) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id) }, [])

  const isEmpty = score === null
  const s = isEmpty ? null : scoreStatus(score!)
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const off = isEmpty ? c : c - ((score! / 100) * c)
  const strokeColor = s?.color ?? 'var(--border)'

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="10"/>
        {!isEmpty && (
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={strokeColor} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={ready ? off : c}
            style={{ filter:`drop-shadow(0 0 6px ${strokeColor}66)`, transition:'stroke-dashoffset 1.1s cubic-bezier(0.25,1,0.5,1)', willChange:'stroke-dashoffset' }}/>
        )}
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        {isEmpty
          ? <span style={{ fontSize:28, color:'var(--text-dim)', fontFamily:'Syne,sans-serif', fontWeight:700 }}>—</span>
          : <>
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:size > 120 ? 36 : 28, color:strokeColor, lineHeight:1 }}>{score}</span>
              <span style={{ fontSize:9, textTransform:'uppercase' as const, letterSpacing:'0.08em', color:'var(--text-dim)', marginTop:2 }}>/100</span>
            </>
        }
      </div>
    </div>
  )
}

// ── Metric Bar ─────────────────────────────────────────────────
interface BarProps { label: string; value: number | null; inverted?: boolean }

export function MetricBar({ label, value, inverted = false }: BarProps) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id) }, [])

  const color = value !== null ? metricColor(value, inverted) : 'var(--border)'
  const pct   = value !== null ? value * 10 : 0

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'var(--text-mid)' }}>{label}</span>
        {value !== null
          ? <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, color }}>{value}<span style={{ fontSize:9, color:'var(--text-dim)', fontWeight:400 }}>/10</span></span>
          : <span style={{ fontSize:12, color:'var(--text-dim)' }}>—</span>
        }
      </div>
      <div style={{ height:4, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${pct}%`, background:color, borderRadius:99,
          transformOrigin:'left center',
          transform: ready ? 'scaleX(1)' : 'scaleX(0)',
          transition:'transform 1.1s cubic-bezier(0.25,1,0.5,1)',
          willChange:'transform',
        }}/>
      </div>
    </div>
  )
}
