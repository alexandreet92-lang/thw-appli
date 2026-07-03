'use client'

import { sportColor, sportLabel } from './helpers'
import type { TrainingLoadData } from './types'
import { useI18n } from '@/lib/i18n'

interface Props { data: TrainingLoadData | null }

export default function SectionTrainingLoad({ data }: Props) {
  const { t } = useI18n()
  if (!data) return null

  const delta = data.thisWeekHours - data.prevWeekHours
  const maxH  = Math.max(...data.breakdown.map(s=>s.hours), 0.1)

  return (
    <div className="card-enter card-enter-1" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)',marginBottom:16 }}>
      <div style={{ marginBottom:18 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Training Load</p>
        <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'3px 0 0' }}>{t('recovery.trainingLoad.title')}</h2>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:20 }}>
        <div style={{ padding:'12px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',textAlign:'center' as const }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,color:'#06B6D4',margin:0,lineHeight:1 }}>{data.thisWeekCount}</p>
          <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.06em' }}>{t('recovery.dtype.activities')}</p>
          <p style={{ fontSize:9,color:'var(--text-dim)',margin:'2px 0 0',opacity:0.7 }}>{t('recovery.trainingLoad.thisWeek')}</p>
        </div>
        <div style={{ padding:'12px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',textAlign:'center' as const }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,color:'#22c55e',margin:0,lineHeight:1 }}>
            {data.thisWeekHours.toFixed(1)}<span style={{ fontSize:12,fontWeight:400,color:'var(--text-dim)' }}>h</span>
          </p>
          <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.06em' }}>{t('recovery.metric.volume')}</p>
          <p style={{ fontSize:9,margin:'2px 0 0',fontWeight:600,
            color:delta>=0?'#22c55e':'#ef4444' }}>
            {delta>=0?'+':''}{delta.toFixed(1)}h {t('recovery.trainingLoad.vsPrevWeek')}
          </p>
        </div>
      </div>

      {/* Répartition par sport */}
      {data.breakdown.length > 0 && (
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 10px' }}>{t('recovery.trainingLoad.breakdown')}</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:8 }}>
            {data.breakdown.map(s=>{
              const col = sportColor(s.sport)
              const pct = (s.hours / maxH) * 100
              return (
                <div key={s.sport}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                    <span style={{ fontSize:11,color:'var(--text-mid)',fontWeight:500 }}>{sportLabel(s.sport)}</span>
                    <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text-dim)' }}>{s.hours.toFixed(1)}h</span>
                  </div>
                  <div style={{ height:5,borderRadius:99,background:'var(--border)',overflow:'hidden' }}>
                    <div style={{ height:'100%',width:`${pct}%`,background:col,borderRadius:99,transition:'width 0.6s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
