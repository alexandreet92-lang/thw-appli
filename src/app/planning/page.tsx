'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import { AnimatedBar, CountUp } from '@/components/ui/AnimatedBar'
import { SkeletonPlanningGrid } from '@/components/ui/Skeleton'
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '@/components/ui/ScrollReveal'
import { formatDuration } from '@/lib/utils'
import { TrainingBlockSummary } from '@/app/planning/components/TrainingBlockSummary'
import { segmentElevationProfile, getSignificantClimbs } from '@/lib/gpx/parser'
import type { ParsedSegment } from '@/lib/gpx/parser'
import nDynamic from 'next/dynamic'
const AIPanelDynamic = nDynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { PLANNING_ONBOARDING } from '@/onboarding/configs/planning.config'
import { Dumbbell, CalendarDays, LayoutDashboard } from 'lucide-react'
import { SectionLayout } from '@/components/navigation/SectionLayout'
import { TrainingSummary } from '@/app/planning/components/training/TrainingSummary'
import { SessionEditor } from '@/components/planning/SessionEditor'
import type { NutritionItem, ParcoursData } from '@/components/planning/SessionEditor'

// ── Types ─────────────────────────────────────────
export type PlanVariant   = 'A' | 'B'
export type WeekRange     = 1 | 5 | 10
export type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
export type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym' | 'elliptique'
type SessionStatus = 'planned' | 'done'
export type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown' | 'circuit_header'
export type CircuitType   = 'series' | 'circuit' | 'superset' | 'emom' | 'tabata'
export type BlockMode     = 'single' | 'interval' | CircuitType
type TaskType      = 'sport' | 'work' | 'personal' | 'recovery'
type RaceLevel     = 'secondary' | 'important' | 'main' | 'gty'
type CalView       = 'year' | 'month'
export type TrainingView  = 'horizontal' | 'vertical'
type RaceSport     = 'run' | 'trail' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'
export type CyclingSub    = 'velo' | 'vtt' | 'ht'

// ── Constants ─────────────────────────────────────
export const SPORT_BG: Record<SportType,string>     = { swim:'rgba(6,182,212,0.13)', run:'rgba(249,115,22,0.13)', bike:'rgba(59,130,246,0.13)', hyrox:'rgba(239,68,68,0.13)', gym:'rgba(139,92,246,0.13)', rowing:'rgba(20,184,166,0.13)', elliptique:'rgba(168,85,247,0.13)' }
export const SPORT_BORDER: Record<SportType,string> = { swim:'#06b6d4', run:'#f97316', bike:'#3b82f6', hyrox:'#ef4444', gym:'#8b5cf6', rowing:'#14b8a6', elliptique:'#a855f7' }

