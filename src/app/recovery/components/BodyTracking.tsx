'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { localToday } from './types'
import type { BodyWeightRow, HydrationRow, PainLogRow } from './types'

const HYDRATION_OPTS = [0.5, 1, 1.5, 2, 2.5, 3]

const BODY_ZONES: { id: string; label: string }[] = [
  { id:'head',      label:'Tête'      },
  { id:'neck',      label:'Cou'       },
  { id:'lshoulder', label:'Épaule G'  },
  { id:'rshoulder', label:'Épaule D'  },
  { id:'larm',      label:'Bras G'    },
  { id:'rarm',      label:'Bras D'    },
  { id:'upperback', label:'Dos haut'  },
  { id:'chest',     label:'Poitrine'  },
  { id:'lowerback', label:'Dos bas'   },
  { id:'belly',     label:'Abdomen'   },
  { id:'lhip',      label:'Hanche G'  },
  { id:'rhip',      label:'Hanche D'  },
  { id:'lthigh',    label:'Cuisse G'  },
  { id:'rthigh',    label:'Cuisse D'  },
  { id:'lknee',     label:'Genou G'   },
  { id:'rknee',     label:'Genou D'   },
  { id:'lcalf',     label:'Mollet G'  },
  { id:'rcalf',     label:'Mollet D'  },
  { id:'lfoot',     label:'Pied G'    },
  { id:'rfoot',     label:'Pied D'    },
]

