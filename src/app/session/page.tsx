'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
// import { createClient } from '@/lib/supabase/client'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import { usePlanning } from '@/hooks/usePlanning'

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
type Sport      = 'muscu' | 'running' | 'velo' | 'natation' | 'hyrox'
type PageMode   = 'library' | 'build' | 'execute'
type Zone       = 1 | 2 | 3 | 4 | 5
type Intensity  = 'low' | 'moderate' | 'high' | 'max'

// — Muscu
interface Exercise {
  id: string; name: string; sets: number; reps: number
  restSec: number; note?: string; circuitId?: string
}
interface Circuit {
  id: string; name: string; rounds: number; restBetweenRoundsSec: number
}

// — Endurance blocks (Running, Vélo, HT)
interface EnduranceBlock {
  id: string; name: string; durationMin: number
  zone: Zone; reps: number; restSec: number
  targetPace?: string   // "4:30/km"
  targetWatts?: number
  note?: string
}

// — Natation
interface SwimSet {
  id: string; reps: number; distanceM: number
  zone: Zone; restSec: number; note?: string
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
  tags: string[]; notes?: string
  muscu?: MusculaireSession
  endurance?: EnduranceSession
  natation?: NatationSession
  hyrox?: HyroxSession
}

// — Execute state
interface ExecState {
  circuitIdx: number; exerciseIdx: number
  setsDone: number; phase: 'work' | 'rest' | 'done'
}

