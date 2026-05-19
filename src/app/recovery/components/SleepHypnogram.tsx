'use client'

import { useState, useEffect } from 'react'

// Set to true when real device sleep data is available
const hasDeviceSleepData = false

// ── Types ──────────────────────────────────────────────────────
interface SleepPhase {
  stage: 'light' | 'deep' | 'rem' | 'wake'
  startMin: number  // minutes from sleep onset
  durationMin: number
}

// ── Demo data (static, shown as "Aperçu") ─────────────────────
const DEMO_PHASES: SleepPhase[] = [
  { stage:'light', startMin:0,   durationMin:30 },
  { stage:'deep',  startMin:30,  durationMin:25 },
  { stage:'rem',   startMin:55,  durationMin:20 },
  { stage:'light', startMin:75,  durationMin:20 },
  { stage:'deep',  startMin:95,  durationMin:20 },
  { stage:'light', startMin:115, durationMin:15 },
  { stage:'rem',   startMin:130, durationMin:25 },
  { stage:'light', startMin:155, durationMin:20 },
  { stage:'wake',  startMin:175, durationMin:8  },
  { stage:'deep',  startMin:183, durationMin:17 },
  { stage:'light', startMin:200, durationMin:20 },
  { stage:'rem',   startMin:220, durationMin:25 },
  { stage:'light', startMin:245, durationMin:15 },
]

const DEMO_SLEEP_START = '22:45'
const DEMO_SLEEP_END   = '07:00'
const DEMO_CYCLES      = 3
const DEMO_SCORE       = 78

// ── Phase config ───────────────────────────────────────────────
const PHASE_CONFIG = {
  light: { label:'Léger',        color:'#60A5FA', yLevel:1 },
  deep:  { label:'Profond',      color:'#1D4ED8', yLevel:3 },
  rem:   { label:'REM',          color:'#34D399', yLevel:2 },
  wake:  { label:'Interruption', color:'#F97316', yLevel:0 },
} as const

type Stage = keyof typeof PHASE_CONFIG

