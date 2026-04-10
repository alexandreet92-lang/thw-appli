'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────
type PlanningTab   = 'training' | 'week' | 'race'
type PlanVariant   = 'A' | 'B'
type WeekRange     = 1 | 5 | 10
type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing' | 'gym'
type SessionStatus = 'planned' | 'done'
type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown'
type TaskType      = 'sport' | 'work' | 'personal' | 'recovery'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type CalView       = 'year' | 'month'
type TrainingView  = 'horizontal' | 'vertical'
type RaceSport     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'

// ── Constants ─────────────────────────────────────
const SPORT_BG: Record<SportType,string>     = { swim:'rgba(56,189,248,0.13)', run:'rgba(34,197,94,0.13)', bike:'rgba(59,130,246,0.13)', hyrox:'rgba(239,68,68,0.13)', gym:'rgba(249,115,22,0.13)', triathlon:'rgba(168,85,247,0.13)', rowing:'rgba(20,184,166,0.13)' }
const SPORT_BORDER: Record<SportType,string> = { swim:'#38bdf8', run:'#22c55e', bike:'#3b82f6', hyrox:'#ef4444', gym:'#f97316', triathlon:'#a855f7', rowing:'#14b8a6' }
const SPORT_EMOJI: Record<SportType,string>  = { run:'🏃', bike:'🚴', swim:'🏊', hyrox:'🏋️', gym:'💪', triathlon:'🔱', rowing:'🚣' }
const SPORT_LABEL: Record<SportType,string>  = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation', triathlon:'Triathlon', rowing:'Aviron' }
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
const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

// ── Interfaces ────────────────────────────────────
interface TrainingActivity {
  id:string; sport:string; name:string; startedAt:string
  elapsedTime:number; dayIndex:number; weekStart:string
  distance?:number; startHour:number; startMin:number
}
interface Block { id:string; type:BlockType; durationMin:number; zone:number; value:string; hrAvg:string; label:string }
interface Session {
  id:string; sport:SportType; title:string; time:string; durationMin:number
  tss?:number; main?:boolean; status:SessionStatus; notes?:string; blocks:Block[]
  rpe?:number; dayIndex:number; planVariant?:PlanVariant
  vDuration?:string; vDistance?:string; vElevation?:string; vSpeed?:string
  vHrAvg?:string; vPace?:string
  vHyroxStations?: Record<string,string>; vHyroxRuns?: string[]
  vSwimTime?:string; vBikeTime?:string; vRunTime?:string; vT1?:string; vT2?:string
}
interface WeekTask {
  id:string; title:string; type:TaskType; dayIndex:number
  startHour:number; startMin:number; durationMin:number
  description?:string; priority?:boolean; fromTraining?:boolean; color?:string
  isMain?:boolean
}
interface Race {
  id:string; name:string; sport:RaceSport; date:string; level:RaceLevel
  goal?:string; strategy?:string
  runDistance?:string; triDistance?:string
  hyroxCategory?:string; hyroxLevel?:string; hyroxGender?:string
  goalTime?:string; goalSwimTime?:string; goalBikeTime?:string; goalRunTime?:string
  validated?:boolean; validationData?:Record<string,any>
}

// ── Helpers ───────────────────────────────────────
function uid():string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function formatDur(min:number):string { const h=Math.floor(min/60),m=min%60; return h===0?`0:${String(m).padStart(2,'0')}`:`${h}h${String(m).padStart(2,'0')}` }
function daysUntil(d:string):number { return Math.ceil((new Date(d).getTime()-Date.now())/(1000*60*60*24)) }
function calcSpeed(km:string,t:string):string { const d=parseFloat(km),m=parseFloat(t); if(!d||!m)return '—'; return `${(d/(m/60)).toFixed(1)} km/h` }
function calcPaceStr(km:string,t:string):string { const d=parseFloat(km),m=parseFloat(t); if(!d||!m)return '—'; const s=m*60/d; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}/km` }
function parsePace(s:string):number { const p=s.replace(',',':').split(':'); return (parseInt(p[0])||0)*60+(parseInt(p[1])||0) }
function getWeekStart():string { const now=new Date(); const dow=now.getDay()===0?6:now.getDay()-1; const m=new Date(now); m.setDate(now.getDate()-dow); return m.toISOString().split('T')[0] }
function getTodayIdx():number { const d=new Date().getDay(); return d===0?6:d-1 }

const ATHLETE = { ftp:301, thresholdPace:248, css:88 }
function getZone(sport:SportType,v:string):number {
  if(!v)return 1
  if(sport==='bike'){ const w=parseInt(v)||0,f=ATHLETE.ftp; if(w<f*0.55)return 1;if(w<f*0.75)return 2;if(w<f*0.87)return 3;if(w<f*1.05)return 4;return 5 }
  if(sport==='run'){ const s=parsePace(v),t=ATHLETE.thresholdPace; if(s>t*1.25)return 1;if(s>t*1.10)return 2;if(s>t*1.00)return 3;if(s>t*0.90)return 4;return 5 }
  return 3
}
function calcTSS(blocks:Block[],sport:SportType):number {
  return Math.round(blocks.reduce((t,b)=>{ const IF=[0.55,0.70,0.83,0.95,1.10][b.zone-1]; return t+(b.durationMin/60)*IF*IF*100*(sport==='bike'?1:0.9) },0))
}
function getWeekDates():string[] {
  const now=new Date(); const dow=now.getDay()===0?6:now.getDay()-1
  return DAY_NAMES.map((_,i)=>{ const d=new Date(now); d.setDate(now.getDate()-dow+i); return String(d.getDate()) })
}
function getWeekStartFromOffset(offset:number):string {
  const d=new Date(); d.setDate(d.getDate()+offset*7)
  const dow=d.getDay()===0?6:d.getDay()-1; const m=new Date(d); m.setDate(d.getDate()-dow)
  return m.toISOString().split('T')[0]
}
function getWeekDatesFromStart(ws:string):string[] {
  return DAY_NAMES.map((_,i)=>{ const d=new Date(ws); d.setDate(d.getDate()+i); return String(d.getDate()) })
}
function getWeekLabel(ws:string):string {
  const d=new Date(ws); const e=new Date(ws); e.setDate(e.getDate()+6)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]}`
}
function normalizeSportType(s:string):SportType {
  const m:Record<string,SportType>={running:'run',cycling:'bike',virtual_ride:'bike',virtual_bike:'bike',swimming:'swim',trail_run:'run',trail_running:'run'}
  return m[s]??((['run','bike','swim','hyrox','gym','triathlon','rowing'] as SportType[]).includes(s as SportType)?s as SportType:'run')
}

// ════════════════════════════════════════════════
// SUPABASE HOOK
// ════════════════════════════════════════════════
function usePlanning(weekStartParam?:string) {
  const supabase  = createClient()
  const weekStart = weekStartParam ?? getWeekStart()
  const [sessions,    setSessions]    = useState<Session[]>([])
  const [tasks,       setTasks]       = useState<WeekTask[]>([])
  const [races,       setRaces]       = useState<Race[]>([])
  const [intensities, setIntensities] = useState<Record<number,DayIntensity>>({})
  const [activities,  setActivities]  = useState<TrainingActivity[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const weekEnd=new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+7)
    const weekEndStr=weekEnd.toISOString().split('T')[0]
    const [s,t,r,di,acts] = await Promise.all([
      supabase.from('planned_sessions').select('*').eq('user_id',user.id).eq('week_start',weekStart),
      supabase.from('week_tasks').select('*').eq('user_id',user.id).eq('week_start',weekStart),
      supabase.from('planned_races').select('*').eq('user_id',user.id).order('date'),
      supabase.from('day_intensity').select('*').eq('user_id',user.id).eq('week_start',weekStart),
      supabase.from('activities').select('id,sport_type,name,started_at,elapsed_time,distance')
        .gte('started_at',weekStart+'T00:00:00').lt('started_at',weekEndStr+'T00:00:00'),
    ])
    setSessions((s.data??[]).map((r:any):Session=>({
      id:r.id, dayIndex:r.day_index, sport:r.sport, title:r.title,
      time:r.time??'09:00', durationMin:r.duration_min, tss:r.tss,
      status:r.status, notes:r.notes, rpe:r.rpe, blocks:r.blocks??[], main:false,
      planVariant:r.plan_variant??'A',
      ...(r.validation_data??{}),
    })))
    setTasks((t.data??[]).map((r:any):WeekTask=>({
      id:r.id, title:r.title, type:r.type, dayIndex:r.day_index,
      startHour:r.start_hour, startMin:r.start_min??0, durationMin:r.duration_min,
      description:r.description, priority:r.priority??false, isMain:r.is_main??false,
    })))
    const mappedActs:TrainingActivity[]=(acts.data??[]).map((a:any)=>{
      const d=new Date(a.started_at); const dow=d.getDay()===0?6:d.getDay()-1
      return { id:a.id, sport:a.sport_type??'run', name:a.name??'Activité',
        startedAt:a.started_at, elapsedTime:a.elapsed_time??0,
        dayIndex:dow, weekStart, distance:a.distance,
        startHour:d.getHours(), startMin:d.getMinutes() }
    })
    setActivities(mappedActs)
    setRaces((r.data??[]).map((x:any):Race=>({
      id:x.id, name:x.name, sport:x.sport, date:x.date, level:x.level,
      goal:x.goal, strategy:x.strategy, runDistance:x.run_distance,
      triDistance:x.tri_distance, hyroxCategory:x.hyrox_category,
      hyroxLevel:x.hyrox_level, hyroxGender:x.hyrox_gender,
      goalTime:x.goal_time, goalSwimTime:x.goal_swim_time,
      goalBikeTime:x.goal_bike_time, goalRunTime:x.goal_run_time,
      validated:x.validated??false, validationData:x.validation_data??{},
    })))
    const map:Record<number,DayIntensity>={}
    ;(di.data??[]).forEach((x:any)=>{ map[x.day_index]=x.intensity })
    setIntensities(map)
    setLoading(false)
  }, [weekStart])

  useEffect(()=>{ load() },[load])

  async function addSession(s:Omit<Session,'id'>) {
    const { data:{ user } } = await supabase.auth.getUser(); if(!user)return
    const { data,error } = await supabase.from('planned_sessions').insert({
      user_id:user.id, week_start:weekStart, day_index:s.dayIndex,
      sport:s.sport, title:s.title, time:s.time, duration_min:s.durationMin,
      tss:s.tss??null, status:s.status, notes:s.notes??null,
      rpe:s.rpe??null, blocks:s.blocks??[], validation_data:{},
      plan_variant:s.planVariant??'A',
    }).select().single()
    if(!error&&data) setSessions(p=>[...p,{...s,id:data.id}])
  }

  async function updateSession(id:string, upd:Partial<Session>) {
    await supabase.from('planned_sessions').update({
      title:upd.title, time:upd.time, duration_min:upd.durationMin,
      notes:upd.notes??null, rpe:upd.rpe??null, blocks:upd.blocks??[],
      tss:upd.tss??null, status:upd.status,
      validation_data:{ vDuration:upd.vDuration, vDistance:upd.vDistance, vHrAvg:upd.vHrAvg, vSpeed:upd.vSpeed },
      updated_at:new Date().toISOString(),
    }).eq('id',id)
    setSessions(p=>p.map(s=>s.id===id?{...s,...upd}:s))
  }

  async function deleteSession(id:string) {
    await supabase.from('planned_sessions').delete().eq('id',id)
    setSessions(p=>p.filter(s=>s.id!==id))
  }

  async function moveSession(id:string, toDay:number) {
    await supabase.from('planned_sessions').update({ day_index:toDay, updated_at:new Date().toISOString() }).eq('id',id)
    setSessions(p=>p.map(s=>s.id===id?{...s,dayIndex:toDay}:s))
  }

  async function addTask(t:Omit<WeekTask,'id'>) {
    const { data:{ user } } = await supabase.auth.getUser(); if(!user)return
    const { data,error } = await supabase.from('week_tasks').insert({
      user_id:user.id, week_start:weekStart, title:t.title, type:t.type,
      day_index:t.dayIndex, start_hour:t.startHour, start_min:t.startMin,
      duration_min:t.durationMin, description:t.description??null,
      priority:t.priority??false, is_main:t.isMain??false,
    }).select().single()
    if(!error&&data) setTasks(p=>[...p,{...t,id:data.id}])
  }

  async function updateTask(t:WeekTask) {
    await supabase.from('week_tasks').update({
      title:t.title, start_hour:t.startHour, start_min:t.startMin,
      duration_min:t.durationMin, priority:t.priority, is_main:t.isMain??false,
    }).eq('id',t.id)
    setTasks(p=>p.map(x=>x.id===t.id?t:x))
  }

  async function deleteTask(id:string) {
    await supabase.from('week_tasks').delete().eq('id',id)
    setTasks(p=>p.filter(t=>t.id!==id))
  }

  async function addRace(r:Omit<Race,'id'|'validated'|'validationData'>) {
    const { data:{ user } } = await supabase.auth.getUser(); if(!user)return
    const { data,error } = await supabase.from('planned_races').insert({
      user_id:user.id, name:r.name, sport:r.sport, date:r.date, level:r.level,
      goal:r.goal??null, strategy:r.strategy??null, run_distance:r.runDistance??null,
      tri_distance:r.triDistance??null, hyrox_category:r.hyroxCategory??null,
      hyrox_level:r.hyroxLevel??null, hyrox_gender:r.hyroxGender??null,
      goal_time:r.goalTime??null, goal_swim_time:r.goalSwimTime??null,
      goal_bike_time:r.goalBikeTime??null, goal_run_time:r.goalRunTime??null,
      validated:false, validation_data:{},
    }).select().single()
    if(!error&&data) setRaces(p=>[...p,{...r,id:data.id,validated:false,validationData:{}}])
  }

  async function updateRace(r:Race) {
    await supabase.from('planned_races').update({
      name:r.name, sport:r.sport, date:r.date, level:r.level,
      goal:r.goal??null, strategy:r.strategy??null,
      validated:r.validated??false, validation_data:r.validationData??{},
      updated_at:new Date().toISOString(),
    }).eq('id',r.id)
    setRaces(p=>p.map(x=>x.id===r.id?r:x))
  }

  async function deleteRace(id:string) {
    await supabase.from('planned_races').delete().eq('id',id)
    setRaces(p=>p.filter(r=>r.id!==id))
  }

  async function setDayIntensity(dayIdx:number, intensity:DayIntensity) {
    const { data:{ user } } = await supabase.auth.getUser(); if(!user)return
    await supabase.from('day_intensity').upsert({
      user_id:user.id, week_start:weekStart, day_index:dayIdx, intensity,
      updated_at:new Date().toISOString(),
    },{ onConflict:'user_id,week_start,day_index' })
    setIntensities(p=>({...p,[dayIdx]:intensity}))
  }

  return { sessions, tasks, races, intensities, activities, loading, weekStart,
    addSession, updateSession, deleteSession, moveSession,
    addTask, updateTask, deleteTask,
    addRace, updateRace, deleteRace, setDayIntensity, reload:load }
}

