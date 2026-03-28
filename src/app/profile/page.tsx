'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────
type ProfileTab = 'profil' | 'zones' | 'records'
type SportType  = 'run' | 'bike' | 'swim' | 'rowing' | 'hyrox' | 'triathlon' | 'trail'
type SubPlan    = 'trial' | 'premium' | 'pro'

// ── Sport config ──────────────────────────────────
const SPORT_EMOJI: Record<string,string> = {
  run:'🏃', bike:'🚴', swim:'🏊', rowing:'🚣', hyrox:'🏋️', triathlon:'🔱', trail:'⛰️', gym:'💪'
}
const SPORT_LABEL: Record<string,string> = {
  run:'Running', bike:'Cyclisme', swim:'Natation', rowing:'Aviron', hyrox:'Hyrox', triathlon:'Triathlon', trail:'Trail', gym:'Musculation'
}
const SPORT_COLOR: Record<string,string> = {
  run:'#22c55e', bike:'#3b82f6', swim:'#38bdf8', rowing:'#14b8a6', hyrox:'#ef4444', triathlon:'#a855f7', trail:'#f97316', gym:'#ffb340'
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }

function sinceDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth()
  const y = Math.floor(months / 12), m = months % 12
  if (y === 0) return `${m} mois`
  if (m === 0) return `${y} an${y > 1 ? 's' : ''}`
  return `${y} an${y > 1 ? 's' : ''} ${m} mois`
}

// ── Card wrapper ──────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 14px' }}>{children}</h3>
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width:40, height:22, borderRadius:11, background:value?'#00c8e0':'var(--border)', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:value?21:3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
    </button>
  )
}

