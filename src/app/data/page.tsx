'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────
type MainTab   = 'training' | 'recovery' | 'nutrition'
type Period    = '1S' | '6S' | '1M' | '3M' | '6M' | '1A'
type SportZone = 'run' | 'bike'

// ── Couleurs zones ────────────────────────────────
const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const ZONE_LABELS = ['Z1','Z2','Z3','Z4','Z5']

// ── Mock data ─────────────────────────────────────
const TRAINING_DATA: Record<Period, {
  volumeH: number; sessions: number; tss: number; rpe: number
  sports: { run: number; bike: number; swim: number; hyrox: number; gym: number }
  zones: { run: number[]; bike: number[] }
  types: number[]
}> = {
  '1S': { volumeH:12.4, sessions:8,  tss:487, rpe:6.2, sports:{run:3.5,bike:5,swim:2,hyrox:1.2,gym:0.7}, zones:{run:[15,40,25,15,5],bike:[10,35,30,20,5]}, types:[10,30,15,25,10,5,5] },
  '6S': { volumeH:68,   sessions:42, tss:2840,rpe:6.0, sports:{run:20,bike:28,swim:10,hyrox:6,gym:4},    zones:{run:[20,38,22,15,5],bike:[12,33,28,22,5]}, types:[12,28,14,26,10,6,4] },
  '1M': { volumeH:48,   sessions:30, tss:1920,rpe:6.1, sports:{run:14,bike:20,swim:8,hyrox:4,gym:2},     zones:{run:[18,38,24,15,5],bike:[11,34,29,21,5]}, types:[11,29,14,26,10,6,4] },
  '3M': { volumeH:145,  sessions:90, tss:5800,rpe:6.0, sports:{run:42,bike:60,swim:24,hyrox:12,gym:7},   zones:{run:[19,37,23,16,5],bike:[12,33,28,22,5]}, types:[12,28,14,26,10,6,4] },
  '6M': { volumeH:290,  sessions:178,tss:11600,rpe:5.9,sports:{run:84,bike:120,swim:48,hyrox:24,gym:14}, zones:{run:[20,36,24,15,5],bike:[13,32,28,22,5]}, types:[13,27,14,26,10,6,4] },
  '1A': { volumeH:580,  sessions:350,tss:23000,rpe:5.8,sports:{run:168,bike:240,swim:96,hyrox:48,gym:28},zones:{run:[21,35,24,15,5],bike:[14,31,28,22,5]}, types:[14,26,14,26,10,6,4] },
}

const LOAD_WEEKS = [
  { w:'S7', ctl:72, atl:68, tsb:4 },
  { w:'S8', ctl:76, atl:82, tsb:-6 },
  { w:'S9', ctl:78, atl:88, tsb:-10 },
  { w:'S10',ctl:80, atl:75, tsb:5 },
  { w:'S11',ctl:82, atl:90, tsb:-8 },
  { w:'S12',ctl:84, atl:91, tsb:-7 },
]

const HRV_DATA = [58,62,55,60,63,57,54,59,65,61,58,56,60,62,64,59,57,55,58,61,63,60,58,57,61,63,65,62,59,58]
const SLEEP_DATA = [7.2,6.8,7.5,8.0,7.1,6.5,7.8,7.3,6.9,7.6,8.1,7.4,6.7,7.9,7.2,6.8,7.5,8.0,7.2,6.9,7.6,7.4,6.8,7.1,7.8,8.2,7.3,7.0,6.8,7.5]
const RESTHR_DATA = [44,46,43,45,44,47,45,44,43,46,44,45,43,44,46,45,43,44,45,43,44,46,44,43,45,44,43,44,45,44]

const AI_RESPONSES = [
  '✅ **Repas analysé**\n\nEstimation : ~520 kcal · 32g protéines · 48g glucides · 18g lipides\n\n💡 Apport protéique correct pour la récupération. Glucides légèrement insuffisants si séance intensive prévue — ajoute 30-40g (banane, riz).',
  '📊 Apport calorique dans les objectifs. Ratio macros équilibré pour une journée d\'entraînement modéré. Bonne hydratation recommandée.',
  '⚡ Glucides insuffisants avant ta séance vélo de ce soir. Ajoute 60-80g de glucides complexes 2h avant (pâtes, riz, patate douce).',
  '🔍 Protéines insuffisantes pour la récupération post-Hyrox. Vise +20-30g ce soir (fromage blanc, œufs, whey).',
]

