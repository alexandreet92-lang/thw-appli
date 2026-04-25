'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import { AnimatedBar, CountUp } from '@/components/ui/AnimatedBar'
import { SkeletonPlanningGrid } from '@/components/ui/Skeleton'
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '@/components/ui/ScrollReveal'

// ── Types ─────────────────────────────────────────
type PlanningTab   = 'training' | 'week'
type PlanVariant   = 'A' | 'B'
type WeekRange     = 1 | 5 | 10
type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym'
type SessionStatus = 'planned' | 'done'
type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown'
type BlockMode     = 'single' | 'interval'
type TaskType      = 'sport' | 'work' | 'personal' | 'recovery'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type CalView       = 'year' | 'month'
type TrainingView  = 'horizontal' | 'vertical'
type RaceSport     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'
type CyclingSub    = 'velo' | 'vtt' | 'ht' | 'elliptique'

// ── Constants ─────────────────────────────────────
const SPORT_BG: Record<SportType,string>     = { swim:'rgba(6,182,212,0.13)', run:'rgba(249,115,22,0.13)', bike:'rgba(59,130,246,0.13)', hyrox:'rgba(236,72,153,0.13)', gym:'rgba(139,92,246,0.13)', rowing:'rgba(20,184,166,0.13)' }
const SPORT_BORDER: Record<SportType,string> = { swim:'#06b6d4', run:'#f97316', bike:'#3b82f6', hyrox:'#ec4899', gym:'#8b5cf6', rowing:'#14b8a6' }
const SPORT_EMOJI: Record<SportType,string>  = { run:'🏃', bike:'🚴', swim:'🏊', hyrox:'🏋️', gym:'💪', rowing:'🚣' }
const SPORT_LABEL: Record<SportType,string>  = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation', rowing:'Aviron' }
const SPORT_ABBR: Record<SportType,string>   = { run:'RUN', bike:'BIKE', swim:'SWIM', hyrox:'HRX', gym:'GYM', rowing:'ROW' }
const CYCLING_SUB_LABEL: Record<CyclingSub,string> = { velo:'Vélo route', vtt:'VTT', ht:'Home Trainer', elliptique:'Elliptique' }
const TRAINING_TYPES: Partial<Record<SportType,string[]>> = {
  run:   ['EF','SL1','SL2','VMA','Strides','Heat Training'],
  bike:  ['EF','SL1','SL2','PMA','Sprints','Heat Training'],
  swim:  ['EF','Technique','Seuil','Sprints'],
  hyrox: ['Simulation','Ergo','Wall Ball','BBJ','Fentes','Sled Push','Sled Pull','Farmer Carry'],
  gym:   ['Strength','Strength endurance','Explosivité'],
  rowing:['EF','SL1','SL2','PMA','Sprints'],
}
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
const RACE_SPORT_COLOR: Record<RaceSport,{border:string;bg:string}> = {
  run:     { border:'#f97316', bg:'rgba(249,115,22,0.13)'  },
  bike:    { border:'#3b82f6', bg:'rgba(59,130,246,0.13)'  },
  swim:    { border:'#06b6d4', bg:'rgba(6,182,212,0.13)'   },
  hyrox:   { border:'#ec4899', bg:'rgba(236,72,153,0.13)'  },
  triathlon:{ border:'#a855f7',bg:'rgba(168,85,247,0.13)'  },
  rowing:  { border:'#14b8a6', bg:'rgba(20,184,166,0.13)'  },
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
  tss?:number
  matchedSessionId?:string
}
interface Block {
  id:string; mode:BlockMode; type:BlockType; durationMin:number; zone:number; value:string; hrAvg:string; label:string
  reps?:number; effortMin?:number; recoveryMin?:number; recoveryZone?:number
}
interface Session {
  id:string; sport:SportType; title:string; time:string; durationMin:number
  tss?:number; main?:boolean; status:SessionStatus; notes?:string; blocks:Block[]
  rpe?:number; dayIndex:number; planVariant?:PlanVariant
  vDuration?:string; vDistance?:string; vElevation?:string; vSpeed?:string
  vHrAvg?:string; vPace?:string
  vHyroxStations?: Record<string,string>; vHyroxRuns?: string[]
  vSwimTime?:string; vBikeTime?:string; vRunTime?:string; vT1?:string; vT2?:string
  vRpe?:number; vSplits?:string[]; vTempMax?:string; vHumidity?:string; vAltMax?:string; vNotes?:string
  vWattsAvg?:string; vWattsWeighted?:string; vCadenceAvg?:string; vCadenceMax?:string
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
interface AnalyzeIssue { title:string; severity:'low'|'medium'|'high'; description:string }
interface AnalyzeResult { score:number; summary:string; issues:AnalyzeIssue[]; suggestions:string[]; optimized_plan:{day:string;title:string;durationMin:number}[] }

// ── Helpers ───────────────────────────────────────
function uid():string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function hMinToMin(h:number,m:number):number { return h*60+m }
function minToHMin(total:number):{ h:number; m:number } { return { h:Math.floor(total/60), m:total%60 } }
function formatHM(totalMin:number):string {
  const h=Math.floor(totalMin/60), m=totalMin%60
  if(h===0) return `${m}min`
  return m===0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`
}
// Keep formatDur as alias for backward compat in display
function formatDur(min:number):string { return formatHM(min) }
function daysUntil(d:string):number { return Math.ceil((new Date(d).getTime()-Date.now())/(1000*60*60*24)) }
function calcSpeed(km:string,t:string):string { const d=parseFloat(km),m=parseFloat(t); if(!d||!m)return '—'; return `${(d/(m/60)).toFixed(1)} km/h` }

// Normalise un bloc en provenance de planned_sessions.blocks (JSONB) vers
// le shape Block utilisé en UI. Le Coach IA stocke les blocs au format
// agent (français : nom, duree_min, zone, repetitions, recup_min, watts,
// allure, consigne). Sans cette conversion, formatHM(undefined) produit
// "NaNhNaN" et value/hrAvg sont vides.
// Compat : si le bloc est déjà au shape Block (id + durationMin présents),
// on le retourne tel quel.
function normalizeBlock(raw:unknown):Block|null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string,unknown>

  // Déjà au shape Block (édition manuelle, BlockBuilder)
  if (typeof r.id === 'string' && typeof r.durationMin === 'number') {
    return r as unknown as Block
  }

  // Shape agent (training-plan)
  const dureeMin    = typeof r.duree_min    === 'number' ? r.duree_min    : 0
  const zone        = typeof r.zone         === 'number' ? Math.max(1, Math.min(5, r.zone)) : 1
  const repetitions = typeof r.repetitions  === 'number' ? r.repetitions  : 0
  const recupMin    = typeof r.recup_min    === 'number' ? r.recup_min    : 0
  const watts       = typeof r.watts        === 'number' ? r.watts        : null
  const allure      = typeof r.allure       === 'string' ? r.allure       : null
  const nom         = typeof r.nom          === 'string' ? r.nom          : 'Bloc'
  const consigne    = typeof r.consigne     === 'string' ? r.consigne     : ''

  // Détection interval vs single
  let mode:BlockMode = 'single'
  let durationMin = dureeMin
  let reps:number|undefined; let effortMin:number|undefined; let recoveryMin:number|undefined; let recoveryZone:number|undefined
  if (repetitions > 1 && dureeMin > 0) {
    mode = 'interval'
    reps = repetitions
    effortMin = dureeMin
    recoveryMin = recupMin
    recoveryZone = 1
    durationMin = repetitions * (dureeMin + recupMin)
  }

  // Détection type (warmup/effort/recovery/cooldown) depuis le nom
  let type:BlockType = 'effort'
  const ln = nom.toLowerCase()
  if (ln.includes('échauffe') || ln.includes('echauffe') || ln.includes('warm')) type = 'warmup'
  else if (ln.includes('retour au calme') || ln.includes('cool') || ln.includes('cooldown')) type = 'cooldown'
  else if (zone <= 1 && ln.includes('récup')) type = 'recovery'

  // value = watts (bike) ou allure (run/swim) — sinon vide
  const value = watts != null ? String(watts) : (allure ?? '')

  // Label = nom court ; consigne ajoutée en infobulle si dispo
  const label = consigne ? `${nom} — ${consigne}` : nom

  // ID synthétique stable pour React keys (basé sur nom + zone + duree)
  const id = `b_${nom.replace(/\s+/g,'_').slice(0,16)}_${zone}_${dureeMin}_${repetitions}_${Math.random().toString(36).slice(2,6)}`

  return { id, mode, type, durationMin, zone, value, hrAvg:'', label, reps, effortMin, recoveryMin, recoveryZone }
}

function normalizeBlocks(raw:unknown):Block[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeBlock).filter((b):b is Block => b !== null)
}

// Parse un bloc muscu pour en extraire la structure exercice :
//   nom, sets × reps, charge si présente.
// Le Coach IA produit des labels libres type "Squat 4×10 @100kg" ou
// "Développé couché 3 séries × 8 reps". Si rien ne matche, on retourne
// le label brut comme nom.
function parseGymExercise(b:Block): {
  nom:string; sets?:number; reps?:number; charge?:string; duree?:number; consigne?:string
} {
  let label = (b.label ?? '').trim()
  // La consigne (texte après " — ") a été agrégée dans label par normalizeBlock.
  // On la sépare pour l'afficher distinctement.
  let consigne:string|undefined
  const dashSplit = label.split(/\s+—\s+/)
  if (dashSplit.length > 1) {
    consigne = dashSplit.slice(1).join(' — ')
    label = dashSplit[0]
  }

  // Pattern N × M (séries × reps) — accepte ×, x, *, X
  let sets:number|undefined; let reps:number|undefined
  const m = label.match(/(\d+)\s*[×xX*]\s*(\d+)/)
  if (m) {
    sets = parseInt(m[1], 10)
    reps = parseInt(m[2], 10)
    label = label.replace(m[0], '').trim()
  } else if (b.reps && b.reps > 0) {
    // Fallback : si l'agent a posé repetitions sur le bloc directement.
    sets = b.reps
  }

  // Pattern charge : "@100kg", "100kg", "à 80kg"
  let charge:string|undefined
  const w = label.match(/(?:@|à\s+)?\s*([\d]+(?:[.,]\d+)?\s*(?:kg|lbs?|%))/i)
  if (w) {
    charge = w[1].replace(/\s+/g,'').replace(',','.')
    label = label.replace(w[0], '').trim()
  }

  // Nettoyage : tirets, espaces, : en fin de label
  label = label.replace(/[—–\-:]+$/g, '').trim()
  // Si trop court après cleanup, on ressort le label original
  if (!label) label = (b.label ?? '').trim() || 'Exercice'

  return { nom:label, sets, reps, charge, duree:b.durationMin, consigne }
}
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

function calcTSS(blocks:Block[], sport:SportType, totalMin?:number, rpe?:number):number {
  const IF_BY_ZONE = [0.55,0.70,0.83,0.95,1.10]
  const SPORT_FACTOR: Partial<Record<SportType,number>> = {
    bike:1.0, run:0.9, swim:0.85, rowing:0.95, hyrox:1.05, gym:0.7
  }
  const sf = SPORT_FACTOR[sport] ?? 0.9

  if(blocks.length>0) {
    return Math.round(blocks.reduce((total,b)=>{
      if(b.mode==='interval' && b.reps && b.effortMin && b.recoveryMin) {
        const ifE = IF_BY_ZONE[b.zone-1] ?? 0.83
        const recZone = b.recoveryZone ?? 1
        const ifR = IF_BY_ZONE[recZone-1] ?? 0.55
        const effortTss = b.reps*(b.effortMin/60)*ifE*ifE*100*sf
        const recovTss  = b.reps*(b.recoveryMin/60)*ifR*ifR*100*sf
        return total+effortTss+recovTss
      }
      const IF = IF_BY_ZONE[b.zone-1] ?? 0.70
      return total+(b.durationMin/60)*IF*IF*100*sf
    },0))
  }

  if(totalMin && rpe) {
    const ifFromRpe = 0.45+(rpe/10)*0.7
    return Math.round((totalMin/60)*ifFromRpe*ifFromRpe*100*sf)
  }

  if(totalMin) {
    return Math.round((totalMin/60)*0.70*0.70*100*sf)
  }

  return 0
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
  const m:Record<string,SportType>={running:'run',cycling:'bike',virtual_ride:'bike',virtual_bike:'bike',swimming:'swim',trail_run:'run',trail_running:'run',triathlon:'run'}
  return m[s]??((['run','bike','swim','hyrox','gym','rowing'] as SportType[]).includes(s as SportType)?s as SportType:'run')
}

function matchActivity(activity:TrainingActivity, sessions:Session[]):Session|null {
  const actMin = Math.round(activity.elapsedTime/60)
  const actSport = normalizeSportType(activity.sport)
  const candidates = sessions.filter(s=>
    s.dayIndex===activity.dayIndex &&
    s.sport===actSport &&
    s.status!=='done'
  )
  if(candidates.length===0) return null
  const sorted = candidates.slice().sort((a,b)=>
    Math.abs(a.durationMin-actMin)-Math.abs(b.durationMin-actMin)
  )
  const best = sorted[0]
  const tolerance = Math.max(best.durationMin*0.5, 20)
  return Math.abs(best.durationMin-actMin)<=tolerance ? best : null
}

function matchStatus(plannedMin:number, doneMin:number):{label:string;color:string} {
  const diff = (doneMin-plannedMin)/plannedMin
  if(Math.abs(diff)<=0.15) return { label:'Conforme', color:'#22c55e' }
  if(diff<-0.4) return { label:'Écourtée', color:'#ef4444' }
  if(diff>0.4)  return { label:'Prolongée', color:'#f97316' }
  if(diff<0)    return { label:'Écourtée', color:'#f97316' }
  return { label:'Prolongée', color:'#f97316' }
}

// ── SportBadge component ──────────────────────────
function SportBadge({ sport, size='sm' }:{ sport:SportType; size?:'sm'|'xs' }) {
  const col = SPORT_BORDER[sport]
  const sz = size==='xs'
    ? { fontSize:7, padding:'1px 4px', borderRadius:3 }
    : { fontSize:8, padding:'2px 5px', borderRadius:4 }
  return (
    <span style={{ background:`${col}22`, color:col, fontWeight:800, letterSpacing:'0.04em', ...sz }}>
      {SPORT_ABBR[sport]}
    </span>
  )
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
      // Colonnes réelles de la table activities (vérifiées sur activities/page.tsx)
      supabase.from('activities').select('id,sport_type,title,started_at,moving_time_s,elapsed_time_s,distance_m,tss')
        .gte('started_at',weekStart+'T00:00:00').lt('started_at',weekEndStr+'T00:00:00'),
    ])
    setSessions((s.data??[]).map((r:any):Session=>({
      id:r.id, dayIndex:r.day_index, sport:normalizeSportType(r.sport), title:r.title,
      time:r.time??'09:00', durationMin:r.duration_min, tss:r.tss,
      status:r.status, notes:r.notes, rpe:r.rpe, blocks:normalizeBlocks(r.blocks), main:false,
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
      // moving_time_s en secondes → elapsedTime en secondes (formatDur attend des minutes → on divise par 60 à l'affichage)
      return { id:a.id, sport:a.sport_type??'run', name:a.title??'Activité',
        startedAt:a.started_at, elapsedTime:a.moving_time_s??a.elapsed_time_s??0,
        dayIndex:dow, weekStart, distance:a.distance_m,
        startHour:d.getHours(), startMin:d.getMinutes(), tss:a.tss??undefined }
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

// ── Activité quick-view (clic depuis Planning) ───────────────
function ActivityQuickModal({ activity, onClose }:{ activity:TrainingActivity; onClose:()=>void }) {
  const sp = normalizeSportType(activity.sport)
  const dateObj = new Date(activity.startedAt)
  const dateStr = dateObj.toLocaleDateString('fr-FR',{ weekday:'long', day:'numeric', month:'long' })
  const durationMin = Math.round(activity.elapsedTime/60)
  const distKm = activity.distance ? (activity.distance/1000).toFixed(1) : null
  const col = SPORT_BORDER[sp]
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(5px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:`1px solid ${col}44`,padding:22,maxWidth:380,width:'100%',boxShadow:`0 0 0 1px ${col}22,var(--shadow-card)` }}>
        {/* En-tête */}
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:18 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:SPORT_BG[sp],border:`1px solid ${col}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <SportBadge sport={sp} size="sm"/>
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ marginBottom:3 }}>
              <span style={{ fontSize:8,fontWeight:800,background:col,color:'#fff',padding:'2px 6px',borderRadius:4,letterSpacing:'0.06em' }}>RÉALISÉ</span>
            </div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{activity.name}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:17,flexShrink:0 }}>×</button>
        </div>

        {/* Métriques */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16 }}>
          {[
            { label:'Sport',   value:SPORT_LABEL[sp] },
            { label:'Date',    value:dateStr, small:true },
            { label:'Heure',   value:`${String(activity.startHour).padStart(2,'0')}:${String(activity.startMin).padStart(2,'0')}`, mono:true },
            { label:'Durée',   value:formatDur(durationMin), mono:true },
            ...(distKm ? [{ label:'Distance', value:`${distKm} km`, mono:true }] : []),
            ...(activity.tss ? [{ label:'TSS', value:`${Math.round(activity.tss)} pts`, mono:true, color:'#5b6fff' }] : []),
          ].map(({ label, value, mono, small, color })=>(
            <div key={label} style={{ background:'var(--bg-card2)',borderRadius:10,padding:'10px 12px' }}>
              <p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 3px',textTransform:'uppercase' as const,letterSpacing:'0.07em' }}>{label}</p>
              <p style={{ fontSize:small?11:13,fontWeight:700,margin:0,fontFamily:mono?'DM Mono,monospace':'inherit',color:color??'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Bouton vers Training */}
        <a href={`/activities?id=${activity.id}`}
          style={{ display:'block',textAlign:'center' as const,padding:'12px 16px',borderRadius:11,background:`linear-gradient(135deg,${col},${col}bb)`,color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,textDecoration:'none',letterSpacing:'0.02em' }}>
          Voir les détails →
        </a>
      </div>
    </div>
  )
}

function BlockBuilder({ sport, blocks, onChange }:{ sport:SportType; blocks:Block[]; onChange:(b:Block[])=>void }) {
  const vLabel = sport==='bike'?'Watts':sport==='swim'?'Allure /100m':'Allure /km'
  const vPlh   = sport==='bike'?'250':sport==='swim'?'1:35':'4:30'
  function addSingle() { onChange([...blocks,{id:`b_${Date.now()}`,mode:'single',type:'effort',durationMin:10,zone:3,value:sport==='bike'?'220':'4:30',hrAvg:'',label:'Bloc'}]) }
  function addInterval() { onChange([...blocks,{id:`b_${Date.now()}`,mode:'interval',type:'effort',durationMin:0,zone:4,value:'',hrAvg:'',label:'',reps:5,effortMin:4,recoveryMin:1,recoveryZone:1}]) }
  function upd(id:string,field:keyof Block,val:string|number) { onChange(blocks.map(b=>{ if(b.id!==id)return b; const u:Block={...b,[field]:val}; if(field==='value')u.zone=getZone(sport,String(val)); if(u.mode==='interval'&&u.reps&&u.effortMin&&u.recoveryMin)u.durationMin=u.reps*(u.effortMin+u.recoveryMin); return u })) }
  const totalMin = blocks.reduce((s,b)=>{
    if(b.mode==='interval'&&b.reps&&b.effortMin&&b.recoveryMin) return s+b.reps*(b.effortMin+b.recoveryMin)
    return s+b.durationMin
  },0)
  return (
    <div>
      {blocks.length>0 && (
        <div style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',marginBottom:10 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',marginBottom:7 }}>
            TSS estimé : <span style={{ color:SPORT_BORDER[sport] }}>{calcTSS(blocks,sport)} pts</span>
            <span style={{ marginLeft:10,fontWeight:400 }}>· {formatHM(totalMin)}</span>
          </p>
          <div style={{ display:'flex',alignItems:'flex-end',gap:2,height:48,marginBottom:4 }}>
            {blocks.map(b=>{ const bMin=b.mode==='interval'&&b.reps&&b.effortMin&&b.recoveryMin?b.reps*(b.effortMin+b.recoveryMin):b.durationMin; const hp=((b.zone/5)*0.85+0.05)*100,wp=totalMin?(bMin/totalMin)*100:0,c=ZONE_COLORS[b.zone-1]; return <div key={b.id} style={{ width:`${wp}%`,height:`${hp}%`,background:`linear-gradient(180deg,${c}ee,${c}55)`,borderRadius:'3px 3px 0 0',border:`1px solid ${c}88`,minWidth:4 }}/> })}
          </div>
        </div>
      )}
      <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:7 }}>
        {blocks.map(b=>(
          <div key={b.id} style={{ background:'var(--bg-card2)',border:`1px solid ${ZONE_COLORS[b.zone-1]}44`,borderLeft:`3px solid ${ZONE_COLORS[b.zone-1]}`,borderRadius:8,padding:'7px 9px' }}>
            {b.mode==='interval' ? (
              // ── Interval block ──
              <div>
                <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:6 }}>
                  <span style={{ fontSize:9,fontWeight:800,color:'#a78bfa',background:'rgba(167,139,250,0.15)',padding:'2px 6px',borderRadius:4 }}>REPS</span>
                  <span style={{ flex:1,fontSize:10,fontWeight:600,color:'var(--text)' }}>
                    {b.reps} × {b.effortMin}{'\''}
                    <span style={{ color:ZONE_COLORS[b.zone-1] }}> Z{b.zone}</span>
                    {' / '}{b.recoveryMin}{'\''}
                    <span style={{ color:ZONE_COLORS[(b.recoveryZone??1)-1] }}> Z{b.recoveryZone??1}</span>
                    {b.reps&&b.effortMin&&b.recoveryMin?<span style={{ color:'var(--text-dim)',marginLeft:6 }}>= {formatHM(b.reps*(b.effortMin+b.recoveryMin))}</span>:null}
                  </span>
                  <button onClick={()=>onChange(blocks.filter(x=>x.id!==b.id))} style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:13,flexShrink:0 }}>×</button>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:5 }}>
                  <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Rép.</p><input type="number" min={1} value={b.reps??5} onChange={e=>upd(b.id,'reps',parseInt(e.target.value)||1)} style={{ width:'100%',padding:'4px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
                  <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Effort</p><input type="number" min={0.5} step={0.5} value={b.effortMin??4} onChange={e=>upd(b.id,'effortMin',parseFloat(e.target.value)||0.5)} style={{ width:'100%',padding:'4px 5px',borderRadius:5,border:`1px solid ${ZONE_COLORS[b.zone-1]}66`,background:`${ZONE_COLORS[b.zone-1]}11`,color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
                  <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Z effort</p><input type="number" min={1} max={5} value={b.zone} onChange={e=>upd(b.id,'zone',parseInt(e.target.value)||3)} style={{ width:'100%',padding:'4px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
                  <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Récup</p><input type="number" min={0.5} step={0.5} value={b.recoveryMin??1} onChange={e=>upd(b.id,'recoveryMin',parseFloat(e.target.value)||0.5)} style={{ width:'100%',padding:'4px 5px',borderRadius:5,border:`1px solid ${ZONE_COLORS[(b.recoveryZone??1)-1]}66`,background:`${ZONE_COLORS[(b.recoveryZone??1)-1]}11`,color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
                  <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Z récup</p><input type="number" min={1} max={5} value={b.recoveryZone??1} onChange={e=>upd(b.id,'recoveryZone',parseInt(e.target.value)||1)} style={{ width:'100%',padding:'4px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
                </div>
              </div>
            ) : (
              // ── Single block ──
              <>
            <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:6 }}>
              <span style={{ width:20,height:20,borderRadius:4,background:`${ZONE_COLORS[b.zone-1]}22`,border:`1px solid ${ZONE_COLORS[b.zone-1]}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:ZONE_COLORS[b.zone-1],flexShrink:0 }}>Z{b.zone}</span>
              <select value={b.type} onChange={e=>upd(b.id,'type',e.target.value)} style={{ flex:1,padding:'3px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none' }}>
                {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <input value={b.label} onChange={e=>upd(b.id,'label',e.target.value)} placeholder="Nom" style={{ flex:1.5,padding:'3px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none' }}/>
              <button onClick={()=>onChange(blocks.filter(x=>x.id!==b.id))} style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:13,flexShrink:0 }}>×</button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5 }}>
              <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>Durée (min)</p><input type="number" value={b.durationMin} onChange={e=>upd(b.id,'durationMin',parseInt(e.target.value)||0)} style={{ width:'100%',padding:'4px 6px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
              <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>{vLabel}</p><input value={b.value} onChange={e=>upd(b.id,'value',e.target.value)} placeholder={vPlh} style={{ width:'100%',padding:'4px 6px',borderRadius:5,border:`1px solid ${ZONE_COLORS[b.zone-1]}66`,background:`${ZONE_COLORS[b.zone-1]}11`,color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
              <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:2 }}>FC moy.</p><input value={b.hrAvg} onChange={e=>upd(b.id,'hrAvg',e.target.value)} placeholder="158" style={{ width:'100%',padding:'4px 6px',borderRadius:5,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:10,outline:'none',fontFamily:'DM Mono,monospace' }}/></div>
            </div>
            </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display:'flex',gap:6 }}>
        <button onClick={addSingle} style={{ flex:1,padding:'7px',borderRadius:8,background:'transparent',border:'1px dashed var(--border-mid)',color:'var(--text-dim)',fontSize:11,cursor:'pointer' }}>+ Bloc simple</button>
        <button onClick={addInterval} style={{ flex:1,padding:'7px',borderRadius:8,background:'transparent',border:'1px dashed #a78bfa66',color:'#a78bfa',fontSize:11,cursor:'pointer' }}>+ Répétitions</button>
      </div>
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
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16 }}>×</button>
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
// AI PLAN HEADER + GRAPHICS
// (visible quand la semaine courante appartient à un training_plans actif)
// ════════════════════════════════════════════════

interface AiPlanBloc {
  nom: string
  type: string
  semaine_debut: number
  semaine_fin: number
  description?: string
  volume_hebdo_h?: number
}
interface AiPlanWeekMeta {
  numero: number
  type?: string
  theme?: string
  volume_h?: number
  tss_semaine?: number
}
interface AiTrainingPlan {
  id: string
  name: string
  objectif_principal: string | null
  duree_semaines: number
  start_date: string
  end_date: string
  sports: string[]
  blocs_periodisation: AiPlanBloc[]
  conseils_adaptation: string[]
  points_cles: string[]
  ai_context: {
    program?: { semaines?: AiPlanWeekMeta[] }
  } | null
  status: string
}
interface AiPlanSessionAgg {
  sport: string | null
  duration_min: number | null
  intensity: string | null
  week_start: string
}

const TP_BLOC_COLORS: Record<string, string> = {
  'Base':        '#3b82f6',
  'Intensité':   '#f97316',
  'Spécifique':  '#ef4444',
  'Deload':      '#22c55e',
  'Compétition': '#a855f7',
}

function safeWeekTypeBg(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase()
  if (t.includes('deload')) return '#86efac'
  if (t.includes('base')) return '#2563eb'
  if (t.includes('intensit')) return '#f97316'
  if (t.includes('spécif') || t.includes('specif')) return '#ef4444'
  return '#8b5cf6'
}

const SPORT_COLOR_FALLBACK: Record<string, string> = {
  natation:   '#38bdf8',
  cyclisme:   '#3b82f6',
  course:     '#22c55e',
  running:    '#22c55e',
  run:        '#22c55e',
  musculation:'#f97316',
  gym:        '#f97316',
  hyrox:      '#ef4444',
  aviron:     '#14b8a6',
  rowing:     '#14b8a6',
  swim:       '#38bdf8',
  bike:       '#3b82f6',
}
function sportColor(sport: string): string {
  const k = sport.toLowerCase()
  return SPORT_COLOR_FALLBACK[k] ?? '#8b5cf6'
}

function fmtFrenchDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function PlanHeaderAndGraphics({ plan, sessions, currentWeekStart }: {
  plan: AiTrainingPlan
  sessions: AiPlanSessionAgg[]
  currentWeekStart: string
}) {
  const [open, setOpen] = useState(true)

  // Numéro de semaine courante dans le plan
  const startMs = new Date(plan.start_date + 'T00:00:00').getTime()
  const curMs   = new Date(currentWeekStart + 'T00:00:00').getTime()
  const idx     = Math.round((curMs - startMs) / (7 * 86400000))
  const currentWeekNum = Math.max(1, Math.min(plan.duree_semaines, idx + 1))

  // Volume par sport (depuis sessions S1-S2 réellement insérées)
  const volBySportEntries: { sport: string; hours: number }[] = (() => {
    const map = new Map<string, number>()
    for (const s of sessions) {
      if (!s.sport) continue
      map.set(s.sport, (map.get(s.sport) ?? 0) + (s.duration_min ?? 0))
    }
    return Array.from(map.entries())
      .map(([sport, mins]) => ({ sport, hours: mins / 60 }))
      .sort((a, b) => b.hours - a.hours)
  })()
  const maxSportHours = Math.max(...volBySportEntries.map(e => e.hours), 1)

  // Distribution intensités
  const intensityEntries: { key: string; mins: number; color: string; label: string }[] = (() => {
    const map = new Map<string, number>()
    for (const s of sessions) {
      const k = s.intensity ?? 'unknown'
      map.set(k, (map.get(k) ?? 0) + (s.duration_min ?? 0))
    }
    const META: Record<string, { color: string; label: string }> = {
      low:      { color: '#22c55e', label: 'Facile' },
      moderate: { color: '#eab308', label: 'Modéré' },
      high:     { color: '#f97316', label: 'Intense' },
      max:      { color: '#ef4444', label: 'Max' },
      unknown:  { color: '#9ca3af', label: 'N/D' },
    }
    return Array.from(map.entries())
      .map(([key, mins]) => ({ key, mins, ...(META[key] ?? META.unknown) }))
      .sort((a, b) => b.mins - a.mins)
  })()
  const totalIntMins = intensityEntries.reduce((s, e) => s + e.mins, 0)

  // Volume hebdo : depuis ai_context.program.semaines (toutes les semaines)
  const weekly = plan.ai_context?.program?.semaines ?? []
  const maxWeekH = Math.max(...weekly.map(w => w.volume_h ?? 0), 1)

  // Graphiques constants
  const PERIOD_W = 400, PERIOD_H = 50
  const VOL_W   = 460, VOL_H   = 90
  const Y_PAD   = 28

  return (
    <div style={{
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
      padding: 16,
      marginBottom: 8,
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Plan en cours
          </p>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '2px 0 4px', fontFamily: 'Syne,sans-serif', lineHeight: 1.2 }}>
            {plan.name}
          </p>
          {plan.objectif_principal && (
            <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: '0 0 6px', lineHeight: 1.45 }}>
              {plan.objectif_principal}
            </p>
          )}
          {/* Progress bar S{N}/{total} */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', minWidth: 50, fontVariantNumeric: 'tabular-nums' }}>
              S{currentWeekNum}/{plan.duree_semaines}
            </span>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(139,92,246,0.12)', overflow: 'hidden' }}>
              <div style={{
                width: `${(currentWeekNum / plan.duree_semaines) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg,#8b5cf6,#5b6fff)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>
            Du {fmtFrenchDate(plan.start_date)} au {fmtFrenchDate(plan.end_date)}
          </p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            border: '1px solid var(--border)', background: 'transparent',
            borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--text-mid)',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          {open ? '▲ Masquer graphiques' : '▼ Voir graphiques'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* PÉRIODISATION */}
          {plan.blocs_periodisation.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', margin: '0 0 8px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                Périodisation
              </p>
              <svg width="100%" viewBox={`0 0 ${PERIOD_W} ${PERIOD_H}`} preserveAspectRatio="none" style={{ display: 'block', borderRadius: 6, marginBottom: 6 }}>
                {(() => {
                  const total = plan.duree_semaines || 1
                  let offX = 0
                  return plan.blocs_periodisation.map((b, i) => {
                    const dur = (b.semaine_fin - b.semaine_debut + 1)
                    const w   = (dur / total) * PERIOD_W
                    const x   = offX
                    offX += w
                    const color = TP_BLOC_COLORS[b.type] ?? '#6b7280'
                    return (
                      <g key={i}>
                        <rect x={x} y={0} width={w} height={PERIOD_H} fill={color} opacity={0.85}>
                          <title>{`${b.nom} — ${b.type}\nS${b.semaine_debut} à S${b.semaine_fin} (${dur} sem)\n${b.description ?? ''}`}</title>
                        </rect>
                        {/* Marqueur semaine courante */}
                        {currentWeekNum >= b.semaine_debut && currentWeekNum <= b.semaine_fin && (
                          <line
                            x1={x + ((currentWeekNum - b.semaine_debut + 0.5) / dur) * w}
                            x2={x + ((currentWeekNum - b.semaine_debut + 0.5) / dur) * w}
                            y1={0} y2={PERIOD_H}
                            stroke="#fff" strokeWidth={2} opacity={0.95}
                          />
                        )}
                      </g>
                    )
                  })
                })()}
              </svg>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {plan.blocs_periodisation.map((b, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-dim)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: TP_BLOC_COLORS[b.type] ?? '#6b7280' }} />
                    {b.nom} · S{b.semaine_debut}-S{b.semaine_fin}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* VOLUME HEBDO */}
          {weekly.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', margin: 0, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  Volume hebdomadaire
                </p>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  max {Math.round(maxWeekH)}h · semaine active surlignée
                </span>
              </div>
              <svg width="100%" viewBox={`0 0 ${VOL_W + Y_PAD} ${VOL_H + 18}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                {[0, 0.5, 1].map((frac, i) => {
                  const y  = VOL_H - frac * VOL_H
                  const v  = Math.round(maxWeekH * frac)
                  return (
                    <g key={i}>
                      <line x1={Y_PAD} y1={y} x2={VOL_W + Y_PAD} y2={y} stroke="rgba(107,114,128,0.20)" strokeWidth={1} strokeDasharray="3 3" />
                      <text x={Y_PAD - 3} y={y + 3} textAnchor="end" fontSize={9} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{v}h</text>
                    </g>
                  )
                })}
                {weekly.map((sem, i) => {
                  const stepX = VOL_W / weekly.length
                  const barW  = Math.max(2, stepX - 2)
                  const h     = Math.max(2, ((sem.volume_h ?? 0) / maxWeekH) * VOL_H)
                  const x     = Y_PAD + i * stepX + (stepX - barW) / 2
                  const y     = VOL_H - h
                  const isActive = sem.numero === currentWeekNum
                  return (
                    <g key={i}>
                      <rect
                        x={x} y={y} width={barW} height={h}
                        fill={safeWeekTypeBg(sem.type)} opacity={isActive ? 1 : 0.55}
                        stroke={isActive ? '#00c8e0' : 'none'} strokeWidth={isActive ? 2 : 0}
                        rx={2}
                      >
                        <title>{`S${sem.numero} — ${sem.theme ?? ''}\n${sem.volume_h ?? 0}h · TSS ${sem.tss_semaine ?? '?'}`}</title>
                      </rect>
                    </g>
                  )
                })}
                {/* Labels sous l'axe — uniquement S1, mid, last + active */}
                {weekly.map((sem, i) => {
                  const stepX = VOL_W / weekly.length
                  const showLabel = i === 0 || i === weekly.length - 1 || sem.numero === currentWeekNum || (weekly.length > 8 && i === Math.floor(weekly.length / 2))
                  if (!showLabel) return null
                  return (
                    <text
                      key={`lbl-${i}`}
                      x={Y_PAD + i * stepX + stepX / 2}
                      y={VOL_H + 13}
                      textAnchor="middle" fontSize={9}
                      fill={sem.numero === currentWeekNum ? '#00c8e0' : 'var(--text-dim)'}
                      fontWeight={sem.numero === currentWeekNum ? 700 : 400}
                    >
                      S{sem.numero}
                    </text>
                  )
                })}
              </svg>
            </div>
          )}

          {/* VOLUME PAR SPORT */}
          {volBySportEntries.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', margin: '0 0 6px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                Volume par sport <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>· estimé sur S1-S2 détaillées</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {volBySportEntries.map(e => (
                  <div key={e.sport} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 80, textTransform: 'capitalize' }}>
                      {e.sport}
                    </span>
                    <div style={{ flex: 1, height: 12, background: 'rgba(107,114,128,0.10)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(e.hours / maxSportHours) * 100}%`,
                        height: '100%',
                        background: sportColor(e.sport),
                        opacity: 0.85,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text)', minWidth: 50, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {e.hours.toFixed(1)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DISTRIBUTION INTENSITÉS */}
          {intensityEntries.length > 0 && totalIntMins > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', margin: '0 0 6px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                Distribution intensités <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>· estimé sur S1-S2</span>
              </p>
              {/* Stacked horizontal bar */}
              <div style={{ display: 'flex', height: 18, borderRadius: 5, overflow: 'hidden', background: 'rgba(107,114,128,0.08)' }}>
                {intensityEntries.map(e => {
                  const pct = (e.mins / totalIntMins) * 100
                  if (pct < 1) return null
                  return (
                    <div key={e.key} style={{
                      width: `${pct}%`,
                      background: e.color,
                      opacity: 0.85,
                    }} title={`${e.label} — ${Math.round(e.mins / 60 * 10) / 10}h (${pct.toFixed(0)}%)`} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
                {intensityEntries.map(e => {
                  const pct = (e.mins / totalIntMins) * 100
                  return (
                    <span key={e.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-dim)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: e.color }} />
                      {e.label} <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// TRAINING TAB
// ════════════════════════════════════════════════
function TrainingTab() {
  // Lit un éventuel ?week=YYYY-MM-DD dans l'URL pour positionner le
  // weekOffset initial — utile après "Ajouter au Planning" depuis le
  // Coach IA, qui redirige sur la semaine de début du programme.
  const searchParams = useSearchParams()
  const [weekOffset,  setWeekOffset]  = useState(() => {
    const weekParam = searchParams?.get('week') ?? null
    if (!weekParam) return 0
    try {
      const target  = new Date(weekParam + 'T00:00:00')
      const current = new Date(getWeekStart() + 'T00:00:00')
      const diffMs  = target.getTime() - current.getTime()
      return Math.round(diffMs / (7 * 86400000))
    } catch { return 0 }
  })
  const [weekRange,   setWeekRange]   = useState<WeekRange>(1)
  const [activePlan,  setActivePlan]  = useState<PlanVariant>('A')
  const [compareMode, setCompareMode] = useState(false)
  const [showRangeDd, setShowRangeDd] = useState(false)

  // ── Sync weekOffset depuis l'URL au mount client (corrige le décalage
  //    SSR/hydratation quand searchParams est vide côté serveur Next.js 15)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const weekParam = params.get('week')
    if (!weekParam) return
    try {
      const target  = new Date(weekParam + 'T00:00:00')
      const current = new Date(getWeekStart() + 'T00:00:00')
      const diffMs  = target.getTime() - current.getTime()
      const newOffset = Math.round(diffMs / (7 * 86400000))
      setWeekOffset(prev => prev === newOffset ? prev : newOffset)
    } catch { /* ignore malformed date */ }
  }, []) // Runs once on client mount — window.location is always correct here

  const currentWeekStart = getWeekStartFromOffset(weekOffset)
  const { sessions, intensities, activities, loading, addSession, updateSession, deleteSession, moveSession, setDayIntensity } = usePlanning(currentWeekStart)
  const [view, setView] = useState<TrainingView>('vertical')
  const [addModal, setAddModal] = useState<{dayIndex:number;plan:PlanVariant}|null>(null)
  const [detailModal, setDetailModal] = useState<Session|null>(null)
  const [activityDetail, setActivityDetail] = useState<TrainingActivity|null>(null)
  const [dragOver, setDragOver] = useState<number|null>(null)
  const [show10w, setShow10w] = useState(false)
  const [intensityModal, setIntensityModal] = useState<DayIntensity|null>(null)
  // Day index dont le picker d'intensité est ouvert (null = fermé)
  const [intensityPickerDay, setIntensityPickerDay] = useState<number|null>(null)
  // Fermeture au clic hors du picker
  useEffect(() => {
    if (intensityPickerDay === null) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || !t.closest('[data-intensity-picker]')) setIntensityPickerDay(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [intensityPickerDay])
  const dragRef  = useRef<{id:string;from:number}|null>(null)
  const touchRef = useRef<{id:string;from:number}|null>(null)
  const todayIdx = getTodayIdx()

  // ── AI training plan détecté pour la semaine courante ──
  const [aiPlan,        setAiPlan]        = useState<AiTrainingPlan | null>(null)
  const [aiPlanSessions, setAiPlanSessions] = useState<AiPlanSessionAgg[]>([])
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data: planData } = await sb.from('training_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .lte('start_date', currentWeekStart)
          .gte('end_date',   currentWeekStart)
          .maybeSingle()
        if (cancelled) return
        if (!planData) { setAiPlan(null); setAiPlanSessions([]); return }
        setAiPlan(planData as unknown as AiTrainingPlan)
        const { data: psData } = await sb.from('planned_sessions')
          .select('sport,duration_min,intensity,week_start')
          .eq('user_id', user.id)
          .eq('plan_id', (planData as { id: string }).id)
        if (cancelled) return
        setAiPlanSessions((psData ?? []) as unknown as AiPlanSessionAgg[])
      } catch (e) {
        console.log('[planning] aiPlan fetch failed:', e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { cancelled = true }
  }, [currentWeekStart])

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
          notes:r.notes,rpe:r.rpe,blocks:normalizeBlocks(r.blocks),main:false,planVariant:r.plan_variant??'A',
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
  const allActs = week.flatMap(d=>d.activities)   // activités réellement effectuées

  const plannedMin = allSess.reduce((s,x)=>s+x.durationMin,0)
  // doneMin = séances marquées faites + activités réelles (elapsedTime en secondes → /60 = minutes)
  const doneMin = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+x.durationMin,0)
               + allActs.reduce((s,a)=>s+Math.round(a.elapsedTime/60),0)

  const plannedTSS = allSess.reduce((s,x)=>s+(x.tss||0),0)
  const doneTSS = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+(x.tss||0),0)
               + allActs.reduce((s,a)=>s+(a.tss||0),0)

  const plannedN = allSess.length
  const doneN    = allSess.filter(s=>s.status==='done').length + allActs.length

  const sportCounts = (['run','bike','swim','hyrox','rowing','gym'] as SportType[]).map(sp=>({
    sport:sp,
    planned: allSess.filter(s=>s.sport===sp).length,
    done: allSess.filter(s=>s.sport===sp&&s.status==='done').length
        + allActs.filter(a=>normalizeSportType(a.sport)===sp).length
  })).filter(s=>s.planned>0||s.done>0)

  const sportStats = (['run','bike','swim','hyrox','rowing','gym'] as SportType[]).map(sp=>({
    sport:sp,
    plannedH: allSess.filter(s=>s.sport===sp).reduce((a,x)=>a+x.durationMin/60,0),
    doneH: allSess.filter(s=>s.sport===sp&&s.status==='done').reduce((a,x)=>a+x.durationMin/60,0)
          + allActs.filter(a=>normalizeSportType(a.sport)===sp).reduce((a,x)=>a+x.elapsedTime/3600,0)
  })).filter(s=>s.plannedH>0||s.doneH>0)

  const todaySessions = week[todayIdx]?.sessions??[]

  // ── Analyse IA ─────────────────────────────────────
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeResult,  setAnalyzeResult]  = useState<AnalyzeResult|null>(null)
  const [analyzeError,   setAnalyzeError]   = useState<string|null>(null)

  async function analyzePlanning() {
    setAnalyzeLoading(true); setAnalyzeResult(null); setAnalyzeError(null)
    try {
      const payload = {
        weekStart: currentWeekStart,
        sessions: allSess.map(s=>({ sport:s.sport, title:s.title, dayIndex:s.dayIndex, durationMin:s.durationMin, tss:s.tss, status:s.status, blocks:s.blocks.map(b=>({ type:b.type, zone:b.zone, durationMin:b.durationMin })) })),
        activities: allActs.map(a=>({ sport:a.sport, name:a.name, dayIndex:a.dayIndex, durationMin:Math.round(a.elapsedTime/60), tss:a.tss })),
        intensities,
        kpis:{ plannedMin, doneMin, plannedTSS, doneTSS, plannedN, doneN },
      }
      const res = await fetch('/api/analyze-planning',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) })
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error??`Erreur ${res.status}`) }
      setAnalyzeResult(await res.json())
    } catch(e:any) {
      setAnalyzeError(e.message??'Erreur inconnue')
    } finally {
      setAnalyzeLoading(false)
    }
  }

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
          {w.map((d,i)=>{ const cfg=INTENSITY_CONFIG[d.intensity]; const isCurrent = ws===currentWeekStart; const isPickerOpen = isCurrent && intensityPickerDay===i; return (
            <div key={d.day} style={{ padding:'8px 4px',textAlign:'center' as const,borderLeft:'1px solid var(--border)',minWidth:68 }}>
              <p style={{ fontSize:10,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 2px',fontWeight:500 }}>{d.day}</p>
              <p style={{ fontSize:14,fontWeight:700,margin:'0 0 4px',color:i===todayIdx&&isCurrent?'#00c8e0':'var(--text)' }}>{wDates[i]}</p>
              <div data-intensity-picker style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative' as const }}>
                <button
                  onClick={()=>{ if (isCurrent) setIntensityPickerDay(isPickerOpen?null:i); else setIntensityModal(d.intensity) }}
                  title={isCurrent?'Changer l\'intensité du jour':cfg.label}
                  style={{ padding:'2px 9px 2px 7px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:9,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:3 }}>
                  {cfg.label}
                  {isCurrent && (
                    <svg width={7} height={7} viewBox="0 0 10 10" style={{ opacity:0.7,transform:isPickerOpen?'rotate(180deg)':'none',transition:'transform 0.12s' }}>
                      <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                {isPickerOpen && (
                  <div data-intensity-picker style={{
                    position:'absolute' as const, top:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)',
                    zIndex:60, minWidth:90,
                    background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:9,
                    padding:4, boxShadow:'0 8px 20px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
                    display:'flex', flexDirection:'column' as const, gap:2,
                  }}>
                    {INTENSITY_ORDER.map(intensity => {
                      const c = INTENSITY_CONFIG[intensity]
                      const active = d.intensity === intensity
                      return (
                        <button
                          key={intensity}
                          onClick={()=>{ setDayIntensity(i, intensity); setIntensityPickerDay(null) }}
                          style={{
                            padding:'6px 10px', borderRadius:6,
                            background: active ? c.bg : 'transparent',
                            border: active ? `1px solid ${c.border}` : '1px solid transparent',
                            color: c.color, fontSize:11, fontWeight: active ? 700 : 500,
                            cursor:'pointer', textAlign:'left' as const,
                            display:'flex', alignItems:'center', gap:6,
                            fontFamily:'DM Sans, sans-serif',
                          }}
                          onMouseEnter={e=>{ if (!active) (e.currentTarget as HTMLElement).style.background = c.bg }}
                          onMouseLeave={e=>{ if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <span style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }} />
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
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
                {/* Activités réelles (cliquables → modal détail) */}
                {d.activities.map(a=>{
                  const sp=normalizeSportType(a.sport)
                  const matchedSession = matchActivity(a, d.sessions)
                  if(matchedSession) {
                    const actMin = Math.round(a.elapsedTime/60)
                    const st = matchStatus(matchedSession.durationMin, actMin)
                    return <div key={a.id} onClick={()=>setActivityDetail(a)} style={{ borderRadius:6,padding:'4px 6px',background:SPORT_BG[sp],borderLeft:`2px solid ${SPORT_BORDER[sp]}`,cursor:'pointer' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:3,marginBottom:2 }}>
                        <SportBadge sport={sp} size="xs"/>
                        <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,flex:1 }}>{matchedSession.title}</p>
                      </div>
                      <p style={{ fontSize:7,margin:'0 0 1px',fontFamily:'DM Mono,monospace',color:'var(--text-dim)' }}>Prévu {formatHM(matchedSession.durationMin)} · Réalisé {formatHM(actMin)}</p>
                      <span style={{ fontSize:7,fontWeight:700,color:st.color }}>{st.label}</span>
                    </div>
                  }
                  return <div key={a.id} onClick={()=>setActivityDetail(a)} style={{ borderRadius:6,padding:'4px 6px',background:`${SPORT_BORDER[sp]}18`,borderLeft:`2px solid ${SPORT_BORDER[sp]}`,opacity:0.9,cursor:'pointer' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                      <span style={{ fontSize:7,background:SPORT_BORDER[sp],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700,flexShrink:0 }}>OK</span>
                      <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{a.name}</p>
                    </div>
                    <p style={{ fontSize:8,opacity:0.7,margin:'1px 0 0',fontFamily:'DM Mono,monospace' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatHM(Math.round(a.elapsedTime/60))}</p>
                  </div>
                })}
                {/* Planned sessions (hide ones matched by an activity) */}
                {d.sessions.filter(s=>!d.activities.some(a=>matchActivity(a,d.sessions)?.id===s.id)).map(s=>(
                  <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,i)} onTouchStart={()=>onTouchStart(s.id,i)} onClick={()=>setDetailModal(s)}
                    style={{ borderRadius:6,padding:'4px 6px',background:SPORT_BG[s.sport],borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`,cursor:'grab',opacity:s.status==='done'?0.75:1,position:'relative' }}>
                    {s.status==='done' && <span style={{ position:'absolute',top:2,right:2,fontSize:7,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700 }}>FAIT</span>}
                    {s.planVariant && <span style={{ position:'absolute',top:2,left:2,fontSize:7,fontWeight:800,color:s.planVariant==='A'?'#00c8e0':'#a78bfa' }}>{s.planVariant}</span>}
                    <div style={{ display:'flex',alignItems:'center',gap:3,paddingLeft:8 }}>
                      <SportBadge sport={s.sport} size="xs"/>
                      <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{s.title}</p>
                    </div>
                    <p style={{ fontSize:8,opacity:0.7,margin:'1px 0 0',fontFamily:'DM Mono,monospace',paddingLeft:8 }}>{s.time} · {formatHM(s.durationMin)}</p>
                    {s.blocks.length>0 && <div style={{ display:'flex',gap:1,marginTop:2,height:6,borderRadius:1,overflow:'hidden' }}>{s.blocks.map(b=>{ const bMin=b.mode==='interval'&&b.reps&&b.effortMin&&b.recoveryMin?b.reps*(b.effortMin+b.recoveryMin):b.durationMin; return <div key={b.id} style={{ flex:bMin,background:ZONE_COLORS[b.zone-1],opacity:0.8 }}/> })}</div>}
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

  if (loading) return <div style={{ padding:20 }}><SkeletonPlanningGrid /></div>

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* ── PLAN HEADER + GRAPHIQUES (visible si plan IA actif sur cette semaine) ── */}
      {aiPlan && (
        <PlanHeaderAndGraphics plan={aiPlan} sessions={aiPlanSessions} currentWeekStart={currentWeekStart} />
      )}
      {show10w && <Last10WeeksModal onClose={()=>setShow10w(false)}/>}
      {intensityModal && <InfoModal title={INTENSITY_CONFIG[intensityModal].label} content={<p style={{margin:0}}>{intensityModal==='recovery'?'Journée légère ou repos.':intensityModal==='low'?'Faible intensité, récupération active.':intensityModal==='mid'?'Intensité modérée, fatigue contrôlée.':'Forte intensité — récupération nécessaire.'}</p>} onClose={()=>setIntensityModal(null)}/>}
      {addModal!==null && <div onClick={()=>setAddModal(null)} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}><AddSessionModal dayIndex={addModal.dayIndex} plan={addModal.plan} onClose={()=>setAddModal(null)} onAdd={handleAddSession}/></div>}
      {detailModal && <div onClick={()=>setDetailModal(null)} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}><SessionDetailModal session={detailModal} onClose={()=>setDetailModal(null)} onSave={handleSaveSession} onValidate={handleValidate} onDelete={handleDelete}/></div>}
      {activityDetail && <ActivityQuickModal activity={activityDetail} onClose={()=>setActivityDetail(null)}/>}

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
            Comparer
          </button>
          <button onClick={analyzePlanning} disabled={analyzeLoading}
            style={{ padding:'6px 14px',borderRadius:9,border:'1px solid #22c55e',fontSize:12,cursor:analyzeLoading?'default':'pointer',fontWeight:600,
              background:'rgba(34,197,94,0.10)',color:'#22c55e',opacity:analyzeLoading?0.6:1,whiteSpace:'nowrap' as const }}>
            {analyzeLoading?'Analyse en cours…':'Analyser la semaine'}
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
            Comparer les deux plans
          </button>
          <button onClick={analyzePlanning} disabled={analyzeLoading}
            style={{ padding:'11px 16px',borderRadius:12,fontSize:13,cursor:analyzeLoading?'default':'pointer',fontWeight:700,textAlign:'left' as const,
              border:'1.5px solid #22c55e',background:'rgba(34,197,94,0.10)',color:'#22c55e',opacity:analyzeLoading?0.6:1 }}>
            {analyzeLoading?'Analyse en cours…':'Analyser la semaine'}
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) { #tr-ctrl-mobile { display: none !important; } }
        @media (max-width: 767px) { #tr-ctrl-desktop { display: none !important; } }
      `}</style>

      {/* KPI */}
      <ScrollRevealGroup style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <ScrollRevealItem style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:0 }}>Volume</p>
            <button onClick={()=>setShow10w(true)} style={{ fontSize:9,padding:'2px 7px',borderRadius:6,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',cursor:'pointer',fontWeight:600 }}>Last 10W</button>
          </div>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px',fontFamily:'DM Mono,monospace' }}>Prévu {formatHM(plannedMin)}</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#00c8e0',margin:'0 0 8px' }}>{formatHM(doneMin)}</p>
          <AnimatedBar pct={plannedMin?Math.min(doneMin/plannedMin*100,100):0} color="#00c8e0" height={5} className="mb-1.5" />
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:0 }}>{plannedMin?Math.round(doneMin/plannedMin*100):0}% réalisé</p>
        </ScrollRevealItem>
        <ScrollRevealItem style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Séances</p>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px',fontFamily:'DM Mono,monospace' }}>Prévu {plannedN}</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#ffb340',margin:'0 0 8px' }}><CountUp value={doneN} /></p>
          <AnimatedBar pct={plannedN?Math.min(doneN/plannedN*100,100):0} color="#ffb340" height={5} className="mb-1.5" />
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' as const,marginTop:4 }}>
            {sportCounts.map(s=><span key={s.sport} style={{ fontSize:9,color:SPORT_BORDER[s.sport],fontFamily:'DM Mono,monospace',display:'flex',alignItems:'center',gap:3 }}><SportBadge sport={s.sport} size="xs"/> {s.done}/{s.planned}</span>)}
          </div>
        </ScrollRevealItem>
        <ScrollRevealItem style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)',gridColumn:'span 2' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:0 }}>TSS</p>
            <button onClick={()=>setShow10w(true)} style={{ fontSize:9,padding:'2px 7px',borderRadius:6,background:'rgba(91,111,255,0.10)',border:'1px solid rgba(91,111,255,0.25)',color:'#5b6fff',cursor:'pointer',fontWeight:600 }}>Last 10W</button>
          </div>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 1px',fontFamily:'DM Mono,monospace' }}>Prévu {plannedTSS} pts</p>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#5b6fff',margin:'0 0 8px' }}><CountUp value={doneTSS} /> pts</p>
          <AnimatedBar pct={plannedTSS?Math.min(doneTSS/plannedTSS*100,100):0} color="#5b6fff" height={5} />
        </ScrollRevealItem>
      </ScrollRevealGroup>

      {/* Volume par discipline */}
      {sportStats.length>0 && (
        <div className="card-enter card-enter-3" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 12px' }}>Volume par discipline</p>
          {sportStats.map(s=>{ const pct=s.plannedH>0?Math.min(s.doneH/s.plannedH*100,100):0; const c=SPORT_BORDER[s.sport]; return (
            <div key={s.sport} style={{ marginBottom:10 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 }}>
                <span style={{ fontSize:12,display:'flex',alignItems:'center',gap:5 }}><SportBadge sport={s.sport} size="xs"/><span style={{ fontWeight:500,color:'var(--text-mid)' }}>{SPORT_LABEL[s.sport]}</span></span>
                <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:c,fontWeight:600 }}>{s.doneH.toFixed(1)}h <span style={{ color:'var(--text-dim)',fontWeight:400 }}>/ {s.plannedH.toFixed(1)}h</span></span>
              </div>
              <AnimatedBar pct={pct} gradient={`linear-gradient(90deg,${c}bb,${c})`} height={6} />
            </div>
          )})}
        </div>
      )}

      {/* Aujourd'hui */}
      {todaySessions.length>0 && (
        <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow-card)' }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 10px' }}>Aujourd'hui — {week[todayIdx]?.day} {week[todayIdx]?.date}</p>
          {todaySessions.map(s=>(
            <div key={s.id} onClick={()=>setDetailModal(s)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 13px',borderRadius:10,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',marginBottom:7 }}>
              <SportBadge sport={s.sport} size="sm"/>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0 }}>{s.title}</p>
                <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.time} · {formatHM(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
              </div>
              <span style={{ padding:'4px 10px',borderRadius:20,background:s.status==='done'?`${SPORT_BORDER[s.sport]}22`:'var(--bg-card2)',border:`1px solid ${s.status==='done'?SPORT_BORDER[s.sport]:'var(--border)'}`,color:s.status==='done'?SPORT_BORDER[s.sport]:'var(--text-dim)',fontSize:10,fontWeight:600 }}>{s.status==='done'?'FAIT':'À faire'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Résultat analyse IA ── */}
      {analyzeError && (
        <div style={{ padding:'12px 16px',borderRadius:12,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontSize:12 }}>
          ⚠️ {analyzeError}
        </div>
      )}
      {analyzeResult && (
        <div className="card-enter" style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)',display:'flex',flexDirection:'column',gap:16 }}>
          {/* En-tête score */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:10 }}>
            <div>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:800,margin:'0 0 4px' }}>Analyse IA — Semaine</p>
              <p style={{ fontSize:12,color:'var(--text-dim)',margin:0 }}>{analyzeResult.summary}</p>
            </div>
            <div style={{ textAlign:'center' as const,flexShrink:0 }}>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:36,fontWeight:800,margin:0,lineHeight:1,
                color:analyzeResult.score>=80?'#22c55e':analyzeResult.score>=60?'#ffb340':'#ef4444' }}>
                <CountUp value={analyzeResult.score} />
              </p>
              <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>/ 100</p>
            </div>
          </div>

          {/* Issues */}
          {analyzeResult.issues.length>0 && (
            <div>
              <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Points d'attention</p>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {analyzeResult.issues.map((issue,i)=>{
                  const sev={ high:{c:'#ef4444',bg:'rgba(239,68,68,0.08)',border:'rgba(239,68,68,0.25)'}, medium:{c:'#f97316',bg:'rgba(249,115,22,0.08)',border:'rgba(249,115,22,0.25)'}, low:{c:'#22c55e',bg:'rgba(34,197,94,0.08)',border:'rgba(34,197,94,0.25)'} }[issue.severity]
                  return (
                    <div key={i} style={{ padding:'10px 13px',borderRadius:10,background:sev.bg,border:`1px solid ${sev.border}`,borderLeft:`3px solid ${sev.c}` }}>
                      <p style={{ fontSize:12,fontWeight:600,color:sev.c,margin:'0 0 2px' }}>{issue.title}</p>
                      <p style={{ fontSize:11,color:'var(--text-mid)',margin:0 }}>{issue.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analyzeResult.suggestions.length>0 && (
            <div>
              <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Suggestions</p>
              <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                {analyzeResult.suggestions.map((s,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,padding:'8px 12px',borderRadius:9,background:'rgba(91,111,255,0.07)',border:'1px solid rgba(91,111,255,0.2)',borderLeft:'3px solid #5b6fff' }}>
                    <p style={{ fontSize:11,color:'var(--text-mid)',margin:0 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan optimisé */}
          {analyzeResult.optimized_plan.length>0 && (
            <div>
              <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Plan optimisé suggéré</p>
              <div style={{ display:'flex',flexWrap:'wrap' as const,gap:6 }}>
                {analyzeResult.optimized_plan.map((p,i)=>(
                  <div key={i} style={{ padding:'8px 12px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',minWidth:110 }}>
                    <p style={{ fontSize:10,fontWeight:700,color:'#00c8e0',margin:'0 0 2px' }}>{p.day}</p>
                    <p style={{ fontSize:11,fontWeight:600,margin:'0 0 1px' }}>{p.title}</p>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,fontFamily:'DM Mono,monospace' }}>{formatHM(p.durationMin)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={()=>setAnalyzeResult(null)} style={{ alignSelf:'flex-end' as const,padding:'5px 12px',borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer' }}>Fermer</button>
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
          <ScrollReveal><WeekGrid ws={currentWeekStart} plan="A" labelTag="Plan A — Optimal"/></ScrollReveal>
          <ScrollReveal delay={0.08}><WeekGrid ws={currentWeekStart} plan="B" labelTag="Plan B — Minimal"/></ScrollReveal>
        </div>
      )}

      {/* SINGLE PLAN — multi-week grids (vertical uniquement) */}
      {!compareMode && (weekRange>1 || view==='vertical') && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {allWeekStarts.map((ws,wi)=>(
            <ScrollReveal key={ws} delay={Math.min(wi * 0.06, 0.3)}>
              <WeekGrid ws={ws} plan={activePlan} labelTag={weekRange>1?`Semaine ${wi+1} — ${getWeekLabel(ws)}`:undefined}/>
            </ScrollReveal>
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
              {d.activities.map(a=>{ const sp=normalizeSportType(a.sport); const matchedSession=matchActivity(a,d.sessions); return (
                <div key={a.id} onClick={()=>setActivityDetail(a)} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,background:`${SPORT_BORDER[sp]}14`,borderLeft:`3px solid ${SPORT_BORDER[sp]}`,marginBottom:5,opacity:0.85,cursor:'pointer' }}>
                  <SportBadge sport={sp} size="sm"/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                      <p style={{ fontSize:12,fontWeight:600,margin:0 }}>{matchedSession?matchedSession.title:a.name}</p>
                      <span style={{ fontSize:8,background:SPORT_BORDER[sp],color:'#fff',padding:'1px 4px',borderRadius:3,fontWeight:700 }}>Réalisé</span>
                      {matchedSession&&<span style={{ fontSize:8,fontWeight:700,color:matchStatus(matchedSession.durationMin,Math.round(a.elapsedTime/60)).color }}>{matchStatus(matchedSession.durationMin,Math.round(a.elapsedTime/60)).label}</span>}
                    </div>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'1px 0 0' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatHM(Math.round(a.elapsedTime/60))}{a.distance?` · ${(a.distance/1000).toFixed(1)}km`:''}{matchedSession?` · Prévu ${formatHM(matchedSession.durationMin)}`:''}</p>
                  </div>
                </div>
              )})}
              {d.sessions.filter(s=>!d.activities.some(a=>matchActivity(a,d.sessions)?.id===s.id)).map(s=>(
                <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,i)} onTouchStart={()=>onTouchStart(s.id,i)} onClick={()=>setDetailModal(s)}
                  style={{ display:'flex',flexDirection:'column',padding:'8px 10px',borderRadius:9,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',opacity:s.status==='done'?0.75:1,marginBottom:5 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                    <SportBadge sport={s.sport} size="sm"/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                        <p style={{ fontSize:12,fontWeight:600,margin:0 }}>{s.title}</p>
                        {s.status==='done'&&<span style={{ fontSize:8,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 4px',borderRadius:3,fontWeight:700 }}>FAIT</span>}
                        <span style={{ fontSize:9,fontWeight:700,color:s.planVariant==='B'?'#a78bfa':'#00c8e0',marginLeft:4 }}>Plan {s.planVariant}</span>
                      </div>
                      <p style={{ fontSize:10,color:'var(--text-dim)',margin:'1px 0 0' }}>{s.time} · {formatHM(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
                    </div>
                  </div>
                  {s.blocks.length>0 && <div style={{ display:'flex',gap:1,height:6,borderRadius:2,overflow:'hidden',marginTop:5 }}>{s.blocks.map(b=>{ const bMin=b.mode==='interval'&&b.reps&&b.effortMin&&b.recoveryMin?b.reps*(b.effortMin+b.recoveryMin):b.durationMin; return <div key={b.id} style={{ flex:bMin,background:ZONE_COLORS[b.zone-1],opacity:0.75 }}/> })}</div>}
                </div>
              ))}{d.sessions.filter(s=>!d.activities.some(a=>matchActivity(a,d.sessions)?.id===s.id)).length===0&&d.activities.length===0&&<p style={{ fontSize:11,color:'var(--text-dim)',margin:0,fontStyle:'italic' as const }}>Jour de repos</p>}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

// ── Add Session Modal ─────────────────────────────
function AddSessionModal({ dayIndex, plan, onClose, onAdd }:{ dayIndex:number; plan:PlanVariant; onClose:()=>void; onAdd:(i:number,s:Session)=>void }) {
  const router = useRouter()
  const [sport,      setSport]      = useState<SportType>('run')
  const [cyclingSub, setCyclingSub] = useState<CyclingSub>('velo')
  const [trainingType,setTrainingType]= useState<string|null>(null)
  const [title,      setTitle]      = useState('')
  const [time,       setTime]       = useState('09:00')
  const [durH,       setDurH]       = useState(1)
  const [durM,       setDurM]       = useState(0)
  const [rpe,        setRpe]        = useState(5)
  const [notes,      setNotes]      = useState('')
  const [selPlan,    setSelPlan]    = useState<PlanVariant>(plan)
  const totalMin = hMinToMin(durH,durM)
  const tss = calcTSS([], sport, totalMin, rpe)
  const trainTypes = TRAINING_TYPES[sport] ?? []

  function handleSportChange(s:SportType) {
    setSport(s); setTrainingType(null)
  }
  function handleTrainingTypeClick(t:string) {
    if(trainingType===t) { setTrainingType(null) }
    else {
      setTrainingType(t)
      if(!title) setTitle(`${SPORT_LABEL[s]} ${t}`.trim().replace(/^(\w)/, m => m))
    }
  }
  // Fix: close over sport correctly
  const s = sport

  return (
    <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:520,width:'100%',maxHeight:'92vh',overflowY:'auto' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
        <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Nouvelle séance</h3>
        <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
      </div>
      {/* Sport selector — horizontal scrollable */}
      <div style={{ display:'flex',gap:5,overflowX:'auto',marginBottom:10,paddingBottom:2 }}>
        {(Object.keys(SPORT_LABEL) as SportType[]).map(sp=>(
          <button key={sp} onClick={()=>handleSportChange(sp)}
            style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:sport===sp?SPORT_BORDER[sp]:'var(--border)',
              background:sport===sp?SPORT_BG[sp]:'var(--bg-card2)',color:sport===sp?SPORT_BORDER[sp]:'var(--text-mid)',
              fontSize:11,cursor:'pointer',fontWeight:sport===sp?600:400,whiteSpace:'nowrap' as const,
              borderLeft:sport===sp?`3px solid ${SPORT_BORDER[sp]}`:undefined }}>
            {SPORT_ABBR[sp]} {SPORT_LABEL[sp]}
          </button>
        ))}
      </div>
      {/* Cycling sub-type */}
      {sport==='bike' && (
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:10 }}>
          {(Object.keys(CYCLING_SUB_LABEL) as CyclingSub[]).map(sub=>(
            <button key={sub} onClick={()=>setCyclingSub(sub)}
              style={{ padding:'4px 8px',borderRadius:7,border:'1px solid',fontSize:10,cursor:'pointer',
                borderColor:cyclingSub===sub?SPORT_BORDER.bike:'var(--border)',
                background:cyclingSub===sub?`${SPORT_BORDER.bike}22`:'var(--bg-card2)',
                color:cyclingSub===sub?SPORT_BORDER.bike:'var(--text-mid)',fontWeight:cyclingSub===sub?600:400 }}>
              {CYCLING_SUB_LABEL[sub]}
            </button>
          ))}
        </div>
      )}
      {/* Training types */}
      {trainTypes.length>0 && (
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:12 }}>
          {trainTypes.map(t=>(
            <button key={t} onClick={()=>handleTrainingTypeClick(t)}
              style={{ padding:'4px 8px',borderRadius:7,border:'1px solid',fontSize:10,cursor:'pointer',
                borderColor:trainingType===t?SPORT_BORDER[sport]:'var(--border)',
                background:trainingType===t?SPORT_BG[sport]:'transparent',
                color:trainingType===t?SPORT_BORDER[sport]:'var(--text-dim)',fontWeight:trainingType===t?700:400 }}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:9,marginBottom:11 }}>
        <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={trainingType?`${SPORT_LABEL[sport]} ${trainingType}`:`${SPORT_LABEL[sport]} Z2`} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Heure</p><input value={time} onChange={e=>setTime(e.target.value)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
      </div>
      {/* Duration h + m */}
      <div style={{ display:'flex',gap:8,marginBottom:11 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Heures</p>
          <input type="number" min={0} max={12} value={durH} onChange={e=>setDurH(parseInt(e.target.value)||0)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Minutes</p>
          <input type="number" min={0} max={59} value={durM} onChange={e=>setDurM(parseInt(e.target.value)||0)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/>
        </div>
        <div style={{ flex:1,display:'flex',alignItems:'flex-end',paddingBottom:4 }}>
          <span style={{ fontSize:12,fontWeight:700,color:'var(--text-dim)',fontFamily:'DM Mono,monospace' }}>{formatHM(hMinToMin(durH,durM))}</span>
        </div>
      </div>
      <div style={{ marginBottom:11 }}>
        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
          <span style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)' }}>RPE</span>
          <span style={{ fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:rpe<=3?'#22c55e':rpe<=6?'#ffb340':'#ef4444' }}>{rpe.toFixed(1)}/10</span>
        </div>
        <input type="range" min={0} max={10} step={0.5} value={rpe} onChange={e=>setRpe(parseFloat(e.target.value))} style={{ width:'100%',accentColor:'#00c8e0',cursor:'pointer' }}/>
        <p style={{ fontSize:10,color:'var(--text-dim)',margin:'4px 0 0',fontFamily:'DM Mono,monospace' }}>TSS estimé (RPE) : <strong style={{ color:SPORT_BORDER[sport] }}>{tss} pts</strong></p>
      </div>
      {/* Construire la séance → redirige vers le builder détaillé */}
      <div style={{ marginBottom:11, padding:'12px 14px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div>
          <p style={{ margin:0, fontSize:11, fontWeight:600, color:'var(--text)' }}>Blocs d'intensité</p>
          <p style={{ margin:'2px 0 0', fontSize:10, color:'var(--text-dim)' }}>Construit dans la page Séances</p>
        </div>
        <button
          onClick={()=>{ onClose(); router.push('/session') }}
          style={{ padding:'7px 12px', borderRadius:8, background:`linear-gradient(135deg,${SPORT_BORDER[sport]}22,#5b6fff22)`, border:`1px solid ${SPORT_BORDER[sport]}55`, color:SPORT_BORDER[sport], fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:5 }}>
          Construire la séance →
        </button>
      </div>
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
        <button onClick={()=>{
          const finalTitle = title || (trainingType ? `${SPORT_LABEL[sport]} ${trainingType}` : SPORT_LABEL[sport])
          const subLabel = sport==='bike' ? ` — ${CYCLING_SUB_LABEL[cyclingSub]}` : ''
          onAdd(dayIndex,{id:'',dayIndex,sport,title:finalTitle+subLabel,time,durationMin:totalMin||60,tss:tss||undefined,status:'planned',notes:notes||undefined,blocks:[],rpe,planVariant:selPlan})
          onClose()
        }} style={{ flex:2,padding:10,borderRadius:10,background:`linear-gradient(135deg,${SPORT_BORDER[sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Ajouter</button>
      </div>
    </div>
  )
}

// ── Session Detail — page unique fullscreen ──────────────────────
// Remplace l'ancien modal à 3 onglets (Graphique / Modifier / Valider)
// par une page unique scrollable avec :
//   Header : titre + métadonnées + jauge RPE éditable
//   Chart  : profil d'intensité visuel (clic bloc → expand inline)
//   Blocs  : liste inline-editable, ajout/suppression
//   Validation : 2 boutons (manuel / via Strava-Training)
//   Footer : Supprimer + Fermer + Enregistrer

function rpeColor(level: number): string {
  if (level <= 3) return '#22c55e'
  if (level <= 5) return '#eab308'
  if (level <= 7) return '#f97316'
  return '#ef4444'
}

const ZONE_HEIGHTS_PCT: Record<number, number> = { 1: 18, 2: 32, 3: 52, 4: 72, 5: 92 }

function BlockRow({ block, sport, isExpanded, onToggle, onPatch, onDelete }:{
  block: Block; sport: SportType
  isExpanded: boolean
  onToggle: () => void
  onPatch: (patch: Partial<Block>) => void
  onDelete: () => void
}) {
  const c = ZONE_COLORS[block.zone-1]
  const isInterval = block.mode === 'interval' && !!block.reps && !!block.effortMin && !!block.recoveryMin
  const durLabel = isInterval
    ? `${block.reps}×${block.effortMin}min · récup ${block.recoveryMin}min`
    : formatHM(block.durationMin)
  const valueLabel = block.value ? `${block.value}${sport==='bike'?'W':''}` : null
  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'7px 10px', borderRadius:7,
    border:'1px solid var(--border)', background:'var(--bg-card)',
    color:'var(--text)', fontSize:12, outline:'none' as const,
  }
  const labelStyle: React.CSSProperties = {
    fontSize:10, fontWeight:600, textTransform:'uppercase' as const,
    letterSpacing:'0.06em', color:'var(--text-dim)', display:'block',
    margin:'10px 0 4px',
  }
  const { h: dh, m: dm } = minToHMin(block.durationMin || 0)

  return (
    <div style={{
      borderRadius:9,
      background:`${c}11`,
      borderLeft:`3px solid ${c}`,
      border:`1px solid ${c}22`,
      overflow:'hidden' as const,
    }}>
      {/* Summary row */}
      <div onClick={onToggle} style={{
        display:'flex', alignItems:'center', gap:9,
        padding:'9px 12px', cursor:'pointer',
      }}>
        <span style={{ fontSize:10,fontWeight:800,color:c,minWidth:22,fontFamily:'DM Mono,monospace' }}>Z{block.zone}</span>
        <span style={{ flex:1, fontSize:12, minWidth:0, overflow:'hidden', textOverflow:'ellipsis' as const, whiteSpace:'nowrap' as const, color:'var(--text)' }}>
          {block.label}
        </span>
        <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--text-mid)', flexShrink:0 }}>{durLabel}</span>
        {valueLabel && (
          <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',fontWeight:700,color:c,flexShrink:0 }}>{valueLabel}</span>
        )}
        <span style={{ color:'var(--text-dim)',fontSize:10,flexShrink:0,transform:isExpanded?'rotate(90deg)':'none',transition:'transform 0.14s' }}>▸</span>
      </div>

      {isExpanded && (
        <div style={{ padding:'4px 14px 14px', borderTop:`1px solid ${c}22`, background:'var(--bg-card2)' }}>
          <label style={labelStyle}>Description</label>
          <input value={block.label} onChange={e=>onPatch({ label:e.target.value })} style={inputStyle} />

          <label style={labelStyle}>Zone d'intensité</label>
          <div style={{ display:'flex', gap:4 }}>
            {[1,2,3,4,5].map(z => {
              const zc = ZONE_COLORS[z-1]
              const active = block.zone === z
              return (
                <button key={z} onClick={()=>onPatch({ zone: z })} style={{
                  flex:1, padding:'8px 0', borderRadius:6,
                  border: active ? `2px solid ${zc}` : '1px solid var(--border)',
                  background: active ? `${zc}26` : 'var(--bg-card)',
                  color: active ? zc : 'var(--text-mid)',
                  fontSize:11, fontWeight:700, fontFamily:'DM Mono,monospace', cursor:'pointer',
                }}>
                  Z{z}
                </button>
              )
            })}
          </div>

          <label style={labelStyle}>Type</label>
          <div style={{ display:'flex', gap:4 }}>
            {(['single','interval'] as const).map(m => {
              const active = block.mode === m
              return (
                <button key={m} onClick={()=>onPatch({ mode:m })} style={{
                  flex:1, padding:'8px 0', borderRadius:6,
                  border: active ? '2px solid #00c8e0' : '1px solid var(--border)',
                  background: active ? 'rgba(0,200,224,0.10)' : 'var(--bg-card)',
                  color: active ? '#00c8e0' : 'var(--text-mid)',
                  fontSize:11, fontWeight:600, cursor:'pointer',
                }}>
                  {m==='single' ? 'Bloc continu' : 'Intervalles (N×)'}
                </button>
              )
            })}
          </div>

          {block.mode === 'single' ? (
            <>
              <label style={labelStyle}>Durée</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <input type="number" min={0} max={12} value={dh}
                    onChange={e=>onPatch({ durationMin: hMinToMin(parseInt(e.target.value)||0, dm) })}
                    style={{ ...inputStyle, fontFamily:'DM Mono,monospace' }} />
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>heures</span>
                </div>
                <div style={{ flex:1 }}>
                  <input type="number" min={0} max={59} value={dm}
                    onChange={e=>onPatch({ durationMin: hMinToMin(dh, parseInt(e.target.value)||0) })}
                    style={{ ...inputStyle, fontFamily:'DM Mono,monospace' }} />
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>minutes</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <label style={labelStyle}>Répétitions × Effort × Récup</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <input type="number" min={1} max={50} value={block.reps ?? 1}
                    onChange={e=>onPatch({ reps: Math.max(1, parseInt(e.target.value)||1) })}
                    style={{ ...inputStyle, fontFamily:'DM Mono,monospace' }} />
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>reps</span>
                </div>
                <div style={{ flex:1 }}>
                  <input type="number" min={0} max={120} value={block.effortMin ?? 0}
                    onChange={e=>onPatch({ effortMin: Math.max(0, parseInt(e.target.value)||0) })}
                    style={{ ...inputStyle, fontFamily:'DM Mono,monospace' }} />
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>effort (min)</span>
                </div>
                <div style={{ flex:1 }}>
                  <input type="number" min={0} max={60} value={block.recoveryMin ?? 0}
                    onChange={e=>onPatch({ recoveryMin: Math.max(0, parseInt(e.target.value)||0) })}
                    style={{ ...inputStyle, fontFamily:'DM Mono,monospace' }} />
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>récup (min)</span>
                </div>
              </div>
            </>
          )}

          {sport !== 'gym' && (
            <>
              <label style={labelStyle}>
                {sport === 'bike' ? 'Puissance cible' : sport === 'run' ? 'Allure cible' : 'Cible'}
              </label>
              <input
                value={block.value} onChange={e=>onPatch({ value:e.target.value })}
                placeholder={sport === 'bike' ? '220 (en watts)' : sport === 'run' ? "4'30/km" : '—'}
                style={inputStyle} />
            </>
          )}

          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={onDelete} style={{
              padding:'8px 12px', borderRadius:8,
              background:'rgba(255,95,95,0.10)', border:'1px solid rgba(255,95,95,0.25)',
              color:'#ff5f5f', fontSize:11, cursor:'pointer', fontWeight:600,
            }}>Supprimer ce bloc</button>
            <div style={{ flex:1 }} />
            <button onClick={onToggle} style={{
              padding:'8px 14px', borderRadius:8,
              background:'var(--bg-card)', border:'1px solid var(--border)',
              color:'var(--text-mid)', fontSize:11, cursor:'pointer',
            }}>Replier</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionDetailModal({ session, onClose, onSave, onValidate, onDelete }:{ session:Session; onClose:()=>void; onSave:(s:Session)=>void; onValidate:(s:Session)=>void; onDelete:(id:string)=>void }) {
  const router = useRouter()
  const [form, setForm] = useState<Session>({...session, blocks:[...session.blocks]})
  const [expandedBlockId, setExpandedBlockId] = useState<string|null>(null)
  const [validPanel, setValidPanel] = useState<'form'|'compare'|null>(
    session.status === 'done' && session.vDuration ? 'compare' : null
  )
  const [vDraft, setVDraft] = useState<{
    vDurationMin:number; vRpe:number|null; vHrAvg:string; vDistance:string
    vElevation:string; vTempMax:string; vHumidity:string; vAltMax:string
    vSplits:string; vNotes:string
    vWattsAvg:string; vWattsWeighted:string; vCadenceAvg:string; vCadenceMax:string
  }>({
    vDurationMin: session.vDuration ? (parseInt(session.vDuration)||0) : 0,
    vRpe: session.vRpe ?? null,
    vHrAvg: session.vHrAvg ?? '',
    vDistance: session.vDistance ?? '',
    vElevation: session.vElevation ?? '',
    vTempMax: session.vTempMax ?? '',
    vHumidity: session.vHumidity ?? '',
    vAltMax: session.vAltMax ?? '',
    vSplits: (session.vSplits ?? []).join('\n'),
    vNotes: session.vNotes ?? '',
    vWattsAvg: session.vWattsAvg ?? '',
    vWattsWeighted: session.vWattsWeighted ?? '',
    vCadenceAvg: session.vCadenceAvg ?? '',
    vCadenceMax: session.vCadenceMax ?? '',
  })

  const isDirty = JSON.stringify({
    title:form.title, time:form.time, durationMin:form.durationMin,
    notes:form.notes, rpe:form.rpe, blocks:form.blocks,
  }) !== JSON.stringify({
    title:session.title, time:session.time, durationMin:session.durationMin,
    notes:session.notes, rpe:session.rpe, blocks:session.blocks,
  })

  function patchForm<K extends keyof Session>(key:K, value:Session[K]) {
    setForm(f => ({ ...f, [key]:value }))
  }
  function patchBlock(id:string, patch:Partial<Block>) {
    setForm(f => ({ ...f, blocks: f.blocks.map(b => b.id === id ? { ...b, ...patch } : b) }))
  }
  function deleteBlock(id:string) {
    setForm(f => ({ ...f, blocks: f.blocks.filter(b => b.id !== id) }))
    if (expandedBlockId === id) setExpandedBlockId(null)
  }
  function addBlock() {
    const newBlock: Block = {
      id: 'b_' + Math.random().toString(36).slice(2, 10),
      mode: 'single', type: 'effort',
      durationMin: 10, zone: 2, value: '', hrAvg: '', label: 'Nouveau bloc',
    }
    setForm(f => ({ ...f, blocks:[...f.blocks, newBlock] }))
    setExpandedBlockId(newBlock.id)
  }
  function handleSave() {
    const tss = calcTSS(form.blocks, session.sport, form.durationMin, form.rpe)
    onSave({ ...form, tss })
  }
  function handleValidateStrava() {
    onClose()
    router.push('/activities')
  }
  function handleValidateManual() { setValidPanel('form') }
  function submitValidation() {
    const d = vDraft
    const dist = parseFloat(d.vDistance), dur = d.vDurationMin
    const vSpeed = dist && dur ? `${(dist/(dur/60)).toFixed(1)} km/h` : undefined
    const vPace = dist && dur && ['run','hyrox'].includes(session.sport)
      ? (()=>{ const p=dur/dist; const pm=Math.floor(p); return `${pm}:${String(Math.round((p-pm)*60)).padStart(2,'0')} /km` })()
      : undefined
    const validated: Session = {
      ...form, status:'done',
      vDuration: dur ? String(dur) : undefined,
      vRpe: d.vRpe ?? undefined,
      vHrAvg: d.vHrAvg||undefined,
      vDistance: d.vDistance||undefined,
      vElevation: d.vElevation||undefined,
      vSpeed, vPace,
      vTempMax: d.vTempMax||undefined,
      vHumidity: d.vHumidity||undefined,
      vAltMax: d.vAltMax||undefined,
      vSplits: d.vSplits.trim() ? d.vSplits.trim().split('\n').filter(Boolean) : undefined,
      vNotes: d.vNotes||undefined,
      vWattsAvg: d.vWattsAvg||undefined,
      vWattsWeighted: d.vWattsWeighted||undefined,
      vCadenceAvg: d.vCadenceAvg||undefined,
      vCadenceMax: d.vCadenceMax||undefined,
    }
    onValidate(validated)
    setValidPanel('compare')
  }
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      background:'var(--bg-card)',
      borderRadius:18,
      border:'1px solid var(--border)',
      maxWidth:880, width:'100%', maxHeight:'94vh',
      display:'flex', flexDirection:'column' as const,
      boxShadow:'0 24px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)',
      overflow:'hidden' as const,
    }}>
      {/* ── HEADER (sticky top) ─────────────────────────────── */}
      <header style={{ padding:'22px 28px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:14 }}>
          <div style={{
            width:48,height:48,borderRadius:12,
            background:SPORT_BG[session.sport],
            border:`1px solid ${SPORT_BORDER[session.sport]}55`,
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
          }}>
            <SportBadge sport={session.sport} size="sm"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <input
              value={form.title}
              onChange={e=>patchForm('title', e.target.value)}
              placeholder="Titre de la séance"
              style={{
                fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,
                color:'var(--text)',background:'transparent',border:'none',outline:'none' as const,
                width:'100%',padding:0,letterSpacing:'-0.01em',lineHeight:1.2,
              }}
            />
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' as const,marginTop:8,alignItems:'center' }}>
              <input
                value={form.time}
                onChange={e=>patchForm('time', e.target.value)}
                placeholder="07:00"
                style={{
                  fontSize:11,fontFamily:'DM Mono,monospace',fontWeight:700,
                  color:SPORT_BORDER[session.sport],
                  padding:'2px 8px',borderRadius:99,
                  background:SPORT_BG[session.sport],
                  border:`1px solid ${SPORT_BORDER[session.sport]}33`,
                  width:60, textAlign:'center' as const, outline:'none' as const,
                }}
              />
              <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',fontWeight:600,color:'var(--text-mid)',padding:'2px 8px',borderRadius:99,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                {formatHM(form.durationMin)}
              </span>
              {form.tss != null && form.tss > 0 && (
                <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',fontWeight:600,color:'#8b5cf6',padding:'2px 8px',borderRadius:99,background:'rgba(139,92,246,0.10)',border:'1px solid rgba(139,92,246,0.22)' }}>
                  TSS {form.tss}
                </span>
              )}
              {form.status === 'done' && (
                <span style={{ fontSize:10,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase' as const,color:'#22c55e',padding:'2px 8px',borderRadius:99,background:'rgba(34,197,94,0.10)',border:'1px solid rgba(34,197,94,0.25)' }}>
                  ✓ Validée
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:'transparent',border:'1px solid var(--border)',borderRadius:9,
              width:32,height:32,padding:0,cursor:'pointer',
              color:'var(--text-mid)',fontSize:18,lineHeight:1,flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}
          >×</button>
        </div>

        {/* RPE GAUGE */}
        <div style={{ marginTop:14, background:'var(--bg-card2)',borderRadius:11,padding:'10px 14px',border:'1px solid var(--border)' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <span style={{ fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' as const,color:'var(--text-dim)' }}>
              RPE — Perception de l'effort
            </span>
            <span style={{ fontSize:13,fontWeight:700,color: form.rpe != null ? rpeColor(form.rpe) : 'var(--text-dim)',fontFamily:'DM Mono,monospace' }}>
              {form.rpe != null ? `${form.rpe}/10` : '—'}
            </span>
          </div>
          <div style={{ display:'flex',gap:3,alignItems:'flex-end' }}>
            {Array.from({length:11},(_,i)=>i).map(i => {
              const active = form.rpe === i
              const inRange = form.rpe != null && i <= form.rpe
              return (
                <button
                  key={i}
                  onClick={()=>patchForm('rpe', i)}
                  style={{
                    flex:1, height: active ? 30 : 20, minWidth:18,
                    borderRadius:5, border:'none', cursor:'pointer',
                    background: inRange ? rpeColor(i) : 'var(--border)',
                    color: inRange ? '#fff' : 'var(--text-dim)',
                    fontSize: active ? 11 : 9, fontWeight:700,fontFamily:'DM Mono,monospace',
                    transition:'height 0.14s, background 0.14s',
                  }}
                >
                  {i}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── CONTENT (scroll) ───────────────────────────────── */}
      <main style={{ flex:1, overflowY:'auto' as const, padding:'22px 28px' }}>

        {/* Profil d'intensité (endurance only) */}
        {session.sport !== 'gym' && form.blocks.length > 0 && (
          <section style={{ marginBottom:24 }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:'0 0 10px' }}>
              Profil d'intensité
            </p>
            <div style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 14px 12px' }}>
              <svg width="100%" height={120} viewBox="0 0 100 105" preserveAspectRatio="none" style={{ overflow:'visible' as const, display:'block' }}>
                {(() => {
                  // Parse la valeur d'un bloc en "intensité normalisable" :
                  // - vélo/rowing : watts (plus haut = plus fort)
                  // - run/hyrox/swim : 10000/secondes-par-km (plus vite = plus fort)
                  const parseRaw = (val:string): number|null => {
                    if (!val?.trim()) return null
                    const sp = session.sport
                    if (sp==='bike'||sp==='rowing') { const w=parseFloat(val); return isNaN(w)?null:w }
                    const m = val.match(/(\d+):(\d+)/); if (!m) return null
                    const secs = parseInt(m[1])*60+parseInt(m[2]); return secs>0 ? 10000/secs : null
                  }
                  type SBar = { blockId:string; isRecovery:boolean; min:number; zone:number; rawVal:number|null }
                  const bars:SBar[] = []
                  for (const b of form.blocks) {
                    const rv = parseRaw(b.value)
                    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) {
                      for (let i=0; i<b.reps; i++) {
                        bars.push({ blockId:b.id, isRecovery:false, min:b.effortMin,   zone:b.zone, rawVal:rv })
                        bars.push({ blockId:b.id, isRecovery:true,  min:b.recoveryMin, zone:b.recoveryZone??1, rawVal:null })
                      }
                    } else {
                      bars.push({ blockId:b.id, isRecovery:false, min:b.durationMin, zone:b.zone, rawVal:rv })
                    }
                  }
                  // Normalisation : min→14 max→88 sur les blocs d'effort avec valeur
                  const effortVals = bars.filter(b=>!b.isRecovery&&b.rawVal!=null).map(b=>b.rawVal!)
                  const maxRaw = effortVals.length ? Math.max(...effortVals) : 0
                  const minRaw = effortVals.length ? Math.min(...effortVals) : 0
                  const rawRange = maxRaw>minRaw ? maxRaw-minRaw : null
                  const total = bars.reduce((a,bar)=>a+bar.min, 0) || 1
                  let xCursor = 0
                  return bars.map((bar, i) => {
                    const w = (bar.min / total) * 100
                    const h = bar.isRecovery ? 10
                      : bar.rawVal!=null && rawRange!=null
                        ? Math.round(14 + ((bar.rawVal-minRaw)/rawRange)*74)
                        : bar.rawVal!=null ? 52  // valeur unique → hauteur médiane
                        : (ZONE_HEIGHTS_PCT[bar.zone] ?? 32)
                    const y = 100 - h
                    const fill = bar.isRecovery ? '#6b7280' : (ZONE_COLORS[bar.zone - 1] ?? '#9ca3af')
                    const opacity = bar.isRecovery ? 0.35 : 0.88
                    const x = xCursor
                    xCursor += w
                    const gap = w > 1 ? 0.5 : 0
                    const valLabel = bar.rawVal!=null
                      ? (session.sport==='bike'||session.sport==='rowing') ? `${Math.round(bar.rawVal)}w` : (()=>{ const secs=Math.round(10000/bar.rawVal!); return `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}/km` })()
                      : ''
                    return (
                      <rect key={i}
                        x={x} y={y} width={Math.max(w - gap, 0.3)} height={h} rx={1.5}
                        fill={fill} opacity={opacity}
                        onClick={()=>setExpandedBlockId(bar.blockId)}
                        style={{ cursor:'pointer' }}
                      >
                        <title>{`Z${bar.zone} · ${formatHM(bar.min)}${valLabel?' · '+valLabel:''}${bar.isRecovery?' (récup)':''}`}</title>
                      </rect>
                    )
                  })
                })()}
                <line x1={0} y1={100} x2={100} y2={100} stroke="var(--border)" strokeWidth={0.4}/>
              </svg>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8 }}>
                <div style={{ display:'flex',gap:6 }}>
                  {['Z1','Z2','Z3','Z4','Z5'].map((z,i)=>(
                    <span key={z} style={{ fontSize:9,fontWeight:700,color:ZONE_COLORS[i],display:'flex',alignItems:'center',gap:3 }}>
                      <span style={{ width:7,height:7,borderRadius:2,background:ZONE_COLORS[i],display:'inline-block' }}/>
                      {z}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize:9,color:'var(--text-dim)' }}>Clic pour modifier</span>
              </div>
            </div>
          </section>
        )}

        {/* Blocs (liste éditable inline) */}
        <section style={{ marginBottom:24 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:0 }}>
              {session.sport === 'gym' ? 'Exercices' : 'Blocs d\'effort'}
            </p>
            <button onClick={addBlock} style={{
              padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',
              background:'var(--bg-card2)',color:'var(--text-mid)',
              fontSize:11,cursor:'pointer',fontWeight:600,
            }}>+ Ajouter</button>
          </div>
          {form.blocks.length === 0 ? (
            <p style={{ fontSize:12,color:'var(--text-dim)',padding:'14px 0',textAlign:'center' as const }}>
              Aucun bloc — clique "+ Ajouter" pour en créer un.
            </p>
          ) : (
            <div style={{ display:'flex',flexDirection:'column' as const,gap:6 }}>
              {form.blocks.map(b => (
                <BlockRow key={b.id}
                  block={b} sport={session.sport}
                  isExpanded={expandedBlockId === b.id}
                  onToggle={()=>setExpandedBlockId(expandedBlockId === b.id ? null : b.id)}
                  onPatch={p=>patchBlock(b.id, p)}
                  onDelete={()=>deleteBlock(b.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Notes */}
        <section style={{ marginBottom:24 }}>
          <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:'0 0 8px' }}>
            Notes du coach
          </p>
          <textarea
            value={form.notes ?? ''}
            onChange={e=>patchForm('notes', e.target.value)}
            placeholder="Conseils, sensations attendues, points d'attention…"
            rows={3}
            style={{
              width:'100%',padding:'10px 12px',borderRadius:9,
              border:'1px solid var(--border)',background:'var(--bg-card2)',
              color:'var(--text)',fontSize:12,outline:'none' as const,resize:'vertical' as const,
              fontFamily:'DM Sans, sans-serif', lineHeight:1.5,
            }}
          />
        </section>

        {/* Validation */}
        <section style={{ marginBottom:8 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:0 }}>
              {validPanel === 'form' ? 'Saisir les réels' : validPanel === 'compare' ? 'Prévu vs Réel' : 'Validation'}
            </p>
            {validPanel && (
              <button onClick={()=>setValidPanel(null)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--text-dim)',padding:'2px 8px',borderRadius:6 }}>
                ← Retour
              </button>
            )}
          </div>

          {validPanel === null && (
            <div style={{ display:'flex',gap:10,flexWrap:'wrap' as const }}>
              <button onClick={handleValidateManual} style={{
                flex:'1 1 200px',padding:'12px 14px',borderRadius:10,
                border:'1px solid var(--border)',background:'var(--bg-card2)',
                color:'var(--text)',fontSize:12,fontWeight:600,cursor:'pointer',
                fontFamily:'DM Sans,sans-serif',textAlign:'left' as const,
              }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                  <span style={{ fontSize:14 }}>✏</span>
                  <span>Valider manuellement</span>
                </div>
                <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,fontWeight:400,lineHeight:1.4 }}>
                  Saisir durée réelle, RPE, FC, notes
                </p>
              </button>
              <button onClick={handleValidateStrava} style={{
                flex:'1 1 200px',padding:'12px 14px',borderRadius:10,
                border:'1px solid #fc4c02',background:'rgba(252,76,2,0.06)',
                color:'#fc4c02',fontSize:12,fontWeight:600,cursor:'pointer',
                fontFamily:'DM Sans,sans-serif',textAlign:'left' as const,
              }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                  <span style={{ fontSize:14 }}>↗</span>
                  <span>Valider via Strava / Training</span>
                </div>
                <p style={{ fontSize:10,color:'#fc4c02aa',margin:0,fontWeight:400,lineHeight:1.4 }}>
                  Importer l'activité depuis la page Training
                </p>
              </button>
            </div>
          )}

          {validPanel === 'form' && (()=>{
            const inp = { width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:12,outline:'none' as const,fontFamily:'DM Mono,monospace',boxSizing:'border-box' as const }
            const ls  = { fontSize:10,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase' as const,color:'var(--text-dim)',display:'block',marginBottom:4 }
            const calc= { padding:'6px 10px',borderRadius:8,border:'1px solid rgba(0,200,224,0.25)',background:'rgba(0,200,224,0.06)',fontSize:11,fontFamily:'DM Mono,monospace',color:'#00c8e0',minHeight:32,display:'flex',alignItems:'center' as const }
            const grp = { border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',background:'rgba(0,0,0,0.08)' }
            const gl  = { fontSize:9,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:'0 0 10px' }
            const gr  = { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(116px,1fr))',gap:8 }
            const dist= parseFloat(vDraft.vDistance), dur = vDraft.vDurationMin
            const sp  = session.sport
            return (
              <div style={{ display:'flex',flexDirection:'column' as const,gap:10 }}>

                {/* ① Effort de base */}
                <div style={grp}>
                  <p style={gl}>① Effort de base</p>
                  <div style={gr}>
                    <div>
                      <label style={ls}>Durée (min)</label>
                      <input type="number" min={0} max={600} value={vDraft.vDurationMin||''} onChange={e=>setVDraft(d=>({...d,vDurationMin:parseInt(e.target.value)||0}))} placeholder={String(session.durationMin)} style={inp}/>
                      {vDraft.vDurationMin>0 && <span style={{ fontSize:10,color:'var(--text-dim)',marginTop:2,display:'block' }}>{formatHM(vDraft.vDurationMin)}</span>}
                    </div>
                    <div>
                      <label style={ls}>FC moy (bpm)</label>
                      <input type="number" min={40} max={220} value={vDraft.vHrAvg} onChange={e=>setVDraft(d=>({...d,vHrAvg:e.target.value}))} placeholder="155" style={inp}/>
                    </div>
                    <div>
                      <label style={ls}>Distance (km)</label>
                      <input type="number" min={0} step={0.01} value={vDraft.vDistance} onChange={e=>setVDraft(d=>({...d,vDistance:e.target.value}))} placeholder="12.5" style={inp}/>
                    </div>
                    <div>
                      <label style={ls}>Dénivelé (m)</label>
                      <input type="number" min={0} value={vDraft.vElevation} onChange={e=>setVDraft(d=>({...d,vElevation:e.target.value}))} placeholder="450" style={inp}/>
                    </div>
                  </div>
                </div>

                {/* ② Allure / Vitesse */}
                {sp !== 'gym' && (
                  <div style={grp}>
                    <p style={gl}>② Allure / Vitesse</p>
                    {/* Course / Hyrox → allure /km calculée auto */}
                    {(sp==='run'||sp==='hyrox') && (
                      <div>
                        <label style={ls}>Allure moy — auto (min/km)</label>
                        <div style={calc}>
                          {dist>0&&dur>0
                            ? (()=>{ const p=dur/dist; const pm=Math.floor(p); return `${pm}:${String(Math.round((p-pm)*60)).padStart(2,'0')} /km` })()
                            : <span style={{ color:'var(--text-dim)',fontSize:10 }}>Saisir durée + distance</span>}
                        </div>
                      </div>
                    )}
                    {/* Vélo / Rowing → vitesse auto + watts manuels */}
                    {(sp==='bike'||sp==='rowing') && (
                      <div style={gr}>
                        <div>
                          <label style={ls}>Vitesse — auto (km/h)</label>
                          <div style={calc}>
                            {dist>0&&dur>0
                              ? `${(dist/(dur/60)).toFixed(1)} km/h`
                              : <span style={{ color:'var(--text-dim)',fontSize:10 }}>...</span>}
                          </div>
                        </div>
                        <div>
                          <label style={ls}>Watts moyens</label>
                          <input type="number" min={0} max={2000} value={vDraft.vWattsAvg} onChange={e=>setVDraft(d=>({...d,vWattsAvg:e.target.value}))} placeholder="230" style={inp}/>
                        </div>
                        <div>
                          <label style={ls}>Watts pondérés</label>
                          <input type="number" min={0} max={2000} value={vDraft.vWattsWeighted} onChange={e=>setVDraft(d=>({...d,vWattsWeighted:e.target.value}))} placeholder="240" style={inp}/>
                        </div>
                      </div>
                    )}
                    {/* Natation → allure /100m calculée auto */}
                    {sp==='swim' && (
                      <div>
                        <label style={ls}>Allure — auto (min/100m)</label>
                        <div style={calc}>
                          {dist>0&&dur>0
                            ? (()=>{ const p=dur/(dist*10); const pm=Math.floor(p); return `${pm}:${String(Math.round((p-pm)*60)).padStart(2,'0')} /100m` })()
                            : <span style={{ color:'var(--text-dim)',fontSize:10 }}>Saisir durée + distance</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ③ Métriques avancées */}
                <div style={grp}>
                  <p style={gl}>③ Métriques avancées</p>
                  <div style={gr}>
                    <div>
                      <label style={ls}>Cadence moy (rpm)</label>
                      <input type="number" min={0} max={300} value={vDraft.vCadenceAvg} onChange={e=>setVDraft(d=>({...d,vCadenceAvg:e.target.value}))} placeholder="85" style={inp}/>
                    </div>
                    <div>
                      <label style={ls}>Cadence max (rpm)</label>
                      <input type="number" min={0} max={300} value={vDraft.vCadenceMax} onChange={e=>setVDraft(d=>({...d,vCadenceMax:e.target.value}))} placeholder="95" style={inp}/>
                    </div>
                  </div>
                </div>

                {/* ④ Conditions */}
                <div style={grp}>
                  <p style={gl}>④ Conditions</p>
                  <div style={gr}>
                    <div>
                      <label style={ls}>Temp. max (°C)</label>
                      <input type="number" min={-20} max={55} value={vDraft.vTempMax} onChange={e=>setVDraft(d=>({...d,vTempMax:e.target.value}))} placeholder="24" style={inp}/>
                    </div>
                    <div>
                      <label style={ls}>Humidité (%)</label>
                      <input type="number" min={0} max={100} value={vDraft.vHumidity} onChange={e=>setVDraft(d=>({...d,vHumidity:e.target.value}))} placeholder="65" style={inp}/>
                    </div>
                    <div>
                      <label style={ls}>Altitude max (m)</label>
                      <input type="number" min={0} value={vDraft.vAltMax} onChange={e=>setVDraft(d=>({...d,vAltMax:e.target.value}))} placeholder="1250" style={inp}/>
                    </div>
                  </div>
                </div>

                {/* RPE réel */}
                <div style={{ background:'rgba(0,0,0,0.08)',borderRadius:10,padding:'10px 12px',border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' as const,color:'var(--text-dim)' }}>RPE réel</span>
                    <span style={{ fontSize:13,fontWeight:700,color:vDraft.vRpe!=null?rpeColor(vDraft.vRpe):'var(--text-dim)',fontFamily:'DM Mono,monospace' }}>
                      {vDraft.vRpe!=null?`${vDraft.vRpe}/10`:'—'}
                    </span>
                  </div>
                  <div style={{ display:'flex',gap:3,alignItems:'flex-end' }}>
                    {Array.from({length:11},(_,i)=>i).map(i=>{
                      const active=vDraft.vRpe===i, inRange=vDraft.vRpe!=null&&i<=vDraft.vRpe
                      return (
                        <button key={i} onClick={()=>setVDraft(d=>({...d,vRpe:i}))} style={{
                          flex:1,height:active?28:18,minWidth:16,borderRadius:4,border:'none',cursor:'pointer',
                          background:inRange?rpeColor(i):'var(--border)',color:inRange?'#fff':'var(--text-dim)',
                          fontSize:active?10:8,fontWeight:700,fontFamily:'DM Mono,monospace',
                          transition:'height 0.12s,background 0.12s',
                        }}>{i}</button>
                      )
                    })}
                  </div>
                </div>

                {/* Splits par km */}
                <div>
                  <label style={ls}>Splits par km (1 par ligne)</label>
                  <textarea value={vDraft.vSplits} onChange={e=>setVDraft(d=>({...d,vSplits:e.target.value}))} placeholder={'4:52\n4:48\n5:01'} rows={4}
                    style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:11,outline:'none' as const,resize:'vertical' as const,fontFamily:'DM Mono,monospace',boxSizing:'border-box' as const,lineHeight:1.7 }}
                  />
                </div>

                {/* Notes de séance */}
                <div>
                  <label style={ls}>Notes de séance</label>
                  <textarea value={vDraft.vNotes} onChange={e=>setVDraft(d=>({...d,vNotes:e.target.value}))} placeholder="Sensations, conditions, remarques…" rows={3}
                    style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:12,outline:'none' as const,resize:'vertical' as const,fontFamily:'DM Sans,sans-serif',boxSizing:'border-box' as const,lineHeight:1.5 }}
                  />
                </div>

                <button onClick={submitValidation} style={{
                  width:'100%',padding:'12px',borderRadius:10,border:'none',
                  background:'linear-gradient(135deg,#22c55e,#16a34a)',
                  color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,
                  cursor:'pointer',boxShadow:'0 4px 12px rgba(34,197,94,0.28)',
                }}>✓ Valider la séance</button>
              </div>
            )
          })()}

          {validPanel === 'compare' && (()=>{
            const planDur = session.durationMin
            const realDur = vDraft.vDurationMin
            const durDelta = realDur > 0 ? realDur - planDur : null
            const planRpe = session.rpe
            const realRpe = vDraft.vRpe
            const rpeDelta = planRpe!=null && realRpe!=null ? realRpe-planRpe : null
            const dist = parseFloat(vDraft.vDistance)
            const computedSpeed = dist && realDur ? `${(dist/(realDur/60)).toFixed(1)} km/h` : ''
            const computedPace = dist && realDur
              ? session.sport==='swim'
                ? (()=>{ const p=realDur/(dist*10); const pm=Math.floor(p); return `${pm}:${String(Math.round((p-pm)*60)).padStart(2,'0')} /100m` })()
                : ['run','hyrox'].includes(session.sport)
                ? (()=>{ const p=realDur/dist; const pm=Math.floor(p); return `${pm}:${String(Math.round((p-pm)*60)).padStart(2,'0')} /km` })()
                : ''
              : ''
            const fmtDelta = (d:number|null, fmtFn:(v:number)=>string) => {
              if(d==null) return null
              if(d===0) return '='
              return d>0 ? `+${fmtFn(d)}` : `-${fmtFn(Math.abs(d))}`
            }
            const rows: {label:string;plan:string;real:string;delta:string|null}[] = [
              { label:'Durée',    plan:formatHM(planDur),                     real:realDur>0?formatHM(realDur):'—',        delta:fmtDelta(durDelta, formatHM) },
              { label:'RPE',      plan:planRpe!=null?`${planRpe}/10`:'—',     real:realRpe!=null?`${realRpe}/10`:'—',      delta:fmtDelta(rpeDelta, v=>`${v}`) },
              { label:'FC moy',   plan:'—',                                   real:vDraft.vHrAvg?`${vDraft.vHrAvg} bpm`:'—', delta:null },
              { label:'Distance', plan:'—',                                   real:vDraft.vDistance?`${vDraft.vDistance} km`:'—', delta:null },
              { label:'Dénivelé', plan:'—',                                   real:vDraft.vElevation?`${vDraft.vElevation} m`:'—', delta:null },
              ...(computedSpeed ? [{ label:'Vitesse', plan:'—', real:computedSpeed, delta:null }] : []),
              ...(computedPace  ? [{ label:'Allure',  plan:'—', real:computedPace,  delta:null }] : []),
              ...(vDraft.vWattsAvg      ? [{ label:'Watts moy',      plan:'—', real:`${vDraft.vWattsAvg} W`,      delta:null }] : []),
              ...(vDraft.vWattsWeighted ? [{ label:'Watts pondérés', plan:'—', real:`${vDraft.vWattsWeighted} W`, delta:null }] : []),
              ...(vDraft.vCadenceAvg    ? [{ label:'Cadence moy',    plan:'—', real:`${vDraft.vCadenceAvg} rpm`,  delta:null }] : []),
              ...(vDraft.vCadenceMax    ? [{ label:'Cadence max',    plan:'—', real:`${vDraft.vCadenceMax} rpm`,  delta:null }] : []),
              ...(vDraft.vAltMax        ? [{ label:'Altitude max',   plan:'—', real:`${vDraft.vAltMax} m`,        delta:null }] : []),
              ...(vDraft.vTempMax       ? [{ label:'Température',    plan:'—', real:`${vDraft.vTempMax}°C`,       delta:null }] : []),
              ...(vDraft.vHumidity      ? [{ label:'Humidité',       plan:'—', real:`${vDraft.vHumidity}%`,       delta:null }] : []),
            ]
            const splitLines = vDraft.vSplits.trim().split('\n').filter(Boolean)
            return (
              <div>
                {/* Header colonnes */}
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 64px',gap:4,marginBottom:6,padding:'0 8px' }}>
                  {['Métrique','Prévu','Réel','Δ'].map(h=>(
                    <span key={h} style={{ fontSize:9,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase' as const,color:'var(--text-dim)' }}>{h}</span>
                  ))}
                </div>
                <div style={{ display:'flex',flexDirection:'column' as const,gap:3 }}>
                  {rows.map(r=>(
                    <div key={r.label} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 64px',gap:4,padding:'7px 8px',borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                      <span style={{ fontSize:11,fontWeight:600,color:'var(--text-mid)' }}>{r.label}</span>
                      <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text-dim)' }}>{r.plan}</span>
                      <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text)',fontWeight:600 }}>{r.real}</span>
                      <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',fontWeight:700,
                        color:r.delta==null||r.delta==='='?'var(--text-dim)':r.delta.startsWith('+')?'#f97316':'#22c55e',
                      }}>{r.delta??'—'}</span>
                    </div>
                  ))}
                </div>

                {/* Splits */}
                {splitLines.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <p style={{ fontSize:10,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:'0 0 8px' }}>Splits</p>
                    <div style={{ background:'var(--bg-card2)',borderRadius:10,padding:'8px 12px',border:'1px solid var(--border)' }}>
                      {splitLines.map((s,i)=>(
                        <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:i<splitLines.length-1?'1px solid var(--border)':'none' }}>
                          <span style={{ fontSize:10,color:'var(--text-dim)' }}>km {i+1}</span>
                          <span style={{ fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text)',fontWeight:600 }}>{s.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {vDraft.vNotes && (
                  <div style={{ marginTop:14 }}>
                    <p style={{ fontSize:10,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase' as const,color:'var(--text-dim)',margin:'0 0 6px' }}>Notes de séance</p>
                    <p style={{ fontSize:12,color:'var(--text)',lineHeight:1.5,margin:0,padding:'10px 12px',background:'var(--bg-card2)',borderRadius:9,border:'1px solid var(--border)' }}>{vDraft.vNotes}</p>
                  </div>
                )}

                <button onClick={()=>setValidPanel('form')} style={{ marginTop:14,width:'100%',padding:'9px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:600 }}>
                  Modifier les réels
                </button>
              </div>
            )
          })()}
        </section>
      </main>

      {/* ── FOOTER (sticky bottom) ─────────────────────────── */}
      <footer style={{
        padding:'14px 28px',borderTop:'1px solid var(--border)',
        background:'var(--bg-card2)', flexShrink:0,
        display:'flex',gap:10,alignItems:'center',
      }}>
        <button onClick={()=>onDelete(session.id)} style={{
          padding:'9px 14px', borderRadius:9,
          background:'rgba(255,95,95,0.10)', border:'1px solid rgba(255,95,95,0.25)',
          color:'#ff5f5f', fontSize:12, cursor:'pointer', fontWeight:600,
        }}>Supprimer la séance</button>
        <div style={{ flex:1 }} />
        <button onClick={onClose} style={{
          padding:'9px 16px', borderRadius:9,
          background:'transparent', border:'1px solid var(--border)',
          color:'var(--text-mid)', fontSize:12, cursor:'pointer',
        }}>Fermer</button>
        <button onClick={handleSave} disabled={!isDirty} style={{
          padding:'9px 18px', borderRadius:9, border:'none',
          background: isDirty ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'rgba(107,114,128,0.20)',
          color: isDirty ? '#fff' : 'var(--text-dim)',
          fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12,
          cursor: isDirty ? 'pointer' : 'default',
          boxShadow: isDirty ? '0 4px 12px rgba(0,200,224,0.25)' : 'none',
          transition:'box-shadow 0.14s',
        }}>Enregistrer</button>
      </footer>
    </div>
  )
}

function WeekTab({ trainingWeek }:{ trainingWeek:ReturnType<typeof usePlanning>['sessions'] }) {
  const { tasks, activities, intensities, addTask, updateTask, deleteTask } = usePlanning()
  const [taskModal,       setTaskModal]       = useState<{dayIndex:number;startHour:number}|null>(null)
  const [editModal,       setEditModal]       = useState<WeekTask|null>(null)
  const [mainTaskModal,   setMainTaskModal]   = useState<{dayIndex:number}|null>(null)
  const [activityDetail,  setActivityDetail]  = useState<TrainingActivity|null>(null)
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
    id:`tr_${s.id}`, title:`[${SPORT_ABBR[s.sport as SportType]}] ${s.title}`, type:'sport' as TaskType,
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
        {t.priority && <span style={{ position:'absolute',top:1,right:2,fontSize:8,color:'#ffb340',fontWeight:900 }}>•</span>}
        <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:t.fromTraining?border:'var(--text)',paddingRight:t.priority?10:0 }}>{t.title}</p>
        <p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0' }}>{formatHM(t.durationMin)}</p>
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
                  <p style={{ fontSize:8,fontWeight:600,color:'#ffb340',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>• {mt.title}</p>
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
                  {/* Activités importées de Training (cliquables → modal détail) */}
                  {activities.filter(a=>a.dayIndex===d&&a.startHour===hour).map(a=>{
                    const sp=normalizeSportType(a.sport); const topPx=(a.startMin/60)*CELL_H
                    return (
                      <div key={a.id} onClick={e=>{e.stopPropagation();setActivityDetail(a)}}
                        style={{ position:'absolute',top:topPx,left:3,right:3,borderRadius:5,padding:'3px 5px',background:`${SPORT_BORDER[sp]}18`,borderLeft:`2px solid ${SPORT_BORDER[sp]}`,cursor:'pointer',zIndex:1 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                          <SportBadge sport={sp} size="xs"/>
                          <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{a.name}</p>
                        </div>
                        <p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatHM(Math.round(a.elapsedTime/60))}</p>
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
                        {t.priority && <span style={{ position:'absolute',top:1,right:2,fontSize:8,color:'#ffb340',fontWeight:900 }}>•</span>}
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
                  <span style={{ fontSize:11,color:'#ffb340',fontWeight:700,whiteSpace:'nowrap' as const }}>• Focus du jour</span>
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
      {activityDetail && <ActivityQuickModal activity={activityDetail} onClose={()=>setActivityDetail(null)}/>}

      {/* Main Task Modal */}
      {mainTaskModal&&<div onClick={()=>setMainTaskModal(null)} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:16,border:'1px solid #ffb34066',padding:22,maxWidth:380,width:'100%',boxShadow:'0 0 0 1px #ffb34033' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
            <span style={{ fontSize:18,color:'#ffb340',fontWeight:900 }}>•</span>
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
            <button onClick={()=>handleAddMainTask(mainTaskModal.dayIndex)} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#ffb340,#f97316)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>Ajouter</button>
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
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
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
          <p style={{ fontSize:13,fontWeight:500,margin:0,color:priority?'#ffb340':'var(--text-mid)' }}>Tâche prioritaire</p>
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
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
        </div>
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Titre</p><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:12 }}>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Heure</p><input type="number" value={form.startHour} onChange={e=>setForm({...form,startHour:parseInt(e.target.value)})} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Durée (min)</p><input type="number" value={form.durationMin} onChange={e=>setForm({...form,durationMin:parseInt(e.target.value)})} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14,cursor:'pointer' }} onClick={()=>setForm({...form,priority:!form.priority})}>
          <div style={{ width:20,height:20,borderRadius:5,border:`2px solid ${form.priority?'#ffb340':'var(--border)'}`,background:form.priority?'#ffb340':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{form.priority&&<span style={{ color:'#fff',fontSize:12 }}>✓</span>}</div>
          <p style={{ fontSize:13,margin:0,color:form.priority?'#ffb340':'var(--text-mid)' }}>Prioritaire</p>
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
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})} · {SPORT_LABEL[r.sport as SportType]}</p>
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
                    <SportBadge sport={x.sport as SportType} size="sm"/>
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
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
        </div>
        <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Sport</p>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:14 }}>
          {RACE_SPORTS.map(s=>{ const rc=RACE_SPORT_COLOR[s]; return <button key={s} onClick={()=>{setSport(s);setHyroxCat('');setHyroxLvl('');setHyroxGen('')}} style={{ padding:'5px 9px',borderRadius:8,border:'1px solid',borderColor:sport===s?rc.border:'var(--border)',background:sport===s?rc.bg:'var(--bg-card2)',color:sport===s?rc.border:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>{RSL[s]}</button> })}
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
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
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
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:'3px 0 0' }}>{SPORT_LABEL[race.sport as SportType] ?? race.sport} · {new Date(race.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            {race.runDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'2px 0 0' }}>📏 {race.runDistance} — {RUN_KM[race.runDistance]}km</p>}
            {race.triDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'2px 0 0' }}>🔱 {race.triDistance} · 🏊{TRI_SWIM[race.triDistance]} 🚴{TRI_BIKE[race.triDistance]} 🏃{TRI_RUN[race.triDistance]}</p>}
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:5,marginBottom:14 }}>
          {(['detail','validate'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:'7px',borderRadius:9,border:'1px solid',borderColor:tab===t?RACE_SPORT_COLOR[race.sport].border:'var(--border)',background:tab===t?RACE_SPORT_COLOR[race.sport].bg:'var(--bg-card2)',color:tab===t?RACE_SPORT_COLOR[race.sport].border:'var(--text-mid)',fontSize:11,fontWeight:tab===t?600:400,cursor:'pointer' }}>
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

            <button onClick={()=>onValidate({...form,validated:true,validationData:{...vd,vSpeed:speed}})} style={{ width:'100%',padding:11,borderRadius:10,background:`linear-gradient(135deg,${RACE_SPORT_COLOR[race.sport].border},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:4 }}>Valider les résultats</button>
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
  const { sessions, races, intensities, weekStart } = usePlanning()
  const { zones } = useTrainingZones()

  const TABS: [PlanningTab,string,string,string,string][] = [
    ['training','Planning Training','Training','#00c8e0','rgba(0,200,224,0.10)'],
    ['week',    'Planning Week',    'Week',    '#a78bfa','rgba(167,139,250,0.10)'],
  ]

  const aiContext = {
    page: 'planning',
    weekStart,
    sessions: sessions.map(s => ({
      day_index:    s.dayIndex,
      sport:        s.sport,
      title:        s.title,
      duration_min: s.durationMin,
      intensity:    (s as any).intensity ?? 'mid',
      tss:          s.tss,
      status:       s.status,
      notes:        s.notes,
    })),
    intensities,
    races: races.map(r => ({
      name:         r.name,
      sport:        r.sport,
      date:         r.date,
      level:        r.level,
      goal:         r.goal,
      goal_time:    r.goalTime,
      run_distance: r.runDistance,
      tri_distance: r.triDistance,
    })),
    zones: {
      run:  zones.run,
      bike: zones.bike,
      swim: zones.swim,
    },
  }

  return (
    <div style={{ padding:'24px 28px',maxWidth:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Planning</h1>
          <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>Training · Semaine · Saison</p>
        </div>
        <AIAssistantButton agent="planning" context={aiContext} />
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
    </div>
  )
}
