'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
// import { createClient } from '@/lib/supabase/client'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import { usePlanning } from '@/hooks/usePlanning'

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
type Sport      = 'muscu' | 'running' | 'velo' | 'natation' | 'hyrox' | 'aviron' | 'triathlon'
type PageMode   = 'library' | 'build' | 'execute'
type Zone       = 1 | 2 | 3 | 4 | 5
type Intensity  = 'low' | 'moderate' | 'high' | 'max'

// — Muscu
interface Exercise {
  id: string; name: string; sets: number; reps: number
  restSec: number; note?: string; circuitId?: string
  weightKg?: number          // default weight for all series
  loadPerSet?: number[]      // override per series (length = sets)
}
interface Circuit {
  id: string; name: string; rounds: number; restBetweenRoundsSec: number
}

// — Endurance blocks (Running, Vélo, Aviron, Triathlon)
interface EnduranceBlock {
  id: string
  name: string
  // — Effort
  reps: number                         // number of repetitions (default 1)
  intervalType: 'time' | 'distance'    // time = duration-based, distance = distance-based
  effortMmSs: string                   // effort duration as "mm:ss" (e.g. "4:00", "1:30")
  effortDistanceM?: number             // if intervalType='distance': distance in meters
  zone: Zone                           // effort zone (1-5)
  targetPace?: string                  // "4:30/km" (running, aviron)
  targetWatts?: number                 // watts (velo)
  targetHrAvg?: number                 // target FC moyenne bpm
  targetHrMax?: number                 // FC max à ne pas dépasser bpm
  cadenceRpm?: number                  // RPM (velo) or CPM (aviron)
  // — Recovery
  recoveryMmSs: string                 // recovery duration as "mm:ss" (e.g. "1:00")
  recoveryZone: Zone                   // recovery zone (default 1)
  note?: string
}

// — Natation
interface SwimSet {
  id: string; reps: number; distanceM: number
  zone: Zone; restSec: number; note?: string
  targetPacePer100m?: string   // "1:35" format
}

// — Hyrox
interface HyroxStation {
  id: string; name: string; distanceM?: number
  reps?: number; durationSec?: number; restSec: number; note?: string
}

// — Template
interface MusculaireSession {
  circuits: Circuit[]; exercises: Exercise[]
}
interface EnduranceSession {
  blocks: EnduranceBlock[]
}
interface NatationSession {
  sets: SwimSet[]
}
interface HyroxSession {
  stations: HyroxStation[]
}

interface SessionTemplate {
  id: string; name: string; sport: Sport
  durationMin: number; intensity: Intensity
  typeSeance?: string[]   // from SESSION_TYPES
  tags: string[]; notes?: string
  muscu?: MusculaireSession
  endurance?: EnduranceSession
  natation?: NatationSession
  hyrox?: HyroxSession
  rpe?: number   // 1–10 target RPE
}

// — Execute state
interface ExecState {
  circuitIdx: number; exerciseIdx: number
  setsDone: number; phase: 'work' | 'rest' | 'done'
}

// ══════════════════════════════════════════════════════════════════
// SPORT CONFIG
// ══════════════════════════════════════════════════════════════════
const SESSION_TYPES: Record<string, string[]> = {
  running:    ['1500m','5k','10k','Semi','Marathon','VMA','Aérobie','SL1','SL2','Hills','Mixte'],
  velo:       ['Aérobie','SL1','SL2','PMA','Force','Vélocité','Mixte','Sprints'],
  muscu:      ['Strength','Strength endurance','Explosivité','Push','Pull','Legs','Full body','Abdos / gainage'],
  natation:   ['Technique','Seuil','Sprints','M','70.3','Ironman'],
  hyrox:      ['Compromised Run','Ergo','Spé wall ball','Spé ergo','Spé sled','Simulation'],
  aviron:     ['EF','Travail technique','Seuil','Vo2max','Sprints','Race pace'],
  triathlon:  ['Brick Run','Simulation complète'],
}

const SPORTS: { id: Sport; label: string; sub: string; color: string }[] = [
  { id:'muscu',    label:'Muscu / Renfo',  sub:'Circuits, séries, reps',   color:'#5b6fff' },
  { id:'running',  label:'Running',        sub:'Blocs, intervalles, allure',color:'#22c55e' },
  { id:'velo',     label:'Vélo / Home trainer', sub:'Watts, zones, blocs',  color:'#f97316' },
  { id:'natation', label:'Natation',       sub:'Séries, distances, zones',  color:'#00c8e0' },
  { id:'hyrox',    label:'Hyrox',          sub:'Ateliers, circuits, runs',  color:'#ef4444' },
  { id:'aviron',   label:'Aviron',         sub:'Blocs, seuil, distance',    color:'#14b8a6' },
  { id:'triathlon',label:'Triathlon',      sub:'Brick, simulation',         color:'#a855f7' },
]

const ZONE_COLOR: Record<Zone, string> = {
  1:'#5b6fff', 2:'#00c8e0', 3:'#22c55e', 4:'#f97316', 5:'#ef4444',
}
const ZONE_LABEL: Record<Zone, string> = {
  1:'Z1 — Récup', 2:'Z2 — Endurance', 3:'Z3 — Tempo', 4:'Z4 — Seuil', 5:'Z5 — VO2max',
}
const ZONE_HEIGHT: Record<Zone, number> = { 1:20, 2:36, 3:52, 4:68, 5:88 }

const HYROX_STATIONS_DEFAULT: Omit<HyroxStation, 'id'>[] = [
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'SkiErg',          distanceM:1000, restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Sled Push',       distanceM:50,   restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Sled Pull',       distanceM:50,   restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Burpee Broad Jump', reps:80,      restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Rowing',          distanceM:1000, restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Farmer Carry',    distanceM:200,  restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Lunges',          distanceM:100,  restSec:30 },
  { name:'Run',             distanceM:1000, restSec:0 },
  { name:'Wall Balls',      reps:100,       restSec:0 },
]

// ══════════════════════════════════════════════════════════════════
// MOCK TEMPLATES
// ══════════════════════════════════════════════════════════════════
/* TODO: charger depuis Supabase session_templates */
const MOCK_TEMPLATES: SessionTemplate[] = [
  {
    id:'s1', name:'Full Body Force', sport:'muscu', durationMin:60,
    intensity:'high', typeSeance:['Strength','Full body'], tags:['Force','Polyarticulaire'],
    muscu: {
      circuits:[
        { id:'c1', name:'Circuit A — Force', rounds:4, restBetweenRoundsSec:120 },
        { id:'c2', name:'Circuit B — Complément', rounds:3, restBetweenRoundsSec:90 },
      ],
      exercises:[
        { id:'e1', name:'Squat barre', sets:4, reps:5, restSec:180, circuitId:'c1' },
        { id:'e2', name:'Soulevé de terre', sets:4, reps:4, restSec:180, circuitId:'c1' },
        { id:'e3', name:'Developpé couché', sets:4, reps:6, restSec:150, circuitId:'c1' },
        { id:'e4', name:'Tractions lestées', sets:3, reps:6, restSec:120, circuitId:'c2' },
        { id:'e5', name:'Rowing barre', sets:3, reps:8, restSec:90, circuitId:'c2' },
        { id:'e6', name:'Dips', sets:3, reps:10, restSec:90, circuitId:'c2' },
      ],
    },
  },
  {
    id:'s2', name:'Upper Body Hypertrophie', sport:'muscu', durationMin:50,
    intensity:'moderate', typeSeance:['Push','Pull'], tags:['Hypertrophie','Haut du corps'],
    muscu: {
      circuits:[
        { id:'c3', name:'Circuit A — Push', rounds:4, restBetweenRoundsSec:75 },
        { id:'c4', name:'Circuit B — Pull', rounds:4, restBetweenRoundsSec:75 },
      ],
      exercises:[
        { id:'e7',  name:'Developpé couche',   sets:4, reps:10, restSec:75, circuitId:'c3' },
        { id:'e8',  name:'Developpé incline',  sets:4, reps:12, restSec:60, circuitId:'c3' },
        { id:'e9',  name:'Ecarte poulie haute',sets:3, reps:15, restSec:60, circuitId:'c3' },
        { id:'e10', name:'Tractions pronation',sets:4, reps:10, restSec:75, circuitId:'c4' },
        { id:'e11', name:'Rowing cable assis', sets:4, reps:12, restSec:60, circuitId:'c4' },
        { id:'e12', name:'Curl biceps barre',  sets:3, reps:12, restSec:60, circuitId:'c4' },
      ],
    },
  },
  {
    id:'s3', name:'Fractionne 10x400m', sport:'running', durationMin:55,
    intensity:'high', typeSeance:['VMA'], tags:['VMA','Fractionne'],
    endurance: {
      blocks:[
        { id:'b1', name:'Echauffement',    reps:1, intervalType:'time' as const, effortMmSs:'15:00', zone:2 as Zone, recoveryMmSs:'0:00', recoveryZone:1 as Zone },
        { id:'b2', name:'400m rapide',     reps:10, intervalType:'time' as const, effortMmSs:'2:00', zone:5 as Zone, recoveryMmSs:'1:30', recoveryZone:1 as Zone, targetPace:"3:45/km" },
        { id:'b3', name:'Retour au calme', reps:1, intervalType:'time' as const, effortMmSs:'10:00', zone:1 as Zone, recoveryMmSs:'0:00', recoveryZone:1 as Zone },
      ],
    },
  },
  {
    id:'s4', name:'Sortie longue Z2', sport:'running', durationMin:90,
    intensity:'low', typeSeance:['Aérobie'], tags:['Endurance','Aerobie'],
    endurance: {
      blocks:[
        { id:'b4', name:'Z2 continu', reps:1, intervalType:'time' as const, effortMmSs:'90:00', zone:2 as Zone, recoveryMmSs:'0:00', recoveryZone:1 as Zone, targetPace:"5:10/km" },
      ],
    },
  },
  {
    id:'s5', name:'Sweet Spot 2x20min', sport:'velo', durationMin:70,
    intensity:'high', typeSeance:['SL2'], tags:['Sweet Spot','FTP'],
    endurance: {
      blocks:[
        { id:'b5', name:'Echauffement',  reps:1, intervalType:'time' as const, effortMmSs:'15:00', zone:2 as Zone, recoveryMmSs:'0:00', recoveryZone:1 as Zone },
        { id:'b6', name:'Sweet Spot',    reps:2, intervalType:'time' as const, effortMmSs:'20:00', zone:4 as Zone, recoveryMmSs:'5:00', recoveryZone:1 as Zone, targetWatts:280 },
        { id:'b7', name:'Retour calme',  reps:1, intervalType:'time' as const, effortMmSs:'10:00', zone:1 as Zone, recoveryMmSs:'0:00', recoveryZone:1 as Zone },
      ],
    },
  },
  {
    id:'s6', name:'Endurance 3000m', sport:'natation', durationMin:60,
    intensity:'moderate', typeSeance:['Seuil'], tags:['Endurance','Aerobie'],
    natation: {
      sets:[
        { id:'n1', reps:1,  distanceM:400, zone:2, restSec:30,  note:'Echauffement nage libre' },
        { id:'n2', reps:4,  distanceM:50,  zone:2, restSec:15,  note:'Technique - equilibre' },
        { id:'n3', reps:8,  distanceM:100, zone:3, restSec:20 },
        { id:'n4', reps:4,  distanceM:200, zone:2, restSec:30 },
        { id:'n5', reps:1,  distanceM:400, zone:2, restSec:0,   note:'Retour au calme' },
      ],
    },
  },
  {
    id:'s7', name:'Hyrox Race Simulation', sport:'hyrox', durationMin:70,
    intensity:'max', typeSeance:['Simulation'], tags:['Race','Simulation'],
    hyrox: {
      stations: HYROX_STATIONS_DEFAULT.map((s,i) => ({ ...s, id:`h${i+1}` })),
    },
  },
]

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60); const s = sec % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// — Block computed helpers
function blockEffortMin(b: EnduranceBlock): number {
  return parseMMSS(b.effortMmSs) / 60
}
function blockRecoveryMin(b: EnduranceBlock): number {
  return parseMMSS(b.recoveryMmSs) / 60
}
function blockTotalMin(b: EnduranceBlock): number {
  return b.reps * (blockEffortMin(b) + blockRecoveryMin(b))
}
function totalEnduranceDuration(blocks: EnduranceBlock[]): number {
  return Math.round(blocks.reduce((a, b) => a + blockTotalMin(b), 0))
}