// ════════════════════════════════════════════════
// BLOC 1 — PROFIL
// ════════════════════════════════════════════════
function ProfilBloc() {
  const [name,   setName]   = useState('Alexandre')
  const [age,    setAge]    = useState(31)
  const [height, setHeight] = useState(178)
  const [weight, setWeight] = useState(75)
  const [email,  setEmail]  = useState('alexandre@thw.fr')
  const [editing, setEditing] = useState(false)

  const [sports, setSports] = useState([
    { id:'1', sport:'run',    since:'2018-03-01' },
    { id:'2', sport:'bike',   since:'2020-06-15' },
    { id:'3', sport:'swim',   since:'2021-01-10' },
    { id:'4', sport:'hyrox',  since:'2023-09-01' },
  ])
  const [newSport, setNewSport] = useState('run')
  const [newSince, setNewSince] = useState('2020-01-01')

  const [plan] = useState<SubPlan>('trial')
  const [trialDays] = useState(9)

  const [connections, setConnections] = useState([
    { id:'strava',  label:'Strava',  connected:true,  lastSync:'2025-03-27' },
    { id:'garmin',  label:'Garmin',  connected:false, lastSync:'' },
    { id:'polar',   label:'Polar',   connected:false, lastSync:'' },
    { id:'zwift',   label:'Zwift',   connected:false, lastSync:'' },
    { id:'hrv',     label:'HRV4Training', connected:false, lastSync:'' },
  ])

  const [notifs, setNotifs] = useState({
    globalOn:     true,
    morningProg:  true, morningTime:'07:00',
    sessionRemind:true, sessionMin:30,
    hrv:          true,
    fatigue:      true,
    sleep:        false,
    meals:        true,
    updates:      true,
    weekSummary:  true,
    monthSummary: true,
  })

  const [sleepActive, setSleepActive] = useState(false)
  const [sleepStart,  setSleepStart]  = useState<Date|null>(null)
  const [sleepDur,    setSleepDur]    = useState<string|null>(null)

  function toggleSleep() {
    if (!sleepActive) {
      setSleepActive(true)
      setSleepStart(new Date())
      setSleepDur(null)
    } else {
      const dur = sleepStart ? Math.round((Date.now() - sleepStart.getTime()) / 60000) : 0
      setSleepDur(`${Math.floor(dur/60)}h${String(dur%60).padStart(2,'0')}`)
      setSleepActive(false)
    }
  }

  const planCfg: Record<SubPlan,{label:string;color:string;bg:string;price:string}> = {
    trial:   { label:'Essai gratuit', color:'#ffb340', bg:'rgba(255,179,64,0.12)', price:'14 jours' },
    premium: { label:'Premium',       color:'#00c8e0', bg:'rgba(0,200,224,0.12)', price:'15€/mois · 129€/an' },
    pro:     { label:'Pro',           color:'#a855f7', bg:'rgba(168,85,247,0.12)', price:'29€/mois · 199€/an' },
  }
  const pc = planCfg[plan]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Infos principales */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <SectionTitle>Profil</SectionTitle>
          <button onClick={()=>setEditing(!editing)} style={{ padding:'5px 12px', borderRadius:9, background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)', border:`1px solid ${editing?'transparent':'var(--border)'}`, color:editing?'#fff':'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:600 }}>
            {editing ? 'Sauvegarder' : 'Modifier'}
          </button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,rgba(0,200,224,0.2),rgba(91,111,255,0.2))', border:'2px solid rgba(0,200,224,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0, cursor:'pointer', position:'relative', overflow:'hidden' }}>
            👤
            <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.4)', fontSize:9, color:'#fff', textAlign:'center', padding:'2px 0' }}>Photo</div>
          </div>
          <div style={{ flex:1 }}>
            {editing ? (
              <input value={name} onChange={e=>setName(e.target.value)} style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', color:'var(--text)', outline:'none', width:'100%', marginBottom:6 }}/>
            ) : (
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:'0 0 4px' }}>{name}</p>
            )}
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>{email}</p>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-4">
          {[
            { label:'Age', value:age, unit:'ans', key:'age', min:10, max:100 },
            { label:'Taille', value:height, unit:'cm', key:'height', min:140, max:220 },
            { label:'Poids', value:weight, unit:'kg', key:'weight', min:30, max:200 },
          ].map(f => (
            <div key={f.key} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:11, padding:'10px 12px' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{f.label}</p>
              {editing ? (
                <input type="number" value={f.value} min={f.min} max={f.max} onChange={e => {
                  const v = parseInt(e.target.value)||0
                  if (f.key==='age') setAge(v)
                  else if (f.key==='height') setHeight(v)
                  else setWeight(v)
                }} style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, background:'transparent', border:'none', color:'#00c8e0', outline:'none', width:'100%' }}/>
              ) : (
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:'#00c8e0', margin:0 }}>{f.value} <span style={{ fontSize:12, fontWeight:400, color:'var(--text-dim)' }}>{f.unit}</span></p>
              )}
            </div>
          ))}
          <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:11, padding:'10px 12px' }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>IMC</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:'#22c55e', margin:0 }}>{(weight / ((height/100)**2)).toFixed(1)}</p>
          </div>
        </div>
      </Card>

      {/* Sports pratiques */}
      <Card>
        <SectionTitle>Sports pratiques</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
          {sports.map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{SPORT_EMOJI[s.sport]}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{SPORT_LABEL[s.sport]}</p>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>Depuis {sinceDate(s.since)}</p>
              </div>
              <button onClick={()=>setSports(p=>p.filter(x=>x.id!==s.id))} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={newSport} onChange={e=>setNewSport(e.target.value)} style={{ flex:1, padding:'7px 10px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}>
            {Object.entries(SPORT_LABEL).map(([k,v])=><option key={k} value={k}>{SPORT_EMOJI[k]} {v}</option>)}
          </select>
          <input type="date" value={newSince} onChange={e=>setNewSince(e.target.value)} style={{ padding:'7px 10px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/>
          <button onClick={()=>setSports(p=>[...p,{id:uid(),sport:newSport,since:newSince}])} style={{ padding:'7px 14px', borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Ajouter</button>
        </div>
      </Card>

      {/* Abonnement */}
      <Card>
        <SectionTitle>Abonnement</SectionTitle>
        <div style={{ padding:'14px 16px', borderRadius:12, background:pc.bg, border:`1px solid ${pc.color}44`, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <span style={{ padding:'3px 10px', borderRadius:20, background:pc.bg, border:`1px solid ${pc.color}`, color:pc.color, fontSize:11, fontWeight:700 }}>{pc.label}</span>
            <p style={{ fontSize:12, color:'var(--text-mid)', margin:'6px 0 0' }}>{pc.price}</p>
            {plan === 'trial' && <p style={{ fontSize:11, color:'#ffb340', margin:'4px 0 0', fontWeight:600 }}>{trialDays} jours restants</p>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ padding:'7px 14px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:11, cursor:'pointer' }}>Gerer</button>
            {plan !== 'pro' && <button style={{ padding:'7px 14px', borderRadius:9, background:'linear-gradient(135deg,#a855f7,#5b6fff)', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>Upgrade</button>}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          {[
            { name:'Premium', price:'15€/mois', annual:'129€/an', color:'#00c8e0' },
            { name:'Pro',     price:'29€/mois', annual:'199€/an', color:'#a855f7' },
          ].map(p => (
            <div key={p.name} style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <p style={{ fontSize:13, fontWeight:600, color:p.color, margin:'0 0 4px' }}>{p.name}</p>
              <p style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text)', margin:0 }}>{p.price}</p>
              <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{p.annual}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Connexions */}
      <Card>
        <SectionTitle>Connexions externes</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {connections.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:c.connected?'rgba(34,197,94,0.15)':'var(--bg-card)', border:`1px solid ${c.connected?'rgba(34,197,94,0.3)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {c.id==='strava'?'🚴':c.id==='garmin'?'⌚':c.id==='polar'?'❤️':c.id==='zwift'?'🎮':'📊'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{c.label}</p>
                  <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:c.connected?'rgba(34,197,94,0.15)':'rgba(156,163,175,0.15)', color:c.connected?'#22c55e':'#9ca3af', fontWeight:600 }}>{c.connected?'Connecte':'Non connecte'}</span>
                </div>
                {c.connected && c.lastSync && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>Sync : {c.lastSync}</p>}
              </div>
              <button onClick={()=>setConnections(p=>p.map(x=>x.id===c.id?{...x,connected:!x.connected,lastSync:x.connected?'':new Date().toISOString().split('T')[0]}:x))}
                style={{ padding:'5px 11px', borderRadius:8, background:c.connected?'rgba(239,68,68,0.10)':'rgba(0,200,224,0.10)', border:`1px solid ${c.connected?'rgba(239,68,68,0.25)':'rgba(0,200,224,0.25)'}`, color:c.connected?'#ef4444':'#00c8e0', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                {c.connected ? 'Deconnecter' : 'Connecter'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <SectionTitle>Notifications</SectionTitle>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>Tout</span>
            <Toggle value={notifs.globalOn} onChange={v=>setNotifs(p=>({...p,globalOn:v}))}/>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, opacity:notifs.globalOn?1:0.4, pointerEvents:notifs.globalOn?'auto':'none' }}>
          {[
            { label:'Entrainement', items:[
              { key:'morningProg', label:'Programme du matin' },
              { key:'sessionRemind', label:'Rappel seance' },
            ]},
            { label:'Recuperation', items:[
              { key:'hrv', label:'Rappel HRV' },
              { key:'fatigue', label:'Fatigue' },
              { key:'sleep', label:'Sommeil' },
            ]},
            { label:'Nutrition', items:[
              { key:'meals', label:'Repas' },
            ]},
            { label:'Resumes', items:[
              { key:'weekSummary', label:'Resume semaine' },
              { key:'monthSummary', label:'Resume mois' },
            ]},
          ].map(section => (
            <div key={section.label} style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <p style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.06em', margin:'0 0 10px' }}>{section.label}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {section.items.map(item => (
                  <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'var(--text)' }}>{item.label}</span>
                    <Toggle value={(notifs as any)[item.key]} onChange={v=>setNotifs(p=>({...p,[item.key]:v}))}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sommeil */}
      <Card>
        <SectionTitle>Suivi sommeil</SectionTitle>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' as const }}>
          <button onClick={toggleSleep}
            style={{ padding:'12px 24px', borderRadius:12, background:sleepActive?'linear-gradient(135deg,#a855f7,#5b6fff)':'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            {sleepActive ? '⏹ Arreter le sommeil' : '🌙 Lancer le sommeil'}
          </button>
          {sleepActive && sleepStart && (
            <div style={{ padding:'10px 14px', borderRadius:11, background:'rgba(168,85,247,0.10)', border:'1px solid rgba(168,85,247,0.25)' }}>
              <p style={{ fontSize:11, color:'#a855f7', margin:'0 0 2px', fontWeight:600 }}>Sommeil en cours</p>
              <p style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text)', margin:0 }}>Debut : {sleepStart.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>
            </div>
          )}
          {sleepDur && (
            <div style={{ padding:'10px 14px', borderRadius:11, background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.25)' }}>
              <p style={{ fontSize:11, color:'#22c55e', margin:'0 0 2px', fontWeight:600 }}>Derniere nuit</p>
              <p style={{ fontSize:14, fontFamily:'Syne,sans-serif', fontWeight:700, color:'#22c55e', margin:0 }}>{sleepDur}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// BLOC 2 — ZONES
// ════════════════════════════════════════════════
function ZonesBloc() {
  const [sport,      setSport]      = useState('run')
  const [calcMode,   setCalcMode]   = useState(false)
  const [testVal,    setTestVal]    = useState('')

  const ZONES_CONFIG: Record<string,{label:string;unit:string;testLabel:string;testUnit:string;calcFn:(v:number)=>string[]}> = {
    bike: {
      label:'Velo (puissance)', unit:'W', testLabel:'Test 20 min (puissance moyenne)', testUnit:'W',
      calcFn:(w)=>{ const ftp=Math.round(w*0.95); return [`< ${Math.round(ftp*0.55)}W`,`${Math.round(ftp*0.56)}-${Math.round(ftp*0.75)}W`,`${Math.round(ftp*0.76)}-${Math.round(ftp*0.87)}W`,`${Math.round(ftp*0.88)}-${Math.round(ftp*1.05)}W`,`> ${Math.round(ftp*1.06)}W`] }
    },
    run: {
      label:'Running (allure)', unit:'/km', testLabel:'Record 10km', testUnit:'min:sec',
      calcFn:(sec)=>{ const t=sec/10; const s=(v:number)=>`${Math.floor(v/60)}:${String(Math.round(v%60)).padStart(2,'0')}`; return [`> ${s(t*1.25)}/km`,`${s(t*1.11)}-${s(t*1.25)}/km`,`${s(t*1.01)}-${s(t*1.10)}/km`,`${s(t*0.91)}-${s(t*1.00)}/km`,`< ${s(t*0.90)}/km`] }
    },
    swim: {
      label:'Natation (/100m)', unit:'/100m', testLabel:'Record 400m', testUnit:'min:sec',
      calcFn:(sec)=>{ const css=sec/4; const s=(v:number)=>`${Math.floor(v/60)}:${String(Math.round(v%60)).padStart(2,'0')}`; return [`> ${s(css*1.35)}/100m`,`${s(css*1.16)}-${s(css*1.34)}/100m`,`${s(css*1.06)}-${s(css*1.15)}/100m`,`${s(css*0.98)}-${s(css*1.05)}/100m`,`< ${s(css*0.97)}/100m`] }
    },
    rowing: {
      label:'Aviron (/500m)', unit:'/500m', testLabel:'Record 2000m', testUnit:'min:sec',
      calcFn:(sec)=>{ const base=sec/4; const s=(v:number)=>`${Math.floor(v/60)}:${String(Math.round(v%60)).padStart(2,'0')}`; return [`> ${s(base*1.25)}/500m`,`${s(base*1.10)}-${s(base*1.25)}/500m`,`${s(base*1.02)}-${s(base*1.09)}/500m`,`${s(base*0.95)}-${s(base*1.01)}/500m`,`< ${s(base*0.94)}/500m`] }
    },
    hyrox: {
      label:'Hyrox', unit:'allure', testLabel:'2000m Rowing (split)', testUnit:'min:sec',
      calcFn:(_)=>['Echauffement / Recup','Endurance basse','Rythme course','Rythme competition','Max effort']
    },
  }

  const Z_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
  const Z_LABELS = ['Z1 — Recup','Z2 — Aerobie','Z3 — Tempo','Z4 — Seuil','Z5 — VO2max']

  const [manualZones, setManualZones] = useState<Record<string,string[]>>({
    bike:  ['<166W','166-226W','227-262W','263-316W','>317W'],
    run:   ['>5:10/km','4:35-5:10/km','4:11-4:34/km','3:47-4:10/km','<3:46/km'],
    swim:  ['>1:58/100m','1:42-1:57/100m','1:33-1:41/100m','1:27-1:32/100m','<1:26/100m'],
    rowing:['>2:05/500m','1:50-2:04/500m','1:45-1:49/500m','1:38-1:44/500m','<1:37/500m'],
    hyrox: ['Echauffement','Endurance','Tempo','Competition','Max'],
  })

  const [calcResult, setCalcResult] = useState<string[]|null>(null)

  function parseTime(val: string): number {
    const p = val.split(':').map(Number)
    return p.length === 2 ? p[0]*60+p[1] : parseFloat(val)||0
  }

  function calculate() {
    const cfg = ZONES_CONFIG[sport]
    if (!cfg) return
    const v = parseTime(testVal)
    if (!v) return
    const zones = cfg.calcFn(v)
    setCalcResult(zones)
    setManualZones(p=>({...p,[sport]:zones}))
  }

  const cfg = ZONES_CONFIG[sport]
  const zones = manualZones[sport] || ['','','','','']

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <SectionTitle>Zones d'entrainement</SectionTitle>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setCalcMode(false)} style={{ padding:'5px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:!calcMode?'#00c8e0':'var(--border)', background:!calcMode?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:!calcMode?'#00c8e0':'var(--text-mid)', fontWeight:!calcMode?600:400 }}>Manuel</button>
            <button onClick={()=>setCalcMode(true)} style={{ padding:'5px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:calcMode?'#00c8e0':'var(--border)', background:calcMode?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:calcMode?'#00c8e0':'var(--text-mid)', fontWeight:calcMode?600:400 }}>Calculateur</button>
          </div>
        </div>

        {/* Sport tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {Object.keys(ZONES_CONFIG).map(s=>(
            <button key={s} onClick={()=>{setSport(s);setCalcResult(null)}}
              style={{ padding:'5px 11px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:sport===s?SPORT_COLOR[s]:'var(--border)', background:sport===s?`${SPORT_COLOR[s]}22`:'var(--bg-card2)', color:sport===s?SPORT_COLOR[s]:'var(--text-mid)', fontWeight:sport===s?600:400 }}>
              {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Calculateur */}
        {calcMode && cfg && (
          <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.18)', marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#00c8e0', margin:'0 0 10px' }}>{cfg.testLabel}</p>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <input value={testVal} onChange={e=>setTestVal(e.target.value)} placeholder={cfg.testUnit==='W'?'ex: 320':'ex: 37:20'} style={{ flex:1, padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13, outline:'none' }}/>
              <span style={{ fontSize:11, color:'var(--text-dim)' }}>{cfg.testUnit}</span>
              <button onClick={calculate} style={{ padding:'8px 16px', borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>Calculer</button>
            </div>
            {calcResult && <p style={{ fontSize:11, color:'#22c55e', margin:'8px 0 0' }}>Zones calculees et sauvegardees</p>}
          </div>
        )}

        {/* Zones */}
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {Z_LABELS.map((label,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:28, height:28, borderRadius:7, background:`${Z_COLORS[i]}22`, border:`1px solid ${Z_COLORS[i]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:Z_COLORS[i], flexShrink:0 }}>Z{i+1}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:11, color:'var(--text-mid)' }}>{label}</span>
                  {!calcMode ? (
                    <input value={zones[i]||''} onChange={e=>{const z=[...zones];z[i]=e.target.value;setManualZones(p=>({...p,[sport]:z}))}} style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:600, color:Z_COLORS[i], background:'transparent', border:'none', outline:'none', textAlign:'right', width:140 }}/>
                  ) : (
                    <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:Z_COLORS[i], fontWeight:600 }}>{zones[i]||'—'}</span>
                  )}
                </div>
                <div style={{ height:5, borderRadius:999, background:`${Z_COLORS[i]}22` }}>
                  <div style={{ height:'100%', width:`${20+i*16}%`, background:Z_COLORS[i], opacity:0.7, borderRadius:999 }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// BLOC 3 — RECORDS & PALMARES
// ════════════════════════════════════════════════
interface RecordEntry {
  id: string; distance: string; time: string; date: string; year: string; race: string; type: 'entrainement'|'competition'
  pace?: string; elevation?: string; splits?: { swim?:string; bike?:string; run?:string }
}
interface PalmEntry { id: string; race: string; year: string; rank: string; time: string; category: string }

const BIKE_DISTS = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','20min','30min','1h','2h','3h','4h','5h','6h']
const RUN_DISTS  = ['1500m','5km','10km','Semi-marathon','Marathon','50km','100km']
const TRAIL_DISTS= ['20km','30km','50km','80km','100km','Ultra (100km+)']
const TRI_DISTS  = ['XS','S (Sprint)','M (Standard)','70.3 / L','Ironman / XL']
const SWIM_DISTS = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const ROW_DISTS  = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const HYROX_CATS = ['Open Solo','Pro Solo']

const RUN_KM: Record<string,number> = {'1500m':1.5,'5km':5,'10km':10,'Semi-marathon':21.1,'Marathon':42.195,'50km':50,'100km':100}

function calcPace(distKm: number, timeStr: string): string {
  const p = timeStr.split(':').map(Number)
  const s = p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0)
  if (!s||!distKm) return ''
  const sPerKm = s/distKm
  return `${Math.floor(sPerKm/60)}:${String(Math.round(sPerKm%60)).padStart(2,'0')}/km`
}

function RecordsBloc() {
  const [sport, setSport] = useState<SportType>('bike')
  const [records, setRecords] = useState<Record<string,RecordEntry[]>>({})
  const [palmares, setPalmares] = useState<Record<string,PalmEntry[]>>({})
  const [addModal, setAddModal] = useState<{dist:string}|null>(null)
  const [addPalm,  setAddPalm]  = useState(false)
  const [sortYear, setSortYear] = useState('all')

  const SPORT_DISTS: Record<string,string[]> = {
    bike:BIKE_DISTS, run:RUN_DISTS, trail:TRAIL_DISTS, triathlon:TRI_DISTS, swim:SWIM_DISTS, rowing:ROW_DISTS, hyrox:HYROX_CATS
  }

  const dists = SPORT_DISTS[sport] || []

  function getRecords(dist: string): RecordEntry[] {
    return (records[`${sport}_${dist}`]||[]).filter(r => sortYear==='all'||r.year===sortYear).sort((a,b)=>a.time.localeCompare(b.time))
  }

  function getPalmares(): PalmEntry[] {
    return palmares[sport]||[]
  }

  function addRecord(dist: string, entry: RecordEntry) {
    const key = `${sport}_${dist}`
    setRecords(p=>({...p,[key]:[...(p[key]||[]),entry]}))
  }

  function addPalmEntry(entry: PalmEntry) {
    setPalmares(p=>({...p,[sport]:[...(p[sport]||[]),entry]}))
  }

  function sportCount(sp: string): number {
    return Object.keys(records).filter(k=>k.startsWith(sp+'_')).reduce((s,k)=>s+(records[k]?.length||0),0)
  }

  const SPORT_TABS: [SportType,string][] = [['bike','🚴 Velo'],['run','🏃 Running'],['trail','⛰️ Trail'],['triathlon','🔱 Triathlon'],['swim','🏊 Natation'],['rowing','🚣 Aviron'],['hyrox','🏋️ Hyrox']]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Sport tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {SPORT_TABS.map(([s,l])=>(
          <button key={s} onClick={()=>setSport(s)}
            style={{ padding:'7px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:sport===s?SPORT_COLOR[s]:'var(--border)', background:sport===s?`${SPORT_COLOR[s]}22`:'var(--bg-card)', color:sport===s?SPORT_COLOR[s]:'var(--text-mid)', fontWeight:sport===s?600:400 }}>
            {l}{sportCount(s)>0&&<span style={{ marginLeft:5, fontSize:9, padding:'1px 5px', borderRadius:20, background:`${SPORT_COLOR[s]}33`, fontWeight:700 }}>{sportCount(s)}</span>}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:6 }}>
          {['all','2024','2023','2022','2021'].map(y=>(
            <button key={y} onClick={()=>setSortYear(y)} style={{ padding:'4px 10px', borderRadius:20, border:'1px solid', cursor:'pointer', fontSize:10, borderColor:sortYear===y?'#00c8e0':'var(--border)', background:sortYear===y?'rgba(0,200,224,0.10)':'var(--bg-card)', color:sortYear===y?'#00c8e0':'var(--text-dim)', fontWeight:sortYear===y?600:400 }}>{y==='all'?'Tout':y}</button>
          ))}
        </div>
        <button onClick={()=>setAddPalm(true)} style={{ padding:'6px 12px', borderRadius:9, background:'rgba(168,85,247,0.10)', border:'1px solid rgba(168,85,247,0.25)', color:'#a855f7', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Palmares</button>
      </div>

      {/* Records par distance */}
      <Card>
        <SectionTitle>Records — {SPORT_LABEL[sport]||sport}</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {dists.map(dist => {
            const recs = getRecords(dist)
            const best = recs[0]
            return (
              <div key={dist} style={{ padding:'10px 13px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-mid)', minWidth:80, flexShrink:0 }}>{dist}</span>
                  {best ? (
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#00c8e0' }}>{best.time}</span>
                        {best.pace && <span style={{ fontSize:10, color:'var(--text-dim)' }}>{best.pace}</span>}
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:best.type==='competition'?'rgba(0,200,224,0.15)':'rgba(34,197,94,0.15)', color:best.type==='competition'?'#00c8e0':'#22c55e', fontWeight:700 }}>{best.type}</span>
                      </div>
                      <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{best.race} · {best.date}</p>
                    </div>
                  ) : (
                    <span style={{ flex:1, fontSize:11, color:'var(--text-dim)', fontStyle:'italic' }}>Aucun record</span>
                  )}
                  <button onClick={()=>setAddModal({dist})} style={{ padding:'4px 9px', borderRadius:7, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:10, fontWeight:600, cursor:'pointer', flexShrink:0 }}>+</button>
                </div>
                {recs.length > 1 && (
                  <div style={{ marginTop:7, paddingTop:7, borderTop:'1px solid var(--border)' }}>
                    {recs.slice(1).map(r => (
                      <div key={r.id} style={{ display:'flex', gap:10, padding:'3px 0' }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--text-mid)' }}>{r.time}</span>
                        <span style={{ fontSize:10, color:'var(--text-dim)' }}>{r.race} · {r.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Palmares */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <SectionTitle>Palmares — {SPORT_LABEL[sport]||sport}</SectionTitle>
          <button onClick={()=>setAddPalm(true)} style={{ padding:'5px 11px', borderRadius:8, background:'rgba(168,85,247,0.10)', border:'1px solid rgba(168,85,247,0.25)', color:'#a855f7', fontSize:11, cursor:'pointer', fontWeight:600 }}>+ Ajouter</button>
        </div>
        {getPalmares().length === 0 ? (
          <p style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic', textAlign:'center', padding:'12px 0' }}>Aucune entree — ajoutez vos podiums et classements</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {getPalmares().map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, color:'#a855f7' }}>#{p.rank}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.race}</p>
                  <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{p.year} · {p.category} · {p.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Volume stats */}
      <Card>
        <SectionTitle>Volume de participation</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }} className="md:grid-cols-3">
          {SPORT_TABS.map(([s,l])=>{
            const count = sportCount(s)
            if (!count) return null
            return (
              <div key={s} style={{ padding:'10px 13px', borderRadius:10, background:'var(--bg-card2)', border:`1px solid ${SPORT_COLOR[s]}33` }}>
                <p style={{ fontSize:11, color:SPORT_COLOR[s], fontWeight:600, margin:'0 0 3px' }}>{l}</p>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:SPORT_COLOR[s], margin:0 }}>{count}</p>
                <p style={{ fontSize:9, color:'var(--text-dim)', margin:'1px 0 0' }}>performances enregistrees</p>
              </div>
            )
          })}
          {Object.values(records).every(r=>r.length===0) && (
            <p style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic', gridColumn:'1/-1', textAlign:'center', padding:'8px 0' }}>Ajoutez vos records pour voir les statistiques</p>
          )}
        </div>
      </Card>

      {/* Add Record Modal */}
      {addModal && (
        <AddRecordModal
          dist={addModal.dist}
          sport={sport}
          onClose={()=>setAddModal(null)}
          onSave={(e)=>{ addRecord(addModal.dist,e); setAddModal(null) }}
        />
      )}

      {/* Add Palmares Modal */}
      {addPalm && (
        <AddPalmaresModal
          onClose={()=>setAddPalm(false)}
          onSave={(e)=>{ addPalmEntry(e); setAddPalm(false) }}
        />
      )}
    </div>
  )
}

function AddRecordModal({ dist, sport, onClose, onSave }: { dist:string; sport:SportType; onClose:()=>void; onSave:(e:RecordEntry)=>void }) {
  const [time,  setTime]  = useState('')
  const [date,  setDate]  = useState(new Date().toISOString().split('T')[0])
  const [year,  setYear]  = useState('2025')
  const [race,  setRace]  = useState('')
  const [type,  setType]  = useState<'entrainement'|'competition'>('competition')
  const [elev,  setElev]  = useState('')
  const [swimT, setSwimT] = useState('')
  const [bikeT, setBikeT] = useState('')
  const [runT,  setRunT]  = useState('')

  const distKm = RUN_KM[dist]
  const pace = (sport==='run'||sport==='trail') && distKm && time ? calcPace(distKm,time) : ''

  function save() {
    onSave({
      id:uid(), distance:dist, time, date, year, race:race||dist, type,
      pace:pace||undefined, elevation:elev||undefined,
      splits:(sport==='triathlon'&&(swimT||bikeT||runT))?{swim:swimT,bike:bikeT,run:runT}:undefined
    })
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:440, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Nouveau record — {dist}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>x</button>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {(['competition','entrainement'] as const).map(t=>(
            <button key={t} onClick={()=>setType(t)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:type===t?600:400, borderColor:type===t?'#00c8e0':'var(--border)', background:type===t?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:type===t?'#00c8e0':'var(--text-mid)' }}>{t}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          {[
            { label:'Temps', value:time, set:setTime, placeholder:sport==='bike'?'320':'1:24:30', mono:true },
            { label:'Date',  value:date, set:setDate, type:'date' },
            { label:'Annee', value:year, set:setYear, placeholder:'2025' },
            { label:'Course / lieu', value:race, set:setRace, placeholder:`ex: ${dist}` },
          ].map(f=>(
            <div key={f.label}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.label}</p>
              <input type={f.type||'text'} value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:f.mono?'DM Mono,monospace':'inherit', fontSize:12, outline:'none' }}/>
            </div>
          ))}
        </div>
        {pace && <div style={{ padding:'8px 12px', borderRadius:9, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:12 }}><p style={{ fontSize:12, color:'#22c55e', margin:0, fontFamily:'DM Mono,monospace', fontWeight:700 }}>Allure : {pace}</p></div>}
        {sport==='trail' && <div style={{ marginBottom:12 }}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Denivele (D+)</p><input value={elev} onChange={e=>setElev(e.target.value)} placeholder="ex: 2400m" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>}
        {sport==='triathlon' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
            {[{l:'Natation',v:swimT,s:setSwimT},{l:'Velo',v:bikeT,s:setBikeT},{l:'Course',v:runT,s:setRunT}].map(f=>(
              <div key={f.l}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.l}</p><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder="0:00:00" style={{ width:'100%', padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={save} style={{ flex:2, padding:10, borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function AddPalmaresModal({ onClose, onSave }: { onClose:()=>void; onSave:(e:PalmEntry)=>void }) {
  const [race,     setRace]     = useState('')
  const [year,     setYear]     = useState('2025')
  const [rank,     setRank]     = useState('')
  const [time,     setTime]     = useState('')
  const [category, setCategory] = useState('Open')

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:380, width:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Ajouter au palmares</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>x</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          {[
            { label:'Nom de la course', value:race, set:setRace, placeholder:'ex: Ironman Nice' },
            { label:'Annee', value:year, set:setYear, placeholder:'2025' },
            { label:'Classement', value:rank, set:setRank, placeholder:'ex: 12 ou 12/450' },
            { label:'Temps', value:time, set:setTime, placeholder:'ex: 9:45:00', mono:true },
            { label:'Categorie', value:category, set:setCategory, placeholder:'Open / Pro / AG...' },
          ].map(f=>(
            <div key={f.label}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.label}</p>
              <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:f.mono?'DM Mono,monospace':'inherit', fontSize:12, outline:'none' }}/>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({id:uid(),race,year,rank,time,category})} style={{ flex:2, padding:10, borderRadius:10, background:'linear-gradient(135deg,#a855f7,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('profil')

  const TABS: { id:ProfileTab; label:string; short:string; color:string; bg:string }[] = [
    { id:'profil',  label:'Profil',           short:'Profil',  color:'#00c8e0', bg:'rgba(0,200,224,0.10)'  },
    { id:'zones',   label:'Zones',            short:'Zones',   color:'#f97316', bg:'rgba(249,115,22,0.10)' },
    { id:'records', label:'Records & Palmares', short:'Records', color:'#a855f7', bg:'rgba(168,85,247,0.10)' },
  ]

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Mon Profil</h1>
        <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>Profil · Zones · Records</p>
      </div>

      {/* Desktop tabs */}
      <div className="hidden md:flex" style={{ gap:8, marginBottom:20 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, padding:'11px 16px', borderRadius:12, border:'1px solid', cursor:'pointer', borderColor:tab===t.id?t.color:'var(--border)', background:tab===t.id?t.bg:'var(--bg-card)', color:tab===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:tab===t.id?700:400, boxShadow:tab===t.id?`0 0 0 1px ${t.color}33`:'var(--shadow-card)', transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden" style={{ display:'flex', gap:5, marginBottom:16 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'1px solid', cursor:'pointer', borderColor:tab===t.id?t.color:'var(--border)', background:tab===t.id?t.bg:'var(--bg-card)', color:tab===t.id?t.color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:tab===t.id?700:400, transition:'all 0.15s' }}>
            {t.short}
          </button>
        ))}
      </div>

      {tab === 'profil'  && <ProfilBloc/>}
      {tab === 'zones'   && <ZonesBloc/>}
      {tab === 'records' && <RecordsBloc/>}
    </div>
  )
}
