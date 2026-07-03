'use client'

import { useEffect, useState, useRef } from 'react'
import type { CheckInRow } from './types'
import { calcScore, scoreStatus, metricDotColor, fmtHours } from './types'
import { useI18n } from '@/lib/i18n'

const METRICS = [
  { key: 'fatigue'     as const, labelKey: 'recovery.metric.fatigue',    inverted: true,  color: '#ef4444' },
  { key: 'energy'      as const, labelKey: 'recovery.metric.energy',    inverted: false, color: '#10B981' },
  { key: 'stress'      as const, labelKey: 'recovery.metric.stress',     inverted: true,  color: '#ef4444' },
  { key: 'motivation'  as const, labelKey: 'recovery.metric.motivation', inverted: false, color: '#10B981' },
  { key: 'pain'        as const, labelKey: 'recovery.metric.pain',   inverted: true,  color: '#ef4444' },
]

interface Props {
  checkin: CheckInRow | null
  history: CheckInRow[]
  streak: number
  onCheckIn: () => void
}

function AnimatedCount({ target, color }: { target: number; color: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 900, 1)
      setVal(Math.round(p * target))
      if (p < 1) requestAnimationFrame(step)
    }
    const id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target])
  return <span style={{ fontFamily:'Syne,sans-serif', fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{val}</span>
}

function DonutScore({ score, color }: { score: number; color: string }) {
  const R = 52; const C = 2 * Math.PI * R
  const [offset, setOffset] = useState(C)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setOffset(C - (score / 100) * C), 80)
    })
    return () => cancelAnimationFrame(id)
  }, [score, C])
  return (
    <svg width={130} height={130} viewBox="0 0 130 130" style={{ overflow: 'visible' }}>
      <circle cx={65} cy={65} r={R} fill="none" stroke="var(--border)" strokeWidth={10} />
      <circle cx={65} cy={65} r={R} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
    </svg>
  )
}

export default function DailyScore({ checkin, history, streak, onCheckIn }: Props) {
  const { t } = useI18n()
  const [barMounted, setBarMounted] = useState(false)
  const last7 = history.slice(0, 7)

  useEffect(() => {
    const id = setTimeout(() => setBarMounted(true), 100)
    return () => clearTimeout(id)
  }, [])

  if (!checkin) {
    return (
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:28,boxShadow:'var(--shadow-card)',textAlign:'center' as const }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:8 }}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <p style={{ fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:700,margin:'0 0 6px' }}>{t('recovery.dailyScore.empty.title')}</p>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:'0 0 18px' }}>{t('recovery.dailyScore.empty.subtitle')}</p>
        <button onClick={onCheckIn} style={{ padding:'11px 28px',borderRadius:12,background:'linear-gradient(135deg,#3B8FD4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer' }}>
          ✦ {t('recovery.checkinMorning')}
        </button>
      </div>
    )
  }

  const score = calcScore(checkin)
  const st = scoreStatus(score)

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)',display:'flex',gap:24,flexWrap:'wrap' as const }}>
      {/* Left: donut */}
      <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'center',gap:8,minWidth:130 }}>
        <div style={{ position:'relative' as const,width:130,height:130,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ position:'absolute' as const,inset:0 }}>
            <DonutScore score={score} color={st.color} />
          </div>
          <div style={{ position:'absolute' as const,textAlign:'center' as const }}>
            <AnimatedCount target={score} color={st.color} />
            <p style={{ fontSize:9,color:'var(--text-dim)',margin:0,letterSpacing:'0.06em',textTransform:'uppercase' as const }}>/ 100</p>
          </div>
        </div>
        <span style={{ padding:'3px 10px',borderRadius:20,background:st.bg,color:st.color,fontSize:11,fontWeight:700 }}>{st.label}</span>
        <p style={{ fontSize:10,color:'var(--text-dim)',textAlign:'center' as const,margin:0,maxWidth:120,lineHeight:1.4 }}>{st.desc}</p>
        {streak >= 2 && <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>{t('recovery.dailyScore.streak', { n: streak })}</p>}
      </div>

      {/* Right: cards + bars */}
      <div style={{ flex:1,minWidth:220,display:'flex',flexDirection:'column' as const,gap:12 }}>
        <div style={{ display:'flex',justifyContent:'flex-end' }}>
          <button onClick={onCheckIn} style={{ padding:'5px 11px',borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:10,cursor:'pointer' }}>{t('recovery.editCheckin')}</button>
        </div>
        {/* Metric cards row */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7 }}>
          {[{l:'recovery.card.restingHr',v:'—',sub:'recovery.card.sub.devices1'},{l:'recovery.card.hrv',v:'—',sub:'recovery.card.sub.devices2'},{l:'recovery.card.sleep',v:fmtHours(checkin.sleep_hours),sub:'recovery.card.estimatedCheckin'}].map(c=>(
            <div key={c.l} style={{ padding:'8px 10px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',textAlign:'center' as const }}>
              <p style={{ fontSize:8,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 3px' }}>{t(c.l)}</p>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:c.v==='—'?'var(--text-dim)':'var(--text)',margin:0 }}>{c.v}</p>
              <p style={{ fontSize:8,color:'var(--text-dim)',margin:'2px 0 0',lineHeight:1.3 }}>{t(c.sub)}</p>
            </div>
          ))}
        </div>
        {/* Metric bars */}
        {METRICS.map((m, i) => {
          const v = checkin[m.key] as number
          const pct = (v / 10) * 100
          return (
            <div key={m.key}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3 }}>
                <span style={{ fontSize:11,color:'var(--text-mid)',fontWeight:500 }}>{t(m.labelKey)}</span>
                <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',color:m.color,fontWeight:700 }}>{v}/10</span>
              </div>
              <div style={{ height:6,borderRadius:6,background:'var(--border)',overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:6,background:`linear-gradient(90deg,${m.color}99,${m.color})`,width:barMounted?`${pct}%`:'0%',transition:`width 0.8s ease-out ${i*100}ms` }} />
              </div>
              <div style={{ display:'flex',gap:3,marginTop:4 }}>
                {last7.map((h,j)=>(
                  <div key={j} style={{ width:8,height:8,borderRadius:'50%',background:metricDotColor(h[m.key] as number,m.inverted) }} title={`${h.date}: ${h[m.key]}/10`} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
