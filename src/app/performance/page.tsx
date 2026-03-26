'use client'

import { useState } from 'react'

type PerfTab = 'profil' | 'zones' | 'records' | 'progression'
type RecordSport = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox' | 'gym'
type ZoneTab = 'power' | 'pace' | 'hr'

const Z_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']

const INIT_PROFILE = {
  ftp:301, weight:75, age:31, lthr:172, hrMax:192, hrRest:44,
  thresholdPace:'4:08', vma:18.5, css:'1:28', vo2max:62,
}

function calcBikeZones(ftp: number) {
  return [
    {z:'Z1',label:'Récupération active',minW:0,                        maxW:Math.round(ftp*0.55)},
    {z:'Z2',label:'Endurance',          minW:Math.round(ftp*0.56),     maxW:Math.round(ftp*0.75)},
    {z:'Z3',label:'Tempo',              minW:Math.round(ftp*0.76),     maxW:Math.round(ftp*0.87)},
    {z:'Z4',label:'Seuil',              minW:Math.round(ftp*0.88),     maxW:Math.round(ftp*1.05)},
    {z:'Z5',label:'VO2max',             minW:Math.round(ftp*1.06),     maxW:Math.round(ftp*1.20)},
  ]
}

function parsePaceSec(pace: string): number {
  const p = pace.split(':')
  return parseInt(p[0]) * 60 + (parseInt(p[1]) || 0)
}

function secToPace(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function calcRunZones(tSec: number) {
  return [
    {z:'Z1',label:'Récup',   range:`> ${secToPace(Math.round(tSec * 1.25))}/km`},
    {z:'Z2',label:'Aérobie', range:`${secToPace(Math.round(tSec * 1.11))} – ${secToPace(Math.round(tSec * 1.25))}/km`},
    {z:'Z3',label:'Tempo',   range:`${secToPace(Math.round(tSec * 1.01))} – ${secToPace(Math.round(tSec * 1.10))}/km`},
    {z:'Z4',label:'Seuil',   range:`${secToPace(Math.round(tSec * 0.91))} – ${secToPace(Math.round(tSec * 1.00))}/km`},
    {z:'Z5',label:'VO2max',  range:`< ${secToPace(Math.round(tSec * 0.90))}/km`},
  ]
}

function calcSwimZones(cssSec: number) {
  return [
    {z:'Z1',label:'Récup',   range:`> ${secToPace(Math.round(cssSec * 1.35))}/100m`},
    {z:'Z2',label:'Aérobie', range:`${secToPace(Math.round(cssSec * 1.16))} – ${secToPace(Math.round(cssSec * 1.34))}/100m`},
    {z:'Z3',label:'Tempo',   range:`${secToPace(Math.round(cssSec * 1.06))} – ${secToPace(Math.round(cssSec * 1.15))}/100m`},
    {z:'Z4',label:'Seuil',   range:`${secToPace(Math.round(cssSec * 0.98))} – ${secToPace(Math.round(cssSec * 1.05))}/100m`},
    {z:'Z5',label:'VO2max',  range:`< ${secToPace(Math.round(cssSec * 0.97))}/100m`},
  ]
}

function calcHRZones(hrMax: number, hrRest: number) {
  const r = hrMax - hrRest
  return [
    {z:'Z1',label:'Récup',   min:hrRest,                           max:Math.round(hrRest + r * 0.60)},
    {z:'Z2',label:'Aérobie', min:Math.round(hrRest + r * 0.60)+1, max:Math.round(hrRest + r * 0.70)},
    {z:'Z3',label:'Tempo',   min:Math.round(hrRest + r * 0.70)+1, max:Math.round(hrRest + r * 0.80)},
    {z:'Z4',label:'Seuil',   min:Math.round(hrRest + r * 0.80)+1, max:Math.round(hrRest + r * 0.90)},
    {z:'Z5',label:'VO2max',  min:Math.round(hrRest + r * 0.90)+1, max:hrMax},
  ]
}

function calcPaceStr(distKm: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0)
  if (!s) return '—'
  const sPerKm = s / distKm
  return `${Math.floor(sPerKm/60)}:${String(Math.round(sPerKm%60)).padStart(2,'0')}/km`
}

function calcSplit500(distM: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0)
  if (!s) return '—'
  const sp = (s / distM) * 500
  return `${Math.floor(sp/60)}:${String(Math.round(sp%60)).padStart(2,'0')}/500m`
}

function parseTimeSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0)
}