const MEAL_HISTORY = [
  { time:'08:15', name:'Petit-déjeuner', cal:420, p:22, g:55, l:14, badge:'✅ Équilibré' },
  { time:'12:30', name:'Déjeuner', cal:680, p:45, g:72, l:22, badge:'💪 Riche en protéines' },
  { time:'16:00', name:'Collation pré-séance', cal:180, p:8, g:32, l:4, badge:'⚡ Glucides OK' },
]

// ── Helpers ───────────────────────────────────────
function formatH(h: number): string {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h${String(mm).padStart(2,'0')}` : `${hh}h`
}

// ── Small stat card ───────────────────────────────
function StatBox({ label, value, unit, color }: { label:string; value:string|number; unit?:string; color?:string }) {
  return (
    <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 5px' }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:color||'var(--text)', margin:0 }}>
        {value}{unit && <span style={{ fontSize:12, fontWeight:400, color:'var(--text-dim)', marginLeft:3 }}>{unit}</span>}
      </p>
    </div>
  )
}

// ── Period selector ───────────────────────────────
function PeriodSelector({ value, onChange }: { value:Period; onChange:(p:Period)=>void }) {
  const opts: {id:Period; label:string}[] = [
    {id:'1S',label:'1 sem.'},{id:'6S',label:'6 sem.'},{id:'1M',label:'1 mois'},
    {id:'3M',label:'3 mois'},{id:'6M',label:'6 mois'},{id:'1A',label:'1 an'},
  ]
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' as const }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{ padding:'4px 10px', borderRadius:7, border:'1px solid', fontSize:11,
            borderColor: value===o.id ? '#00c8e0' : 'var(--border)',
            background:  value===o.id ? 'rgba(0,200,224,0.10)' : 'var(--bg-card2)',
            color:       value===o.id ? '#00c8e0' : 'var(--text-dim)',
            cursor:'pointer', fontWeight: value===o.id ? 600 : 400 }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Donut chart ───────────────────────────────────
function DonutChart({ slices, size=80, stroke=10 }: {
  slices: { pct:number; color:string; label?:string }[]
  size?: number; stroke?: number
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let cumulative = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      {slices.map((s,i) => {
        const dash = (s.pct/100) * c
        const offset = -cumulative * c / 100
        cumulative += s.pct
        return <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={`${dash} ${c}`} strokeDashoffset={offset} opacity={0.85}/>
      })}
    </svg>
  )
}

// ── Zone chart ────────────────────────────────────
function ZoneBar({ data, sport }: { data:number[]; sport:string }) {
  return (
    <div>
      <p style={{ fontSize:11, fontWeight:600, color:'var(--text-mid)', marginBottom:8 }}>{sport}</p>
      <div style={{ display:'flex', gap:3, height:12, borderRadius:6, overflow:'hidden', marginBottom:6 }}>
        {data.map((pct,i) => (
          <div key={i} style={{ flex:pct, background:ZONE_COLORS[i], opacity:0.85 }}/>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {data.map((pct,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:3 }}>
            <span style={{ width:7, height:7, borderRadius:2, background:ZONE_COLORS[i], display:'inline-block' }}/>
            <span style={{ fontSize:10, color:ZONE_COLORS[i], fontFamily:'DM Mono,monospace', fontWeight:600 }}>{ZONE_LABELS[i]} {pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Line chart (simple SVG) ───────────────────────
function LineChart({ data, color='#00c8e0', height=60, label }: {
  data: number[]; color?:string; height?:number; label?:string
}) {
  if (!data.length) return null
  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.05
  const w   = 300
  const pts = data.map((v,i) => {
    const x = (i / (data.length - 1)) * w
    const y = height - ((v - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')
  const area = `0,${height} ${pts} ${w},${height}`

  return (
    <div>
      {label && <p style={{ fontSize:10, color:'var(--text-dim)', marginBottom:4 }}>{label}</p>}
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width:'100%', height, overflow:'visible' }}>
        <defs>
          <linearGradient id={`lg_${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#lg_${color.replace('#','')})`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Last point dot */}
        {(() => {
          const last = data[data.length-1]
          const x = w, y = height - ((last - min) / (max - min)) * height
          return <circle cx={x} cy={y} r="3" fill={color}/>
        })()}
      </svg>
    </div>
  )
}

