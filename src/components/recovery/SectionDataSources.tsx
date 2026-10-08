'use client'

import { useEffect, useState, type RefObject } from 'react'
import { useI18n } from '@/lib/i18n'

interface Source {
  id: string; name: string
  // provider : clé OAuth réelle (/api/oauth/status) quand la source est branchable.
  // null = source « bientôt disponible » (pas encore d'intégration OAuth).
  provider: string | null
  types: string[]
}

// Catalogue des sources. L'état « connecté » + la dernière synchro ne sont PLUS
// codés en dur : ils proviennent de /api/oauth/status (données réelles).
const SOURCES: Source[] = [
  { id:'strava', name:'Strava', provider:'strava', types:['recovery.dtype.activities','recovery.dtype.speed','recovery.dtype.distance'] },
  { id:'polar',  name:'Polar',  provider:'polar',  types:['recovery.dtype.activities','recovery.dtype.hrv','recovery.dtype.sleep','recovery.dtype.hr'] },
  { id:'garmin', name:'Garmin', provider:null,     types:['recovery.dtype.activities','recovery.dtype.sleep','recovery.dtype.hrv','recovery.dtype.spo2'] },
  { id:'whoop',  name:'Whoop',  provider:null,     types:['recovery.dtype.recovery','recovery.dtype.sleep','recovery.dtype.hrv','recovery.dtype.stress'] },
  { id:'oura',   name:'Oura',   provider:null,     types:['recovery.dtype.sleep','recovery.dtype.hrv','recovery.dtype.temperature','recovery.dtype.spo2'] },
]

interface OAuthStatusRow { provider: string; last_used_at: string | null; updated_at: string | null; scope: string | null }
interface Live { connected: boolean; lastSyncIso: string | null }

interface Props { sourcesRef?: RefObject<HTMLDivElement | null> }

export default function SectionDataSources({ sourcesRef }: Props) {
  const { t } = useI18n()
  const [tooltip, setTooltip] = useState<string|null>(null)
  // État réel par provider (clé = provider OAuth). Vide tant que l'API n'a pas répondu.
  const [status, setStatus] = useState<Record<string, Live>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/oauth/status', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json() as { connected?: (OAuthStatusRow | string)[] }
        const rows: OAuthStatusRow[] = (json.connected ?? []).map(r => typeof r === 'string'
          ? { provider: r, last_used_at: null, updated_at: null, scope: null }
          : r)
        if (cancelled) return
        const map: Record<string, Live> = {}
        for (const r of rows) map[r.provider] = { connected: true, lastSyncIso: r.last_used_at ?? r.updated_at }
        setStatus(map)
      } catch { /* réseau : on garde l'état courant (aucune source affichée connectée) */ }
    })()
    return () => { cancelled = true }
  }, [])

  // « À l'instant » / « Il y a 5min » / « Il y a 2h » / « Il y a 3j » (mêmes libellés que /connections).
  function fmtRel(iso: string | null): string | null {
    if (!iso) return null
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (!Number.isFinite(diff) || diff < 0) return null
    if (diff < 120)   return t('connections.relativeNow')
    if (diff < 3600)  return t('connections.relativeMin',  { n: Math.floor(diff / 60) })
    if (diff < 86400) return t('connections.relativeHour', { n: Math.floor(diff / 3600) })
    return t('connections.relativeDay', { n: Math.floor(diff / 86400) })
  }

  const live = (s: Source): Live => (s.provider ? status[s.provider] : undefined) ?? { connected: false, lastSyncIso: null }
  const connected = SOURCES.filter(s => live(s).connected)
  const available = SOURCES.filter(s => !live(s).connected)

  return (
    <div ref={sourcesRef} id="rc-sources"
      className="card-enter card-enter-3"
      style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius: 'var(--r-lg)',padding:24,boxShadow:'var(--shadow-card)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>{t('recovery.sources.eyebrow')}</p>
          <h2 style={{ fontFamily: 'var(--font-display)',fontSize:18,fontWeight:700,margin:'3px 0 0' }}>{t('recovery.sources.title')}</h2>
        </div>
      </div>

      {/* Connectées */}
      {connected.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'#22c55e',margin:'0 0 8px' }}>{t('recovery.sources.connected')}</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:8 }}>
            {connected.map(s=>{
              const rel = fmtRel(live(s).lastSyncIso)
              return (
              <div key={s.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius: 'var(--r-md)',background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:'#22c55e',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{s.name}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.types.map(x => t(x)).join(' · ')}</p>
                </div>
                <div style={{ textAlign:'right' as const }}>
                  <span style={{ fontSize:10,color:'#22c55e',fontWeight:600 }}>{t('recovery.status.connected')}</span>
                  {rel && <p style={{ fontSize: 10,color:'var(--text-dim)',margin:'2px 0 0' }}>{t('recovery.sources.syncPrefix')} {rel}</p>}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Disponibles */}
      {available.length > 0 && (
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>{t('recovery.sources.available')}</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:6 }}>
            {available.map(s=>(
              <div key={s.id} style={{ position:'relative' as const,display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius: 'var(--r-md)',background:'var(--bg-card2)',border:'1px solid var(--border)',opacity:0.8 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--border)',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12,fontWeight:600,margin:0,color:'var(--text-mid)' }}>{s.name}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.types.map(x => t(x)).join(' · ')}</p>
                </div>
                <div style={{ position:'relative' as const }}>
                  <button
                    onMouseEnter={()=>setTooltip(s.id)}
                    onMouseLeave={()=>setTooltip(null)}
                    onClick={()=>setTooltip(prev=>prev===s.id?null:s.id)}
                    style={{ padding:'5px 12px',borderRadius: 'var(--r-sm)',background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>
                    {t('recovery.sources.connect')}
                  </button>
                  {tooltip===s.id && (
                    <div style={{ position:'absolute' as const,right:0,top:'calc(100% + 6px)',zIndex:50,minWidth:170,padding:'8px 12px',borderRadius: 'var(--r-sm)',background:'var(--bg-card)',border:'1px solid var(--border)',boxShadow:'0 4px 14px rgba(0,0,0,0.12)' }}>
                      <p style={{ fontSize:11,color:'var(--text-mid)',margin:0,lineHeight:1.5 }}>
                        {s.provider
                          ? <>↗ <a href="/connections" style={{ color:'var(--primary)',textDecoration:'none',fontWeight:600 }}>{t('recovery.sources.connect')}</a></>
                          : <>🔜 {t('recovery.sources.soonAvailable')}</>}
                      </p>
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