// — Smart input formatters
function formatPaceInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`
  if (digits.length === 4) return `${digits.slice(0,2)}:${digits.slice(2)}`
  return `${digits.slice(0,2)}:${digits.slice(2,4)}`
}

function formatMmSsInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length === 1) return digits
  if (digits.length === 2) return `0:${digits}`
  if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`
  if (digits.length === 4) return `${digits.slice(0,2)}:${digits.slice(2)}`
  return `${digits.slice(0,2)}:${digits.slice(2,4)}`
}
function totalSwimDistance(sets: SwimSet[]): number {
  return sets.reduce((a,s) => a + s.reps * s.distanceM, 0)
}

function intensityLabel(i: Intensity) {
  return { low:'Faible', moderate:'Modere', high:'Eleve', max:'Maximum' }[i]
}
function intensityColor(i: Intensity) {
  return { low:'#5b6fff', moderate:'#22c55e', high:'#f97316', max:'#ef4444' }[i]
}

function sportColor(s: Sport): string {
  return SPORTS.find(x => x.id===s)?.color ?? '#00c8e0'
}
function sportLabel(s: Sport): string {
  return SPORTS.find(x => x.id===s)?.label ?? s
}

function parseMMSS(s: string): number {
  const parts = s.replace(',', ':').split(':')
  return (parseInt(parts[0])||0)*60 + (parseInt(parts[1])||0)
}
function toMMSS(sec: number): string {
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`
}

// ══════════════════════════════════════════════════════════════════
// TSS ESTIMATION
// ══════════════════════════════════════════════════════════════════
function estimateTSS(
  sport: Sport,
  durationMin: number,
  intensity: Intensity,
  endurance?: EnduranceSession
): number {
  const SPORT_FACTOR: Record<Sport, number> = {
    running: 0.9, velo: 1.0, natation: 0.85, hyrox: 1.05, muscu: 0.65, aviron: 0.95, triathlon: 0.9
  }
  const IF_BY_INTENSITY: Record<Intensity, number> = {
    low: 0.60, moderate: 0.72, high: 0.85, max: 1.00
  }
  const IF_BY_ZONE = [0.55, 0.70, 0.83, 0.95, 1.10]
  const sf = SPORT_FACTOR[sport] ?? 0.9

  if (endurance && endurance.blocks.length > 0) {
    return Math.round(endurance.blocks.reduce((total, b) => {
      const effortIF = IF_BY_ZONE[b.zone - 1] ?? 0.70
      const recovIF  = IF_BY_ZONE[(b.recoveryZone ?? 1) - 1] ?? 0.55
      const effortDur = blockEffortMin(b) * b.reps
      const recovDur  = blockRecoveryMin(b) * b.reps
      return total
        + (effortDur / 60) * effortIF * effortIF * 100 * sf
        + (recovDur  / 60) * recovIF  * recovIF  * 100 * sf
    }, 0))
  }

  const IF = IF_BY_INTENSITY[intensity] ?? 0.72
  return Math.round((durationMin / 60) * IF * IF * 100 * sf)
}

// ══════════════════════════════════════════════════════════════════
// COUNTDOWN HOOK
// ══════════════════════════════════════════════════════════════════
function useCountdown(onDone?: () => void) {
  const [remaining, setRemaining] = useState(0)
  const [running,   setRunning]   = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) { setRunning(false); onDoneRef.current?.(); return }
    const id = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(id)
  }, [running, remaining])

  const start = useCallback((sec: number) => { setRemaining(sec); setRunning(true) }, [])
  const pause  = useCallback(() => setRunning(false), [])
  const stop   = useCallback(() => { setRunning(false); setRemaining(0) }, [])

  return { remaining, running, start, pause, stop }
}

// ══════════════════════════════════════════════════════════════════
// UI ATOMS
// ══════════════════════════════════════════════════════════════════
function Pill({ active, color, onClick, children }: { active:boolean; color:string; onClick:()=>void; children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding:'6px 14px', borderRadius:99,
      border:`1px solid ${active ? color : 'var(--border)'}`,
      background: active ? color : 'transparent',
      color: active ? '#fff' : 'var(--text-dim)',
      fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
      {children}
    </button>
  )
}

function ZoneBadge({ zone }: { zone: Zone }) {
  const c = ZONE_COLOR[zone]
  return (
    <span style={{ padding:'2px 8px', borderRadius:99, background:`${c}18`, border:`1px solid ${c}44`,
      fontSize:10, fontWeight:700, color:c, fontFamily:'DM Sans,sans-serif', whiteSpace:'nowrap' }}>
      {ZONE_LABEL[zone]}
    </span>
  )
}

function NumInput({ label, value, onChange, min=0, max=999 }: { label:string; value:number; onChange:(v:number)=>void; min?:number; max?:number }) {
  return (
    <div>
      <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3, fontFamily:'DM Sans,sans-serif' }}>{label}</label>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(Math.min(max, Math.max(min, +e.target.value)))}
        style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)',
          color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:13,
          textAlign:'center', boxSizing:'border-box' as const }}/>
    </div>
  )
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20,
      padding:24, boxShadow:'var(--shadow-card)', marginBottom:16, ...style }}>
      {children}
    </div>
  )
}

function MmSsInput({
  label, value, onChange, placeholder = '0:00', style: extraStyle
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; style?: React.CSSProperties
}) {
  return (
    <div>
      <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(formatMmSsInput(e.target.value))}
        placeholder={placeholder}
        style={{
          width:64, borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-card2)', color:'var(--text-main)',
          padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:13,
          textAlign:'center', boxSizing:'border-box' as const, ...extraStyle
        }}/>
    </div>
  )
}

function PaceInput({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>{label}</label>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <input
          value={value.replace('/km','').replace('/100m','').trim()}
          onChange={e => onChange(formatPaceInput(e.target.value))}
          placeholder="4:30"
          style={{ width:56, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'6px 6px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center', boxSizing:'border-box' as const }}/>
        <span style={{ fontSize:10, color:'var(--text-dim)', whiteSpace:'nowrap' }}>/km</span>
      </div>
    </div>
  )
}

function SectionHeader({ label, title, color }: { label:string; title:string; color:string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:'0 0 4px' }}>{label}</p>
      <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:0, color }}>{title}</h3>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// INTENSITY PROFILE SVG
// ══════════════════════════════════════════════════════════════════
function IntensityProfile({
  blocks,
  sport,
}: {
  blocks: EnduranceBlock[]
  sport?: Sport
}) {
  const H = 80
  const GAP = 1.5

  interface Bar {
    type: 'effort' | 'recovery'
    durationMin: number
    zone: Zone
    blockId: string
  }

  const bars: Bar[] = []
  for (const b of blocks) {
    const effortMin = blockEffortMin(b)
    const recoveryMin = blockRecoveryMin(b)
    for (let r = 0; r < b.reps; r++) {
      bars.push({ type:'effort', durationMin: effortMin, zone: b.zone, blockId: b.id })
      if (recoveryMin > 0) {
        bars.push({ type:'recovery', durationMin: recoveryMin, zone: b.recoveryZone, blockId: b.id })
      }
    }
  }

  const totalMin = bars.reduce((a, bar) => a + bar.durationMin, 0) || 1

  const EFFORT_HEIGHTS: Record<Zone, number> = { 1:15, 2:30, 3:50, 4:70, 5:90 }
  const RECOVERY_HEIGHT = 12

  const sportCol = sport ? sportColor(sport) : '#5b6fff'

  if (bars.length === 0) return null

  return (
    <div>
      <svg width="100%" height={H + 4} viewBox={`0 0 100 ${H + 4}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
        {(() => {
          let xCursor = 0
          return bars.map((bar, i) => {
            const w = (bar.durationMin / totalMin) * 100 - GAP * 0.5
            const h = bar.type === 'effort' ? EFFORT_HEIGHTS[bar.zone] : RECOVERY_HEIGHT
            const y = H - h
            const fill = bar.type === 'effort' ? sportCol : '#6b7280'
            const opacity = bar.type === 'effort' ? 0.85 : 0.35
            const x = xCursor
            xCursor += (bar.durationMin / totalMin) * 100
            return (
              <rect key={`${bar.blockId}-${bar.type}-${i}`}
                x={x} y={y} width={Math.max(w, 0.5)} height={h} rx={1.5}
                fill={fill} opacity={opacity}/>
            )
          })
        })()}
        <line x1={0} y1={H} x2={100} y2={H} stroke="var(--border)" strokeWidth={0.4}/>
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// EXERCISE DATABASE
// ══════════════════════════════════════════════════════════════════
const EXERCISE_DB = [
  // Push
  'Développé couché','Développé incliné','Développé militaire','Dips','Pompes',
  'Écarté poulie haute','Extensions triceps',
  // Pull
  'Tractions pronation','Tractions supination','Tractions lestées','Rowing barre',
  'Rowing haltère','Tirage vertical','Curl biceps barre','Curl marteau',
  // Legs
  'Squat barre','Squat gobelet','Fentes','Presse à cuisses','Leg extension',
  'Leg curl couché','Hip thrust','Soulevé de terre','Soulevé de terre roumain',
  'Mollets debout',
  // Core / Gainage
  'Gainage frontal','Gainage latéral','Crunchs','Relevés de jambes','Russian twist',
  'Roue abdominale','Bird dog',
  // Hyrox
  'Wall Balls','Farmer Carry','Sled Push','Sled Pull','SkiErg','Burpee Broad Jump',
  'Rowing ergomètre','Sandbag Lunges',
]

// ══════════════════════════════════════════════════════════════════
// MUSCU BUILDER
// ══════════════════════════════════════════════════════════════════
function MusculaireBuilder({ data, onChange }: {
  data: MusculaireSession
  onChange: (d: MusculaireSession) => void
}) {
  const { circuits, exercises } = data

  function updCircuits(c: Circuit[]) { onChange({ ...data, circuits:c }) }
  function updExercises(e: Exercise[]) { onChange({ ...data, exercises:e }) }

  function addCircuit() {
    updCircuits([...circuits, { id:uid(), name:`Circuit ${String.fromCharCode(65+circuits.length)}`, rounds:3, restBetweenRoundsSec:90 }])
  }
  function rmCircuit(id: string) {
    updCircuits(circuits.filter(c => c.id!==id))
    updExercises(exercises.filter(e => e.circuitId!==id))
  }
  function updCircuit(id: string, patch: Partial<Circuit>) {
    updCircuits(circuits.map(c => c.id===id ? { ...c, ...patch } : c))
  }

  function addExercise(circuitId: string) {
    updExercises([...exercises, { id:uid(), name:'', sets:3, reps:10, restSec:60, circuitId }])
  }
  function rmExercise(id: string) { updExercises(exercises.filter(e => e.id!==id)) }
  function updExercise(id: string, patch: Partial<Exercise>) {
    updExercises(exercises.map(e => e.id===id ? { ...e, ...patch } : e))
  }
  function moveExercise(id: string, dir: -1 | 1) {
    const list = [...exercises]
    const i = list.findIndex(e => e.id===id); if (i<0) return
    const j = i + dir; if (j<0 || j>=list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    updExercises(list)
  }

  const inp: React.CSSProperties = { flex:1, minWidth:0, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'7px 10px', fontFamily:'DM Sans,sans-serif', fontSize:13 }

  return (
    <div>
      {circuits.length === 0 && (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-dim)', fontSize:13 }}>
          Aucun circuit. Ajoute un premier circuit pour commencer.
        </div>
      )}

      {circuits.map(circuit => {
        const exs = exercises.filter(e => e.circuitId===circuit.id)
        return (
          <div key={circuit.id} style={{ border:'1px solid var(--border)', borderRadius:16, marginBottom:14, overflow:'hidden' }}>
            {/* Circuit header */}
            <div style={{ background:'var(--bg-card2)', padding:'14px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#5b6fff', flexShrink:0 }}/>
              <input value={circuit.name} onChange={e => updCircuit(circuit.id, { name:e.target.value })}
                style={{ ...inp, flex:'none', width:200, fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14 }}/>
              <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', flex:1 }}>
                <NumInput label="Rounds" value={circuit.rounds} onChange={v => updCircuit(circuit.id, { rounds:v })} min={1} max={20}/>
                <NumInput label="Repos entre rounds (s)" value={circuit.restBetweenRoundsSec} onChange={v => updCircuit(circuit.id, { restBetweenRoundsSec:v })} min={0} max={600}/>
              </div>
              <button onClick={() => rmCircuit(circuit.id)}
                style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, padding:4, lineHeight:1 }}>×</button>
            </div>

            {/* Exercises */}
            <div style={{ padding:'10px 16px 14px' }}>
              {exs.length === 0 && (
                <p style={{ fontSize:12, color:'var(--text-dim)', margin:'8px 0', fontStyle:'italic' }}>Aucun exercice dans ce circuit.</p>
              )}
              {exs.map((ex, idx) => (
                <div key={ex.id} style={{ background:'var(--bg-main,var(--bg-card))', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', marginBottom:8 }}>
                  {/* Row 1: name + reorder + delete */}
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                    {/* Reorder */}
                    <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                      <button onClick={() => moveExercise(ex.id,-1)} disabled={idx===0}
                        style={{ background:'none', border:'none', color:idx===0?'var(--border)':'var(--text-dim)', cursor:idx===0?'default':'pointer', padding:0, lineHeight:1, fontSize:13 }}>&#8593;</button>
                      <button onClick={() => moveExercise(ex.id,1)} disabled={idx===exs.length-1}
                        style={{ background:'none', border:'none', color:idx===exs.length-1?'var(--border)':'var(--text-dim)', cursor:idx===exs.length-1?'default':'pointer', padding:0, lineHeight:1, fontSize:13 }}>&#8595;</button>
                    </div>
                    <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'DM Mono,monospace', width:16, textAlign:'center', flexShrink:0 }}>{idx+1}</span>
                    <input list={`exo-list-${ex.id}`} value={ex.name} onChange={e => updExercise(ex.id, { name:e.target.value })}
                      placeholder="Exercice..." style={{ ...inp }}/>
                    <datalist id={`exo-list-${ex.id}`}>
                      {EXERCISE_DB.map(n => <option key={n} value={n}/>)}
                    </datalist>
                    <button onClick={() => rmExercise(ex.id)}
                      style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:16, padding:'4px', lineHeight:1, flexShrink:0 }}>×</button>
                  </div>
                  {/* Row 2: numeric fields grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(80px,1fr))', gap:8 }}>
                    <NumInput label="Series" value={ex.sets} onChange={v => updExercise(ex.id, { sets:v })} min={1} max={20}/>
                    <NumInput label="Reps" value={ex.reps} onChange={v => updExercise(ex.id, { reps:v })} min={1} max={100}/>
                    <NumInput label="Repos (s)" value={ex.restSec} onChange={v => updExercise(ex.id, { restSec:v })} min={0} max={600}/>
                    <div>
                      <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Charge (kg)</label>
                      <input type="number" value={ex.weightKg ?? ''} min={0} max={999} step={0.5}
                        onChange={e => updExercise(ex.id, { weightKg: +e.target.value || undefined })}
                        placeholder="—"
                        style={{ width:60, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)',
                          color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
                    </div>
                  </div>
                  {/* Optional note */}
                  <input value={ex.note||''} onChange={e => updExercise(ex.id, { note:e.target.value })}
                    placeholder="Note / consigne (optionnel)"
                    style={{ marginTop:6, width:'100%', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', padding:'5px 8px', fontFamily:'DM Sans,sans-serif', fontSize:11, boxSizing:'border-box' as const }}/>
                </div>
              ))}
              <button onClick={() => addExercise(circuit.id)}
                style={{ width:'100%', padding:'8px', borderRadius:10, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer', marginTop:2 }}>
                + Ajouter un exercice
              </button>
            </div>
          </div>
        )
      })}

      <button onClick={addCircuit}
        style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px dashed #5b6fff', background:'rgba(91,111,255,0.05)', color:'#5b6fff', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        + Ajouter un circuit
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SWIM DISTANCES
// ══════════════════════════════════════════════════════════════════
const SWIM_DISTANCES = [25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000]

// ══════════════════════════════════════════════════════════════════
// ENDURANCE BUILDER (Running / Vélo / Aviron / Triathlon)
// ══════════════════════════════════════════════════════════════════
function EnduranceBuilder({
  data, sport, onChange, zones
}: {
  data: EnduranceSession
  sport: Sport
  onChange: (d: EnduranceSession) => void
  zones?: { ftp?: number; runThresholdPace?: string; runZ2?: string; bikeZ4?: string }
}) {
  const { blocks } = data
  const isRun = sport === 'running'
  const isVelo = sport === 'velo'
  const isAviron = sport === 'aviron'
  const color = sportColor(sport)

  const supportsDistance = isRun || isAviron
  const supportsCadence = isVelo || isAviron
  const cadenceLabel = isAviron ? 'CPM' : 'RPM'

  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function upd(b: EnduranceBlock[]) { onChange({ blocks: b }) }
  function addBlock() {
    upd([...blocks, {
      id: uid(), name: 'Bloc',
      reps: 1, intervalType: 'time' as const,
      effortMmSs: '10:00', zone: 2 as Zone,
      recoveryMmSs: '0:00', recoveryZone: 1 as Zone,
    }])
  }
  function rmBlock(id: string) { upd(blocks.filter(b => b.id !== id)) }
  function updBlock(id: string, patch: Partial<EnduranceBlock>) {
    upd(blocks.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  function onDragStart(i: number) { dragIdx.current = i }
  function onDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setDragOverIdx(i) }
  function onDrop(i: number) {
    if (dragIdx.current === null || dragIdx.current === i) { setDragOverIdx(null); return }
    const list = [...blocks]
    const [item] = list.splice(dragIdx.current, 1)
    list.splice(i, 0, item)
    upd(list)
    dragIdx.current = null
    setDragOverIdx(null)
  }

  const totalMin = totalEnduranceDuration(blocks)

  const zonePills = (selected: Zone, onZoneChange: (z: Zone) => void) => (
    <div style={{ display:'flex', gap:3 }}>
      {([1,2,3,4,5] as Zone[]).map(z => (
        <button key={z} onClick={() => onZoneChange(z)}
          style={{
            width:24, height:24, borderRadius:6, border:'none', cursor:'pointer',
            background: selected === z ? ZONE_COLOR[z] : `${ZONE_COLOR[z]}22`,
            color: selected === z ? '#fff' : ZONE_COLOR[z],
            fontFamily:'DM Mono,monospace', fontSize:9, fontWeight:700,
          }}>Z{z}</button>
      ))}
    </div>
  )

  return (
    <div>
      {/* Athlete zones banner */}
      {zones && (zones.ftp || zones.runThresholdPace || zones.runZ2 || zones.bikeZ4) && (
        <div style={{ padding:'8px 12px', borderRadius:9, background:'rgba(91,111,255,0.07)', border:'1px solid rgba(91,111,255,0.15)', marginBottom:12, fontSize:11, color:'var(--text-mid)', display:'flex', gap:16, flexWrap:'wrap' }}>
          {zones.ftp && <span>FTP : <strong style={{ fontFamily:'DM Mono,monospace', color:'var(--text-main)' }}>{zones.ftp}W</strong></span>}
          {zones.runThresholdPace && <span>Seuil run : <strong style={{ fontFamily:'DM Mono,monospace', color:'var(--text-main)' }}>{zones.runThresholdPace}/km</strong></span>}
          {zones.runZ2 && <span>Z2 run : <strong style={{ fontFamily:'DM Mono,monospace', color:'var(--text-main)' }}>{zones.runZ2}/km</strong></span>}
          {zones.bikeZ4 && <span>Z4 vélo : <strong style={{ fontFamily:'DM Mono,monospace', color:'var(--text-main)' }}>{zones.bikeZ4}</strong></span>}
        </div>
      )}

      {/* Intensity profile preview */}
      {blocks.length > 0 && (
        <div style={{ marginBottom:20, padding:'14px 16px', background:'var(--bg-card2)', borderRadius:14, border:'1px solid var(--border)' }}>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:'0 0 10px' }}>
            Profil d'intensité · {totalMin}min total
          </p>
          <IntensityProfile blocks={blocks} sport={sport}/>
        </div>
      )}

      {blocks.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-dim)', fontSize:13, marginBottom:12 }}>
          Ajoute des blocs pour construire le profil.
        </div>
      )}

      {/* Block list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
        {blocks.map((b, idx) => {
          const effortMin = blockEffortMin(b)
          const recoveryMin = blockRecoveryMin(b)
          const totalBlock = blockTotalMin(b)

          return (
            <div key={b.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={() => setDragOverIdx(null)}
              style={{
                border:`1px solid ${dragOverIdx === idx ? color : 'var(--border)'}`,
                borderLeft:`3px solid ${ZONE_COLOR[b.zone]}`,
                borderRadius:14, padding:'12px 14px',
                background: dragOverIdx === idx ? `${color}06` : 'var(--bg-card2)',
                cursor:'grab', transition:'border-color .15s',
              }}>
              {/* Row 1: reorder + name + zone + delete */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:1, flexShrink:0 }}>
                  <button onClick={() => { const l=[...blocks]; if(idx>0){[l[idx-1],l[idx]]=[l[idx],l[idx-1]];upd(l)} }}
                    disabled={idx===0}
                    style={{ background:'none', border:'none', color:idx===0?'var(--border)':'var(--text-dim)', cursor:idx===0?'default':'pointer', padding:0, fontSize:11, lineHeight:1 }}>▲</button>
                  <button onClick={() => { const l=[...blocks]; if(idx<l.length-1){[l[idx],l[idx+1]]=[l[idx+1],l[idx]];upd(l)} }}
                    disabled={idx===blocks.length-1}
                    style={{ background:'none', border:'none', color:idx===blocks.length-1?'var(--border)':'var(--text-dim)', cursor:idx===blocks.length-1?'default':'pointer', padding:0, fontSize:11, lineHeight:1 }}>▼</button>
                </div>
                <input value={b.name} onChange={e => updBlock(b.id, { name:e.target.value })}
                  placeholder="Nom du bloc"
                  style={{ flex:1, minWidth:0, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'7px 10px', fontFamily:'DM Sans,sans-serif', fontSize:13 }}/>
                <div>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>Zone effort</p>
                  {zonePills(b.zone, z => updBlock(b.id, { zone: z }))}
                </div>
                <button onClick={() => rmBlock(b.id)}
                  style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, padding:'2px 4px', lineHeight:1, flexShrink:0 }}>×</button>
              </div>

              {/* Row 2: Reps + interval type */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>Répétitions</p>
                  <input type="number" min={1} max={50} value={b.reps}
                    onChange={e => updBlock(b.id, { reps: Math.max(1, parseInt(e.target.value)||1) })}
                    style={{ width:52, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:13, textAlign:'center' as const }}/>
                </div>
                {supportsDistance && (
                  <div style={{ display:'flex', gap:4 }}>
                    {(['time','distance'] as const).map(t => (
                      <button key={t} onClick={() => updBlock(b.id, { intervalType:t })}
                        style={{ padding:'4px 10px', borderRadius:7, fontSize:10, fontWeight:600, cursor:'pointer',
                          border:`1px solid ${b.intervalType===t ? color : 'var(--border)'}`,
                          background: b.intervalType===t ? `${color}15` : 'transparent',
                          color: b.intervalType===t ? color : 'var(--text-dim)' }}>
                        {t==='time' ? 'Durée' : 'Distance'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Effort fields */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(80px, 1fr))', gap:8, marginBottom:8 }}>
                {b.intervalType === 'time' ? (
                  <MmSsInput label="Durée effort" value={b.effortMmSs} onChange={v => updBlock(b.id, { effortMmSs:v })}/>
                ) : (
                  <div>
                    <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>Distance (m)</p>
                    <input type="number" min={25} max={100000} step={25} value={b.effortDistanceM ?? 400}
                      onChange={e => updBlock(b.id, { effortDistanceM: parseInt(e.target.value)||400 })}
                      style={{ width:72, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
                  </div>
                )}

                {(isRun || isAviron) && (
                  <PaceInput label="Allure" value={b.targetPace ?? ''} onChange={v => updBlock(b.id, { targetPace: v })}/>
                )}
                {isVelo && (
                  <div>
                    <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>Watts</p>
                    <input type="number" min={0} max={2000} value={b.targetWatts ?? ''} placeholder="250"
                      onChange={e => updBlock(b.id, { targetWatts: parseInt(e.target.value)||undefined })}
                      style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
                  </div>
                )}

                <div>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>FC cible</p>
                  <input type="number" min={0} max={250} value={b.targetHrAvg ?? ''} placeholder="165"
                    onChange={e => updBlock(b.id, { targetHrAvg: parseInt(e.target.value)||undefined })}
                    style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
                </div>
                <div>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>FC max</p>
                  <input type="number" min={0} max={250} value={b.targetHrMax ?? ''} placeholder="178"
                    onChange={e => updBlock(b.id, { targetHrMax: parseInt(e.target.value)||undefined })}
                    style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
                </div>

                {supportsCadence && (
                  <div>
                    <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>Cadence ({cadenceLabel})</p>
                    <input type="number" min={0} max={250} value={b.cadenceRpm ?? ''} placeholder={isAviron ? '28' : '90'}
                      onChange={e => updBlock(b.id, { cadenceRpm: parseInt(e.target.value)||undefined })}
                      style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
                  </div>
                )}
              </div>

              {/* Row 4: Recovery */}
              <div style={{ display:'flex', alignItems:'flex-end', gap:10, padding:'8px 10px', borderRadius:9, background:`rgba(107,114,128,0.08)`, border:'1px solid rgba(107,114,128,0.15)', marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', whiteSpace:'nowrap', paddingBottom:4 }}>Récup</div>
                <MmSsInput label="Durée" value={b.recoveryMmSs} onChange={v => updBlock(b.id, { recoveryMmSs:v })} placeholder="0:00"/>
                <div>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 3px' }}>Zone</p>
                  {zonePills(b.recoveryZone, z => updBlock(b.id, { recoveryZone: z }))}
                </div>
              </div>

              {/* Summary line */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700, color }}>
                  {b.reps > 1
                    ? `${b.reps} × (${b.effortMmSs} + ${b.recoveryMmSs} récup) = ${Math.round(totalBlock)}min`
                    : `${b.effortMmSs}${recoveryMin > 0 ? ` + ${b.recoveryMmSs} récup` : ''}`}
                </span>
              </div>

              {/* Note */}
              <input value={b.note ?? ''} onChange={e => updBlock(b.id, { note:e.target.value })}
                placeholder="Consigne / note"
                style={{ width:'100%', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', padding:'5px 8px', fontFamily:'DM Sans,sans-serif', fontSize:11, boxSizing:'border-box' as const }}/>
            </div>
          )
        })}
      </div>

      <button onClick={addBlock}
        style={{ width:'100%', padding:'11px', borderRadius:12, border:`1px dashed ${color}`, background:`${color}08`, color, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        + Ajouter un bloc
      </button>

      {blocks.length > 0 && (
        <div style={{ display:'flex', gap:16, marginTop:12, fontSize:12, color:'var(--text-dim)', flexWrap:'wrap' }}>
          <span>Durée totale : <strong style={{ color:'var(--text-main)', fontFamily:'DM Mono,monospace' }}>{totalMin}min</strong></span>
          <span>Blocs : <strong style={{ color:'var(--text-main)' }}>{blocks.length}</strong></span>
          <span>Séquences : <strong style={{ color:'var(--text-main)' }}>{blocks.reduce((a,b)=>a+b.reps,0)}</strong></span>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// NATATION BUILDER
// ══════════════════════════════════════════════════════════════════
function NatationBuilder({ data, onChange }: { data: NatationSession; onChange:(d:NatationSession)=>void }) {
  const { sets } = data
  function upd(s: SwimSet[]) { onChange({ sets:s }) }
  function addSet() { upd([...sets, { id:uid(), reps:4, distanceM:100, zone:3 as Zone, restSec:20 }]) }
  function rmSet(id: string) { upd(sets.filter(s=>s.id!==id)) }
  function updSet(id: string, patch: Partial<SwimSet>) { upd(sets.map(s=>s.id===id?{...s,...patch}:s)) }

  const sel: React.CSSProperties = { borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }

  return (
    <div>
      {sets.map((s, idx) => (
        <div key={s.id} style={{ border:'1px solid var(--border)', borderRadius:14, padding:'12px 14px', marginBottom:8, background:'var(--bg-card2)' }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--text-dim)', width:18, flexShrink:0, paddingBottom:8 }}>{idx+1}</span>
            <NumInput label="Reps" value={s.reps} onChange={v=>updSet(s.id,{reps:v})} min={1} max={50}/>
            <span style={{ fontSize:18, color:'var(--text-dim)', paddingBottom:6, fontWeight:300 }}>×</span>
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Distance</label>
              <select value={s.distanceM} onChange={e=>updSet(s.id,{distanceM:+e.target.value})}
                style={sel}>
                {SWIM_DISTANCES.map(d=><option key={d} value={d}>{d}m</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Zone</label>
              <select value={s.zone} onChange={e=>updSet(s.id,{zone:+e.target.value as Zone})} style={sel}>
                {([1,2,3,4,5] as Zone[]).map(z=><option key={z} value={z}>{ZONE_LABEL[z]}</option>)}
              </select>
            </div>
            <NumInput label="Repos (s)" value={s.restSec} onChange={v=>updSet(s.id,{restSec:v})} min={0} max={300}/>
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Allure /100m</label>
              <input value={s.targetPacePer100m||''} onChange={e=>updSet(s.id,{targetPacePer100m:e.target.value})}
                placeholder="1:35" style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12 }}/>
            </div>
            <div style={{ flex:1, minWidth:100 }}>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Note</label>
              <input value={s.note||''} onChange={e=>updSet(s.id,{note:e.target.value})} placeholder="Nage libre, technique..."
                style={{ width:'100%', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Sans,sans-serif', fontSize:12, boxSizing:'border-box' as const }}/>
            </div>
            <button onClick={()=>rmSet(s.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, padding:4, lineHeight:1, paddingBottom:8 }}>×</button>
          </div>
          {/* Preview line */}
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:ZONE_COLOR[s.zone], fontSize:14 }}>{s.reps}×{s.distanceM}m</span>
            <ZoneBadge zone={s.zone}/>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>repos {s.restSec}s</span>
            {s.targetPacePer100m && <span style={{ fontSize:11, color:ZONE_COLOR[s.zone], fontFamily:'DM Mono,monospace' }}>{s.targetPacePer100m}/100m</span>}
            {s.note && <span style={{ fontSize:11, color:'var(--text-dim)', fontStyle:'italic' }}>{s.note}</span>}
          </div>
        </div>
      ))}

      <button onClick={addSet}
        style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px dashed #00c8e0', background:'rgba(0,200,224,0.05)', color:'#00c8e0', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        + Ajouter une serie
      </button>

      {sets.length > 0 && (
        <div style={{ display:'flex', gap:16, marginTop:14, fontSize:12, color:'var(--text-dim)' }}>
          <span>Total : <strong style={{ color:'var(--text-main)', fontFamily:'DM Mono,monospace' }}>{totalSwimDistance(sets)}m</strong></span>
          <span>Series : <strong style={{ color:'var(--text-main)' }}>{sets.length}</strong></span>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// HYROX BUILDER
// ══════════════════════════════════════════════════════════════════
function HyroxBuilder({ data, onChange }: { data: HyroxSession; onChange:(d:HyroxSession)=>void }) {
  const { stations } = data
  function upd(s: HyroxStation[]) { onChange({ stations:s }) }
  function updStation(id: string, patch: Partial<HyroxStation>) { upd(stations.map(s=>s.id===id?{...s,...patch}:s)) }
  function addStation() { upd([...stations, { id:uid(), name:'', restSec:30 }]) }
  function rmStation(id: string) { upd(stations.filter(s=>s.id!==id)) }

  const STATION_NAMES = ['Run','SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmer Carry','Lunges','Wall Balls','Box Jump']

  return (
    <div>
      {stations.map((s, idx) => {
        const isRun = s.name.toLowerCase().includes('run')
        return (
          <div key={s.id} style={{ border:`1px solid ${isRun?'rgba(239,68,68,0.3)':'var(--border)'}`, borderRadius:14, padding:'11px 14px', marginBottom:7, background:isRun?'rgba(239,68,68,0.04)':'var(--bg-card2)', display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text-dim)', width:18, flexShrink:0, paddingBottom:8 }}>{idx+1}</span>
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Atelier</label>
              <select value={s.name} onChange={e=>updStation(s.id,{name:e.target.value})}
                style={{ borderRadius:8, border:`1px solid ${isRun?'rgba(239,68,68,0.4)':'var(--border)'}`, background:'var(--bg-card)', color:isRun?'#ef4444':'var(--text-main)', padding:'6px 8px', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', minWidth:160 }}>
                <option value="">— Choisir —</option>
                {STATION_NAMES.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {s.distanceM !== undefined && (
              <NumInput label="Distance (m)" value={s.distanceM} onChange={v=>updStation(s.id,{distanceM:v})} min={0} max={10000}/>
            )}
            {s.reps !== undefined && (
              <NumInput label="Reps" value={s.reps} onChange={v=>updStation(s.id,{reps:v})} min={0} max={500}/>
            )}
            <NumInput label="Repos (s)" value={s.restSec} onChange={v=>updStation(s.id,{restSec:v})} min={0} max={300}/>
            <div style={{ flex:1, minWidth:100 }}>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Note</label>
              <input value={s.note||''} onChange={e=>updStation(s.id,{note:e.target.value})} placeholder="Consigne..."
                style={{ width:'100%', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Sans,sans-serif', fontSize:12, boxSizing:'border-box' as const }}/>
            </div>
            <button onClick={()=>rmStation(s.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, padding:4, lineHeight:1, paddingBottom:8 }}>×</button>
          </div>
        )
      })}

      <button onClick={addStation}
        style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px dashed #ef4444', background:'rgba(239,68,68,0.05)', color:'#ef4444', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        + Ajouter un atelier
      </button>

      {stations.length > 0 && (
        <div style={{ display:'flex', gap:16, marginTop:14, fontSize:12, color:'var(--text-dim)' }}>
          <span>Ateliers : <strong style={{ color:'var(--text-main)' }}>{stations.length}</strong></span>
          <span>Distance course : <strong style={{ color:'#ef4444', fontFamily:'DM Mono,monospace' }}>
            {stations.filter(s=>s.name.toLowerCase().includes('run')).reduce((a,s)=>a+(s.distanceM||0),0)}m
          </strong></span>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// EXECUTE MODE — MUSCU TIMER
// ══════════════════════════════════════════════════════════════════
function ExecuteMuscu({ template, onExit }: { template: SessionTemplate; onExit: () => void }) {
  const muscu = template.muscu!
  const allExercises = muscu.exercises
  const circuits     = muscu.circuits

  const [state, setState] = useState<ExecState>({ circuitIdx:0, exerciseIdx:0, setsDone:0, phase:'work' })
  const [completedSets, setCompletedSets] = useState<Record<string,number>>({})

  const circuit  = circuits[state.circuitIdx]
  const exercise = allExercises.filter(e => e.circuitId===circuit?.id)[state.exerciseIdx]

  const timer = useCountdown(() => setState(s => ({ ...s, phase:'work' })))

  function validateSet() {
    if (!exercise) return
    const key = `${state.circuitIdx}-${state.exerciseIdx}`
    const done = (completedSets[key]||0) + 1
    setCompletedSets(prev => ({ ...prev, [key]: done }))

    const exs = allExercises.filter(e => e.circuitId===circuit?.id)

    if (done < exercise.sets) {
      // More sets in this exercise → rest then continue
      setState(s => ({ ...s, phase:'rest', setsDone: done }))
      timer.start(exercise.restSec)
    } else {
      // All sets done for this exercise
      if (state.exerciseIdx + 1 < exs.length) {
        // Next exercise in circuit
        setState(s => ({ ...s, exerciseIdx: s.exerciseIdx+1, setsDone:0, phase:'work' }))
        timer.stop()
      } else {
        // Circuit done — check rounds
        // For simplicity: move to next circuit or done
        if (state.circuitIdx + 1 < circuits.length) {
          setState({ circuitIdx: state.circuitIdx+1, exerciseIdx:0, setsDone:0, phase:'rest' })
          timer.start(circuit.restBetweenRoundsSec)
        } else {
          setState(s => ({ ...s, phase:'done' }))
        }
      }
    }
  }

  const pct = timer.remaining > 0 && exercise ? (1 - timer.remaining / exercise.restSec) * 100 : 0
  const exsInCircuit = allExercises.filter(e => e.circuitId===circuit?.id)

  if (state.phase === 'done') {
    return (
      <div style={{ textAlign:'center', padding:'60px 20px' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>&#10003;</div>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:24, margin:'0 0 10px' }}>Seance terminee</h2>
        <p style={{ fontSize:14, color:'var(--text-dim)', marginBottom:28 }}>
          {allExercises.length} exercices · {circuits.length} circuits
        </p>
        <button onClick={onExit}
          style={{ padding:'12px 32px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Terminer
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      {/* Progress bar */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-dim)', marginBottom:6 }}>
        <span>{circuit?.name}</span>
        <span>Exercice {state.exerciseIdx+1}/{exsInCircuit.length}</span>
      </div>
      <div style={{ height:4, borderRadius:99, background:'var(--border)', marginBottom:24 }}>
        <div style={{ height:'100%', background:'#5b6fff', borderRadius:99, width:`${((state.exerciseIdx)/Math.max(1,exsInCircuit.length))*100}%`, transition:'width .3s' }}/>
      </div>

      {/* Current exercise */}
      {exercise && (
        <SectionCard>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:'0 0 8px' }}>Exercice en cours</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, margin:'0 0 16px' }}>{exercise.name}</h2>

          {/* Sets counter */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
            {Array.from({ length:exercise.sets }).map((_,i) => {
              const key = `${state.circuitIdx}-${state.exerciseIdx}`
              const done = completedSets[key]||0
              return (
                <div key={i} style={{ width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                  background: i<done ? '#5b6fff' : i===done&&state.phase==='work' ? 'rgba(91,111,255,0.15)' : 'var(--bg-card2)',
                  border: `1px solid ${i<done?'#5b6fff':i===done?'#5b6fff':'var(--border)'}`,
                  fontFamily:'DM Mono,monospace', fontWeight:700, fontSize:13,
                  color: i<done?'#fff':i===done?'#5b6fff':'var(--text-dim)' }}>
                  {i+1}
                </div>
              )
            })}
          </div>

          <div style={{ fontSize:18, fontFamily:'DM Mono,monospace', fontWeight:700, color:'var(--text-main)', marginBottom:20 }}>
            {exercise.reps} reps{exercise.weightKg ? ` @ ${exercise.weightKg}kg` : ''}
          </div>

          {/* Timer ring (shown during rest) */}
          {state.phase === 'rest' && (
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <p style={{ fontSize:12, color:'#f97316', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Recuperation</p>
              <div style={{ position:'relative', width:120, height:120, margin:'0 auto' }}>
                <svg width={120} height={120} viewBox="0 0 120 120" style={{ transform:'rotate(-90deg)' }}>
                  <circle cx={60} cy={60} r={50} fill="none" stroke="var(--border)" strokeWidth={8}/>
                  <circle cx={60} cy={60} r={50} fill="none" stroke="#f97316" strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={`${(pct/100)*2*Math.PI*50} ${2*Math.PI*50}`}
                    style={{ transition:'stroke-dasharray .9s linear' }}/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:'DM Mono,monospace', fontWeight:800, fontSize:28, color:'#f97316', lineHeight:1 }}>{fmtTime(timer.remaining)}</span>
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>restant</span>
                </div>
              </div>
              <button onClick={() => { timer.stop(); setState(s=>({...s,phase:'work'})) }}
                style={{ marginTop:14, padding:'8px 20px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
                Passer
              </button>
            </div>
          )}

          {state.phase === 'work' && (
            <button onClick={validateSet}
              style={{ width:'100%', padding:'14px 0', borderRadius:12, border:'none', background:'#5b6fff', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(91,111,255,0.35)' }}>
              Serie validee → {exercise.restSec}s repos
            </button>
          )}

          {exercise.note && (
            <p style={{ fontSize:12, color:'var(--text-dim)', marginTop:14, textAlign:'center', fontStyle:'italic' }}>{exercise.note}</p>
          )}
        </SectionCard>
      )}

      {/* Next exercise preview */}
      {exsInCircuit[state.exerciseIdx+1] && (
        <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 16px' }}>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 4px', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em' }}>Suivant</p>
          <p style={{ fontSize:14, color:'var(--text-mid)', margin:0, fontWeight:500 }}>
            {exsInCircuit[state.exerciseIdx+1].name}
            <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:8 }}>
              {exsInCircuit[state.exerciseIdx+1].sets}×{exsInCircuit[state.exerciseIdx+1].reps}
            </span>
          </p>
        </div>
      )}

      <button onClick={onExit}
        style={{ marginTop:20, width:'100%', padding:'10px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer' }}>
        Quitter la seance
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// EXECUTE MODE — ENDURANCE (read-only profile + timer)
// ══════════════════════════════════════════════════════════════════
function ExecuteEndurance({ template, onExit }: { template: SessionTemplate; onExit: () => void }) {
  const endurance = template.endurance!
  const color = sportColor(template.sport)

  return (
    <div>
      <SectionCard>
        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:'0 0 8px' }}>Seance en cours</p>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'0 0 20px', color }}>{template.name}</h2>
        <IntensityProfile blocks={endurance.blocks}/>
      </SectionCard>

      <SectionCard>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:'0 0 12px' }}>Detail des blocs</p>
        {endurance.blocks.map((b) => {
          const recoveryMin = blockRecoveryMin(b)
          return (
            <div key={b.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>{b.name}</span>
                  {b.reps > 1 && <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:6 }}>&times;{b.reps}</span>}
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'var(--text-main)' }}>{b.effortMmSs}</span>
                  {(b.targetPace || b.targetWatts) && (
                    <span style={{ fontSize:11, color, fontFamily:'DM Mono,monospace' }}>
                      {b.targetPace || `${b.targetWatts}W`}
                    </span>
                  )}
                </div>
              </div>
              {(b.targetHrAvg || b.targetHrMax || b.cadenceRpm) && (
                <div style={{ display:'flex', gap:10, marginTop:4, fontSize:11, color:'var(--text-dim)' }}>
                  {b.targetHrAvg && <span>FC cible <strong style={{ color:'var(--text-main)' }}>{b.targetHrAvg}bpm</strong></span>}
                  {b.targetHrMax && <span>FC max <strong style={{ color:'#ef4444' }}>{b.targetHrMax}bpm</strong></span>}
                  {b.cadenceRpm && <span>Cadence <strong style={{ color:'var(--text-main)' }}>{b.cadenceRpm}</strong></span>}
                </div>
              )}
              {recoveryMin > 0 && (
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>
                  Récup <strong style={{ fontFamily:'DM Mono,monospace' }}>{b.recoveryMmSs}</strong>
                </div>
              )}
              {b.note && <p style={{ fontSize:11, color:'var(--text-dim)', fontStyle:'italic', margin:'4px 0 0' }}>{b.note}</p>}
            </div>
          )
        })}
      </SectionCard>

      <button onClick={onExit}
        style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer' }}>
        Quitter
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TEMPLATE CARD
// ══════════════════════════════════════════════════════════════════
function TemplateCard({ t, onStart, onEdit, onPlan, onDelete }: {
  t: SessionTemplate
  onStart:  () => void
  onEdit:   () => void
  onPlan:   () => void
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const color = sportColor(t.sport)
  const ic    = intensityColor(t.intensity)
  const tss   = estimateTSS(t.sport, t.durationMin, t.intensity, t.endurance)

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16,
      padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>

      {/* Row 1 — nom + méta droite */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:'0 0 8px', lineHeight:1.3 }}>{t.name}</h3>
          {/* Sport badge + type badges */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ padding:'2px 8px', borderRadius:99, background:`${color}20`, border:`1px solid ${color}55`,
              fontSize:10, fontWeight:700, color, whiteSpace:'nowrap' }}>
              {sportLabel(t.sport)}
            </span>
            {(t.typeSeance ?? []).map(tp => (
              <span key={tp} style={{ padding:'2px 8px', borderRadius:99, background:'var(--bg-card2)',
                border:'1px solid var(--border)', fontSize:10, fontWeight:600, color:'var(--text-mid)', whiteSpace:'nowrap' }}>
                {tp}
              </span>
            ))}
          </div>
        </div>

        {/* Méta — intensité + durée + TSS */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
          <span style={{ padding:'3px 9px', borderRadius:99, background:`${ic}18`, color:ic, fontSize:10, fontWeight:700 }}>
            {intensityLabel(t.intensity)}
          </span>
          <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>{t.durationMin} min</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#5b6fff', fontWeight:700 }}>~{tss} TSS</span>
          {t.rpe && <span style={{ fontSize:10, color:'var(--text-dim)' }}>RPE {t.rpe}/10</span>}
        </div>
      </div>

      {/* Contenu résumé */}
      <div style={{ fontSize:11, color:'var(--text-dim)', display:'flex', gap:10, flexWrap:'wrap' }}>
        {t.muscu && (
          <>
            <span>{t.muscu.circuits.length} circuit{t.muscu.circuits.length>1?'s':''}</span>
            <span>{t.muscu.exercises.length} exercices</span>
          </>
        )}
        {t.endurance && (
          <>
            <span>{t.endurance.blocks.length} blocs</span>
            <span>{totalEnduranceDuration(t.endurance.blocks)} min estimees</span>
          </>
        )}
        {t.natation && (
          <>
            <span>{t.natation.sets.length} series</span>
            <span style={{ fontFamily:'DM Mono,monospace' }}>{totalSwimDistance(t.natation.sets)}m</span>
          </>
        )}
        {t.hyrox && <span>{t.hyrox.stations.length} ateliers</span>}
      </div>

      {/* Block summary + profil */}
      {t.endurance && t.endurance.blocks.length > 0 && (
        <>
          <div style={{ fontSize:11, color:'var(--text-dim)', display:'flex', flexDirection:'column', gap:2 }}>
            {t.endurance.blocks.slice(0, 4).map(b => (
              <span key={b.id} style={{ fontFamily:'DM Mono,monospace', fontSize:10 }}>
                {b.reps > 1 ? `${b.reps}×` : ''}{b.effortMmSs}
                {b.targetPace ? ` @ ${b.targetPace}` : b.targetWatts ? ` @ ${b.targetWatts}W` : ''}
                {parseMMSS(b.recoveryMmSs) > 0 ? ` / ${b.recoveryMmSs} récup` : ''}
              </span>
            ))}
            {t.endurance.blocks.length > 4 && <span>+{t.endurance.blocks.length - 4} blocs</span>}
          </div>
          <div style={{ pointerEvents:'none', opacity:0.7 }}>
            <IntensityProfile blocks={t.endurance.blocks} sport={t.sport}/>
          </div>
        </>
      )}

      {/* Actions */}
      {confirmDel ? (
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:2, padding:'10px 12px', borderRadius:10, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)' }}>
          <p style={{ margin:0, fontSize:12, color:'var(--text-main)', fontWeight:600 }}>Supprimer cette séance ?</p>
          <p style={{ margin:0, fontSize:11, color:'var(--text-dim)' }}>Cette action est irréversible.</p>
          <div style={{ display:'flex', gap:7 }}>
            <button onClick={() => setConfirmDel(false)}
              style={{ flex:1, padding:'8px 0', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
              Annuler
            </button>
            <button onClick={onDelete}
              style={{ flex:2, padding:'8px 0', borderRadius:9, border:'none', background:'#ef4444', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              Oui, supprimer
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:7, marginTop:2 }}>
          <button onClick={onStart}
            style={{ flex:2, padding:'9px 0', borderRadius:10, border:'none',
              background:`linear-gradient(135deg,${color},${color}bb)`,
              color:'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Démarrer
          </button>
          <button onClick={onEdit}
            style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
            Modifier
          </button>
          <button onClick={onPlan}
            style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:11, cursor:'pointer' }}>
            → Planifier
          </button>
          <button onClick={() => setConfirmDel(true)}
            style={{ padding:'9px 10px', borderRadius:10, border:'1px solid rgba(239,68,68,0.35)',
              background:'transparent', color:'#ef4444', fontFamily:'DM Sans,sans-serif', fontSize:11, cursor:'pointer', flexShrink:0 }}>
            🗑
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// CYCLING SUB-TYPES
// ══════════════════════════════════════════════════════════════════
type CyclingSub = 'velo' | 'ht' | 'elliptique' | 'vtt' | 'cyclocross'
const CYCLING_SUB: { id: CyclingSub; label: string }[] = [
  { id:'velo',       label:'Vélo route' },
  { id:'ht',         label:'Home Trainer' },
  { id:'elliptique', label:'Elliptique' },
  { id:'vtt',        label:'VTT' },
  { id:'cyclocross', label:'Cyclocross' },
]

// ══════════════════════════════════════════════════════════════════
// BUILD MODE — full session form + sport builder
// ══════════════════════════════════════════════════════════════════
function BuildMode({ initial, onSave, onCancel }: {
  initial?: SessionTemplate
  onSave: (t: SessionTemplate) => void
  onCancel: () => void
}) {
  const { addSession } = usePlanning()
  const { zones: trainingZones } = useTrainingZones()
  const [sport,       setSport]       = useState<Sport>(initial?.sport ?? 'muscu')
  const [cyclingSub,  setCyclingSub]  = useState<CyclingSub>('velo')
  const [name,        setName]        = useState(initial?.name ?? '')
  const [duration,    setDuration]    = useState(initial?.durationMin ?? 60)
  const [intensity,   setIntensity]   = useState<Intensity>(initial?.intensity ?? 'moderate')
  const [tagsStr,     setTagsStr]     = useState((initial?.tags??[]).join(', '))
  const [notes,       setNotes]       = useState(initial?.notes ?? '')
  const [sessionTypes, setSessionTypes] = useState<string[]>(initial?.typeSeance ?? [])
  const [rpeTarget,    setRpeTarget]    = useState<number>(initial?.rpe ?? 6)
  const [planDate,     setPlanDate]     = useState('')
  const [planTime,     setPlanTime]     = useState('09:00')
  const [planSuccess,  setPlanSuccess]  = useState(false)

  // Reset session types when sport changes
  useEffect(() => { setSessionTypes([]) }, [sport])

  const [muscu,    setMuscu]    = useState<MusculaireSession>(initial?.muscu    ?? { circuits:[], exercises:[] })
  const [endur,    setEndur]    = useState<EnduranceSession>(initial?.endurance ?? { blocks:[] })
  const [swim,     setSwim]     = useState<NatationSession>(initial?.natation   ?? { sets:[] })
  const [hyrox,    setHyrox]    = useState<HyroxSession>(initial?.hyrox         ?? { stations: HYROX_STATIONS_DEFAULT.map((s,i)=>({...s,id:`nh${i}`})) })

  const isEnduranceSport = sport==='running'||sport==='velo'||sport==='aviron'||sport==='triathlon'

  const estimatedTSS = estimateTSS(sport, duration, intensity, isEnduranceSport ? endur : undefined)

  // Build athlete zones for endurance builder
  const athleteZones = {
    ftp: trainingZones.bike?.ftp_watts ?? undefined,
    runThresholdPace: trainingZones.run?.sl2 || undefined,
    runZ2: trainingZones.run?.z2_value || undefined,
    bikeZ4: trainingZones.bike?.z4_value || undefined,
  }

  function save() {
    const t: SessionTemplate = {
      id: initial?.id ?? uid(),
      name: name || 'Seance sans titre',
      sport, durationMin: duration, intensity,
      typeSeance: sessionTypes.length > 0 ? sessionTypes : undefined,
      tags: tagsStr.split(',').map(s=>s.trim()).filter(Boolean),
      notes: notes || undefined,
      rpe: rpeTarget,
      muscu:    sport==='muscu'    ? muscu    : undefined,
      endurance: isEnduranceSport  ? endur    : undefined,
      natation: sport==='natation' ? swim     : undefined,
      hyrox:    sport==='hyrox'    ? hyrox    : undefined,
    }
    onSave(t)
  }

  const inp: React.CSSProperties = { width:'100%', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'9px 12px', fontFamily:'DM Sans,sans-serif', fontSize:13, boxSizing:'border-box' as const }

  return (
    <div>
      {/* Header */}
      <SectionCard>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>
              {initial ? 'Modifier la seance' : 'Nouvelle seance'}
            </p>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'4px 0 0' }}>
              {name || 'Seance sans titre'}
            </h2>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onCancel}
              style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', color:'var(--text-dim)', fontSize:13, fontFamily:'DM Sans,sans-serif' }}>
              Annuler
            </button>
          </div>
        </div>

        {/* Nom */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Nom de la seance</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex : Fractionne court, Full Body Force..." style={inp}/>
        </div>

        {/* Sport */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:8 }}>Sport</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {SPORTS.map(s => (
              <button key={s.id} onClick={()=>setSport(s.id)}
                style={{ padding:'8px 16px', borderRadius:12, border:`1px solid ${sport===s.id?s.color:'var(--border)'}`,
                  background:sport===s.id?`${s.color}15`:'transparent',
                  color:sport===s.id?s.color:'var(--text-dim)',
                  fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {s.label}
              </button>
            ))}
          </div>
          {sport === 'velo' && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
              {CYCLING_SUB.map(s => (
                <button key={s.id} onClick={() => setCyclingSub(s.id)}
                  style={{ padding:'4px 10px', borderRadius:8, fontSize:10, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${cyclingSub===s.id ? '#f97316' : 'var(--border)'}`,
                    background: cyclingSub===s.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                    color: cyclingSub===s.id ? '#f97316' : 'var(--text-dim)' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Session type selector — multi-select */}
        {SESSION_TYPES[sport] && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:8 }}>
              Type de séance <span style={{ fontWeight:400, color:'var(--text-dim)', opacity:0.6 }}>(plusieurs choix possibles)</span>
            </label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {SESSION_TYPES[sport].map(tp => {
                const active = sessionTypes.includes(tp)
                return (
                  <button key={tp}
                    onClick={() => {
                      setSessionTypes(prev => prev.includes(tp) ? prev.filter(x => x !== tp) : [...prev, tp])
                      if (!name && !active) setName(`${sportLabel(sport)} — ${tp}`)
                    }}
                    style={{
                      padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
                      border:`1px solid ${active ? sportColor(sport) : 'var(--border)'}`,
                      background: active ? `${sportColor(sport)}18` : 'transparent',
                      color: active ? sportColor(sport) : 'var(--text-dim)',
                    }}>
                    {tp}
                  </button>
                )
              })}
              {/* Custom type */}
              <button
                onClick={() => {
                  const custom = prompt('Nom du type personnalisé :')
                  if (custom?.trim()) {
                    setSessionTypes(prev => prev.includes(custom.trim()) ? prev : [...prev, custom.trim()])
                    if (!name) setName(`${sportLabel(sport)} — ${custom.trim()}`)
                  }
                }}
                style={{ padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px dashed var(--border)', color:'var(--text-dim)', background:'transparent' }}>
                + Personnalisé
              </button>
            </div>
          </div>
        )}

        {/* Duree + Intensite */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Duree estimee (min)</label>
            <input type="number" value={duration} min={5} max={600} onChange={e=>setDuration(+e.target.value)}
              style={{ ...inp, fontFamily:'DM Mono,monospace', textAlign:'center' as const }}/>
          </div>
          <div>
            <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:6 }}>Intensite</label>
            <div style={{ display:'flex', gap:6 }}>
              {(['low','moderate','high','max'] as Intensity[]).map(i => (
                <button key={i} onClick={()=>setIntensity(i)}
                  style={{ flex:1, padding:'7px 0', borderRadius:8, border:`1px solid ${intensity===i?intensityColor(i):'var(--border)'}`,
                    background:intensity===i?`${intensityColor(i)}15`:'transparent',
                    color:intensity===i?intensityColor(i):'var(--text-dim)',
                    fontFamily:'DM Sans,sans-serif', fontSize:10, fontWeight:600, cursor:'pointer' }}>
                  {intensityLabel(i)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TSS estimate display */}
        <div style={{ marginBottom:14 }}>
          <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(91,111,255,0.07)', border:'1px solid rgba(91,111,255,0.18)', display:'inline-flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:10, color:'var(--text-dim)' }}>TSS estimé</span>
            <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, fontSize:13, color:'#5b6fff' }}>{estimatedTSS} pts</span>
            <span style={{ fontSize:9, color:'var(--text-dim)' }}>(estimation)</span>
          </div>
        </div>

        {/* RPE Gauge */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <label style={{ fontSize:11, color:'var(--text-dim)' }}>RPE cible</label>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700,
              color: rpeTarget<=3?'#22c55e':rpeTarget<=6?'#f97316':'#ef4444' }}>
              {rpeTarget}/10
            </span>
          </div>
          <input type="range" min={1} max={10} step={0.5} value={rpeTarget}
            onChange={e=>setRpeTarget(parseFloat(e.target.value))}
            style={{ width:'100%', accentColor:'#5b6fff', cursor:'pointer' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
            <span style={{ fontSize:9, color:'#22c55e' }}>Récup</span>
            <span style={{ fontSize:9, color:'#f97316' }}>Modéré</span>
            <span style={{ fontSize:9, color:'#ef4444' }}>Max</span>
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Tags (virgule)</label>
          <input value={tagsStr} onChange={e=>setTagsStr(e.target.value)} placeholder="Force, VMA, Endurance..." style={inp}/>
        </div>

        {/* Notes / Description */}
        <div>
          <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>
            Description / Consignes du coach
          </label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
            placeholder="Objectifs, consignes d'exécution, points d'attention..." style={{ ...inp, resize:'none' as const, lineHeight:1.5 }}/>
        </div>
      </SectionCard>

      {/* Sport-specific builder */}
      <SectionCard>
        <SectionHeader label="Construction" title={sportLabel(sport)} color={sportColor(sport)}/>
        {sport==='muscu'    && <MusculaireBuilder data={muscu} onChange={setMuscu}/>}
        {isEnduranceSport   && <EnduranceBuilder data={endur} sport={sport} onChange={setEndur} zones={athleteZones}/>}
        {sport==='natation' && <NatationBuilder data={swim} onChange={setSwim}/>}
        {sport==='hyrox'    && <HyroxBuilder data={hyrox} onChange={setHyrox}/>}
      </SectionCard>

      {/* Ajouter au planning */}
      <SectionCard>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:'0 0 12px' }}>
          Ajouter au planning
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Date</label>
            <input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)}
              style={{ ...inp, fontFamily:'DM Mono,monospace' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Heure</label>
            <input type="time" value={planTime} onChange={e=>setPlanTime(e.target.value)}
              style={{ ...inp, fontFamily:'DM Mono,monospace' }}/>
          </div>
        </div>
        {planSuccess && (
          <div style={{ marginBottom:10, padding:'8px 12px', borderRadius:8, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'#22c55e', fontSize:12 }}>
            Séance ajoutée au planning.
          </div>
        )}
        <button
          disabled={!planDate}
          onClick={async () => {
            if (!planDate) return
            const dateObj = new Date(planDate)
            const dow = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1
            const sportMap: Record<Sport, string> = { muscu:'gym', running:'run', velo:'bike', natation:'swim', hyrox:'hyrox', aviron:'rowing', triathlon:'run' }
            const planningBlocks = isEnduranceSport ? endur.blocks.flatMap(b => {
              const effortMin = blockEffortMin(b)
              const recoveryMin = blockRecoveryMin(b)
              const efforts = Array.from({ length: b.reps }, (_, i) => ({
                id: `${b.id}_e${i}`,
                mode: 'single' as const,
                type: 'effort' as const,
                zone: b.zone,
                durationMin: effortMin,
                value: b.targetPace ?? (b.targetWatts ? String(b.targetWatts) : ''),
                hrAvg: b.targetHrAvg ? String(b.targetHrAvg) : '',
                label: b.name,
              }))
              const recoveries = recoveryMin > 0
                ? Array.from({ length: b.reps }, (_, i) => ({
                    id: `${b.id}_r${i}`,
                    mode: 'single' as const,
                    type: 'recovery' as const,
                    zone: b.recoveryZone,
                    durationMin: recoveryMin,
                    value: '',
                    hrAvg: '',
                    label: 'Récup',
                  }))
                : []
              return efforts.flatMap((e, i) => recoveries[i] ? [e, recoveries[i]] : [e])
            }) : []
            await addSession(dow, {
              day_index: dow,
              sport: sportMap[sport],
              title: name || `${sportLabel(sport)}`,
              time: planTime,
              duration_min: duration,
              tss: estimatedTSS,
              status: 'planned',
              intensity: intensity,
              notes: notes || undefined,
              blocks: planningBlocks,
              validation_data: {},
            })
            setPlanSuccess(true)
            setTimeout(() => setPlanSuccess(false), 3000)
          }}
          style={{ width:'100%', padding:'11px', borderRadius:12, border:'none',
            background: planDate ? 'linear-gradient(135deg,#22c55e,#00c8e0)' : 'var(--bg-card2)',
            color: planDate ? '#fff' : 'var(--text-dim)',
            fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700,
            cursor: planDate ? 'pointer' : 'not-allowed',
            opacity: planDate ? 1 : 0.5 }}>
          Ajouter au planning
        </button>
      </SectionCard>

      {/* Save */}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel}
          style={{ flex:1, padding:'12px 0', borderRadius:12, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:14, cursor:'pointer' }}>
          Annuler
        </button>
        <button onClick={save}
          style={{ flex:3, padding:'12px 0', borderRadius:12, border:'none', background:`linear-gradient(135deg,#5b6fff,#00c8e0)`, color:'#fff', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,200,224,0.3)' }}>
          Enregistrer la seance
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// LIBRARY MODE
// ══════════════════════════════════════════════════════════════════
function LibraryMode({ templates, onNew, onEdit, onStart, onDelete }: {
  templates: SessionTemplate[]
  onNew:    () => void
  onEdit:   (t: SessionTemplate) => void
  onStart:  (t: SessionTemplate) => void
  onDelete: (t: SessionTemplate) => void
}) {
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all')
  const [typeFilters, setTypeFilters]  = useState<string[]>([])
  const [toast,       setToast]        = useState('')

  function selectSport(s: Sport | 'all') {
    setSportFilter(s)
    setTypeFilters([])
  }

  function toggleType(tp: string) {
    setTypeFilters(prev => prev.includes(tp) ? prev.filter(x => x !== tp) : [...prev, tp])
  }

  function sendToPlanning(t: SessionTemplate) {
    setToast(`"${t.name}" envoyée au Planning`)
    setTimeout(() => setToast(''), 3000)
  }

  // Types disponibles pour le sport sélectionné
  const availableTypes: string[] = sportFilter !== 'all' ? (SESSION_TYPES[sportFilter] ?? []) : []

  // Filtrage des séances
  const displayed = templates.filter(t => {
    if (sportFilter !== 'all' && t.sport !== sportFilter) return false
    if (typeFilters.length > 0) {
      const templateTypes = t.typeSeance ?? []
      if (!typeFilters.some(f => templateTypes.includes(f))) return false
    }
    return true
  })

  // Style tab sport
  function tabStyle(active: boolean, color: string): React.CSSProperties {
    return {
      padding: '7px 16px',
      borderRadius: 10,
      border: `1px solid ${active ? color : 'var(--border)'}`,
      background: active ? color : 'transparent',
      color: active ? '#fff' : 'var(--text-dim)',
      fontFamily: 'DM Sans,sans-serif',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      transition: 'all .15s',
    }
  }

  // Style badge type filtre
  function typeStyle(active: boolean, sportCol: string): React.CSSProperties {
    return {
      padding: '4px 12px',
      borderRadius: 99,
      border: `1px solid ${active ? sportCol : 'var(--border)'}`,
      background: active ? `${sportCol}22` : 'transparent',
      color: active ? sportCol : 'var(--text-dim)',
      fontFamily: 'DM Sans,sans-serif',
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      transition: 'all .12s',
    }
  }

  const sportCol = sportFilter !== 'all' ? sportColor(sportFilter) : '#5b6fff'

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'#22c55e', color:'#fff', padding:'10px 22px', borderRadius:12,
          fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, zIndex:200,
          boxShadow:'0 4px 20px rgba(34,197,94,0.4)', pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      <SectionCard>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Bibliothèque</p>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'4px 0 0' }}>Séances types</h2>
          </div>
          <button onClick={onNew}
            style={{ padding:'9px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)',
              color:'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer',
              boxShadow:'0 2px 12px rgba(0,200,224,0.3)' }}>
            + Nouvelle séance
          </button>
        </div>

        {/* Niveau 1 — Tabs sport (scrollable) */}
        <div style={{ overflowX:'auto', paddingBottom:2 }}>
          <div style={{ display:'flex', gap:7, minWidth:'max-content' }}>
            <button style={tabStyle(sportFilter==='all','#5b6fff')} onClick={()=>selectSport('all')}>Toutes</button>
            {SPORTS.map(s => (
              <button key={s.id} style={tabStyle(sportFilter===s.id, s.color)} onClick={()=>selectSport(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Niveau 2 — Filtres par type (badges multi-select) */}
        {availableTypes.length > 0 && (
          <div style={{ marginTop:14, overflowX:'auto', paddingBottom:2 }}>
            <div style={{ display:'flex', gap:6, minWidth:'max-content', alignItems:'center' }}>
              <span style={{ fontSize:10, color:'var(--text-dim)', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em', marginRight:4, whiteSpace:'nowrap' }}>Type</span>
              {availableTypes.map(tp => (
                <button key={tp} style={typeStyle(typeFilters.includes(tp), sportCol)} onClick={()=>toggleType(tp)}>
                  {tp}
                </button>
              ))}
              {typeFilters.length > 0 && (
                <button onClick={()=>setTypeFilters([])}
                  style={{ padding:'4px 10px', borderRadius:99, border:'none', background:'transparent',
                    color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:10, cursor:'pointer',
                    textDecoration:'underline', marginLeft:4 }}>
                  Effacer
                </button>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Grille */}
      {displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-dim)' }}>
          <p style={{ fontSize:14, marginBottom:16 }}>
            {typeFilters.length > 0 ? 'Aucune séance pour ces types.' : 'Aucune séance dans cette catégorie.'}
          </p>
          {typeFilters.length > 0 ? (
            <button onClick={()=>setTypeFilters([])}
              style={{ padding:'10px 24px', borderRadius:12, border:'1px solid var(--border)', background:'transparent',
                color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer' }}>
              Effacer les filtres
            </button>
          ) : (
            <button onClick={onNew}
              style={{ padding:'11px 28px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)',
                color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Créer une séance
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }} id="session-grid">
          {displayed.map(t => (
            <TemplateCard
              key={t.id}
              t={t}
              onStart={() => onStart(t)}
              onEdit={()  => onEdit(t)}
              onPlan={() => sendToPlanning(t)}
              onDelete={() => onDelete(t)}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width:600px) { #session-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

// ── Chargement session_library ─────────────────────────────────
interface SBLibRow {
  id: string
  nom: string
  sport: string
  type_seance: string[] | null
  duree_estimee: number
  intensite: string | null
  tss_estime: number | null
  rpe_cible: number | null
  tags: string[] | null
  description: string | null
  blocs: {
    nom: string; repetitions: number; duree_effort: number; recup: number
    zone_effort: string[]; zone_recup: string[]
    watts: number | null; allure_cible: string | null
    fc_cible: number | null; fc_max: number | null; cadence: number | null
    consigne: string
  }[] | null
}

function normalizeSport(s: string): Sport | null {
  const m: Record<string, Sport> = {
    natation: 'natation', swimming: 'natation',
    running: 'running', 'course à pied': 'running', course: 'running',
    velo: 'velo', vélo: 'velo', cycling: 'velo', cyclisme: 'velo',
    muscu: 'muscu', musculation: 'muscu', renfo: 'muscu', gym: 'muscu',
    hyrox: 'hyrox',
    aviron: 'aviron', rowing: 'aviron',
    triathlon: 'triathlon',
  }
  return m[s.toLowerCase()] ?? null
}

function normalizeIntensity(s: string | null): Intensity {
  if (!s) return 'moderate'
  const m: Record<string, Intensity> = {
    faible: 'low', low: 'low',
    'modéré': 'moderate', moderate: 'moderate', moyen: 'moderate',
    'élevé': 'high', high: 'high',
    maximum: 'max', max: 'max',
  }
  return m[s.toLowerCase()] ?? 'moderate'
}

function zoneFromSBStr(zones: string[]): Zone {
  if (!zones.length) return 2 as Zone
  const n = zones[0].match(/\d/)
  return n ? Math.min(5, Math.max(1, parseInt(n[0]))) as Zone : 2 as Zone
}

function sbRowToTemplate(row: SBLibRow): SessionTemplate | null {
  const sport = normalizeSport(row.sport)
  if (!sport) return null
  const intensity = normalizeIntensity(row.intensite)
  const blocs = row.blocs ?? []
  const isEnduranceLike = ['running', 'velo', 'aviron', 'triathlon', 'natation'].includes(sport)
  let endurance: EnduranceSession | undefined
  if (isEnduranceLike && blocs.length > 0) {
    endurance = {
      blocks: blocs.map((b, i) => ({
        id: `lib-${row.id}-${i}`,
        name: b.nom,
        reps: Math.max(1, b.repetitions),
        intervalType: 'time' as const,
        effortMmSs: toMMSS(b.duree_effort * 60),
        zone: zoneFromSBStr(b.zone_effort),
        targetPace: b.allure_cible ?? undefined,
        targetWatts: b.watts ?? undefined,
        targetHrAvg: b.fc_cible ?? undefined,
        targetHrMax: b.fc_max ?? undefined,
        cadenceRpm: b.cadence ?? undefined,
        recoveryMmSs: b.recup > 0 ? toMMSS(b.recup * 60) : '0:00',
        recoveryZone: zoneFromSBStr(b.zone_recup.length ? b.zone_recup : ['Z1']),
        note: b.consigne || undefined,
      })),
    }
  }
  return {
    id: row.id,
    name: row.nom,
    sport,
    typeSeance: row.type_seance ?? [],
    durationMin: row.duree_estimee,
    intensity,
    tags: row.tags ?? [],
    notes: row.description ?? undefined,
    rpe: row.rpe_cible ?? undefined,
    ...(endurance && { endurance }),
  }
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════
export default function SessionPage() {
  const [templates,     setTemplates]     = useState<SessionTemplate[]>(MOCK_TEMPLATES)
  const [mode,          setMode]          = useState<PageMode>('library')
  const [editTarget,    setEditTarget]    = useState<SessionTemplate|undefined>()
  const [execTarget,    setExecTarget]    = useState<SessionTemplate|undefined>()
  const { zones }                         = useTrainingZones()
  const { races }                         = usePlanning()

  // Charger les séances depuis session_library (IA)
  useEffect(() => {
    async function loadLibrary() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb
          .from('session_library')
          .select('id,nom,sport,type_seance,duree_estimee,intensite,tss_estime,rpe_cible,tags,description,blocs')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (!data?.length) return
        const aiTemplates = (data as SBLibRow[]).map(sbRowToTemplate).filter((t): t is SessionTemplate => t !== null)
        if (!aiTemplates.length) return
        setTemplates(prev => {
          const aiIds = new Set(aiTemplates.map(t => t.id))
          const base = prev.filter(t => !aiIds.has(t.id))
          return [...aiTemplates, ...base]
        })
      } catch { /* silently ignore */ }
    }
    void loadLibrary()
  }, [])

  function handleNew() { setEditTarget(undefined); setMode('build') }
  function handleEdit(t: SessionTemplate) { setEditTarget(t); setMode('build') }
  function handleStart(t: SessionTemplate) { setExecTarget(t); setMode('execute') }

  function handleSave(t: SessionTemplate) {
    setTemplates(prev => {
      const exists = prev.find(x=>x.id===t.id)
      return exists ? prev.map(x=>x.id===t.id?t:x) : [...prev,t]
    })
    setMode('library')
  }

  async function handleDelete(t: SessionTemplate) {
    // Remove from local state immediately
    setTemplates(prev => prev.filter(x => x.id !== t.id))
    // Also delete from session_library in Supabase (AI sessions have UUID ids)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id)
    if (isUUID) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        await sb.from('session_library').delete().eq('id', t.id)
      } catch { /* silently ignore */ }
    }
  }

  const titleMap: Record<PageMode,string> = {
    library: 'Session', build: editTarget ? 'Modifier la seance' : 'Nouvelle seance', execute: execTarget?.name ?? 'Seance en cours',
  }
  const subMap: Record<PageMode,string> = {
    library: 'Bibliotheque de seances types', build: '', execute: execTarget ? sportLabel(execTarget.sport) : '',
  }

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      <style>{`
        @media (max-width:767px) {
          .session-header { flex-direction: column !important; gap: 12px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="session-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>
            {titleMap[mode]}
          </h1>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'5px 0 0' }}>
            {subMap[mode] || new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {mode !== 'library' && (
            <button onClick={()=>setMode('library')}
              style={{ padding:'8px 16px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer' }}>
              ← Bibliotheque
            </button>
          )}
          <AIAssistantButton
            agent="sessionBuilder"
            context={{
              page: 'session',
              mode,
              currentTemplate: editTarget ? {
                sport:        editTarget.sport,
                name:         editTarget.name,
                duration_min: editTarget.durationMin,
              } : null,
              zones: {
                run:  zones.run,
                bike: zones.bike,
                swim: zones.swim,
              },
              races: races.slice(0, 3).map(r => ({
                name:      r.name,
                sport:     r.sport,
                date:      r.date,
                level:     r.level,
                goal_time: r.goal_time,
              })),
            }}
          />
        </div>
      </div>

      {mode === 'library' && (
        <LibraryMode
          templates={templates}
          onNew={handleNew}
          onEdit={handleEdit}
          onStart={handleStart}
          onDelete={handleDelete}
        />
      )}

      {mode === 'build' && (
        <BuildMode
          initial={editTarget}
          onSave={handleSave}
          onCancel={()=>setMode('library')}
        />
      )}

      {mode === 'execute' && execTarget && (
        <div>
          {execTarget.sport === 'muscu' && (
            <ExecuteMuscu template={execTarget} onExit={()=>setMode('library')}/>
          )}
          {(execTarget.sport==='running'||execTarget.sport==='velo'||execTarget.sport==='aviron'||execTarget.sport==='triathlon') && (
            <ExecuteEndurance template={execTarget} onExit={()=>setMode('library')}/>
          )}
          {(execTarget.sport==='natation'||execTarget.sport==='hyrox') && (
            <ExecuteEndurance template={execTarget} onExit={()=>setMode('library')}/>
          )}
        </div>
      )}

    </div>
  )
}
