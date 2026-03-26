'use client'

import { useState, useRef } from 'react'

// ── Types ─────────────────────────────────────────
type PlanningTab   = 'training' | 'week' | 'race'
type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'gym'
type SessionStatus = 'planned' | 'done'
type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown'
type TaskType      = 'sport' | 'work' | 'personal' | 'recovery'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type CalView       = 'year' | 'month'

// ── Athlete profile ───────────────────────────────
const ATHLETE = { lthr:172, thresholdPace:248, ftp:301, css:88, weight:75 }

// ── Sport colors ──────────────────────────────────
const SPORT_BG: Record<SportType,string>     = { swim:'rgba(56,189,248,0.13)', run:'rgba(34,197,94,0.13)', bike:'rgba(59,130,246,0.13)', hyrox:'rgba(239,68,68,0.13)', gym:'rgba(249,115,22,0.13)' }
const SPORT_BORDER: Record<SportType,string> = { swim:'#38bdf8', run:'#22c55e', bike:'#3b82f6', hyrox:'#ef4444', gym:'#f97316' }
const SPORT_EMOJI: Record<SportType,string>  = { run:'🏃', bike:'🚴', swim:'🏊', hyrox:'🏋️', gym:'💪' }
const SPORT_LABEL: Record<SportType,string>  = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation' }
const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']

// Task colors
const TASK_CONFIG: Record<TaskType,{label:string;color:string;bg:string}> = {
  sport:    { label:'Sport',      color:'#22c55e', bg:'rgba(34,197,94,0.15)'  },
  work:     { label:'Travail',    color:'#3b82f6', bg:'rgba(59,130,246,0.15)' },
  personal: { label:'Personnel',  color:'#a78bfa', bg:'rgba(167,139,250,0.15)' },
  recovery: { label:'Récup',      color:'#ffb340', bg:'rgba(255,179,64,0.15)' },
}

// Race level config
const RACE_CONFIG: Record<RaceLevel,{label:string;color:string;bg:string;border:string;emoji:string}> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',   border:'#22c55e', emoji:'🟢' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)',  border:'#f97316', emoji:'🟠' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',   border:'#ef4444', emoji:'🔴' },
  gty:       { label:'GTY',        color:'#fff',    bg:'rgba(15,15,15,0.85)',    border:'#000',    emoji:'⚫' },
}

const INTENSITY_CONFIG: Record<DayIntensity,{label:string;color:string;bg:string;border:string}> = {
  recovery: { label:'Récup', color:'#9ca3af', bg:'rgba(156,163,175,0.10)', border:'rgba(156,163,175,0.25)' },
  low:      { label:'Low',   color:'#22c55e', bg:'rgba(34,197,94,0.10)',   border:'rgba(34,197,94,0.25)'   },
  mid:      { label:'Mid',   color:'#ffb340', bg:'rgba(255,179,64,0.10)',  border:'rgba(255,179,64,0.25)'  },
  hard:     { label:'Hard',  color:'#ff5f5f', bg:'rgba(255,95,95,0.10)',   border:'rgba(255,95,95,0.25)'   },
}
const INTENSITY_ORDER: DayIntensity[] = ['recovery','low','mid','hard']
const BLOCK_TYPE_LABEL: Record<BlockType,string> = { warmup:'Échauffement', effort:'Effort', recovery:'Récupération', cooldown:'Retour calme' }

// ── Interfaces ────────────────────────────────────
interface Block { id:string; type:BlockType; durationMin:number; zone:number; value:string; hrAvg:string; label:string }
interface Session { id:string; sport:SportType; title:string; time:string; durationMin:number; tss?:number; main?:boolean; status:SessionStatus; notes?:string; blocks:Block[]; isTrainer?:boolean; rpe?:number; completionPct?:number }
interface WeekDay { day:string; date:string; intensity:DayIntensity; sessions:Session[] }

interface WeekTask {
  id:string; title:string; type:TaskType; dayIndex:number
  startHour:number; startMin:number; durationMin:number
  description?:string; priority?:boolean; color?:string
  fromTraining?:boolean; sessionId?:string
}

interface Race {
  id:string; name:string; type:SportType; date:string
  level:RaceLevel; goal?:string; strategy?:string; notes?:string
}

// ── Helpers ───────────────────────────────────────
function uid():string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function formatDur(min:number):string { const h=Math.floor(min/60),m=min%60; return h===0?`0:${String(m).padStart(2,'0')}`:`${h}h${String(m).padStart(2,'0')}` }
function daysUntil(dateStr:string):number { return Math.ceil((new Date(dateStr).getTime()-Date.now())/(1000*60*60*24)) }

function parsePace(str:string):number { const p=str.replace(',',':').split(':'); return (parseInt(p[0])||0)*60+(parseInt(p[1])||0) }
function getZone(sport:SportType, value:string):number {
  if(!value) return 1
  if(sport==='run'){ const sec=parsePace(value),t=ATHLETE.thresholdPace; if(sec>t*1.25)return 1;if(sec>t*1.10)return 2;if(sec>t*1.00)return 3;if(sec>t*0.90)return 4;return 5 }
  if(sport==='bike'){ const w=parseInt(value)||0,f=ATHLETE.ftp; if(w<f*0.55)return 1;if(w<f*0.75)return 2;if(w<f*0.87)return 3;if(w<f*1.05)return 4;return 5 }
  if(sport==='swim'){ const sec=parsePace(value),c=ATHLETE.css; if(sec>c*1.30)return 1;if(sec>c*1.15)return 2;if(sec>c*1.05)return 3;if(sec>c*0.97)return 4;return 5 }
  return 3
}
function calcTSS(blocks:Block[], sport:SportType):number {
  return Math.round(blocks.reduce((tss,b)=>{ const IF=[0.55,0.70,0.83,0.95,1.10][b.zone-1]; return tss+(b.durationMin/60)*IF*IF*100*(sport==='bike'?1:0.9) },0))
}

// ── Initial data ──────────────────────────────────
const INITIAL_WEEK: WeekDay[] = [
  {day:'Lun',date:'18',intensity:'mid',sessions:[{id:'s1',sport:'swim',title:'Natation Tech',time:'06:00',durationMin:55,tss:45,status:'done',main:false,blocks:[
    {id:'b1',type:'warmup',durationMin:10,zone:1,value:'2:00',hrAvg:'140',label:'Échauffement'},
    {id:'b2',type:'effort',durationMin:30,zone:3,value:'1:35',hrAvg:'158',label:'Série principale'},
    {id:'b3',type:'cooldown',durationMin:10,zone:1,value:'2:10',hrAvg:'135',label:'Retour calme'},
  ]}]},
  {day:'Mar',date:'19',intensity:'hard',sessions:[{id:'s2',sport:'bike',title:'Sweet Spot 2×20',time:'17:30',durationMin:105,tss:122,status:'done',main:true,blocks:[
    {id:'b4',type:'warmup',durationMin:15,zone:2,value:'180',hrAvg:'145',label:'Échauffement'},
    {id:'b5',type:'effort',durationMin:20,zone:3,value:'255',hrAvg:'162',label:'Sweet Spot 1'},
    {id:'b6',type:'recovery',durationMin:5,zone:1,value:'150',hrAvg:'140',label:'Récup'},
    {id:'b7',type:'effort',durationMin:20,zone:3,value:'258',hrAvg:'165',label:'Sweet Spot 2'},
    {id:'b8',type:'cooldown',durationMin:15,zone:1,value:'160',hrAvg:'138',label:'Retour calme'},
  ]}]},
  {day:'Mer',date:'20',intensity:'low',sessions:[{id:'s3',sport:'run',title:'Endurance Z2',time:'06:30',durationMin:70,tss:68,status:'planned',main:false,blocks:[
    {id:'b9',type:'warmup',durationMin:10,zone:1,value:'5:30',hrAvg:'135',label:'Échauffement'},
    {id:'b10',type:'effort',durationMin:50,zone:2,value:'4:50',hrAvg:'148',label:'Endurance'},
    {id:'b11',type:'cooldown',durationMin:10,zone:1,value:'5:45',hrAvg:'132',label:'Retour calme'},
  ]}]},
  {day:'Jeu',date:'21',intensity:'hard',sessions:[{id:'s4',sport:'hyrox',title:'Hyrox Sim',time:'18:00',durationMin:65,tss:88,status:'planned',main:true,blocks:[]}]},
  {day:'Ven',date:'22',intensity:'mid',sessions:[
    {id:'s5',sport:'swim',title:'6×100m',time:'06:00',durationMin:60,tss:55,status:'planned',main:false,blocks:[]},
    {id:'s6',sport:'run',title:'Tempo Z3',time:'17:00',durationMin:60,tss:65,status:'planned',main:true,blocks:[]},
  ]},
  {day:'Sam',date:'23',intensity:'mid',sessions:[{id:'s7',sport:'bike',title:'Long Z2',time:'08:00',durationMin:180,tss:120,status:'planned',main:true,blocks:[]}]},
  {day:'Dim',date:'24',intensity:'recovery',sessions:[{id:'s8',sport:'run',title:'Récup Z1',time:'10:00',durationMin:40,tss:25,status:'planned',main:false,blocks:[]}]},
]