export const SPORT_LABEL: Record<SportType,string>  = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation', rowing:'Aviron', elliptique:'Elliptique' }
export const SPORT_ABBR: Record<SportType,string>   = { run:'RUN', bike:'BIKE', swim:'SWIM', hyrox:'HRX', gym:'GYM', rowing:'ROW', elliptique:'ELLIP' }
// Label court (maquette grille semaine) : Run/Bike/Swim/Gym/Hyrox…
export const SPORT_SHORT: Record<SportType,string>  = { run:'Run', bike:'Bike', swim:'Swim', hyrox:'Hyrox', gym:'Gym', rowing:'Row', elliptique:'Ellip' }
export const CYCLING_SUB_LABEL: Record<CyclingSub,string> = { velo:'Vélo route', vtt:'VTT', ht:'Home Trainer' }
export const TRAINING_TYPES: Partial<Record<SportType,string[]>> = {
  run:        ['EF','SL1','SL2','VMA','Strides','Heat Training','Mixte'],
  bike:       ['EF','SL1','SL2','PMA','Sprints','Heat Training','Mixte'],
  swim:       ['EF','Technique','Seuil','Sprints','Mixte'],
  hyrox:      ['Simulation','Ergo','Wall Ball','BBJ','Fentes','Sled Push','Sled Pull','Farmer Carry','Mixte'],
  gym:        ['Strength','Strength endurance','Explosivité','Mixte'],
  rowing:     ['EF','SL1','SL2','PMA','Sprints','Mixte'],
  elliptique: ['EF','SL1','SL2','PMA','Heat Training','Mixte'],
}
export const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const ZONE_COLORS_7 = ['#6b7280', '#4ade80', '#facc15', '#fb923c', '#f87171', '#c084fc', '#ec4899']
const ZONE_LABELS_7 = ['Z1 Récup', 'Z2 End.', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2', 'Z6 Anaé.', 'Z7 Sprint']
const TASK_CONFIG: Record<TaskType,{label:string;color:string;bg:string}> = {
  sport:    { label:'Sport',     color:'#22c55e', bg:'rgba(34,197,94,0.15)'   },
  work:     { label:'Travail',   color:'#3b82f6', bg:'rgba(59,130,246,0.15)'  },
  personal: { label:'Personnel', color:'#a78bfa', bg:'rgba(167,139,250,0.15)' },
  recovery: { label:'Récup',     color:'#ffb340', bg:'rgba(255,179,64,0.15)'  },
}
export const RACE_CONFIG: Record<RaceLevel,{label:string;color:string;bg:string;border:string}> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'#22c55e' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'#f97316' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'#ef4444' },
  gty:       { label:'GTY',        color:'var(--gty-text)', bg:'var(--gty-bg)', border:'var(--gty-border)' },
}
const RACE_SPORT_COLOR: Record<RaceSport,{border:string;bg:string}> = {
  run:     { border:'#f97316', bg:'rgba(249,115,22,0.13)'  },
  trail:   { border:'#84cc16', bg:'rgba(132,204,22,0.13)'  },
  bike:    { border:'#3b82f6', bg:'rgba(59,130,246,0.13)'  },
  swim:    { border:'#06b6d4', bg:'rgba(6,182,212,0.13)'   },
  hyrox:   { border:'#ef4444', bg:'rgba(239,68,68,0.13)'   },
  triathlon:{ border:'#a855f7',bg:'rgba(168,85,247,0.13)'  },
  rowing:  { border:'#14b8a6', bg:'rgba(20,184,166,0.13)'  },
}
export const INTENSITY_CONFIG: Record<DayIntensity,{label:string;color:string;bg:string;border:string}> = {
  recovery: { label:'Récup', color:'#9ca3af', bg:'rgba(156,163,175,0.10)', border:'rgba(156,163,175,0.25)' },
  low:      { label:'Low',   color:'#22c55e', bg:'rgba(34,197,94,0.10)',   border:'rgba(34,197,94,0.25)'   },
  mid:      { label:'Mid',   color:'#ffb340', bg:'rgba(255,179,64,0.10)',  border:'rgba(255,179,64,0.25)'  },
  hard:     { label:'Hard',  color:'#ff5f5f', bg:'rgba(255,95,95,0.10)',   border:'rgba(255,95,95,0.25)'   },
}
export const INTENSITY_ORDER: DayIntensity[] = ['recovery','low','mid','hard']
export const BLOCK_TYPE_LABEL: Record<BlockType,string> = { warmup:'Échauffement', effort:'Effort', recovery:'Récupération', cooldown:'Retour calme', circuit_header:'Circuit' }
export const CIRCUIT_TYPES: Array<{ id: CircuitType; label: string; desc: string; icon: string; slash: string }> = [
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
export const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

// ── Interfaces ────────────────────────────────────
export interface TrainingActivity {
  id:string; sport:string; name:string; startedAt:string
  elapsedTime:number; dayIndex:number; weekStart:string
  distance?:number; startHour:number; startMin:number
  tss?:number
  matchedSessionId?:string
}
export interface Block {
  id:string; mode:BlockMode; type:BlockType; durationMin:number; zone:number; value:string; hrAvg:string; label:string
  reps?:number; effortMin?:number; recoveryMin?:number; recoveryZone?:number; recoveryValue?:string
  // Terrain planning — km sur le parcours (overlay ElevationChart)
  _startKm?: number; _endKm?: number
}
export interface Session {
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
  parcoursData?: ParcoursData
  parcoursId?: string
  nutritionItems?: NutritionItem[]
}
interface WeekTask {
  id:string; title:string; type:TaskType; dayIndex:number
  startHour:number; startMin:number; durationMin:number
  description?:string; priority?:boolean; fromTraining?:boolean; color?:string
  isMain?:boolean; sport?:SportType
  sectionId?:string
  subtasks?:{label:string;done:boolean}[]
  isRecurring?:boolean
  recurrenceDays?:number[]
}
export interface Race {
  id:string; name:string; sport:RaceSport; date:string; level:RaceLevel
  goal?:string; strategy?:string
  runDistance?:string; triDistance?:string
  hyroxCategory?:string; hyroxLevel?:string; hyroxGender?:string
  goalTime?:string; goalSwimTime?:string; goalBikeTime?:string; goalRunTime?:string
  validated?:boolean; validationData?:Record<string,any>
}

// ── Helpers ───────────────────────────────────────
export function uid():string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function hMinToMin(h:number,m:number):number { return h*60+m }
function minToHMin(total:number):{ h:number; m:number } { const r=Math.round(total); return { h:Math.floor(r/60), m:r%60 } }
export function formatHM(totalMin:number):string {
  const h=Math.floor(totalMin/60), m=Math.round(totalMin%60)
  if(h===0) return `${m}min`
  return m===0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`
}
/** Affiche des minutes décimales en format min:sec — ex: 6.4 → "6:24" */
export function fmtDuration(min: number): string {
  const m = Math.floor(min)
  const s = Math.round((min % 1) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
// Keep formatDur as alias for backward compat in display
function formatDur(min:number):string { return formatHM(min) }
export function daysUntil(d:string):number { return Math.ceil((new Date(d).getTime()-Date.now())/(1000*60*60*24)) }

// Phase 5 — Détecte si la séance a été modifiée par l'athlète vs la version IA originale
export function isSessionModified(s: Session): boolean {
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
export function normalizeBlock(raw:unknown):Block|null {
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
  const zone        = typeof r.zone         === 'number' ? Math.max(1, Math.min(7, r.zone)) : 1
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

  const recoveryValue = typeof r.watts_recup === 'number' && r.watts_recup > 0 ? String(r.watts_recup) : undefined
  return { id, mode, type, durationMin, zone, value, hrAvg:'', label, reps, effortMin, recoveryMin, recoveryZone, recoveryValue }
}

export function normalizeBlocks(raw:unknown):Block[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeBlock).filter((b):b is Block => b !== null)
}

// Parse un bloc muscu pour en extraire la structure exercice :
//   nom, sets × reps, charge si présente.
// Le Coach IA produit des labels libres type "Squat 4×10 @100kg" ou
// "Développé couché 3 séries × 8 reps". Si rien ne matche, on retourne
// le label brut comme nom.
export function parseGymExercise(b:Block): {
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
// Formate une date en "YYYY-MM-DD" en utilisant l'heure LOCALE (pas UTC).
// toISOString() retourne UTC — en UTC+1/+2 (France), entre minuit et 2h du matin
// la date UTC est encore celle du jour précédent → mauvaise semaine chargée.
export function localDateStr(d:Date):string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function getWeekStart():string {
  const now=new Date(); const dow=now.getDay()===0?6:now.getDay()-1;
  const m=new Date(now); m.setDate(now.getDate()-dow);
  const ws = localDateStr(m)
  // Debug — comparer entre appareils. Doit retourner la même chaîne YYYY-MM-DD
  // sur Windows, iPhone, Mac. Si différent → timezone shift.
  if (typeof window !== 'undefined') {
    console.log('[weekStart debug]', {
      weekStart: ws,
      nowISO: now.toISOString(),
      tzOffsetMin: now.getTimezoneOffset(),
      dow,
    })
  }
  return ws
}

// Mappe le sport interne → nom attendu par /api/session-builder
export const SPORT_TO_BUILDER: Record<SportType, string> = {
  run: 'running', bike: 'cycling', swim: 'natation',
  hyrox: 'hyrox', gym: 'gym', rowing: 'rowing', elliptique: 'cycling',
}

// Convertit une zone string (Z1-Z7, SL1, SL2, EF, VMA, PMA…) → numéro 1-7
export function parseZoneStr(s: string): number {
  const z = s.toUpperCase().trim()
  if (['EF','Z1','RECOVERY'].includes(z))                          return 1
  if (['Z2'].includes(z))                                          return 2
  if (['SL1','Z3','TEMPO'].includes(z))                           return 3
  if (['SL2','Z4','SEUIL','THRESHOLD'].includes(z))               return 4
  if (['VMA','PMA','Z5','VO2MAX','MAX'].includes(z))              return 5
  if (['Z6','ANAEROBIE','ANAEROBIC','ANAÉ','ANAE'].includes(z))   return 6
  if (['Z7','SPRINT','NEURO','NEUROMUSCULAR'].includes(z))        return 7
  const n = parseInt(z.replace(/\D/g,''))
  return isNaN(n) ? 3 : Math.max(1, Math.min(7, n))
}

// Convertit un bloc /api/session-builder → Block utilisé dans le constructeur
export function sessionBuilderBlocToBlock(b: {
  nom: string
  repetitions: number
  duree_effort: number
  recup: number
  zone_effort: string[]
  zone_recup: string[]
  watts: number | null
  watts_recup?: number | null
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
  const recoveryValue = b.watts_recup != null && b.watts_recup > 0 ? String(b.watts_recup) : undefined
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
      recoveryValue,
    }
  }
  return {
    id, mode: 'single', type, zone, value,
    hrAvg: b.fc_cible ? String(b.fc_cible) : '',
    label, durationMin: b.duree_effort,
  }
}
export function getTodayIdx():number { const d=new Date().getDay(); return d===0?6:d-1 }

export const ATHLETE = { ftp:301, thresholdPace:248, css:88 }
export function getZone(sport:SportType,v:string):number {
  if(!v)return 1
  if(sport==='bike'){ const w=parseInt(v)||0,f=ATHLETE.ftp; if(w<f*0.55)return 1;if(w<f*0.75)return 2;if(w<f*0.87)return 3;if(w<f*1.05)return 4;if(w<f*1.20)return 5;if(w<f*1.50)return 6;return 7 }
  if(sport==='run'){ const s=parsePace(v),t=ATHLETE.thresholdPace; if(s>t*1.25)return 1;if(s>t*1.10)return 2;if(s>t*1.00)return 3;if(s>t*0.90)return 4;return 5 }
  return 3
}

export function calcTSS(blocks:Block[], sport:SportType, totalMin?:number, rpe?:number):number {
  const IF_BY_ZONE = [0.55,0.70,0.83,0.95,1.10,1.25,1.45]
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

// ── computeSessionStats : source unique TSS + zones ──────────────────
// Remplace computeTSSRange + calcTSS séparés. Utilisé par le drawer ET
// le BlockBuilder pour garantir des chiffres cohérents.
export function computeSessionStats(
  blocks: Block[],
  sport: SportType,
  durationMin: number,
  rpe: number,
  athlete: { ftp: number | null; runThresholdPaceSec: number | null; cssSecPer100m: number | null; rowThresholdSecPer500m: number | null; ctl: number | null } | null,
): { tssLow: number; tssHigh: number; zoneDist: number[] } {
  const r = computeTSSRange(blocks, sport, durationMin, rpe, athlete)
  const zd = computeZoneDistributionSafe(blocks)
  return { tssLow: r.low, tssHigh: r.high, zoneDist: zd }
}
export function computeZoneDistributionSafe(blocks: Block[]): number[] {
  const ZONE_COUNT = 7
  const mins = new Array<number>(ZONE_COUNT).fill(0)
  for (const b of blocks) {
    const zi = Math.max(0, Math.min(ZONE_COUNT - 1, b.zone - 1))
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) {
      mins[zi] += b.reps * b.effortMin
      const rzi = Math.max(0, Math.min(ZONE_COUNT - 1, (b.recoveryZone ?? 1) - 1))
      mins[rzi] += b.reps * b.recoveryMin
    } else {
      mins[zi] += b.durationMin
    }
  }
  const total = mins.reduce((a, b) => a + b, 0) || 1
  return mins.map(m => Math.round((m / total) * 100))
}

export function computeTSSRange(
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
  const ftpForCalc = athlete?.ftp ?? null
  for (const b of blocks) {
    const zoneIdx = Math.max(0, Math.min(6, b.zone - 1))
    const ifVal = IF_BY_ZONE[zoneIdx] ?? 0.70
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) {
      const recZoneIdx = Math.max(0, Math.min(6, (b.recoveryZone ?? 1) - 1))
      const ifRec = IF_BY_ZONE[recZoneIdx] ?? 0.55
      // Fix #3: use exact watts when available (bike + FTP known)
      const wattsE = sport === 'bike' && ftpForCalc && ftpForCalc > 0 ? (parseInt(b.value || '0') || 0) : 0
      const wattsR = sport === 'bike' && ftpForCalc && ftpForCalc > 0 ? (parseInt(b.recoveryValue || '0') || 0) : 0
      const ifE = (wattsE > 0 && ftpForCalc) ? wattsE / ftpForCalc : ifVal
      const ifR = (wattsR > 0 && ftpForCalc) ? wattsR / ftpForCalc : ifRec
      baseTSS += b.reps * (b.effortMin / 60) * ifE * ifE * 100 * sf
      baseTSS += b.reps * (b.recoveryMin / 60) * ifR * ifR * 100 * sf
    } else {
      const wattsB = sport === 'bike' && ftpForCalc && ftpForCalc > 0 ? (parseInt(b.value || '0') || 0) : 0
      const ifB = (wattsB > 0 && ftpForCalc) ? wattsB / ftpForCalc : ifVal
      baseTSS += (b.durationMin / 60) * ifB * ifB * 100 * sf
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

export function getWeekDates():string[] {
  const now=new Date(); const dow=now.getDay()===0?6:now.getDay()-1
  return DAY_NAMES.map((_,i)=>{ const d=new Date(now); d.setDate(now.getDate()-dow+i); return String(d.getDate()) })
}
export function getWeekStartFromOffset(offset:number):string {
  const d=new Date(); d.setDate(d.getDate()+offset*7)
  const dow=d.getDay()===0?6:d.getDay()-1; const m=new Date(d); m.setDate(d.getDate()-dow)
  return localDateStr(m)
}
export function getWeekDatesFromStart(ws:string):string[] {
  return DAY_NAMES.map((_,i)=>{ const d=new Date(ws); d.setDate(d.getDate()+i); return String(d.getDate()) })
}
export function getWeekLabel(ws:string):string {
  const d=new Date(ws); const e=new Date(ws); e.setDate(e.getDate()+6)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]}`
}
export function normalizeSportType(s:string):SportType {
  const lower = (s??'').toLowerCase().trim()
  const m:Record<string,SportType>={
    // Course / Trail
    running:'run', run:'run', course:'run', 'course à pied':'run', 'course a pied':'run',
    trail:'run', trail_run:'run', trail_running:'run', trailrun:'run',
    hike:'run', walk:'run', randonnée:'run', randonnee:'run',
    // Vélo
    cycling:'bike', ride:'bike', bike:'bike', velo:'bike', vélo:'bike',
    cyclisme:'bike', virtual_ride:'bike', virtual_bike:'bike', virtualride:'bike',
    // Natation
    swimming:'swim', swim:'swim', natation:'swim',
    // Muscu
    weighttraining:'gym', weight_training:'gym', gym:'gym', workout:'gym',
    strengthtraining:'gym', strength_training:'gym', strength:'gym',
    musculation:'gym', muscu:'gym',
    // Aviron
    rowing:'rowing', row:'rowing', aviron:'rowing', rameur:'rowing',
    // Elliptique
    elliptical:'elliptique', elliptique:'elliptique',
    // Hyrox
    hyrox:'hyrox', hrx:'hyrox',
    // Multisport
    triathlon:'run',
  }
  return m[lower]??((['run','bike','swim','hyrox','gym','rowing','elliptique'] as SportType[]).includes(lower as SportType)?lower as SportType:'run')
}

// Retourne true si la séance est une séance repos/off (durée 0 ou sport/titre repos).
// Utilisé pour exclure les repos de tous les graphiques de PlanHeaderAndGraphics.
export function isRestSession(s: {
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

export function matchActivity(activity:TrainingActivity, sessions:Session[]):Session|null {
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

export function matchStatus(plannedMin:number, doneMin:number):{label:string;color:string} {
  const diff = (doneMin-plannedMin)/plannedMin
  if(Math.abs(diff)<=0.15) return { label:'Conforme', color:'#22c55e' }
  if(diff<-0.4) return { label:'Écourtée', color:'#ef4444' }
  if(diff>0.4)  return { label:'Prolongée', color:'#f97316' }
  if(diff<0)    return { label:'Écourtée', color:'#f97316' }
  return { label:'Prolongée', color:'#f97316' }
}

// ── SportBadge component ──────────────────────────
export function SportBadge({ sport, size='sm' }:{ sport:SportType; size?:'sm'|'xs' }) {
  const col = SPORT_BORDER[sport] ?? '#9ca3af'  // fallback gris si sport inconnu
  const abbr = SPORT_ABBR[sport] ?? '???'
  const sz = size==='xs'
    ? { fontSize:7, padding:'1px 4px', borderRadius:3 }
    : { fontSize:8, padding:'2px 5px', borderRadius:4 }
  return (
    <span style={{ background:`${col}22`, color:col, fontWeight:800, letterSpacing:'0.04em', ...sz }}>
      {abbr}
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
      sectionId:r.section_id??undefined,
      subtasks:(r.subtasks??[]) as {label:string;done:boolean}[],
      isRecurring:r.is_recurring??false,
      recurrenceDays:(r.recurrence_days??[]) as number[],
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
      parcours_id:   s.parcoursId   ?? null,
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
    if (upd.parcoursId  !== undefined) patch.parcours_id   = upd.parcoursId ?? null
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
      section_id:t.sectionId??null,
      subtasks:t.subtasks??[],
      is_recurring:t.isRecurring??false,
      recurrence_days:t.recurrenceDays??[],
    }).select().single()
    if(!error&&data) setTasks(p=>[...p,{...t,id:data.id}])
  }

  async function updateTask(t:WeekTask) {
    await supabase.from('week_tasks').update({
      title:t.title, type:t.type, start_hour:t.startHour, start_min:t.startMin,
      duration_min:t.durationMin, priority:t.priority, is_main:t.isMain??false,
      description:t.description??null,
      section_id:t.sectionId??null,
      subtasks:t.subtasks??[],
      is_recurring:t.isRecurring??false,
      recurrence_days:t.recurrenceDays??[],
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
export function InfoModal({ title, content, onClose }:{ title:string; content:React.ReactNode; onClose:()=>void }) {
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
export function ActivityQuickModal({ activity, onClose }:{ activity:TrainingActivity; onClose:()=>void }) {
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
            ...(activity.tss ? [{ label:'SM', value:`${Math.round(activity.tss)}`, mono:true, color:'#5b6fff' }] : []),
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
                  border: active ? '2px solid #06B6D4' : '1px solid var(--border)',
                  background: active ? 'rgba(6,182,212,0.10)' : 'var(--bg-card)',
                  color: active ? '#06B6D4' : 'var(--text-mid)',
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
          {[{l:'Volume prévu',v:'0h',c:'var(--text-dim)'},{l:'Volume réalisé',v:'0h',c:'#06B6D4'},{l:'TSS total',v:'0',c:'#ffb340'}].map(x=>(
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

const COACH_POS_KEY = 'coachIaPos_v2'

function AiPlanBubble({ plan }: { plan: AiTrainingPlan }) {
  const [open, setOpen] = useState(false)
  // offset from default anchor (bottom:92, right:20) — persisted
  const [offset, setOffset] = useState<{ dx: number; dy: number }>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem(COACH_POS_KEY) : null
      if (s) return JSON.parse(s)
    } catch {}
    return { dx: 0, dy: 0 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startDx: number; startDy: number; moved: boolean } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startDx: offset.dx, startDy: offset.dy, moved: false }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { dragRef.current.moved = true; setIsDragging(true) }
      if (dragRef.current.moved) {
        setOffset({ dx: dragRef.current.startDx + dx, dy: dragRef.current.startDy + dy })
      }
    }
    const onUp = (ev: MouseEvent) => {
      if (dragRef.current) {
        if (!dragRef.current.moved) setOpen(o => !o)
        const newOffset = {
          dx: dragRef.current.startDx + (ev.clientX - dragRef.current.startX),
          dy: dragRef.current.startDy + (ev.clientY - dragRef.current.startY),
        }
        try { localStorage.setItem(COACH_POS_KEY, JSON.stringify(newOffset)) } catch {}
        dragRef.current = null
        setIsDragging(false)
      }
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

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
      {/* Position de base identique à l'original : bottom 92 right 20, modifiable par offset */}
      <div style={{
        position: 'fixed',
        bottom: 92 - offset.dy,
        right: 20 - offset.dx,
        zIndex: 90,
        userSelect: 'none',
      }}>
        <button
          onMouseDown={handleMouseDown}
          title={`Coach IA — ${plan.name} · Glisser pour déplacer`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 13px 7px 10px',
            borderRadius: 24,
            border: `1px solid ${open ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.22)'}`,
            background: open
              ? 'linear-gradient(135deg,rgba(139,92,246,0.22),rgba(91,111,255,0.22))'
              : 'var(--bg-card)',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: open
              ? '0 0 0 3px rgba(139,92,246,0.14), 0 4px 16px rgba(139,92,246,0.22)'
              : '0 2px 10px rgba(0,0,0,0.14)',
          }}
        >
          <span style={{ fontSize: 9, color: 'rgba(139,92,246,0.5)', letterSpacing: '0px', marginRight: -1 }}>⠿</span>
          <span style={{ fontSize: 13 }}>✦</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: open ? '#a78bfa' : 'var(--text-mid)', whiteSpace: 'nowrap' as const }}>
            Coach IA
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
  const [isDesktopPlan, setIsDesktopPlan] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktopPlan(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
                  const inner = (
                    <div style={{ padding: isDesktopPlan ? '20px 24px' : '10px 12px', borderRadius: isDesktopPlan ? 12 : 8, background: `${accentCol}0d`, border: `1px solid ${accentCol}30`, minWidth: isDesktopPlan ? 600 : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: isDesktopPlan ? 14 : 12, fontWeight: 700, color: accentCol }}>S{selBar.weekNum} — {selBar.type}</span>
                        <button onClick={() => setSelectedWeek(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1, padding: '0 2px' }}>✕</button>
                      </div>
                      {selBar.theme && <p style={{ fontSize: 11, color: 'var(--text-mid)', margin: '0 0 10px', fontStyle: 'italic' }}>{selBar.theme}</p>}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: selBar.sportStats.length > 0 ? 12 : 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          Volume <strong style={{ color: 'var(--text)', fontFamily: 'DM Mono,monospace' }}>{formatDuration(Math.round(selBar.volume_h * 60))}</strong>
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          Séances <strong style={{ color: 'var(--text)' }}>{selBar.seanceCount}</strong>
                        </span>
                      </div>
                      {selBar.sportStats.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: isDesktopPlan ? 'repeat(auto-fit, minmax(160px,1fr))' : '1fr', gap: 6 }}>
                          {selBar.sportStats.map(({ sport, count, mins }) => (
                            <div key={sport} style={{ display: 'grid', gridTemplateColumns: '70px 22px 44px', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: sportColor(sport), textTransform: 'capitalize' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{sport}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' as const }}>{count}×</span>
                              <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: 'var(--text)', textAlign: 'right' as const }}>{formatDuration(mins)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                  if (isDesktopPlan) {
                    return (
                      <div onClick={() => setSelectedWeek(null)} style={{ position: 'fixed' as const, inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <div onClick={e => e.stopPropagation()}>
                          {inner}
                        </div>
                      </div>
                    )
                  }
                  return <div style={{ marginTop: 10 }}>{inner}</div>
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
// Estimation SM (métabolique) / SN (neuromusculaire) « prévu » depuis les blocs d'une séance.
const SM_COEF_PL = [0.6, 0.85, 1.05, 1.25, 1.45, 1.55, 1.62]
const SN_COEF_PL = [0, 0, 0.08, 0.25, 0.6, 1.1, 1.7]
function estSmSn(blocks: Block[] | undefined, durationMin: number): { sm: number; sn: number } {
  let sm = 0, sn = 0, acc = 0
  for (const b of (blocks || [])) {
    const z = Math.max(1, Math.min(7, b.zone || 1))
    const iv = b.mode === 'interval' && b.reps && b.effortMin != null
    const tot = iv ? (b.reps as number) * ((b.effortMin as number) + (b.recoveryMin || 0)) : (b.durationMin || 0)
    const eff = iv ? (b.reps as number) * (b.effortMin as number) : (b.durationMin || 0)
    sm += tot * SM_COEF_PL[z - 1]; sn += eff * SN_COEF_PL[z - 1]; acc += tot
  }
  if (acc === 0 && durationMin > 0) sm = durationMin
  return { sm: Math.round(sm), sn: Math.round(sn) }
}

function TrainingTab({ tab = 'plan' }: { tab?: 'training' | 'plan' }) {
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
  const [hoverAdd, setHoverAdd] = useState<string|null>(null)
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
  // SM / SN (remplacent le TSS dans l'onglet Plan)
  const plannedSM = allSess.reduce((s,x)=>s+estSmSn(x.blocks,x.durationMin).sm,0)
  const plannedSN = allSess.reduce((s,x)=>s+estSmSn(x.blocks,x.durationMin).sn,0)
  const doneSM = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+estSmSn(x.blocks,x.durationMin).sm,0) + allActs.reduce((s,a)=>s+(a.tss||0),0)
  const doneSN = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+estSmSn(x.blocks,x.durationMin).sn,0)

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
          + allActs.filter(a=>normalizeSportType(a.sport)===sp).reduce((a,x)=>a+x.elapsedTime/3600,0),
    plannedTSS: allSess.filter(s=>s.sport===sp).reduce((a,x)=>a+(x.tss||0),0),
    doneTSS: allSess.filter(s=>s.sport===sp&&s.status==='done').reduce((a,x)=>a+(x.tss||0),0),
    plannedSM: allSess.filter(s=>s.sport===sp).reduce((a,x)=>a+estSmSn(x.blocks,x.durationMin).sm,0),
    doneSM: allSess.filter(s=>s.sport===sp&&s.status==='done').reduce((a,x)=>a+estSmSn(x.blocks,x.durationMin).sm,0),
    plannedSN: allSess.filter(s=>s.sport===sp).reduce((a,x)=>a+estSmSn(x.blocks,x.durationMin).sn,0),
    doneSN: allSess.filter(s=>s.sport===sp&&s.status==='done').reduce((a,x)=>a+estSmSn(x.blocks,x.durationMin).sn,0),
  })).filter(s=>s.plannedH>0||s.doneH>0)

  const todaySessions = week[todayIdx]?.sessions??[]


  // Render one week grid (used for both single-week and multi-week / compare)
  function WeekGrid({ ws, plan, labelTag }:{ ws:string; plan?:PlanVariant; labelTag?:string }) {
    const w = buildWeek(ws, plan)
    const wDates = getWeekDatesFromStart(ws)
    const planColor = plan==='A'?'#06B6D4':plan==='B'?'#a78bfa':'var(--text)'
    return (
      <div style={{ background:'var(--bg-card)',border:`1px solid ${plan?planColor+'44':'var(--border)'}`,borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-card)',overflowX:'auto' }}>
        {labelTag && <div style={{ padding:'6px 14px',background:`${planColor}11`,borderBottom:`1px solid ${planColor}33`,display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontSize:10,fontWeight:700,color:planColor,letterSpacing:'0.08em',textTransform:'uppercase' as const }}>{labelTag}</span>
          <span style={{ fontSize:10,color:'var(--text-dim)' }}>{getWeekLabel(ws)}</span>
        </div>}
        <div style={{ display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',minWidth:520 }}>
          <div style={{ padding:'10px 8px', background:'transparent' }}/>
          {w.map((d,i)=>{ const cfg=INTENSITY_CONFIG[d.intensity]; const isCurrent = ws===currentWeekStart; const isPickerOpen = isCurrent && intensityPickerDay===i; return (
            <div key={d.day} style={{ padding:'9px 6px',textAlign:'center' as const,minWidth:68,margin:'6px 3px',borderRadius:10,background:'var(--bg-card)',border:i===todayIdx&&isCurrent?'1px solid rgba(34,211,238,.4)':'1px solid var(--border)' }}>
              <p style={{ fontSize:9.5,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.05em',margin:'0 0 3px',color:'var(--text-dim)' }}>{d.day}</p>
              <p style={{ fontSize:16,fontWeight:700,margin:'0 0 5px',color:i===todayIdx&&isCurrent?'#22d3ee':'var(--text)' }}>{wDates[i]}</p>
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
              onMouseEnter={()=>setHoverAdd(`${ws}_${i}`)}
              onMouseLeave={()=>setHoverAdd(h=>h===`${ws}_${i}`?null:h)}
              style={{ position:'relative' as const,borderLeft:'1px solid var(--border)',padding:'6px 4px',background:dragOver===i?'rgba(6,182,212,0.04)':'transparent',minWidth:68,minHeight:80 }}>
              {hoverAdd===`${ws}_${i}` && (
                <button onClick={()=>{setAddModalFavorites(false);setAddModal({dayIndex:i,plan:plan??activePlan,weekStart:ws})}}
                  title="Ajouter une séance"
                  style={{ position:'absolute' as const,top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:8,width:30,height:30,borderRadius:'50%',background:'#06B6D4',border:'none',color:'#fff',fontSize:18,lineHeight:1,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 10px rgba(6,182,212,0.55)' }}>+</button>
              )}
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
                    style={{ borderRadius:8,padding:'7px 9px',marginBottom:4,background:'#1b212b',borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`,cursor:'grab',opacity:s.status==='done'?0.75:1,position:'relative',overflow:'hidden' }}>
                    {/* teinte de fond par sport — très subtile */}
                    <div style={{ position:'absolute',inset:0,opacity:.08,background:SPORT_BORDER[s.sport],pointerEvents:'none' }} />
                    {s.status==='done' && <span style={{ position:'absolute',top:3,right:3,fontSize:7,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 3px',borderRadius:2,fontWeight:700,zIndex:1 }}>FAIT</span>}
                    {s.status!=='done' && isSessionModified(s) && <span title="Modifié par toi" style={{ position:'absolute',top:4,right:4,width:5,height:5,borderRadius:'50%',background:'#f97316',flexShrink:0,zIndex:1 }} />}
                    {s.planVariant && <span style={{ position:'absolute',top:3,left:3,fontSize:7,fontWeight:800,color:s.planVariant==='A'?'#06B6D4':'#a78bfa',zIndex:1 }}>{s.planVariant}</span>}
                    {/* contenu */}
                    <div style={{ position:'relative' }}>
                      <div style={{ fontSize:8,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.04em',color:'rgba(230,237,243,.38)',marginBottom:2 }}>{SPORT_SHORT[s.sport]}</div>
                      <div style={{ fontSize:11,fontWeight:600,color:'#e6edf3',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{s.title}</div>
                      <div style={{ fontSize:9.5,color:'rgba(230,237,243,.38)',marginTop:2,fontFamily:'DM Mono,monospace' }}>{s.time} · {formatHM(s.durationMin)}</div>
                    </div>
                    {/* barre de progression (réalisé/prévu) */}
                    <div style={{ position:'absolute',bottom:0,left:0,right:0,height:2,background:'rgba(255,255,255,.06)' }}>
                      <div style={{ height:'100%',background:SPORT_BORDER[s.sport],width:`${s.status==='done'?100:0}%` }} />
                    </div>
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

  // Fix #7: Only show skeleton on first load (no data yet) — avoids flash when navigating back
  // If data already exists, show it immediately while the background reload completes.
  if (loading && sessions.length === 0 && !addModal && !detailModal) return <div style={{ padding:20 }}><SkeletonPlanningGrid /></div>

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {tab === 'plan' && (<>
      {/* ── PLAN HEADER + GRAPHIQUES (visible si plan IA actif) ── */}
      {aiPlan && (
        <PlanHeaderAndGraphics plan={aiPlan} sessions={aiPlanSessions} currentWeekStart={currentWeekStart} nextRace={nextRace} onReload={() => setAiPlanReloadTick(t => t + 1)} />
      )}
      {/* ── BULLE FLOTTANTE COACH IA (visible si plan actif) ── */}
      {aiPlan && <AiPlanBubble plan={aiPlan} />}
      {/* ── BANNIÈRE PLAN À VENIR — visible quand le plan démarre dans une semaine future ── */}
      {upcomingPlan && !aiPlan && (
        <div style={{ padding:'14px 18px',borderRadius:14,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.30)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' as const }}>
          <span style={{ fontSize:22 }}>📅</span>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 2px',color:'#06B6D4' }}>
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
            style={{ padding:'8px 16px',borderRadius:9,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',flexShrink:0 }}>
            Voir la semaine 1 →
          </button>
        </div>
      )}
      </>)}
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
      )}
      {activityDetail && <ActivityQuickModal activity={activityDetail} onClose={()=>setActivityDetail(null)}/>}

      {tab === 'training' && (<>
      {/* ── Controls — desktop (ancienne interface) ── */}
      <div id="tr-ctrl-desktop" style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' as const }}>
        <div style={{ display:'flex',alignItems:'center',gap:4,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:'4px 6px' }}>
          <button onClick={()=>setWeekOffset(o=>o-weekRange)} style={{ background:'none',border:'none',color:'var(--text-mid)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:6 }}>←</button>
          <span style={{ fontSize:11,fontWeight:600,color:'var(--text)',minWidth:120,textAlign:'center' as const }}>{getWeekLabel(currentWeekStart)}</span>
          <button onClick={()=>setWeekOffset(o=>o+weekRange)} style={{ background:'none',border:'none',color:'var(--text-mid)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:6 }}>→</button>
          {weekOffset!==0&&<button onClick={()=>setWeekOffset(0)} style={{ fontSize:9,padding:'2px 6px',borderRadius:5,background:'rgba(6,182,212,0.10)',border:'1px solid rgba(6,182,212,0.25)',color:'#06B6D4',cursor:'pointer',fontWeight:600 }}>Auj.</button>}
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowRangeDd(x=>!x)} style={{ padding:'6px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:5 }}>
            {weekRange===1?'1 semaine':weekRange===5?'5 semaines':'10 semaines'} <span style={{ fontSize:9 }}>▾</span>
          </button>
          {showRangeDd&&<div style={{ position:'absolute',top:'calc(100% + 4px)',left:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:10,boxShadow:'var(--shadow)',zIndex:50,minWidth:130,padding:4 }}>
            {([1,5,10] as WeekRange[]).map(r=>(
              <button key={r} onClick={()=>{setWeekRange(r);setShowRangeDd(false)}} style={{ width:'100%',padding:'7px 12px',borderRadius:7,border:'none',background:weekRange===r?'rgba(6,182,212,0.10)':'transparent',color:weekRange===r?'#06B6D4':'var(--text-mid)',fontSize:12,cursor:'pointer',textAlign:'left' as const,fontWeight:weekRange===r?600:400 }}>
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
                    background:!compareMode&&activePlan===p?'rgba(6,182,212,0.10)':'transparent',
                    color:!compareMode&&activePlan===p?'#06B6D4':'var(--text-mid)',
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
            ? <button onClick={()=>setWeekOffset(0)} style={{ fontSize:11,padding:'5px 12px',borderRadius:20,background:'rgba(6,182,212,0.10)',border:'1px solid rgba(6,182,212,0.3)',color:'#06B6D4',cursor:'pointer',fontWeight:700 }}>Auj.</button>
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
                  background:weekRange===r?'rgba(6,182,212,0.10)':'transparent',
                  color:weekRange===r?'#06B6D4':'var(--text-mid)',
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
                    background:!compareMode&&activePlan===p?'rgba(6,182,212,0.10)':'transparent',
                    color:!compareMode&&activePlan===p?'#06B6D4':'var(--text-mid)',
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
      </>)}

      {tab === 'plan' && (<>
      {/* Résumé Entraînement (refonte design system) */}
      <TrainingSummary
        plannedMin={plannedMin} doneMin={doneMin}
        plannedN={plannedN} doneN={doneN}
        plannedTSS={plannedTSS} doneTSS={doneTSS}
        plannedSM={plannedSM} doneSM={doneSM} plannedSN={plannedSN} doneSN={doneSN}
        sportCounts={sportCounts} sportStats={sportStats}
        today={week[todayIdx] ? { day: week[todayIdx].day, date: week[todayIdx].date } : null}
        todaySessions={todaySessions}
        onOpen10w={() => setShow10w(true)}
        onOpenSession={(s) => setDetailModal(s)}
        isModified={(s) => isSessionModified(s)}
        belowVolume={<TrainingBlockSummary />}
      />
      </>)}



      {tab === 'training' && (<>
      {/* View switch */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:5 }}>
        <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>{compareMode?'Comparaison Plan A / Plan B':`Plan ${activePlan} · ${getWeekLabel(currentWeekStart)}`}</p>
        {!compareMode&&<div style={{ display:'flex',gap:6 }}>
          {([['vertical','⊟ Vertical'],['horizontal','⊞ Horizontal']] as [TrainingView,string][]).map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 11px',borderRadius:8,border:'1px solid',fontSize:11,cursor:'pointer',borderColor:view===v?'#06B6D4':'var(--border)',background:view===v?'rgba(6,182,212,0.10)':'var(--bg-card)',color:view===v?'#06B6D4':'var(--text-mid)',fontWeight:view===v?600:400 }}>{l}</button>
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
                    <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0,color:i===todayIdx?'#06B6D4':'var(--text)' }}>{d.date}</p>
                  </div>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{ padding:'2px 8px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700,cursor:'pointer' }}>{cfg.label}</button>
                  <button onClick={()=>handleChangeIntensity(i)} style={{ width:20,height:20,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}>+</button>
                </div>
                <div style={{ display:'flex',gap:4 }}>
                  <button onClick={()=>{setAddModalFavorites(false);setAddModal({dayIndex:i,plan:activePlan})}} style={{ padding:'4px 9px',borderRadius:7,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',color:'#06B6D4',fontSize:11,cursor:'pointer',fontWeight:600 }}>+ Ajouter</button>
                  {planningFavorites.length>0&&<button onClick={()=>{setAddModalFavorites(true);setAddModal({dayIndex:i,plan:activePlan})}} style={{ padding:'4px 8px',borderRadius:7,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',color:'#06B6D4',fontSize:12,cursor:'pointer' }} title="Charger un favori">★</button>}
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
                        <span style={{ fontSize:9,fontWeight:700,color:s.planVariant==='B'?'#a78bfa':'#06B6D4',marginLeft:4 }}>Plan {s.planVariant}</span>
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
      </>)}
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

  const trainingTasks: WeekTask[] = trainingWeek
    .filter(s => {
      // Exclure les séances "Repos" générées par l'IA — elles ne doivent pas apparaître
      // dans la vue Week sous forme de blocs [RUN] Repos.
      // isRestSession couvre durationMin===0 ; on ajoute un test sur le titre exact
      // pour les séances repos dont l'IA aurait mis une durée > 0.
      if (isRestSession(s)) return false
      if (/^\s*(repos|rest day|jour\s+(de\s+)?repos|off)\s*$/i.test(s.title ?? '')) return false
      return true
    })
    .map(s=>{
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

  function getTaskColor(t:WeekTask):string {
    if (t.sectionId) {
      const sec = sections.find(s=>s.id===t.sectionId)
      if (sec) return sec.color
    }
    // fallback: type → sortOrder mapping
    const sec = sections.find(s=>{
      if (t.type==='sport')    return s.isSportDefault
      if (t.type==='work')     return !s.isSportDefault && s.sortOrder===1
      if (t.type==='personal') return !s.isSportDefault && s.sortOrder===2
      if (t.type==='recovery') return !s.isSportDefault && s.sortOrder===3
      return false
    })
    return sec?.color ?? TASK_CONFIG[t.type].color
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
      sectionId: newTask.sectionId ?? undefined,
      dayIndex: newTaskDefaults.dayIndex,
      startHour: newTask.startHour,
      startMin: newTask.startMin,
      durationMin: newTask.durationMin || 60,
      description: newTask.description || undefined,
      priority: newTask.priority !== 'low',
      subtasks: newTask.subtasks.map(label=>({label,done:false})),
      isRecurring: newTask.isRecurring,
      recurrenceDays: newTask.recurrenceDays,
    })
    setShowNewTask(false)
    setNewTask({...BLANK_NEW_TASK, sectionId:newTask.sectionId})
  }

  const mobileVisibleDays = mobileView==='today' ? [todayIdx] : [mobileDayOffset,mobileDayOffset+1,mobileDayOffset+2].filter(i=>i<7)
  const desktopVisibleDays = desktopView==='today' ? [todayIdx] : [0,1,2,3,4,5,6]
  const dayLabels = DAY_NAMES.map((d,i)=>`${d} ${dates[i]}`)

  const taskCell = (t:WeekTask) => {
    const col = t.fromTraining ? (t.color||TASK_CONFIG[t.type].color) : getTaskColor(t)
    return (
      <div key={t.id} onClick={e=>{e.stopPropagation();if(!t.fromTraining)setEditModal(t)}}
        style={{ borderRadius:5,padding:'3px 5px',background:`${col}18`,borderLeft:`2px solid ${col}`,cursor:t.fromTraining?'default':'pointer',position:'relative',marginBottom:2 }}>
        {t.priority && <span style={{ position:'absolute',top:1,right:2,fontSize:8,color:'#ffb340',fontWeight:900 }}>•</span>}
        <p style={{ fontSize:9,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:col,paddingRight:t.priority?10:0 }}>{t.title}</p>
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
                style={{ flex:1, position:'relative', borderLeft:'1px solid var(--border)', overflow:'hidden' as const, background:dragOverDay===d?'rgba(6,182,212,0.04)':'transparent', cursor:'pointer' }}>
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
                  const col = getTaskColor(t)
                  const topPx=Math.max(0,(t.startHour-5+t.startMin/60)*CELL_H)
                  const heightPx=Math.max(t.durationMin/60*CELL_H,28)
                  const endTotalMin=(t.startHour*60+t.startMin+t.durationMin)%(24*60)
                  const endH=Math.floor(endTotalMin/60); const endM=endTotalMin%60
                  const timeLabel=`${t.startHour}h${t.startMin>0?String(t.startMin).padStart(2,'0'):''}–${endH}h${endM>0?String(endM).padStart(2,'0'):''}`
                  const doneCount=(t.subtasks??[]).filter(s=>s.done).length
                  const totalCount=(t.subtasks??[]).length
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
                        padding:'3px 6px',background:`${col}18`,borderLeft:`3px solid ${col}`,
                        cursor:'pointer',zIndex:1,overflow:'hidden' as const }}>
                      {t.priority&&<span style={{ position:'absolute' as const,top:1,right:2,fontSize:8,color:'#ffb340',fontWeight:900 }}>•</span>}
                      {/* Ligne 1 : titre + horaire */}
                      <div style={{ display:'flex',alignItems:'baseline',gap:4,overflow:'hidden' as const }}>
                        <p style={{ fontSize:9,fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,color:col,paddingRight:t.priority?10:0,flexShrink:1,minWidth:0 }}>{t.title}</p>
                        {heightPx>=28&&<span style={{ fontSize:7,color:col,opacity:0.75,whiteSpace:'nowrap' as const,flexShrink:0 }}>{timeLabel}</span>}
                      </div>
                      {/* Ligne 2 : description tronquée */}
                      {heightPx>=40&&t.description&&<p style={{ fontSize:7.5,color:'var(--text-dim)',margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,lineHeight:1.3 }}>{t.description}</p>}
                      {/* Ligne 3 : sous-tâches */}
                      {heightPx>=52&&totalCount>0&&<p style={{ fontSize:7,color:'var(--text-dim)',margin:'1px 0 0',opacity:0.8 }}>{doneCount}/{totalCount} sous-tâches</p>}
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
                    background:pct===100?'#22c55e':pct>50?'#facc15':'#06B6D4' }}/>
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
                style={{ padding:'7px 14px',borderRadius:8,border:'none',background:'#06B6D4',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer' }}>Ajouter</button>
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

      {editModal && <TaskEditModal task={editModal} sections={sections} onClose={()=>setEditModal(null)} onSave={handleUpdateTask} onDelete={handleDeleteTask}/>}
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
                  border:newTask.isRecurring?'1.5px solid #06B6D4':'1.5px solid var(--border)',
                  background:newTask.isRecurring?'#06B6D4':'transparent',
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
                      background:newTask.recurrenceDays.includes(i)?'#06B6D4':'var(--bg-card2)',
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

function TaskEditModal({ task, sections, onClose, onSave, onDelete }:{
  task:WeekTask; sections:{id:string;name:string;color:string;isSportDefault:boolean;sortOrder:number}[];
  onClose:()=>void; onSave:(t:WeekTask)=>void; onDelete:(id:string)=>void
}) {
  const [form, setForm] = useState<WeekTask>({
    ...task,
    subtasks: task.subtasks ?? [],
    isRecurring: task.isRecurring ?? false,
    recurrenceDays: task.recurrenceDays ?? [],
  })

  const nonSportSections = sections.filter(s=>!s.isSportDefault)
  const activeSec = form.sectionId ? sections.find(s=>s.id===form.sectionId) : null

  // end time
  const endTotalMin = (form.startHour*60 + form.startMin + form.durationMin) % (24*60)
  const endH = Math.floor(endTotalMin/60); const endM = endTotalMin%60

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:22,maxWidth:440,width:'100%',maxHeight:'85vh',overflowY:'auto' as const }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>Modifier la tâche</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>×</button>
        </div>

        {/* 1. Catégorie */}
        {nonSportSections.length>0&&(
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Catégorie</p>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const }}>
              {nonSportSections.map(s=>(
                <button key={s.id} onClick={()=>setForm(f=>({...f,sectionId:s.id}))} style={{
                  padding:'5px 12px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',
                  background:form.sectionId===s.id?`${s.color}20`:'transparent',
                  border:form.sectionId===s.id?`1.5px solid ${s.color}`:'1px solid var(--border)',
                  color:form.sectionId===s.id?s.color:'var(--text-dim)',
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
          <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
            style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:14,fontWeight:600,outline:'none',boxSizing:'border-box' as const }}/>
        </div>

        {/* 3. Description */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Description</p>
          <textarea value={form.description??''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
            placeholder="Détails, notes, liens..." rows={3}
            style={{ width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-mid)',fontSize:12,outline:'none',resize:'vertical' as const,fontFamily:'"DM Sans",sans-serif',lineHeight:1.5,boxSizing:'border-box' as const }}/>
        </div>

        {/* 4. Horaire */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Horaire</p>
          <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' as const }}>
            <div style={{ display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ fontSize:10,color:'var(--text-dim)' }}>Début</span>
              <input type="number" min={0} max={23} value={form.startHour}
                onChange={e=>setForm(f=>({...f,startHour:parseInt(e.target.value)||0}))}
                style={{ width:40,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
              <span style={{ color:'var(--text-dim)' }}>:</span>
              <input type="number" min={0} max={59} step={5} value={form.startMin}
                onChange={e=>setForm(f=>({...f,startMin:parseInt(e.target.value)||0}))}
                style={{ width:40,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ fontSize:10,color:'var(--text-dim)' }}>Durée</span>
              <input type="number" min={0} max={12} value={Math.floor(form.durationMin/60)}
                onChange={e=>{ const h=parseInt(e.target.value)||0; const m=form.durationMin%60; setForm(f=>({...f,durationMin:h*60+m})) }}
                style={{ width:36,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
              <span style={{ fontSize:10,color:'var(--text-dim)' }}>h</span>
              <input type="number" min={0} max={59} step={5} value={form.durationMin%60}
                onChange={e=>{ const h=Math.floor(form.durationMin/60); const m=parseInt(e.target.value)||0; setForm(f=>({...f,durationMin:h*60+m})) }}
                style={{ width:36,padding:'6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text)',fontSize:13,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
              <span style={{ fontSize:10,color:'var(--text-dim)' }}>min</span>
            </div>
            {form.durationMin>0&&(
              <span style={{ fontSize:11,color:'var(--text-dim)',fontFamily:'"DM Mono",monospace' }}>
                → {String(endH).padStart(2,'0')}:{String(endM).padStart(2,'0')}
              </span>
            )}
          </div>
        </div>

        {/* 5. Priorité */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Priorité</p>
          <div style={{ display:'flex',gap:5 }}>
            {([['low','Basse','#6b7280'],['medium','Moyenne','#f97316'],['high','Haute','#ef4444']] as ['low'|'medium'|'high',string,string][]).map(([id,label,color])=>{
              // priority is boolean: true = haute, false = basse
              const isSelected = id==='high'?!!form.priority:id==='low'?!form.priority:false
              return (
                <button key={id} onClick={()=>setForm(f=>({...f,priority:id!=='low'}))} style={{
                  padding:'5px 12px',borderRadius:7,fontSize:10,fontWeight:600,cursor:'pointer',
                  background:isSelected?`${color}15`:'transparent',
                  border:isSelected?`1.5px solid ${color}`:'1px solid var(--border)',
                  color:isSelected?color:'var(--text-dim)',
                }}>{label}</button>
              )
            })}
          </div>
        </div>

        {/* 6. Sous-tâches */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:9,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Sous-tâches</p>
          {(form.subtasks??[]).map((st,i)=>(
            <div key={i} style={{ display:'flex',gap:6,alignItems:'center',marginBottom:5 }}>
              <button onClick={()=>setForm(f=>({...f,subtasks:(f.subtasks??[]).map((x,j)=>j===i?{...x,done:!x.done}:x)}))} style={{
                width:18,height:18,borderRadius:4,border:`1.5px solid ${st.done?'#06B6D4':'var(--border)'}`,
                background:st.done?'#06B6D4':'transparent',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0,
              }}>{st.done&&<span style={{ color:'#fff',fontSize:10 }}>✓</span>}</button>
              <input value={st.label}
                onChange={e=>{ const upd=[...(form.subtasks??[])]; upd[i]={...upd[i],label:e.target.value}; setForm(f=>({...f,subtasks:upd})) }}
                style={{ flex:1,padding:'5px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card2)',color:st.done?'var(--text-dim)':'var(--text)',fontSize:11,outline:'none',textDecoration:st.done?'line-through':'none' }}/>
              <button onClick={()=>setForm(f=>({...f,subtasks:(f.subtasks??[]).filter((_,j)=>j!==i)}))}
                style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:14,opacity:0.5 }}>×</button>
            </div>
          ))}
          <button onClick={()=>setForm(f=>({...f,subtasks:[...(f.subtasks??[]),{label:'',done:false}]}))} style={{
            padding:'5px 10px',borderRadius:6,border:'1px dashed var(--border)',
            background:'transparent',color:'var(--text-dim)',fontSize:10,cursor:'pointer',
          }}>+ Sous-tâche</button>
        </div>

        {/* 7. Récurrence */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
            <button onClick={()=>setForm(f=>({...f,isRecurring:!f.isRecurring}))} style={{
              width:18,height:18,borderRadius:4,cursor:'pointer',
              border:form.isRecurring?'1.5px solid #06B6D4':'1.5px solid var(--border)',
              background:form.isRecurring?'#06B6D4':'transparent',
              display:'flex',alignItems:'center',justifyContent:'center',padding:0,
            }}>{form.isRecurring&&<span style={{ color:'#fff',fontSize:10 }}>✓</span>}</button>
            <span style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)' }}>Tâche récurrente</span>
          </div>
          {form.isRecurring&&(
            <div style={{ display:'flex',gap:4,flexWrap:'wrap' as const }}>
              {(['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] as string[]).map((day,i)=>(
                <button key={i} onClick={()=>setForm(f=>({
                  ...f,recurrenceDays:(f.recurrenceDays??[]).includes(i)?(f.recurrenceDays??[]).filter(d=>d!==i):[...(f.recurrenceDays??[]),i],
                }))} style={{
                  width:32,height:32,borderRadius:6,fontSize:9,fontWeight:600,cursor:'pointer',
                  background:(form.recurrenceDays??[]).includes(i)?'#06B6D4':'var(--bg-card2)',
                  border:(form.recurrenceDays??[]).includes(i)?'none':'1px solid var(--border)',
                  color:(form.recurrenceDays??[]).includes(i)?'#fff':'var(--text-dim)',
                }}>{day}</button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={()=>onDelete(task.id)} style={{ padding:'9px 12px',borderRadius:10,background:'transparent',border:'none',color:'#ff5f5f',fontSize:12,cursor:'pointer',fontWeight:600 }}>Supprimer</button>
          <button onClick={onClose} style={{ padding:'9px 14px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',color:'var(--text-dim)',fontSize:12,cursor:'pointer' }}>Annuler</button>
          <button onClick={()=>onSave(form)} style={{ flex:1,padding:10,borderRadius:10,background:activeSec?activeSec.color:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>Sauvegarder</button>
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
            <button key={v} onClick={()=>setCalView(v)} style={{ padding:'6px 12px',borderRadius:9,border:'1px solid',borderColor:calView===v?'#06B6D4':'var(--border)',background:calView===v?'rgba(6,182,212,0.10)':'var(--bg-card)',color:calView===v?'#06B6D4':'var(--text-mid)',fontSize:11,cursor:'pointer',fontWeight:calView===v?600:400 }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex',gap:6,alignItems:'center' }}>
          {raceByLevel.map(x=>{ const cfg=RACE_CONFIG[x.level]; return <span key={x.level} style={{ padding:'2px 7px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:x.level==='gty'?'var(--gty-text)':cfg.color,fontSize:9,fontWeight:700 }}>{x.count} {cfg.label}</span> })}
          <button onClick={()=>setAddModal({month:currentMonth})} style={{ padding:'6px 12px',borderRadius:9,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer' }}>+ Course</button>
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
              <div key={day} onClick={()=>setAddModal({month:currentMonth,day})} style={{ height:60,borderRadius:7,background:'var(--bg-card2)',border:`1px solid ${isToday?'#06B6D4':'var(--border)'}`,padding:'3px 4px',cursor:'pointer',display:'flex',flexDirection:'column',gap:1 }}>
                <p style={{ fontSize:10,fontWeight:isToday?700:500,color:isToday?'#06B6D4':'var(--text-mid)',margin:0,textAlign:'right' as const }}>{day}</p>
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
          <button onClick={()=>setAddModal({month:currentMonth})} style={{ padding:'9px 20px',borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer' }}>+ Ajouter une course</button>
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
  const RACE_SPORTS: RaceSport[] = ['run','trail','bike','swim','hyrox','triathlon','rowing']
  const RSL: Record<RaceSport,string> = {run:'Course à pied',trail:'Trail',bike:'Cyclisme',swim:'Natation',hyrox:'Hyrox',triathlon:'Triathlon',rowing:'Aviron'}
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
          <button onClick={()=>onSave({name:name||'Course',sport,date,level,goal:goalTime||undefined,runDistance:sport==='run'?runDist:undefined,triDistance:sport==='triathlon'?triDist:undefined,hyroxCategory:hyroxCat||undefined,hyroxLevel:hyroxLvl||undefined,hyroxGender:hyroxGen||undefined,goalTime:goalTime||undefined,goalSwimTime:goalSwim||undefined,goalBikeTime:goalBike||undefined,goalRunTime:goalRun||undefined})} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>+ Ajouter</button>
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
          <button onClick={()=>onSave(form)} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer' }}>Sauvegarder</button>
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
              <div style={{ padding:'10px 14px',borderRadius:11,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',marginBottom:12 }}>
                <p style={{ fontSize:11,fontWeight:700,color:'#06B6D4',margin:'0 0 6px' }}>✓ Résultats validés</p>
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
              <button onClick={onClose} style={{ flex:1,padding:9,borderRadius:9,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:11,cursor:'pointer' }}>Fermer</button>
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
                  <div style={{ padding:'7px 9px',borderRadius:8,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)' }}>
                    <p style={{ fontSize:9,color:'var(--text-dim)',margin:'0 0 2px' }}>Vitesse auto</p>
                    <p style={{ fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:'#06B6D4',margin:0 }}>{speed}</p>
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
  const { sessions, races, intensities, weekStart } = usePlanning()
  const { zones } = useTrainingZones()
  const { show, dismiss, reopen } = usePageOnboarding(PLANNING_ONBOARDING.pageId, PLANNING_ONBOARDING.version)

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

  const header = (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Planning</h1>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:'5px 0 0' }}>Entraînement · Semaine</p>
      </div>
      <button onClick={reopen} style={{ width:28,height:28,borderRadius:'50%',background:'rgba(6,182,212,0.1)',border:'1px solid rgba(6,182,212,0.25)',color:'#06B6D4',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>?</button>
    </div>
  )

  return (
    <>
      <PageHelp config={PLANNING_ONBOARDING} show={show} onDismiss={dismiss} />
      <SectionLayout
        header={header}
        sections={[
          { id:'training', label:'Entraînement', subtitle:'Plan détaillé',      icon:Dumbbell,        content:<TrainingTab tab="training"/> },
          { id:'plan',     label:'Plan',         subtitle:'Blocs, stats & IA',  icon:LayoutDashboard, content:<TrainingTab tab="plan"/> },
          { id:'week',     label:'Semaine',      subtitle:'Vue hebdomadaire',   icon:CalendarDays,    content:<WeekTab trainingWeek={sessions}/> },
        ]}
      />
    </>
  )
}
