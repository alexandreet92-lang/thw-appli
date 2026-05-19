'use client'

import { useMemo, useState, useEffect } from 'react'
import type { CheckInRow, ActivityRow } from './types'
import { calcScore, estimateTss } from './types'

const PERIODS = [{ label:'14j', days:14 }, { label:'30j', days:30 }, { label:'90j', days:90 }]
const METRICS = [
  { key:'score' as const,       label:'Score',      color:'#3B8FD4', inverted:false },
  { key:'fatigue' as const,     label:'Fatigue',    color:'#ef4444', inverted:true  },
  { key:'energy' as const,      label:'Énergie',    color:'#10B981', inverted:false },
  { key:'stress' as const,      label:'Stress',     color:'#ef4444', inverted:true  },
  { key:'motivation' as const,  label:'Motivation', color:'#10B981', inverted:false },
  { key:'sleep_quality' as const, label:'Sommeil',  color:'#8B5CF6', inverted:false },
]

type MetricKey = 'score'|'fatigue'|'energy'|'stress'|'motivation'|'sleep_quality'

function getVal(c: CheckInRow, key: MetricKey): number {
  if (key === 'score') return calcScore(c)
  return c[key] as number
}
function getMax(key: MetricKey): number { return key === 'score' ? 100 : 10 }

interface ScoredCheckin extends CheckInRow { score: number }