// ── Bar chart ─────────────────────────────────────
function BarChart({ data, color='#5b6fff', height=50 }: { data:number[]; color?:string; height?:number }) {
  const max = Math.max(...data)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height }}>
      {data.map((v,i) => (
        <div key={i} style={{ flex:1, height:`${(v/max)*100}%`, minHeight:2, borderRadius:'2px 2px 0 0', background:`linear-gradient(180deg,${color}cc,${color}44)` }}/>
      ))}
    </div>
  )
}

// ── Gauge ─────────────────────────────────────────
function Gauge({ value, max, color, size=72, label }: { value:number; max:number; color:string; size?:number; label?:string }) {
  const r = (size-8)/2, c = 2*Math.PI*r
  const pct = Math.min(value/max, 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="7"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-pct)}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:size>60?16:13, color, lineHeight:1 }}>{value}</span>
        </div>
      </div>
      {label && <p style={{ fontSize:10, color:'var(--text-dim)', marginTop:4, textAlign:'center' }}>{label}</p>}
    </div>
  )
}

// ════════════════════════════════════════════════
// TAB : TRAINING
// ════════════════════════════════════════════════
function TrainingTab() {
  const [period, setPeriod] = useState<Period>('1S')
  const [zoneSport, setZoneSport] = useState<SportZone>('run')
  const d = TRAINING_DATA[period]

  const sportTotal = Object.values(d.sports).reduce((s,v)=>s+v,0)
  const sportSlices = [
    { pct: d.sports.run/sportTotal*100,   color:'#22c55e', label:'Run'   },
    { pct: d.sports.bike/sportTotal*100,  color:'#3b82f6', label:'Vélo'  },
    { pct: d.sports.swim/sportTotal*100,  color:'#38bdf8', label:'Swim'  },
    { pct: d.sports.hyrox/sportTotal*100, color:'#ef4444', label:'Hyrox' },
    { pct: d.sports.gym/sportTotal*100,   color:'#f97316', label:'Gym'   },
  ].filter(s=>s.pct>0)

  const sessionTypes = ['Récup','EF','SL1','Sweet Spot','SL2','VMA','Mixte']
  const typeColors   = ['#9ca3af','#22c55e','#38bdf8','#eab308','#f97316','#ef4444','#a78bfa']

  const maxLoad = Math.max(...LOAD_WEEKS.map(w=>w.ctl), ...LOAD_WEEKS.map(w=>w.atl))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs + période */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Vue d'ensemble</h2>
          <PeriodSelector value={period} onChange={setPeriod}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-4">
          <StatBox label="Volume total"   value={formatH(d.volumeH)} color="#00c8e0"/>
          <StatBox label="Séances"        value={d.sessions}          color="#ffb340"/>
          <StatBox label="TSS total"      value={d.tss}               color="#5b6fff"/>
          <StatBox label="RPE moyen"      value={d.rpe.toFixed(1)}    color="#f97316" unit="/10"/>
        </div>
      </div>

      {/* Répartition sports */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 14px' }}>Répartition par sport</h2>
        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' as const }}>
          <DonutChart slices={sportSlices} size={88} stroke={11}/>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { key:'run',   label:'Running',   color:'#22c55e', v:d.sports.run   },
              { key:'bike',  label:'Cyclisme',  color:'#3b82f6', v:d.sports.bike  },
              { key:'swim',  label:'Natation',  color:'#38bdf8', v:d.sports.swim  },
              { key:'hyrox', label:'Hyrox',     color:'#ef4444', v:d.sports.hyrox },
              { key:'gym',   label:'Musculation',color:'#f97316',v:d.sports.gym   },
            ].filter(s=>s.v>0).map(s => {
              const pct = Math.round(s.v/sportTotal*100)
              return (
                <div key={s.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0, display:'inline-block' }}/>
                  <span style={{ flex:1, fontSize:12, color:'var(--text-mid)' }}>{s.label}</span>
                  <div style={{ flex:2, height:5, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:s.color, opacity:0.8, borderRadius:999 }}/>
                  </div>
                  <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:s.color, width:32, textAlign:'right' as const }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Zones intensité */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Zones d'intensité</h2>
          <PeriodSelector value={period} onChange={setPeriod}/>
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {(['run','bike'] as SportZone[]).map(s => (
            <button key={s} onClick={()=>setZoneSport(s)}
              style={{ padding:'5px 14px', borderRadius:8, border:'1px solid',
                borderColor: zoneSport===s ? (s==='run'?'#22c55e':'#3b82f6') : 'var(--border)',
                background:  zoneSport===s ? (s==='run'?'rgba(34,197,94,0.10)':'rgba(59,130,246,0.10)') : 'var(--bg-card2)',
                color:       zoneSport===s ? (s==='run'?'#22c55e':'#3b82f6') : 'var(--text-dim)',
                fontSize:12, cursor:'pointer', fontWeight: zoneSport===s ? 600 : 400 }}>
              {s==='run'?'🏃 Running':'🚴 Cyclisme'}
            </button>
          ))}
        </div>
        <ZoneBar data={d.zones[zoneSport]} sport={zoneSport==='run'?'Running':'Cyclisme'}/>
      </div>

      {/* Types de séances */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Types de séances</h2>
          <PeriodSelector value={period} onChange={setPeriod}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' as const }}>
          <DonutChart slices={d.types.map((pct,i)=>({pct,color:typeColors[i]}))} size={80} stroke={10}/>
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 12px' }}>
            {sessionTypes.map((t,i) => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:2, background:typeColors[i], display:'inline-block', flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'var(--text-mid)', flex:1 }}>{t}</span>
                <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:typeColors[i], fontWeight:600 }}>{d.types[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charge CTL/ATL/TSB */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Charge training — CTL / ATL / TSB</h2>
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:10, flexWrap:'wrap' as const }}>
          <StatBox label="CTL actuel" value={84} color="#00c8e0"/>
          <StatBox label="ATL actuel" value={91} color="#ff5f5f"/>
          <StatBox label="TSB actuel" value={-7} color="#5b6fff"/>
        </div>
        {/* Graphique barres empilées */}
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:300, display:'flex', gap:8, alignItems:'flex-end', height:80 }}>
            {LOAD_WEEKS.map((w,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'stretch', gap:1 }}>
                  <div style={{ height:`${(w.ctl/maxLoad)*60}px`, background:'rgba(0,200,224,0.70)', borderRadius:'3px 3px 0 0' }}/>
                  <div style={{ height:`${(w.atl/maxLoad)*60}px`, background:'rgba(255,95,95,0.55)', borderRadius:'3px 3px 0 0' }}/>
                </div>
                <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{w.w}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:12, marginTop:8 }}>
          {[{c:'#00c8e0',l:'CTL — Forme'},{c:'#ff5f5f',l:'ATL — Fatigue'},{c:'#5b6fff',l:'TSB — Balance'}].map(x=>(
            <span key={x.l} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:x.c }}>
              <span style={{ width:8, height:8, borderRadius:2, background:x.c, display:'inline-block' }}/>{x.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// TAB : RECOVERY
// ════════════════════════════════════════════════
function RecoveryTab() {
  const [hrvPeriod, setHrvPeriod] = useState<'7j'|'30j'>('7j')
  const hrv7   = HRV_DATA.slice(-7)
  const hrv30  = HRV_DATA.slice(-30)
  const hrvData = hrvPeriod==='7j' ? hrv7 : hrv30
  const avgHrv = Math.round(hrvData.reduce((s,v)=>s+v,0)/hrvData.length)
  const readiness = 75
  const readinessColor = readiness>=70?'#00c8e0':readiness>=50?'#ffb340':'#ef4444'
  const readinessLabel = readiness>=70?'Bonne forme':readiness>=50?'Fatigue modérée':'Fatigue élevée'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Statut global */}
      <div style={{ background:'var(--bg-card)', border:`1px solid ${readinessColor}33`, borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' as const }}>
          <Gauge value={readiness} max={100} color={readinessColor} size={80} label="Readiness"/>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:readinessColor, margin:0 }}>{readinessLabel}</p>
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:'4px 0 12px' }}>Aujourd'hui · Score global sur 100</p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const }}>
              <StatBox label="HRV"       value={`${avgHrv}ms`} color="#00c8e0"/>
              <StatBox label="FC repos"  value="44bpm"          color="#22c55e"/>
              <StatBox label="Sommeil"   value="7h20"           color="#5b6fff"/>
              <StatBox label="Fatigue"   value="3/10"           color="#ffb340"/>
            </div>
          </div>
        </div>
      </div>

      {/* HRV courbe */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap' as const, gap:8 }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>HRV (VFC)</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>
              Moy. : <span style={{ color:'#00c8e0', fontWeight:600, fontFamily:'DM Mono,monospace' }}>{avgHrv}ms</span>
              {' · '}Tendance : <span style={{ color:'#22c55e' }}>↑ Positive</span>
            </p>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {(['7j','30j'] as const).map(p => (
              <button key={p} onClick={()=>setHrvPeriod(p)}
                style={{ padding:'4px 10px', borderRadius:7, border:'1px solid',
                  borderColor: hrvPeriod===p ? '#00c8e0' : 'var(--border)',
                  background:  hrvPeriod===p ? 'rgba(0,200,224,0.10)' : 'var(--bg-card2)',
                  color:       hrvPeriod===p ? '#00c8e0' : 'var(--text-dim)',
                  fontSize:11, cursor:'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <LineChart data={hrvData} color="#00c8e0" height={60}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:'var(--text-dim)' }}>
          <span>-{hrvData.length}j</span><span>Aujourd'hui</span>
        </div>
      </div>

      {/* Sommeil */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ marginBottom:12 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Sommeil — 14 derniers jours</h2>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>
            Moy. : <span style={{ color:'#5b6fff', fontWeight:600, fontFamily:'DM Mono,monospace' }}>7h18</span>
            {' · '}Objectif : <span style={{ color:'var(--text-mid)' }}>8h</span>
          </p>
        </div>
        <BarChart data={SLEEP_DATA.slice(-14)} color="#5b6fff" height={56}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'var(--text-dim)' }}>
          <span>-14j</span><span>Aujourd'hui</span>
        </div>
      </div>

      {/* FC repos */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ marginBottom:12 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>FC de repos</h2>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>
            Actuelle : <span style={{ color:'#22c55e', fontWeight:600, fontFamily:'DM Mono,monospace' }}>44bpm</span>
            {' · '}Moy. 30j : <span style={{ color:'var(--text-mid)', fontFamily:'DM Mono,monospace' }}>44.5bpm</span>
          </p>
        </div>
        <LineChart data={RESTHR_DATA} color="#22c55e" height={50}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'var(--text-dim)' }}>
          <span>-30j</span><span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// TAB : NUTRITION
// ════════════════════════════════════════════════
function NutritionTab() {
  const [meals, setMeals] = useState(MEAL_HISTORY)
  const [input, setInput] = useState('')
  const [aiIdx, setAiIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPlan, setShowPlan] = useState(false)

  // Totaux jour
  const totalCal = meals.reduce((s,m)=>s+m.cal, 0)
  const totalP   = meals.reduce((s,m)=>s+m.p, 0)
  const totalG   = meals.reduce((s,m)=>s+m.g, 0)
  const totalL   = meals.reduce((s,m)=>s+m.l, 0)

  const CAL_TARGET = 3100
  const P_TARGET = 185, G_TARGET = 380, L_TARGET = 95

  const CAL_WEEK = [2850,3100,2750,3200,2950,3050,totalCal]

  const macroSlices = [
    { pct: totalP*4/totalCal*100, color:'#3b82f6', label:'Protéines' },
    { pct: totalG*4/totalCal*100, color:'#22c55e', label:'Glucides'  },
    { pct: totalL*9/totalCal*100, color:'#f97316', label:'Lipides'   },
  ]

  function sendMeal() {
    if (!input.trim()) return
    setLoading(true)
    setTimeout(() => {
      const newMeal = {
        time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
        name: input,
        cal: Math.floor(Math.random()*400+200),
        p: Math.floor(Math.random()*30+10),
        g: Math.floor(Math.random()*50+20),
        l: Math.floor(Math.random()*20+5),
        badge: '✅ Analysé',
      }
      setMeals(prev=>[...prev, newMeal])
      setInput('')
      setAiIdx(i=>(i+1)%AI_RESPONSES.length)
      setLoading(false)
    }, 1200)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* KPIs jour */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Aujourd'hui</h2>
          <button onClick={()=>setShowPlan(!showPlan)}
            style={{ padding:'6px 14px', borderRadius:9, background:'linear-gradient(135deg,#ffb340,#f97316)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            📋 {showPlan?'Masquer':'Plan nutritionnel'}
          </button>
        </div>

        {/* Calories gauge + macros */}
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' as const, marginBottom:14 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <Gauge value={totalCal} max={CAL_TARGET} color="#ffb340" size={84} label="kcal"/>
            <p style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>/ {CAL_TARGET} obj.</p>
          </div>
          <div style={{ flex:1 }}>
            <DonutChart slices={macroSlices} size={72} stroke={9}/>
          </div>
          <div style={{ flex:2, display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { label:'Protéines', val:totalP, target:P_TARGET, color:'#3b82f6', unit:'g' },
              { label:'Glucides',  val:totalG, target:G_TARGET, color:'#22c55e', unit:'g' },
              { label:'Lipides',   val:totalL, target:L_TARGET, color:'#f97316', unit:'g' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                  <span style={{ color:'var(--text-mid)' }}>{m.label}</span>
                  <span style={{ fontFamily:'DM Mono,monospace', color:m.color }}>{m.val}{m.unit} <span style={{ color:'var(--text-dim)' }}>/ {m.target}{m.unit}</span></span>
                </div>
                <div style={{ height:5, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
                  <div style={{ height:'100%', width:`${Math.min(m.val/m.target*100,100)}%`, background:m.color, opacity:0.8, borderRadius:999 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan nutritionnel */}
        {showPlan && (
          <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(255,179,64,0.07)', border:'1px solid rgba(255,179,64,0.20)', marginBottom:14 }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'#ffb340', margin:'0 0 10px' }}>🎯 Plan nutritionnel — Jour d'entraînement</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
              {[
                { label:'Calories cibles',   value:'3 100 kcal', color:'#ffb340' },
                { label:'Protéines cibles',  value:'185g (2.5/kg)', color:'#3b82f6' },
                { label:'Glucides cibles',   value:'380g (5.1/kg)', color:'#22c55e' },
                { label:'Lipides cibles',    value:'95g (1.3/kg)',  color:'#f97316' },
              ].map(x=>(
                <div key={x.label} style={{ padding:'8px 10px', borderRadius:9, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 3px' }}>{x.label}</p>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600, color:x.color, margin:0 }}>{x.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suivi semaine */}
        <div>
          <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:6 }}>Calories — 7 derniers jours vs objectif ({CAL_TARGET} kcal)</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:48 }}>
            {CAL_WEEK.map((v,i) => {
              const pct = v/CAL_TARGET*100
              const isToday = i === CAL_WEEK.length-1
              const c = pct>=95 ? '#22c55e' : pct>=80 ? '#ffb340' : '#ef4444'
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ width:'100%', height:`${Math.min(pct,110)/110*48}px`, minHeight:3, borderRadius:'3px 3px 0 0', background:isToday?`${c}cc`:`${c}55`, border:isToday?`1px solid ${c}88`:'none' }}/>
                  <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:isToday?c:'var(--text-dim)' }}>
                    {['L','M','M','J','V','S','A'][i]}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ height:1, background:'var(--border)', marginTop:0 }}/>
        </div>
      </div>

      {/* IA Nutrition */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 14px' }}>🤖 Assistant IA Nutrition</h2>

        {/* Repas du jour */}
        {meals.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
            {meals.map((m,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)', flexShrink:0 }}>{m.time}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:500, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{m.name}</p>
                  <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0', fontFamily:'DM Mono,monospace' }}>
                    {m.cal}kcal · {m.p}g P · {m.g}g G · {m.l}g L
                  </p>
                </div>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.15)', color:'#00c8e0', flexShrink:0 }}>{m.badge}</span>
              </div>
            ))}
          </div>
        )}

        {/* Feedback IA */}
        {meals.length > 0 && (
          <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.15)', marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'#00c8e0', margin:'0 0 6px' }}>💡 Analyse IA</p>
            <p style={{ fontSize:12, color:'var(--text-mid)', margin:0, lineHeight:1.6, whiteSpace:'pre-line' as const }}>
              {AI_RESPONSES[aiIdx].replace(/\*\*/g,'')}
            </p>
          </div>
        )}

        {/* Input */}
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:6 }}>Décris ton repas ou colle une liste d'aliments</p>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMeal()} }}
              placeholder="Ex: 3 œufs brouillés, 1 tranche de pain complet, 1 café…"
              rows={2}
              style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Sans,sans-serif', fontSize:13, outline:'none', resize:'none' as const }}/>
          </div>
          <button onClick={sendMeal} disabled={loading || !input.trim()}
            style={{ padding:'10px 16px', borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, opacity: loading||!input.trim() ? 0.5 : 1 }}>
            {loading ? '⏳' : '→ Analyser'}
          </button>
        </div>

        {/* Photo placeholder */}
        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'var(--bg-card2)', border:'1px dashed var(--border-mid)', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <span style={{ fontSize:20 }}>📷</span>
          <div>
            <p style={{ fontSize:12, fontWeight:500, margin:0 }}>Photo du repas</p>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>Prends une photo — l'IA identifie les aliments automatiquement</p>
          </div>
          <span style={{ marginLeft:'auto', fontSize:10, padding:'3px 8px', borderRadius:6, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-dim)' }}>Bientôt</span>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════
export default function DataPage() {
  const [tab, setTab] = useState<MainTab>('training')

  const TABS: { id:MainTab; emoji:string; label:string; color:string; bg:string }[] = [
    { id:'training',  emoji:'🔵', label:'Training',   color:'#3b82f6', bg:'rgba(59,130,246,0.10)' },
    { id:'recovery',  emoji:'🟢', label:'Recovery',   color:'#22c55e', bg:'rgba(34,197,94,0.10)'  },
    { id:'nutrition', emoji:'🟡', label:'Nutrition',  color:'#ffb340', bg:'rgba(255,179,64,0.10)' },
  ]

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>
          Données & Analyse
        </h1>
        <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>
          Training · Recovery · Nutrition — Vue complète
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' as const }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, minWidth:100, padding:'11px 16px', borderRadius:12, border:'1px solid',
              borderColor: tab===t.id ? t.color : 'var(--border)',
              background:  tab===t.id ? t.bg    : 'var(--bg-card)',
              color:       tab===t.id ? t.color : 'var(--text-mid)',
              fontFamily:'Syne,sans-serif', fontSize:13, fontWeight: tab===t.id ? 700 : 400,
              cursor:'pointer', boxShadow: tab===t.id ? `0 0 0 1px ${t.color}33` : 'var(--shadow-card)',
              transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'training'  && <TrainingTab/>}
      {tab === 'recovery'  && <RecoveryTab/>}
      {tab === 'nutrition' && <NutritionTab/>}

    </div>
  )
}
