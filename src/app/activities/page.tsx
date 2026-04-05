'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════
type SportType      = 'run' | 'trail_run' | 'bike' | 'virtual_bike' | 'swim' | 'rowing' | 'hyrox' | 'gym' | 'other'
type ActivityStatus = 'imported' | 'completed' | 'validated'
type FilterSport    = 'all' | SportType
type FilterStatus   = 'all' | ActivityStatus
type FilterType     = 'all' | 'training' | 'competition'
type DetailTab      = 'overview' | 'charts' | 'pro' | 'intervals' | 'enrich'

interface Zone { label: string; color: string; min: number; max: number }
interface TrainingZones { hr: Zone[]; pace: Zone[]; power: Zone[] }

interface StreamData {
  time?:      number[]
  distance?:  number[]
  altitude?:  number[]
  heartrate?: number[]
  velocity?:  number[]
  watts?:     number[]
  cadence?:   number[]
  temp?:      number[]
}

interface IntervalBlock {
  index:     number
  label:     string
  startIdx:  number
  endIdx:    number
  durationS: number
  avgHr:     number
  avgPace:   number
  avgWatts:  number
  distM:     number
}

interface HyroxStation { name: string; time?: string; distance?: number; weight?: number; reps?: number }
interface GymSet { reps: number; weight: number }
interface GymExercise {
  id: string; name: string; category: 'upper'|'lower'|'cardio'|'other'
  sets: GymSet[]; cardioTime?: string; cardioDist?: number; cardioWatts?: number
}

interface Activity {
  id:               string
  sport:            SportType
  title:            string
  started_at:       string
  distance_m:       number | null
  moving_time_s:    number | null
  elapsed_time_s:   number | null
  elevation_gain_m: number | null
  avg_speed_ms:     number | null
  max_speed_ms:     number | null
  avg_pace_s_km:    number | null
  avg_hr:           number | null
  max_hr:           number | null
  avg_watts:        number | null
  normalized_watts: number | null
  avg_cadence:      number | null
  calories:         number | null
  tss:              number | null
  rpe:              number | null
  is_race:          boolean
  trainer:          boolean
  provider:         string
  status:           ActivityStatus
  notes:            string | null
  raw_data:         Record<string, any>
  streams?:         StreamData | null
  gymExercises?:    GymExercise[]
  hyroxStations?:   HyroxStation[]
  hyroxRuns?:       string[]
  userNotes?:       string
  feeling?:         number
}

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════
const SPORT_LABEL: Record<SportType, string> = {
  run:'Running', trail_run:'Trail', bike:'Cyclisme', virtual_bike:'Home Trainer',
  swim:'Natation', rowing:'Aviron', hyrox:'Hyrox', gym:'Musculation', other:'Autre',
}
const SPORT_EMOJI: Record<SportType, string> = {
  run:'🏃', trail_run:'🏔', bike:'🚴', virtual_bike:'🚴',
  swim:'🏊', rowing:'🚣', hyrox:'🏋️', gym:'💪', other:'⚡',
}
const SPORT_COLOR: Record<SportType, string> = {
  run:'#22c55e', trail_run:'#f97316', bike:'#3b82f6', virtual_bike:'#3b82f6',
  swim:'#38bdf8', rowing:'#14b8a6', hyrox:'#ef4444', gym:'#ffb340', other:'#9ca3af',
}
const STATUS_CFG = {
  imported:  { label:'Importée',  color:'#9ca3af', bg:'rgba(156,163,175,0.10)' },
  completed: { label:'Complétée', color:'#ffb340', bg:'rgba(255,179,64,0.10)'  },
  validated: { label:'Validée',   color:'#22c55e', bg:'rgba(34,197,94,0.10)'   },
}
const PROVIDER_LABEL: Record<string, string> = {
  manual:'Manuel', strava:'Strava', wahoo:'Wahoo', polar:'Polar', garmin:'Garmin',
}
const ZONE_COLORS  = ['#9ca3af','#3b82f6','#22c55e','#f97316','#ef4444']
const ZONE_LABELS  = ['Z1 Récup','Z2 Aérobie','Z3 Tempo','Z4 Seuil','Z5 VO2max']
const ZONE_BG      = ['rgba(156,163,175,0.08)','rgba(59,130,246,0.08)','rgba(34,197,94,0.08)','rgba(249,115,22,0.08)','rgba(239,68,68,0.08)']

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmer Carry','Sandbag Lunges','Wall Balls']
const GYM_UPPER  = ['Développé couché','Développé incliné','Tractions','Rowing barre','Curl biceps','Extension triceps','Élévations latérales','Pompes','Dips','Autre']
const GYM_LOWER  = ['Squat','Leg press','Fentes','Romanian deadlift','Hip thrust','Leg curl','Leg extension','Mollets','Sumo deadlift','Autre']
const GYM_CARDIO = ['SkiErg','Rameur','Vélo','Vélo elliptique','Stairs','Autre']
const GYM_OTHER  = ['Étirements','Mobilité','Gainage','Yoga','Autre']

const QUICK_TAGS = ['Bonne séance','Très bonnes sensations','Fatigue','Douleur','Manque d\'énergie','Météo difficile','Nutrition ok','Objectif atteint']