function LinePath({ pts, W, H, minV, maxV, color, delayMs = 0 }: { pts:{x:number;y:number}[], W:number, H:number, minV:number, maxV:number, color:string, delayMs?:number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const id = setTimeout(()=>setAnimated(true), delayMs+50); return ()=>clearTimeout(id) }, [delayMs])
  if (pts.length < 2) return null
  const path = pts.map((p,i)=>`${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const len = W * 1.2
  return <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"
    strokeDasharray={len} strokeDashoffset={animated?0:len} style={{ transition:`stroke-dashoffset 0.6s ease-out ${delayMs}ms` }} />
}

function Sparkline({ data, metricKey, color, delayMs }: { data: ScoredCheckin[], metricKey: MetricKey, color: string, delayMs: number }) {
  const W = 90, H = 30
  const vals = data.map(c => getVal(c, metricKey))
  const mn = Math.min(...vals,0), mx = Math.max(...vals, getMax(metricKey))
  const pts = data.map((_, i) => ({ x: (i/(data.length-1))*W, y: H - ((vals[i]-mn)/(mx-mn||1))*H }))
  const cur = vals[vals.length-1] ?? 0
  const avg = Math.round(vals.reduce((s,v)=>s+v,0)/vals.length)
  const delta = cur - avg
  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4 }}>
        <span style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color }}>{cur}</span>
        <span style={{ fontSize:10,color:delta>=0?'#10B981':'#ef4444',fontWeight:600 }}>{delta>=0?'+':''}{delta} vs moy.</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%',height:H,display:'block' }}>
        <LinePath pts={pts} W={W} H={H} minV={mn} maxV={mx} color={color} delayMs={delayMs} />
      </svg>
    </div>
  )
}

export default function RecoveryTrends({ history, activities }: { history: CheckInRow[], activities: ActivityRow[] }) {
  const [period, setPeriod] = useState(0)
  const [tooltip, setTooltip] = useState<{ x:number; y:number; c:ScoredCheckin } | null>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => { setAnimated(false); const id = setTimeout(()=>setAnimated(true),80); return ()=>clearTimeout(id) }, [period])

  const data = useMemo<ScoredCheckin[]>(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - PERIODS[period].days)
    const cs = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`
    return history
      .filter(c => c.date >= cs)
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(c => ({ ...c, score: calcScore(c) }))
  }, [history, period])

  if (history.length < 3) {
    return (
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:36,textAlign:'center' as const,boxShadow:'var(--shadow-card)' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom:8 }}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 6px' }}>Tendances</p>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:0 }}>
          Continue tes check-ins quotidiens pour voir tes tendances ({history.length}/3 enregistrés)
        </p>
      </div>
    )
  }

  const W = 600, H = 100
  const scores = data.map(c => c.score)
  const pts = data.map((_, i) => ({ x: (i/(data.length-1||1))*W, y: H - (scores[i]/100)*H }))
  const pathLine = pts.map((p,i)=>`${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const pathLen = W*1.2

  // Correlation: yesterday TSS vs today score
  const corrData = data.slice(1).map((c,i) => {
    const prev = data[i]
    const prevDay = prev.date
    const tss = activities.filter(a=>a.started_at.slice(0,10)===prevDay).reduce((s,a)=>s+estimateTss(a),0)
    return { tss, score: c.score }
  }).filter(d => d.tss > 0)
  const maxTss = Math.max(...corrData.map(d=>d.tss),1)

  return (
    <div style={{ display:'flex',flexDirection:'column' as const,gap:16 }}>
      {/* Score trend */}
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap' as const,gap:8 }}>
          <div>
            <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Tendances</p>
            <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'2px 0 0' }}>Score de récupération</h2>
          </div>
          <div style={{ display:'flex',gap:4 }}>
            {PERIODS.map((p,i)=>(
              <button key={i} onClick={()=>setPeriod(i)} style={{ padding:'4px 10px',borderRadius:7,border:'1px solid',fontSize:10,cursor:'pointer',borderColor:period===i?'#3B8FD4':'var(--border)',background:period===i?'rgba(59,143,212,0.12)':'var(--bg-card)',color:period===i?'#3B8FD4':'var(--text-mid)',fontWeight:period===i?600:400 }}>{p.label}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX:'auto' as const,position:'relative' as const }}>
          <svg viewBox={`0 0 ${W} ${H+20}`} style={{ width:'100%',minWidth:280,height:'auto',display:'block',cursor:'crosshair' }}
            onMouseMove={e=>{
              const r=e.currentTarget.getBoundingClientRect(); const rx=e.clientX-r.left
              const idx=Math.round((rx/r.width)*(data.length-1))
              const c=data[Math.max(0,Math.min(idx,data.length-1))]
              if(c) setTooltip({x:rx,y:e.clientY-r.top,c})
            }}
            onMouseLeave={()=>setTooltip(null)}>
            {/* BG zones */}
            <rect x={0} y={0} width={W} height={H*0.2} fill="rgba(16,185,129,0.08)" />
            <rect x={0} y={H*0.2} width={W} height={H*0.2} fill="rgba(59,143,212,0.06)" />
            <rect x={0} y={H*0.4} width={W} height={H*0.2} fill="rgba(249,115,22,0.06)" />
            <rect x={0} y={H*0.6} width={W} height={H*0.4} fill="rgba(239,68,68,0.06)" />
            {animated && <path d={pathLine} fill="none" stroke="#3B8FD4" strokeWidth={2.5} strokeLinecap="round"
              strokeDasharray={pathLen} strokeDashoffset={0} style={{ animation:'rcTrend 1.5s ease-out' }} />}
            {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#3B8FD4" opacity={0.6} />)}
            {data.map((c,i)=> i%Math.max(1,Math.floor(data.length/7))===0 && (
              <text key={i} x={pts[i].x} y={H+16} fill="var(--text-dim)" fontSize={9} textAnchor="middle">{c.date.slice(5)}</text>
            ))}
          </svg>
          {tooltip && (
            <div style={{ position:'absolute' as const,left:tooltip.x+8,top:Math.max(tooltip.y-50,0),background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,padding:'7px 10px',fontSize:11,pointerEvents:'none' as const,boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:10 }}>
              <p style={{ margin:'0 0 2px',fontWeight:600 }}>{tooltip.c.date}</p>
              <p style={{ margin:0,color:'#3B8FD4',fontWeight:600 }}>Score: {tooltip.c.score}/100</p>
              <p style={{ margin:'2px 0 0',fontSize:10,color:'var(--text-dim)' }}>F:{tooltip.c.fatigue} É:{tooltip.c.energy} S:{tooltip.c.stress} M:{tooltip.c.motivation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sparklines grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12 }}>
        {METRICS.map((m, mi) => (
          <div key={m.key} style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 14px',boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 6px' }}>{m.label}</p>
            {data.length >= 2 ? <Sparkline data={data} metricKey={m.key} color={m.color} delayMs={mi*80} /> : <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>—</p>}
          </div>
        ))}
      </div>

      {/* Correlation */}
      {corrData.length >= 5 && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Corrélation</p>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 14px' }}>Charge → Récupération (J+1)</h3>
          <div style={{ overflowX:'auto' as const }}>
            <svg viewBox={`0 0 ${W} 80`} style={{ width:'100%',minWidth:250,height:'auto',display:'block' }}>
              {corrData.map((d,i)=>{
                const x=(i/(corrData.length-1||1))*W
                const bh=(d.tss/maxTss)*60
                const cy=70-(d.score/100)*60
                return (
                  <g key={i}>
                    <rect x={x-4} y={70-bh} width={8} height={bh} fill="rgba(249,115,22,0.5)" rx={2} />
                    <circle cx={x} cy={cy} r={4} fill="#3B8FD4" opacity={0.8} style={{ animation:`rcDot 0.4s ease-out ${i*50}ms both` }} />
                  </g>
                )
              })}
            </svg>
          </div>
          <div style={{ display:'flex',gap:16,marginTop:6 }}>
            <div style={{ display:'flex',alignItems:'center',gap:5 }}><div style={{ width:10,height:10,borderRadius:2,background:'rgba(249,115,22,0.5)' }} /><span style={{ fontSize:10,color:'var(--text-dim)' }}>TSS veille (barres)</span></div>
            <div style={{ display:'flex',alignItems:'center',gap:5 }}><div style={{ width:10,height:10,borderRadius:'50%',background:'#3B8FD4' }} /><span style={{ fontSize:10,color:'var(--text-dim)' }}>Score récup J+1</span></div>
          </div>
        </div>
      )}
      <style>{`@keyframes rcTrend{from{stroke-dashoffset:${W*1.2}px}to{stroke-dashoffset:0}} @keyframes rcDot{from{opacity:0;transform:scale(0)}to{opacity:0.8;transform:scale(1)}}`}</style>
    </div>
  )
}
