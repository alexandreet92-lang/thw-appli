'use client'

import { useMemo, useState, useEffect } from 'react'
import type { CheckInRow } from './types'
import { fmtHours } from './types'
import SleepHypnogram from './SleepHypnogram'

const TREND_DAYS = 14

interface Props {
  checkin: CheckInRow | null
  history: CheckInRow[]
}

function MiniDonut({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const R = 20; const C = 2 * Math.PI * R
  const [offset, setOffset] = useState(C)
  useEffect(() => { const id = setTimeout(() => setOffset(C - (value / max) * C), 80); return () => clearTimeout(id) }, [value, max, C])
  return (
    <svg width={50} height={50} viewBox="0 0 50 50">
      <circle cx={25} cy={25} r={R} fill="none" stroke="var(--border)" strokeWidth={5} />
      <circle cx={25} cy={25} r={R} fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
        transform="rotate(-90 25 25)" style={{ transition:'stroke-dashoffset 1.2s ease-out' }} />
      <text x={25} y={29} textAnchor="middle" fill={color} fontSize={12} fontWeight={700}>{value}</text>
    </svg>
  )
}

function SleepTrend({ data }: { data: { date: string; quality: number; hours: number | null }[] }) {
  const W = 280, H = 50
  const [animated, setAnimated] = useState(false)

  useEffect(() => { const id = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(id) }, [])

  if (data.length < 2) return null

  const minQ = 0, maxQ = 10
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((d.quality - minQ) / (maxQ - minQ)) * H
    return { x, y }
  })
  const path = pts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const pathLen = W * 1.2

  return (
    <div style={{ overflowX:'auto' as const }}>
      <svg viewBox={`0 0 ${W} ${H+20}`} style={{ width:'100%',minWidth:200,height:'auto',display:'block' }}>
        {/* BG bands */}
        <rect x={0} y={0} width={W} height={H*0.2} fill="rgba(16,185,129,0.08)" />
        <rect x={0} y={H*0.2} width={W} height={H*0.4} fill="rgba(59,143,212,0.06)" />
        <rect x={0} y={H*0.6} width={W} height={H*0.4} fill="rgba(239,68,68,0.06)" />
        <path d={path} fill="none" stroke="#8B5CF6" strokeWidth={2} strokeLinecap="round"
          strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition:'stroke-dashoffset 1s ease-out' }} />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#8B5CF6" opacity={0.7} />
        ))}
        {data.map((d, i) => i % 3 === 0 && (
          <text key={i} x={pts[i].x} y={H+16} fill="var(--text-dim)" fontSize={8} textAnchor="middle">{d.date.slice(5)}</text>
        ))}
      </svg>
    </div>
  )
}

export default function SleepSection({ checkin, history }: Props) {
  const trend = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - TREND_DAYS)
    const cs = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`
    return history
      .filter(c => c.date >= cs)
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(c => ({ date: c.date, quality: c.sleep_quality, hours: c.sleep_hours ?? null }))
  }, [history])

  const avgQuality = trend.length ? Math.round(trend.reduce((s,d)=>s+d.quality,0)/trend.length*10)/10 : null
  const avgHours   = trend.filter(d=>d.hours).length
    ? Math.round(trend.filter(d=>d.hours).reduce((s,d)=>s+(d.hours??0),0) / trend.filter(d=>d.hours).length * 10) / 10
    : null

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Sommeil</p>
      <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 16px' }}>Analyse du sommeil</h2>

      {/* Cards row */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
        <div style={{ padding:'14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid #E5E7EB',display:'flex',alignItems:'center',gap:12 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,margin:0,color:'#8B5CF6' }}>
              {checkin?.sleep_hours ? fmtHours(checkin.sleep_hours) : avgHours ? fmtHours(avgHours) : '—'}
            </p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>Durée estimée</p>
            {!checkin?.sleep_hours && avgHours && <p style={{ fontSize:9,color:'var(--text-dim)',margin:'1px 0 0',fontStyle:'italic' }}>moyenne {TREND_DAYS}j</p>}
          </div>
        </div>
        <div style={{ padding:'14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid #E5E7EB',display:'flex',alignItems:'center',gap:12 }}>
          <MiniDonut value={checkin?.sleep_quality ?? avgQuality ?? 0} color="#8B5CF6" />
          <div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,margin:0,color:'#8B5CF6' }}>
              {checkin?.sleep_quality ?? (avgQuality ? avgQuality.toFixed(1) : '—')}/10
            </p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>Qualité ressentie</p>
            {!checkin && avgQuality && <p style={{ fontSize:9,color:'var(--text-dim)',margin:'1px 0 0',fontStyle:'italic' }}>moyenne {TREND_DAYS}j</p>}
          </div>
        </div>
      </div>

      {/* Trend */}
      {trend.length >= 3 ? (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:11,fontWeight:600,color:'var(--text-dim)',margin:'0 0 8px' }}>Qualité du sommeil — 14 derniers jours</p>
          <SleepTrend data={trend} />
        </div>
      ) : (
        <p style={{ fontSize:11,color:'var(--text-dim)',textAlign:'center' as const,margin:'0 0 16px',fontStyle:'italic' }}>
          Continue tes check-ins pour voir ta tendance sommeil
        </p>
      )}

      {/* Hypnogram */}
      <div style={{ marginBottom:4 }}>
        <p style={{ fontSize:11,fontWeight:600,color:'var(--text-dim)',margin:'0 0 8px' }}>Hypnogramme</p>
        <SleepHypnogram />
      </div>
    </div>
  )
}
