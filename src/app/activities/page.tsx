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
type DetailTab      = 'overview' | 'charts' | 'intervals' | 'enrich'

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

function generateAnalysis(a: Activity): string[] {
  const lines: string[]=[]
  const isBike=a.sport==='bike'||a.sport==='virtual_bike'
  const isRun=a.sport==='run'||a.sport==='trail_run'
  if(isBike&&a.avg_watts&&a.normalized_watts){
    const vi=a.normalized_watts/a.avg_watts
    if(vi<1.05) lines.push('Effort régulier — excellente maîtrise de l\'intensité.')
    else if(vi<1.12) lines.push('Effort globalement régulier, quelques variations d\'intensité.')
    else lines.push('Forte variabilité de puissance — effort irrégulier.')
  }
  if(a.tss){
    if(a.tss>150) lines.push(`Charge élevée (${Math.round(a.tss)} TSS) — récupération 48h+ recommandée.`)
    else if(a.tss>80) lines.push(`Charge modérée (${Math.round(a.tss)} TSS) — récupération 24h.`)
    else lines.push(`Charge légère (${Math.round(a.tss)} TSS) — récupération rapide.`)
  }
  if(isRun&&a.avg_hr){
    if(a.avg_hr<148) lines.push('Séance en endurance fondamentale — FC bien contrôlée.')
    else if(a.avg_hr<163) lines.push('Intensité tempo — allure bien tenue.')
    else lines.push('Séance à haute intensité — surveiller la récupération.')
  }
  if((a.elevation_gain_m??0)>500) lines.push(`Dénivelé important (${Math.round(a.elevation_gain_m!)}m) — impact musculaire à prendre en compte.`)
  if((a.moving_time_s??0)>7200) lines.push('Longue durée — hydratation et récupération à soigner.')
  if(!lines.length) lines.push('Données enregistrées. Connectez vos capteurs pour l\'analyse complète.')
  return lines.slice(0,3)
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
  track, xData, cursorPct, selection, onCursorMove, onSelectStart, onSelectMove, onSelectEnd,
}:{
  track:TrackDef; xData:number[]; cursorPct:number;
  selection:ChartSel|null; onCursorMove:(p:number)=>void;
  onSelectStart:(p:number)=>void; onSelectMove:(p:number)=>void; onSelectEnd:()=>void;
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
          {/* Cursor */}
          {curX!==null&&curX>=0&&(
            <>
              <line x1={curX} y1={0} x2={curX} y2={H} stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
              {curVal&&<circle cx={curX} cy={toY(curVal)} r="3" fill={track.color} stroke="var(--bg)" strokeWidth="1.5"/>}
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

// Altitude track (special area style)
function AltitudeTrack({data,xData,cursorPct,selection,onCursorMove,onSelectStart,onSelectMove,onSelectEnd,laps}:{
  data:number[];xData:number[];cursorPct:number;selection:ChartSel|null;
  onCursorMove:(p:number)=>void;onSelectStart:(p:number)=>void;onSelectMove:(p:number)=>void;onSelectEnd:()=>void;
  laps?:IntervalBlock[];
}) {
  const svgRef=useRef<SVGSVGElement>(null)
  const dragging=useRef(false)
  const W=1000,H=80
  if(!data.length)return null
  const dMin=minV(data),dMax=maxV(data),span=dMax-dMin||1,pad=span*0.12
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

  function getPct(e:React.MouseEvent|React.TouchEvent):number{
    if(!svgRef.current)return 0
    const rect=svgRef.current.getBoundingClientRect()
    const cx='touches' in e?e.touches[0].clientX:(e as React.MouseEvent).clientX
    return Math.max(0,Math.min(1,(cx-rect.left-80)/(rect.width-180)))
  }

  return(
    <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',background:'var(--bg-card)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px 3px 80px'}}>
        <span style={{fontSize:9,fontWeight:700,color:'#8b5cf6',textTransform:'uppercase' as const,letterSpacing:'0.09em'}}>Altitude</span>
        <div style={{display:'flex',gap:12}}>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>min {Math.round(dMin)}m</span>
          <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace'}}>max {Math.round(dMax)}m</span>
        </div>
      </div>
      <div style={{display:'flex'}}>
        <div style={{width:78,flexShrink:0,height:H,position:'relative'}}>
          {[dMin,(dMin+dMax)/2,dMax].map((v,i)=>(
            <span key={i} style={{position:'absolute',right:6,fontSize:8,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',transform:'translateY(-50%)',top:`${((H-toY(v))/H)*100}%`}}>{Math.round(v)}</span>
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
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.03"/>
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#altFill)"/>
          <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round"/>
          {/* Lap overlays */}
          {laps&&laps.map((lap,i)=>{
            const x1=(lap.startIdx/n)*W, x2=(lap.endIdx/n)*W
            if(x2<=x1)return null
            return <rect key={i} x={x1} y={0} width={x2-x1} height={H} fill="rgba(0,200,224,0.05)" stroke="rgba(0,200,224,0.2)" strokeWidth="0.5"/>
          })}
          {selX1!==null&&selX2!==null&&(
            <rect x={Math.min(selX1,selX2)} y={0} width={Math.abs(selX2-selX1)} height={H} fill="rgba(0,200,224,0.10)" stroke="#00c8e0" strokeWidth="1"/>
          )}
          {curX!==null&&curX>=0&&(
            <line x1={curX} y1={0} x2={curX} y2={H} stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
          )}
        </svg>
        <div style={{width:90,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',justifyContent:'center',padding:'0 10px',height:H,gap:2}}>
          {curElev&&<span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:'#8b5cf6'}}>{Math.round(curElev)}<span style={{fontSize:9,fontWeight:400,color:'var(--text-dim)',marginLeft:2}}>m</span></span>}
          {curSlope!==null&&<span style={{fontSize:9,fontFamily:'DM Mono,monospace',color:curSlope>0?'#f97316':curSlope<0?'#3b82f6':'var(--text-dim)'}}>{curSlope>0?'+':''}{curSlope.toFixed(1)}%</span>}
        </div>
      </div>
    </div>
  )
}

// X-axis with distance + time markers
function XAxis({xData,sport,totalS}:{xData:number[];sport:SportType;totalS:number}) {
  if(!xData.length)return null
  const isDistX=(xData[xData.length-1]??0)>1000
  const isBike=sport==='bike'||sport==='virtual_bike'
  const distStep=isBike?5000:2000 // 5km bike, 2km run
  const timeStep=isBike?600:300   // 10min bike, 5min run
  const totalDist=xData[xData.length-1]??0
  const ticks:number[]=[]
  if(isDistX){
    for(let d=distStep;d<totalDist;d+=distStep) ticks.push(d)
  }
  return(
    <div style={{display:'flex',position:'relative',height:32,background:'var(--bg-card)',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
      <div style={{width:78,flexShrink:0}}/>
      <div style={{flex:1,position:'relative'}}>
        {isDistX?ticks.map((d,i)=>{
          const pct=(d/totalDist)*100
          if(pct>98)return null
          const timeAtDist=totalS?(d/totalDist)*totalS:0
          return(
            <div key={i} style={{position:'absolute',left:`${pct}%`,transform:'translateX(-50%)',top:4,display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
              <div style={{width:1,height:4,background:'rgba(255,255,255,0.1)'}}/>
              <span style={{fontSize:8,fontFamily:'DM Mono,monospace',color:'var(--text-dim)',whiteSpace:'nowrap' as const}}>{(d/1000).toFixed(0)}km</span>
              {timeAtDist>0&&<span style={{fontSize:7,fontFamily:'DM Mono,monospace',color:'rgba(255,255,255,0.2)',whiteSpace:'nowrap' as const}}>{fmtDur(timeAtDist)}</span>}
            </div>
          )
        }):<></>}
      </div>
      <div style={{width:90,flexShrink:0}}/>
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

  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',overflowY:'auto',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,paddingTop:48}}>
      <div style={{background:'var(--bg-card)',borderRadius:16,border:'1px solid var(--border)',width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--bg-card)',zIndex:1}}>
          <div>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Analyse de la sélection</p>
            <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>{distLabel} : {distOrTime}{durS>0?` · ${fmtDur(durS)}`:''}</p>
          </div>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:15}}>✕</button>
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
        {tracks.map(t=><ChartTrack key={t.id} track={t} {...trackProps}/>)}
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
// HR ZONE BARS (vertical format)
// ══════════════════════════════════════════════════════════
function HrZoneBars({hrStream,zones,totalS}:{hrStream:number[];zones:Zone[];totalS:number}) {
  const times=zoneTimes(hrStream,zones,totalS)
  const total=times.reduce((a,b)=>a+b,0)||1
  return(
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {zones.map((z,i)=>{
        const pct=Math.round((times[i]/total)*100)
        return(
          <div key={i} style={{padding:'9px 13px',borderRadius:10,background:ZONE_BG[i],border:`1px solid ${ZONE_COLORS[i]}22`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:8,height:8,borderRadius:2,background:ZONE_COLORS[i],flexShrink:0,display:'inline-block'}}/>
                <span style={{fontSize:12,fontWeight:600,color:ZONE_COLORS[i]}}>{z.label} — {ZONE_LABELS[i].split(' ').slice(1).join(' ')}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:'var(--text)'}}>{times[i]}min</span>
                <span style={{fontSize:10,color:'var(--text-dim)',minWidth:30,textAlign:'right' as const}}>{pct}%</span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1,height:5,background:'rgba(255,255,255,0.05)',borderRadius:3}}>
                <div style={{width:`${pct}%`,height:'100%',background:ZONE_COLORS[i],borderRadius:3,transition:'width 0.5s'}}/>
              </div>
              <span style={{fontSize:9,color:'var(--text-dim)',fontFamily:'DM Mono,monospace',minWidth:80,textAlign:'right' as const}}>{z.min}–{z.max<999?z.max:'∞'} bpm</span>
            </div>
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

  // VAP (Grade Adjusted Pace)
  const vap=activity.avg_pace_s_km&&activity.elevation_gain_m&&activity.distance_m
    ?activity.avg_pace_s_km*(1-(activity.elevation_gain_m/activity.distance_m)*0.035):null

  // Zone times
  const hrZoneTimes=useMemo(()=>
    streams.heartrate?.length?zoneTimes(streams.heartrate,zones.hr,activity.moving_time_s??3600):[0,0,0,0,0]
  ,[streams.heartrate,activity.moving_time_s])

  // TSS color
  const tssColor=!activity.tss?'#9ca3af':activity.tss>150?'#ef4444':activity.tss>80?'#f97316':'#3b82f6'

  // RPE label & color
  const rpeLabel=feeling>0?(RPE_LABELS[Math.round(feeling)]??'—'):'Non renseigné'
  const rpeColor=feeling===0?'var(--text-dim)':feeling<=2?'#22c55e':feeling<=4?'#86efac':feeling<=6?'#ffb340':feeling<=8?'#f97316':'#ef4444'

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
    ...(intervals.length>0?[['intervals','Intervalles']] as [DetailTab,string][]:[] as [DetailTab,string][]),
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
          <div style={{padding:'20px'}}>

            {/* HERO SECTION */}
            <div style={{padding:'20px',borderRadius:14,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12,boxShadow:'var(--shadow-card)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <span style={{fontSize:22}}>{SPORT_EMOJI[sport]}</span>
                <p style={{fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:SPORT_COLOR[sport],margin:0}}>{SPORT_LABEL[sport]}</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                {activity.moving_time_s&&activity.moving_time_s>0&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Durée</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:'var(--text)',margin:0,letterSpacing:'-0.02em'}}>{fmtDur(activity.moving_time_s)}</p>
                  </div>
                )}
                {activity.distance_m&&activity.distance_m>0&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Distance</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:SPORT_COLOR[sport],margin:0,letterSpacing:'-0.02em'}}>{fmtDist(activity.distance_m)}</p>
                  </div>
                )}
                {(activity.elevation_gain_m??0)>0&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Dénivelé +</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:'#8b5cf6',margin:0,letterSpacing:'-0.02em'}}>{Math.round(activity.elevation_gain_m!)}m</p>
                  </div>
                )}
                {isRun&&activity.avg_pace_s_km&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Allure moy.</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:'#22c55e',margin:0,letterSpacing:'-0.02em'}}>{fmtPace(activity.avg_pace_s_km)}</p>
                  </div>
                )}
                {isBike&&activity.avg_speed_ms&&(
                  <div>
                    <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Vitesse moy.</p>
                    <p style={{fontFamily:'DM Mono,monospace',fontSize:26,fontWeight:700,color:'#3b82f6',margin:0,letterSpacing:'-0.02em'}}>{fmtSpeed(activity.avg_speed_ms)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* METRIC CARDS */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:12}}>
              {/* Run specific */}
              {isRun&&vap&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>VAP</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#22c55e',margin:0}}>{fmtPace(vap)}</p>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'2px 0 0'}}>allure ajustée dénivelé</p>
                </div>
              )}
              {isRun&&activity.avg_cadence&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Cadence moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#9ca3af',margin:0}}>{Math.round(activity.avg_cadence)} <span style={{fontSize:11,fontWeight:400}}>spm</span></p>
                </div>
              )}
              {/* Bike specific */}
              {isBike&&activity.avg_watts&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Puissance moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#3b82f6',margin:0}}>{Math.round(activity.avg_watts)} <span style={{fontSize:11,fontWeight:400}}>W</span></p>
                  {activity.normalized_watts&&<p style={{fontSize:9,color:'var(--text-dim)',margin:'2px 0 0'}}>NP {Math.round(activity.normalized_watts)}W</p>}
                </div>
              )}
              {isBike&&activity.avg_cadence&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Cadence moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#9ca3af',margin:0}}>{Math.round(activity.avg_cadence)} <span style={{fontSize:11,fontWeight:400}}>rpm</span></p>
                </div>
              )}
              {/* Common */}
              {activity.avg_hr&&activity.avg_hr>0&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:`1px solid rgba(239,68,68,0.2)`}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>FC moy.</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#ef4444',margin:0}}>{Math.round(activity.avg_hr)} <span style={{fontSize:11,fontWeight:400}}>bpm</span></p>
                  {activity.max_hr&&<p style={{fontSize:9,color:'var(--text-dim)',margin:'2px 0 0'}}>max {Math.round(activity.max_hr)} bpm</p>}
                </div>
              )}
              {activity.tss&&activity.tss>0&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:`1px solid ${tssColor}22`}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>TSS</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:tssColor,margin:0}}>{Math.round(activity.tss)}</p>
                  <p style={{fontSize:9,color:'var(--text-dim)',margin:'2px 0 0'}}>{activity.tss>150?'Charge élevée':activity.tss>80?'Charge modérée':'Charge légère'}</p>
                </div>
              )}
              {activity.calories&&activity.calories>0&&(
                <div style={{padding:'10px 12px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px'}}>Calories</p>
                  <p style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:'#ffb340',margin:0}}>{Math.round(activity.calories)} <span style={{fontSize:11,fontWeight:400}}>kcal</span></p>
                </div>
              )}
            </div>

            {/* ANALYSIS */}
            <div style={{padding:'14px 16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:24,height:24,borderRadius:7,background:`${SPORT_COLOR[sport]}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>💡</div>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:0}}>Analyse</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {analysis.map((line,i)=>(
                  <p key={i} style={{fontSize:12,color:'var(--text-mid)',lineHeight:1.65,margin:0,borderLeft:`2px solid ${SPORT_COLOR[sport]}`,paddingLeft:10}}>{line}</p>
                ))}
              </div>
            </div>

            {/* HR ZONES — vertical */}
            {(isRun||isBike)&&activity.avg_hr&&streams.heartrate?.length&&(
              <div style={{padding:'14px 16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>Répartition zones FC</p>
                <HrZoneBars hrStream={streams.heartrate} zones={zones.hr} totalS={activity.moving_time_s??3600}/>
              </div>
            )}

            {/* Notes */}
            {(notes||activity.userNotes)&&(
              <div style={{padding:'12px 16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 7px'}}>Notes</p>
                <p style={{fontSize:12,color:'var(--text-mid)',lineHeight:1.7,margin:0}}>{notes||activity.userNotes}</p>
              </div>
            )}

            {/* Swim */}
            {isSwim&&(
              <div style={{padding:'14px 16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>Natation</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  {activity.distance_m&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Distance</p><p style={{fontFamily:'DM Mono,monospace',fontSize:16,fontWeight:700,color:'#38bdf8',margin:0}}>{fmtDist(activity.distance_m)}</p></div>}
                  {activity.moving_time_s&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Durée</p><p style={{fontFamily:'DM Mono,monospace',fontSize:16,fontWeight:700,color:'var(--text)',margin:0}}>{fmtDur(activity.moving_time_s)}</p></div>}
                  {activity.avg_pace_s_km&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>Allure /100m</p><p style={{fontFamily:'DM Mono,monospace',fontSize:16,fontWeight:700,color:'#38bdf8',margin:0}}>{fmtPace(activity.avg_pace_s_km/10)}</p></div>}
                  {activity.avg_hr&&<div><p style={{fontSize:9,color:'var(--text-dim)',marginBottom:3}}>FC moy.</p><p style={{fontFamily:'DM Mono,monospace',fontSize:16,fontWeight:700,color:'#ef4444',margin:0}}>{Math.round(activity.avg_hr)} bpm</p></div>}
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
              <SyncCharts activity={activity}/>
            )}
          </div>
        )}

        {/* ═══ INTERVALS ═══ */}
        {tab==='intervals'&&(
          <div style={{padding:'20px'}}>
            {intervals.length===0?(
              <p style={{fontSize:13,color:'var(--text-dim)',textAlign:'center' as const,padding:'24px 0'}}>Aucun intervalle détecté.</p>
            ):(
              <div>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px'}}>{intervals.length} bloc{intervals.length>1?'s':''}</p>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {intervals.map((iv,i)=>(
                    <div key={i} style={{display:'grid',gridTemplateColumns:'28px 1fr repeat(4,auto)',gap:8,alignItems:'center',padding:'10px 13px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:'var(--text-dim)',textAlign:'center' as const}}>{iv.index}</span>
                      <span style={{fontSize:12,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{iv.label}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:12,color:'var(--text)'}}>{fmtDur(iv.durationS)}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:12,color:'var(--text)'}}>{fmtDist(iv.distM)}</span>
                      {iv.avgHr>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:600,color:'#ef4444'}}>{Math.round(iv.avgHr)} bpm</span>}
                      {isBike&&iv.avgWatts>0?<span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:600,color:'#3b82f6'}}>{Math.round(iv.avgWatts)}W</span>:iv.avgPace>0?<span style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:600,color:'#22c55e'}}>{fmtPace(iv.avgPace)}</span>:<span/>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ENRICH ═══ */}
        {tab==='enrich'&&(
          <div style={{padding:'20px'}}>

            {/* RPE */}
            <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px'}}>Effort perçu (RPE)</p>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:rpeColor}}>{rpeLabel}</span>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:16,fontWeight:700,color:rpeColor}}>{feeling>0?`${feeling}/10`:'—'}</span>
              </div>
              <input type="range" min={1} max={10} step={0.5} value={feeling||1} onChange={e=>setFeeling(parseFloat(e.target.value))} style={{width:'100%',accentColor:rpeColor,cursor:'pointer',height:6}}/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                {['Très facile','Facile','Modéré','Difficile','Maximal'].map((l,i)=>(
                  <span key={i} style={{fontSize:8,color:'var(--text-dim)',textAlign:'center' as const,flex:1}}>{l}</span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{padding:'16px',borderRadius:12,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:12}}>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 10px'}}>Notes</p>
              <div style={{display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:10}}>
                {QUICK_TAGS.map(tag=>(
                  <button key={tag} onClick={()=>addTag(tag)} style={{padding:'4px 10px',borderRadius:20,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-mid)',fontSize:10,cursor:'pointer'}}>
                    {tag}
                  </button>
                ))}
              </div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Sensations, fatigue, douleur, météo, nutrition, points à améliorer…" rows={4} style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1px solid var(--border)',background:'rgba(255,255,255,0.03)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const,lineHeight:1.65}}/>
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
// ACTIVITY LIST CARD
// ══════════════════════════════════════════════════════════
function ActivityListCard({activity,onClick}:{activity:Activity;onClick:()=>void}) {
  const sport=activity.sport
  const statusCfg=STATUS_CFG[activity.status]
  const isBike=sport==='bike'||sport==='virtual_bike'
  const isRun=sport==='run'||sport==='trail_run'
  const date=new Date(activity.started_at)
  return(
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,marginBottom:6,cursor:'pointer',transition:'border-color 0.15s'}}>
      <div style={{width:42,height:42,borderRadius:10,background:`${SPORT_COLOR[sport]}14`,border:`1px solid ${SPORT_COLOR[sport]}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,flexShrink:0}}>
        {SPORT_EMOJI[sport]}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
          <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{activity.title}</p>
          {activity.is_race&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:20,background:'rgba(239,68,68,0.08)',color:'#ef4444',fontWeight:700,flexShrink:0,border:'1px solid rgba(239,68,68,0.2)'}}>COMPÉT</span>}
        </div>
        <p style={{fontSize:10,color:'var(--text-dim)',margin:'0 0 5px'}}>
          {date.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
          {activity.moving_time_s&&activity.moving_time_s>0&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-mid)',fontWeight:600}}>{fmtDur(activity.moving_time_s)}</span>}
          {activity.distance_m&&activity.distance_m>0&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:SPORT_COLOR[sport],fontWeight:600}}>{fmtDist(activity.distance_m)}</span>}
          {isRun&&activity.avg_pace_s_km&&activity.avg_pace_s_km>0&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-mid)',fontWeight:600}}>{fmtPace(activity.avg_pace_s_km)}</span>}
          {isBike&&activity.avg_watts&&activity.avg_watts>0&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-mid)',fontWeight:600}}>{Math.round(activity.avg_watts)}W</span>}
          {activity.avg_hr&&activity.avg_hr>0&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'#ef4444',fontWeight:600}}>{Math.round(activity.avg_hr)} bpm</span>}
          {activity.tss&&activity.tss>0&&<span style={{fontSize:10,fontFamily:'DM Mono,monospace',color:'#5b6fff',fontWeight:600}}>{Math.round(activity.tss)} TSS</span>}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
        <span style={{fontSize:8,padding:'2px 6px',borderRadius:20,background:statusCfg.bg,border:`1px solid ${statusCfg.color}28`,color:statusCfg.color,fontWeight:700}}>{statusCfg.label}</span>
        <span style={{color:'var(--text-dim)',fontSize:15}}>›</span>
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
      <div style={{marginBottom:16}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,letterSpacing:'-0.03em',margin:0}}>Activités</h1>
        <p style={{fontSize:12,color:'var(--text-dim)',margin:'4px 0 0'}}>{total>0?`${total} activité${total>1?'s':''}`:' Connectez vos apps pour importer vos séances'}</p>
      </div>

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
      <div style={{position:'relative',marginBottom:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
          style={{width:'100%',padding:'9px 14px 9px 36px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:13,outline:'none'}}/>
        <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--text-dim)'}}>🔍</span>
        {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:17}}>×</button>}
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
    </div>
  )
}
