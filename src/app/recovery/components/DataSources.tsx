'use client'

import { useState, useEffect, type RefObject } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Static source definitions ──────────────────────────────────
const SOURCES_DEF = [
  { id: 'strava',    name: 'Strava',  provider: 'strava',    types: ['Activités', 'Vitesse', 'Distance', 'Puissance'] },
  { id: 'polar',     name: 'Polar',   provider: 'polar',     types: ['Activités', 'HRV', 'Sommeil', 'FC'] },
  { id: 'withings',  name: 'Withings',provider: 'withings',  types: ['Balance', 'Composition', 'Sommeil'] },
  { id: 'wahoo',     name: 'Wahoo',   provider: 'wahoo',     types: ['Activités', 'Capteurs'] },
  { id: 'garmin',    name: 'Garmin',  provider: null,        types: ['Activités', 'Sommeil', 'HRV', 'SpO2', 'FC'] },
  { id: 'whoop',     name: 'Whoop',   provider: null,        types: ['Récupération', 'Sommeil', 'HRV', 'Stress'] },
  { id: 'oura',      name: 'Oura',    provider: null,        types: ['Sommeil', 'HRV', 'Température', 'SpO2'] },
]

interface ConnInfo { provider: string; last_used_at: string | null; updated_at: string | null }

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 120)   return 'À l\'instant'
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return `Il y a ${Math.floor(diff / 86400)}j`
}

interface Props { sourcesRef?: RefObject<HTMLDivElement | null> }

export default function DataSources({ sourcesRef }: Props) {
  const [connInfo, setConnInfo]   = useState<ConnInfo[]>([])
  const [syncing,  setSyncing]    = useState<string | null>(null)
  const [tooltip,  setTooltip]    = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('oauth_tokens')
        .select('provider, last_used_at, updated_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .then(({ data }) => setConnInfo((data as ConnInfo[] | null) ?? []))
    })
  }, [])

  const connectedIds = new Set(connInfo.map(c => c.provider))

  const connected = SOURCES_DEF.filter(s => s.provider && connectedIds.has(s.provider))
  const available = SOURCES_DEF.filter(s => !s.provider || !connectedIds.has(s.provider))

  async function handleSync(provider: string) {
    setSyncing(provider)
    try {
      await fetch(`/api/sync/${provider}`, { method: 'POST' })
      // Refresh connection info
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data } = await sb.from('oauth_tokens')
          .select('provider, last_used_at, updated_at')
          .eq('user_id', user.id).eq('is_active', true)
        setConnInfo((data as ConnInfo[] | null) ?? [])
      }
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div ref={sourcesRef} id="rc-sources"
      style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Sources</p>
      <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 18px' }}>Sources de données</h2>

      {connected.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'#22c55e',margin:'0 0 8px' }}>Connectées</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:8 }}>
            {connected.map(s => {
              const info = connInfo.find(c => c.provider === s.provider)
              const isSyncing = syncing === s.provider
              return (
                <div key={s.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:'#22c55e',flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{s.name}</p>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.types.join(' · ')}</p>
                  </div>
                  <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'flex-end',gap:4 }}>
                    <span style={{ fontSize:10,color:'#22c55e',fontWeight:600 }}>Connecté</span>
                    {info?.last_used_at && (
                      <p style={{ fontSize:9,color:'var(--text-dim)',margin:0 }}>Synchro {formatRelative(info.last_used_at)}</p>
                    )}
                    {s.provider && (
                      <button
                        onClick={() => handleSync(s.provider!)}
                        disabled={!!isSyncing}
                        style={{ padding:'3px 10px',borderRadius:6,background:'transparent',border:'1px solid rgba(34,197,94,0.4)',color:'#22c55e',fontSize:9,cursor:isSyncing?'not-allowed':'pointer',opacity:isSyncing?0.6:1,display:'flex',alignItems:'center',gap:4 }}>
                        {isSyncing ? (
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ animation:'spin 0.8s linear infinite' }}>
                            <path d="M12 2a10 10 0 0110 10" opacity={0.3}/><path d="M12 2a10 10 0 0110 10"/>
                          </svg>
                        ) : (
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                          </svg>
                        )}
                        Sync
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Disponibles</p>
          <div style={{ display:'flex',flexDirection:'column' as const,gap:6 }}>
            {available.map(s => (
              <div key={s.id} style={{ position:'relative' as const,display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',opacity:0.8 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--border)',flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12,fontWeight:600,margin:0,color:'var(--text-mid)' }}>{s.name}</p>
                  <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.types.join(' · ')}</p>
                </div>
                <div style={{ position:'relative' as const }}>
                  {s.provider ? (
                    <a href={`/connections`}
                      style={{ padding:'5px 12px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer',textDecoration:'none',display:'inline-block' }}>
                      Connecter
                    </a>
                  ) : (
                    <>
                      <button
                        onMouseEnter={() => setTooltip(s.id)}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => setTooltip(t => t === s.id ? null : s.id)}
                        style={{ padding:'5px 12px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>
                        Bientôt
                      </button>
                      {tooltip === s.id && (
                        <div style={{ position:'absolute' as const,right:0,top:'calc(100% + 6px)',zIndex:50,minWidth:170,padding:'8px 12px',borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)',boxShadow:'0 4px 14px rgba(0,0,0,0.12)' }}>
                          <p style={{ fontSize:11,color:'var(--text-mid)',margin:0,lineHeight:1.5 }}>Bientôt disponible</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