export default function BodyTracking() {
  const [userId, setUserId] = useState<string | null>(null)
  const [weights, setWeights] = useState<BodyWeightRow[]>([])
  const [hydration, setHydration] = useState<HydrationRow[]>([])
  const [painLog, setPainLog] = useState<PainLogRow[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [hydInput, setHydInput] = useState<number | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [wMounted, setWMounted] = useState(false)
  const [painZones, setPainZones] = useState<string[]>([])

  const load = useCallback(async () => {
    const sb = createClient()
    const { data:{ user } } = await sb.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const d30 = new Date(); d30.setDate(d30.getDate()-30)
    const d30s = `${d30.getFullYear()}-${String(d30.getMonth()+1).padStart(2,'0')}-${String(d30.getDate()).padStart(2,'0')}`
    const [w, h, p] = await Promise.all([
      sb.from('body_weight').select('id,date,weight_kg').eq('user_id',user.id).gte('date',d30s).order('date',{ascending:true}),
      sb.from('hydration').select('id,date,liters').eq('user_id',user.id).gte('date',d30s).order('date',{ascending:true}),
      sb.from('pain_log').select('id,date,body_zone,intensity').eq('user_id',user.id).gte('date',d30s),
    ])
    if (w.data) setWeights(w.data as BodyWeightRow[])
    if (h.data) setHydration(h.data as HydrationRow[])
    if (p.data) {
      setPainLog(p.data as PainLogRow[])
      const today = localToday()
      setPainZones((p.data as PainLogRow[]).filter(x=>x.date===today).map(x=>x.body_zone))
    }
  }, [])

  useEffect(() => { void load(); const id = setTimeout(()=>setWMounted(true),100); return ()=>clearTimeout(id) }, [load])

  async function saveWeight() {
    if (!userId || !weightInput) return
    setSaving('weight')
    const sb = createClient()
    await sb.from('body_weight').upsert({ user_id:userId, date:localToday(), weight_kg:parseFloat(weightInput) }, { onConflict:'user_id,date' })
    setSaving(null); void load()
  }

  async function saveHydration(liters: number) {
    if (!userId) return
    setSaving('hyd')
    const sb = createClient()
    await sb.from('hydration').upsert({ user_id:userId, date:localToday(), liters }, { onConflict:'user_id,date' })
    setSaving(null); setHydInput(liters); void load()
  }

  async function togglePainZone(zone: string) {
    if (!userId) return
    const today = localToday()
    const sb = createClient()
    if (painZones.includes(zone)) {
      await sb.from('pain_log').delete().eq('user_id',userId).eq('date',today).eq('body_zone',zone)
      setPainZones(prev=>prev.filter(z=>z!==zone))
    } else {
      await sb.from('pain_log').insert({ user_id:userId, date:today, body_zone:zone, intensity:5 })
      setPainZones(prev=>[...prev,zone])
    }
    void load()
  }

  // Count per zone over 30 days
  const zoneCount: Record<string,number> = {}
  for (const p of painLog) zoneCount[p.body_zone] = (zoneCount[p.body_zone]??0)+1

  // Weight chart
  const W=260, H=50
  const wVals = weights.map(w=>w.weight_kg)
  const wMin = Math.min(...wVals,0), wMax = Math.max(...wVals,1)+1
  const wPts = weights.map((w,i)=>({ x:(i/(weights.length-1||1))*W, y:H-((w.weight_kg-wMin)/(wMax-wMin||1))*H }))
  const wPath = wPts.map((p,i)=>`${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  // Today hydration
  const todayHyd = hydration.find(h=>h.date===localToday())?.liters ?? hydInput ?? 0
  const fillPct = Math.min(todayHyd/3,1)*100

  return (
    <div style={{ display:'flex',flexDirection:'column' as const,gap:14 }}>
      {/* Weight + Hydration row */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14 }}>
        {/* Weight */}
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 12px' }}>Poids</p>
          <div style={{ display:'flex',gap:8,marginBottom:12 }}>
            <input type="number" step={0.1} min={30} max={200} value={weightInput} onChange={e=>setWeightInput(e.target.value)}
              placeholder={weights.length?String(weights[weights.length-1].weight_kg):'70.0'}
              style={{ flex:1,padding:'7px 10px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg,var(--bg-card2))',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'DM Mono,monospace' }} />
            <span style={{ display:'flex',alignItems:'center',fontSize:12,color:'var(--text-dim)' }}>kg</span>
            <button onClick={saveWeight} disabled={saving==='weight'} style={{ padding:'7px 14px',borderRadius:9,background:'linear-gradient(135deg,#6b7280,#9ca3af)',border:'none',color:'#fff',fontSize:12,cursor:'pointer',fontWeight:600,opacity:saving==='weight'?0.6:1 }}>
              {saving==='weight'?'…':'Enregistrer'}
            </button>
          </div>
          {weights.length >= 2 ? (
            <div>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                <span style={{ fontSize:10,color:'var(--text-dim)' }}>30 derniers jours</span>
                {weights.length>=2 && <span style={{ fontSize:11,fontWeight:600,color:weights[weights.length-1].weight_kg<=weights[0].weight_kg?'#10B981':'#ef4444' }}>
                  {(weights[weights.length-1].weight_kg-weights[0].weight_kg>=0?'+':'')+((weights[weights.length-1].weight_kg-weights[0].weight_kg).toFixed(1))}kg
                </span>}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%',height:H,display:'block' }}>
                <path d={wPath} fill="none" stroke="#6B7280" strokeWidth={2} strokeDasharray={W*1.2} strokeDashoffset={wMounted?0:W*1.2} style={{ transition:'stroke-dashoffset 1s ease-out' }} />
              </svg>
            </div>
          ) : <p style={{ fontSize:11,color:'var(--text-dim)',textAlign:'center' as const,fontStyle:'italic',margin:'8px 0' }}>Enregistre ton poids pour suivre ta progression</p>}
        </div>

        {/* Hydration */}
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 12px' }}>Hydratation</p>
          <div style={{ display:'flex',alignItems:'flex-end',gap:12,marginBottom:16 }}>
            {/* Glass */}
            <svg width={36} height={50} viewBox="0 0 36 50">
              <path d="M6 5 L4 45 L32 45 L30 5 Z" fill="none" stroke="var(--text-dim)" strokeWidth={1.5} />
              <clipPath id="glassFill"><path d="M6 5 L4 45 L32 45 L30 5 Z" /></clipPath>
              <rect x={0} y={5+45*(1-fillPct/100)} width={36} height={45*(fillPct/100)} fill="#06B6D4" opacity={0.6} clipPath="url(#glassFill)" style={{ transition:'height 0.8s ease-out,y 0.8s ease-out' }} />
              <text x={18} y={28} textAnchor="middle" fill="var(--text)" fontSize={9} fontWeight={700}>{todayHyd}L</text>
            </svg>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:12,color:'var(--text-mid)',margin:'0 0 8px' }}>Aujourd'hui :</p>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' as const }}>
                {HYDRATION_OPTS.map(v=>(
                  <button key={v} onClick={()=>saveHydration(v)}
                    style={{ padding:'4px 9px',borderRadius:7,border:'1px solid',fontSize:11,cursor:'pointer',borderColor:todayHyd===v?'#06B6D4':'var(--border)',background:todayHyd===v?'rgba(6,182,212,0.12)':'var(--bg-card2)',color:todayHyd===v?'#06B6D4':'var(--text-mid)',fontWeight:todayHyd===v?600:400,opacity:saving==='hyd'?0.6:1 }}>
                    {v}L
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pain zones — pill grid */}
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:20,boxShadow:'var(--shadow-card)' }}>
        <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 12px' }}>Zones de douleur</p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:14 }}>
          {BODY_ZONES.map(z => {
            const selected = painZones.includes(z.id)
            const cnt = zoneCount[z.id] ?? 0
            return (
              <button key={z.id} onClick={()=>togglePainZone(z.id)}
                title={cnt > 0 ? `${cnt}× / 30j` : undefined}
                style={{
                  padding:'6px 4px',
                  borderRadius:8,
                  border:`1px solid ${selected?'#ef4444':'var(--border)'}`,
                  background:selected?'rgba(239,68,68,0.10)':'var(--bg-card2)',
                  color:selected?'#ef4444':'var(--text-dim)',
                  fontSize:10,
                  fontWeight:selected?600:400,
                  cursor:'pointer',
                  textAlign:'center' as const,
                  lineHeight:1.3,
                  transition:'all 0.15s',
                  position:'relative' as const,
                }}>
                {z.label}
                {cnt > 0 && !selected && (
                  <span style={{ display:'block',fontSize:8,color:'rgba(239,68,68,0.6)',marginTop:1 }}>{cnt}×</span>
                )}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize:11,color:painZones.length>0?'#ef4444':'var(--text-dim)',fontWeight:painZones.length>0?600:400,margin:0 }}>
          {painZones.length > 0
            ? `${painZones.length} zone${painZones.length>1?'s':''} signalée${painZones.length>1?'s':''} aujourd'hui`
            : 'Aucune douleur aujourd\'hui'}
        </p>
        {Object.keys(zoneCount).length > 0 && (
          <div style={{ marginTop:12 }}>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 6px',fontWeight:600 }}>Zones fréquentes (30j) :</p>
            {Object.entries(zoneCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([z,c])=>{
              const info = BODY_ZONES.find(bz=>bz.id===z)
              return <div key={z} style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                <span style={{ fontSize:11,color:'var(--text-mid)' }}>{info?.label??z}</span>
                <span style={{ fontSize:11,color:'#ef4444',fontWeight:600 }}>{c}× / 30j</span>
              </div>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
