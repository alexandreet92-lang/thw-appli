'use client'

import { useMemo, useState, useEffect } from 'react'
import type { CheckInRow } from './types'
import { fmtHours } from './types'
import SleepHypnogram, { type SleepDataProp } from './SleepHypnogram'
import { createClient } from '@/lib/supabase/client'

const TREND_DAYS = 14

interface Props {
  checkin: CheckInRow | null
  history: CheckInRow[]
}

// ── MiniDonut ──────────────────────────────────────────────────
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

// ── SleepTrend (quality) ───────────────────────────────────────
function SleepTrend({ data }: { data: { date: string; quality: number; hours: number | null }[] }) {
  const W = 280, H = 50
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const id = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(id) }, [])
  if (data.length < 2) return null
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.quality) / 10) * H
  }))
  const path = pts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const pathLen = W * 1.2
  return (
    <div style={{ overflowX:'auto' as const }}>
      <svg viewBox={`0 0 ${W} ${H+20}`} style={{ width:'100%',minWidth:200,height:'auto',display:'block' }}>
        <rect x={0} y={0} width={W} height={H*0.2} fill="rgba(16,185,129,0.08)" />
        <rect x={0} y={H*0.2} width={W} height={H*0.4} fill="rgba(59,143,212,0.06)" />
        <rect x={0} y={H*0.6} width={W} height={H*0.4} fill="rgba(239,68,68,0.06)" />
        <path d={path} fill="none" stroke="#8B5CF6" strokeWidth={2} strokeLinecap="round"
          strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition:'stroke-dashoffset 1s ease-out' }} />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#8B5CF6" opacity={0.7} />)}
        {data.map((d, i) => i % 3 === 0 && (
          <text key={i} x={pts[i].x} y={H+16} fill="var(--text-dim)" fontSize={8} textAnchor="middle">{d.date.slice(5)}</text>
        ))}
      </svg>
    </div>
  )
}

// ── SleepBarsChart ─────────────────────────────────────────────
interface NightPoint { date: string; durationMin: number | null; score: number | null; quality: number | null; source: 'polar' | 'checkin' }

