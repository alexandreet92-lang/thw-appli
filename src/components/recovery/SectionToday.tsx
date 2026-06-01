'use client'

import { calcRecoveryScore, scoreStatus, fmtHoursDecimal } from './helpers'
import { ReadinessRing, MetricBar } from './ReadinessRing'
import type { CheckInRow } from './types'

interface Props {
  checkin: CheckInRow | null
  onCheckIn: () => void
}

export default function SectionToday({ checkin, onCheckIn }: Props) {
  const score   = checkin ? calcRecoveryScore(checkin) : null
  const status  = score !== null ? scoreStatus(score) : null
  const hasData = checkin !== null

  return (
    <div className="card-enter" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)',marginBottom:16 }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Today</p>
          <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'3px 0 0' }}>État du jour</h2>
        </div>
        <button onClick={onCheckIn}
          style={{ padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap' as const }}>
          {hasData ? 'Modifier le check-in' : 'Check-in du matin'}
        </button>
      </div>

      {/* Grid */}
      <div id="rc-today-grid" style={{ display:'grid',gridTemplateColumns:'auto 1fr',gap:24,alignItems:'start' }}>

        {/* Ring */}
        <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'center',gap:12 }}>
          <ReadinessRing score={score}/>
          {status
            ? <div style={{ textAlign:'center' as const }}>
                <span style={{ display:'inline-block',padding:'4px 14px',borderRadius:99,background:status.bg,border:`1px solid ${status.color}44`,color:status.color,fontSize:11,fontWeight:700,letterSpacing:'0.04em' }}>
                  {status.label}
                </span>
                <p style={{ fontSize:10,color:'var(--text-dim)',margin:'6px 0 0',lineHeight:1.5,maxWidth:140,textAlign:'center' as const }}>{status.desc}</p>
              </div>
            : <p style={{ fontSize:11,color:'var(--text-dim)',textAlign:'center' as const,maxWidth:130,lineHeight:1.5,margin:0 }}>Fais ton check-in du matin pour voir ton score</p>
          }
        </div>

        {/* Métriques */}
        <div style={{ display:'flex',flexDirection:'column' as const,gap:16 }}>

          {/* FC repos / HRV / Sommeil — toujours visibles */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
            {[
              { label:'FC REPOS', value:'—', sub:'Garmin, Polar ou Whoop', color:'#ef4444' },
              { label:'HRV',      value:'—', sub:'Garmin, Whoop ou Oura',  color:'#06B6D4' },
              { label:'SOMMEIL',
                value: checkin?.sleep_hours ? fmtHoursDecimal(checkin.sleep_hours) : '—',
                sub: checkin?.sleep_hours ? 'Estimé via check-in' : 'Estimé via check-in',
                color:'#a855f7' },
            ].map(m => (
              <div key={m.label} style={{ padding:'10px 12px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',textAlign:'center' as const }}>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:m.value==='—'?22:18,fontWeight:800,color:m.value==='—'?'var(--text-dim)':m.color,margin:0,lineHeight:1 }}>{m.value}</p>
                <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.06em' }}>{m.label}</p>
                <p style={{ fontSize:8,color:'var(--text-dim)',margin:'2px 0 0',opacity:0.7 }}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Barres subjectives */}
          <div style={{ display:'flex',flexDirection:'column' as const,gap:10 }}>
            <MetricBar label="Fatigue"    value={checkin?.fatigue    ?? null} inverted/>
            <MetricBar label="Énergie"    value={checkin?.energy     ?? null}/>
            <MetricBar label="Stress"     value={checkin?.stress     ?? null} inverted/>
            <MetricBar label="Motivation" value={checkin?.motivation ?? null}/>
            {(checkin?.pain ?? 0) > 1 && <MetricBar label="Douleurs" value={checkin!.pain} inverted/>}
          </div>
        </div>
      </div>

      <style>{`@media (max-width:600px){#rc-today-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  )
}
