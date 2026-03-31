'use client'

import { useState, useRef, useEffect } from 'react'

// ── Types ─────────────────────────────────────────
type PlanningTab   = 'training' | 'week' | 'race'
type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing' | 'gym'
type SessionStatus = 'planned' | 'done'
type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown'
type TaskType      = 'sport' | 'work' | 'personal' | 'recovery'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type CalView       = 'year' | 'month'
type TrainingView  = 'horizontal' | 'vertical'
type RaceSport     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'
type FilterSport   = 'all' | SportType

// ── Constants ─────────────────────────────────────
const SPORT_BG: Record<SportType,string>    = { swim:'rgba(56,189,248,0.13)', run:'rgba(34,197,94,0.13)', bike:'rgba(59,130,246,0.13)', hyrox:'rgba(239,68,68,0.13)', gym:'rgba(249,115,22,0.13)', triathlon:'rgba(168,85,247,0.13)', rowing:'rgba(20,184,166,0.13)' }
const SPORT_BORDER: Record<SportType,string>= { swim:'#38bdf8', run:'#22c55e', bike:'#3b82f6', hyrox:'#ef4444', gym:'#f97316', triathlon:'#a855f7', rowing:'#14b8a6' }
const SPORT_EMOJI: Record<SportType,string> = { run:'🏃', bike:'🚴', swim:'🏊', hyrox:'🏋️', gym:'💪', triathlon:'🔱', rowing:'🚣' }
const SPORT_LABEL: Record<SportType,string> = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation', triathlon:'Triathlon', rowing:'Aviron' }
const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const TASK_CONFIG: Record<TaskType,{label:string;color:string;bg:string}> = {
  sport:    { label:'Sport',     color:'#22c55e', bg:'rgba(34,197,94,0.15)'   },
  work:     { label:'Travail',   color:'#3b82f6', bg:'rgba(59,130,246,0.15)'  },
  personal: { label:'Personnel', color:'#a78bfa', bg:'rgba(167,139,250,0.15)' },
  recovery: { label:'Récup',     color:'#ffb340', bg:'rgba(255,179,64,0.15)'  },
}
const RACE_CONFIG: Record<RaceLevel,{label:string;color:string;bg:string;border:string;emoji:string}> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'#22c55e', emoji:'🟢' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'#f97316', emoji:'🟠' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'#ef4444', emoji:'🔴' },
  gty:       { label:'GTY',        color:'var(--gty-text)', bg:'var(--gty-bg)', border:'var(--gty-border)', emoji:'⚫' },
}
const INTENSITY_CONFIG: Record<DayIntensity,{label:string;color:string;bg:string;border:string}> = {
  recovery: { label:'Récup', color:'#9ca3af', bg:'rgba(156,163,175,0.10)', border:'rgba(156,163,175,0.25)' },
  low:      { label:'Low',   color:'#22c55e', bg:'rgba(34,197,94,0.10)',   border:'rgba(34,197,94,0.25)'   },
  mid:      { label:'Mid',   color:'#ffb340', bg:'rgba(255,179,64,0.10)',  border:'rgba(255,179,64,0.25)'  },
  hard:     { label:'Hard',  color:'#ff5f5f', bg:'rgba(255,95,95,0.10)',   border:'rgba(255,95,95,0.25)'   },
}
const INTENSITY_ORDER: DayIntensity[] = ['recovery','low','mid','hard']
const BLOCK_TYPE_LABEL: Record<BlockType,string> = { warmup:'Échauffement', effort:'Effort', recovery:'Récupération', cooldown:'Retour calme' }
const RUN_DISTANCES = ['5 km','10 km','Semi-marathon','Marathon']
const RUN_KM: Record<string,number> = { '5 km':5, '10 km':10, 'Semi-marathon':21.1, 'Marathon':42.195 }
const TRI_DISTANCES = ['XS (Super Sprint)','S (Sprint)','M (Standard)','L / 70.3','XL / Ironman']
const TRI_SWIM: Record<string,string> = { 'XS (Super Sprint)':'300m','S (Sprint)':'750m','M (Standard)':'1500m','L / 70.3':'1900m','XL / Ironman':'3800m' }
const TRI_BIKE: Record<string,string> = { 'XS (Super Sprint)':'8km','S (Sprint)':'20km','M (Standard)':'40km','L / 70.3':'90km','XL / Ironman':'180km' }
const TRI_RUN: Record<string,string>  = { 'XS (Super Sprint)':'1km','S (Sprint)':'5km','M (Standard)':'10km','L / 70.3':'21.1km','XL / Ironman':'42.2km' }
const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmers Carry','Sandbag Lunges','Wall Balls']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const HOURS = Array.from({length:20},(_,i)=>i+5)

// ── Interfaces ────────────────────────────────────
interface Block { id:string; type:BlockType; durationMin:number; zone:number; value:string; hrAvg:string; label:string }
interface Session {
  id:string; sport:SportType; title:string; time:string; durationMin:number
  tss?:number; main?:boolean; status:SessionStatus; notes?:string; blocks:Block[]
  rpe?:number; completionPct?:number
  vDuration?:string; vDistance?:string; vElevation?:string; vSpeed?:string
  vHrAvg?:string; vHrMax?:string; vPace?:string; vNotes?:string
  vHyroxStations?: Record<string,string>; vHyroxRuns?: string[]; vRoxzone?: string
  vSwimTime?:string; vBikeTime?:string; vRunTime?:string; vT1?:string; vT2?:string
}
interface WeekDay { day:string; date:string; intensity:DayIntensity; sessions:Session[] }
interface WeekTask {
  id:string; title:string; type:TaskType; dayIndex:number
  startHour:number; startMin:number; durationMin:number
  description?:string; priority?:boolean; fromTraining?:boolean; sessionId?:string; color?:string
}
interface Race {
  id:string; name:string; sport:RaceSport; date:string; level:RaceLevel
  goal?:string; strategy?:string; notes?:string; distance?:string
  runDistance?:string; triDistance?:string
  hyroxCategory?:string; hyroxLevel?:string; hyroxGender?:string
  goalTime?:string; goalSwimTime?:string; goalBikeTime?:string; goalRunTime?:string
  goalStationTimes?: Record<string,string>; validated?:boolean
  vTime?:string; vKm?:string; vElevation?:string; vSpeed?:string
  vStations?: Record<string,string>; vRuns?: string[]; vRoxzone?:string
  vSwimTime?:string; vBikeTime?:string; vRunTime?:string
}

// ── Helpers ───────────────────────────────────────
function uid():string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function today():string { return new Date().toISOString().split('T')[0] }
function formatDur(min:number):string { const h=Math.floor(min/60),m=min%60; return h===0?`0:${String(m).padStart(2,'0')}`:`${h}h${String(m).padStart(2,'0')}` }
function daysUntil(dateStr:string):number { return Math.ceil((new Date(dateStr).getTime()-Date.now())/(1000*60*60*24)) }
function parsePace(str:string):number { const p=str.replace(',',':').split(':'); return (parseInt(p[0])||0)*60+(parseInt(p[1])||0) }
function calcSpeed(km:string,timeMin:string):string { const d=parseFloat(km),t=parseFloat(timeMin); if(!d||!t)return '—'; return `${(d/(t/60)).toFixed(1)} km/h` }
function calcPaceStr(km:string,timeMin:string):string { const d=parseFloat(km),t=parseFloat(timeMin); if(!d||!t)return '—'; const s=t*60/d; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}/km` }

const ATHLETE = { lthr:172, thresholdPace:248, ftp:301, css:88, weight:75 }

function getZone(sport:SportType,value:string):number {
  if(!value)return 1
  if(sport==='run'){ const sec=parsePace(value),t=ATHLETE.thresholdPace; if(sec>t*1.25)return 1;if(sec>t*1.10)return 2;if(sec>t*1.00)return 3;if(sec>t*0.90)return 4;return 5 }
  if(sport==='bike'){ const w=parseInt(value)||0,f=ATHLETE.ftp; if(w<f*0.55)return 1;if(w<f*0.75)return 2;if(w<f*0.87)return 3;if(w<f*1.05)return 4;return 5 }
  if(sport==='swim'){ const sec=parsePace(value),c=ATHLETE.css; if(sec>c*1.30)return 1;if(sec>c*1.15)return 2;if(sec>c*1.05)return 3;if(sec>c*0.97)return 4;return 5 }
  return 3
}

function calcTSS(blocks:Block[],sport:SportType):number {
  return Math.round(blocks.reduce((tss,b)=>{ const IF=[0.55,0.70,0.83,0.95,1.10][b.zone-1]; return tss+(b.durationMin/60)*IF*IF*100*(sport==='bike'?1:0.9) },0))
}

// ── Initial data (EMPTY) ──────────────────────────
function emptyWeek(): WeekDay[] {
  const days = [
    {day:'Lun',date:''},
    {day:'Mar',date:''},
    {day:'Mer',date:''},
    {day:'Jeu',date:''},
    {day:'Ven',date:''},
    {day:'Sam',date:''},
    {day:'Dim',date:''},
  ]
  // Fill dates for current week
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek)
  return days.map((d, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return { ...d, date: String(date.getDate()), intensity: 'low' as DayIntensity, sessions: [] }
  })
}

// ── Shared UI ─────────────────────────────────────
function InfoModal({ title, content, onClose }: { title:string; content:React.ReactNode; onClose:()=>void }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:24, maxWidth:400, width:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button>
        </div>
        <div style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.7 }}>{content}</div>
      </div>
    </div>
  )
}

// ── BlockBuilder ──────────────────────────────────
function BlockBuilder({ sport, blocks, onChange }: { sport:SportType; blocks:Block[]; onChange:(b:Block[])=>void }) {
  const vLabel = sport==='bike'?'Watts':sport==='swim'?'Allure /100m':'Allure /km'
  const vPlh = sport==='bike'?'250':sport==='swim'?'1:35':'4:30'
  function addBlock() { onChange([...blocks,{id:`b_${Date.now()}`,type:'effort',durationMin:10,zone:3,value:sport==='bike'?'220':'4:30',hrAvg:'',label:'Bloc'}]) }
  function upd(id:string, field:keyof Block, val:string|number) {
    onChange(blocks.map(b => { if(b.id!==id)return b; const u:Block={...b,[field]:val}; if(field==='value')u.zone=getZone(sport,String(val)); return u }))
  }
  const totalMin = blocks.reduce((s,b)=>s+b.durationMin,0)
  return (
    <div>
      {blocks.length>0 && (
        <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>
            TSS estimé : <span style={{ color:SPORT_BORDER[sport] }}>{calcTSS(blocks,sport)} pts</span>
            <span style={{ marginLeft:10, fontWeight:400 }}>· {formatDur(totalMin)}</span>
          </p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:48, marginBottom:4 }}>
            {blocks.map(b => { const hp=((b.zone/5)*0.85+0.05)*100, wp=(b.durationMin/totalMin)*100, c=ZONE_COLORS[b.zone-1]; return <div key={b.id} style={{ width:`${wp}%`, height:`${hp}%`, background:`linear-gradient(180deg,${c}ee,${c}55)`, borderRadius:'3px 3px 0 0', border:`1px solid ${c}88`, minWidth:4 }}/> })}
          </div>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:7 }}>
        {blocks.map(b => (
          <div key={b.id} style={{ background:'var(--bg-card2)', border:`1px solid ${ZONE_COLORS[b.zone-1]}44`, borderLeft:`3px solid ${ZONE_COLORS[b.zone-1]}`, borderRadius:8, padding:'7px 9px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
              <span style={{ width:20, height:20, borderRadius:4, background:`${ZONE_COLORS[b.zone-1]}22`, border:`1px solid ${ZONE_COLORS[b.zone-1]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:ZONE_COLORS[b.zone-1], flexShrink:0 }}>Z{b.zone}</span>
              <select value={b.type} onChange={e=>upd(b.id,'type',e.target.value)} style={{ flex:1, padding:'3px 5px', borderRadius:5, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:10, outline:'none' }}>
                {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <input value={b.label} onChange={e=>upd(b.id,'label',e.target.value)} placeholder="Nom" style={{ flex:1.5, padding:'3px 5px', borderRadius:5, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:10, outline:'none' }}/>
              <button onClick={()=>onChange(blocks.filter(x=>x.id!==b.id))} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12, padding:'1px', flexShrink:0 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
              <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:2 }}>Durée (min)</p><input type="number" value={b.durationMin} onChange={e=>upd(b.id,'durationMin',parseInt(e.target.value)||0)} style={{ width:'100%', padding:'4px 6px', borderRadius:5, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:10, outline:'none', fontFamily:'DM Mono,monospace' }}/></div>
              <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:2 }}>{vLabel}</p><input value={b.value} onChange={e=>upd(b.id,'value',e.target.value)} placeholder={vPlh} style={{ width:'100%', padding:'4px 6px', borderRadius:5, border:`1px solid ${ZONE_COLORS[b.zone-1]}66`, background:`${ZONE_COLORS[b.zone-1]}11`, color:'var(--text)', fontSize:10, outline:'none', fontFamily:'DM Mono,monospace' }}/></div>
              <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:2 }}>FC moy.</p><input value={b.hrAvg} onChange={e=>upd(b.id,'hrAvg',e.target.value)} placeholder="158" style={{ width:'100%', padding:'4px 6px', borderRadius:5, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:10, outline:'none', fontFamily:'DM Mono,monospace' }}/></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addBlock} style={{ width:'100%', padding:'7px', borderRadius:8, background:'transparent', border:'1px dashed var(--border-mid)', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }}>+ Ajouter un bloc</button>
    </div>
  )
}

