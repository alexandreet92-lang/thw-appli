'use client'

import { useMemo, useState, useEffect } from 'react'
import type { ActivityRow } from './types'
import { fmtSec, sportColor, sportLabel } from './types'

const PERIODS = [{ label:'8 sem', weeks:8 }, { label:'16 sem', weeks:16 }]

function getWeekStart(d: Date): string {
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  const m = new Date(d); m.setDate(d.getDate() - dow)
  return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`
}

interface WeekData { weekStart: string; sports: { sport: string; secs: number }[]; total: number }

function buildWeeks(activities: ActivityRow[], weeks: number): WeekData[] {
  const map: Record<string, Record<string, number>> = {}
  for (const a of activities) {
    const ws = getWeekStart(new Date(a.started_at))
    const s = (a.sport_type ?? 'other').toLowerCase()
    if (!map[ws]) map[ws] = {}
    map[ws][s] = (map[ws][s] ?? 0) + (a.moving_time_s ?? a.elapsed_time_s ?? 0)
  }
  const result: WeekData[] = []
  const now = new Date()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i*7)
    const ws = getWeekStart(d)
    const sports = Object.entries(map[ws] ?? {}).map(([sport, secs]) => ({ sport, secs })).sort((a,b) => b.secs - a.secs)
    const total = sports.reduce((s, x) => s + x.secs, 0)
    result.push({ weekStart: ws, sports, total })
  }
  return result
}

interface TooltipState { weekIdx: number; x: number }

export default function VolumeChart({ activities }: { activities: ActivityRow[] }) {
  const [period, setPeriod] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => { const id = setTimeout(() => setMounted(true), 80); return () => clearTimeout(id) }, [])

  const weeks = useMemo(() => buildWeeks(activities, PERIODS[period].weeks), [activities, period])
  const maxTotal = Math.max(...weeks.map(w => w.total), 1)
  const currentWeekStart = getWeekStart(new Date())

  const allSports = [...new Set(weeks.flatMap(w => w.sports.map(s => s.sport)))]

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:'20px 20px 16px',boxShadow:'var(--shadow-card)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Volume</p>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'2px 0 0' }}>Volume hebdomadaire</h3>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {PERIODS.map((p,i)=>(
            <button key={i} onClick={()=>setPeriod(i)} style={{ padding:'4px 10px',borderRadius:7,border:'1px solid',fontSize:10,cursor:'pointer',borderColor:period===i?'#f97316':'var(--border)',background:period===i?'rgba(249,115,22,0.1)':'var(--bg-card)',color:period===i?'#f97316':'var(--text-mid)',fontWeight:period===i?600:400 }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex',gap:12,flexWrap:'wrap' as const,marginBottom:12 }}>
        {allSports.slice(0,5).map(s=>(
          <div key={s} style={{ display:'flex',alignItems:'center',gap:4 }}>
            <div style={{ width:8,height:8,borderRadius:2,background:sportColor(s) }} />
            <span style={{ fontSize:10,color:'var(--text-dim)' }}>{sportLabel(s)}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX:'auto' as const }}>
        <div style={{ display:'flex',alignItems:'flex-end',gap:4,height:100,minWidth:300,position:'relative' as const }}>
          {weeks.map((w, wi) => {
            const isCurrent = w.weekStart === currentWeekStart
            return (
              <div key={w.weekStart} style={{ flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:2,minWidth:0,position:'relative' as const }}
                onMouseEnter={()=>setTooltip({weekIdx:wi,x:0})} onMouseLeave={()=>setTooltip(null)}>
                <div style={{ width:'100%',display:'flex',flexDirection:'column' as const,justifyContent:'flex-end',height:90,gap:0,border:isCurrent?'2px solid rgba(249,115,22,0.5)':'none',borderRadius:4,overflow:'hidden' }}>
                  {w.sports.map((s,si)=>{
                    const pct = mounted ? (s.secs / maxTotal) * 90 : 0
                    return (
                      <div key={s.sport} style={{ width:'100%',height:pct,background:sportColor(s.sport),transition:`height 0.8s ease-out ${si*80}ms`,minHeight:w.total>0&&mounted?1:0,flexShrink:0 }} />
                    )
                  })}
                </div>
                <span style={{ fontSize:7,color:isCurrent?'#f97316':'var(--text-dim)',fontWeight:isCurrent?700:400,whiteSpace:'nowrap' as const }}>{w.weekStart.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {tooltip && weeks[tooltip.weekIdx] && (() => {
        const w = weeks[tooltip.weekIdx]
        return (
          <div style={{ marginTop:8,padding:'8px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',display:'flex',gap:12,flexWrap:'wrap' as const }}>
            <span style={{ fontSize:11,fontWeight:600 }}>Semaine du {w.weekStart}</span>
            {w.sports.map(s=>(
              <span key={s.sport} style={{ fontSize:10,color:sportColor(s.sport) }}>
                {sportLabel(s.sport)}: <strong>{fmtSec(s.secs)}</strong>
              </span>
            ))}
            <span style={{ fontSize:10,color:'var(--text-mid)' }}>Total: <strong>{fmtSec(w.total)}</strong></span>
          </div>
        )
      })()}
    </div>
  )
}