const RPE_LABELS: Record<number, string> = {
  1:'Très facile', 2:'Très facile', 3:'Facile', 4:'Facile',
  5:'Modéré', 6:'Modéré', 7:'Difficile', 8:'Difficile',
  9:'Maximal', 10:'Maximal',
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function fmtDur(s: number): string {
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60
  if(h>0) return `${h}h${String(m).padStart(2,'0')}`
  return `${m}:${String(Math.round(sec)).padStart(2,'0')}`
}
function fmtPace(s_km: number): string {
  if(!s_km||s_km<=0) return '—'
  return `${Math.floor(s_km/60)}:${String(Math.round(s_km%60)).padStart(2,'0')}/km`
}
function fmtPaceShort(s_km: number): string {
  if(!s_km||s_km<=0) return '—'
  return `${Math.floor(s_km/60)}:${String(Math.round(s_km%60)).padStart(2,'0')}`
}
function fmtDist(m: number|null): string {
  if(!m||m<=0) return '—'
  return m>=1000?`${(m/1000).toFixed(2)} km`:`${Math.round(m)} m`
}
function fmtSpeed(ms: number): string { return `${(ms*3.6).toFixed(1)} km/h` }
function avg(arr: number[]): number {
  const v=arr.filter(x=>x>0&&isFinite(x))
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:0
}
function maxV(arr: number[]): number { return arr.filter(x=>isFinite(x)).reduce((a,b)=>Math.max(a,b),0) }
function minV(arr: number[]): number { return arr.filter(x=>isFinite(x)).reduce((a,b)=>Math.min(a,b),Infinity) }
function smooth(arr: number[], w=5): number[] {
  return arr.map((_,i)=>{
    const s=arr.slice(Math.max(0,i-w),i+w+1).filter(x=>x>0&&isFinite(x))
    return s.length?s.reduce((a,b)=>a+b,0)/s.length:0
  })
}
function calcSlope(elev: number[], dist: number[], idx: number): number {
  const w=5
  const i0=Math.max(0,idx-w), i1=Math.min(elev.length-1,idx+w)
  const de=elev[i1]-elev[i0], dd=(dist[i1]-dist[i0])
  return dd>0?(de/dd)*100:0
}

function defaultZones(): TrainingZones {
  return {
    hr:[
      {label:'Z1',color:'#9ca3af',min:0,  max:130},
      {label:'Z2',color:'#3b82f6',min:130,max:150},
      {label:'Z3',color:'#22c55e',min:150,max:165},
      {label:'Z4',color:'#f97316',min:165,max:178},
      {label:'Z5',color:'#ef4444',min:178,max:999},
    ],
    pace:[
      {label:'Z1',color:'#9ca3af',min:330,max:999},
      {label:'Z2',color:'#3b82f6',min:280,max:330},
      {label:'Z3',color:'#22c55e',min:255,max:280},
      {label:'Z4',color:'#f97316',min:228,max:255},
      {label:'Z5',color:'#ef4444',min:0,  max:228},
    ],
    power:[
      {label:'Z1',color:'#9ca3af',min:0,  max:166},
      {label:'Z2',color:'#3b82f6',min:166,max:226},
      {label:'Z3',color:'#22c55e',min:226,max:262},
      {label:'Z4',color:'#f97316',min:262,max:316},
      {label:'Z5',color:'#ef4444',min:316,max:999},
    ],
  }
}
function getZoneIdx(value: number, zones: Zone[]): number {
  for(let i=0;i<zones.length;i++) if(value>=zones[i].min&&value<zones[i].max) return i
  return zones.length-1
}
function zoneTimes(stream: number[], zones: Zone[], totalS: number): number[] {
  const counts=[0,0,0,0,0]
  stream.forEach(v=>{counts[getZoneIdx(v,zones)]++})
  const total=stream.length||1
  return counts.map(c=>Math.round((c/total)*(totalS/60)))
}

function generateAnalysis(a: Activity): {icon:string;title:string;detail:string;level:'ok'|'warn'|'alert'}[] {
  const out:{icon:string;title:string;detail:string;level:'ok'|'warn'|'alert'}[]=[]
  const isBike=a.sport==='bike'||a.sport==='virtual_bike'
  const isRun=a.sport==='run'||a.sport==='trail_run'

  // Régularité de l'effort (vélo)
  if(isBike&&a.avg_watts&&a.normalized_watts&&a.avg_watts>0){
    const vi=a.normalized_watts/a.avg_watts
    if(vi<1.05) out.push({icon:'⚡',title:'Effort très régulier',detail:`VI ${vi.toFixed(2)} — puissance bien contrôlée tout au long de la séance.`,level:'ok'})
    else if(vi<1.12) out.push({icon:'📊',title:'Effort globalement régulier',detail:`VI ${vi.toFixed(2)} — quelques variations d'intensité, typique d'un parcours vallonné.`,level:'ok'})
    else out.push({icon:'⚠️',title:'Variabilité élevée',detail:`VI ${vi.toFixed(2)} — effort très irrégulier. Travailler la gestion de l'allure.`,level:'warn'})
  }

  // Charge d'entraînement
  if(a.tss&&a.tss>0){
    if(a.tss>200) out.push({icon:'🔴',title:'Charge extrême',detail:`${Math.round(a.tss)} TSS — séance très lourde. 72h de récupération minimum.`,level:'alert'})
    else if(a.tss>120) out.push({icon:'🟠',title:'Charge élevée',detail:`${Math.round(a.tss)} TSS — séance intense. Récupération de 48h recommandée.`,level:'warn'})
    else if(a.tss>60) out.push({icon:'🟡',title:'Charge modérée',detail:`${Math.round(a.tss)} TSS — bonne séance de travail. Récupération légère en 24h.`,level:'ok'})
    else out.push({icon:'🟢',title:'Charge légère',detail:`${Math.round(a.tss)} TSS — séance récupératrice ou d'activation.`,level:'ok'})
  }

  // Zone FC (running)
  if(isRun&&a.avg_hr&&a.avg_hr>0){
    if(a.avg_hr<140) out.push({icon:'💚',title:'Endurance fondamentale',detail:`FC moy. ${Math.round(a.avg_hr)} bpm — zone aérobie basse. Idéal pour construire la base.`,level:'ok'})
    else if(a.avg_hr<155) out.push({icon:'💛',title:'Endurance active',detail:`FC moy. ${Math.round(a.avg_hr)} bpm — zone aérobie haute. Développement du seuil aérobie.`,level:'ok'})
    else if(a.avg_hr<168) out.push({icon:'🟠',title:'Zone tempo / seuil',detail:`FC moy. ${Math.round(a.avg_hr)} bpm — allure soutenue, proche du seuil lactique.`,level:'warn'})
    else out.push({icon:'🔴',title:'Intensité élevée',detail:`FC moy. ${Math.round(a.avg_hr)} bpm — effort intense. Récupération à soigner.`,level:'alert'})
  }

  // Durée longue
  if((a.moving_time_s??0)>10800) out.push({icon:'⏱',title:'Sortie longue',detail:`${Math.round((a.moving_time_s!)/3600*10)/10}h d'effort — hydratation, nutrition et récupération à planifier.`,level:'warn'})
  else if((a.moving_time_s??0)>7200) out.push({icon:'⏱',title:'Longue durée',detail:`${Math.round((a.moving_time_s!)/3600*10)/10}h — effort prolongé, soigner la récupération.`,level:'ok'})

  // Dénivelé
  if((a.elevation_gain_m??0)>800) out.push({icon:'⛰',title:'Dénivelé majeur',detail:`${Math.round(a.elevation_gain_m!)} m D+ — impact musculaire important, récupération musculaire étendue.`,level:'warn'})
  else if((a.elevation_gain_m??0)>300) out.push({icon:'🏔',title:'Terrain vallonné',detail:`${Math.round(a.elevation_gain_m!)} m D+ — effort musculaire supplémentaire à intégrer dans la charge.`,level:'ok'})

  // Puissance vélo sans zones FC
  if(isBike&&a.avg_watts&&a.avg_watts>0&&!a.normalized_watts){
    out.push({icon:'🚴',title:'Puissance enregistrée',detail:`${Math.round(a.avg_watts)} W moyenne. Ajoute ta FTP dans ton profil pour calculer l'IF et le TSS précis.`,level:'ok'})
  }

  if(!out.length) out.push({icon:'📡',title:'Données partielles',detail:'Connectez un capteur FC ou puissance pour débloquer l\'analyse complète.',level:'ok'})
  return out.slice(0,4)
}

function detectIntervals(a: Activity): IntervalBlock[] {
  const laps=a.raw_data?.laps as any[]|undefined
  if(!laps||laps.length<2) return []
  return laps.map((lap:any,i:number):IntervalBlock=>({
    index:i+1, label:lap.name??`Lap ${i+1}`,
    startIdx:lap.start_index??0, endIdx:lap.end_index??0,
    durationS:lap.elapsed_time??lap.moving_time??0,
    avgHr:lap.average_heartrate??0, avgPace:lap.average_speed?Math.round(1000/lap.average_speed):0,
    avgWatts:lap.average_watts??0, distM:lap.distance??0,
  }))
}

// ══════════════════════════════════════════════════════════
// SUPABASE HOOK
// ══════════════════════════════════════════════════════════
const PAGE_SIZE=20

function useActivities() {
  const supabase=createClient()
  const [activities,setActivities]=useState<Activity[]>([])
  const [loading,setLoading]=useState(true)
  const [total,setTotal]=useState(0)
  const [page,setPage]=useState(0)

  const load=useCallback(async(p=0,sport?:string,isRace?:boolean)=>{
    setLoading(true)
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setLoading(false);return}
    let q=supabase.from('activities').select('*',{count:'exact'}).eq('user_id',user.id).order('started_at',{ascending:false}).range(p*PAGE_SIZE,(p+1)*PAGE_SIZE-1)
    if(sport&&sport!=='all') q=q.eq('sport_type',sport)
    if(isRace!==undefined) q=q.eq('is_race',isRace)
    const {data,count,error}=await q
    if(error){setLoading(false);return}
    const mapped:Activity[]=(data??[]).map((r:any):Activity=>({
      id:r.id, sport:(r.sport_type as SportType)?? 'other',
      title:r.title??SPORT_LABEL[(r.sport_type as SportType)]??'Activité',
      started_at:r.started_at, distance_m:r.distance_m, moving_time_s:r.moving_time_s,
      elapsed_time_s:r.elapsed_time_s, elevation_gain_m:r.elevation_gain_m,
      avg_speed_ms:r.avg_speed_ms, max_speed_ms:r.max_speed_ms,
      avg_pace_s_km:r.avg_pace_s_km, avg_hr:r.avg_hr, max_hr:r.max_hr,
      avg_watts:r.avg_watts, normalized_watts:r.normalized_watts,
      avg_cadence:r.avg_cadence, calories:r.calories, tss:r.tss, rpe:r.rpe,
      is_race:r.is_race??false, trainer:r.trainer??false,
      provider:r.provider??'manual', status:(r.status as ActivityStatus)?? 'imported',
      notes:r.notes, raw_data:r.raw_data??{},
      streams: r.streams ?? r.raw_data?.streams ?? null,
      gymExercises:r.raw_data?.gymExercises, hyroxStations:r.raw_data?.hyroxStations,
      hyroxRuns:r.raw_data?.hyroxRuns, userNotes:r.notes, feeling:r.rpe,
    }))
    if(p===0) setActivities(mapped)
    else setActivities(prev=>[...prev,...mapped])
    setTotal(count??0); setPage(p); setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  async function updateActivity(id:string,updates:Partial<Activity>){
    const {data:{user}}=await supabase.auth.getUser(); if(!user)return
    const cur=activities.find(a=>a.id===id); if(!cur)return
    await supabase.from('activities').update({
      notes:updates.userNotes??null, rpe:updates.feeling??null,
      status:updates.status??cur.status, raw_data:updates.raw_data??cur.raw_data,
      updated_at:new Date().toISOString(),
    }).eq('id',id)
    setActivities(prev=>prev.map(a=>a.id===id?{...a,...updates}:a))
  }

  return{activities,loading,total,page,load,updateActivity}
}

// ══════════════════════════════════════════════════════════
// CHART ENGINE — PROFESSIONAL SYNC CHARTS
// ══════════════════════════════════════════════════════════

interface ChartSel { startPct: number; endPct: number }

interface TrackDef {
  id:      string
  label:   string
  unit:    string
  color:   string
  data:    number[]
  height:  number
  invert?: boolean
  format:  (v:number)=>string
  zones?:  Zone[]
  avg?:    number
}

// Single track renderer
function ChartTrack({
  track, xData, cursorPct, selection, onCursorMove, onSelectStart, onSelectMove, onSelectEnd, laps,
}:{
  track:TrackDef; xData:number[]; cursorPct:number;
  selection:ChartSel|null; onCursorMove:(p:number)=>void;
  onSelectStart:(p:number)=>void; onSelectMove:(p:number)=>void; onSelectEnd:()=>void;
  laps?:IntervalBlock[];
}) {
  const svgRef=useRef<SVGSVGElement>(null)
  const dragging=useRef(false)
  const W=1000, H=track.height
  const valid=track.data.filter(v=>v>0&&isFinite(v))
  if(!valid.length) return(
    <div style={{height:track.height+36,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 100px 0 80px'}}>
      <span style={{fontSize:11,color:'var(--text-dim)'}}>{track.label} — non disponible</span>
    </div>
  )
  const dMin=minV(valid), dMax=maxV(valid), span=dMax-dMin||1, pad=span*0.10
  const avgVal=avg(valid)
  function toY(v:number):number {
    const norm=(v-(dMin-pad))/(span+2*pad)
    return track.invert?norm*(H-2)+1:(1-norm)*(H-2)+1
  }
  const n=track.data.length
  const pts=track.data.map((v,i)=>`${((i/(n-1))*W).toFixed(1)},${(v>0&&isFinite(v)?toY(v):(track.invert?1:H-1)).toFixed(1)}`).join(' ')
  const fillPts=track.data.map((v,i)=>`${((i/(n-1))*W).toFixed(1)},${(v>0&&isFinite(v)?toY(v):(track.invert?1:H-1)).toFixed(1)}`)
  const fillPath=fillPts.join(' ')+` L${W},${H} L0,${H} Z`
  const avgY=toY(avgVal)
  const selX1=selection?(selection.startPct*W):null
  const selX2=selection?(selection.endPct*W):null
  const curX=cursorPct>=0?cursorPct*W:null
  const curIdx=cursorPct>=0?Math.min(Math.round(cursorPct*(n-1)),n-1):null
  const curVal=curIdx!==null&&track.data[curIdx]>0?track.data[curIdx]:null

  // Zone-colored segments
  const segments: {pts:string;color:string}[]=[]
  if(track.zones){
    let segStart=0, prevZ=getZoneIdx(track.data[0]??0,track.zones)
    for(let i=1;i<=n;i++){
      const curZ=i<n?getZoneIdx(track.data[i]??0,track.zones):prevZ
      if(curZ!==prevZ||i===n){
        const segPts=track.data.slice(segStart,i).map((v,j)=>`${(((segStart+j)/(n-1))*W).toFixed(1)},${(v>0&&isFinite(v)?toY(v):(track.invert?1:H-1)).toFixed(1)}`).join(' ')
        segments.push({pts:segPts,color:track.zones[prevZ]?.color??track.color})
        segStart=i; prevZ=curZ
      }
    }
  } else {
    segments.push({pts,color:track.color})
  }

  function getPct(e:React.MouseEvent|React.TouchEvent):number {
    if(!svgRef.current)return 0
    const rect=svgRef.current.getBoundingClientRect()
    const cx='touches' in e?e.touches[0].clientX:(e as React.MouseEvent).clientX
    return Math.max(0,Math.min(1,(cx-rect.left-80)/(rect.width-180)))
  }

  // Y-axis labels
  const yLabels=[dMin,(dMin+dMax)/2,dMax].map(v=>({y:toY(v),label:track.format(v)}))

  return(
    <div style={{position:'relative',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
      {/* Row header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px 3px 80px'}}>
        <span style={{fontSize:9,fontWeight:700,color:track.color,textTransform:'uppercase' as const,letterSpacing:'0.09em'}}>{track.label}</span>
        <div style={{display:'flex',gap:12}}>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>moy {track.format(avgVal)}</span>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>max {track.format(dMax)}</span>
          {track.invert&&<span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>min {track.format(dMin)}</span>}
        </div>
      </div>

      <div style={{display:'flex'}}>
        {/* Y-axis labels */}
        <div style={{width:78,flexShrink:0,position:'relative',height:track.height}}>
          {yLabels.map((l,i)=>(
            <span key={i} style={{position:'absolute',right:6,fontSize:8,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',transform:'translateY(-50%)',top:`${(l.y/H)*100}%`}}>{l.label}</span>
          ))}
        </div>

        {/* SVG chart */}
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          style={{flex:1,height:track.height,display:'block',cursor:'crosshair',userSelect:'none'}}
          preserveAspectRatio="none"
          onMouseMove={e=>{const p=getPct(e);onCursorMove(p);if(dragging.current)onSelectMove(p)}}
          onMouseDown={e=>{const p=getPct(e);dragging.current=true;onSelectStart(p)}}
          onMouseUp={()=>{dragging.current=false;onSelectEnd()}}
          onMouseLeave={()=>{onCursorMove(-1);if(dragging.current){dragging.current=false;onSelectEnd()}}}
          onTouchMove={e=>{const p=getPct(e);onCursorMove(p);if(dragging.current)onSelectMove(p)}}
          onTouchStart={e=>{const p=getPct(e);dragging.current=true;onSelectStart(p)}}
          onTouchEnd={()=>{dragging.current=false;onSelectEnd()}}
        >
          <defs>
            <linearGradient id={`fg_${track.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={track.color} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={track.color} stopOpacity="0.01"/>
            </linearGradient>
            <clipPath id={`cp_${track.id}`}><rect x="0" y="0" width={W} height={H}/></clipPath>
          </defs>
          {/* Grid */}
          {[0.25,0.5,0.75].map((f,i)=>(
            <line key={i} x1="0" y1={f*H} x2={W} y2={f*H} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
          ))}
          {/* Fill */}
          {!track.zones&&<path d={fillPath} fill={`url(#fg_${track.id})`} clipPath={`url(#cp_${track.id})`}/>}
          {/* Lines */}
          {segments.map((s,i)=>(
            <polyline key={i} points={s.pts} fill="none" stroke={s.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#cp_${track.id})`}/>
          ))}
          {/* Avg line */}
          <line x1="0" y1={avgY} x2={W} y2={avgY} stroke={track.color} strokeWidth="0.8" strokeDasharray="6,5" opacity="0.5"/>
          {/* Selection */}
          {selX1!==null&&selX2!==null&&(
            <rect x={Math.min(selX1,selX2)} y={0} width={Math.abs(selX2-selX1)} height={H} fill="rgba(0,200,224,0.08)" stroke="#00c8e0" strokeWidth="0.8"/>
          )}
          {/* Lap markers */}
          {laps&&laps.length>1&&laps.map((lap,i)=>{
            if(lap.startIdx<=0)return null
            const x=(lap.startIdx/n)*W
            return <line key={i} x1={x} y1={0} x2={x} y2={H} stroke="rgba(0,200,224,0.20)" strokeWidth="1" strokeDasharray="2,4"/>
          })}
          {/* Cursor */}
          {curX!==null&&curX>=0&&(
            <>
              <line x1={curX} y1={0} x2={curX} y2={H} stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"/>
              {curVal&&<circle cx={curX} cy={toY(curVal)} r="3.5" fill={track.color} stroke="var(--bg)" strokeWidth="1.5"/>}
            </>
          )}
        </svg>

        {/* Right: instant value */}
        <div style={{width:90,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 10px',height:track.height}}>
          {curVal?(
            <span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:track.color}}>{track.format(curVal)}<span style={{fontSize:9,fontWeight:400,color:'var(--text-dim)',marginLeft:2}}>{track.unit}</span></span>
          ):(
            <span style={{fontSize:9,color:'var(--text-dim)'}}>—</span>
          )}
        </div>
      </div>
    </div>
  )
}

// Altitude track — gray filled area, taller, visually separated
function AltitudeTrack({data,xData,cursorPct,selection,onCursorMove,onSelectStart,onSelectMove,onSelectEnd,laps}:{
  data:number[];xData:number[];cursorPct:number;selection:ChartSel|null;
  onCursorMove:(p:number)=>void;onSelectStart:(p:number)=>void;onSelectMove:(p:number)=>void;onSelectEnd:()=>void;
  laps?:IntervalBlock[];
}) {
  const svgRef=useRef<SVGSVGElement>(null)
  const dragging=useRef(false)
  const W=1000,H=120
  if(!data.length)return null
  const dMin=minV(data),dMax=maxV(data),span=dMax-dMin||1,pad=span*0.15
  function toY(v:number):number{return H-((v-(dMin-pad))/(span+2*pad))*(H-4)-2}
  const n=data.length
  const pts=data.map((v,i)=>`${((i/(n-1))*W).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const fillPath=pts+` L${W},${H} L0,${H} Z`
  const curX=cursorPct>=0?cursorPct*W:null
  const selX1=selection?selection.startPct*W:null
  const selX2=selection?selection.endPct*W:null
  const curIdx=cursorPct>=0?Math.min(Math.round(cursorPct*(n-1)),n-1):null
  const curElev=curIdx!==null?data[curIdx]:null
  const curSlope=curIdx!==null&&xData.length?calcSlope(data,xData,curIdx):null
  const ALT_COLOR='#94a3b8'

  function getPct(e:React.MouseEvent|React.TouchEvent):number{
    if(!svgRef.current)return 0
    const rect=svgRef.current.getBoundingClientRect()
    const cx='touches' in e?e.touches[0].clientX:(e as React.MouseEvent).clientX
    return Math.max(0,Math.min(1,(cx-rect.left-80)/(rect.width-180)))
  }

  return(
    <div style={{borderBottom:'3px solid rgba(255,255,255,0.04)',background:'rgba(0,0,0,0.15)'}}>
      {/* Row header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px 4px 80px'}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:14,height:2,borderRadius:1,background:ALT_COLOR}}/>
          <span style={{fontSize:9,fontWeight:700,color:ALT_COLOR,textTransform:'uppercase' as const,letterSpacing:'0.09em'}}>Altitude</span>
        </div>
        <div style={{display:'flex',gap:14}}>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>▼ {Math.round(dMin)}m</span>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>▲ {Math.round(dMax)}m</span>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>Δ {Math.round(dMax-dMin)}m</span>
        </div>
      </div>
      <div style={{display:'flex'}}>
        <div style={{width:78,flexShrink:0,height:H,position:'relative'}}>
          {[dMin,(dMin+dMax)/2,dMax].map((v,i)=>(
            <span key={i} style={{position:'absolute',right:6,fontSize:8,fontFamily:'DM Mono,monospace',color:'rgba(148,163,184,0.5)',transform:'translateY(-50%)',top:`${((H-toY(v))/H)*100}%`}}>{Math.round(v)}</span>
          ))}
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          style={{flex:1,height:H,display:'block',cursor:'crosshair',userSelect:'none'}}
          preserveAspectRatio="none"
          onMouseMove={e=>{const p=getPct(e);onCursorMove(p);if(dragging.current)onSelectMove(p)}}
          onMouseDown={e=>{const p=getPct(e);dragging.current=true;onSelectStart(p)}}
          onMouseUp={()=>{dragging.current=false;onSelectEnd()}}
          onMouseLeave={()=>{onCursorMove(-1);if(dragging.current){dragging.current=false;onSelectEnd()}}}
          onTouchMove={e=>{const p=getPct(e);onCursorMove(p);if(dragging.current)onSelectMove(p)}}
          onTouchStart={e=>{const p=getPct(e);dragging.current=true;onSelectStart(p)}}
          onTouchEnd={()=>{dragging.current=false;onSelectEnd()}}
        >
          <defs>
            <linearGradient id="altFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ALT_COLOR} stopOpacity="0.40"/>
              <stop offset="60%" stopColor={ALT_COLOR} stopOpacity="0.12"/>
              <stop offset="100%" stopColor={ALT_COLOR} stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          {/* Subtle horizontal grid */}
          {[0.33,0.66].map((f,i)=>(
            <line key={i} x1="0" y1={f*H} x2={W} y2={f*H} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          ))}
          <path d={fillPath} fill="url(#altFill)"/>
          <polyline points={pts} fill="none" stroke={ALT_COLOR} strokeWidth="2" strokeLinejoin="round" opacity="0.8"/>
          {/* Lap tick marks with numbers */}
          {laps&&laps.length>1&&laps.map((lap,i)=>{
            if(lap.startIdx<=0)return null
            const x=(lap.startIdx/n)*W
            return(
              <g key={i}>
                <line x1={x} y1={0} x2={x} y2={H} stroke="rgba(0,200,224,0.3)" strokeWidth="1" strokeDasharray="3,4"/>
                <rect x={x-8} y={H-16} width={16} height={14} rx="3" fill="rgba(0,200,224,0.15)" stroke="rgba(0,200,224,0.3)" strokeWidth="0.5"/>
                <text x={x} y={H-5} textAnchor="middle" fontSize="7" fill="#00c8e0" fontFamily="DM Mono,monospace" fontWeight="700">{lap.index}</text>
              </g>
            )
          })}
          {selX1!==null&&selX2!==null&&(
            <rect x={Math.min(selX1,selX2)} y={0} width={Math.abs(selX2-selX1)} height={H} fill="rgba(0,200,224,0.10)" stroke="#00c8e0" strokeWidth="1"/>
          )}
          {curX!==null&&curX>=0&&(
            <line x1={curX} y1={0} x2={curX} y2={H} stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"/>
          )}
        </svg>
        <div style={{width:90,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',justifyContent:'center',padding:'0 10px',height:H,gap:3}}>
          {curElev&&(
            <span style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:ALT_COLOR}}>
              {Math.round(curElev)}<span style={{fontSize:9,fontWeight:400,color:'var(--text-dim)',marginLeft:2}}>m</span>
            </span>
          )}
          {curSlope!==null&&(
            <span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:curSlope>3?'#f97316':curSlope<-3?'#3b82f6':'var(--text-dim)',fontWeight:curSlope!==0?600:400}}>
              {curSlope>0?'+':''}{curSlope.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// X-axis — two separate rows: distance + time
function XAxis({xData,sport,totalS}:{xData:number[];sport:SportType;totalS:number}) {
  if(!xData.length)return null
  const isDistX=(xData[xData.length-1]??0)>1000
  const isBike=sport==='bike'||sport==='virtual_bike'
  const distStep=isBike?5000:2000
  const timeStep=isBike?900:300  // 15min bike, 5min run
  const totalDist=xData[xData.length-1]??0

  const distTicks:number[]=[]
  if(isDistX){for(let d=distStep;d<totalDist;d+=distStep)distTicks.push(d)}

  const timeTicks:number[]=[]
  if(totalS){for(let t=timeStep;t<totalS;t+=timeStep)timeTicks.push(t)}

  return(
    <div style={{background:'var(--bg-card)',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
      {/* Distance row */}
      {isDistX&&distTicks.length>0&&(
        <div style={{display:'flex',position:'relative',height:22}}>
          <div style={{width:78,flexShrink:0}}/>
          <div style={{flex:1,position:'relative'}}>
            {distTicks.map((d,i)=>{
              const pct=(d/totalDist)*100
              if(pct>98)return null
              return(
                <div key={i} style={{position:'absolute',left:`${pct}%`,transform:'translateX(-50%)',top:3,display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                  <div style={{width:1,height:4,background:'rgba(255,255,255,0.15)'}}/>
                  <span style={{fontSize:8,fontFamily:'DM Mono,monospace',color:'rgba(255,255,255,0.4)',whiteSpace:'nowrap' as const}}>{(d/1000).toFixed(0)} km</span>
                </div>
              )
            })}
          </div>
          <div style={{width:90,flexShrink:0}}/>
        </div>
      )}
      {/* Time row */}
      {totalS>0&&timeTicks.length>0&&(
        <div style={{display:'flex',position:'relative',height:20,borderTop:'1px solid rgba(255,255,255,0.03)'}}>
          <div style={{width:78,flexShrink:0}}/>
          <div style={{flex:1,position:'relative'}}>
            {timeTicks.map((t,i)=>{
              const xPct=isDistX&&totalS?(t/totalS)*100:(t/(totalS||1))*100
              if(xPct>98)return null
              return(
                <div key={i} style={{position:'absolute',left:`${xPct}%`,transform:'translateX(-50%)',top:3,display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                  <div style={{width:1,height:3,background:'rgba(255,255,255,0.08)'}}/>
                  <span style={{fontSize:7,fontFamily:'DM Mono,monospace',color:'rgba(255,255,255,0.2)',whiteSpace:'nowrap' as const}}>{fmtDur(t)}</span>
                </div>
              )
            })}
          </div>
          <div style={{width:90,flexShrink:0}}/>
        </div>
      )}
    </div>
  )
}

// Cursor tooltip bar
function CursorBar({tracks,cursorPct,xData}:{tracks:TrackDef[];cursorPct:number;xData:number[]}) {
  if(cursorPct<0)return(
    <div style={{padding:'6px 80px',background:'var(--bg)',borderBottom:'1px solid rgba(255,255,255,0.05)',minHeight:32}}>
      <span style={{fontSize:10,color:'rgba(255,255,255,0.15)'}}>Survolez le graphique pour inspecter · Cliquez-glissez pour sélectionner</span>
    </div>
  )
  const idx=Math.min(Math.round(cursorPct*(xData.length-1)),xData.length-1)
  const xVal=xData[idx]??0
  const isDistX=(xData[xData.length-1]??0)>1000
  return(
    <div style={{display:'flex',alignItems:'center',gap:16,padding:'5px 80px',background:'rgba(0,0,0,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)',flexWrap:'wrap' as const,minHeight:32}}>
      <span style={{fontSize:9,fontFamily:'DM Mono,monospace',color:'rgba(255,255,255,0.4)',minWidth:50}}>
        {isDistX?`${(xVal/1000).toFixed(2)}km`:fmtDur(xVal)}
      </span>
      {tracks.map(t=>{
        const tidx=Math.min(Math.round(cursorPct*(t.data.length-1)),t.data.length-1)
        const v=t.data[tidx]
        if(!v||!isFinite(v)||v<=0)return null
        return(
          <span key={t.id} style={{fontSize:10,fontFamily:'DM Mono,monospace',fontWeight:700,color:t.color}}>
            {t.label} {t.format(v)}<span style={{fontSize:8,fontWeight:400,color:'rgba(255,255,255,0.3)',marginLeft:2}}>{t.unit}</span>
          </span>
        )
      })}
    </div>
  )
}

// Selection stats overlay
function SelectionPanel({tracks,xData,selection,sport,zones,totalS,onClose}:{
  tracks:TrackDef[];xData:number[];selection:ChartSel;sport:SportType;zones:TrainingZones;totalS:number;onClose:()=>void;
}) {
  const isBike=sport==='bike'||sport==='virtual_bike'
  const isRun=sport==='run'||sport==='trail_run'
  const n=xData.length
  const i0=Math.round(selection.startPct*(n-1))
  const i1=Math.round(selection.endPct*(n-1))
  if(i1<=i0)return null
  const isDistX=(xData[n-1]??0)>1000
  const startX=xData[i0]??0, endX=xData[i1]??0
  const distOrTime=isDistX?fmtDist(endX-startX):fmtDur(endX-startX)
  const distLabel=isDistX?'Distance':'Durée'
  const durS=isDistX&&totalS?Math.round(((i1-i0)/n)*totalS):(endX-startX)

  function sliceAvg(t:TrackDef):number{return avg(t.data.slice(i0,i1+1))}
  function sliceMax(t:TrackDef):number{return maxV(t.data.slice(i0,i1+1))}

  const hrTrack=tracks.find(t=>t.id==='heartrate')
  const paceTrack=tracks.find(t=>t.id==='pace')
  const powerTrack=tracks.find(t=>t.id==='watts')
  const cadTrack=tracks.find(t=>t.id==='cadence')

  const hrZoneMins=hrTrack?zoneTimes(hrTrack.data.slice(i0,i1+1),zones.hr,durS):[0,0,0,0,0]
  const paceZoneMins=paceTrack?zoneTimes(paceTrack.data.slice(i0,i1+1),zones.pace,durS):[0,0,0,0,0]
  const powerZoneMins=powerTrack?zoneTimes(powerTrack.data.slice(i0,i1+1),zones.power,durS):[0,0,0,0,0]

  // Mini sparkline for selected segment
  const sparkTrack=hrTrack??paceTrack??powerTrack??null
  const sparkData=sparkTrack?sparkTrack.data.slice(i0,i1+1).filter(v=>v>0&&isFinite(v)):[]
  const hasSparkline=sparkData.length>=4
  const SPW=500,SPH=44
  const spMin=hasSparkline?minV(sparkData):0,spMax=hasSparkline?maxV(sparkData):1,spSpan=spMax-spMin||1,spPad=spSpan*0.1
  const toSpY=(v:number)=>sparkTrack?.invert
    ?((v-(spMin-spPad))/(spSpan+2*spPad))*(SPH-2)+1
    :(1-(v-(spMin-spPad))/(spSpan+2*spPad))*(SPH-2)+1
  const spN=sparkData.length
  const spPts=hasSparkline?sparkData.map((v,i)=>`${((i/(spN-1))*SPW).toFixed(1)},${toSpY(v).toFixed(1)}`).join(' '):''
  const spFill=hasSparkline?(spPts+` L${SPW},${SPH} L0,${SPH} Z`):''

  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)',overflowY:'auto',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,paddingTop:48}}>
      <div style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border)',width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,0.5)'}}>
        {/* Header */}
        <div style={{borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--bg-card)',zIndex:1,borderRadius:'18px 18px 0 0',overflow:'hidden'}}>
          {/* Stats row */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'18px 20px 12px'}}>
            <div>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 6px'}}>Portion sélectionnée</p>
              <div style={{display:'flex',alignItems:'baseline',gap:16,flexWrap:'wrap' as const}}>
                <div>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:34,fontWeight:700,color:'var(--text)',margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{distOrTime}</p>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.07em'}}>{distLabel}</p>
                </div>
                {durS>0&&isDistX&&(
                  <>
                    <span style={{color:'var(--text-dim)',fontSize:24,lineHeight:1,alignSelf:'center'}}>·</span>
                    <div>
                      <p style={{fontFamily:'DM Mono,monospace',fontSize:34,fontWeight:700,color:'var(--text)',margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{fmtDur(durS)}</p>
                      <p style={{fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',textTransform:'uppercase' as const,letterSpacing:'0.07em'}}>Durée</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-dim)',fontSize:14,flexShrink:0}}>✕</button>
          </div>
          {/* Sparkline of selected segment */}
          {hasSparkline&&sparkTrack&&(
            <div style={{padding:'0 20px 14px'}}>
              <svg viewBox={`0 0 ${SPW} ${SPH}`} style={{width:'100%',height:44,display:'block'}} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sp_fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkTrack.color} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={sparkTrack.color} stopOpacity="0.02"/>
                  </linearGradient>
                </defs>
                <path d={spFill} fill="url(#sp_fill)"/>
                <polyline points={spPts} fill="none" stroke={sparkTrack.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
              <p style={{fontSize:8,color:'var(--text-dim)',textAlign:'center' as const,margin:'2px 0 0',fontFamily:'DM Mono,monospace',letterSpacing:'0.05em'}}>{sparkTrack.label} — portion sélectionnée</p>
            </div>
          )}
        </div>

        <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:14}}>

          {/* HR */}
          {hrTrack&&(
            <div>
              <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'#ef4444',margin:'0 0 8px'}}>Fréquence cardiaque</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:15,fontWeight:700,color:'#ef4444',margin:0}}>{Math.round(sliceAvg(hrTrack))} <span style={{fontSize:10,fontWeight:400}}>bpm</span></p>
                </div>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Max</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:15,fontWeight:700,color:'#ef4444',margin:0}}>{Math.round(sliceMax(hrTrack))} <span style={{fontSize:10,fontWeight:400}}>bpm</span></p>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {zones.hr.map((z,i)=>{
                  const pct=Math.round((hrZoneMins[i]/(hrZoneMins.reduce((a,b)=>a+b,0)||1))*100)
                  if(pct<1)return null
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,background:ZONE_BG[i],border:`1px solid ${ZONE_COLORS[i]}22`}}>
                      <span style={{fontSize:9,fontWeight:700,color:ZONE_COLORS[i],minWidth:20}}>{z.label}</span>
                      <div style={{flex:1,height:5,background:'rgba(255,255,255,0.05)',borderRadius:3}}>
                        <div style={{width:`${pct}%`,height:'100%',background:ZONE_COLORS[i],borderRadius:3}}/>
                      </div>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--text-mid)',minWidth:40,textAlign:'right' as const}}>{hrZoneMins[i]}min</span>
                      <span style={{fontSize:9,color:'var(--text-dim)',minWidth:30,textAlign:'right' as const}}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Running */}
          {isRun&&paceTrack&&(
            <div>
              <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'#22c55e',margin:'0 0 8px'}}>Allure</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Allure moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:15,fontWeight:700,color:'#22c55e',margin:0}}>{fmtPaceShort(sliceAvg(paceTrack))}</p>
                </div>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Allure max</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:15,fontWeight:700,color:'#22c55e',margin:0}}>{fmtPaceShort(minV(paceTrack.data.slice(i0,i1+1).filter(v=>v>0)))}</p>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {zones.pace.map((z,i)=>{
                  const pct=Math.round((paceZoneMins[i]/(paceZoneMins.reduce((a,b)=>a+b,0)||1))*100)
                  if(pct<1)return null
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,background:ZONE_BG[i],border:`1px solid ${ZONE_COLORS[i]}22`}}>
                      <span style={{fontSize:9,fontWeight:700,color:ZONE_COLORS[i],minWidth:20}}>{z.label}</span>
                      <div style={{flex:1,height:5,background:'rgba(255,255,255,0.05)',borderRadius:3}}>
                        <div style={{width:`${pct}%`,height:'100%',background:ZONE_COLORS[i],borderRadius:3}}/>
                      </div>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--text-mid)',minWidth:40,textAlign:'right' as const}}>{paceZoneMins[i]}min</span>
                      <span style={{fontSize:9,color:'var(--text-dim)',minWidth:30,textAlign:'right' as const}}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bike */}
          {isBike&&powerTrack&&(
            <div>
              <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'#3b82f6',margin:'0 0 8px'}}>Puissance</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:8}}>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:'#3b82f6',margin:0}}>{Math.round(sliceAvg(powerTrack))}W</p>
                </div>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Max</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:'#3b82f6',margin:0}}>{Math.round(sliceMax(powerTrack))}W</p>
                </div>
                <div style={{padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 2px'}}>Cadence</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:'#ec4899',margin:0}}>{cadTrack?Math.round(sliceAvg(cadTrack)):'—'}</p>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {zones.power.map((z,i)=>{
                  const pct=Math.round((powerZoneMins[i]/(powerZoneMins.reduce((a,b)=>a+b,0)||1))*100)
                  if(pct<1)return null
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,background:ZONE_BG[i],border:`1px solid ${ZONE_COLORS[i]}22`}}>
                      <span style={{fontSize:9,fontWeight:700,color:ZONE_COLORS[i],minWidth:20}}>{z.label}</span>
                      <div style={{flex:1,height:5,background:'rgba(255,255,255,0.05)',borderRadius:3}}>
                        <div style={{width:`${pct}%`,height:'100%',background:ZONE_COLORS[i],borderRadius:3}}/>
                      </div>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--text-mid)',minWidth:40,textAlign:'right' as const}}>{powerZoneMins[i]}min</span>
                      <span style={{fontSize:9,color:'var(--text-dim)',minWidth:30,textAlign:'right' as const}}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// Main SyncCharts container
function SyncCharts({activity}:{activity:Activity}) {
  const [cursorPct,setCursorPct]=useState(-1)
  const [selection,setSelection]=useState<ChartSel|null>(null)
  const [dragStart,setDragStart]=useState<number|null>(null)
  const [showSelPanel,setShowSelPanel]=useState(false)
  const zones=defaultZones()
  const streams=activity.streams??{}
  const isBike=activity.sport==='bike'||activity.sport==='virtual_bike'
  const isRun=activity.sport==='run'||activity.sport==='trail_run'

  const xData:number[]=useMemo(()=>{
    if(streams.distance?.length) return streams.distance
    if(streams.time?.length) return streams.time
    const t=activity.moving_time_s??3600
    return Array.from({length:200},(_,i)=>Math.round((i/199)*t))
  },[streams,activity.moving_time_s])

  const smoothedStreams=useMemo(()=>({
    heartrate: streams.heartrate?smooth(streams.heartrate,3):undefined,
    velocity:  streams.velocity?smooth(streams.velocity,3):undefined,
    watts:     streams.watts?smooth(streams.watts,5):undefined,
    altitude:  streams.altitude?smooth(streams.altitude,5):undefined,
    cadence:   streams.cadence?smooth(streams.cadence,3):undefined,
    temp:      streams.temp,
  }),[streams])

  const tracks:TrackDef[]=useMemo(()=>{
    const defs:TrackDef[]=[]
    if(isBike){
      if(smoothedStreams.velocity?.length) defs.push({id:'velocity',label:'Vitesse',unit:'km/h',color:'#38bdf8',data:smoothedStreams.velocity.map(v=>v*3.6),height:72,format:v=>`${v.toFixed(1)}`})
      if(smoothedStreams.watts?.length) defs.push({id:'watts',label:'Puissance',unit:'W',color:'#3b82f6',data:smoothedStreams.watts,height:80,format:v=>`${Math.round(v)}`,zones:zones.power})
      if(smoothedStreams.heartrate?.length) defs.push({id:'heartrate',label:'FC',unit:'bpm',color:'#ef4444',data:smoothedStreams.heartrate,height:72,format:v=>`${Math.round(v)}`,zones:zones.hr})
      if(smoothedStreams.cadence?.length) defs.push({id:'cadence',label:'Cadence',unit:'rpm',color:'#ec4899',data:smoothedStreams.cadence,height:56,format:v=>`${Math.round(v)}`})
    }
    if(isRun){
      if(smoothedStreams.velocity?.length) defs.push({id:'pace',label:'Allure',unit:'/km',color:'#22c55e',data:smoothedStreams.velocity.map(v=>v>0?1000/v:0),height:80,invert:true,format:v=>fmtPaceShort(v),zones:zones.pace})
      if(smoothedStreams.heartrate?.length) defs.push({id:'heartrate',label:'FC',unit:'bpm',color:'#ef4444',data:smoothedStreams.heartrate,height:72,format:v=>`${Math.round(v)}`,zones:zones.hr})
      if(smoothedStreams.cadence?.length) defs.push({id:'cadence',label:'Cadence',unit:'spm',color:'#ec4899',data:smoothedStreams.cadence,height:56,format:v=>`${Math.round(v)}`})
    }
    if(!isBike&&!isRun){
      if(smoothedStreams.heartrate?.length) defs.push({id:'heartrate',label:'FC',unit:'bpm',color:'#ef4444',data:smoothedStreams.heartrate,height:80,format:v=>`${Math.round(v)}`})
    }
    if(smoothedStreams.temp?.length) defs.push({id:'temp',label:'Température',unit:'°C',color:'#fbbf24',data:smoothedStreams.temp,height:48,format:v=>`${Math.round(v)}`})
    return defs
  },[smoothedStreams,isBike,isRun,zones])

  const hasData=tracks.length>0||!!smoothedStreams.altitude?.length
  const laps=useMemo(()=>detectIntervals(activity),[activity])

  function onCursorMove(p:number){
    setCursorPct(p)
    if(dragStart!==null) setSelection({startPct:Math.min(dragStart,p),endPct:Math.max(dragStart,p)})
  }
  function onSelectStart(p:number){setDragStart(p);setSelection(null);setShowSelPanel(false)}
  function onSelectMove(p:number){if(dragStart!==null)setSelection({startPct:Math.min(dragStart,p),endPct:Math.max(dragStart,p)})}
  function onSelectEnd(){
    setDragStart(null)
    if(selection&&(selection.endPct-selection.startPct)>0.02) setShowSelPanel(true)
  }
  const trackProps={xData,cursorPct,selection,onCursorMove,onSelectStart,onSelectMove,onSelectEnd}

  if(!hasData) return(
    <div style={{padding:'32px 20px',textAlign:'center' as const,background:'var(--bg-card)'}}>
      <p style={{fontSize:28,marginBottom:10}}>📊</p>
      <p style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:600,margin:'0 0 6px'}}>Courbes non disponibles</p>
      <p style={{fontSize:12,color:'var(--text-dim)',margin:0,maxWidth:320,marginLeft:'auto',marginRight:'auto'}}>
        Les données de flux (FC, allure, puissance, altitude) ne sont pas encore disponibles pour cette activité. Relancez une synchronisation Strava depuis votre profil.
      </p>
    </div>
  )

  return(
    <div style={{background:'var(--bg)',fontFamily:'DM Sans,sans-serif'}}>
      {/* Header bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 80px 10px',background:'var(--bg-card)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display:'flex',gap:14,alignItems:'center'}}>
          {tracks.map(t=>(
            <span key={t.id} style={{display:'flex',alignItems:'center',gap:5,fontSize:10}}>
              <span style={{width:18,height:2,background:t.color,display:'inline-block',borderRadius:1}}/>
              <span style={{color:'var(--text-dim)'}}>{t.label}</span>
            </span>
          ))}
          {smoothedStreams.altitude?.length&&(
            <span style={{display:'flex',alignItems:'center',gap:5,fontSize:10}}>
              <span style={{width:18,height:2,background:'#8b5cf6',display:'inline-block',borderRadius:1}}/>
              <span style={{color:'var(--text-dim)'}}>Altitude</span>
            </span>
          )}
        </div>
        {selection&&(selection.endPct-selection.startPct)>0.02&&(
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowSelPanel(true)} style={{padding:'4px 11px',borderRadius:7,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.3)',color:'#00c8e0',fontSize:10,fontWeight:600,cursor:'pointer'}}>Analyser la sélection</button>
            <button onClick={()=>{setSelection(null);setShowSelPanel(false)}} style={{padding:'4px 11px',borderRadius:7,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer'}}>Réinitialiser</button>
          </div>
        )}
      </div>

      {/* Cursor bar */}
      <CursorBar tracks={tracks} cursorPct={cursorPct} xData={xData}/>

      {/* Altitude */}
      {smoothedStreams.altitude?.length&&(
        <AltitudeTrack data={smoothedStreams.altitude} xData={xData} cursorPct={cursorPct} selection={selection} onCursorMove={onCursorMove} onSelectStart={onSelectStart} onSelectMove={onSelectMove} onSelectEnd={onSelectEnd} laps={laps.length>1?laps:undefined}/>
      )}

      {/* Metric tracks */}
      <div style={{background:'var(--bg-card)'}}>
        {tracks.map(t=><ChartTrack key={t.id} track={t} {...trackProps} laps={laps.length>1?laps:undefined}/>)}
      </div>

      {/* X-axis */}
      <XAxis xData={xData} sport={activity.sport} totalS={activity.moving_time_s??0}/>

      {/* Selection panel */}
      {showSelPanel&&selection&&(selection.endPct-selection.startPct)>0.02&&(
        <SelectionPanel tracks={tracks} xData={xData} selection={selection} sport={activity.sport} zones={zones} totalS={activity.moving_time_s??0} onClose={()=>setShowSelPanel(false)}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HR ZONE BARS — premium linear rows
// ══════════════════════════════════════════════════════════
function HrZoneBars({hrStream,zones,totalS}:{hrStream:number[];zones:Zone[];totalS:number}) {
  const times=zoneTimes(hrStream,zones,totalS)
  const total=times.reduce((a,b)=>a+b,0)||1
  return(
    <div style={{borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
      {zones.map((z,i)=>{
        const pct=Math.round((times[i]/total)*100)
        return(
          <div key={i} style={{
            display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
            background:i%2===0?'rgba(255,255,255,0.015)':'transparent',
            borderBottom:i<zones.length-1?'1px solid rgba(255,255,255,0.04)':'none',
            position:'relative' as const,
          }}>
            {/* Background fill indicator */}
            <div style={{position:'absolute' as const,inset:0,width:`${pct}%`,background:`${ZONE_COLORS[i]}09`,transition:'width 0.8s ease',pointerEvents:'none'}}/>
            {/* Dot */}
            <div style={{width:10,height:10,borderRadius:3,background:ZONE_COLORS[i],flexShrink:0,boxShadow:`0 0 8px ${ZONE_COLORS[i]}55`}}/>
            {/* Labels */}
            <div style={{minWidth:110,flexShrink:0}}>
              <div style={{display:'flex',alignItems:'baseline',gap:5}}>
                <span style={{fontSize:12,fontWeight:700,color:ZONE_COLORS[i]}}>{z.label}</span>
                <span style={{fontSize:10,color:'var(--text-mid)',fontWeight:500}}>{ZONE_LABELS[i].split(' ').slice(1).join(' ')}</span>
              </div>
              <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>{z.min}–{z.max<999?z.max:'∞'} bpm</span>
            </div>
            {/* Bar */}
            <div style={{flex:1,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
              <div style={{width:`${pct}%`,height:'100%',background:ZONE_COLORS[i],borderRadius:2,transition:'width 0.8s ease'}}/>
            </div>
            {/* Stats */}
            <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:'var(--text)',minWidth:32,textAlign:'right' as const}}>
                {times[i]}<span style={{fontSize:9,fontWeight:400,color:'var(--text-dim)',marginLeft:2}}>m</span>
              </span>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:11,color:'var(--text-dim)',minWidth:30,textAlign:'right' as const}}>{pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// POWER CURVE — Mean Maximal Power (MMP)
// ══════════════════════════════════════════════════════════
function PowerCurve({watts,totalS}:{watts:number[];totalS:number}) {
  const DURATIONS=[5,10,20,30,60,120,300,600,1200,1800,2700,3600]
  const points=useMemo(()=>{
    const w=watts.filter(v=>v>0&&isFinite(v))
    if(w.length<10)return[]
    // Build prefix sums for O(n) per window
    const prefix=[0]
    for(const v of w)prefix.push(prefix[prefix.length-1]+v)
    return DURATIONS.filter(d=>d<=w.length).map(d=>{
      let best=0
      for(let i=d;i<prefix.length;i++){
        const a=(prefix[i]-prefix[i-d])/d
        if(a>best)best=a
      }
      return best>5?{d,w:Math.round(best)}:null
    }).filter((p):p is{d:number;w:number}=>!!p)
  },[watts])

  if(!points.length)return null
  const W=800,H=120,COLOR='#3b82f6'
  const maxW=maxV(points.map(p=>p.w))
  const minW=Math.max(0,minV(points.map(p=>p.w))-20)
  const logMin=Math.log(points[0].d),logMax=Math.log(points[points.length-1].d)
  const toX=(d:number)=>((Math.log(d)-logMin)/(logMax-logMin))*W
  const toY=(w:number)=>H-((w-minW)/(maxW-minW||1))*(H-8)-4
  const pts=points.map(p=>`${toX(p.d).toFixed(1)},${toY(p.w).toFixed(1)}`).join(' ')
  const fill=pts+` L${W},${H} L0,${H} Z`

  const fmtDur2=(d:number)=>d<60?`${d}s`:d<3600?`${d/60}m`:`${(d/3600).toFixed(1)}h`

  return(
    <div style={{padding:'16px 20px',background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)'}}>
      <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px'}}>
        Courbe de puissance — Mean Maximal Power
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block'}}>
        <defs>
          <linearGradient id="mmpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.30"/>
            <stop offset="100%" stopColor={COLOR} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map((f,i)=>(
          <line key={i} x1="0" y1={f*H} x2={W} y2={f*H} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
        ))}
        <path d={fill} fill="url(#mmpFill)"/>
        <polyline points={pts} fill="none" stroke={COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map(p=>(
          <circle key={p.d} cx={toX(p.d)} cy={toY(p.w)} r="3.5" fill={COLOR} stroke="var(--bg-card)" strokeWidth="1.5"/>
        ))}
      </svg>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${points.length},1fr)`,gap:0,marginTop:8,borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:8}}>
        {points.map(p=>(
          <div key={p.d} style={{textAlign:'center' as const}}>
            <p style={{fontSize:8,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',margin:'0 0 2px'}}>{fmtDur2(p.d)}</p>
            <p style={{fontSize:10,fontFamily:'DM Mono,monospace',fontWeight:700,color:COLOR,margin:0}}>{p.w}W</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PACE CURVE — Best average pace per distance
// ══════════════════════════════════════════════════════════
function PaceCurve({velocity,distance}:{velocity:number[];distance:number[]}) {
  const DISTANCES=[100,200,400,800,1000,1500,2000,3000,5000,10000,21097,42195]
  const points=useMemo(()=>{
    if(!velocity.length||!distance.length)return[]
    const totalDist=distance[distance.length-1]??0
    return DISTANCES.filter(m=>totalDist>=m*0.95).map(m=>{
      let bestSpeed=0,i=0
      for(let j=0;j<distance.length;j++){
        while(i<j&&(distance[j]-distance[i])>m)i++
        if((distance[j]-distance[i])>=m*0.95){
          const wv=velocity.slice(i,j+1).filter(v=>v>0)
          const a=wv.length?wv.reduce((a,b)=>a+b,0)/wv.length:0
          if(a>bestSpeed)bestSpeed=a
        }
      }
      return bestSpeed>0.5?{m,pace:Math.round(1000/bestSpeed)}:null
    }).filter((p):p is{m:number;pace:number}=>!!p)
  },[velocity,distance])

  if(!points.length)return null
  const W=800,H=100,COLOR='#22c55e'
  const maxPace=maxV(points.map(p=>p.pace))
  const minPace=minV(points.map(p=>p.pace))
  const span=maxPace-minPace||1
  const toX=(i:number)=>(i/(points.length-1||1))*W
  const toY=(pace:number)=>((pace-minPace)/span)*(H-8)+4  // inverted: slower = higher
  const pts=points.map((p,i)=>`${toX(i).toFixed(1)},${toY(p.pace).toFixed(1)}`).join(' ')
  const fill=pts+` L${W},${H} L0,${H} Z`

  const fmtDist2=(m:number)=>m>=1000?`${m>=21097?m>=42195?'Marathon':'Semi':''}${m>=1000?(m/1000).toFixed(m%1000===0?0:1)+'km':m+'m'}`:m+'m'

  return(
    <div style={{padding:'16px 20px',background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)'}}>
      <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px'}}>
        Courbe d'allure — Meilleurs efforts par distance
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block'}}>
        <defs>
          <linearGradient id="paceCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.04"/>
            <stop offset="100%" stopColor={COLOR} stopOpacity="0.28"/>
          </linearGradient>
        </defs>
        {[0.33,0.66].map((f,i)=>(
          <line key={i} x1="0" y1={f*H} x2={W} y2={f*H} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
        ))}
        <path d={fill} fill="url(#paceCurveFill)"/>
        <polyline points={pts} fill="none" stroke={COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p,i)=>(
          <circle key={p.m} cx={toX(i)} cy={toY(p.pace)} r="3.5" fill={COLOR} stroke="var(--bg-card)" strokeWidth="1.5"/>
        ))}
      </svg>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${points.length},1fr)`,gap:0,marginTop:8,borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:8}}>
        {points.map(p=>(
          <div key={p.m} style={{textAlign:'center' as const}}>
            <p style={{fontSize:8,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',margin:'0 0 2px'}}>{fmtDist2(p.m)}</p>
            <p style={{fontSize:10,fontFamily:'DM Mono,monospace',fontWeight:700,color:COLOR,margin:0}}>{fmtPaceShort(p.pace)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GENERIC ZONE BARS (HR / Power / Pace)
// ══════════════════════════════════════════════════════════
function ZoneBars({stream,zones,totalS,formatRange}:{stream:number[];zones:Zone[];totalS:number;formatRange:(min:number,max:number)=>string}) {
  const times=zoneTimes(stream,zones,totalS)
  const total=times.reduce((a,b)=>a+b,0)||1
  return(
    <div style={{borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
      {zones.map((z,i)=>{
        const pct=Math.round((times[i]/total)*100)
        return(
          <div key={i} style={{
            display:'flex',alignItems:'center',gap:12,padding:'10px 14px',
            background:i%2===0?'rgba(255,255,255,0.015)':'transparent',
            borderBottom:i<zones.length-1?'1px solid rgba(255,255,255,0.04)':'none',
            position:'relative' as const,
          }}>
            <div style={{position:'absolute' as const,inset:0,width:`${pct}%`,background:`${ZONE_COLORS[i]}09`,pointerEvents:'none'}}/>
            <div style={{width:10,height:10,borderRadius:3,background:ZONE_COLORS[i],flexShrink:0,boxShadow:`0 0 7px ${ZONE_COLORS[i]}55`}}/>
            <div style={{minWidth:100,flexShrink:0}}>
              <div style={{display:'flex',alignItems:'baseline',gap:5}}>
                <span style={{fontSize:12,fontWeight:700,color:ZONE_COLORS[i]}}>{z.label}</span>
                <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>{formatRange(z.min,z.max)}</span>
              </div>
            </div>
            <div style={{flex:1,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
              <div style={{width:`${pct}%`,height:'100%',background:ZONE_COLORS[i],borderRadius:2}}/>
            </div>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:'var(--text)',minWidth:32,textAlign:'right' as const}}>{times[i]}<span style={{fontSize:9,fontWeight:400,color:'var(--text-dim)',marginLeft:2}}>m</span></span>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:10,color:'var(--text-dim)',minWidth:30,textAlign:'right' as const}}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GYM ENRICHMENT
// ══════════════════════════════════════════════════════════
function GymEnrichment({exercises,onChange}:{exercises:GymExercise[];onChange:(e:GymExercise[])=>void}) {
  const [section,setSection]=useState<'upper'|'lower'|'cardio'|'other'>('upper')
  const sections=[{id:'upper' as const,label:'Haut',list:GYM_UPPER},{id:'lower' as const,label:'Bas',list:GYM_LOWER},{id:'cardio' as const,label:'Cardio',list:GYM_CARDIO},{id:'other' as const,label:'Autre',list:GYM_OTHER}]
  const cur=sections.find(s=>s.id===section)!
  const filtered=exercises.filter(e=>e.category===section)
  function add(name:string){onChange([...exercises,{id:uid(),name,category:section,sets:[{reps:0,weight:0}]}])}
  function addSet(id:string){onChange(exercises.map(e=>e.id===id?{...e,sets:[...e.sets,{reps:0,weight:0}]}:e))}
  function dupSet(id:string,si:number){onChange(exercises.map(e=>e.id===id?{...e,sets:[...e.sets.slice(0,si+1),{...e.sets[si]},...e.sets.slice(si+1)]}:e))}
  function updSet(id:string,si:number,field:'reps'|'weight',val:number){onChange(exercises.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,[field]:val}:s)}:e))}
  function delSet(id:string,si:number){onChange(exercises.map(e=>e.id===id?{...e,sets:e.sets.filter((_,i)=>i!==si)}:e))}
  function del(id:string){onChange(exercises.filter(e=>e.id!==id))}
  const inp={padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none',width:'100%'}
  return(
    <div>
      <div style={{display:'flex',gap:5,marginBottom:12}}>
        {sections.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{padding:'5px 12px',borderRadius:9,border:'1px solid',cursor:'pointer',fontSize:11,borderColor:section===s.id?'#ffb340':'var(--border)',background:section===s.id?'rgba(255,179,64,0.10)':'var(--bg-card2)',color:section===s.id?'#ffb340':'var(--text-mid)',fontWeight:section===s.id?600:400}}>
            {s.label} {exercises.filter(e=>e.category===s.id).length>0&&<span style={{fontSize:9,background:'#ffb340',color:'#000',borderRadius:999,padding:'0 4px',marginLeft:3}}>{exercises.filter(e=>e.category===s.id).length}</span>}
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:12}}>
        {cur.list.map(name=><button key={name} onClick={()=>add(name)} style={{padding:'4px 10px',borderRadius:8,border:'1px dashed var(--border)',background:'transparent',color:'var(--text-dim)',fontSize:11,cursor:'pointer'}}>+ {name}</button>)}
      </div>
      {filtered.length===0&&<p style={{fontSize:12,color:'var(--text-dim)',textAlign:'center' as const,padding:'10px 0'}}>Aucun exercice dans cette section.</p>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(ex=>(
          <div key={ex.id} style={{padding:'12px 14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0}}>{ex.name}</p>
              <button onClick={()=>del(ex.id)} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:15}}>✕</button>
            </div>
            {section==='cardio'?(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Durée</p><input type="text" value={ex.cardioTime??''} onChange={e=>onChange(exercises.map(x=>x.id===ex.id?{...x,cardioTime:e.target.value}:x))} placeholder="10:00" style={inp}/></div>
                {['Rameur','SkiErg'].includes(ex.name)&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Distance (m)</p><input type="number" value={ex.cardioDist??''} onChange={e=>onChange(exercises.map(x=>x.id===ex.id?{...x,cardioDist:parseInt(e.target.value)||0}:x))} placeholder="2000" style={inp}/></div>}
                {ex.name==='Vélo'&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Watts</p><input type="number" value={ex.cardioWatts??''} onChange={e=>onChange(exercises.map(x=>x.id===ex.id?{...x,cardioWatts:parseInt(e.target.value)||0}:x))} placeholder="200" style={inp}/></div>}
              </div>
            ):(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'32px 1fr 1fr auto auto',gap:5,marginBottom:5}}>
                  <span style={{fontSize:9,color:'var(--text-dim)',textAlign:'center' as const}}>#</span>
                  <span style={{fontSize:9,color:'var(--text-dim)'}}>Reps</span>
                  <span style={{fontSize:9,color:'var(--text-dim)'}}>Charge (kg)</span>
                  <span/><span/>
                </div>
                {ex.sets.map((s,si)=>(
                  <div key={si} style={{display:'grid',gridTemplateColumns:'32px 1fr 1fr auto auto',gap:5,marginBottom:5}}>
                    <span style={{fontSize:11,color:'var(--text-dim)',textAlign:'center' as const,margin:'auto 0',fontFamily:'DM Mono,monospace'}}>{si+1}</span>
                    <input type="number" value={s.reps||''} onChange={e=>updSet(ex.id,si,'reps',parseInt(e.target.value)||0)} placeholder="10" style={inp}/>
                    <input type="number" value={s.weight||''} onChange={e=>updSet(ex.id,si,'weight',parseFloat(e.target.value)||0)} placeholder="60" style={inp}/>
                    <button onClick={()=>dupSet(ex.id,si)} style={{padding:'5px 8px',borderRadius:7,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer'}}>⎘</button>
                    <button onClick={()=>delSet(ex.id,si)} style={{padding:'5px 8px',borderRadius:7,background:'rgba(255,95,95,0.08)',border:'1px solid rgba(255,95,95,0.2)',color:'#ff5f5f',fontSize:10,cursor:'pointer'}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>addSet(ex.id)} style={{marginTop:4,padding:'5px 12px',borderRadius:8,background:'rgba(0,200,224,0.07)',border:'1px dashed rgba(0,200,224,0.3)',color:'#00c8e0',fontSize:10,cursor:'pointer',width:'100%'}}>+ Série</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HYROX ENRICHMENT
// ══════════════════════════════════════════════════════════
function calcPaceStr(timeStr:string,distM:number):string {
  if(!timeStr||!distM)return '—'
  const p=timeStr.split(':').map(Number)
  const s=p.length===2?p[0]*60+p[1]:p[0]*3600+p[1]*60+(p[2]||0)
  if(!s)return '—'
  const sk=s/(distM/1000)
  return `${Math.floor(sk/60)}:${String(Math.round(sk%60)).padStart(2,'0')}/km`
}

function HyroxEnrichment({stations,runs,onChange}:{stations:HyroxStation[];runs:string[];onChange:(s:HyroxStation[],r:string[])=>void}) {
  const [sd,setSd]=useState<HyroxStation[]>(HYROX_STATIONS.map(n=>stations.find(s=>s.name===n)??{name:n}))
  const [rd,setRd]=useState<string[]>(runs.length===8?runs:Array(8).fill(''))
  function upd(i:number,patch:Partial<HyroxStation>){const u=sd.map((s,idx)=>idx===i?{...s,...patch}:s);setSd(u);onChange(u,rd)}
  function updRun(i:number,val:string){const u=[...rd];u[i]=val;setRd(u);onChange(sd,u)}
  const inp={width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none'}
  return(
    <div>
      <p style={{fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 10px'}}>Stations</p>
      <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:18}}>
        {sd.map((s,i)=>(
          <div key={s.name} style={{padding:'10px 13px',borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:22,height:22,borderRadius:6,background:'rgba(239,68,68,0.10)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#ef4444',flexShrink:0}}>{i+1}</div>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:700,margin:0}}>{s.name}</p>
              {(s.time||s.reps||s.distance)&&<span style={{marginLeft:'auto',fontSize:8,padding:'1px 5px',borderRadius:20,background:'rgba(34,197,94,0.10)',color:'#22c55e',fontWeight:700}}>✓</span>}
            </div>
            {['SkiErg','Rowing'].includes(s.name)&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}><div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Temps</p><input value={s.time??''} onChange={e=>upd(i,{time:e.target.value})} placeholder="7:30" style={inp}/></div><div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Distance (m)</p><input type="number" value={s.distance??''} onChange={e=>upd(i,{distance:parseInt(e.target.value)||0})} placeholder="1000" style={inp}/></div><div style={{padding:'6px 8px',borderRadius:7,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.2)'}}><p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 2px'}}>Allure</p><p style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:'#00c8e0',margin:0}}>{s.time&&s.distance?calcPaceStr(s.time,s.distance):'—'}</p></div></div>)}
            {['Sled Push','Sled Pull','Farmer Carry','Sandbag Lunges'].includes(s.name)&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}><div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Distance (m)</p><input type="number" value={s.distance??''} onChange={e=>upd(i,{distance:parseInt(e.target.value)||0})} placeholder="25" style={inp}/></div><div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Charge (kg)</p><input type="number" value={s.weight??''} onChange={e=>upd(i,{weight:parseInt(e.target.value)||0})} placeholder="40" style={inp}/></div></div>)}
            {s.name==='Wall Balls'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}><div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Reps</p><input type="number" value={s.reps??''} onChange={e=>upd(i,{reps:parseInt(e.target.value)||0})} placeholder="100" style={inp}/></div><div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Charge (kg)</p><input type="number" value={s.weight??''} onChange={e=>upd(i,{weight:parseInt(e.target.value)||0})} placeholder="6" style={inp}/></div></div>)}
            {s.name==='Burpee Broad Jump'&&(<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Reps</p><input type="number" value={s.reps??''} onChange={e=>upd(i,{reps:parseInt(e.target.value)||0})} placeholder="80" style={inp}/></div>)}
          </div>
        ))}
      </div>
      <p style={{fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 10px'}}>Runs compromised (8 × 1km)</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
        {rd.map((r,i)=><div key={i}><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Run {i+1}</p><input value={r} onChange={e=>updRun(i,e.target.value)} placeholder="4:30" style={inp}/></div>)}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ACTIVITY DETAIL
// ══════════════════════════════════════════════════════════
function ActivityDetail({activity:initial,onClose,onUpdate}:{activity:Activity;onClose:()=>void;onUpdate:(a:Activity)=>void}) {
  const [tab,setTab]=useState<DetailTab>('overview')
  const [feeling,setFeeling]=useState(initial.feeling??0)
  const [notes,setNotes]=useState(initial.userNotes??'')
  const [gymExs,setGymExs]=useState<GymExercise[]>(initial.gymExercises??[])
  const [hyroxS,setHyroxS]=useState<HyroxStation[]>(initial.hyroxStations??[])
  const [hyroxR,setHyroxR]=useState<string[]>(initial.hyroxRuns??[])
  const [saving,setSaving]=useState(false)
  const [activity,setActivity]=useState(initial)
  const [streamsLoading,setStreamsLoading]=useState(false)
  const [sleepQ,setSleepQ]=useState(0)
  const [fatigueQ,setFatigueQ]=useState(0)
  const [hasPain,setHasPain]=useState(false)
  const [painZone,setPainZone]=useState('')
  const [whatWentWell,setWhatWentWell]=useState('')
  const [toImprove,setToImprove]=useState('')
  const [nextGoal,setNextGoal]=useState('')
  const zones=defaultZones()
  const intervals=useMemo(()=>detectIntervals(activity),[activity])
  const analysis=useMemo(()=>generateAnalysis(activity),[activity])

  // Lazy-load Strava streams when opening Charts tab
  useEffect(()=>{
    if(tab!=='charts') return
    if(activity.streams&&Object.keys(activity.streams).length>0) return
    if(activity.provider!=='strava') return
    setStreamsLoading(true)
    fetch(`/api/strava/streams?activity_id=${activity.id}`)
      .then(r=>r.json())
      .then(data=>{if(data.streams) setActivity(prev=>({...prev,streams:data.streams}))})
      .finally(()=>setStreamsLoading(false))
  },[tab,activity.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const sport=activity.sport
  const isBike=sport==='bike'||sport==='virtual_bike'
  const isRun=sport==='run'||sport==='trail_run'
  const isSwim=sport==='swim'
  const isGym=sport==='gym'
  const isHyrox=sport==='hyrox'
  const statusCfg=STATUS_CFG[activity.status]
  const date=new Date(activity.started_at)
  const streams=activity.streams??{}

  // VAP — prioritise Strava grade_adjusted_distance if present, else estimate
  const vapStrava=activity.raw_data?.grade_adjusted_distance&&activity.moving_time_s
    ?(activity.moving_time_s/(activity.raw_data.grade_adjusted_distance/1000)):null
  const vap=vapStrava??(
    activity.avg_pace_s_km&&activity.elevation_gain_m&&activity.distance_m
    ?activity.avg_pace_s_km*(1-(activity.elevation_gain_m/activity.distance_m)*0.035):null)
  const vapLabel=vapStrava?'VAP Strava':'VAP estimée'

  // Zone times
  const hrZoneTimes=useMemo(()=>
    streams.heartrate?.length?zoneTimes(streams.heartrate,zones.hr,activity.moving_time_s??3600):[0,0,0,0,0]
  ,[streams.heartrate,activity.moving_time_s])

  // TSS color
  const tssColor=!activity.tss?'#9ca3af':activity.tss>150?'#ef4444':activity.tss>80?'#f97316':'#3b82f6'

  // RPE label & color
  const rpeLabel=feeling>0?(RPE_LABELS[Math.round(feeling)]??'—'):'Non renseigné'
  const rpeColor=feeling===0?'var(--text-dim)':feeling<=2?'#22c55e':feeling<=4?'#86efac':feeling<=6?'#ffb340':feeling<=8?'#f97316':'#ef4444'

  // ── Advanced metrics ─────────────────────────────────────
  const vi=isBike&&activity.normalized_watts&&activity.avg_watts&&activity.avg_watts>0
    ?activity.normalized_watts/activity.avg_watts:null
  const ifVal=activity.tss&&activity.moving_time_s&&activity.moving_time_s>0&&isBike
    ?Math.sqrt((activity.tss*3600)/(activity.moving_time_s*100)):null
  const efVal=isBike&&activity.avg_watts&&activity.avg_hr&&activity.avg_hr>0
    ?Math.round((activity.avg_watts/activity.avg_hr)*100)/100
    :isRun&&activity.avg_speed_ms&&activity.avg_hr&&activity.avg_hr>0
    ?Math.round((activity.avg_speed_ms*60/activity.avg_hr)*100)/100:null
  const efLabel=isBike?'EF W/bpm':isRun?'EF m·min/bpm':null
  const driftPct=streams.heartrate&&streams.heartrate.length>20
    ?(()=>{
      const hr=streams.heartrate!
      const mid=Math.floor(hr.length/2)
      const h1=avg(hr.slice(0,mid)),h2=avg(hr.slice(mid))
      return h1>0?Math.round(((h2-h1)/h1)*1000)/10:null
    })():null

  // TRIMP (Banister) — estimated with default hrRest=50
  const hrRest=50
  const hrMax=activity.max_hr??200
  const trimp=useMemo(()=>{
    if(!activity.avg_hr||!activity.moving_time_s||activity.moving_time_s<=0)return null
    const dMin=activity.moving_time_s/60
    const hrRatio=(activity.avg_hr-hrRest)/(hrMax-hrRest)
    if(hrRatio<=0||hrRatio>=1.2)return null
    const clampedRatio=Math.min(hrRatio,1)
    return Math.round(dMin*clampedRatio*0.64*Math.exp(1.92*clampedRatio))
  },[activity.avg_hr,activity.moving_time_s,hrMax])

  // Aerobic decoupling (Pa:HR) — first half vs second half avg power/pace vs HR
  const decoupling=useMemo(()=>{
    if(!streams.heartrate||streams.heartrate.length<40)return null
    const hr=streams.heartrate
    const mid=Math.floor(hr.length/2)
    const h1=avg(hr.slice(0,mid)),h2=avg(hr.slice(mid))
    if(!h1||!h2)return null
    const ref=isBike?streams.watts:streams.velocity
    if(!ref||ref.length<40)return null
    const r1=avg(ref.slice(0,mid)),r2=avg(ref.slice(mid))
    if(!r1||!r2)return null
    const ef1=r1/h1,ef2=r2/h2
    return ef1>0?Math.round(((ef2-ef1)/ef1)*1000)/10:null
  },[streams,isBike])

  async function save(){
    setSaving(true)
    const upd:Activity={
      ...activity,userNotes:notes,feeling,rpe:feeling,gymExercises:gymExs,
      hyroxStations:hyroxS,hyroxRuns:hyroxR,
      status:(gymExs.length>0||hyroxS.some(s=>s.time||s.reps)||notes)?'completed':activity.status,
      raw_data:{...activity.raw_data,gymExercises:gymExs,hyroxStations:hyroxS,hyroxRuns:hyroxR,sleepQuality:sleepQ,fatigueLevel:fatigueQ,hasPain,painZone,whatWentWell,toImprove,nextGoal},
    }
    onUpdate(upd); setActivity(upd); setSaving(false); setTab('overview')
  }

  function addTag(tag:string){setNotes(prev=>prev?(prev+' · '+tag):tag)}

  const TABS:[DetailTab,string][]=[
    ['overview','Vue d\'ensemble'],
    ...(!isGym&&!isSwim?[['charts','Courbes']] as [DetailTab,string][]:[] as [DetailTab,string][]),
    ...((isBike||isRun)&&(streams.watts?.length||streams.velocity?.length||activity.tss)?[['pro','Analyse Pro']] as [DetailTab,string][]:[] as [DetailTab,string][]),
    ...(intervals.length>0?[['intervals','Laps']] as [DetailTab,string][]:[] as [DetailTab,string][]),
    ['enrich',isGym?'Séance':isHyrox?'Hyrox':'Enrichir'],
  ]

  return(
    <div style={{position:'fixed',inset:0,zIndex:300,background:'var(--bg)',overflowY:'auto'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',position:'sticky',top:0,zIndex:10}}>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'var(--text-dim)',flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap' as const}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:800,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,letterSpacing:'-0.02em'}}>{activity.title}</p>
              {activity.is_race&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:20,background:'rgba(239,68,68,0.10)',color:'#ef4444',fontWeight:700,border:'1px solid rgba(239,68,68,0.25)',flexShrink:0}}>COMPÉTITION</span>}
            </div>
            <p style={{fontSize:11,color:'var(--text-dim)',margin:'1px 0 0'}}>
              {date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
              <span style={{margin:'0 5px',color:'var(--border)'}}>·</span>{PROVIDER_LABEL[activity.provider]??activity.provider}
              <span style={{marginLeft:7,padding:'1px 5px',borderRadius:20,background:statusCfg.bg,border:`1px solid ${statusCfg.color}33`,color:statusCfg.color,fontSize:8,fontWeight:700}}>{statusCfg.label}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-card)'}}>
          {TABS.map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:'10px 18px',border:'none',cursor:'pointer',fontSize:12,fontWeight:tab===id?700:400,background:'transparent',color:tab===id?SPORT_COLOR[sport]:'var(--text-dim)',borderBottom:tab===id?`2px solid ${SPORT_COLOR[sport]}`:'2px solid transparent',transition:'all 0.15s',whiteSpace:'nowrap' as const}}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab==='overview'&&(
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:12}}>

            {/* HERO SECTION */}
            <div style={{
              padding:'22px 20px',borderRadius:16,
              background:`linear-gradient(135deg,${SPORT_COLOR[sport]}14 0%,${SPORT_COLOR[sport]}06 60%,transparent 100%)`,
              border:`1px solid ${SPORT_COLOR[sport]}28`,
              position:'relative' as const,overflow:'hidden',
            }}>
              {/* Background accent circle */}
              <div style={{position:'absolute' as const,top:-30,right:-30,width:160,height:160,borderRadius:'50%',background:`${SPORT_COLOR[sport]}07`,pointerEvents:'none'}}/>
              {/* Sport label + TSS */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${SPORT_COLOR[sport]}18`,border:`1px solid ${SPORT_COLOR[sport]}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                    {SPORT_EMOJI[sport]}
                  </div>
                  <div>
                    <p style={{fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:800,textTransform:'uppercase' as const,letterSpacing:'0.09em',color:SPORT_COLOR[sport],margin:0}}>{SPORT_LABEL[sport]}</p>
                    {activity.is_race&&<span style={{fontSize:8,padding:'1px 7px',borderRadius:20,background:'rgba(239,68,68,0.12)',color:'#ef4444',fontWeight:700,border:'1px solid rgba(239,68,68,0.25)'}}>COMPÉTITION</span>}
                  </div>
                </div>
                {activity.tss&&activity.tss>0&&(
                  <div style={{textAlign:'right' as const}}>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 2px'}}>TSS</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:tssColor,margin:0,letterSpacing:'-0.02em',lineHeight:1}}>{Math.round(activity.tss)}</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'2px 0 0'}}>{activity.tss>150?'Élevé':activity.tss>80?'Modéré':'Léger'}</p>
                  </div>
                )}
              </div>
              {/* Primary stats grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
                {activity.moving_time_s&&activity.moving_time_s>0&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>Durée</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:32,fontWeight:700,color:'var(--text)',margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{fmtDur(activity.moving_time_s)}</p>
                  </div>
                )}
                {activity.distance_m&&activity.distance_m>0&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>Distance</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:32,fontWeight:700,color:SPORT_COLOR[sport],margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{fmtDist(activity.distance_m)}</p>
                  </div>
                )}
                {(activity.elevation_gain_m??0)>0&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>Dénivelé +</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:32,fontWeight:700,color:'#8b5cf6',margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{Math.round(activity.elevation_gain_m!)}m</p>
                  </div>
                )}
                {isRun&&activity.avg_pace_s_km&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>Allure moy.</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:32,fontWeight:700,color:'#22c55e',margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{fmtPace(activity.avg_pace_s_km)}</p>
                  </div>
                )}
                {isBike&&activity.avg_speed_ms&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>Vitesse moy.</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:32,fontWeight:700,color:'#3b82f6',margin:0,letterSpacing:'-0.03em',lineHeight:1}}>{fmtSpeed(activity.avg_speed_ms)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* METRIC CARDS — grouped */}
            {(()=>{
              const MetCard=({label,value,sub,color,unit,wide}:{label:string;value:string;sub?:string;color:string;unit?:string;wide?:boolean})=>(
                <div style={{padding:'12px 14px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',borderTop:`2px solid ${color}`,gridColumn:wide?'1/-1':undefined}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 5px'}}>{label}</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color,margin:0,lineHeight:1}}>
                    {value}{unit&&<span style={{fontSize:11,fontWeight:400,color:'var(--text-dim)',marginLeft:3}}>{unit}</span>}
                  </p>
                  {sub&&<p style={{fontSize:9,color:'var(--text-dim)',margin:'4px 0 0',lineHeight:1.4}}>{sub}</p>}
                </div>
              )
              const Divider=({label}:{label:string})=>(
                <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                  <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.09em',color:'var(--text-dim)',whiteSpace:'nowrap' as const}}>{label}</span>
                  <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
                </div>
              )
              const hasPerf=(isRun&&(vap||activity.avg_cadence))||(isBike&&(activity.avg_watts||activity.avg_cadence||activity.max_speed_ms))
              const hasCardio=activity.avg_hr&&activity.avg_hr>0
              const hasGeneral=activity.calories||activity.elapsed_time_s
              return(
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {/* Performance */}
                  {hasPerf&&<Divider label="Performance"/>}
                  {isRun&&vap&&<MetCard label={vapLabel} value={fmtPace(vap)} color='#22c55e' sub="allure ajustée dénivelé"/>}
                  {isRun&&activity.avg_cadence&&activity.avg_cadence>0&&<MetCard label="Cadence" value={String(Math.round(activity.avg_cadence))} unit="spm" color='#9ca3af'/>}
                  {isBike&&activity.avg_watts&&activity.avg_watts>0&&<MetCard label="Puissance moy." value={String(Math.round(activity.avg_watts))} unit="W" color='#3b82f6' sub={activity.normalized_watts?`NP ${Math.round(activity.normalized_watts)} W`:undefined}/>}
                  {isBike&&activity.avg_cadence&&activity.avg_cadence>0&&<MetCard label="Cadence" value={String(Math.round(activity.avg_cadence))} unit="rpm" color='#9ca3af'/>}
                  {isBike&&activity.max_speed_ms&&activity.max_speed_ms>0&&<MetCard label="Vitesse max" value={fmtSpeed(activity.max_speed_ms)} color='#38bdf8'/>}
                  {/* Cardio */}
                  {hasCardio&&<Divider label="Cardio"/>}
                  {activity.avg_hr&&activity.avg_hr>0&&<MetCard label="FC moyenne" value={String(Math.round(activity.avg_hr))} unit="bpm" color='#ef4444'/>}
                  {activity.max_hr&&activity.max_hr>0&&<MetCard label="FC max" value={String(Math.round(activity.max_hr))} unit="bpm" color='#f97316'/>}
                  {/* Général */}
                  {hasGeneral&&<Divider label="Général"/>}
                  {activity.calories&&activity.calories>0&&<MetCard label="Calories" value={String(Math.round(activity.calories))} unit="kcal" color='#ffb340'/>}
                  {activity.elapsed_time_s&&activity.elapsed_time_s>0&&activity.moving_time_s&&activity.elapsed_time_s!==activity.moving_time_s&&<MetCard label="Temps total" value={fmtDur(activity.elapsed_time_s)} color='#9ca3af' sub={`Arrêts : ${fmtDur(activity.elapsed_time_s-activity.moving_time_s)}`}/>}
                </div>
              )
            })()}

            {/* ADVANCED METRICS */}
            {(vi!==null||ifVal!==null||efVal!==null||driftPct!==null)&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>Métriques avancées</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {vi!==null&&(
                    <div style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                      <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Variability Index</p>
                      <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:vi<1.05?'#22c55e':vi<1.12?'#ffb340':'#ef4444',margin:0}}>{vi.toFixed(2)}</p>
                      <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{vi<1.05?'Effort régulier':vi<1.12?'Légère variabilité':'Effort irrégulier'}</p>
                    </div>
                  )}
                  {ifVal!==null&&(
                    <div style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                      <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Intensity Factor</p>
                      <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:ifVal<0.75?'#22c55e':ifVal<0.90?'#ffb340':'#ef4444',margin:0}}>{ifVal.toFixed(2)}</p>
                      <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{ifVal<0.75?'Endurance':ifVal<0.90?'Tempo / Seuil':'Intensité haute'}</p>
                    </div>
                  )}
                  {efVal!==null&&efLabel&&(
                    <div style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                      <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>{efLabel}</p>
                      <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'var(--text)',margin:0}}>{efVal.toFixed(2)}</p>
                      <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>Facteur d'efficacité</p>
                    </div>
                  )}
                  {driftPct!==null&&(
                    <div style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                      <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Dérive cardiaque</p>
                      <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:Math.abs(driftPct)<3?'#22c55e':Math.abs(driftPct)<7?'#ffb340':'#ef4444',margin:0}}>{driftPct>0?'+':''}{driftPct.toFixed(1)}%</p>
                      <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{Math.abs(driftPct)<3?'FC stable':Math.abs(driftPct)<7?'Légère dérive':'Dérive importante'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ANALYSIS */}
            <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <div style={{width:28,height:28,borderRadius:8,background:`${SPORT_COLOR[sport]}18`,border:`1px solid ${SPORT_COLOR[sport]}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>💡</div>
                <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Lecture coach</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {analysis.map((ins,i)=>{
                  const borderC=ins.level==='alert'?'rgba(239,68,68,0.25)':ins.level==='warn'?'rgba(251,191,36,0.25)':`${SPORT_COLOR[sport]}20`
                  const bgC=ins.level==='alert'?'rgba(239,68,68,0.04)':ins.level==='warn'?'rgba(251,191,36,0.04)':'rgba(255,255,255,0.02)'
                  return(
                    <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 12px',borderRadius:10,background:bgC,border:`1px solid ${borderC}`}}>
                      <span style={{fontSize:16,lineHeight:1,flexShrink:0,marginTop:1}}>{ins.icon}</span>
                      <div>
                        <p style={{fontSize:11,fontWeight:700,color:'var(--text)',margin:'0 0 2px',lineHeight:1}}>{ins.title}</p>
                        <p style={{fontSize:11,color:'var(--text-mid)',lineHeight:1.6,margin:0}}>{ins.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* HR ZONES */}
            {(isRun||isBike)&&activity.avg_hr&&streams.heartrate?.length&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:2,background:'#ef4444'}}/>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Zones fréquence cardiaque</p>
                </div>
                <HrZoneBars hrStream={streams.heartrate} zones={zones.hr} totalS={activity.moving_time_s??3600}/>
              </div>
            )}

            {/* POWER ZONES (bike) */}
            {isBike&&streams.watts?.length&&activity.moving_time_s&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:2,background:'#3b82f6'}}/>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Zones puissance</p>
                </div>
                <ZoneBars stream={streams.watts} zones={zones.power} totalS={activity.moving_time_s} formatRange={(min,max)=>`${min}–${max<999?max:'∞'} W`}/>
              </div>
            )}

            {/* PACE ZONES (run) */}
            {isRun&&streams.velocity?.length&&activity.moving_time_s&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:2,background:'#22c55e'}}/>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Zones allure</p>
                </div>
                <ZoneBars stream={streams.velocity.map(v=>v>0?Math.round(1000/v):0).filter(v=>v>0&&v<600)} zones={zones.pace} totalS={activity.moving_time_s} formatRange={(min,max)=>`${fmtPaceShort(min)}–${max<999?fmtPaceShort(max):'∞'}`}/>
              </div>
            )}

            {/* Notes */}
            {(notes||activity.userNotes)&&(
              <div style={{padding:'14px 16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',borderLeft:'3px solid #5b6fff'}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 8px'}}>Notes</p>
                <p style={{fontSize:12,color:'var(--text-mid)',lineHeight:1.75,margin:0}}>{notes||activity.userNotes}</p>
              </div>
            )}

            {/* Swim */}
            {isSwim&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>Natation</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {activity.distance_m&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Distance</p><p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#38bdf8',margin:0}}>{fmtDist(activity.distance_m)}</p></div>}
                  {activity.moving_time_s&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Durée</p><p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'var(--text)',margin:0}}>{fmtDur(activity.moving_time_s)}</p></div>}
                  {activity.avg_pace_s_km&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Allure /100m</p><p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#38bdf8',margin:0}}>{fmtPace(activity.avg_pace_s_km/10)}</p></div>}
                  {activity.avg_hr&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>FC moy.</p><p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#ef4444',margin:0}}>{Math.round(activity.avg_hr)} bpm</p></div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ CHARTS ═══ */}
        {tab==='charts'&&(
          <div style={{background:'var(--bg)'}}>
            {streamsLoading?(
              <div style={{padding:'40px 0',textAlign:'center' as const,color:'var(--text-dim)',fontSize:13}}>Chargement des courbes…</div>
            ):(
              <>
                <SyncCharts activity={activity}/>
                {/* Best efforts */}
                {(activity.streams&&(activity.streams.watts?.length||activity.streams.velocity?.length))&&(
                  <BestEfforts activity={activity} streams={activity.streams}/>
                )}
                {/* Laps table inside Charts */}
                {intervals.length>1&&(
                  <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 10px'}}>{intervals.length} laps détectés</p>
                    <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
                      {intervals.map((iv,i)=>(
                        <div key={i} style={{display:'grid',gridTemplateColumns:'28px 1fr auto auto auto auto',gap:8,alignItems:'center',padding:'9px 12px',borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:10,fontWeight:700,color:SPORT_COLOR[sport],textAlign:'center' as const}}>{iv.index}</span>
                          <span style={{fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{iv.label}</span>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:'var(--text)'}}>{fmtDur(iv.durationS)}</span>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:11,color:'var(--text-mid)'}}>{fmtDist(iv.distM)}</span>
                          {iv.avgHr>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:'#ef4444'}}>{Math.round(iv.avgHr)} bpm</span>}
                          {isBike&&iv.avgWatts>0?<span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:'#3b82f6'}}>{Math.round(iv.avgWatts)}W</span>:isRun&&iv.avgPace>0?<span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:'#22c55e'}}>{fmtPace(iv.avgPace)}</span>:<span/>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ PRO ═══ */}
        {tab==='pro'&&(
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:14}}>

            {/* Header */}
            <div style={{padding:'14px 18px',borderRadius:12,background:'linear-gradient(135deg,rgba(91,111,255,0.08),rgba(0,200,224,0.05))',border:'1px solid rgba(91,111,255,0.25)'}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:'0 0 4px',letterSpacing:'-0.01em'}}>⚡ Analyse Pro</p>
              <p style={{fontSize:11,color:'var(--text-dim)',margin:0,lineHeight:1.5}}>Courbes de performance, distribution de charge, métriques avancées — vue experts &amp; coachs.</p>
            </div>

            {/* Power/Pace Curve */}
            {isBike&&streams.watts?.length&&(
              <PowerCurve watts={streams.watts} totalS={activity.moving_time_s??0}/>
            )}
            {isRun&&streams.velocity?.length&&streams.distance?.length&&(
              <PaceCurve velocity={streams.velocity} distance={streams.distance}/>
            )}

            {/* Best Efforts */}
            {(streams.watts?.length||streams.velocity?.length)&&(
              <BestEfforts activity={activity} streams={streams}/>
            )}

            {/* Full Advanced Metrics */}
            <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>Métriques avancées</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {vi!==null&&(
                  <div style={{padding:'11px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',borderTop:`2px solid ${vi<1.05?'#22c55e':vi<1.12?'#ffb340':'#ef4444'}`}}>
                    <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Variability Index (VI)</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color:vi<1.05?'#22c55e':vi<1.12?'#ffb340':'#ef4444',margin:0}}>{vi.toFixed(2)}</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{vi<1.05?'Effort très régulier':vi<1.12?'Légère variabilité':'Effort irrégulier'}</p>
                  </div>
                )}
                {ifVal!==null&&(
                  <div style={{padding:'11px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',borderTop:`2px solid ${ifVal<0.75?'#22c55e':ifVal<0.90?'#ffb340':'#ef4444'}`}}>
                    <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Intensity Factor (IF)</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color:ifVal<0.75?'#22c55e':ifVal<0.90?'#ffb340':'#ef4444',margin:0}}>{ifVal.toFixed(2)}</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{ifVal<0.75?'Endurance':ifVal<0.90?'Tempo / Seuil':'Intensité haute'}</p>
                  </div>
                )}
                {efVal!==null&&efLabel&&(
                  <div style={{padding:'11px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',borderTop:'2px solid #8b5cf6'}}>
                    <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>{efLabel}</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color:'#8b5cf6',margin:0}}>{efVal.toFixed(2)}</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>Facteur d'efficacité</p>
                  </div>
                )}
                {driftPct!==null&&(
                  <div style={{padding:'11px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',borderTop:`2px solid ${Math.abs(driftPct)<3?'#22c55e':Math.abs(driftPct)<7?'#ffb340':'#ef4444'}`}}>
                    <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Dérive cardiaque</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color:Math.abs(driftPct)<3?'#22c55e':Math.abs(driftPct)<7?'#ffb340':'#ef4444',margin:0}}>{driftPct>0?'+':''}{driftPct.toFixed(1)}%</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{Math.abs(driftPct)<3?'FC stable':Math.abs(driftPct)<7?'Légère dérive':'Dérive importante'}</p>
                  </div>
                )}
                {trimp!==null&&(
                  <div style={{padding:'11px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',borderTop:'2px solid #f97316'}}>
                    <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>TRIMP (Banister)</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color:'#f97316',margin:0}}>{trimp}</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>Charge d'entraînement cardiaque</p>
                  </div>
                )}
                {decoupling!==null&&(
                  <div style={{padding:'11px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',borderTop:`2px solid ${Math.abs(decoupling)<5?'#22c55e':Math.abs(decoupling)<10?'#ffb340':'#ef4444'}`}}>
                    <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 3px'}}>Découplage aérobie</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:20,fontWeight:700,color:Math.abs(decoupling)<5?'#22c55e':Math.abs(decoupling)<10?'#ffb340':'#ef4444',margin:0}}>{decoupling>0?'+':''}{decoupling.toFixed(1)}%</p>
                    <p style={{fontSize:8,color:'var(--text-dim)',margin:'3px 0 0'}}>{Math.abs(decoupling)<5?'Bonne efficacité aérobie':Math.abs(decoupling)<10?'Découplage modéré':'Découplage élevé'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Zone Distributions */}
            {streams.heartrate?.length&&activity.moving_time_s&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:2,background:'#ef4444'}}/>
                  <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Distribution FC</p>
                </div>
                <ZoneBars stream={streams.heartrate} zones={zones.hr} totalS={activity.moving_time_s} formatRange={(min,max)=>`${min}–${max<999?max:'∞'} bpm`}/>
              </div>
            )}
            {isBike&&streams.watts?.length&&activity.moving_time_s&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:2,background:'#3b82f6'}}/>
                  <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Distribution puissance</p>
                </div>
                <ZoneBars stream={streams.watts} zones={zones.power} totalS={activity.moving_time_s} formatRange={(min,max)=>`${min}–${max<999?max:'∞'} W`}/>
              </div>
            )}
            {isRun&&streams.velocity?.length&&activity.moving_time_s&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:2,background:'#22c55e'}}/>
                  <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-mid)',margin:0}}>Distribution allure</p>
                </div>
                <ZoneBars stream={streams.velocity.map(v=>v>0?Math.round(1000/v):0).filter(v=>v>0&&v<600)} zones={zones.pace} totalS={activity.moving_time_s} formatRange={(min,max)=>`${fmtPaceShort(min)}–${max<999?fmtPaceShort(max):'∞'}`}/>
              </div>
            )}

            {/* Laps in Pro */}
            {intervals.length>1&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>{intervals.length} laps — comparaison</p>
                {(()=>{
                  const perfKey=isBike?'avgWatts':isRun?'avgPace':null
                  const allPerf=perfKey?intervals.map(iv=>isBike?iv.avgWatts:iv.avgPace).filter(v=>v>0):[]
                  const maxPerf=allPerf.length?maxV(allPerf):1
                  const perfColor=isBike?'#3b82f6':'#22c55e'
                  return(
                    <div style={{display:'flex',flexDirection:'column' as const,gap:5}}>
                      {intervals.map((iv,i)=>{
                        const perfVal=isBike?iv.avgWatts:isRun?iv.avgPace:0
                        // For pace, lower is better (invert bar)
                        const barPct=isRun&&perfVal>0?Math.round((1-(perfVal-minV(allPerf.filter(v=>v>0)))/(maxPerf-minV(allPerf.filter(v=>v>0))||1))*100):perfVal>0?Math.round((perfVal/maxPerf)*100):0
                        return(
                          <div key={i} style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:SPORT_COLOR[sport],minWidth:22,textAlign:'center' as const}}>{iv.index}</span>
                              <span style={{fontSize:11,color:'var(--text-mid)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{iv.label}</span>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:'var(--text)'}}>{fmtDur(iv.durationS)}</span>
                              {iv.distM>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:10,color:'var(--text-dim)'}}>{fmtDist(iv.distM)}</span>}
                              {iv.avgHr>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:'#ef4444'}}>{Math.round(iv.avgHr)}</span>}
                              {perfVal>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:perfColor}}>
                                {isBike?`${Math.round(perfVal)}W`:fmtPaceShort(perfVal)}
                              </span>}
                            </div>
                            {perfVal>0&&(
                              <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                                <div style={{width:`${barPct}%`,height:'100%',background:perfColor,borderRadius:2}}/>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}

          </div>
        )}

        {/* ═══ INTERVALS ═══ */}
        {tab==='intervals'&&(
          <div style={{padding:'20px'}}>
            {intervals.length===0?(
              <p style={{fontSize:13,color:'var(--text-dim)',textAlign:'center' as const,padding:'24px 0'}}>Aucun lap détecté.</p>
            ):(
              <div>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>{intervals.length} lap{intervals.length>1?'s':''}</p>
                {(()=>{
                  const allPerf=intervals.map(iv=>isBike?iv.avgWatts:iv.avgPace).filter(v=>v>0)
                  const maxPerf=allPerf.length?maxV(allPerf):1
                  const minPerf=allPerf.length?minV(allPerf):0
                  const perfColor=isBike?'#3b82f6':'#22c55e'
                  return(
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {intervals.map((iv,i)=>{
                        const perfVal=isBike?iv.avgWatts:isRun?iv.avgPace:0
                        const barPct=isRun&&perfVal>0
                          ?Math.round((1-(perfVal-minPerf)/(maxPerf-minPerf||1))*100)
                          :perfVal>0?Math.round((perfVal/maxPerf)*100):0
                        return(
                          <div key={i} style={{padding:'12px 14px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:perfVal>0?8:0}}>
                              <div style={{width:26,height:26,borderRadius:7,background:`${SPORT_COLOR[sport]}14`,border:`1px solid ${SPORT_COLOR[sport]}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:800,color:SPORT_COLOR[sport]}}>{iv.index}</span>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <p style={{fontSize:12,fontWeight:600,color:'var(--text)',margin:'0 0 1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{iv.label}</p>
                                <div style={{display:'flex',gap:10}}>
                                  <span style={{fontFamily:'DM Mono,monospace',fontSize:11,color:'var(--text-mid)'}}>{fmtDur(iv.durationS)}</span>
                                  {iv.distM>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:11,color:'var(--text-dim)'}}>{fmtDist(iv.distM)}</span>}
                                </div>
                              </div>
                              {iv.avgHr>0&&(
                                <div style={{textAlign:'right' as const}}>
                                  <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px'}}>FC</p>
                                  <p style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:'#ef4444',margin:0}}>{Math.round(iv.avgHr)}</p>
                                </div>
                              )}
                              {perfVal>0&&(
                                <div style={{textAlign:'right' as const}}>
                                  <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px'}}>{isBike?'Watts':'Allure'}</p>
                                  <p style={{fontFamily:'DM Mono,monospace',fontSize:15,fontWeight:700,color:perfColor,margin:0}}>
                                    {isBike?`${Math.round(perfVal)}W`:fmtPaceShort(perfVal)}
                                  </p>
                                </div>
                              )}
                            </div>
                            {perfVal>0&&(
                              <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                                <div style={{width:`${barPct}%`,height:'100%',background:perfColor,borderRadius:2,transition:'width 0.5s ease'}}/>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* ═══ ENRICH ═══ */}
        {tab==='enrich'&&(
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:12}}>

            {/* RPE — premium */}
            <div style={{padding:'20px',borderRadius:14,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18}}>
                <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.09em',color:'var(--text-mid)',margin:0}}>Effort perçu (RPE)</p>
              </div>
              {/* Big value display */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:20}}>
                <div style={{width:72,height:72,borderRadius:20,background:`${rpeColor}15`,border:`2px solid ${rpeColor}35`,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:rpeColor,lineHeight:1}}>{feeling>0?feeling:'—'}</span>
                  {feeling>0&&<span style={{fontSize:8,color:`${rpeColor}99`,marginTop:2}}>/ 10</span>}
                </div>
                <div>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:rpeColor,margin:'0 0 3px',lineHeight:1}}>{rpeLabel}</p>
                  <p style={{fontSize:11,color:'var(--text-dim)',margin:0}}>{feeling===0?'Faites glisser le curseur':feeling<=3?'Récupération possible dès demain':feeling<=6?'Bien dosé, récup recommandée':feeling<=8?'Séance intense, repos 24-48h':'Effort maximal — repos obligatoire'}</p>
                </div>
              </div>
              {/* Gradient slider */}
              <div style={{position:'relative' as const,marginBottom:10}}>
                <div style={{height:8,borderRadius:4,background:'linear-gradient(to right,#22c55e,#86efac,#ffb340,#f97316,#ef4444)',marginBottom:10,position:'relative' as const}}>
                  <div style={{position:'absolute' as const,left:`${((feeling||1)-1)/9*100}%`,top:'50%',transform:'translate(-50%,-50%)',width:18,height:18,borderRadius:'50%',background:rpeColor,border:'3px solid var(--bg)',boxShadow:`0 0 12px ${rpeColor}80`,pointerEvents:'none',transition:'left 0.1s'}}/>
                </div>
                <input type="range" min={1} max={10} step={0.5} value={feeling||1} onChange={e=>setFeeling(parseFloat(e.target.value))} style={{position:'absolute' as const,inset:0,width:'100%',opacity:0,cursor:'pointer',height:8,margin:0}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                {['1','2','3','4','5','6','7','8','9','10'].map((n,i)=>(
                  <span key={i} style={{fontSize:8,fontFamily:'DM Mono,monospace',color:feeling>0&&Math.ceil(feeling)===i+1?rpeColor:'var(--text-dim)',fontWeight:feeling>0&&Math.ceil(feeling)===i+1?700:400,transition:'color 0.2s',minWidth:0,flex:1,textAlign:'center' as const}}>{n}</span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{padding:'18px',borderRadius:14,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.09em',color:'var(--text-mid)',margin:'0 0 12px'}}>Notes de séance</p>
              {/* Quick tags */}
              <div style={{display:'flex',gap:6,flexWrap:'wrap' as const,marginBottom:12}}>
                {QUICK_TAGS.map(tag=>(
                  <button key={tag} onClick={()=>addTag(tag)} style={{padding:'5px 11px',borderRadius:20,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'var(--text-mid)',fontSize:10,cursor:'pointer',transition:'all 0.15s',fontWeight:500}}>
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Sensations, fatigue, douleur, météo, nutrition, points à améliorer…"
                rows={4}
                style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.02)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const,lineHeight:1.75,fontFamily:'inherit',transition:'border-color 0.2s'}}
              />
            </div>

            {/* Wellbeing */}
            <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px'}}>Bien-être</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[{label:'Qualité du sommeil',val:sleepQ,set:setSleepQ},{label:'Fatigue générale',val:fatigueQ,set:setFatigueQ}].map(f=>(
                  <div key={f.label}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:11,color:'var(--text-mid)'}}>{f.label}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:f.val===0?'var(--text-dim)':f.val>=4?'#22c55e':f.val>=3?'#ffb340':'#ef4444'}}>{f.val>0?`${f.val}/5`:'—'}</span>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} onClick={()=>f.set(n)} style={{flex:1,height:24,borderRadius:5,border:'none',cursor:'pointer',background:f.val>=n?(n>=4?'#22c55e':n>=3?'#ffb340':'#ef4444'):'var(--bg-card2)',transition:'background 0.15s'}}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:11,color:'var(--text-mid)'}}>Douleur</span>
                <button onClick={()=>setHasPain(!hasPain)} style={{padding:'4px 12px',borderRadius:8,border:`1px solid ${hasPain?'rgba(239,68,68,0.4)':'var(--border)'}`,background:hasPain?'rgba(239,68,68,0.10)':'var(--bg-card2)',color:hasPain?'#ef4444':'var(--text-mid)',fontSize:11,fontWeight:hasPain?600:400,cursor:'pointer'}}>
                  {hasPain?'Oui':'Non'}
                </button>
                {hasPain&&<input value={painZone} onChange={e=>setPainZone(e.target.value)} placeholder="Zone (ex: genou gauche)" style={{flex:1,padding:'5px 9px',borderRadius:8,border:'1px solid rgba(239,68,68,0.3)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/>}
              </div>
            </div>

            {/* Feedback structuré */}
            <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>Feedback structuré</p>
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                {[
                  {label:'✅ Ce qui était bien',val:whatWentWell,set:setWhatWentWell,ph:'Points positifs de la séance…'},
                  {label:'⚠️ À améliorer',val:toImprove,set:setToImprove,ph:'Points à travailler…'},
                  {label:'🎯 Objectif prochaine séance',val:nextGoal,set:setNextGoal,ph:'Ce que je vise la prochaine fois…'},
                ].map(f=>(
                  <div key={f.label}>
                    <p style={{fontSize:10,fontWeight:600,color:'var(--text-dim)',marginBottom:4}}>{f.label}</p>
                    <textarea value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} rows={2} style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'rgba(255,255,255,0.02)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const,lineHeight:1.6}}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Sport-specific */}
            {isGym&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px'}}>Exercices</p>
                <GymEnrichment exercises={gymExs} onChange={setGymExs}/>
              </div>
            )}
            {isHyrox&&(
              <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px'}}>Détail Hyrox</p>
                <HyroxEnrichment stations={hyroxS} runs={hyroxR} onChange={(s,r)=>{setHyroxS(s);setHyroxR(r)}}/>
              </div>
            )}

            {/* Save button */}
            <button onClick={save} disabled={saving} style={{width:'100%',padding:'14px',borderRadius:12,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,boxShadow:'0 4px 20px rgba(0,200,224,0.25)',transition:'opacity 0.15s'}}>
              {saving?'Sauvegarde...':'Sauvegarder'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// BEST EFFORTS
// ══════════════════════════════════════════════════════════
function BestEfforts({activity,streams}:{activity:Activity;streams:StreamData}){
  const isBike=activity.sport==='bike'||activity.sport==='virtual_bike'
  const isRun=activity.sport==='run'||activity.sport==='trail_run'

  type Effort={label:string;value:string;sub?:string}

  const efforts=useMemo(():Effort[]=>{
    if(isBike&&streams.watts?.length){
      const w=streams.watts.filter(v=>v>0&&isFinite(v))
      const windows=[{s:'30s',sec:30},{s:'1 min',sec:60},{s:'5 min',sec:300},{s:'20 min',sec:1200},{s:'60 min',sec:3600}]
      return windows.map(({s,sec})=>{
        if(w.length<sec)return null
        let best=0
        for(let i=0;i<=w.length-sec;i++){
          const a=w.slice(i,i+sec).reduce((a,b)=>a+b,0)/sec
          if(a>best)best=a
        }
        return best>5?{label:s,value:`${Math.round(best)}W`}:null
      }).filter((e):e is Effort=>!!e)
    }
    if(isRun&&streams.velocity?.length&&streams.distance?.length){
      const vel=streams.velocity
      const dist=streams.distance
      const totalDist=dist[dist.length-1]??0
      const windows=[{s:'400 m',m:400},{s:'1 km',m:1000},{s:'2 km',m:2000},{s:'5 km',m:5000},{s:'10 km',m:10000}]
      return windows.map(({s,m})=>{
        if(totalDist<m)return null
        let bestSpeed=0
        let i=0
        for(let j=0;j<dist.length;j++){
          while(i<j&&(dist[j]-dist[i])>m)i++
          if((dist[j]-dist[i])>=m*0.95){
            const wVel=vel.slice(i,j+1).filter(v=>v>0)
            const a=wVel.length?wVel.reduce((a,b)=>a+b,0)/wVel.length:0
            if(a>bestSpeed)bestSpeed=a
          }
        }
        return bestSpeed>0.5?{label:s,value:fmtPace(1000/bestSpeed)}:null
      }).filter((e):e is Effort=>!!e)
    }
    return[]
  },[isBike,isRun,streams])

  if(!efforts.length)return null
  const color=isBike?'#3b82f6':'#22c55e'

  return(
    <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
      <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>
        Meilleurs efforts — {isBike?'Puissance':'Allure'}
      </p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(88px,1fr))',gap:7}}>
        {efforts.map((e,i)=>(
          <div key={i} style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card)',border:`1px solid ${color}22`,position:'relative' as const,overflow:'hidden'}}>
            <div style={{position:'absolute' as const,top:0,left:0,right:0,height:2,background:color,opacity:0.6}}/>
            <p style={{fontSize:9,color:'var(--text-dim)',margin:'0 0 5px',fontWeight:600}}>{e.label}</p>
            <p style={{fontFamily:'DM Mono,monospace',fontSize:15,fontWeight:700,color,margin:0,lineHeight:1}}>{e.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CALENDAR VIEW
// ══════════════════════════════════════════════════════════
function CalendarView({activities,onSelect,weekCount,offset,setOffset}:{
  activities:Activity[];onSelect:(a:Activity)=>void;
  weekCount:5|10;offset:number;setOffset:(n:number)=>void;
}){
  const today=new Date(); today.setHours(0,0,0,0)
  const dow=today.getDay(); const daysToMon=dow===0?6:dow-1
  const currentMon=new Date(today); currentMon.setDate(today.getDate()-daysToMon)
  const startDate=new Date(currentMon)
  startDate.setDate(currentMon.getDate()-(weekCount-1)*7+offset*weekCount*7)
  const endDate=new Date(startDate); endDate.setDate(startDate.getDate()+weekCount*7-1)

  const weeks:Date[][]=[]
  for(let w=0;w<weekCount;w++){
    const wk:Date[]=[]
    for(let d=0;d<7;d++){const day=new Date(startDate);day.setDate(startDate.getDate()+w*7+d);wk.push(day)}
    weeks.push(wk)
  }

  const byDate:Record<string,Activity[]>={}
  activities.forEach(a=>{
    const d=new Date(a.started_at); d.setHours(0,0,0,0)
    const k=d.toDateString(); if(!byDate[k])byDate[k]=[]; byDate[k].push(a)
  })

  const DAY=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
  const fmt=(d:Date)=>d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
  const canFwd=offset<0

  return(
    <div>
      {/* Nav bar */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <button onClick={()=>setOffset(offset-1)} style={{width:34,height:34,borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>‹</button>
        <span style={{flex:1,textAlign:'center' as const,fontFamily:'DM Mono,monospace',fontSize:11,color:'var(--text-mid)'}}>{fmt(startDate)} — {fmt(endDate)}</span>
        <button onClick={()=>setOffset(offset+1)} disabled={!canFwd} style={{width:34,height:34,borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)',color:canFwd?'var(--text)':'var(--text-dim)',fontSize:20,cursor:canFwd?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:canFwd?1:0.3}}>›</button>
        {offset!==0&&<button onClick={()=>setOffset(0)} style={{padding:'5px 11px',borderRadius:8,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',fontSize:10,fontWeight:600,cursor:'pointer',flexShrink:0}}>Aujourd'hui</button>}
      </div>
      {/* Day labels */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:4}}>
        {DAY.map((d,i)=>(
          <div key={d} style={{textAlign:'center' as const,fontSize:9,fontWeight:700,color:i>=5?'#5b6fff':'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',padding:'4px 0'}}>{d}</div>
        ))}
      </div>
      {/* Weeks */}
      <div style={{display:'flex',flexDirection:'column' as const,gap:3}}>
        {weeks.map((week,wi)=>{
          const wTSS=week.reduce((s,d)=>(byDate[d.toDateString()]??[]).reduce((a,ac)=>a+(ac.tss??0),s),0)
          const wVol=week.reduce((s,d)=>(byDate[d.toDateString()]??[]).reduce((a,ac)=>a+(ac.moving_time_s??0),s),0)
          return(
            <div key={wi}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                {week.map((day,di)=>{
                  const isToday=day.toDateString()===today.toDateString()
                  const isFuture=day>today
                  const isWknd=di>=5
                  const dayActs=byDate[day.toDateString()]??[]
                  return(
                    <div key={di} style={{
                      minHeight:weekCount===5?90:66,padding:5,borderRadius:8,
                      background:isToday?'rgba(0,200,224,0.06)':isWknd?'rgba(255,255,255,0.01)':'var(--bg-card)',
                      border:isToday?'1px solid rgba(0,200,224,0.3)':'1px solid var(--border)',
                      opacity:isFuture?0.38:1,
                    }}>
                      <div style={{fontSize:9,fontFamily:'DM Mono,monospace',color:isToday?'#00c8e0':'var(--text-dim)',fontWeight:isToday?700:400,marginBottom:3}}>{day.getDate()}</div>
                      {dayActs.map(a=>(
                        <div key={a.id} onClick={()=>{if(!isFuture)onSelect(a)}} style={{marginBottom:2,padding:'3px 5px',borderRadius:5,background:`${SPORT_COLOR[a.sport]}18`,border:`1px solid ${SPORT_COLOR[a.sport]}30`,cursor:'pointer'}}>
                          <div style={{display:'flex',alignItems:'center',gap:3}}>
                            <span style={{fontSize:11}}>{SPORT_EMOJI[a.sport]}</span>
                            {a.moving_time_s&&a.moving_time_s>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:9,fontWeight:700,color:'var(--text)'}}>{fmtDur(a.moving_time_s)}</span>}
                          </div>
                          {a.distance_m&&a.distance_m>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:8,color:SPORT_COLOR[a.sport],marginTop:1}}>{fmtDist(a.distance_m)}</div>}
                          {a.tss&&a.tss>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:7,color:'#5b6fff',marginTop:1}}>{Math.round(a.tss)} TSS</div>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              {(wTSS>0||wVol>0)&&(
                <div style={{display:'flex',gap:10,justifyContent:'flex-end',padding:'2px 4px 0'}}>
                  {wVol>0&&<span style={{fontSize:8,fontFamily:'DM Mono,monospace',color:'var(--text-dim)'}}>{(wVol/3600).toFixed(1)}h</span>}
                  {wTSS>0&&<span style={{fontSize:8,fontFamily:'DM Mono,monospace',color:'#5b6fff'}}>{Math.round(wTSS)} TSS</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ACTIVITY LIST CARD
// ══════════════════════════════════════════════════════════
function ActivityListCard({activity,onClick}:{activity:Activity;onClick:()=>void}) {
  const sport=activity.sport
  const statusCfg=STATUS_CFG[activity.status]
  const isBike=sport==='bike'||sport==='virtual_bike'
  const isRun=sport==='run'||sport==='trail_run'
  const date=new Date(activity.started_at)
  const tssColor=!activity.tss?'#9ca3af':activity.tss>150?'#ef4444':activity.tss>80?'#f97316':activity.tss>40?'#ffb340':'#22c55e'
  const tssBarPct=activity.tss?Math.min((activity.tss/200)*100,100):0

  return(
    <div onClick={onClick} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,marginBottom:8,cursor:'pointer',overflow:'hidden',transition:'transform 0.1s,border-color 0.15s'}}>
      {/* Sport color accent */}
      <div style={{height:2,background:`linear-gradient(to right,${SPORT_COLOR[sport]},${SPORT_COLOR[sport]}44)`,borderRadius:'14px 14px 0 0'}}/>
      <div style={{padding:'14px 16px 12px'}}>
        {/* Row 1: icon + title + status */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{width:40,height:40,borderRadius:11,background:`${SPORT_COLOR[sport]}14`,border:`1px solid ${SPORT_COLOR[sport]}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{SPORT_EMOJI[sport]}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:1}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,letterSpacing:'-0.01em'}}>{activity.title}</p>
              {activity.is_race&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:20,background:'rgba(239,68,68,0.10)',color:'#ef4444',fontWeight:700,flexShrink:0,border:'1px solid rgba(239,68,68,0.25)'}}>COMPÉT</span>}
            </div>
            <p style={{fontSize:10,color:'var(--text-dim)',margin:0}}>
              {date.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}
              {' · '}{date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
              {' · '}<span style={{color:SPORT_COLOR[sport],fontWeight:600}}>{SPORT_LABEL[sport]}</span>
            </p>
          </div>
          <span style={{fontSize:8,padding:'2px 7px',borderRadius:20,background:statusCfg.bg,border:`1px solid ${statusCfg.color}28`,color:statusCfg.color,fontWeight:700,flexShrink:0}}>{statusCfg.label}</span>
        </div>

        {/* Row 2: primary numbers */}
        <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap' as const}}>
          {activity.moving_time_s&&activity.moving_time_s>0&&(
            <div>
              <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Durée</p>
              <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'var(--text)',margin:0,lineHeight:1}}>{fmtDur(activity.moving_time_s)}</p>
            </div>
          )}
          {activity.distance_m&&activity.distance_m>0&&(
            <div>
              <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Distance</p>
              <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:SPORT_COLOR[sport],margin:0,lineHeight:1}}>{fmtDist(activity.distance_m)}</p>
            </div>
          )}
          {(activity.elevation_gain_m??0)>0&&(
            <div>
              <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const}}>D+</p>
              <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#8b5cf6',margin:0,lineHeight:1}}>{Math.round(activity.elevation_gain_m!)}m</p>
            </div>
          )}
          {isBike&&activity.avg_watts&&activity.avg_watts>0&&(
            <div>
              <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Watts</p>
              <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#3b82f6',margin:0,lineHeight:1}}>{Math.round(activity.avg_watts)}W</p>
            </div>
          )}
          {isRun&&activity.avg_pace_s_km&&activity.avg_pace_s_km>0&&(
            <div>
              <p style={{fontSize:8,color:'var(--text-dim)',margin:'0 0 1px',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Allure</p>
              <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:SPORT_COLOR[sport],margin:0,lineHeight:1}}>{fmtPace(activity.avg_pace_s_km)}</p>
            </div>
          )}
        </div>

        {/* Row 3: secondary chips */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:tssBarPct>0?10:0}}>
          {activity.avg_hr&&activity.avg_hr>0&&(
            <span style={{fontSize:9,fontFamily:'DM Mono,monospace',padding:'3px 8px',borderRadius:20,background:'rgba(239,68,68,0.08)',color:'#ef4444',fontWeight:600,border:'1px solid rgba(239,68,68,0.18)'}}>❤ {Math.round(activity.avg_hr)} bpm</span>
          )}
          {activity.avg_cadence&&activity.avg_cadence>0&&(
            <span style={{fontSize:9,fontFamily:'DM Mono,monospace',padding:'3px 8px',borderRadius:20,background:'rgba(236,72,153,0.08)',color:'#ec4899',fontWeight:600,border:'1px solid rgba(236,72,153,0.18)'}}>{Math.round(activity.avg_cadence)} {isBike?'rpm':'spm'}</span>
          )}
          {activity.calories&&activity.calories>0&&(
            <span style={{fontSize:9,fontFamily:'DM Mono,monospace',padding:'3px 8px',borderRadius:20,background:'rgba(255,179,64,0.08)',color:'#ffb340',fontWeight:600,border:'1px solid rgba(255,179,64,0.18)'}}>{Math.round(activity.calories)} kcal</span>
          )}
          {activity.tss&&activity.tss>0&&(
            <span style={{fontSize:9,fontFamily:'DM Mono,monospace',padding:'3px 8px',borderRadius:20,background:`${tssColor}12`,color:tssColor,fontWeight:700,border:`1px solid ${tssColor}22`}}>{Math.round(activity.tss)} TSS</span>
          )}
        </div>

        {/* TSS bar */}
        {tssBarPct>0&&(
          <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{width:`${tssBarPct}%`,height:'100%',background:`linear-gradient(to right,#22c55e 0%,#ffb340 50%,${tssColor} 100%)`,borderRadius:2}}/>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function ActivitiesPage() {
  const {activities,loading,total,page,load,updateActivity}=useActivities()
  const [selected,setSelected]=useState<Activity|null>(null)
  const [filterSport,setFilterSport]=useState<FilterSport>('all')
  const [filterStatus,setFilterStatus]=useState<FilterStatus>('all')
  const [filterType,setFilterType]=useState<FilterType>('all')
  const [search,setSearch]=useState('')
  const [viewMode,setViewMode]=useState<'list'|'calendar'>('list')
  const [calWeekCount,setCalWeekCount]=useState<5|10>(5)
  const [calOffset,setCalOffset]=useState(0)

  const filtered=useMemo(()=>activities.filter(a=>{
    if(filterSport!=='all'&&a.sport!==filterSport)return false
    if(filterStatus!=='all'&&a.status!==filterStatus)return false
    if(filterType==='competition'&&!a.is_race)return false
    if(filterType==='training'&&a.is_race)return false
    if(search&&!a.title.toLowerCase().includes(search.toLowerCase()))return false
    return true
  }),[activities,filterSport,filterStatus,filterType,search])

  const now=new Date()
  const thisMonth=activities.filter(a=>{const d=new Date(a.started_at);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()})
  const availableSports=Array.from(new Set(activities.map(a=>a.sport)))

  if(selected)return(
    <ActivityDetail activity={selected} onClose={()=>setSelected(null)} onUpdate={upd=>{updateActivity(upd.id,upd);setSelected(upd)}}/>
  )

  return(
    <div style={{padding:'22px 20px',maxWidth:'100%'}}>

      {/* Header + toggle */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,gap:12}}>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,letterSpacing:'-0.03em',margin:0}}>Activités</h1>
          <p style={{fontSize:12,color:'var(--text-dim)',margin:'4px 0 0'}}>{total>0?`${total} activité${total>1?'s':''}`:' Connectez vos apps pour importer vos séances'}</p>
        </div>
        <div style={{display:'flex',padding:3,borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border)',flexShrink:0,gap:2}}>
          {([['list','≡ Liste'],['calendar','▦ Calendrier']] as const).map(([mode,label])=>(
            <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:'6px 13px',borderRadius:7,border:'none',background:viewMode===mode?'var(--bg-card2)':'transparent',color:viewMode===mode?'var(--text)':'var(--text-dim)',fontSize:11,fontWeight:viewMode===mode?700:400,cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap' as const}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST MODE ── */}
      {viewMode==='list'&&(
        <>
          {/* Monthly stats */}
          {thisMonth.length>0&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {[
                {l:'Ce mois',v:String(thisMonth.length),c:'#00c8e0'},
                {l:'Volume',v:`${(thisMonth.reduce((s,a)=>s+(a.moving_time_s??0),0)/3600).toFixed(1)}h`,c:'#ffb340'},
                {l:'TSS',v:String(Math.round(thisMonth.reduce((s,a)=>s+(a.tss??0),0))),c:'#5b6fff'},
              ].map(x=>(
                <div key={x.l} style={{padding:'10px 12px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>{x.l}</p>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:x.c,margin:0}}>{x.v}</p>
                </div>
              ))}
            </div>
          )}
          {/* Search */}
          <div style={{position:'relative' as const,marginBottom:10}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
              style={{width:'100%',padding:'9px 14px 9px 36px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:13,outline:'none'}}/>
            <span style={{position:'absolute' as const,left:13,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--text-dim)'}}>🔍</span>
            {search&&<button onClick={()=>setSearch('')} style={{position:'absolute' as const,right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:17}}>×</button>}
          </div>
          {/* Filters */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:16}}>
            <select value={filterSport} onChange={e=>setFilterSport(e.target.value as FilterSport)} style={{padding:'7px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none',cursor:'pointer'}}>
              <option value="all">Tous les sports</option>
              {availableSports.map(s=><option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value as FilterType)} style={{padding:'7px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none',cursor:'pointer'}}>
              <option value="all">Entraînement + Compétition</option>
              <option value="training">Entraînement</option>
              <option value="competition">Compétition</option>
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as FilterStatus)} style={{padding:'7px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none',cursor:'pointer'}}>
              <option value="all">Tous les statuts</option>
              <option value="imported">Importée</option>
              <option value="completed">Complétée</option>
              <option value="validated">Validée</option>
            </select>
          </div>
          {/* List */}
          {loading&&activities.length===0?(
            <div style={{padding:'40px 0',textAlign:'center' as const,color:'var(--text-dim)',fontSize:13}}>Chargement...</div>
          ):filtered.length===0?(
            <div style={{padding:'44px 20px',textAlign:'center' as const,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14}}>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'0 0 7px'}}>Aucune activité</p>
              <p style={{fontSize:13,color:'var(--text-dim)',margin:0}}>{search?`Aucun résultat pour "${search}".`:'Connectez Strava, Wahoo ou Polar dans votre profil.'}</p>
            </div>
          ):(
            <div>
              {filtered.map(a=><ActivityListCard key={a.id} activity={a} onClick={()=>setSelected(a)}/>)}
              {activities.length<total&&(
                <button onClick={()=>load(page+1,filterSport!=='all'?filterSport:undefined)} style={{width:'100%',padding:'11px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer',marginTop:6}}>
                  Charger plus — {total-activities.length} restante{total-activities.length>1?'s':''}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR MODE ── */}
      {viewMode==='calendar'&&(
        <div>
          {/* Week count selector */}
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
            <span style={{fontSize:11,color:'var(--text-dim)',marginRight:2}}>Afficher</span>
            {([5,10] as const).map(n=>(
              <button key={n} onClick={()=>setCalWeekCount(n)} style={{padding:'4px 12px',borderRadius:8,border:'1px solid',fontSize:11,cursor:'pointer',borderColor:calWeekCount===n?'#00c8e0':'var(--border)',background:calWeekCount===n?'rgba(0,200,224,0.09)':'var(--bg-card)',color:calWeekCount===n?'#00c8e0':'var(--text-dim)',fontWeight:calWeekCount===n?700:400,transition:'all 0.15s'}}>
                {n} semaines
              </button>
            ))}
          </div>
          {loading&&activities.length===0?(
            <div style={{padding:'40px 0',textAlign:'center' as const,color:'var(--text-dim)',fontSize:13}}>Chargement...</div>
          ):(
            <CalendarView
              activities={activities}
              onSelect={setSelected}
              weekCount={calWeekCount}
              offset={calOffset}
              setOffset={setCalOffset}
            />
          )}
        </div>
      )}

    </div>
  )
}