const INITIAL_TASKS: WeekTask[] = [
  {id:'t1',title:'Réunion client',type:'work',dayIndex:0,startHour:9,startMin:0,durationMin:60,priority:true},
  {id:'t2',title:'Déjeuner équipe',type:'work',dayIndex:1,startHour:12,startMin:30,durationMin:90},
  {id:'t3',title:'Méditation',type:'personal',dayIndex:2,startHour:7,startMin:0,durationMin:20},
  {id:'t4',title:'Prépa Hyrox',type:'work',dayIndex:3,startHour:10,startMin:0,durationMin:120},
  {id:'t5',title:'Kiné',type:'recovery',dayIndex:4,startHour:11,startMin:0,durationMin:60,priority:true},
  {id:'t6',title:'Repos actif',type:'recovery',dayIndex:6,startHour:11,startMin:0,durationMin:60},
]

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const INITIAL_RACES: Race[] = [
  {id:'r1',name:'Semi Nice-Cannes',type:'run',date:'2025-04-06',level:'important',goal:'Sub 1h25',strategy:'Partir conservateur, accélérer à partir du km 10'},
  {id:'r2',name:'Ironman 70.3 Nice',type:'swim',date:'2025-06-22',level:'main',goal:'Qualification AG',strategy:'Gestion effort en vélo, sortir frais pour le run'},
  {id:'r3',name:'Hyrox World Berlin',type:'hyrox',date:'2025-05-10',level:'gty',goal:'Sub 1h00',strategy:'Stations régulières, ne pas partir trop fort sur SkiErg'},
  {id:'r4',name:'Cross country 10km',type:'run',date:'2025-03-15',level:'secondary',goal:'Top 10',strategy:'Repérage parcours'},
  {id:'r5',name:'Triathlon Sprint',type:'swim',date:'2025-08-17',level:'secondary',goal:'Podium AG'},
]

// ════════════════════════════════════════════════
// TRAINING TAB (identique à avant, simplifié ici)
// ════════════════════════════════════════════════

