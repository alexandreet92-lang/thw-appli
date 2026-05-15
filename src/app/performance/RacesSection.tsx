'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

// ─── useDarkMode ──────────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RACE_COLOR = '#f97316'
const BP = [5, 10, 20, 30, 45, 60, 90, 120]
const YEAR_PAL = ['#00c8e0','#5b6fff','#f97316','#a855f7','#f43f5e','#14b8a6','#eab308','#818cf8']

const REF_TABLES_ALL = {
  standard: [
    [9.5, 8.8, 8.0, 7.5, 7.0, 6.8, 6.4, 6.0],
    [8.0, 7.4, 6.8, 6.4, 6.0, 5.8, 5.5, 5.2],
    [6.8, 6.3, 5.8, 5.5, 5.2, 5.0, 4.7, 4.4],
    [5.8, 5.4, 5.0, 4.7, 4.5, 4.3, 4.0, 3.8],
    [5.0, 4.6, 4.2, 4.0, 3.8, 3.6, 3.4, 3.2],
    [4.0, 3.7, 3.4, 3.2, 3.0, 2.8, 2.6, 2.4],
  ],
  moderate: [
    [8.7, 8.1, 7.4, 6.9, 6.4, 6.3, 5.9, 5.5],
    [7.4, 6.8, 6.3, 5.9, 5.5, 5.3, 5.1, 4.8],
    [6.3, 5.8, 5.3, 5.1, 4.8, 4.6, 4.3, 4.0],
    [5.3, 5.0, 4.6, 4.3, 4.1, 4.0, 3.7, 3.5],
    [4.6, 4.2, 3.9, 3.7, 3.5, 3.3, 3.1, 2.9],
    [3.7, 3.4, 3.1, 2.9, 2.8, 2.6, 2.4, 2.2],
  ],
  heavy: [
    [8.1, 7.5, 6.8, 6.4, 6.2, 5.8, 5.4, 5.1],
    [6.8, 6.3, 5.8, 5.4, 5.1, 4.9, 4.7, 4.4],
    [5.8, 5.4, 4.9, 4.7, 4.4, 4.3, 4.0, 3.7],
    [4.9, 4.6, 4.3, 4.0, 3.8, 3.7, 3.4, 3.2],
    [4.3, 3.9, 3.6, 3.4, 3.2, 3.1, 2.9, 2.7],
    [3.4, 3.1, 2.9, 2.7, 2.6, 2.4, 2.2, 2.0],
  ],
} as const
type FatigueTable = keyof typeof REF_TABLES_ALL

const LEVELS = [
  { label: 'Alien',             color: '#00FF87', min: 95, max: 100 },
  { label: 'Pro top intl.',     color: '#00C8E0', min: 90, max:  94 },
  { label: 'Pro',               color: '#5B6FFF', min: 80, max:  89 },
  { label: 'Amateur haut niv.', color: '#FFD700', min: 65, max:  79 },
  { label: 'Bon amateur',       color: '#FF9500', min: 50, max:  64 },
  { label: 'Amateur',           color: '#D1D5DB', min: 30, max:  49 },
  { label: 'Débutant',          color: '#EF4444', min:  0, max:  29 },
]
const BAREM_DURS   = [10, 20, 30, 45, 60, 90]
const BAREM_BP_IDX = [ 1,  2,  3,  4,  5,  6]

const RACE_TYPES: { value: string; label: string }[] = [
  { value: 'training',    label: 'Entraînement'  },
  { value: 'race',        label: 'Course'        },
  { value: 'competition', label: 'Compétition'   },
  { value: 'granfondo',   label: 'GranFondo'     },
]
const PRE_LABELS: Record<string, string> = {
  fresh: 'Fraîche', light: 'Légère', moderate: 'Modérée', high: 'Élevée',
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PowerCurveEntry { w: number; wkg: number }
interface RaceRecord {
  id: string
  strava_activity_id: number | null
  name: string
  date: string
  race_type: string | null
  distance_km: number | null
  elevation_gain_m: number | null
  duration_seconds: number | null
  watts_avg: number | null
  watts_np: number | null
  tss: number | null
  if_score: number | null
  wpkg_np: number | null
  power_curve: Record<string, PowerCurveEntry> | null
  weight_kg: number | null
  pre_fatigue: string | null
  effort_rating: number | null
  temp_celsius: number | null
  score: number | null
  level: string | null
  notes: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function yearOf(d: string) { return d.slice(0, 4) }
function yearColor(yr: string, all: string[]) {
  return YEAR_PAL[[...all].sort().indexOf(yr) % YEAR_PAL.length] ?? '#9ca3af'
}
function secToHMS(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}'${String(sec).padStart(2,'0')}`
  return `${m}'${String(sec).padStart(2,'0')}`
}
function secToInput(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}
function toSec(hms: string): number {
  if (!hms) return 0
  const p = hms.trim().split(':').map(Number)
  if (p.some(isNaN)) return 0
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return 0
}
function levelOf(s: number) { return LEVELS.find(l => s >= l.min) ?? LEVELS[LEVELS.length - 1] }
function scoreColor(s: number) { return levelOf(s).color }
function fatigueToTable(pre: string | null): FatigueTable {
  if (!pre || pre === 'fresh' || pre === 'light') return 'standard'
  if (pre === 'moderate') return 'moderate'
  return 'heavy'
}
function interpolateRef(durMin: number, table: FatigueTable): number {
  const refs = REF_TABLES_ALL[table][0]
  if (durMin <= BP[0]) return refs[0]
  if (durMin >= BP[BP.length - 1]) return refs[BP.length - 1]
  for (let i = 0; i < BP.length - 1; i++) {
    if (durMin >= BP[i] && durMin < BP[i + 1]) {
      const t = (durMin - BP[i]) / (BP[i + 1] - BP[i])
      return refs[i] + t * (refs[i + 1] - refs[i])
    }
  }
  return refs[BP.length - 1]
}

interface RaceScoreDetails {
  alienRef: number; scoreBrut: number; total: number
  cTemp: number; cElevation: number; cRessenti: number
}
function computeRaceScore(r: {
  wpkg_np: number | null; duration_seconds: number | null
  pre_fatigue: string | null; effort_rating: number | null
  temp_celsius: number | null; elevation_gain_m: number | null; distance_km: number | null
}): RaceScoreDetails {
  const wpkg = r.wpkg_np ?? 0
  const durMin = (r.duration_seconds ?? 0) / 60
  const alienRef = interpolateRef(durMin, fatigueToTable(r.pre_fatigue))
  const scoreBrut = alienRef > 0 ? (wpkg / alienRef) * 100 : 0

  const t = r.temp_celsius ?? null
  let cTemp = 1.00
  if (t !== null) {
    if      (t >= 10 && t <= 18) cTemp = 1.00
    else if (t >=  5 && t <  10) cTemp = 1.02
    else if (t <   5)             cTemp = 1.04
    else if (t >  18 && t <= 25) cTemp = 1.01
    else if (t >  25 && t <= 30) cTemp = 1.03
    else if (t >  30)             cTemp = 1.04
  }

  const d100 = (r.elevation_gain_m ?? 0) / Math.max(1, (r.distance_km ?? 1)) * 100
  const cElevation = d100 < 500 ? 1.00 : d100 < 1000 ? 1.02 : d100 < 1500 ? 1.04 : 1.06

  const intensityMap: Record<number, number> = { 5: 1.00, 4: 1.02, 3: 1.04, 2: 1.06, 1: 1.06 }
  const cRessenti = r.effort_rating != null ? (intensityMap[r.effort_rating] ?? 1.00) : 1.00

  const total = Math.min(100, scoreBrut * cTemp * cElevation * cRessenti)
  return { alienRef, scoreBrut, total, cTemp, cElevation, cRessenti }
}
function calcScore(r: RaceRecord): number { return computeRaceScore(r).total }

// ─── Duration filters ──────────────────────────────────────────────────────────
type DurFilterId = 'lt30' | '30-60' | '1-2h' | '2-4h' | '4h+'
const DUR_FILTERS: { label: string; id: DurFilterId | null }[] = [
  { label: 'Toutes', id: null     },
  { label: '<30\'',  id: 'lt30'   },
  { label: '30-60\'',id: '30-60'  },
  { label: '1-2h',   id: '1-2h'   },
  { label: '2-4h',   id: '2-4h'   },
  { label: '4h+',    id: '4h+'    },
]
function matchDurFilter(sec: number, id: DurFilterId | null): boolean {
  const h = sec / 3600
  if (!id) return true
  if (id === 'lt30')  return sec < 1800
  if (id === '30-60') return sec >= 1800 && sec < 3600
  if (id === '1-2h')  return h >= 1 && h < 2
  if (id === '2-4h')  return h >= 2 && h < 4
  if (id === '4h+')   return h >= 4
  return true
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:10,
  border:`1px solid ${RACE_COLOR}44`, background:'var(--input-bg)',
  color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13,
  outline:'none', boxSizing:'border-box',
}
const inpGrey: React.CSSProperties = { ...inp, border:'1px solid var(--border)' }
const secBox = (bg: string, border: string): React.CSSProperties => ({
  background: bg, border:`1px solid ${border}`,
  borderRadius:12, padding:'14px 16px', marginBottom:10,
})
const secHdr: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, marginBottom:10 }
const secLbl = (color: string): React.CSSProperties => ({
  fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700,
  textTransform:'uppercase', letterSpacing:'0.07em', color,
})
const lbl10: React.CSSProperties = {
  fontSize:10, fontWeight:600, textTransform:'uppercase',
  letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4, marginTop:0,
}
const tog = (active: boolean, color = RACE_COLOR): React.CSSProperties => ({
  padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer',
  fontSize:11, fontWeight: active ? 700 : 400,
  background: active ? color : 'var(--bg-card2)',
  color: active ? '#fff' : 'var(--text-dim)',
  transition:'all 0.15s', whiteSpace:'nowrap' as const,
})

