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
import { formatDuration } from '@/lib/utils'
import nDynamic from 'next/dynamic'
const AIPanelDynamic = nDynamic(() => import('@/components/ai/AIPanel'), { ssr: false })

// ── Types ─────────────────────────────────────────
type PlanningTab   = 'training' | 'week'
type PlanVariant   = 'A' | 'B'
type WeekRange     = 1 | 5 | 10
type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym' | 'elliptique'
type SessionStatus = 'planned' | 'done'
type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown' | 'circuit_header'
type CircuitType   = 'series' | 'circuit' | 'superset' | 'emom' | 'tabata'
type BlockMode     = 'single' | 'interval' | CircuitType
type TaskType      = 'sport' | 'work' | 'personal' | 'recovery'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type CalView       = 'year' | 'month'
type TrainingView  = 'horizontal' | 'vertical'
type RaceSport     = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'
type CyclingSub    = 'velo' | 'vtt' | 'ht'

// ── Constants ─────────────────────────────────────
const SPORT_BG: Record<SportType,string>     = { swim:'rgba(6,182,212,0.13)', run:'rgba(249,115,22,0.13)', bike:'rgba(59,130,246,0.13)', hyrox:'rgba(239,68,68,0.13)', gym:'rgba(139,92,246,0.13)', rowing:'rgba(20,184,166,0.13)', elliptique:'rgba(168,85,247,0.13)' }
const SPORT_BORDER: Record<SportType,string> = { swim:'#06b6d4', run:'#f97316', bike:'#3b82f6', hyrox:'#ef4444', gym:'#8b5cf6', rowing:'#14b8a6', elliptique:'#a855f7' }

const SPORT_LABEL: Record<SportType,string>  = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation', rowing:'Aviron', elliptique:'Elliptique' }
const SPORT_ABBR: Record<SportType,string>   = { run:'RUN', bike:'BIKE', swim:'SWIM', hyrox:'HRX', gym:'GYM', rowing:'ROW', elliptique:'ELLIP' }
const CYCLING_SUB_LABEL: Record<CyclingSub,string> = { velo:'Vélo route', vtt:'VTT', ht:'Home Trainer' }
const TRAINING_TYPES: Partial<Record<SportType,string[]>> = {
  run:       ['EF','SL1','SL2','VMA','Strides','Heat Training'],
  bike:      ['EF','SL1','SL2','PMA','Sprints','Heat Training'],
  swim:      ['EF','Technique','Seuil','Sprints'],
  hyrox:     ['Simulation','Ergo','Wall Ball','BBJ','Fentes','Sled Push','Sled Pull','Farmer Carry'],
  gym:       ['Strength','Strength endurance','Explosivité'],
  rowing:    ['EF','SL1','SL2','PMA','Sprints'],
  elliptique:['EF','SL1','SL2','PMA','Heat Training'],
}
const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const ZONE_COLORS_7 = ['#6b7280', '#4ade80', '#facc15', '#fb923c', '#f87171', '#c084fc', '#ec4899']
const ZONE_LABELS_7 = ['Z1 Récup', 'Z2 End.', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2', 'Z6 Anaé.', 'Z7 Sprint']
const TASK_CONFIG: Record<TaskType,{label:string;color:string;bg:string}> = {
  sport:    { label:'Sport',     color:'#22c55e', bg:'rgba(34,197,94,0.15)'   },
  work:     { label:'Travail',   color:'#3b82f6', bg:'rgba(59,130,246,0.15)'  },
  personal: { label:'Personnel', color:'#a78bfa', bg:'rgba(167,139,250,0.15)' },
  recovery: { label:'Récup',     color:'#ffb340', bg:'rgba(255,179,64,0.15)'  },
}
const RACE_CONFIG: Record<RaceLevel,{label:string;color:string;bg:string;border:string}> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'#22c55e' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'#f97316' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'#ef4444' },
  gty:       { label:'GTY',        color:'var(--gty-text)', bg:'var(--gty-bg)', border:'var(--gty-border)' },
}
const RACE_SPORT_COLOR: Record<RaceSport,{border:string;bg:string}> = {
  run:     { border:'#f97316', bg:'rgba(249,115,22,0.13)'  },
  bike:    { border:'#3b82f6', bg:'rgba(59,130,246,0.13)'  },
  swim:    { border:'#06b6d4', bg:'rgba(6,182,212,0.13)'   },
  hyrox:   { border:'#ef4444', bg:'rgba(239,68,68,0.13)'   },
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
const BLOCK_TYPE_LABEL: Record<BlockType,string> = { warmup:'Échauffement', effort:'Effort', recovery:'Récupération', cooldown:'Retour calme', circuit_header:'Circuit' }
const CIRCUIT_TYPES: Array<{ id: CircuitType; label: string; desc: string; icon: string; slash: string }> = [
  { id: 'series',   label: 'Séries',   desc: 'Toutes les séries d\'un exo avant de passer au suivant', icon: '▤', slash: 'series'   },
  { id: 'circuit',  label: 'Lap',      desc: 'Enchaîner les exos, recommencer X rounds',               icon: '↻', slash: 'lap'      },
  { id: 'superset', label: 'Superset', desc: 'Alterner 2 exos sans repos entre eux',                   icon: '⇅', slash: 'superset' },
  { id: 'emom',     label: 'EMOM',     desc: '1 exo par minute, repos = temps restant',                icon: '⏱', slash: 'emom'     },
  { id: 'tabata',   label: 'Tabata',   desc: '20s effort / 10s repos × 8 rounds',                     icon: '⚡', slash: 'tabata'   },
]
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
  // Terrain planning — km sur le parcours (overlay ElevationChart)
  _startKm?: number; _endKm?: number
}
interface Session {
  id:string; sport:SportType; title:string; time:string; durationMin:number
  tss?:number; main?:boolean; status:SessionStatus; notes?:string; blocks:Block[]
  rpe?:number; dayIndex:number; planVariant?:PlanVariant
  // Phase 5 — snapshot immuable de la version IA (pour badge "modifié" + reset)
  originalContent?: Record<string, unknown>
  vDuration?:string; vDistance?:string; vElevation?:string; vSpeed?:string
  vHrAvg?:string; vPace?:string
  vHyroxStations?: Record<string,string>; vHyroxRuns?: string[]
  vSwimTime?:string; vBikeTime?:string; vRunTime?:string; vT1?:string; vT2?:string
  vRpe?:number; vSplits?:string[]; vTempMax?:string; vHumidity?:string; vAltMax?:string; vNotes?:string
  vWattsAvg?:string; vWattsWeighted?:string; vCadenceAvg?:string; vCadenceMax?:string
  parcoursData?: {
    name: string; distance: number | null; elevation: number | null
    points: number; elevationProfile: Array<{ distKm: number; ele: number }>
  }
  nutritionItems?: NutritionItem[]
}
interface WeekTask {
  id:string; title:string; type:TaskType; dayIndex:number
  startHour:number; startMin:number; durationMin:number
  description?:string; priority?:boolean; fromTraining?:boolean; color?:string
  isMain?:boolean; sport?:SportType
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
function hMinToMin(h:number,m:number):number { return h*60+m }
function minToHMin(total:number):{ h:number; m:number } { const r=Math.round(total); return { h:Math.floor(r/60), m:r%60 } }
function formatHM(totalMin:number):string {
  const h=Math.floor(totalMin/60), m=Math.round(totalMin%60)
  if(h===0) return `${m}min`
  return m===0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`
}
/** Affiche des minutes décimales en format min:sec — ex: 6.4 → "6:24" */
function fmtDuration(min: number): string {
  const m = Math.floor(min)
  const s = Math.round((min % 1) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
// Keep formatDur as alias for backward compat in display
function formatDur(min:number):string { return formatHM(min) }
function daysUntil(d:string):number { return Math.ceil((new Date(d).getTime()-Date.now())/(1000*60*60*24)) }

// Phase 5 — Détecte si la séance a été modifiée par l'athlète vs la version IA originale
function isSessionModified(s: Session): boolean {
  if (!s.originalContent) return false
  const o = s.originalContent
  if (typeof o.titre === 'string' && o.titre !== s.title) return true
  if (typeof o.duration_min === 'number' && o.duration_min !== s.durationMin) return true
  if (typeof o.notes === 'string' && (o.notes || '') !== (s.notes || '')) return true
  if (typeof o.rpe === 'number' && o.rpe !== (s.rpe ?? null)) return true
  return false
}
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
    const b = r as unknown as Block
    // Garantir que mode est un CircuitType valide pour les circuit_header
    if (b.type === 'circuit_header') {
      const validModes: BlockMode[] = ['series','circuit','superset','emom','tabata']
      if (!validModes.includes(b.mode)) {
        return { ...b, mode: 'series' as BlockMode }
      }
    }
    return b
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

// Mappe le sport interne → nom attendu par /api/session-builder
const SPORT_TO_BUILDER: Record<SportType, string> = {
  run: 'running', bike: 'cycling', swim: 'natation',
  hyrox: 'hyrox', gym: 'gym', rowing: 'rowing', elliptique: 'cycling',
}

// Convertit une zone string (Z1-Z5, SL1, SL2, EF, VMA, PMA…) → numéro 1-5
function parseZoneStr(s: string): number {
  const z = s.toUpperCase().trim()
  if (['EF','Z1','RECOVERY'].includes(z))               return 1
  if (['Z2'].includes(z))                               return 2
  if (['SL1','Z3','TEMPO'].includes(z))                 return 3
  if (['SL2','Z4','SEUIL','THRESHOLD'].includes(z))     return 4
  if (['VMA','PMA','Z5','VO2MAX','MAX'].includes(z))    return 5
  const n = parseInt(z.replace(/\D/g,''))
  return isNaN(n) ? 3 : Math.max(1, Math.min(5, n))
}

// Convertit un bloc /api/session-builder → Block utilisé dans le constructeur
function sessionBuilderBlocToBlock(b: {
  nom: string
  repetitions: number
  duree_effort: number
  recup: number
  zone_effort: string[]
  zone_recup: string[]
  watts: number | null
  allure_cible: string | null
  fc_cible: number | null
  consigne: string
}): Block {
  const zone    = parseZoneStr(b.zone_effort[0] ?? 'Z3')
  const recZone = parseZoneStr(b.zone_recup[0]  ?? 'Z1')
  const value   = b.watts != null ? String(b.watts) : (b.allure_cible ?? '')
  const nom     = b.nom.toLowerCase()
  let type: BlockType = 'effort'
  if (/échauffe|echauff|warm/.test(nom))   type = 'warmup'
  else if (/retour|cool|calme/.test(nom))  type = 'cooldown'
  else if (zone <= 1 && /récup/.test(nom)) type = 'recovery'
  const label = b.consigne ? `${b.nom} — ${b.consigne.slice(0, 60)}` : b.nom
  const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  if (b.repetitions > 1) {
    return {
      id, mode: 'interval', type, zone, value,
      hrAvg: b.fc_cible ? String(b.fc_cible) : '',
      label: b.nom,
      durationMin: b.repetitions * (b.duree_effort + Math.max(b.recup, 0)),
      reps: b.repetitions,
      effortMin: b.duree_effort,
      recoveryMin: b.recup > 0 ? b.recup : 1,
      recoveryZone: recZone,
    }
  }
  return {
    id, mode: 'single', type, zone, value,
    hrAvg: b.fc_cible ? String(b.fc_cible) : '',
    label, durationMin: b.duree_effort,
  }
}
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
    bike:1.0, run:0.9, swim:0.85, rowing:0.95, hyrox:1.05, gym:0.7, elliptique:0.85
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

function computeTSSRange(
  blocks: Block[],
  sport: SportType,
  durationMin: number,
  rpe: number,
  athlete: { ftp: number | null; runThresholdPaceSec: number | null; cssSecPer100m: number | null; rowThresholdSecPer500m: number | null; ctl: number | null } | null,
): { low: number; high: number } {
  const isEndurance = ['run', 'bike', 'swim', 'rowing', 'elliptique'].includes(sport)

  if (!isEndurance) {
    const sportFactor = sport === 'hyrox' ? 1.05 : 0.65
    const ifFromRpe = 0.45 + (rpe / 10) * 0.7
    const base = Math.round((durationMin / 60) * ifFromRpe * ifFromRpe * 100 * sportFactor)
    return { low: Math.round(base * 0.85), high: Math.round(base * 1.15) }
  }

  if (blocks.length === 0) return { low: 0, high: 0 }

  const SF: Record<string, number> = { bike: 1.0, run: 0.9, swim: 0.85, rowing: 0.95, elliptique: 0.9 }
  const sf = SF[sport] ?? 0.9
  const IF_BY_ZONE = [0.55, 0.70, 0.83, 0.95, 1.10, 1.20, 1.35]

  let baseTSS = 0
  for (const b of blocks) {
    const zoneIdx = Math.max(0, Math.min(6, b.zone - 1))
    const ifVal = IF_BY_ZONE[zoneIdx] ?? 0.70
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) {
      const recZoneIdx = Math.max(0, Math.min(6, (b.recoveryZone ?? 1) - 1))
      const ifRec = IF_BY_ZONE[recZoneIdx] ?? 0.55
      baseTSS += b.reps * (b.effortMin / 60) * ifVal * ifVal * 100 * sf
      baseTSS += b.reps * (b.recoveryMin / 60) * ifRec * ifRec * 100 * sf
    } else {
      baseTSS += (b.durationMin / 60) * ifVal * ifVal * 100 * sf
    }
  }

  let fitnessFactor = 1.0
  if (athlete?.ctl != null && athlete.ctl > 0) {
    fitnessFactor = 1.0 + (40 - Math.min(80, athlete.ctl)) / 100
    fitnessFactor = Math.max(0.80, Math.min(1.25, fitnessFactor))
  }

  const adjusted = Math.round(baseTSS * fitnessFactor)
  return { low: Math.round(adjusted * 0.90), high: Math.round(adjusted * 1.10) }
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
  const lower = (s??'').toLowerCase()
  const m:Record<string,SportType>={
    running:'run', run:'run', trail_run:'run', trail_running:'run', hike:'run', walk:'run', trailrun:'run',
    cycling:'bike', ride:'bike', bike:'bike', virtual_ride:'bike', virtual_bike:'bike', virtualride:'bike',
    swimming:'swim', swim:'swim',
    weighttraining:'gym', weight_training:'gym', gym:'gym', workout:'gym', strengthtraining:'gym', strength_training:'gym',
    rowing:'rowing', row:'rowing',
    elliptical:'elliptique', elliptique:'elliptique',
    hyrox:'hyrox',
    triathlon:'run',
  }
  return m[lower]??((['run','bike','swim','hyrox','gym','rowing','elliptique'] as SportType[]).includes(lower as SportType)?lower as SportType:'run')
}

// Retourne true si la séance est une séance repos/off (durée 0 ou sport/titre repos).
// Utilisé pour exclure les repos de tous les graphiques de PlanHeaderAndGraphics.
function isRestSession(s: {
  sport?: string | null
  title?: string
  intensity?: string | null
  durationMin?: number | null
  duration_min?: number | null
}): boolean {
  const sport = (s.sport ?? '').toLowerCase()
  const title = (s.title ?? '').toLowerCase()
  if (['repos','rest','recovery','off','jour off','rest day'].includes(sport)) return true
  if (/\b(repos|rest day|jour (de )?repos|off|récup(ération)? passive)\b/i.test(title) && (s.durationMin ?? s.duration_min ?? 0) === 0) return true
  if ((s.durationMin ?? s.duration_min ?? 0) === 0) return true
  return false
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
      originalContent: r.original_content ?? undefined,
      parcoursData: r.parcours_data ?? undefined,
      nutritionItems: r.nutrition_data ?? undefined,
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

  // Refresh déclenché par AIPanel après apply d'un tool call (add/update/delete/move session)
  useEffect(()=>{
    const handler = () => { void load() }
    window.addEventListener('thw:sessions-changed', handler)
    return () => window.removeEventListener('thw:sessions-changed', handler)
  },[load])

  async function addSession(s:Omit<Session,'id'>) {
    const { data:{ user } } = await supabase.auth.getUser(); if(!user)return
    const { data,error } = await supabase.from('planned_sessions').insert({
      user_id:user.id, week_start:weekStart, day_index:s.dayIndex,
      sport:s.sport, title:s.title, time:s.time, duration_min:s.durationMin,
      tss:s.tss??null, status:s.status, notes:s.notes??null,
      rpe:s.rpe??null, blocks:s.blocks??[], validation_data:{},
      plan_variant:s.planVariant??'A',
      parcours_data: s.parcoursData ?? null,
      nutrition_data: (s as unknown as Session & { nutritionItems?: NutritionItem[] }).nutritionItems ?? null,
    }).select().single()
    if(!error&&data) {
      setSessions(p=>[...p,{...s,id:data.id}])
      window.dispatchEvent(new Event('thw:sessions-changed'))
    }
  }

  function buildSessionPatch(upd:Partial<Session>): Record<string,unknown> {
    const patch: Record<string,unknown> = {
      title:upd.title, time:upd.time, duration_min:upd.durationMin,
      notes:upd.notes??null, rpe:upd.rpe??null, blocks:upd.blocks??[],
      tss:upd.tss??null, status:upd.status,
      validation_data:{ vDuration:upd.vDuration, vDistance:upd.vDistance, vHrAvg:upd.vHrAvg, vSpeed:upd.vSpeed },
      updated_at:new Date().toISOString(),
    }
    if (upd.sport) patch.sport = upd.sport
    if (upd.parcoursData !== undefined) patch.parcours_data = upd.parcoursData ?? null
    if (upd.nutritionItems !== undefined) patch.nutrition_data = upd.nutritionItems ?? null
    return patch
  }

  async function updateSession(id:string, upd:Partial<Session>) {
    await supabase.from('planned_sessions').update(buildSessionPatch(upd)).eq('id',id)
    setSessions(p=>p.map(s=>s.id===id?{...s,...upd}:s))
    window.dispatchEvent(new Event('thw:sessions-changed'))
  }

  // Silent variant — persiste sans déclencher load() ni fermer les modales
  async function updateSessionSilent(id:string, upd:Partial<Session>) {
    await supabase.from('planned_sessions').update(buildSessionPatch(upd)).eq('id',id)
    setSessions(p=>p.map(s=>s.id===id?{...s,...upd}:s))
    // Pas de thw:sessions-changed → load() ne se déclenche pas → les modales restent ouvertes
  }

  async function deleteSession(id:string) {
    await supabase.from('planned_sessions').delete().eq('id',id)
    setSessions(p=>p.filter(s=>s.id!==id))
    window.dispatchEvent(new Event('thw:sessions-changed'))
  }

  async function moveSession(id:string, toDay:number) {
    await supabase.from('planned_sessions').update({ day_index:toDay, updated_at:new Date().toISOString() }).eq('id',id)
    setSessions(p=>p.map(s=>s.id===id?{...s,dayIndex:toDay}:s))
    window.dispatchEvent(new Event('thw:sessions-changed'))
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
    addSession, updateSession, updateSessionSilent, deleteSession, moveSession,
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

// ════════════════════════════════════════════════
// EXERCISE DATABASE — Musculation & Hyrox
// ════════════════════════════════════════════════
type ExoCategory = 'push' | 'pull' | 'legs' | 'mixte' | 'abdos' | 'hyrox'
interface ExoDefinition {
  id: string; name: string; aliases: string[]; category: ExoCategory
  hasWeight: boolean; hasDistance: boolean; hasKcal: boolean; hasTime: boolean
  defaultReps: number; defaultSets: number; defaultRestSec: number
}
interface ExerciseItem {
  id: string; exoId: string; name: string; category: ExoCategory
  sets: number; reps: number
  weightKg?: number; distanceM?: number; kcal?: number; targetTimeSec?: number
  restSec: number; notes?: string
}
interface ExoCircuit {
  id: string
  name: string
  type: string          // 'series' | 'lap' | 'superset' | 'emom' | 'tabata'
  rounds: number
  restBetweenRoundsSec: number
  targetTimeSec?: number
}

const EXO_CATEGORY_COLOR: Record<ExoCategory, string> = {
  push:  '#f97316',
  pull:  '#3b82f6',
  legs:  '#22c55e',
  mixte: '#a855f7',
  abdos: '#06b6d4',
  hyrox: '#ec4899',
}
const EXO_CATEGORY_LABEL: Record<ExoCategory, string> = {
  push:  'Push',
  pull:  'Pull',
  legs:  'Legs',
  mixte: 'Mixte',
  abdos: 'Abdos',
  hyrox: 'Hyrox',
}

const EXERCISE_DATABASE: ExoDefinition[] = [
  // PUSH
  { id:'bench_press', name:'Bench Press', aliases:['développé couché','dc','bench'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'dips', name:'Dips', aliases:['dips lestés','weighted dips'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'push_press', name:'Push Press', aliases:['développé militaire','military press','ohp'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'push_up', name:'Push Up', aliases:['pompe','pompes','pushup'], category:'push', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:60 },
  { id:'db_bench', name:'Dumbbell Bench Press', aliases:['bench press haltères','dc haltères'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:4, defaultRestSec:90 },
  { id:'incline_bench', name:'Incline Bench Press', aliases:['bench press incliné','développé incliné','dc incliné'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:4, defaultRestSec:90 },
  { id:'hspu', name:'Handstand Push Up', aliases:['hspu','pompe poirier'], category:'push', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:120 },
  { id:'pike_push_up', name:'Pike Push Up', aliases:['pompe pike'], category:'push', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'lateral_raise', name:'Lateral Raise', aliases:['élévation latérale','élévations latérales','side lateral raise'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'ohp', name:'Overhead Press', aliases:['ohp','press barre','strict press'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'triceps_pushdown', name:'Triceps Pushdown', aliases:['extension triceps','triceps poulie','pushdown'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'chest_fly', name:'Chest Fly', aliases:['écarté poulie','écarté haltères','pec fly','butterfly'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'cable_crossover', name:'Cable Crossover', aliases:['poulie vis à vis','poulie vis-à-vis','cable fly','cross over poulie'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  // PULL
  { id:'pull_up', name:'Pull Up', aliases:['traction','tractions','tractions lestées','weighted pull up'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'barbell_row', name:'Barbell Row', aliases:['rowing','rowing barre','rowing banc'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:90 },
  { id:'gorilla_row', name:'Gorilla Row', aliases:['rowing gorilla'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'db_row', name:'Dumbbell Row', aliases:['rowing haltère','rowing haltères','rowing 1 bras'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'australian_pullup', name:'Australian Pull Up', aliases:['traction australienne','inverted row'], category:'pull', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'rope_climb', name:'Rope Climb', aliases:['montée de corde','grimper corde'], category:'pull', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:3, defaultSets:3, defaultRestSec:120 },
  { id:'lat_pulldown', name:'Lat Pulldown', aliases:['tirage vertical','tirage poulie haute'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'face_pull', name:'Face Pull', aliases:['face pull poulie'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:60 },
  { id:'bicep_curl', name:'Bicep Curl', aliases:['curl biceps','curl barre','curl haltères'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'hammer_curl', name:'Hammer Curl', aliases:['curl marteau'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  // LEGS
  { id:'squat', name:'Squat', aliases:['back squat','squat barre'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:150 },
  { id:'front_squat', name:'Front Squat', aliases:['squat avant'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:4, defaultRestSec:150 },
  { id:'deadlift', name:'Deadlift', aliases:['soulevé de terre','sdt'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:180 },
  { id:'rdl_db', name:'Romanian Deadlift DB', aliases:['rdl haltères','soulevé de terre roumain haltères'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'trap_deadlift', name:'Trap Bar Deadlift', aliases:['deadlift trap','hex bar deadlift'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:4, defaultRestSec:150 },
  { id:'bulgarian', name:'Bulgarian Split Squat', aliases:['bulgarian lunge','fente bulgare'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:90 },
  { id:'lunge', name:'Lunge', aliases:['fente','fentes'], category:'legs', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'leg_press', name:'Leg Press', aliases:['presse','presse à cuisses'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:4, defaultRestSec:120 },
  { id:'zercher', name:'Zercher Squat', aliases:['zercher'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:3, defaultRestSec:120 },
  { id:'jump_squat', name:'Jump Squat', aliases:['squat sauté','squat jump'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'lateral_jump', name:'Lateral Jump', aliases:['jump latéral','saut latéral'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'pistol_squat', name:'Pistol Squat', aliases:['squat pistol','squat une jambe'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:3, defaultRestSec:90 },
  { id:'box_jump', name:'Box Jump', aliases:['saut sur box'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:60 },
  { id:'drop_jump', name:'Drop Jump', aliases:['saut en contrebas'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:3, defaultRestSec:90 },
  { id:'squat_jump_box', name:'Squat Jump to Box', aliases:['squat jump box'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:60 },
  { id:'sled_push_legs', name:'Sled Push', aliases:['poussée de luge','prowler push'], category:'legs', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:4, defaultRestSec:90 },
  { id:'hip_thrust', name:'Hip Thrust', aliases:['hip thrust barre','relevé de bassin'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'leg_extension', name:'Leg Extension', aliases:['extension quadriceps'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'leg_curl', name:'Leg Curl', aliases:['leg curl couché','curl ischio'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'calf_raise', name:'Calf Raise', aliases:['mollets debout','mollets assis','élévation mollets'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:45 },
  { id:'step_up', name:'Step Up', aliases:['montée sur box'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'goblet_squat', name:'Goblet Squat', aliases:['squat gobelet','squat haltère'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'isometric_squat', name:'Isometric Squat', aliases:['squat isométrique','squat iso','iso squat'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:60 },
  // MIXTE
  { id:'power_snatch', name:'Power Snatch', aliases:['arraché','snatch haltères','snatch barre'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:120 },
  { id:'thruster', name:'Thruster', aliases:['thruster barre','thruster haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:90 },
  { id:'clean', name:'Clean', aliases:['épaulé','power clean'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:120 },
  { id:'clean_jerk', name:'Clean & Jerk', aliases:['clean and jerk','épaulé jeté'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:3, defaultSets:5, defaultRestSec:150 },
  { id:'snatch', name:'Snatch', aliases:['arraché complet'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:3, defaultSets:5, defaultRestSec:150 },
  { id:'tgu', name:'Turkish Get Up', aliases:['tgu','relevé turc'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:3, defaultSets:3, defaultRestSec:90 },
  { id:'kb_swing', name:'Kettlebell Swing', aliases:['swing kettlebell','kb swing','russian swing'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:60 },
  { id:'devil_press', name:'Devil Press', aliases:['devil press haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:90 },
  { id:'man_maker', name:'Man Maker', aliases:['man maker haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:3, defaultRestSec:90 },
  { id:'double_db_snatch', name:'Double Dumbbell Snatch', aliases:['double dumbell snatch','db snatch double','arraché double haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:4, defaultRestSec:90 },
  // ABDOS
  { id:'crunch', name:'Crunch', aliases:['crunchs','abdos crunch'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:20, defaultSets:3, defaultRestSec:45 },
  { id:'plank', name:'Plank', aliases:['gainage','gainage frontal'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'dynamic_plank', name:'Dynamic Plank', aliases:['gainage dynamique'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'side_plank', name:'Side Plank', aliases:['gainage latéral'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'russian_twist', name:'Russian Twist', aliases:['twist','rotation russe'], category:'abdos', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:20, defaultSets:3, defaultRestSec:45 },
  { id:'hanging_leg_raise', name:'Hanging Leg Raise', aliases:['relevé de jambes'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'ab_wheel', name:'Ab Wheel Rollout', aliases:['roue abdominale','ab roller'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'v_up', name:'V-Up', aliases:['v up'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:45 },
  { id:'hollow_hold', name:'Hollow Hold', aliases:['hollow body','gainage creux'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'dead_bug', name:'Dead Bug', aliases:['dead bug abdos'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:45 },
  // HYROX
  { id:'hyrox_run', name:'Run', aliases:['course','running'], category:'hyrox', hasWeight:false, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:0 },
  { id:'hyrox_skierg', name:'SkiErg', aliases:['ski erg','ski'], category:'hyrox', hasWeight:false, hasDistance:true, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_sled_push', name:'Sled Push', aliases:['poussée de luge'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_sled_pull', name:'Sled Pull', aliases:['traction de luge'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_bbj', name:'Burpee Broad Jump', aliases:['bbj','burpee saut'], category:'hyrox', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:80, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_rowing', name:'Rowing', aliases:['rameur','row','ergomètre'], category:'hyrox', hasWeight:false, hasDistance:true, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_farmer', name:'Farmer Carry', aliases:['farmer walk','portée de charges'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_lunges', name:'Sandbag Lunges', aliases:['fentes sandbag'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_wall_balls', name:'Wall Balls', aliases:['wall ball'], category:'hyrox', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:100, defaultSets:1, defaultRestSec:0 },
  { id:'hyrox_echo_bike', name:'Echo Bike', aliases:['echo bike','assault bike','air bike','vélo air'], category:'hyrox', hasWeight:false, hasDistance:false, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:60 },
  { id:'hyrox_assault_bike', name:'Assault Bike', aliases:['assault air bike'], category:'hyrox', hasWeight:false, hasDistance:false, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:60 },
]

function searchExercises(query: string, category?: ExoCategory): ExoDefinition[] {
  const q = query.toLowerCase().trim()
  if (!q && !category) return EXERCISE_DATABASE
  return EXERCISE_DATABASE.filter(exo => {
    if (category && exo.category !== category) return false
    if (!q) return true
    return exo.name.toLowerCase().includes(q) || exo.aliases.some(a => a.toLowerCase().includes(q))
  })
}

// ════════════════════════════════════════════════
// EXERCISE LIST BUILDER — Gym & Hyrox (circuit-based)
// ════════════════════════════════════════════════
function ExerciseListBuilder({ sport, exercises, onChange, onCircuitsChange }: {
  sport: SportType
  exercises: ExerciseItem[]
  onChange: (e: ExerciseItem[]) => void
  onCircuitsChange?: (circuits: ExoCircuit[], map: Record<string, string>) => void
}) {
  const defaultCircuit: ExoCircuit = { id: 'default', name: 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 }
  const [circuits, setCircuits] = useState<ExoCircuit[]>([defaultCircuit])
  const [blockCircuitMap, setBlockCircuitMap] = useState<Record<string, string>>({})

  // Expose circuits + map dès qu'ils changent (pour SessionExecute et la sauvegarde)
  useEffect(() => {
    onCircuitsChange?.(circuits, blockCircuitMap)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuits, blockCircuitMap])
  const [addingToCircuit, setAddingToCircuit] = useState<string | null>(null)
  const [showCircuitTypeMenu, setShowCircuitTypeMenu] = useState(false)
  const [changingTypeFor, setChangingTypeFor] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<ExoCategory | undefined>(
    sport === 'hyrox' ? 'hyrox' : undefined
  )

  const accentColor = SPORT_BORDER[sport]

  const catOptions: { id: ExoCategory; label: string }[] = sport === 'hyrox'
    ? [{ id: 'hyrox', label: 'Hyrox' }]
    : [
        { id: 'push',  label: 'Push'  },
        { id: 'pull',  label: 'Pull'  },
        { id: 'legs',  label: 'Legs'  },
        { id: 'mixte', label: 'Mixte' },
        { id: 'abdos', label: 'Abdos' },
      ]

  const results = searchExercises(query, catFilter)

  function getBlocksForCircuit(circuitId: string): ExerciseItem[] {
    return exercises.filter(e => (blockCircuitMap[e.id] ?? 'default') === circuitId)
  }

  function addCircuit(typeId?: string) {
    const num = circuits.length + 1
    const ct = CIRCUIT_TYPES.find(c => c.id === typeId)
    const type = typeId ?? 'series'
    const name = ct ? `${ct.label} ${num}` : `Séries ${num}`
    const rounds = type === 'tabata' ? 8 : type === 'emom' ? 12 : 3
    const restBetweenRoundsSec = type === 'tabata' ? 10 : type === 'emom' ? 0 : 90
    const newCircuit: ExoCircuit = { id: `circuit_${Date.now()}`, name, type, rounds, restBetweenRoundsSec }
    setCircuits(prev => [...prev, newCircuit])
    setShowCircuitTypeMenu(false)
  }

  function removeCircuit(circuitId: string) {
    const toRemoveIds = exercises.filter(e => (blockCircuitMap[e.id] ?? 'default') === circuitId).map(e => e.id)
    onChange(exercises.filter(e => !toRemoveIds.includes(e.id)))
    setBlockCircuitMap(prev => {
      const next = { ...prev }
      toRemoveIds.forEach(id => delete next[id])
      return next
    })
    setCircuits(prev => prev.filter(c => c.id !== circuitId))
    if (addingToCircuit === circuitId) setAddingToCircuit(null)
  }

  function updateCircuit(circuitId: string, patch: Partial<ExoCircuit>) {
    setCircuits(prev => prev.map(c => c.id === circuitId ? { ...c, ...patch } : c))
  }

  function addExerciseToCircuit(exo: ExoDefinition, circuitId: string) {
    const item: ExerciseItem = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      exoId: exo.id,
      name: exo.name,
      category: exo.category,
      sets: exo.defaultSets,
      reps: exo.defaultReps,
      weightKg: exo.hasWeight ? 0 : undefined,
      distanceM: exo.hasDistance ? 0 : undefined,
      kcal: exo.hasKcal ? 0 : undefined,
      targetTimeSec: exo.hasTime ? 0 : undefined,
      restSec: exo.defaultRestSec,
    }
    onChange([...exercises, item])
    setBlockCircuitMap(prev => ({ ...prev, [item.id]: circuitId }))
    setAddingToCircuit(null)
    setQuery('')
  }

  function addCustomToCircuit(circuitId: string) {
    const q = query.trim()
    if (!q) return
    const item: ExerciseItem = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      exoId: 'custom',
      name: q,
      category: sport === 'hyrox' ? 'hyrox' : 'mixte',
      sets: 3, reps: 10, restSec: 60,
    }
    onChange([...exercises, item])
    setBlockCircuitMap(prev => ({ ...prev, [item.id]: circuitId }))
    setAddingToCircuit(null)
    setQuery('')
  }

  function updExo(id: string, field: keyof ExerciseItem, val: string | number | undefined) {
    onChange(exercises.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  function removeExo(id: string) {
    onChange(exercises.filter(e => e.id !== id))
    setBlockCircuitMap(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function moveExercise(blockId: string, dir: 'up' | 'down') {
    const idx = exercises.findIndex(e => e.id === blockId)
    if (idx < 0) return
    const circuitId = blockCircuitMap[blockId] ?? 'default'
    const circuitBlocks = exercises.filter(e => (blockCircuitMap[e.id] ?? 'default') === circuitId)
    const posInCircuit = circuitBlocks.findIndex(e => e.id === blockId)
    if (dir === 'up' && posInCircuit === 0) return
    if (dir === 'down' && posInCircuit === circuitBlocks.length - 1) return
    const swapWith = dir === 'up' ? circuitBlocks[posInCircuit - 1] : circuitBlocks[posInCircuit + 1]
    const swapIdx = exercises.findIndex(e => e.id === swapWith.id)
    const next = [...exercises]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    onChange(next)
  }

  function fmtTime(sec: number): string {
    if (!sec) return ''
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--input-bg)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none',
  }
  const accentInputStyle: React.CSSProperties = {
    ...inputStyle, border: `1px solid ${accentColor}44`, background: `${accentColor}08`,
  }

  return (
    <div>
      {circuits.map(circuit => {
        const circuitExercises = getBlocksForCircuit(circuit.id)
        return (
          <div key={circuit.id} style={{
            marginBottom: 16, borderRadius: 14,
            border: `1px solid ${accentColor}33`,
            background: 'var(--bg-card2)',
            overflow: 'hidden',
          }}>
            {/* En-tête circuit */}
            <div style={{ padding: '10px 14px', background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}22` }}>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 8 }}>
                {/* Badge type — cliquable pour changer */}
                <button
                  onClick={() => setChangingTypeFor(changingTypeFor === circuit.id ? null : circuit.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 6, border: `1px solid ${accentColor}55`,
                    background: `${accentColor}22`, color: accentColor,
                    fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {CIRCUIT_TYPES.find(c => c.id === (circuit.type ?? 'series'))?.icon ?? '🔁'}{' '}
                  {CIRCUIT_TYPES.find(c => c.id === (circuit.type ?? 'series'))?.label ?? 'Séries'}
                  <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
                </button>
                <input
                  value={circuit.name}
                  onChange={e => updateCircuit(circuit.id, { name: e.target.value })}
                  style={{ flex: '1 1 80px', minWidth: 70, padding: '5px 8px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 700, outline: 'none' }}
                />
                {(circuit.type ?? 'series') !== 'series' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>Tours</span>
                    <input type="number" min={1} max={20} value={circuit.rounds}
                      onChange={e => updateCircuit(circuit.id, { rounds: parseInt(e.target.value) || 1 })}
                      style={{ width: 54, padding: '5px 6px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none', textAlign: 'center' as const }} />
                  </div>
                )}
                {(circuit.type ?? 'series') !== 'series' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>Repos/tour (s)</span>
                    <input type="number" min={0} step={15} value={circuit.restBetweenRoundsSec}
                      onChange={e => updateCircuit(circuit.id, { restBetweenRoundsSec: parseInt(e.target.value) || 0 })}
                      style={{ width: 64, padding: '5px 6px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none', textAlign: 'center' as const }} />
                  </div>
                )}
                {sport === 'hyrox' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>Temps cible (s)</span>
                    <input type="number" min={0} step={30} value={circuit.targetTimeSec ?? 0}
                      onChange={e => updateCircuit(circuit.id, { targetTimeSec: parseInt(e.target.value) || undefined })}
                      style={{ width: 70, padding: '5px 6px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none', textAlign: 'center' as const }} />
                  </div>
                )}
                {circuits.length > 1 && (
                  <button onClick={() => removeCircuit(circuit.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>
                )}
              </div>
              {/* Sélecteur de type inline */}
              {changingTypeFor === circuit.id && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {CIRCUIT_TYPES.map(ct => (
                    <button key={ct.id} onClick={() => {
                      updateCircuit(circuit.id, { type: ct.id })
                      setChangingTypeFor(null)
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 7,
                      border: (circuit.type ?? 'series') === ct.id ? `2px solid ${accentColor}` : '1px solid var(--border)',
                      background: (circuit.type ?? 'series') === ct.id ? `${accentColor}22` : 'var(--bg-card)',
                      color: (circuit.type ?? 'series') === ct.id ? accentColor : 'var(--text)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      <span>{ct.icon}</span> {ct.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Exercices du circuit */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {circuitExercises.map((e, idx) => {
                const exoDef = EXERCISE_DATABASE.find(x => x.id === e.exoId)
                const catColor = EXO_CATEGORY_COLOR[e.category] ?? accentColor
                return (
                  <div key={e.id} style={{
                    borderRadius: 10, background: 'var(--bg-card)',
                    border: `1px solid ${accentColor}22`, borderLeft: `3px solid ${accentColor}`,
                    padding: '9px 12px',
                  }}>
                    {/* En-tête exercice */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      {/* Flèches réordonnancement */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                        <button onClick={() => moveExercise(e.id, 'up')}
                          disabled={idx === 0}
                          style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--border)' : 'var(--text-dim)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1 }}>▲</button>
                        <button onClick={() => moveExercise(e.id, 'down')}
                          disabled={idx === circuitExercises.length - 1}
                          style={{ background: 'none', border: 'none', color: idx === circuitExercises.length - 1 ? 'var(--border)' : 'var(--text-dim)', cursor: idx === circuitExercises.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1 }}>▼</button>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>#{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{e.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: catColor, background: `${catColor}18`, padding: '2px 6px', borderRadius: 5, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                        {EXO_CATEGORY_LABEL[e.category]}
                      </span>
                      <button onClick={() => removeExo(e.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                    {/* Champs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
                      {/* Séries uniquement pour le type "series" — les autres utilisent les tours/rounds du circuit */}
                      {(circuit.type ?? 'series') === 'series' && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Séries</p>
                          <input type="number" min={1} value={e.sets}
                            onChange={ev => updExo(e.id, 'sets', parseInt(ev.target.value) || 1)}
                            style={inputStyle} />
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Reps</p>
                        <input type="number" min={1} value={e.reps}
                          onChange={ev => updExo(e.id, 'reps', parseInt(ev.target.value) || 1)}
                          style={inputStyle} />
                      </div>
                      {(exoDef?.hasWeight ?? e.weightKg !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Charge (kg)</p>
                          <input type="number" min={0} step={2.5} value={e.weightKg ?? 0}
                            onChange={ev => updExo(e.id, 'weightKg', parseFloat(ev.target.value) || 0)}
                            style={accentInputStyle} />
                        </div>
                      )}
                      {(exoDef?.hasDistance ?? e.distanceM !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Distance (m)</p>
                          <input type="number" min={0} step={5} value={e.distanceM ?? 0}
                            onChange={ev => updExo(e.id, 'distanceM', parseInt(ev.target.value) || 0)}
                            style={accentInputStyle} />
                        </div>
                      )}
                      {(exoDef?.hasKcal ?? e.kcal !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Kcal cible</p>
                          <input type="number" min={0} value={e.kcal ?? 0}
                            onChange={ev => updExo(e.id, 'kcal', parseInt(ev.target.value) || 0)}
                            style={accentInputStyle} />
                        </div>
                      )}
                      {(exoDef?.hasTime ?? e.targetTimeSec !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Temps cible (sec)</p>
                          <input type="number" min={0} step={5} value={e.targetTimeSec ?? 0}
                            onChange={ev => updExo(e.id, 'targetTimeSec', parseInt(ev.target.value) || 0)}
                            style={accentInputStyle} />
                          {(e.targetTimeSec ?? 0) > 0 && (
                            <p style={{ fontSize: 10, color: accentColor, fontWeight: 600, margin: '4px 0 0', fontFamily: 'DM Mono,monospace' }}>{fmtTime(e.targetTimeSec ?? 0)}</p>
                          )}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Repos (sec)</p>
                        <input type="number" min={0} step={15} value={e.restSec}
                          onChange={ev => updExo(e.id, 'restSec', parseInt(ev.target.value) || 0)}
                          style={inputStyle} />
                      </div>
                    </div>
                    {/* Notes */}
                    <div style={{ marginTop: 6 }}>
                      <input value={e.notes ?? ''} onChange={ev => updExo(e.id, 'notes', ev.target.value)}
                        placeholder="Notes / consignes (optionnel)"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
                    </div>
                  </div>
                )
              })}

              {/* Bouton ajouter ou panneau de recherche */}
              {addingToCircuit === circuit.id ? (
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                  borderRadius: 12, padding: '12px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Ajouter un exercice</p>
                    <button onClick={() => { setAddingToCircuit(null); setQuery('') }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                  <input value={query} onChange={ev => setQuery(ev.target.value)}
                    placeholder="ex: squat, développé couché, traction..."
                    autoFocus
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                    {catOptions.map(cat => (
                      <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? undefined : cat.id)}
                        style={{
                          padding: '3px 8px', borderRadius: 6, border: '1px solid', fontSize: 10, cursor: 'pointer',
                          borderColor: catFilter === cat.id ? accentColor : 'var(--border)',
                          background: catFilter === cat.id ? `${accentColor}22` : 'transparent',
                          color: catFilter === cat.id ? accentColor : 'var(--text-dim)',
                          fontWeight: catFilter === cat.id ? 700 : 400,
                        }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {results.slice(0, 20).map(exo => (
                      <button key={exo.id} onClick={() => addExerciseToCircuit(exo, circuit.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer',
                          textAlign: 'left' as const, width: '100%',
                        }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{exo.name}</span>
                          {exo.aliases[0] && <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 5 }}>({exo.aliases[0]})</span>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: EXO_CATEGORY_COLOR[exo.category], background: `${EXO_CATEGORY_COLOR[exo.category]}18`, padding: '2px 5px', borderRadius: 4, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                          {EXO_CATEGORY_LABEL[exo.category]}
                        </span>
                      </button>
                    ))}
                    {results.length === 0 && (
                      <div style={{ padding: '10px', textAlign: 'center' as const }}>
                        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Aucun exercice trouvé pour &ldquo;{query}&rdquo;</p>
                        <button onClick={() => addCustomToCircuit(circuit.id)} style={{
                          padding: '7px 14px', borderRadius: 7,
                          background: `${accentColor}22`, border: `1px solid ${accentColor}`,
                          color: accentColor, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>+ Créer &ldquo;{query}&rdquo;</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingToCircuit(circuit.id); setQuery('') }} style={{
                  width: '100%', padding: '9px', borderRadius: 9,
                  background: 'transparent', border: `1px dashed ${accentColor}55`,
                  color: accentColor, fontSize: 12, cursor: 'pointer',
                }}>+ Ajouter un exercice</button>
              )}
            </div>
          </div>
        )
      })}

      {/* Bouton ajouter un circuit — avec sélecteur de type */}
      {!showCircuitTypeMenu ? (
        <button onClick={() => setShowCircuitTypeMenu(true)} style={{
          width: '100%', padding: '10px', borderRadius: 10,
          background: 'transparent', border: `2px dashed ${accentColor}44`,
          color: accentColor, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          marginTop: 4,
        }}>+ Ajouter un circuit</button>
      ) : (
        <div style={{
          marginTop: 4, padding: '12px 14px', borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--bg-card2)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 8px' }}>Quel type de circuit ?</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
            {CIRCUIT_TYPES.map(ct => (
              <button key={ct.id} onClick={() => addCircuit(ct.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                cursor: 'pointer', textAlign: 'left' as const, width: '100%',
              }}>
                <span style={{ fontSize: 14, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>{ct.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ct.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{ct.desc}</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowCircuitTypeMenu(false)} style={{
            marginTop: 8, width: '100%', padding: '7px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
          }}>Annuler</button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// STRENGTH BLOCK RENDERER — muscu / hyrox
// Format : nom | séries × reps | charge | repos
// ════════════════════════════════════════════════
function StrengthBlockRenderer({ blocks, onChange, accent, exoHistory }: {
  blocks: Block[]; onChange: (b: Block[]) => void; accent: string
  exoHistory?: Record<string, { weight: string; reps: number; date: string }>
}) {
  const exoCount = (upToIdx: number) =>
    blocks.filter((x, j) => j <= upToIdx && x.type !== 'circuit_header').length

  // ── Ajout exercice depuis catalogue ──────────────────────────────
  const [addingToCircuit, setAddingToCircuit] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [catFilter, setCatFilter] = useState<ExoCategory | undefined>(undefined)
  const searchResults = searchExercises(searchQuery, catFilter)

  function insertExerciseAfterCircuit(circuitId: string, exo: ExoDefinition) {
    const circuitIdx = blocks.findIndex(x => x.id === circuitId)
    // Trouver la position d'insertion : après le dernier effort de ce circuit
    let insertIdx = circuitIdx + 1
    while (insertIdx < blocks.length && blocks[insertIdx].type !== 'circuit_header') {
      insertIdx++
    }
    const prev = exoHistory?.[exo.name.toLowerCase().trim()]
    const newBlock: Block = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      mode: 'single' as BlockMode,
      type: 'effort' as BlockType,
      durationMin: 0,
      zone: 3,
      value: prev?.weight ?? '',
      hrAvg: '',
      label: exo.name,
      reps: prev?.reps ?? exo.defaultReps,
      recoveryMin: exo.defaultRestSec / 60,
      effortMin: 0,
    }
    const upd = [...blocks]
    upd.splice(insertIdx, 0, newBlock)
    onChange(upd)
    setAddingToCircuit(null)
    setSearchQuery('')
    setCatFilter(undefined)
  }

  function insertCustomAfterCircuit(circuitId: string, name: string) {
    const circuitIdx = blocks.findIndex(x => x.id === circuitId)
    let insertIdx = circuitIdx + 1
    while (insertIdx < blocks.length && blocks[insertIdx].type !== 'circuit_header') {
      insertIdx++
    }
    const newBlock: Block = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      mode: 'single' as BlockMode, type: 'effort' as BlockType,
      durationMin: 0, zone: 3, value: '', hrAvg: '',
      label: name, reps: 10, recoveryMin: 1, effortMin: 0,
    }
    const upd = [...blocks]
    upd.splice(insertIdx, 0, newBlock)
    onChange(upd)
    setAddingToCircuit(null)
    setSearchQuery('')
    setCatFilter(undefined)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
      {blocks.map((b, i) => {
        // ── Circuit header ──
        if (b.type === 'circuit_header') {
          const circuitType: CircuitType = (['series','circuit','superset','emom','tabata'].includes(b.mode) ? b.mode : 'series') as CircuitType
          const isEmom    = circuitType === 'emom'
          const isTabata  = circuitType === 'tabata'
          const noRest    = isEmom || isTabata
          return (
            <div key={b.id} style={{ marginTop: i > 0 ? 20 : 0, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              {/* Ligne 1 : point + type badge + nom + quantité + repos + ×  */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: accent, background: `${accent}18`, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  {CIRCUIT_TYPES.find(c => c.id === circuitType)?.label ?? 'Séries'}
                </span>
                <input value={b.label} onChange={e => {
                  const upd = [...blocks]; upd[i] = { ...b, label: e.target.value }; onChange(upd)
                }} style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif', minWidth: 0,
                }} />
                {/* Quantité : rounds ou minutes (uniquement pour les circuits non-series) */}
                {circuitType !== 'series' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="number" min={1} max={60}
                      value={isEmom ? (b.durationMin || 12) : (b.zone ?? (isTabata ? 8 : 3))}
                      onChange={e => {
                        const upd = [...blocks]
                        if (isEmom) upd[i] = { ...b, durationMin: parseInt(e.target.value) || 12 }
                        else upd[i] = { ...b, zone: parseInt(e.target.value) || 1 }
                        onChange(upd)
                      }}
                      style={{ width: 38, padding: '3px 6px', borderRadius: 5, border: `1px solid ${accent}44`, background: `${accent}08`, color: accent, fontSize: 12, fontFamily: '"DM Mono",monospace', textAlign: 'center' as const, outline: 'none' }} />
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{isEmom ? 'min' : 'tours'}</span>
                  </div>
                )}
                {/* Repos (sauf EMOM/tabata) */}
                {!noRest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="number" min={0} max={600} step={15}
                      value={b.recoveryMin != null ? Math.round(b.recoveryMin * 60) : 90}
                      onChange={e => { const upd = [...blocks]; upd[i] = { ...b, recoveryMin: (parseInt(e.target.value) || 0) / 60 }; onChange(upd) }}
                      style={{ width: 42, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)', fontSize: 12, fontFamily: '"DM Mono",monospace', textAlign: 'center' as const, outline: 'none' }} />
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>s repos</span>
                  </div>
                )}
                <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} style={{
                  background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}>×</button>
              </div>
              {/* Ligne 2 : chips de type */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, paddingLeft: 14 }}>
                {CIRCUIT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => {
                    const upd = [...blocks]
                    upd[i] = {
                      ...b, mode: ct.id,
                      zone: ct.id === 'tabata' ? 8 : ct.id === 'emom' ? 1 : (b.zone ?? 3),
                      durationMin: ct.id === 'emom' ? (b.durationMin || 12) : 0,
                      recoveryMin: ct.id === 'tabata' || ct.id === 'emom' ? 0 : (b.recoveryMin ?? 1.5),
                    }
                    onChange(upd)
                  }} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    background: circuitType === ct.id ? `${accent}15` : 'transparent',
                    border: circuitType === ct.id ? `1px solid ${accent}55` : '1px solid var(--border)',
                    color: circuitType === ct.id ? accent : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 10 }}>{ct.icon}</span>{ct.label}
                  </button>
                ))}
              </div>
              {/* ── Ajouter un exercice au circuit ── */}
              {addingToCircuit === b.id ? (
                <div style={{ marginTop: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Ajouter un exercice</span>
                    <button onClick={() => { setAddingToCircuit(null); setSearchQuery(''); setCatFilter(undefined) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                  </div>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ex: squat, développé couché, traction..."
                    autoFocus
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg,var(--bg-card2))', color: 'var(--text)', fontSize: 12, outline: 'none', marginBottom: 7, boxSizing: 'border-box' as const }} />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 7 }}>
                    {([{ id: 'push', label: 'Push' }, { id: 'pull', label: 'Pull' }, { id: 'legs', label: 'Legs' }, { id: 'mixte', label: 'Mixte' }, { id: 'abdos', label: 'Abdos' }] as { id: ExoCategory; label: string }[]).map(cat => (
                      <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? undefined : cat.id)} style={{
                        padding: '2px 7px', borderRadius: 5, border: '1px solid', fontSize: 9, cursor: 'pointer', fontWeight: 600,
                        borderColor: catFilter === cat.id ? accent : 'var(--border)',
                        background: catFilter === cat.id ? `${accent}22` : 'transparent',
                        color: catFilter === cat.id ? accent : 'var(--text-dim)',
                      }}>{cat.label}</button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
                    {searchResults.slice(0, 20).map(exo => (
                      <button key={exo.id} onClick={() => insertExerciseAfterCircuit(b.id, exo)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer',
                        textAlign: 'left' as const, width: '100%',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{exo.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: EXO_CATEGORY_COLOR[exo.category], background: `${EXO_CATEGORY_COLOR[exo.category]}18`, padding: '2px 5px', borderRadius: 4, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                          {EXO_CATEGORY_LABEL[exo.category]}
                        </span>
                      </button>
                    ))}
                    {searchResults.length === 0 && searchQuery.trim() && (
                      <div style={{ padding: '8px', textAlign: 'center' as const }}>
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>Aucun résultat pour &ldquo;{searchQuery}&rdquo;</p>
                        <button onClick={() => insertCustomAfterCircuit(b.id, searchQuery.trim())} style={{
                          padding: '6px 12px', borderRadius: 6, background: `${accent}22`,
                          border: `1px solid ${accent}`, color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>+ Créer &ldquo;{searchQuery.trim()}&rdquo;</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingToCircuit(b.id); setSearchQuery(''); setCatFilter(undefined) }} style={{
                  width: '100%', marginTop: 8, padding: '7px', borderRadius: 7,
                  background: 'transparent', border: `1px dashed ${accent}44`,
                  color: accent, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}>+ Ajouter un exercice</button>
              )}
            </div>
          )
        }

        // ── Flèche de chaîne (repos ≤ 30s avec l'exo précédent) ──
        const prevBlock = i > 0 ? blocks[i - 1] : null
        const isChained = !!(prevBlock && prevBlock.type !== 'circuit_header' && (prevBlock.recoveryMin ?? 0) * 60 <= 30)
        // Type du circuit parent (pour masquer "Séries" en mode lap/superset/etc.)
        const parentHeader = [...blocks].slice(0, i).reverse().find(x => x.type === 'circuit_header')
        const parentCircuitType: CircuitType = (parentHeader && (['series','circuit','superset','emom','tabata'].includes(parentHeader.mode)) ? parentHeader.mode : 'series') as CircuitType
        const isSeries = parentCircuitType === 'series'

        return (
          <div key={b.id}>
            {isChained && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', color: accent, opacity: 0.5 }}>
                  <div style={{ width: 1, height: 8, background: accent }} />
                  <span style={{ fontSize: 10, lineHeight: 1 }}>▼</span>
                </div>
              </div>
            )}

            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: isChained ? 0 : 6,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
            }}>
              {/* Ligne 1 : numéro + nom + supprimer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: '"DM Mono", monospace', width: 18, flexShrink: 0 }}>{exoCount(i)}</span>
                <input value={b.label} onChange={e => {
                  const upd = [...blocks]; upd[i] = { ...b, label: e.target.value }; onChange(upd)
                }} style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 0,
                }} />
                <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} style={{
                  background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
              {/* Historique exo */}
              {(() => {
                if (!exoHistory) return null
                const key = (b.label ?? '').toLowerCase().trim()
                const hist = exoHistory[key]
                if (!hist) return null
                const dateStr = hist.date ? new Date(hist.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
                return (
                  <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 6px 18px', fontStyle: 'italic' as const }}>
                    Dernière : {hist.weight}kg × {hist.reps}{dateStr ? ` (${dateStr})` : ''}
                  </p>
                )
              })()}

              {/* Ligne 2 : séries × reps | charge | repos */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                {/* Séries — uniquement pour circuit de type "series" */}
                {isSeries && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Séries</span>
                    <input type="number" min={1} max={20} value={b.zone ?? 3}
                      onChange={e => { const upd = [...blocks]; upd[i] = { ...b, zone: parseInt(e.target.value) || 1 }; onChange(upd) }}
                      style={{ width: 40, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, outline: 'none' }} />
                  </div>
                )}

                {isSeries && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>×</span>}

                {/* Reps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Reps</span>
                  <input type="number" min={0} max={200} value={b.reps ?? 10}
                    onChange={e => { const upd = [...blocks]; upd[i] = { ...b, reps: parseInt(e.target.value) || 0 }; onChange(upd) }}
                    style={{ width: 44, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, outline: 'none' }} />
                </div>

                {/* Charge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Charge</span>
                  <input value={b.value || ''} placeholder="—"
                    onChange={e => { const upd = [...blocks]; upd[i] = { ...b, value: e.target.value }; onChange(upd) }}
                    style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: `1px solid ${accent}44`, background: `${accent}08`, color: accent, fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, fontWeight: 700, outline: 'none' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>kg</span>
                </div>

                {/* Repos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Repos</span>
                  <input type="number" min={0} max={600} step={15}
                    value={b.recoveryMin != null ? Math.round(b.recoveryMin * 60) : 90}
                    onChange={e => { const upd = [...blocks]; upd[i] = { ...b, recoveryMin: (parseInt(e.target.value) || 0) / 60 }; onChange(upd) }}
                    style={{ width: 48, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, outline: 'none' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>s</span>
                </div>

                {/* Temps (gainage, etc.) */}
                {(b.effortMin ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Temps</span>
                    <span style={{ fontSize: 13, fontFamily: '"DM Mono", monospace', color: accent, fontWeight: 600 }}>
                      {Math.round((b.effortMin ?? 0) * 60)}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BlockBuilder({ sport, blocks, onChange, nutritionItems, exoHistory }: {
  sport: SportType; blocks: Block[]; onChange: (b: Block[]) => void
  nutritionItems?: Array<{ timeMin: number; name: string; type: string; glucidesG: number }>
  exoHistory?: Record<string, { weight: string; reps: number; date: string }>
}) {
  const vLabel = sport === 'bike' ? 'Watts' : sport === 'swim' ? 'Allure /100m' : 'Allure /km'
  const vPlh = sport === 'bike' ? '250' : sport === 'swim' ? '1:35' : '4:30'
  const isStrengthSportBB = sport === 'gym' || sport === 'hyrox'
  const accentBB = SPORT_BORDER[sport]
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; block: Block; isRecovery: boolean } | null>(null)
  const [showCircuitMenu, setShowCircuitMenu] = useState(false)

  function addSingle() {
    onChange([...blocks, {
      id: `b_${Date.now()}`, mode: 'single', type: 'effort', durationMin: 10, zone: 3,
      value: sport === 'bike' ? '220' : '4:30', hrAvg: '', label: 'Bloc',
    }])
  }
  function addInterval() {
    onChange([...blocks, {
      id: `b_${Date.now()}`, mode: 'interval', type: 'effort', durationMin: 0, zone: 4,
      value: '', hrAvg: '', label: '', reps: 5, effortMin: 4, recoveryMin: 1, recoveryZone: 1,
    }])
  }
  function upd(id: string, field: keyof Block, val: string | number) {
    onChange(blocks.map(b => {
      if (b.id !== id) return b
      const u: Block = { ...b, [field]: val }
      if (field === 'value') u.zone = getZone(sport, String(val))
      if (u.mode === 'interval' && u.reps && u.effortMin && u.recoveryMin)
        u.durationMin = u.reps * (u.effortMin + u.recoveryMin)
      return u
    }))
  }

  function getTimeRange(min: number): string {
    if (min <= 0) return ''
    const sec = Math.round(min * 60)
    const lo = sec - Math.round(sec * 0.03)
    const hi = sec + Math.round(sec * 0.03)
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    return `${fmt(lo)} à ${fmt(hi)}`
  }

  type Bar = { id: string; min: number; zone: number; isRecovery: boolean; block: Block }
  const bars: Bar[] = []
  for (const b of blocks) {
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) {
      for (let r = 0; r < b.reps; r++) {
        bars.push({ id: `${b.id}_e${r}`, min: b.effortMin, zone: b.zone, isRecovery: false, block: b })
        if (b.recoveryMin > 0) bars.push({ id: `${b.id}_r${r}`, min: b.recoveryMin, zone: b.recoveryZone ?? 1, isRecovery: true, block: b })
      }
    } else {
      bars.push({ id: b.id, min: b.durationMin, zone: b.zone, isRecovery: false, block: b })
    }
  }
  const totalMin = bars.reduce((s, bar) => s + bar.min, 0) || 1
  const totalBlocks = blocks.reduce((s, b) => {
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin)
      return s + b.reps * (b.effortMin + b.recoveryMin)
    return s + b.durationMin
  }, 0)

  return (
    <div>
      {/* ── Profil d'intensité ── */}
      {sport !== 'gym' && sport !== 'hyrox' && blocks.length > 0 && (
        <div style={{
          background: 'var(--bg-card2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: 0 }}>
              TSS estimé : <span style={{ color: SPORT_BORDER[sport] }}>{calcTSS(blocks, sport)} pts</span>
              <span style={{ marginLeft: 10, fontWeight: 400 }}>· {formatHM(Math.round(totalBlocks))}</span>
            </p>
          </div>
          {/* Profile chart — position:relative for nutrition overlays */}
          <div style={{ position: 'relative', marginTop: 22, marginBottom: 6 }}>
            {/* Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80 }}>
              {bars.map(bar => {
                const hp = bar.isRecovery ? 15 : ((bar.zone / 5) * 0.85 + 0.05) * 100
                const wp = (bar.min / totalMin) * 100
                const c = ZONE_COLORS[bar.zone - 1]
                return (
                  <div key={bar.id}
                    onMouseEnter={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setHoveredBar({ x: rect.left + rect.width / 2, y: rect.top, block: bar.block, isRecovery: bar.isRecovery })
                    }}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{
                      width: `${wp}%`, height: `${hp}%`,
                      background: bar.isRecovery
                        ? 'rgba(107,114,128,0.15)'
                        : `linear-gradient(180deg, ${c}ee, ${c}55)`,
                      borderRadius: '2px 2px 0 0',
                      border: bar.isRecovery ? 'none' : `1px solid ${c}88`,
                      minWidth: 2, opacity: bar.isRecovery ? 0.5 : 1,
                      cursor: 'pointer',
                    }} />
                )
              })}
            </div>
            {/* Nutrition vertical lines overlay */}
            {(nutritionItems ?? []).filter(m => m.timeMin > 0).map((m, i) => {
              const leftPct = (m.timeMin / totalMin) * 100
              if (leftPct > 100 || leftPct < 0) return null
              const accentCol = SPORT_BORDER[sport]
              return (
                <div key={`nut_${i}`} style={{
                  position: 'absolute' as const,
                  left: `${leftPct}%`,
                  top: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                  pointerEvents: 'none' as const, zIndex: 5,
                }}>
                  {/* Labels above the chart */}
                  <div style={{
                    position: 'absolute' as const, bottom: '100%', marginBottom: 2,
                    whiteSpace: 'nowrap' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 7, fontWeight: 700, color: accentCol, opacity: 0.85, lineHeight: 1.2 }}>
                      {m.name || m.type}
                    </span>
                    <span style={{ fontSize: 6.5, color: 'var(--text-dim)', opacity: 0.65, fontFamily: 'DM Mono, monospace' }}>
                      {m.glucidesG}g
                    </span>
                  </div>
                  {/* Dashed vertical line */}
                  <div style={{
                    width: 1, height: '100%',
                    background: `repeating-linear-gradient(to bottom, ${accentCol}99 0px, ${accentCol}99 3px, transparent 3px, transparent 6px)`,
                  }} />
                  {/* Small dot at bottom */}
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentCol, opacity: 0.7, flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
          {(() => {
            const isBike = sport === 'bike'
            const zColors = isBike ? ZONE_COLORS_7 : ZONE_COLORS.slice(0, 5)
            const zLabels = isBike ? ['Z1','Z2','Z3','Z4','Z5','Z6','Z7'] : ['Z1','Z2','Z3','Z4','Z5']

            // Donut FC depuis les blocs
            type HRBucket = { label: string; color: string; min: number; max: number }
            const hrBuckets: HRBucket[] = [
              { label: '<120',    color: '#6b7280', min: 0,   max: 120 },
              { label: '120-140', color: '#4ade80', min: 120, max: 140 },
              { label: '140-155', color: '#facc15', min: 140, max: 155 },
              { label: '155-170', color: '#fb923c', min: 155, max: 170 },
              { label: '170+',    color: '#f87171', min: 170, max: 999 },
            ]
            const hrMins = hrBuckets.map(() => 0)
            let hasHR = false
            for (const b of blocks) {
              const hr = parseInt(b.hrAvg ?? '')
              if (!hr || hr <= 0) continue
              hasHR = true
              const m = b.mode === 'interval' && b.reps && b.effortMin ? b.reps * b.effortMin : b.durationMin
              const idx = hrBuckets.findIndex(bk => hr >= bk.min && hr < bk.max)
              if (idx >= 0) hrMins[idx] += m
            }
            const totalHR = hrMins.reduce((a, b) => a + b, 0)

            // Mini donut SVG helper
            function miniDonutArcs(values: number[], colors: string[], cx: number, cy: number, r: number, w: number) {
              const total = values.reduce((a, b) => a + b, 0)
              if (total === 0) return null
              let angle = -Math.PI / 2
              return values.map((v, i) => {
                if (v === 0) return null
                const sweep = (v / total) * 2 * Math.PI * 0.98
                const x1 = cx + r * Math.cos(angle)
                const y1 = cy + r * Math.sin(angle)
                const x2 = cx + r * Math.cos(angle + sweep)
                const y2 = cy + r * Math.sin(angle + sweep)
                const ri = r - w
                const x3 = cx + ri * Math.cos(angle + sweep)
                const y3 = cy + ri * Math.sin(angle + sweep)
                const x4 = cx + ri * Math.cos(angle)
                const y4 = cy + ri * Math.sin(angle)
                const large = sweep > Math.PI ? 1 : 0
                const d = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${ri} ${ri} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
                angle += (v / total) * 2 * Math.PI
                return <path key={i} d={d} fill={colors[i]} opacity={0.85} />
              })
            }

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                {/* Zones legend */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {zLabels.map((z, i) => (
                    <span key={z} style={{ fontSize: 9, fontWeight: 700, color: zColors[i], display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: zColors[i], display: 'inline-block' }} />
                      {z}
                    </span>
                  ))}
                </div>
                {/* Donut FC */}
                {hasHR && totalHR > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <svg width={44} height={44} viewBox="0 0 44 44">
                      {miniDonutArcs(hrMins, hrBuckets.map(b => b.color), 22, 22, 18, 8) ?? <circle cx={22} cy={22} r={18} fill="var(--border)" opacity={0.3} />}
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 1 }}>
                      <span style={{ fontSize: 8, color: 'var(--text-dim)', fontWeight: 600 }}>FC</span>
                      {hrBuckets.map((bk, i) => hrMins[i] > 0 ? (
                        <span key={bk.label} style={{ fontSize: 7.5, color: bk.color, fontWeight: 600 }}>
                          {bk.label}: {Math.round(hrMins[i] / totalHR * 100)}%
                        </span>
                      ) : null)}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Hover tooltip for intensity profile bars */}
      {hoveredBar && !hoveredBar.isRecovery && (
        <div style={{
          position: 'fixed' as const, zIndex: 1100,
          left: hoveredBar.x, top: hoveredBar.y - 8,
          transform: 'translate(-50%, -100%)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'none' as const,
          whiteSpace: 'nowrap' as const,
          fontSize: 11,
        }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{hoveredBar.block.label}</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, color: 'var(--text-dim)' }}>
            <span>Durée : <strong style={{ fontFamily: 'DM Mono, monospace' }}>
              {hoveredBar.block.mode === 'interval' && hoveredBar.block.effortMin
                ? fmtDuration(hoveredBar.block.effortMin)
                : fmtDuration(hoveredBar.block.durationMin)}
            </strong></span>
            <span>Zone : <strong style={{ color: ZONE_COLORS[Math.min(4, hoveredBar.block.zone - 1)] }}>Z{hoveredBar.block.zone}</strong></span>
            {hoveredBar.block.value && (
              <span>{sport === 'bike' ? 'Puissance' : 'Allure'} : <strong style={{ fontFamily: 'DM Mono, monospace' }}>{hoveredBar.block.value}{sport === 'bike' ? 'W' : '/km'}</strong></span>
            )}
            {hoveredBar.block.hrAvg && parseInt(hoveredBar.block.hrAvg) > 0 && (
              <span>FC moy : <strong style={{ fontFamily: 'DM Mono, monospace' }}>{hoveredBar.block.hrAvg} bpm</strong></span>
            )}
          </div>
        </div>
      )}

      {/* ── Liste des blocs ── */}
      {/* ── Guide types de circuits (muscu/hyrox uniquement) ── */}
      {isStrengthSportBB && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: `${accentBB}07`, border: `1px solid ${accentBB}18`,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', margin: '0 0 7px' }}>Types de circuits</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
            {CIRCUIT_TYPES.map(ct => (
              <div key={ct.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: accentBB, fontWeight: 700, minWidth: 18, flexShrink: 0 }}>{ct.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', minWidth: 58, flexShrink: 0 }}>{ct.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{ct.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(sport === 'gym' || sport === 'hyrox') ? (
        <div style={{ marginBottom: 10 }}>
          <StrengthBlockRenderer blocks={blocks} onChange={onChange} accent={SPORT_BORDER[sport]} exoHistory={exoHistory} />
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {blocks.map((b, bi) => {
          const c = ZONE_COLORS[Math.max(0, (b.zone ?? 1) - 1)]
          const isInterval = b.mode === 'interval' && !!b.reps && !!b.effortMin

          // ── Circuit header ──
          if (b.type === 'circuit_header') {
            const accentCol = SPORT_BORDER[sport]
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', marginTop: bi > 0 ? 6 : 0,
                borderRadius: 10, background: `${accentCol}08`,
                border: `1px solid ${accentCol}22`, borderLeft: `4px solid ${accentCol}`,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4" stroke={accentCol} strokeWidth="1.5"/>
                  <path d="M3.5 5L4.5 6L6.5 4" stroke={accentCol} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input value={b.label} onChange={e => onChange(blocks.map((x, j) => j === bi ? { ...x, label: e.target.value } : x))}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif', minWidth: 0 }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={1} max={20} value={b.zone ?? 3}
                      onChange={e => onChange(blocks.map((x, j) => j === bi ? { ...x, zone: parseInt(e.target.value) || 3 } : x))}
                      style={{ width: 36, padding: '3px 5px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: accentCol, fontSize: 12, fontFamily: '"DM Mono",monospace', textAlign: 'center' as const, outline: 'none' }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>rounds</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={0} max={10} step={0.5} value={b.recoveryMin ?? 2}
                      onChange={e => onChange(blocks.map((x, j) => j === bi ? { ...x, recoveryMin: parseFloat(e.target.value) || 0 } : x))}
                      style={{ width: 42, padding: '3px 5px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 12, fontFamily: '"DM Mono",monospace', textAlign: 'center' as const, outline: 'none' }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>min repos</span>
                  </div>
                </div>
                <button onClick={() => onChange(blocks.filter((_, j) => j !== bi))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            )
          }

          if (isInterval) {
            const recovSec = Math.round((b.recoveryMin ?? 0) * 60)
            const totalBlockMin = (b.reps ?? 1) * ((b.effortMin ?? 0) + (b.recoveryMin ?? 0))
            const effortRange = getTimeRange(b.effortMin ?? 0)
            const recovFmt = `${Math.floor(recovSec / 60)}:${String(recovSec % 60).padStart(2, '0')}`

            return (
              <div key={b.id} style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`,
                background: 'var(--bg-card2)',
              }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '3px 8px', borderRadius: 6 }}>INTERVAL</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      {b.reps} × {b.label || `${Math.round((b.effortMin ?? 0) * 10) / 10}min`}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c }}>Z{b.zone}</span>
                    {b.value && <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: 'DM Mono,monospace' }}>@ {b.value}{sport === 'bike' ? 'W' : '/km'}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>= {formatHM(Math.round((b.reps ?? 1) * ((b.effortMin ?? 0) + (b.recoveryMin ?? 0))))}</span>
                  </div>
                  <button onClick={() => onChange(blocks.filter(x => x.id !== b.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>

                <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Effort */}
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: `${c}08`, border: `1px solid ${c}22` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c, margin: '0 0 6px' }}>Effort</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Répétitions</p>
                        <input type="number" min={1} value={b.reps ?? 5} onChange={e => upd(b.id, 'reps', parseInt(e.target.value) || 1)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                      </div>
                      {(()=>{
                        const distMatch = (b.label ?? '').match(/(\d+)\s*m\b/i) ?? (b.label ?? '').match(/(\d+)\s*m\s*[—–-]/)
                        // Vélo : jamais de mode distance — toujours durée + watts
                        const isDistBased = !!distMatch && sport !== 'bike'
                        const fmtS = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
                        if (isDistBased) {
                          const distM = parseInt(distMatch![1])
                          const effortSec = Math.round((b.effortMin ?? 0) * 60)
                          const loSec = Math.round(effortSec * 0.97)
                          const hiSec = Math.round(effortSec * 1.03)
                          return (
                            <>
                              <div>
                                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Distance</p>
                                <p style={{ fontSize: 16, fontWeight: 700, color: c, fontFamily: 'DM Mono,monospace', margin: 0 }}>{distM}m</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Temps cible</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono,monospace', margin: 0 }}>
                                  {fmtS(loSec)} à {fmtS(hiSec)}
                                </p>
                              </div>
                              <div>
                                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>{vLabel}</p>
                                <input value={b.value} placeholder={vPlh}
                                  onChange={e => {
                                    const pm = e.target.value.match(/(\d+):(\d+)/)
                                    onChange(blocks.map(bl => {
                                      if (bl.id !== b.id) return bl
                                      const u: Block = { ...bl, value: e.target.value }
                                      u.zone = getZone(sport, e.target.value)
                                      if (pm && distMatch) {
                                        const ps = parseInt(pm[1]) * 60 + parseInt(pm[2])
                                        // Natation : /100m — autres : /km
                                        u.effortMin = sport === 'swim'
                                          ? Math.round((distM / 100) * ps / 60 * 100) / 100
                                          : Math.round((distM / 1000) * ps / 60 * 100) / 100
                                      }
                                      if (u.mode === 'interval' && u.reps && u.effortMin && u.recoveryMin)
                                        u.durationMin = u.reps * (u.effortMin + u.recoveryMin)
                                      return u
                                    }))
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${c}44`, background: `${c}08`, color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                              </div>
                              <div>
                                <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Zone effort</p>
                                <input type="number" min={1} max={5} value={b.zone} onChange={e => upd(b.id, 'zone', parseInt(e.target.value) || 3)}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                              </div>
                            </>
                          )
                        }
                        return (
                          <>
                            <div>
                              <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Durée effort (min)</p>
                              <input type="number" min={0.1} step={0.1} value={b.effortMin ?? 4} onChange={e => upd(b.id, 'effortMin', parseFloat(e.target.value) || 0.5)}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${c}44`, background: `${c}08`, color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Zone effort</p>
                              <input type="number" min={1} max={5} value={b.zone} onChange={e => upd(b.id, 'zone', parseInt(e.target.value) || 3)}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>{vLabel}</p>
                              <input value={b.value} onChange={e => upd(b.id, 'value', e.target.value)} placeholder={vPlh}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${c}44`, background: `${c}08`, color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                            </div>
                            {/* Fourchette de temps : jamais pour vélo */}
                            {effortRange && sport !== 'bike' && (
                              <p style={{ fontSize: 11, color: c, fontWeight: 600, margin: '8px 0 0', fontFamily: 'DM Mono,monospace' }}>
                                Temps cible : {effortRange}
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Récupération */}
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#9ca3af', margin: '0 0 6px' }}>Récupération</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Durée récup (min)</p>
                        <input type="number" min={0} step={0.5} value={b.recoveryMin ?? 1} onChange={e => upd(b.id, 'recoveryMin', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid rgba(107,114,128,0.25)', background: 'rgba(107,114,128,0.05)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Zone récup</p>
                        <input type="number" min={1} max={5} value={b.recoveryZone ?? 1} onChange={e => upd(b.id, 'recoveryZone', parseInt(e.target.value) || 1)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 0', fontFamily: 'DM Mono,monospace' }}>
                      {recovFmt} en Z{b.recoveryZone ?? 1}{(b.recoveryZone ?? 1) <= 1 ? ' (marche ou footing très lent)' : (b.recoveryZone ?? 1) === 2 ? ' (footing lent)' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          // ── Bloc simple ──
          return (
            <div key={b.id} style={{
              borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`,
              background: 'var(--bg-card2)',
            }}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `${c}22`, border: `1px solid ${c}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: c, flexShrink: 0,
                  }}>Z{b.zone}</span>
                  <select value={b.type} onChange={e => upd(b.id, 'type', e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}>
                    {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatHM(b.durationMin)}</span>
                </div>
                <button onClick={() => onChange(blocks.filter(x => x.id !== b.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>

              <div style={{ padding: '0 14px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Label / description</p>
                    <input value={b.label} onChange={e => upd(b.id, 'label', e.target.value)} placeholder="Nom du bloc"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Durée (min)</p>
                    <input type="number" value={b.durationMin} onChange={e => upd(b.id, 'durationMin', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>{vLabel}</p>
                    <input value={b.value} onChange={e => upd(b.id, 'value', e.target.value)} placeholder={vPlh}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${c}44`, background: `${c}08`, color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>FC moy.</p>
                    <input value={b.hrAvg} onChange={e => upd(b.id, 'hrAvg', e.target.value)} placeholder="158"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                  </div>
                </div>
                {b.value && sport === 'swim' && (
                  <p style={{ fontSize: 11, color: c, fontWeight: 600, margin: '8px 0 0', fontFamily: 'DM Mono,monospace' }}>
                    Allure : {b.value}/100m
                  </p>
                )}
                {b.value && sport !== 'bike' && sport !== 'swim' && (
                  <p style={{ fontSize: 11, color: c, fontWeight: 600, margin: '8px 0 0', fontFamily: 'DM Mono,monospace' }}>
                    Allure : {b.value}/km
                  </p>
                )}
                {b.value && sport === 'bike' && (
                  <p style={{ fontSize: 11, color: c, fontWeight: 600, margin: '8px 0 0', fontFamily: 'DM Mono,monospace' }}>
                    Puissance cible : {b.value}W
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      )}

      {/* ── Boutons ajouter ── */}
      {sport === 'gym' || sport === 'hyrox' ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
          <button onClick={() => onChange([...blocks, {
            id: `b_${Date.now()}`, mode: 'single', type: 'effort',
            durationMin: 0, zone: 3, value: '', hrAvg: '', label: 'Exercice',
            reps: 10, recoveryMin: 1.5,
          }])} style={{
            width: '100%', padding: '10px', borderRadius: 10,
            background: 'transparent', border: '1px dashed var(--border-mid)',
            color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
          }}>+ Exercice</button>

          {!showCircuitMenu ? (
            <button onClick={() => setShowCircuitMenu(true)} style={{
              width: '100%', padding: '10px', borderRadius: 10,
              background: 'transparent', border: `1px dashed ${SPORT_BORDER[sport]}66`,
              color: SPORT_BORDER[sport], fontSize: 12, cursor: 'pointer',
            }}>+ Ajouter un circuit</button>
          ) : (
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 8px' }}>Quel type de circuit ?</p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                {CIRCUIT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => {
                    const nExos = blocks.filter(x => x.type === 'circuit_header').length
                    const newHeader: Block = {
                      id: `circuit_${Date.now()}`, mode: ct.id, type: 'circuit_header',
                      label: `${ct.label} ${nExos + 1}`,
                      zone: ct.id === 'tabata' ? 8 : 3,
                      durationMin: ct.id === 'emom' ? 12 : 0,
                      recoveryMin: ct.id === 'tabata' || ct.id === 'emom' ? 0 : 1.5,
                      reps: 0, value: '', hrAvg: '',
                    }
                    onChange([...blocks, newHeader])
                    setShowCircuitMenu(false)
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    cursor: 'pointer', textAlign: 'left' as const, width: '100%',
                  }}>
                    <span style={{ fontSize: 14, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>{ct.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ct.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{ct.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowCircuitMenu(false)} style={{
                marginTop: 8, width: '100%', padding: '7px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
              }}>Annuler</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={addSingle} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            background: 'transparent', border: '1px dashed var(--border-mid)',
            color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
          }}>+ Bloc simple</button>
          <button onClick={addInterval} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            background: 'transparent', border: '1px dashed #a78bfa66',
            color: '#a78bfa', fontSize: 12, cursor: 'pointer',
          }}>+ Répétitions</button>
        </div>
      )}
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
  // Toutes les semaines ont des séances depuis le fix du prompt (blocs uniquement S1-S2)
  seances?: unknown[]
  note_coach?: string
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
  'Base':        'rgba(59,130,246,0.55)',
  'Build':       'rgba(249,115,22,0.55)',
  'Peak':        'rgba(239,68,68,0.55)',
  'Taper':       'rgba(34,197,94,0.55)',
  'Intensité':   'rgba(249,115,22,0.55)',
  'Spécifique':  'rgba(239,68,68,0.55)',
  'Deload':      'rgba(34,197,94,0.55)',
  'Compétition': 'rgba(168,85,247,0.55)',
}
const TP_BLOC_TEXT: Record<string, string> = {
  'Base':        '#fff',
  'Build':       '#fff',
  'Peak':        '#fff',
  'Taper':       '#fff',
  'Intensité':   '#fff',
  'Spécifique':  '#fff',
  'Deload':      '#fff',
  'Compétition': '#fff',
}

function safeWeekTypeBg(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase()
  if (t.includes('taper') || t.includes('deload')) return '#22C55E'
  if (t.includes('base'))                          return '#3B82F6'
  if (t.includes('build') || t.includes('intensit')) return '#F97316'
  if (t.includes('peak') || t.includes('spécif') || t.includes('specif')) return '#EF4444'
  if (t.includes('compét') || t.includes('compet')) return '#A855F7'
  return '#A855F7'
}
function safeWeekTypeText(type: string | null | undefined): string {
  return safeWeekTypeBg(type)
}

// Calcule dynamiquement le type de semaine à partir des séances réelles.
// Priorité : volume relatif à la moyenne (Deload) > intensité dominante (Peak/Build) > Base.
// Le type IA (aiType) est utilisé comme fallback si les données sont insuffisantes.
function computeWeekType(
  sessions: { intensity?: string; duration_min?: number | null; sport?: string | null; title?: string; durationMin?: number | null }[],
  avgVolume: number,
  aiType?: string | null,
): string {
  const real = sessions.filter(s => !isRestSession(s))
  if (real.length === 0) return aiType ?? 'Base'
  const volume = real.reduce((s, r) => s + ((r.duration_min ?? r.durationMin ?? 0) / 60), 0)
  const intensCount: Record<string, number> = {}
  for (const s of real) {
    const k = s.intensity ?? 'low'
    intensCount[k] = (intensCount[k] ?? 0) + 1
  }
  const total   = real.length
  const highPct = ((intensCount['high'] ?? 0) + (intensCount['max'] ?? 0)) / total
  const modPct  = (intensCount['moderate'] ?? 0) / total
  if (avgVolume > 0 && volume <= avgVolume * 0.6) return 'Deload'
  if (highPct > 0.5)                              return 'Peak'
  if (highPct + modPct > 0.4)                    return 'Build'
  return 'Base'
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

// ── Helpers SVG & collapsible ─────────────────────────────────────────────

function polarXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function donutArcPath(
  cx: number, cy: number, rOut: number, rIn: number,
  startAng: number, endAng: number
): string {
  const lg = endAng - startAng > Math.PI ? 1 : 0
  const os = polarXY(cx, cy, rOut, startAng), oe = polarXY(cx, cy, rOut, endAng)
  const is = polarXY(cx, cy, rIn,  startAng), ie = polarXY(cx, cy, rIn,  endAng)
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${lg} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${lg} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function ChartSection({
  title, subtitle, defaultOpen = true, children, action,
}: {
  title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode; action?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 10 : 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'baseline', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexGrow: 1, textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.10em', textTransform: 'uppercase' as const }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>{subtitle}</span>
          )}
          <span style={{
            fontSize: 9, color: 'var(--text-dim)', flexShrink: 0, userSelect: 'none' as const,
            display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', marginLeft: 4,
          }}>▼</span>
        </button>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

// ── Floating Coach IA bubble — visible when an active AI plan exists ──────

function AiPlanBubble({ plan }: { plan: AiTrainingPlan }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Contexte plan injecté dans le system prompt du coach
  const planContext = {
    trainingPlan: {
      name:                plan.name,
      objectif_principal:  plan.objectif_principal,
      duree_semaines:      plan.duree_semaines,
      start_date:          plan.start_date,
      end_date:            plan.end_date,
      sports:              plan.sports,
      blocs_periodisation: plan.blocs_periodisation,
      conseils_adaptation: plan.conseils_adaptation,
      points_cles:         plan.points_cles,
      semaines:            plan.ai_context?.program?.semaines ?? [],
    },
  }

  return (
    <>
      <div style={{ position: 'fixed', bottom: 92, right: 20, zIndex: 90 }}>
        <button
          onClick={() => setOpen(o => !o)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title={`Coach IA — ${plan.name}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 13px 7px 10px',
            borderRadius: 24,
            border: '1px solid',
            borderColor: open
              ? 'rgba(139,92,246,0.6)'
              : hovered ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.20)',
            background: open
              ? 'linear-gradient(135deg,rgba(139,92,246,0.22),rgba(91,111,255,0.22))'
              : hovered
              ? 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(91,111,255,0.12))'
              : 'var(--bg-card)',
            cursor: 'pointer', transition: 'all 0.16s',
            boxShadow: open
              ? '0 0 0 3px rgba(139,92,246,0.14), 0 4px 16px rgba(139,92,246,0.22)'
              : '0 2px 10px rgba(0,0,0,0.14)',
          }}
        >
          <span style={{ fontSize: 13 }}>✦</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: open ? '#a78bfa' : 'var(--text-mid)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            Mon plan
          </span>
        </button>
      </div>
      <AIPanelDynamic
        open={open}
        onClose={() => setOpen(false)}
        initialFlow={null}
        planId={plan.id}
        planName={plan.name}
        planContext={planContext}
      />
    </>
  )
}

// ── Phase 5 — Export PDF du plan complet ─────────────────────────────────
function exportPlanToPDF(plan: AiTrainingPlan) {
  const semaines = plan.ai_context?.program?.semaines ?? []
  const SPORT_NAMES: Record<string, string> = {
    run:'Course à pied', bike:'Cyclisme', swim:'Natation',
    hyrox:'Hyrox', gym:'Musculation', rowing:'Aviron',
  }
  const SPORT_COLORS: Record<string, string> = {
    run:'#f97316', bike:'#3b82f6', swim:'#06b6d4',
    hyrox:'#ec4899', gym:'#8b5cf6', rowing:'#14b8a6',
  }
  const INTENS_LABEL_PDF: Record<string, string> = {
    low:'Endurance', moderate:'Tempo / Z3', high:'Intensif / Z4', max:'VO2max / Z5',
  }
  const DAY_NAMES_PDF = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  // Formatte durée en hhmm
  function fmtDurPDF(min: number): string {
    const h = Math.floor(min / 60), m = min % 60
    if (h === 0) return `${m}min`
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
  }

  // Résolution du nom de sport affiché
  function sportLabel(raw: string): string {
    const lower = raw.toLowerCase()
    const direct = SPORT_NAMES[lower]
    if (direct) return direct
    // Recherche par valeur (le coach peut envoyer le nom en français)
    const found = Object.entries(SPORT_NAMES).find(([, v]) => v.toLowerCase() === lower)
    return found ? found[1] : raw
  }
  function sportColor(raw: string): string {
    const lower = raw.toLowerCase()
    if (SPORT_COLORS[lower]) return SPORT_COLORS[lower]
    const found = Object.entries(SPORT_NAMES).find(([, v]) => v.toLowerCase() === lower)
    return found ? (SPORT_COLORS[found[0]] ?? '#8b5cf6') : '#8b5cf6'
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${plan.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #fff; color: #111; padding: 24px 30px; font-size: 12px; line-height: 1.5; }
  h1 { font-size: 20px; font-weight: 800; margin-bottom: 2px; }
  .plan-meta { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
  .objectif { font-size: 12px; color: #374151; margin: 8px 0 16px; padding: 8px 12px; border-left: 3px solid #8b5cf6; background: #f5f3ff; border-radius: 0 6px 6px 0; }
  .week { margin-bottom: 18px; break-inside: avoid; }
  .week-header { display: flex; align-items: baseline; gap: 10px; padding: 5px 10px; background: #f1f5f9; border-radius: 6px; margin-bottom: 4px; }
  .week-num { font-size: 13px; font-weight: 800; color: #1e293b; }
  .week-type { font-size: 10px; font-weight: 600; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.06em; }
  .week-stats { margin-left: auto; display: flex; gap: 12px; font-size: 10px; color: #6b7280; font-variant-numeric: tabular-nums; }
  .week-stats strong { color: #374151; }
  .week-theme { font-size: 11px; color: #475569; font-style: italic; padding: 0 2px 4px; }
  .week-coach { font-size: 11px; color: #6b7280; padding: 3px 10px 6px; border-left: 2px solid #e2e8f0; margin: 0 0 6px 4px; }
  .sessions { display: flex; flex-direction: column; gap: 4px; }
  .session { padding: 6px 10px; border-left: 3px solid #8b5cf6; background: #fafafa; border-radius: 0 5px 5px 0; }
  .session-header { display: flex; align-items: center; gap: 6px; }
  .sport-badge { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 1px 5px; border-radius: 99px; flex-shrink: 0; }
  .day-badge { font-size: 9px; background: #e2e8f0; color: #475569; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .session-title { font-weight: 600; font-size: 12px; flex: 1; }
  .session-meta { font-size: 10px; color: #6b7280; margin-top: 2px; display: flex; gap: 10px; flex-wrap: wrap; }
  .session-notes { font-size: 10px; color: #374151; margin-top: 3px; font-style: italic; }
  .blocs { margin-top: 5px; padding-top: 5px; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 2px; }
  .bloc { font-size: 10px; color: #374151; display: flex; gap: 6px; align-items: baseline; }
  .bloc-name { font-weight: 600; }
  .bloc-detail { color: #6b7280; }
  .bloc-zone { display: inline-block; width: 14px; height: 8px; border-radius: 2px; vertical-align: middle; margin-right: 2px; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 12px 16px; font-size: 11px; }
    .week { break-inside: avoid; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>

<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
  <div>
    <h1>${plan.name}</h1>
    <p class="plan-meta">
      ${plan.duree_semaines} semaines &nbsp;·&nbsp; ${plan.start_date} → ${plan.end_date}
      &nbsp;·&nbsp; Sports : ${plan.sports.map(s => sportLabel(s)).join(', ')}
    </p>
  </div>
  <div style="text-align:right;font-size:10px;color:#9ca3af;white-space:nowrap">
    Plan THW Coach IA<br>
    ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>
</div>

${plan.objectif_principal ? `<div class="objectif">${plan.objectif_principal}</div>` : ''}

${semaines.map((sem) => {
  const seances = (Array.isArray(sem.seances) ? sem.seances : []) as Record<string, unknown>[]
  const volumeH = typeof sem.volume_h === 'number' ? sem.volume_h : null
  const tssSem  = typeof sem.tss_semaine === 'number' ? sem.tss_semaine : null
  const ZONE_PDF_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']

  return `<div class="week">
  <div class="week-header">
    <span class="week-num">Semaine ${sem.numero}</span>
    ${sem.type ? `<span class="week-type">${sem.type}</span>` : ''}
    <span class="week-stats">
      ${volumeH !== null ? `<span><strong>${volumeH}h</strong> vol.</span>` : ''}
      ${tssSem !== null ? `<span><strong>${tssSem}</strong> TSS</span>` : ''}
      ${seances.length > 0 ? `<span><strong>${seances.length}</strong> séance${seances.length > 1 ? 's' : ''}</span>` : ''}
    </span>
  </div>
  ${sem.theme ? `<p class="week-theme">${sem.theme}</p>` : ''}
  ${sem.note_coach ? `<p class="week-coach">${sem.note_coach}</p>` : ''}
  ${seances.length > 0 ? `<div class="sessions">
  ${seances.map((s: Record<string, unknown>) => {
    const rawSport   = typeof s.sport    === 'string' ? s.sport    : ''
    const titre      = typeof s.titre    === 'string' ? s.titre    : ''
    const jour       = typeof s.jour     === 'number' ? s.jour     : null
    const dureMin    = typeof s.duree_min === 'number' ? s.duree_min : null
    const heure      = typeof s.heure    === 'string' ? s.heure    : null
    const tss        = typeof s.tss      === 'number' ? s.tss      : null
    const intensite  = typeof s.intensite === 'string' ? s.intensite : null
    const notes      = typeof s.notes    === 'string' ? s.notes    : null
    const rpe        = typeof s.rpe      === 'number' ? s.rpe      : null
    const blocs      = Array.isArray(s.blocs) ? s.blocs as Record<string, unknown>[] : []
    const col        = sportColor(rawSport)
    const dayLabel   = jour !== null ? `${DAY_NAMES_PDF[jour] ?? 'J' + jour}` : ''

    return `<div class="session" style="border-left-color:${col}">
    <div class="session-header">
      ${dayLabel ? `<span class="day-badge">${dayLabel}</span>` : ''}
      ${heure ? `<span style="font-size:9px;color:#6b7280;font-variant-numeric:tabular-nums">${heure}</span>` : ''}
      <span class="sport-badge" style="background:${col}22;color:${col}">${sportLabel(rawSport)}</span>
      <span class="session-title">${titre}</span>
    </div>
    <div class="session-meta">
      ${dureMin !== null ? `<span>⏱ ${fmtDurPDF(dureMin)}</span>` : ''}
      ${tss !== null ? `<span>${tss} TSS</span>` : ''}
      ${intensite ? `<span>${INTENS_LABEL_PDF[intensite] ?? intensite}</span>` : ''}
      ${rpe !== null ? `<span>RPE ${rpe}/10</span>` : ''}
    </div>
    ${notes ? `<p class="session-notes">${notes}</p>` : ''}
    ${blocs.length > 0 ? `<div class="blocs">${blocs.map((b: Record<string, unknown>) => {
      const bNom   = typeof b.nom        === 'string' ? b.nom        : ''
      const bDur   = typeof b.duree_min  === 'number' ? b.duree_min  : null
      const bZone  = typeof b.zone       === 'number' ? b.zone       : null
      const bReps  = typeof b.repetitions === 'number' && b.repetitions > 1 ? b.repetitions : null
      const bWatts = typeof b.watts      === 'number' ? b.watts      : null
      const bAllure= typeof b.allure     === 'string' ? b.allure     : null
      const bConsigne = typeof b.consigne === 'string' ? b.consigne  : null
      const bZoneColor = bZone ? (ZONE_PDF_COLORS[bZone - 1] ?? '#9ca3af') : '#9ca3af'
      const detail = [
        bReps ? `${bReps}×${bDur}min` : (bDur ? `${fmtDurPDF(bDur)}` : null),
        bZone ? `Z${bZone}` : null,
        bWatts ? `${bWatts}W` : (bAllure ?? null),
      ].filter(Boolean).join(' · ')
      return `<div class="bloc">
        <span class="bloc-zone" style="background:${bZoneColor}"></span>
        <span class="bloc-name">${bNom}</span>
        ${detail ? `<span class="bloc-detail">${detail}</span>` : ''}
        ${bConsigne ? `<span class="bloc-detail">— ${bConsigne}</span>` : ''}
      </div>`
    }).join('')}</div>` : ''}
    </div>`
  }).join('')}
  </div>` : ''}
</div>`
}).join('')}

<div class="footer">
  <span>Généré par THW Coach IA · ${plan.name}</span>
  <span>${plan.start_date} → ${plan.end_date} · ${plan.duree_semaines} semaines</span>
</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.print() }, 400)
  }
}

// ── Plan header + 4 collapsible charts ────────────────────────────────────

function PlanHeaderAndGraphics({ plan, sessions, currentWeekStart, nextRace, onReload }: {
  plan: AiTrainingPlan
  sessions: AiPlanSessionAgg[]
  currentWeekStart: string
  nextRace?: Race | null
  onReload?: () => void
}) {
  const currentWeekNum = (() => {
    const startMs = new Date(plan.start_date + 'T00:00:00').getTime()
    const curMs   = new Date(currentWeekStart + 'T00:00:00').getTime()
    return Math.max(1, Math.min(plan.duree_semaines, Math.round((curMs - startMs) / (7 * 86400000)) + 1))
  })()

  const [selectedBloc, setSelectedBloc] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  // Dimensions SVG
  const PERIOD_W = 400, PERIOD_H = 26

  return (
    <div style={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '14px 16px', marginBottom: 8 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Plan en cours</p>
          {/* Titre + bouton PDF côte à côte */}
          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'2px 0 4px' }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'Syne,sans-serif', lineHeight: 1.2, flex: 1, minWidth: 0 }}>{plan.name}</p>
            <button
              onClick={() => exportPlanToPDF(plan)}
              title="Exporter le plan complet en PDF"
              style={{
                padding:'4px 10px', borderRadius:7,
                background:'rgba(139,92,246,0.10)', border:'1px solid rgba(139,92,246,0.25)',
                color:'#8b5cf6', fontSize:10, fontWeight:600, cursor:'pointer',
                display:'flex', alignItems:'center', gap:4, flexShrink:0,
                whiteSpace:'nowrap' as const,
              }}
            >
              ↓ PDF
            </button>
          </div>
          {plan.objectif_principal && (
            <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: '0 0 6px', lineHeight: 1.45 }}>{plan.objectif_principal}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', minWidth: 50, fontVariantNumeric: 'tabular-nums' }}>S{currentWeekNum}/{plan.duree_semaines}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(139,92,246,0.12)', overflow: 'hidden' }}>
              <div style={{ width: `${(currentWeekNum / plan.duree_semaines) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#8b5cf6,#5b6fff)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>Du {fmtFrenchDate(plan.start_date)} au {fmtFrenchDate(plan.end_date)}</p>
        </div>

        {/* ── Prochain objectif ── */}
        {nextRace && (() => {
          const cfg  = RACE_CONFIG[nextRace.level]
          const days = daysUntil(nextRace.date)
          const accentCol = nextRace.level === 'gty' ? 'var(--gty-text)' : cfg.color
          return (
            <div style={{ flexShrink: 0, textAlign: 'right' as const, minWidth: 100 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Prochain objectif</p>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, padding: '6px 10px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                {days > 0 && (
                  <span style={{ fontSize: 20, fontWeight: 800, color: accentCol, fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>J-{days}</span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, maxWidth: 110, textAlign: 'right' as const }}>{nextRace.name}</span>
                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>
                  {new Date(nextRace.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── CHARTS ROW : PÉRIODISATION (60%) + VOLUME HEBDOMADAIRE (40%) ── */}
      {/* Desktop : côte à côte — Mobile : empilés */}
      <style>{`
        @media (min-width: 768px) {
          #plan-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; }
          #plan-charts-row > div { min-width: 0; }
        }
      `}</style>
      <div id="plan-charts-row">
        {/* ── LEFT : PÉRIODISATION ── */}
        <div>
          {plan.blocs_periodisation.length > 0 && (
            <ChartSection title="Périodisation">
              <svg width="100%" viewBox={`0 0 ${PERIOD_W} ${PERIOD_H}`} preserveAspectRatio="none"
                style={{ display: 'block', borderRadius: 5, marginBottom: 8, cursor: 'pointer' }}>
                {(() => {
                  const total = plan.duree_semaines || 1
                  let offX = 0
                  return plan.blocs_periodisation.map((b, i) => {
                    const dur      = b.semaine_fin - b.semaine_debut + 1
                    const w        = (dur / total) * PERIOD_W
                    const x        = offX; offX += w
                    const color    = TP_BLOC_COLORS[b.type] ?? '#6b5fa8'
                    const isActive = currentWeekNum >= b.semaine_debut && currentWeekNum <= b.semaine_fin
                    const isSel    = selectedBloc === i
                    const isFirst  = i === 0
                    const isLast   = i === plan.blocs_periodisation.length - 1
                    const textCol = TP_BLOC_TEXT[b.type] ?? '#fff'
                    // 1px gap entre blocs — chaque bloc est légèrement moins large
                    const gapRight = i < plan.blocs_periodisation.length - 1 ? 1 : 0
                    return (
                      <g key={i} onClick={() => setSelectedBloc(isSel ? null : i)} style={{ cursor: 'pointer' }}>
                        <rect x={x} y={0} width={w - gapRight} height={PERIOD_H} fill={color}
                          opacity={isSel ? 1 : isActive ? 1 : 0.6}
                          rx={6} />
                        {isSel && <rect x={x} y={0} width={w - gapRight} height={PERIOD_H} fill="none"
                          stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} rx={6} />}
                        {w > 40 && (
                          <text x={x + (w - gapRight) / 2} y={PERIOD_H / 2 + 4} textAnchor="middle"
                            fontSize={11} fill={textCol} fontWeight={500} opacity={0.92}>
                            {b.type}
                          </text>
                        )}
                        {isActive && (
                          <line
                            x1={x + ((currentWeekNum - b.semaine_debut + 0.5) / dur) * (w - gapRight)}
                            x2={x + ((currentWeekNum - b.semaine_debut + 0.5) / dur) * (w - gapRight)}
                            y1={4} y2={PERIOD_H - 4}
                            stroke="#fff" strokeWidth={1.5} opacity={0.8} strokeDasharray="2 2"
                          />
                        )}
                      </g>
                    )
                  })
                })()}
              </svg>

              {/* Detail panel for selected bloc */}
              {selectedBloc !== null && plan.blocs_periodisation[selectedBloc] && (() => {
                const b = plan.blocs_periodisation[selectedBloc]
                const dur = b.semaine_fin - b.semaine_debut + 1
                const col = TP_BLOC_COLORS[b.type] ?? '#D4B8E8'
                const txt = TP_BLOC_TEXT[b.type] ?? '#333'
                return (
                  <div style={{
                    background: `${col}60`, border: `1px solid ${col}`,
                    borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px',
                  }}>
                    <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: txt }}>{b.nom}</span>
                      <button onClick={() => setSelectedBloc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12, padding: 0 }}>✕</button>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Phase <strong style={{ color: txt }}>{b.type}</strong></span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Durée <strong style={{ color: 'var(--text-mid)', fontFamily: 'DM Mono,monospace' }}>S{b.semaine_debut}–S{b.semaine_fin} · {dur} sem.</strong></span>
                    {b.volume_hebdo_h != null && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Volume/sem. <strong style={{ color: 'var(--text-mid)', fontFamily: 'DM Mono,monospace' }}>{formatDuration(Math.round(b.volume_hebdo_h * 60))}</strong></span>}
                    {b.description && <p style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>{b.description}</p>}
                  </div>
                )
              })()}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                {plan.blocs_periodisation.map((b, i) => {
                  const col = TP_BLOC_COLORS[b.type] ?? '#D4B8E8'
                  const txt = TP_BLOC_TEXT[b.type] ?? '#333'
                  return (
                    <button key={i} onClick={() => setSelectedBloc(selectedBloc === i ? null : i)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: selectedBloc === i ? txt : 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: col, border: `1px solid ${txt}30`, flexShrink: 0, opacity: selectedBloc === i ? 1 : 0.8 }} />
                      {b.nom} · S{b.semaine_debut}–S{b.semaine_fin}
                    </button>
                  )
                })}
              </div>
            </ChartSection>
          )}
        </div>

        {/* ── RIGHT : VOLUME HEBDOMADAIRE — 100% live depuis planned_sessions ── */}
        <div>
          {(() => {
            if (sessions.length === 0) return null

            // ── Construire les semaines depuis les vraies séances ──────────
            const WEEK_MS     = 7 * 24 * 60 * 60 * 1000
            const planStartMs = new Date(plan.start_date + 'T00:00:00Z').getTime()

            // Métadonnées type/thème depuis le plan IA (enrichissement optionnel)
            type AiSem = { numero?: number; type?: string; theme?: string }
            const aiSemaines: AiSem[] = plan.ai_context?.program?.semaines ?? []

            // Groupe sessions par week_start (hors repos)
            const weekMap = new Map<string, { sport: string; duration_min: number; intensity?: string }[]>()
            for (const s of sessions) {
              if (!s.week_start) continue
              if (isRestSession(s)) continue   // exclure repos des graphiques
              if (!weekMap.has(s.week_start)) weekMap.set(s.week_start, [])
              weekMap.get(s.week_start)!.push({ sport: s.sport ?? 'autre', duration_min: s.duration_min ?? 0, intensity: s.intensity ?? undefined })
            }
            const weekStarts = Array.from(weekMap.keys()).sort()
            if (weekStarts.length === 0) return null

            type WeekBar = { weekStart: string; weekNum: number; type: string; theme: string; volume_h: number; seanceCount: number; sportStats: { sport: string; count: number; mins: number }[] }

            // Passe 1 : volumes bruts pour calculer la moyenne (nécessaire à computeWeekType)
            const rawWeeks = weekStarts.map((ws, idx) => {
              const rows    = weekMap.get(ws)!
              const weekNum = Math.round((new Date(ws + 'T00:00:00Z').getTime() - planStartMs) / WEEK_MS) + 1
              const aiSem   = aiSemaines.find(s => s.numero === weekNum)
              const volume_h = rows.reduce((s, r) => s + r.duration_min / 60, 0)
              return { ws, idx, rows, weekNum, aiSem, volume_h }
            })
            const avgVolume = rawWeeks.length > 0
              ? rawWeeks.reduce((s, w) => s + w.volume_h, 0) / rawWeeks.length
              : 0

            // Passe 2 : weekBars avec type calculé dynamiquement
            const weekBars: WeekBar[] = rawWeeks.map(({ ws, idx, rows, weekNum, aiSem, volume_h }) => {
              const sMap = new Map<string, { count: number; mins: number }>()
              for (const r of rows) {
                if (!sMap.has(r.sport)) sMap.set(r.sport, { count: 0, mins: 0 })
                sMap.get(r.sport)!.count++
                sMap.get(r.sport)!.mins += r.duration_min
              }
              const sportStats = Array.from(sMap.entries()).map(([sport, v]) => ({ sport, count: v.count, mins: v.mins })).sort((a, b) => b.mins - a.mins)

              return {
                weekStart: ws,
                weekNum,
                type:  computeWeekType(rows, avgVolume, aiSem?.type),
                theme: aiSem?.theme ?? `Semaine ${idx + 1}`,
                volume_h: Math.round(volume_h * 10) / 10,
                seanceCount: rows.length,
                sportStats,
              }
            })

            const n      = weekBars.length
            const BAR_GAP = 4
            const barW   = 40
            const VOL_W  = barW * n + BAR_GAP * (n - 1)
            const VOL_H  = 80
            const Y_PAD  = 14
            const maxVol = Math.max(...weekBars.map(w => w.volume_h), 1)
            const selBar = selectedWeek !== null ? weekBars.find(w => w.weekStart === selectedWeek) ?? null : null

            // Semaine courante
            const curWsMs = new Date(currentWeekStart + 'T00:00:00Z').getTime()
            const curWeekNum = Math.round((curWsMs - planStartMs) / WEEK_MS) + 1

            return (
              <ChartSection title="Volume hebdomadaire" subtitle={`${n} semaine${n > 1 ? 's' : ''} · live`}>
                <svg width="100%" viewBox={`0 0 ${VOL_W} ${VOL_H + Y_PAD}`} style={{ display: 'block', overflow: 'visible', cursor: 'pointer', maxWidth: VOL_W }}>
                  {weekBars.map((w, i) => {
                    const barH  = Math.max(w.volume_h > 0 ? (w.volume_h / maxVol) * VOL_H : 0, w.volume_h > 0 ? 2 : 0)
                    const x     = i * (barW + BAR_GAP)
                    const y     = VOL_H - barH
                    const active = w.weekNum === curWeekNum
                    const isSel  = w.weekStart === selectedWeek
                    const col    = safeWeekTypeBg(w.type)
                    const txtCol = safeWeekTypeText(w.type)
                    return (
                      <g key={w.weekStart} onClick={() => setSelectedWeek(isSel ? null : w.weekStart)} style={{ cursor: 'pointer' }}>
                        <rect x={x} y={0} width={barW} height={VOL_H + Y_PAD} fill="transparent" />
                        <rect x={x} y={y} width={barW} height={barH} fill={col} opacity={isSel ? 1 : active ? 1 : 0.5} rx={2}>
                          <title>{`S${w.weekNum} — ${w.type}\n${w.theme}\n${formatDuration(Math.round(w.volume_h * 60))} · ${w.seanceCount} séance${w.seanceCount > 1 ? 's' : ''}`}</title>
                        </rect>
                        {(active || isSel) && (
                          <rect x={x} y={y} width={barW} height={barH} rx={2} fill="none" stroke={txtCol} strokeWidth={1} opacity={0.4} />
                        )}
                        <text x={x + barW / 2} y={VOL_H + Y_PAD - 1} textAnchor="middle"
                          fontSize={6} fill={isSel || active ? txtCol : '#aaa'}
                          fontWeight={isSel || active ? 600 : 400}>
                          {`S${w.weekNum}`}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* ── Détail semaine cliquée ── */}
                {selBar && (() => {
                  const accentCol = safeWeekTypeText(selBar.type)
                  return (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: `${accentCol}0d`, border: `1px solid ${accentCol}30` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: accentCol }}>S{selBar.weekNum} — {selBar.type}</span>
                        <button onClick={() => setSelectedWeek(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1, padding: '0 2px' }}>✕</button>
                      </div>
                      {selBar.theme && <p style={{ fontSize: 10, color: 'var(--text-mid)', margin: '0 0 8px', fontStyle: 'italic' }}>{selBar.theme}</p>}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: selBar.sportStats.length > 0 ? 10 : 0 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          Volume <strong style={{ color: 'var(--text)', fontFamily: 'DM Mono,monospace' }}>{formatDuration(Math.round(selBar.volume_h * 60))}</strong>
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          Séances <strong style={{ color: 'var(--text)' }}>{selBar.seanceCount}</strong>
                        </span>
                      </div>
                      {selBar.sportStats.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {selBar.sportStats.map(({ sport, count, mins }) => (
                            <div key={sport} style={{ display: 'grid', gridTemplateColumns: '70px 22px 44px', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: sportColor(sport), textTransform: 'capitalize' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{sport}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'right' as const }}>{count}×</span>
                              <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text)', textAlign: 'right' as const }}>{formatDuration(mins)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </ChartSection>
            )
          })()}
        </div>
      </div>

      {/* ── CHART 2 : VOLUME PAR SPORT ── */}
      {(() => {
        const volBySport = (() => {
          const map = new Map<string, number>()
          for (const s of sessions) {
            if (!s.sport) continue
            if (isRestSession(s)) continue   // exclure repos
            map.set(s.sport, (map.get(s.sport) ?? 0) + (s.duration_min ?? 0))
          }
          return Array.from(map.entries())
            .map(([sport, mins]) => ({ sport, mins }))
            .sort((a, b) => b.mins - a.mins)
        })()
        if (volBySport.length === 0) return null
        const maxMins = Math.max(...volBySport.map(e => e.mins), 1)
        return (
          <ChartSection title="Volume par sport" subtitle="(plan complet)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {volBySport.map(({ sport, mins }) => {
                const col = sportColor(sport)
                const pct = (mins / maxMins) * 100
                return (
                  <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: col, minWidth: 74, textTransform: 'capitalize' as const }}>{sport}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 4,
                        background: col, opacity: 0.82,
                        transformOrigin: 'left center',
                        animation: 'barFill 0.9s cubic-bezier(0.25,1,0.5,1) both',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-mid)', minWidth: 36, textAlign: 'right' as const }}>{formatDuration(mins)}</span>
                  </div>
                )
              })}
            </div>
          </ChartSection>
        )
      })()}

      {/* ── CHART 4 : 3 DONUTS — Zones · Sports · Charge plan ── */}
      {(() => {
        // ── helpers ──────────────────────────────────────────────
        const ZONE_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']
        const ZONE_LABELS = ['Z1 Récup', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2max']
        const INTENS_COLORS: Record<string, string> = { low: '#3d8f6e', moderate: '#b8783a', high: '#b04040', max: '#7055a8' }
        const INTENS_LABELS: Record<string, string> = { low: 'Facile', moderate: 'Modéré', high: 'Intensif', max: 'Max' }

        function intensityToZone(intensity: string | null | undefined): number {
          switch (intensity) {
            case 'low':      return 1
            case 'moderate': return 2
            case 'high':     return 3
            case 'max':      return 4
            default:         return 0
          }
        }

        function buildArcs<T extends { pct: number }>(entries: T[]): (T & { startAng: number; endAng: number })[] {
          let angle = -Math.PI / 2
          return entries.map(e => {
            const sweep = e.pct * 2 * Math.PI
            const startAng = angle
            const endAng = angle + sweep - (entries.length > 1 ? 0.03 : 0)
            angle += sweep
            return { ...e, startAng, endAng }
          })
        }

        // ── DONUT 1 : Zones (semaine actuelle, hors repos) ───────
        const currentWeekSessions = sessions.filter(s => s.week_start === currentWeekStart && !isRestSession(s))
        const zoneMins = [0, 0, 0, 0, 0]
        for (const s of currentWeekSessions) {
          const z = intensityToZone(s.intensity)
          zoneMins[z] += s.duration_min ?? 0
        }
        const totalZoneMins = zoneMins.reduce((a, b) => a + b, 0)
        const zoneEntries = zoneMins
          .map((mins, zi) => ({ zi, mins, pct: totalZoneMins > 0 ? mins / totalZoneMins : 0 }))
          .filter(e => e.mins > 0)
        const zoneArcs = buildArcs(zoneEntries)

        // ── DONUT 2 : Sports (plan complet — toutes les planned_sessions du plan) ──────
        // On utilise la prop `sessions` (AiPlanSessionAgg[] depuis la table planned_sessions)
        // qui couvre TOUTES les semaines du plan, pas seulement S1-S2 comme ai_context.
        const sportMap: Record<string, number> = {}
        for (const s of sessions) {
          if (!s.sport) continue
          if (isRestSession(s)) continue   // exclure repos
          sportMap[s.sport] = (sportMap[s.sport] ?? 0) + (s.duration_min ?? 0)
        }
        const totalSportMins = Object.values(sportMap).reduce((a, b) => a + b, 0)
        const sportEntries = Object.entries(sportMap)
          .map(([sport, mins]) => ({ sport, mins, pct: totalSportMins > 0 ? mins / totalSportMins : 0, col: sportColor(sport) }))
          .sort((a, b) => b.mins - a.mins)
        const sportArcs = buildArcs(sportEntries)

        // ── DONUT 3 : Répartition charge plan (toutes les planned_sessions) ──────
        const intensMap: Record<string, number> = {}
        for (const s of sessions) {
          if (isRestSession(s)) continue   // exclure repos
          const key = s.intensity ?? 'low'
          intensMap[key] = (intensMap[key] ?? 0) + 1
        }
        const totalSessions = Object.values(intensMap).reduce((a, b) => a + b, 0)
        const intensEntries = Object.entries(intensMap)
          .map(([k, n]) => ({ key: k, n, pct: totalSessions > 0 ? n / totalSessions : 0, col: INTENS_COLORS[k] ?? '#9ca3af', label: INTENS_LABELS[k] ?? k }))
          .sort((a, b) => b.n - a.n)
        const intensArcs = buildArcs(intensEntries)

        // At least one donut must have data
        if (totalZoneMins === 0 && totalSportMins === 0 && totalSessions === 0) return null

        const CX = 50, CY = 50, R_OUT = 42, R_IN = 26

        function MiniDonut({ arcs, cx, cy, label, sub }: {
          arcs: { startAng: number; endAng: number; col?: string; zi?: number }[]
          cx: number; cy: number; label: string; sub: string
        }) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
              <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`}>
                {arcs.length === 0
                  ? <circle cx={cx} cy={cy} r={R_OUT} fill="var(--border)" opacity={0.3} />
                  : arcs.map((arc, i) => (
                    <path key={i}
                      d={donutArcPath(cx, cy, R_OUT, R_IN, arc.startAng, arc.endAng)}
                      fill={arc.col ?? ZONE_COLORS[arc.zi ?? 0]}
                      opacity={0.88}
                    />
                  ))
                }
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--text)" fontFamily="DM Mono,monospace">{sub}</text>
              </svg>
              <span style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center' as const, lineHeight: 1.3 }}>{label}</span>
            </div>
          )
        }

        const zArcs = zoneArcs.map(a => ({ startAng: a.startAng, endAng: a.endAng, col: ZONE_COLORS[a.zi], zi: a.zi }))
        const sArcs = sportArcs.map(a => ({ startAng: a.startAng, endAng: a.endAng, col: a.col }))
        const iArcs = intensArcs.map(a => ({ startAng: a.startAng, endAng: a.endAng, col: a.col }))

        return (
          <ChartSection title="Distributions" subtitle="(zones · sports · charge)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <MiniDonut arcs={zArcs} cx={CX} cy={CY}
                label="Zones d'intensité" sub={totalZoneMins > 0 ? formatDuration(totalZoneMins) : '—'} />
              <MiniDonut arcs={sArcs} cx={CX} cy={CY}
                label="Répartition sports" sub={totalSportMins > 0 ? formatDuration(totalSportMins) : '—'} />
              <MiniDonut arcs={iArcs} cx={CX} cy={CY}
                label="Charge du plan" sub={totalSessions > 0 ? `${totalSessions} séances` : '—'} />
            </div>
            {/* compact legend under each donut */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' as const }}>
              {/* Zones legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                {zoneArcs.slice(0, 3).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: ZONE_COLORS[a.zi], flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{ZONE_LABELS[a.zi]} <strong style={{ color: 'var(--text-mid)' }}>{Math.round(a.pct * 100)}%</strong></span>
                  </div>
                ))}
              </div>
              {/* Sports legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                {sportArcs.slice(0, 3).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: a.col, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'capitalize' as const }}>{a.sport} <strong style={{ color: 'var(--text-mid)' }}>{Math.round(a.pct * 100)}%</strong></span>
                  </div>
                ))}
              </div>
              {/* Intensité legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                {intensArcs.slice(0, 3).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: a.col, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{a.label} <strong style={{ color: 'var(--text-mid)' }}>{Math.round(a.pct * 100)}%</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </ChartSection>
        )
      })()}
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
  const [showPlanDd,  setShowPlanDd]  = useState(false)

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
  const { sessions, races, intensities, activities, loading, addSession, updateSession, updateSessionSilent, deleteSession, moveSession, setDayIntensity } = usePlanning(currentWeekStart)
  const nextRace = races.filter(r => daysUntil(r.date) > 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date))[0] ?? null
  const [view, setView] = useState<TrainingView>('vertical')
  const [addModal, setAddModal] = useState<{dayIndex:number;plan:PlanVariant;weekStart?:string}|null>(null)
  const [addModalFavorites, setAddModalFavorites] = useState(false)
  const [detailModal, setDetailModal] = useState<Session|null>(null)
  const [activityDetail, setActivityDetail] = useState<TrainingActivity|null>(null)
  const [dragOver, setDragOver] = useState<number|null>(null)
  const [show10w, setShow10w] = useState(false)
  const [intensityModal, setIntensityModal] = useState<DayIntensity|null>(null)
  const [planningFavorites, setPlanningFavorites] = useState<Array<{id:string;name:string}>>([])
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
  // Charger les favoris pour le bouton ★ dans la vue semaine
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('session_favorites').select('id,name').eq('user_id', user.id).limit(20)
        if (data) setPlanningFavorites(data)
      } catch {}
    })()
  }, [])
  const dragRef      = useRef<{id:string;from:number}|null>(null)
  const touchRef     = useRef<{id:string;from:number}|null>(null)
  const dragTouchRef = useRef<{id:string;from:number;el:HTMLElement;clone:HTMLElement|null}|null>(null)
  const todayIdx = getTodayIdx()

  // ── AI training plan détecté pour la semaine courante ──
  const [aiPlan,        setAiPlan]        = useState<AiTrainingPlan | null>(null)
  const [aiPlanSessions, setAiPlanSessions] = useState<AiPlanSessionAgg[]>([])
  // Plan actif qui commence dans une semaine future (pas encore dans la vue courante)
  const [upcomingPlan,  setUpcomingPlan]  = useState<{name:string;startDate:string} | null>(null)

  // Tick incrémenté quand AIPanel applique un tool call → force le refetch du plan
  // (périodisation, volume chart, données PDF)
  const [aiPlanReloadTick, setAiPlanReloadTick] = useState(0)
  useEffect(() => {
    const handler = () => setAiPlanReloadTick(t => t + 1)
    window.addEventListener('thw:sessions-changed', handler)
    return () => window.removeEventListener('thw:sessions-changed', handler)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return

        // Fetch all active plans for the user, sorted newest first.
        // We filter client-side so timezone off-by-one in stored dates
        // never causes a silent miss, and maybeSingle() errors on
        // multiple rows are avoided.
        const { data: plans } = await sb.from('training_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10)

        if (cancelled) return

        // Find the plan whose [start_date, end_date] covers currentWeekStart.
        // Accept ±1 day tolerance to absorb timezone serialisation drift.
        const oneDayMs = 86400000
        const curMs    = new Date(currentWeekStart + 'T00:00:00').getTime()
        const planData = (plans ?? []).find(p => {
          const startMs = new Date((p as { start_date: string }).start_date + 'T00:00:00').getTime()
          const endMs   = new Date((p as { end_date:   string }).end_date   + 'T00:00:00').getTime()
          return startMs <= curMs + oneDayMs && endMs >= curMs - oneDayMs
        }) ?? null

        if (!planData) {
          setAiPlan(null)
          setAiPlanSessions([])
          // Problème 1 fix : si aucun plan ne couvre la semaine courante,
          // chercher si un plan actif démarre dans le futur → afficher une bannière
          // pour que l'utilisateur puisse sauter directement à la semaine 1.
          const futurePlan = (plans ?? []).find(p => {
            const startMs = new Date((p as { start_date: string }).start_date + 'T00:00:00').getTime()
            return startMs > curMs + oneDayMs
          }) ?? null
          if (!cancelled) {
            setUpcomingPlan(futurePlan ? {
              name:      (futurePlan as { name: string }).name,
              startDate: (futurePlan as { start_date: string }).start_date,
            } : null)
          }
          return
        }
        setUpcomingPlan(null)
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
  // aiPlanReloadTick : re-fetche training_plans + aiPlanSessions après un tool call
  // (périodisation, volume chart, PDF)
  }, [currentWeekStart, aiPlanReloadTick])

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
      sessions: wSessions.filter(s=>s.dayIndex===i && !isRestSession(s)),
      activities: wActs.filter(a=>a.dayIndex===i),
    }))
  }
  const week = buildWeek(currentWeekStart, compareMode ? undefined : activePlan)

  async function handleAddSession(dayIdx:number, s:Session, targetWeekStart?:string) {
    if (targetWeekStart && targetWeekStart !== currentWeekStart) {
      // Ajout sur une autre semaine — appel Supabase direct
      const { createClient: sbCreate } = await import('@/lib/supabase/client')
      const sb = sbCreate()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const typedS = s as Session & { nutritionItems?: NutritionItem[] }
      await sb.from('planned_sessions').insert({
        user_id: user.id, week_start: targetWeekStart, day_index: dayIdx,
        sport: s.sport, title: s.title, time: s.time, duration_min: s.durationMin,
        tss: s.tss ?? null, status: s.status, notes: s.notes ?? null,
        rpe: s.rpe ?? null, blocks: s.blocks ?? [], validation_data: {},
        plan_variant: s.planVariant ?? activePlan,
        parcours_data: s.parcoursData ?? null,
        nutrition_data: typedS.nutritionItems ?? null,
      })
      window.dispatchEvent(new Event('thw:sessions-changed'))
      return
    }
    await addSession({ ...s, dayIndex:dayIdx, planVariant:addModal?.plan??activePlan })
  }
  async function handleSaveSession(s:Session) {
    await updateSession(s.id, s)
    setDetailModal(null)
  }
  async function handleAutoSaveSession(s:Session) {
    // Silent : pas de thw:sessions-changed → load() ne se déclenche pas → modale reste ouverte
    await updateSessionSilent(s.id, s)
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
  function onTouchStart(id:string,from:number,e?:React.TouchEvent) {
    touchRef.current={id,from}
    if (e) {
      const el = e.currentTarget as HTMLElement
      const clone = el.cloneNode(true) as HTMLElement
      const rect = el.getBoundingClientRect()
      clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:0.7;pointerEvents:none;zIndex:9999;transform:scale(1.04);boxShadow:0 8px 24px rgba(0,0,0,0.3);borderRadius:6px;`
      document.body.appendChild(clone)
      el.style.opacity = '0.3'
      dragTouchRef.current = { id, from, el, clone }
    }
  }
  function onTouchMove(e:React.TouchEvent) {
    if (!dragTouchRef.current?.clone) return
    const t = e.touches[0]
    const rect = dragTouchRef.current.el.getBoundingClientRect()
    dragTouchRef.current.clone.style.left = `${t.clientX - rect.width / 2}px`
    dragTouchRef.current.clone.style.top  = `${t.clientY - rect.height / 2}px`
  }
  function onTouchEnd(to?:number) {
    if (!touchRef.current) return
    // If using elementFromPoint approach
    if (dragTouchRef.current) {
      const { el, clone } = dragTouchRef.current
      if (clone) { clone.remove() }
      el.style.opacity = ''
      dragTouchRef.current = null
    }
    if (to !== undefined && to !== null && touchRef.current.from !== to) {
      moveSession(touchRef.current.id, to)
    }
    touchRef.current = null
  }
  function onTouchEndPoint(e:React.TouchEvent) {
    if (!touchRef.current) return
    if (dragTouchRef.current) {
      const { el, clone } = dragTouchRef.current
      if (clone) { clone.remove() }
      el.style.opacity = ''
      dragTouchRef.current = null
    }
    const t = e.changedTouches[0]
    const target = document.elementFromPoint(t.clientX, t.clientY)
    const dayEl = target?.closest('[data-day-index]') as HTMLElement | null
    const dayIdx = dayEl ? parseInt(dayEl.dataset.dayIndex ?? '-1') : -1
    if (dayIdx >= 0 && dayIdx !== touchRef.current.from) {
      moveSession(touchRef.current.id, dayIdx)
    }
    touchRef.current = null
  }

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

  const sportCounts = (['run','bike','swim','hyrox','rowing','gym','elliptique'] as SportType[]).map(sp=>({
    sport:sp,
    planned: allSess.filter(s=>s.sport===sp).length,
    done: allSess.filter(s=>s.sport===sp&&s.status==='done').length
        + allActs.filter(a=>normalizeSportType(a.sport)===sp).length
  })).filter(s=>s.planned>0||s.done>0)

  const sportStats = (['run','bike','swim','hyrox','rowing','gym','elliptique'] as SportType[]).map(sp=>({
    sport:sp,
    plannedH: allSess.filter(s=>s.sport===sp).reduce((a,x)=>a+x.durationMin/60,0),
    doneH: allSess.filter(s=>s.sport===sp&&s.status==='done').reduce((a,x)=>a+x.durationMin/60,0)
          + allActs.filter(a=>normalizeSportType(a.sport)===sp).reduce((a,x)=>a+x.elapsedTime/3600,0)
  })).filter(s=>s.plannedH>0||s.doneH>0)

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
          {w.map((d,i)=>{ const cfg=INTENSITY_CONFIG[d.intensity]; const isCurrent = ws===currentWeekStart; const isPickerOpen = isCurrent && intensityPickerDay===i; return (
            <div key={d.day} style={{ padding:'8px 4px',textAlign:'center' as const,borderLeft:'1px solid var(--border)',minWidth:68 }}>
              <p style={{ fontSize:10,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 2px',fontWeight:500 }}>{d.day}</p>
              <p style={{ fontSize:14,fontWeight:700,margin:'0 0 4px',color:i===todayIdx&&isCurrent?'#00c8e0':'var(--text)' }}>{wDates[i]}</p>
              <div data-intensity-picker style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative' as const }}>
                <button
                  onClick={()=>{ if (isCurrent) setIntensityPickerDay(isPickerOpen?null:i); else setIntensityModal(d.intensity) }}
                  title={isCurrent ? 'Changer l\'intensité du jour' :
                    d.intensity === 'recovery' ? 'Récupération — journée légère ou repos actif' :
                    d.intensity === 'low' ? 'Charge légère — séance facile, endurance de base' :
                    d.intensity === 'mid' ? 'Charge modérée — séance standard' :
                    'Charge élevée — séance intense, récupération nécessaire'}
                  style={{ padding:'2px 9px 2px 7px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:9,fontWeight:700,cursor:!isCurrent?'help':'pointer',display:'inline-flex',alignItems:'center',gap:3 }}>
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
              data-day-index={i}
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
                  <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,i)} onTouchStart={e=>{e.stopPropagation();onTouchStart(s.id,i,e)}} onTouchMove={onTouchMove} onTouchEnd={onTouchEndPoint} onClick={()=>setDetailModal(s)}
                    style={{ borderRadius:6,padding:'4px 6px',background:SPORT_BG[s.sport],borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`,cursor:'grab',opacity:s.status==='done'?0.75:1,position:'relative' }}>
                    {s.status==='done' && <span style={{ position:'absolute',top:2,right:2,fontSize:7,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700 }}>FAIT</span>}
                    {s.status!=='done' && isSessionModified(s) && <span title="Modifié par toi" style={{ position:'absolute',top:3,right:3,width:5,height:5,borderRadius:'50%',background:'#f97316',flexShrink:0 }} />}
                    {s.planVariant && <span style={{ position:'absolute',top:2,left:2,fontSize:7,fontWeight:800,color:s.planVariant==='A'?'#00c8e0':'#a78bfa' }}>{s.planVariant}</span>}
                    <div style={{ display:'flex',alignItems:'center',gap:3,paddingLeft:8 }}>
                      <SportBadge sport={s.sport} size="xs"/>
                      <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{s.title}</p>
                    </div>
                    <p style={{ fontSize:8,opacity:0.7,margin:'1px 0 0',fontFamily:'DM Mono,monospace',paddingLeft:8 }}>{s.time} · {formatHM(s.durationMin)}</p>
                    {s.blocks.length>0 && <div style={{ display:'flex',gap:1,marginTop:2,height:6,borderRadius:1,overflow:'hidden' }}>{s.blocks.map(b=>{ const bMin=b.mode==='interval'&&b.reps&&b.effortMin&&b.recoveryMin?b.reps*(b.effortMin+b.recoveryMin):b.durationMin; return <div key={b.id} style={{ flex:bMin,background:ZONE_COLORS[b.zone-1],opacity:0.8 }}/> })}</div>}
                  </div>
                ))}
                <div style={{ display:'flex',gap:3,marginTop:2 }}>
                  <button onClick={()=>{setAddModalFavorites(false);setAddModal({dayIndex:i,plan:plan??activePlan,weekStart:ws})}} style={{ flex:1,padding:'3px',borderRadius:5,background:'transparent',border:'1px dashed var(--border)',color:'var(--text-dim)',fontSize:9,cursor:'pointer' }}>+</button>
                  {planningFavorites.length>0&&<button onClick={()=>{setAddModalFavorites(true);setAddModal({dayIndex:i,plan:plan??activePlan,weekStart:ws})}} style={{ padding:'3px 5px',borderRadius:5,background:'transparent',border:'1px dashed var(--border)',color:'var(--text-dim)',fontSize:9,cursor:'pointer' }} title="Charger un favori">★</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Ne pas masquer les modales pendant un rechargement (ex: auto-save silencieux)
  if (loading && !addModal && !detailModal) return <div style={{ padding:20 }}><SkeletonPlanningGrid /></div>

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* ── PLAN HEADER + GRAPHIQUES (visible si plan IA actif sur cette semaine) ── */}
      {aiPlan && (
        <PlanHeaderAndGraphics plan={aiPlan} sessions={aiPlanSessions} currentWeekStart={currentWeekStart} nextRace={nextRace} onReload={() => setAiPlanReloadTick(t => t + 1)} />
      )}
      {/* ── BULLE FLOTTANTE COACH IA (visible si plan actif) ── */}
      {aiPlan && <AiPlanBubble plan={aiPlan} />}
      {/* ── BANNIÈRE PLAN À VENIR — visible quand le plan démarre dans une semaine future ── */}
      {upcomingPlan && !aiPlan && (
        <div style={{ padding:'14px 18px',borderRadius:14,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.30)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' as const }}>
          <span style={{ fontSize:22 }}>📅</span>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 2px',color:'#00c8e0' }}>
              {upcomingPlan.name}
            </p>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>
              Démarre le {new Date(upcomingPlan.startDate + 'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
            </p>
          </div>
          <button
            onClick={() => {
              const startMs = new Date(upcomingPlan.startDate + 'T00:00:00').getTime()
              const baseMs  = new Date(getWeekStart() + 'T00:00:00').getTime()
              const newOffset = Math.round((startMs - baseMs) / (7 * 86400000))
              setWeekOffset(newOffset)
            }}
            style={{ padding:'8px 16px',borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',flexShrink:0 }}>
            Voir la semaine 1 →
          </button>
        </div>
      )}
      {show10w && <Last10WeeksModal onClose={()=>setShow10w(false)}/>}
      {intensityModal && <InfoModal title={INTENSITY_CONFIG[intensityModal].label} content={<p style={{margin:0}}>{intensityModal==='recovery'?'Journée légère ou repos.':intensityModal==='low'?'Faible intensité, récupération active.':intensityModal==='mid'?'Intensité modérée, fatigue contrôlée.':'Forte intensité — récupération nécessaire.'}</p>} onClose={()=>setIntensityModal(null)}/>}
      {addModal!==null && (
        <SessionEditor
          mode="create"
          dayIndex={addModal.dayIndex}
          plan={addModal.plan}
          onClose={()=>{setAddModal(null);setAddModalFavorites(false)}}
          onSave={(s)=>{ handleAddSession(addModal.dayIndex, s, addModal.weekStart); setAddModal(null); setAddModalFavorites(false) }}
          openWithFavorites={addModalFavorites}
        />
      )}
      {detailModal && (
        <div onClick={()=>setDetailModal(null)} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
          <SessionEditor
            mode="edit"
            session={detailModal}
            onClose={()=>setDetailModal(null)}
            onSave={handleSaveSession}
            onDelete={handleDelete}
            onValidate={handleValidate}
            onAutoSave={handleAutoSaveSession}
            onDuplicate={(dayIdx, s) => { addSession({ ...s, dayIndex: dayIdx, planVariant: s.planVariant ?? activePlan }); setDetailModal(null) }}
          />
        </div>
      )}
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
        <div style={{ marginLeft:'auto', position:'relative' }}>
          {showPlanDd && <div onClick={()=>setShowPlanDd(false)} style={{ position:'fixed',inset:0,zIndex:49 }}/>}
          <button onClick={()=>setShowPlanDd(x=>!x)}
            style={{ padding:'6px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontWeight:600 }}>
            {compareMode ? 'Comparer' : `Plan ${activePlan}`} <span style={{ fontSize:9 }}>▾</span>
          </button>
          {showPlanDd && (
            <div style={{ position:'absolute',top:'calc(100% + 4px)',right:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:10,boxShadow:'0 8px 20px rgba(0,0,0,0.14)',zIndex:50,minWidth:150,padding:4 }}>
              {(['A','B'] as PlanVariant[]).map(p=>(
                <button key={p} onClick={()=>{setActivePlan(p);setCompareMode(false);setShowPlanDd(false)}}
                  style={{ width:'100%',padding:'7px 12px',borderRadius:7,border:'none',
                    background:!compareMode&&activePlan===p?'rgba(0,200,224,0.10)':'transparent',
                    color:!compareMode&&activePlan===p?'#00c8e0':'var(--text-mid)',
                    fontSize:12,cursor:'pointer',textAlign:'left' as const,fontWeight:!compareMode&&activePlan===p?700:400 }}>
                  Plan {p} — {p==='A'?'Optimal':'Minimal'}
                </button>
              ))}
              <button onClick={()=>{setCompareMode(x=>!x);setShowPlanDd(false)}}
                style={{ width:'100%',padding:'7px 12px',borderRadius:7,border:'none',
                  background:compareMode?'rgba(255,179,64,0.10)':'transparent',
                  color:compareMode?'#ffb340':'var(--text-mid)',
                  fontSize:12,cursor:'pointer',textAlign:'left' as const,fontWeight:compareMode?700:400 }}>
                Comparer A & B
              </button>
            </div>
          )}
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
        {/* Ligne 3 : Plan ▾ dropdown compact */}
        <div style={{ position:'relative' }}>
          {showPlanDd && <div onClick={()=>setShowPlanDd(false)} style={{ position:'fixed',inset:0,zIndex:49 }}/>}
          <button onClick={()=>setShowPlanDd(x=>!x)}
            style={{ width:'100%',padding:'10px 16px',borderRadius:20,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontWeight:600 }}>
            <span>{compareMode ? 'Comparer A & B' : `Plan ${activePlan} — ${activePlan==='A'?'Optimal':'Minimal'}`}</span>
            <span style={{ fontSize:10,color:'var(--text-dim)' }}>▾</span>
          </button>
          {showPlanDd && (
            <div style={{ position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:14,boxShadow:'0 8px 24px rgba(0,0,0,0.18)',zIndex:50,padding:6 }}>
              {(['A','B'] as PlanVariant[]).map(p=>(
                <button key={p} onClick={()=>{setActivePlan(p);setCompareMode(false);setShowPlanDd(false)}}
                  style={{ width:'100%',padding:'10px 16px',borderRadius:10,border:'none',
                    background:!compareMode&&activePlan===p?'rgba(0,200,224,0.10)':'transparent',
                    color:!compareMode&&activePlan===p?'#00c8e0':'var(--text-mid)',
                    fontSize:13,cursor:'pointer',textAlign:'left' as const,fontWeight:!compareMode&&activePlan===p?700:400 }}>
                  Plan {p} — {p==='A'?'Optimal':'Minimal'}
                </button>
              ))}
              <button onClick={()=>{setCompareMode(x=>!x);setShowPlanDd(false)}}
                style={{ width:'100%',padding:'10px 16px',borderRadius:10,border:'none',
                  background:compareMode?'rgba(255,179,64,0.10)':'transparent',
                  color:compareMode?'#ffb340':'var(--text-mid)',
                  fontSize:13,cursor:'pointer',textAlign:'left' as const,fontWeight:compareMode?700:400 }}>
                Comparer les deux plans
              </button>
            </div>
          )}
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
            <div key={s.id} onClick={()=>setDetailModal(s)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 13px',borderRadius:10,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',marginBottom:7,position:'relative' }}>
              <SportBadge sport={s.sport} size="sm"/>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0 }}>{s.title}</p>
                <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 0' }}>{s.time} · {formatHM(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
              </div>
              {s.status!=='done' && isSessionModified(s) && <span title="Modifié par toi" style={{ width:7,height:7,borderRadius:'50%',background:'#f97316',flexShrink:0 }} />}
              <span style={{ padding:'4px 10px',borderRadius:20,background:s.status==='done'?`${SPORT_BORDER[s.sport]}22`:'var(--bg-card2)',border:`1px solid ${s.status==='done'?SPORT_BORDER[s.sport]:'var(--border)'}`,color:s.status==='done'?SPORT_BORDER[s.sport]:'var(--text-dim)',fontSize:10,fontWeight:600 }}>{s.status==='done'?'FAIT':'À faire'}</span>
            </div>
          ))}
        </div>
      )}


      {/* View switch */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:5 }}>
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
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginTop:8 }}>
          {week.map((d,i)=>{ const cfg=INTENSITY_CONFIG[d.intensity]; return (
            <div key={d.day} data-day-index={i} onTouchEnd={()=>onTouchEnd(i)} style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:13,padding:13,boxShadow:'var(--shadow-card)' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:(d.sessions.length+d.activities.length)?8:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ textAlign:'center' as const,minWidth:32 }}>
                    <p style={{ fontSize:9,color:'var(--text-dim)',textTransform:'uppercase' as const,margin:0 }}>{d.day}</p>
                    <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0,color:i===todayIdx?'#00c8e0':'var(--text)' }}>{d.date}</p>
                  </div>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700,cursor:'pointer' }}>{cfg.label}</button>
                  <button onClick={()=>handleChangeIntensity(i)} style={{ width:20,height:20,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}>+</button>
                </div>
                <div style={{ display:'flex',gap:4 }}>
                  <button onClick={()=>{setAddModalFavorites(false);setAddModal({dayIndex:i,plan:activePlan})}} style={{ padding:'4px 9px',borderRadius:7,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',color:'#00c8e0',fontSize:11,cursor:'pointer',fontWeight:600 }}>+ Ajouter</button>
                  {planningFavorites.length>0&&<button onClick={()=>{setAddModalFavorites(true);setAddModal({dayIndex:i,plan:activePlan})}} style={{ padding:'4px 8px',borderRadius:7,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',color:'#00c8e0',fontSize:12,cursor:'pointer' }} title="Charger un favori">★</button>}
                </div>
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
                <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,i)} onTouchStart={e=>{e.stopPropagation();onTouchStart(s.id,i,e)}} onTouchMove={onTouchMove} onTouchEnd={onTouchEndPoint} onClick={()=>setDetailModal(s)}
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

function getTrainingTypeDescription(sport: SportType, type: string): string {
  const desc: Partial<Record<SportType, Record<string, string>>> = {
    run: {
      'EF':           'Endurance fondamentale — Zone 1-2, conversation possible, socle aérobie.',
      'SL1':          'Seuil 1 — Tempo confortable, Zone 3, lactate stable.',
      'SL2':          'Seuil 2 — Effort dur soutenu, Zone 4, lactate au seuil.',
      'VMA':          'Vitesse Maximale Aérobie — Intervalles courts à haute intensité, Zone 5.',
      'Strides':      'Accélérations progressives 20-30s, récup marche. Travail neuromusculaire.',
      'Heat Training':'Entraînement à la chaleur pour adaptation thermique et physiologique.',
    },
    bike: {
      'EF':           'Endurance fondamentale — Zone 1-2, socle aérobie, récupération active.',
      'SL1':          'Sweet Spot — 88-93% FTP, Zone 3-4, développement du seuil.',
      'SL2':          'Seuil — 95-105% FTP, Zone 4, haute puissance soutenue.',
      'PMA':          'Puissance Maximale Aérobie — Intervalles 3-8min à 110-130% FTP.',
      'Sprints':      'Sprints neuromusculaires — 10-30s à 150%+ FTP, récup complète.',
      'Heat Training':'Entraînement à la chaleur pour adaptation thermique.',
    },
    swim: {
      'EF':        'Endurance fondamentale — volumes longs, technique prioritaire.',
      'Technique': 'Drills technique — travail gestuel spécifique, coordination.',
      'Seuil':     'Effort au seuil — 400m-1km répétés à allure compétition.',
      'Sprints':   'Sprints courts — 25-50m à 100% d\'effort, récupération longue.',
    },
    hyrox: {
      'Simulation':   'Simulation course complète — enchaînement stations + runs 1km.',
      'Ergo':         'SkiErg ou Rowing seul — intervalles ou volume.',
      'Wall Ball':    'Travail spécifique Wall Ball — volume ou technique.',
      'BBJ':          'Burpee Broad Jump — technique et volume.',
      'Fentes':       'Fentes Sandbag — endurance musculaire spécifique.',
      'Sled Push':    'Sled Push — charge et vitesse de déplacement.',
      'Sled Pull':    'Sled Pull — force et endurance spécifique.',
      'Farmer Carry': 'Farmer Carry — grip, stabilité et endurance musculaire.',
    },
    gym: {
      'Strength':           'Force pure — charges lourdes, 3-5 reps, repos 3-5min.',
      'Strength endurance': 'Force-endurance — charges modérées, 8-15 reps, haute densité.',
      'Explosivité':        'Plyométrie — sauts, puissance neuromusculaire.',
    },
    rowing: {
      'EF':      'Endurance fondamentale — Zone 2, technique, volume.',
      'SL1':     'Seuil 1 — Tempo aérobie, Zone 3, lactate stable.',
      'SL2':     'Seuil 2 — Haute intensité soutenue, Zone 4.',
      'PMA':     'VO2max — Intervalles 2-4min à pleine puissance.',
      'Sprints': 'Sprints neuromusculaires, 15-30s, récup complète.',
    },
  }
  return desc[sport]?.[type] ?? type
}

function computeZoneDistribution(blocks: Block[], zoneCount: number): number[] {
  const dist = new Array(zoneCount).fill(0)
  for (const b of blocks) {
    const effMin = b.mode === 'interval' && b.reps && b.effortMin
      ? b.reps * b.effortMin : b.durationMin
    const recMin = b.mode === 'interval' && b.reps && b.recoveryMin
      ? b.reps * b.recoveryMin : 0
    const effZone = Math.max(0, Math.min(zoneCount - 1, b.zone - 1))
    const recZone = Math.max(0, Math.min(zoneCount - 1, (b.recoveryZone ?? 1) - 1))
    dist[effZone] += effMin
    if (recMin > 0) dist[recZone] += recMin
  }
  const total = dist.reduce((a, b) => a + b, 0)
  if (total === 0) return dist
  return dist.map(v => Math.round((v / total) * 100))
}

function computeHRDistribution(blocks: Block[], fcZones?: number[]): { label: string; pct: number; color: string }[] {
  const buckets = fcZones && fcZones.length >= 4
    ? [
        { label: `<${fcZones[0]}`, color: '#6b7280', min: 0, max: fcZones[0] },
        { label: `${fcZones[0]}-${fcZones[1]}`, color: '#4ade80', min: fcZones[0], max: fcZones[1] },
        { label: `${fcZones[1]}-${fcZones[2]}`, color: '#facc15', min: fcZones[1], max: fcZones[2] },
        { label: `${fcZones[2]}-${fcZones[3]}`, color: '#fb923c', min: fcZones[2], max: fcZones[3] },
        { label: `${fcZones[3]}+`, color: '#f87171', min: fcZones[3], max: 999 },
      ]
    : [
        { label: '<120', color: '#6b7280', min: 0, max: 120 },
        { label: '120-140', color: '#4ade80', min: 120, max: 140 },
        { label: '140-155', color: '#facc15', min: 140, max: 155 },
        { label: '155-170', color: '#fb923c', min: 155, max: 170 },
        { label: '170+', color: '#f87171', min: 170, max: 999 },
      ]
  const mins = new Array(buckets.length).fill(0)
  let hasData = false
  for (const b of blocks) {
    const hr = parseInt(b.hrAvg)
    if (!hr || hr <= 0) continue
    hasData = true
    const effMin = b.mode === 'interval' && b.reps && b.effortMin ? b.reps * b.effortMin : b.durationMin
    const idx = buckets.findIndex(bk => hr >= bk.min && hr < bk.max)
    if (idx >= 0) mins[idx] += effMin
  }
  if (!hasData) return []
  const total = mins.reduce((a, b) => a + b, 0)
  if (total === 0) return []
  return buckets.map((bk, i) => ({ label: bk.label, pct: Math.round((mins[i] / total) * 100), color: bk.color })).filter(e => e.pct > 0)
}

interface NutritionItem {
  id: string
  timeMin: number
  type: 'gel' | 'barre' | 'boisson' | 'solide' | 'autre'
  name: string
  quantity: string
  glucidesG: number
  proteinesG: number
  notes: string
}

const NUTRITION_TYPES: { id: NutritionItem['type']; label: string; defaultQty: string; defaultGlu: number }[] = [
  { id: 'gel', label: 'Gel', defaultQty: '1 gel', defaultGlu: 25 },
  { id: 'barre', label: 'Barre', defaultQty: '1 barre', defaultGlu: 30 },
  { id: 'boisson', label: 'Boisson', defaultQty: '500ml', defaultGlu: 30 },
  { id: 'solide', label: 'Solide', defaultQty: '1 portion', defaultGlu: 20 },
  { id: 'autre', label: 'Autre', defaultQty: '', defaultGlu: 0 },
]

// ── Parcours helpers ──────────────────────────────
interface ParcoursData {
  name: string
  distance: number | null
  elevation: number | null
  points: number
  elevationProfile: Array<{ distKm: number; ele: number }>
  gpsTrace?: Array<{ lat: number; lon: number }>
  avgSpeed?: number | null
}

function buildGpsTrace(pts: Array<{ lat: number; lon: number; ele: number }>): Array<{ lat: number; lon: number }> {
  const trace: Array<{ lat: number; lon: number }> = []
  for (const pt of pts) {
    if (trace.length === 0) {
      trace.push({ lat: pt.lat, lon: pt.lon })
    } else {
      const prev = trace[trace.length - 1]
      const R = 6371000
      const dLat = (pt.lat - prev.lat) * Math.PI / 180
      const dLon = (pt.lon - prev.lon) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(pt.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (d >= 100) trace.push({ lat: pt.lat, lon: pt.lon })
    }
  }
  // Always include last point
  if (pts.length > 0) {
    const last = pts[pts.length - 1]
    const t = trace[trace.length - 1]
    if (!t || t.lat !== last.lat || t.lon !== last.lon) trace.push({ lat: last.lat, lon: last.lon })
  }
  return trace
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildElevationProfile(
  pts: Array<{ lat: number; lon: number; ele: number }>,
): { distKm: number; elevM: number; profile: Array<{ distKm: number; ele: number }> } {
  const profile: Array<{ distKm: number; ele: number }> = []
  let cumDist = 0
  let elevM = 0

  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const d = haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon)
      cumDist += d
      const diff = pts[i].ele - pts[i - 1].ele
      if (diff > 0) elevM += diff
    }
    const distKm = Math.round(cumDist / 100) / 10
    const lastKm = profile.length > 0 ? profile[profile.length - 1].distKm : -1
    if (distKm - lastKm >= 0.2 || i === 0) {
      profile.push({ distKm, ele: Math.round(pts[i].ele) })
    }
  }
  // Ensure last point is included
  if (pts.length > 0) {
    const finalKm = Math.round(cumDist / 100) / 10
    const lastKm = profile.length > 0 ? profile[profile.length - 1].distKm : 0
    if (finalKm > lastKm) {
      profile.push({ distKm: finalKm, ele: Math.round(pts[pts.length - 1].ele) })
    }
  }
  return { distKm: Math.round(cumDist / 100) / 10, elevM: Math.round(elevM), profile }
}

function parseRouteFile(file: File): Promise<ParcoursData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parser = new DOMParser()
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        let pts: Array<{ lat: number; lon: number; ele: number }> = []
        let name = file.name.replace(/\.[^.]+$/, '')

        if (ext === 'gpx') {
          const doc = parser.parseFromString(text, 'application/xml')
          const nameEl = doc.querySelector('name')
          if (nameEl?.textContent) name = nameEl.textContent.trim()
          const trkpts = Array.from(doc.querySelectorAll('trkpt'))
          const src = trkpts.length > 0 ? trkpts : Array.from(doc.querySelectorAll('wpt, rtept'))
          pts = src.map(pt => ({
            lat: parseFloat(pt.getAttribute('lat') ?? '0'),
            lon: parseFloat(pt.getAttribute('lon') ?? '0'),
            ele: parseFloat(pt.querySelector('ele')?.textContent ?? '0'),
          }))
        } else if (ext === 'tcx') {
          const doc = parser.parseFromString(text, 'application/xml')
          const actName = doc.querySelector('Id')
          if (actName?.textContent) name = actName.textContent.trim()
          pts = Array.from(doc.querySelectorAll('Trackpoint')).map(tp => ({
            lat: parseFloat(tp.querySelector('LatitudeDegrees')?.textContent ?? '0'),
            lon: parseFloat(tp.querySelector('LongitudeDegrees')?.textContent ?? '0'),
            ele: parseFloat(tp.querySelector('AltitudeMeters')?.textContent ?? '0'),
          })).filter(p => p.lat !== 0 || p.lon !== 0)
        } else if (ext === 'kml') {
          const doc = parser.parseFromString(text, 'application/xml')
          const nameEl = doc.querySelector('name')
          if (nameEl?.textContent) name = nameEl.textContent.trim()
          const coords = doc.querySelector('coordinates')?.textContent?.trim() ?? ''
          pts = coords.split(/\s+/).filter(Boolean).map(c => {
            const [lon, lat, ele] = c.split(',').map(Number)
            return { lat: lat ?? 0, lon: lon ?? 0, ele: ele ?? 0 }
          })
        } else {
          reject(new Error('Format non supporté')); return
        }

        if (pts.length === 0) { reject(new Error('Aucun point GPS trouvé')); return }

        const { distKm, elevM, profile } = buildElevationProfile(pts)
        const gpsTrace = buildGpsTrace(pts)
        resolve({
          name,
          distance: distKm > 0 ? distKm : null,
          elevation: elevM > 0 ? elevM : null,
          points: pts.length,
          elevationProfile: profile,
          gpsTrace,
          avgSpeed: null,
        })
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('Lecture fichier échouée'))
    reader.readAsText(file)
  })
}

// ── Terrain analysis ──────────────────────────────
interface TerrainSegment {
  startKm: number
  endKm: number
  startEle: number
  endEle: number
  distanceKm: number
  avgGradient: number
  type: 'climb' | 'descent' | 'flat'
  estimatedMinutes: number
}

function estimateTimeOnSegment(distKm: number, gradientPct: number, watts: number, riderKg: number, bikeKg: number): number {
  const totalMass = riderKg + bikeKg
  const gradient  = gradientPct / 100
  const Crr       = 0.004
  const g         = 9.81
  const rho       = 1.225  // air density kg/m³
  const CdA       = 0.36   // road cyclist in hoods (m²)

  // Solve P = [m·g·(grad+Crr) + ½·ρ·CdA·v²]·v  for v (Newton-Raphson)
  // f(v) = m·g·(grad+Crr)·v + ½·ρ·CdA·v³ − P = 0
  const Fm = totalMass * g * (gradient + Crr)
  let v = 5  // initial guess ~18 km/h

  for (let iter = 0; iter < 50; iter++) {
    const fv  = Fm * v + 0.5 * rho * CdA * v * v * v - watts
    const dfv = Fm + 1.5 * rho * CdA * v * v
    if (Math.abs(dfv) < 1e-10) break
    const delta = fv / dfv
    v = Math.max(0.28, v - delta)
    if (Math.abs(delta) < 0.001) break
  }

  // Clamp to physically plausible range: ~1 km/h to 80 km/h
  v = Math.max(0.28, Math.min(22, v))
  return (distKm * 1000 / v) / 60
}

function analyzeTerrainSegments(
  profile: Array<{ distKm: number; ele: number }>,
  ftp: number,
  riderWeight: number,
  bikeWeight: number,
): TerrainSegment[] {
  if (profile.length < 2) return []
  type TType = 'climb' | 'descent' | 'flat'
  function getType(g: number): TType { return g > 2 ? 'climb' : g < -2 ? 'descent' : 'flat' }

  const gradients: Array<{ distKm: number; gradient: number }> = []
  for (let i = 1; i < profile.length; i++) {
    const dDist = (profile[i].distKm - profile[i - 1].distKm) * 1000
    if (dDist <= 0) continue
    gradients.push({ distKm: profile[i].distKm, gradient: ((profile[i].ele - profile[i - 1].ele) / dDist) * 100 })
  }
  if (gradients.length === 0) return []

  const segments: TerrainSegment[] = []
  let currentType = getType(gradients[0].gradient)
  let segStartIdx = 0
  const watts = ftp * 0.85

  const pushSeg = (fromIdx: number, toIdx: number, type: TType) => {
    const startKm = fromIdx === 0 ? profile[0].distKm : gradients[fromIdx].distKm
    const endKm   = gradients[Math.min(toIdx, gradients.length - 1)].distKm
    if (endKm - startKm < 0.3) return
    const startEle = profile.find(p => p.distKm >= startKm)?.ele ?? 0
    const endEle   = profile.find(p => p.distKm >= endKm)?.ele   ?? startEle
    const distKm   = endKm - startKm
    const avgGrad  = distKm > 0 ? ((endEle - startEle) / (distKm * 1000)) * 100 : 0
    segments.push({
      startKm:         Math.round(startKm * 10) / 10,
      endKm:           Math.round(endKm   * 10) / 10,
      startEle:        Math.round(startEle),
      endEle:          Math.round(endEle),
      distanceKm:      Math.round(distKm  * 10) / 10,
      avgGradient:     Math.round(avgGrad * 10) / 10,
      type,
      estimatedMinutes: Math.round(estimateTimeOnSegment(distKm, avgGrad, watts, riderWeight, bikeWeight) * 10) / 10,
    })
  }

  for (let i = 1; i < gradients.length; i++) {
    const thisType = getType(gradients[i].gradient)
    if (thisType !== currentType) {
      pushSeg(segStartIdx, i - 1, currentType)
      currentType = thisType
      segStartIdx = i
    }
  }
  pushSeg(segStartIdx, gradients.length - 1, currentType)
  return segments
}

// ── ElevationChart ────────────────────────────────
type TerrainBlockOverlay = { label: string; startKm: number; endKm: number; zone: number; value: string; blockIdx: number }

function ElevationChart({ profile, totalKm, accent, onHover, terrainBlocks, onBlockEdgeDrag }: {
  profile: Array<{ distKm: number; ele: number }>
  totalKm: number
  accent: string
  onHover?: (distKm: number | null) => void
  terrainBlocks?: TerrainBlockOverlay[]
  onBlockEdgeDrag?: (blockIdx: number, edge: 'start' | 'end', newKm: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<{ x: number; distKm: number; ele: number; slope: number } | null>(null)
  const [dragging, setDragging] = useState<{ blockIdx: number; edge: 'start' | 'end' } | null>(null)

  if (profile.length < 2) return null

  const minEle = Math.min(...profile.map(p => p.ele))
  const maxEle = Math.max(...profile.map(p => p.ele))
  const eleRange = maxEle - minEle || 1

  const W = 800, H = 200
  const PL = 44, PR = 12, PT = 14, PB = 28
  const pW = W - PL - PR, pH = H - PT - PB

  const svgPoints = profile.map(p => ({
    x: PL + (p.distKm / totalKm) * pW,
    y: PT + pH - ((p.ele - minEle) / eleRange) * pH,
    distKm: p.distKm, ele: p.ele,
  }))
  const pathD = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fillD = `${pathD} L${svgPoints[svgPoints.length - 1].x.toFixed(1)},${PT + pH} L${PL},${PT + pH} Z`

  const yStep = eleRange > 500 ? 200 : eleRange > 200 ? 100 : 50
  const yTicks: number[] = []
  for (let e = Math.ceil(minEle / yStep) * yStep; e <= maxEle; e += yStep) yTicks.push(e)
  const xStep = totalKm > 150 ? 20 : totalKm > 80 ? 10 : totalKm > 30 ? 5 : totalKm > 10 ? 2 : 1
  const xTicks: number[] = []
  for (let km = 0; km <= totalKm; km += xStep) xTicks.push(Math.round(km * 10) / 10)

  function getSlopeAt(distKm: number): number {
    const idx = profile.findIndex(p => p.distKm >= distKm)
    if (idx <= 0) return 0
    const p1 = profile[idx - 1], p2 = profile[idx]
    const dDist = (p2.distKm - p1.distKm) * 1000
    if (dDist === 0) return 0
    return Math.round(((p2.ele - p1.ele) / dDist) * 1000) / 10
  }

  function svgXToKm(clientX: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const svgX = ((clientX - rect.left) / rect.width) * W
    return Math.max(0, Math.min(totalKm, ((svgX - PL) / pW) * totalKm))
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging && onBlockEdgeDrag) {
      const km = Math.round(svgXToKm(e.clientX) * 10) / 10
      onBlockEdgeDrag(dragging.blockIdx, dragging.edge, km)
      return
    }
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const distKm = Math.max(0, Math.min(totalKm, ((svgX - PL) / pW) * totalKm))
    let closest = profile[0]; let closestD = Infinity
    for (const p of profile) { const d = Math.abs(p.distKm - distKm); if (d < closestD) { closestD = d; closest = p } }
    const x = PL + (closest.distKm / totalKm) * pW
    setCursor({ x, distKm: closest.distKm, ele: closest.ele, slope: getSlopeAt(closest.distKm) })
    if (onHover) onHover(closest.distKm)
  }

  function handleMouseUp() { setDragging(null) }
  function handleMouseLeave() {
    if (!dragging) { setCursor(null); if (onHover) onHover(null) }
  }

  // Zone colors: Z1→Z5
  const ZONE_C = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

  const cursorCy = cursor ? PT + pH - ((cursor.ele - minEle) / eleRange) * pH : 0
  const slopeColor = cursor
    ? cursor.slope > 5 ? '#ef4444' : cursor.slope > 2 ? '#f97316' : cursor.slope < -2 ? '#3b82f6' : 'var(--text)'
    : 'var(--text)'

  return (
    <div style={{ position: 'relative', userSelect: dragging ? 'none' : 'auto' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', cursor: dragging ? 'ew-resize' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
      >
        {/* Y grid */}
        {yTicks.map(ele => {
          const y = PT + pH - ((ele - minEle) / eleRange) * pH
          return (
            <g key={`y${ele}`}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />
              <text x={PL - 5} y={y + 3} textAnchor="end" fontSize={7} fill="var(--text-dim)" fontFamily='"DM Mono",monospace'>{ele}m</text>
            </g>
          )
        })}
        {/* X grid */}
        {xTicks.map(km => {
          const x = PL + (km / totalKm) * pW
          return (
            <g key={`x${km}`}>
              <line x1={x} y1={PT} x2={x} y2={PT + pH} stroke="var(--border)" strokeWidth={0.5} opacity={0.2} />
              <text x={x} y={H - 6} textAnchor="middle" fontSize={7} fill="var(--text-dim)" fontFamily='"DM Mono",monospace'>{km}km</text>
            </g>
          )
        })}
        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + pH} stroke="var(--border)" strokeWidth={0.6} />
        <line x1={PL} y1={PT + pH} x2={W - PR} y2={PT + pH} stroke="var(--border)" strokeWidth={0.6} />
        {/* Fill */}
        <path d={fillD} fill={accent} opacity={0.05} />
        {/* Profile line */}
        <path d={pathD} fill="none" stroke={accent} strokeWidth={1} opacity={0.65} strokeLinejoin="round" />
        {/* Terrain block overlays — OVER the profile line, under cursor */}
        {terrainBlocks && terrainBlocks.map((block, i) => {
          if (block.startKm == null || block.endKm == null) return null
          const x1 = PL + (block.startKm / totalKm) * pW
          const x2 = PL + (block.endKm   / totalKm) * pW
          const zc  = ZONE_C[Math.min(Math.max(block.zone - 1, 0), 4)]
          const w   = Math.max(x2 - x1, 3)
          return (
            <g key={`tb${i}`}>
              <rect x={x1} y={PT} width={w} height={pH} fill={zc} opacity={0.22} rx={2} />
              {/* Label above chart area */}
              {w > 18 && (
                <text x={(x1 + x2) / 2} y={PT - 2} textAnchor="middle" fontSize={7} fill={zc} fontWeight={700} fontFamily='"DM Mono",monospace'>
                  {block.value ? `${block.value}W` : `Z${block.zone}`}
                </text>
              )}
              {/* Left edge — draggable */}
              <line x1={x1} y1={PT} x2={x1} y2={PT + pH} stroke={zc} strokeWidth={3} opacity={0.85}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={e => { e.stopPropagation(); setDragging({ blockIdx: block.blockIdx, edge: 'start' }) }}
              />
              {/* Right edge — draggable */}
              <line x1={x2} y1={PT} x2={x2} y2={PT + pH} stroke={zc} strokeWidth={3} opacity={0.85}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={e => { e.stopPropagation(); setDragging({ blockIdx: block.blockIdx, edge: 'end' }) }}
              />
            </g>
          )
        })}
        {/* min/max labels */}
        <text x={PL + 6} y={PT + pH - 6} fontSize={8} fill="var(--text-dim)" fontFamily='"DM Mono",monospace'>{Math.round(minEle)}m</text>
        <text x={W - PR - 6} y={PT + 10} textAnchor="end" fontSize={8} fill={accent} fontWeight={600} fontFamily='"DM Mono",monospace'>{Math.round(maxEle)}m</text>
        {/* Cursor */}
        {cursor && !dragging && (
          <g>
            <line x1={cursor.x} y1={PT} x2={cursor.x} y2={PT + pH} stroke={accent} strokeWidth={0.6} strokeDasharray="3 2" opacity={0.5} />
            <circle cx={cursor.x} cy={cursorCy} r={3} fill={accent} stroke="#fff" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {/* Tooltip sous le SVG */}
      {cursor && !dragging && (
        <div style={{
          display: 'flex', gap: 16, padding: '7px 12px',
          borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)',
          marginTop: 5, fontSize: 11, justifyContent: 'center', flexWrap: 'wrap' as const,
        }}>
          <span style={{ color: 'var(--text-dim)' }}>km <strong style={{ color: 'var(--text)', fontFamily: '"DM Mono",monospace' }}>{cursor.distKm.toFixed(1)}</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>altitude <strong style={{ color: accent, fontFamily: '"DM Mono",monospace' }}>{cursor.ele}m</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>pente <strong style={{ color: slopeColor, fontFamily: '"DM Mono",monospace' }}>{cursor.slope > 0 ? '+' : ''}{cursor.slope}%</strong></span>
        </div>
      )}
    </div>
  )
}

// ── Carte GPS Leaflet (client-side only) ─────────
function GPSMapInner({ trace, accent, hoveredKm, elevationProfile }: {
  trace: Array<{ lat: number; lon: number }>
  accent: string
  hoveredKm: number | null
  elevationProfile: Array<{ distKm: number; ele: number }>
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const cursorMarkerRef = useRef<unknown>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)

  // Init map once
  useEffect(() => {
    if (!mapRef.current || trace.length < 2) return
    const container = mapRef.current
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return

    import('leaflet').then(L => {
      leafletRef.current = L
      delete (L.Icon.Default.prototype as unknown as Record<string,unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      const map = L.map(container, { zoomControl: true, scrollWheelZoom: true, attributionControl: false })
      mapInstanceRef.current = map

      // Layers
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
      const hybridLayer = L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
      ])
      osmLayer.addTo(map)
      L.control.layers({ 'Standard': osmLayer, 'Satellite': satLayer, 'Hybride': hybridLayer }, {}, { position: 'topright', collapsed: false }).addTo(map)

      // Trace
      const latlngs = trace.map(p => [p.lat, p.lon] as [number, number])
      const poly = L.polyline(latlngs, { color: accent, weight: 3, opacity: 0.85, smoothFactor: 1.5 }).addTo(map)
      const dot = (color: string) => L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
        iconSize: [10, 10], iconAnchor: [5, 5], className: '',
      })
      L.marker(latlngs[0], { icon: dot('#22c55e') }).addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: dot('#ef4444') }).addTo(map)
      map.fitBounds(poly.getBounds(), { padding: [18, 18] })

      // Cursor marker (hidden initially)
      const cursorIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.5)"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], className: '',
      })
      const cursorMarker = L.marker(latlngs[0], { icon: cursorIcon, opacity: 0, zIndexOffset: 1000 }).addTo(map)
      cursorMarkerRef.current = cursorMarker
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync cursor marker with hoveredKm
  useEffect(() => {
    const marker = cursorMarkerRef.current as { setLatLng: (ll: [number,number]) => void; setOpacity: (o: number) => void } | null
    const L = leafletRef.current
    if (!marker || !L) return
    if (hoveredKm === null || elevationProfile.length === 0 || trace.length < 2) {
      marker.setOpacity(0)
      return
    }
    const totalKm = elevationProfile[elevationProfile.length - 1].distKm
    const ratio = totalKm > 0 ? hoveredKm / totalKm : 0
    const traceIdx = Math.min(Math.max(0, Math.round(ratio * (trace.length - 1))), trace.length - 1)
    const pt = trace[traceIdx]
    if (!pt) return
    marker.setLatLng([pt.lat, pt.lon])
    marker.setOpacity(1)
  }, [hoveredKm, elevationProfile, trace])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
      <div ref={mapRef} style={{ width: '100%', height: 400, borderRadius: 10, overflow: 'hidden', zIndex: 0 }}/>
    </>
  )
}

function GPSMapWrapper({ trace, accent, hoveredKm, elevationProfile }: {
  trace: Array<{ lat: number; lon: number }>
  accent: string
  hoveredKm: number | null
  elevationProfile: Array<{ distKm: number; ele: number }>
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div style={{ width: '100%', height: 400, borderRadius: 10, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 11 }}>
      Chargement de la carte…
    </div>
  )
  return <GPSMapInner trace={trace} accent={accent} hoveredKm={hoveredKm} elevationProfile={elevationProfile}/>
}

// ── Session averages estimation ───────────────────
function computeSessionAverages(blocks: Block[], sport: SportType): {
  avgWatts: number | null; avgPace: string | null
} {
  if (blocks.length === 0) return { avgWatts: null, avgPace: null }

  if (sport === 'bike' || sport === 'elliptique') {
    let totalMin = 0, totalWattMin = 0
    for (const b of blocks) {
      const w = parseInt(b.value) || 0
      if (w <= 0) continue
      const min = b.mode === 'interval' && b.reps && b.effortMin
        ? b.reps * b.effortMin : b.durationMin
      totalMin += min; totalWattMin += min * w
    }
    if (totalMin === 0 || totalWattMin === 0) return { avgWatts: null, avgPace: null }
    return { avgWatts: Math.round(totalWattMin / totalMin), avgPace: null }
  }

  if (sport === 'run' || sport === 'swim' || sport === 'rowing') {
    let totalMin = 0, totalPaceSecMin = 0
    for (const b of blocks) {
      const m = (b.value ?? '').match(/(\d+):(\d+)/)
      if (!m) continue
      const paceSec = parseInt(m[1]) * 60 + parseInt(m[2])
      const min = b.mode === 'interval' && b.reps && b.effortMin
        ? b.reps * b.effortMin : b.durationMin
      totalMin += min; totalPaceSecMin += min * paceSec
    }
    if (totalMin === 0 || totalPaceSecMin === 0) return { avgWatts: null, avgPace: null }
    const avg = Math.round(totalPaceSecMin / totalMin)
    const str = `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')}`
    const unit = sport === 'swim' ? '/100m' : sport === 'rowing' ? '/500m' : '/km'
    return { avgWatts: null, avgPace: str + unit }
  }

  return { avgWatts: null, avgPace: null }
}

// ══════════════════════════════════════════════════════════════
// SESSION EXECUTE — Mode exécution muscu en direct
// ══════════════════════════════════════════════════════════════

interface ExecExercise {
  id: string
  label: string
  targetSets: number
  targetReps: number
  targetWeight: string
  restSec: number
  effortMin: number
  notes: string
  logSets: Array<{
    reps: number
    weight: string
    note: 'easy' | 'ok' | 'hard' | 'fail' | ''
    completedAt: number
  }>
}

interface SessionLog {
  startedAt: number
  endedAt: number | null
  totalSets: number
  totalReps: number
  totalTonnage: number
  totalRestSec: number
  exercises: ExecExercise[]
}

// ── V2 SessionExecute — Types internes ────────────────────────
interface ExecExo {
  id: string
  label: string
  targetSets: number
  targetReps: number
  targetWeight: string
  restSec: number
  logSets: Array<{ reps: number; weight: string; note: string; ts: number }>
}
interface ExecCircuit {
  label: string
  rounds: number
  type: CircuitType
  durationMin: number
  exos: ExecExo[]
}

function buildExecCircuits(blocks: Block[]): ExecCircuit[] {
  const result: ExecCircuit[] = []
  let current: ExecCircuit | null = null
  for (const b of blocks) {
    if (b.type === 'circuit_header') {
      const ct: CircuitType = (['series','circuit','superset','emom','tabata'].includes(b.mode) ? b.mode : 'series') as CircuitType
      current = {
        label: b.label || 'Circuit',
        rounds: ct === 'tabata' ? 8 : (b.zone || 1),
        type: ct,
        durationMin: b.durationMin || 0,
        exos: [],
      }
      result.push(current)
    } else {
      if (!current) {
        current = { label: 'Séance', rounds: 1, type: 'series', durationMin: 0, exos: [] }
        result.push(current)
      }
      current.exos.push({
        id: b.id,
        label: b.label,
        targetSets: b.zone ?? 3,
        targetReps: b.reps ?? 10,
        targetWeight: b.value || '',
        restSec: b.recoveryMin ? Math.round(b.recoveryMin * 60) : 90,
        logSets: [],
      })
    }
  }
  return result.filter(c => c.exos.length > 0)
}

// ── Ordre d'exécution selon le type de circuit ──
function getExecutionOrder(circ: ExecCircuit): Array<{ exoIdx: number; setIdx: number }> {
  const order: Array<{ exoIdx: number; setIdx: number }> = []
  const n = circ.exos.length
  if (n === 0) return order

  switch (circ.type) {
    case 'series':
      // Toutes les séries d'un exo, puis le suivant
      for (let e = 0; e < n; e++) {
        const sets = circ.exos[e].targetSets
        for (let s = 0; s < sets; s++) order.push({ exoIdx: e, setIdx: s })
      }
      break

    case 'circuit':
    case 'superset':
      // Enchaîner tous les exos, recommencer X rounds
      for (let r = 0; r < circ.rounds; r++) {
        for (let e = 0; e < n; e++) order.push({ exoIdx: e, setIdx: r })
      }
      break

    case 'emom': {
      // Alterner les exos chaque minute pendant durationMin minutes
      const totalMin = circ.durationMin > 0 ? circ.durationMin : 12
      for (let m = 0; m < totalMin; m++) {
        order.push({ exoIdx: m % n, setIdx: Math.floor(m / n) })
      }
      break
    }

    case 'tabata':
      // 8 rounds × alternance des exos
      for (let r = 0; r < 8; r++) {
        order.push({ exoIdx: r % n, setIdx: r })
      }
      break

    default:
      for (let e = 0; e < n; e++) {
        const sets = circ.exos[e].targetSets
        for (let s = 0; s < sets; s++) order.push({ exoIdx: e, setIdx: s })
      }
  }
  return order
}

type ExecStep = { circuitIdx: number; exoIdx: number; setIdx: number }

const MOTIVATIONAL_MSGS = [
  'Allez, tu gères ! 💪', 'En feu 🔥', 'Continue comme ça !',
  'Tu es au sommet !', 'Reste focus.', 'Chaque série compte.',
  'Mental fort !', 'Champion. 🏆', 'C\'est parti !', 'Bien joué !',
]

function SessionExecute({ blocks, sport, sessionTitle, onExit, onSaveLog, exoHistory }: {
  blocks: Block[]
  sport: SportType
  sessionTitle: string
  onExit: () => void
  onSaveLog?: (log: SessionLog) => void
  exoHistory?: Record<string, { weight: string; reps: number; date: string }>
}) {
  const accent = SPORT_BORDER[sport]
  const fmtTimer = (sec: number) => `${Math.floor(Math.max(0,sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`

  const initialCircuits = buildExecCircuits(blocks)

  // Construire la séquence complète d'exécution
  const initialSequence: ExecStep[] = []
  initialCircuits.forEach((c, ci) => {
    getExecutionOrder(c).forEach(o => initialSequence.push({ circuitIdx: ci, ...o }))
  })

  const [circuits, setCircuits] = useState<ExecCircuit[]>(initialCircuits)
  const [execSequence]          = useState<ExecStep[]>(initialSequence)
  const [execPos, setExecPos]   = useState(0)
  const [phase, setPhase]       = useState<'ready' | 'countdown' | 'work' | 'rest' | 'paused' | 'done'>('ready')
  const [countdownSec, setCountdownSec] = useState(5)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restTotal, setRestTotal] = useState(0)
  const [sessionStartTs, setSessionStartTs] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [pausedAt, setPausedAt] = useState(0)
  const [totalPausedSec, setTotalPausedSec] = useState(0)
  const [totalRestAccum, setTotalRestAccum] = useState(0)
  const [vibrateEnabled, setVibrateEnabled] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [motivMsg, setMotivMsg] = useState('')
  const [replaceSearch, setReplaceSearch] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [prevPhase, setPrevPhase] = useState<'work' | 'rest'>('work')
  const [editingSet, setEditingSet] = useState<{ reps: number; weight: string } | null>(null)

  const restTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cdTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // Dériver l'exo courant depuis execPos
  const currentStep    = execSequence[execPos] ?? null
  const currentCircuit = currentStep ? (circuits[currentStep.circuitIdx] ?? null) : null
  const currentExo     = currentStep && currentCircuit ? (currentCircuit.exos[currentStep.exoIdx] ?? null) : null
  const nextStep       = execSequence[execPos + 1] ?? null
  const nextCircuit    = nextStep ? (circuits[nextStep.circuitIdx] ?? null) : null
  const nextExo        = nextStep && nextCircuit ? (nextCircuit.exos[nextStep.exoIdx] ?? null) : null
  const currentSetNum  = (currentStep?.setIdx ?? 0) + 1

  // Totaux
  const totalSetsAll  = circuits.reduce((s,c) => s + c.exos.reduce((ss,e) => ss + e.logSets.length, 0), 0)
  const totalReps     = circuits.reduce((s,c) => s + c.exos.reduce((ss,e) => ss + e.logSets.reduce((sss,set) => sss + set.reps, 0), 0), 0)
  const totalTonnage  = circuits.reduce((s,c) => s + c.exos.reduce((ss,e) => ss + e.logSets.reduce((sss,set) => sss + (parseFloat(set.weight)||0)*set.reps, 0), 0), 0)
  const totalExosCount = circuits.reduce((s,c) => s + c.exos.length, 0)

  // Progression globale
  const progressPct = execSequence.length > 0 ? Math.min(1, execPos / execSequence.length) : 0

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'countdown') return
    cdTimerRef.current = setInterval(() => {
      setCountdownSec(s => {
        if (s <= 1) { clearInterval(cdTimerRef.current!); setPhase('work'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (cdTimerRef.current) clearInterval(cdTimerRef.current) }
  }, [phase])

  // ── Elapsed (hors pause) ──
  useEffect(() => {
    if (phase === 'ready' || phase === 'countdown' || phase === 'done' || phase === 'paused') return
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
      if (phase === 'rest') setTotalRestAccum(r => r + 1)
    }, 1000)
    return () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current) }
  }, [phase])

  // ── Rest timer ──
  useEffect(() => {
    if (phase !== 'rest' || restRemaining <= 0) return
    restTimerRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) {
          clearInterval(restTimerRef.current!)
          setPhase('work')
          if (vibrateEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current) }
  }, [phase, restRemaining, vibrateEnabled])

  function startSession() {
    setSessionStartTs(Date.now())
    setCountdownSec(5)
    setPhase('countdown')
  }

  function startRest(sec: number) {
    setRestTotal(sec)
    setRestRemaining(sec)
    setPhase('rest')
  }

  function pickMotiv() {
    setMotivMsg(MOTIVATIONAL_MSGS[Math.floor(Math.random() * MOTIVATIONAL_MSGS.length)])
  }

  function advanceToNextStep(pos: number) {
    if (pos + 1 >= execSequence.length) {
      setPhase('done'); setShowConfetti(true); pickMotiv(); return
    }
    const nextS = execSequence[pos + 1]
    const nextC = circuits[nextS.circuitIdx]
    const nextE = nextC?.exos[nextS.exoIdx]
    setExecPos(pos + 1)

    // Repos selon le type de circuit
    const cType = currentCircuit?.type ?? 'series'
    if (cType === 'tabata') {
      // Tabata : toujours 10s de repos
      startRest(10)
    } else if (cType === 'emom') {
      // EMOM : repos = temps restant dans la minute (simplifié : 15s)
      startRest(15)
    } else if (cType === 'circuit' || cType === 'superset') {
      // Circuit/superset : repos seulement quand on revient au premier exo (fin de round)
      const isEndOfRound = nextS.exoIdx === 0 && nextS.setIdx !== currentStep?.setIdx
      if (isEndOfRound) {
        startRest(nextE?.restSec ?? currentExo?.restSec ?? 90)
      } else {
        setPhase('work') // pas de repos entre exos du circuit
      }
    } else {
      // Séries : repos entre chaque série/exercice
      startRest(currentExo?.restSec ?? 90)
    }
  }

  function validateSet(note: string = 'ok', overrideReps?: number, overrideWeight?: string) {
    if (!currentCircuit || !currentExo || !currentStep) return
    const { circuitIdx: ci, exoIdx: ei } = currentStep
    const reps   = overrideReps   ?? editingSet?.reps   ?? currentExo.targetReps
    const weight = overrideWeight ?? editingSet?.weight ?? currentExo.targetWeight
    const updatedCircuits = circuits.map((c, cii) =>
      cii !== ci ? c : {
        ...c,
        exos: c.exos.map((e, eii) =>
          eii !== ei ? e : {
            ...e,
            logSets: [...e.logSets, { reps, weight, note, ts: Date.now() }]
          }
        )
      }
    )
    setCircuits(updatedCircuits)
    setEditingSet(null)
    pickMotiv()
    advanceToNextStep(execPos)
  }

  function updateExoField(field: 'targetReps' | 'targetWeight', value: number | string) {
    if (!currentStep) return
    const { circuitIdx: ci, exoIdx: ei } = currentStep
    setCircuits(prev => prev.map((c, cii) =>
      cii !== ci ? c : {
        ...c,
        exos: c.exos.map((e, eii) =>
          eii !== ei ? e : { ...e, [field]: value }
        )
      }
    ))
  }

  function adjustRest(delta: number) {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    setRestRemaining(r => Math.max(0, r + delta))
    setRestTotal(t => Math.max(0, t + delta))
  }

  function skipRest() {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    setRestRemaining(0)
    setPhase('work')
  }

  function skipExo() {
    if (execPos + 1 >= execSequence.length) {
      setPhase('done'); setShowConfetti(true); pickMotiv()
    } else {
      setExecPos(p => p + 1)
      setPhase('work')
    }
  }

  function togglePause() {
    if (phase === 'paused') {
      const dur = Math.round((Date.now() - pausedAt) / 1000)
      setTotalPausedSec(s => s + dur)
      setPhase(prevPhase)
    } else if (phase === 'work' || phase === 'rest') {
      setPrevPhase(phase)
      setPausedAt(Date.now())
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      setPhase('paused')
    }
  }

  function replaceExo(newLabel: string) {
    if (!currentStep) return
    const { circuitIdx: ci, exoIdx: ei } = currentStep
    setCircuits(prev => prev.map((c, cii) =>
      cii !== ci ? c : {
        ...c,
        exos: c.exos.map((e, eii) =>
          eii !== ei ? e : { ...e, label: newLabel, logSets: [] }
        )
      }
    ))
    setReplaceSearch(null); setSearchQuery('')
  }

  const NOTE_CONFIG = [
    { id: 'easy', label: 'Facile', color: '#22c55e' },
    { id: 'ok',   label: 'OK',    color: '#9ca3af' },
    { id: 'hard', label: 'Dur',   color: '#f97316' },
    { id: 'fail', label: 'Échec', color: '#ef4444' },
  ]

  // ── PHASE : READY ──
  if (phase === 'ready') {
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', color: 'var(--text)', overflowY: 'auto' as const }}>
        <div style={{ padding: '80px 24px 28px', maxWidth: 500, margin: '0 auto' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>Prêt à lancer</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px', fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{sessionTitle}</h1>
          {circuits.map((circ, ci) => (
            <div key={ci} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 6px' }}>
                {circ.label}
                {circ.type !== 'series' && circ.rounds > 1 ? ` · ${circ.rounds} tours` : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {circ.exos.map((exo, ei) => (
                  <div key={exo.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: '"DM Mono",monospace', width: 18, flexShrink: 0 }}>{ei + 1}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{exo.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontFamily: '"DM Mono",monospace' }}>
                        {circ.type === 'series'
                          ? `${exo.targetSets}×${exo.targetReps}${exo.targetWeight ? ` @${exo.targetWeight}kg` : ''}`
                          : `${exo.targetReps} reps${exo.targetWeight ? ` @${exo.targetWeight}kg` : ''}`
                        }
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: '"DM Mono",monospace' }}>{fmtTimer(exo.restSec)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-mid)', cursor: 'pointer' }}>
              <input type="checkbox" checked={vibrateEnabled} onChange={e => setVibrateEnabled(e.target.checked)} style={{ width: 14, height: 14, accentColor: accent }} />
              Vibration fin de repos
            </label>
          </div>
          <button onClick={startSession} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em' }}>
            ▶ Lancer la séance
          </button>
          <button onClick={onExit} style={{ width: '100%', padding: '12px', borderRadius: 10, marginTop: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
        </div>
      </div>
    )
  }

  // ── PHASE : COUNTDOWN ──
  if (phase === 'countdown') {
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 20px', fontWeight: 600 }}>Prépare-toi</p>
        <div style={{ fontSize: 100, fontWeight: 900, fontFamily: '"DM Mono",monospace', color: accent, lineHeight: 1, animation: 'pulse 1s ease-in-out infinite' }}>{countdownSec}</div>
        <p style={{ fontSize: 14, color: 'var(--text)', margin: '24px 0 0', fontWeight: 600 }}>{currentCircuit?.exos[0]?.label ?? sessionTitle}</p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 0' }}>
          {currentCircuit?.exos[0]?.targetSets}×{currentCircuit?.exos[0]?.targetReps}
          {currentCircuit?.exos[0]?.targetWeight ? ` @${currentCircuit?.exos[0]?.targetWeight}kg` : ''}
        </p>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.92)}}`}</style>
      </div>
    )
  }

  // ── PHASE : DONE ──
  if (phase === 'done') {
    const confettiColors = [accent, '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#eab308']
    const allExos = circuits.flatMap(c => c.exos)
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', color: 'var(--text)', overflowY: 'auto' as const }}>
        <style>{`
          @keyframes confetti-fall{
            0%{transform:translateY(-20px) rotate(0deg);opacity:1}
            100%{transform:translateY(110vh) rotate(720deg);opacity:0}
          }
          @keyframes trophy-bounce{
            0%,100%{transform:scale(1)}
            50%{transform:scale(1.15)}
          }
        `}</style>
        {showConfetti && (
          <div style={{ position: 'fixed' as const, inset: 0, pointerEvents: 'none' as const, overflow: 'hidden', zIndex: 1200 }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute' as const,
                left: `${(i * 3.1) % 100}%`,
                top: '-12px',
                width: 7 + (i % 4), height: 7 + (i % 4),
                borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? 2 : 0,
                background: confettiColors[i % confettiColors.length],
                animation: `confetti-fall ${1.4 + (i % 5) * 0.4}s ease-in ${(i % 6) * 0.15}s forwards`,
                opacity: 0,
              }} />
            ))}
          </div>
        )}
        <div style={{ padding: '80px 24px 32px', maxWidth: 500, margin: '0 auto', textAlign: 'center' as const }}>
          <div style={{ fontSize: 56, marginBottom: 8, display: 'inline-block', animation: 'trophy-bounce 1.2s ease-in-out 3' }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: '0 0 4px', color: 'var(--text)' }}>Séance terminée !</h2>
          {motivMsg && <p style={{ fontSize: 14, color: accent, fontWeight: 700, margin: '0 0 24px' }}>{motivMsg}</p>}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {([
              { label: 'Durée',     value: fmtTimer(elapsed) },
              { label: 'Séries',    value: String(totalSetsAll) },
              { label: 'Reps',      value: String(totalReps) },
              { label: 'Tonnage',   value: `${Math.round(totalTonnage)}kg` },
              { label: 'Repos',     value: fmtTimer(totalRestAccum) },
              { label: 'Exercices', value: String(totalExosCount) },
            ] as { label: string; value: string }[]).map(kpi => (
              <div key={kpi.label} style={{ padding: '10px 6px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 8, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', margin: '0 0 3px' }}>{kpi.label}</p>
                <p style={{ fontSize: 15, fontWeight: 800, fontFamily: '"DM Mono",monospace', color: accent, margin: 0 }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Détail exercices */}
          <div style={{ textAlign: 'left' as const, marginBottom: 20 }}>
            {circuits.map((circ, ci) => (
              <div key={ci} style={{ marginBottom: 14 }}>
                {circuits.length > 1 && (
                  <p style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px' }}>{circ.label}</p>
                )}
                {circ.exos.filter(e => e.logSets.length > 0).map(e => (
                  <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{e.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: '"DM Mono",monospace' }}>{e.logSets.length} séries</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                      {e.logSets.map((set, si) => (
                        <span key={si} style={{
                          fontSize: 10, fontFamily: '"DM Mono",monospace', padding: '3px 8px', borderRadius: 5,
                          background: set.note === 'fail' ? 'rgba(239,68,68,0.12)' : set.note === 'hard' ? 'rgba(249,115,22,0.12)' : 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: set.note === 'fail' ? '#ef4444' : set.note === 'hard' ? '#f97316' : 'var(--text-mid)',
                        }}>
                          {set.weight ? `${set.weight}×` : ''}{set.reps}{set.note && set.note !== 'ok' ? ` · ${set.note}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Sync montre */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 20, textAlign: 'left' as const }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>📡 Corréler avec votre montre</p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
              Vos données Strava, Garmin, Polar ou Suunto seront synchronisées automatiquement dans la page Activités après votre prochaine sync.
            </p>
          </div>

          <button onClick={() => {
            onSaveLog?.({
              startedAt: sessionStartTs, endedAt: Date.now(),
              totalSets: totalSetsAll, totalReps,
              totalTonnage: Math.round(totalTonnage), totalRestSec: totalRestAccum,
              exercises: allExos.map(e => ({
                ...e, effortMin: 0, notes: '',
                logSets: e.logSets.map(s => ({
                  reps: s.reps, weight: s.weight,
                  note: (['easy','ok','hard','fail',''].includes(s.note) ? s.note : 'ok') as ExecExercise['logSets'][0]['note'],
                  completedAt: s.ts,
                })),
              })),
            })
            onExit()
          }} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
            ✓ Terminer et sauvegarder
          </button>
          <button onClick={onExit} style={{ width: '100%', padding: '11px', borderRadius: 10, marginTop: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Fermer sans sauvegarder</button>
        </div>
      </div>
    )
  }

  // ── PHASE : WORK / REST / PAUSED ──
  const circumference = 2 * Math.PI * 72
  const progressArc = restTotal > 0 ? ((1 - restRemaining / restTotal) * circumference) : 0

  // Editing values (fallback to target)
  const editReps   = editingSet?.reps   ?? currentExo?.targetReps   ?? 0
  const editWeight = editingSet?.weight ?? currentExo?.targetWeight ?? ''

  const ct     = currentCircuit?.type ?? 'series'
  const ctInfo = CIRCUIT_TYPES.find(c => c.id === ct)

  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>

      {/* ── Sticky header — paddingTop 64px pour dégager la navbar mobile ── */}
      <div style={{ flexShrink: 0, padding: '64px 24px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const }}>
        {/* Row 1 : circuit info + chrono + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
              {ctInfo?.icon} {ctInfo?.label ?? 'Séries'}
              {currentCircuit ? ` · ${currentCircuit.label}` : ''}
              {currentStep && currentCircuit && currentCircuit.type !== 'series' && currentCircuit.rounds > 1
                ? ` · Tour ${currentStep.setIdx + 1}/${currentCircuit.rounds}`
                : ''}
            </p>
          </div>
          <span style={{ fontSize: 16, fontFamily: '"DM Mono",monospace', color: 'var(--text-mid)', fontWeight: 700, margin: '0 12px', flexShrink: 0 }}>{fmtTimer(elapsed)}</span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setVibrateEnabled(v => !v)} title={vibrateEnabled ? 'Vibration ON' : 'Vibration OFF'} style={{ background: 'none', border: '1px solid var(--border)', color: vibrateEnabled ? accent : 'var(--text-dim)', fontSize: 14, cursor: 'pointer', padding: '5px 8px', borderRadius: 8, lineHeight: 1 }}>
              {vibrateEnabled ? '📳' : '🔕'}
            </button>
            <button onClick={togglePause} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', padding: '5px 11px', borderRadius: 8 }}>{phase === 'paused' ? '▶' : '⏸'}</button>
            <button onClick={onExit} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: '5px 9px', borderRadius: 8 }}>✕</button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 99, background: 'var(--border)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct * 100}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 24px 36px', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const }}>

        {/* ── PAUSE ── */}
        {phase === 'paused' && (
          <div style={{ textAlign: 'center' as const, padding: '60px 0 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏸</div>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne, sans-serif', margin: '0 0 8px' }}>En pause</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 32px' }}>{fmtTimer(elapsed)} écoulées</p>
            <button onClick={togglePause} style={{ padding: '15px 48px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>▶ Reprendre</button>
            <br />
            <button onClick={() => { setPhase('done'); setShowConfetti(true); pickMotiv() }} style={{ padding: '11px 28px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
              Terminer la séance
            </button>
          </div>
        )}

        {currentExo && phase !== 'paused' && (
          <>
            {/* ── Phase badge + Nom exo ── */}
            <div style={{ textAlign: 'center' as const, marginBottom: 20, paddingTop: 8 }}>
              <p style={{
                display: 'inline-block', fontSize: 9, fontWeight: 700,
                color: phase === 'rest' ? '#f97316' : accent,
                textTransform: 'uppercase' as const, letterSpacing: '0.14em',
                margin: '0 0 12px',
                padding: '4px 12px', borderRadius: 99,
                background: phase === 'rest' ? 'rgba(249,115,22,0.10)' : `${accent}15`,
                border: `1px solid ${phase === 'rest' ? 'rgba(249,115,22,0.22)' : `${accent}28`}`,
              }}>
                {phase === 'rest' ? '⏱ Repos' : ct === 'emom' ? `⏱ MIN ${currentSetNum}/${currentCircuit?.durationMin ?? 12}` : ct === 'tabata' ? `⚡ ROUND ${currentSetNum}/8` : `SÉRIE ${currentSetNum}/${currentExo.targetSets}`}
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', margin: '0 0 16px', color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{currentExo.label}</h2>
              {motivMsg && phase === 'work' && (
                <p style={{ fontSize: 11, color: accent, fontStyle: 'italic' as const, margin: '-8px 0 10px', opacity: 0.75 }}>{motivMsg}</p>
              )}
              {phase === 'work' && exoHistory && (() => {
                const key = (currentExo.label ?? '').toLowerCase().trim()
                const hist = exoHistory[key]
                if (!hist) return null
                const dateStr = hist.date ? new Date(hist.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
                return (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '-6px 0 10px', fontStyle: 'italic' as const }}>
                    Dernière : {hist.weight}kg × {hist.reps}{dateStr ? ` (${dateStr})` : ''}
                  </p>
                )
              })()}
            </div>

            {/* ── Pastilles séries ── */}
            {phase === 'work' && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' as const }}>
                {Array.from({ length: currentExo.targetSets }).map((_, i) => {
                  const done   = i < currentSetNum - 1
                  const active = i === currentSetNum - 1
                  const set    = currentExo.logSets[i]
                  const nc     = set?.note === 'fail' ? '#ef4444' : set?.note === 'hard' ? '#f97316' : set?.note === 'easy' ? '#22c55e' : undefined
                  return (
                    <div key={i} style={{
                      minWidth: 46, height: 50, borderRadius: 11, padding: '0 7px',
                      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                      background: done ? (nc ?? accent) : active ? `${accent}20` : 'var(--bg-card)',
                      border: `1.5px solid ${done ? (nc ?? accent) : active ? accent : 'var(--border)'}`,
                      color: done ? '#fff' : active ? accent : 'var(--text-dim)',
                      transition: 'all 0.25s',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, fontFamily: '"DM Mono",monospace', lineHeight: 1 }}>{i + 1}</span>
                      {done && set && <span style={{ fontSize: 8, opacity: 0.85, marginTop: 2, fontFamily: '"DM Mono",monospace' }}>{set.weight || '—'}×{set.reps}</span>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── REST — grand timer circulaire ── */}
            {phase === 'rest' && (
              <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
                <div style={{ position: 'relative' as const, width: 180, height: 180, margin: '0 auto 18px' }}>
                  <svg width={180} height={180} viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={90} cy={90} r={72} fill="none" stroke="var(--border)" strokeWidth={10} />
                    <circle cx={90} cy={90} r={72} fill="none" stroke={accent} strokeWidth={10}
                      strokeLinecap="round"
                      strokeDasharray={`${progressArc} ${circumference}`}
                      style={{ transition: 'stroke-dasharray 0.9s linear' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 44, fontWeight: 900, fontFamily: '"DM Mono",monospace', color: accent, lineHeight: 1 }}>{fmtTimer(restRemaining)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 5, letterSpacing: '0.08em' }}>restant</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' as const }}>
                  {[-30, -10, +10, +30].map(d => (
                    <button key={d} onClick={() => adjustRest(d)} style={{
                      padding: '9px 16px', borderRadius: 9, border: '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12, cursor: 'pointer', fontFamily: '"DM Mono",monospace', fontWeight: 600,
                    }}>{d > 0 ? '+' : ''}{d}s</button>
                  ))}
                </div>
                {/* Aperçu prochain exo */}
                {nextExo && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'left' as const, marginBottom: 14 }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>
                      Prochain{nextCircuit && nextCircuit !== currentCircuit ? ` · ${nextCircuit.label}` : ''}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      {nextExo.label}
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontFamily: '"DM Mono",monospace' }}>
                        {nextExo.targetReps} reps{nextExo.targetWeight ? ` @${nextExo.targetWeight}kg` : ''}
                      </span>
                    </p>
                  </div>
                )}
                <button onClick={skipRest} style={{ padding: '10px 26px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Passer le repos →
                </button>
              </div>
            )}

            {/* ── WORK — saisie + validation ── */}
            {phase === 'work' && (
              <div style={{ marginBottom: 16 }}>
                {/* Charge en grand + Reps */}
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 12 }}>
                  {/* Charge */}
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 7px', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>Charge kg</p>
                    <input
                      value={editWeight}
                      placeholder="—"
                      onChange={e => setEditingSet({ reps: editReps, weight: e.target.value })}
                      style={{
                        width: 100, padding: '12px 10px', borderRadius: 12,
                        border: `2px solid ${accent}55`,
                        background: 'var(--bg-card)', color: accent,
                        fontSize: 36, fontFamily: '"DM Mono",monospace',
                        textAlign: 'center' as const, fontWeight: 900, outline: 'none',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 28, color: 'var(--border)', fontWeight: 300, marginBottom: 10, lineHeight: 1 }}>×</span>
                  {/* Reps */}
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 7px', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>Reps</p>
                    <input
                      type="number" min={0} max={999}
                      value={editReps}
                      onChange={e => setEditingSet({ reps: parseInt(e.target.value) || 0, weight: editWeight })}
                      style={{
                        width: 80, padding: '12px 8px', borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text)',
                        fontSize: 32, fontFamily: '"DM Mono",monospace',
                        textAlign: 'center' as const, fontWeight: 800, outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Notes rapides */}
                <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' as const }}>
                  {NOTE_CONFIG.map(note => (
                    <button key={note.id} onClick={() => validateSet(note.id)} style={{
                      padding: '10px 18px', borderRadius: 10,
                      border: `1px solid ${note.color}33`,
                      background: `${note.color}0e`,
                      color: note.color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      letterSpacing: '0.01em',
                    }}>{note.label}</button>
                  ))}
                </div>

                {/* Bouton principal */}
                <button onClick={() => validateSet('ok')} style={{
                  width: '100%', padding: '19px', borderRadius: 14, border: 'none',
                  background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff',
                  fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  letterSpacing: '0.01em', boxShadow: `0 4px 24px ${accent}30`,
                }}>
                  {ct === 'emom' ? `⏱ Valider min ${currentSetNum}` :
                   ct === 'tabata' ? `⚡ Valider round ${currentSetNum}/8` :
                   `✓ Valider série ${currentSetNum}/${currentExo.targetSets}`}
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.75, marginLeft: 10 }}>
                    {ct === 'tabata' ? '→ 10s repos' : ct === 'emom' ? '→ 15s repos' : `→ ${fmtTimer(currentExo.restSec)} repos`}
                  </span>
                </button>
              </div>
            )}

            {/* ── Actions secondaires ── */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, marginTop: 16, flexWrap: 'wrap' as const }}>
              <button onClick={skipExo} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Passer →</button>
              <button onClick={() => setReplaceSearch(currentExo.id)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>⇄ Remplacer</button>
            </div>

            {/* ── Remplacement ── */}
            {replaceSearch === currentExo.id && (
              <div style={{ padding: '14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 16 }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Chercher un exercice..." autoFocus
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }} />
                <div style={{ maxHeight: 160, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                  {EXERCISE_DATABASE.filter(e => {
                    const q = searchQuery.toLowerCase()
                    return !q || e.name.toLowerCase().includes(q) || e.aliases.some(a => a.toLowerCase().includes(q))
                  }).slice(0, 8).map(e => (
                    <button key={e.id} onClick={() => replaceExo(e.name)} style={{
                      width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const, fontWeight: 500,
                    }}>
                      {e.name} <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{e.aliases[0] ?? ''}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setReplaceSearch(null); setSearchQuery('') }} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
              </div>
            )}

            {/* ── Exercice suivant (work phase) ── */}
            {nextExo && phase === 'work' && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  Suivant{nextCircuit && nextCircuit !== currentCircuit ? ` · ${nextCircuit.label}` : ''}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: 0 }}>
                  {nextExo.label}
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontFamily: '"DM Mono",monospace' }}>
                    {nextExo.targetReps} reps{nextExo.targetWeight ? ` @${nextExo.targetWeight}kg` : ''}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────

function SessionEditor({ mode, session, dayIndex, plan, onClose, onSave, onDelete, onValidate, onAutoSave, onDuplicate, openWithFavorites }: {
  mode: 'create' | 'edit'
  session?: Session
  dayIndex?: number
  plan?: PlanVariant
  onClose: () => void
  onSave: (s: Session) => void
  onDelete?: (id: string) => void
  onValidate?: (s: Session) => void
  onAutoSave?: (s: Session) => void
  onDuplicate?: (dayIndex: number, session: Session) => void
  openWithFavorites?: boolean
}) {
  const isEdit = mode === 'edit'
  const [sport, setSport] = useState<SportType>(session?.sport ?? 'run')
  const [cyclingSub, setCyclingSub] = useState<CyclingSub>('velo')
  const [trainingType, setTrainingType] = useState<string | null>(null)
  const [title, setTitle] = useState(session?.title ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState(session?.time ?? '09:00')
  const [dur, setDur] = useState(session?.durationMin ?? 60)
  const [rpe, setRpe] = useState(session?.rpe ?? 5)
  const [desc, setDesc] = useState(session?.notes ?? '')
  const [selPlan, setSelPlan] = useState<PlanVariant>(session?.planVariant ?? plan ?? 'A')
  const [blocks, setBlocks] = useState<Block[]>(session?.blocks ?? [])
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [builderTab, setBuilderTab] = useState<'manual' | 'ai'>('manual')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [executeMode, setExecuteMode] = useState(false)
  const [tssInfo, setTssInfo] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(false)
  const [nutritionLoading, setNutritionLoading] = useState(false)
  const [showDuplicateMenu, setShowDuplicateMenu] = useState(false)
  const [favorites, setFavorites] = useState<Array<{id:string;name:string;sport:string;training_type?:string;blocks_data:Block[];nutrition_data:NutritionItem[];duration_min:number;rpe:number;notes:string}>>([])
  const [showFavorites, setShowFavorites] = useState(openWithFavorites ?? false)
  const [exoHistory, setExoHistory] = useState<Record<string, { weight: string; reps: number; date: string }>>({})
  const [nutritionItems, setNutritionItems] = useState<NutritionItem[]>((session as unknown as Session & { nutritionItems?: NutritionItem[] })?.nutritionItems ?? [])
  const [nutritionTab, setNutritionTab] = useState<'manual' | 'ai'>('manual')
  const [nutritionAiPrompt, setNutritionAiPrompt] = useState('')
  const [nutritionAiLoading, setNutritionAiLoading] = useState(false)
  const [parcoursFile, setParcoursFile] = useState<File | null>(null)
  const [parcoursData, setParcoursData] = useState<ParcoursData | null>(session?.parcoursData ?? null)
  const [parcoursLoading, setParcoursLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Circuit info exposé par ExerciseListBuilder — refs synchrones (pas de stale state)
  const gymCircuitsRef = useRef<ExoCircuit[]>([{ id: 'default', name: 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 }])
  const gymCircuitMapRef = useRef<Record<string, string>>({})
  const [parcoursError, setParcoursError] = useState<string | null>(null)
  const [hoveredKm, setHoveredKm] = useState<number | null>(null)
  const parcoursInputRef = useRef<HTMLInputElement>(null)
  const [athleteData, setAthleteData] = useState<{
    ftp: number | null
    runThresholdPaceSec: number | null
    cssSecPer100m: number | null
    rowThresholdSecPer500m: number | null
    ctl: number | null
    hrMax: number | null
    hrRest: number | null
    lthrRun: number | null
    lthrBike: number | null
    runThresholdPaceStr: string | null
    swimCSSStr: string | null
  } | null>(null)
  const [athleteProducts, setAthleteProducts] = useState<Array<{
    name: string; type: string; glucidesG: number; proteinesG: number; quantity: string
  }>>([])
  const [athleteWeight, setAthleteWeight] = useState<number>(75)
  const [bikeWeight, setBikeWeight] = useState<number>(8)
  const [terrainLoading, setTerrainLoading] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user || cancelled) return

        const [perfRes, actsRes, profileRes] = await Promise.all([
          // athlete_performance_profile — vraies colonnes vérifiées
          sb.from('athlete_performance_profile')
            .select('ftp_watts,hr_max,hr_rest,lthr_run,lthr_bike,threshold_pace_s_km,css_s_100m,rowing_threshold_pace_s_500m')
            .eq('user_id', user.id).maybeSingle().then(r => r, () => ({ data: null })),
          sb.from('activities').select('tss,started_at,moving_time_s,average_heartrate').eq('user_id', user.id).gte('started_at', new Date(Date.now() - 56 * 86400000).toISOString()).order('started_at', { ascending: true }).then(r => r, () => ({ data: [] })),
          sb.from('profiles').select('weight_kg,bike_weight_kg').eq('id', user.id).maybeSingle().then(r => r, () => ({ data: null })),
        ])

        const perf = (perfRes as { data: Record<string, unknown> | null }).data
        const acts = (actsRes as { data: Array<Record<string, unknown>> | null }).data ?? []
        const prof = (profileRes as { data: Record<string, unknown> | null }).data
        if (!cancelled) {
          if (prof?.weight_kg) setAthleteWeight(prof.weight_kg as number)
          if (prof?.bike_weight_kg) setBikeWeight(prof.bike_weight_kg as number)
        }

        const ftp = (perf?.ftp_watts as number) ?? null
        const hrMax = (perf?.hr_max as number) ?? null
        const hrRest = (perf?.hr_rest as number) ?? null
        const lthrRun = (perf?.lthr_run as number) ?? null
        const lthrBike = (perf?.lthr_bike as number) ?? null

        // threshold_pace_s_km : entier (secondes/km)
        const thresholdPaceSecKm = (perf?.threshold_pace_s_km as number) ?? null
        const runThresholdPaceSec = thresholdPaceSecKm
        const runThresholdPaceStr = thresholdPaceSecKm != null
          ? `${Math.floor(thresholdPaceSecKm / 60)}:${String(thresholdPaceSecKm % 60).padStart(2, '0')}`
          : null

        // css_s_100m : entier (secondes/100m)
        const cssSecPer100m = (perf?.css_s_100m as number) ?? null
        const swimCSSStr = cssSecPer100m != null
          ? `${Math.floor(cssSecPer100m / 60)}:${String(cssSecPer100m % 60).padStart(2, '0')}`
          : null

        const rowSecPer500m = (perf?.rowing_threshold_pace_s_500m as number) ?? null

        // CTL: EWMA over 56 days
        const since56d = new Date(Date.now() - 56 * 86400000)
        const tssPerDay: number[] = []
        for (let d = 0; d < 56; d++) {
          const dayStart = new Date(since56d.getTime() + d * 86400000); dayStart.setHours(0,0,0,0)
          const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999)
          tssPerDay.push(acts.filter(a => {
            const t = new Date(a.started_at as string).getTime()
            return t >= dayStart.getTime() && t <= dayEnd.getTime()
          }).reduce((s, a) => {
            if (a.tss && (a.tss as number) > 0) return s + (a.tss as number)
            const h = ((a.moving_time_s as number) ?? 0) / 3600
            if (h <= 0) return s
            const hr = a.average_heartrate as number | null
            if (hr && hr > 0) return s + Math.round(h * (hr / 180) * (hr / 180) * 100)
            return s + Math.round(h * 65)
          }, 0))
        }
        let ctl = 0
        for (const t of tssPerDay) ctl = ctl + (t - ctl) / 42

        if (!cancelled) setAthleteData({
          ftp, runThresholdPaceSec, cssSecPer100m,
          rowThresholdSecPer500m: rowSecPer500m,
          ctl: Math.round(ctl),
          hrMax, hrRest, lthrRun, lthrBike,
          runThresholdPaceStr, swimCSSStr,
        })
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (mode !== 'create') return
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('session_favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setFavorites(data ?? [])
      } catch {}
    })()
  }, [mode])

  useEffect(() => {
    const isStrengthSport = sport === 'gym' || sport === 'hyrox'
    if (!isStrengthSport) return
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('planned_sessions')
          .select('blocks,started_at')
          .eq('user_id', user.id)
          .in('sport', ['gym', 'hyrox'])
          .not('blocks', 'is', null)
          .order('started_at', { ascending: false })
          .limit(20)
        if (!data) return
        const history: Record<string, { weight: string; reps: number; date: string }> = {}
        for (const sess of data) {
          const blks = (sess.blocks ?? []) as Block[]
          for (const b of blks) {
            if (b.type === 'circuit_header') continue
            const key = (b.label ?? '').toLowerCase().trim()
            if (key && !history[key] && b.value) {
              history[key] = { weight: b.value, reps: b.reps ?? 0, date: (sess as Record<string,unknown>).started_at as string ?? '' }
            }
          }
        }
        setExoHistory(history)
      } catch {}
    })()
  }, [sport])

  // Charger les produits nutrition de l'athlète
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('nutrition_products').select('name,type,glucidesG:glucides_g,proteinesG:proteines_g,quantity').eq('user_id', user.id).then(r => r, () => ({ data: null }))
        if (data && Array.isArray(data)) setAthleteProducts(data as typeof athleteProducts)
      } catch {}
    })()
  }, [])

  // ── Auto-save (edit mode) ─────────────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'edit' || !onAutoSave || !session?.id) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      const isStrengthSport = sport === 'gym' || sport === 'hyrox'
      // Utiliser exercisesToBlocks pour inclure les circuit_headers avec le bon mode
      const autoBlocks = isStrengthSport && exercises.length > 0
        ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
        : blocks
      if (autoBlocks.length === 0) return
      onAutoSave({ ...session, sport, title, time, durationMin: dur, rpe, blocks: autoBlocks, notes: desc || undefined })
    }, 800)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, exercises])

  const accent = SPORT_BORDER[sport]
  const isStrength = sport === 'gym' || sport === 'hyrox'
  const trainTypes = TRAINING_TYPES[sport] ?? []

  // ── Zones FC : modèle LTHR identique à la page Zones ─────────────
  // Priorité : lthr_run/lthr_bike → hrMax*0.85 (estimation LTHR) → fallback hardcodé
  const lthrForSport = (() => {
    if (!athleteData) return null
    const lthr = sport === 'bike' ? athleteData.lthrBike : athleteData.lthrRun
    if (lthr) return lthr
    if (athleteData.hrMax) return Math.round(athleteData.hrMax * 0.85)
    return null
  })()
  const fcZones: number[] = lthrForSport
    ? [
        Math.round(lthrForSport * 0.80),   // Z1/Z2
        Math.round(lthrForSport * 0.89),   // Z2/Z3
        Math.round(lthrForSport * 0.95),   // Z3/Z4
        Math.round(lthrForSport * 1.02),   // Z4/Z5
      ]
    : []

  // TSS range — block-based with athlete fitness factor
  const tssRange = computeTSSRange(blocks, sport, dur, rpe, athleteData)
  const sessionAvg = computeSessionAverages(blocks, sport)
  const tssDisplay = tssRange.low === 0 && tssRange.high === 0
    ? '—'
    : tssRange.low === tssRange.high
      ? String(tssRange.low)
      : `${tssRange.low}–${tssRange.high}`
  const tssLabel = tssRange.high < 50 ? 'Très facile' : tssRange.high < 100 ? 'Modérée' : tssRange.high < 150 ? 'Difficile' : tssRange.high < 200 ? 'Très difficile' : 'Extrême'

  // RPE color
  const rpeCol = rpe <= 3 ? '#4ade80' : rpe <= 6 ? '#facc15' : rpe <= 8 ? '#fb923c' : '#f87171'

  // Donut derived values (Change 5)
  const showDonuts = ['run', 'bike', 'swim', 'rowing'].includes(sport) && blocks.length > 0
  const ZONE_COUNT = sport === 'bike' ? 7 : 5
  const ZONE_COLORS_7 = ['#6b7280', '#4ade80', '#facc15', '#fb923c', '#f87171', '#c084fc', '#f472b6']
  const activeZoneColors = sport === 'bike' ? ZONE_COLORS_7 : ZONE_COLORS.slice(0, 5)
  const activeZoneLabels = sport === 'bike'
    ? ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7']
    : ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']
  const zoneDist = computeZoneDistribution(blocks, ZONE_COUNT)
  const hrDist = computeHRDistribution(blocks, fcZones.length > 0 ? fcZones : undefined)

  useEffect(() => {
    if (blocks.length === 0) return
    const totalBlocksMin = Math.round(blocks.reduce((s, b) => {
      if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin)
        return s + b.reps * (b.effortMin + b.recoveryMin)
      return s + b.durationMin
    }, 0))
    if (totalBlocksMin > 0) setDur(totalBlocksMin)
  }, [blocks])

  // Auto-save intentionally removed — save on close instead to avoid infinite re-render loop

  function handleExportPDF() {
    const finalTitle = title || `${SPORT_LABEL[sport]} ${trainingType || ''}`
    const blocksHtml = blocks.map(b => {
      const durStr = b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin
        ? `${b.reps} × ${b.effortMin}min + ${b.recoveryMin}min récup`
        : `${b.durationMin}min`
      const zoneCol = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444'][b.zone - 1] ?? '#9ca3af'
      return `<tr><td style="color:${zoneCol};font-weight:700">Z${b.zone}</td><td>${b.label}</td><td>${durStr}</td><td>${b.value || '—'}</td></tr>`
    }).join('')
    const nutritionHtml = nutritionItems.length > 0
      ? `<h3 style="font-size:14px;margin-top:28px;border-top:1px solid #eee;padding-top:16px">Stratégie nutritionnelle</h3><table><tr><th>Temps</th><th>Aliment</th><th>Quantité</th><th>Glucides</th><th>Protéines</th></tr>${[...nutritionItems].sort((a,b) => a.timeMin - b.timeMin).map(m => `<tr><td>${m.timeMin === 0 ? 'Avant départ' : m.timeMin + 'min'}</td><td>${m.name || m.type}</td><td>${m.quantity}</td><td>${m.glucidesG}g</td><td>${m.proteinesG}g</td></tr>`).join('')}<tr style="background:#f9f9f9;font-weight:600"><td colspan="3">Total</td><td>${nutritionItems.reduce((s,x)=>s+x.glucidesG,0)}g glucides</td><td>${nutritionItems.reduce((s,x)=>s+x.proteinesG,0)}g prot.</td></tr></table>`
      : ''
    const parcoursSection = (() => {
      if (!parcoursData) return ''
      const profile = parcoursData.elevationProfile
      const totalKm = parcoursData.distance ?? (profile.length > 0 ? profile[profile.length - 1].distKm : 0)

      // SVG Trace GPS
      const traceSection = (() => {
        const trace = parcoursData.gpsTrace
        if (!trace || trace.length < 2) return ''
        const lats = trace.map(p => p.lat), lons = trace.map(p => p.lon)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLon = Math.min(...lons), maxLon = Math.max(...lons)
        const latRange = maxLat - minLat || 0.01, lonRange = maxLon - minLon || 0.01
        const W = 500, H = 280
        const aspect = lonRange / latRange
        let plotW = W, plotH = H
        if (aspect > W / H) plotH = W / aspect; else plotW = H * aspect
        const padX = (W - plotW) / 2, padY = (H - plotH) / 2
        const svgPts = trace.map(p => ({
          x: padX + ((p.lon - minLon) / lonRange) * plotW,
          y: padY + (1 - (p.lat - minLat) / latRange) * plotH,
        }))
        const pathD = svgPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        const sx = svgPts[0].x, sy = svgPts[0].y
        const ex = svgPts[svgPts.length - 1].x, ey = svgPts[svgPts.length - 1].y
        return `<h4 style="font-size:12px;font-weight:600;margin:10px 0 6px;color:#555">Trace GPS</h4>
<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;margin:4px 0 12px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb">
  <path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round" opacity="0.8"/>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="5" fill="#22c55e" stroke="#fff" stroke-width="2"/>
  <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="#ef4444" stroke="#fff" stroke-width="2"/>
  <text x="${(sx + 8).toFixed(1)}" y="${(sy + 4).toFixed(1)}" font-size="9" fill="#22c55e" font-weight="700">Départ</text>
  <text x="${(ex + 8).toFixed(1)}" y="${(ey + 4).toFixed(1)}" font-size="9" fill="#ef4444" font-weight="700">Arrivée</text>
</svg>`
      })()

      const header = `<h3 style="font-size:13px;font-weight:700;margin:24px 0 6px;color:#333">Parcours — ${parcoursData.name}</h3>
<div style="display:flex;gap:16px;font-size:11px;color:#666;margin-bottom:8px">${parcoursData.distance != null ? `<span><strong style="color:#333">${parcoursData.distance}</strong> km</span>` : ''}${parcoursData.elevation != null ? `<span><strong style="color:#333">${parcoursData.elevation}</strong> m D+</span>` : ''}</div>${traceSection}`

      if (profile.length < 2 || totalKm === 0) return header

      const minEle = Math.min(...profile.map(p => p.ele))
      const maxEle = Math.max(...profile.map(p => p.ele))
      const eleRange = maxEle - minEle || 1
      const W = 600, H = 120, PL = 36, PR = 10, PT = 10, PB = 20
      const pW = W - PL - PR, pH = H - PT - PB
      const pts = profile.map(p => ({ x: PL + (p.distKm / totalKm) * pW, y: PT + pH - ((p.ele - minEle) / eleRange) * pH }))
      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      const fillD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${PT+pH} L${PL},${PT+pH} Z`
      const yStep = eleRange > 500 ? 200 : eleRange > 200 ? 100 : 50
      const yTicks: number[] = []
      for (let e = Math.ceil(minEle / yStep) * yStep; e <= maxEle; e += yStep) yTicks.push(e)
      const xStep = totalKm > 150 ? 20 : totalKm > 80 ? 10 : totalKm > 30 ? 5 : 2
      const xTicks: number[] = []
      for (let km = 0; km <= totalKm; km += xStep) xTicks.push(km)
      return `${header}<h4 style="font-size:12px;font-weight:600;margin:10px 0 6px;color:#555">Profil altimétrique</h4>
<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;margin:4px 0 8px">
${yTicks.map(ele => { const y = PT+pH-((ele-minEle)/eleRange)*pH; return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/><text x="${PL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="#999" font-family="monospace">${ele}m</text>` }).join('\n')}
${xTicks.map(km => { const x = PL+(km/totalKm)*pW; return `<line x1="${x.toFixed(1)}" y1="${PT}" x2="${x.toFixed(1)}" y2="${PT+pH}" stroke="#e5e7eb" stroke-width="0.5" opacity="0.4"/><text x="${x.toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="7" fill="#999" font-family="monospace">${km}km</text>` }).join('\n')}
<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT+pH}" stroke="#d1d5db" stroke-width="0.6"/>
<line x1="${PL}" y1="${PT+pH}" x2="${W-PR}" y2="${PT+pH}" stroke="#d1d5db" stroke-width="0.6"/>
<path d="${fillD}" fill="${accent}" opacity="0.06"/>
<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.7" stroke-linejoin="round"/>
<text x="${PL+4}" y="${PT+pH-4}" font-size="7" fill="#999" font-family="monospace">${Math.round(minEle)}m</text>
<text x="${W-PR-4}" y="${PT+8}" text-anchor="end" font-size="7" fill="${accent}" font-weight="600" font-family="monospace">${Math.round(maxEle)}m</text>
</svg>`
    })()
    const html = `<!DOCTYPE html><html><head><title>${finalTitle}</title><meta charset="utf-8"><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;max-width:800px;margin:0 auto;color:#111;background:#fff}h1{font-size:24px;font-weight:800;margin:0 0 4px;letter-spacing:-0.03em}h3{font-size:14px;font-weight:700;margin:0 0 10px;color:#333}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}td,th{padding:7px 10px;border:1px solid #e5e7eb;text-align:left}th{background:#f9fafb;font-weight:600;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.04em}.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #f3f4f6}.sport-badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:#f3f4f6;color:#555;letter-spacing:0.06em}.metrics{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}.metric{text-align:center}.metric-val{font-size:20px;font-weight:800;color:#111;font-variant-numeric:tabular-nums}.metric-lbl{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px}@media print{body{padding:16px}}</style></head><body><div class="header"><div><h1>${finalTitle}</h1><p style="font-size:13px;color:#999;margin:4px 0 0">${SPORT_LABEL[sport]}</p></div><span class="sport-badge">${SPORT_ABBR[sport]}</span></div><div class="metrics"><div class="metric"><div class="metric-val">${fmtDurLocal(dur)}</div><div class="metric-lbl">Durée</div></div><div class="metric"><div class="metric-val">${tssDisplay}</div><div class="metric-lbl">TSS</div></div><div class="metric"><div class="metric-val">${rpe}/10</div><div class="metric-lbl">RPE</div></div>${parcoursData?.distance != null ? `<div class="metric"><div class="metric-val">${parcoursData.distance} km</div><div class="metric-lbl">Distance</div></div>` : ''}${parcoursData?.elevation != null ? `<div class="metric"><div class="metric-val">${parcoursData.elevation} m</div><div class="metric-lbl">Dénivelé +</div></div>` : ''}</div>${desc ? `<p style="font-size:12px;color:#555;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:24px">${desc}</p>` : ''}${blocks.length > 0 ? `<h3>Blocs d'intensité</h3><table><tr><th>Zone</th><th>Bloc</th><th>Durée</th><th>Cible</th></tr>${blocksHtml}</table>` : ''}${nutritionHtml}${parcoursSection}<p style="margin-top:40px;font-size:10px;color:#bbb;border-top:1px solid #f3f4f6;padding-top:16px">THW Coaching · Généré le ${new Date().toLocaleDateString('fr-FR')}</p></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
  }

  function handleSportChange(s: SportType) {
    setSport(s); setTrainingType(null); setBlocks([]); setExercises([])
  }

  // Convertit les circuits + exercices du ExerciseListBuilder en Block[] avec circuit_headers
  function exercisesToBlocks(exos: ExerciseItem[], circuits: ExoCircuit[], map: Record<string, string>): Block[] {
    const result: Block[] = []
    for (const circuit of circuits) {
      const circuitExos = exos.filter(e => (map[e.id] ?? 'default') === circuit.id)
      if (circuitExos.length === 0) continue
      result.push({
        id: circuit.id,
        mode: circuit.type as BlockMode,   // 'series' | 'circuit' | 'superset' | 'emom' | 'tabata'
        type: 'circuit_header' as BlockType,
        durationMin: circuit.targetTimeSec ? Math.ceil(circuit.targetTimeSec / 60) : 0,
        zone: circuit.rounds,
        value: '',
        hrAvg: '',
        label: circuit.name,
      })
      for (const e of circuitExos) {
        result.push({
          id: e.id,
          mode: 'single' as BlockMode,
          type: 'effort' as BlockType,
          durationMin: e.targetTimeSec ? Math.ceil(e.targetTimeSec / 60) : Math.ceil((e.sets * (e.restSec + 60)) / 60),
          zone: e.sets,
          value: e.weightKg ? String(e.weightKg) : '',
          hrAvg: e.kcal ? String(e.kcal) : '',
          label: [e.name, `${e.sets}×${e.reps}`, e.weightKg ? `@${e.weightKg}kg` : '', e.distanceM ? `${e.distanceM}m` : '', e.notes ? `— ${e.notes}` : ''].filter(Boolean).join(' ').trim(),
          reps: e.reps,
          recoveryMin: e.restSec / 60,
          effortMin: e.targetTimeSec ? e.targetTimeSec / 60 : 0,
        })
      }
    }
    return result
  }

  function handleSubmit() {
    const finalTitle = title || (trainingType ? `${SPORT_LABEL[sport]} ${trainingType}` : SPORT_LABEL[sport])
    const subLabel = sport === 'bike' ? ` — ${CYCLING_SUB_LABEL[cyclingSub]}` : ''
    const finalBlocks = isStrength && exercises.length > 0
      ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
      : blocks
    const savedSession: Session = {
      ...(session ?? {}),
      id: session?.id ?? '',
      dayIndex: dayIndex ?? session?.dayIndex ?? 0,
      sport, title: finalTitle + subLabel, time,
      durationMin: dur || 60, tss: tssRange.high || undefined,
      status: session?.status ?? 'planned', notes: desc || undefined,
      blocks: finalBlocks, rpe, planVariant: selPlan,
      parcoursData: parcoursData ?? undefined,
      nutritionItems: nutritionItems.length > 0 ? nutritionItems : undefined,
    }
    onSave(savedSession)
    onClose()
  }

  async function generateBlocksFromTerrain() {
    if (!parcoursData || !athleteData?.ftp) return
    setTerrainLoading(true)
    try {
      const segs = analyzeTerrainSegments(
        parcoursData.elevationProfile,
        athleteData.ftp,
        athleteWeight,
        bikeWeight,
      )
      // Build Block[] from terrain segments
      const newBlocks: Block[] = segs.map((seg, i) => {
        const targetWatts = seg.type === 'climb'
          ? Math.round(athleteData.ftp! * 0.9)
          : seg.type === 'descent'
            ? Math.round(athleteData.ftp! * 0.5)
            : Math.round(athleteData.ftp! * 0.75)
        const zone = seg.type === 'climb' ? 4 : seg.type === 'descent' ? 1 : 3
        // Exact time (float) for ±5% range display
        const timeMinExact = estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, targetWatts, athleteWeight, bikeWeight)
        const durationMin = Math.max(1, Math.round(timeMinExact))
        const lo = fmtDuration(timeMinExact * 0.95)
        const hi = fmtDuration(timeMinExact * 1.05)
        const typeName = seg.type === 'climb' ? 'Montée' : seg.type === 'descent' ? 'Descente' : 'Plat'
        const gradStr = Math.abs(seg.avgGradient) >= 0.5 ? ` ${Math.abs(seg.avgGradient).toFixed(1)}%` : ''
        const label = `${typeName}${gradStr} — ${lo} à ${hi}`
        return {
          id: `terrain_${i}`,
          mode: 'effort' as BlockMode,
          type: 'effort' as BlockType,
          durationMin,
          zone,
          value: String(targetWatts),  // just the number — convention throughout the app
          hrAvg: '',
          label,
          _startKm: seg.startKm,
          _endKm: seg.endKm,
        }
      })
      setBlocks(newBlocks)
      // Update total duration
      const totalMin = newBlocks.reduce((s, b) => s + b.durationMin, 0)
      setDur(totalMin)
      setBuilderTab('manual')
    } catch (e) {
      console.error('[Terrain]', e)
    } finally {
      setTerrainLoading(false)
    }
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const isStrengthSport = sport === 'gym' || sport === 'hyrox'

      // ── Le frontend envoie juste la description + le sport ──
      // Le system prompt complet est côté serveur dans /api/coach-stream
      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: aiPrompt }],
          sport,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let raw = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const p = line.slice(6).trim()
            if (p === '[DONE]') continue
            try {
              const d = JSON.parse(p) as Record<string, unknown>
              if (typeof d.text === 'string') raw += d.text
            } catch { if (p !== '[DONE]') raw += p }
          }
        }
      }

      // ── Extraire le JSON ──
      let jsonStr = ''
      const arrayMatch = raw.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        jsonStr = arrayMatch[0]
      } else {
        const objMatch = raw.match(/\{[\s\S]*\}/)
        if (objMatch) {
          try {
            const obj = JSON.parse(objMatch[0]) as Record<string, unknown>
            if (Array.isArray(obj.blocks)) jsonStr = JSON.stringify(obj.blocks)
            else if (Array.isArray(obj.blocs)) jsonStr = JSON.stringify(obj.blocs)
            else if (Array.isArray(obj.exercises)) jsonStr = JSON.stringify(obj.exercises)
          } catch { /* continue */ }
        }
      }

      if (!jsonStr) {
        setAiError(`L'IA n'a pas retourné de JSON valide. Réponse : ${raw.slice(0, 300) || '(vide)'}`)
        return
      }

      const parsed = JSON.parse(jsonStr) as Record<string, unknown>[]


      if (isStrengthSport) {
        // ── GYM / HYROX : convertir en Block[] pour BlockBuilder (support circuit_header) ──
        const newBlocks: Block[] = parsed.map((b: Record<string, unknown>, i: number) => {
          const labelStr = typeof b.label === 'string' ? b.label : 'Exercice'
          const blockType: BlockType = b.type === 'circuit_header' ? 'circuit_header' : 'effort'
          const setsVal = typeof b.zone === 'number' ? Math.max(1, Math.min(10, b.zone)) : 3
          const repsVal = typeof b.reps === 'number' ? b.reps : 8
          const weightRaw = parseFloat(String(b.value ?? ''))
          const weightStr = isNaN(weightRaw) || weightRaw <= 0 ? '' : String(weightRaw)
          const effortMinVal = typeof b.effortMin === 'number' ? b.effortMin : 0
          const recoveryMinVal = typeof b.recoveryMin === 'number' ? b.recoveryMin : 1.5
          const durationMinVal = typeof b.durationMin === 'number' && b.durationMin > 0 ? b.durationMin : (effortMinVal > 0 ? Math.ceil(effortMinVal * setsVal) : 0)
          return {
            id: `ai_${Date.now()}_${i}`,
            mode: 'single' as const,
            type: blockType,
            durationMin: durationMinVal,
            zone: setsVal,
            value: weightStr,
            hrAvg: typeof b.hrAvg === 'string' ? b.hrAvg : '',
            label: labelStr,
            reps: repsVal > 0 ? repsVal : undefined,
            effortMin: effortMinVal > 0 ? effortMinVal : undefined,
            recoveryMin: recoveryMinVal,
          }
        })
        if (newBlocks.length === 0) { setAiError("L'IA a retourné un tableau vide."); return }
        setBlocks(newBlocks)
        setBuilderTab('manual')
        setAiPrompt('')
      } else {
        // ── ENDURANCE : convertir en Block[] pour BlockBuilder ──
        const newBlocks: Block[] = parsed.map((b: Record<string, unknown>, i: number) => {
          let effortMin = typeof b.effortMin === 'number' ? b.effortMin : 0
          let label = typeof b.label === 'string' ? b.label : 'Bloc'
          const value = String(b.value ?? '')
          const mode = typeof b.mode === 'string' ? b.mode : 'single'
          const repsN = typeof b.reps === 'number' ? b.reps : 1
          const recoveryMin = typeof b.recoveryMin === 'number' ? b.recoveryMin : 0
          const durationMin = typeof b.durationMin === 'number' ? b.durationMin : 0
          const distMatch = label.match(/(\d+)\s*m/i)
          const paceMatch = value.match(/(\d+):(\d+)/)
          if (distMatch && paceMatch && mode === 'interval') {
            const distM = parseInt(distMatch[1])
            const paceSec = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2])
            const eSec = sport === 'swim' ? (distM / 100) * paceSec : (distM / 1000) * paceSec
            effortMin = Math.round(eSec / 60 * 100) / 100
            const lo = Math.round(eSec * 0.97), hi = Math.round(eSec * 1.03)
            const f = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
            label = `${distM}m — ${f(lo)} à ${f(hi)}`
          }
          const rawZone = typeof b.zone === 'number' ? b.zone : 3
          const zone = Math.max(1, Math.min(5, rawZone))
          return {
            id: `ai_${Date.now()}_${i}`,
            mode: (typeof b.mode === 'string' ? b.mode : 'single') as 'single' | 'interval',
            type: (typeof b.type === 'string' ? b.type : 'effort') as Block['type'],
            durationMin: mode === 'interval' ? Math.round(repsN * (effortMin + recoveryMin) * 100) / 100 : durationMin,
            zone, value, hrAvg: typeof b.hrAvg === 'string' ? b.hrAvg : '', label,
            reps: repsN || undefined,
            effortMin: effortMin || undefined,
            recoveryMin: recoveryMin || undefined,
            recoveryZone: typeof b.recoveryZone === 'number' ? b.recoveryZone : 1,
          }
        })
        if (newBlocks.length === 0) { setAiError("L'IA a retourné un tableau vide."); return }
        setBlocks(newBlocks)
        setBuilderTab('manual')
        setAiPrompt('')
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[AI blocks] Error:', msg)
      setAiError(`Erreur : ${msg}`)
    } finally {
      setAiLoading(false)
    }
  }

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-dim)',
    textTransform: 'uppercase' as const, letterSpacing: '0.10em',
    display: 'block', marginBottom: 7,
  }


  const TSS_SESSION = [
    { range: '0 – 50', label: 'Très facile', desc: 'Footing léger, sortie douce' },
    { range: '50 – 100', label: 'Facile à modérée', desc: 'Rythme modéré' },
    { range: '100 – 150', label: 'Modérée à difficile', desc: 'Séance soutenue' },
    { range: '150 – 200', label: 'Difficile', desc: 'Grosse séance, récup nécessaire' },
    { range: '> 200', label: 'Très difficile', desc: 'Compétition ou longue sortie intense' },
  ]
  const TSS_WEEKLY = [
    { range: '150 – 300', level: 'Débutant / Loisir' },
    { range: '300 – 500', level: 'Intermédiaire' },
    { range: '500 – 700', level: 'Confirmé / Amateur actif' },
    { range: '700 – 1000', level: 'Avancé / Compétiteur' },
    { range: '1000 – 1500', level: 'Élite / Semi-pro' },
  ]

  const fmtDurLocal = (m: number) => {
    if (m < 60) return `${m}min`
    const h = Math.floor(m / 60), rm = m % 60
    return rm === 0 ? `${h}h` : `${h}h${String(rm).padStart(2,'0')}`
  }

  // ── Early return : MODE EXÉCUTION ──
  if (executeMode) {
    // Pour les séances muscu/hyrox créées avec ExerciseListBuilder,
    // on reconstruit les blocks avec circuit_headers (contenant le bon mode/type de circuit)
    const execBlocks = isStrength && exercises.length > 0 && gymCircuitsRef.current.length > 0
      ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
      : blocks
    return (
      <SessionExecute
        blocks={execBlocks}
        sport={sport}
        sessionTitle={title || SPORT_LABEL[sport]}
        onExit={() => setExecuteMode(false)}
        exoHistory={exoHistory}
      />
    )
  }

  return (
    <>
      <style>{`@keyframes slideUpModal{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed' as const, inset: 0, zIndex: 999,
        background: 'var(--bg)',
        overflowY: 'auto' as const,
        animation: 'slideUpModal 0.2s ease-out',
      }}>

        {/* HEADER STICKY */}
        <div style={{
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          position: 'sticky' as const, top: 0, zIndex: 10,
          background: 'var(--bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>{isEdit ? 'Modifier la séance' : 'Nouvelle séance'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Hidden file input — shared by all Parcours buttons */}
        <input
          ref={parcoursInputRef}
          type="file"
          accept=".gpx,.tcx,.kml"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setParcoursFile(f)
            setParcoursLoading(true)
            setParcoursError(null)
            try {
              const data = await parseRouteFile(f)
              setParcoursData(data)
            } catch (err) {
              setParcoursError(err instanceof Error ? err.message : 'Erreur de lecture')
              setParcoursData(null)
            } finally {
              setParcoursLoading(false)
              if (parcoursInputRef.current) parcoursInputRef.current.value = ''
            }
          }}
        />

        {/* TITRE */}
        <div style={{ padding: mobile ? '14px 16px 0' : '16px 24px 0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={`${SPORT_LABEL[sport]} ${trainingType || ''}`}
            style={{
              flex: 1, background: 'none', border: 'none', color: 'var(--text)',
              fontSize: mobile ? 20 : 24, fontWeight: 800, outline: 'none', padding: 0,
              minWidth: 0,
              fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em',
            }} />
          <button
            onClick={handleExportPDF}
            title="Exporter en PDF"
            style={{
              flexShrink: 0,
              padding: '5px 11px', borderRadius: 7, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-dim)', fontSize: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
              letterSpacing: '0.04em',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8.5L2 4.5h2.5V1h3v3.5H10L6 8.5Z" fill="currentColor"/>
              <rect x="1" y="10" width="10" height="1.2" rx="0.6" fill="currentColor"/>
            </svg>
            PDF
          </button>
          <button
            onClick={() => parcoursInputRef.current?.click()}
            title="Importer un parcours GPX/TCX/KML"
            style={{
              flexShrink: 0,
              padding: '5px 11px', borderRadius: 7, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-dim)', fontSize: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
              letterSpacing: '0.04em',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 1.5C4.07 1.5 2.5 3.07 2.5 5c0 2.5 3.5 5.5 3.5 5.5s3.5-3 3.5-5.5C9.5 3.07 7.93 1.5 6 1.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/>
            </svg>
            {parcoursLoading ? '…' : parcoursData ? (parcoursData.distance != null ? `${parcoursData.distance} km` : '✓') : 'Parcours'}
          </button>
        </div>

        {/* Favoris (mode create seulement) */}
        {mode === 'create' && favorites.length > 0 && (
          <div style={{ padding: mobile ? '0 16px 10px' : '0 24px 12px' }}>
            <button onClick={() => setShowFavorites(!showFavorites)} style={{
              width: '100%', padding: '9px', borderRadius: 8,
              border: '1px solid var(--border)', background: showFavorites ? `${accent}10` : 'var(--bg-card2)',
              color: showFavorites ? accent : 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600,
            }}>
              ★ Charger un favori ({favorites.length})
            </button>
            {showFavorites && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                {favorites.map(fav => (
                  <button key={fav.id} onClick={() => {
                    setSport(fav.sport as SportType)
                    setTrainingType(fav.training_type ?? null)
                    setTitle(fav.name)
                    setBlocks(fav.blocks_data ?? [])
                    setNutritionItems(fav.nutrition_data ?? [])
                    setDur(fav.duration_min ?? 60)
                    setRpe(fav.rpe ?? 5)
                    setDesc(fav.notes ?? '')
                    setShowFavorites(false)
                  }} style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, textAlign: 'left' as const,
                    border: '1px solid var(--border)', background: 'var(--bg-card2)',
                    color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                  }}>
                    <span style={{ fontWeight: 600 }}>{fav.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{SPORT_LABEL[fav.sport as SportType] ?? fav.sport} · {formatHM(fav.duration_min ?? 60)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEUX COLONNES */}
        <div style={{
          padding: mobile ? '16px' : '20px 24px',
          display: mobile ? 'flex' : 'grid',
          flexDirection: mobile ? 'column' as const : undefined,
          gridTemplateColumns: mobile ? undefined : '1fr 1fr',
          gap: mobile ? 14 : 36,
        }}>
          {/* GAUCHE */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: mobile ? 14 : 24 }}>
            {/* Sport */}
            <div>
              <span style={lbl}>Sport</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                borderRadius: 10, border: `1.5px solid ${accent}40`, background: `${accent}08`,
                boxSizing: 'border-box' as const,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <select value={sport} onChange={e => handleSportChange(e.target.value as SportType)}
                  style={{
                    flex: 1, appearance: 'none' as const, WebkitAppearance: 'none' as const,
                    background: 'none', border: 'none',
                    color: 'var(--text)', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  }}>
                  {(Object.keys(SPORT_LABEL) as SportType[]).map(sp => (
                    <option key={sp} value={sp}>{SPORT_ABBR[sp]} — {SPORT_LABEL[sp]}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>▾</span>
              </div>

              {sport === 'bike' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {(Object.keys(CYCLING_SUB_LABEL) as CyclingSub[]).map(sub => (
                    <button key={sub} onClick={() => setCyclingSub(sub)} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: cyclingSub === sub ? `1px solid ${accent}` : '1px solid var(--border)',
                      background: cyclingSub === sub ? `${accent}15` : 'transparent',
                      color: cyclingSub === sub ? accent : 'var(--text-dim)',
                    }}>{CYCLING_SUB_LABEL[sub]}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Type de séance */}
            {trainTypes.length > 0 && (
              <div>
                <span style={lbl}>Type de séance</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {trainTypes.map(t => {
                    const active = trainingType === t
                    return (
                      <button key={t} onClick={() => {
                        setTrainingType(active ? null : t)
                        if (!active && !title) setTitle(`${SPORT_LABEL[sport]} ${t}`)
                      }} style={{
                        padding: mobile ? '5px 11px' : '6px 14px', borderRadius: 7,
                        fontSize: mobile ? 10 : 11, fontWeight: 600, cursor: 'pointer',
                        background: active ? accent : 'var(--bg-card)',
                        color: active ? '#fff' : 'var(--text-dim)',
                        border: active ? 'none' : '1px solid var(--border)',
                        transition: 'all 0.12s',
                      }}>{t}</button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Date + Heure */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Date</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                  padding: '9px 12px', borderRadius: 9, width: '100%', boxSizing: 'border-box' as const,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none',
                }} />
              </div>
              <div>
                <span style={lbl}>Heure</span>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
                  padding: '9px 12px', borderRadius: 9, width: 100,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 600, outline: 'none',
                }} />
              </div>
            </div>
          </div>

          {/* DROITE */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: mobile ? 14 : 24 }}>
            {/* RPE */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={lbl}>Effort perçu</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: rpeCol, fontFamily: 'DM Mono, monospace' }}>
                  {rpe}<span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/10</span>
                </span>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 99, height: 5, position: 'relative' as const, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute' as const, left: 0, top: 0, height: '100%', borderRadius: 99,
                  width: `${(rpe / 10) * 100}%`,
                  background: `linear-gradient(90deg, #4ade8088, ${rpeCol})`,
                  transition: 'width 0.08s',
                }} />
              </div>
              <input type="range" min={0} max={10} step={1} value={rpe} onChange={e => setRpe(parseInt(e.target.value))}
                style={{ width: '100%', height: 20, marginTop: -14, opacity: 0, cursor: 'pointer', position: 'relative' as const, zIndex: 2 }} />
            </div>

            {/* Durée */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={lbl}>Durée</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: accent, fontFamily: 'DM Mono, monospace' }}>{fmtDurLocal(dur)}</span>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 99, height: 5, position: 'relative' as const, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute' as const, left: 0, top: 0, height: '100%', borderRadius: 99,
                  width: `${((dur - 5) / 355) * 100}%`,
                  background: `linear-gradient(90deg, ${accent}66, ${accent})`,
                  transition: 'width 0.08s',
                }} />
              </div>
              <input type="range" min={5} max={360} step={5} value={dur} onChange={e => setDur(parseInt(e.target.value))}
                style={{ width: '100%', height: 20, marginTop: -14, opacity: 0, cursor: 'pointer', position: 'relative' as const, zIndex: 2 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>5min</span>
                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>6h</span>
              </div>
            </div>

            {/* Donut + TSS — only for endurance with blocks */}
            {showDonuts ? (
              <div style={{ display: 'flex', gap: mobile ? 10 : 16, alignItems: 'center', flexWrap: 'wrap' as const }}>
                {/* Donut Zones */}
                <div style={{ flexShrink: 0 }}>
                  {(() => {
                    const cx = 44, cy = 44, rOut = 38, rIn = 25
                    let angle = -Math.PI / 2
                    const total = zoneDist.reduce((a, b) => a + b, 0) || 1
                    const arcs = zoneDist.map((v, i) => {
                      if (v === 0) return null
                      const pct = v / total
                      const sweep = pct * 2 * Math.PI
                      const startA = angle
                      const endA = angle + sweep - 0.02
                      angle += sweep
                      const lg = sweep > Math.PI ? 1 : 0
                      const p = (r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
                      const os = p(rOut, startA), oe = p(rOut, endA), is = p(rIn, startA), ie = p(rIn, endA)
                      return <path key={i} d={`M${os.x.toFixed(1)} ${os.y.toFixed(1)} A${rOut} ${rOut} 0 ${lg} 1 ${oe.x.toFixed(1)} ${oe.y.toFixed(1)} L${ie.x.toFixed(1)} ${ie.y.toFixed(1)} A${rIn} ${rIn} 0 ${lg} 0 ${is.x.toFixed(1)} ${is.y.toFixed(1)} Z`} fill={activeZoneColors[i]} opacity={0.85} />
                    })
                    return (
                      <svg width={80} height={80} viewBox="0 0 88 88">
                        {arcs}
                        <text x={44} y={48} textAnchor="middle" fontSize={9} fill="var(--text)" fontWeight={700} fontFamily="DM Mono, monospace">{fmtDurLocal(dur)}</text>
                      </svg>
                    )
                  })()}
                  <p style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center' as const, margin: '2px 0 0' }}>Zones</p>
                </div>

                {/* Donut FC */}
                {hrDist.length > 0 && (
                  <div style={{ flexShrink: 0 }}>
                    {(() => {
                      const cx = 44, cy = 44, rOut = 38, rIn = 25
                      let angle = -Math.PI / 2
                      const total = hrDist.reduce((a, b) => a + b.pct, 0) || 1
                      const arcs = hrDist.map((h, i) => {
                        const pct = h.pct / total
                        const sweep = pct * 2 * Math.PI
                        const startA = angle
                        const endA = angle + sweep - 0.02
                        angle += sweep
                        const lg = sweep > Math.PI ? 1 : 0
                        const p = (r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
                        const os = p(rOut, startA), oe = p(rOut, endA), is = p(rIn, startA), ie = p(rIn, endA)
                        return <path key={i} d={`M${os.x.toFixed(1)} ${os.y.toFixed(1)} A${rOut} ${rOut} 0 ${lg} 1 ${oe.x.toFixed(1)} ${oe.y.toFixed(1)} L${ie.x.toFixed(1)} ${ie.y.toFixed(1)} A${rIn} ${rIn} 0 ${lg} 0 ${is.x.toFixed(1)} ${is.y.toFixed(1)} Z`} fill={h.color} opacity={0.85} />
                      })
                      return (
                        <svg width={80} height={80} viewBox="0 0 88 88">
                          {arcs}
                          <text x={44} y={48} textAnchor="middle" fontSize={9} fill="var(--text)" fontWeight={700} fontFamily="DM Mono, monospace">FC</text>
                        </svg>
                      )
                    })()}
                    <p style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center' as const, margin: '2px 0 0' }}>Fréq. Card.</p>
                  </div>
                )}

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, flex: 1, minWidth: 60 }}>
                  {zoneDist.map((v, i) => v > 0 && (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 1, background: activeZoneColors[i], flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', flex: 1 }}>{activeZoneLabels[i]}</span>
                      <span style={{ fontSize: 9, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{v}%</span>
                    </div>
                  ))}
                </div>

                {/* TSS */}
                <div style={{ textAlign: 'center' as const, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>TSS</span>
                    <button onClick={() => setTssInfo(true)} style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)', fontSize: 7, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>?</button>
                  </div>
                  <span style={{ fontSize: tssDisplay.length > 6 ? 18 : 24, fontWeight: 800, color: accent, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.03em' }}>{tssDisplay}</span>
                  <p style={{ fontSize: 8, color: 'var(--text-dim)', margin: '3px 0 0' }}>{tssLabel}</p>
                </div>
              </div>
            ) : (
              /* Fallback: always show TSS */
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>TSS</span>
                    <button onClick={() => setTssInfo(true)} style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)', fontSize: 7, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>?</button>
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: accent, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.03em' }}>{tssDisplay}</span>
                  <p style={{ fontSize: 8, color: 'var(--text-dim)', margin: '3px 0 0' }}>{tssLabel}</p>
                </div>
                {blocks.length === 0 && (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic', flex: 1 }}>
                    Ajoute des blocs pour voir les zones
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Watts / allure estimés + références athlète en dessous */}
          {(() => {
            const hasEstimate = !!(sessionAvg.avgWatts || sessionAvg.avgPace)
            // Référence de l'athlète selon le sport
            const ref = (() => {
              if (!athleteData) return null
              if ((sport === 'bike' || sport === 'elliptique') && athleteData.ftp)
                return { label: 'FTP', value: `${athleteData.ftp}W` }
              if (sport === 'run' && athleteData.runThresholdPaceStr)
                return { label: 'Seuil', value: `${athleteData.runThresholdPaceStr}/km` }
              if (sport === 'swim' && athleteData.swimCSSStr)
                return { label: 'CSS', value: `${athleteData.swimCSSStr}/100m` }
              if (sport === 'rowing' && athleteData.rowThresholdSecPer500m) {
                const s = athleteData.rowThresholdSecPer500m
                return { label: 'Seuil', value: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/500m` }
              }
              return null
            })()
            // FC données athlète (tous sports)
            const hrRef = lthrForSport
              ? { label: athleteData?.lthrRun || athleteData?.lthrBike ? 'LTHR' : 'LTHR est.', value: String(lthrForSport) }
              : athleteData?.hrMax
                ? { label: 'FC max', value: String(athleteData.hrMax) }
                : null

            if (!hasEstimate && !ref && !hrRef) return null
            return (
              <div style={{ marginTop: mobile ? 10 : 14, paddingTop: mobile ? 10 : 12, borderTop: '1px solid var(--border)' }}>
                {/* Ligne principale : estimation */}
                {hasEstimate && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', lineHeight: 1.4 }}>
                      {sport === 'bike' || sport === 'elliptique' ? 'Watts moy. estimés' : 'Allure moy. estimée'}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: accent, fontFamily: '"DM Mono", monospace', letterSpacing: '-0.02em' }}>
                      {sessionAvg.avgWatts ? `${sessionAvg.avgWatts}W` : sessionAvg.avgPace}
                    </span>
                  </div>
                )}
                {/* Sous-ligne : seuil / FTP / CSS / LTHR de l'athlète */}
                {(ref || hrRef) && (
                  <div style={{ display: 'flex', gap: 12, marginTop: hasEstimate ? 5 : 0, flexWrap: 'wrap' as const }}>
                    {ref && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {ref.label}{' '}
                        <strong style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-mid)', fontWeight: 700 }}>{ref.value}</strong>
                      </span>
                    )}
                    {hrRef && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {hrRef.label}{' '}
                        <strong style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-mid)', fontWeight: 700 }}>{hrRef.value}</strong>
                        {athleteData?.hrMax && (
                          <span style={{ fontSize: 8, color: 'var(--text-dim)', marginLeft: 4 }}>/ FC max {athleteData.hrMax}</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* TSS INFO MODAL */}
        {tssInfo && (
          <div onClick={() => setTssInfo(false)} style={{ position: 'fixed' as const, inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' as const, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif' }}>TSS — Training Stress Score</h3>
                <button onClick={() => setTssInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 14px', lineHeight: 1.6 }}>Mesure la charge d&apos;entraînement. Calculé selon l&apos;intensité et la durée.</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.10em', marginBottom: 6 }}>Par séance</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, marginBottom: 16 }}>
                <tbody>{TSS_SESSION.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--text-dim)', width: 70 }}>{r.range}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-dim)' }}>{r.label}</td>
                    <td style={{ padding: '6px 8px', fontSize: 10, color: 'var(--text-dim)' }}>{r.desc}</td>
                  </tr>
                ))}</tbody>
              </table>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.10em', marginBottom: 6 }}>Par semaine</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <tbody>{TSS_WEEKLY.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--text-dim)', width: 90 }}>{r.range}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-dim)' }}>{r.level}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* SÉPARATEUR 1 — entre deux-colonnes et Description */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '12px 16px' : '16px 24px', opacity: 0.5 }} />

        {/* DESCRIPTION */}
        <div style={{ padding: mobile ? '24px 16px 24px' : '24px 24px 24px' }}>
          <span style={lbl}>Description et objectifs</span>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={mobile ? 3 : 4}
            placeholder="Décris la séance, les objectifs, les sensations recherchées..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box' as const,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-dim)', fontSize: 12, outline: 'none', resize: 'vertical' as const,
              fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6,
            }} />
        </div>

        {/* PARCOURS */}
        {(parcoursLoading || parcoursError || parcoursData) && (
          <div style={{ padding: mobile ? '0 16px 16px' : '0 24px 18px' }}>
            {parcoursLoading && (
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>Lecture du parcours…</p>
            )}
            {parcoursError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span style={{ fontSize: 11, color: '#ef4444', flex: 1 }}>⚠ {parcoursError}</span>
                <button onClick={() => { setParcoursFile(null); setParcoursData(null); setParcoursError(null) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            )}
            {parcoursData && (
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {/* En-tête : nom + métriques + supprimer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{parcoursData.name}</span>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                    {parcoursData.distance != null && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        <strong style={{ color: accent, fontFamily: '"DM Mono",monospace', fontSize: 13 }}>{parcoursData.distance}</strong> km
                      </span>
                    )}
                    {parcoursData.elevation != null && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        <strong style={{ color: 'var(--text)', fontFamily: '"DM Mono",monospace', fontSize: 13 }}>{parcoursData.elevation}</strong> m D+
                      </span>
                    )}
                    {parcoursData.distance != null && dur > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        <strong style={{ color: 'var(--text)', fontFamily: '"DM Mono",monospace', fontSize: 13 }}>
                          {Math.round((parcoursData.distance / (dur / 60)) * 10) / 10}
                        </strong> km/h
                      </span>
                    )}
                  </div>
                  <button onClick={() => { setParcoursFile(null); setParcoursData(null) }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-dim)', cursor: 'pointer', fontSize: 10, padding: '3px 10px', flexShrink: 0 }}>
                    Supprimer
                  </button>
                </div>

                {/* Carte GPS Leaflet */}
                {parcoursData.gpsTrace && parcoursData.gpsTrace.length > 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <GPSMapWrapper
                      trace={parcoursData.gpsTrace}
                      accent={accent}
                      hoveredKm={hoveredKm}
                      elevationProfile={parcoursData.elevationProfile}
                    />
                  </div>
                )}

                {/* Graphique altimétrique interactif */}
                {parcoursData.elevationProfile.length > 1 && (
                  <>
                    <ElevationChart
                      profile={parcoursData.elevationProfile}
                      totalKm={parcoursData.distance ?? parcoursData.elevationProfile[parcoursData.elevationProfile.length - 1].distKm}
                      accent={accent}
                      onHover={setHoveredKm}
                      terrainBlocks={blocks.filter(b => b._startKm != null).map((b, idx) => ({
                        label: b.label,
                        startKm: b._startKm!,
                        endKm: b._endKm!,
                        zone: b.zone,
                        value: b.value,
                        blockIdx: idx,
                      }))}
                      onBlockEdgeDrag={(blockIdx, edge, newKm) => {
                        setBlocks(prev => prev.map((b, i) => {
                          if (i !== blockIdx) return b
                          const updated = { ...b }
                          if (edge === 'start') updated._startKm = newKm
                          else updated._endKm = newKm
                          // Recalculate duration if FTP available
                          if (athleteData?.ftp && updated._startKm != null && updated._endKm != null) {
                            const distKm = Math.abs(updated._endKm - updated._startKm)
                            // approximate gradient from elevation profile
                            const startPt = parcoursData.elevationProfile.find(p => p.distKm >= updated._startKm!)
                            const endPt = parcoursData.elevationProfile.find(p => p.distKm >= updated._endKm!)
                            const grad = startPt && endPt && distKm > 0
                              ? ((endPt.ele - startPt.ele) / (distKm * 1000)) * 100
                              : 0
                            const watts = parseFloat(updated.value) || athleteData.ftp * 0.75
                            const mins = estimateTimeOnSegment(distKm, grad, watts, athleteWeight, bikeWeight)
                            updated.durationMin = Math.max(1, Math.round(mins))
                          }
                          return updated
                        }))
                      }}
                    />
                    {sport === 'bike' && athleteData?.ftp && (
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={generateBlocksFromTerrain}
                          disabled={terrainLoading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 8, border: `1px solid ${accent}40`,
                            background: `${accent}12`, color: accent,
                            fontSize: 11, fontWeight: 700, cursor: terrainLoading ? 'not-allowed' : 'pointer',
                            opacity: terrainLoading ? 0.6 : 1,
                          }}
                        >
                          {terrainLoading ? '…' : '⛰ Planifier depuis le parcours'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* SÉPARATEUR 2 — entre Description et Construction */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '12px 16px' : '16px 24px', opacity: 0.5 }} />

        {/* CONSTRUCTEUR */}
        <div style={{ padding: mobile ? '24px 16px 24px' : '24px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={lbl}>Construction de la séance</span>
            <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', borderRadius: 7, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <button onClick={() => setBuilderTab('manual')} style={{
                padding: '6px 14px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: builderTab === 'manual' ? `${accent}18` : 'transparent',
                color: builderTab === 'manual' ? accent : 'var(--text-dim)',
              }}>Manuel</button>
              <button onClick={() => setBuilderTab('ai')} style={{
                padding: '6px 14px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: builderTab === 'ai' ? `${accent}18` : 'transparent',
                color: builderTab === 'ai' ? accent : 'var(--text-dim)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 11 }}>✦</span> IA
              </button>
            </div>
          </div>

          {builderTab === 'manual' ? (
            isStrength && !isEdit && blocks.length === 0 ? (
              /* Mode création manuel : constructeur par exercices (circuits) */
              <ExerciseListBuilder
                sport={sport}
                exercises={exercises}
                onChange={setExercises}
                onCircuitsChange={(c, m) => { gymCircuitsRef.current = c; gymCircuitMapRef.current = m }}
              />
            ) : (
              /* Mode IA ou edit : blocs générés (avec circuit_headers) */
              <BlockBuilder sport={sport} blocks={blocks} onChange={setBlocks} nutritionItems={nutritionItems} exoHistory={exoHistory} />
            )
          ) : (
            <div style={{ borderRadius: 12, border: `1px solid ${accent}15`, padding: mobile ? '14px' : '18px', background: `${accent}05` }}>
              <div style={{ position: 'relative' as const }}>
                <textarea value={aiPrompt}
                  onChange={e => {
                    const val = e.target.value
                    setAiPrompt(val)
                    if (aiError) setAiError(null)
                    // Détecter slash command sur la dernière ligne
                    const lastLine = val.split('\n').pop() ?? ''
                    const m = lastLine.match(/\/([\w]*)$/)
                    if (m) { setShowSlashMenu(true); setSlashFilter(m[1].toLowerCase()) }
                    else { setShowSlashMenu(false) }
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSlashMenu(false) }}
                  rows={6}
                  placeholder={isStrength
                    ? 'Tape / pour les types de circuits\n\nEx :\n/lap\nSquat @100kg\nBench @80kg\nx4\n\n/superset\nCurl @14kg + Triceps @20kg\nx3'
                    : 'Ex : 10×400m @3:30/km avec 1min récup, échauffement 15min...'}
                  style={{
                    width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)',
                    borderRadius: 9, color: 'var(--text)', padding: 12, fontSize: 13, outline: 'none',
                    resize: 'vertical' as const, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.6,
                    boxSizing: 'border-box' as const, minHeight: 140,
                  }} />

                {/* ── Autocomplete slash commands ── */}
                {showSlashMenu && isStrength && (() => {
                  const filtered = CIRCUIT_TYPES.filter(ct =>
                    !slashFilter || ct.slash.startsWith(slashFilter) || ct.label.toLowerCase().startsWith(slashFilter)
                  )
                  if (filtered.length === 0) return null
                  return (
                    <div style={{
                      position: 'absolute' as const, bottom: '100%', left: 0, right: 0,
                      marginBottom: 4, borderRadius: 10, overflow: 'hidden',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      boxShadow: '0 -6px 24px rgba(0,0,0,0.18)', zIndex: 20,
                    }}>
                      {filtered.map((ct, idx) => (
                        <button key={ct.id} onClick={() => {
                          const lines = aiPrompt.split('\n')
                          lines[lines.length - 1] = (lines[lines.length - 1] ?? '').replace(/\/[\w]*$/, `/${ct.slash}`)
                          setAiPrompt(lines.join('\n') + '\n')
                          setShowSlashMenu(false)
                        }} style={{
                          width: '100%', padding: '10px 14px',
                          border: 'none', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left' as const,
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <span style={{ fontSize: 14, width: 22, textAlign: 'center' as const, flexShrink: 0 }}>{ct.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>/{ct.slash}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{ct.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <button onClick={handleAIGenerate} disabled={aiLoading || !aiPrompt.trim()} style={{
                marginTop: 8, width: '100%', padding: 11, borderRadius: 9, border: 'none',
                background: aiLoading ? 'var(--border)' : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer',
                fontFamily: 'Syne, sans-serif',
              }}>{aiLoading ? 'Génération...' : 'Générer les blocs'}</button>
              {aiError && (
                <div style={{
                  marginTop: 8, padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
                  color: '#ef4444', fontSize: 11, lineHeight: 1.5, wordBreak: 'break-all' as const,
                }}>
                  {aiError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SÉPARATEUR 3 — entre Construction et Nutrition */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '12px 16px' : '16px 24px', opacity: 0.5 }} />

        {/* STRATÉGIE NUTRITIONNELLE */}
        <div style={{ padding: mobile ? '20px 16px 14px' : '20px 24px 18px' }}>
          <button onClick={() => setNutritionOpen(!nutritionOpen)} style={{
            width: '100%', padding: mobile ? '12px' : '13px', borderRadius: 10,
            border: '1px solid var(--border)', background: nutritionItems.length > 0 ? `${accent}08` : 'var(--bg-card)',
            color: nutritionItems.length > 0 ? accent : 'var(--text-dim)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: accent }}>★</span>
            Stratégie nutritionnelle
            {nutritionItems.length > 0 && (
              <span style={{ fontSize: 10, color: accent, fontFamily: 'DM Mono, monospace' }}>
                · {nutritionItems.length} ravitaillement{nutritionItems.length > 1 ? 's' : ''}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)', transform: nutritionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▾</span>
          </button>

          {nutritionOpen && (
            <div style={{
              marginTop: 10, padding: '16px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
            }}>
              {/* Toggle Manuel / IA */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', borderRadius: 7, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <button onClick={() => setNutritionTab('manual')} style={{
                    padding: '5px 12px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: nutritionTab === 'manual' ? `${accent}18` : 'transparent',
                    color: nutritionTab === 'manual' ? accent : 'var(--text-dim)',
                  }}>Manuel</button>
                  <button onClick={() => setNutritionTab('ai')} style={{
                    padding: '5px 12px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: nutritionTab === 'ai' ? `${accent}18` : 'transparent',
                    color: nutritionTab === 'ai' ? accent : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}><span style={{ fontSize: 11 }}>✦</span> IA</button>
                </div>
              </div>

              {nutritionTab === 'manual' ? (
                <>
                  {/* Liste des ravitaillements — groupés par timeMin */}
                  {nutritionItems.length > 0 && (() => {
                    const grouped: Record<number, NutritionItem[]> = {}
                    for (const item of nutritionItems) {
                      if (!grouped[item.timeMin]) grouped[item.timeMin] = []
                      grouped[item.timeMin].push(item)
                    }
                    const sortedTimes = Object.keys(grouped).map(Number).sort((a, b) => a - b)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 14 }}>
                        {sortedTimes.map(timeMin => {
                          const items = grouped[timeMin]
                          return (
                            <div key={timeMin} style={{
                              padding: '10px 14px', borderRadius: 10,
                              border: '1px solid var(--border)', background: 'var(--bg-card)',
                            }}>
                              {/* En-tête du moment */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: items.length > 0 ? 8 : 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: accent, fontFamily: '"DM Mono", monospace', minWidth: 44 }}>
                                  {timeMin === 0 ? 'Départ' : `${timeMin}'`}
                                </span>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>
                                  {items.reduce((s, x) => s + x.glucidesG, 0)}g glu
                                </span>
                              </div>
                              {/* Aliments */}
                              {items.map((item, ii) => (
                                <div key={item.id} style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'auto 1fr auto auto auto',
                                  gap: 8, alignItems: 'center',
                                  paddingBottom: ii < items.length - 1 ? 6 : 0,
                                  marginBottom: ii < items.length - 1 ? 6 : 0,
                                  borderBottom: ii < items.length - 1 ? '1px solid var(--border)' : 'none',
                                }}>
                                  {/* Type */}
                                  <select value={item.type}
                                    onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, type: e.target.value as NutritionItem['type'] } : x))}
                                    style={{ fontSize: 9, padding: '3px 6px', borderRadius: 5, border: `1px solid ${accent}44`, background: `${accent}0a`, color: accent, outline: 'none', cursor: 'pointer' }}>
                                    {NUTRITION_TYPES.map(nt => <option key={nt.id} value={nt.id}>{nt.label}</option>)}
                                  </select>
                                  {/* Nom + sélecteur produits athlète */}
                                  <div style={{ display: 'flex', flexDirection: 'column' as const, minWidth: 0, gap: 2 }}>
                                    <input value={item.name} placeholder="Aliment..."
                                      onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, name: e.target.value } : x))}
                                      style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 12, outline: 'none', minWidth: 0 }} />
                                    {athleteProducts.filter(p => p.type === item.type).length > 0 && (
                                      <select
                                        value=""
                                        onChange={e => {
                                          const prod = athleteProducts.find(p => p.name === e.target.value)
                                          if (prod) setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, name: prod.name, glucidesG: prod.glucidesG, proteinesG: prod.proteinesG, quantity: prod.quantity } : x))
                                        }}
                                        style={{ appearance: 'none' as const, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 9, cursor: 'pointer', outline: 'none' }}>
                                        <option value="">Mes produits ▾</option>
                                        {athleteProducts.filter(p => p.type === item.type).map(p => (
                                          <option key={p.name} value={p.name}>{p.name} ({p.glucidesG}g glu)</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                  {/* Glucides */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <input type="number" min={0} value={item.glucidesG}
                                      onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, glucidesG: parseInt(e.target.value) || 0 } : x))}
                                      style={{ width: 38, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: accent, fontSize: 11, fontFamily: '"DM Mono",monospace', fontWeight: 700, textAlign: 'center' as const, outline: 'none' }} />
                                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>g</span>
                                  </div>
                                  {/* Quantité */}
                                  <input value={item.quantity} placeholder="Qté"
                                    onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, quantity: e.target.value } : x))}
                                    style={{ width: 56, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 11, fontFamily: '"DM Mono",monospace', outline: 'none' }} />
                                  {/* Supprimer */}
                                  <button onClick={() => setNutritionItems(prev => prev.filter(x => x.id !== item.id))} style={{
                                    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1,
                                  }}>×</button>
                                </div>
                              ))}
                              {/* Ajouter au même moment */}
                              <button onClick={() => {
                                setNutritionItems(prev => [...prev, {
                                  id: `nut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                  timeMin, type: 'gel' as const, name: '', quantity: '1 gel',
                                  glucidesG: 25, proteinesG: 0, notes: '',
                                }])
                              }} style={{
                                marginTop: 6, background: 'none', border: 'none',
                                color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', opacity: 0.65,
                                padding: 0,
                              }}>+ ajouter à ce moment</button>
                            </div>
                          )
                        })}
                        {/* Summary */}
                        <div style={{ display: 'flex', gap: 16, padding: '4px 0', fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap' as const }}>
                          <span>Total : <strong style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{nutritionItems.reduce((s, x) => s + x.glucidesG, 0)}g</strong> glucides</span>
                          <span><strong style={{ color: accent, fontFamily: 'DM Mono, monospace' }}>
                            {dur > 0 ? Math.round(nutritionItems.reduce((s, x) => s + x.glucidesG, 0) / (dur / 60)) : 0}g/h
                          </strong></span>
                        </div>
                      </div>
                    )
                  })()}

                  <button onClick={() => {
                    const lastTime = nutritionItems.length > 0 ? Math.max(...nutritionItems.map(x => x.timeMin)) : 0
                    setNutritionItems(prev => [...prev, {
                      id: `nut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      timeMin: nutritionItems.length === 0 ? 0 : lastTime + 30,
                      type: 'gel' as const,
                      name: '', quantity: '1 gel', glucidesG: 25, proteinesG: 0, notes: '',
                    }])
                  }} style={{
                    width: '100%', padding: '9px', borderRadius: 8,
                    border: '1px dashed var(--border)', background: 'transparent',
                    color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
                  }}>+ Ajouter un ravitaillement</button>
                </>
              ) : (
                <>
                  {/* MODE IA */}
                  <textarea value={nutritionAiPrompt} onChange={e => setNutritionAiPrompt(e.target.value)} rows={3}
                    placeholder={'Ex :\n- 1 gel toutes les 30min\n- 1 barre à mi-parcours\n- Boisson isotonique toutes les 20min\n\nOu simplement : "Sortie vélo 3h, 250w moy, chaleur"'}
                    style={{
                      width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 9, color: 'var(--text)', padding: 12, fontSize: 12, outline: 'none',
                      resize: 'vertical' as const, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5,
                      boxSizing: 'border-box' as const,
                    }} />
                  <button onClick={async () => {
                    if (!nutritionAiPrompt.trim() || nutritionAiLoading) return
                    setNutritionAiLoading(true)
                    try {
                      const blocksDesc = blocks.length > 0
                        ? blocks.filter(b => b.type !== 'circuit_header').map(b => `${b.label}: ${b.durationMin}min Z${b.zone} ${b.value || ''}`).join(', ')
                        : `${SPORT_LABEL[sport]} ${formatHM(dur)}`

                      // Produits de l'athlète inclus dans le message utilisateur
                      const productCtx = athleteProducts.length > 0
                        ? `\nPRODUITS DISPONIBLES (utilise ces noms et valeurs EXACTES) :\n${athleteProducts.map(p => `- ${p.name} (${p.type}) : ${p.glucidesG}g glucides, ${p.proteinesG}g protéines, quantité : ${p.quantity}`).join('\n')}`
                        : ''
                      const fullNutritionMsg = `${nutritionAiPrompt}${productCtx}`

                      const res = await fetch('/api/coach-stream', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          messages: [{ role: 'user', content: fullNutritionMsg }],
                          sport,
                          mode: 'nutrition',
                          context: { duration: dur, blocks: blocksDesc },
                        }),
                      })
                      if (!res.ok) throw new Error(`Erreur ${res.status}`)
                      const reader = res.body?.getReader()
                      const decoder = new TextDecoder()
                      let raw = ''
                      if (reader) {
                        while (true) {
                          const { done, value } = await reader.read()
                          if (done) break
                          const chunk = decoder.decode(value, { stream: true })
                          for (const line of chunk.split('\n')) {
                            if (!line.startsWith('data: ')) continue
                            const p = line.slice(6).trim()
                            if (p === '[DONE]') continue
                            try {
                              const d = JSON.parse(p) as Record<string, unknown>
                              if (typeof d.text === 'string') raw += d.text
                            } catch { if (p !== '[DONE]') raw += p }
                          }
                        }
                      }
                      const match = raw.match(/\[[\s\S]*\]/)
                      if (match) {
                        const parsed = JSON.parse(match[0]) as Record<string, unknown>[]
                        const items: NutritionItem[] = parsed.map((p, i) => ({
                          id: `ai_nut_${Date.now()}_${i}`,
                          timeMin: typeof p.timeMin === 'number' ? p.timeMin : 0,
                          type: (['gel','barre','boisson','solide','autre'].includes(p.type as string) ? p.type : 'gel') as NutritionItem['type'],
                          name: typeof p.name === 'string' ? p.name : '',
                          quantity: typeof p.quantity === 'string' ? p.quantity : '',
                          glucidesG: typeof p.glucidesG === 'number' ? p.glucidesG : 0,
                          proteinesG: typeof p.proteinesG === 'number' ? p.proteinesG : 0,
                          notes: '',
                        }))
                        setNutritionItems(items)
                        setNutritionTab('manual')
                        setNutritionAiPrompt('')
                      } else {
                        console.error('[Nutrition IA] No JSON in response:', raw.slice(0, 300))
                      }
                    } catch (e) { console.error('[Nutrition IA]', e) }
                    finally { setNutritionAiLoading(false) }
                  }} disabled={nutritionAiLoading || !nutritionAiPrompt.trim()} style={{
                    marginTop: 8, width: '100%', padding: 11, borderRadius: 9, border: 'none',
                    background: nutritionAiLoading ? 'var(--border)' : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: nutritionAiLoading ? 'wait' : 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    opacity: !nutritionAiPrompt.trim() ? 0.5 : 1,
                  }}>
                    {nutritionAiLoading ? 'Génération...' : 'Générer la stratégie'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── BOUTON EXÉCUTION (muscu uniquement) ── */}
        {isEdit && isStrength && blocks.filter(b => b.type !== 'circuit_header').length > 0 && (
          <div style={{ padding: mobile ? '4px 16px 20px' : '4px 24px 24px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={e => { e.stopPropagation(); setExecuteMode(true) }}
              style={{
                width: 72, height: 72, borderRadius: '50%', border: 'none',
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                boxShadow: `0 4px 20px ${accent}44`,
                color: '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                gap: 2, transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <path d="M8 5v14l11-7z" fill="#fff" />
              </svg>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Lancer</span>
            </button>
          </div>
        )}

        {/* SÉPARATEUR — avant Plan A/B */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '0 16px 12px' : '0 24px 14px', opacity: 0.5 }} />

        {/* PLAN A/B */}
        <div style={{ padding: mobile ? '0 16px 12px' : '0 24px 14px' }}>
          <span style={lbl}>Plan</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['A', 'B'] as PlanVariant[]).map(p => (
              <button key={p} onClick={() => setSelPlan(p)} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: selPlan === p ? (p === 'A' ? 'rgba(0,200,224,0.10)' : 'rgba(167,139,250,0.10)') : 'var(--bg-card)',
                border: selPlan === p ? `1px solid ${p === 'A' ? '#00c8e0' : '#a78bfa'}` : '1px solid var(--border)',
                color: selPlan === p ? (p === 'A' ? '#00c8e0' : '#a78bfa') : 'var(--text-dim)',
              }}>Plan {p}</button>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ padding: mobile ? '0 16px 28px' : '0 24px 32px' }}>
          {isEdit ? (
            <>
              {/* Ligne 1 : Supprimer + Valider + (Réinitialiser IA si dispo) */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' as const }}>
                {onDelete && session && (
                  <button onClick={() => { if (confirm('Supprimer cette séance ?')) { onDelete(session.id); onClose() } }} style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Supprimer</button>
                )}
                {session?.status !== 'done' && onValidate && session && (
                  <button onClick={() => onValidate({ ...session, sport, title, time, durationMin: dur, rpe, blocks, notes: desc })} style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                    color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Valider</button>
                )}
                {session?.originalContent && (
                  <button onClick={() => {
                    const o = session.originalContent as Record<string, unknown>
                    if (typeof o.titre === 'string') setTitle(o.titre)
                    if (typeof o.duration_min === 'number') setDur(o.duration_min)
                    if (typeof o.notes === 'string') setDesc(o.notes)
                    if (typeof o.rpe === 'number') setRpe(o.rpe)
                  }} style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)',
                    color: '#f97316', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  }}>Réinitialiser IA</button>
                )}
                {onDuplicate && session && (
                  <button onClick={() => setShowDuplicateMenu(true)} style={{
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-card2)',
                    color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Dupliquer</button>
                )}
              </div>
              {/* Ligne 2 : PDF + Parcours + Favori + Fermer */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
                <button onClick={handleExportPDF} title="Exporter en PDF" style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 8.5L2 4.5h2.5V1h3v3.5H10L6 8.5Z" fill="currentColor"/><rect x="1" y="10" width="10" height="1.2" rx="0.6" fill="currentColor"/></svg>
                  PDF
                </button>
                <button onClick={() => parcoursInputRef.current?.click()} title="Importer un parcours GPX/TCX/KML" style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.5C4.07 1.5 2.5 3.07 2.5 5c0 2.5 3.5 5.5 3.5 5.5s3.5-3 3.5-5.5C9.5 3.07 7.93 1.5 6 1.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/></svg>
                  {parcoursLoading ? '…' : parcoursData ? (parcoursData.distance != null ? `${parcoursData.distance} km` : '✓') : 'Parcours'}
                </button>
                <button onClick={async () => {
                  const name = prompt('Nom du favori :', title || `${SPORT_LABEL[sport]}`)
                  if (!name) return
                  try {
                    const { createClient } = await import('@/lib/supabase/client')
                    const sb = createClient()
                    const { data: { user } } = await sb.auth.getUser()
                    if (!user) return
                    await sb.from('session_favorites').insert({
                      user_id: user.id, name, sport,
                      training_type: trainingType, blocks_data: blocks,
                      nutrition_data: nutritionItems, duration_min: dur, rpe, notes: desc,
                    })
                    alert('✓ Favori sauvegardé')
                  } catch (e) { console.error('[Fav]', e) }
                }} style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-card2)',
                  color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>★ Favori</button>
                <div style={{ flex: 1 }} />
                <button onClick={async () => {
                  if (!session?.id || saving) return
                  setSaving(true)
                  try {
                    const { createClient: cc } = await import('@/lib/supabase/client')
                    const sb = cc()
                    await sb.from('planned_sessions').update({
                      sport, title, time,
                      duration_min: dur,
                      rpe: rpe ?? null,
                      notes: desc ?? null,
                      blocks: isStrength && exercises.length > 0 && gymCircuitsRef.current.length > 0
                        ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
                        : blocks ?? [],
                      tss: tssRange.high || session.tss || null,
                      parcours_data: parcoursData ?? null,
                      nutrition_data: nutritionItems.length > 0 ? nutritionItems : null,
                      updated_at: new Date().toISOString(),
                    }).eq('id', session.id)
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2000)
                  } catch (e) { console.error('[Save]', e) }
                  finally { setSaving(false) }
                }} style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: 'none', background: saved ? '#22c55e' : 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                  transition: 'background 0.3s',
                }}>{saving ? '…' : saved ? '✓ Enregistré' : 'Enregistrer'}</button>
                <button onClick={onClose} style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Fermer</button>
              </div>
            </>
          ) : (
            /* Mode create */
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
              }}>Annuler</button>
              <button onClick={async () => {
                const name = prompt('Nom du favori :', title || `${SPORT_LABEL[sport]}`)
                if (!name) return
                try {
                  const { createClient } = await import('@/lib/supabase/client')
                  const sb = createClient()
                  const { data: { user } } = await sb.auth.getUser()
                  if (!user) return
                  await sb.from('session_favorites').insert({
                    user_id: user.id, name, sport,
                    training_type: trainingType, blocks_data: blocks,
                    nutrition_data: nutritionItems, duration_min: dur, rpe, notes: desc,
                  })
                  alert('✓ Favori sauvegardé')
                } catch (e) { console.error('[Fav]', e) }
              }} style={{
                padding: '10px 20px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
              }}>★ Favori</button>
              <div style={{ flex: 1 }} />
              <button onClick={handleSubmit} style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: accent, color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif',
              }}>Ajouter la séance</button>
            </div>
          )}
        </div>

        {/* Duplicate day menu */}
        {showDuplicateMenu && onDuplicate && session && (
          <div style={{
            position: 'fixed' as const, inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} onClick={() => setShowDuplicateMenu(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg-card)', borderRadius: 14, padding: 20,
              maxWidth: 320, width: '100%', border: '1px solid var(--border)',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Dupliquer sur quel jour ?</h3>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, i) => (
                  <button key={i} onClick={() => {
                    onDuplicate(i, { ...session, id: '', title: session.title + ' (copie)', dayIndex: i })
                    setShowDuplicateMenu(false)
                    onClose()
                  }} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8, textAlign: 'left' as const,
                    border: '1px solid var(--border)', background: 'var(--bg-card2)',
                    color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  }}>{day}</button>
                ))}
              </div>
              <button onClick={() => setShowDuplicateMenu(false)} style={{
                marginTop: 10, width: '100%', padding: 8, borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
              }}>Annuler</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}


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
    ? `${block.reps}×${fmtDuration(block.effortMin??0)} · récup ${fmtDuration(block.recoveryMin??0)}`
    : fmtDuration(block.durationMin)
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

function WeekTab({ trainingWeek }:{ trainingWeek:ReturnType<typeof usePlanning>['sessions'] }) {
  const { tasks, activities, intensities, addTask, updateTask, deleteTask } = usePlanning()
  const [editModal,       setEditModal]       = useState<WeekTask|null>(null)
  const [activityDetail,  setActivityDetail]  = useState<TrainingActivity|null>(null)
  const [mobileDayOffset,setMobileDayOffset]= useState(0)
  const [mobileView,     setMobileView]     = useState<'3days'|'today'>('3days')
  const [desktopView,    setDesktopView]    = useState<'week'|'today'>('week')
  // Sections personnalisables
  interface UserSection { id:string; name:string; color:string; isSportDefault:boolean; sortOrder:number }
  const DEFAULT_SECTIONS = [
    { name:'Sport',     color:'#3b82f6', isSportDefault:true,  sortOrder:0 },
    { name:'Travail',   color:'#8b5cf6', isSportDefault:false, sortOrder:1 },
    { name:'Personnel', color:'#f59e0b', isSportDefault:false, sortOrder:2 },
    { name:'Récup',     color:'#10b981', isSportDefault:false, sortOrder:3 },
  ]
  const [sections,         setSections]         = useState<UserSection[]>([])
  const [showSectionEditor,setShowSectionEditor]= useState(false)
  const [newSectionName,   setNewSectionName]   = useState('')
  // Tâches du jour (top zone) — checklist simple sans horaire
  interface DailyTask { id:string; text:string; done:boolean; sectionId:string|null }
  const [dailyTasks,    setDailyTasks]    = useState<DailyTask[]>([])
  const [newTaskText,   setNewTaskText]   = useState('')
  const [newTaskSection,setNewTaskSection]= useState<string|null>(null)
  // Modal Nouvelle tâche (grille)
  interface NewTaskState { text:string; description:string; startHour:number; startMin:number; durationMin:number; priority:'low'|'medium'|'high'; sectionId:string|null; subtasks:string[]; isRecurring:boolean; recurrenceDays:number[] }
  const BLANK_NEW_TASK: NewTaskState = { text:'', description:'', startHour:9, startMin:0, durationMin:60, priority:'low', sectionId:null, subtasks:[], isRecurring:false, recurrenceDays:[] }
  const [showNewTask,      setShowNewTask]      = useState(false)
  const [newTaskDefaults,  setNewTaskDefaults]  = useState<{dayIndex:number;startHour:number;startMin:number}>({dayIndex:0,startHour:9,startMin:0})
  const [newTask,          setNewTask]          = useState<NewTaskState>(BLANK_NEW_TASK)
  // Live clock for hatch + now-line
  const [currentTime, setCurrentTime] = useState(()=>new Date())
  const todayIdx = getTodayIdx()
  const dates    = getWeekDates()
  useEffect(()=>{
    const iv = setInterval(()=>setCurrentTime(new Date()), 60000)
    return ()=>clearInterval(iv)
  },[])
  // Load sections + daily tasks
  useEffect(()=>{
    ;(async()=>{
      try {
        const sb = createClient()
        const { data } = await sb.auth.getUser()
        const user = data?.user
        if (!user) return
        const today = new Date().toISOString().slice(0,10)
        // Sections
        const { data: secs } = await sb.from('user_sections').select('*').eq('user_id',user.id).order('sort_order')
        let loadedSections: UserSection[] = []
        if (!secs || secs.length===0) {
          for (const s of DEFAULT_SECTIONS) {
            const { data: ins } = await sb.from('user_sections').insert({ user_id:user.id, name:s.name, color:s.color, is_sport_default:s.isSportDefault, sort_order:s.sortOrder }).select().single()
            if (ins) loadedSections.push({ id:ins.id as string, name:ins.name as string, color:ins.color as string, isSportDefault:ins.is_sport_default as boolean, sortOrder:ins.sort_order as number })
          }
        } else {
          loadedSections = (secs as {id:string;name:string;color:string;is_sport_default:boolean;sort_order:number}[]).map(s=>({ id:s.id, name:s.name, color:s.color, isSportDefault:s.is_sport_default, sortOrder:s.sort_order }))
        }
        setSections(loadedSections)
        if (loadedSections[0]) setNewTaskSection(loadedSections[0].id)
        // Tâches du jour (top zone uniquement — pas d'horaire)
        const { data: dts } = await sb.from('daily_tasks').select('id,text,done,section_id').eq('user_id',user.id).eq('date',today).order('sort_order')
        if (dts) setDailyTasks((dts as {id:string;text:string;done:boolean;section_id:string|null}[]).map(t=>({id:t.id,text:t.text,done:t.done,sectionId:t.section_id})))
      } catch { /* ignore */ }
    })()
  },[])

  async function addDailyTask() {
    if (!newTaskText.trim()) return
    const sb = createClient()
    const { data } = await sb.auth.getUser()
    const user = data?.user
    if (!user) return
    const today = new Date().toISOString().slice(0,10)
    const { data: ins } = await sb.from('daily_tasks').insert({ user_id:user.id, date:today, text:newTaskText.trim(), done:false, section_id:newTaskSection, sort_order:dailyTasks.length }).select('id,text,done,section_id').single()
    if (ins) setDailyTasks(p=>[...p,{id:ins.id as string, text:ins.text as string, done:false, sectionId:newTaskSection}])
    setNewTaskText('')
  }
  async function toggleTask(id:string) {
    const task = dailyTasks.find(t=>t.id===id)
    if (!task) return
    const newDone = !task.done
    setDailyTasks(p=>p.map(t=>t.id===id?{...t,done:newDone}:t))
    const sb = createClient()
    await sb.from('daily_tasks').update({ done:newDone }).eq('id',id)
  }
  async function deleteDailyTask(id:string) {
    setDailyTasks(p=>p.filter(t=>t.id!==id))
    const sb = createClient()
    await sb.from('daily_tasks').delete().eq('id',id)
  }
  async function addSection() {
    if (!newSectionName.trim()) return
    const sb = createClient()
    const { data } = await sb.auth.getUser()
    const user = data?.user
    if (!user) return
    const { data: ins } = await sb.from('user_sections').insert({ user_id:user.id, name:newSectionName.trim(), color:'#6b7280', is_sport_default:false, sort_order:sections.length }).select().single()
    if (ins) setSections(p=>[...p,{ id:ins.id as string, name:ins.name as string, color:ins.color as string, isSportDefault:false, sortOrder:sections.length }])
    setNewSectionName('')
  }
  async function updateSectionName(id:string, name:string) {
    setSections(p=>p.map(s=>s.id===id?{...s,name}:s))
    const sb = createClient()
    await sb.from('user_sections').update({ name }).eq('id',id)
  }
  async function updateSectionColor(id:string, color:string) {
    setSections(p=>p.map(s=>s.id===id?{...s,color}:s))
    const sb = createClient()
    await sb.from('user_sections').update({ color }).eq('id',id)
  }
  async function deleteSection(id:string) {
    setSections(p=>p.filter(s=>s.id!==id))
    const sb = createClient()
    await sb.from('user_sections').delete().eq('id',id)
  }
  // Drag tracking for touch (week tasks)
  const touchDragRef = useRef<{id:string;fromDay:number}|null>(null)
  const touchTargetRef = useRef<number|null>(null)
  // Drag tracking for training sessions
  const sessionMouseDragRef = useRef<{realId:string;fromDay:number}|null>(null)
  const sessionTouchDragRef = useRef<{realId:string;fromDay:number;el:HTMLElement;startX:number;startY:number}|null>(null)

  const trainingTasks: WeekTask[] = trainingWeek.map(s=>{
    const sp = normalizeSportType(s.sport as string)
    return {
      id:`tr_${s.id}`, title:s.title, type:'sport' as TaskType,
      dayIndex:s.dayIndex, startHour:parseInt(s.time.split(':')[0])||6, startMin:parseInt(s.time.split(':')[1])||0,
      durationMin:s.durationMin, fromTraining:true, color:SPORT_BORDER[sp]||'#6b7280',
      sport:sp,
    }
  })

  const allTasks = [...trainingTasks, ...tasks]
  function getTasksForDay(d:number) { return allTasks.filter(t=>t.dayIndex===d) }
  // Training sessions visible for day d (exclude if a matching activity covers the same sport)
  function getVisibleTrainingSessions(d:number):WeekTask[] {
    const dayActs = activities.filter(a=>a.dayIndex===d)
    return trainingTasks.filter(t=>{
      if (t.dayIndex!==d) return false
      if (!t.sport) return true
      const covered = dayActs.some(a=>normalizeSportType(a.sport)===t.sport)
      return !covered
    })
  }
  function dayLoad(d:number) { return INTENSITY_CONFIG[(intensities[d]??'low') as DayIntensity] }

  // Move a training session in Supabase (day + time)
  async function moveTrainingSession(realId:string, toDay:number, newTime:string) {
    const sb = createClient()
    await sb.from('planned_sessions').update({ day_index:toDay, time:newTime, updated_at:new Date().toISOString() }).eq('id',realId)
    window.dispatchEvent(new Event('thw:sessions-changed'))
  }

  // Mouse drag for training sessions
  function startSessionMouseDrag(e:React.MouseEvent, realId:string, fromDay:number) {
    e.preventDefault(); e.stopPropagation()
    sessionMouseDragRef.current = {realId, fromDay}
    const onUp = async (ev:MouseEvent) => {
      document.removeEventListener('mouseup', onUp)
      if (!sessionMouseDragRef.current) return
      const target = document.elementFromPoint(ev.clientX, ev.clientY)
      const dayEl = target?.closest('[data-weekday]') as HTMLElement|null
      const toDay = dayEl ? parseInt(dayEl.dataset.weekday??'-1') : -1
      if (toDay >= 0 && dayEl) {
        const colRect = dayEl.getBoundingClientRect()
        const relY = Math.max(0, ev.clientY - colRect.top)
        const hourFrac = 5 + relY / CELL_H
        const h = Math.max(5, Math.min(23, Math.floor(hourFrac)))
        const m = Math.round(((hourFrac - Math.floor(hourFrac)) * 60) / 15) * 15
        const newTime = `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
        await moveTrainingSession(sessionMouseDragRef.current.realId, toDay, newTime)
      }
      sessionMouseDragRef.current = null
    }
    document.addEventListener('mouseup', onUp)
  }

  // Touch drag for training sessions
  function startSessionTouchDrag(e:React.TouchEvent, realId:string, fromDay:number) {
    e.stopPropagation()
    const touch = e.touches[0]
    const el = e.currentTarget as HTMLElement
    sessionTouchDragRef.current = {realId, fromDay, el, startX:touch.clientX, startY:touch.clientY}
    el.style.opacity = '0.6'; el.style.zIndex = '50'; el.style.pointerEvents = 'none'
  }
  function onSessionTouchMove(e:React.TouchEvent) {
    if (!sessionTouchDragRef.current) return
    const touch = e.touches[0]
    const { el, startX, startY } = sessionTouchDragRef.current
    el.style.transform = `translate(${touch.clientX-startX}px,${touch.clientY-startY}px)`
  }
  async function onSessionTouchEnd(e:React.TouchEvent) {
    if (!sessionTouchDragRef.current) return
    const { el, realId } = sessionTouchDragRef.current
    el.style.opacity = ''; el.style.zIndex = ''; el.style.transform = ''; el.style.pointerEvents = ''
    const touch = e.changedTouches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const dayEl = target?.closest('[data-weekday]') as HTMLElement|null
    if (dayEl) {
      const toDay = parseInt(dayEl.dataset.weekday??'-1')
      const colRect = dayEl.getBoundingClientRect()
      const relY = Math.max(0, touch.clientY - colRect.top)
      const hourFrac = 5 + relY / CELL_H
      const h = Math.max(5, Math.min(23, Math.floor(hourFrac)))
      const m = Math.round(((hourFrac - Math.floor(hourFrac)) * 60) / 15) * 15
      const newTime = `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
      if (toDay >= 0) await moveTrainingSession(realId, toDay, newTime)
    }
    sessionTouchDragRef.current = null
  }

  async function handleAddTask(t:Omit<WeekTask,'id'>) { await addTask(t) }
  async function handleUpdateTask(t:WeekTask) { await updateTask(t) }
  async function handleDeleteTask(id:string) { await deleteTask(id) }

  function sectionToType(sec:{name:string;isSportDefault:boolean}):TaskType {
    if (sec.isSportDefault) return 'sport'
    const n = sec.name.toLowerCase()
    if (n.includes('récup')||n.includes('recup')) return 'recovery'
    if (n.includes('personnel')||n.includes('perso')) return 'personal'
    return 'work'
  }

  function openNewTask(dayIndex:number, startHour:number, startMin=0) {
    const firstSec = sections.find(s=>!s.isSportDefault)
    setNewTaskDefaults({dayIndex, startHour, startMin})
    setNewTask({...BLANK_NEW_TASK, startHour, startMin, sectionId:firstSec?.id??null})
    setShowNewTask(true)
  }

  async function handleSubmitNewTask() {
    const sec = sections.find(s=>s.id===newTask.sectionId)
    await handleAddTask({
      title: newTask.text.trim() || 'Tâche',
      type: sec ? sectionToType(sec) : 'work',
      dayIndex: newTaskDefaults.dayIndex,
      startHour: newTask.startHour,
      startMin: newTask.startMin,
      durationMin: newTask.durationMin || 60,
      description: newTask.description || undefined,
      priority: newTask.priority !== 'low',
    })
    setShowNewTask(false)
    setNewTask({...BLANK_NEW_TASK, sectionId:newTask.sectionId})
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
        {/* Day headers */}
        <div style={{ display:'grid',gridTemplateColumns:`44px repeat(${cols},1fr)`,borderBottom:'1px solid var(--border)',background:'var(--bg-card2)' }}>
          <div/>
          {days.map(d=>{ const load=dayLoad(d); const isToday=d===todayIdx; return (
            <div key={d} style={{ padding:'7px 4px',textAlign:'center' as const,borderLeft:'1px solid var(--border)',position:'relative' }}>
              <p style={{ fontSize:9,color:'var(--text-dim)',textTransform:'uppercase' as const,margin:'0 0 2px' }}>{DAY_NAMES[d]}</p>
              <div style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',
                width:isToday?28:undefined,height:isToday?28:undefined,
                borderRadius:isToday?'50%':undefined,
                background:isToday?'#ef4444':undefined,
                margin:'0 auto 3px' }}>
                <span style={{ fontSize:13,fontWeight:700,color:isToday?'#fff':'var(--text)' }}>{dates[d]}</span>
              </div>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:3 }}>
                <span style={{ padding:'1px 5px',borderRadius:20,background:load.bg,border:`1px solid ${load.border}`,color:load.color,fontSize:8,fontWeight:700 }}>{load.label}</span>
                <button onClick={e=>{e.stopPropagation();openNewTask(d,9,0)}}
                  style={{ width:16,height:16,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-dim)',fontSize:11,lineHeight:1,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0 }}>+</button>
              </div>
            </div>
          )})}        </div>

        {/* Time body — column-based with absolute positioning for proportional height */}
        <div style={{ overflowY:'auto', maxHeight:'60vh' }}>
          <div style={{ display:'flex', height:HOURS.length*CELL_H, position:'relative' }}>
            {/* Hour labels column */}
            <div style={{ width:44, flexShrink:0, position:'relative', borderRight:'1px solid var(--border)' }}>
              {HOURS.map((hour,i)=>(
                <div key={hour} style={{ position:'absolute', top:i*CELL_H, left:0, right:0, height:CELL_H, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:'3px 5px 0' }}>
                  <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{String(hour).padStart(2,'0')}h</span>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {days.map(d=>{
              const isToday = d===todayIdx
              const isPast  = d<todayIdx
              const nowH    = currentTime.getHours() + currentTime.getMinutes()/60
              const totalH  = HOURS.length*CELL_H
              const hatchH  = isPast ? totalH : isToday ? Math.max(0,Math.min(totalH,(nowH-5)*CELL_H)) : 0
              const nowTop  = isToday ? Math.max(0,Math.min(totalH-1,(nowH-5)*CELL_H)) : -1
              return (
              <div key={d} data-weekday={String(d)}
                onClick={e=>{
                  const target = e.target as HTMLElement
                  if (target.closest('[data-session-id]')||target.closest('[data-task-id]')) return
                  const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
                  const relY = e.clientY - rect.top
                  const hourFrac = 5 + relY / CELL_H
                  const sh = Math.max(5, Math.min(23, Math.floor(hourFrac)))
                  const sm = Math.round(((hourFrac - Math.floor(hourFrac)) * 60) / 15) * 15 % 60
                  openNewTask(d, sh, sm)
                }}
                onDragOver={e=>{e.preventDefault();setDragOverDay(d)}}
                onDragLeave={()=>setDragOverDay(null)}
                onDrop={()=>{
                  if(touchDragRef.current&&touchDragRef.current.fromDay!==d){
                    const t=tasks.find(x=>x.id===touchDragRef.current!.id)
                    if(t) handleUpdateTask({...t,dayIndex:d})
                  }
                  setDragOverDay(null)
                }}
                style={{ flex:1, position:'relative', borderLeft:'1px solid var(--border)', overflow:'hidden' as const, background:dragOverDay===d?'rgba(0,200,224,0.04)':'transparent', cursor:'pointer' }}>
                {/* Hour grid lines */}
                {HOURS.map((_,i)=>(
                  <div key={i} style={{ position:'absolute' as const, top:i*CELL_H, left:0, right:0, height:1, background:'var(--border)', opacity:0.25, pointerEvents:'none' as const }} />
                ))}
                {/* Past / elapsed hatch overlay */}
                {hatchH>0&&(
                  <div style={{ position:'absolute' as const,top:0,left:0,right:0,height:hatchH,
                    background:'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(128,128,128,0.08) 4px,rgba(128,128,128,0.08) 5px)',
                    backgroundColor:'rgba(0,0,0,0.04)',
                    pointerEvents:'none' as const,zIndex:1 }} />
                )}
                {/* "Now" line — today only */}
                {nowTop>=0&&(
                  <div style={{ position:'absolute' as const,top:nowTop,left:0,right:0,zIndex:4,pointerEvents:'none' as const,display:'flex',alignItems:'center' }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:'#ef4444',flexShrink:0,marginLeft:-4,boxShadow:'0 0 4px rgba(239,68,68,0.55)' }}/>
                    <div style={{ flex:1,height:1.5,background:'#ef4444',boxShadow:'0 0 4px rgba(239,68,68,0.3)' }}/>
                  </div>
                )}
                {/* Activities (Strava/Training imports) — full proportional height */}
                {activities.filter(a=>a.dayIndex===d).map(a=>{
                  const sp=normalizeSportType(a.sport)
                  const col=SPORT_BORDER[sp]||'#6b7280'
                  const actMin=Math.round(a.elapsedTime/60)
                  const topPx=Math.max(0,(a.startHour-5+a.startMin/60)*CELL_H)
                  const heightPx=Math.max(actMin/60*CELL_H,28)
                  return (
                    <div key={a.id} onClick={e=>{e.stopPropagation();setActivityDetail(a)}}
                      style={{ position:'absolute' as const,top:topPx,height:heightPx,left:3,right:3,borderRadius:5,
                        padding:'3px 5px',background:`${col}18`,borderLeft:`3px solid ${col}`,
                        cursor:'pointer',zIndex:2,overflow:'hidden' as const }}>
                      <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                        <SportBadge sport={sp} size="xs"/>
                        <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:col }}>{a.name}</p>
                        <span style={{ fontSize:8,background:col,color:'#fff',padding:'0 3px',borderRadius:2,fontWeight:700,flexShrink:0,marginLeft:'auto' }}>✓</span>
                      </div>
                      {heightPx>=44&&<p style={{ fontSize:8,color:'var(--text-dim)',margin:'2px 0 0',fontFamily:'DM Mono,monospace' }}>{String(a.startHour).padStart(2,'0')}:{String(a.startMin).padStart(2,'0')} · {formatHM(actMin)}</p>}
                    </div>
                  )
                })}
                {/* Training sessions — TOUJOURS bleu #3b82f6, proportional height, draggable */}
                {getVisibleTrainingSessions(d).map(t=>{
                  const SESSION_COLOR = '#3b82f6'
                  const SESSION_BG = 'rgba(59,130,246,0.12)'
                  const sport = t.sport as string
                  const topPx=Math.max(0,(t.startHour-5+t.startMin/60)*CELL_H)
                  const heightPx=Math.max(t.durationMin/60*CELL_H,28)
                  const realId=t.id.slice(3)
                  const sportAbbr = t.sport ? (SPORT_ABBR as Record<string,string>)[sport] || sport.toUpperCase().slice(0,4) : ''
                  return (
                    <div key={t.id}
                      data-session-id={t.id}
                      onMouseDown={e=>startSessionMouseDrag(e,realId,t.dayIndex)}
                      onTouchStart={e=>{e.stopPropagation();startSessionTouchDrag(e,realId,t.dayIndex)}}
                      onTouchMove={onSessionTouchMove}
                      onTouchEnd={onSessionTouchEnd}
                      onClick={e=>e.stopPropagation()}
                      style={{ position:'absolute' as const,top:topPx,height:heightPx,left:3,right:3,borderRadius:5,
                        padding:'4px 6px',background:SESSION_BG,borderLeft:`3px solid ${SESSION_COLOR}`,
                        cursor:'grab',zIndex:3,overflow:'hidden' as const,userSelect:'none' as const }}>
                      <p style={{ fontSize:9,fontWeight:700,margin:0,color:SESSION_COLOR,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{sportAbbr?`[${sportAbbr}] `:''}{t.title}</p>
                      {heightPx>=44&&<p style={{ fontSize:8,color:'var(--text-dim)',margin:'2px 0 0',fontFamily:'DM Mono,monospace' }}>{String(t.startHour).padStart(2,'0')}:{String(t.startMin).padStart(2,'0')} · {formatHM(t.durationMin)}{sportAbbr?` · ${sportAbbr}`:''}</p>}
                    </div>
                  )
                })}
                {/* Regular week tasks — couleur de leur section */}
                {getTasksForDay(d).filter(t=>!t.fromTraining&&!t.isMain).map(t=>{
                  const taskSec = sections.find(s=>{
                    if (t.type==='sport') return s.isSportDefault
                    if (t.type==='work') return !s.isSportDefault && s.sortOrder===1
                    if (t.type==='personal') return !s.isSportDefault && s.sortOrder===2
                    if (t.type==='recovery') return !s.isSportDefault && s.sortOrder===3
                    return false
                  })
                  const col = taskSec?.color ?? TASK_CONFIG[t.type].color
                  const topPx=Math.max(0,(t.startHour-5+t.startMin/60)*CELL_H)
                  const heightPx=Math.max(t.durationMin/60*CELL_H,28)
                  return (
                    <div key={t.id}
                      data-task-id={t.id}
                      draggable
                      onDragStart={e=>{e.stopPropagation();touchDragRef.current={id:t.id,fromDay:t.dayIndex}}}
                      onTouchStart={e=>onTaskTouchStart(e,t)}
                      onTouchMove={onTaskTouchMove}
                      onTouchEnd={onTaskTouchEnd}
                      onClick={e=>{e.stopPropagation();setEditModal(t)}}
                      style={{ position:'absolute' as const,top:topPx,height:heightPx,left:3,right:3,borderRadius:5,
                        padding:'3px 5px',background:`${col}18`,borderLeft:`2px solid ${col}`,
                        cursor:'pointer',zIndex:1,overflow:'hidden' as const }}>
                      {t.priority&&<span style={{ position:'absolute' as const,top:1,right:2,fontSize:8,color:'#ffb340',fontWeight:900 }}>•</span>}
                      <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:col,paddingRight:t.priority?10:0 }}>{t.title}</p>
                      {heightPx>=44&&<p style={{ fontSize:8,color:'var(--text-dim)',margin:'1px 0 0' }}>{formatDur(t.durationMin)}</p>}
                    </div>
                  )
                })}
              </div>
            )})}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* ── Tâches du jour (simple checklist) ── */}
      <div style={{ borderRadius:12,border:'1px solid var(--border)',background:'var(--bg-card2)',overflow:'hidden' }}>
        <div style={{ padding:'10px 14px 8px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
            <p style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:0 }}>Tâches du jour</p>
            <button onClick={()=>setShowSectionEditor(true)}
              style={{ fontSize:10,padding:'3px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-dim)',cursor:'pointer' }}>⚙</button>
          </div>
          {dailyTasks.length>0&&(()=>{
            const total=dailyTasks.length
            const done=dailyTasks.filter(t=>t.done).length
            const pct=Math.round((done/total)*100)
            return (
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ flex:1,height:4,borderRadius:99,background:'var(--border)',overflow:'hidden' }}>
                  <div style={{ height:'100%',borderRadius:99,transition:'width 0.3s',width:`${pct}%`,
                    background:pct===100?'#22c55e':pct>50?'#facc15':'#00c8e0' }}/>
                </div>
                <span style={{ fontSize:11,fontWeight:700,fontFamily:'"DM Mono",monospace',color:pct===100?'#22c55e':'var(--text-mid)',flexShrink:0 }}>{pct}%</span>
                <span style={{ fontSize:9,color:'var(--text-dim)',flexShrink:0 }}>{done}/{total}</span>
              </div>
            )
          })()}
        </div>
        <div style={{ padding:'8px 14px' }}>
          {dailyTasks.length>0&&(
            <div style={{ display:'flex',flexDirection:'column' as const,gap:4,marginBottom:8 }}>
              {dailyTasks.map(task=>{
                const sec=sections.find(s=>s.id===task.sectionId)
                return (
                  <div key={task.id} style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <button onClick={()=>toggleTask(task.id)} style={{
                      width:16,height:16,borderRadius:4,flexShrink:0,cursor:'pointer',padding:0,
                      border:task.done?'1.5px solid #22c55e':'1.5px solid var(--border)',
                      background:task.done?'#22c55e':'transparent',
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}>{task.done&&<span style={{ color:'#fff',fontSize:9 }}>✓</span>}</button>
                    {sec&&<span style={{ width:6,height:6,borderRadius:'50%',background:sec.color,flexShrink:0 }}/>}
                    <span style={{ fontSize:12,flex:1,color:task.done?'var(--text-dim)':'var(--text)',textDecoration:task.done?'line-through':'none' }}>{task.text}</span>
                    <button onClick={()=>deleteDailyTask(task.id)} style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:13,opacity:0.4,padding:'0 2px',lineHeight:1 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display:'flex',gap:6 }}>
            <input value={newTaskText} onChange={e=>setNewTaskText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')addDailyTask()}}
              placeholder="Ajouter une tâche..."
              style={{ flex:1,padding:'6px 10px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:11,outline:'none' }}/>
            {sections.length>0&&(
              <select value={newTaskSection??''} onChange={e=>setNewTaskSection(e.target.value||null)}
                style={{ padding:'6px 7px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:11,outline:'none',maxWidth:80 }}>
                {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal éditeur de sections ── */}
      {showSectionEditor&&(
        <div onClick={()=>setShowSectionEditor(false)}
          style={{ position:'fixed' as const,inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:400,width:'100%',maxHeight:'80vh',overflowY:'auto' as const }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Sections</h3>
              <button onClick={()=>setShowSectionEditor(false)}
                style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
            </div>
            <div style={{ display:'flex',flexDirection:'column' as const,gap:8,marginBottom:14 }}>
              {sections.map(s=>(
                <div key={s.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                  <input type="color" value={s.color} onChange={e=>updateSectionColor(s.id,e.target.value)}
                    style={{ width:28,height:28,border:'none',padding:0,cursor:'pointer',borderRadius:4,background:'none' }}/>
                  <input defaultValue={s.name} onBlur={e=>updateSectionName(s.id,e.target.value)}
                    style={{ flex:1,padding:'5px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none' }}/>
                  {s.isSportDefault&&<span style={{ fontSize:9,padding:'2px 6px',borderRadius:10,background:`${s.color}33`,color:s.color,fontWeight:700 }}>SPORT</span>}
                  {!s.isSportDefault&&(
                    <button onClick={()=>deleteSection(s.id)}
                      style={{ padding:'4px 8px',borderRadius:7,background:'rgba(255,95,95,0.1)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:11,cursor:'pointer' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:6 }}>
              <input value={newSectionName} onChange={e=>setNewSectionName(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')addSection()}}
                placeholder="Nouvelle section..."
                style={{ flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none' }}/>
              <button onClick={addSection}
                style={{ padding:'7px 14px',borderRadius:8,border:'none',background:'#00c8e0',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer' }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

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

      {editModal && <TaskEditModal task={editModal} onClose={()=>setEditModal(null)} onSave={handleUpdateTask} onDelete={handleDeleteTask}/>}
      {activityDetail && <ActivityQuickModal activity={activityDetail} onClose={()=>setActivityDetail(null)}/>}

      {/* ── Modal Nouvelle tâche (grille) ── */}
      {showNewTask && (
        <div onClick={()=>setShowNewTask(false)} style={{
          position:'fixed' as const,inset:0,zIndex:200,
          background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',padding:16,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:'var(--bg-card)',borderRadius:18,padding:22,
            maxWidth:440,width:'100%',border:'1px solid var(--border-mid)',
            maxHeight:'85vh',overflowY:'auto' as const,
          }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Nouvelle tâche</h3>
              <button onClick={()=>setShowNewTask(false)} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
            </div>

            {/* 1. Catégorie — sans Sport */}
            {sections.filter(s=>!s.isSportDefault).length>0&&(
              <div style={{ marginBottom:14 }}>
                <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Catégorie</p>
                <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const }}>
                  {sections.filter(s=>!s.isSportDefault).map(s=>(
                    <button key={s.id} onClick={()=>setNewTask(t=>({...t,sectionId:s.id}))} style={{
                      padding:'5px 12px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',
                      background:newTask.sectionId===s.id?`${s.color}20`:'transparent',
                      border:newTask.sectionId===s.id?`1.5px solid ${s.color}`:'1px solid var(--border)',
                      color:newTask.sectionId===s.id?s.color:'var(--text-dim)',
                      display:'flex',alignItems:'center',gap:5,
                    }}>
                      <span style={{ width:6,height:6,borderRadius:'50%',background:s.color,display:'inline-block' }}/>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Titre */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Titre</p>
              <input value={newTask.text} onChange={e=>setNewTask(t=>({...t,text:e.target.value}))}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey)handleSubmitNewTask()}}
                placeholder="Nom de la tâche" autoFocus
                style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:14,fontWeight:600,outline:'none',boxSizing:'border-box' as const }}/>
            </div>

            {/* 3. Description */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Description</p>
              <textarea value={newTask.description} onChange={e=>setNewTask(t=>({...t,description:e.target.value}))}
                placeholder="Détails, notes, liens..." rows={3}
                style={{ width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-mid)',fontSize:12,outline:'none',resize:'vertical' as const,fontFamily:'"DM Sans",sans-serif',lineHeight:1.5,boxSizing:'border-box' as const }}/>
            </div>

            {/* 4. Horaire */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Horaire</p>
              <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' as const }}>
                <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                  <span style={{ fontSize:10,color:'var(--text-dim)' }}>Début</span>
                  <input type="number" min={0} max={23} value={newTask.startHour}
                    onChange={e=>setNewTask(t=>({...t,startHour:parseInt(e.target.value)||0}))}
                    style={{ width:40,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
                  <span style={{ color:'var(--text-dim)' }}>:</span>
                  <input type="number" min={0} max={59} step={5} value={newTask.startMin}
                    onChange={e=>setNewTask(t=>({...t,startMin:parseInt(e.target.value)||0}))}
                    style={{ width:40,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                  <span style={{ fontSize:10,color:'var(--text-dim)' }}>Durée</span>
                  <input type="number" min={0} max={12}
                    value={Math.floor((newTask.durationMin||0)/60)}
                    onChange={e=>{ const h=parseInt(e.target.value)||0; const m=(newTask.durationMin||0)%60; setNewTask(t=>({...t,durationMin:h*60+m})) }}
                    style={{ width:36,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
                  <span style={{ fontSize:10,color:'var(--text-dim)' }}>h</span>
                  <input type="number" min={0} max={59} step={5}
                    value={(newTask.durationMin||0)%60}
                    onChange={e=>{ const h=Math.floor((newTask.durationMin||0)/60); const m=parseInt(e.target.value)||0; setNewTask(t=>({...t,durationMin:h*60+m})) }}
                    style={{ width:36,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
                  <span style={{ fontSize:10,color:'var(--text-dim)' }}>min</span>
                </div>
                {(newTask.durationMin||0)>0&&(
                  <span style={{ fontSize:11,color:'var(--text-dim)',fontFamily:'"DM Mono",monospace' }}>
                    → {String(Math.floor((newTask.startHour*60+newTask.startMin+(newTask.durationMin||0))/60)%24).padStart(2,'0')}:{String((newTask.startHour*60+newTask.startMin+(newTask.durationMin||0))%60).padStart(2,'0')}
                  </span>
                )}
              </div>
            </div>

            {/* 5. Priorité */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Priorité</p>
              <div style={{ display:'flex',gap:5 }}>
                {([['low','Basse','#6b7280'],['medium','Moyenne','#f97316'],['high','Haute','#ef4444']] as ['low'|'medium'|'high',string,string][]).map(([id,label,color])=>(
                  <button key={id} onClick={()=>setNewTask(t=>({...t,priority:id}))} style={{
                    padding:'5px 12px',borderRadius:7,fontSize:10,fontWeight:600,cursor:'pointer',
                    background:newTask.priority===id?`${color}15`:'transparent',
                    border:newTask.priority===id?`1.5px solid ${color}`:'1px solid var(--border)',
                    color:newTask.priority===id?color:'var(--text-dim)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* 6. Sous-tâches */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Sous-tâches</p>
              {newTask.subtasks.map((st,i)=>(
                <div key={i} style={{ display:'flex',gap:6,alignItems:'center',marginBottom:4 }}>
                  <span style={{ fontSize:10,color:'var(--text-dim)',width:14 }}>{i+1}.</span>
                  <input value={st}
                    onChange={e=>{ const upd=[...newTask.subtasks]; upd[i]=e.target.value; setNewTask(t=>({...t,subtasks:upd})) }}
                    placeholder="Étape..."
                    style={{ flex:1,padding:'5px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:11,outline:'none' }}/>
                  <button onClick={()=>setNewTask(t=>({...t,subtasks:t.subtasks.filter((_,j)=>j!==i)}))}
                    style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:12,opacity:0.5 }}>×</button>
                </div>
              ))}
              <button onClick={()=>setNewTask(t=>({...t,subtasks:[...t.subtasks,'']}))} style={{
                padding:'5px 10px',borderRadius:6,border:'1px dashed var(--border)',
                background:'transparent',color:'var(--text-dim)',fontSize:10,cursor:'pointer',
              }}>+ Sous-tâche</button>
            </div>

            {/* 7. Récurrence */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                <button onClick={()=>setNewTask(t=>({...t,isRecurring:!t.isRecurring}))} style={{
                  width:18,height:18,borderRadius:4,cursor:'pointer',
                  border:newTask.isRecurring?'1.5px solid #00c8e0':'1.5px solid var(--border)',
                  background:newTask.isRecurring?'#00c8e0':'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center',padding:0,
                }}>
                  {newTask.isRecurring&&<span style={{ color:'#fff',fontSize:10 }}>✓</span>}
                </button>
                <span style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)' }}>Tâche récurrente</span>
              </div>
              {newTask.isRecurring&&(
                <div style={{ display:'flex',gap:4,flexWrap:'wrap' as const }}>
                  {(['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] as string[]).map((day,i)=>(
                    <button key={i} onClick={()=>setNewTask(t=>({
                      ...t,recurrenceDays:t.recurrenceDays.includes(i)?t.recurrenceDays.filter(d=>d!==i):[...t.recurrenceDays,i],
                    }))} style={{
                      width:32,height:32,borderRadius:6,fontSize:9,fontWeight:600,cursor:'pointer',
                      background:newTask.recurrenceDays.includes(i)?'#00c8e0':'var(--bg-card2)',
                      border:newTask.recurrenceDays.includes(i)?'none':'1px solid var(--border)',
                      color:newTask.recurrenceDays.includes(i)?'#fff':'var(--text-dim)',
                    }}>{day}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>setShowNewTask(false)} style={{
                flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',
                background:'transparent',color:'var(--text-dim)',fontSize:12,cursor:'pointer',
              }}>Annuler</button>
              <button onClick={handleSubmitNewTask} style={{
                flex:1,padding:10,borderRadius:8,border:'none',
                background:sections.find(s=>s.id===newTask.sectionId)?.color??'#6366f1',
                color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',
              }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
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
          <span style={{ width:10,height:10,borderRadius:'50%',background:'var(--gty-text)',display:'inline-block',flexShrink:0,opacity:0.7 }} />
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'var(--gty-text)',opacity:0.6,margin:'0 0 2px' }}>Goal of the Year</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:'var(--gty-text)',margin:'0 0 2px' }}>{gty.name}</p>
            {gty.goal && <p style={{ fontSize:12,color:'var(--gty-text)',opacity:0.7,margin:0 }}>{gty.goal}</p>}
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
                    <span style={{ width:6,height:6,borderRadius:'50%',background:r.level==='gty'?'var(--gty-text)':cfg.color,display:'inline-block',flexShrink:0 }} />
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
                {dr.map(r=>{ const cfg=RACE_CONFIG[r.level]; return <div key={r.id} onClick={e=>{e.stopPropagation();setDetailModal(r)}} style={{ borderRadius:3,padding:'1px 3px',background:cfg.bg,border:`1px solid ${cfg.border}44`,cursor:'pointer' }}><p style={{ fontSize:7,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:r.level==='gty'?'var(--gty-text)':cfg.color }}>{r.name}</p></div> })}
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
              {nextRace.goal && <p style={{ fontSize:11,color:'var(--text-mid)',margin:0 }}>{nextRace.goal}</p>}
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
              <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:level==='gty'?'var(--text)':cfg.color,margin:'0 0 5px' }}>{cfg.label} ({lr.length})</p>
              {lr.map(r=>{ const days=daysUntil(r.date),past=days<0; return (
                <div key={r.id} style={{ display:'flex',alignItems:'center',gap:11,padding:'11px 13px',borderRadius:10,background:past?'var(--bg-card2)':cfg.bg,border:`1px solid ${past?'var(--border)':cfg.border+'44'}`,marginBottom:5,opacity:past?0.65:1 }}>
                  <div style={{ textAlign:'center' as const,minWidth:40,flexShrink:0 }}>
                    <p style={{ fontFamily:'Syne,sans-serif',fontSize:past?13:18,fontWeight:800,color:past?'var(--text-dim)':level==='gty'?'var(--gty-text)':cfg.color,margin:0,lineHeight:1 }}>{past?'✓':days}</p>
                    <p style={{ fontSize:8,color:'var(--text-dim)',margin:0 }}>{past?'Passée':'jours'}</p>
                  </div>
                  <div style={{ flex:1,minWidth:0,cursor:'pointer' }} onClick={()=>setDetailModal(r)}>
                    <p style={{ fontSize:12,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{r.name}</p>
                    <p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>{new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})} · {SPORT_LABEL[r.sport as SportType]}</p>
                    {r.goal && <p style={{ fontSize:9,color:'var(--text-mid)',margin:'1px 0 0' }}>{r.goal}</p>}
                  </div>
                  <button onClick={()=>setEditModal(r)} style={{ padding:'4px 8px',borderRadius:7,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>Edit</button>
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
          {(['gty','main','important','secondary'] as RaceLevel[]).map(l=>{ const cfg=RACE_CONFIG[l]; return <button key={l} onClick={()=>setLevel(l)} style={{ padding:'8px 10px',borderRadius:9,border:'1px solid',cursor:'pointer',textAlign:'left' as const,borderColor:level===l?cfg.border:'var(--border)',background:level===l?cfg.bg:'var(--bg-card2)' }}><p style={{ fontSize:11,fontWeight:600,margin:0,color:level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text)' }}>{cfg.label}</p></button> })}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:9,marginBottom:12 }}>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Nom</p><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Ironman Nice" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
          <div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Date</p><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%',padding:'7px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }}/></div>
        </div>
        {sport==='run'&&<div style={{ marginBottom:12 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Distance</p><div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:8 }}>{RUN_DISTANCES.map(d=><button key={d} onClick={()=>setRunDist(d)} style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',borderColor:runDist===d?'#22c55e':'var(--border)',background:runDist===d?'rgba(34,197,94,0.10)':'var(--bg-card2)',color:runDist===d?'#22c55e':'var(--text-mid)',fontSize:11,cursor:'pointer' }}>{d}</button>)}</div><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4 }}>Objectif de temps</p><input value={goalTime} onChange={e=>setGoalTime(e.target.value)} placeholder="Ex: 1h25:00" style={{ width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none' }}/></div>}
        {sport==='triathlon'&&<div style={{ marginBottom:12 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:7 }}>Distance</p><div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:10 }}>{TRI_DISTANCES.map(d=><button key={d} onClick={()=>setTriDist(d)} style={{ padding:'8px 12px',borderRadius:9,border:'1px solid',borderColor:triDist===d?'#a855f7':'var(--border)',background:triDist===d?'rgba(168,85,247,0.10)':'var(--bg-card2)',cursor:'pointer',textAlign:'left' as const }}><p style={{ fontSize:12,fontWeight:600,margin:0,color:triDist===d?'#a855f7':'var(--text)' }}>{d}</p><p style={{ fontSize:10,color:'var(--text-dim)',margin:'2px 0 0' }}>Nat {TRI_SWIM[d]} · Vélo {TRI_BIKE[d]} · Run {TRI_RUN[d]}</p></button>)}</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>{[{l:'Natation',v:goalSwim,s:setGoalSwim,p:'32:00'},{l:'Vélo',v:goalBike,s:setGoalBike,p:'2h25'},{l:'Run',v:goalRun,s:setGoalRun,p:'1h35'},{l:'Total',v:goalTime,s:setGoalTime,p:'4h40'}].map(x=><div key={x.l}><p style={{ fontSize:10,color:'var(--text-dim)',marginBottom:3 }}>{x.l}</p><input value={x.v} onChange={e=>x.s(e.target.value)} placeholder={x.p} style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>)}</div></div>}
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
        <div style={{ marginBottom:10 }}><p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6 }}>Niveau</p><div style={{ display:'flex',gap:5,flexWrap:'wrap' as const }}>{(['secondary','important','main','gty'] as RaceLevel[]).map(l=>{ const cfg=RACE_CONFIG[l]; return <button key={l} onClick={()=>setForm({...form,level:l})} style={{ padding:'4px 9px',borderRadius:7,border:'1px solid',borderColor:form.level===l?cfg.border:'var(--border)',background:form.level===l?cfg.bg:'var(--bg-card2)',color:form.level===l?l==='gty'?'var(--gty-text)':cfg.color:'var(--text-mid)',fontSize:10,cursor:'pointer',fontWeight:form.level===l?700:400 }}>{cfg.label}</button> })}</div></div>
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
              <span style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:race.level==='gty'?'var(--gty-text)':cfg.color,fontSize:9,fontWeight:700 }}>{cfg.label}</span>
              {race.hyroxCategory && <span style={{ fontSize:9,color:'var(--text-dim)' }}>{race.hyroxCategory} · {race.hyroxLevel} · {race.hyroxGender}</span>}
            </div>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>{race.name}</h3>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:'3px 0 0' }}>{SPORT_LABEL[race.sport as SportType] ?? race.sport} · {new Date(race.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            {race.runDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'2px 0 0' }}>{race.runDistance} — {RUN_KM[race.runDistance]}km</p>}
            {race.triDistance && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'2px 0 0' }}>{race.triDistance} · Nat {TRI_SWIM[race.triDistance]} · Vélo {TRI_BIKE[race.triDistance]} · Run {TRI_RUN[race.triDistance]}</p>}
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:5,marginBottom:14 }}>
          {(['detail','validate'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:'7px',borderRadius:9,border:'1px solid',borderColor:tab===t?RACE_SPORT_COLOR[race.sport].border:'var(--border)',background:tab===t?RACE_SPORT_COLOR[race.sport].bg:'var(--bg-card2)',color:tab===t?RACE_SPORT_COLOR[race.sport].border:'var(--text-mid)',fontSize:11,fontWeight:tab===t?600:400,cursor:'pointer' }}>
              {t==='detail'?'Détail':'Valider résultats'}
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
                {race.goal        && <p style={{ fontSize:13,fontWeight:600,margin:'0 0 3px' }}>{race.goal}</p>}
                {race.goalTime    && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>Objectif : {race.goalTime}</p>}
                {race.goalSwimTime&& <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>Natation : {race.goalSwimTime}</p>}
                {race.goalBikeTime&& <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>Vélo : {race.goalBikeTime}</p>}
                {race.goalRunTime && <p style={{ fontSize:11,color:'var(--text-mid)',margin:'1px 0' }}>Run : {race.goalRunTime}</p>}
                {race.strategy   && <p style={{ fontSize:11,color:'var(--text-dim)',margin:'4px 0 0',lineHeight:1.5 }}>{race.strategy}</p>}
              </div>
            </div>
            {/* Résultats déjà validés */}
            {race.validated && vd.vTime && (
              <div style={{ padding:'10px 14px',borderRadius:11,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',marginBottom:12 }}>
                <p style={{ fontSize:11,fontWeight:700,color:'#00c8e0',margin:'0 0 6px' }}>✓ Résultats validés</p>
                {vd.vTime      && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>Temps : {vd.vTime}</p>}
                {vd.vKm        && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>Distance : {vd.vKm} km</p>}
                {vd.vSpeed     && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>Vitesse : {vd.vSpeed}</p>}
                {vd.vElevation && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>Dénivelé : {vd.vElevation}m</p>}
                {/* Triathlon splits */}
                {vd.vSwimTime  && <p style={{ fontSize:12,margin:'2px 0',fontFamily:'DM Mono,monospace' }}>Nat: {vd.vSwimTime} · Vélo: {vd.vBikeTime} · Run: {vd.vRunTime}</p>}
              </div>
            )}
            <div style={{ display:'flex',gap:7 }}>
              <button onClick={()=>onDelete(race.id)} style={{ padding:'8px 11px',borderRadius:9,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:11,cursor:'pointer' }}>Supprimer</button>
              <button onClick={onEdit} style={{ padding:'8px 11px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:11,cursor:'pointer' }}>Modifier</button>
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
                {[{l:'Natation',k:'vSwimTime',p:'32:00'},{l:'Vélo',k:'vBikeTime',p:'2h25:00'},{l:'Run',k:'vRunTime',p:'1h35:00'},{l:'Total',k:'vTime',p:'4h40:00'},{l:'T1',k:'vT1',p:'2:30'},{l:'T2',k:'vT2',p:'1:45'}].map(x=>(
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