// ════════════════════════════════════════════════
// SHARED UI
// ════════════════════════════════════════════════
function InfoModal({ title, content, onClose }:{ title:string; content:React.ReactNode; onClose:()=>void }) {
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:400,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16 }}>×</button>
        </div>
        <div style={{ fontSize:13,color:'var(--text-mid)',lineHeight:1.7 }}>{content}</div>
      </div>
    </div>
  )
}

function BlockBuilder({ sport, blocks, onChange }:{ sport:SportType; blocks:Block[]; onChange:(b:Block[])=>void }) {
  const vLabel = sport==='bike'?'Watts':sport==='swim'?'Allure /100m':'Allure /km'
  const vPlh   = sport==='bike'?'250':sport==='swim'?'1:35':'4:30'
  function addBlock() { onChange([...blocks,{id:`b_${Date.now()}`,type:'effort',durationMin:10,zone:3,value:sport==='bike'?'220':'4:30',hrAvg:'',label:'Bloc'}]) }
  function upd(id:string,field:keyof Block,val:string|number) { onChange(blocks.map(b=>{ if(b.id!==id)return b; const u:Block={...b,[field]:val}; if(field==='value')u.zone=getZone(sport,String(val)); return u })) }
  const totalMin = blocks.reduce((s,b)=>s+b.durationMin,0)
  return (
    <div>
      {blocks.length>0 && (
        <div style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',marginBottom:7 }}>
            TSS estimé : <span style={{ color:SPORT_BORDER[sport] }}>{calcTSS(blocks,sport)} pts</span>
            <span style={{ marginLeft:10,fontWeight:400 }}>· {formatDur(totalMin)}</span>
          </p>
          <div style={{ display:'flex',alignItems:'flex-end',gap:2,height:48,marginBottom:4 }}>
            {blocks.map(b=>{ const hp=((b.zone/5)*0.85+0.05)*100,wp=(b.durationMin/totalMin)*100,c=ZONE_COLORS[b.zone-1]; return <div key={b.id} style={{ width:`${wp}%`,height:`${hp}%`,background:`linear-gradient(180deg,${c}ee,${c}55)`,borderRadius:'3px 3px 0 0',border:`1px solid ${c}88`,minWidth:4 }}/> })}
          </div>
        </div>
      )}
      <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:7 }}>
        {blocks.map(b=>(
          <div key={b.id} style={{ background:'var(--bg-card2)',border:`1px solid ${ZONE_COLORS[b.zone-1]}44`,borderLeft:`3px solid ${ZONE_COLORS[b.zone-1]}`,borderRadius:8,padding:'7px 9px' }}>
            <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:6 }}>
              <span style={{ width:20,height:20,borderRadius:4,background:`${ZONE_COLORS[b.zone-1]}22`,border:`1px solid ${ZONE_COLORS[b.zone-1]}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:ZONE_COLORS[b.zone-1],flexShrink:0 }}>Z{b.zone}</span>
              <select value={b.type} onChange={e=>upd(b.id,'type',e.target.value)} style={{ flex:1,padding:'3px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none' }}>
                {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <input value={b.label} onChange={e=>upd(b.id,'label',e.target.value)} placeholder="Nom" style={{ flex:1.5,padding:'3px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none' }}/>
              <button onClick={()=>onChange(blocks.filter(x=>x.id!==b.id))} style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:12,flexShrink:0 }}>✕</button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5 }}>
              <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Durée (min)</p><input type="number" value={b.durationMin} onChange={e=>upd(b.id,'durationMin',parseInt(e.target.value)||0)} style={{ width:'100%',padding:'4px 6px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
              <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>{vLabel}</p><input value={b.value} onChange={e=>upd(b.id,'value',e.target.value)} placeholder={vPlh} style={{ width:'100%',padding:'4px 6px',borderRadius:5,border:`1px solid ${ZONE_COLORS[b.zone-1]}66`,background:`${ZONE_COLORS[b.zone-1]}11`,color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
              <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>FC moy.</p><input value={b.hrAvg} onChange={e=>upd(b.id,'hrAvg',e.target.value)} placeholder="158" style={{ width:'100%',padding:'4px 6px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addBlock} style={{ width:'100%',padding:'7px',borderRadius:8,background:'transparent',border:'1px dashed var(--border-mid)',color:'var(--text-dim)',fontSize:11,cursor:'pointer' }}>+ Ajouter un bloc</button>
    </div>
  )
}

// ════════════════════════════════════════════════
// LAST 10 WEEKS MODAL
// ════════════════════════════════════════════════
function Last10WeeksModal({ onClose }:{ onClose:()=>void }) {
  const [tssInfo, setTssInfo] = useState(false)
  const weeks = Array.from({length:10},(_,i)=>({w:`S${i+1}`,plannedH:0,doneH:0,tss:0}))
  const avgTSS = 0
  function tssColor(tss:number):string { if(tss<avgTSS*0.8)return '#6b7280'; if(tss<=avgTSS*1.15)return '#22c55e'; return '#ef4444' }
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:580,width:'100%',maxHeight:'90vh',overflowY:'auto' }}>
        {tssInfo && <InfoModal title="Qu'est-ce que le TSS ?" content={<><p><strong>TSS (Training Stress Score)</strong> mesure la charge d'entraînement.</p><p>Calculé selon l'intensité (zones) et la durée :</p><p style={{ fontFamily:'DM Mono,monospace',fontSize:12,background:'var(--bg-card2)',padding:'8px 12px',borderRadius:8 }}>TSS = (durée en h) × IF² × 100</p><p>⬛ <span style={{color:'#6b7280'}}>Gris</span> — sous ta normale · 🟩 <span style={{color:'#22c55e'}}>Vert</span> — progressif · 🟥 <span style={{color:'#ef4444'}}>Rouge</span> — surcharge</p></>} onClose={()=>setTssInfo(false)}/>}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:700,margin:0 }}>Last 10 Weeks</h3>
            <p style={{ fontSize:12,color:'var(--text-dim)',margin:'3px 0 0' }}>Volume & TSS</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16 }}>✕</button>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:0 }}>TSS</p>
          <button onClick={()=>setTssInfo(true)} style={{ width:18,height:18,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center' }}>!</button>
          <span style={{ fontSize:10,color:'#6b7280' }}>⬛ Sous la normale</span>
          <span style={{ fontSize:10,color:'#22c55e' }}>🟩 Normal</span>
          <span style={{ fontSize:10,color:'#ef4444' }}>🟥 Surcharge</span>
        </div>
        <div style={{ textAlign:'center',padding:'30px 0',color:'var(--text-dim)',fontSize:13 }}>
          Aucune donnée — ajoutez des séances pour voir vos statistiques
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:14 }}>
          {[{l:'Volume prévu',v:'0h',c:'var(--text-dim)'},{l:'Volume réalisé',v:'0h',c:'#00c8e0'},{l:'TSS total',v:'0',c:'#ffb340'}].map(x=>(
            <div key={x.l} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px' }}>
              <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 4px' }}>{x.l}</p>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:x.c as string,margin:0 }}>{x.v}</p>
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
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [weekRange,   setWeekRange]   = useState<WeekRange>(1)
  const [activePlan,  setActivePlan]  = useState<PlanVariant>('A')
  const [compareMode, setCompareMode] = useState(false)
  const [showRangeDd, setShowRangeDd] = useState(false)
  const currentWeekStart = getWeekStartFromOffset(weekOffset)
  const { sessions, intensities, activities, loading, addSession, updateSession, deleteSession, moveSession, setDayIntensity } = usePlanning(currentWeekStart)
  const [view, setView] = useState<TrainingView>('vertical')
  const [addModal, setAddModal] = useState<{dayIndex:number;plan:PlanVariant}|null>(null)
  const [detailModal, setDetailModal] = useState<Session|null>(null)
  const [dragOver, setDragOver] = useState<number|null>(null)
  const [show10w, setShow10w] = useState(false)
  const [intensityModal, setIntensityModal] = useState<DayIntensity|null>(null)
  const dragRef  = useRef<{id:string;from:number}|null>(null)
  const touchRef = useRef<{id:string;from:number}|null>(null)
  const todayIdx = getTodayIdx()

  // Multi-week data for range > 1
  const [extraSessions, setExtraSessions] = useState<Record<string,Session[]>>({})
  useEffect(()=>{
    if(weekRange===1){ setExtraSessions({}); return }
    const sb=createClient()
    ;(async()=>{
      const {data:{user}}=await sb.auth.getUser(); if(!user)return
      const starts=Array.from({length:weekRange-1},(_,i)=>getWeekStartFromOffset(weekOffset+1+i))
      const {data}=await sb.from('planned_sessions').select('*').eq('user_id',user.id).in('week_start',starts)
      const grouped:Record<string,Session[]>={}; starts.forEach(ws=>{grouped[ws]=[]})
      ;(data??[]).forEach((r:any)=>{
        if(!grouped[r.week_start])grouped[r.week_start]=[]
        grouped[r.week_start].push({id:r.id,dayIndex:r.day_index,sport:r.sport,title:r.title,
          time:r.time??'09:00',durationMin:r.duration_min,tss:r.tss,status:r.status,
          notes:r.notes,rpe:r.rpe,blocks:r.blocks??[],main:false,planVariant:r.plan_variant??'A',
          ...(r.validation_data??{})})
      })
      setExtraSessions(grouped)
    })()
  },[weekRange,weekOffset])

  const allWeekStarts = Array.from({length:weekRange},(_,i)=>getWeekStartFromOffset(weekOffset+i))

  function getSessionsForWeek(ws:string, plan?:PlanVariant):Session[] {
    const raw = ws===currentWeekStart ? sessions : (extraSessions[ws]??[])
    if(!plan) return raw
    return raw.filter(s=>!s.planVariant||s.planVariant===plan)
  }
  function getActivitiesForWeek(ws:string):TrainingActivity[] {
    return ws===currentWeekStart ? activities : []
  }

  // Week displayed = based on offset
  const dates = getWeekDatesFromStart(currentWeekStart)
  function buildWeek(ws:string, plan?:PlanVariant) {
    const wDates = getWeekDatesFromStart(ws)
    const wSessions = getSessionsForWeek(ws, plan)
    const wActs = getActivitiesForWeek(ws)
    return DAY_NAMES.map((day,i)=>({
      day, date:wDates[i],
      intensity:(ws===currentWeekStart?(intensities[i]??'low'):'low') as DayIntensity,
      sessions: wSessions.filter(s=>s.dayIndex===i),
      activities: wActs.filter(a=>a.dayIndex===i),
    }))
  }
  const week = buildWeek(currentWeekStart, compareMode ? undefined : activePlan)

  async function handleAddSession(dayIdx:number, s:Session) {
    await addSession({ ...s, dayIndex:dayIdx, planVariant:addModal?.plan??activePlan })
  }
  async function handleSaveSession(s:Session) {
    await updateSession(s.id, s)
    setDetailModal(null)
  }
  async function handleValidate(s:Session) {
    await updateSession(s.id, { ...s, status:'done' })
    setDetailModal(null)
  }
  async function handleDelete(id:string) {
    await deleteSession(id)
    setDetailModal(null)
  }
  function handleChangeIntensity(dayIdx:number) {
    const cur = intensities[dayIdx]??'low'
    const next = INTENSITY_ORDER[(INTENSITY_ORDER.indexOf(cur as DayIntensity)+1)%INTENSITY_ORDER.length]
    setDayIntensity(dayIdx, next)
  }
  function onDragStart(id:string,from:number) { dragRef.current={id,from} }
  function onDrop(to:number) { if(!dragRef.current)return; if(dragRef.current.from!==to)moveSession(dragRef.current.id,to); dragRef.current=null; setDragOver(null) }
  function onTouchStart(id:string,from:number) { touchRef.current={id,from} }
  function onTouchEnd(to:number) { if(!touchRef.current)return; if(touchRef.current.from!==to)moveSession(touchRef.current.id,to); touchRef.current=null }

  const allSess = week.flatMap(d=>d.sessions)
  const plannedMin = allSess.reduce((s,x)=>s+x.durationMin,0)
  const doneMin    = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+x.durationMin,0)
  const plannedTSS = allSess.reduce((s,x)=>s+(x.tss||0),0)
  const doneTSS    = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+(x.tss||0),0)
  const plannedN   = allSess.length
  const doneN      = allSess.filter(s=>s.status==='done').length
  const sportCounts = (['run','bike','swim','hyrox','triathlon','rowing','gym'] as SportType[]).map(sp=>({ sport:sp, planned:allSess.filter(s=>s.sport===sp).length, done:allSess.filter(s=>s.sport===sp&&s.status==='done').length })).filter(s=>s.planned>0)
  const sportStats  = (['run','bike','swim','hyrox','triathlon','rowing','gym'] as SportType[]).map(sp=>({ sport:sp, plannedH:allSess.filter(s=>s.sport===sp).reduce((a,x)=>a+x.durationMin/60,0), doneH:allSess.filter(s=>s.sport===sp&&s.status==='done').reduce((a,x)=>a+x.durationMin/60,0) })).filter(s=>s.plannedH>0)
  const todaySessions = week[todayIdx]?.sessions??[]

  // Render one week grid (used for both single-week and multi-week / compare)
  function WeekGrid({ ws, plan, labelTag }:{ ws:string; plan?:PlanVariant; labelTag?:string }) {
    const w = buildWeek(ws, plan)
    const wDates = getWeekDatesFromStart(ws)
    const planColor = plan==='A'?'#00c8e0':plan==='B'?'#a78bfa':'var(--text)'
    return (
      <div style={{ background:'var(--bg-card)',border:`1px solid ${plan?planColor+'44':'var(--border)'}`,borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-card)',overflowX:'auto' }}>
        {labelTag && <div style={{ padding:'6px 14px',background:`${planColor}11`,borderBottom:`1px solid ${planColor}33`,display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontSize:10,fontWeight:700,color:planColor,letterSpacing:'0.08em',textTransform:'uppercase' as const }}>{labelTag}</span>
          <span style={{ fontSize:10,color:'var(--text-dim)' }}>{getWeekLabel(ws)}</span>
        </div>}
        <div style={{ display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',borderBottom:'1px solid var(--border)',background:'var(--bg-card2)',minWidth:520 }}>
          <div style={{ padding:'10px 8px' }}/>
          {w.map((d,i)=>{ const cfg=INTENSITY_CONFIG[d.intensity]; return (
            <div key={d.day} style={{ padding:'8px 4px',textAlign:'center' as const,borderLeft:'1px solid var(--border)',minWidth:68 }}>
              <p style={{ fontSize:10,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 2px',fontWeight:500 }}>{d.day}</p>
              <p style={{ fontSize:14,fontWeight:700,margin:'0 0 4px',color:i===todayIdx&&ws===currentWeekStart?'#00c8e0':'var(--text)' }}>{wDates[i]}</p>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:3 }}>
                <button onClick={()=>setIntensityModal(d.intensity)} style={{ padding:'1px 6px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:9,fontWeight:700,cursor:'pointer' }}>{cfg.label}</button>
                {ws===currentWeekStart&&<button onClick={()=>handleChangeIntensity(i)} style={{ width:13,height:13,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}>+</button>}
              </div>
            </div>
          )})}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',minWidth:520 }}>
          <div style={{ padding:'8px',display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingTop:12 }}>
            <span style={{ fontSize:9,color:'var(--text-dim)',textTransform:'uppercase' as const,writingMode:'vertical-rl' as const,transform:'rotate(180deg)' }}>Séances</span>
          </div>
          {w.map((d,i)=>(
            <div key={d.day}
              onDragOver={e=>{e.preventDefault();setDragOver(i)}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={()=>onDrop(i)}
              onTouchEnd={()=>onTouchEnd(i)}
              style={{ borderLeft:'1px solid var(--border)',padding:'6px 4px',background:dragOver===i?'rgba(0,200,224,0.04)':'transparent',minWidth:68,minHeight:80 }}>
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                {/* Real activities (read-only, from Training) */}
                {d.activities.map(a=>{
                  const sp=normalizeSportType(a.sport)
                  return <div key={a.id} style={{ borderRadius:6,padding:'4px 6px',background:`${SPORT_BORDER[sp]}18`,borderLeft:`2px solid ${SPORT_BORDER[sp]}`,opacity:0.9 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                      <span style={{ fontSize:7,background:SPORT_BORDER[sp],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700,flexShrink:0 }}>✓</span>
                      <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{SPORT_EMOJI[sp]} {a.name}</p>
                    </div>
                    <p style={{ fontSize:8,opacity:0.7,margin:'1px 0 0',fontFamily:'DM Mono,monospace' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatDur(Math.round(a.elapsedTime/60))}</p>
                  </div>
                })}
                {/* Planned sessions */}
                {d.sessions.map(s=>(
                  <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,i)} onTouchStart={()=>onTouchStart(s.id,i)} onClick={()=>setDetailModal(s)}
                    style={{ borderRadius:6,padding:'4px 6px',background:SPORT_BG[s.sport],borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`,cursor:'grab',opacity:s.status==='done'?0.75:1,position:'relative' }}>
                    {s.status==='done' && <span style={{ position:'absolute',top:2,right:2,fontSize:7,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700 }}>✓</span>}
                    {s.planVariant && <span style={{ position:'absolute',top:2,left:2,fontSize:7,fontWeight:800,color:s.planVariant==='A'?'#00c8e0':'#a78bfa' }}>{s.planVariant}</span>}
                    <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,paddingLeft:8 }}>{SPORT_EMOJI[s.sport]} {s.title}</p>
                    <p style={{ fontSize:8,opacity:0.7,margin:'1px 0 0',fontFamily:'DM Mono,monospace' }}>{s.time}</p>
                    {s.blocks.length>0 && <div style={{ display:'flex',gap:1,marginTop:2,height:4,borderRadius:1,overflow:'hidden' }}>{s.blocks.map(b=><div key={b.id} style={{ flex:b.durationMin,background:ZONE_COLORS[b.zone-1],opacity:0.8 }}/>)}</div>}
                  </div>
                ))}
                {ws===currentWeekStart&&<button onClick={()=>setAddModal({dayIndex:i,plan:plan??activePlan})} style={{ marginTop:2,padding:'3px',borderRadius:5,background:'transparent',border:'1px dashed var(--border)',color:'var(--text-dim)',fontSize:9,cursor:'pointer',width:'100%' }}>+</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding:20,textAlign:'center',color:'var(--text-dim)',fontSize:13 }}>Chargement...</div>

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {show10w && <Last10WeeksModal onClose={()=>setShow10w(false)}/>}
      {intensityModal && <InfoModal title={INTENSITY_CONFIG[intensityModal].label} content={<p style={{margin:0}}>{intensityModal==='recovery'?'Journée légère ou repos.':intensityModal==='low'?'Faible intensité, récupération active.':intensityModal==='mid'?'Intensité modérée, fatigue contrôlée.':'Forte intensité — récupération nécessaire.'}</p>} onClose={()=>setIntensityModal(null)}/>}
      {addModal!==null && <div onClick={()=>setAddModal(null)} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}><AddSessionModal dayIndex={addModal.dayIndex} plan={addModal.plan} onClose={()=>setAddModal(null)} onAdd={handleAddSession}/></div>}
      {detailModal && <div onClick={()=>setDetailModal(null)} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}><SessionDetailModal session={detailModal} onClose={()=>setDetailModal(null)} onSave={handleSaveSession} onValidate={handleValidate} onDelete={handleDelete}/></div>}

      {/* ── Controls — desktop (ancienne interface) ── */}
      <div id="tr-ctrl-desktop" style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' as const }}>
        <div style={{ display:'flex',alignItems:'center',gap:4,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:'4px 6px' }}>
          <button onClick={()=>setWeekOffset(o=>o-weekRange)} style={{ background:'none',border:'none',color:'var(--text-mid)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:6 }}>←</button>
          <span style={{ fontSize:11,fontWeight:600,color:'var(--text)',minWidth:120,textAlign:'center' as const }}>{getWeekLabel(currentWeekStart)}</span>
          <button onClick={()=>setWeekOffset(o=>o+weekRange)} style={{ background:'none',border:'none',color:'var(--text-mid)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:6 }}>→</button>
          {weekOffset!==0&&<button onClick={()=>setWeekOffset(0)} style={{ fontSize:9,padding:'2px 6px',borderRadius:5,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',cursor:'pointer',fontWeight:600 }}>Auj.</button>}
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowRangeDd(x=>!x)} style={{ padding:'6px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:5 }}>
            {weekRange===1?'1 semaine':weekRange===5?'5 semaines':'10 semaines'} <span style={{ fontSize:9 }}>▾</span>
          </button>
          {showRangeDd&&<div style={{ position:'absolute',top:'calc(100% + 4px)',left:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:10,boxShadow:'var(--shadow)',zIndex:50,minWidth:130,padding:4 }}>
            {([1,5,10] as WeekRange[]).map(r=>(
              <button key={r} onClick={()=>{setWeekRange(r);setShowRangeDd(false)}} style={{ width:'100%',padding:'7px 12px',borderRadius:7,border:'none',background:weekRange===r?'rgba(0,200,224,0.10)':'transparent',color:weekRange===r?'#00c8e0':'var(--text-mid)',fontSize:12,cursor:'pointer',textAlign:'left' as const,fontWeight:weekRange===r?600:400 }}>
                {r===1?'1 semaine':r===5?'5 semaines':'10 semaines'}
              </button>
            ))}
          </div>}
        </div>
        <div style={{ display:'flex',gap:4,marginLeft:'auto' }}>
          {(['A','B'] as PlanVariant[]).map(p=>(
            <button key={p} onClick={()=>{setActivePlan(p);setCompareMode(false)}}
              style={{ padding:'6px 14px',borderRadius:9,border:'1px solid',fontSize:12,cursor:'pointer',fontWeight:700,
                borderColor:!compareMode&&activePlan===p?(p==='A'?'#00c8e0':'#a78bfa'):'var(--border)',
                background:!compareMode&&activePlan===p?(p==='A'?'rgba(0,200,224,0.12)':'rgba(167,139,250,0.12)'):'var(--bg-card)',
                color:!compareMode&&activePlan===p?(p==='A'?'#00c8e0':'#a78bfa'):'var(--text-mid)' }}>
              Plan {p} {p==='A'?'— Optimal':'— Minimal'}
            </button>
          ))}
          <button onClick={()=>setCompareMode(x=>!x)}
            style={{ padding:'6px 14px',borderRadius:9,border:'1px solid',fontSize:12,cursor:'pointer',fontWeight:700,
              borderColor:compareMode?'#ffb340':'var(--border)',
              background:compareMode?'rgba(255,179,64,0.12)':'var(--bg-card)',
              color:compareMode?'#ffb340':'var(--text-mid)' }}>
            ⇄ Comparer
          </button>
        </div>
      </div>

      {/* ── Controls — mobile (3 lignes en carte) ── */}
      <div id="tr-ctrl-mobile" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:'14px 16px',display:'flex',flexDirection:'column',gap:12,boxShadow:'var(--shadow-card)' }}>
        {/* Ligne 1 : Navigation semaine */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <button onClick={()=>setWeekOffset(o=>o-weekRange)} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',cursor:'pointer',fontSize:18,padding:'4px 12px',borderRadius:10,lineHeight:1 }}>←</button>
            <span style={{ fontSize:13,fontWeight:700,color:'var(--text)',minWidth:130,textAlign:'center' as const }}>{getWeekLabel(currentWeekStart)}</span>
            <button onClick={()=>setWeekOffset(o=>o+weekRange)} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',cursor:'pointer',fontSize:18,padding:'4px 12px',borderRadius:10,lineHeight:1 }}>→</button>
          </div>
          {weekOffset!==0
            ? <button onClick={()=>setWeekOffset(0)} style={{ fontSize:11,padding:'5px 12px',borderRadius:20,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.3)',color:'#00c8e0',cursor:'pointer',fontWeight:700 }}>Auj.</button>
            : <div style={{ width:52 }}/>
          }
        </div>
        {/* Ligne 2 : Sélecteur période */}
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowRangeDd(x=>!x)}
            style={{ width:'100%',padding:'9px 16px',borderRadius:20,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontWeight:600 }}>
            <span>{weekRange===1?'1 semaine':weekRange===5?'5 semaines':'10 semaines'}</span>
            <span style={{ fontSize:10,color:'var(--text-dim)' }}>▾</span>
          </button>
          {showRangeDd&&<div onClick={()=>setShowRangeDd(false)} style={{ position:'fixed',inset:0,zIndex:49 }}/>}
          {showRangeDd&&<div style={{ position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:14,boxShadow:'0 8px 24px rgba(0,0,0,0.18)',zIndex:50,padding:6 }}>
            {([1,5,10] as WeekRange[]).map(r=>(
              <button key={r} onClick={()=>{setWeekRange(r);setShowRangeDd(false)}}
                style={{ width:'100%',padding:'10px 16px',borderRadius:10,border:'none',
                  background:weekRange===r?'rgba(0,200,224,0.10)':'transparent',
                  color:weekRange===r?'#00c8e0':'var(--text-mid)',
                  fontSize:13,cursor:'pointer',textAlign:'left' as const,fontWeight:weekRange===r?700:400 }}>
                {r===1?'1 semaine':r===5?'5 semaines':'10 semaines'}
              </button>
            ))}
          </div>}
        </div>
        {/* Ligne 3 : Plan A / B / Comparer */}
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {(['A','B'] as PlanVariant[]).map(p=>{
            const isActive=!compareMode&&activePlan===p; const col=p==='A'?'#00c8e0':'#a78bfa'
            return (
              <button key={p} onClick={()=>{setActivePlan(p);setCompareMode(false)}}
                style={{ padding:'11px 16px',borderRadius:12,fontSize:13,cursor:'pointer',fontWeight:700,textAlign:'left' as const,
                  border:`1.5px solid ${isActive?col:'var(--border)'}`,
                  background:isActive?`${col}1a`:'transparent',
                  color:isActive?col:'var(--text-mid)' }}>
                Plan {p} — {p==='A'?'Optimal':'Minimal'}
              </button>
            )
          })}
          <button onClick={()=>setCompareMode(x=>!x)}
            style={{ padding:'11px 16px',borderRadius:12,fontSize:13,cursor:'pointer',fontWeight:700,textAlign:'left' as const,
              border:`1.5px solid ${compareMode?'#ffb340':'var(--border)'}`,
              background:compareMode?'rgba(255,179,64,0.12)':'transparent',
              color:compareMode?'#ffb340':'var(--text-mid)' }}>
            ⇄ Comparer les deux plans
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) { #tr-ctrl-mobile { display: none !important; } }
        @media (max-width: 767px) { #tr-ctrl-desktop { display: none !important; } }
      `}</style>

      {/* KPI */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:0 }}>Volume</p>
            <button onClick={()=>setShow10w(true)} style={{ fontSize:9,padding:'2px 7px',borderRadius:6,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',cursor:'pointer',fontWeight:600 }}>Last 10W</button>
          </div>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px',fontFamily:'DM Mono,monospace' }}>Prévu {formatDur(plannedMin)}</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#00c8e0',margin:'0 0 8px' }}>{formatDur(doneMin)}</p>
          <div style={{ height:5,borderRadius:999,overflow:'hidden',background:'var(--border)',marginBottom:6 }}><div style={{ height:'100%',width:`${plannedMin?Math.min(doneMin/plannedMin*100,100):0}%`,background:'#00c8e0',borderRadius:999 }}/></div>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:0 }}>{plannedMin?Math.round(doneMin/plannedMin*100):0}% réalisé</p>
        </div>
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Séances</p>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px',fontFamily:'DM Mono,monospace' }}>Prévu {plannedN}</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#ffb340',margin:'0 0 8px' }}>{doneN}</p>
          <div style={{ height:5,borderRadius:999,overflow:'hidden',background:'var(--border)',marginBottom:6 }}><div style={{ height:'100%',width:`${plannedN?Math.min(doneN/plannedN*100,100):0}%`,background:'#ffb340',borderRadius:999 }}/></div>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' as const,marginTop:4 }}>
            {sportCounts.map(s=><span key={s.sport} style={{ fontSize:9,color:SPORT_BORDER[s.sport],fontFamily:'DM Mono,monospace' }}>{SPORT_EMOJI[s.sport]} {s.done}/{s.planned}</span>)}
          </div>
        </div>
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)',gridColumn:'span 2' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:0 }}>TSS</p>
            <button onClick={()=>setShow10w(true)} style={{ fontSize:9,padding:'2px 7px',borderRadius:6,background:'rgba(91,111,255,0.10)',border:'1px solid rgba(91,111,255,0.25)',color:'#5b6fff',cursor:'pointer',fontWeight:600 }}>Last 10W</button>
          </div>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px',fontFamily:'DM Mono,monospace' }}>Prévu {plannedTSS} pts</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#5b6fff',margin:'0 0 8px' }}>{doneTSS} pts</p>
          <div style={{ height:5,borderRadius:999,overflow:'hidden',background:'var(--border)' }}><div style={{ height:'100%',width:`${plannedTSS?Math.min(doneTSS/plannedTSS*100,100):0}%`,background:'#5b6fff',borderRadius:999 }}/></div>
        </div>
      </div>

      {/* Volume par discipline */}
      {sportStats.length>0 && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 12px' }}>Volume par discipline</p>
          {sportStats.map(s=>{ const pct=s.plannedH>0?Math.min(s.doneH/s.plannedH*100,100):0; const c=SPORT_BORDER[s.sport]; return (
            <div key={s.sport} style={{ marginBottom:10 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 }}>
                <span style={{ fontSize:12,display:'flex',alignItems:'center',gap:5 }}><span>{SPORT_EMOJI[s.sport]}</span><span style={{ fontWeight:500,color:'var(--text-mid)' }}>{SPORT_LABEL[s.sport]}</span></span>
                <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:c,fontWeight:600 }}>{s.doneH.toFixed(1)}h <span style={{ color:'var(--text-dim)',fontWeight:400 }}>/ {s.plannedH.toFixed(1)}h</span></span>
              </div>
              <div style={{ height:6,borderRadius:999,overflow:'hidden',background:'var(--border)' }}><div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${c}bb,${c})`,borderRadius:999 }}/></div>
            </div>
          )})}
        </div>
      )}

      {/* Aujourd'hui */}
      {todaySessions.length>0 && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 10px' }}>📍 Aujourd'hui — {week[todayIdx]?.day} {week[todayIdx]?.date}</p>
          {todaySessions.map(s=>(
            <div key={s.id} onClick={()=>setDetailModal(s)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 13px',borderRadius:10,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',marginBottom:7 }}>
              <span style={{ fontSize:20 }}>{SPORT_EMOJI[s.sport]}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0 }}>{s.title}</p>
                <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.time} · {formatDur(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
              </div>
              <span style={{ padding:'4px 10px',borderRadius:20,background:s.status==='done'?`${SPORT_BORDER[s.sport]}22`:'var(--bg-card2)',border:`1px solid ${s.status==='done'?SPORT_BORDER[s.sport]:'var(--border)'}`,color:s.status==='done'?SPORT_BORDER[s.sport]:'var(--text-dim)',fontSize:10,fontWeight:600 }}>{s.status==='done'?'✓ Fait':'À faire'}</span>
            </div>
          ))}
        </div>
      )}

      {/* View switch */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>{compareMode?'Comparaison Plan A / Plan B':`Plan ${activePlan} · ${getWeekLabel(currentWeekStart)}`}</p>
        {!compareMode&&<div style={{ display:'flex',gap:6 }}>
          {([['vertical','⊟ Vertical'],['horizontal','⊞ Horizontal']] as [TrainingView,string][]).map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 11px',borderRadius:8,border:'1px solid',fontSize:11,cursor:'pointer',borderColor:view===v?'#00c8e0':'var(--border)',background:view===v?'rgba(0,200,224,0.10)':'var(--bg-card)',color:view===v?'#00c8e0':'var(--text-mid)',fontWeight:view===v?600:400 }}>{l}</button>
          ))}
        </div>}
      </div>

      {/* COMPARE MODE — Plan A stacked above Plan B */}
      {compareMode && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          <WeekGrid ws={currentWeekStart} plan="A" labelTag="Plan A — Optimal"/>
          <WeekGrid ws={currentWeekStart} plan="B" labelTag="Plan B — Minimal"/>
        </div>
      )}

      {/* SINGLE PLAN — multi-week grids (vertical uniquement) */}
      {!compareMode && (weekRange>1 || view==='vertical') && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {allWeekStarts.map((ws,wi)=>(
            <WeekGrid key={ws} ws={ws} plan={activePlan} labelTag={weekRange>1?`Semaine ${wi+1} — ${getWeekLabel(ws)}`:undefined}/>
          ))}
        </div>
      )}

      {/* HORIZONTAL VIEW (only in single-week, single-plan mode) */}
      {!compareMode && weekRange===1 && view==='horizontal' && (
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginTop:-16 }}>
          {week.map((d,i)=>{ const cfg=INTENSITY_CONFIG[d.intensity]; return (
            <div key={d.day} onTouchEnd={()=>onTouchEnd(i)} style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:13,padding:13,boxShadow:'var(--shadow-card)' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:(d.sessions.length+d.activities.length)?8:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ textAlign:'center' as const,minWidth:32 }}>
                    <p style={{ fontSize:9,color:'var(--text-dim)',textTransform:'uppercase' as const,margin:0 }}>{d.day}</p>
                    <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0,color:i===todayIdx?'#00c8e0':'var(--text)' }}>{d.date}</p>
                  </div>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700,cursor:'pointer' }}>{cfg.label}</button>
                  <button onClick={()=>handleChangeIntensity(i)} style={{ width:20,height:20,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}>+</button>
                </div>
                <button onClick={()=>setAddModal({dayIndex:i,plan:activePlan})} style={{ padding:'4px 9px',borderRadius:7,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',color:'#00c8e0',fontSize:11,cursor:'pointer',fontWeight:600 }}>+ Ajouter</button>
              </div>
              {/* Activities from Training */}
              {d.activities.map(a=>{ const sp=normalizeSportType(a.sport); return (
                <div key={a.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,background:`${SPORT_BORDER[sp]}14`,borderLeft:`3px solid ${SPORT_BORDER[sp]}`,marginBottom:5,opacity:0.85 }}>
                  <span style={{ fontSize:13 }}>{SPORT_EMOJI[sp]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                      <p style={{ fontSize:12,fontWeight:600,margin:0 }}>{a.name}</p>
                      <span style={{ fontSize:8,background:SPORT_BORDER[sp],color:'#fff',padding:'1px 4px',borderRadius:3,fontWeight:700 }}>✓ Réalisé</span>
                    </div>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'1px 0 0' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatDur(Math.round(a.elapsedTime/60))}{a.distance?` · ${(a.distance/1000).toFixed(1)}km`:''}</p>
                  </div>
                </div>
              )})}
              {d.sessions.length>0 ? d.sessions.map(s=>(
                <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,i)} onTouchStart={()=>onTouchStart(s.id,i)} onClick={()=>setDetailModal(s)}
                  style={{ display:'flex',flexDirection:'column',padding:'8px 10px',borderRadius:9,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',opacity:s.status==='done'?0.75:1,marginBottom:5 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                    <span style={{ fontSize:14 }}>{SPORT_EMOJI[s.sport]}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                        <p style={{ fontSize:12,fontWeight:600,margin:0 }}>{s.title}</p>
                        {s.status==='done'&&<span style={{ fontSize:8,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 4px',borderRadius:3,fontWeight:700 }}>✓</span>}
                        <span style={{ fontSize:9,fontWeight:700,color:s.planVariant==='B'?'#a78bfa':'#00c8e0',marginLeft:4 }}>Plan {s.planVariant}</span>
                      </div>
                      <p style={{ fontSize:10,color:'var(--text-dim)',margin:'1px 0 0' }}>{s.time} · {formatDur(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
                    </div>
                  </div>
                  {s.blocks.length>0 && <div style={{ display:'flex',gap:1,height:8,borderRadius:2,overflow:'hidden',marginTop:5 }}>{s.blocks.map(b=><div key={b.id} style={{ flex:b.durationMin,background:ZONE_COLORS[b.zone-1],opacity:0.75 }}/>)}</div>}
                </div>
              )) : d.activities.length===0&&<p style={{ fontSize:11,color:'var(--text-dim)',margin:0,fontStyle:'italic' as const }}>Jour de repos</p>}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

// ── Add Session Modal ─────────────────────────────
function AddSessionModal({ dayIndex, plan, onClose, onAdd }:{ dayIndex:number; plan:PlanVariant; onClose:()=>void; onAdd:(i:number,s:Session)=>void }) {
  const [sport, setSport]   = useState<SportType>('run')
  const [title, setTitle]   = useState('')
  const [time,  setTime]    = useState('09:00')
  const [dur,   setDur]     = useState('60')
  const [rpe,   setRpe]     = useState(5)
  const [notes, setNotes]   = useState('')
  const [blocks,setBlocks]  = useState<Block[]>([])
  const [selPlan,setSelPlan]= useState<PlanVariant>(plan)
  const isEnd = ['run','bike','swim'].includes(sport)
  const tss = calcTSS(blocks,sport)
  const totalMin = blocks.reduce((s,b)=>s+b.durationMin,0)
  return (
    <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:520,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
        <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Nouvelle séance</h3>
        <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
      </div>
      <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:14 }}>
        {(Object.keys(SPORT_LABEL) as SportType[]).map(s=>(
          <button key={s} onClick={()=>{setSport(s);setBlocks([])}} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:sport===s?SPORT_BORDER[s]:'var(--border)',background:sport===s?SPORT_BG[s]:'var(--bg-card2)',color:sport===s?SPORT_BORDER[s]:'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:sport===s?600:400 }}>
            {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
          </button>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:9,marginBottom:11 }}>
        <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${SPORT_LABEL[sport]} Z2`} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Heure</p><input value={time} onChange={e=>setTime(e.target.value)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
        <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Durée (min)</p><input type="number" value={dur} onChange={e=>setDur(e.target.value)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
      </div>
      <div style={{ marginBottom:11 }}>
        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
          <span style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)' }}>RPE</span>
          <span style={{ fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:rpe<=3?'#22c55e':rpe<=6?'#ffb340':'#ef4444' }}>{rpe.toFixed(1)}/10</span>
        </div>
        <input type="range" min={0} max={10} step={0.5} value={rpe} onChange={e=>setRpe(parseFloat(e.target.value))} style={{ width:'100%',accentColor:'#00c8e0',cursor:'pointer' }}/>
      </div>
      {isEnd && <div style={{ marginBottom:11 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:8 }}>Blocs d'intensité</p><BlockBuilder sport={sport} blocks={blocks} onChange={setBlocks}/>{blocks.length>0 && <div style={{ display:'flex',gap:14,marginTop:6,fontSize:10,color:'var(--text-dim)' }}><span>Durée : <strong style={{ color:'var(--text)',fontFamily:'DM Mono,monospace' }}>{formatDur(totalMin)}</strong></span><span>TSS : <strong style={{ color:SPORT_BORDER[sport],fontFamily:'DM Mono,monospace' }}>{tss} pts</strong></span></div>}</div>}
      <div style={{ marginBottom:14 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Notes</p><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const }}/></div>
      {/* Plan selector */}
      <div style={{ marginBottom:11 }}>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6 }}>Plan</p>
        <div style={{ display:'flex',gap:5 }}>
          {(['A','B'] as PlanVariant[]).map(p=>(
            <button key={p} onClick={()=>setSelPlan(p)} style={{ flex:1,padding:'7px',borderRadius:8,border:'1px solid',fontSize:12,cursor:'pointer',fontWeight:700,
              borderColor:selPlan===p?(p==='A'?'#00c8e0':'#a78bfa'):'var(--border)',
              background:selPlan===p?(p==='A'?'rgba(0,200,224,0.10)':'rgba(167,139,250,0.10)'):'var(--bg-card2)',
              color:selPlan===p?(p==='A'?'#00c8e0':'#a78bfa'):'var(--text-mid)' }}>
              Plan {p} — {p==='A'?'Optimal':'Minimal'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex',gap:8 }}>
        <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
        <button onClick={()=>{ onAdd(dayIndex,{id:'',dayIndex,sport,title:title||SPORT_LABEL[sport],time,durationMin:totalMin||parseInt(dur)||60,tss:tss||undefined,status:'planned',notes:notes||undefined,blocks,rpe,planVariant:selPlan}); onClose() }} style={{ flex:2,padding:10,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Ajouter</button>
      </div>
    </div>
  )
}

// ── Session Detail Modal ──────────────────────────
function SessionDetailModal({ session, onClose, onSave, onValidate, onDelete }:{ session:Session; onClose:()=>void; onSave:(s:Session)=>void; onValidate:(s:Session)=>void; onDelete:(id:string)=>void }) {
  const [tab,  setTab]  = useState<'view'|'edit'|'validate'>('view')
  const [form, setForm] = useState<Session>({...session, blocks:[...session.blocks]})
  const isEnd = ['run','bike','swim'].includes(session.sport)
  const speed = calcSpeed(form.vDistance||'', form.vDuration||'')
  const pace  = calcPaceStr(form.vDistance||'', form.vDuration||'')
  return (
    <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:540,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
        <div style={{ display:'flex',alignItems:'center',gap:9 }}>
          <div style={{ width:34,height:34,borderRadius:9,background:SPORT_BG[session.sport],display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{SPORT_EMOJI[session.sport]}</div>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0 }}>{session.title}</p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:'1px 0 0' }}>{session.time} · {formatDur(session.durationMin)}{session.tss?` · ${session.tss} TSS`:''}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
      </div>
      <div style={{ display:'flex',gap:5,marginBottom:16 }}>
        {(['view','edit','validate'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:'7px',borderRadius:9,border:'1px solid',borderColor:tab===t?SPORT_BORDER[session.sport]:'var(--border)',background:tab===t?SPORT_BG[session.sport]:'var(--bg-card2)',color:tab===t?SPORT_BORDER[session.sport]:'var(--text-mid)',fontSize:11,fontWeight:tab===t?600:400,cursor:'pointer' }}>
            {t==='view'?'📊 Graphique':t==='edit'?'✏️ Modifier':'✅ Valider'}
          </button>
        ))}
      </div>
      {tab==='view' && (
        <div>
          {session.blocks.length>0 ? (
            <div style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px',marginBottom:12 }}>
              <div style={{ display:'flex',alignItems:'flex-end',gap:2,height:70 }}>
                {session.blocks.map(b=>{ const total=session.blocks.reduce((s,x)=>s+x.durationMin,0); const hp=((b.zone/5)*0.85+0.05)*100,wp=(b.durationMin/total)*100,c=ZONE_COLORS[b.zone-1]; return <div key={b.id} style={{ width:`${wp}%`,height:`${hp}%`,background:`linear-gradient(180deg,${c}ee,${c}55)`,borderRadius:'4px 4px 0 0',border:`1px solid ${c}88`,minWidth:5 }}/> })}
              </div>
            </div>
          ) : <p style={{ fontSize:12,color:'var(--text-dim)',textAlign:'center' as const,padding:'14px 0' }}>Aucun bloc — modifier pour en ajouter.</p>}
          {session.blocks.map(b=>(
            <div key={b.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 9px',borderRadius:7,background:`${ZONE_COLORS[b.zone-1]}11`,borderLeft:`2px solid ${ZONE_COLORS[b.zone-1]}`,marginBottom:4 }}>
              <span style={{ fontSize:9,fontWeight:700,color:ZONE_COLORS[b.zone-1],width:17,flexShrink:0 }}>Z{b.zone}</span>
              <span style={{ flex:1,fontSize:11 }}>{b.label}</span>
              <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-dim)' }}>{formatDur(b.durationMin)}</span>
              {b.value && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:ZONE_COLORS[b.zone-1] }}>{b.value}{session.sport==='bike'?'W':''}</span>}
            </div>
          ))}
        </div>
      )}
      {tab==='edit' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:9,marginBottom:11 }}>
            {[{k:'title',l:'Titre'},{k:'time',l:'Heure'},{k:'durationMin',l:'Durée (min)'}].map(f=>(
              <div key={f.k}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>{f.l}</p><input value={(form as any)[f.k]??''} onChange={e=>setForm({...form,[f.k]:e.target.value})} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
            ))}
          </div>
          <div style={{ marginBottom:11 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Notes</p><textarea value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const }}/></div>
          {isEnd && <div style={{ marginBottom:14 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:8 }}>Blocs</p><BlockBuilder sport={session.sport} blocks={form.blocks} onChange={blocks=>setForm({...form,blocks,tss:calcTSS(blocks,session.sport)})}/></div>}
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>onDelete(session.id)} style={{ padding:'9px 12px',borderRadius:10,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:12,cursor:'pointer' }}>Supprimer</button>
            <button onClick={()=>onSave(form)} style={{ flex:1,padding:10,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>Sauvegarder</button>
          </div>
        </>
      )}
      {tab==='validate' && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:14 }}>
            <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Durée (min)</p><input value={form.vDuration??''} onChange={e=>setForm({...form,vDuration:e.target.value})} placeholder={String(session.durationMin)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
            <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Distance (km)</p><input value={form.vDistance??''} onChange={e=>setForm({...form,vDistance:e.target.value})} placeholder="10" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
            <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>FC moyenne</p><input value={form.vHrAvg??''} onChange={e=>setForm({...form,vHrAvg:e.target.value})} placeholder="158bpm" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
            <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Dénivelé (m)</p><input value={form.vElevation??''} onChange={e=>setForm({...form,vElevation:e.target.value})} placeholder="0" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
            {form.vDuration&&form.vDistance&&<><div style={{ padding:'7px 10px',borderRadius:8,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)' }}><p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 2px' }}>Vitesse</p><p style={{ fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:'#00c8e0',margin:0 }}>{speed}</p></div>{session.sport==='run'&&<div style={{ padding:'7px 10px',borderRadius:8,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)' }}><p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 2px' }}>Allure</p><p style={{ fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:'#22c55e',margin:0 }}>{pace}</p></div>}</>}
          </div>
          <button onClick={()=>{ const done=parseInt(form.vDuration||'0'); const pct=session.durationMin&&done?Math.min(Math.round((done/session.durationMin)*100),100):100; onValidate({...form,status:'done',vSpeed:speed,vPace:pace}) }} style={{ width:'100%',padding:12,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer' }}>✓ Confirmer</button>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// WEEK TAB
// ════════════════════════════════════════════════
function WeekTab({ trainingWeek }:{ trainingWeek:ReturnType<typeof usePlanning>['sessions'] }) {
  const { tasks, activities, intensities, addTask, updateTask, deleteTask } = usePlanning()
  const [taskModal,      setTaskModal]      = useState<{dayIndex:number;startHour:number}|null>(null)
  const [editModal,      setEditModal]      = useState<WeekTask|null>(null)
  const [mainTaskModal,  setMainTaskModal]  = useState<{dayIndex:number}|null>(null)
  const [mainTaskInput,  setMainTaskInput]  = useState('')
  const [mobileDayOffset,setMobileDayOffset]= useState(0)
  const [mobileView,     setMobileView]     = useState<'3days'|'today'>('3days')
  const [desktopView,    setDesktopView]    = useState<'week'|'today'>('week')
  const todayIdx = getTodayIdx()
  const dates    = getWeekDates()
  // Drag tracking for touch
  const touchDragRef = useRef<{id:string;fromDay:number}|null>(null)
  const touchTargetRef = useRef<number|null>(null)

  const trainingTasks: WeekTask[] = trainingWeek.map(s=>({
    id:`tr_${s.id}`, title:`${SPORT_EMOJI[s.sport as SportType]} ${s.title}`, type:'sport' as TaskType,
    dayIndex:s.dayIndex, startHour:parseInt(s.time.split(':')[0])||6, startMin:parseInt(s.time.split(':')[1])||0,
    durationMin:s.durationMin, fromTraining:true, color:SPORT_BORDER[s.sport as SportType],
  }))

  const allTasks = [...trainingTasks, ...tasks]
  function getTasksForDay(d:number) { return allTasks.filter(t=>t.dayIndex===d) }
  function dayLoad(d:number) { return INTENSITY_CONFIG[(intensities[d]??'low') as DayIntensity] }

  async function handleAddTask(t:Omit<WeekTask,'id'>) { await addTask(t) }
  async function handleUpdateTask(t:WeekTask) { await updateTask(t) }
  async function handleDeleteTask(id:string) { await deleteTask(id) }
  async function handleAddMainTask(dayIndex:number) {
    if(!mainTaskInput.trim()) return
    await addTask({ title:mainTaskInput.trim(), type:'personal', dayIndex,
      startHour:8, startMin:0, durationMin:30, priority:true, isMain:true })
    setMainTaskInput(''); setMainTaskModal(null)
  }

  const mobileVisibleDays = mobileView==='today' ? [todayIdx] : [mobileDayOffset,mobileDayOffset+1,mobileDayOffset+2].filter(i=>i<7)
  const desktopVisibleDays = desktopView==='today' ? [todayIdx] : [0,1,2,3,4,5,6]
  const dayLabels = DAY_NAMES.map((d,i)=>`${d} ${dates[i]}`)

  const taskCell = (t:WeekTask) => {
    const cfg = TASK_CONFIG[t.type]; const border = t.fromTraining?(t.color||cfg.color):cfg.color
    return (
      <div key={t.id} onClick={e=>{e.stopPropagation();if(!t.fromTraining)setEditModal(t)}}
        style={{ borderRadius:5,padding:'3px 5px',background:t.fromTraining?`${border}22`:cfg.bg,borderLeft:`2px solid ${border}`,cursor:t.fromTraining?'default':'pointer',position:'relative',marginBottom:2 }}>
        {t.priority && <span style={{ position:'absolute',top:1,right:2,fontSize:8 }}>⭐</span>}
        <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:t.fromTraining?border:'var(--text)',paddingRight:t.priority?10:0 }}>{t.title}</p>
        <p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0' }}>{formatDur(t.durationMin)}</p>
      </div>
    )
  }

  const CELL_H = 56 // px per hour

  function CalendarGrid({ days, cols }:{ days:number[]; cols:number }) {
    const [dragOverDay, setDragOverDay] = useState<number|null>(null)

    function onTaskTouchStart(e:React.TouchEvent, task:WeekTask) {
      if(task.fromTraining) return
      e.stopPropagation()
      touchDragRef.current = {id:task.id, fromDay:task.dayIndex}
    }
    function onTaskTouchMove(e:React.TouchEvent) {
      if(!touchDragRef.current) return
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const dayEl = el?.closest('[data-weekday]') as HTMLElement|null
      if(dayEl) touchTargetRef.current = parseInt(dayEl.getAttribute('data-weekday')||'-1')
    }
    function onTaskTouchEnd() {
      if(!touchDragRef.current) return
      const target = touchTargetRef.current
      if(target!==null && target!==touchDragRef.current.fromDay) {
        const t = tasks.find(x=>x.id===touchDragRef.current!.id)
        if(t) handleUpdateTask({...t, dayIndex:target})
      }
      touchDragRef.current=null; touchTargetRef.current=null
    }

    return (
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-card)' }}>
        {/* Headers with Main Task buttons */}
        <div style={{ display:'grid',gridTemplateColumns:`44px repeat(${cols},1fr)`,borderBottom:'1px solid var(--border)',background:'var(--bg-card2)' }}>
          <div/>
          {days.map(d=>{ const load=dayLoad(d)
            const mainTasks = getTasksForDay(d).filter(t=>t.isMain)
            return (
            <div key={d} style={{ padding:'7px 4px',textAlign:'center' as const,borderLeft:'1px solid var(--border)' }}>
              <p style={{ fontSize:9,color:'var(--text-dim)',textTransform:'uppercase' as const,margin:'0 0 1px' }}>{DAY_NAMES[d]}</p>
              <p style={{ fontSize:13,fontWeight:700,margin:'0 0 3px',color:d===todayIdx?'#00c8e0':'var(--text)' }}>{dates[d]}</p>
              <span style={{ padding:'1px 5px',borderRadius:20,background:load.bg,border:`1px solid ${load.border}`,color:load.color,fontSize:8,fontWeight:700 }}>{load.label}</span>
              {/* Main task badges (click to edit) */}
              {mainTasks.map(mt=>(
                <div key={mt.id} onClick={e=>{e.stopPropagation();setEditModal(mt)}}
                  style={{ marginTop:3,padding:'2px 5px',borderRadius:5,background:'rgba(255,179,64,0.15)',border:'1px solid #ffb34055',cursor:'pointer' }}>
                  <p style={{ fontSize:8,fontWeight:600,color:'#ffb340',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>⭐ {mt.title}</p>
                </div>
              ))}
            </div>
          )})}
        </div>
        {/* Rangée de boutons "+" — un par jour */}
        <div style={{ display:'grid',gridTemplateColumns:`44px repeat(${cols},1fr)`,borderBottom:'1px solid var(--border)',background:'var(--bg-card2)' }}>
          <div/>
          {days.map(d=>(
            <div key={d} style={{ borderLeft:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',padding:'4px 0' }}>
              <button
                onClick={e=>{e.stopPropagation();setMainTaskModal({dayIndex:d});setMainTaskInput('')}}
                title={`Tâche principale — ${DAY_NAMES[d]}`}
                style={{ width:22,height:22,borderRadius:'50%',background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1 }}>+</button>
            </div>
          ))}
        </div>

        {/* Time rows */}
        <div style={{ overflowY:'auto',maxHeight:'60vh' }}>
          {HOURS.map(hour=>(
            <div key={hour} style={{ display:'grid',gridTemplateColumns:`44px repeat(${cols},1fr)`,borderBottom:'1px solid var(--border)',minHeight:CELL_H }}>
              <div style={{ padding:'3px 5px',display:'flex',alignItems:'flex-start',justifyContent:'flex-end' }}>
                <span style={{ fontSize:9,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',marginTop:2 }}>{String(hour).padStart(2,'0')}h</span>
              </div>
              {days.map(d=>(
                <div key={d} data-weekday={String(d)}
                  onClick={()=>setTaskModal({dayIndex:d,startHour:hour})}
                  onDragOver={e=>{e.preventDefault();setDragOverDay(d)}}
                  onDragLeave={()=>setDragOverDay(null)}
                  onDrop={()=>{
                    if(touchDragRef.current&&touchDragRef.current.fromDay!==d){
                      const t=tasks.find(x=>x.id===touchDragRef.current!.id)
                      if(t) handleUpdateTask({...t,dayIndex:d})
                    }
                    setDragOverDay(null)
                  }}
                  style={{ borderLeft:'1px solid var(--border)',padding:'2px 3px',cursor:'pointer',minHeight:CELL_H,position:'relative',background:dragOverDay===d?'rgba(0,200,224,0.04)':'transparent' }}>
                  {/* Activités importées de Training (lecture seule) */}
                  {activities.filter(a=>a.dayIndex===d&&a.startHour===hour).map(a=>{
                    const sp=normalizeSportType(a.sport); const topPx=(a.startMin/60)*CELL_H
                    return (
                      <div key={a.id} style={{ position:'absolute',top:topPx,left:3,right:3,borderRadius:5,padding:'3px 5px',background:`${SPORT_BORDER[sp]}18`,borderLeft:`2px solid ${SPORT_BORDER[sp]}`,cursor:'default',zIndex:1 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                          <span style={{ fontSize:7,background:SPORT_BORDER[sp],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700,flexShrink:0 }}>✓</span>
                          <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{SPORT_EMOJI[sp]} {a.name}</p>
                        </div>
                        <p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatDur(Math.round(a.elapsedTime/60))}</p>
                      </div>
                    )
                  })}
                  {getTasksForDay(d).filter(t=>t.startHour===hour&&!t.isMain).map(t=>{
                    // Place task with minute offset within cell
                    const topPx = (t.startMin/60)*CELL_H
                    const cfg = TASK_CONFIG[t.type]; const border = t.fromTraining?(t.color||cfg.color):cfg.color
                    return (
                      <div key={t.id}
                        draggable={!t.fromTraining}
                        onDragStart={e=>{e.stopPropagation();if(!t.fromTraining){touchDragRef.current={id:t.id,fromDay:t.dayIndex}}}}
                        onTouchStart={e=>onTaskTouchStart(e,t)}
                        onTouchMove={onTaskTouchMove}
                        onTouchEnd={onTaskTouchEnd}
                        onClick={e=>{e.stopPropagation();if(!t.fromTraining)setEditModal(t)}}
                        style={{ position:'absolute',top:topPx,left:3,right:3,borderRadius:5,padding:'3px 5px',background:t.fromTraining?`${border}22`:cfg.bg,borderLeft:`2px solid ${border}`,cursor:t.fromTraining?'default':'pointer',zIndex:1 }}>
                        {t.priority && <span style={{ position:'absolute',top:1,right:2,fontSize:8 }}>⭐</span>}
                        <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:t.fromTraining?border:'var(--text)',paddingRight:t.priority?10:0 }}>{t.title}</p>
                        {t.startMin>0&&<p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace' }}>{String(hour).padStart(2,'0')}:{String(t.startMin).padStart(2,'0')}</p>}
                        <p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0' }}>{formatDur(t.durationMin)}</p>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* Controls */}
      <div style={{ display:'flex',gap:8,flexWrap:'wrap' as const,alignItems:'center' }}>
        {/* Labels */}
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const }}>
          {Object.entries(TASK_CONFIG).map(([type,cfg])=>(
            <span key={type} style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.color}44`,fontSize:9,color:cfg.color,fontWeight:600 }}>{cfg.label}</span>
          ))}
        </div>
      </div>

      {/* ── Tâches importantes du jour + bouton + ── */}
      {(() => {
        const todayMainTasks = tasks.filter(t=>t.isMain&&t.dayIndex===todayIdx)
        return (
          <div style={{ display:'flex',alignItems:'center',gap:10,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 14px',minHeight:46 }}>
            {todayMainTasks.length>0
              ? <>
                  <span style={{ fontSize:11,color:'#ffb340',fontWeight:700,whiteSpace:'nowrap' as const }}>⭐ Focus du jour</span>
                  <div style={{ display:'flex',flexWrap:'wrap' as const,gap:6,flex:1 }}>
                    {todayMainTasks.map(t=>(
                      <span key={t.id} onClick={()=>setEditModal(t)}
                        style={{ padding:'4px 12px',borderRadius:20,background:'rgba(255,179,64,0.15)',border:'1px solid #ffb34066',color:'#ffb340',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                        {t.title}
                      </span>
                    ))}
                  </div>
                </>
              : <span style={{ fontSize:12,color:'var(--text-dim)',flex:1 }}>Pas de tâche principale aujourd'hui</span>
            }
            <button onClick={()=>{setMainTaskModal({dayIndex:todayIdx});setMainTaskInput('')}}
              title="Ajouter une tâche principale"
              style={{ width:30,height:30,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1,flexShrink:0 }}>+</button>
          </div>
        )
      })()}

      {/* MOBILE — switch + nav */}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }} id="mobile-week">
        <div style={{ display:'flex',gap:1,background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:10,padding:3,alignSelf:'flex-start' }}>
          {([['today',"Aujourd'hui"],['3days','3 jours']] as ['today'|'3days',string][]).map(([v,l])=>(
            <button key={v} onClick={()=>setMobileView(v)} style={{ padding:'6px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,background:mobileView===v?'var(--bg-card)':'transparent',color:mobileView===v?'var(--text)':'var(--text-dim)',fontWeight:mobileView===v?600:400 }}>{l}</button>
          ))}
        </div>
        {mobileView==='3days' && (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:11,padding:'7px 13px' }}>
            <button onClick={()=>setMobileDayOffset(Math.max(0,mobileDayOffset-1))} disabled={mobileDayOffset===0} style={{ background:'none',border:'none',color:mobileDayOffset===0?'var(--border)':'var(--text-mid)',cursor:'pointer',fontSize:16,padding:'2px 6px' }}>←</button>
            <span style={{ fontSize:12,fontWeight:600 }}>{dayLabels[mobileDayOffset]} — {dayLabels[Math.min(mobileDayOffset+2,6)]}</span>
            <button onClick={()=>setMobileDayOffset(Math.min(4,mobileDayOffset+1))} disabled={mobileDayOffset>=4} style={{ background:'none',border:'none',color:mobileDayOffset>=4?'var(--border)':'var(--text-mid)',cursor:'pointer',fontSize:16,padding:'2px 6px' }}>→</button>
          </div>
        )}
        <CalendarGrid days={mobileVisibleDays} cols={mobileVisibleDays.length}/>
      </div>

      {/* DESKTOP — masqué sur mobile via CSS inline trick */}
      <div id="desktop-week" style={{ display:'none' }}>
        <div style={{ display:'flex',gap:1,background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:10,padding:3,alignSelf:'flex-start',marginBottom:12 }}>
          {([['today',"Aujourd'hui"],['week','Semaine complète']] as ['today'|'week',string][]).map(([v,l])=>(
            <button key={v} onClick={()=>setDesktopView(v)} style={{ padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,background:desktopView===v?'var(--bg-card)':'transparent',color:desktopView===v?'var(--text)':'var(--text-dim)',fontWeight:desktopView===v?600:400 }}>{l}</button>
          ))}
        </div>
        <CalendarGrid days={desktopVisibleDays} cols={desktopVisibleDays.length}/>
      </div>

      <style>{`
        @media (min-width: 768px) {
          #mobile-week { display: none !important; }
          #desktop-week { display: flex !important; flex-direction: column; }
        }
        @media (max-width: 767px) {
          #desktop-week { display: none !important; }
        }
      `}</style>

      {taskModal && <TaskModal dayIndex={taskModal.dayIndex} startHour={taskModal.startHour} onClose={()=>setTaskModal(null)} onSave={handleAddTask}/>}
      {editModal && <TaskEditModal task={editModal} onClose={()=>setEditModal(null)} onSave={handleUpdateTask} onDelete={handleDeleteTask}/>}

      {/* Main Task Modal */}
      {mainTaskModal&&<div onClick={()=>setMainTaskModal(null)} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:16,border:'1px solid #ffb34066',padding:22,maxWidth:380,width:'100%',boxShadow:'0 0 0 1px #ffb34033' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
            <span style={{ fontSize:18 }}>⭐</span>
            <div>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0,color:'#ffb340' }}>Main Task — {DAY_NAMES[mainTaskModal.dayIndex]} {dates[mainTaskModal.dayIndex]}</h3>
              <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 0' }}>Focus principal de la journée</p>
            </div>
          </div>
          <input value={mainTaskInput} onChange={e=>setMainTaskInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')handleAddMainTask(mainTaskModal.dayIndex)}}
            placeholder="Ex: Séance longue, Réunion importante, Récup active…"
            autoFocus
            style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1px solid #ffb34066',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',marginBottom:12 }}/>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>setMainTaskModal(null)} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
            <button onClick={()=>handleAddMainTask(mainTaskModal.dayIndex)} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#ffb340,#f97316)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>⭐ Ajouter</button>
          </div>
        </div>
      </div>}
    </div>
  )
}

function TaskModal({ dayIndex, startHour, onClose, onSave }:{ dayIndex:number; startHour:number; onClose:()=>void; onSave:(t:Omit<WeekTask,'id'>)=>void }) {
  const [title,setTitle]=useState(''); const [type,setType]=useState<TaskType>('work'); const [sh,setSh]=useState(startHour); const [sm,setSm]=useState(0); const [dur,setDur]=useState(60); const [priority,setPriority]=useState(false)
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:420,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Nouvelle tâche</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:12 }}>
          {(Object.entries(TASK_CONFIG) as [TaskType,{label:string;color:string;bg:string}][]).map(([t,cfg])=>(
            <button key={t} onClick={()=>setType(t)} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:type===t?cfg.color:'var(--border)',background:type===t?cfg.bg:'var(--bg-card2)',color:type===t?cfg.color:'var(--text-mid)',fontSize:12,cursor:'pointer',fontWeight:type===t?600:400 }}>{cfg.label}</button>
          ))}
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nom de la tâche" style={{ width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none' }}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12 }}>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Heure</p><input type="number" min={5} max={23} value={sh} onChange={e=>setSh(parseInt(e.target.value))} style={{ width:'100%',padding:'7px 8px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Min</p><select value={sm} onChange={e=>setSm(parseInt(e.target.value))} style={{ width:'100%',padding:'7px 8px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}><option value={0}>:00</option><option value={15}>:15</option><option value={30}>:30</option><option value={45}>:45</option></select></div>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Durée (min)</p><input type="number" min={15} step={15} value={dur} onChange={e=>setDur(parseInt(e.target.value))} style={{ width:'100%',padding:'7px 8px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14,cursor:'pointer' }} onClick={()=>setPriority(!priority)}>
          <div style={{ width:20,height:20,borderRadius:5,border:`2px solid ${priority?'#ffb340':'var(--border)'}`,background:priority?'#ffb340':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{priority&&<span style={{ color:'#fff',fontSize:12 }}>✓</span>}</div>
          <p style={{ fontSize:13,fontWeight:500,margin:0,color:priority?'#ffb340':'var(--text-mid)' }}>⭐ Tâche prioritaire</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({title:title||'Tâche',type,dayIndex,startHour:sh,startMin:sm,durationMin:dur,priority})} style={{ flex:2,padding:10,borderRadius:10,background:`linear-gradient(135deg,${TASK_CONFIG[type].color},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function TaskEditModal({ task, onClose, onSave, onDelete }:{ task:WeekTask; onClose:()=>void; onSave:(t:WeekTask)=>void; onDelete:(id:string)=>void }) {
  const [form,setForm]=useState<WeekTask>({...task})
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:400,width:'100%' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Modifier la tâche</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:12 }}>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Heure</p><input type="number" value={form.startHour} onChange={e=>setForm({...form,startHour:parseInt(e.target.value)})} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Durée (min)</p><input type="number" value={form.durationMin} onChange={e=>setForm({...form,durationMin:parseInt(e.target.value)})} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14,cursor:'pointer' }} onClick={()=>setForm({...form,priority:!form.priority})}>
          <div style={{ width:20,height:20,borderRadius:5,border:`2px solid ${form.priority?'#ffb340':'var(--border)'}`,background:form.priority?'#ffb340':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{form.priority&&<span style={{ color:'#fff',fontSize:12 }}>✓</span>}</div>
          <p style={{ fontSize:13,margin:0,color:form.priority?'#ffb340':'var(--text-mid)' }}>⭐ Prioritaire</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={()=>onDelete(task.id)} style={{ padding:'9px 12px',borderRadius:10,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:12,cursor:'pointer' }}>Supprimer</button>
          <button onClick={()=>onSave(form)} style={{ flex:1,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>Sauvegarder</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// RACE YEAR TAB
// ════════════════════════════════════════════════
function RaceYearTab() {
  const { races, addRace, updateRace, deleteRace } = usePlanning()
  const [calView,      setCalView]      = useState<CalView>('year')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [addModal,     setAddModal]     = useState<{month:number;day?:number}|null>(null)
  const [detailModal,  setDetailModal]  = useState<Race|null>(null)
  const [editModal,    setEditModal]    = useState<Race|null>(null)
  const year = new Date().getFullYear()
  const gty  = races.find(r=>r.level==='gty')
  const nextRace = races.filter(r=>daysUntil(r.date)>0).sort((a,b)=>daysUntil(a.date)-daysUntil(b.date))[0]
  const RACE_SPORTS: RaceSport[] = ['run','bike','swim','hyrox','triathlon','rowing']
  const sportCounts = RACE_SPORTS.map(sp=>({sport:sp,count:races.filter(r=>r.sport===sp).length})).filter(x=>x.count>0)
  const raceByLevel = (['gty','main','important','secondary'] as RaceLevel[]).map(l=>({level:l,count:races.filter(r=>r.level===l).length})).filter(x=>x.count>0)
  function getRacesForMonth(m:number) { return races.filter(r=>{ const d=new Date(r.date); return d.getFullYear()===year&&d.getMonth()===m }) }
  function getDaysInMonth(m:number) { return new Date(year,m+1,0).getDate() }
  function getFirstDay(m:number) { return new Date(year,m,1).getDay()||7 }

  async function handleAddRace(r:Omit<Race,'id'|'validated'|'validationData'>) { await addRace(r) }
  async function handleUpdateRace(r:Race) { await updateRace(r); setEditModal(null) }
  async function handleDeleteRace(id:string) { await deleteRace(id); setDetailModal(null) }
  async function handleValidate(r:Race) { await updateRace({...r,validated:true}); setDetailModal(null) }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* GTY */}
      {gty && (
        <div style={{ padding:'14px 18px',borderRadius:14,background:'var(--gty-bg)',border:'2px solid var(--gty-border)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' as const }}>
          <span style={{ fontSize:28 }}>⚫</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'var(--gty-text)',opacity:0.6,margin:'0 0 2px' }}>Goal of the Year</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:'var(--gty-text)',margin:'0 0 2px' }}>{gty.name}</p>
            {gty.goal && <p style={{ fontSize:12,color:'var(--gty-text)',opacity:0.7,margin:0 }}>🎯 {gty.goal}</p>}
          </div>
          <div style={{ textAlign:'center' as const }}>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:30,fontWeight:800,color:'var(--gty-text)',margin:0,lineHeight:1 }}>{Math.max(0,daysUntil(gty.date))}</p>
            <p style={{ fontSize:10,color:'var(--gty-text)',opacity:0.6,margin:0 }}>jours restants</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:8 }}>
        <div style={{ display:'flex',gap:5 }}>
          {([['year','Vue annuelle'],['month','Vue mensuelle']] as [CalView,string][]).map(([v,l])=>(
            <button key={v} onClick={()=>setCalView(v)} style={{ padding:'6px 12px',borderRadius:9,border:'1px solid',borderColor:calView===v?'#00c8e0':'var(--border)',background:calView===v?'rgba(0,200,224,0.10)':'var(--bg-card)',color:calView===v?'#00c8e0':'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:calView===v?600:400 }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex',gap:6,alignItems:'center' }}>
          {raceByLevel.map(x=>{ const cfg=RACE_CONFIG[x.level]; return <span key={x.level} style={{ padding:'2px 7px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:x.level==='gty'?'var(--gty-text)':cfg.color,fontSize:9,fontWeight:700 }}>{x.count} {cfg.label}</span> })}
          <button onClick={()=>setAddModal({month:currentMonth})} style={{ padding:'6px 12px',borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer' }}>+ Course</button>
        </div>
      </div>

      {/* Vue annuelle */}
      {calView==='year' && (
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,minmax(140px,1fr))',gap:10,minWidth:560 }}>
            {MONTHS.map((month,mi)=>{ const mr=getRacesForMonth(mi); return (
              <div key={mi} style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:12,boxShadow:'var(--shadow-card)',cursor:'pointer' }} onClick={()=>{setCurrentMonth(mi);setCalView('month')}}>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 7px',color:mr.length>0?'var(--text)':'var(--text-dim)' }}>{MONTH_SHORT[mi]}</p>
{mr.length>0 ? mr.sort((a,b)=>new Date(a.date).getDate()-new Date(b.date).getDate()).map(r=>{ const cfg=RACE_CONFIG[r.level]; return (
                  <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}} style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:7,background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer',marginBottom:4 }}>
                    <span style={{ fontSize:9 }}>{cfg.emoji}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:r.level==='gty'?'var(--gty-text)':cfg.color }}>{r.name}</p>
                      <p style={{ fontSize:9,color:'var(--text-dim)',margin:0 }}>{new Date(r.date).getDate()} {MONTH_SHORT[mi]}</p>
                    </div>
                  </div>
                )}) : (<p style={{ fontSize:10,color:'var(--text-dim)',margin:0,fontStyle:'italic' as const }}>Aucune course</p>)}
                </div>
            )})}
          </div>
        </div>
      )}

      {/* Vue mensuelle */}
      {calView==='month' && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:16,boxShadow:'var(--shadow-card)' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <div style={{ display:'flex',alignItems:'center',gap:9 }}>
              <button onClick={()=>setCurrentMonth(m=>Math.max(0,m-1))} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-mid)',fontSize:13 }}>←</button>
              <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>{MONTHS[currentMonth]} {year}</h2>
              <button onClick={()=>setCurrentMonth(m=>Math.min(11,m+1))} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-mid)',fontSize:13 }}>→</button>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:5 }}>
            {['L','M','M','J','V','S','D'].map((d,i)=><div key={i} style={{ textAlign:'center' as const,fontSize:9,fontWeight:600,color:'var(--text-dim)',padding:'3px 0' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
            {Array.from({length:getFirstDay(currentMonth)-1},(_,i)=><div key={`e${i}`} style={{ height:60,borderRadius:7,background:'var(--bg-card2)',opacity:0.3 }}/>)}
            {Array.from({length:getDaysInMonth(currentMonth)},(_,i)=>{ const day=i+1; const ds=`${year}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; const dr=races.filter(r=>r.date===ds); const isToday=new Date().toDateString()===new Date(ds).toDateString(); return (
              <div key={day} onClick={()=>setAddModal({month:currentMonth,day})} style={{ height:60,borderRadius:7,background:'var(--bg-card2)',border:`1px solid ${isToday?'#00c8e0':'var(--border)'}`,padding:'3px 4px',cursor:'pointer',display:'flex',flexDirection:'column',gap:1 }}>
                <p style={{ fontSize:10,fontWeight:isToday?700:500,color:isToday?'#00c8e0':'var(--text-mid)',margin:0,textAlign:'right' as const }}>{day}</p>
                {dr.map(r=>{ const cfg=RACE_CONFIG[r.level]; return <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}} style={{ borderRadius:3,padding:'1px 3px',background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer' }}><p style={{ fontSize:7,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:r.level==='gty'?'var(--gty-text)':cfg.color }}>{cfg.emoji} {r.name}</p></div> })}
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Prochaine course */}
      {nextRace && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:13,padding:14,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 9px' }}>Prochaine course</p>
          <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' as const }}>
            <div style={{ width:52,height:52,borderRadius:11,background:RACE_CONFIG[nextRace.level].bg,border:`2px solid ${RACE_CONFIG[nextRace.level].border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <span style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:nextRace.level==='gty'?'var(--gty-text)':RACE_CONFIG[nextRace.level].color,lineHeight:1 }}>{daysUntil(nextRace.date)}</span>
              <span style={{ fontSize:7,color:'var(--text-dim)' }}>jours</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>{nextRace.name}</p>
              <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 4px' }}>{new Date(nextRace.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p>
              {nextRace.goal && <p style={{ fontSize:11,color:'var(--text-mid)',margin:0 }}>🎯 {nextRace.goal}</p>}
            </div>
            <button onClick={()=>setEditModal(nextRace)} style={{ padding:'5px 10px',borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>Modifier</button>
          </div>
        </div>
      )}

      {/* Liste courses */}
      {races.length>0 && (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0,color:'var(--text-dim)' }}>Toutes les courses {year} — {races.length} au total</p>
          {(['gty','main','important','secondary'] as RaceLevel[]).map(level=>{ const lr=races.filter(r=>r.level===level).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()); if(!lr.length)return null; const cfg=RACE_CONFIG[level]; return (
            <div key={level}>
              <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:level==='gty'?'var(--text)':cfg.color,margin:'0 0 5px' }}>{cfg.emoji} {cfg.label} ({lr.length})</p>
              {lr.map(r=>{ const days=daysUntil(r.date),past=days<0; return (
                <div key={r.id} style={{ display:'flex',alignItems:'center',gap:11,padding:'11px 13px',borderRadius:10,background:past?'var(--bg-card2)':cfg.bg,border:`1px solid ${past?'var(--border)':cfg.border+'44'}`,marginBottom:5,opacity:past?0.65:1 }}>
                  <div style={{ textAlign:'center' as const,minWidth:40,flexShrink:0 }}>
                    <p style={{ fontFamily:'Syne,sans-serif',fontSize:past?13:18,fontWeight:800,color:past?'var(--text-dim)':level==='gty'?'var(--gty-text)':cfg.color,margin:0,lineHeight:1 }}>{past?'✓':days}</p>
                    <p style={{ fontSize:8,color:'var(--text-dim)',margin:0 }}>{past?'Passée':'jours'}</p>
                  </div>
                  <div style={{ flex:1,minWidth:0,cursor:'pointer' }} onClick={()=>setDetailModal(r)}>
                    <p style={{ fontSize:12,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{r.name}</p>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})} · {SPORT_EMOJI[r.sport as SportType]}</p>
                    {r.goal && <p style={{ fontSize:9,color:'var(--text-mid)',margin:'1px 0 0' }}>🎯 {r.goal}</p>}
                  </div>
                  <button onClick={()=>setEditModal(r)} style={{ padding:'4px 8px',borderRadius:7,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>✏️</button>
                </div>
              )})}
            </div>
          )})}

          {/* Compteur par sport */}
          {sportCounts.length>0 && (
            <div style={{ marginTop:4,padding:'10px 14px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)' }}>
              <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Compétitions par sport</p>
              <div style={{ display:'flex',gap:14,flexWrap:'wrap' as const }}>
                {sportCounts.map(x=>(
                  <div key={x.sport} style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <span style={{ fontSize:14 }}>{SPORT_EMOJI[x.sport as SportType]}</span>
                    <span style={{ fontSize:12,color:'var(--text-mid)' }}>{SPORT_LABEL[x.sport as SportType]}</span>
                    <span style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text)' }}>{x.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {races.length===0 && (
        <div style={{ padding:'32px 20px',textAlign:'center' as const,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14 }}>
          <p style={{ fontSize:32,marginBottom:8 }}>🏁</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 6px' }}>Aucune course planifiée</p>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:'0 0 16px' }}>Ajoutez votre première compétition</p>
          <button onClick={()=>setAddModal({month:currentMonth})} style={{ padding:'9px 20px',borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer' }}>+ Ajouter une course</button>
        </div>
      )}

      {addModal    && <RaceAddModal month={addModal.month} day={addModal.day} year={year} onClose={()=>setAddModal(null)} onSave={handleAddRace}/>}
      {detailModal && <RaceDetailModal race={detailModal} onClose={()=>setDetailModal(null)} onDelete={handleDeleteRace} onValidate={handleValidate} onEdit={()=>{setEditModal(detailModal);setDetailModal(null)}}/>}
      {editModal   && <RaceEditModal race={editModal} onClose={()=>setEditModal(null)} onSave={handleUpdateRace}/>}
    </div>
  )
}

// ── Race Modals ───────────────────────────────────
function RaceAddModal({ month, day, year, onClose, onSave }:{ month:number; day?:number; year:number; onClose:()=>void; onSave:(r:Omit<Race,'id'|'validated'|'validationData'>)=>void }) {
  const dd = `${year}-${String(month+1).padStart(2,'0')}-${String(day||1).padStart(2,'0')}`
  const [sport,setSport]=useState<RaceSport>('run'); const [name,setName]=useState(''); const [date,setDate]=useState(dd); const [level,setLevel]=useState<RaceLevel>('important'); const [runDist,setRunDist]=useState(RUN_DISTANCES[2]); const [triDist,setTriDist]=useState(TRI_DISTANCES[1]); const [hyroxCat,setHyroxCat]=useState(''); const [hyroxLvl,setHyroxLvl]=useState(''); const [hyroxGen,setHyroxGen]=useState(''); const [goalTime,setGoalTime]=useState(''); const [goalSwim,setGoalSwim]=useState(''); const [goalBike,setGoalBike]=useState(''); const [goalRun,setGoalRun]=useState('')
  const RACE_SPORTS: RaceSport[] = ['run','bike','swim','hyrox','triathlon','rowing']
  const RSL: Record<RaceSport,string> = {run:'Course à pied',bike:'Cyclisme',swim:'Natation',hyrox:'Hyrox',triathlon:'Triathlon',rowing:'Aviron'}
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:500,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Ajouter une course</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Sport</p>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:14 }}>
          {RACE_SPORTS.map(s=><button key={s} onClick={()=>{setSport(s);setHyroxCat('');setHyroxLvl('');setHyroxGen('')}} style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',borderColor:sport===s?SPORT_BORDER[s]:'var(--border)',background:sport===s?SPORT_BG[s]:'var(--bg-card2)',color:sport===s?SPORT_BORDER[s]:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>{SPORT_EMOJI[s]} {RSL[s]}</button>)}
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Niveau</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14 }}>
          {(['gty','main','important','secondary'] as RaceLevel[]).map(l=>{ const cfg=RACE_CONFIG[l]; return <button key={l} onClick={()=>setLevel(l)} style={{ padding:'8px 10px',borderRadius:9,border:'1px solid',cursor:'pointer',textAlign:'left' as const,borderColor:level===l?cfg.border:'var(--border)',background:level===l?cfg.bg:'var(--bg-card2)' }}><p style={{ fontSize:11,fontWeight:600,margin:0,color:level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text)' }}>{cfg.emoji} {cfg.label}</p></button> })}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:9,marginBottom:12 }}>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Nom</p><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Ironman Nice" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        </div>
        {sport==='run'&&<div style={{ marginBottom:12 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Distance</p><div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:8 }}>{RUN_DISTANCES.map(d=><button key={d} onClick={()=>setRunDist(d)} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:runDist===d?'#22c55e':'var(--border)',background:runDist===d?'rgba(34,197,94,0.10)':'var(--bg-card2)',color:runDist===d?'#22c55e':'var(--text-mid)',fontSize:11,cursor:'pointer' }}>{d}</button>)}</div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif de temps</p><input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: 1h25:00" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>}
        {sport==='triathlon'&&<div style={{ marginBottom:12 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Distance</p><div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:10 }}>{TRI_DISTANCES.map(d=><button key={d} onClick={()=>setTriDist(d)} style={{ padding:'8px 12px',borderRadius:9,border:'1px solid',borderColor:triDist===d?'#a855f7':'var(--border)',background:triDist===d?'rgba(168,85,247,0.10)':'var(--bg-card2)',cursor:'pointer',textAlign:'left' as const }}><p style={{ fontSize:12,fontWeight:600,margin:0,color:triDist===d?'#a855f7':'var(--text)' }}>{d}</p><p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>🏊 {TRI_SWIM[d]} · 🚴 {TRI_BIKE[d]} · 🏃 {TRI_RUN[d]}</p></button>)}</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>{[{l:'🏊 Natation',v:goalSwim,s:setGoalSwim,p:'32:00'},{l:'🚴 Vélo',v:goalBike,s:setGoalBike,p:'2h25'},{l:'🏃 Run',v:goalRun,s:setGoalRun,p:'1h35'},{l:'⏱ Total',v:goalTime,s:setGoalTime,p:'4h40'}].map(x=><div key={x.l}><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>{x.l}</p><input value={x.v} onChange={e=>x.s(e.target.value)} placeholder={x.p} style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>)}</div></div>}
        {sport==='hyrox'&&<div style={{ marginBottom:12 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Catégorie</p><div style={{ display:'flex',gap:6,marginBottom:10 }}>{['Solo','Double','Relay'].map(c=><button key={c} onClick={()=>{setHyroxCat(c);setHyroxLvl('');setHyroxGen('')}} style={{ flex:1,padding:'8px',borderRadius:9,border:'1px solid',borderColor:hyroxCat===c?'#ef4444':'var(--border)',background:hyroxCat===c?'rgba(239,68,68,0.10)':'var(--bg-card2)',color:hyroxCat===c?'#ef4444':'var(--text-mid)',fontSize:12,cursor:'pointer',fontWeight:hyroxCat===c?600:400 }}>{c}</button>)}</div>{hyroxCat&&<div style={{ display:'flex',gap:6,marginBottom:10 }}>{(hyroxCat==='Relay'?['Open']:['Open','Pro']).map(l=><button key={l} onClick={()=>{setHyroxLvl(l);setHyroxGen('')}} style={{ flex:1,padding:'8px',borderRadius:9,border:'1px solid',borderColor:hyroxLvl===l?'#ef4444':'var(--border)',background:hyroxLvl===l?'rgba(239,68,68,0.10)':'var(--bg-card2)',color:hyroxLvl===l?'#ef4444':'var(--text-mid)',fontSize:12,cursor:'pointer' }}>{l}</button>)}</div>}{hyroxCat&&hyroxLvl&&<div style={{ display:'flex',gap:6,marginBottom:10 }}>{['Homme','Femme','Mixte'].map(g=><button key={g} onClick={()=>setHyroxGen(g)} style={{ flex:1,padding:'8px',borderRadius:9,border:'1px solid',borderColor:hyroxGen===g?'#ef4444':'var(--border)',background:hyroxGen===g?'rgba(239,68,68,0.10)':'var(--bg-card2)',color:hyroxGen===g?'#ef4444':'var(--text-mid)',fontSize:12,cursor:'pointer' }}>{g}</button>)}</div>}<p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif</p><input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: 59:00" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>}
        {!['run','triathlon','hyrox'].includes(sport)&&<div style={{ marginBottom:12 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif</p><input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: Podium" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave({name:name||'Course',sport,date,level,goal:goalTime||undefined,runDistance:sport==='run'?runDist:undefined,triDistance:sport==='triathlon'?triDist:undefined,hyroxCategory:hyroxCat||undefined,hyroxLevel:hyroxLvl||undefined,hyroxGender:hyroxGen||undefined,goalTime:goalTime||undefined,goalSwimTime:goalSwim||undefined,goalBikeTime:goalBike||undefined,goalRunTime:goalRun||undefined})} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function RaceEditModal({ race, onClose, onSave }:{ race:Race; onClose:()=>void; onSave:(r:Race)=>void }) {
  const [form,setForm]=useState<Race>({...race})
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:440,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Modifier</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Nom</p><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6 }}>Niveau</p><div style={{ display:'flex',gap:5,flexWrap:'wrap' as const }}>{(['secondary','important','main','gty'] as RaceLevel[]).map(l=>{ const cfg=RACE_CONFIG[l]; return <button key={l} onClick={()=>setForm({...form,level:l})} style={{ padding:'4px 9px',borderRadius:7,border:'1px solid',borderColor:form.level===l?cfg.border:'var(--border)',background:form.level===l?cfg.bg:'var(--bg-card2)',color:form.level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text-mid)',fontSize:10,cursor:'pointer',fontWeight:form.level===l?700:400 }}>{cfg.emoji} {cfg.label}</button> })}</div></div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif</p><input value={form.goal??''} onChange={e=>setForm({...form,goal:e.target.value})} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div style={{ marginBottom:14 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Stratégie</p><textarea value={form.strategy??''} onChange={e=>setForm({...form,strategy:e.target.value})} rows={2} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const }}/></div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave(form)} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>Sauvegarder</button>
        </div>
      </div>
    </div>
  )
}

function RaceDetailModal({ race, onClose, onDelete, onValidate, onEdit }:{ race:Race; onClose:()=>void; onDelete:(id:string)=>void; onValidate:(r:Race)=>void; onEdit:()=>void }) {
  const [tab,setTab]=useState<'detail'|'validate'>('detail')
  const [form,setForm]=useState<Race>({...race})
  const cfg  = RACE_CONFIG[race.level]
  const days = daysUntil(race.date)
  const vd   = form.validationData ?? {}
  const speed = vd.vKm&&vd.vTime ? `${(parseFloat(vd.vKm)/(parseFloat(vd.vTime)/60)).toFixed(1)} km/h` : '—'
  function setVd(patch:Record<string,any>) { setForm(f=>({...f,validationData:{...f.validationData,...patch}})) }
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:500,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14 }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
              <span style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:race.level==='gty'?'var(--gty-text)':cfg.color,fontSize:9,fontWeight:700 }}>{cfg.emoji} {cfg.label}</span>
              {race.hyroxCategory && <span style={{ fontSize:9,color:'var(--text-dim)' }}>{race.hyroxCategory} · {race.hyroxLevel} · {race.hyroxGender}</span>}
            </div>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>{race.name}</h3>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:'3px 0 0' }}>{SPORT_EMOJI[race.sport as SportType]} · {new Date(race.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            {race.runDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'2px 0 0' }}>📏 {race.runDistance} — {RUN_KM[race.runDistance]}km</p>}
            {race.triDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'2px 0 0' }}>🔱 {race.triDistance} · 🏊{TRI_SWIM[race.triDistance]} 🚴{TRI_BIKE[race.triDistance]} 🏃{TRI_RUN[race.triDistance]}</p>}
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:5,marginBottom:14 }}>
          {(['detail','validate'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:'7px',borderRadius:9,border:'1px solid',borderColor:tab===t?SPORT_BORDER[race.sport as SportType]:'var(--border)',background:tab===t?SPORT_BG[race.sport as SportType]:'var(--bg-card2)',color:tab===t?SPORT_BORDER[race.sport as SportType]:'var(--text-mid)',fontSize:11,fontWeight:tab===t?600:400,cursor:'pointer' }}>
              {t==='detail'?'📊 Détail':'✅ Valider résultats'}
            </button>
          ))}
        </div>

        {/* DETAIL */}
        {tab==='detail' && (
          <div>
            <div style={{ padding:'10px 14px',borderRadius:11,background:days>0?cfg.bg:'var(--bg-card2)',border:`1px solid ${days>0?cfg.border+'44':'var(--border)'}`,marginBottom:12,display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ textAlign:'center' as const,flexShrink:0 }}>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:days>0?race.level==='gty'?'var(--gty-text)':cfg.color:'var(--text-dim)',margin:0,lineHeight:1 }}>{days>0?days:'✓'}</p>
                <p style={{ fontSize:9,color:'var(--text-dim)',margin:0 }}>{days>0?'jours':'Passée'}</p>
              </div>
              <div>
                {race.goal        && <p style={{ fontSize:13,fontWeight:600,margin:'0 0 3px' }}>🎯 {race.goal}</p>}
                {race.goalTime    && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>⏱ Objectif : {race.goalTime}</p>}
                {race.goalSwimTime&& <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>🏊 Natation : {race.goalSwimTime}</p>}
                {race.goalBikeTime&& <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>🚴 Vélo : {race.goalBikeTime}</p>}
                {race.goalRunTime && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>🏃 Run : {race.goalRunTime}</p>}
                {race.strategy   && <p style={{ fontSize:11,color:'var(--text-dim)',margin:'4px 0 0',lineHeight:1.5 }}>{race.strategy}</p>}
              </div>
            </div>
            {/* Résultats déjà validés */}
            {race.validated && vd.vTime && (
              <div style={{ padding:'10px 14px',borderRadius:11,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',marginBottom:12 }}>
                <p style={{ fontSize:11,fontWeight:700,color:'#00c8e0',margin:'0 0 6px' }}>✓ Résultats validés</p>
                {vd.vTime      && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>⏱ Temps : {vd.vTime}</p>}
                {vd.vKm        && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>📏 Distance : {vd.vKm} km</p>}
                {vd.vSpeed     && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>⚡ Vitesse : {vd.vSpeed}</p>}
                {vd.vElevation && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>⛰ Dénivelé : {vd.vElevation}m</p>}
                {/* Triathlon splits */}
                {vd.vSwimTime  && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>🏊 {vd.vSwimTime} · 🚴 {vd.vBikeTime} · 🏃 {vd.vRunTime}</p>}
              </div>
            )}
            <div style={{ display:'flex',gap:7 }}>
              <button onClick={()=>onDelete(race.id)} style={{ padding:'8px 11px',borderRadius:9,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:11,cursor:'pointer' }}>Supprimer</button>
              <button onClick={onEdit} style={{ padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>✏️ Modifier</button>
              <button onClick={onClose} style={{ flex:1,padding:9,borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:11,cursor:'pointer' }}>Fermer</button>
            </div>
          </div>
        )}

        {/* VALIDATE */}
        {tab==='validate' && (
          <div>
            {/* HYROX */}
            {race.sport==='hyrox' && (
              <div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:14 }}>
                  <div><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>Temps total</p><input value={vd.vTime??''} onChange={e=>setVd({vTime:e.target.value})} placeholder="58:45" style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
                  <div><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>FC moyenne</p><input value={vd.vHrAvg??''} onChange={e=>setVd({vHrAvg:e.target.value})} placeholder="168bpm" style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
                </div>
                <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'#ef4444',marginBottom:7 }}>Stations</p>
                <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:12 }}>
                  {HYROX_STATIONS.map((station,i)=>(
                    <div key={station} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:8,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)' }}>
                      <span style={{ fontSize:9,fontWeight:600,color:'#ef4444',width:18,flexShrink:0 }}>{i+1}</span>
                      <span style={{ flex:1,fontSize:11 }}>{station}</span>
                      <input value={(vd.vStations??{})[station]??''} onChange={e=>setVd({vStations:{...(vd.vStations??{}),[station]:e.target.value}})} placeholder="ex: 1:45" style={{ width:70,padding:'4px 6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'#ef4444',marginBottom:7 }}>Runs (8×1km)</p>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12 }}>
                  {Array.from({length:8},(_,i)=>(
                    <div key={i}>
                      <p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Run {i+1}</p>
                      <input value={(vd.vRuns??[])[i]??''} onChange={e=>{ const runs=[...(vd.vRuns??Array(8).fill(''))]; runs[i]=e.target.value; setVd({vRuns:runs}) }} placeholder="4:20" style={{ width:'100%',padding:'5px 7px',borderRadius:6,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>Roxzone</p>
                  <input value={vd.vRoxzone??''} onChange={e=>setVd({vRoxzone:e.target.value})} placeholder="8:30" style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/>
                </div>
              </div>
            )}

            {/* TRIATHLON */}
            {race.sport==='triathlon' && (
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:14 }}>
                {[{l:'🏊 Natation',k:'vSwimTime',p:'32:00'},{l:'🚴 Vélo',k:'vBikeTime',p:'2h25:00'},{l:'🏃 Run',k:'vRunTime',p:'1h35:00'},{l:'⏱ Total',k:'vTime',p:'4h40:00'},{l:'T1',k:'vT1',p:'2:30'},{l:'T2',k:'vT2',p:'1:45'}].map(x=>(
                  <div key={x.k}>
                    <p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>{x.l}</p>
                    <input value={vd[x.k]??''} onChange={e=>setVd({[x.k]:e.target.value})} placeholder={x.p} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/>
                  </div>
                ))}
              </div>
            )}

            {/* AUTRES SPORTS */}
            {!['hyrox','triathlon'].includes(race.sport) && (
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:14 }}>
                <div><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>Temps (min ou h:mm)</p><input value={vd.vTime??''} onChange={e=>setVd({vTime:e.target.value})} placeholder="85" style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
                <div><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>Distance (km)</p><input value={vd.vKm??''} onChange={e=>setVd({vKm:e.target.value})} placeholder={race.runDistance?String(RUN_KM[race.runDistance??'']||''):''} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
                <div><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>Dénivelé (m)</p><input value={vd.vElevation??''} onChange={e=>setVd({vElevation:e.target.value})} placeholder="0" style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
                {vd.vTime&&vd.vKm&&(
                  <div style={{ padding:'7px 9px',borderRadius:8,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)' }}>
                    <p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 2px' }}>Vitesse auto</p>
                    <p style={{ fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:'#00c8e0',margin:0 }}>{speed}</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={()=>onValidate({...form,validated:true,validationData:{...vd,vSpeed:speed}})} style={{ width:'100%',padding:11,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[race.sport as SportType]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:4 }}>✓ Valider les résultats</button>
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
  const { sessions } = usePlanning()

  const TABS: [PlanningTab,string,string,string,string][] = [
    ['training','Planning Training','Training','#00c8e0','rgba(0,200,224,0.10)'],
    ['week',    'Planning Week',    'Week',    '#a78bfa','rgba(167,139,250,0.10)'],
    ['race',    'Race Year',        'Race Year','#ef4444','rgba(239,68,68,0.10)'],
  ]

  return (
    <div style={{ padding:'24px 28px',maxWidth:'100%' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Planning</h1>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>Training · Semaine · Saison</p>
      </div>

      <div style={{ display:'flex',gap:7,marginBottom:20,flexWrap:'wrap' as const }}>
        {TABS.map(([id,label,short,color,bg])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1,minWidth:90,padding:'11px 14px',borderRadius:12,border:'1px solid',cursor:'pointer',
              borderColor:tab===id?color:'var(--border)',background:tab===id?bg:'var(--bg-card)',
              color:tab===id?color:'var(--text-mid)',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:tab===id?700:400,
              boxShadow:'var(--shadow-card)',transition:'all 0.15s' }}>
            <span className="hidden md:inline">{label}</span>
            <span className="md:hidden">{short}</span>
          </button>
        ))}
      </div>

      {tab==='training' && <TrainingTab/>}
      {tab==='week'     && <WeekTab trainingWeek={sessions}/>}
      {tab==='race'     && <RaceYearTab/>}
    </div>
  )
}
