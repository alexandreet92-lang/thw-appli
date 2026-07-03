'use client'

import { useMemo, useState, useEffect } from 'react'
import type { ActivityRow } from './types'
import { fmtSec, sportColor, sportLabel } from './types'
import { useI18n } from '@/lib/i18n'

const PERIODS = [{ labelKey:'recovery.period.8w', weeks:8 }, { labelKey:'recovery.period.16w', weeks:16 }]
const BAR_H = 90

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

export default function VolumeChart({ activities }: { activities: ActivityRow[] }) {
  const { t } = useI18n()
  const [period, setPeriod] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => { const id = setTimeout(() => setMounted(true), 80); return () => clearTimeout(id) }, [])

  const weeks = useMemo(() => buildWeeks(activities, PERIODS[period].weeks), [activities, period])
  const maxTotal = Math.max(...weeks.map(w => w.total), 1)
  const currentWeekStart = getWeekStart(new Date())
  const allSports = [...new Set(weeks.flatMap(w => w.sports.map(s => s.sport)))]

  const nWeeks = weeks.length
  const svgW = Math.max(nWeeks * 28, 280)
  const barW = Math.max(Math.floor(svgW / nWeeks) - 4, 8)

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:'20px 20px 16px',boxShadow:'var(--shadow-card)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>{t('recovery.metric.volume')}</p>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'2px 0 0' }}>{t('recovery.volume.weeklyTitle')}</h3>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {PERIODS.map((p,i)=>(
            <button key={i} onClick={()=>setPeriod(i)} style={{ padding:'4px 10px',borderRadius:7,border:'1px solid',fontSize:10,cursor:'pointer',borderColor:period===i?'#f97316':'var(--border)',background:period===i?'rgba(249,115,22,0.1)':'var(--bg-card)',color:period===i?'#f97316':'var(--text-mid)',fontWeight:period===i?600:400 }}>{t(p.labelKey)}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      {allSports.length > 0 && (
        <div style={{ display:'flex',gap:12,flexWrap:'wrap' as const,marginBottom:12 }}>
          {allSports.slice(0,5).map(s=>(
            <div key={s} style={{ display:'flex',alignItems:'center',gap:4 }}>
              <div style={{ width:8,height:8,borderRadius:2,background:sportColor(s) }} />
              <span style={{ fontSize:10,color:'var(--text-dim)' }}>{sportLabel(s)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX:'auto' as const }}>
        <svg viewBox={`0 0 ${svgW} ${BAR_H + 18}`} style={{ width:'100%',minWidth:280,height:'auto',display:'block' }}>
          {weeks.map((w, wi) => {
            const isCurrent = w.weekStart === currentWeekStart
            const x = wi * (svgW / nWeeks) + (svgW / nWeeks - barW) / 2
            let stackY = BAR_H // start from bottom

            return (
              <g key={w.weekStart}
                onMouseEnter={() => setHovered(wi)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor:'default' }}>
                {/* Current week highlight */}
                {isCurrent && (
                  <rect x={x - 2} y={0} width={barW + 4} height={BAR_H}
                    fill="rgba(249,115,22,0.07)" rx={3} />
                )}
                {/* Stacked sport bars (bottom-up) */}
                {w.sports.map((s) => {
                  const h = mounted ? Math.max(Math.round((s.secs / maxTotal) * BAR_H), w.total > 0 ? 2 : 0) : 0
                  stackY -= h
                  return (
                    <rect key={s.sport} x={x} y={stackY} width={barW} height={h}
                      fill={sportColor(s.sport)} rx={2}
                      style={{ transition:`y 0.8s ease-out, height 0.8s ease-out` }} />
                  )
                })}
                {/* Week label */}
                <text x={x + barW / 2} y={BAR_H + 13}
                  textAnchor="middle" fill={isCurrent ? '#f97316' : 'var(--text-dim)'}
                  fontSize={7} fontWeight={isCurrent ? 700 : 400}>
                  {w.weekStart.slice(5)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Tooltip panel */}
      {hovered !== null && weeks[hovered] && (() => {
        const w = weeks[hovered]
        return (
          <div style={{ marginTop:8,padding:'8px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',display:'flex',gap:12,flexWrap:'wrap' as const }}>
            <span style={{ fontSize:11,fontWeight:600 }}>{t('recovery.volume.weekOf')} {w.weekStart}</span>
            {w.sports.map(s=>(
              <span key={s.sport} style={{ fontSize:10,color:sportColor(s.sport) }}>
                {sportLabel(s.sport)}: <strong>{fmtSec(s.secs)}</strong>
              </span>
            ))}
            {w.total > 0
              ? <span style={{ fontSize:10,color:'var(--text-mid)' }}>{t('recovery.volume.total')} <strong>{fmtSec(w.total)}</strong></span>
              : <span style={{ fontSize:10,color:'var(--text-dim)',fontStyle:'italic' }}>{t('recovery.volume.noActivity')}</span>
            }
          </div>
        )
      })()}
    </div>
  )
}
