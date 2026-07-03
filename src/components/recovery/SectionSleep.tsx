'use client'

import { fmtHoursDecimal, metricColor } from './helpers'
import type { CheckInRow } from './types'
import { useI18n } from '@/lib/i18n'

interface Props { checkin: CheckInRow | null }

export default function SectionSleep({ checkin }: Props) {
  const { t } = useI18n()
  // Sans check-in, section masquée
  if (!checkin) return null

  const hasHours   = checkin.sleep_hours != null && checkin.sleep_hours > 0
  const qColor = metricColor(checkin.sleep_quality)

  return (
    <div className="card-enter card-enter-1" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)',marginBottom:16 }}>

      <div style={{ marginBottom:18 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Sleep</p>
        <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'3px 0 0' }}>{t('recovery.sleep.analysisTitle')}</h2>
      </div>

      {/* Résumé depuis check-in */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:20 }}>
        <div style={{ padding:'12px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',textAlign:'center' as const }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'#a855f7',margin:0,lineHeight:1 }}>
            {hasHours ? fmtHoursDecimal(checkin.sleep_hours) : '—'}
          </p>
          <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.06em' }}>{t('recovery.sleep.estimatedDuration')}</p>
        </div>
        <div style={{ padding:'12px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',textAlign:'center' as const }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:qColor,margin:0,lineHeight:1 }}>
            {checkin.sleep_quality}<span style={{ fontSize:10,fontWeight:400,color:'var(--text-dim)' }}>/10</span>
          </p>
          <p style={{ fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.06em' }}>{t('recovery.sleep.perceivedQuality')}</p>
        </div>
      </div>

      {/* Message device */}
      <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderRadius:12,background:'rgba(168,85,247,0.07)',border:'1px solid rgba(168,85,247,0.2)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{ fontSize:11,color:'var(--text-mid)',margin:0,lineHeight:1.5 }}>
          {t('recovery.sectionSleep.connect')} <strong>Garmin</strong> {t('recovery.or')} <strong>Oura</strong> {t('recovery.sectionSleep.deviceMsg')}
        </p>
      </div>

      {checkin.notes && (
        <div style={{ marginTop:14,padding:'10px 14px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
          <p style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 4px' }}>{t('recovery.notes')}</p>
          <p style={{ fontSize:12,color:'var(--text-mid)',margin:0,lineHeight:1.5 }}>{checkin.notes}</p>
        </div>
      )}
    </div>
  )
}
