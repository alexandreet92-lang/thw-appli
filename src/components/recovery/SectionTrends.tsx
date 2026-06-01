'use client'

import { useState } from 'react'
import LineChart from './LineChart'
import { calcRecoveryScore, metricColor } from './helpers'
import type { CheckInRow } from './types'

interface Props { history: CheckInRow[] }

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0
}

export default function SectionTrends({ history }: Props) {
  const [range, setRange] = useState<7|30>(7)

  const items = history.slice(0, range).reverse() // chronologique

  if (items.length < 3) {
    return (
      <div className="card-enter card-enter-2" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)',marginBottom:16 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 6px' }}>Recovery Trends</p>
        <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 16px' }}>Tendances</h2>
        <div style={{ padding:'20px',textAlign:'center' as const,borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
          <p style={{ fontSize:13,color:'var(--text-dim)',margin:0 }}>Continue tes check-ins quotidiens pour voir tes tendances</p>
          <p style={{ fontSize:11,color:'var(--text-dim)',margin:'6px 0 0' }}>{items.length}/3 check-ins enregistrés</p>
        </div>
      </div>
    )
  }

  const scores     = items.map(c => calcRecoveryScore(c))
  const fatigues   = items.map(c => c.fatigue)
  const energies   = items.map(c => c.energy)
  const stresses   = items.map(c => c.stress)
  const sleeps     = items.map(c => c.sleep_quality)
  const dayLabels  = items.map(c => { const d=new Date(c.date+'T12:00:00'); return ['D','L','M','M','J','V','S'][d.getDay()] })

  const todayScore = scores[scores.length-1]
  const scoreColor = todayScore >= 81 ? '#22c55e' : todayScore >= 61 ? '#06B6D4' : todayScore >= 41 ? '#f97316' : '#ef4444'

  const CHARTS = [
    { key:'score',   label:'Score',   unit:'',    values:scores,   color:scoreColor,  today:todayScore, avgFn:avg, higher:true },
    { key:'fatigue', label:'Fatigue', unit:'/10', values:fatigues, color:'#f97316',   today:fatigues[fatigues.length-1], avgFn:avg, higher:false },
    { key:'energy',  label:'Énergie', unit:'/10', values:energies, color:'#22c55e',   today:energies[energies.length-1], avgFn:avg, higher:true },
    { key:'stress',  label:'Stress',  unit:'/10', values:stresses, color:'#ef4444',   today:stresses[stresses.length-1], avgFn:avg, higher:false },
    { key:'sleep',   label:'Sommeil', unit:'/10', values:sleeps,   color:'#a855f7',   today:sleeps[sleeps.length-1], avgFn:avg, higher:true },
  ]

  const reco = todayScore >= 80
    ? { text:'Conditions optimales pour un effort intense.', color:'#22c55e' }
    : todayScore >= 61
    ? { text:'Intensité modérée recommandée.', color:'#06B6D4' }
    : { text:'Privilégie la récupération active ou le repos.', color:'#f97316' }

  return (
    <div className="card-enter card-enter-2" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)',marginBottom:16 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Recovery Trends</p>
          <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'3px 0 0' }}>Tendances</h2>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {([7,30] as const).map(v=>(
            <button key={v} onClick={()=>setRange(v)}
              style={{ padding:'5px 12px',borderRadius:8,border:`1px solid ${range===v?'#06B6D4':'var(--border)'}`,background:range===v?'rgba(6,182,212,0.10)':'var(--bg-card2)',color:range===v?'#06B6D4':'var(--text-dim)',fontSize:10,fontWeight:600,cursor:'pointer' }}>
              {v} jours
            </button>
          ))}
        </div>
      </div>

      {/* Recommandation */}
      <div style={{ padding:'10px 14px',borderRadius:12,background:`${reco.color}14`,border:`1px solid ${reco.color}33`,marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:reco.color,flexShrink:0 }}/>
          <p style={{ fontSize:12,color:reco.color,fontWeight:600,margin:0 }}>{reco.text}</p>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12 }}>
        {CHARTS.map(chart=>{
          const mean  = Math.round(avg(chart.values) * 10) / 10
          const last  = chart.today
          const delta = Math.round((last - mean) * 10) / 10
          const up    = chart.higher ? delta >= 0 : delta <= 0
          return (
            <div key={chart.key} style={{ padding:'14px',borderRadius:14,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',margin:0 }}>{chart.label}</p>
                  <p style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:chart.color,margin:'2px 0 0',lineHeight:1 }}>
                    {last}<span style={{ fontSize:10,fontWeight:400,color:'var(--text-dim)' }}>{chart.unit}</span>
                  </p>
                </div>
                <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'flex-end',gap:2 }}>
                  <span style={{ fontSize:10,fontWeight:600,color:up?'#22c55e':'#ef4444' }}>
                    {delta>=0?'+':''}{delta}
                  </span>
                  <span style={{ fontSize:9,color:'var(--text-dim)' }}>moy. {mean}{chart.unit}</span>
                </div>
              </div>
              <div style={{ height:56 }}><LineChart values={chart.values} color={chart.color} height={56}/></div>
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:4 }}>
                {dayLabels.map((l,i)=>(
                  <span key={i} style={{ fontSize:8,color:'var(--text-dim)',textAlign:'center' as const,flex:1 }}>{l}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