// ── Data ──────────────────────────────────────────
const BIKE_DURS = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','20min','30min','1h','2h','3h','4h','5h','6h']
const BIKE_REC: Record<string,{w:number;date:string}[]> = {
  'Pmax': [{w:1240,date:'2024-08-12'},{w:1180,date:'2023-06-20'}],
  '10s':  [{w:980, date:'2024-09-01'},{w:920, date:'2023-07-15'}],
  '30s':  [{w:740, date:'2024-07-22'},{w:710, date:'2023-05-10'}],
  '1min': [{w:560, date:'2024-06-14'},{w:530, date:'2023-08-03'}],
  '3min': [{w:430, date:'2024-05-28'},{w:410, date:'2023-09-18'}],
  '5min': [{w:390, date:'2024-04-10'},{w:375, date:'2023-04-22'}],
  '8min': [{w:360, date:'2024-03-15'},{w:348, date:'2023-03-30'}],
  '10min':[{w:345, date:'2024-02-28'},{w:332, date:'2023-02-14'}],
  '12min':[{w:335, date:'2024-01-20'},{w:320, date:'2023-01-08'}],
  '20min':[{w:320, date:'2024-10-05'},{w:308, date:'2023-10-12'}],
  '30min':[{w:310, date:'2024-11-02'},{w:298, date:'2023-11-20'}],
  '1h':   [{w:301, date:'2024-12-01'},{w:285, date:'2023-12-10'}],
  '2h':   [{w:275, date:'2024-08-30'},{w:262, date:'2023-08-25'}],
  '3h':   [{w:255, date:'2024-07-14'},{w:242, date:'2023-07-20'}],
  '4h':   [{w:238, date:'2024-06-22'},{w:225, date:'2023-06-18'}],
  '5h':   [{w:222, date:'2024-05-18'},{w:210, date:'2023-05-30'}],
  '6h':   [{w:208, date:'2024-04-28'},{w:196, date:'2023-04-15'}],
}

const RUN_DISTS = ['1500m','5km','10km','Semi','Marathon','50km','100km']
const RUN_KM: Record<string,number> = {'1500m':1.5,'5km':5,'10km':10,'Semi':21.1,'Marathon':42.195,'50km':50,'100km':100}
const RUN_REC: Record<string,{time:string;date:string}[]> = {
  '1500m':   [{time:'4:22',   date:'2024-06-08'},{time:'4:35',   date:'2023-07-14'}],
  '5km':     [{time:'17:45', date:'2024-04-21'},{time:'18:12', date:'2023-05-10'}],
  '10km':    [{time:'37:20', date:'2024-05-12'},{time:'38:45', date:'2023-06-18'}],
  'Semi':    [{time:'1:24:30',date:'2024-04-06'},{time:'1:27:15',date:'2023-04-09'}],
  'Marathon':[{time:'3:05:00',date:'2024-10-20'},{time:'3:12:30',date:'2023-10-15'}],
  '50km':    [{time:'4:45:00',date:'2024-07-06'},{time:'—',      date:'—'}],
  '100km':   [{time:'—',      date:'—'},         {time:'—',      date:'—'}],
}

const SWIM_DISTS = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const SWIM_M: Record<string,number> = {'100m':100,'200m':200,'400m':400,'1000m':1000,'1500m':1500,'2000m':2000,'5000m':5000,'10000m':10000}
const SWIM_REC: Record<string,{time:string;date:string}[]> = {
  '100m':  [{time:'1:10', date:'2024-03-15'},{time:'1:14', date:'2023-04-20'}],
  '200m':  [{time:'2:28', date:'2024-04-10'},{time:'2:35', date:'2023-05-12'}],
  '400m':  [{time:'5:10', date:'2024-02-28'},{time:'5:22', date:'2023-03-18'}],
  '1000m': [{time:'13:20',date:'2024-05-20'},{time:'13:55',date:'2023-06-10'}],
  '1500m': [{time:'20:30',date:'2024-01-15'},{time:'21:10',date:'2023-02-20'}],
  '2000m': [{time:'27:45',date:'2024-06-05'},{time:'28:40',date:'2023-07-15'}],
  '5000m': [{time:'—',    date:'—'},         {time:'—',    date:'—'}],
  '10000m':[{time:'—',    date:'—'},         {time:'—',    date:'—'}],
}

const ROW_DISTS = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const ROW_M: Record<string,number> = {'500m':500,'1000m':1000,'2000m':2000,'5000m':5000,'10000m':10000,'Semi':21097,'Marathon':42195}
const ROW_REC: Record<string,{time:string;date:string}[]> = {
  '500m':   [{time:'1:32', date:'2024-02-10'},{time:'1:36', date:'2023-03-05'}],
  '1000m':  [{time:'3:18', date:'2024-03-20'},{time:'3:25', date:'2023-04-15'}],
  '2000m':  [{time:'6:52', date:'2024-01-28'},{time:'7:08', date:'2023-02-12'}],
  '5000m':  [{time:'18:30',date:'2024-04-05'},{time:'19:10',date:'2023-05-20'}],
  '10000m': [{time:'38:45',date:'2024-05-10'},{time:'40:20',date:'2023-06-08'}],
  'Semi':   [{time:'—',    date:'—'},         {time:'—',    date:'—'}],
  'Marathon':[{time:'—',   date:'—'},         {time:'—',    date:'—'}],
}

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmers Carry','Sandbag Lunges','Wall Balls']
const HYROX_REC = {
  format:'Solo Open Homme', date:'2024-05-10', total:'1:02:45', roxzone:'8:30', penalties:'0',
  stations:{'SkiErg':'3:42','Sled Push':'3:15','Sled Pull':'2:55','Burpee Broad Jump':'5:10','Rowing':'3:28','Farmers Carry':'2:40','Sandbag Lunges':'5:55','Wall Balls':'4:50'},
  runs:['4:12','4:08','4:15','4:22','4:18','4:30','4:35','4:28'],
}