function SleepBarsChart({ data }: { data: NightPoint[] }) {
  const [period, setPeriod] = useState(1) // 0=7j 1=14j 2=28j
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null)
  const [animated, setAnimated] = useState(false)
  const PERIODS = [{ label:'7j', days:7 }, { label:'14j', days:14 }, { label:'4 sem', days:28 }]

  useEffect(() => { setAnimated(false); const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [period])

  const days = PERIODS[period].days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1)
  const dateStrs: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff); d.setDate(cutoff.getDate() + i)
    dateStrs.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
  }

  const byDate = new Map(data.map(d => [d.date, d]))
  const points = dateStrs.map(ds => byDate.get(ds) ?? { date: ds, durationMin: null, score: null, quality: null, source: 'checkin' as const })

  const W = 500, H = 80
  const maxMin = 600 // 10h cap
  const refLo = 420 / maxMin * H  // 7h
  const refHi = 540 / maxMin * H  // 9h
  const barW = Math.max(2, W / days - 2)

  // Quality line (0-10 → normalized on H)
  const qualPts = points
    .map((p, i) => ({ x: (i / (days - 1)) * W, y: p.quality != null ? H - (p.quality / 10) * H : null }))
    .filter(p => p.y != null) as { x: number; y: number }[]
  const qualPath = qualPts.length >= 2
    ? qualPts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : ''
  const pathLen = W * 1.2

  function fmtDur(min: number | null): string {
    if (!min) return '—'
    const h = Math.floor(min / 60); const m = min % 60
    return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`
  }

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
        <p style={{ fontSize:11,fontWeight:600,color:'var(--text-dim)',margin:0 }}>Durée de sommeil</p>
        <div style={{ display:'flex',gap:3 }}>
          {PERIODS.map((p, i) => (
            <button key={i} onClick={() => setPeriod(i)} style={{ padding:'3px 8px',borderRadius:6,border:'1px solid',fontSize:9,cursor:'pointer',borderColor:period===i?'#8B5CF6':'var(--border)',background:period===i?'rgba(139,92,246,0.1)':'transparent',color:period===i?'#8B5CF6':'var(--text-dim)',fontWeight:period===i?600:400 }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position:'relative' as const, overflowX:'auto' as const }}
        onMouseLeave={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${W} ${H+22}`} style={{ width:'100%',minWidth:220,height:'auto',display:'block' }}>
          {/* Reference zone 7h-9h */}
          <rect x={0} y={H - refHi} width={W} height={refHi - refLo}
            fill="rgba(16,185,129,0.08)" />
          <line x1={0} y1={H-refLo} x2={W} y2={H-refLo} stroke="rgba(16,185,129,0.3)" strokeWidth={0.8} strokeDasharray="3 3" />
          <line x1={0} y1={H-refHi} x2={W} y2={H-refHi} stroke="rgba(16,185,129,0.3)" strokeWidth={0.8} strokeDasharray="3 3" />
          <text x={W-2} y={H-refLo-2} fill="rgba(16,185,129,0.6)" fontSize={6} textAnchor="end">9h</text>
          <text x={W-2} y={H-refHi-2} fill="rgba(16,185,129,0.6)" fontSize={6} textAnchor="end">7h</text>

          {/* Bars */}
          {points.map((p, i) => {
            if (!p.durationMin) return null
            const bh = Math.min(p.durationMin / maxMin, 1) * H
            const x = (i / days) * W + (W / days - barW) / 2
            const isPolar = p.source === 'polar'
            return (
              <rect key={i} x={x} y={animated ? H - bh : H} width={barW} height={animated ? bh : 0}
                fill={isPolar ? '#8B5CF6' : 'rgba(139,92,246,0.45)'}
                rx={2} opacity={0.8}
                style={{ transition:`height 0.7s ease-out ${i*20}ms, y 0.7s ease-out ${i*20}ms` }}
                onMouseEnter={() => setTooltip({ idx: i, x: (i / days) * W + barW / 2, y: H - bh })}
              />
            )
          })}

          {/* Quality line (from check-ins) */}
          {qualPath && (
            <path d={qualPath} fill="none" stroke="#3B8FD4" strokeWidth={1.5} strokeLinecap="round" opacity={0.7}
              strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
              style={{ transition:'stroke-dashoffset 1s ease-out 200ms' }} />
          )}

          {/* X axis labels */}
          {points.map((p, i) => {
            const step = Math.max(1, Math.floor(days / 7))
            if (i % step !== 0) return null
            const x = (i / days) * W + barW / 2
            return <text key={i} x={x} y={H+14} fill="var(--text-dim)" fontSize={7} textAnchor="middle">{p.date.slice(5)}</text>
          })}

          {/* Tooltip crosshair */}
          {tooltip && (
            <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={H}
              stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
          )}
        </svg>

        {/* Floating tooltip */}
        {tooltip && (() => {
          const p = points[tooltip.idx]
          return (
            <div style={{ position:'absolute' as const, left:`${Math.min(tooltip.x / W * 100, 75)}%`, top:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:10, pointerEvents:'none' as const, boxShadow:'0 4px 12px rgba(0,0,0,0.15)', zIndex:10, minWidth:100 }}>
              <p style={{ margin:'0 0 2px', fontWeight:600, color:'var(--text)' }}>{p.date.slice(5).replace('-', '/')}</p>
              <p style={{ margin:0, color:'#8B5CF6' }}>{fmtDur(p.durationMin)}</p>
              {p.quality && <p style={{ margin:0, color:'#3B8FD4' }}>Qualité {p.quality}/10</p>}
              {p.score && <p style={{ margin:0, color:'#8B5CF6' }}>Score {p.score}</p>}
            </div>
          )
        })()}
      </div>
      <div style={{ display:'flex',gap:14,marginTop:6 }}>
        <div style={{ display:'flex',alignItems:'center',gap:4 }}><div style={{ width:8,height:8,borderRadius:2,background:'#8B5CF6' }} /><span style={{ fontSize:9,color:'var(--text-dim)' }}>Polar</span></div>
        <div style={{ display:'flex',alignItems:'center',gap:4 }}><div style={{ width:8,height:8,borderRadius:2,background:'rgba(139,92,246,0.45)' }} /><span style={{ fontSize:9,color:'var(--text-dim)' }}>Check-in</span></div>
        <div style={{ display:'flex',alignItems:'center',gap:4 }}><div style={{ width:16,height:2,background:'#3B8FD4',borderRadius:1 }} /><span style={{ fontSize:9,color:'var(--text-dim)' }}>Qualité</span></div>
        <div style={{ display:'flex',alignItems:'center',gap:4 }}><div style={{ width:16,height:6,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:1 }} /><span style={{ fontSize:9,color:'var(--text-dim)' }}>7h–9h rec.</span></div>
      </div>
    </div>
  )
}

