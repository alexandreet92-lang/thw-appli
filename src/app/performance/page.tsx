'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────
type PerfTab = 'profil' | 'zones' | 'records' | 'progression'
type RecordSport = 'bike' | 'run' | 'swim' | 'rowing' | 'hyrox' | 'gym'
type ZoneTab = 'power' | 'pace' | 'hr'

// ── Zone colors ───────────────────────────────────
const Z_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const Z_LABELS = ['Z1 — Récup','Z2 — Aérobie','Z3 — Tempo','Z4 — Seuil','Z5 — VO2max']
const Z_SHORT  = ['Z1','Z2','Z3','Z4','Z5']

// ── Initial athlete profile ───────────────────────
const INIT_PROFILE = {
  ftp: 301, weight: 75, age: 31,
  lthr: 172, hrMax: 192, hrRest: 44,
  thresholdPace: '4:08', vma: 18.5, css: '1:28',
  vo2max: 62,
}

// ── Zones calculation ─────────────────────────────
function calcBikeZones(ftp: number) {
  return [
    { z:'Z1', label:'Récupération active', min:0,             max:Math.round(ftp*0.55) },
    { z:'Z2', label:'Endurance',           min:Math.round(ftp*0.56), max:Math.round(ftp*0.75) },
    { z:'Z3', label:'Tempo',               min:Math.round(ftp*0.76), max:Math.round(ftp*0.87) },
    { z:'Z4', label:'Seuil',               min:Math.round(ftp*0.88), max:Math.round(ftp*1.05) },
    { z:'Z5', label:'VO2max',              min:Math.round(ftp*1.06), max:Math.round(ftp*1.20) },
  ]
}

function parsePaceSec(pace: string): number {
  const p = pace.split(':')
  return parseInt(p[0])*60 + (parseInt(p[1])||0)
}