// ══════════════════════════════════════════════════════════════════
// SPORT CONFIG
// ══════════════════════════════════════════════════════════════════
const SPORTS: { id: Sport; label: string; sub: string; color: string }[] = [
  { id:'muscu',    label:'Muscu / Renfo',  sub:'Circuits, séries, reps',   color:'#5b6fff' },
  { id:'running',  label:'Running',        sub:'Blocs, intervalles, allure',color:'#22c55e' },
  { id:'velo',     label:'Vélo / Home trainer', sub:'Watts, zones, blocs',  color:'#f97316' },
  { id:'natation', label:'Natation',       sub:'Séries, distances, zones',  color:'#00c8e0' },
  { id:'hyrox',    label:'Hyrox',          sub:'Ateliers, circuits, runs',  color:'#ef4444' },
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
    intensity:'high', tags:['Force','Polyarticulaire'],
    muscu: {
      circuits:[
        { id:'c1', name:'Circuit A — Force', rounds:4, restBetweenRoundsSec:120 },
        { id:'c2', name:'Circuit B — Complément', rounds:3, restBetweenRoundsSec:90 },
      ],
      exercises:[
        { id:'e1', name:'Squat barre', sets:4, reps:5, restSec:180, circuitId:'c1' },
        { id:'e2', name:'Soulevé de terre', sets:4, reps:4, restSec:180, circuitId:'c1' },
        { id:'e3', name:'Developpé couché', sets:4, reps:6, restSec:150, circuitId:'c1' },
        { id:'e4', name:'Tractions lestees', sets:3, reps:6, restSec:120, circuitId:'c2' },
        { id:'e5', name:'Rowing barre', sets:3, reps:8, restSec:90, circuitId:'c2' },
        { id:'e6', name:'Dips', sets:3, reps:10, restSec:90, circuitId:'c2' },
      ],
    },
  },
  {
    id:'s2', name:'Upper Body Hypertrophie', sport:'muscu', durationMin:50,
    intensity:'moderate', tags:['Hypertrophie','Haut du corps'],
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
    intensity:'high', tags:['VMA','Fractionne'],
    endurance: {
      blocks:[
        { id:'b1', name:'Echauffement',    durationMin:15, zone:2, reps:1, restSec:0 },
        { id:'b2', name:'400m rapide',     durationMin:2,  zone:5, reps:10, restSec:90, targetPace:"3:45/km" },
        { id:'b3', name:'Retour au calme', durationMin:10, zone:1, reps:1, restSec:0 },
      ],
    },
  },
  {
    id:'s4', name:'Sortie longue Z2', sport:'running', durationMin:90,
    intensity:'low', tags:['Endurance','Aerobie'],
    endurance: {
      blocks:[
        { id:'b4', name:'Z2 continu', durationMin:90, zone:2, reps:1, restSec:0, targetPace:"5:10/km" },
      ],
    },
  },
  {
    id:'s5', name:'Sweet Spot 2x20min', sport:'velo', durationMin:70,
    intensity:'high', tags:['Sweet Spot','FTP'],
    endurance: {
      blocks:[
        { id:'b5', name:'Echauffement',  durationMin:15, zone:2, reps:1, restSec:0 },
        { id:'b6', name:'Sweet Spot',    durationMin:20, zone:4, reps:2, restSec:300, targetWatts:280 },
        { id:'b7', name:'Retour calme',  durationMin:10, zone:1, reps:1, restSec:0 },
      ],
    },
  },
  {
    id:'s6', name:'Endurance 3000m', sport:'natation', durationMin:60,
    intensity:'moderate', tags:['Endurance','Aerobie'],
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
    intensity:'max', tags:['Race','Simulation'],
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

function totalEnduranceDuration(blocks: EnduranceBlock[]): number {
  return blocks.reduce((a,b) => a + b.durationMin * b.reps + Math.ceil(b.restSec * Math.max(0, b.reps-1) / 60), 0)
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

// ══════════════════════════════════════════════════════════════════
// INTENSITY PROFILE SVG
// ══════════════════════════════════════════════════════════════════
function IntensityProfile({ blocks }: { blocks: EnduranceBlock[] }) {
  const totalMin = blocks.reduce((a,b) => a + b.durationMin * b.reps, 0) || 1
  const H = 100; const PAD = 4; const GAP = 2

  // Expand repeated blocks
  const expanded: { block: EnduranceBlock; rep: number }[] = []
  for (const b of blocks) {
    for (let r = 0; r < b.reps; r++) expanded.push({ block:b, rep:r })
  }

  const totalSlots = expanded.length
  const slotW = totalSlots > 0 ? (100 - (totalSlots-1)*GAP) / totalSlots : 100

  return (
    <div>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:'0 0 10px' }}>
        Profil d'intensite
      </p>
      <svg width="100%" height={H+20} viewBox={`0 0 100 ${H+20}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
        {expanded.map(({ block:b, rep }, i) => {
          const x = i * (slotW + GAP)
          const bH = ZONE_HEIGHT[b.zone]
          const y = H - bH
          const c = ZONE_COLOR[b.zone]
          return (
            <g key={`${b.id}-${rep}`}>
              <rect x={x} y={y} width={slotW} height={bH} rx={2}
                fill={c} opacity={0.85}
                style={{ filter:`drop-shadow(0 0 3px ${c}55)` }}/>
              {slotW > 8 && bH > 20 && (
                <text x={x + slotW/2} y={y + bH/2 + 4} textAnchor="middle"
                  fontSize={Math.min(7, slotW * 0.7)} fill="#fff" fontFamily="DM Sans,sans-serif" fontWeight={700}>
                  Z{b.zone}
                </text>
              )}
              {slotW > 6 && (
                <text x={x + slotW/2} y={H+13} textAnchor="middle"
                  fontSize={Math.min(6.5, slotW * 0.65)} fill="var(--text-dim)" fontFamily="DM Sans,sans-serif">
                  {b.durationMin}'
                </text>
              )}
            </g>
          )
        })}
        {/* Baseline */}
        <line x1={0} y1={H+1} x2={100} y2={H+1} stroke="var(--border)" strokeWidth={0.5}/>
      </svg>
      {/* Legend */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8 }}>
        {([1,2,3,4,5] as Zone[]).filter(z => blocks.some(b => b.zone===z)).map(z => (
          <span key={z} style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'var(--text-dim)' }}>
            <span style={{ width:10, height:10, borderRadius:2, background:ZONE_COLOR[z], display:'inline-block' }}/>
            {ZONE_LABEL[z]}
          </span>
        ))}
      </div>
    </div>
  )
}

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
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    {/* Reorder */}
                    <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                      <button onClick={() => moveExercise(ex.id,-1)} disabled={idx===0}
                        style={{ background:'none', border:'none', color:idx===0?'var(--border)':'var(--text-dim)', cursor:idx===0?'default':'pointer', padding:0, lineHeight:1, fontSize:13 }}>&#8593;</button>
                      <button onClick={() => moveExercise(ex.id,1)} disabled={idx===exs.length-1}
                        style={{ background:'none', border:'none', color:idx===exs.length-1?'var(--border)':'var(--text-dim)', cursor:idx===exs.length-1?'default':'pointer', padding:0, lineHeight:1, fontSize:13 }}>&#8595;</button>
                    </div>
                    <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'DM Mono,monospace', width:16, textAlign:'center', flexShrink:0 }}>{idx+1}</span>
                    <input value={ex.name} onChange={e => updExercise(ex.id, { name:e.target.value })}
                      placeholder="Nom de l'exercice" style={{ ...inp }}/>
                    <NumInput label="Series" value={ex.sets} onChange={v => updExercise(ex.id, { sets:v })} min={1} max={20}/>
                    <NumInput label="Reps" value={ex.reps} onChange={v => updExercise(ex.id, { reps:v })} min={1} max={100}/>
                    <NumInput label="Repos (s)" value={ex.restSec} onChange={v => updExercise(ex.id, { restSec:v })} min={0} max={600}/>
                    <button onClick={() => rmExercise(ex.id)}
                      style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:16, padding:'4px', lineHeight:1, flexShrink:0 }}>×</button>
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
// ENDURANCE BUILDER (Running / Vélo / HT)
// ══════════════════════════════════════════════════════════════════
function EnduranceBuilder({ data, sport, onChange }: {
  data: EnduranceSession; sport: Sport
  onChange: (d: EnduranceSession) => void
}) {
  const { blocks } = data
  const isRun = sport==='running'
  const color = sportColor(sport)

  function upd(b: EnduranceBlock[]) { onChange({ blocks:b }) }
  function addBlock() {
    upd([...blocks, { id:uid(), name:'Bloc', durationMin:10, zone:3 as Zone, reps:1, restSec:60 }])
  }
  function rmBlock(id: string) { upd(blocks.filter(b => b.id!==id)) }
  function updBlock(id: string, patch: Partial<EnduranceBlock>) { upd(blocks.map(b => b.id===id ? { ...b, ...patch } : b)) }
  function moveBlock(id: string, dir: -1|1) {
    const list = [...blocks]; const i=list.findIndex(b=>b.id===id); if(i<0) return
    const j=i+dir; if(j<0||j>=list.length) return; [list[i],list[j]]=[list[j],list[i]]; upd(list)
  }

  const sel: React.CSSProperties = { borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }

  return (
    <div>
      {blocks.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <IntensityProfile blocks={blocks}/>
        </div>
      )}

      {blocks.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-dim)', fontSize:13, marginBottom:12 }}>
          Ajoute des blocs pour construire le profil d'intensite.
        </div>
      )}

      {blocks.map((b, idx) => (
        <div key={b.id} style={{ border:'1px solid var(--border)', borderRadius:14, padding:'12px 14px', marginBottom:8, background:'var(--bg-card2)' }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-start', flexWrap:'wrap' }}>
            {/* Reorder */}
            <div style={{ display:'flex', flexDirection:'column', gap:2, paddingTop:2, flexShrink:0 }}>
              <button onClick={()=>moveBlock(b.id,-1)} disabled={idx===0}
                style={{ background:'none', border:'none', color:idx===0?'var(--border)':'var(--text-dim)', cursor:idx===0?'default':'pointer', padding:0, fontSize:12 }}>&#8593;</button>
              <button onClick={()=>moveBlock(b.id,1)} disabled={idx===blocks.length-1}
                style={{ background:'none', border:'none', color:idx===blocks.length-1?'var(--border)':'var(--text-dim)', cursor:idx===blocks.length-1?'default':'pointer', padding:0, fontSize:12 }}>&#8595;</button>
            </div>
            {/* Name */}
            <input value={b.name} onChange={e=>updBlock(b.id,{name:e.target.value})}
              placeholder="Nom du bloc" style={{ minWidth:120, flex:1, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'7px 10px', fontFamily:'DM Sans,sans-serif', fontSize:13 }}/>
            {/* Zone select */}
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Zone</label>
              <select value={b.zone} onChange={e=>updBlock(b.id,{zone:+e.target.value as Zone})} style={sel}>
                {([1,2,3,4,5] as Zone[]).map(z => <option key={z} value={z}>{ZONE_LABEL[z]}</option>)}
              </select>
            </div>
            <NumInput label="Duree (min)" value={b.durationMin} onChange={v=>updBlock(b.id,{durationMin:v})} min={1} max={300}/>
            <NumInput label="Repetitions" value={b.reps} onChange={v=>updBlock(b.id,{reps:v})} min={1} max={50}/>
            <NumInput label="Repos (s)" value={b.restSec} onChange={v=>updBlock(b.id,{restSec:v})} min={0} max={1800}/>
            {/* Target */}
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>
                {isRun ? 'Allure' : 'Watts'}
              </label>
              {isRun ? (
                <input value={b.targetPace||''} onChange={e=>updBlock(b.id,{targetPace:e.target.value})}
                  placeholder="4:30/km" style={{ width:80, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12 }}/>
              ) : (
                <input type="number" value={b.targetWatts||''} onChange={e=>updBlock(b.id,{targetWatts:+e.target.value||undefined})}
                  placeholder="280" style={{ width:64, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Mono,monospace', fontSize:12, textAlign:'center' as const }}/>
              )}
            </div>
            <button onClick={()=>rmBlock(b.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, padding:4, lineHeight:1, flexShrink:0, marginTop:16 }}>×</button>
          </div>
          <input value={b.note||''} onChange={e=>updBlock(b.id,{note:e.target.value})}
            placeholder="Note / consigne"
            style={{ marginTop:6, width:'100%', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', padding:'5px 8px', fontFamily:'DM Sans,sans-serif', fontSize:11, boxSizing:'border-box' as const }}/>
        </div>
      ))}

      <button onClick={addBlock}
        style={{ width:'100%', padding:'11px', borderRadius:12, border:`1px dashed ${color}`, background:`${color}08`, color, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        + Ajouter un bloc
      </button>

      {blocks.length > 0 && (
        <div style={{ display:'flex', gap:16, marginTop:14, fontSize:12, color:'var(--text-dim)', flexWrap:'wrap' }}>
          <span>Duree totale : <strong style={{ color:'var(--text-main)' }}>{totalEnduranceDuration(blocks)} min</strong></span>
          <span>Blocs : <strong style={{ color:'var(--text-main)' }}>{blocks.reduce((a,b)=>a+b.reps,0)}</strong></span>
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
            <NumInput label="Repetitions" value={s.reps} onChange={v=>updSet(s.id,{reps:v})} min={1} max={50}/>
            <span style={{ fontSize:18, color:'var(--text-dim)', paddingBottom:6, fontWeight:300 }}>×</span>
            <NumInput label="Distance (m)" value={s.distanceM} onChange={v=>updSet(s.id,{distanceM:v})} min={25} max={5000}/>
            <div>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Zone</label>
              <select value={s.zone} onChange={e=>updSet(s.id,{zone:+e.target.value as Zone})} style={sel}>
                {([1,2,3,4,5] as Zone[]).map(z=><option key={z} value={z}>{ZONE_LABEL[z]}</option>)}
              </select>
            </div>
            <NumInput label="Repos (s)" value={s.restSec} onChange={v=>updSet(s.id,{restSec:v})} min={0} max={300}/>
            <div style={{ flex:1, minWidth:120 }}>
              <label style={{ fontSize:10, color:'var(--text-dim)', display:'block', marginBottom:3 }}>Note</label>
              <input value={s.note||''} onChange={e=>updSet(s.id,{note:e.target.value})} placeholder="Nage libre, technique..."
                style={{ width:'100%', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-main)', padding:'6px 8px', fontFamily:'DM Sans,sans-serif', fontSize:12, boxSizing:'border-box' as const }}/>
            </div>
            <button onClick={()=>rmSet(s.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, padding:4, lineHeight:1, paddingBottom:8 }}>×</button>
          </div>
          {/* Preview line */}
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:ZONE_COLOR[s.zone], fontSize:14 }}>{s.reps}×{s.distanceM}m</span>
            <ZoneBadge zone={s.zone}/>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>repos {s.restSec}s</span>
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
              <NumInput label="Repetitions" value={s.reps} onChange={v=>updStation(s.id,{reps:v})} min={0} max={500}/>
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
            {exercise.reps} reps
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
        {endurance.blocks.map((b, i) => (
          <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>{b.name}</span>
              {b.reps > 1 && <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:6 }}>&times;{b.reps}</span>}
              {(b.targetPace||b.targetWatts) && (
                <span style={{ fontSize:11, color, marginLeft:8, fontFamily:'DM Mono,monospace' }}>
                  {b.targetPace||`${b.targetWatts}W`}
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <ZoneBadge zone={b.zone}/>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'var(--text-main)' }}>{b.durationMin}'</span>
            </div>
          </div>
        ))}
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
function TemplateCard({ t, onStart, onEdit }: { t: SessionTemplate; onStart:()=>void; onEdit:()=>void }) {
  const color = sportColor(t.sport)
  const ic = intensityColor(t.intensity)
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16,
      padding:'18px 20px', display:'flex', flexDirection:'column', gap:12, transition:'border-color .15s',
      cursor:'pointer' }} onClick={onEdit}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color, display:'block', marginBottom:4 }}>
            {sportLabel(t.sport)}
          </span>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{t.name}</h3>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <span style={{ padding:'3px 8px', borderRadius:99, background:`${ic}15`, color:ic, fontSize:10, fontWeight:700 }}>
            {intensityLabel(t.intensity)}
          </span>
          <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>{t.durationMin} min</span>
        </div>
      </div>
      {/* Stats */}
      <div style={{ fontSize:11, color:'var(--text-dim)', display:'flex', gap:10, flexWrap:'wrap' }}>
        {t.muscu && (
          <>
            <span>{t.muscu.circuits.length} circuit{t.muscu.circuits.length>1?'s':''}</span>
            <span>{t.muscu.exercises.length} exercices</span>
          </>
        )}
        {t.endurance && (
          <>
            <span>{t.endurance.blocks.reduce((a,b)=>a+b.reps,0)} blocs</span>
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
      {/* Tags */}
      {t.tags.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {t.tags.map(tag => (
            <span key={tag} style={{ padding:'2px 8px', borderRadius:99, background:'var(--bg-card2)', border:'1px solid var(--border)', fontSize:10, color:'var(--text-dim)' }}>{tag}</span>
          ))}
        </div>
      )}
      {/* Intensity profile preview */}
      {t.endurance && t.endurance.blocks.length > 0 && (
        <div style={{ pointerEvents:'none', opacity:0.7 }}>
          <IntensityProfile blocks={t.endurance.blocks}/>
        </div>
      )}
      {/* Actions */}
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button onClick={e=>{ e.stopPropagation(); onStart() }}
          style={{ flex:2, padding:'9px 0', borderRadius:10, border:'none', background:`linear-gradient(135deg,${color},${color}bb)`, color:'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          Demarrer
        </button>
        <button onClick={e=>{ e.stopPropagation(); onEdit() }}
          style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
          Modifier
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// BUILD MODE — full session form + sport builder
// ══════════════════════════════════════════════════════════════════
// ── Types pour l'agent IA session ────────────────────────────
interface AISessionBlock { type:'warmup'|'effort'|'recovery'|'cooldown'; zone:number; durationMin:number; label:string; description?:string }
interface AISessionResult { title:string; blocks:AISessionBlock[]; totalDurationMin:number; estimatedTSS:number; coachNotes:string }

function BuildMode({ initial, onSave, onCancel }: {
  initial?: SessionTemplate
  onSave: (t: SessionTemplate) => void
  onCancel: () => void
}) {
  const [sport,     setSport]     = useState<Sport>(initial?.sport ?? 'muscu')
  const [name,      setName]      = useState(initial?.name ?? '')
  const [duration,  setDuration]  = useState(initial?.durationMin ?? 60)
  const [intensity, setIntensity] = useState<Intensity>(initial?.intensity ?? 'moderate')
  const [tagsStr,   setTagsStr]   = useState((initial?.tags??[]).join(', '))
  const [notes,     setNotes]     = useState(initial?.notes ?? '')

  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState<AISessionResult | null>(null)
  const [aiError,     setAiError]     = useState<string | null>(null)

  async function generateWithAI() {
    setAiLoading(true); setAiResult(null); setAiError(null)
    const sportToApi: Record<Sport, string> = { muscu:'gym', running:'run', velo:'bike', natation:'swim', hyrox:'hyrox' }
    const intensityToType: Record<Intensity, string> = { low:'recovery', moderate:'endurance', high:'intervals', max:'intervals' }
    try {
      const res = await fetch('/api/coach-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build_session',
          payload: {
            sport: sportToApi[sport],
            type: intensityToType[intensity],
            targetDurationMin: duration,
            context: notes || `${sportLabel(sport)} — ${intensityLabel(intensity)}`,
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Erreur agent')
      setAiResult(data.result)
      if (data.result.title && !name) setName(data.result.title)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setAiLoading(false)
    }
  }

  const [muscu,    setMuscu]    = useState<MusculaireSession>(initial?.muscu    ?? { circuits:[], exercises:[] })
  const [endur,    setEndur]    = useState<EnduranceSession>(initial?.endurance ?? { blocks:[] })
  const [swim,     setSwim]     = useState<NatationSession>(initial?.natation   ?? { sets:[] })
  const [hyrox,    setHyrox]    = useState<HyroxSession>(initial?.hyrox         ?? { stations: HYROX_STATIONS_DEFAULT.map((s,i)=>({...s,id:`nh${i}`})) })

  function save() {
    const t: SessionTemplate = {
      id: initial?.id ?? uid(),
      name: name || 'Seance sans titre',
      sport, durationMin: duration, intensity,
      tags: tagsStr.split(',').map(s=>s.trim()).filter(Boolean),
      notes: notes || undefined,
      muscu:    sport==='muscu'    ? muscu    : undefined,
      endurance:sport==='running'||sport==='velo' ? endur : undefined,
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
            <button onClick={generateWithAI} disabled={aiLoading}
              style={{ padding:'7px 14px', borderRadius:9, background:'rgba(91,111,255,0.10)', border:'1px solid rgba(91,111,255,0.35)', color:'#5b6fff', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:700, cursor:aiLoading?'default':'pointer', opacity:aiLoading?0.6:1, whiteSpace:'nowrap' as const }}>
              {aiLoading ? '⏳ Génération…' : '✨ Générer avec l\'IA'}
            </button>
            <button onClick={onCancel}
              style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', color:'var(--text-dim)', fontSize:13, fontFamily:'DM Sans,sans-serif' }}>
              Annuler
            </button>
          </div>
        </div>

        {/* ── Résultat IA ── */}
        {aiError && (
          <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', color:'#ef4444', fontSize:12 }}>
            ⚠️ {aiError}
          </div>
        )}
        {aiResult && (
          <div style={{ marginBottom:20, padding:'16px', borderRadius:14, background:'rgba(91,111,255,0.06)', border:'1px solid rgba(91,111,255,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, color:'#5b6fff' }}>✨ {aiResult.title}</p>
              <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{aiResult.totalDurationMin}min · TSS ~{aiResult.estimatedTSS}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
              {aiResult.blocks.map((b, i) => {
                const zoneColors = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
                const c = zoneColors[Math.min(b.zone - 1, 4)] ?? '#9ca3af'
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', borderRadius:8, background:'var(--bg-card2)', borderLeft:`3px solid ${c}` }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:c, fontWeight:700, minWidth:26 }}>Z{b.zone}</span>
                    <span style={{ fontSize:11, fontWeight:600, flex:1 }}>{b.label}</span>
                    <span style={{ fontSize:10, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>{b.durationMin}min</span>
                  </div>
                )
              })}
            </div>
            {aiResult.coachNotes && (
              <p style={{ fontSize:11, color:'var(--text-mid)', margin:'0 0 10px', fontStyle:'italic' as const }}>💬 {aiResult.coachNotes}</p>
            )}
            <button onClick={() => setAiResult(null)} style={{ padding:'4px 10px', borderRadius:7, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:10, cursor:'pointer' }}>✕ Fermer</button>
          </div>
        )}

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
        </div>

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

        {/* Tags */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Tags (virgule)</label>
          <input value={tagsStr} onChange={e=>setTagsStr(e.target.value)} placeholder="Force, VMA, Endurance..." style={inp}/>
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Notes / objectif</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Objectif de la seance, contexte..."
            style={{ ...inp, resize:'none' as const, lineHeight:1.5 }}/>
        </div>
      </SectionCard>

      {/* Sport-specific builder */}
      <SectionCard>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:'0 0 4px' }}>Construction</p>
        <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:'0 0 20px', color:sportColor(sport) }}>
          {sportLabel(sport)}
        </h3>
        {sport==='muscu'   && <MusculaireBuilder data={muscu} onChange={setMuscu}/>}
        {(sport==='running'||sport==='velo') && <EnduranceBuilder data={endur} sport={sport} onChange={setEndur}/>}
        {sport==='natation' && <NatationBuilder data={swim} onChange={setSwim}/>}
        {sport==='hyrox'    && <HyroxBuilder data={hyrox} onChange={setHyrox}/>}
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
function LibraryMode({ templates, onNew, onEdit, onStart }: {
  templates: SessionTemplate[]
  onNew: () => void
  onEdit: (t: SessionTemplate) => void
  onStart: (t: SessionTemplate) => void
}) {
  const [filter, setFilter] = useState<Sport|'all'>('all')
  const [toast,  setToast]  = useState('')

  const displayed = filter==='all' ? templates : templates.filter(t=>t.sport===filter)

  function sendToPlanning(t: SessionTemplate) {
    // TODO: wire to Planning — insert into planning_sessions or session_templates
    setToast(`"${t.name}" envoyee au Planning`)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#22c55e', color:'#fff', padding:'10px 22px', borderRadius:12, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, zIndex:200, boxShadow:'0 4px 20px rgba(34,197,94,0.4)' }}>
          {toast}
        </div>
      )}

      <SectionCard>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Bibliotheque</p>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'4px 0 0' }}>Seances types</h2>
          </div>
          <button onClick={onNew}
            style={{ padding:'9px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 12px rgba(0,200,224,0.3)' }}>
            + Nouvelle seance
          </button>
        </div>

        {/* Sport filter */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Pill active={filter==='all'} color="#00c8e0" onClick={()=>setFilter('all')}>Toutes</Pill>
          {SPORTS.map(s => <Pill key={s.id} active={filter===s.id} color={s.color} onClick={()=>setFilter(s.id)}>{s.label}</Pill>)}
        </div>
      </SectionCard>

      {displayed.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-dim)' }}>
          <p style={{ fontSize:14, marginBottom:16 }}>Aucune seance dans cette categorie.</p>
          <button onClick={onNew}
            style={{ padding:'11px 28px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Creer une seance
          </button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }} id="session-grid">
        {displayed.map(t => (
          <div key={t.id} style={{ position:'relative' }}>
            <TemplateCard t={t} onStart={()=>onStart(t)} onEdit={()=>onEdit(t)}/>
            <button onClick={()=>sendToPlanning(t)}
              style={{ position:'absolute', top:14, right:14, padding:'4px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:10, cursor:'pointer', fontWeight:600 }}>
              → Planning
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width:600px) { #session-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════
export default function SessionPage() {
  /* TODO: charger depuis Supabase session_templates */
  const [templates,     setTemplates]     = useState<SessionTemplate[]>(MOCK_TEMPLATES)
  const [mode,          setMode]          = useState<PageMode>('library')
  const [editTarget,    setEditTarget]    = useState<SessionTemplate|undefined>()
  const [execTarget,    setExecTarget]    = useState<SessionTemplate|undefined>()
  const { zones }                         = useTrainingZones()
  const { races }                         = usePlanning()

  function handleNew() { setEditTarget(undefined); setMode('build') }
  function handleEdit(t: SessionTemplate) { setEditTarget(t); setMode('build') }
  function handleStart(t: SessionTemplate) { setExecTarget(t); setMode('execute') }

  function handleSave(t: SessionTemplate) {
    setTemplates(prev => {
      const exists = prev.find(x=>x.id===t.id)
      return exists ? prev.map(x=>x.id===t.id?t:x) : [...prev,t]
    })
    // TODO: await supabase.from('session_templates').upsert({ user_id, ...t })
    setMode('library')
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
          {(execTarget.sport==='running'||execTarget.sport==='velo') && (
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