// ── SleepScoreChart ────────────────────────────────────────────
function SleepScoreChart({ nights }: { nights: { date: string; score: number }[] }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])
  if (nights.length < 2) return null

  const W = 500, H = 60
  const sorted = [...nights].sort((a, b) => a.date.localeCompare(b.date)).slice(-28)
  const pts = sorted.map((n, i) => ({
    x: (i / (sorted.length - 1)) * W,
    y: H - (n.score / 100) * H,
  }))
  const path = pts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const pathLen = W * 1.2

  return (
    <div>
      <p style={{ fontSize:11,fontWeight:600,color:'var(--text-dim)',margin:'0 0 8px' }}>Score de sommeil Polar — 4 dernières semaines</p>
      <svg viewBox={`0 0 ${W} ${H+18}`} style={{ width:'100%',height:'auto',display:'block' }}>
        {/* BG zones */}
        <rect x={0} y={0}        width={W} height={H*0.25} fill="rgba(16,185,129,0.08)" />
        <rect x={0} y={H*0.25}   width={W} height={H*0.25} fill="rgba(249,115,22,0.06)" />
        <rect x={0} y={H*0.5}    width={W} height={H*0.5}  fill="rgba(239,68,68,0.06)" />
        <text x={W-2} y={H*0.25-2} fill="rgba(16,185,129,0.5)" fontSize={6} textAnchor="end">75</text>
        <text x={W-2} y={H*0.5-2}  fill="rgba(249,115,22,0.5)" fontSize={6} textAnchor="end">50</text>
        {/* Line */}
        <path d={path} fill="none" stroke="#8B5CF6" strokeWidth={2} strokeLinecap="round"
          strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition:'stroke-dashoffset 1s ease-out' }} />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#8B5CF6" opacity={0.7} />)}
        {sorted.map((n, i) => i % Math.max(1, Math.floor(sorted.length / 6)) === 0 && (
          <text key={i} x={pts[i].x} y={H+14} fill="var(--text-dim)" fontSize={7} textAnchor="middle">{n.date.slice(5)}</text>
        ))}
      </svg>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────
function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return '00:00'
  try {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch { return '00:00' }
}

