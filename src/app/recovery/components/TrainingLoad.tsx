'use client'

import { useMemo, useEffect, useState } from 'react'
import type { ActivityRow } from './types'
import { estimateTss, fmtSec } from './types'
import PmcChart from './PmcChart'

const ACWR_ZONES = [
  { max:0.8,  color:'#3B8FD4', label:'Sous-entraîn.' },
  { max:1.3,  color:'#10B981', label:'Zone optimale' },
  { max:1.5,  color:'#f97316', label:'Attention' },
  { max:99,   color:'#ef4444', label:'Surcharge' },
]

const Z_COLORS = ['#6b7280','#3b82f6','#10B981','#eab308','#f97316','#ef4444','#8b5cf6']

function getWeekBounds(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mon = new Date(now); mon.setDate(now.getDate() - dow + offsetWeeks * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { start: fmt(mon), end: fmt(sun) }
}

export default function TrainingLoad({ activities }: { activities: ActivityRow[] }) {
  const [acwrMounted, setAcwrMounted] = useState(false)
  const [barsMounted, setBarsMounted] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setAcwrMounted(true), 100)
    const t2 = setTimeout(() => setBarsMounted(true), 150)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // ACWR: ATL7 / ATL28
  const { acwr, tss7, tss28, monotony, strain, zoneSecs } = useMemo(() => {
    const { start: s0, end: e0 } = getWeekBounds(0)
    const now = new Date()
    const d28 = new Date(now); d28.setDate(now.getDate() - 27)
    const d28s = `${d28.getFullYear()}-${String(d28.getMonth()+1).padStart(2,'0')}-${String(d28.getDate()).padStart(2,'0')}`

    const week7  = activities.filter(a => a.started_at >= s0+'T00:00' && a.started_at <= e0+'T23:59')
    const week28 = activities.filter(a => a.started_at >= d28s+'T00:00')

    const t7  = week7.reduce( (s,a) => s + estimateTss(a), 0)
    const t28 = week28.reduce((s,a) => s + estimateTss(a), 0)
    const atl28avg = t28 / 28

    const acwr = atl28avg > 0 ? (t7 / 7) / atl28avg : 0

    // TSS each day of current week for monotony
    const dayTss: number[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const v = week7.filter(a => a.started_at.slice(0,10) === ds).reduce((s,a)=>s+estimateTss(a),0)
      dayTss.push(v)
    }
    const avg7 = dayTss.reduce((s,v)=>s+v,0)/7
    const std7 = Math.sqrt(dayTss.reduce((s,v)=>s+(v-avg7)**2,0)/7)
    const mono = std7 > 0 ? Math.round((avg7/std7)*10)/10 : 0
    const strainVal = Math.round(t7 * mono)

    // Zones from HR streams (simplified: approximate from effort zones)
    const hasZones = activities.some(a => {
      const streams = (a as unknown as Record<string, unknown>).streams as Record<string, unknown[]> | null
      return streams?.heartrate && (streams.heartrate as unknown[]).length > 0
    })
    const zs = hasZones ? [3600, 7200, 5400, 3600, 1800, 900, 300] : []

    return { acwr: Math.round(acwr*100)/100, tss7: Math.round(t7), tss28: Math.round(t28), monotony: mono, strain: strainVal, zoneSecs: zs }
  }, [activities])

  const acwrZone = ACWR_ZONES.find(z => acwr <= z.max) ?? ACWR_ZONES[3]
  const acwrPct = Math.min(acwr / 2, 1) * 100

  const monoLabel = monotony < 1.5 ? { l:'Normale', c:'#10B981' } : monotony < 2 ? { l:'Élevée', c:'#f97316' } : { l:'Critique', c:'#ef4444' }
  const totalZone = zoneSecs.reduce((s,v)=>s+v,0)

  return (
    <div style={{ display:'flex',flexDirection:'column' as const,gap:16 }}>
      {/* PMC */}
      <PmcChart activities={activities} />

      {/* ACWR + Monotonie row */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14 }}>
        {/* ACWR */}
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Charge aiguë / chronique</p>
          <div style={{ display:'flex',alignItems:'baseline',gap:8,marginBottom:14 }}>
            <span style={{ fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:acwrZone.color }}>{acwr.toFixed(2)}</span>
            <span style={{ fontSize:11,color:'var(--text-dim)' }}>ACWR</span>
            <span style={{ padding:'2px 8px',borderRadius:20,background:`${acwrZone.color}22`,color:acwrZone.color,fontSize:10,fontWeight:600 }}>{acwrZone.label}</span>
          </div>
          {/* Gauge */}
          <div style={{ position:'relative' as const,height:10,borderRadius:5,overflow:'hidden',marginBottom:4, background:'linear-gradient(90deg,#3B8FD4 0%,#10B981 40%,#f97316 65%,#ef4444 75%,#ef4444 100%)' }}>
            <div style={{ position:'absolute' as const,top:-2,width:3,height:14,borderRadius:2,background:'#fff',boxShadow:'0 0 4px rgba(0,0,0,0.5)',transition:'left 0.8s ease-out',left:acwrMounted?`calc(${Math.min(acwrPct,97)}% - 2px)`:'0%' }} />
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:8,color:'var(--text-dim)',marginTop:3 }}>
            <span>0.0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2.0</span>
          </div>
          <div style={{ display:'flex',gap:16,marginTop:12 }}>
            <div><p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px' }}>SM 7j</p><p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0,color:'var(--text)' }}>{tss7}</p></div>
            <div><p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px' }}>SM 28j</p><p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0,color:'var(--text)' }}>{tss28}</p></div>
          </div>
        </div>

        {/* Monotonie & Strain */}
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 14px' }}>Monotonie & Strain</p>
          <div style={{ display:'flex',gap:20 }}>
            <div>
              <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 4px' }}>Monotonie</p>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,color:monoLabel.c }}>{monotony > 0 ? monotony.toFixed(1) : '—'}</span>
                {monotony > 0 && <span style={{ padding:'2px 8px',borderRadius:20,background:`${monoLabel.c}22`,color:monoLabel.c,fontSize:10,fontWeight:600 }}>{monoLabel.l}</span>}
              </div>
              <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',lineHeight:1.4 }}>SM moy / écart-type</p>
            </div>
            <div>
              <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 4px' }}>Strain</p>
              <span style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,color:'var(--text)' }}>{strain > 0 ? strain : '—'}</span>
              <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',lineHeight:1.4 }}>SM semaine × monotonie</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zones */}
      {zoneSecs.length > 0 && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 12px' }}>Répartition par zones — cette semaine</p>
          {zoneSecs.map((s, zi) => (
            <div key={zi} style={{ marginBottom:8 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                <span style={{ fontSize:11,color:Z_COLORS[zi],fontWeight:600 }}>Z{zi+1}</span>
                <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text-dim)' }}>{fmtSec(s)}</span>
              </div>
              <div style={{ height:5,borderRadius:5,background:'var(--border)',overflow:'hidden' }}>
                <div style={{ height:'100%',background:Z_COLORS[zi],borderRadius:5,width:barsMounted?`${(s/totalZone)*100}%`:'0%',transition:`width 0.8s ease-out ${zi*80}ms` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