const GYM_MOVES = [
  {name:'Bench Press',    recs:[{l:'1RM',v:120},{l:'3RM',v:110},{l:'5RM',v:102},{l:'10RM',v:90},{l:'Max reps PDC',v:32}]},
  {name:'Squat',          recs:[{l:'1RM',v:150},{l:'3RM',v:138},{l:'5RM',v:128},{l:'10RM',v:112},{l:'Max reps PDC',v:0}]},
  {name:'Deadlift',       recs:[{l:'1RM',v:185},{l:'3RM',v:172},{l:'5RM',v:160},{l:'10RM',v:140},{l:'Max reps PDC',v:0}]},
  {name:'Tractions',      recs:[{l:'Max reps PDC',v:18},{l:'1RM+charge',v:40}]},
  {name:'Dips',           recs:[{l:'Max reps PDC',v:30},{l:'1RM+charge',v:50}]},
  {name:'Dev. militaire', recs:[{l:'Max charge',v:80}]},
  {name:'Pompes',         recs:[{l:'Max reps',v:65}]},
]

const PROG = {
  ftp:     [265,285,301],
  run5k:   ['19:45','18:12','17:45'],
  swim100: ['1:22','1:16','1:10'],
  row2k:   ['7:35','7:08','6:52'],
}

// ── UI atoms ──────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)', ...style }}>
      {children}
    </div>
  )
}

function StatBox({ label, value, unit, sub, color }: { label:string; value:string|number; unit?:string; sub?:string; color?:string }) {
  return (
    <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, padding:'11px 13px' }}>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:color||'var(--text)', margin:0, lineHeight:1 }}>
        {value}{unit && <span style={{ fontSize:11, fontWeight:400, color:'var(--text-dim)', marginLeft:3 }}>{unit}</span>}
      </p>
      {sub && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'3px 0 0' }}>{sub}</p>}
    </div>
  )
}

