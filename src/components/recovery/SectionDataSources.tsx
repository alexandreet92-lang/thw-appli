'use client'

import { useState, type RefObject } from 'react'
import { useI18n } from '@/lib/i18n'

interface Source {
  id: string; name: string; connected: boolean
  lastSync: string | null; types: string[]
}

const SOURCES: Source[] = [
  { id:'strava', name:'Strava', connected:true,  lastSync:'recovery.mock.sync2h',   types:['recovery.dtype.activities','recovery.dtype.speed','recovery.dtype.distance'] },
  { id:'garmin', name:'Garmin', connected:false, lastSync:null,          types:['recovery.dtype.activities','recovery.dtype.sleep','recovery.dtype.hrv','recovery.dtype.spo2'] },
  { id:'polar',  name:'Polar',  connected:false, lastSync:null,          types:['recovery.dtype.activities','recovery.dtype.hrv','recovery.dtype.sleep','recovery.dtype.hr'] },
  { id:'whoop',  name:'Whoop',  connected:false, lastSync:null,          types:['recovery.dtype.recovery','recovery.dtype.sleep','recovery.dtype.hrv','recovery.dtype.stress'] },
  { id:'oura',   name:'Oura',   connected:false, lastSync:null,          types:['recovery.dtype.sleep','recovery.dtype.hrv','recovery.dtype.temperature','recovery.dtype.spo2'] },
]

interface Props { sourcesRef?: RefObject<HTMLDivElement | null> }

export default function SectionDataSources({ sourcesRef }: Props) {
  const { t } = useI18n()
  const [tooltip, setTooltip] = useState<string|null>(null)
  const connected = SOURCES.filter(s=>s.connected)
  const available = SOURCES.filter(s=>!s.connected)

  return (
    <div ref={sourcesRef} id="rc-sources"
      className="card-enter card-enter-3"
      style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>{t('recovery.sources.eyebrow')}</p>
          <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'3px 0 0' }}>{t('recovery.sources.title')}</h2>
        </div>
      </div>

      {/* Connectées */}
      {connected.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'#22c55e',margin:'0 0 8px' }}>{t('recovery.sources.connected')}</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:8 }}>
            {connected.map(s=>(
              <div key={s.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:'#22c55e',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{s.name}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.types.map(x => t(x)).join(' · ')}</p>
                </div>
                <div style={{ textAlign:'right' as const }}>
                  <span style={{ fontSize:10,color:'#22c55e',fontWeight:600 }}>{t('recovery.status.connected')}</span>
                  {s.lastSync && <p style={{ fontSize:9,color:'var(--text-dim)',margin:'2px 0 0' }}>{t('recovery.sources.syncPrefix')} {t(s.lastSync)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disponibles */}
      {available.length > 0 && (
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>{t('recovery.sources.available')}</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:6 }}>
            {available.map(s=>(
              <div key={s.id} style={{ position:'relative' as const,display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',opacity:0.8 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--border)',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12,fontWeight:600,margin:0,color:'var(--text-mid)' }}>{s.name}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.types.map(x => t(x)).join(' · ')}</p>
                </div>
                <div style={{ position:'relative' as const }}>
                  <button
                    onMouseEnter={()=>setTooltip(s.id)}
                    onMouseLeave={()=>setTooltip(null)}
                    onClick={()=>setTooltip(t=>t===s.id?null:s.id)}
                    style={{ padding:'5px 12px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>
                    {t('recovery.sources.connect')}
                  </button>
                  {tooltip===s.id && (
                    <div style={{ position:'absolute' as const,right:0,top:'calc(100% + 6px)',zIndex:50,minWidth:170,padding:'8px 12px',borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)',boxShadow:'0 4px 14px rgba(0,0,0,0.12)' }}>
                      <p style={{ fontSize:11,color:'var(--text-mid)',margin:0,lineHeight:1.5 }}>🔜 {t('recovery.sources.soonAvailable')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