// ─── Accordion ────────────────────────────────────────────────────────────────
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginTop:12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 16px', background:'var(--bg-card2)', border:'none',
        cursor:'pointer', color:'var(--text)', fontFamily:'Syne,sans-serif',
        fontSize:12, fontWeight:700, textAlign:'left',
      }}>
        {title}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div style={{ padding:'14px 16px', background:'var(--bg-card)' }}>{children}</div>}
    </div>
  )
}

// ─── BaremeAccordion ──────────────────────────────────────────────────────────
const BAREM_TABLE_LABELS: Record<FatigueTable, string> = {
  standard: 'Standard (frais / légère)', moderate: 'Pré-fatigue modérée', heavy: 'Grosse pré-fatigue',
}
function BaremeAccordion() {
  const [tab, setTab] = useState<FatigueTable>('standard')
  const shownLevels = LEVELS.slice(0, 6)
  return (
    <Accordion title="Barème des niveaux">
      <div style={{ display:'flex', gap:5, marginBottom:12, flexWrap:'wrap' }}>
        {(['standard','moderate','heavy'] as FatigueTable[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...tog(tab === t), fontSize:10, padding:'5px 10px' }}>
            {BAREM_TABLE_LABELS[t]}
          </button>
        ))}
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', padding:'4px 6px', color:'var(--text-dim)', fontWeight:600, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>Durée</th>
              {shownLevels.map(l => (
                <th key={l.label} style={{ textAlign:'right', padding:'4px 6px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                  <span style={{ color:l.color, fontWeight:700 }}>{l.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BAREM_DURS.map((dur, ri) => (
              <tr key={dur} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding:'5px 6px', fontFamily:'DM Mono,monospace', color:'var(--text-dim)', fontWeight:600 }}>{dur} min</td>
                {shownLevels.map((l, li) => (
                  <td key={l.label} style={{ padding:'5px 6px', fontFamily:'DM Mono,monospace', color:'var(--text-mid)', textAlign:'right' }}>
                    ≥ {REF_TABLES_ALL[tab][li][BAREM_BP_IDX[ri]].toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Accordion>
  )
}

// ─── ScatterRaceSVG ───────────────────────────────────────────────────────────
const PL = 52, PR = 16, PT = 16, PB = 44
interface TooltipState { race: RaceRecord; x: number; y: number }

function ScatterRaceSVG({ races, allYears, onPointClick, highlightIds }: {
  races: RaceRecord[]
  allYears: string[]
  onPointClick: (r: RaceRecord) => void
  highlightIds: Set<string> | null
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(520)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const isDark = useDarkMode()

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(e => setW(e[0]?.contentRect.width ?? 520))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const gridColor    = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const axisColor    = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const labelColor   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const axisLblColor = isDark ? 'rgba(255,255,255,0.5)'  : 'rgba(0,0,0,0.5)'
  const dimColor     = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'

  const H = 260
  const valid = races.filter(r => r.duration_seconds && r.wpkg_np)

  if (valid.length === 0) {
    return (
      <div ref={wrapRef} style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dim)', fontSize:13 }}>
        Aucune course avec données de puissance
      </div>
    )
  }

  const maxDurMin = Math.max(...valid.map(r => (r.duration_seconds ?? 0) / 60))
  const maxWkg    = Math.max(...valid.map(r => r.wpkg_np ?? 0))

  const xStep = 30
  const xMax  = Math.max(60, Math.ceil(maxDurMin * 1.15 / 30) * 30)
  const yStep = 0.5
  const yMax  = Math.ceil(maxWkg * 1.20 / 0.5) * 0.5

  const cW = w - PL - PR
  const cH = H - PT - PB
  const px = (min: number) => PL + (min / xMax) * cW
  const py = (wkg: number) => PT + cH - (wkg / yMax) * cH

  const xTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, i) => i * xStep)
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => +(i * yStep).toFixed(1))

  return (
    <div ref={wrapRef} style={{ position:'relative', userSelect:'none' }}>
      <svg width={w} height={H} style={{ display:'block', overflow:'visible' }}>
        {/* Grid */}
        {xTicks.map(t => (
          <line key={`gx${t}`} x1={px(t)} y1={PT} x2={px(t)} y2={PT + cH} stroke={gridColor} strokeWidth={1}/>
        ))}
        {yTicks.map(t => (
          <line key={`gy${t}`} x1={PL} y1={py(t)} x2={PL + cW} y2={py(t)} stroke={gridColor} strokeWidth={1}/>
        ))}
        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke={axisColor} strokeWidth={1}/>
        <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke={axisColor} strokeWidth={1}/>
        {/* X labels */}
        {xTicks.map(t => (
          <text key={`lx${t}`} x={px(t)} y={PT + cH + 16} textAnchor="middle" fontSize={9} fill={labelColor}>
            {t === 0 ? '' : t >= 60 ? `${t / 60}h` : `${t}'`}
          </text>
        ))}
        {/* Y labels */}
        {yTicks.filter(t => t % 1 === 0 || yStep <= 0.5).map(t => (
          <text key={`ly${t}`} x={PL - 6} y={py(t) + 4} textAnchor="end" fontSize={9} fill={labelColor}>
            {t.toFixed(1)}
          </text>
        ))}
        {/* Axis labels */}
        <text x={PL + cW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill={axisLblColor}>Durée (min)</text>
        <text x={10} y={PT + cH / 2} textAnchor="middle" fontSize={9} fill={axisLblColor}
          transform={`rotate(-90, 10, ${PT + cH / 2})`}>NP W/kg</text>
        {/* Points */}
        {valid.map(r => {
          const durMin = (r.duration_seconds ?? 0) / 60
          const wkg    = r.wpkg_np ?? 0
          const yr     = yearOf(r.date)
          const col    = yearColor(yr, allYears)
          const lit    = highlightIds === null || highlightIds.has(r.id)
          const cx     = px(durMin), cy = py(wkg)
          return (
            <circle key={r.id}
              cx={cx} cy={cy}
              r={lit ? 6 : 4}
              fill={lit ? col : dimColor}
              stroke={lit ? 'var(--bg-card)' : 'transparent'}
              strokeWidth={1.5}
              style={{ cursor:'pointer', transition:'r 0.1s' }}
              onMouseEnter={e => {
                const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
                setTooltip({ race: r, x: cx, y: cy })
              }}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onPointClick(r)}
            />
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const r = tooltip.race
        const ttX = tooltip.x + PL > w * 0.6 ? tooltip.x - 160 : tooltip.x + 14
        const ttY = Math.max(4, tooltip.y - 30)
        return (
          <div style={{
            position:'absolute', left:ttX, top:ttY, zIndex:10,
            background:'var(--bg-card2)', border:'1px solid var(--border)',
            borderRadius:10, padding:'10px 12px', pointerEvents:'none',
            minWidth:160, boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>{r.name}</p>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 4px' }}>{new Date(r.date).toLocaleDateString('fr-FR',{ day:'2-digit', month:'short', year:'numeric' })}</p>
            {r.wpkg_np && <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:RACE_COLOR, margin:'0 0 3px', fontWeight:700 }}>{r.wpkg_np.toFixed(2)} W/kg NP</p>}
            {r.watts_np && <p style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text-mid)', margin:'0 0 3px' }}>{r.watts_np} W NP</p>}
            {r.distance_km && <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 3px' }}>{r.distance_km.toFixed(1)} km</p>}
            {r.elevation_gain_m && <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 3px' }}>D+ {r.elevation_gain_m} m</p>}
            {r.tss && <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>TSS {r.tss.toFixed(0)}</p>}
          </div>
        )
      })()}

      {/* Year legend */}
      {allYears.length > 0 && (
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:8, paddingLeft:PL }}>
          {[...allYears].sort().map(yr => (
            <div key={yr} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:yearColor(yr, allYears) }}/>
              <span style={{ fontSize:11, color:'var(--text-dim)' }}>{yr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StravaImportDrawer ───────────────────────────────────────────────────────
function StravaImportDrawer({ existingStravaIds, weightKg, onImported, onClose }: {
  existingStravaIds: Set<number>
  weightKg: number
  onImported: (r: RaceRecord) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setTimeout(() => setVisible(true), 10)
    void fetchActivities()
  }, [])

  async function fetchActivities() {
    try {
      const res = await fetch('/api/strava/activities?limit=100&sport_type=bike')
      const json = await res.json()
      const acts: any[] = json.activities ?? []
      const filtered = acts.filter(a => {
        const sid = a.provider_id ? Number(a.provider_id) : null
        return sid === null || !existingStravaIds.has(sid)
      })
      setActivities(filtered)
    } catch {
      setError('Impossible de charger les activités Strava')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(a: any) {
    setImporting(a.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const durSec = a.elapsed_time_s ?? a.moving_time_s ?? 0
      const distKm = a.distance_m ? a.distance_m / 1000 : null
      const wattsAvg = a.avg_watts ?? null
      const wattsNp = a.avg_watts ?? null // NP not stored separately
      const wpkgNp = wattsNp && weightKg > 0 ? wattsNp / weightKg : null

      const tempScore = wpkgNp && durSec ? computeRaceScore({
        wpkg_np: wpkgNp, duration_seconds: durSec,
        pre_fatigue: null, effort_rating: null,
        temp_celsius: null, elevation_gain_m: a.elevation_gain_m ?? null,
        distance_km: distKm,
      }) : null

      const row = {
        user_id: user.id,
        strava_activity_id: a.provider_id ? Number(a.provider_id) : null,
        name: a.title ?? 'Course Strava',
        date: (a.started_at ?? new Date().toISOString()).slice(0, 10),
        race_type: a.is_race ? 'race' : 'training',
        distance_km: distKm,
        elevation_gain_m: a.elevation_gain_m ?? null,
        duration_seconds: durSec,
        watts_avg: wattsAvg,
        watts_np: wattsNp,
        tss: a.tss ?? null,
        if_score: null,
        wpkg_np: wpkgNp,
        weight_kg: weightKg,
        score: tempScore ? +tempScore.total.toFixed(1) : null,
        level: tempScore ? levelOf(tempScore.total).label : null,
      }

      const { data, error: err } = await supabase.from('race_records').insert(row).select().single()
      if (err) throw new Error(err.message)
      onImported(data as RaceRecord)
    } catch (e: any) {
      setError(e.message ?? 'Erreur import')
    } finally {
      setImporting(null)
    }
  }

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 300)
  }
  if (!mounted) return null
  const shown = visible && !closing

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:3200,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display:'flex', alignItems:'flex-end',
      transition:'background 300ms ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{
        width:'100%', maxWidth:540, margin:'0 auto',
        maxHeight:'88vh', background:'var(--bg-card)',
        borderRadius:'20px 20px 0 0', border:`1px solid ${RACE_COLOR}30`,
        display:'flex', flexDirection:'column', overflow:'hidden',
        transform:`translateY(${shown ? '0%' : '100%'})`,
        transition:'transform 300ms ease-out',
      }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', flexShrink:0,
          background:`${RACE_COLOR}10`, borderBottom:`1px solid ${RACE_COLOR}25`,
        }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0, color:'var(--text)' }}>Importer depuis Strava</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>Activités vélo non encore importées</p>
          </div>
          <button onClick={handleClose} style={{
            width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)',
            background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 24px' }}>
          {error && <div style={{ fontSize:12, color:'#f87171', background:'rgba(239,68,68,0.1)', borderRadius:8, padding:'8px 12px', marginBottom:12 }}>{error}</div>}
          {loading && (
            <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-dim)', fontSize:12 }}>Chargement…</div>
          )}
          {!loading && activities.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-dim)', fontSize:12 }}>
              Toutes tes activités Strava vélo ont déjà été importées
            </div>
          )}
          {activities.map(a => {
            const durSec = a.elapsed_time_s ?? a.moving_time_s ?? 0
            const distKm = a.distance_m ? (a.distance_m / 1000).toFixed(1) : '—'
            const dateStr = a.started_at ? new Date(a.started_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—'
            return (
              <div key={a.id} style={{
                background:'var(--bg-card2)', border:'1px solid var(--border)',
                borderRadius:12, padding:'12px 14px', marginBottom:8,
                display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--text-dim)' }}>{dateStr}</span>
                    <span style={{ fontSize:11, color:'var(--text-mid)' }}>{distKm} km</span>
                    {a.elevation_gain_m && <span style={{ fontSize:11, color:'var(--text-mid)' }}>D+ {Math.round(a.elevation_gain_m)} m</span>}
                    <span style={{ fontSize:11, color:'var(--text-mid)' }}>{secToHMS(durSec)}</span>
                  </div>
                </div>
                <button onClick={() => void handleImport(a)} disabled={importing === a.id} style={{
                  padding:'7px 14px', borderRadius:8,
                  background:`${RACE_COLOR}15`, border:`1px solid ${RACE_COLOR}40`,
                  color: RACE_COLOR, fontSize:12, fontWeight:600,
                  cursor: importing === a.id ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', flexShrink:0,
                }}>
                  {importing === a.id ? '…' : 'Importer'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── FileUploadDrawer ─────────────────────────────────────────────────────────
interface ParsedActivity {
  name: string | null; date: string | null; duration_seconds: number | null
  distance_km: number | null; elevation_gain_m: number | null; altitude_max_m: number | null
  watts_avg: number | null; watts_np: number | null; hr_avg: number | null
  hr_max: number | null; cadence_avg: number | null; speed_avg_kmh: number | null
  calories: number | null; temp_celsius: number | null; tss: number | null
  if_score: number | null; has_power: boolean; source: 'gpx' | 'fit'
}

function FileUploadDrawer({ weightKg, onSaved, onClose }: {
  weightKg: number
  onSaved: (r: RaceRecord) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [activity, setActivity] = useState<ParsedActivity | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Editable form state — pre-filled from parsed data
  const [name,        setName]        = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [durationStr, setDurationStr] = useState('')
  const [wattsNpStr,  setWattsNpStr]  = useState('')
  const [wattsAvgStr, setWattsAvgStr] = useState('')
  const [hrAvgStr,    setHrAvgStr]    = useState('')
  const [hrMaxStr,    setHrMaxStr]    = useState('')
  const [tssStr,      setTssStr]      = useState('')
  const [tempStr,     setTempStr]     = useState('')
  const [raceType,    setRaceType]    = useState('training')
  const [preFatigue,  setPreFatigue]  = useState('fresh')
  const [effortRating,setEffortRating]= useState(3)
  const [notes,       setNotes]       = useState('')

  useEffect(() => { setMounted(true); setTimeout(() => setVisible(true), 10) }, [])

  // Pre-fill form from parsed activity
  function prefill(a: ParsedActivity) {
    if (a.name)             setName(a.name)
    if (a.date)             setDate(a.date)
    if (a.duration_seconds) setDurationStr(secToInput(a.duration_seconds))
    if (a.watts_np)         setWattsNpStr(String(a.watts_np))
    if (a.watts_avg)        setWattsAvgStr(String(a.watts_avg))
    if (a.hr_avg)           setHrAvgStr(String(a.hr_avg))
    if (a.hr_max)           setHrMaxStr(String(a.hr_max))
    if (a.tss)              setTssStr(String(a.tss))
    if (a.temp_celsius != null) setTempStr(String(a.temp_celsius))
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setActivity(null)
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/parse-activity-file', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const a: ParsedActivity = json.activity
      setActivity(a)
      prefill(a)
    } catch (err: any) {
      setError(err.message ?? 'Erreur de parsing')
      // Fallback: pre-fill name from filename
      setName(file.name.replace(/\.(gpx|fit)$/i, '').replace(/[_-]/g, ' '))
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!name || !date) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const durSec   = toSec(durationStr) || activity?.duration_seconds || null
      const np       = wattsNpStr  ? Math.round(Number(wattsNpStr))  : (activity?.watts_np  ?? null)
      const avg      = wattsAvgStr ? Math.round(Number(wattsAvgStr)) : (activity?.watts_avg ?? null)
      const wpkgNp   = np && weightKg > 0 ? +(np / weightKg).toFixed(3) : null
      const distKm   = activity?.distance_km      ?? null
      const elevGain = activity?.elevation_gain_m ?? null
      const hrAvg    = hrAvgStr ? Math.round(Number(hrAvgStr)) : (activity?.hr_avg ?? null)
      const hrMax    = hrMaxStr ? Math.round(Number(hrMaxStr)) : (activity?.hr_max ?? null)
      const tempC    = tempStr  ? Number(tempStr) : (activity?.temp_celsius ?? null)
      const tss      = tssStr   ? Number(tssStr)  : (activity?.tss ?? null)
      const ifScore  = activity?.if_score ?? null
      const cadAvg   = activity?.cadence_avg ?? null
      const spdKmh   = activity?.speed_avg_kmh ?? null
      const cals     = activity?.calories ?? null

      const sd = wpkgNp && durSec ? computeRaceScore({
        wpkg_np: wpkgNp, duration_seconds: durSec,
        pre_fatigue: preFatigue, effort_rating: effortRating,
        temp_celsius: tempC, elevation_gain_m: elevGain, distance_km: distKm,
      }) : null

      const { data, error: err } = await supabase.from('race_records').insert({
        user_id: user.id, name, date, race_type: raceType,
        distance_km: distKm, elevation_gain_m: elevGain,
        duration_seconds: durSec, watts_np: np, watts_avg: avg,
        wpkg_np: wpkgNp, weight_kg: weightKg,
        hr_avg: hrAvg, hr_max: hrMax, cadence_avg: cadAvg,
        speed_avg_kmh: spdKmh, calories: cals,
        tss, if_score: ifScore, temp_celsius: tempC,
        pre_fatigue: preFatigue, effort_rating: effortRating, notes: notes || null,
        score: sd ? +sd.total.toFixed(1) : null,
        level: sd ? levelOf(sd.total).label : null,
      }).select().single()
      if (err) throw new Error(err.message)
      onSaved(data as RaceRecord)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() { setClosing(true); setTimeout(onClose, 300) }
  if (!mounted) return null
  const shown = visible && !closing

  const npVal  = wattsNpStr  ? Number(wattsNpStr)  : null
  const wpkgNpPreview = npVal && weightKg > 0 ? (npVal / weightKg).toFixed(2) : null
  const durSec = toSec(durationStr) || activity?.duration_seconds || null
  const sd = npVal && weightKg > 0 && durSec ? computeRaceScore({
    wpkg_np: npVal / weightKg, duration_seconds: durSec,
    pre_fatigue: preFatigue, effort_rating: effortRating,
    temp_celsius: tempStr ? Number(tempStr) : null,
    elevation_gain_m: activity?.elevation_gain_m ?? null,
    distance_km: activity?.distance_km ?? null,
  }) : null

  const INTENSITY_LABELS: Record<number, string> = { 5:'À fond', 4:'Très dur', 3:'Contrôle', 2:'Facile', 1:'Très facile' }

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:3200,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display:'flex', alignItems:'flex-end', transition:'background 300ms ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{
        width:'100%', maxWidth:560, margin:'0 auto',
        maxHeight:'94vh', background:'var(--bg-card)',
        borderRadius:'20px 20px 0 0', border:`1px solid ${RACE_COLOR}30`,
        display:'flex', flexDirection:'column', overflow:'hidden',
        transform:`translateY(${shown ? '0%' : '100%'})`,
        transition:'transform 300ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', flexShrink:0,
          background:`${RACE_COLOR}10`, borderBottom:`1px solid ${RACE_COLOR}25`,
        }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0, color:'var(--text)' }}>
              {activity ? 'Données extraites — vérifiez et confirmez' : 'Upload fichier .gpx / .fit'}
            </h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>
              {activity
                ? `${activity.source.toUpperCase()} · ${Object.values(activity).filter(v => v != null && v !== false).length} champs détectés`
                : 'Extraction automatique de toutes les données disponibles'}
            </p>
          </div>
          <button onClick={handleClose} style={{
            width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)',
            background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 16px', display:'flex', flexDirection:'column', gap:12 }}>

          {/* ── File picker (always visible) */}
          <label style={{
            display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
            background:'var(--bg-card2)', border:`2px dashed ${activity ? RACE_COLOR : 'var(--border)'}`,
            borderRadius:12, cursor:'pointer',
          }}>
            {parsing
              ? <div style={{ width:18, height:18, border:`2px solid ${RACE_COLOR}40`, borderTopColor:RACE_COLOR, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activity ? RACE_COLOR : 'var(--text-dim)'} strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
            }
            <span style={{ fontSize:13, color: fileName ? 'var(--text)' : 'var(--text-dim)', flex:1 }}>
              {parsing
                ? 'Analyse du fichier en cours…'
                : fileName
                  ? `${fileName} ${activity ? '✓' : ''}`
                  : 'Choisir un fichier .gpx ou .fit'}
            </span>
            {activity && !parsing && (
              <span style={{ fontSize:10, fontWeight:700, color:'#22c55e', background:'rgba(34,197,94,0.12)', padding:'3px 8px', borderRadius:5, border:'1px solid rgba(34,197,94,0.3)' }}>
                {Object.entries(activity).filter(([k, v]) => v != null && v !== false && k !== 'source' && k !== 'has_power').length} champs extraits
              </span>
            )}
            <input type="file" accept=".gpx,.fit" onChange={handleFile} style={{ display:'none' }}/>
          </label>

          {error && (
            <div style={{ fontSize:12, color:'#f87171', background:'rgba(239,68,68,0.1)', borderRadius:8, padding:'8px 12px' }}>{error}</div>
          )}

          {/* ── No-power notice */}
          {activity && !activity.has_power && (
            <div style={{ background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.25)', borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#eab308', margin:'0 0 4px' }}>⚠ Aucun capteur de puissance détecté</p>
              <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>
                Saisis manuellement les watts NP ci-dessous, ou laisse vide.
                Le score ne sera pas calculé sans données de puissance.
              </p>
            </div>
          )}

          {/* ── IDENTIFICATION */}
          <div style={secBox('var(--bg-card2)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2.5}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              <span style={secLbl('var(--text-mid)')}>Identification</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <p style={lbl10}>Nom de la course *</p>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Tour du Ventoux" style={inp}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <p style={lbl10}>Date</p>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inpGrey}/>
                </div>
                <div>
                  <p style={lbl10}>Durée</p>
                  <input value={durationStr} onChange={e => setDurationStr(e.target.value)} placeholder="3:45:00" style={inpGrey}/>
                </div>
              </div>
              <div>
                <p style={lbl10}>Type de course</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {RACE_TYPES.map(rt => (
                    <button key={rt.value} onClick={() => setRaceType(rt.value)} style={{ ...tog(raceType === rt.value), fontSize:11 }}>
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── PERFORMANCE (only if we have some data) */}
          {(activity?.distance_km || activity?.elevation_gain_m || wattsNpStr || wattsAvgStr || hrAvgStr) && (
            <div style={secBox('rgba(234,179,8,0.06)', 'rgba(234,179,8,0.2)')}>
              <div style={secHdr}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth={2.5}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span style={secLbl('#eab308')}>Performance</span>
              </div>

              {/* Read-only GPS metrics */}
              {(activity?.distance_km || activity?.elevation_gain_m || activity?.altitude_max_m || activity?.speed_avg_kmh) && (
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
                  {activity?.distance_km && (
                    <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text)' }}>{activity.distance_km.toFixed(1)} km</span>
                  )}
                  {activity?.elevation_gain_m && (
                    <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text)' }}>D+ {activity.elevation_gain_m} m</span>
                  )}
                  {activity?.altitude_max_m && (
                    <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>Alt max {activity.altitude_max_m} m</span>
                  )}
                  {activity?.speed_avg_kmh && (
                    <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{activity.speed_avg_kmh} km/h moy</span>
                  )}
                  {activity?.calories && (
                    <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{activity.calories} kcal</span>
                  )}
                </div>
              )}

              {/* Editable power */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <p style={lbl10}>NP Watts</p>
                  <input type="number" value={wattsNpStr} onChange={e => setWattsNpStr(e.target.value)}
                    placeholder="Ex: 220" style={inpGrey}/>
                  {wpkgNpPreview && (
                    <p style={{ fontSize:11, color:RACE_COLOR, margin:'3px 0 0', fontFamily:'DM Mono,monospace' }}>{wpkgNpPreview} W/kg</p>
                  )}
                </div>
                <div>
                  <p style={lbl10}>Watts moyens</p>
                  <input type="number" value={wattsAvgStr} onChange={e => setWattsAvgStr(e.target.value)}
                    placeholder="Ex: 200" style={inpGrey}/>
                </div>
                {(hrAvgStr || activity?.hr_avg) && (
                  <div>
                    <p style={lbl10}>FC moyenne (bpm)</p>
                    <input type="number" value={hrAvgStr} onChange={e => setHrAvgStr(e.target.value)}
                      placeholder="Ex: 158" style={inpGrey}/>
                  </div>
                )}
                {(hrMaxStr || activity?.hr_max) && (
                  <div>
                    <p style={lbl10}>FC max (bpm)</p>
                    <input type="number" value={hrMaxStr} onChange={e => setHrMaxStr(e.target.value)}
                      placeholder="Ex: 178" style={inpGrey}/>
                  </div>
                )}
                {(tssStr || activity?.tss) && (
                  <div>
                    <p style={lbl10}>TSS</p>
                    <input type="number" value={tssStr} onChange={e => setTssStr(e.target.value)}
                      placeholder="Ex: 280" style={inpGrey}/>
                  </div>
                )}
                {(tempStr || activity?.temp_celsius != null) && (
                  <div>
                    <p style={lbl10}>Température (°C)</p>
                    <input type="number" value={tempStr} onChange={e => setTempStr(e.target.value)}
                      placeholder="Ex: 22" style={inpGrey}/>
                  </div>
                )}
              </div>
              {/* Cadence read-only */}
              {activity?.cadence_avg && (
                <p style={{ fontSize:11, color:'var(--text-dim)', margin:'8px 0 0' }}>
                  Cadence moy : {activity.cadence_avg} rpm
                  {activity.if_score && ` · IF : ${activity.if_score.toFixed(3)}`}
                </p>
              )}
            </div>
          )}

          {/* ── CONDITIONS */}
          <div style={secBox('var(--bg-card2)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2.5}><path d="M12 2v6M12 18v4M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M18 12h4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg>
              <span style={secLbl('var(--text-mid)')}>Conditions</span>
            </div>
            <div style={{ marginBottom:10 }}>
              <p style={lbl10}>Pré-fatigue au départ</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(['fresh','light','moderate','high'] as const).map(k => (
                  <button key={k} onClick={() => setPreFatigue(k)} style={{ ...tog(preFatigue === k), fontSize:11 }}>
                    {PRE_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <p style={lbl10}>Ressenti global</p>
              <div style={{ display:'flex', gap:5 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setEffortRating(v)} style={{
                    ...tog(effortRating === v),
                    display:'flex', flexDirection:'column', alignItems:'center', padding:'7px 10px', gap:2,
                  }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>{v}</span>
                    <span style={{ fontSize:9, opacity:0.8 }}>{INTENSITY_LABELS[v]}</span>
                  </button>
                ))}
              </div>
            </div>
            {!tempStr && !activity?.temp_celsius && (
              <div>
                <p style={lbl10}>Température (°C) — optionnel</p>
                <input type="number" value={tempStr} onChange={e => setTempStr(e.target.value)} placeholder="Ex: 22" style={{ ...inpGrey, maxWidth:130 }}/>
              </div>
            )}
            <div style={{ marginTop:10 }}>
              <p style={lbl10}>Notes (optionnel)</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations…"
                rows={2} style={{ ...inpGrey, resize:'vertical', fontFamily:'DM Sans,sans-serif' }}/>
            </div>
          </div>

          {/* ── Score preview */}
          {sd && (
            <div style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:36, fontWeight:900, color: levelOf(sd.total).color }}>{sd.total.toFixed(0)}</div>
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color: levelOf(sd.total).color }}>{levelOf(sd.total).label}</div>
                  <div style={{ height:5, width:100, borderRadius:3, background:'var(--bg-card)', marginTop:6 }}>
                    <div style={{ height:'100%', width:`${Math.min(100, sd.total)}%`, background: levelOf(sd.total).color, borderRadius:3 }}/>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding:'12px 18px 20px', background:'var(--bg-card)', borderTop:`1px solid ${RACE_COLOR}20`, flexShrink:0 }}>
          {error && <div style={{ fontSize:11, color:'#f87171', background:'rgba(239,68,68,0.1)', borderRadius:8, padding:'6px 10px', marginBottom:8 }}>{error}</div>}
          <button onClick={() => void handleSave()} disabled={!name || saving} style={{
            width:'100%', padding:'14px', borderRadius:12, border:'none',
            cursor: name && !saving ? 'pointer' : 'not-allowed',
            background: name && !saving ? `linear-gradient(135deg,${RACE_COLOR},${RACE_COLOR}cc)` : 'var(--bg-card2)',
            color: name && !saving ? '#fff' : 'var(--text-dim)',
            fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700,
          }}>
            {saving ? 'Enregistrement…' : 'Confirmer et enregistrer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── RaceCardDrawer (fiche Wingate) ───────────────────────────────────────────
function RaceCardDrawer({ race: initialRace, onSaved, onDeleted, onClose }: {
  race: RaceRecord
  onSaved: (r: RaceRecord) => void
  onDeleted: (id: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [race, setRace] = useState<RaceRecord>(initialRace)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields
  const [raceType, setRaceType] = useState(race.race_type ?? 'training')
  const [preFatigue, setPreFatigue] = useState(race.pre_fatigue ?? 'fresh')
  const [effortRating, setEffortRating] = useState(race.effort_rating ?? 3)
  const [tempStr, setTempStr] = useState(race.temp_celsius != null ? String(race.temp_celsius) : '')
  const [notes, setNotes] = useState(race.notes ?? '')
  const [wattsNpStr, setWattsNpStr] = useState(race.watts_np != null ? String(race.watts_np) : '')
  const [wattsAvgStr, setWattsAvgStr] = useState(race.watts_avg != null ? String(race.watts_avg) : '')
  const [tssStr, setTssStr] = useState(race.tss != null ? String(race.tss) : '')

  useEffect(() => { setMounted(true); setTimeout(() => setVisible(true), 10) }, [])

  const wattsNp  = wattsNpStr  ? Number(wattsNpStr)  : race.watts_np
  const wpkgNp   = wattsNp && race.weight_kg ? wattsNp / race.weight_kg : race.wpkg_np
  const durSec   = race.duration_seconds
  const distKm   = race.distance_km
  const elevGain = race.elevation_gain_m

  const sd = computeRaceScore({
    wpkg_np: wpkgNp ?? null,
    duration_seconds: durSec,
    pre_fatigue: preFatigue,
    effort_rating: effortRating,
    temp_celsius: tempStr ? Number(tempStr) : null,
    elevation_gain_m: elevGain,
    distance_km: distKm,
  })

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const np  = wattsNpStr  ? Math.round(Number(wattsNpStr))  : race.watts_np
      const avg = wattsAvgStr ? Math.round(Number(wattsAvgStr)) : race.watts_avg
      const wkg = np && race.weight_kg ? +(np / race.weight_kg).toFixed(3) : race.wpkg_np
      const { data, error: err } = await supabase.from('race_records').update({
        race_type: raceType, pre_fatigue: preFatigue, effort_rating: effortRating,
        temp_celsius: tempStr ? Number(tempStr) : null, notes,
        watts_np: np, watts_avg: avg, wpkg_np: wkg,
        tss: tssStr ? Number(tssStr) : race.tss,
        score: +sd.total.toFixed(1), level: levelOf(sd.total).label,
      }).eq('id', race.id).select().single()
      if (err) throw new Error(err.message)
      const updated = data as RaceRecord
      setRace(updated)
      onSaved(updated)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette course ?')) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('race_records').delete().eq('id', race.id)
      if (err) throw new Error(err.message)
      onDeleted(race.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  function handleClose() { setClosing(true); setTimeout(onClose, 300) }
  if (!mounted) return null
  const shown = visible && !closing
  const lvl = levelOf(sd.total)
  const INTENSITY_LABELS: Record<number, string> = { 5:'À fond', 4:'Très dur', 3:'Contrôle', 2:'Facile', 1:'Très facile' }

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:3100,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display:'flex', alignItems:'flex-end', transition:'background 300ms ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{
        width:'100%', maxWidth:540, margin:'0 auto',
        maxHeight:'94vh', background:'var(--bg-card)',
        borderRadius:'20px 20px 0 0', border:`1px solid ${RACE_COLOR}30`,
        display:'flex', flexDirection:'column', overflow:'hidden',
        transform:`translateY(${shown ? '0%' : '100%'})`,
        transition:'transform 300ms ease-out',
      }}>
        {/* ── HEADER */}
        <div style={{
          padding:'16px 20px', flexShrink:0,
          background:`${RACE_COLOR}10`, borderBottom:`1px solid ${RACE_COLOR}25`,
        }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, margin:0, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{race.name}</h2>
                <span style={{
                  fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5,
                  background:`${RACE_COLOR}20`, border:`1px solid ${RACE_COLOR}40`, color:RACE_COLOR,
                }}>{RACE_TYPES.find(t => t.value === raceType)?.label ?? raceType}</span>
              </div>
              <p style={{ fontSize:12, color:'var(--text-dim)', margin:'0 0 8px' }}>
                {new Date(race.date).toLocaleDateString('fr-FR',{ weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
              </p>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {distKm && <span style={{ fontSize:12, color:'var(--text-mid)' }}>{distKm.toFixed(1)} km</span>}
                {elevGain && <span style={{ fontSize:12, color:'var(--text-mid)' }}>D+ {elevGain} m</span>}
                {durSec && <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--text-mid)' }}>{secToHMS(durSec)}</span>}
              </div>
            </div>
            <button onClick={handleClose} style={{
              width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)',
              background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
              fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>×</button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>

          {/* PERFORMANCE */}
          <div style={secBox('rgba(234,179,8,0.08)', 'rgba(234,179,8,0.25)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth={2.5}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span style={secLbl('#eab308')}>Performance</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { lbl:'NP Watts', val: wattsNp ? `${wattsNp} W` : '—' },
                { lbl:'NP W/kg',  val: wpkgNp  ? wpkgNp.toFixed(2) : '—' },
                { lbl:'Moy Watts',val: wattsAvgStr || race.watts_avg ? `${wattsAvgStr || race.watts_avg} W` : '—' },
                { lbl:'TSS',      val: tssStr || race.tss ? `${tssStr || race.tss?.toFixed(0)}` : '—' },
                { lbl:'IF',       val: race.if_score ? race.if_score.toFixed(2) : '—' },
                { lbl:'Durée',    val: durSec ? secToHMS(durSec) : '—' },
              ].map(({ lbl, val }) => (
                <div key={lbl}>
                  <p style={lbl10}>{lbl}</p>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:15, fontWeight:800, margin:0, color:'var(--text)' }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
              <div>
                <p style={lbl10}>NP Watts</p>
                <input type="number" value={wattsNpStr} onChange={e => setWattsNpStr(e.target.value)} placeholder={race.watts_np ? String(race.watts_np) : 'Ex: 210'} style={{ ...inpGrey, fontSize:12 }}/>
              </div>
              <div>
                <p style={lbl10}>Watts moyens</p>
                <input type="number" value={wattsAvgStr} onChange={e => setWattsAvgStr(e.target.value)} placeholder={race.watts_avg ? String(race.watts_avg) : 'Ex: 195'} style={{ ...inpGrey, fontSize:12 }}/>
              </div>
              <div>
                <p style={lbl10}>TSS</p>
                <input type="number" value={tssStr} onChange={e => setTssStr(e.target.value)} placeholder={race.tss ? race.tss.toFixed(0) : 'Ex: 280'} style={{ ...inpGrey, fontSize:12 }}/>
              </div>
            </div>
          </div>

          {/* POWER CURVE */}
          {race.power_curve && Object.keys(race.power_curve).length > 0 && (
            <div style={secBox('rgba(14,165,233,0.08)', 'rgba(14,165,233,0.25)')}>
              <div style={secHdr}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth={2.5}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span style={secLbl('#0ea5e9')}>Power Curve</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr>
                      {['Durée','Watts','W/kg'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'4px 8px', color:'var(--text-dim)', fontWeight:600, borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(race.power_curve).map(([dur, v], i) => (
                      <tr key={dur} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding:'5px 8px', fontFamily:'DM Mono,monospace', color:'var(--text-dim)', fontWeight:600 }}>{dur}'</td>
                        <td style={{ padding:'5px 8px', fontFamily:'DM Mono,monospace', color:'var(--text)' }}>{v.w} W</td>
                        <td style={{ padding:'5px 8px', fontFamily:'DM Mono,monospace', color:'#0ea5e9', fontWeight:700 }}>{v.wkg.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROFIL */}
          <div style={secBox('rgba(34,197,94,0.08)', 'rgba(34,197,94,0.25)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5}><polyline points="22 17 13 8 8 13 2 7"/></svg>
              <span style={secLbl('#22c55e')}>Profil de la course</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
              {[
                { lbl:'Distance', val: distKm ? `${distKm.toFixed(1)} km` : '—' },
                { lbl:'D+',       val: elevGain ? `${elevGain} m` : '—' },
                { lbl:'D+/100km', val: distKm && elevGain ? `${((elevGain / distKm) * 100).toFixed(0)} m` : '—' },
              ].map(({ lbl, val }) => (
                <div key={lbl}>
                  <p style={lbl10}>{lbl}</p>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:15, fontWeight:800, margin:0, color:'var(--text)' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CONDITIONS */}
          <div style={secBox('var(--bg-card2)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2.5}><path d="M12 2v6M12 18v4M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M18 12h4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg>
              <span style={secLbl('var(--text-mid)')}>Conditions</span>
            </div>
            {/* Type course */}
            <div style={{ marginBottom:10 }}>
              <p style={lbl10}>Type de course</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {RACE_TYPES.map(rt => (
                  <button key={rt.value} onClick={() => setRaceType(rt.value)} style={tog(raceType === rt.value)}>{rt.label}</button>
                ))}
              </div>
            </div>
            {/* Pré-fatigue */}
            <div style={{ marginBottom:10 }}>
              <p style={lbl10}>Pré-fatigue au départ</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(['fresh','light','moderate','high'] as const).map(k => (
                  <button key={k} onClick={() => setPreFatigue(k)} style={tog(preFatigue === k)}>{PRE_LABELS[k]}</button>
                ))}
              </div>
            </div>
            {/* Ressenti */}
            <div style={{ marginBottom:10 }}>
              <p style={lbl10}>Ressenti global</p>
              <div style={{ display:'flex', gap:6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setEffortRating(v)} style={{
                    ...tog(effortRating === v),
                    display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 10px', gap:2,
                  }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>{v}</span>
                    <span style={{ fontSize:9, opacity:0.8 }}>{INTENSITY_LABELS[v]}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Température */}
            <div style={{ marginBottom:10 }}>
              <p style={lbl10}>Température (°C)</p>
              <input type="number" value={tempStr} onChange={e => setTempStr(e.target.value)} placeholder="Ex: 22" style={{ ...inpGrey, maxWidth:140 }}/>
            </div>
            {/* Notes */}
            <div>
              <p style={lbl10}>Notes</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations…" rows={3} style={{ ...inpGrey, resize:'vertical', fontFamily:'DM Sans,sans-serif' }}/>
            </div>
          </div>

          {/* SCORE */}
          <div style={secBox('rgba(139,92,246,0.08)', 'rgba(139,92,246,0.3)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2.5}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={secLbl('#8b5cf6')}>Score</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:48, fontWeight:900, color: lvl.color, lineHeight:1 }}>{sd.total.toFixed(0)}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>/100</div>
              </div>
              <div>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color: lvl.color }}>{lvl.label}</div>
                <div style={{ height:6, width:120, borderRadius:3, background:'var(--bg-card)', marginTop:8 }}>
                  <div style={{ height:'100%', width:`${Math.min(100, sd.total)}%`, background: lvl.color, borderRadius:3, transition:'width 0.4s' }}/>
                </div>
              </div>
            </div>
            {/* Détail coefficients */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {[
                { lbl:'Brut', val:`${sd.scoreBrut.toFixed(1)}`, col:'var(--text-mid)' },
                { lbl:'cTemp', val:`×${sd.cTemp.toFixed(2)}`, col: sd.cTemp > 1 ? '#22c55e' : 'var(--text-dim)' },
                { lbl:'cD+', val:`×${sd.cElevation.toFixed(2)}`, col: sd.cElevation > 1 ? '#22c55e' : 'var(--text-dim)' },
                { lbl:'cRessenti', val:`×${sd.cRessenti.toFixed(2)}`, col: sd.cRessenti > 1 ? '#22c55e' : 'var(--text-dim)' },
              ].map(({ lbl, val, col }) => (
                <div key={lbl} style={{
                  padding:'5px 10px', borderRadius:6,
                  background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)',
                }}>
                  <span style={{ fontSize:10, color:'var(--text-dim)' }}>{lbl} </span>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:col }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── FOOTER */}
        <div style={{ padding:'12px 16px 20px', background:'var(--bg-card)', borderTop:`1px solid ${RACE_COLOR}20`, flexShrink:0 }}>
          {error && <div style={{ fontSize:11, color:'#f87171', background:'rgba(239,68,68,0.1)', borderRadius:8, padding:'6px 10px', marginBottom:8 }}>{error}</div>}
          <button onClick={() => void handleSave()} disabled={saving} style={{
            width:'100%', padding:'14px', borderRadius:12, border:'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? 'var(--bg-card2)' : `linear-gradient(135deg,${RACE_COLOR},${RACE_COLOR}cc)`,
            color: saving ? 'var(--text-dim)' : '#fff',
            fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, marginBottom:8,
          }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={() => void handleDelete()} disabled={deleting} style={{
            width:'100%', padding:'10px', borderRadius:12,
            border:'1px solid rgba(239,68,68,0.4)', cursor:'pointer',
            background:'rgba(239,68,68,0.08)', color:'#f87171',
            fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600,
          }}>
            {deleting ? 'Suppression…' : 'Supprimer cette course'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── RaceRankingDrawer ────────────────────────────────────────────────────────
function RaceRankingDrawer({ races, onClose, onFilterChange, onRaceClick }: {
  races: RaceRecord[]
  onClose: () => void
  onFilterChange: (ids: Set<string> | null) => void
  onRaceClick: (r: RaceRecord) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState<string | null>(null)
  const [durFilter,  setDurFilter]  = useState<DurFilterId | null>(null)

  const allYears = [...new Set(races.map(r => yearOf(r.date)))].sort()

  useEffect(() => {
    setMounted(true)
    setTimeout(() => setVisible(true), 10)
  }, [])

  useEffect(() => {
    if (yearFilter === null && durFilter === null) { onFilterChange(null); return }
    const ids = new Set(
      races.filter(r =>
        (yearFilter === null || yearOf(r.date) === yearFilter) &&
        matchDurFilter(r.duration_seconds ?? 0, durFilter)
      ).map(r => r.id)
    )
    onFilterChange(ids)
  }, [yearFilter, durFilter, races, onFilterChange])

  function handleClose() { onFilterChange(null); setClosing(true); setTimeout(onClose, 300) }
  if (!mounted) return null
  const shown = visible && !closing

  const ranked = [...races]
    .filter(r =>
      (yearFilter === null || yearOf(r.date) === yearFilter) &&
      matchDurFilter(r.duration_seconds ?? 0, durFilter)
    )
    .map(r => ({ r, sd: computeRaceScore(r) }))
    .sort((a, b) => b.sd.total - a.sd.total)

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:3100,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display:'flex', alignItems:'flex-end', transition:'background 300ms ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{
        width:'100%', maxWidth:540, margin:'0 auto',
        maxHeight:'92vh', background:'var(--bg-card)',
        borderRadius:'20px 20px 0 0', border:`1px solid ${RACE_COLOR}30`,
        display:'flex', flexDirection:'column', overflow:'hidden',
        transform:`translateY(${shown ? '0%' : '100%'})`,
        transition:'transform 300ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', flexShrink:0,
          background:`${RACE_COLOR}10`, borderBottom:`1px solid ${RACE_COLOR}25`,
        }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0, color:'var(--text)' }}>Classement des courses</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>Score normalisé /100 — conditions incluses</p>
          </div>
          <button onClick={handleClose} style={{
            width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)',
            background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          }}>×</button>
        </div>

        {/* Filtres */}
        <div style={{ padding:'10px 16px 0', flexShrink:0, borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
            <button style={tog(yearFilter === null, RACE_COLOR)} onClick={() => setYearFilter(null)}>Toutes</button>
            {allYears.map(yr => (
              <button key={yr} style={tog(yearFilter === yr, RACE_COLOR)} onClick={() => setYearFilter(yr === yearFilter ? null : yr)}>{yr}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
            {DUR_FILTERS.map(({ label, id }) => (
              <button key={label} style={tog(durFilter === id, '#6b7280')} onClick={() => setDurFilter(id === durFilter ? null : id)}>{label}</button>
            ))}
          </div>
          {(yearFilter || durFilter) && (
            <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:8 }}>
              {ranked.length} course{ranked.length !== 1 ? 's' : ''} filtrée{ranked.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 24px' }}>
          {ranked.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-dim)', fontSize:12 }}>Aucune course pour ce filtre</div>
          )}
          {ranked.map(({ r, sd }, idx) => {
            const rank = idx + 1
            const col  = scoreColor(sd.total)
            const isOpen = expanded === r.id
            return (
              <div key={r.id} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8, overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div style={{
                    width:32, height:32, borderRadius:8, flexShrink:0,
                    background: rank === 1 ? 'rgba(251,191,36,0.15)' : 'var(--bg-card)',
                    border:`1px solid ${rank === 1 ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700,
                    color: rank === 1 ? '#fbbf24' : 'var(--text-dim)',
                  }}>{rank}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</span>
                      {rank === 1 && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>⭐ Meilleure perf</span>}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:2, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'var(--text-dim)' }}>{new Date(r.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</span>
                      {r.wpkg_np && <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:RACE_COLOR }}>{r.wpkg_np.toFixed(2)} W/kg NP</span>}
                      {r.duration_seconds && <span style={{ fontSize:11, color:'var(--text-dim)' }}>{secToHMS(r.duration_seconds)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:70 }}>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:800, color:col }}>{sd.total.toFixed(0)}</div>
                    <div style={{ height:4, borderRadius:2, background:'var(--bg-card)', marginTop:4, width:70 }}>
                      <div style={{ height:'100%', width:`${Math.min(100,sd.total)}%`, background:col, borderRadius:2 }}/>
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, color:col, marginTop:3 }}>{levelOf(sd.total).label}</div>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'12px 14px', background:'var(--bg-card)' }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                      {[
                        { lbl:'Brut', val:`${sd.scoreBrut.toFixed(1)}` },
                        { lbl:'cTemp', val:`×${sd.cTemp.toFixed(2)}` },
                        { lbl:'cD+', val:`×${sd.cElevation.toFixed(2)}` },
                        { lbl:'cRessenti', val:`×${sd.cRessenti.toFixed(2)}` },
                      ].map(({ lbl, val }) => (
                        <div key={lbl} style={{
                          padding:'4px 8px', borderRadius:5,
                          background:`${RACE_COLOR}12`, border:`1px solid ${RACE_COLOR}25`,
                          fontFamily:'DM Mono,monospace', fontSize:11,
                        }}>
                          <span style={{ color:'var(--text-dim)' }}>{lbl} </span>
                          <span style={{ color:RACE_COLOR, fontWeight:700 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => onRaceClick(r)} style={{
                      padding:'7px 14px', borderRadius:8,
                      background:`${RACE_COLOR}15`, border:`1px solid ${RACE_COLOR}40`,
                      color:RACE_COLOR, fontSize:12, fontWeight:600, cursor:'pointer',
                    }}>Ouvrir la fiche →</button>
                  </div>
                )}
              </div>
            )
          })}

          <BaremeAccordion/>
          <Accordion title="Méthode de calcul">
            <div style={{ background:'var(--bg-card2)', border:`1px solid ${RACE_COLOR}30`, borderRadius:8, padding:'10px 14px', marginBottom:8, fontFamily:'DM Mono,monospace', fontSize:12, color:RACE_COLOR }}>
              score_brut = (NP W/kg ÷ Réf. Alien) × 100
            </div>
            <div style={{ background:'var(--bg-card2)', border:`1px solid ${RACE_COLOR}30`, borderRadius:8, padding:'10px 14px', fontFamily:'DM Mono,monospace', fontSize:12, color:RACE_COLOR }}>
              score = min(100, score_brut × cTemp × cD+ × cRessenti)
            </div>
            <p style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.65, margin:'10px 0 0' }}>
              La <strong style={{ color:'var(--text)' }}>pré-fatigue</strong> est encodée dans la table de référence.
              Le coefficient <strong style={{ color:'var(--text)' }}>cD+</strong> valorise les courses montagnueuses (D+/100km).
            </p>
          </Accordion>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── RacesSection ─────────────────────────────────────────────────────────────
interface RacesSectionProps { profile: { weight: number } }

export function RacesSection({ profile }: RacesSectionProps) {
  const [races,         setRaces]         = useState<RaceRecord[]>([])
  const [loaded,        setLoaded]        = useState(false)
  const [showStrava,    setShowStrava]    = useState(false)
  const [showUpload,    setShowUpload]    = useState(false)
  const [showRanking,   setShowRanking]   = useState(false)
  const [selectedRace,  setSelectedRace]  = useState<RaceRecord | null>(null)
  const [highlightIds,  setHighlightIds]  = useState<Set<string> | null>(null)

  const handleFilterChange = useCallback((ids: Set<string> | null) => setHighlightIds(ids), [])

  const allYears = [...new Set(races.map(r => yearOf(r.date)))].sort()
  const existingStravaIds = new Set<number>(
    races.filter(r => r.strava_activity_id != null).map(r => r.strava_activity_id as number)
  )

  const loadRaces = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('race_records').select('*').eq('user_id', user.id).order('date', { ascending: true })
    if (data) setRaces(data as RaceRecord[])
    setLoaded(true)
  }, [])

  useEffect(() => { void loadRaces() }, [loadRaces])

  function handleSaved(r: RaceRecord) {
    setRaces(prev => [...prev.filter(x => x.id !== r.id), r].sort((a, b) => a.date.localeCompare(b.date)))
  }
  function handleDeleted(id: string) {
    setRaces(prev => prev.filter(x => x.id !== id))
    setSelectedRace(null)
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:16, padding:'16px 16px 12px', border:'1px solid var(--border)', marginTop:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, color:'var(--text)' }}>
            Courses &amp; Compétitions — NP W/kg par durée
          </h2>
          {loaded && races.length > 0 && (
            <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>
              {races.length} course{races.length > 1 ? 's' : ''} · cliquer sur un point pour la fiche
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={() => setShowStrava(true)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8,
            background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.3)',
            color:'#f97316', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169"/></svg>
            + Importer depuis Strava
          </button>
          <button onClick={() => setShowUpload(true)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8,
            background:'var(--bg-card2)', border:'1px solid var(--border)',
            color:'var(--text-mid)', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            + Upload fichier
          </button>
          <button onClick={() => setShowRanking(true)} disabled={races.length === 0} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8,
            background: races.length > 0 ? 'var(--bg-card2)' : 'transparent',
            border:'1px solid var(--border)', color:'var(--text-mid)',
            fontSize:12, fontWeight:600, cursor: races.length > 0 ? 'pointer' : 'not-allowed',
            whiteSpace:'nowrap', opacity: races.length > 0 ? 1 : 0.4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Classement
          </button>
        </div>
      </div>

      {/* Content */}
      {!loaded && <div className="skeleton-shimmer" style={{ height:220, borderRadius:8 }}/>}
      {loaded && races.length === 0 && (
        <div style={{
          height:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:10, border:'1px dashed var(--border)', borderRadius:12, color:'var(--text-dim)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
          <p style={{ fontSize:13, margin:0 }}>Aucune course enregistrée</p>
          <p style={{ fontSize:11, margin:0 }}>Importe depuis Strava ou uploade un fichier GPX/FIT</p>
        </div>
      )}
      {loaded && races.length > 0 && (
        <ScatterRaceSVG
          races={races}
          allYears={allYears}
          onPointClick={r => setSelectedRace(r)}
          highlightIds={highlightIds}
        />
      )}

      {/* Drawers */}
      {showStrava && (
        <StravaImportDrawer
          existingStravaIds={existingStravaIds}
          weightKg={profile.weight}
          onImported={r => { handleSaved(r); setShowStrava(false) }}
          onClose={() => setShowStrava(false)}
        />
      )}
      {showUpload && (
        <FileUploadDrawer
          weightKg={profile.weight}
          onSaved={r => { handleSaved(r); setShowUpload(false) }}
          onClose={() => setShowUpload(false)}
        />
      )}
      {selectedRace && (
        <RaceCardDrawer
          race={selectedRace}
          onSaved={r => { handleSaved(r); setSelectedRace(null) }}
          onDeleted={id => handleDeleted(id)}
          onClose={() => setSelectedRace(null)}
        />
      )}
      {showRanking && (
        <RaceRankingDrawer
          races={races}
          onFilterChange={handleFilterChange}
          onRaceClick={r => { setShowRanking(false); setSelectedRace(r) }}
          onClose={() => { setShowRanking(false); setHighlightIds(null) }}
        />
      )}
    </div>
  )
}