function ZBars({ zones }: { zones: { z:string; label:string; range:string }[] }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {zones.map((z, i) => (
        <div key={z.z} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:26, height:26, borderRadius:6, background:`${Z_COLORS[i]}22`, border:`1px solid ${Z_COLORS[i]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:Z_COLORS[i], flexShrink:0 }}>{z.z}</span>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:11, color:'var(--text-mid)' }}>{z.label}</span>
              <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:Z_COLORS[i], fontWeight:600 }}>{z.range}</span>
            </div>
            <div style={{ height:5, borderRadius:999, background:`${Z_COLORS[i]}22` }}>
              <div style={{ height:'100%', width:`${20+i*16}%`, background:Z_COLORS[i], opacity:0.7, borderRadius:999 }}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NInput({ label, value, onChange, unit, step }: { label:string; value:number; onChange:(v:number)=>void; unit?:string; step?:number }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{label}{unit && <span style={{ fontWeight:400, marginLeft:3, textTransform:'none' as const }}>({unit})</span>}</p>
      <input type="number" value={value} step={step||1} onChange={e => onChange(parseFloat(e.target.value)||0)}
        style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
    </div>
  )
}

function TInput({ label, value, onChange, placeholder }: { label:string; value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{label}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
    </div>
  )
}

function PowerCurve({ d24, d23 }: { d24:number[]; d23:number[] }) {
  const maxW = Math.max(...d24, ...d23) * 1.05
  const W = 400, H = 110
  function pts(arr: number[]) {
    return arr.map((v, i) => `${(i/(arr.length-1))*W},${H-((v/maxW)*H)}`).join(' ')
  }
  const p24 = pts(d24), p23 = pts(d23)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H+4, overflow:'visible' }}>
      <defs>
        <linearGradient id="g24" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c8e0" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#00c8e0" stopOpacity="0.02"/>
        </linearGradient>
        <linearGradient id="g23" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b6fff" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#5b6fff" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {[25,50,75].map(p => <line key={p} x1={0} y1={H-(p/100)*H} x2={W} y2={H-(p/100)*H} stroke="var(--border)" strokeWidth="0.5"/>)}
      <polygon points={`0,${H} ${p23} ${W},${H}`} fill="url(#g23)"/>
      <polyline points={p23} fill="none" stroke="#5b6fff" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"/>
      <polygon points={`0,${H} ${p24} ${W},${H}`} fill="url(#g24)"/>
      <polyline points={p24} fill="none" stroke="#00c8e0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function LineChart({ series, labels }: { series:{label:string;color:string;data:number[]}[]; labels:string[] }) {
  const all = series.flatMap(s => s.data)
  const min = Math.min(...all) * 0.95, max = Math.max(...all) * 1.05
  const W = 300, H = 80
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, overflow:'visible' }}>
        {series.map(s => {
          const p = s.data.map((v,i) => `${(i/(s.data.length-1))*W},${H-((v-min)/(max-min))*H}`).join(' ')
          return (
            <g key={s.label}>
              <polyline points={p} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              {s.data.map((v,i) => <circle key={i} cx={(i/(s.data.length-1))*W} cy={H-((v-min)/(max-min))*H} r="3" fill={s.color}/>)}
            </g>
          )
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        {labels.map(l => <span key={l} style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{l}</span>)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PROFIL TAB
// ════════════════════════════════════════════════
function ProfilTab() {
  const [profile, setProfile] = useState({ ...INIT_PROFILE })
  const [editing, setEditing] = useState(false)
  const wkg = (profile.ftp / profile.weight).toFixed(2)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap' as const, gap:8 }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Profil athlète</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>Paramètres physiologiques</p>
          </div>
          <button onClick={() => setEditing(!editing)}
            style={{ padding:'6px 14px', borderRadius:9, background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)', border:`1px solid ${editing?'transparent':'var(--border)'}`, color:editing?'#fff':'var(--text-mid)', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            {editing ? '✓ Sauvegarder' : '✏️ Modifier'}
          </button>
        </div>
        {editing ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-3">
            <NInput label="FTP" unit="W" value={profile.ftp} onChange={v => setProfile({...profile,ftp:v})}/>
            <NInput label="Poids" unit="kg" value={profile.weight} onChange={v => setProfile({...profile,weight:v})} step={0.5}/>
            <NInput label="Age" value={profile.age} onChange={v => setProfile({...profile,age:v})}/>
            <NInput label="FC max" unit="bpm" value={profile.hrMax} onChange={v => setProfile({...profile,hrMax:v})}/>
            <NInput label="FC repos" unit="bpm" value={profile.hrRest} onChange={v => setProfile({...profile,hrRest:v})}/>
            <NInput label="LTHR" unit="bpm" value={profile.lthr} onChange={v => setProfile({...profile,lthr:v})}/>
            <NInput label="VMA" unit="km/h" value={profile.vma} onChange={v => setProfile({...profile,vma:v})} step={0.5}/>
            <NInput label="VO2max estime" value={profile.vo2max} onChange={v => setProfile({...profile,vo2max:v})}/>
            <TInput label="Allure seuil" value={profile.thresholdPace} onChange={v => setProfile({...profile,thresholdPace:v})} placeholder="4:08"/>
            <TInput label="CSS natation" value={profile.css} onChange={v => setProfile({...profile,css:v})} placeholder="1:28"/>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-4">
            <StatBox label="FTP" value={profile.ftp} unit="W" sub={`${wkg} W/kg`} color="#00c8e0"/>
            <StatBox label="Allure seuil" value={profile.thresholdPace} unit="/km" color="#22c55e"/>
            <StatBox label="VMA" value={profile.vma} unit="km/h" color="#22c55e"/>
            <StatBox label="CSS natation" value={profile.css} unit="/100m" color="#38bdf8"/>
            <StatBox label="FC max" value={profile.hrMax} unit="bpm" color="#ef4444"/>
            <StatBox label="FC repos" value={profile.hrRest} unit="bpm" color="#22c55e"/>
            <StatBox label="LTHR" value={profile.lthr} unit="bpm" color="#f97316"/>
            <StatBox label="VO2max estime" value={profile.vo2max} unit="ml/kg/min" color="#a855f7"/>
          </div>
        )}
      </Card>

      <Card>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 14px' }}>Niveau estimé</h2>
        {[
          { label:'Puissance relative (W/kg)', val:parseFloat(wkg), max:6, unit:'W/kg', color:'#00c8e0', desc:parseFloat(wkg)>=4.5?'Expert':parseFloat(wkg)>=3.5?'Avance':parseFloat(wkg)>=2.5?'Intermediaire':'Debutant' },
          { label:'VO2max estimé', val:profile.vo2max, max:80, unit:'ml/kg/min', color:'#a855f7', desc:profile.vo2max>=65?'Elite':profile.vo2max>=55?'Eleve':profile.vo2max>=40?'Moyen':'Faible' },
          { label:'FC repos', val:100-profile.hrRest, max:70, unit:'', color:'#22c55e', desc:profile.hrRest<=40?'Elite':profile.hrRest<=50?'Eleve':profile.hrRest<=60?'Moyen':'Faible', display:profile.hrRest+'bpm' },
        ].map(item => (
          <div key={item.label} style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, color:'var(--text-mid)' }}>{item.label}</span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:`${item.color}22`, color:item.color, fontWeight:600 }}>{item.desc}</span>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:item.color }}>{item.display || item.val+' '+item.unit}</span>
              </div>
            </div>
            <div style={{ height:7, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
              <div style={{ height:'100%', width:`${Math.min(Math.abs(item.val)/item.max*100,100)}%`, background:`linear-gradient(90deg,${item.color}88,${item.color})`, borderRadius:999 }}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// ZONES TAB
// ════════════════════════════════════════════════
function ZonesTab() {
  const [profile, setProfile] = useState({ ...INIT_PROFILE })
  const [zoneTab, setZoneTab] = useState<ZoneTab>('power')
  const [editing, setEditing] = useState(false)

  const bikeZones = calcBikeZones(profile.ftp)
  const runZones  = calcRunZones(parsePaceSec(profile.thresholdPace))
  const swimZones = calcSwimZones(parsePaceSec(profile.css))
  const hrZones   = calcHRZones(profile.hrMax, profile.hrRest)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Zones d'entrainement</h2>
          <button onClick={() => setEditing(!editing)}
            style={{ padding:'5px 12px', borderRadius:8, background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)', border:`1px solid ${editing?'transparent':'var(--border)'}`, color:editing?'#fff':'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:600 }}>
            {editing ? '✓ Appliquer' : '✏️ Modifier seuils'}
          </button>
        </div>
        {editing && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14, padding:'12px 14px', borderRadius:11, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.15)' }} className="md:grid-cols-4">
            <NInput label="FTP" unit="W" value={profile.ftp} onChange={v => setProfile({...profile,ftp:v})}/>
            <TInput label="Allure seuil" value={profile.thresholdPace} onChange={v => setProfile({...profile,thresholdPace:v})} placeholder="4:08"/>
            <TInput label="CSS" value={profile.css} onChange={v => setProfile({...profile,css:v})} placeholder="1:28"/>
            <NInput label="FC max" unit="bpm" value={profile.hrMax} onChange={v => setProfile({...profile,hrMax:v})}/>
            <NInput label="FC repos" unit="bpm" value={profile.hrRest} onChange={v => setProfile({...profile,hrRest:v})}/>
          </div>
        )}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
          {([['power','Puissance'],['pace','Allures'],['hr','Freq. cardiaque']] as [ZoneTab,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setZoneTab(t)}
              style={{ padding:'6px 13px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:zoneTab===t?'#00c8e0':'var(--border)', background:zoneTab===t?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:zoneTab===t?'#00c8e0':'var(--text-mid)', fontSize:12, fontWeight:zoneTab===t?600:400 }}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      {zoneTab === 'power' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>Velo — FTP {profile.ftp}W</h3>
              <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#00c8e0' }}>{(profile.ftp/profile.weight).toFixed(2)} W/kg</span>
            </div>
            <ZBars zones={bikeZones.map(z => ({ z:z.z, label:z.label, range:`${z.minW}–${z.maxW}W` }))}/>
          </Card>
          <Card>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Aviron /500m</h3>
            <ZBars zones={[
              {z:'Z1',label:'Recup',   range:'> 2:15/500m'},
              {z:'Z2',label:'Aerobie', range:'2:00 - 2:14/500m'},
              {z:'Z3',label:'Tempo',   range:'1:52 - 1:59/500m'},
              {z:'Z4',label:'Seuil',   range:'1:44 - 1:51/500m'},
              {z:'Z5',label:'VO2max',  range:'< 1:43/500m'},
            ]}/>
          </Card>
        </div>
      )}

      {zoneTab === 'pace' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
          <Card>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Course — seuil {profile.thresholdPace}/km</h3>
            <ZBars zones={runZones}/>
          </Card>
          <Card>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 14px' }}>Natation — CSS {profile.css}/100m</h3>
            <ZBars zones={swimZones}/>
          </Card>
        </div>
      )}

      {zoneTab === 'hr' && (
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>Frequence cardiaque</h3>
            <div style={{ display:'flex', gap:12, fontSize:11 }}>
              <span style={{ color:'var(--text-dim)' }}>Repos : <strong style={{ color:'#22c55e', fontFamily:'DM Mono,monospace' }}>{profile.hrRest}bpm</strong></span>
              <span style={{ color:'var(--text-dim)' }}>LTHR : <strong style={{ color:'#f97316', fontFamily:'DM Mono,monospace' }}>{profile.lthr}bpm</strong></span>
              <span style={{ color:'var(--text-dim)' }}>Max : <strong style={{ color:'#ef4444', fontFamily:'DM Mono,monospace' }}>{profile.hrMax}bpm</strong></span>
            </div>
          </div>
          <ZBars zones={hrZones.map(z => ({ z:z.z, label:z.label, range:`${z.min} - ${z.max} bpm` }))}/>
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', height:14, borderRadius:7, overflow:'hidden' }}>
              {hrZones.map((z, i) => <div key={z.z} style={{ flex:z.max-z.min, background:Z_COLORS[i], opacity:0.8 }}/>)}
            </div>
            <div style={{ display:'flex', marginTop:3 }}>
              {hrZones.map((z, i) => (
                <div key={z.z} style={{ flex:z.max-z.min, textAlign:'center' as const }}>
                  <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:Z_COLORS[i] }}>{z.min}</span>
                </div>
              ))}
              <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:Z_COLORS[4] }}>{profile.hrMax}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// RECORDS TAB
// ════════════════════════════════════════════════
function RecordsTab() {
  const [sport, setSport] = useState<RecordSport>('bike')
  const [simMode, setSimMode] = useState(false)
  const [simDeltas, setSimDeltas] = useState<Record<string,number>>({})

  const curve24 = BIKE_DURS.map(d => BIKE_REC[d]?.[0]?.w || 0)
  const curve23 = BIKE_DURS.map(d => BIKE_REC[d]?.[1]?.w || 0)

  function hyroxSimTotal(): string {
    let total = 0
    HYROX_STATIONS.forEach(s => { total += parseTimeSec((HYROX_REC.stations as Record<string,string>)[s] || '0:00') - (simDeltas[s] || 0) })
    HYROX_REC.runs.forEach((r, i) => { total += parseTimeSec(r) - (simDeltas['run'+i] || 0) })
    total += parseTimeSec(HYROX_REC.roxzone)
    const m = Math.floor(total/60), s = total%60
    return `${m}:${String(s).padStart(2,'0')}`
  }

  function RecordRow({ label, rec24, rec23, sub24, pr }: { label:string; rec24:string; rec23:string; sub24?:string; pr?:boolean }) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', marginBottom:5 }}>
        <span style={{ fontSize:11, fontWeight:500, color:'var(--text-mid)', minWidth:72, flexShrink:0 }}>{label}</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'#00c8e0' }}>{rec24}</span>
            {pr && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'rgba(0,200,224,0.15)', color:'#00c8e0', fontWeight:700 }}>PR</span>}
            {sub24 && <span style={{ fontSize:10, color:'var(--text-dim)' }}>{sub24}</span>}
          </div>
          {rec23 && rec23 !== '—' && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>2023 : {rec23}</span>}
        </div>
      </div>
    )
  }

  const SPORT_TABS: [RecordSport,string,string][] = [
    ['bike','Velo','#3b82f6'],['run','Course','#22c55e'],['swim','Natation','#38bdf8'],
    ['rowing','Aviron','#14b8a6'],['hyrox','Hyrox','#ef4444'],['gym','Muscu','#f97316'],
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
        {SPORT_TABS.map(([s,l,c]) => (
          <button key={s} onClick={() => setSport(s)}
            style={{ padding:'7px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:sport===s?c:'var(--border)', background:sport===s?`${c}22`:'var(--bg-card)', color:sport===s?c:'var(--text-mid)', fontSize:12, fontWeight:sport===s?600:400 }}>
            {l}
          </button>
        ))}
      </div>

      {sport === 'bike' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Power Curve</h2>
              <div style={{ display:'flex', gap:12 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#00c8e0' }}><span style={{ width:12, height:2, background:'#00c8e0', display:'inline-block' }}/>2024</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#5b6fff' }}><span style={{ width:12, height:2, background:'#5b6fff', display:'inline-block', opacity:0.7 }}/>2023</span>
              </div>
            </div>
            <PowerCurve d24={curve24} d23={curve23}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
              {['Pmax','1min','5min','20min','1h'].map(l => <span key={l} style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{l}</span>)}
            </div>
          </Card>
          <Card>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records de puissance</h2>
            {BIKE_DURS.map(d => {
              const r24 = BIKE_REC[d]?.[0], r23 = BIKE_REC[d]?.[1]
              if (!r24) return null
              const pr = r24 && r23 && r24.w > r23.w
              return <RecordRow key={d} label={d} rec24={`${r24.w}W`} rec23={r23?`${r23.w}W`:'—'} sub24={`${(r24.w/INIT_PROFILE.weight).toFixed(2)} W/kg`} pr={pr}/>
            })}
          </Card>
        </div>
      )}

      {sport === 'run' && (
        <Card>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records course a pied</h2>
          {RUN_DISTS.map(d => {
            const r24 = RUN_REC[d]?.[0], r23 = RUN_REC[d]?.[1]
            const pace = calcPaceStr(RUN_KM[d], r24?.time||'')
            return <RecordRow key={d} label={d} rec24={r24?.time||'—'} rec23={r23?.time||'—'} sub24={pace !== '—' ? pace : undefined}/>
          })}
        </Card>
      )}

      {sport === 'swim' && (
        <Card>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records natation</h2>
          {SWIM_DISTS.map(d => {
            const r24 = SWIM_REC[d]?.[0], r23 = SWIM_REC[d]?.[1]
            const split = calcSplit500(SWIM_M[d], r24?.time||'')
            return <RecordRow key={d} label={d} rec24={r24?.time||'—'} rec23={r23?.time||'—'} sub24={split !== '—' ? split.replace('/500m','/100m') : undefined}/>
          })}
        </Card>
      )}

      {sport === 'rowing' && (
        <Card>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Records aviron / rowing</h2>
          {ROW_DISTS.map(d => {
            const r24 = ROW_REC[d]?.[0], r23 = ROW_REC[d]?.[1]
            const split = calcSplit500(ROW_M[d], r24?.time||'')
            const watts = split !== '—' ? (() => { const p=split.split('/')[0].split(':').map(Number); const s=p[0]*60+(p[1]||0); return s>0?`~${Math.round(2.80/(s/500)**3)}W`:'—' })() : '—'
            const lbl = d === 'Semi' ? 'Semi (21km)' : d === 'Marathon' ? 'Marathon (42km)' : d
            return <RecordRow key={d} label={lbl} rec24={r24?.time||'—'} rec23={r23?.time||'—'} sub24={split !== '—' ? `${split} · ${watts}` : undefined}/>
          })}
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'10px 0 0' }}>Puissance estimee via formule Concept2 : P = 2.80 / (split/500)^3</p>
        </Card>
      )}

      {sport === 'hyrox' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap' as const, gap:8 }}>
              <div>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Meilleur resultat Hyrox</h2>
                <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{HYROX_REC.format} · {HYROX_REC.date}</p>
              </div>
              <div style={{ textAlign:'center' as const }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#ef4444', margin:0 }}>{HYROX_REC.total}</p>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:0 }}>Temps total</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <div style={{ padding:'8px 12px', borderRadius:9, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 3px' }}>Roxzone</p>
                <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#ef4444', margin:0 }}>{HYROX_REC.roxzone}</p>
              </div>
              <div style={{ padding:'8px 12px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 3px' }}>Total running</p>
                <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#22c55e', margin:0 }}>
                  {(() => { let s=0; HYROX_REC.runs.forEach(r => { const p=r.split(':').map(Number); s+=p[0]*60+(p[1]||0) }); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` })()}
                </p>
              </div>
            </div>
            <h3 style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', margin:'0 0 8px' }}>Stations</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
              {HYROX_STATIONS.map((s, i) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:8, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.12)' }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#ef4444', width:17, flexShrink:0 }}>{i+1}</span>
                  <span style={{ flex:1, fontSize:11 }}>{s}</span>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, color:'#ef4444' }}>{HYROX_REC.stations[s]}</span>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', margin:'0 0 8px' }}>Runs (8x1km)</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {HYROX_REC.runs.map((r, i) => (
                <div key={i} style={{ padding:'6px 8px', borderRadius:7, background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.15)', textAlign:'center' as const }}>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Run {i+1}</p>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600, color:'#22c55e', margin:0 }}>{r}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Simulation de performance</h2>
                <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>Simuler des gains sur chaque station</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {simMode && (
                  <div style={{ padding:'8px 14px', borderRadius:9, background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)' }}>
                    <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 2px' }}>Temps simule</p>
                    <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#ef4444', margin:0 }}>{hyroxSimTotal()}</p>
                  </div>
                )}
                <button onClick={() => setSimMode(!simMode)}
                  style={{ padding:'6px 12px', borderRadius:9, background:simMode?'linear-gradient(135deg,#ef4444,#f97316)':'var(--bg-card2)', border:`1px solid ${simMode?'transparent':'var(--border)'}`, color:simMode?'#fff':'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                  {simMode ? 'Simulation active' : 'Simuler'}
                </button>
              </div>
            </div>
            {simMode ? (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {HYROX_STATIONS.map(s => (
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, flex:1, color:'var(--text-mid)' }}>{s}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#ef4444', width:40, textAlign:'right' as const }}>{HYROX_REC.stations[s]}</span>
                    <button onClick={() => setSimDeltas(p => ({...p,[s]:(p[s]||0)+5}))}
                      style={{ width:24, height:24, borderRadius:5, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'#22c55e', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                    <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#22c55e', minWidth:32, textAlign:'center' as const }}>{simDeltas[s]?`-${simDeltas[s]}s`:'0s'}</span>
                    <button onClick={() => setSimDeltas(p => ({...p,[s]:Math.max((p[s]||0)-5,0)}))}
                      style={{ width:24, height:24, borderRadius:5, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'#ef4444', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  </div>
                ))}
                <button onClick={() => setSimDeltas({})} style={{ marginTop:6, padding:'5px', borderRadius:7, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }}>Reinitialiser</button>
              </div>
            ) : (
              <p style={{ fontSize:12, color:'var(--text-dim)', textAlign:'center' as const, padding:'10px 0' }}>Active la simulation pour identifier tes points faibles et calculer le gain potentiel.</p>
            )}
          </Card>
        </div>
      )}

      {sport === 'gym' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
          {GYM_MOVES.map(m => (
            <Card key={m.name} style={{ padding:16 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 10px', color:'#f97316' }}>{m.name}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {m.recs.map(r => (
                  <div key={r.l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 9px', borderRadius:7, background:'rgba(249,115,22,0.07)', border:'1px solid rgba(249,115,22,0.15)' }}>
                    <span style={{ fontSize:11, color:'var(--text-mid)' }}>{r.l}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:r.v ? '#f97316' : 'var(--text-dim)' }}>
                      {r.v ? `${r.v}${r.l.includes('reps') ? '' : ' kg'}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// PROGRESSION TAB
// ════════════════════════════════════════════════
function ProgressionTab() {
  const ftpSeries   = [{ label:'FTP',   color:'#00c8e0', data:PROG.ftp }]
  const run5kSeries = [{ label:'5km',   color:'#22c55e', data:[1185,1092,1065] }]
  const swim100     = [{ label:'100m',  color:'#38bdf8', data:[82,76,70] }]
  const row2k       = [{ label:'2000m', color:'#14b8a6', data:[455,428,412] }]

  function pctChange(a: number, b: number): string {
    const d = ((b-a)/a*100)
    return (d >= 0 ? '+' : '') + d.toFixed(1) + '%'
  }

  const progressItems = [
    { label:'FTP velo', v24:`${PROG.ftp[2]}W`, v23:`${PROG.ftp[1]}W`, v22:`${PROG.ftp[0]}W`, gain:pctChange(PROG.ftp[1],PROG.ftp[2]), color:'#00c8e0', goodIfPositive:true },
    { label:'5km course', v24:PROG.run5k[2], v23:PROG.run5k[1], v22:PROG.run5k[0], gain:pctChange(parsePaceSec(PROG.run5k[1]),parsePaceSec(PROG.run5k[2])), color:'#22c55e', goodIfPositive:false },
    { label:'100m natation', v24:PROG.swim100[2], v23:PROG.swim100[1], v22:PROG.swim100[0], gain:pctChange(parsePaceSec(PROG.swim100[1]),parsePaceSec(PROG.swim100[2])), color:'#38bdf8', goodIfPositive:false },
    { label:'2000m aviron', v24:PROG.row2k[2], v23:PROG.row2k[1], v22:PROG.row2k[0], gain:pctChange(parsePaceSec(PROG.row2k[1]),parsePaceSec(PROG.row2k[2])), color:'#14b8a6', goodIfPositive:false },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:'0 0 14px' }}>Progression multi-disciplines</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {progressItems.map(item => {
            const good = item.goodIfPositive ? item.gain.startsWith('+') : item.gain.startsWith('-')
            const c = good ? '#22c55e' : '#ef4444'
            return (
              <div key={item.label} style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap' as const, gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{item.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:c, fontFamily:'DM Mono,monospace' }}>{item.gain} vs 2023</span>
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  {[{y:'2022',v:item.v22},{y:'2023',v:item.v23},{y:'2024',v:item.v24}].map(x => (
                    <div key={x.y}>
                      <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>{x.y}</p>
                      <p style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:x.y==='2024'?item.color:'var(--text-mid)', margin:0 }}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }} className="md:grid-cols-2">
        <Card>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>FTP Velo</h3>
          <LineChart series={ftpSeries} labels={['2022','2023','2024']}/>
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            {PROG.ftp.map((v,i) => <span key={i} style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#00c8e0' }}>{['2022','2023','2024'][i]}: <strong>{v}W</strong></span>)}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>5km Course</h3>
          <LineChart series={run5kSeries.map(s => ({...s, data:s.data.map(v => 1200-v)}))} labels={['2022','2023','2024']}/>
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            {PROG.run5k.map((v,i) => <span key={i} style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#22c55e' }}>{['2022','2023','2024'][i]}: <strong>{v}</strong></span>)}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>100m Natation</h3>
          <LineChart series={swim100.map(s => ({...s, data:s.data.map(v => 120-v)}))} labels={['2022','2023','2024']}/>
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            {PROG.swim100.map((v,i) => <span key={i} style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#38bdf8' }}>{['2022','2023','2024'][i]}: <strong>{v}</strong></span>)}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>2000m Aviron</h3>
          <LineChart series={row2k.map(s => ({...s, data:s.data.map(v => 500-v)}))} labels={['2022','2023','2024']}/>
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            {PROG.row2k.map((v,i) => <span key={i} style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#14b8a6' }}>{['2022','2023','2024'][i]}: <strong>{v}</strong></span>)}
          </div>
        </Card>
      </div>

      <Card>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Detection de stagnation</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'FTP velo',     trend:'Progression constante',  color:'#22c55e', status:'En progression' },
            { label:'Course',       trend:'Bonne amelioration',     color:'#22c55e', status:'En progression' },
            { label:'Natation',     trend:'Progression reguliere',  color:'#22c55e', status:'En progression' },
            { label:'Aviron',       trend:'Bonne dynamique',        color:'#22c55e', status:'En progression' },
            { label:'Musculation',  trend:'Stable depuis 6 mois',   color:'#ffb340', status:'Plateau detecte' },
          ].map(x => (
            <div key={x.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:12, fontWeight:500 }}>{x.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-dim)' }}>{x.trend}</span>
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:`${x.color}22`, color:x.color, fontWeight:700 }}>{x.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:'rgba(255,179,64,0.08)', border:'1px solid rgba(255,179,64,0.20)' }}>
          <p style={{ fontSize:12, color:'#ffb340', fontWeight:600, margin:'0 0 3px' }}>Suggestion</p>
          <p style={{ fontSize:11, color:'var(--text-mid)', margin:0 }}>Ton plateau en musculation peut etre du a un manque de surcharge progressive. Essaie d'ajouter 2.5kg par semaine sur tes mouvements principaux.</p>
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function PerformancePage() {
  const [tab, setTab] = useState<PerfTab>('profil')

  const TABS: [PerfTab,string,string,string,string][] = [
    ['profil',     'Profil',      'Profil',      '#00c8e0','rgba(0,200,224,0.10)'],
    ['zones',      'Zones',       'Zones',       '#f97316','rgba(249,115,22,0.10)'],
    ['records',    'Records',     'Records',     '#ffb340','rgba(255,179,64,0.10)'],
    ['progression','Progression', 'Progression', '#22c55e','rgba(34,197,94,0.10)'],
  ]

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Performance</h1>
        <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>Profil · Zones · Records · Progression</p>
      </div>

      <div className="hidden md:flex" style={{ gap:8, marginBottom:20, flexWrap:'wrap' as const }}>
        {TABS.map(([id,,label,color,bg]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, minWidth:120, padding:'11px 16px', borderRadius:12, border:'1px solid', cursor:'pointer', borderColor:tab===id?color:'var(--border)', background:tab===id?bg:'var(--bg-card)', color:tab===id?color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:tab===id?700:400, boxShadow:tab===id?`0 0 0 1px ${color}33`:'var(--shadow-card)', transition:'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="md:hidden" style={{ display:'flex', gap:5, marginBottom:16, flexWrap:'wrap' as const }}>
        {TABS.map(([id,shortLabel,,color,bg]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, minWidth:70, padding:'8px 4px', borderRadius:10, border:'1px solid', cursor:'pointer', borderColor:tab===id?color:'var(--border)', background:tab===id?bg:'var(--bg-card)', color:tab===id?color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:tab===id?700:400, transition:'all 0.15s' }}>
            {shortLabel}
          </button>
        ))}
      </div>

      {tab === 'profil'      && <ProfilTab/>}
      {tab === 'zones'       && <ZonesTab/>}
      {tab === 'records'     && <RecordsTab/>}
      {tab === 'progression' && <ProgressionTab/>}
    </div>
  )
}
