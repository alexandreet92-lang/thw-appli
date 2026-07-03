'use client'

import { useMemo } from 'react'
import type { CheckInRow, ActivityRow } from './types'
import { calcScore, fmtSec } from './types'
import { useI18n } from '@/lib/i18n'

const DAY_KEYS = ['recovery.dayShort.sun','recovery.dayShort.mon','recovery.dayShort.tue','recovery.dayShort.wed','recovery.dayShort.thu','recovery.dayShort.fri','recovery.dayShort.sat']

interface Props {
  history: CheckInRow[]        // 30-day
  prevHistory: CheckInRow[]    // previous 30-day (for trend)
  activities: ActivityRow[]
  prevActivities: ActivityRow[]
}

function weekBounds(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mon = new Date(now); mon.setDate(now.getDate() - dow + offsetWeeks * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { start: fmt(mon), end: fmt(sun) }
}

export default function WeeklySummary({ history, prevHistory, activities, prevActivities }: Props) {
  const { t } = useI18n()
  const { start, end } = weekBounds(0)
  const { start: ps, end: pe } = weekBounds(-1)

  const weekCheckins = useMemo(() =>
    history.filter(c => c.date >= start && c.date <= end), [history, start, end])
  const prevCheckins = useMemo(() =>
    prevHistory.filter(c => c.date >= ps && c.date <= pe), [prevHistory, ps, pe])

  const weekActs = useMemo(() =>
    activities.filter(a => a.started_at >= start+'T00:00' && a.started_at <= end+'T23:59'), [activities, start, end])
  const prevActs = useMemo(() =>
    prevActivities.filter(a => a.started_at >= ps+'T00:00' && a.started_at <= pe+'T23:59'), [prevActivities, ps, pe])

  const avgScore = weekCheckins.length
    ? Math.round(weekCheckins.reduce((s, c) => s + calcScore(c), 0) / weekCheckins.length) : null
  const prevAvg = prevCheckins.length
    ? Math.round(prevCheckins.reduce((s, c) => s + calcScore(c), 0) / prevCheckins.length) : null

  const bestDay = weekCheckins.reduce<CheckInRow | null>((best, c) => {
    if (!best || calcScore(c) > calcScore(best)) return c
    return best
  }, null)

  const weekSecs = weekActs.reduce((s, a) => s + (a.moving_time_s ?? a.elapsed_time_s ?? 0), 0)
  const prevSecs = prevActs.reduce((s, a) => s + (a.moving_time_s ?? a.elapsed_time_s ?? 0), 0)

  const deltaScore = avgScore != null && prevAvg != null ? avgScore - prevAvg : null
  const deltaVol   = weekSecs - prevSecs

  const bestDayLabel = bestDay
    ? `${t(DAY_KEYS[new Date(bestDay.date + 'T12:00:00').getDay()])} — ${calcScore(bestDay)}/100` : '—'

  const METRICS = [
    { label:t('recovery.weekly.avgScore'), value: avgScore != null ? `${avgScore}/100` : '—', color:'#3B8FD4' },
    { label:t('recovery.weekly.bestDay'), value: bestDayLabel, color:'#10B981' },
    { label:t('recovery.metric.volume'), value: weekSecs > 0 ? fmtSec(weekSecs) : '—', color:'#f97316' },
    { label:t('recovery.weekly.sessionsLabel'), value: weekActs.length > 0 ? `${weekActs.length} ${t(weekActs.length>1?'recovery.sessions':'recovery.session')}` : '—', color:'var(--text)' },
  ]

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 14px' }}>
        {t('recovery.weekly.title')}
      </p>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:14 }}>
        {METRICS.map(m => (
          <div key={m.label} style={{ textAlign:'center' as const }}>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:m.color,margin:'0 0 2px',lineHeight:1 }}>{m.value}</p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:0 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Comparaison semaine précédente */}
      <div style={{ display:'flex',gap:16,flexWrap:'wrap' as const }}>
        {deltaScore != null && (
          <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:deltaScore>=0?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${deltaScore>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}` }}>
            <span style={{ fontSize:11,color:deltaScore>=0?'#10B981':'#ef4444',fontWeight:600 }}>
              {deltaScore>=0?'↑':'↓'} {deltaScore>=0?'+':''}{deltaScore} {t('recovery.weekly.ptsAvgScore')}
            </span>
          </div>
        )}
        {Math.abs(deltaVol) > 60 && (
          <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:deltaVol>=0?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${deltaVol>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}` }}>
            <span style={{ fontSize:11,color:deltaVol>=0?'#10B981':'#ef4444',fontWeight:600 }}>
              {deltaVol>=0?'↑':'↓'} {deltaVol>=0?'+':''}{fmtSec(Math.abs(deltaVol))} {t('recovery.weekly.volumeSuffix')}
            </span>
          </div>
        )}
        {deltaScore == null && weekCheckins.length === 0 && (
          <p style={{ fontSize:11,color:'var(--text-dim)',margin:0,fontStyle:'italic' }}>
            {t('recovery.weekly.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