function secToPace(sec: number): string {
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`
}

function calcRunZones(thresholdPaceSec: number) {
  return [
    { z:'Z1', label:'Récup',    min:secToPace(Math.round(thresholdPaceSec*1.30)), max:'∞' },
    { z:'Z2', label:'Aérobie',  min:secToPace(Math.round(thresholdPaceSec*1.11)), max:secToPace(Math.round(thresholdPaceSec*1.29)) },
    { z:'Z3', label:'Tempo',    min:secToPace(Math.round(thresholdPaceSec*1.01)), max:secToPace(Math.round(thresholdPaceSec*1.10)) },
    { z:'Z4', label:'Seuil',    min:secToPace(Math.round(thresholdPaceSec*0.91)), max:secToPace(Math.round(thresholdPaceSec*1.00)) },
    { z:'Z5', label:'VO2max',   min:'max', max:secToPace(Math.round(thresholdPaceSec*0.90)) },
  ]
}

function calcSwimZones(cssSec: number) {
  return [
    { z:'Z1', label:'Récup',   min:secToPace(Math.round(cssSec*1.35)), max:'∞' },
    { z:'Z2', label:'Aérobie', min:secToPace(Math.round(cssSec*1.16)), max:secToPace(Math.round(cssSec*1.34)) },
    { z:'Z3', label:'Tempo',   min:secToPace(Math.round(cssSec*1.06)), max:secToPace(Math.round(cssSec*1.15)) },
    { z:'Z4', label:'Seuil',   min:secToPace(Math.round(cssSec*0.98)), max:secToPace(Math.round(cssSec*1.05)) },
    { z:'Z5', label:'VO2max',  min:'max', max:secToPace(Math.round(cssSec*0.97)) },
  ]
}

function calcHRZones(hrMax: number, hrRest: number) {
  const r = hrMax - hrRest
  return [
    { z:'Z1', label:'Récup',   min:hrRest,                          max:Math.round(hrRest+r*0.60) },
    { z:'Z2', label:'Aérobie', min:Math.round(hrRest+r*0.60)+1,    max:Math.round(hrRest+r*0.70) },
    { z:'Z3', label:'Tempo',   min:Math.round(hrRest+r*0.70)+1,    max:Math.round(hrRest+r*0.80) },
    { z:'Z4', label:'Seuil',   min:Math.round(hrRest+r*0.80)+1,    max:Math.round(hrRest+r*0.90) },
    { z:'Z5', label:'VO2max',  min:Math.round(hrRest+r*0.90)+1,    max:hrMax },
  ]
}

// ── Records mock data ─────────────────────────────
const BIKE_DURATIONS = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','20min','30min','1h','2h','3h','4h','5h','6h']
const BIKE_RECORDS: Record<string,{w:number;date:string}[]> = {
  'Pmax':  [{w:1240,date:'2024-08-12'},{w:1180,date:'2023-06-20'}],
  '10s':   [{w:980, date:'2024-09-01'},{w:920, date:'2023-07-15'}],
  '30s':   [{w:740, date:'2024-07-22'},{w:710, date:'2023-05-10'}],
  '1min':  [{w:560, date:'2024-06-14'},{w:530, date:'2023-08-03'}],
  '3min':  [{w:430, date:'2024-05-28'},{w:410, date:'2023-09-18'}],
  '5min':  [{w:390, date:'2024-04-10'},{w:375, date:'2023-04-22'}],
  '8min':  [{w:360, date:'2024-03-15'},{w:348, date:'2023-03-30'}],
  '10min': [{w:345, date:'2024-02-28'},{w:332, date:'2023-02-14'}],
  '12min': [{w:335, date:'2024-01-20'},{w:320, date:'2023-01-08'}],
  '20min': [{w:320, date:'2024-10-05'},{w:308, date:'2023-10-12'}],
  '30min': [{w:310, date:'2024-11-02'},{w:298, date:'2023-11-20'}],
  '1h':    [{w:301, date:'2024-12-01'},{w:285, date:'2023-12-10'}],
  '2h':    [{w:275, date:'2024-08-30'},{w:262, date:'2023-08-25'}],
  '3h':    [{w:255, date:'2024-07-14'},{w:242, date:'2023-07-20'}],
  '4h':    [{w:238, date:'2024-06-22'},{w:225, date:'2023-06-18'}],
  '5h':    [{w:222, date:'2024-05-18'},{w:210, date:'2023-05-30'}],
  '6h':    [{w:208, date:'2024-04-28'},{w:196, date:'2023-04-15'}],
}

const RUN_DISTANCES = ['1500m','5km','10km','Semi','Marathon','50km','100km']
const RUN_KM: Record<string,number> = { '1500m':1.5,'5km':5,'10km':10,'Semi':21.1,'Marathon':42.195,'50km':50,'100km':100 }
const RUN_RECORDS: Record<string,{time:string;date:string}[]> = {
  '1500m':   [{time:'4:22',date:'2024-06-08'},{time:'4:35',date:'2023-07-14'}],
  '5km':     [{time:'17:45',date:'2024-04-21'},{time:'18:12',date:'2023-05-10'}],
  '10km':    [{time:'37:20',date:'2024-05-12'},{time:'38:45',date:'2023-06-18'}],
  'Semi':    [{time:'1:24:30',date:'2024-04-06'},{time:'1:27:15',date:'2023-04-09'}],
  'Marathon':[{time:'3:05:00',date:'2024-10-20'},{time:'3:12:30',date:'2023-10-15'}],
  '50km':    [{time:'4:45:00',date:'2024-07-06'},{time:'—',date:'—'}],
  '100km':   [{time:'—',date:'—'},{time:'—',date:'—'}],
}

const SWIM_DISTANCES = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const SWIM_RECORDS: Record<string,{time:string;date:string}[]> = {
  '100m':   [{time:'1:10',date:'2024-03-15'},{time:'1:14',date:'2023-04-20'}],
  '200m':   [{time:'2:28',date:'2024-04-10'},{time:'2:35',date:'2023-05-12'}],
  '400m':   [{time:'5:10',date:'2024-02-28'},{time:'5:22',date:'2023-03-18'}],
  '1000m':  [{time:'13:20',date:'2024-05-20'},{time:'13:55',date:'2023-06-10'}],
  '1500m':  [{time:'20:30',date:'2024-01-15'},{time:'21:10',date:'2023-02-20'}],
  '2000m':  [{time:'27:45',date:'2024-06-05'},{time:'28:40',date:'2023-07-15'}],
  '5000m':  [{time:'—',date:'—'},{time:'—',date:'—'}],
  '10000m': [{time:'—',date:'—'},{time:'—',date:'—'}],
}

const ROW_DISTANCES = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const ROW_RECORDS: Record<string,{time:string;date:string}[]> = {
  '500m':    [{time:'1:32',date:'2024-02-10'},{time:'1:36',date:'2023-03-05'}],
  '1000m':   [{time:'3:18',date:'2024-03-20'},{time:'3:25',date:'2023-04-15'}],
  '2000m':   [{time:'6:52',date:'2024-01-28'},{time:'7:08',date:'2023-02-12'}],
  '5000m':   [{time:'18:30',date:'2024-04-05'},{time:'19:10',date:'2023-05-20'}],
  '10000m':  [{time:'38:45',date:'2024-05-10'},{time:'40:20',date:'2023-06-08'}],
  'Semi':    [{time:'—',date:'—'},{time:'—',date:'—'}],
  'Marathon':[{time:'—',date:'—'},{time:'—',date:'—'}],
}

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmers Carry','Sandbag Lunges','Wall Balls']
const HYROX_RECORDS = [
  { format:'Solo Open Homme', date:'2024-05-10', totalTime:'1:02:45', roxzone:'8:30',
    stations:{'SkiErg':'3:42','Sled Push':'3:15','Sled Pull':'2:55','Burpee Broad Jump':'5:10','Rowing':'3:28','Farmers Carry':'2:40','Sandbag Lunges':'5:55','Wall Balls':'4:50'},
    runs:['4:12','4:08','4:15','4:22','4:18','4:30','4:35','4:28'],
  },
]

const GYM_MOVEMENTS = [
  { name:'Bench Press', records:[{label:'1RM',val:120},{label:'3RM',val:110},{label:'5RM',val:102},{label:'10RM',val:90},{label:'Max reps PDC',val:32}]},
  { name:'Squat',       records:[{label:'1RM',val:150},{label:'3RM',val:138},{label:'5RM',val:128},{label:'10RM',val:112},{label:'Max reps PDC',val:0}]},
  { name:'Deadlift',    records:[{label:'1RM',val:185},{label:'3RM',val:172},{label:'5RM',val:160},{label:'10RM',val:140},{label:'Max reps PDC',val:0}]},
  { name:'Tractions',   records:[{label:'Max reps PDC',val:18},{label:'1RM+charge',val:40}]},
  { name:'Dips',        records:[{label:'Max reps PDC',val:30},{label:'1RM+charge',val:50}]},
  { name:'Dév. militaire',records:[{label:'Max charge',val:80}]},
  { name:'Pompes',      records:[{label:'Max reps',val:65}]},
]

// ── Progress data ─────────────────────────────────
const PROG_YEARS = ['2022','2023','2024']
const PROG_DATA = {
  ftp:     [265, 285, 301],
  run5k:   ['19:45','18:12','17:45'],
  swim100: ['1:22','1:16','1:10'],
  row2k:   ['7:35','7:08','6:52'],
}

// ── Helpers ───────────────────────────────────────
function calcPaceFromTime(distKm: number, timeStr: string): string {
  if(timeStr==='—'||!timeStr) return '—'
  const parts = timeStr.split(':').map(Number)
  let totalSec = 0
  if(parts.length===3) totalSec=parts[0]*3600+parts[1]*60+parts[2]
  else if(parts.length===2) totalSec=parts[0]*60+parts[1]
  else return '—'
  const secPerKm = totalSec/distKm
  return `${Math.floor(secPerKm/60)}:${String(Math.round(secPerKm%60)).padStart(2,'0')}/km`
}

function calcSplitFromTime(distM: number, timeStr: string): string {
  if(timeStr==='—'||!timeStr) return '—'
  const parts = timeStr.split(':').map(Number)
  let totalSec = 0
  if(parts.length===3) totalSec=parts[0]*3600+parts[1]*60+parts[2]
  else if(parts.length===2) totalSec=parts[0]*60+parts[1]
  else return '—'
  const splitSec = (totalSec/distM)*500
  return `${Math.floor(splitSec/60)}:${String(Math.round(splitSec%60)).padStart(2,'0')}/500m`
}

function wattsFromSplit(splitStr: string): number {
  if(splitStr==='—'||!splitStr) return 0
  const parts = splitStr.split(':').map(Number)
  const sec = parts[0]*60+(parts[1]||0)
  if(!sec) return 0
  return Math.round(2.80/(sec/500)**3)
}

// ── UI atoms ──────────────────────────────────────
function StatCard({label,value,unit,sub,color}:{label:string;value:string|number;unit?:string;sub?:string;color?:string}) {
  return (
    <div style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px'}}>
      <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 5px'}}>{label}</p>
      <p style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:color||'var(--text)',margin:0,lineHeight:1}}>
        {value}{unit&&<span style={{fontSize:12,fontWeight:400,color:'var(--text-dim)',marginLeft:3}}>{unit}</span>}
      </p>
      {sub&&<p style={{fontSize:10,color:'var(--text-dim)',margin:'4px 0 0'}}>{sub}</p>}
    </div>
  )
}

function ZoneBar({zones}:{zones:{z:string;label:string;min:string|number;max:string|number}[]}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {zones.map((z,i)=>(
        <div key={z.z} style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{width:28,height:28,borderRadius:7,background:`${Z_COLORS[i]}22`,border:`1px solid ${Z_COLORS[i]}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:Z_COLORS[i],flexShrink:0}}>{z.z}</span>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:11,fontWeight:500,color:'var(--text-mid)'}}>{z.label}</span>
              <span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:Z_COLORS[i],fontWeight:600}}>{z.min} → {z.max}</span>
            </div>
            <div style={{height:6,borderRadius:999,background:`${Z_COLORS[i]}22`,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${20+i*16}%`,background:Z_COLORS[i],opacity:0.7,borderRadius:999}}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NumberInput({label,value,onChange,unit,min,max,step}:{label:string;value:number;onChange:(v:number)=>void;unit?:string;min?:number;max?:number;step?:number}) {
  return (
    <div>
      <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{label}{unit&&<span style={{fontWeight:400,marginLeft:3,textTransform:'none' as const}}>({unit})</span>}</p>
      <input type="number" value={value} min={min} max={max} step={step||1} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
    </div>
  )
}

function TextInput({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}) {
  return (
    <div>
      <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{label}</p>
      <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
    </div>
  )
}

// ── Power curve SVG ───────────────────────────────
function PowerCurve({data24,data23}:{data24:number[];data23:number[]}) {
  const maxW = Math.max(...data24,...data23)*1.05
  const w=400,h=120
  const pts=(arr:number[])=>arr.map((v,i)=>`${(i/(arr.length-1))*w},${h-((v/maxW)*h)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:h+20,overflow:'visible'}}>
      <defs>
        <linearGradient id="pgrd24" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00c8e0" stopOpacity="0.25"/><stop offset="100%" stopColor="#00c8e0" stopOpacity="0.02"/></linearGradient>
        <linearGradient id="pgrd23" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b6fff" stopOpacity="0.15"/><stop offset="100%" stopColor="#5b6fff" stopOpacity="0.02"/></linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts(data23)} ${w},${h}`} fill="url(#pgrd23)"/>
      <polyline points={pts(data23)} fill="none" stroke="#5b6fff" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"/>
      <polygon points={`0,${h} ${pts(data24)} ${w},${h}`} fill="url(#pgrd24)"/>
      <polyline points={pts(data24)} fill="none" stroke="#00c8e0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {[0,25,50,75,100].map(pct=>(
        <line key={pct} x1={0} y1={h-(pct/100)*h} x2={w} y2={h-(pct/100)*h} stroke="var(--border)" strokeWidth="0.5"/>
      ))}
    </svg>
  )
}