function fmtMinutes(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`
}

function addMinutes(timeStr: string, min: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + min
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}

// ── Phase pills ────────────────────────────────────────────────
function PhasePills({ phases }: { phases: SleepPhase[] }) {
  const totals: Record<Stage, number> = { light:0, deep:0, rem:0, wake:0 }
  for (const p of phases) totals[p.stage] += p.durationMin

  const entries: [Stage, string][] = [
    ['light', 'Léger'],
    ['deep',  'Profond'],
    ['rem',   'REM'],
    ['wake',  'Interruptions'],
  ]
  return (
    <div style={{ display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:16 }}>
      {entries.map(([stage, label]) => (
        <div key={stage} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:20,background:`${PHASE_CONFIG[stage].color}18`,border:`1px solid ${PHASE_CONFIG[stage].color}40` }}>
          <div style={{ width:8,height:8,borderRadius:'50%',background:PHASE_CONFIG[stage].color,flexShrink:0 }} />
          <span style={{ fontSize:11,fontWeight:600,color:PHASE_CONFIG[stage].color }}>{label}</span>
          <span style={{ fontSize:12,fontWeight:700,color:'var(--text)',fontFamily:'DM Mono,monospace' }}>{fmtMinutes(totals[stage])}</span>
        </div>
      ))}
    </div>
  )
}

// ── Hypnogram SVG ──────────────────────────────────────────────
function HypnogramChart({ phases, sleepStart }: { phases: SleepPhase[]; sleepStart: string }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const id = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(id) }, [])

  const totalMin = phases.reduce((s, p) => Math.max(s, p.startMin + p.durationMin), 0)
  const W = 500, H = 80
  const LEVELS = 4
  const levelH = H / LEVELS
  const [tooltip, setTooltip] = useState<{ x:number; y:number; label:string } | null>(null)

  // Y levels: wake=0(top), light=1, rem=2, deep=3(bottom)
  const yForLevel = (lvl: number) => lvl * levelH

  return (
    <div style={{ position:'relative' as const }}>
      <div style={{ overflowX:'auto' as const }}>
        <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width:'100%',minWidth:280,height:'auto',display:'block' }}>
          {/* Grid lines */}
          {[0,1,2,3].map(lvl => (
            <line key={lvl} x1={0} y1={yForLevel(lvl) + levelH/2} x2={W} y2={yForLevel(lvl) + levelH/2}
              stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 4" />
          ))}
          {/* Y axis labels */}
          {(['wake','light','rem','deep'] as Stage[]).map((stage, i) => (
            <text key={stage} x={3} y={yForLevel(i) + levelH/2 + 4}
              fill="var(--text-dim)" fontSize={7} fontWeight={500}>
              {PHASE_CONFIG[stage].label}
            </text>
          ))}
          {/* Phase bars */}
          {phases.map((p, i) => {
            const x = (p.startMin / totalMin) * W
            const w = (p.durationMin / totalMin) * W
            const lvl = PHASE_CONFIG[p.stage].yLevel
            const y = yForLevel(lvl)
            const color = PHASE_CONFIG[p.stage].color
            const startLabel = addMinutes(sleepStart, p.startMin)
            const endLabel   = addMinutes(sleepStart, p.startMin + p.durationMin)
            return (
              <rect key={i} x={x} y={animated ? y : y + 20} width={Math.max(w - 1, 2)} height={levelH - 2}
                fill={color} rx={2} opacity={animated ? 0.85 : 0}
                onMouseEnter={() => setTooltip({ x: x + w/2, y: yForLevel(lvl) - 4, label: `${PHASE_CONFIG[p.stage].label} · ${startLabel}–${endLabel} · ${fmtMinutes(p.durationMin)}` })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor:'default', transition:`y 0.6s ease-out ${i*30}ms, opacity 0.4s ease-out ${i*30}ms` }}
              />
            )
          })}
          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect x={Math.min(tooltip.x - 60, W - 140)} y={Math.max(tooltip.y - 26, 0)} width={140} height={20} rx={4}
                fill="var(--bg-card)" stroke="var(--border)" strokeWidth={0.8} />
              <text x={Math.min(tooltip.x - 60, W - 140) + 6} y={Math.max(tooltip.y - 26, 0) + 13}
                fill="var(--text)" fontSize={8}>{tooltip.label}</text>
            </g>
          )}
          {/* X axis time labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <text key={i} x={frac * W} y={H + 14}
              textAnchor="middle" fill="var(--text-dim)" fontSize={8}>
              {addMinutes(sleepStart, Math.round(frac * totalMin))}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ── Summary bar ────────────────────────────────────────────────
function SummaryBar({ phases, sleepStart, sleepEnd }: { phases: SleepPhase[]; sleepStart: string; sleepEnd: string }) {
  const totalMin = phases.reduce((s, p) => Math.max(s, p.startMin + p.durationMin), 0)
  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
        <span style={{ fontSize:10,color:'var(--text-dim)' }}>{sleepStart}</span>
        <span style={{ fontSize:10,color:'var(--text-dim)' }}>{sleepEnd}</span>
      </div>
      <div style={{ display:'flex',height:10,borderRadius:5,overflow:'hidden',gap:0 }}>
        {phases.map((p, i) => {
          const widthPct = (p.durationMin / totalMin) * 100
          return (
            <div key={i} style={{ width:`${widthPct}%`,height:'100%',background:PHASE_CONFIG[p.stage].color,flexShrink:0 }} />
          )
        })}
      </div>
    </div>
  )
}

// ── Score circle ───────────────────────────────────────────────
function ScoreCircle({ score }: { score: number }) {
  const R = 20, C = 2 * Math.PI * R
  const [offset, setOffset] = useState(C)
  useEffect(() => { const id = setTimeout(() => setOffset(C - (score / 100) * C), 150); return () => clearTimeout(id) }, [score, C])
  return (
    <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4 }}>
      <svg width={54} height={54} viewBox="0 0 54 54">
        <circle cx={27} cy={27} r={R} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle cx={27} cy={27} r={R} fill="none" stroke="#8B5CF6" strokeWidth={5}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
          transform="rotate(-90 27 27)" style={{ transition:'stroke-dashoffset 1.2s ease-out' }} />
        <text x={27} y={31} textAnchor="middle" fill="#8B5CF6" fontSize={12} fontWeight={700}>{score}</text>
      </svg>
      <span style={{ fontSize:9,color:'var(--text-dim)',textAlign:'center' as const }}>Score<br/>sommeil</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function SleepHypnogram() {
  const phases = hasDeviceSleepData ? [] : DEMO_PHASES
  const sleepStart = DEMO_SLEEP_START
  const sleepEnd   = DEMO_SLEEP_END

  return (
    <div style={{ position:'relative' as const,marginTop:4 }}>
      <div style={{ padding:'16px',borderRadius:14,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
        {/* Phase pills */}
        <PhasePills phases={phases} />

        {/* Hypnogram + score */}
        <div style={{ display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap' as const }}>
          <div style={{ flex:1,minWidth:200 }}>
            <HypnogramChart phases={phases} sleepStart={sleepStart} />
          </div>
          <div style={{ display:'flex',flexDirection:'column' as const,alignItems:'center',gap:8,paddingTop:4 }}>
            <ScoreCircle score={DEMO_SCORE} />
            <div style={{ textAlign:'center' as const }}>
              <p style={{ fontSize:10,color:'var(--text-dim)',margin:0 }}>{DEMO_CYCLES} cycles</p>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ marginTop:12 }}>
          <SummaryBar phases={phases} sleepStart={sleepStart} sleepEnd={sleepEnd} />
        </div>
      </div>

      {/* "Aperçu" overlay when no real device data */}
      {!hasDeviceSleepData && (
        <div style={{ position:'absolute' as const,inset:0,borderRadius:14,background:'rgba(var(--bg-card-rgb,255,255,255),0.55)',backdropFilter:'blur(2px)',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:10,pointerEvents:'none' as const }}>
          <div style={{ padding:'8px 16px',borderRadius:20,background:'rgba(139,92,246,0.12)',border:'1px solid rgba(139,92,246,0.35)',textAlign:'center' as const }}>
            <p style={{ fontSize:12,fontWeight:700,color:'#8B5CF6',margin:'0 0 3px' }}>Aperçu</p>
            <p style={{ fontSize:10,color:'var(--text-mid)',margin:0,lineHeight:1.4 }}>Connecte Polar, Garmin ou Oura<br/>pour voir tes données réelles</p>
          </div>
        </div>
      )}
    </div>
  )
}