function BlockBuilder({sport,blocks,onChange}:{sport:SportType;blocks:Block[];onChange:(b:Block[])=>void}) {
  const vLabel=sport==='bike'?'Watts':sport==='swim'?'Allure /100m':'Allure /km'
  const vPlh=sport==='bike'?'250':sport==='swim'?'1:35':'4:30'
  function addBlock(){onChange([...blocks,{id:`b_${Date.now()}`,type:'effort',durationMin:10,zone:3,value:sport==='bike'?'220':'4:30',hrAvg:'',label:'Bloc'}])}
  function upd(id:string,field:keyof Block,val:string|number){onChange(blocks.map(b=>{if(b.id!==id)return b;const u:Block={...b,[field]:val};if(field==='value')u.zone=getZone(sport,String(val));return u}))}
  const totalMin=blocks.reduce((s,b)=>s+b.durationMin,0)
  return(
    <div>
      {blocks.length>0&&(
        <div style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:10}}>
          <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',marginBottom:8}}>
            Aperçu · TSS estimé : <span style={{color:SPORT_BORDER[sport]}}>{calcTSS(blocks,sport)} pts</span>
            <span style={{marginLeft:10,fontWeight:400,color:'var(--text-dim)'}}>· {formatDur(totalMin)}</span>
          </p>
          {blocks.length>0&&(
            <div style={{display:'flex',alignItems:'flex-end',gap:2,height:60,marginBottom:6}}>
              {blocks.map(b=>{const hp=((b.zone/5)*0.85+0.05)*100,wp=(b.durationMin/totalMin)*100,c=ZONE_COLORS[b.zone-1];return(
                <div key={b.id} style={{width:`${wp}%`,height:`${hp}%`,background:`linear-gradient(180deg,${c}ee,${c}55)`,borderRadius:'3px 3px 0 0',border:`1px solid ${c}88`,minWidth:4}}/>
              )})}
            </div>
          )}
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:8}}>
        {blocks.map(b=>(
          <div key={b.id} style={{background:'var(--bg-card2)',border:`1px solid ${ZONE_COLORS[b.zone-1]}44`,borderLeft:`3px solid ${ZONE_COLORS[b.zone-1]}`,borderRadius:9,padding:'8px 10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:5,background:`${ZONE_COLORS[b.zone-1]}22`,border:`1px solid ${ZONE_COLORS[b.zone-1]}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:ZONE_COLORS[b.zone-1],flexShrink:0}}>Z{b.zone}</span>
              <select value={b.type} onChange={e=>upd(b.id,'type',e.target.value)} style={{flex:1,padding:'3px 6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:11,outline:'none'}}>
                {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <input value={b.label} onChange={e=>upd(b.id,'label',e.target.value)} placeholder="Nom" style={{flex:1.5,padding:'3px 6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:11,outline:'none'}}/>
              <button onClick={()=>onChange(blocks.filter(x=>x.id!==b.id))} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:13,padding:'2px',flexShrink:0}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
              <div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:2}}>Durée (min)</p><input type="number" value={b.durationMin} onChange={e=>upd(b.id,'durationMin',parseInt(e.target.value)||0)} style={{width:'100%',padding:'5px 7px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:11,outline:'none',fontFamily:'DM Mono,monospace'}}/></div>
              <div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:2}}>{vLabel}</p><input value={b.value} onChange={e=>upd(b.id,'value',e.target.value)} placeholder={vPlh} style={{width:'100%',padding:'5px 7px',borderRadius:6,border:`1px solid ${ZONE_COLORS[b.zone-1]}66`,background:`${ZONE_COLORS[b.zone-1]}11`,color:'var(--text)',fontSize:11,outline:'none',fontFamily:'DM Mono,monospace'}}/></div>
              <div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:2}}>FC moy.</p><input value={b.hrAvg} onChange={e=>upd(b.id,'hrAvg',e.target.value)} placeholder="158" style={{width:'100%',padding:'5px 7px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:11,outline:'none',fontFamily:'DM Mono,monospace'}}/></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addBlock} style={{width:'100%',padding:'8px',borderRadius:9,background:'transparent',border:'1px dashed var(--border-mid)',color:'var(--text-dim)',fontSize:12,cursor:'pointer'}}>+ Ajouter un bloc</button>
    </div>
  )
}

function TrainingTab() {
  const [week,setWeek]=useState<WeekDay[]>(INITIAL_WEEK)
  const [intensityModal,setIntensityModal]=useState<DayIntensity|null>(null)
  const [addModal,setAddModal]=useState<number|null>(null)
  const [detailModal,setDetailModal]=useState<Session|null>(null)
  const [dragOver,setDragOver]=useState<number|null>(null)
  const dragSession=useRef<{sessionId:string;fromDay:number}|null>(null)

  function addSession(dayIdx:number,session:Session){setWeek(prev=>prev.map((d,i)=>i===dayIdx?{...d,sessions:[...d.sessions,session]}:d))}
  function saveSession(updated:Session){setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.map(s=>s.id===updated.id?updated:s)})));setDetailModal(null)}
  function validateSession(updated:Session){setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.map(s=>s.id===updated.id?{...updated,status:'done' as const}:s)})));setDetailModal(null)}
  function deleteSession(id:string){setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.filter(s=>s.id!==id)})));setDetailModal(null)}
  function changeIntensity(dayIdx:number){setWeek(prev=>prev.map((d,i)=>{if(i!==dayIdx)return d;return{...d,intensity:INTENSITY_ORDER[(INTENSITY_ORDER.indexOf(d.intensity)+1)%INTENSITY_ORDER.length]}}))}
  function onDragStart(sessionId:string,fromDay:number){dragSession.current={sessionId,fromDay}}
  function onDrop(toDay:number){
    if(!dragSession.current)return
    const{sessionId,fromDay}=dragSession.current
    if(fromDay===toDay){dragSession.current=null;setDragOver(null);return}
    setWeek(prev=>{const session=prev[fromDay].sessions.find(s=>s.id===sessionId);if(!session)return prev;return prev.map((d,i)=>{if(i===fromDay)return{...d,sessions:d.sessions.filter(s=>s.id!==sessionId)};if(i===toDay)return{...d,sessions:[...d.sessions,session]};return d})})
    dragSession.current=null;setDragOver(null)
  }

  const allSessions=week.flatMap(d=>d.sessions)
  const totalMin=allSessions.reduce((s,x)=>s+x.durationMin,0)
  const totalTSS=allSessions.reduce((s,x)=>s+(x.tss||0),0)
  const counts=week.reduce((acc,d)=>{acc[d.intensity]=(acc[d.intensity]||0)+1;return acc},{} as Record<DayIntensity,number>)

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}} className="md:grid-cols-4">
        {[
          {label:'Volume',value:formatDur(totalMin),color:'#00c8e0'},
          {label:'Équilibre semaine',value:null,color:'#ffb340'},
          {label:'Séances',value:allSessions.length,color:'#ffb340'},
          {label:'TSS estimé',value:totalTSS,color:'#5b6fff'},
        ].map((s,i)=>i===1?(
          <div key={i} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)'}}>
            <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px'}}>Équilibre</p>
            <div style={{display:'flex',gap:3,height:6,borderRadius:999,overflow:'hidden',marginBottom:7}}>
              {INTENSITY_ORDER.filter(k=>counts[k]>0).map(k=><div key={k} style={{flex:counts[k],background:INTENSITY_CONFIG[k].color,opacity:0.7}}/>)}
            </div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap' as const}}>
              {INTENSITY_ORDER.filter(k=>counts[k]>0).map(k=><span key={k} style={{padding:'1px 6px',borderRadius:20,background:INTENSITY_CONFIG[k].bg,border:`1px solid ${INTENSITY_CONFIG[k].border}`,color:INTENSITY_CONFIG[k].color,fontSize:9,fontWeight:700}}>{counts[k]} {INTENSITY_CONFIG[k].label}</span>)}
            </div>
          </div>
        ):(
          <div key={i} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)'}}>
            <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>{s.label}</p>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:s.color,margin:0}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Grille desktop */}
      <div className="hidden md:block" style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)',overflowX:'auto'}}>
        <div style={{minWidth:680}}>
          <div style={{display:'grid',gridTemplateColumns:'44px repeat(7,1fr)',gap:6,marginBottom:10}}>
            <div/>
            {week.map((d,dayIdx)=>{const cfg=INTENSITY_CONFIG[d.intensity];return(
              <div key={d.day} style={{textAlign:'center' as const}}>
                <p style={{fontSize:11,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 2px',fontWeight:500}}>{d.day}</p>
                <p style={{fontSize:14,fontWeight:600,margin:'0 0 5px'}}>{d.date}</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{padding:'2px 6px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>{cfg.label}</button>
                  <button onClick={()=>changeIntensity(dayIdx)} style={{width:14,height:14,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>+</button>
                </div>
              </div>
            )})}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'44px repeat(7,1fr)',gap:6}}>
            <div/>
            {week.map((d,dayIdx)=>(
              <div key={d.day} data-day-index={dayIdx}
                onDragOver={e=>{e.preventDefault();setDragOver(dayIdx)}}
                onDragLeave={()=>setDragOver(null)}
                onDrop={()=>onDrop(dayIdx)}
                style={{minHeight:110,borderRadius:9,padding:4,background:dragOver===dayIdx?'rgba(0,200,224,0.06)':'var(--bg-card2)',border:`1px solid ${dragOver===dayIdx?'rgba(0,200,224,0.3)':'var(--border)'}`,transition:'all 0.15s',display:'flex',flexDirection:'column',gap:4}}>
                {d.sessions.map(s=>(
                  <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,dayIdx)} onClick={()=>setDetailModal(s)}
                    style={{borderRadius:6,padding:'4px 6px',background:SPORT_BG[s.sport],borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`,cursor:'grab',opacity:s.status==='done'?0.75:1,position:'relative'}}>
                    {s.status==='done'&&<span style={{position:'absolute',top:2,right:2,fontSize:7,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700}}>✓{s.completionPct?` ${s.completionPct}%`:''}</span>}
                    <p style={{fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{SPORT_EMOJI[s.sport]} {s.title}</p>
                    <p style={{fontSize:8,opacity:0.7,margin:'1px 0 0',fontFamily:'DM Mono,monospace'}}>{s.time} · {formatDur(s.durationMin)}</p>
                    {s.blocks.length>0&&<div style={{display:'flex',gap:1,marginTop:2,height:5,borderRadius:2,overflow:'hidden'}}>{s.blocks.map(b=><div key={b.id} style={{flex:b.durationMin,background:ZONE_COLORS[b.zone-1],opacity:0.8}}/>)}</div>}
                  </div>
                ))}
                <button onClick={()=>setAddModal(dayIdx)} style={{marginTop:'auto',padding:'3px',borderRadius:5,background:'transparent',border:'1px dashed var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer',width:'100%'}}>+</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden" style={{display:'flex',flexDirection:'column',gap:8}}>
        {week.map((d,dayIdx)=>{const cfg=INTENSITY_CONFIG[d.intensity];return(
          <div key={d.day} data-day-index={dayIdx} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:13,padding:13,boxShadow:'var(--shadow-card)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:d.sessions.length?8:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{textAlign:'center' as const,minWidth:32}}><p style={{fontSize:9,color:'var(--text-dim)',textTransform:'uppercase' as const,margin:0}}>{d.day}</p><p style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>{d.date}</p></div>
                <button onClick={()=>setIntensityModal(d.intensity)} style={{padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700,cursor:'pointer'}}>{cfg.label}</button>
                <button onClick={()=>changeIntensity(dayIdx)} style={{width:20,height:20,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>+</button>
              </div>
              <button onClick={()=>setAddModal(dayIdx)} style={{padding:'4px 9px',borderRadius:7,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',color:'#00c8e0',fontSize:11,cursor:'pointer',fontWeight:600}}>+ Ajouter</button>
            </div>
            {d.sessions.length>0&&<div style={{display:'flex',flexDirection:'column',gap:5}}>{d.sessions.map(s=>(
              <div key={s.id} onClick={()=>setDetailModal(s)} style={{display:'flex',flexDirection:'column',padding:'8px 10px',borderRadius:9,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',opacity:s.status==='done'?0.75:1}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:s.blocks.length?4:0}}>
                  <span style={{fontSize:14}}>{SPORT_EMOJI[s.sport]}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:12,fontWeight:s.main?600:400,margin:0}}>{s.title}{s.status==='done'&&<span style={{marginLeft:5,fontSize:8,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 4px',borderRadius:3,fontWeight:700}}>✓</span>}</p>
                    <p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0'}}>{s.time} · {formatDur(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
                  </div>
                </div>
                {s.blocks.length>0&&<div style={{display:'flex',gap:1,height:8,borderRadius:2,overflow:'hidden'}}>{s.blocks.map(b=><div key={b.id} style={{flex:b.durationMin,background:ZONE_COLORS[b.zone-1],opacity:0.75}}/>)}</div>}
              </div>
            ))}</div>}
            {d.sessions.length===0&&<p style={{fontSize:11,color:'var(--text-dim)',margin:0,fontStyle:'italic' as const}}>Jour de repos</p>}
          </div>
        )})}
      </div>

      {/* Modals */}
      {intensityModal&&(
        <div onClick={()=>setIntensityModal(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:26,maxWidth:380,width:'100%'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <span style={{padding:'3px 10px',borderRadius:20,background:INTENSITY_CONFIG[intensityModal].bg,border:`1px solid ${INTENSITY_CONFIG[intensityModal].border}`,color:INTENSITY_CONFIG[intensityModal].color,fontSize:11,fontWeight:700,textTransform:'uppercase' as const}}>{INTENSITY_CONFIG[intensityModal].label}</span>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0}}>Journée {INTENSITY_CONFIG[intensityModal].label}</h3>
            </div>
            <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,margin:'0 0 18px'}}>{intensityModal==='recovery'?'Journée sans séance ou très légère.':intensityModal==='low'?'Faible intensité, favorise la récupération.':intensityModal==='mid'?'Intensité modérée, fatigue contrôlée.':'Forte intensité, nécessite plusieurs jours de récupération.'}</p>
            <button onClick={()=>setIntensityModal(null)} style={{width:'100%',padding:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',borderRadius:10,color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:600,fontSize:13,cursor:'pointer'}}>Compris</button>
          </div>
        </div>
      )}

      {addModal!==null&&(
        <div onClick={()=>setAddModal(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <AddSessionModalContent dayIndex={addModal} onClose={()=>setAddModal(null)} onAdd={addSession}/>
        </div>
      )}

      {detailModal&&(
        <div onClick={()=>setDetailModal(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <SessionDetailContent session={detailModal} onClose={()=>setDetailModal(null)} onSave={saveSession} onValidate={validateSession} onDelete={deleteSession}/>
        </div>
      )}
    </div>
  )
}

function AddSessionModalContent({dayIndex,onClose,onAdd}:{dayIndex:number;onClose:()=>void;onAdd:(i:number,s:Session)=>void}) {
  const [sport,setSport]=useState<SportType>('run')
  const [title,setTitle]=useState('')
  const [time,setTime]=useState('09:00')
  const [dur,setDur]=useState('60')
  const [rpe,setRpe]=useState(5)
  const [notes,setNotes]=useState('')
  const [blocks,setBlocks]=useState<Block[]>([])
  const isEnd=['run','bike','swim'].includes(sport)
  const tss=calcTSS(blocks,sport)
  const totalMin=blocks.reduce((s,b)=>s+b.durationMin,0)
  return(
    <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:520,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0}}>Nouvelle séance</h3>
        <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap' as const,marginBottom:14}}>
        {(Object.keys(SPORT_LABEL) as SportType[]).map(s=>(
          <button key={s} onClick={()=>{setSport(s);setBlocks([])}} style={{padding:'6px 11px',borderRadius:8,border:'1px solid',borderColor:sport===s?SPORT_BORDER[s]:'var(--border)',background:sport===s?SPORT_BG[s]:'var(--bg-card2)',color:sport===s?SPORT_BORDER[s]:'var(--text-mid)',fontSize:12,cursor:'pointer',fontWeight:sport===s?600:400}}>
            {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,marginBottom:12}}>
        <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Titre</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${SPORT_LABEL[sport]} Z2`} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/></div>
        <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Heure</p><input value={time} onChange={e=>setTime(e.target.value)} placeholder="17:00" style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>
        <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Durée (min)</p><input type="number" value={dur} onChange={e=>setDur(e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)'}}>RPE</span><span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:rpe<=3?'#22c55e':rpe<=6?'#ffb340':'#ef4444'}}>{rpe.toFixed(1)}/10</span></div>
        <input type="range" min={0} max={10} step={0.5} value={rpe} onChange={e=>setRpe(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#00c8e0',cursor:'pointer'}}/>
      </div>
      {isEnd&&<div style={{marginBottom:12}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:8}}>Blocs d'intensité</p><BlockBuilder sport={sport} blocks={blocks} onChange={setBlocks}/>{blocks.length>0&&<div style={{display:'flex',gap:14,marginTop:6,fontSize:11,color:'var(--text-dim)'}}><span>Durée : <strong style={{color:'var(--text)',fontFamily:'DM Mono,monospace'}}>{formatDur(totalMin)}</strong></span><span>TSS : <strong style={{color:SPORT_BORDER[sport],fontFamily:'DM Mono,monospace'}}>{tss} pts</strong></span></div>}</div>}
      <div style={{marginBottom:16}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Notes</p><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Consignes…" style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const}}/></div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer'}}>Annuler</button>
        <button onClick={()=>{onAdd(dayIndex,{id:`s_${Date.now()}`,sport,title:title||SPORT_LABEL[sport],time,durationMin:totalMin||parseInt(dur)||60,tss:tss||undefined,status:'planned',notes:notes||undefined,blocks,rpe});onClose()}} style={{flex:2,padding:10,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>+ Ajouter</button>
      </div>
    </div>
  )
}

function SessionDetailContent({session,onClose,onSave,onValidate,onDelete}:{session:Session;onClose:()=>void;onSave:(s:Session)=>void;onValidate:(s:Session)=>void;onDelete:(id:string)=>void}) {
  const [tab,setTab]=useState<'view'|'edit'|'validate'>('view')
  const [form,setForm]=useState<Session>({...session,blocks:[...session.blocks]})
  const isEnd=['run','bike','swim'].includes(session.sport)
  return(
    <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:540,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:34,height:34,borderRadius:9,background:SPORT_BG[session.sport],display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{SPORT_EMOJI[session.sport]}</div>
          <div>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>{session.title}</p>
            <p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0'}}>{session.time} · {formatDur(session.durationMin)}{session.tss?` · ${session.tss} TSS`:''}{session.status==='done'&&<span style={{marginLeft:5,padding:'1px 5px',borderRadius:3,background:`${SPORT_BORDER[session.sport]}22`,color:SPORT_BORDER[session.sport],fontSize:9,fontWeight:700}}>✓{session.completionPct?` ${session.completionPct}%`:''}</span>}</p>
          </div>
        </div>
        <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button>
      </div>
      <div style={{display:'flex',gap:5,marginBottom:16}}>
        {(['view','edit','validate'] as const).map(t=>(<button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'7px',borderRadius:9,border:'1px solid',borderColor:tab===t?SPORT_BORDER[session.sport]:'var(--border)',background:tab===t?SPORT_BG[session.sport]:'var(--bg-card2)',color:tab===t?SPORT_BORDER[session.sport]:'var(--text-mid)',fontSize:11,fontWeight:tab===t?600:400,cursor:'pointer'}}>{t==='view'?'📊 Graphique':t==='edit'?'✏️ Modifier':'✅ Valider'}</button>))}
      </div>
      {tab==='view'&&(
        <div>
          {session.blocks.length>0?(
            <div style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:12,padding:'13px 15px',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'flex-end',gap:2,height:80,marginBottom:4}}>
                {session.blocks.map(b=>{const total=session.blocks.reduce((s,x)=>s+x.durationMin,0);const hp=((b.zone/5)*0.85+0.05)*100;const wp=(b.durationMin/total)*100;const c=ZONE_COLORS[b.zone-1];return(<div key={b.id} title={`${b.label} · Z${b.zone} · ${formatDur(b.durationMin)}`} style={{width:`${wp}%`,height:`${hp}%`,background:`linear-gradient(180deg,${c}ee,${c}55)`,borderRadius:'4px 4px 0 0',border:`1px solid ${c}88`,minWidth:5}}>
                  {wp>7&&<span style={{fontSize:8,fontWeight:700,color:'#fff',textShadow:'0 1px 2px rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',justifyContent:'center',height:'100%',paddingBottom:2}}>Z{b.zone}</span>}
                </div>)})}
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginTop:6}}>
                {Array.from(new Set(session.blocks.map(b=>b.zone))).sort().map(z=>(<span key={z} style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:9,color:ZONE_COLORS[z-1]}}><span style={{width:7,height:7,borderRadius:2,background:ZONE_COLORS[z-1],display:'inline-block'}}/>Z{z}</span>))}
              </div>
            </div>
          ):<p style={{fontSize:12,color:'var(--text-dim)',textAlign:'center' as const,padding:'16px 0'}}>Aucun bloc — va sur Modifier pour en ajouter.</p>}
          {session.blocks.length>0&&session.blocks.map(b=>(<div key={b.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:8,background:`${ZONE_COLORS[b.zone-1]}11`,border:`1px solid ${ZONE_COLORS[b.zone-1]}33`,borderLeft:`2px solid ${ZONE_COLORS[b.zone-1]}`,marginBottom:5}}><span style={{fontSize:9,fontWeight:700,color:ZONE_COLORS[b.zone-1],width:18,flexShrink:0}}>Z{b.zone}</span><span style={{flex:1,fontSize:11,fontWeight:500}}>{b.label}</span><span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-dim)'}}>{formatDur(b.durationMin)}</span>{b.value&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:ZONE_COLORS[b.zone-1]}}>{b.value}{session.sport==='bike'?'W':''}</span>}{b.hrAvg&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-dim)'}}>{b.hrAvg}bpm</span>}</div>))}
        </div>
      )}
      {tab==='edit'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,marginBottom:12}}>
            {[{k:'title',l:'Titre'},{k:'time',l:'Heure'},{k:'durationMin',l:'Durée (min)'}].map(f=>(<div key={f.k}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{f.l}</p><input value={(form as any)[f.k]??''} onChange={e=>setForm({...form,[f.k]:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/></div>))}
          </div>
          <div style={{marginBottom:12}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Notes</p><textarea value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const}}/></div>
          {isEnd&&<div style={{marginBottom:14}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:8}}>Blocs d'intensité</p><BlockBuilder sport={session.sport} blocks={form.blocks} onChange={blocks=>setForm({...form,blocks,tss:calcTSS(blocks,session.sport),durationMin:blocks.reduce((s,b)=>s+b.durationMin,0)||form.durationMin})}/></div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>onDelete(session.id)} style={{padding:'9px 12px',borderRadius:10,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:12,cursor:'pointer'}}>Supprimer</button>
            <button onClick={()=>onSave(form)} style={{flex:1,padding:10,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>Sauvegarder</button>
          </div>
        </>
      )}
      {tab==='validate'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[{k:'vDuration',l:'Durée (min)',p:String(session.durationMin)},{k:'vDistance',l:'Distance',p:'10km'},{k:'vHrAvg',l:'FC moyenne',p:'158bpm'},{k:'vPace',l:'Allure moy.',p:"4'32/km"}].map(f=>(<div key={f.k}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{f.l}</p><input value={(form as any)[f.k]??''} onChange={e=>setForm({...form,[f.k]:e.target.value})} placeholder={f.p} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>))}
          </div>
          <button onClick={()=>{const done=parseInt((form as any).vDuration||'0');const pct=session.durationMin&&done?Math.min(Math.round((done/session.durationMin)*100),100):100;onValidate({...form,status:'done',completionPct:pct})}} style={{width:'100%',padding:12,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>✓ Confirmer</button>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// PLANNING WEEK TAB
// ════════════════════════════════════════════════
const HOURS = Array.from({length:20},(_,i)=>i+5) // 05h → 24h
const DAYS_LABELS = ['Lun 18','Mar 19','Mer 20','Jeu 21','Ven 22','Sam 23','Dim 24']

function WeekTab({trainingWeek}:{trainingWeek:WeekDay[]}) {
  const [tasks,setTasks]=useState<WeekTask[]>(INITIAL_TASKS)
  const [taskModal,setTaskModal]=useState<{dayIndex:number;startHour:number}|null>(null)
  const [editModal,setEditModal]=useState<WeekTask|null>(null)
  const [mobileDayOffset,setMobileDayOffset]=useState(0)

  // Merge training sessions as tasks
  const trainingTasks: WeekTask[] = trainingWeek.flatMap((d,dayIndex)=>
    d.sessions.map(s=>({
      id:`tr_${s.id}`, title:`${SPORT_EMOJI[s.sport]} ${s.title}`,
      type:'sport' as TaskType, dayIndex,
      startHour:parseInt(s.time.split(':')[0])||6,
      startMin:parseInt(s.time.split(':')[1])||0,
      durationMin:s.durationMin,
      fromTraining:true, sessionId:s.id,
      color:SPORT_BORDER[s.sport],
    }))
  )

  const allTasks=[...trainingTasks,...tasks]

  function getTasksForDay(dayIndex:number){return allTasks.filter(t=>t.dayIndex===dayIndex)}

  function dayLoad(dayIndex:number):{label:string;color:string;bg:string;border:string}{
    return INTENSITY_CONFIG[trainingWeek[dayIndex]?.intensity||'recovery']
  }

  function addTask(t:Omit<WeekTask,'id'>){setTasks(p=>[...p,{...t,id:uid()}]);setTaskModal(null)}
  function updateTask(t:WeekTask){setTasks(p=>p.map(x=>x.id===t.id?t:x));setEditModal(null)}
  function deleteTask(id:string){setTasks(p=>p.filter(x=>x.id!==id));setEditModal(null)}

  const visibleDays = [mobileDayOffset, mobileDayOffset+1, mobileDayOffset+2].filter(i=>i<7)

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:8}}>
        <div>
          <p style={{fontSize:12,color:'var(--text-dim)',margin:0}}>Semaine 12 — 18 au 24 mars</p>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
          {Object.entries(TASK_CONFIG).map(([type,cfg])=>(
            <span key={type} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.color}44`,fontSize:10,color:cfg.color,fontWeight:600}}>
              {cfg.label}
            </span>
          ))}
          <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',fontSize:10,color:'#00c8e0',fontWeight:600}}>
            🏃 Entraînement
          </span>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden" style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'8px 14px'}}>
        <button onClick={()=>setMobileDayOffset(Math.max(0,mobileDayOffset-1))} disabled={mobileDayOffset===0}
          style={{background:'none',border:'none',color:mobileDayOffset===0?'var(--border)':'var(--text-mid)',cursor:'pointer',fontSize:18,padding:'2px 8px'}}>←</button>
        <span style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{DAYS_LABELS[mobileDayOffset]} — {DAYS_LABELS[Math.min(mobileDayOffset+2,6)]}</span>
        <button onClick={()=>setMobileDayOffset(Math.min(4,mobileDayOffset+1))} disabled={mobileDayOffset>=4}
          style={{background:'none',border:'none',color:mobileDayOffset>=4?'var(--border)':'var(--text-mid)',cursor:'pointer',fontSize:18,padding:'2px 8px'}}>→</button>
      </div>

      {/* Calendar grid */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-card)'}}>
        {/* Day headers */}
        <div style={{display:'grid',gridTemplateColumns:`48px repeat(${visibleDays.length},1fr)`,borderBottom:'1px solid var(--border)',background:'var(--bg-card2)'}} className="md:hidden">
          <div style={{padding:'8px 0'}}/>
          {visibleDays.map(dayIdx=>{const load=dayLoad(dayIdx);return(
            <div key={dayIdx} style={{padding:'8px 6px',textAlign:'center' as const,borderLeft:'1px solid var(--border)'}}>
              <p style={{fontSize:10,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 1px',fontWeight:500}}>{trainingWeek[dayIdx]?.day}</p>
              <p style={{fontSize:14,fontWeight:700,margin:'0 0 3px'}}>{trainingWeek[dayIdx]?.date}</p>
              <span style={{padding:'1px 6px',borderRadius:20,background:load.bg,border:`1px solid ${load.border}`,color:load.color,fontSize:9,fontWeight:700}}>{load.label}</span>
            </div>
          )})}
        </div>

        {/* Desktop headers */}
        <div className="hidden md:grid" style={{gridTemplateColumns:'48px repeat(7,1fr)',borderBottom:'1px solid var(--border)',background:'var(--bg-card2)'}}>
          <div style={{padding:'8px 0'}}/>
          {trainingWeek.map((d,dayIdx)=>{const load=dayLoad(dayIdx);return(
            <div key={dayIdx} style={{padding:'8px 6px',textAlign:'center' as const,borderLeft:'1px solid var(--border)'}}>
              <p style={{fontSize:11,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 1px',fontWeight:500}}>{d.day}</p>
              <p style={{fontSize:14,fontWeight:700,margin:'0 0 3px'}}>{d.date}</p>
              <span style={{padding:'1px 6px',borderRadius:20,background:load.bg,border:`1px solid ${load.border}`,color:load.color,fontSize:9,fontWeight:700}}>{load.label}</span>
            </div>
          )})}
        </div>

        {/* Time grid */}
        <div style={{overflowY:'auto',maxHeight:'60vh'}}>
          {HOURS.map(hour=>(
            <div key={hour} style={{display:'grid',gridTemplateColumns:`48px repeat(${visibleDays.length},1fr)`,borderBottom:'1px solid var(--border)',minHeight:52}} className="md:hidden">
              <div style={{padding:'4px 6px',display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}}>
                <span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',marginTop:2}}>{String(hour).padStart(2,'0')}h</span>
              </div>
              {visibleDays.map(dayIdx=>{
                const dayTasks=getTasksForDay(dayIdx).filter(t=>t.startHour===hour)
                return(
                  <div key={dayIdx} onClick={()=>setTaskModal({dayIndex:dayIdx,startHour:hour})}
                    style={{borderLeft:'1px solid var(--border)',padding:'2px 3px',cursor:'pointer',position:'relative',minHeight:52,display:'flex',flexDirection:'column',gap:2}}>
                    {dayTasks.map(t=>{
                      const cfg=TASK_CONFIG[t.type]
                      const bg=t.fromTraining?`${SPORT_BORDER[t.sessionId?'run':'run']}22`:cfg.bg
                      const border=t.fromTraining?t.color||cfg.color:cfg.color
                      return(
                        <div key={t.id} onClick={e=>{e.stopPropagation();if(!t.fromTraining)setEditModal(t)}}
                          style={{borderRadius:5,padding:'3px 5px',background:bg,borderLeft:`2px solid ${border}`,cursor:t.fromTraining?'default':'pointer',position:'relative'}}>
                          {t.priority&&<span style={{position:'absolute',top:2,right:2,fontSize:8}}>⭐</span>}
                          <p style={{fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:t.fromTraining?border:'var(--text)'}}>{t.title}</p>
                          <p style={{fontSize:9,color:'var(--text-dim)',margin:'1px 0 0'}}>{formatDur(t.durationMin)}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Desktop time grid */}
          {HOURS.map(hour=>(
            <div key={hour} className="hidden md:grid" style={{gridTemplateColumns:'48px repeat(7,1fr)',borderBottom:'1px solid var(--border)',minHeight:52}}>
              <div style={{padding:'4px 6px',display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}}>
                <span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',marginTop:2}}>{String(hour).padStart(2,'0')}h</span>
              </div>
              {trainingWeek.map((_,dayIdx)=>{
                const dayTasks=getTasksForDay(dayIdx).filter(t=>t.startHour===hour)
                return(
                  <div key={dayIdx} onClick={()=>setTaskModal({dayIndex:dayIdx,startHour:hour})}
                    style={{borderLeft:'1px solid var(--border)',padding:'2px 3px',cursor:'pointer',minHeight:52,display:'flex',flexDirection:'column',gap:2}}>
                    {dayTasks.map(t=>{
                      const cfg=TASK_CONFIG[t.type]
                      const border=t.fromTraining?t.color||cfg.color:cfg.color
                      return(
                        <div key={t.id} onClick={e=>{e.stopPropagation();if(!t.fromTraining)setEditModal(t)}}
                          style={{borderRadius:5,padding:'3px 5px',background:t.fromTraining?`${border}22`:cfg.bg,borderLeft:`2px solid ${border}`,cursor:t.fromTraining?'default':'pointer',position:'relative'}}>
                          {t.priority&&<span style={{position:'absolute',top:2,right:2,fontSize:8}}>⭐</span>}
                          <p style={{fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:t.fromTraining?border:'var(--text)'}}>{t.title}</p>
                          <p style={{fontSize:9,color:'var(--text-dim)',margin:'1px 0 0'}}>{formatDur(t.durationMin)}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Task modal */}
      {taskModal&&<TaskModal dayIndex={taskModal.dayIndex} startHour={taskModal.startHour} onClose={()=>setTaskModal(null)} onSave={addTask}/>}
      {editModal&&<TaskEditModal task={editModal} onClose={()=>setEditModal(null)} onSave={updateTask} onDelete={deleteTask}/>}
    </div>
  )
}

function TaskModal({dayIndex,startHour,onClose,onSave}:{dayIndex:number;startHour:number;onClose:()=>void;onSave:(t:Omit<WeekTask,'id'>)=>void}) {
  const [title,setTitle]=useState('')
  const [type,setType]=useState<TaskType>('work')
  const [sh,setSh]=useState(startHour)
  const [sm,setSm]=useState(0)
  const [dur,setDur]=useState(60)
  const [desc,setDesc]=useState('')
  const [priority,setPriority]=useState(false)
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:420,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0}}>Nouvelle tâche — {DAYS_LABELS[dayIndex]}</h3>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button>
        </div>
        <div style={{marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Type</p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
            {(Object.entries(TASK_CONFIG) as [TaskType,{label:string;color:string;bg:string}][]).map(([t,cfg])=>(
              <button key={t} onClick={()=>setType(t)} style={{padding:'5px 11px',borderRadius:8,border:'1px solid',borderColor:type===t?cfg.color:'var(--border)',background:type===t?cfg.bg:'var(--bg-card2)',color:type===t?cfg.color:'var(--text-mid)',fontSize:12,cursor:'pointer',fontWeight:type===t?600:400}}>{cfg.label}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Titre</p>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nom de la tâche" style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Heure début</p><input type="number" min={5} max={23} value={sh} onChange={e=>setSh(parseInt(e.target.value))} style={{width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Minutes</p><select value={sm} onChange={e=>setSm(parseInt(e.target.value))} style={{width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}><option value={0}>00</option><option value={15}>15</option><option value={30}>30</option><option value={45}>45</option></select></div>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Durée (min)</p><input type="number" min={15} step={15} value={dur} onChange={e=>setDur(parseInt(e.target.value))} style={{width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>
        </div>
        <div style={{marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Description</p>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Détails…" style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,cursor:'pointer'}} onClick={()=>setPriority(!priority)}>
          <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${priority?'#ffb340':'var(--border)'}`,background:priority?'#ffb340':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {priority&&<span style={{color:'#fff',fontSize:12,lineHeight:1}}>✓</span>}
          </div>
          <p style={{fontSize:13,fontWeight:500,margin:0,color:priority?'#ffb340':'var(--text-mid)'}}>⭐ Tâche prioritaire</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer'}}>Annuler</button>
          <button onClick={()=>onSave({title:title||'Tâche',type,dayIndex,startHour:sh,startMin:sm,durationMin:dur,description:desc||undefined,priority})} style={{flex:2,padding:10,borderRadius:10,background:`linear-gradient(135deg,${TASK_CONFIG[type].color},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>+ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function TaskEditModal({task,onClose,onSave,onDelete}:{task:WeekTask;onClose:()=>void;onSave:(t:WeekTask)=>void;onDelete:(id:string)=>void}) {
  const [form,setForm]=useState<WeekTask>({...task})
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:400,width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0}}>Modifier la tâche</h3>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button>
        </div>
        <div style={{marginBottom:10}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Titre</p><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Heure</p><input type="number" value={form.startHour} onChange={e=>setForm({...form,startHour:parseInt(e.target.value)})} style={{width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Durée (min)</p><input type="number" value={form.durationMin} onChange={e=>setForm({...form,durationMin:parseInt(e.target.value)})} style={{width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}/></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,cursor:'pointer'}} onClick={()=>setForm({...form,priority:!form.priority})}>
          <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${form.priority?'#ffb340':'var(--border)'}`,background:form.priority?'#ffb340':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{form.priority&&<span style={{color:'#fff',fontSize:12}}>✓</span>}</div>
          <p style={{fontSize:13,margin:0,color:form.priority?'#ffb340':'var(--text-mid)'}}>⭐ Prioritaire</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>onDelete(task.id)} style={{padding:'9px 12px',borderRadius:10,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:12,cursor:'pointer'}}>Supprimer</button>
          <button onClick={()=>onSave(form)} style={{flex:1,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>Sauvegarder</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// RACE YEAR TAB
// ════════════════════════════════════════════════
function RaceYearTab() {
  const [races,setRaces]=useState<Race[]>(INITIAL_RACES)
  const [calView,setCalView]=useState<CalView>('year')
  const [currentMonth,setCurrentMonth]=useState(2) // Mars = index 2
  const [addModal,setAddModal]=useState<{month:number;day?:number}|null>(null)
  const [detailModal,setDetailModal]=useState<Race|null>(null)
  const year=2025

  const gty=races.find(r=>r.level==='gty')
  const nextRace=races.filter(r=>daysUntil(r.date)>0).sort((a,b)=>daysUntil(a.date)-daysUntil(b.date))[0]

  function addRace(r:Omit<Race,'id'>){setRaces(p=>[...p,{...r,id:uid()}]);setAddModal(null)}
  function deleteRace(id:string){setRaces(p=>p.filter(r=>r.id!==id));setDetailModal(null)}

  function getRacesForMonth(month:number){return races.filter(r=>{const d=new Date(r.date);return d.getFullYear()===year&&d.getMonth()===month})}

  function getDaysInMonth(month:number){return new Date(year,month+1,0).getDate()}
  function getFirstDayOfMonth(month:number){return new Date(year,month,1).getDay()||7} // Mon=1

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* GTY banner */}
      {gty&&(
        <div style={{padding:'14px 18px',borderRadius:14,background:'linear-gradient(135deg,rgba(15,15,15,0.9),rgba(30,30,30,0.85))',border:'2px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' as const}}>
          <span style={{fontSize:28}}>⚫</span>
          <div style={{flex:1}}>
            <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.5)',margin:'0 0 2px'}}>Goal of the Year</p>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:'#fff',margin:'0 0 2px'}}>{gty.name}</p>
            {gty.goal&&<p style={{fontSize:12,color:'rgba(255,255,255,0.6)',margin:0}}>🎯 {gty.goal}</p>}
          </div>
          <div style={{textAlign:'center' as const}}>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color:'#fff',margin:0,lineHeight:1}}>{Math.max(0,daysUntil(gty.date))}</p>
            <p style={{fontSize:11,color:'rgba(255,255,255,0.5)',margin:0}}>jours restants</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.7)',margin:'2px 0 0'}}>{new Date(gty.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:8}}>
        <div style={{display:'flex',gap:6}}>
          {([['year','Vue annuelle'],['month','Vue mensuelle']] as [CalView,string][]).map(([v,l])=>(
            <button key={v} onClick={()=>setCalView(v)} style={{padding:'7px 14px',borderRadius:10,border:'1px solid',borderColor:calView===v?'#00c8e0':'var(--border)',background:calView===v?'rgba(0,200,224,0.10)':'var(--bg-card)',color:calView===v?'#00c8e0':'var(--text-mid)',fontSize:12,cursor:'pointer',fontWeight:calView===v?600:400}}>{l}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {/* Stats */}
          <div style={{display:'flex',gap:8}}>
            {(['secondary','important','main','gty'] as RaceLevel[]).map(l=>{const cfg=RACE_CONFIG[l];const count=races.filter(r=>r.level===l).length;return count>0&&(
              <span key={l} style={{padding:'3px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700}}>{count} {cfg.label}</span>
            )})}
          </div>
          <button onClick={()=>setAddModal({month:currentMonth})} style={{padding:'7px 14px',borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>+ Course</button>
        </div>
      </div>

      {/* Vue annuelle */}
      {calView==='year'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}} className="md:grid-cols-4">
          {MONTHS.map((month,monthIdx)=>{
            const monthRaces=getRacesForMonth(monthIdx)
            const daysCount=getDaysInMonth(monthIdx)
            return(
              <div key={monthIdx} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:13,padding:14,boxShadow:'var(--shadow-card)',cursor:'pointer'}}
                onClick={()=>{setCurrentMonth(monthIdx);setCalView('month')}}>
                <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 8px',color:monthRaces.length>0?'var(--text)':'var(--text-dim)'}}>{MONTH_SHORT[monthIdx]}</p>
                {monthRaces.length>0&&(
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {monthRaces.sort((a,b)=>new Date(a.date).getDate()-new Date(b.date).getDate()).map(r=>{
                      const cfg=RACE_CONFIG[r.level]
                      const dayNum=new Date(r.date).getDate()
                      return(
                        <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}}
                          style={{display:'flex',alignItems:'center',gap:5,padding:'4px 7px',borderRadius:7,background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer'}}>
                          <span style={{fontSize:10}}>{cfg.emoji}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:r.level==='gty'?'#fff':cfg.color}}>{r.name}</p>
                            <p style={{fontSize:9,color:'var(--text-dim)',margin:0}}>{dayNum} {MONTH_SHORT[monthIdx]}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {monthRaces.length===0&&<p style={{fontSize:10,color:'var(--text-dim)',margin:0,fontStyle:'italic' as const}}>Aucune course</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Vue mensuelle */}
      {calView==='month'&&(
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>setCurrentMonth(m=>Math.max(0,m-1))} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-mid)',fontSize:14}}>←</button>
              <h2 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>{MONTHS[currentMonth]} {year}</h2>
              <button onClick={()=>setCurrentMonth(m=>Math.min(11,m+1))} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-mid)',fontSize:14}}>→</button>
            </div>
            <button onClick={()=>setAddModal({month:currentMonth})} style={{padding:'6px 12px',borderRadius:9,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',fontSize:12,cursor:'pointer',fontWeight:600}}>+ Ajouter</button>
          </div>

          {/* Days of week header */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:6}}>
            {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>(
              <div key={d} style={{textAlign:'center' as const,fontSize:10,fontWeight:600,color:'var(--text-dim)',padding:'4px 0',textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{d}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
            {/* Empty cells before first day */}
            {Array.from({length:getFirstDayOfMonth(currentMonth)-1},(_,i)=>(
              <div key={`empty-${i}`} style={{height:70,borderRadius:8,background:'var(--bg-card2)',opacity:0.4}}/>
            ))}
            {/* Days */}
            {Array.from({length:getDaysInMonth(currentMonth)},(_,i)=>{
              const day=i+1
              const dateStr=`${year}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const dayRaces=races.filter(r=>r.date===dateStr)
              const isToday=new Date().toDateString()===new Date(dateStr).toDateString()
              return(
                <div key={day} onClick={()=>setAddModal({month:currentMonth,day})}
                  style={{height:70,borderRadius:8,background:'var(--bg-card2)',border:`1px solid ${isToday?'#00c8e0':'var(--border)'}`,padding:'4px 5px',cursor:'pointer',display:'flex',flexDirection:'column',gap:2,position:'relative'}}>
                  <p style={{fontSize:11,fontWeight:isToday?700:500,color:isToday?'#00c8e0':'var(--text-mid)',margin:0,textAlign:'right' as const}}>{day}</p>
                  {dayRaces.map(r=>{const cfg=RACE_CONFIG[r.level];return(
                    <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}}
                      style={{borderRadius:4,padding:'2px 4px',background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer'}}>
                      <p style={{fontSize:8,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:r.level==='gty'?'#fff':cfg.color}}>{cfg.emoji} {r.name}</p>
                    </div>
                  )})}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next race countdown */}
      {nextRace&&(
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)'}}>
          <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 10px'}}>Prochaine course</p>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' as const}}>
            <div style={{width:56,height:56,borderRadius:12,background:RACE_CONFIG[nextRace.level].bg,border:`2px solid ${RACE_CONFIG[nextRace.level].border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:nextRace.level==='gty'?'#fff':RACE_CONFIG[nextRace.level].color,lineHeight:1}}>{daysUntil(nextRace.date)}</span>
              <span style={{fontSize:8,color:'var(--text-dim)'}}>jours</span>
            </div>
            <div style={{flex:1}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>{nextRace.name}</p>
              <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap' as const}}>
                <span style={{padding:'2px 8px',borderRadius:20,background:RACE_CONFIG[nextRace.level].bg,border:`1px solid ${RACE_CONFIG[nextRace.level].border}`,color:nextRace.level==='gty'?'#fff':RACE_CONFIG[nextRace.level].color,fontSize:10,fontWeight:700}}>{RACE_CONFIG[nextRace.level].label}</span>
                <span style={{fontSize:11,color:'var(--text-dim)'}}>{new Date(nextRace.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</span>
              </div>
              {nextRace.goal&&<p style={{fontSize:11,color:'var(--text-mid)',margin:'4px 0 0'}}>🎯 {nextRace.goal}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Race list */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0,color:'var(--text-mid)'}}>Toutes les courses {year}</h2>
        {(['gty','main','important','secondary'] as RaceLevel[]).map(level=>{
          const levelRaces=races.filter(r=>r.level===level).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
          if(!levelRaces.length) return null
          const cfg=RACE_CONFIG[level]
          return(
            <div key={level}>
              <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:cfg.color,margin:'0 0 6px'}}>{cfg.emoji} {cfg.label}</p>
              {levelRaces.map(r=>{
                const days=daysUntil(r.date)
                const past=days<0
                return(
                  <div key={r.id} onClick={()=>setDetailModal(r)}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:11,background:past?'var(--bg-card2)':cfg.bg,border:`1px solid ${past?'var(--border)':cfg.border+'44'}`,marginBottom:6,cursor:'pointer',opacity:past?0.65:1}}>
                    <div style={{textAlign:'center' as const,minWidth:44,flexShrink:0}}>
                      <p style={{fontFamily:'Syne,sans-serif',fontSize:past?14:20,fontWeight:800,color:past?'var(--text-dim)':level==='gty'?'#fff':cfg.color,margin:0,lineHeight:1}}>{past?'✓':days}</p>
                      <p style={{fontSize:9,color:'var(--text-dim)',margin:0}}>{past?'Passée':'jours'}</p>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{r.name}</p>
                      <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>{new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})} · {SPORT_EMOJI[r.type]}</p>
                      {r.goal&&<p style={{fontSize:10,color:'var(--text-mid)',margin:'1px 0 0'}}>🎯 {r.goal}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {addModal&&<RaceAddModal month={addModal.month} day={addModal.day} onClose={()=>setAddModal(null)} onSave={addRace}/>}
      {detailModal&&<RaceDetailModal race={detailModal} onClose={()=>setDetailModal(null)} onDelete={deleteRace}/>}
    </div>
  )
}

function RaceAddModal({month,day,onClose,onSave}:{month:number;day?:number;onClose:()=>void;onSave:(r:Omit<Race,'id'>)=>void}) {
  const year=2025
  const defaultDate=`${year}-${String(month+1).padStart(2,'0')}-${String(day||1).padStart(2,'0')}`
  const [name,setName]=useState('')
  const [type,setType]=useState<SportType>('run')
  const [date,setDate]=useState(defaultDate)
  const [level,setLevel]=useState<RaceLevel>('important')
  const [goal,setGoal]=useState('')
  const [strategy,setStrategy]=useState('')
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:460,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0}}>Ajouter une course</h3>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button>
        </div>

        <div style={{marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Niveau</p>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {(['gty','main','important','secondary'] as RaceLevel[]).map(l=>{const cfg=RACE_CONFIG[l];return(
              <button key={l} onClick={()=>setLevel(l)} style={{padding:'9px 13px',borderRadius:10,border:'1px solid',cursor:'pointer',textAlign:'left' as const,borderColor:level===l?cfg.border:'var(--border)',background:level===l?cfg.bg:'var(--bg-card2)',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:16}}>{cfg.emoji}</span>
                <div>
                  <p style={{fontSize:12,fontWeight:600,margin:0,color:level===l?l==='gty'?'#fff':cfg.color:'var(--text)'}}>{cfg.label}</p>
                  <p style={{fontSize:10,color:'var(--text-dim)',margin:0}}>{l==='gty'?'Objectif principal de la saison':l==='main'?'Course clé de ta préparation':l==='important'?'Course importante avec objectif précis':'Préparation / test'}</p>
                </div>
              </button>
            )})}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10,marginBottom:12}}>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Nom de la course</p><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Ironman Nice" style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/></div>
          <div><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Date</p><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/></div>
        </div>

        <div style={{marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6}}>Sport</p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
            {(Object.keys(SPORT_LABEL) as SportType[]).map(s=>(
              <button key={s} onClick={()=>setType(s)} style={{padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:type===s?SPORT_BORDER[s]:'var(--border)',background:type===s?SPORT_BG[s]:'var(--bg-card2)',color:type===s?SPORT_BORDER[s]:'var(--text-mid)',fontSize:11,cursor:'pointer'}}>
                {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:10}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Objectif</p><input value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Ex: Sub 1h00, Podium AG, Finisher..." style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/></div>
        <div style={{marginBottom:16}}><p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Stratégie</p><textarea value={strategy} onChange={e=>setStrategy(e.target.value)} rows={2} placeholder="Notes stratégiques…" style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const}}/></div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer'}}>Annuler</button>
          <button onClick={()=>onSave({name:name||'Course',type,date,level,goal:goal||undefined,strategy:strategy||undefined})} style={{flex:2,padding:10,borderRadius:10,background:`linear-gradient(135deg,${RACE_CONFIG[level].border},#5b6fff)`,border:'none',color:level==='gty'?'#fff':'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>+ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function RaceDetailModal({race,onClose,onDelete}:{race:Race;onClose:()=>void;onDelete:(id:string)=>void}) {
  const cfg=RACE_CONFIG[race.level]
  const days=daysUntil(race.date)
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:400,width:'100%'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:20}}>{cfg.emoji}</span>
              <span style={{padding:'3px 9px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:race.level==='gty'?'#fff':cfg.color,fontSize:10,fontWeight:700}}>{cfg.label}</span>
            </div>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:700,margin:0}}>{race.name}</h3>
            <p style={{fontSize:12,color:'var(--text-dim)',margin:'4px 0 0'}}>{SPORT_EMOJI[race.type]} · {new Date(race.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button>
        </div>

        {/* Countdown */}
        <div style={{padding:'12px 16px',borderRadius:12,background:days>0?cfg.bg:'var(--bg-card2)',border:`1px solid ${days>0?cfg.border+'44':'var(--border)'}`,marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
          <div style={{textAlign:'center' as const,flexShrink:0}}>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:days>0?race.level==='gty'?'#fff':cfg.color:'var(--text-dim)',margin:0,lineHeight:1}}>{days>0?days:'✓'}</p>
            <p style={{fontSize:10,color:'var(--text-dim)',margin:0}}>{days>0?'jours restants':'Course passée'}</p>
          </div>
          <div>
            {race.goal&&<p style={{fontSize:13,fontWeight:600,margin:'0 0 4px'}}>🎯 {race.goal}</p>}
            {race.strategy&&<p style={{fontSize:12,color:'var(--text-mid)',margin:0,lineHeight:1.5}}>{race.strategy}</p>}
          </div>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>onDelete(race.id)} style={{padding:'9px 12px',borderRadius:10,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:12,cursor:'pointer'}}>Supprimer</button>
          <button onClick={onClose} style={{flex:1,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════
export default function PlanningPage() {
  const [tab,setTab]=useState<PlanningTab>('training')
  const [trainingWeek]=useState<WeekDay[]>(INITIAL_WEEK)

  const TABS:[PlanningTab,string,string,string][]=[
    ['training','Planning Training','#00c8e0','rgba(0,200,224,0.10)'],
    ['week',    'Planning Week',    '#a78bfa','rgba(167,139,250,0.10)'],
    ['race',    'Race Year',        '#ef4444','rgba(239,68,68,0.10)'],
  ]

  return(
    <div style={{padding:'24px 28px',maxWidth:'100%'}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0}}>Planning</h1>
        <p style={{fontSize:12.5,color:'var(--text-dim)',margin:'5px 0 0'}}>Training · Semaine · Saison</p>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' as const}}>
        {TABS.map(([id,label,color,bg])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,minWidth:120,padding:'11px 16px',borderRadius:12,border:'1px solid',cursor:'pointer',
              borderColor:tab===id?color:'var(--border)',
              background:tab===id?bg:'var(--bg-card)',
              color:tab===id?color:'var(--text-mid)',
              fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:tab===id?700:400,
              boxShadow:tab===id?`0 0 0 1px ${color}33`:'var(--shadow-card)',transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>

      {tab==='training' && <TrainingTab/>}
      {tab==='week'     && <WeekTab trainingWeek={trainingWeek}/>}
      {tab==='race'     && <RaceYearTab/>}
    </div>
  )
}