function SimpleLineChart({series}:{series:{label:string;color:string;data:number[]}[]}) {
  const allVals=series.flatMap(s=>s.data)
  const min=Math.min(...allVals)*0.95, max=Math.max(...allVals)*1.05
  const w=300,h=80
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:h,overflow:'visible'}}>
      {series.map(s=>{
        const pts=s.data.map((v,i)=>`${(i/(s.data.length-1))*w},${h-((v-min)/(max-min))*h}`).join(' ')
        return <polyline key={s.label} points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      })}
    </svg>
  )
}

// ════════════════════════════════════════════════
// TAB: PROFIL
// ════════════════════════════════════════════════
function ProfilTab() {
  const [profile,setProfile]=useState({...INIT_PROFILE})
  const [editing,setEditing]=useState(false)

  const wPerKg=(profile.ftp/profile.weight).toFixed(2)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Header card */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>Profil athlète</h2>
            <p style={{fontSize:12,color:'var(--text-dim)',margin:'3px 0 0'}}>Paramètres physiologiques</p>
          </div>
          <button onClick={()=>setEditing(!editing)} style={{padding:'6px 14px',borderRadius:9,background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)',border:`1px solid ${editing?'transparent':'var(--border)'}`,color:editing?'#fff':'var(--text-mid)',fontSize:12,cursor:'pointer',fontWeight:600}}>
            {editing?'✓ Sauvegarder':'✏️ Modifier'}
          </button>
        </div>

        {editing ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}} className="md:grid-cols-3">
            <NumberInput label="FTP" unit="W" value={profile.ftp} onChange={v=>setProfile({...profile,ftp:v})} min={100} max={600}/>
            <NumberInput label="Poids" unit="kg" value={profile.weight} onChange={v=>setProfile({...profile,weight:v})} min={40} max={150} step={0.5}/>
            <NumberInput label="Âge" value={profile.age} onChange={v=>setProfile({...profile,age:v})} min={15} max={80}/>
            <NumberInput label="FC max" unit="bpm" value={profile.hrMax} onChange={v=>setProfile({...profile,hrMax:v})} min={140} max={220}/>
            <NumberInput label="FC repos" unit="bpm" value={profile.hrRest} onChange={v=>setProfile({...profile,hrRest:v})} min={30} max={80}/>
            <NumberInput label="LTHR" unit="bpm" value={profile.lthr} onChange={v=>setProfile({...profile,lthr:v})} min={100} max={200}/>
            <NumberInput label="VMA" unit="km/h" value={profile.vma} onChange={v=>setProfile({...profile,vma:v})} min={10} max={30} step={0.5}/>
            <NumberInput label="VO2max estimé" value={profile.vo2max} onChange={v=>setProfile({...profile,vo2max:v})} min={30} max={90}/>
            <TextInput label="Allure seuil" value={profile.thresholdPace} onChange={v=>setProfile({...profile,thresholdPace:v})} placeholder="4:08"/>
            <TextInput label="CSS natation" value={profile.css} onChange={v=>setProfile({...profile,css:v})} placeholder="1:28"/>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}} className="md:grid-cols-4">
            <StatCard label="FTP" value={profile.ftp} unit="W" sub={`${wPerKg} W/kg`} color="#00c8e0"/>
            <StatCard label="Allure seuil" value={profile.thresholdPace} unit="/km" color="#22c55e"/>
            <StatCard label="VMA" value={profile.vma} unit="km/h" color="#22c55e"/>
            <StatCard label="CSS natation" value={profile.css} unit="/100m" color="#38bdf8"/>
            <StatCard label="FC max" value={profile.hrMax} unit="bpm" color="#ef4444"/>
            <StatCard label="FC repos" value={profile.hrRest} unit="bpm" color="#22c55e"/>
            <StatCard label="LTHR" value={profile.lthr} unit="bpm" color="#f97316"/>
            <StatCard label="VO2max estimé" value={profile.vo2max} unit="ml/kg/min" color="#a855f7"/>
          </div>
        )}
      </div>

      {/* Physical summary */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 14px'}}>Niveau estimé</h2>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[
            {label:'W/kg (Puissance relative)',value:parseFloat(wPerKg),max:6,unit:'W/kg',color:'#00c8e0',ranges:['< 2.5 Débutant','2.5-3.5 Intermédiaire','3.5-4.5 Avancé','> 4.5 Expert']},
            {label:'VO2max',value:profile.vo2max,max:80,unit:'ml/kg/min',color:'#a855f7',ranges:['< 40 Faible','40-55 Moyen','55-65 Élevé','> 65 Elite']},
            {label:'FC repos (fitness cardio)',value:profile.hrRest,max:80,unit:'bpm',color:'#22c55e',invert:true,ranges:['> 60 Faible','50-60 Moyen','40-50 Élevé','< 40 Elite']},
          ].map(item=>{
            const pct=item.invert?(1-item.value/item.max)*100:item.value/item.max*100
            return (
              <div key={item.label}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'var(--text-mid)'}}>{item.label}</span>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:item.color}}>{item.value} {item.unit}</span>
                </div>
                <div style={{height:8,borderRadius:999,overflow:'hidden',background:'var(--border)',marginBottom:3}}>
                  <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${item.color}88,${item.color})`,borderRadius:999}}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// TAB: ZONES
// ════════════════════════════════════════════════
function ZonesTab() {
  const [profile,setProfile]=useState({...INIT_PROFILE})
  const [zoneTab,setZoneTab]=useState<ZoneTab>('power')
  const [editing,setEditing]=useState(false)

  const bikeZones=calcBikeZones(profile.ftp)
  const runZones=calcRunZones(parsePaceSec(profile.thresholdPace))
  const swimZones=calcSwimZones(parsePaceSec(profile.css))
  const hrZones=calcHRZones(profile.hrMax,profile.hrRest)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Controls */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Zones d'entraînement</h2>
          <button onClick={()=>setEditing(!editing)} style={{padding:'5px 12px',borderRadius:8,background:editing?'linear-gradient(135deg,#00c8e0,#5b6fff)':'var(--bg-card2)',border:`1px solid ${editing?'transparent':'var(--border)'}`,color:editing?'#fff':'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:600}}>
            {editing?'✓ Appliquer':'✏️ Modifier seuils'}
          </button>
        </div>

        {editing&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:14,padding:'12px 14px',borderRadius:11,background:'rgba(0,200,224,0.06)',border:'1px solid rgba(0,200,224,0.15)'}} className="md:grid-cols-4">
            <NumberInput label="FTP" unit="W" value={profile.ftp} onChange={v=>setProfile({...profile,ftp:v})} min={100} max={600}/>
            <TextInput label="Allure seuil" value={profile.thresholdPace} onChange={v=>setProfile({...profile,thresholdPace:v})} placeholder="4:08"/>
            <TextInput label="CSS" value={profile.css} onChange={v=>setProfile({...profile,css:v})} placeholder="1:28"/>
            <NumberInput label="FC max" unit="bpm" value={profile.hrMax} onChange={v=>setProfile({...profile,hrMax:v})} min={140} max={220}/>
          </div>
        )}

        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
          {([['power','⚡ Puissance'],['pace','🏃 Allures'],['hr','❤️ FC']] as [ZoneTab,string][]).map(([t,l])=>(
            <button key={t} onClick={()=>setZoneTab(t)} style={{padding:'7px 14px',borderRadius:9,border:'1px solid',cursor:'pointer',borderColor:zoneTab===t?'#00c8e0':'var(--border)',background:zoneTab===t?'rgba(0,200,224,0.10)':'var(--bg-card2)',color:zoneTab===t?'#00c8e0':'var(--text-mid)',fontSize:12,fontWeight:zoneTab===t?600:400}}>{l}</button>
          ))}
        </div>
      </div>

      {/* Power zones */}
      {zoneTab==='power'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}} className="md:grid-cols-2">
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0}}>🚴 Vélo — FTP {profile.ftp}W</h3>
              <span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:'#00c8e0'}}>{(profile.ftp/profile.weight).toFixed(2)} W/kg</span>
            </div>
            <ZoneBar zones={bikeZones.map(z=>({...z,min:z.min+'W',max:z.max+'W'}))}/>
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 14px'}}>🚣 Aviron — Split /500m</h3>
            <ZoneBar zones={[
              {z:'Z1',label:'Récup',   min:'2:15+',   max:'∞'},
              {z:'Z2',label:'Aérobie', min:'2:00',    max:'2:14'},
              {z:'Z3',label:'Tempo',   min:'1:52',    max:'1:59'},
              {z:'Z4',label:'Seuil',   min:'1:44',    max:'1:51'},
              {z:'Z5',label:'VO2max',  min:'max',     max:'1:43'},
            ]}/>
            <p style={{fontSize:10,color:'var(--text-dim)',margin:'10px 0 0'}}>Basé sur split 2000m de référence · Puissance estimée Concept2</p>
          </div>
        </div>
      )}

      {/* Pace zones */}
      {zoneTab==='pace'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}} className="md:grid-cols-2">
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 14px'}}>🏃 Course à pied — Seuil {profile.thresholdPace}/km</h3>
            <ZoneBar zones={runZones.map(z=>({...z,min:typeof z.min==='string'?z.min+'/km':z.min,max:typeof z.max==='string'?z.max+'/km':z.max}))}/>
          </div>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 14px'}}>🏊 Natation — CSS {profile.css}/100m</h3>
            <ZoneBar zones={swimZones.map(z=>({...z,min:typeof z.min==='string'?z.min+'/100m':z.min,max:typeof z.max==='string'?z.max+'/100m':z.max}))}/>
          </div>
        </div>
      )}

      {/* HR zones */}
      {zoneTab==='hr'&&(
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0}}>❤️ Fréquence cardiaque</h3>
            <div style={{display:'flex',gap:14,fontSize:11}}>
              <span style={{color:'var(--text-dim)'}}>Repos : <strong style={{color:'#22c55e',fontFamily:'DM Mono,monospace'}}>{profile.hrRest}bpm</strong></span>
              <span style={{color:'var(--text-dim)'}}>Max : <strong style={{color:'#ef4444',fontFamily:'DM Mono,monospace'}}>{profile.hrMax}bpm</strong></span>
              <span style={{color:'var(--text-dim)'}}>LTHR : <strong style={{color:'#f97316',fontFamily:'DM Mono,monospace'}}>{profile.lthr}bpm</strong></span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}} className="md:grid-cols-1">
            <ZoneBar zones={hrZones.map(z=>({...z,min:z.min+'bpm',max:z.max+'bpm'}))}/>
          </div>
          {/* Visual HR bar */}
          <div style={{marginTop:14}}>
            <div style={{display:'flex',height:16,borderRadius:8,overflow:'hidden'}}>
              {hrZones.map((z,i)=>(
                <div key={z.z} title={`${z.z}: ${z.min}→${z.max}bpm`} style={{flex:z.max-z.min,background:Z_COLORS[i],opacity:0.8}}/>
              ))}
            </div>
            <div style={{display:'flex',marginTop:4}}>
              {hrZones.map((z,i)=>(
                <div key={z.z} style={{flex:z.max-z.min,textAlign:'center' as const}}>
                  <span style={{fontSize:9,fontFamily:'DM Mono,monospace',color:Z_COLORS[i],fontWeight:600}}>{z.min}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// TAB: RECORDS
// ════════════════════════════════════════════════
function RecordsTab() {
  const [sport,setSport]=useState<RecordSport>('bike')
  const [showEdit,setShowEdit]=useState(false)
  const [hyroxStation,setHyroxStation]=useState<string|null>(null)
  const [simMode,setSimMode]=useState(false)
  const [simDeltas,setSimDeltas]=useState<Record<string,number>>({})

  // Power curve data
  const curve24 = BIKE_DURATIONS.map(d=>BIKE_RECORDS[d]?.[0]?.w||0)
  const curve23 = BIKE_DURATIONS.map(d=>BIKE_RECORDS[d]?.[1]?.w||0)

  // Hyrox simulation
  const hyroxRec = HYROX_RECORDS[0]
  function hyroxSimTotal():string {
    if(!hyroxRec) return '—'
    const baseSec=(parts:string)=>{ const p=parts.split(':').map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0) }
    let total=0
    HYROX_STATIONS.forEach(s=>{ total+=baseSec(hyroxRec.stations[s]||'0:00')+(simDeltas[s]||0)*-1 })
    hyroxRec.runs.forEach((r,i)=>{ total+=baseSec(r)+(simDeltas[`run${i}`]||0)*-1 })
    total+=baseSec(hyroxRec.roxzone)
    const m=Math.floor(total/60),s=total%60
    return `${m}:${String(s).padStart(2,'0')}`
  }

  const SPORT_TABS:[RecordSport,string,string][]=[
    ['bike','🚴 Vélo','#3b82f6'],
    ['run','🏃 Course','#22c55e'],
    ['swim','🏊 Natation','#38bdf8'],
    ['rowing','🚣 Aviron','#14b8a6'],
    ['hyrox','🏋️ Hyrox','#ef4444'],
    ['gym','💪 Muscu','#f97316'],
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Sport selector */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
        {SPORT_TABS.map(([s,l,c])=>(
          <button key={s} onClick={()=>setSport(s)} style={{padding:'7px 13px',borderRadius:9,border:'1px solid',cursor:'pointer',borderColor:sport===s?c:'var(--border)',background:sport===s?`${c}22`:'var(--bg-card)',color:sport===s?c:'var(--text-mid)',fontSize:12,fontWeight:sport===s?600:400}}>{l}</button>
        ))}
      </div>

      {/* BIKE */}
      {sport==='bike'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Power curve */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <h2 style={{fontFamily:'