// ════════════════════════════════════════════════
// LAST 10 WEEKS MODAL (amélioré)
// ════════════════════════════════════════════════
function Last10WeeksModal({ weeks, onClose }: { weeks:{w:string;plannedH:number;doneH:number;tss:number;sport?:string}[]; onClose:()=>void }) {
  const [filterSport, setFilterSport] = useState<FilterSport>('all')
  const [tssInfoOpen, setTssInfoOpen] = useState(false)

  // Average TSS for color coding
  const avgTSS = weeks.length ? weeks.reduce((s,w)=>s+w.tss,0)/weeks.length : 0

  function tssColor(tss:number):string {
    if (tss < avgTSS * 0.8) return '#6b7280'  // gris — sous la normale
    if (tss <= avgTSS * 1.15) return '#22c55e' // vert — dans la norme
    return '#ef4444'                            // rouge — surmenage
  }

  const SPORT_FILTERS: {id:FilterSport;label:string}[] = [
    {id:'all',label:'Total'},
    {id:'run',label:'Running'},
    {id:'bike',label:'Cyclisme'},
    {id:'swim',label:'Natation'},
    {id:'hyrox',label:'Hyrox'},
    {id:'gym',label:'Muscu'},
    {id:'rowing',label:'Aviron'},
  ]

  const maxH = Math.max(...weeks.map(w=>w.plannedH), 1)

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:24, maxWidth:600, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        {tssInfoOpen && (
          <InfoModal
            title="Qu'est-ce que le TSS ?"
            content={
              <>
                <p><strong>TSS (Training Stress Score)</strong> mesure la charge d'entraînement d'une séance.</p>
                <p>Il est calculé à partir de l'<strong>intensité</strong> (zones) et de la <strong>durée</strong> :</p>
                <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, background:'var(--bg-card2)', padding:'8px 12px', borderRadius:8 }}>TSS = (durée en h) × IF² × 100</p>
                <p>où <strong>IF</strong> (Intensity Factor) = puissance normalisée / FTP pour le vélo, ou équivalent pour les autres sports.</p>
                <p><strong>Couleurs :</strong></p>
                <p>⬛ <span style={{color:'#6b7280'}}>Gris</span> — en dessous de ta normale</p>
                <p>🟩 <span style={{color:'#22c55e'}}>Vert</span> — progression régulière et saine</p>
                <p>🟥 <span style={{color:'#ef4444'}}>Rouge</span> — attention au surmenage (overreaching)</p>
              </>
            }
            onClose={()=>setTssInfoOpen(false)}
          />
        )}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:0 }}>Last 10 Weeks</h3>
            <p style={{ fontSize:12, color:'var(--text-dim)', margin:'3px 0 0' }}>Volume prévu vs réalisé</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:9, padding:'5px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>✕</button>
        </div>

        {/* Sport filter */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
          {SPORT_FILTERS.map(f => (
            <button key={f.id} onClick={()=>setFilterSport(f.id)} style={{ padding:'4px 10px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:11, whiteSpace:'nowrap', borderColor:filterSport===f.id?'#00c8e0':'var(--border)', background:filterSport===f.id?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:filterSport===f.id?'#00c8e0':'var(--text-mid)', fontWeight:filterSport===f.id?600:400 }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Volume bars */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>Volume</p>
            <div style={{ display:'flex', gap:10 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-mid)' }}><span style={{ width:10, height:10, borderRadius:2, background:'rgba(0,200,224,0.25)', border:'1px solid #00c8e044', display:'inline-block' }}/>Prévu</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-mid)' }}><span style={{ width:10, height:10, borderRadius:2, background:'#00c8e0', display:'inline-block' }}/>Réalisé</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120 }}>
            {weeks.map((w,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', gap:0 }}>
                <div style={{ width:'100%', position:'relative', display:'flex', justifyContent:'center', alignItems:'flex-end' }}>
                  <div style={{ width:'100%', height:`${(w.plannedH/maxH)*110}px`, background:'rgba(0,200,224,0.15)', border:'1px solid rgba(0,200,224,0.25)', borderRadius:'3px 3px 0 0', position:'absolute', bottom:0 }}/>
                  <div style={{ width:'60%', height:`${(w.doneH/maxH)*110}px`, background:w.doneH>=w.plannedH?'#00c8e0':'#ffb340', borderRadius:'3px 3px 0 0', position:'relative', zIndex:1, minHeight:2 }}/>
                </div>
                <p style={{ fontSize:8, fontFamily:'DM Mono,monospace', color:'var(--text-dim)', margin:'3px 0 0', textAlign:'center' }}>{w.w}</p>
                <p style={{ fontSize:8, fontFamily:'DM Mono,monospace', color:'#00c8e0', margin:'1px 0 0', textAlign:'center' }}>{w.doneH}h</p>
              </div>
            ))}
          </div>
        </div>

        {/* TSS section */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>TSS</p>
            <button onClick={()=>setTssInfoOpen(true)} style={{ width:18, height:18, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:10, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>!</button>
            <div style={{ display:'flex', gap:8 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#6b7280' }}><span style={{ width:10, height:10, borderRadius:2, background:'#6b7280', display:'inline-block' }}/>Sous la normale</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#22c55e' }}><span style={{ width:10, height:10, borderRadius:2, background:'#22c55e', display:'inline-block' }}/>Normal</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'#ef4444' }}><span style={{ width:10, height:10, borderRadius:2, background:'#ef4444', display:'inline-block' }}/>Surcharge</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80 }}>
            {weeks.map((w,i) => {
              const maxTSS = Math.max(...weeks.map(x=>x.tss), 1)
              const c = tssColor(w.tss)
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
                  <div style={{ width:'70%', height:`${(w.tss/maxTSS)*70}px`, background:c, borderRadius:'3px 3px 0 0', minHeight:2 }}/>
                  <p style={{ fontSize:8, fontFamily:'DM Mono,monospace', color:c, margin:'2px 0 0', textAlign:'center', fontWeight:700 }}>{w.tss}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats list */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {weeks.map((w,i) => {
            const pct = Math.round((w.doneH/Math.max(w.plannedH,0.1))*100)
            const c = pct>=90?'#22c55e':pct>=70?'#ffb340':'#ef4444'
            const tssc = tssColor(w.tss)
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:8, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)', width:28, flexShrink:0 }}>{w.w}</span>
                <div style={{ flex:1, height:5, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
                  <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:c, borderRadius:999 }}/>
                </div>
                <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-mid)', width:60, textAlign:'right' as const }}>{w.doneH}h / {w.plannedH}h</span>
                <span style={{ fontSize:10, fontWeight:700, color:c, width:32, textAlign:'right' as const }}>{pct}%</span>
                <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', fontWeight:700, color:tssc, width:50, textAlign:'right' as const }}>{w.tss} TSS</span>
              </div>
            )
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:14 }}>
          {[
            {l:'Volume prévu', v:`${weeks.reduce((s,w)=>s+w.plannedH,0)}h`, c:'var(--text-dim)'},
            {l:'Volume réalisé', v:`${weeks.reduce((s,w)=>s+w.doneH,0)}h`, c:'#00c8e0'},
            {l:'TSS total', v:String(weeks.reduce((s,w)=>s+w.tss,0)), c:'#ffb340'},
          ].map(x => (
            <div key={x.l} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px' }}>
              <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 4px' }}>{x.l}</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:x.c as string, margin:0 }}>{x.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// TRAINING TAB
// ════════════════════════════════════════════════
function TrainingTab() {
  const [week, setWeek] = useState<WeekDay[]>(emptyWeek())
  const [view, setView] = useState<TrainingView>('vertical')
  const [addModal, setAddModal] = useState<number|null>(null)
  const [detailModal, setDetailModal] = useState<Session|null>(null)
  const [dragOver, setDragOver] = useState<number|null>(null)
  const [show10w, setShow10w] = useState(false)
  const [intensityModal, setIntensityModal] = useState<DayIntensity|null>(null)
  const dragSession = useRef<{sessionId:string;fromDay:number}|null>(null)
  const touchSession = useRef<{sessionId:string;fromDay:number}|null>(null)

  // Empty 10 weeks (no mock data)
  const tenWeeks = Array.from({length:10},(_,i)=>({w:`S${i+1}`,plannedH:0,doneH:0,tss:0}))

  function addSession(dayIdx:number, session:Session) { setWeek(prev=>prev.map((d,i)=>i===dayIdx?{...d,sessions:[...d.sessions,session]}:d)) }
  function saveSession(s:Session) { setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.map(x=>x.id===s.id?s:x)}))); setDetailModal(null) }
  function validateSession(s:Session) { setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.map(x=>x.id===s.id?{...s,status:'done' as const}:x)}))); setDetailModal(null) }
  function deleteSession(id:string) { setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.filter(s=>s.id!==id)}))); setDetailModal(null) }
  function changeIntensity(dayIdx:number) { setWeek(prev=>prev.map((d,i)=>i!==dayIdx?d:{...d,intensity:INTENSITY_ORDER[(INTENSITY_ORDER.indexOf(d.intensity)+1)%INTENSITY_ORDER.length]})) }

  // Drag (desktop)
  function onDragStart(sessionId:string, fromDay:number) { dragSession.current={sessionId,fromDay} }
  function onDrop(toDay:number) {
    if(!dragSession.current)return
    const {sessionId,fromDay}=dragSession.current
    if(fromDay===toDay){dragSession.current=null;setDragOver(null);return}
    setWeek(prev=>{
      const s=prev[fromDay].sessions.find(x=>x.id===sessionId)
      if(!s)return prev
      return prev.map((d,i)=>{
        if(i===fromDay)return{...d,sessions:d.sessions.filter(x=>x.id!==sessionId)}
        if(i===toDay)return{...d,sessions:[...d.sessions,s]}
        return d
      })
    })
    dragSession.current=null; setDragOver(null)
  }

  // Touch drag (mobile)
  function onTouchStart(sessionId:string, fromDay:number) { touchSession.current={sessionId,fromDay} }
  function onTouchEnd(toDay:number) {
    if(!touchSession.current)return
    const {sessionId,fromDay}=touchSession.current
    if(fromDay!==toDay){
      setWeek(prev=>{
        const s=prev[fromDay].sessions.find(x=>x.id===sessionId)
        if(!s)return prev
        return prev.map((d,i)=>{
          if(i===fromDay)return{...d,sessions:d.sessions.filter(x=>x.id!==sessionId)}
          if(i===toDay)return{...d,sessions:[...d.sessions,s]}
          return d
        })
      })
    }
    touchSession.current=null
  }

  const allSessions = week.flatMap(d=>d.sessions)
  const plannedMin = allSessions.reduce((s,x)=>s+x.durationMin,0)
  const doneMin = allSessions.filter(s=>s.status==='done').reduce((s,x)=>s+x.durationMin,0)
  const plannedTSS = allSessions.reduce((s,x)=>s+(x.tss||0),0)
  const doneTSS = allSessions.filter(s=>s.status==='done').reduce((s,x)=>s+(x.tss||0),0)
  const plannedSessions = allSessions.length
  const doneSessions = allSessions.filter(s=>s.status==='done').length

  const sportStats = (['run','bike','swim','hyrox','triathlon','rowing','gym'] as SportType[]).map(sp=>{
    const planned = allSessions.filter(s=>s.sport===sp)
    const done = planned.filter(s=>s.status==='done')
    return { sport:sp, plannedH:planned.reduce((s,x)=>s+x.durationMin/60,0), doneH:done.reduce((s,x)=>s+x.durationMin/60,0) }
  }).filter(s=>s.plannedH>0)

  const sportCounts = (['run','bike','swim','hyrox','triathlon','rowing','gym'] as SportType[]).map(sp=>({
    sport:sp, planned:allSessions.filter(s=>s.sport===sp).length, done:allSessions.filter(s=>s.sport===sp&&s.status==='done').length
  })).filter(s=>s.planned>0)

  // Today's index
  const todayDow = new Date().getDay()
  const todayIdx = todayDow===0 ? 6 : todayDow-1
  const todaySessions = week[todayIdx]?.sessions || []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {show10w && <Last10WeeksModal weeks={tenWeeks} onClose={()=>setShow10w(false)}/>}
      {intensityModal && (
        <InfoModal
          title={INTENSITY_CONFIG[intensityModal].label}
          content={<p style={{margin:0}}>{intensityModal==='recovery'?'Journée sans séance ou très légère. Favorise la régénération.':intensityModal==='low'?'Faible intensité, favorise la récupération active.':intensityModal==='mid'?'Intensité modérée, fatigue contrôlée et progressive.':'Forte intensité. Nécessite plusieurs jours de récupération ensuite.'}</p>}
          onClose={()=>setIntensityModal(null)}
        />
      )}
      {addModal!==null && (
        <div onClick={()=>setAddModal(null)} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
          <AddSessionModalContent dayIndex={addModal} onClose={()=>setAddModal(null)} onAdd={addSession}/>
        </div>
      )}
      {detailModal && (
        <div onClick={()=>setDetailModal(null)} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
          <SessionDetailContent session={detailModal} onClose={()=>setDetailModal(null)} onSave={saveSession} onValidate={validateSession} onDelete={deleteSession}/>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, boxShadow:'var(--shadow-card)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>Volume</p>
            <button onClick={()=>setShow10w(true)} style={{ fontSize:9, padding:'2px 7px', borderRadius:6, background:'rgba(0,200,224,0.10)', border:'1px solid rgba(0,200,224,0.25)', color:'#00c8e0', cursor:'pointer', fontWeight:600 }}>Last 10W</button>
          </div>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 1px', fontFamily:'DM Mono,monospace' }}>Prévu {formatDur(plannedMin)}</p>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#00c8e0', margin:'0 0 8px' }}>{formatDur(doneMin)}</p>
          <div style={{ height:5, borderRadius:999, overflow:'hidden', background:'var(--border)', marginBottom:6 }}>
            <div style={{ height:'100%', width:`${plannedMin?Math.min(doneMin/plannedMin*100,100):0}%`, background:'#00c8e0', borderRadius:999 }}/>
          </div>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:0 }}>{plannedMin?Math.round(doneMin/plannedMin*100):0}% réalisé</p>
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 8px' }}>Séances</p>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 1px', fontFamily:'DM Mono,monospace' }}>Prévu {plannedSessions}</p>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#ffb340', margin:'0 0 8px' }}>{doneSessions}</p>
          <div style={{ height:5, borderRadius:999, overflow:'hidden', background:'var(--border)', marginBottom:6 }}>
            <div style={{ height:'100%', width:`${plannedSessions?Math.min(doneSessions/plannedSessions*100,100):0}%`, background:'#ffb340', borderRadius:999 }}/>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const, marginTop:4 }}>
            {sportCounts.map(s=><span key={s.sport} style={{ fontSize:9, color:SPORT_BORDER[s.sport], fontFamily:'DM Mono,monospace' }}>{SPORT_EMOJI[s.sport]} {s.done}/{s.planned}</span>)}
          </div>
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, boxShadow:'var(--shadow-card)', gridColumn:'span 2' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>TSS</p>
              <button onClick={()=>setShow10w(true)} style={{ fontSize:9, padding:'2px 7px', borderRadius:6, background:'rgba(91,111,255,0.10)', border:'1px solid rgba(91,111,255,0.25)', color:'#5b6fff', cursor:'pointer', fontWeight:600 }}>Last 10W</button>
            </div>
          </div>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 1px', fontFamily:'DM Mono,monospace' }}>Prévu {plannedTSS} pts</p>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#5b6fff', margin:'0 0 8px' }}>{doneTSS} pts</p>
          <div style={{ height:5, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
            <div style={{ height:'100%', width:`${plannedTSS?Math.min(doneTSS/plannedTSS*100,100):0}%`, background:'#5b6fff', borderRadius:999 }}/>
          </div>
        </div>
      </div>

      {/* Volume par discipline */}
      {sportStats.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 12px' }}>Volume par discipline</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sportStats.map(s => {
              const pct = s.plannedH > 0 ? Math.min(s.doneH/s.plannedH*100,100) : 0
              const c = SPORT_BORDER[s.sport]
              return (
                <div key={s.sport}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                      <span>{SPORT_EMOJI[s.sport]}</span>
                      <span style={{ fontWeight:500, color:'var(--text-mid)' }}>{SPORT_LABEL[s.sport]}</span>
                    </span>
                    <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:c, fontWeight:600 }}>{s.doneH.toFixed(1)}h <span style={{ color:'var(--text-dim)', fontWeight:400 }}>/ {s.plannedH.toFixed(1)}h</span></span>
                  </div>
                  <div style={{ height:6, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${c}bb,${c})`, borderRadius:999 }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Séances du jour */}
      {todaySessions.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:16, boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 10px' }}>
            📍 Aujourd'hui — {week[todayIdx]?.day} {week[todayIdx]?.date}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {todaySessions.map(s => (
              <div key={s.id} onClick={()=>setDetailModal(s)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', borderRadius:10, background:SPORT_BG[s.sport], borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`, cursor:'pointer' }}>
                <span style={{ fontSize:20 }}>{SPORT_EMOJI[s.sport]}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>{s.title}</p>
                  <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{s.time} · {formatDur(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
                </div>
                <span style={{ padding:'4px 10px', borderRadius:20, background:s.status==='done'?`${SPORT_BORDER[s.sport]}22`:'var(--bg-card2)', border:`1px solid ${s.status==='done'?SPORT_BORDER[s.sport]:'var(--border)'}`, color:s.status==='done'?SPORT_BORDER[s.sport]:'var(--text-dim)', fontSize:10, fontWeight:600 }}>
                  {s.status==='done'?'✓ Fait':'À faire'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View switch */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>Semaine en cours</p>
        <div style={{ display:'flex', gap:6 }}>
          {([['vertical','⊟ Vertical'],['horizontal','⊞ Horizontal']] as [TrainingView,string][]).map(([v,l]) => (
            <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 11px', borderRadius:8, border:'1px solid', fontSize:11, cursor:'pointer', borderColor:view===v?'#00c8e0':'var(--border)', background:view===v?'rgba(0,200,224,0.10)':'var(--bg-card)', color:view===v?'#00c8e0':'var(--text-mid)', fontWeight:view===v?600:400 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* VERTICAL VIEW */}
      {view==='vertical' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'var(--shadow-card)', overflowX:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', borderBottom:'1px solid var(--border)', background:'var(--bg-card2)', minWidth:540 }}>
            <div style={{ padding:'10px 8px' }}/>
            {week.map((d,dayIdx) => { const cfg=INTENSITY_CONFIG[d.intensity]; return (
              <div key={d.day} style={{ padding:'8px 4px', textAlign:'center' as const, borderLeft:'1px solid var(--border)', minWidth:72 }}>
                <p style={{ fontSize:10, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.06em', margin:'0 0 2px', fontWeight:500 }}>{d.day}</p>
                <p style={{ fontSize:14, fontWeight:700, margin:'0 0 4px' }}>{d.date}</p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{ padding:'1px 6px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color, fontSize:9, fontWeight:700, cursor:'pointer' }}>{cfg.label}</button>
                  <button onClick={()=>changeIntensity(dayIdx)} style={{ width:13, height:13, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>+</button>
                </div>
              </div>
            )})}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', minWidth:540 }}>
            <div style={{ padding:'8px', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingTop:12 }}>
              <span style={{ fontSize:9, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.05em', writingMode:'vertical-rl' as const, transform:'rotate(180deg)' }}>Séances</span>
            </div>
            {week.map((d,dayIdx) => (
              <div key={d.day}
                onDragOver={e=>{e.preventDefault();setDragOver(dayIdx)}}
                onDragLeave={()=>setDragOver(null)}
                onDrop={()=>onDrop(dayIdx)}
                onTouchEnd={()=>onTouchEnd(dayIdx)}
                style={{ borderLeft:'1px solid var(--border)', padding:'6px 4px', background:dragOver===dayIdx?'rgba(0,200,224,0.04)':'transparent', transition:'all 0.15s', minWidth:72, minHeight:80 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {d.sessions.map(s => (
                    <div key={s.id}
                      draggable
                      onDragStart={()=>onDragStart(s.id,dayIdx)}
                      onTouchStart={()=>onTouchStart(s.id,dayIdx)}
                      onClick={()=>setDetailModal(s)}
                      style={{ borderRadius:6, padding:'4px 6px', background:SPORT_BG[s.sport], borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`, cursor:'grab', opacity:s.status==='done'?0.75:1, position:'relative' }}>
                      {s.status==='done' && <span style={{ position:'absolute', top:2, right:2, fontSize:7, background:SPORT_BORDER[s.sport], color:'#fff', padding:'1px 3px', borderRadius:2, fontWeight:700 }}>✓</span>}
                      <p style={{ fontSize:9, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{SPORT_EMOJI[s.sport]} {s.title}</p>
                      <p style={{ fontSize:8, opacity:0.7, margin:'1px 0 0', fontFamily:'DM Mono,monospace' }}>{s.time}</p>
                      {s.blocks.length>0 && <div style={{ display:'flex', gap:1, marginTop:2, height:4, borderRadius:1, overflow:'hidden' }}>{s.blocks.map(b=><div key={b.id} style={{ flex:b.durationMin, background:ZONE_COLORS[b.zone-1], opacity:0.8 }}/>)}</div>}
                    </div>
                  ))}
                  <button onClick={()=>setAddModal(dayIdx)} style={{ marginTop:2, padding:'3px', borderRadius:5, background:'transparent', border:'1px dashed var(--border)', color:'var(--text-dim)', fontSize:9, cursor:'pointer', width:'100%' }}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HORIZONTAL VIEW */}
      {view==='horizontal' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {week.map((d,dayIdx) => { const cfg=INTENSITY_CONFIG[d.intensity]; return (
            <div key={d.day}
              onTouchEnd={()=>onTouchEnd(dayIdx)}
              style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:13, padding:13, boxShadow:'var(--shadow-card)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:d.sessions.length?8:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ textAlign:'center' as const, minWidth:32 }}>
                    <p style={{ fontSize:9, color:'var(--text-dim)', textTransform:'uppercase' as const, margin:0 }}>{d.day}</p>
                    <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>{d.date}</p>
                  </div>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{ padding:'2px 8px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color, fontSize:10, fontWeight:700, cursor:'pointer' }}>{cfg.label}</button>
                  <button onClick={()=>changeIntensity(dayIdx)} style={{ width:20, height:20, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>+</button>
                </div>
                <button onClick={()=>setAddModal(dayIdx)} style={{ padding:'4px 9px', borderRadius:7, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:11, cursor:'pointer', fontWeight:600 }}>+ Ajouter</button>
              </div>
              {d.sessions.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {d.sessions.map(s => (
                    <div key={s.id}
                      draggable
                      onDragStart={()=>onDragStart(s.id,dayIdx)}
                      onTouchStart={()=>onTouchStart(s.id,dayIdx)}
                      onClick={()=>setDetailModal(s)}
                      style={{ display:'flex', flexDirection:'column', padding:'8px 10px', borderRadius:9, background:SPORT_BG[s.sport], borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`, cursor:'pointer', opacity:s.status==='done'?0.75:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:s.blocks.length?4:0 }}>
                        <span style={{ fontSize:14 }}>{SPORT_EMOJI[s.sport]}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:s.main?600:400, margin:0 }}>{s.title}{s.status==='done'&&<span style={{ marginLeft:5, fontSize:8, background:SPORT_BORDER[s.sport], color:'#fff', padding:'1px 4px', borderRadius:3, fontWeight:700 }}>✓</span>}</p>
                          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{s.time} · {formatDur(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
                        </div>
                      </div>
                      {s.blocks.length > 0 && <div style={{ display:'flex', gap:1, height:8, borderRadius:2, overflow:'hidden' }}>{s.blocks.map(b=><div key={b.id} style={{ flex:b.durationMin, background:ZONE_COLORS[b.zone-1], opacity:0.75 }}/>)}</div>}
                    </div>
                  ))}
                </div>
              )}
              {d.sessions.length === 0 && <p style={{ fontSize:11, color:'var(--text-dim)', margin:0, fontStyle:'italic' as const }}>Jour de repos</p>}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

// ── Session modals ────────────────────────────────
function AddSessionModalContent({ dayIndex, onClose, onAdd }: { dayIndex:number; onClose:()=>void; onAdd:(i:number,s:Session)=>void }) {
  const [sport, setSport] = useState<SportType>('run')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [dur, setDur] = useState('60')
  const [rpe, setRpe] = useState(5)
  const [notes, setNotes] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const isEnd = ['run','bike','swim'].includes(sport)
  const tss = calcTSS(blocks, sport)
  const totalMin = blocks.reduce((s,b)=>s+b.durationMin, 0)
  return (
    <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:520, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Nouvelle séance</h3>
        <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
      </div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:14 }}>
        {(Object.keys(SPORT_LABEL) as SportType[]).map(s => (
          <button key={s} onClick={()=>{setSport(s);setBlocks([])}} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid', borderColor:sport===s?SPORT_BORDER[s]:'var(--border)', background:sport===s?SPORT_BG[s]:'var(--bg-card2)', color:sport===s?SPORT_BORDER[s]:'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:sport===s?600:400 }}>
            {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
          </button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:9, marginBottom:11 }}>
        <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Titre</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${SPORT_LABEL[sport]} Z2`} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
        <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Heure</p><input value={time} onChange={e=>setTime(e.target.value)} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
        <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Durée (min)</p><input type="number" value={dur} onChange={e=>setDur(e.target.value)} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
      </div>
      <div style={{ marginBottom:11 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
          <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)' }}>RPE</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:rpe<=3?'#22c55e':rpe<=6?'#ffb340':'#ef4444' }}>{rpe.toFixed(1)}/10</span>
        </div>
        <input type="range" min={0} max={10} step={0.5} value={rpe} onChange={e=>setRpe(parseFloat(e.target.value))} style={{ width:'100%', accentColor:'#00c8e0', cursor:'pointer' }}/>
      </div>
      {isEnd && (
        <div style={{ marginBottom:11 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:8 }}>Blocs d'intensité</p>
          <BlockBuilder sport={sport} blocks={blocks} onChange={setBlocks}/>
          {blocks.length > 0 && (
            <div style={{ display:'flex', gap:14, marginTop:6, fontSize:10, color:'var(--text-dim)' }}>
              <span>Durée : <strong style={{ color:'var(--text)', fontFamily:'DM Mono,monospace' }}>{formatDur(totalMin)}</strong></span>
              <span>TSS : <strong style={{ color:SPORT_BORDER[sport], fontFamily:'DM Mono,monospace' }}>{tss} pts</strong></span>
            </div>
          )}
        </div>
      )}
      <div style={{ marginBottom:14 }}>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Notes</p>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', resize:'none' as const }}/>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
        <button onClick={()=>{onAdd(dayIndex,{id:`s_${Date.now()}`,sport,title:title||SPORT_LABEL[sport],time,durationMin:totalMin||parseInt(dur)||60,tss:tss||undefined,status:'planned',notes:notes||undefined,blocks,rpe});onClose()}} style={{ flex:2, padding:10, borderRadius:10, background:`linear-gradient(135deg,${SPORT_BORDER[sport]},#5b6fff)`, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>+ Ajouter</button>
      </div>
    </div>
  )
}

function SessionDetailContent({ session, onClose, onSave, onValidate, onDelete }: { session:Session; onClose:()=>void; onSave:(s:Session)=>void; onValidate:(s:Session)=>void; onDelete:(id:string)=>void }) {
  const [tab, setTab] = useState<'view'|'edit'|'validate'>('view')
  const [form, setForm] = useState<Session>({...session, blocks:[...session.blocks]})
  const isEnd = ['run','bike','swim'].includes(session.sport)
  const speed = calcSpeed(form.vDistance||'', form.vDuration||'')
  const pace = calcPaceStr(form.vDistance||'', form.vDuration||'')
  return (
    <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:540, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:SPORT_BG[session.sport], display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{SPORT_EMOJI[session.sport]}</div>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>{session.title}</p>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{session.time} · {formatDur(session.durationMin)}{session.tss?` · ${session.tss} TSS`:''}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
      </div>
      <div style={{ display:'flex', gap:5, marginBottom:16 }}>
        {(['view','edit','validate'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', borderColor:tab===t?SPORT_BORDER[session.sport]:'var(--border)', background:tab===t?SPORT_BG[session.sport]:'var(--bg-card2)', color:tab===t?SPORT_BORDER[session.sport]:'var(--text-mid)', fontSize:11, fontWeight:tab===t?600:400, cursor:'pointer' }}>
            {t==='view'?'📊 Graphique':t==='edit'?'✏️ Modifier':'✅ Valider'}
          </button>
        ))}
      </div>
      {tab==='view' && (
        <div>
          {session.blocks.length > 0 ? (
            <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:70, marginBottom:4 }}>
                {session.blocks.map(b => { const total=session.blocks.reduce((s,x)=>s+x.durationMin,0); const hp=((b.zone/5)*0.85+0.05)*100, wp=(b.durationMin/total)*100, c=ZONE_COLORS[b.zone-1]; return <div key={b.id} style={{ width:`${wp}%`, height:`${hp}%`, background:`linear-gradient(180deg,${c}ee,${c}55)`, borderRadius:'4px 4px 0 0', border:`1px solid ${c}88`, minWidth:5 }}/> })}
              </div>
            </div>
          ) : <p style={{ fontSize:12, color:'var(--text-dim)', textAlign:'center' as const, padding:'14px 0' }}>Aucun bloc — modifier pour en ajouter.</p>}
          {session.blocks.map(b => (
            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 9px', borderRadius:7, background:`${ZONE_COLORS[b.zone-1]}11`, borderLeft:`2px solid ${ZONE_COLORS[b.zone-1]}`, marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:700, color:ZONE_COLORS[b.zone-1], width:17, flexShrink:0 }}>Z{b.zone}</span>
              <span style={{ flex:1, fontSize:11 }}>{b.label}</span>
              <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{formatDur(b.durationMin)}</span>
              {b.value && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:ZONE_COLORS[b.zone-1] }}>{b.value}{session.sport==='bike'?'W':''}</span>}
            </div>
          ))}
        </div>
      )}
      {tab==='edit' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:9, marginBottom:11 }}>
            {[{k:'title',l:'Titre'},{k:'time',l:'Heure'},{k:'durationMin',l:'Durée (min)'}].map(f => (
              <div key={f.k}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{f.l}</p><input value={(form as any)[f.k]??''} onChange={e=>setForm({...form,[f.k]:e.target.value})} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
            ))}
          </div>
          <div style={{ marginBottom:11 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Notes</p>
            <textarea value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', resize:'none' as const }}/>
          </div>
          {isEnd && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:8 }}>Blocs</p>
              <BlockBuilder sport={session.sport} blocks={form.blocks} onChange={blocks=>setForm({...form,blocks,tss:calcTSS(blocks,session.sport)})}/>
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>onDelete(session.id)} style={{ padding:'9px 12px', borderRadius:10, background:'rgba(255,95,95,0.10)', border:'1px solid rgba(255,95,95,0.25)', color:'#ff5f5f', fontSize:12, cursor:'pointer' }}>Supprimer</button>
            <button onClick={()=>onSave(form)} style={{ flex:1, padding:10, borderRadius:10, background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>Sauvegarder</button>
          </div>
        </>
      )}
      {tab==='validate' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:14 }}>
            <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Durée (min)</p><input value={form.vDuration??''} onChange={e=>setForm({...form,vDuration:e.target.value})} placeholder={String(session.durationMin)} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
            <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Distance (km)</p><input value={form.vDistance??''} onChange={e=>setForm({...form,vDistance:e.target.value})} placeholder="10" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
            <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>FC moyenne</p><input value={form.vHrAvg??''} onChange={e=>setForm({...form,vHrAvg:e.target.value})} placeholder="158bpm" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
            <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Dénivelé (m)</p><input value={form.vElevation??''} onChange={e=>setForm({...form,vElevation:e.target.value})} placeholder="0" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
            {form.vDuration && form.vDistance && (
              <>
                <div style={{ padding:'7px 10px', borderRadius:8, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)' }}>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Vitesse auto</p>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'#00c8e0', margin:0 }}>{speed}</p>
                </div>
                {session.sport==='run' && (
                  <div style={{ padding:'7px 10px', borderRadius:8, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}>
                    <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Allure auto</p>
                    <p style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'#22c55e', margin:0 }}>{pace}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <button onClick={()=>{const done=parseInt(form.vDuration||'0');const pct=session.durationMin&&done?Math.min(Math.round((done/session.durationMin)*100),100):100;onValidate({...form,status:'done',completionPct:pct,vSpeed:speed,vPace:pace})}} style={{ width:'100%', padding:12, borderRadius:10, background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>✓ Confirmer {form.vDuration&&session.durationMin?`— ${Math.min(Math.round((parseInt(form.vDuration)/session.durationMin)*100),100)}%`:''}</button>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// WEEK TAB
// ════════════════════════════════════════════════
function WeekTab({ trainingWeek }: { trainingWeek:WeekDay[] }) {
  const [tasks, setTasks] = useState<WeekTask[]>([])
  const [taskModal, setTaskModal] = useState<{dayIndex:number;startHour:number}|null>(null)
  const [editModal, setEditModal] = useState<WeekTask|null>(null)
  const [mobileDayOffset, setMobileDayOffset] = useState(0)
  const [mobileView, setMobileView] = useState<'3days'|'today'>('3days')

  // Today index
  const todayDow = new Date().getDay()
  const todayIdx = todayDow===0 ? 6 : todayDow-1

  const trainingTasks: WeekTask[] = trainingWeek.flatMap((d,dayIndex) =>
    d.sessions.map(s => ({
      id:`tr_${s.id}`, title:`${SPORT_EMOJI[s.sport]} ${s.title}`, type:'sport' as TaskType, dayIndex,
      startHour:parseInt(s.time.split(':')[0])||6, startMin:parseInt(s.time.split(':')[1])||0,
      durationMin:s.durationMin, fromTraining:true, sessionId:s.id, color:SPORT_BORDER[s.sport],
    }))
  )

  const allTasks = [...trainingTasks, ...tasks]
  function getTasksForDay(dayIndex:number) { return allTasks.filter(t=>t.dayIndex===dayIndex) }
  function dayLoad(dayIndex:number) { return INTENSITY_CONFIG[trainingWeek[dayIndex]?.intensity||'recovery'] }
  function addTask(t:Omit<WeekTask,'id'>) { setTasks(p=>[...p,{...t,id:uid()}]); setTaskModal(null) }
  function updateTask(t:WeekTask) { setTasks(p=>p.map(x=>x.id===t.id?t:x)); setEditModal(null) }
  function deleteTask(id:string) { setTasks(p=>p.filter(x=>x.id!==id)); setEditModal(null) }

  // Mobile: which days to show
  const mobileVisibleDays = mobileView==='today'
    ? [todayIdx]
    : [mobileDayOffset, mobileDayOffset+1, mobileDayOffset+2].filter(i=>i<7)

  const dayLabels = trainingWeek.map(d=>`${d.day} ${d.date}`)

  const taskCell = (t:WeekTask) => {
    const cfg = TASK_CONFIG[t.type]
    const border = t.fromTraining ? (t.color||cfg.color) : cfg.color
    return (
      <div key={t.id} onClick={e=>{e.stopPropagation();if(!t.fromTraining)setEditModal(t)}}
        style={{ borderRadius:5, padding:'3px 5px', background:t.fromTraining?`${border}22`:cfg.bg, borderLeft:`2px solid ${border}`, cursor:t.fromTraining?'default':'pointer', position:'relative', marginBottom:2 }}>
        {t.priority && <span style={{ position:'absolute', top:1, right:2, fontSize:8 }}>⭐</span>}
        <p style={{ fontSize:9, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, color:t.fromTraining?border:'var(--text)', paddingRight:t.priority?10:0 }}>{t.title}</p>
        <p style={{ fontSize:8, color:'var(--text-dim)', margin:'1px 0 0' }}>{formatDur(t.durationMin)}</p>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Mobile controls */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {/* View toggle mobile */}
        <div style={{ display:'flex', gap:5, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:4 }}>
          {([['today','Aujourd\'hui'],['3days','3 jours']] as ['today'|'3days',string][]).map(([v,l]) => (
            <button key={v} onClick={()=>setMobileView(v)} style={{ padding:'5px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, background:mobileView===v?'var(--bg-card2)':'transparent', color:mobileView===v?'var(--text)':'var(--text-dim)', fontWeight:mobileView===v?600:400 }}>{l}</button>
          ))}
        </div>
        {/* Desktop label */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {Object.entries(TASK_CONFIG).map(([type,cfg]) => (
            <span key={type} style={{ padding:'2px 8px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.color}44`, fontSize:9, color:cfg.color, fontWeight:600 }}>{cfg.label}</span>
          ))}
        </div>
      </div>

      {/* Mobile 3-day nav */}
      {mobileView==='3days' && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:11, padding:'7px 13px' }}>
          <button onClick={()=>setMobileDayOffset(Math.max(0,mobileDayOffset-1))} disabled={mobileDayOffset===0} style={{ background:'none', border:'none', color:mobileDayOffset===0?'var(--border)':'var(--text-mid)', cursor:'pointer', fontSize:16, padding:'2px 6px' }}>←</button>
          <span style={{ fontSize:12, fontWeight:600 }}>{dayLabels[mobileDayOffset]} — {dayLabels[Math.min(mobileDayOffset+2,6)]}</span>
          <button onClick={()=>setMobileDayOffset(Math.min(4,mobileDayOffset+1))} disabled={mobileDayOffset>=4} style={{ background:'none', border:'none', color:mobileDayOffset>=4?'var(--border)':'var(--text-mid)', cursor:'pointer', fontSize:16, padding:'2px 6px' }}>→</button>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'var(--shadow-card)' }}>
        {/* MOBILE headers */}
        <div style={{ display:'grid', gridTemplateColumns:`44px repeat(${mobileVisibleDays.length},1fr)`, borderBottom:'1px solid var(--border)', background:'var(--bg-card2)' }} className="md:hidden">
          <div/>
          {mobileVisibleDays.map(dayIdx => { const load=dayLoad(dayIdx); return (
            <div key={dayIdx} style={{ padding:'7px 4px', textAlign:'center' as const, borderLeft:'1px solid var(--border)' }}>
              <p style={{ fontSize:9, color:'var(--text-dim)', textTransform:'uppercase' as const, margin:'0 0 1px' }}>{trainingWeek[dayIdx]?.day}</p>
              <p style={{ fontSize:13, fontWeight:700, margin:'0 0 3px' }}>{trainingWeek[dayIdx]?.date}</p>
              <span style={{ padding:'1px 5px', borderRadius:20, background:load.bg, border:`1px solid ${load.border}`, color:load.color, fontSize:8, fontWeight:700 }}>{load.label}</span>
            </div>
          )})}
        </div>

        {/* DESKTOP headers — 7 jours */}
        <div style={{ display:'grid', gridTemplateColumns:'44px repeat(7,1fr)', borderBottom:'1px solid var(--border)', background:'var(--bg-card2)' }} className="hidden md:grid">
          <div/>
          {trainingWeek.map((d,dayIdx) => { const load=dayLoad(dayIdx); return (
            <div key={dayIdx} style={{ padding:'7px 5px', textAlign:'center' as const, borderLeft:'1px solid var(--border)' }}>
              <p style={{ fontSize:10, color:'var(--text-dim)', textTransform:'uppercase' as const, margin:'0 0 1px' }}>{d.day}</p>
              <p style={{ fontSize:13, fontWeight:700, margin:'0 0 3px' }}>{d.date}</p>
              <span style={{ padding:'1px 5px', borderRadius:20, background:load.bg, border:`1px solid ${load.border}`, color:load.color, fontSize:8, fontWeight:700 }}>{load.label}</span>
            </div>
          )})}
        </div>

        {/* Time rows */}
        <div style={{ overflowY:'auto', maxHeight:'58vh' }}>
          {HOURS.map(hour => (
            <div key={hour}>
              {/* MOBILE rows */}
              <div style={{ display:'grid', gridTemplateColumns:`44px repeat(${mobileVisibleDays.length},1fr)`, borderBottom:'1px solid var(--border)', minHeight:48 }} className="md:hidden">
                <div style={{ padding:'3px 5px', display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
                  <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)', marginTop:2 }}>{String(hour).padStart(2,'0')}h</span>
                </div>
                {mobileVisibleDays.map(dayIdx => (
                  <div key={dayIdx} onClick={()=>setTaskModal({dayIndex:dayIdx,startHour:hour})}
                    style={{ borderLeft:'1px solid var(--border)', padding:'2px 3px', cursor:'pointer', minHeight:48 }}>
                    {getTasksForDay(dayIdx).filter(t=>t.startHour===hour).map(t=>taskCell(t))}
                  </div>
                ))}
              </div>
              {/* DESKTOP rows — 7 jours */}
              <div style={{ display:'grid', gridTemplateColumns:'44px repeat(7,1fr)', borderBottom:'1px solid var(--border)', minHeight:48 }} className="hidden md:grid">
                <div style={{ padding:'3px 5px', display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
                  <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)', marginTop:2 }}>{String(hour).padStart(2,'0')}h</span>
                </div>
                {trainingWeek.map((_,dayIdx) => (
                  <div key={dayIdx} onClick={()=>setTaskModal({dayIndex:dayIdx,startHour:hour})}
                    style={{ borderLeft:'1px solid var(--border)', padding:'2px 3px', cursor:'pointer', minHeight:48 }}>
                    {getTasksForDay(dayIdx).filter(t=>t.startHour===hour).map(t=>taskCell(t))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {taskModal && <TaskModal dayIndex={taskModal.dayIndex} startHour={taskModal.startHour} onClose={()=>setTaskModal(null)} onSave={addTask}/>}
      {editModal && <TaskEditModal task={editModal} onClose={()=>setEditModal(null)} onSave={updateTask} onDelete={deleteTask}/>}
    </div>
  )
}

function TaskModal({ dayIndex, startHour, onClose, onSave }: { dayIndex:number; startHour:number; onClose:()=>void; onSave:(t:Omit<WeekTask,'id'>)=>void }) {
  const [title,setTitle]=useState('')
  const [type,setType]=useState<TaskType>('work')
  const [sh,setSh]=useState(startHour)
  const [sm,setSm]=useState(0)
  const [dur,setDur]=useState(60)
  const [priority,setPriority]=useState(false)
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:420, width:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Nouvelle tâche</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:12 }}>
          {(Object.entries(TASK_CONFIG) as [TaskType,{label:string;color:string;bg:string}][]).map(([t,cfg]) => (
            <button key={t} onClick={()=>setType(t)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid', borderColor:type===t?cfg.color:'var(--border)', background:type===t?cfg.bg:'var(--bg-card2)', color:type===t?cfg.color:'var(--text-mid)', fontSize:12, cursor:'pointer', fontWeight:type===t?600:400 }}>{cfg.label}</button>
          ))}
        </div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Titre</p>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nom de la tâche" style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none' }}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Heure</p><input type="number" min={5} max={23} value={sh} onChange={e=>setSh(parseInt(e.target.value))} style={{ width:'100%', padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Min</p><select value={sm} onChange={e=>setSm(parseInt(e.target.value))} style={{ width:'100%', padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}><option value={0}>:00</option><option value={15}>:15</option><option value={30}>:30</option><option value={45}>:45</option></select></div>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Durée (min)</p><input type="number" min={15} step={15} value={dur} onChange={e=>setDur(parseInt(e.target.value))} style={{ width:'100%', padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, cursor:'pointer' }} onClick={()=>setPriority(!priority)}>
          <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${priority?'#ffb340':'var(--border)'}`, background:priority?'#ffb340':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{priority&&<span style={{ color:'#fff', fontSize:12 }}>✓</span>}</div>
          <p style={{ fontSize:13, fontWeight:500, margin:0, color:priority?'#ffb340':'var(--text-mid)' }}>⭐ Tâche prioritaire</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({title:title||'Tâche',type,dayIndex,startHour:sh,startMin:sm,durationMin:dur,priority})} style={{ flex:2, padding:10, borderRadius:10, background:`linear-gradient(135deg,${TASK_CONFIG[type].color},#5b6fff)`, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>+ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function TaskEditModal({ task, onClose, onSave, onDelete }: { task:WeekTask; onClose:()=>void; onSave:(t:WeekTask)=>void; onDelete:(id:string)=>void }) {
  const [form, setForm] = useState<WeekTask>({...task})
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:400, width:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Modifier la tâche</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Titre</p><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Heure</p><input type="number" value={form.startHour} onChange={e=>setForm({...form,startHour:parseInt(e.target.value)})} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Durée (min)</p><input type="number" value={form.durationMin} onChange={e=>setForm({...form,durationMin:parseInt(e.target.value)})} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, cursor:'pointer' }} onClick={()=>setForm({...form,priority:!form.priority})}>
          <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${form.priority?'#ffb340':'var(--border)'}`, background:form.priority?'#ffb340':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{form.priority&&<span style={{ color:'#fff', fontSize:12 }}>✓</span>}</div>
          <p style={{ fontSize:13, margin:0, color:form.priority?'#ffb340':'var(--text-mid)' }}>⭐ Prioritaire</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>onDelete(task.id)} style={{ padding:'9px 12px', borderRadius:10, background:'rgba(255,95,95,0.10)', border:'1px solid rgba(255,95,95,0.25)', color:'#ff5f5f', fontSize:12, cursor:'pointer' }}>Supprimer</button>
          <button onClick={()=>onSave(form)} style={{ flex:1, padding:10, borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>Sauvegarder</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// RACE YEAR TAB
// ════════════════════════════════════════════════
function RaceYearTab() {
  const [races, setRaces] = useState<Race[]>([])
  const [calView, setCalView] = useState<CalView>('year')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [addModal, setAddModal] = useState<{month:number;day?:number}|null>(null)
  const [detailModal, setDetailModal] = useState<Race|null>(null)
  const [editModal, setEditModal] = useState<Race|null>(null)
  const year = new Date().getFullYear()

  const gty = races.find(r=>r.level==='gty')
  const nextRace = races.filter(r=>daysUntil(r.date)>0).sort((a,b)=>daysUntil(a.date)-daysUntil(b.date))[0]

  function addRace(r:Omit<Race,'id'>) { setRaces(p=>[...p,{...r,id:uid()}]); setAddModal(null) }
  function updateRace(r:Race) { setRaces(p=>p.map(x=>x.id===r.id?r:x)); setEditModal(null) }
  function deleteRace(id:string) { setRaces(p=>p.filter(r=>r.id!==id)); setDetailModal(null) }
  function validateRace(r:Race) { setRaces(p=>p.map(x=>x.id===r.id?r:x)); setDetailModal(null) }

  function getRacesForMonth(month:number) { return races.filter(r=>{const d=new Date(r.date);return d.getFullYear()===year&&d.getMonth()===month}) }
  function getDaysInMonth(month:number) { return new Date(year,month+1,0).getDate() }
  function getFirstDayOfMonth(month:number) { return new Date(year,month,1).getDay()||7 }

  // Compteur par sport — simple, sans couleur
  const RACE_SPORTS_LIST: RaceSport[] = ['run','bike','swim','hyrox','triathlon','rowing']
  const sportCounts = RACE_SPORTS_LIST.map(sp=>({sport:sp, count:races.filter(r=>r.sport===sp).length})).filter(x=>x.count>0)
  const raceByLevel = (['gty','main','important','secondary'] as RaceLevel[]).map(l=>({level:l, count:races.filter(r=>r.level===l).length})).filter(x=>x.count>0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* GTY banner */}
      {gty && (
        <div style={{ padding:'14px 18px', borderRadius:14, background:'var(--gty-bg)', border:'2px solid var(--gty-border)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' as const }}>
          <span style={{ fontSize:28 }}>⚫</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'var(--gty-text)', opacity:0.6, margin:'0 0 2px' }}>Goal of the Year</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'var(--gty-text)', margin:'0 0 2px' }}>{gty.name}</p>
            {gty.goal && <p style={{ fontSize:12, color:'var(--gty-text)', opacity:0.7, margin:0 }}>🎯 {gty.goal}</p>}
          </div>
          <div style={{ textAlign:'center' as const }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:30, fontWeight:800, color:'var(--gty-text)', margin:0, lineHeight:1 }}>{Math.max(0,daysUntil(gty.date))}</p>
            <p style={{ fontSize:10, color:'var(--gty-text)', opacity:0.6, margin:0 }}>jours restants</p>
            <p style={{ fontSize:11, color:'var(--gty-text)', opacity:0.8, margin:'2px 0 0' }}>{new Date(gty.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</p>
          </div>
        </div>
      )}

      {/* Header — sans bouton + Course redondant */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' as const, gap:8 }}>
        <div style={{ display:'flex', gap:5 }}>
          {([['year','Vue annuelle'],['month','Vue mensuelle']] as [CalView,string][]).map(([v,l]) => (
            <button key={v} onClick={()=>setCalView(v)} style={{ padding:'6px 12px', borderRadius:9, border:'1px solid', borderColor:calView===v?'#00c8e0':'var(--border)', background:calView===v?'rgba(0,200,224,0.10)':'var(--bg-card)', color:calView===v?'#00c8e0':'var(--text-mid)', fontSize:11, cursor:'pointer', fontWeight:calView===v?600:400 }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <div style={{ display:'flex', gap:4 }}>
            {raceByLevel.map(x => { const cfg=RACE_CONFIG[x.level]; return <span key={x.level} style={{ padding:'2px 7px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.border}`, color:x.level==='gty'?'var(--gty-text)':cfg.color, fontSize:9, fontWeight:700 }}>{x.count} {cfg.label}</span> })}
          </div>
          <button onClick={()=>setAddModal({month:currentMonth})} style={{ padding:'6px 12px', borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Course</button>
        </div>
      </div>

      {/* Vue annuelle */}
      {calView==='year' && (
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(140px,1fr))', gap:10, minWidth:560 }}>
            {MONTHS.map((month, monthIdx) => {
              const monthRaces = getRacesForMonth(monthIdx)
              return (
                <div key={monthIdx} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:12, boxShadow:'var(--shadow-card)', cursor:'pointer' }}
                  onClick={()=>{setCurrentMonth(monthIdx);setCalView('month')}}>
                  <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 7px', color:monthRaces.length>0?'var(--text)':'var(--text-dim)' }}>{MONTH_SHORT[monthIdx]}</p>
                  {monthRaces.length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {monthRaces.sort((a,b)=>new Date(a.date).getDate()-new Date(b.date).getDate()).map(r => {
                        const cfg=RACE_CONFIG[r.level]; const dayNum=new Date(r.date).getDate()
                        return (
                          <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 6px', borderRadius:7, background:cfg.bg, border:`1px solid ${cfg.border}44`, cursor:'pointer' }}>
                            <span style={{ fontSize:9 }}>{cfg.emoji}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:10, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, color:r.level==='gty'?'var(--gty-text)':cfg.color }}>{r.name}</p>
                              <p style={{ fontSize:9, color:'var(--text-dim)', margin:0 }}>{dayNum} {MONTH_SHORT[monthIdx]}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : <p style={{ fontSize:10, color:'var(--text-dim)', margin:0, fontStyle:'italic' as const }}>Aucune course</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vue mensuelle */}
      {calView==='month' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'var(--shadow-card)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <button onClick={()=>setCurrentMonth(m=>Math.max(0,m-1))} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'var(--text-mid)', fontSize:13 }}>←</button>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{MONTHS[currentMonth]} {year}</h2>
              <button onClick={()=>setCurrentMonth(m=>Math.min(11,m+1))} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'var(--text-mid)', fontSize:13 }}>→</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:5 }}>
            {['L','M','M','J','V','S','D'].map((d,i)=><div key={i} style={{ textAlign:'center' as const, fontSize:9, fontWeight:600, color:'var(--text-dim)', padding:'3px 0' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {Array.from({length:getFirstDayOfMonth(currentMonth)-1},(_,i)=>(
              <div key={`e${i}`} style={{ height:60, borderRadius:7, background:'var(--bg-card2)', opacity:0.3 }}/>
            ))}
            {Array.from({length:getDaysInMonth(currentMonth)},(_,i)=>{
              const day=i+1
              const dateStr=`${year}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const dayRaces=races.filter(r=>r.date===dateStr)
              const isToday=new Date().toDateString()===new Date(dateStr).toDateString()
              return (
                <div key={day} onClick={()=>setAddModal({month:currentMonth,day})}
                  style={{ height:60, borderRadius:7, background:'var(--bg-card2)', border:`1px solid ${isToday?'#00c8e0':'var(--border)'}`, padding:'3px 4px', cursor:'pointer', display:'flex', flexDirection:'column', gap:1 }}>
                  <p style={{ fontSize:10, fontWeight:isToday?700:500, color:isToday?'#00c8e0':'var(--text-mid)', margin:0, textAlign:'right' as const }}>{day}</p>
                  {dayRaces.map(r=>{const cfg=RACE_CONFIG[r.level];return(
                    <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}}
                      style={{ borderRadius:3, padding:'1px 3px', background:cfg.bg, border:`1px solid ${cfg.border}44`, cursor:'pointer' }}>
                      <p style={{ fontSize:7, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, color:r.level==='gty'?'var(--gty-text)':cfg.color }}>{cfg.emoji} {r.name}</p>
                    </div>
                  )})}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Prochaine course */}
      {nextRace && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:13, padding:14, boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 9px' }}>Prochaine course</p>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' as const }}>
            <div style={{ width:52, height:52, borderRadius:11, background:RACE_CONFIG[nextRace.level].bg, border:`2px solid ${RACE_CONFIG[nextRace.level].border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:nextRace.level==='gty'?'var(--gty-text)':RACE_CONFIG[nextRace.level].color, lineHeight:1 }}>{daysUntil(nextRace.date)}</span>
              <span style={{ fontSize:7, color:'var(--text-dim)' }}>jours</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{nextRace.name}</p>
              <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 4px' }}>{new Date(nextRace.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p>
              {nextRace.goal && <p style={{ fontSize:11, color:'var(--text-mid)', margin:0 }}>🎯 {nextRace.goal}</p>}
            </div>
            <button onClick={()=>setEditModal(nextRace)} style={{ padding:'5px 10px', borderRadius:8, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:11, cursor:'pointer' }}>Modifier</button>
          </div>
        </div>
      )}

      {/* Race list */}
      {races.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0, color:'var(--text-dim)' }}>Toutes les courses {year} — {races.length} au total</p>
          {(['gty','main','important','secondary'] as RaceLevel[]).map(level => {
            const levelRaces = races.filter(r=>r.level===level).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
            if(!levelRaces.length)return null
            const cfg = RACE_CONFIG[level]
            return (
              <div key={level}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.08em', color:level==='gty'?'var(--text)':cfg.color, margin:'0 0 5px' }}>{cfg.emoji} {cfg.label} ({levelRaces.length})</p>
                {levelRaces.map(r => {
                  const days=daysUntil(r.date), past=days<0
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 13px', borderRadius:10, background:past?'var(--bg-card2)':cfg.bg, border:`1px solid ${past?'var(--border)':cfg.border+'44'}`, marginBottom:5, opacity:past?0.65:1 }}>
                      <div style={{ textAlign:'center' as const, minWidth:40, flexShrink:0 }}>
                        <p style={{ fontFamily:'Syne,sans-serif', fontSize:past?13:18, fontWeight:800, color:past?'var(--text-dim)':level==='gty'?'var(--gty-text)':cfg.color, margin:0, lineHeight:1 }}>{past?'✓':days}</p>
                        <p style={{ fontSize:8, color:'var(--text-dim)', margin:0 }}>{past?'Passée':'jours'}</p>
                      </div>
                      <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>setDetailModal(r)}>
                        <p style={{ fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{r.name}</p>
                        <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})} · {SPORT_EMOJI[r.sport]}</p>
                        {r.goal && <p style={{ fontSize:9, color:'var(--text-mid)', margin:'1px 0 0' }}>🎯 {r.goal}</p>}
                      </div>
                      <button onClick={()=>setEditModal(r)} style={{ padding:'4px 8px', borderRadius:7, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:10, cursor:'pointer' }}>✏️</button>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Compteur par sport — simple */}
          {sportCounts.length > 0 && (
            <div style={{ marginTop:4, padding:'10px 14px', borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 8px' }}>Compétitions par sport</p>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {sportCounts.map(x => (
                  <div key={x.sport} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:14 }}>{SPORT_EMOJI[x.sport]}</span>
                    <span style={{ fontSize:12, color:'var(--text-mid)' }}>{SPORT_LABEL[x.sport]}</span>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--text)' }}>{x.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {races.length === 0 && (
        <div style={{ padding:'32px 20px', textAlign:'center' as const, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14 }}>
          <p style={{ fontSize:32, marginBottom:8 }}>🏁</p>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:'0 0 6px' }}>Aucune course planifiée</p>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'0 0 16px' }}>Ajoutez votre première compétition</p>
          <button onClick={()=>setAddModal({month:currentMonth})} style={{ padding:'9px 20px', borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Ajouter une course</button>
        </div>
      )}

      {addModal && <RaceAddModal month={addModal.month} day={addModal.day} year={year} onClose={()=>setAddModal(null)} onSave={addRace}/>}
      {detailModal && <RaceDetailModal race={detailModal} onClose={()=>setDetailModal(null)} onDelete={deleteRace} onValidate={validateRace} onEdit={()=>{setEditModal(detailModal);setDetailModal(null)}}/>}
      {editModal && <RaceEditModal race={editModal} onClose={()=>setEditModal(null)} onSave={updateRace}/>}
    </div>
  )
}

// ── Race Modals ───────────────────────────────────
function RaceAddModal({ month, day, year, onClose, onSave }: { month:number; day?:number; year:number; onClose:()=>void; onSave:(r:Omit<Race,'id'>)=>void }) {
  const defaultDate = `${year}-${String(month+1).padStart(2,'0')}-${String(day||1).padStart(2,'0')}`
  const [sport, setSport] = useState<RaceSport>('run')
  const [name, setName] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [level, setLevel] = useState<RaceLevel>('important')
  const [runDist, setRunDist] = useState(RUN_DISTANCES[2])
  const [triDist, setTriDist] = useState(TRI_DISTANCES[1])
  const [hyroxCat, setHyroxCat] = useState('')
  const [hyroxLvl, setHyroxLvl] = useState('')
  const [hyroxGen, setHyroxGen] = useState('')
  const [goalTime, setGoalTime] = useState('')
  const [goalSwim, setGoalSwim] = useState('')
  const [goalBike, setGoalBike] = useState('')
  const [goalRun, setGoalRun] = useState('')
  const RACE_SPORTS: RaceSport[] = ['run','bike','swim','hyrox','triathlon','rowing']
  const RACE_SPORT_LABELS: Record<RaceSport,string> = {run:'Course à pied',bike:'Cyclisme',swim:'Natation',hyrox:'Hyrox',triathlon:'Triathlon',rowing:'Aviron'}
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:500, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Ajouter une course</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:7 }}>Sport</p>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:14 }}>
          {RACE_SPORTS.map(s => (
            <button key={s} onClick={()=>{setSport(s);setHyroxCat('');setHyroxLvl('');setHyroxGen('')}} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid', borderColor:sport===s?SPORT_BORDER[s]:'var(--border)', background:sport===s?SPORT_BG[s]:'var(--bg-card2)', color:sport===s?SPORT_BORDER[s]:'var(--text-mid)', fontSize:11, cursor:'pointer' }}>
              {SPORT_EMOJI[s]} {RACE_SPORT_LABELS[s]}
            </button>
          ))}
        </div>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:7 }}>Niveau</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
          {(['gty','main','important','secondary'] as RaceLevel[]).map(l => { const cfg=RACE_CONFIG[l]; return (
            <button key={l} onClick={()=>setLevel(l)} style={{ padding:'8px 10px', borderRadius:9, border:'1px solid', cursor:'pointer', textAlign:'left' as const, borderColor:level===l?cfg.border:'var(--border)', background:level===l?cfg.bg:'var(--bg-card2)' }}>
              <p style={{ fontSize:11, fontWeight:600, margin:0, color:level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text)' }}>{cfg.emoji} {cfg.label}</p>
            </button>
          )})}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:9, marginBottom:12 }}>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Nom</p><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Ironman Nice" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
          <div><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Date</p><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
        </div>
        {sport==='run' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:7 }}>Distance</p>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:8 }}>
              {RUN_DISTANCES.map(d => <button key={d} onClick={()=>setRunDist(d)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid', borderColor:runDist===d?'#22c55e':'var(--border)', background:runDist===d?'rgba(34,197,94,0.10)':'var(--bg-card2)', color:runDist===d?'#22c55e':'var(--text-mid)', fontSize:11, cursor:'pointer' }}>{d}</button>)}
            </div>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Objectif de temps</p>
            <input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: 1h25:00" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
          </div>
        )}
        {sport==='triathlon' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:7 }}>Distance</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
              {TRI_DISTANCES.map(d => <button key={d} onClick={()=>setTriDist(d)} style={{ padding:'8px 12px', borderRadius:9, border:'1px solid', borderColor:triDist===d?'#a855f7':'var(--border)', background:triDist===d?'rgba(168,85,247,0.10)':'var(--bg-card2)', cursor:'pointer', textAlign:'left' as const }}><p style={{ fontSize:12, fontWeight:600, margin:0, color:triDist===d?'#a855f7':'var(--text)' }}>{d}</p><p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>🏊 {TRI_SWIM[d]} · 🚴 {TRI_BIKE[d]} · 🏃 {TRI_RUN[d]}</p></button>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[{l:'🏊 Natation',v:goalSwim,s:setGoalSwim,p:'32:00'},{l:'🚴 Vélo',v:goalBike,s:setGoalBike,p:'2h25:00'},{l:'🏃 Run',v:goalRun,s:setGoalRun,p:'1h35:00'},{l:'⏱ Total',v:goalTime,s:setGoalTime,p:'4h40:00'}].map(x => <div key={x.l}><p style={{ fontSize:10, color:'var(--text-dim)', marginBottom:3 }}>{x.l}</p><input value={x.v} onChange={e=>x.s(e.target.value)} placeholder={x.p} style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>)}
            </div>
          </div>
        )}
        {sport==='hyrox' && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:7 }}>Catégorie</p>
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {['Solo','Double','Relay'].map(c => <button key={c} onClick={()=>{setHyroxCat(c);setHyroxLvl('');setHyroxGen('')}} style={{ flex:1, padding:'8px', borderRadius:9, border:'1px solid', borderColor:hyroxCat===c?'#ef4444':'var(--border)', background:hyroxCat===c?'rgba(239,68,68,0.10)':'var(--bg-card2)', color:hyroxCat===c?'#ef4444':'var(--text-mid)', fontSize:12, cursor:'pointer', fontWeight:hyroxCat===c?600:400 }}>{c}</button>)}
            </div>
            {hyroxCat && (
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                {(hyroxCat==='Relay'?['Open']:['Open','Pro']).map(l => <button key={l} onClick={()=>{setHyroxLvl(l);setHyroxGen('')}} style={{ flex:1, padding:'8px', borderRadius:9, border:'1px solid', borderColor:hyroxLvl===l?'#ef4444':'var(--border)', background:hyroxLvl===l?'rgba(239,68,68,0.10)':'var(--bg-card2)', color:hyroxLvl===l?'#ef4444':'var(--text-mid)', fontSize:12, cursor:'pointer' }}>{l}</button>)}
              </div>
            )}
            {hyroxCat && hyroxLvl && (
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                {['Homme','Femme','Mixte'].filter(g=>!(hyroxCat==='Double'&&hyroxLvl==='Pro'&&g==='Mixte')).map(g => <button key={g} onClick={()=>setHyroxGen(g)} style={{ flex:1, padding:'8px', borderRadius:9, border:'1px solid', borderColor:hyroxGen===g?'#ef4444':'var(--border)', background:hyroxGen===g?'rgba(239,68,68,0.10)':'var(--bg-card2)', color:hyroxGen===g?'#ef4444':'var(--text-mid)', fontSize:12, cursor:'pointer' }}>{g}</button>)}
              </div>
            )}
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Objectif</p>
            <input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: 59:00" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
          </div>
        )}
        {!['run','triathlon','hyrox'].includes(sport) && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Objectif</p>
            <input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: Podium, Sub 1h00..." style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/>
          </div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({name:name||'Course',sport,date,level,goal:goalTime||undefined,runDistance:sport==='run'?runDist:undefined,triDistance:sport==='triathlon'?triDist:undefined,hyroxCategory:hyroxCat||undefined,hyroxLevel:hyroxLvl||undefined,hyroxGender:hyroxGen||undefined,goalTime:goalTime||undefined,goalSwimTime:goalSwim||undefined,goalBikeTime:goalBike||undefined,goalRunTime:goalRun||undefined})} style={{ flex:2, padding:10, borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>+ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function RaceEditModal({ race, onClose, onSave }: { race:Race; onClose:()=>void; onSave:(r:Race)=>void }) {
  const [form, setForm] = useState<Race>({...race})
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:440, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Modifier</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Nom</p><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Date</p><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:6 }}>Niveau</p>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {(['secondary','important','main','gty'] as RaceLevel[]).map(l=>{const cfg=RACE_CONFIG[l];return<button key={l} onClick={()=>setForm({...form,level:l})} style={{ padding:'4px 9px', borderRadius:7, border:'1px solid', borderColor:form.level===l?cfg.border:'var(--border)', background:form.level===l?cfg.bg:'var(--bg-card2)', color:form.level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text-mid)', fontSize:10, cursor:'pointer', fontWeight:form.level===l?700:400 }}>{cfg.emoji} {cfg.label}</button>})}
          </div>
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>Objectif</p><input value={form.goal??''} onChange={e=>setForm({...form,goal:e.target.value})} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none' }}/></div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave(form)} style={{ flex:2, padding:10, borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>Sauvegarder</button>
        </div>
      </div>
    </div>
  )
}

function RaceDetailModal({ race, onClose, onDelete, onValidate, onEdit }: { race:Race; onClose:()=>void; onDelete:(id:string)=>void; onValidate:(r:Race)=>void; onEdit:()=>void }) {
  const [tab, setTab] = useState<'detail'|'validate'>('detail')
  const [form, setForm] = useState<Race>({...race})
  const cfg = RACE_CONFIG[race.level]
  const days = daysUntil(race.date)
  const speed = form.vKm && form.vTime ? `${(parseFloat(form.vKm)/(parseFloat(form.vTime)/60)).toFixed(1)} km/h` : '—'
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border-mid)', padding:22, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ padding:'2px 8px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.border}`, color:race.level==='gty'?'var(--gty-text)':cfg.color, fontSize:9, fontWeight:700 }}>{cfg.emoji} {cfg.label}</span>
            </div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>{race.name}</h3>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>{SPORT_EMOJI[race.sport]} · {new Date(race.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:5, marginBottom:14 }}>
          {(['detail','validate'] as const).map(t => <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', borderColor:tab===t?SPORT_BORDER[race.sport]:'var(--border)', background:tab===t?SPORT_BG[race.sport]:'var(--bg-card2)', color:tab===t?SPORT_BORDER[race.sport]:'var(--text-mid)', fontSize:11, fontWeight:tab===t?600:400, cursor:'pointer' }}>{t==='detail'?'📊 Détail':'✅ Valider'}</button>)}
        </div>
        {tab==='detail' && (
          <div>
            <div style={{ padding:'10px 14px', borderRadius:11, background:days>0?cfg.bg:'var(--bg-card2)', border:`1px solid ${days>0?cfg.border+'44':'var(--border)'}`, marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ textAlign:'center' as const, flexShrink:0 }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:days>0?race.level==='gty'?'var(--gty-text)':cfg.color:'var(--text-dim)', margin:0, lineHeight:1 }}>{days>0?days:'✓'}</p>
                <p style={{ fontSize:9, color:'var(--text-dim)', margin:0 }}>{days>0?'jours':'Passée'}</p>
              </div>
              <div>
                {race.goal && <p style={{ fontSize:13, fontWeight:600, margin:'0 0 3px' }}>🎯 {race.goal}</p>}
                {race.goalSwimTime && <p style={{ fontSize:11, color:'var(--text-mid)', margin:'1px 0' }}>🏊 Objectif : {race.goalSwimTime}</p>}
                {race.goalBikeTime && <p style={{ fontSize:11, color:'var(--text-mid)', margin:'1px 0' }}>🚴 Objectif : {race.goalBikeTime}</p>}
                {race.goalRunTime && <p style={{ fontSize:11, color:'var(--text-mid)', margin:'1px 0' }}>🏃 Objectif : {race.goalRunTime}</p>}
              </div>
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <button onClick={()=>onDelete(race.id)} style={{ padding:'8px 11px', borderRadius:9, background:'rgba(255,95,95,0.10)', border:'1px solid rgba(255,95,95,0.25)', color:'#ff5f5f', fontSize:11, cursor:'pointer' }}>Supprimer</button>
              <button onClick={onEdit} style={{ padding:'8px 11px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:11, cursor:'pointer' }}>✏️ Modifier</button>
              <button onClick={onClose} style={{ flex:1, padding:9, borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:11, cursor:'pointer' }}>Fermer</button>
            </div>
          </div>
        )}
        {tab==='validate' && (
          <div>
            {race.sport==='hyrox' ? (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
                  <div><p style={{ fontSize:10, color:'var(--text-dim)', marginBottom:3 }}>Temps total</p><input value={form.vTime??''} onChange={e=>setForm({...form,vTime:e.target.value})} placeholder="58:45" style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
                </div>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'#ef4444', marginBottom:7 }}>Stations</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                  {HYROX_STATIONS.map((station,i) => (
                    <div key={station} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                      <span style={{ fontSize:9, fontWeight:600, color:'#ef4444', width:18, flexShrink:0 }}>{i+1}</span>
                      <span style={{ flex:1, fontSize:11 }}>{station}</span>
                      <input value={(form.vStations||{})[station]??''} onChange={e=>setForm({...form,vStations:{...(form.vStations||{}),[station]:e.target.value}})} placeholder="temps" style={{ width:70, padding:'4px 6px', borderRadius:6, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'#ef4444', marginBottom:7 }}>Runs (8×1km)</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
                  {Array.from({length:8},(_,i) => <div key={i}><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:2 }}>Run {i+1}</p><input value={(form.vRuns||[])[i]??''} onChange={e=>{const runs=[...(form.vRuns||Array(8).fill(''))];runs[i]=e.target.value;setForm({...form,vRuns:runs})}} placeholder="4:20" style={{ width:'100%', padding:'5px 7px', borderRadius:6, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>)}
                </div>
              </div>
            ) : race.sport==='triathlon' ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
                {[{l:'🏊 Natation',k:'vSwimTime',p:'32:00'},{l:'🚴 Vélo',k:'vBikeTime',p:'2h25:00'},{l:'🏃 Run',k:'vRunTime',p:'1h35:00'},{l:'⏱ Total',k:'vTime',p:'4h40:00'}].map(x => <div key={x.k}><p style={{ fontSize:10, color:'var(--text-dim)', marginBottom:3 }}>{x.l}</p><input value={(form as any)[x.k]??''} onChange={e=>setForm({...form,[x.k]:e.target.value})} placeholder={x.p} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>)}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
                <div><p style={{ fontSize:10, color:'var(--text-dim)', marginBottom:3 }}>Temps (min)</p><input value={form.vTime??''} onChange={e=>setForm({...form,vTime:e.target.value})} placeholder="85" style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
                <div><p style={{ fontSize:10, color:'var(--text-dim)', marginBottom:3 }}>Distance (km)</p><input value={form.vKm??''} onChange={e=>setForm({...form,vKm:e.target.value})} style={{ width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/></div>
                {form.vTime && form.vKm && <div style={{ padding:'7px 9px', borderRadius:8, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)' }}><p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Vitesse</p><p style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'#00c8e0', margin:0 }}>{speed}</p></div>}
              </div>
            )}
            <button onClick={()=>onValidate({...form,validated:true,vSpeed:speed})} style={{ width:'100%', padding:11, borderRadius:10, background:`linear-gradient(135deg,${SPORT_BORDER[race.sport]},#5b6fff)`, border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer', marginTop:10 }}>✓ Valider les résultats</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function PlanningPage() {
  const [tab, setTab] = useState<PlanningTab>('training')
  const [trainingWeek] = useState<WeekDay[]>(emptyWeek())

  const TABS: [PlanningTab,string,string,string,string,string][] = [
    ['training','Planning Training','Training','#00c8e0','rgba(0,200,224,0.10)','rgba(0,200,224,0.10)'],
    ['week',    'Planning Week',    'Week',    '#a78bfa','rgba(167,139,250,0.10)','rgba(167,139,250,0.10)'],
    ['race',    'Race Year',        'Race Year','#ef4444','rgba(239,68,68,0.10)','rgba(239,68,68,0.10)'],
  ]

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Planning</h1>
        <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>Training · Semaine · Saison</p>
      </div>

      {/* Desktop tabs */}
      <div className="hidden md:flex" style={{ gap:8, marginBottom:20, flexWrap:'wrap' as const }}>
        {TABS.map(([id,label,,color,bg]) => (
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, minWidth:120, padding:'11px 16px', borderRadius:12, border:'1px solid', cursor:'pointer',
              borderColor:tab===id?color:'var(--border)', background:tab===id?bg:'var(--bg-card)',
              color:tab===id?color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:tab===id?700:400,
              boxShadow:tab===id?`0 0 0 1px ${color}33`:'var(--shadow-card)', transition:'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden" style={{ display:'flex', gap:6, marginBottom:16 }}>
        {TABS.map(([id,,shortLabel,color,bg]) => (
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, padding:'9px 8px', borderRadius:11, border:'1px solid', cursor:'pointer',
              borderColor:tab===id?color:'var(--border)', background:tab===id?bg:'var(--bg-card)',
              color:tab===id?color:'var(--text-mid)', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:tab===id?700:400,
              transition:'all 0.15s' }}>
            {shortLabel}
          </button>
        ))}
      </div>

      {tab==='training' && <TrainingTab/>}
      {tab==='week'     && <WeekTab trainingWeek={trainingWeek}/>}
      {tab==='race'     && <RaceYearTab/>}
    </div>
  )
}