// ── Main component ─────────────────────────────────────────────
export default function SleepSection({ checkin, history }: Props) {
  const [polarSleepData,  setPolarSleepData]  = useState<SleepDataProp | null>(null)
  const [polarSleepDate,  setPolarSleepDate]  = useState<string | null>(null)
  const [polarNights,     setPolarNights]     = useState<NightPoint[]>([])
  const [polarConnected,  setPolarConnected]  = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Check Polar connection
      sb.from('oauth_tokens')
        .select('provider')
        .eq('user_id', user.id)
        .eq('provider', 'polar')
        .eq('is_active', true)
        .maybeSingle()
        .then(({ data }) => setPolarConnected(!!data))

      // Fetch sleep history (last 90 days)
      sb.from('health_data')
        .select('date,sleep_duration_min,sleep_score,rem_duration_min,deep_duration_min,light_duration_min,awake_duration_min,sleep_start,sleep_end')
        .eq('user_id', user.id)
        .eq('data_type', 'sleep')
        .order('date', { ascending: false })
        .limit(90)
        .then(({ data }) => {
          if (!data || data.length === 0) return
          const rows = data as {
            date: string | null
            sleep_duration_min: number | null
            sleep_score: number | null
            rem_duration_min: number | null
            deep_duration_min: number | null
            light_duration_min: number | null
            awake_duration_min: number | null
            sleep_start: string | null
            sleep_end: string | null
          }[]

          // Latest record → hypnogram
          const latest = rows[0]
          const totalMin  = latest.sleep_duration_min ?? 0
          const remMin    = latest.rem_duration_min   ?? 0
          const deepMin   = latest.deep_duration_min  ?? 0
          const lightMin  = latest.light_duration_min ?? Math.max(0, totalMin - remMin - deepMin)
          const wakeMin   = latest.awake_duration_min ?? 0
          const score     = latest.sleep_score        ?? 0
          const sleepStart = fmtTimestamp(latest.sleep_start)
          const sleepEnd   = fmtTimestamp(latest.sleep_end)
          if (totalMin > 0) {
            setPolarSleepData({ score, totalMin, remMin, deepMin, lightMin, wakeMin, sleepStart, sleepEnd })
            setPolarSleepDate(latest.date ?? null)
          }

          // All nights → bar chart
          setPolarNights(rows
            .filter(r => r.date && r.sleep_duration_min)
            .map(r => ({
              date:        r.date!,
              durationMin: r.sleep_duration_min,
              score:       r.sleep_score,
              quality:     null,
              source:      'polar' as const,
            }))
          )
        })
    })
  }, [])

  // Merge polar nights + check-in history for bar chart
  const mergedNights = useMemo<NightPoint[]>(() => {
    const polarByDate = new Map(polarNights.map(n => [n.date, n]))
    const checkinPts: NightPoint[] = history
      .filter(c => !polarByDate.has(c.date))
      .map(c => ({
        date:        c.date,
        durationMin: c.sleep_hours ? Math.round(c.sleep_hours * 60) : null,
        score:       null,
        quality:     c.sleep_quality,
        source:      'checkin' as const,
      }))
    return [...polarNights, ...checkinPts].sort((a, b) => a.date.localeCompare(b.date))
  }, [polarNights, history])

  const polarScoreNights = polarNights.filter(n => n.score != null) as { date: string; score: number }[]

  const trend = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - TREND_DAYS)
    const cs = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`
    return history
      .filter(c => c.date >= cs)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(c => ({ date: c.date, quality: c.sleep_quality, hours: c.sleep_hours ?? null }))
  }, [history])

  const avgQuality = trend.length ? Math.round(trend.reduce((s,d)=>s+d.quality,0)/trend.length*10)/10 : null
  const avgHours   = trend.filter(d=>d.hours).length
    ? Math.round(trend.filter(d=>d.hours).reduce((s,d)=>s+(d.hours??0),0) / trend.filter(d=>d.hours).length * 10) / 10
    : null

  // Best available sleep duration for header card
  const displayHours = checkin?.sleep_hours
    ?? (polarSleepData ? polarSleepData.totalMin / 60 : null)
    ?? avgHours

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Sommeil</p>
          <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:0 }}>Analyse du sommeil</h2>
        </div>
        {polarSleepDate && (
          <span style={{ fontSize:10,color:'var(--text-dim)',fontStyle:'italic',paddingTop:4 }}>
            Dernière nuit&nbsp;:{' '}
            {new Date(polarSleepDate + 'T12:00:00').toLocaleDateString('fr-FR',{ day:'numeric', month:'long' })}
          </span>
        )}
      </div>

      {/* Cards row */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
        <div style={{ padding:'14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid #E5E7EB',display:'flex',alignItems:'center',gap:12 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,margin:0,color:'#8B5CF6' }}>
              {displayHours ? fmtHours(displayHours) : '—'}
            </p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>
              {polarSleepData ? 'Durée Polar' : 'Durée estimée'}
            </p>
          </div>
        </div>
        <div style={{ padding:'14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid #E5E7EB',display:'flex',alignItems:'center',gap:12 }}>
          <MiniDonut value={checkin?.sleep_quality ?? avgQuality ?? (polarSleepData ? Math.round(polarSleepData.score / 10) : 0)} color="#8B5CF6" />
          <div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,margin:0,color:'#8B5CF6' }}>
              {polarSleepData
                ? `${polarSleepData.score}/100`
                : `${checkin?.sleep_quality ?? (avgQuality ? avgQuality.toFixed(1) : '—')}/10`}
            </p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>
              {polarSleepData ? 'Score Polar' : 'Qualité ressentie'}
            </p>
          </div>
        </div>
      </div>

      {/* Bar chart — combined Polar + checkin */}
      {mergedNights.length >= 2 ? (
        <div style={{ marginBottom:20 }}>
          <SleepBarsChart data={mergedNights} />
        </div>
      ) : trend.length >= 3 ? (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:11,fontWeight:600,color:'var(--text-dim)',margin:'0 0 8px' }}>Qualité du sommeil — {TREND_DAYS} derniers jours</p>
          <SleepTrend data={trend} />
        </div>
      ) : (
        <p style={{ fontSize:11,color:'var(--text-dim)',textAlign:'center' as const,margin:'0 0 16px',fontStyle:'italic' }}>
          Continue tes check-ins pour voir ta tendance sommeil
        </p>
      )}

      {/* Hypnogram */}
      <div style={{ marginBottom: polarScoreNights.length >= 2 ? 20 : 4 }}>
        <p style={{ fontSize:11,fontWeight:600,color:'var(--text-dim)',margin:'0 0 8px' }}>Hypnogramme</p>
        <SleepHypnogram sleepData={polarSleepData} polarConnected={polarConnected} />
      </div>

      {/* Sleep score trend — only when Polar data */}
      {polarScoreNights.length >= 2 && (
        <div style={{ marginTop:4 }}>
          <SleepScoreChart nights={polarScoreNights} />
        </div>
      )}
    </div>
  )
}
