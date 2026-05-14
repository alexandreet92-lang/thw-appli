'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import type { ZoneSport } from '@/hooks/useTrainingZones'
import { SportTabs } from '@/components/ui/SportTabs'

// ── Types ────────────────────────────────────────────────────────
type RecordSport = 'bike' | 'run' | 'swim' | 'rowing' | 'triathlon' | 'hyrox' | 'gym'

interface Props {
  onSelect: (label: string, value: string) => void
  selectedDatum: { label: string; value: string } | null
  profile: {
    ftp: number; weight: number; age: number; lthr: number
    hrMax: number; hrRest: number; thresholdPace: string
    vma: number; css: string; vo2max: number
  }
  onOpenAI?: (prompt: string) => void
}

// ── Shared primitives ────────────────────────────────────────────
const Z_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444', '#991B1B', '#6B21A8']

const YEAR_COLORS: Record<string, string> = {
  '2024': '#00c8e0',
  '2023': '#5b6fff',
  '2022': '#22c55e',
  '2021': '#f97316',
  '2020': '#a855f7',
}
const YEAR_DEFAULT_COLOR = '#9ca3af'

// Couleurs sport Design System §2.3 — fixes et immuables
const SPORT_DS_COLOR: Record<string, string> = {
  running:  '#22c55e',
  trail:    '#84cc16',
  cycling:  '#3b82f6',
  swimming: '#06b6d4',
  rowing:   '#14b8a6',
  hyrox:    '#ec4899',
  gym:      '#8b5cf6',
  ski:      '#9ca3af',
  other:    '#9ca3af',
}

// ── Power Curve: couleurs par rang (plus récent = index 0) ──────
const PC_COLORS = ['#60B4FF', '#2563EB', '#EAB308', '#F97316', '#EF4444'] as const
function getPCColor(yr: string, sortedDesc: string[]): string {
  const idx = sortedDesc.indexOf(yr)
  return idx >= 0 && idx < PC_COLORS.length ? PC_COLORS[idx] : YEAR_DEFAULT_COLOR
}

// ── Chart helpers ────────────────────────────────────────────────

/** Interpolation monotone Fritsch-Carlson — courbe cubique sans dépassement */
function monotonePath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  const n = pts.length
  const dx: number[] = [], slope: number[] = [], m: number[] = new Array(n)
  for (let i = 0; i < n - 1; i++) {
    dx[i]    = pts[i + 1][0] - pts[i][0]
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  m[0] = slope[0]; m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-9) { m[i] = m[i + 1] = 0; continue }
    const a = m[i] / slope[i], b = m[i + 1] / slope[i], s = a * a + b * b
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * slope[i]; m[i + 1] = t * b * slope[i] }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const x1 = pts[i][0] + dx[i] / 3,     y1 = pts[i][1] + m[i] * dx[i] / 3
    const x2 = pts[i + 1][0] - dx[i] / 3, y2 = pts[i + 1][1] - m[i + 1] * dx[i] / 3
    d += ` C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`
  }
  return d
}

/** Chemin d'aire sous la courbe monotone, fermé à baseY */
function monotonoArea(pts: [number, number][], baseY: number): string {
  const curve = monotonePath(pts)
  if (!curve) return ''
  const last = pts[pts.length - 1], first = pts[0]
  return `${curve} L${last[0].toFixed(1)},${baseY.toFixed(1)} L${first[0].toFixed(1)},${baseY.toFixed(1)} Z`
}

// ── Utility functions ────────────────────────────────────────────
function parseSec(pace: string): number {
  const p = pace.split(':')
  return parseInt(p[0]) * 60 + (parseInt(p[1]) || 0)
}

function secToStr(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** Formate une durée en heures → "4h53" (convention HhMM, pas de zéro devant les heures) */
function fmtHhMM(h: number): string {
  const totalMin = Math.round(h * 60)
  const hrs  = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hrs}h${String(mins).padStart(2, '0')}`
}

function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  if (p.some(n => isNaN(n))) return 0
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}

function calcPacePerKm(distKm: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
  if (!s) return '—'
  const sPerKm = s / distKm
  return `${Math.floor(sPerKm / 60)}:${String(Math.round(sPerKm % 60)).padStart(2, '0')}/km`
}

function calcSplit500m(distM: number, timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const p = timeStr.split(':').map(Number)
  const s = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
  if (!s) return '—'
  const sp = (s / distM) * 500
  return `${Math.floor(sp / 60)}:${String(Math.round(sp % 60)).padStart(2, '0')}/500m`
}

// ── Zone calculators ─────────────────────────────────────────────
const BIKE_ZONE_LABELS = ['Récup', 'Aérobie', 'Tempo', 'Seuil', 'VO2max', 'Anaérobie', 'Neuromusculaire']

function calcBikeZones(ftp: number) {
  return [
    { z: 'Z1', label: 'Récup',           minW: 0,                       maxW: Math.round(ftp * 0.55) },
    { z: 'Z2', label: 'Aérobie',         minW: Math.round(ftp * 0.56),  maxW: Math.round(ftp * 0.75) },
    { z: 'Z3', label: 'Tempo',           minW: Math.round(ftp * 0.76),  maxW: Math.round(ftp * 0.87) },
    { z: 'Z4', label: 'Seuil',           minW: Math.round(ftp * 0.88),  maxW: Math.round(ftp * 1.05) },
    { z: 'Z5', label: 'VO2max',          minW: Math.round(ftp * 1.06),  maxW: Math.round(ftp * 1.20) },
    { z: 'Z6', label: 'Anaérobie',       minW: Math.round(ftp * 1.21),  maxW: Math.round(ftp * 1.50) },
    { z: 'Z7', label: 'Neuromusculaire', minW: Math.round(ftp * 1.51),  maxW: Math.round(ftp * 2.50) },
  ]
}

function calcRunZones(tSec: number) {
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(Math.round(tSec * 1.25))}/km` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(Math.round(tSec * 1.11))} - ${secToStr(Math.round(tSec * 1.25))}/km` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(Math.round(tSec * 1.01))} - ${secToStr(Math.round(tSec * 1.10))}/km` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(Math.round(tSec * 0.91))} - ${secToStr(Math.round(tSec * 1.00))}/km` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(Math.round(tSec * 0.90))}/km` },
  ]
}

function calcRunZonesFromInputs(km10TotalSec: number, endurSecPerKm: number) {
  const secPerKm  = km10TotalSec / 10
  const threshSec = Math.round(secPerKm * 1.06)
  const vo2maxSec = Math.round(secPerKm * 0.95)
  const z1Bound   = endurSecPerKm + 30
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(z1Bound)}/km` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(endurSecPerKm)} – ${secToStr(z1Bound)}/km` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(threshSec)} – ${secToStr(endurSecPerKm)}/km` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(vo2maxSec)} – ${secToStr(threshSec)}/km` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(vo2maxSec)}/km` },
  ]
}

function calcSwimZones(cssSec: number) {
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(Math.round(cssSec * 1.35))}/100m` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(Math.round(cssSec * 1.16))} - ${secToStr(Math.round(cssSec * 1.34))}/100m` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(Math.round(cssSec * 1.06))} - ${secToStr(Math.round(cssSec * 1.15))}/100m` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(Math.round(cssSec * 0.98))} - ${secToStr(Math.round(cssSec * 1.05))}/100m` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(Math.round(cssSec * 0.97))}/100m` },
  ]
}

function calcHRZones(hrMax: number, _hrRest?: number) {
  // Coggan/Allen model — pourcentages FCmax
  return [
    { z: 'Z1', label: 'Récup',   min: 0,                              max: Math.round(hrMax * 0.68) },
    { z: 'Z2', label: 'Aérobie', min: Math.round(hrMax * 0.69),       max: Math.round(hrMax * 0.83) },
    { z: 'Z3', label: 'Tempo',   min: Math.round(hrMax * 0.84),       max: Math.round(hrMax * 0.94) },
    { z: 'Z4', label: 'Seuil',   min: Math.round(hrMax * 0.95),       max: hrMax },
    { z: 'Z5', label: 'VO2max',  min: hrMax,                          max: hrMax },
  ]
}

function calcRowZones(splitSec: number) {
  return [
    { z: 'Z1', label: 'Récup',   range: `> ${secToStr(Math.round(splitSec * 1.22))}/500m` },
    { z: 'Z2', label: 'Aérobie', range: `${secToStr(Math.round(splitSec * 1.11))} - ${secToStr(Math.round(splitSec * 1.22))}/500m` },
    { z: 'Z3', label: 'Tempo',   range: `${secToStr(Math.round(splitSec * 1.03))} - ${secToStr(Math.round(splitSec * 1.11))}/500m` },
    { z: 'Z4', label: 'Seuil',   range: `${secToStr(Math.round(splitSec * 0.97))} - ${secToStr(Math.round(splitSec * 1.03))}/500m` },
    { z: 'Z5', label: 'VO2max',  range: `< ${secToStr(Math.round(splitSec * 0.97))}/500m` },
  ]
}

// ── Data constants — labels fixes, valeurs depuis la DB ──────────
const BIKE_DURS = ['Pmax','10s','30s','1min','3min','5min','8min','10min','12min','15min','20min','30min','1h','90min','2h','3h','4h','5h','6h']

const DUR_SECS: Record<string, number> = {
  'Pmax':1, '10s':10, '30s':30, '1min':60, '3min':180, '5min':300,
  '8min':480, '10min':600, '12min':720, '15min':900, '20min':1200,
  '30min':1800, '1h':3600, '90min':5400, '2h':7200, '3h':10800,
  '4h':14400, '5h':18000, '6h':21600,
}

const RUN_DISTS = ['400m','1km','5km','10km','Semi','Marathon','50km','100km']
const RUN_KM: Record<string,number> = { '400m':0.4,'1km':1,'5km':5,'10km':10,'Semi':21.1,'Marathon':42.195,'50km':50,'100km':100 }

const SWIM_DISTS = ['100m','200m','400m','1000m','1500m','2000m','5000m','10000m']
const SWIM_M: Record<string,number> = { '100m':100,'200m':200,'400m':400,'1000m':1000,'1500m':1500,'2000m':2000,'5000m':5000,'10000m':10000 }

const ROW_DISTS = ['500m','1000m','2000m','5000m','10000m','Semi','Marathon']
const ROW_M: Record<string,number> = { '500m':500,'1000m':1000,'2000m':2000,'5000m':5000,'10000m':10000,'Semi':21097,'Marathon':42195 }

// Formats triathlon avec distances des 3 disciplines
const TRIATHLON_FORMATS: { id: string; label: string; swim: string; bike: string; run: string }[] = [
  { id: 'XS',        label: 'XS',        swim: '400m',   bike: '10 km',  run: '2,5 km' },
  { id: 'S',         label: 'Sprint',    swim: '750m',   bike: '20 km',  run: '5 km'   },
  { id: 'M',         label: 'Olympique', swim: '1500m',  bike: '40 km',  run: '10 km'  },
  { id: '70.3',      label: '70.3',      swim: '1900m',  bike: '90 km',  run: '21,1 km'},
  { id: 'Ironman',   label: 'Ironman',   swim: '3800m',  bike: '180 km', run: '42,2 km'},
]

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmers Carry','Sandbag Lunges','Wall Balls']
interface HyroxRecord {
  format: string; date: string; total: string; roxzone: string; penalties: string
  stations: Record<string, string>; runs: string[]
}

const GYM_MOVES = [
  { name:'Bench Press',    recs:[{l:'1RM',v:0},{l:'3RM',v:0},{l:'5RM',v:0},{l:'10RM',v:0},{l:'Max reps PDC',v:0}] },
  { name:'Squat',          recs:[{l:'1RM',v:0},{l:'3RM',v:0},{l:'5RM',v:0},{l:'10RM',v:0},{l:'Max reps PDC',v:0}] },
  { name:'Deadlift',       recs:[{l:'1RM',v:0},{l:'3RM',v:0},{l:'5RM',v:0},{l:'10RM',v:0},{l:'Max reps PDC',v:0}] },
  { name:'Tractions',      recs:[{l:'Max reps PDC',v:0},{l:'1RM+charge',v:0}] },
  { name:'Dips',           recs:[{l:'Max reps PDC',v:0},{l:'1RM+charge',v:0}] },
  { name:'Dev. militaire', recs:[{l:'Max charge',v:0}] },
  { name:'Pompes',         recs:[{l:'Max reps',v:0}] },
]

// ── Sports Records Types ─────────────────────────────────────────
interface SpRecord {
  id: string
  sport: string
  distance_label: string
  performance: string
  performance_unit: string
  achieved_at: string
  split_swim?: string | null
  split_t1?:   string | null
  split_bike?: string | null
  split_t2?:   string | null
  split_run?:  string | null
}

interface HyroxRace {
  id: string
  user_id: string
  date: string
  format: 'solo_open' | 'solo_pro' | 'duo_open' | 'duo_pro'
  partenaire: string | null
  temps_final: string
  temps_run_total: string | null
  stations: Record<string, string>
  runs: string[]
  created_at: string
}

const HYROX_FORMAT_LABELS: Record<string, string> = {
  solo_open: 'Solo Open',
  solo_pro:  'Solo Pro',
  duo_open:  'Duo Open',
  duo_pro:   'Duo Pro',
}

const CHART_DISTS: Record<string, string[]> = {
  run:    ['5km', '10km', 'Semi', 'Marathon'],
  swim:   ['100m', '200m', '400m', '1500m'],
  rowing: ['500m', '2000m', '5000m'],
}


// ── TimeBarChart ─────────────────────────────────────────────────
// Taller bar = slower = worse. Supabase data only.
function TimeBarChart({ records, chartDists, color }: {
  records: SpRecord[]
  chartDists: string[]
  color: string
}) {
  const [selDist, setSelDist] = useState(chartDists[0] ?? '')
  const [hovIdx, setHovIdx]   = useState<number | null>(null)

  const distRecs = records.filter(r => r.distance_label === selDist && r.performance !== '—')

  const byYear: Record<string, { perf: string; date: string }> = {}
  for (const rec of distRecs) {
    const yr = rec.achieved_at.slice(0, 4)
    if (!byYear[yr] || toSec(rec.performance) < toSec(byYear[yr].perf)) {
      byYear[yr] = { perf: rec.performance, date: rec.achieved_at }
    }
  }
  const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a))

  const W = 360, H = 160, padL = 48, padR = 16, padT = 20, padB = 36
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  function fmtSec(s: number): string {
    if (s >= 3600) {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60
      return `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`
    }
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {chartDists.map(d => (
          <button key={d} onClick={() => setSelDist(d)} style={{
            padding: '4px 10px', borderRadius: 6,
            background: selDist === d ? `${color}22` : 'var(--bg-card2)',
            border: `1px solid ${selDist === d ? color : 'var(--border)'}`,
            color: selDist === d ? color : 'var(--text-dim)',
            fontSize: 11, fontWeight: selDist === d ? 600 : 400, cursor: 'pointer',
          }}>{d}</button>
        ))}
      </div>
      {sortedYears.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
          Ajoute un record {selDist} pour voir l'évolution annuelle.
        </p>
      ) : (() => {
        const maxSec = Math.max(...sortedYears.map(y => toSec(byYear[y].perf)))
        const minSec = Math.min(...sortedYears.map(y => toSec(byYear[y].perf)))
        const range   = maxSec - minSec || maxSec * 0.1 || 60
        const topSec  = maxSec + range * 0.2
        const barW    = Math.min(40, plotW / sortedYears.length * 0.65)
        const gap     = plotW / sortedYears.length
        const bh  = (s: number) => (s / topSec) * plotH
        const bx  = (i: number) => padL + gap * i + gap / 2 - barW / 2
        const by  = (s: number) => padT + plotH - bh(s)
        return (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {[0, 0.5, 1].map(f => {
              const y = padT + plotH * (1 - f)
              return (
                <g key={f}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
                  <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--text-dim)">{fmtSec(Math.round(topSec * f))}</text>
                </g>
              )
            })}
            {sortedYears.map((yr, i) => {
              const secs  = toSec(byYear[yr].perf)
              const x     = bx(i), y = by(secs), h = bh(secs)
              const col   = getPCColor(yr, sortedYears)
              const isHov = hovIdx === i
              const isBest = secs === minSec
              return (
                <g key={yr} onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}>
                  <rect x={x} y={y} width={barW} height={h}
                    fill={`${col}${isHov ? 'ee' : '88'}`} stroke={col}
                    strokeWidth={isBest ? 2 : 1} rx={3} />
                  {isBest && <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={7} fill={col} fontWeight="bold">★</text>}
                  {(isHov || isBest) && (
                    <text x={x + barW / 2} y={y - (isBest ? 15 : 6)} textAnchor="middle" fontSize={8} fill={col} fontWeight="600">
                      {byYear[yr].perf}
                    </text>
                  )}
                  <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize={9}
                    fill={isHov ? col : 'var(--text-dim)'}>{yr}</text>
                </g>
              )
            })}
            <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border)" strokeWidth={0.5} />
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border)" strokeWidth={0.5} />
          </svg>
        )
      })()}
    </div>
  )
}

// ── HyroxTotalChart ───────────────────────────────────────────────
function HyroxTotalChart({ races, bestId, bestByYear }: {
  races: HyroxRace[]
  bestId: string | null
  bestByYear: Record<string, string>  // year → race id
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)
  const W = 360, H = 150, padL = 50, padR = 16, padT = 24, padB = 40
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const maxSec = Math.max(...races.map(r => toSec(r.temps_final)))
  const range  = maxSec * 0.15 || 300
  const topSec = maxSec + range
  const barW   = Math.min(36, plotW / races.length * 0.65)
  const gap    = plotW / races.length
  const bh = (s: number) => (s / topSec) * plotH
  const bx = (i: number) => padL + gap * i + gap / 2 - barW / 2
  const by = (s: number) => padT + plotH - bh(s)
  const minSec = Math.min(...races.map(r => toSec(r.temps_final)))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {[0, 0.5, 1].map(f => {
        const y = padT + plotH * (1 - f)
        const s = Math.round(topSec * f)
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--text-dim)">
              {`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
            </text>
          </g>
        )
      })}
      {races.map((r, i) => {
        const secs  = toSec(r.temps_final)
        const year  = r.date.slice(0, 4)
        const x = bx(i), y = by(secs), h = bh(secs)
        const isBestAll  = r.id === bestId
        const isBestYear = bestByYear[year] === r.id && !isBestAll
        const isHov      = hovIdx === i
        const col        = isBestAll ? '#ef4444' : isBestYear ? '#ef444488' : '#ef444433'
        return (
          <g key={r.id} onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}>
            <rect x={x} y={y} width={barW} height={h}
              fill={isHov ? '#ef4444bb' : col}
              stroke={isBestAll ? '#ef4444' : isBestYear ? '#ef444488' : 'none'} strokeWidth={isBestAll ? 2 : 1} rx={3} />
            {/* Étoile meilleur global */}
            {isBestAll && <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight="bold">★</text>}
            {/* Demi-étoile meilleur annuel */}
            {isBestYear && <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={7} fill="#ef4444aa" fontWeight="600">✦</text>}
            {(isHov || secs === minSec) && (
              <text x={x + barW / 2} y={y - (isBestAll ? 16 : isBestYear ? 14 : 6)} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight="600">
                {r.temps_final}
              </text>
            )}
            <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize={8}
              fill={isHov ? '#ef4444' : 'var(--text-dim)'}>{r.date.slice(0, 7)}</text>
            <text x={x + barW / 2} y={H - padB + 23} textAnchor="middle" fontSize={7} fill="var(--text-dim)">
              {(HYROX_FORMAT_LABELS[r.format] ?? r.format).replace(' ', '·')}
            </text>
          </g>
        )
      })}
      <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border)" strokeWidth={0.5} />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border)" strokeWidth={0.5} />
    </svg>
  )
}

// ── HyroxSection ─────────────────────────────────────────────────
function HyroxSection({ onSelect, selectedDatum }: {
  onSelect: (label: string, value: string) => void
  selectedDatum: { label: string; value: string } | null
}) {
  const [races,    setRaces]    = useState<HyroxRace[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [c1Format, setC1Format] = useState('all')
  const [c2Id,     setC2Id]     = useState<string | null>(null)

  // Form state
  const [fDate,       setFDate]       = useState(new Date().toISOString().slice(0, 10))
  const [fFormat,     setFFormat]     = useState<HyroxRace['format']>('solo_open')
  const [fPartenaire, setFPartenaire] = useState('')
  const [fFinal,      setFFinal]      = useState('')
  const [fStations,   setFStations]   = useState<Record<string, string>>(
    () => Object.fromEntries(HYROX_STATIONS.map(s => [s, '']))
  )
  const [fRuns, setFRuns] = useState<string[]>(() => Array(8).fill('') as string[])

  useEffect(() => { void loadRaces() }, [])

  async function loadRaces() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('hyrox_races')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (data) setRaces(data as HyroxRace[])
    setLoading(false)
  }

  function resetForm() {
    setFDate(new Date().toISOString().slice(0, 10))
    setFFormat('solo_open')
    setFPartenaire('')
    setFFinal('')
    setFStations(Object.fromEntries(HYROX_STATIONS.map(s => [s, ''])))
    setFRuns(Array(8).fill('') as string[])
  }

  async function saveRace() {
    if (!fFinal) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const totalRunSec = fRuns.reduce((acc, r) => acc + toSec(r), 0)
      const totalRunStr = totalRunSec > 0
        ? `${Math.floor(totalRunSec / 60)}:${String(totalRunSec % 60).padStart(2, '0')}`
        : null
      const { data: ins } = await supabase.from('hyrox_races').insert({
        user_id: user.id, date: fDate, format: fFormat,
        partenaire: fPartenaire || null, temps_final: fFinal,
        temps_run_total: totalRunStr,
        stations: fStations,
        runs: fRuns.filter(r => r !== ''),
      }).select().single()
      if (ins) {
        const newRace = ins as HyroxRace
        setRaces(prev => [newRace, ...prev])
        setC2Id(newRace.id)
      }
    }
    setSaving(false)
    setShowModal(false)
    resetForm()
  }

  const c1Races = races
    .filter(r => c1Format === 'all' || r.format === c1Format)
    .slice(0, 12)

  // Meilleur global parmi les courses affichées
  const bestId = c1Races.length > 0
    ? c1Races.reduce((b, r) => toSec(r.temps_final) < toSec(b.temps_final) ? r : b).id
    : null

  // Meilleur par année (pour l'indicateur ✦ sur le graphique)
  const bestByYear: Record<string, string> = {}
  for (const r of c1Races) {
    const yr = r.date.slice(0, 4)
    if (!bestByYear[yr] || toSec(r.temps_final) < toSec(c1Races.find(x => x.id === bestByYear[yr])!.temps_final)) {
      bestByYear[yr] = r.id
    }
  }
  const selectedRace = races.find(r => r.id === c2Id) ?? races[0] ?? null

  if (loading) {
    return <Card><p style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Chargement…</p></Card>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Chart 1: total times */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Courses Hyrox</h2>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
              {races.length === 0 ? 'Aucune course enregistrée' : `${races.length} course${races.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            padding: '7px 14px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg,#ef4444,#f97316)',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>+ Ajouter</button>
        </div>

        {races.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
            Ajoute ta première course Hyrox pour voir les graphiques.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Format :</span>
              {(['all', 'solo_open', 'solo_pro', 'duo_open', 'duo_pro'] as const).map(f => (
                <button key={f} onClick={() => setC1Format(f)} style={{
                  padding: '3px 9px', borderRadius: 6,
                  background: c1Format === f ? 'rgba(239,68,68,0.15)' : 'var(--bg-card2)',
                  border: `1px solid ${c1Format === f ? '#ef4444' : 'var(--border)'}`,
                  color: c1Format === f ? '#ef4444' : 'var(--text-dim)',
                  fontSize: 10, fontWeight: c1Format === f ? 700 : 400, cursor: 'pointer',
                }}>
                  {f === 'all' ? 'Tous' : (HYROX_FORMAT_LABELS[f] ?? f)}
                </button>
              ))}
            </div>
            {c1Races.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '8px 0' }}>
                Aucune course {HYROX_FORMAT_LABELS[c1Format] ?? ''} enregistrée.
              </p>
            ) : (
              <HyroxTotalChart races={c1Races} bestId={bestId} bestByYear={bestByYear} />
              {c1Races.length > 0 && (
                <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'flex-end', marginTop:4 }}>
                  <span style={{ fontSize:9, color:'var(--text-dim)', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ color:'#ef4444', fontWeight:700 }}>★</span> Meilleur global
                  </span>
                  <span style={{ fontSize:9, color:'var(--text-dim)', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ color:'#ef4444aa', fontWeight:700 }}>✦</span> Meilleur annuel
                  </span>
                </div>
              )}
            )}
          </>
        )}
      </Card>

      {/* Chart 2: station detail */}
      {races.length > 0 && (
        <Card>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Détail par station</h2>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {races.slice(0, 8).map(r => {
              const isActive = selectedRace?.id === r.id
              return (
                <button key={r.id} onClick={() => setC2Id(r.id)} style={{
                  padding: '4px 10px', borderRadius: 7,
                  background: isActive ? 'rgba(239,68,68,0.15)' : 'var(--bg-card2)',
                  border: `1px solid ${isActive ? '#ef4444' : 'var(--border)'}`,
                  color: isActive ? '#ef4444' : 'var(--text-dim)',
                  fontSize: 10, cursor: 'pointer',
                }}>
                  {r.date.slice(0, 7)} · {HYROX_FORMAT_LABELS[r.format] ?? r.format}
                </button>
              )
            })}
          </div>
          {selectedRace && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 3px' }}>Temps total</p>
                  <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#ef4444', margin: 0 }}>{selectedRace.temps_final}</p>
                </div>
                {selectedRace.partenaire && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 3px' }}>Partenaire</p>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedRace.partenaire}</p>
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Stations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {HYROX_STATIONS.map((s, i) => {
                  const time = selectedRace.stations[s] ?? '—'
                  const sel  = selectedDatum?.label === `Hyrox ${s}` && selectedDatum?.value === time
                  return (
                    <div key={s} onClick={() => time !== '—' ? onSelect(`Hyrox ${s}`, time) : undefined} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8,
                      background: sel ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.05)',
                      border: `1px solid ${sel ? 'rgba(239,68,68,0.50)' : 'rgba(239,68,68,0.12)'}`,
                      cursor: time !== '—' ? 'pointer' : undefined,
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', width: 17, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 11 }}>{s}</span>
                      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 600, color: time !== '—' ? '#ef4444' : 'var(--text-dim)' }}>{time}</span>
                    </div>
                  )
                })}
              </div>
              {selectedRace.runs.length > 0 && (
                <>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Runs (×1km)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    {selectedRace.runs.map((r, i) => {
                      const sel = selectedDatum?.label === `Hyrox Run ${i + 1}` && selectedDatum?.value === r
                      return (
                        <div key={i} onClick={() => onSelect(`Hyrox Run ${i + 1}`, r)} style={{
                          padding: '6px 8px', borderRadius: 7, textAlign: 'center', cursor: 'pointer',
                          background: sel ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.07)',
                          border: `1px solid ${sel ? 'rgba(34,197,94,0.50)' : 'rgba(34,197,94,0.15)'}`,
                        }}>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 2px' }}>Run {i + 1}</p>
                          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 600, color: '#22c55e', margin: 0 }}>{r}</p>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      )}

      {/* Modal: add race */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={() => { setShowModal(false); resetForm() }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>Nouvelle course Hyrox</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)',
                background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>Date</p>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none',
                  }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>Format</p>
                  <select value={fFormat} onChange={e => setFFormat(e.target.value as HyroxRace['format'])} style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer',
                  }}>
                    {Object.entries(HYROX_FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              {(fFormat === 'duo_open' || fFormat === 'duo_pro') && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>Partenaire</p>
                  <input type="text" value={fPartenaire} onChange={e => setFPartenaire(e.target.value)} placeholder="Prénom Nom" style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none',
                  }} />
                </div>
              )}
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>Temps final</p>
                <input type="text" value={fFinal} onChange={e => setFFinal(e.target.value)} placeholder="ex: 1:02:45" style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 14, outline: 'none',
                }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Stations</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {HYROX_STATIONS.map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, color: '#ef4444', width: 14, flexShrink: 0, fontWeight: 700 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 11 }}>{s}</span>
                      <input type="text" value={fStations[s]} onChange={e => setFStations(prev => ({ ...prev, [s]: e.target.value }))}
                        placeholder="mm:ss" style={{
                          width: 72, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none', textAlign: 'right',
                        }} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Runs (8×1km)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textAlign: 'center' }}>Run {i + 1}</p>
                      <input type="text" value={fRuns[i]} placeholder="mm:ss"
                        onChange={e => setFRuns(prev => { const n = [...prev]; n[i] = e.target.value; return n })}
                        style={{
                          width: '100%', padding: '5px 6px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none', textAlign: 'center',
                        }} />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => void saveRace()} disabled={!fFinal || saving} style={{
                padding: '10px', borderRadius: 10, border: 'none',
                background: fFinal && !saving ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'var(--bg-card2)',
                color: fFinal && !saving ? '#fff' : 'var(--text-dim)',
                fontSize: 13, fontWeight: 700, cursor: fFinal && !saving ? 'pointer' : 'not-allowed', marginTop: 4,
              }}>
                {saving ? 'Sauvegarde…' : 'Enregistrer la course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── UI Primitives ────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)', ...style,
    }}>
      {children}
    </div>
  )
}

function NInput({ label, value, onChange, unit, step }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>
        {label}{unit && <span style={{ fontWeight: 400, marginLeft: 3, textTransform: 'none' }}>({unit})</span>}
      </p>
      <input type="number" value={value} step={step || 1} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }} />
    </div>
  )
}

function TInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }} />
    </div>
  )
}

function ZBars({ zones, onSelect, selectedKey, editKey, editDraft, onEditStart, onEditChange, onEditConfirm, onEditCancel, editSaving }: {
  zones: { z: string; label: string; range: string }[]
  onSelect?: (key: string, label: string, range: string) => void
  selectedKey?: string
  // inline editing
  editKey?: string | null
  editDraft?: string
  onEditStart?: (key: string, currentRange: string) => void
  onEditChange?: (v: string) => void
  onEditConfirm?: () => void
  onEditCancel?: () => void
  editSaving?: boolean
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {zones.map((z, i) => {
        const key = `${z.z}-${z.label}`
        const sel = selectedKey === key
        const isEditing = editKey === key
        return (
          <div
            key={z.z}
            onClick={isEditing ? undefined : () => onSelect?.(key, `Zone ${z.z} ${z.label}`, z.range)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '4px 6px',
              borderRadius: 8,
              cursor: (onSelect && !isEditing) ? 'pointer' : undefined,
              background: isEditing ? `${Z_COLORS[i]}10` : sel ? `${Z_COLORS[i]}14` : undefined,
              border: isEditing ? `1px solid ${Z_COLORS[i]}88` : sel ? `1px solid ${Z_COLORS[i]}55` : '1px solid transparent',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>{z.z}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? 0 : 2 }}>
                <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{z.label}</span>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={e => e.stopPropagation()}>
                    <input
                      value={editDraft ?? ''}
                      onChange={e => onEditChange?.(e.target.value)}
                      autoFocus
                      style={{ width: 160, padding: '3px 7px', borderRadius: 5, border: `1px solid ${Z_COLORS[i]}`, background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') onEditConfirm?.(); if (e.key === 'Escape') onEditCancel?.() }}
                    />
                    <button
                      onClick={onEditConfirm}
                      disabled={editSaving}
                      style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: Z_COLORS[i], color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}
                    >
                      {editSaving ? '…' : 'OK'}
                    </button>
                    <button
                      onClick={onEditCancel}
                      style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={e => { e.stopPropagation(); onEditStart?.(key, z.range) }}
                    title={onEditStart ? 'Cliquer pour modifier' : undefined}
                    style={{
                      fontSize: 11, fontFamily: 'DM Mono,monospace', color: Z_COLORS[i], fontWeight: 600,
                      cursor: onEditStart ? 'text' : undefined,
                      padding: onEditStart ? '2px 5px' : undefined,
                      borderRadius: onEditStart ? 4 : undefined,
                      border: onEditStart ? '1px dashed transparent' : undefined,
                      textDecoration: onEditStart ? 'underline dotted' : undefined,
                    }}
                  >
                    {z.range}
                  </span>
                )}
              </div>
              {!isEditing && (
                <div style={{ height: 5, borderRadius: 999, background: `${Z_COLORS[i]}22`, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, 20 + i * 16)}%`, background: Z_COLORS[i], opacity: 0.7, borderRadius: 999,
                    transformOrigin: 'left center',
                    transform: ready ? 'scaleX(1)' : 'scaleX(0)',
                    transition: `transform 1.1s cubic-bezier(0.25,1,0.5,1) ${i * 60}ms`,
                    willChange: 'transform',
                  }} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecordRow({ label, rec24, rec23, sub, onSelect, selected, actions }: {
  label: string; rec24: string; rec23: string; sub?: string
  onSelect?: () => void; selected?: boolean
  actions?: React.ReactNode
}) {
  const isPR = rec24 !== '—' && rec23 !== '—' && rec24 < rec23
  return (
    <div
      onClick={rec24 !== '—' ? onSelect : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9,
        background: selected ? 'rgba(0,200,224,0.06)' : 'var(--bg-card2)',
        border: `1px solid ${selected ? '#00c8e0' : 'var(--border)'}`,
        marginBottom: 5,
        cursor: (onSelect && rec24 !== '—') ? 'pointer' : undefined,
        transition: 'border-color 0.15s, background 0.15s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-mid)', minWidth: 72, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: '#00c8e0' }}>{rec24}</span>
          {isPR && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(0,200,224,0.15)', color: '#00c8e0', fontWeight: 700 }}>PR</span>}
          {sub && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{sub}</span>}
        </div>
        {rec23 && rec23 !== '—' && (
          <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>Préc. : {rec23}</span>
        )}
      </div>
      {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
    </div>
  )
}

// ── Section header ───────────────────────────────────────────────
function SectionHeader({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 3, height: 20, borderRadius: 2, background: gradient }} />
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{label}</h2>
    </div>
  )
}

// ── Empty state §13 ──────────────────────────────────────────────
function EmptyState({ icon, title, description }: { icon: 'chart' | 'activity'; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon === 'chart' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><polyline points="7 16 11 12 15 16 19 12"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        )}
      </div>
      <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, maxWidth: 220 }}>{description}</p>
    </div>
  )
}

// ── Mode toggle ──────────────────────────────────────────────────
function ModeToggle({ mode, onChange }: { mode: 'auto' | 'manual'; onChange: (m: 'auto' | 'manual') => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
      {(['auto', 'manual'] as const).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: mode === m ? 700 : 400,
          background: mode === m ? 'var(--bg-card)' : 'transparent',
          color: mode === m ? 'var(--text)' : 'var(--text-dim)',
          boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
          transition: 'all 0.15s',
        }}>
          {m === 'auto' ? 'Estimé' : 'Manuel'}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════
// SUB-TAB 1: ZONES D'ENTRAÎNEMENT
// ════════════════════════════════════════════════
const ZONES_STORAGE_KEY = 'thw_zones_v1'

interface ZonesStorage {
  bikeManual: {minW: number; maxW: number}[]
  runManual: {min: string; max: string}[]
  swimManual: {min: string; max: string}[]
  rowManual: {min: string; max: string}[]
  hrManual: {min: number; max: number}[]
}

function ZonesSubTab({ profile, onSelect, selectedDatum, onOpenAI }: {
  profile: Props['profile']
  onSelect: Props['onSelect']
  selectedDatum: Props['selectedDatum']
  onOpenAI?: Props['onOpenAI']
}) {
  type PowerSport = 'bike' | 'run' | 'swim' | 'rowing'

  const [powerSport, setPowerSport] = useState<PowerSport>('bike')
  const [rowThreshSplit, setRowThreshSplit] = useState('1:52')
  const [editRowThresh, setEditRowThresh] = useState(false)

  const [bikeMode, setBikeMode] = useState<'auto' | 'manual'>('auto')
  const [runMode, setRunMode]   = useState<'auto' | 'manual'>('auto')
  const [swimMode, setSwimMode] = useState<'auto' | 'manual'>('auto')
  const [rowMode, setRowMode]   = useState<'auto' | 'manual'>('auto')
  const [hrMode, setHrMode]     = useState<'auto' | 'manual'>('auto')

  // ── Inputs CP20/FTP, 400m natation, 2000m aviron ────────────────
  const [cp20Input, setCp20Input]       = useState('')
  const [ftpLocalInput, setFtpLocalInput] = useState(String(profile.ftp))
  const [bikeInputType, setBikeInputType] = useState<'ftp' | 'cp20'>('ftp')
  const [time400mInput, setTime400mInput] = useState('')
  const [time2000mInput, setTime2000mInput] = useState('')
  const [run10kmInput, setRun10kmInput] = useState('')
  const [runEndurInput, setRunEndurInput] = useState('')
  const [fcMaxInput, setFcMaxInput]     = useState(String(profile.hrMax || ''))
  const [isDirty, setIsDirty]           = useState(false)
  const [isRunDirty, setIsRunDirty]     = useState(false)
  const [isHrDirty, setIsHrDirty]       = useState(false)
  const [saving2, setSaving2]           = useState(false)
  const [hrSaveError, setHrSaveError]   = useState<string | null>(null)

  // ── Derived FTP / CSS / split ────────────────────────────────────
  const cp20Watts = parseInt(cp20Input) || 0
  const localFtp = bikeInputType === 'cp20' && cp20Watts > 0
    ? Math.round(cp20Watts * 0.95)
    : (parseInt(ftpLocalInput) || profile.ftp)

  function time2000mToSplit500(): string {
    const parts = time2000mInput.split(':').map(Number)
    const totalSec = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + (parts[1] || 0)
    if (!totalSec) return rowThreshSplit
    const sp = totalSec / 4
    return `${Math.floor(sp / 60)}:${String(Math.round(sp % 60)).padStart(2, '0')}`
  }

  function time400mToCSS(): string {
    const parts = time400mInput.split(':').map(Number)
    const totalSec = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + (parts[1] || 0)
    if (!totalSec) return profile.css
    const cssSec = totalSec / 4
    return `${Math.floor(cssSec / 60)}:${String(Math.round(cssSec % 60)).padStart(2, '0')}`
  }

  const localRowSplit = time2000mInput ? time2000mToSplit500() : rowThreshSplit
  const localCSS      = time400mInput  ? time400mToCSS()       : profile.css

  // ── Supabase zones ──────────────────────────────────────────────
  const { zones: sbZones, save: sbSave, saving: sbSaving } = useTrainingZones()

  async function handleSaveZones(sport: PowerSport | 'hr') {
    if (sport === 'hr') return
    setSaving2(true)
    try {
      const sp = sport as ZoneSport
      const existing = { ...sbZones[sp] }
      if (sport === 'bike') {
        const zones7 = calcBikeZones(localFtp)
        await sbSave('bike', {
          ...existing,
          sport: 'bike',
          ftp_watts: localFtp,
          z1_value: `${zones7[0].minW}–${zones7[0].maxW}W`,
          z2_value: `${zones7[1].minW}–${zones7[1].maxW}W`,
          z3_value: `${zones7[2].minW}–${zones7[2].maxW}W`,
          z4_value: `${zones7[3].minW}–${zones7[3].maxW}W`,
          z5_value: `${zones7[4].minW}–${zones7[4].maxW}W`,
        })
      } else if (sport === 'rowing') {
        const split = localRowSplit
        const rowZ = calcRowZones(parseSec(split))
        await sbSave('rowing', {
          ...existing,
          sport: 'rowing',
          sl1: split,
          z1_value: rowZ[0].range,
          z2_value: rowZ[1].range,
          z3_value: rowZ[2].range,
          z4_value: rowZ[3].range,
          z5_value: rowZ[4].range,
        })
      } else if (sport === 'swim') {
        const css = localCSS
        const swZ = calcSwimZones(parseSec(css))
        await sbSave('swim', {
          ...existing,
          sport: 'swim',
          sl1: css,
          z1_value: swZ[0].range,
          z2_value: swZ[1].range,
          z3_value: swZ[2].range,
          z4_value: swZ[3].range,
          z5_value: swZ[4].range,
        })
      } else if (sport === 'run') {
        const runZ = runZonesAuto
        await sbSave('run', {
          ...existing,
          sport: 'run',
          sl1: run10kmInput || profile.thresholdPace,
          z1_value: runZ[0].range,
          z2_value: runZ[1].range,
          z3_value: runZ[2].range,
          z4_value: runZ[3].range,
          z5_value: runZ[4].range,
        })
        setIsRunDirty(false)
        return
      }
      setIsDirty(false)
    } finally {
      setSaving2(false)
    }
  }

  async function handleSaveHR() {
    setSaving2(true)
    setHrSaveError(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setHrSaveError('Non authentifié'); return }
      const hrMax = parseInt(fcMaxInput) || profile.hrMax
      const now = new Date().toISOString()
      const { error } = await sb.from('athlete_performance_profile').upsert(
        { user_id: user.id, hr_max: hrMax, updated_at: now },
        { onConflict: 'user_id' }
      )
      if (error) {
        console.error('[handleSaveHR] Supabase error:', error)
        setHrSaveError(error.message)
        return
      }
      setIsHrDirty(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[handleSaveHR] Exception:', msg)
      setHrSaveError(msg)
    } finally {
      setSaving2(false)
    }
  }

  // ── Inline edit state (one field at a time) ─────────────────────
  // key format: "${sport}:${z.z}-${z.label}"  e.g. "bike:Z1-Récup" or "hr:Z2-Aérobie"
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  function tryEdit(key: string, currentVal: string) {
    if (activeEdit && activeEdit !== key) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    setActiveEdit(key)
    setEditDraft(currentVal)
  }

  function cancelEdit() {
    setActiveEdit(null)
    setEditDraft('')
  }

  async function confirmZoneEdit() {
    if (!activeEdit) return
    const colonIdx = activeEdit.indexOf(':')
    const sport = activeEdit.slice(0, colonIdx)
    const zKey = activeEdit.slice(colonIdx + 1)          // e.g. "Z1-Récup"
    const zNum = parseInt(zKey.slice(1))                 // 1-7

    if (sport !== 'hr') {
      // Z6/Z7 (bike only) not stored in DB — skip DB save
      if (zNum >= 6) { setActiveEdit(null); setEditDraft(''); return }
      const sp = sport as ZoneSport
      const existing = sbZones[sp]
      const updates = {
        ...existing,
        [`z${zNum}_value`]: editDraft,
      }
      await sbSave(sp, updates)
    } else {
      // HR zones — localStorage only (no dedicated sport in training_zones)
      // The manual state auto-saves via existing useEffect; we just update hrManual
      const idx = zNum - 1
      const newManual = [...hrManual]
      // Try to parse "min – max bpm" format, else keep existing
      const m = editDraft.match(/(\d+)\s*[–-]\s*(\d+)/)
      if (m) {
        newManual[idx] = { min: parseInt(m[1]), max: parseInt(m[2]) }
        setHrManual(newManual)
      }
    }

    setActiveEdit(null)
    setEditDraft('')
  }

  // Returns displayed zone range: Supabase override if present, else auto-calculated
  function getZoneDisplay(sport: string, zNum: number, autoRange: string): string {
    if (sport === 'hr') return autoRange
    const sp = sport as ZoneSport
    const val = sbZones[sp]?.[`z${zNum}_value` as `z${1|2|3|4|5}_value`]
    return (val && typeof val === 'string' && val.trim()) ? val : autoRange
  }

  const bikeZonesAuto = calcBikeZones(localFtp)
  const run10kmSec    = parseSec(run10kmInput)
  const runEndurSec   = parseSec(runEndurInput)
  const runZonesAuto  = (run10kmSec > 0 && runEndurSec > 0)
    ? calcRunZonesFromInputs(run10kmSec, runEndurSec)
    : calcRunZones(parseSec(profile.thresholdPace))
  const swimZonesAuto = calcSwimZones(parseSec(localCSS))
  const rowZonesAuto  = calcRowZones(parseSec(localRowSplit))
  const localHrMax    = parseInt(fcMaxInput) || profile.hrMax
  const hrZonesAuto   = calcHRZones(localHrMax)

  const [bikeManual, setBikeManual] = useState<{minW: number; maxW: number}[]>(
    calcBikeZones(profile.ftp).map(z => ({ minW: z.minW, maxW: z.maxW }))
  )
  const [runManual, setRunManual] = useState<{min: string; max: string}[]>(
    runZonesAuto.map(z => {
      const parts = z.range.split(' - ')
      return { min: parts[0]?.replace(/[<>]/g,'').trim() ?? '', max: parts[1]?.trim() ?? '' }
    })
  )
  const [swimManual, setSwimManual] = useState<{min: string; max: string}[]>(
    swimZonesAuto.map(z => {
      const parts = z.range.split(' - ')
      return { min: parts[0]?.replace(/[<>]/g,'').trim() ?? '', max: parts[1]?.trim() ?? '' }
    })
  )
  const [rowManual, setRowManual] = useState<{min: string; max: string}[]>(
    rowZonesAuto.map(z => {
      const parts = z.range.split(' - ')
      return { min: parts[0]?.replace(/[<>]/g,'').trim() ?? '', max: parts[1]?.trim() ?? '' }
    })
  )
  const [hrManual, setHrManual] = useState<{min: number; max: number}[]>(
    hrZonesAuto.map(z => ({ min: z.min, max: z.max }))
  )

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ZONES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ZonesStorage
        if (parsed.bikeManual?.length >= 5) {
          // Migrate old 5-zone data → extend with Z6/Z7 defaults
          const z = parsed.bikeManual.slice(0, 7)
          const ftp0 = z[0] ? Math.round(z[0].maxW / 0.55) : profile.ftp
          while (z.length < 7) {
            const i = z.length
            z.push(i === 5
              ? { minW: Math.round(ftp0 * 1.21), maxW: Math.round(ftp0 * 1.50) }
              : { minW: Math.round(ftp0 * 1.51), maxW: Math.round(ftp0 * 2.50) })
          }
          setBikeManual(z)
        }
        if (parsed.runManual?.length === 5) setRunManual(parsed.runManual)
        if (parsed.swimManual?.length === 5) setSwimManual(parsed.swimManual)
        if (parsed.rowManual?.length === 5) setRowManual(parsed.rowManual)
        if (parsed.hrManual?.length === 5) setHrManual(parsed.hrManual)
      }
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try {
      const data: ZonesStorage = { bikeManual, runManual, swimManual, rowManual, hrManual }
      localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }, [bikeManual, runManual, swimManual, rowManual, hrManual])

  const zoneSelKey = selectedDatum
    ? (() => {
        const m = selectedDatum.label.match(/^Zone (Z\d) (.+)$/)
        return m ? `${m[1]}-${m[2]}` : undefined
      })()
    : undefined

  const SPORT_TABS: { id: PowerSport; label: string; color: string }[] = [
    { id: 'bike',   label: 'Cyclisme', color: '#3b82f6' },
    { id: 'run',    label: 'Running',  color: '#22c55e' },
    { id: 'rowing', label: 'Aviron',   color: '#14b8a6' },
    { id: 'swim',   label: 'Natation', color: '#06b6d4' },
  ]

  const ZONE_LABELS = ['Récup', 'Aérobie', 'Tempo', 'Seuil', 'VO2max']

  function resetBike() { setBikeManual(bikeZonesAuto.map(z => ({ minW: z.minW, maxW: z.maxW }))) }
  function resetRun()  { setRunManual(runZonesAuto.map(z => { const p = z.range.split(' - '); return { min: p[0]?.replace(/[<>]/g,'').trim() ?? '', max: p[1]?.trim() ?? '' } })) }
  function resetSwim() { setSwimManual(swimZonesAuto.map(z => { const p = z.range.split(' - '); return { min: p[0]?.replace(/[<>]/g,'').trim() ?? '', max: p[1]?.trim() ?? '' } })) }
  function resetRow()  { setRowManual(rowZonesAuto.map(z => { const p = z.range.split(' - '); return { min: p[0]?.replace(/[<>]/g,'').trim() ?? '', max: p[1]?.trim() ?? '' } })) }
  function resetHR()   { setHrManual(hrZonesAuto.map(z => ({ min: z.min, max: z.max }))) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader label="Puissance / Allure" gradient="linear-gradient(180deg,#00c8e0,#5b6fff)" />

      {/* Bouton Estimer via IA — global, toutes zones */}
      {onOpenAI && (
        <button
          onClick={() => onOpenAI('Aide-moi à estimer mes zones d\'entraînement. Dis-moi quel sport ou paramètre tu veux calibrer (running, cyclisme, natation, aviron, fréquence cardiaque) et je calcule tes zones personnalisées.')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 10,
            border: '1px solid rgba(139,92,246,0.35)',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(91,111,255,0.08))',
            color: '#8b5cf6', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            width: '100%', textAlign: 'left' as const,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
          Estimer mes zones via IA
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>Tous sports · FC</span>
        </button>
      )}

      {/* Sport tabs */}
      <SportTabs
        tabs={SPORT_TABS}
        value={powerSport}
        onChange={(id) => setPowerSport(id as PowerSport)}
      />

      {/* Bike */}
      {powerSport === 'bike' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Cyclisme</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                FTP : {localFtp}W — {(localFtp / profile.weight).toFixed(2)} W/kg
                {bikeInputType === 'cp20' && cp20Watts > 0 && <span style={{ color: '#8b5cf6', marginLeft: 6 }}>(CP20 × 0.95)</span>}
              </p>
            </div>
            <ModeToggle mode={bikeMode} onChange={setBikeMode} />
          </div>

          {/* FTP / CP20 input row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-card2)', borderRadius: 7, padding: 2, border: '1px solid var(--border)' }}>
              {(['ftp', 'cp20'] as const).map(t => (
                <button key={t} onClick={() => { setBikeInputType(t); setIsDirty(true) }} style={{
                  padding: '3px 9px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: bikeInputType === t ? 700 : 400,
                  background: bikeInputType === t ? 'var(--bg-card)' : 'transparent',
                  color: bikeInputType === t ? 'var(--text)' : 'var(--text-dim)',
                }}>
                  {t === 'ftp' ? 'FTP direct' : 'CP20 → FTP'}
                </button>
              ))}
            </div>
            {bikeInputType === 'ftp' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input type="number" value={ftpLocalInput} placeholder={String(profile.ftp)}
                  onChange={e => { setFtpLocalInput(e.target.value); setIsDirty(true) }}
                  style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input type="number" value={cp20Input} placeholder="CP20 (W)"
                  onChange={e => { setCp20Input(e.target.value); setIsDirty(true) }}
                  style={{ width: 90, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                {cp20Watts > 0 && <span style={{ fontSize: 10, color: '#8b5cf6', fontFamily: 'DM Mono,monospace' }}>→ FTP {localFtp}W</span>}
              </div>
            )}
          </div>

          {bikeMode === 'auto' ? (
            <>
              <ZBars
                zones={bikeZonesAuto.map((z, i) => ({
                  z: z.z, label: z.label,
                  // Z6/Z7 not in DB — no inline edit
                  range: i < 5
                    ? getZoneDisplay('bike', i + 1, `${z.minW}–${z.maxW}W (${(z.minW / profile.weight).toFixed(1)}–${(z.maxW / profile.weight).toFixed(1)} W/kg)`)
                    : `${z.minW}–${z.maxW}W`,
                }))}
                onSelect={(key, label, range) => onSelect(label, range)}
                selectedKey={zoneSelKey}
                editKey={activeEdit?.startsWith('bike:') ? activeEdit.slice(5) : null}
                editDraft={editDraft}
                onEditStart={(key, cur) => {
                  const zNum = parseInt(key.slice(1))
                  if (zNum >= 6) return  // Z6/Z7 not editable
                  tryEdit(`bike:${key}`, cur)
                }}
                onEditChange={setEditDraft}
                onEditConfirm={() => { void confirmZoneEdit() }}
                onEditCancel={cancelEdit}
                editSaving={sbSaving}
              />
              {isDirty && (
                <button
                  onClick={() => { void handleSaveZones('bike') }}
                  disabled={saving2}
                  style={{ marginTop: 10, padding: '6px 16px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}
                >
                  {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </>
          ) : (
            <div>
              {bikeManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-mid)', minWidth: 72 }}>{BIKE_ZONE_LABELS[i]}</span>
                  <input type="number" value={z.minW} onChange={e => { const v = [...bikeManual]; v[i] = {...v[i], minW: parseInt(e.target.value)||0}; setBikeManual(v); setIsDirty(true) }}
                    style={{ width: 66, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="number" value={z.maxW} onChange={e => { const v = [...bikeManual]; v[i] = {...v[i], maxW: parseInt(e.target.value)||0}; setBikeManual(v); setIsDirty(true) }}
                    style={{ width: 66, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={resetBike} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
                {isDirty && (
                  <button onClick={() => { void handleSaveZones('bike') }} disabled={saving2} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                    {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Run */}
      {powerSport === 'run' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Running</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>Allure seuil : {profile.thresholdPace}/km</p>
            </div>
            <ModeToggle mode={runMode} onChange={setRunMode} />
          </div>
          {runMode === 'auto' ? (
            <>
              {/* Inputs for zone estimation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>10 km :</span>
                  <input type="text" value={run10kmInput} placeholder="ex: 37:20"
                    onChange={e => { setRun10kmInput(e.target.value); setIsRunDirty(true) }}
                    style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Endurance :</span>
                  <input type="text" value={runEndurInput} placeholder="ex: 5:30"
                    onChange={e => { setRunEndurInput(e.target.value); setIsRunDirty(true) }}
                    style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/km</span>
                </div>
              </div>
              <ZBars
                zones={runZonesAuto.map((z, i) => ({ z: z.z, label: z.label, range: getZoneDisplay('run', i + 1, z.range) }))}
                onSelect={(key, label, range) => onSelect(label, range)}
                selectedKey={zoneSelKey}
                editKey={activeEdit?.startsWith('run:') ? activeEdit.slice(4) : null}
                editDraft={editDraft}
                onEditStart={(key, cur) => tryEdit(`run:${key}`, cur)}
                onEditChange={setEditDraft}
                onEditConfirm={() => { void confirmZoneEdit() }}
                onEditCancel={cancelEdit}
                editSaving={sbSaving}
              />
              {isRunDirty && (
                <button onClick={() => { void handleSaveZones('run') }} disabled={saving2} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                  {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </>
          ) : (
            <div>
              {runManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="text" value={z.min} placeholder="min" onChange={e => { const v = [...runManual]; v[i] = {...v[i], min: e.target.value}; setRunManual(v); setIsRunDirty(true) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="text" value={z.max} placeholder="max" onChange={e => { const v = [...runManual]; v[i] = {...v[i], max: e.target.value}; setRunManual(v); setIsRunDirty(true) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/km</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={resetRun} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
                {isRunDirty && (
                  <button onClick={() => { void handleSaveZones('run') }} disabled={saving2} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                    {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Rowing */}
      {powerSport === 'rowing' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Aviron</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                Split seuil : <strong style={{ fontFamily: 'DM Mono,monospace', color: '#00c8e0' }}>{localRowSplit}/500m</strong>
                {time2000mInput && <span style={{ color: '#8b5cf6', marginLeft: 6 }}>(issu du 2000m)</span>}
              </p>
            </div>
            <ModeToggle mode={rowMode} onChange={setRowMode} />
          </div>

          {/* 2000m input or manual split */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>2000m :</span>
              <input type="text" value={time2000mInput} placeholder="ex: 6:52"
                onChange={e => { setTime2000mInput(e.target.value); setIsDirty(true) }}
                style={{ width: 68, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>ou split direct :</span>
            {editRowThresh ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="text" value={rowThreshSplit} onChange={e => { setRowThreshSplit(e.target.value); setIsDirty(true) }}
                  style={{ width: 56, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <button onClick={() => setEditRowThresh(false)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 10, cursor: 'pointer' }}>OK</button>
              </div>
            ) : (
              <button onClick={() => setEditRowThresh(true)} style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#00c8e0', fontFamily: 'DM Mono,monospace', fontSize: 11, cursor: 'pointer' }}>
                {rowThreshSplit}/500m
              </button>
            )}
          </div>

          {rowMode === 'auto' ? (
            <>
              <ZBars
                zones={rowZonesAuto.map((z, i) => ({ z: z.z, label: z.label, range: getZoneDisplay('rowing', i + 1, z.range) }))}
                onSelect={(key, label, range) => onSelect(label, range)}
                selectedKey={zoneSelKey}
                editKey={activeEdit?.startsWith('rowing:') ? activeEdit.slice(7) : null}
                editDraft={editDraft}
                onEditStart={(key, cur) => tryEdit(`rowing:${key}`, cur)}
                onEditChange={setEditDraft}
                onEditConfirm={() => { void confirmZoneEdit() }}
                onEditCancel={cancelEdit}
                editSaving={sbSaving}
              />
              {isDirty && (
                <button onClick={() => { void handleSaveZones('rowing') }} disabled={saving2} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                  {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </>
          ) : (
            <div>
              {rowManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="text" value={z.min} placeholder="min" onChange={e => { const v = [...rowManual]; v[i] = {...v[i], min: e.target.value}; setRowManual(v); setIsDirty(true) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="text" value={z.max} placeholder="max" onChange={e => { const v = [...rowManual]; v[i] = {...v[i], max: e.target.value}; setRowManual(v); setIsDirty(true) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/500m</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={resetRow} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
                {isDirty && (
                  <button onClick={() => { void handleSaveZones('rowing') }} disabled={saving2} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                    {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Swim */}
      {powerSport === 'swim' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Natation</h3>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                CSS : <strong style={{ fontFamily: 'DM Mono,monospace', color: '#00c8e0' }}>{localCSS}/100m</strong>
                {time400mInput && <span style={{ color: '#8b5cf6', marginLeft: 6 }}>(issu du 400m)</span>}
              </p>
            </div>
            <ModeToggle mode={swimMode} onChange={setSwimMode} />
          </div>

          {/* 400m input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>400m :</span>
              <input type="text" value={time400mInput} placeholder="ex: 5:10"
                onChange={e => { setTime400mInput(e.target.value); setIsDirty(true) }}
                style={{ width: 68, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>→ CSS estimée</span>
            </div>
          </div>

          {swimMode === 'auto' ? (
            <>
              <ZBars
                zones={swimZonesAuto.map((z, i) => ({ z: z.z, label: z.label, range: getZoneDisplay('swim', i + 1, z.range) }))}
                onSelect={(key, label, range) => onSelect(label, range)}
                selectedKey={zoneSelKey}
                editKey={activeEdit?.startsWith('swim:') ? activeEdit.slice(5) : null}
                editDraft={editDraft}
                onEditStart={(key, cur) => tryEdit(`swim:${key}`, cur)}
                onEditChange={setEditDraft}
                onEditConfirm={() => { void confirmZoneEdit() }}
                onEditCancel={cancelEdit}
                editSaving={sbSaving}
              />
              {isDirty && (
                <button onClick={() => { void handleSaveZones('swim') }} disabled={saving2} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                  {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </>
          ) : (
            <div>
              {swimManual.map((z, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                  <input type="text" value={z.min} placeholder="min" onChange={e => { const v = [...swimManual]; v[i] = {...v[i], min: e.target.value}; setSwimManual(v); setIsDirty(true) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                  <input type="text" value={z.max} placeholder="max" onChange={e => { const v = [...swimManual]; v[i] = {...v[i], max: e.target.value}; setSwimManual(v); setIsDirty(true) }}
                    style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/100m</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={resetSwim} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
                {isDirty && (
                  <button onClick={() => { void handleSaveZones('swim') }} disabled={saving2} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#00c8e0', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                    {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* HR Section */}
      <SectionHeader label="Fréquence Cardiaque" gradient="linear-gradient(180deg,#ef4444,#f97316)" />

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>Fréquence cardiaque</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--text-dim)' }}>Repos : <strong style={{ color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>{profile.hrRest}bpm</strong></span>
              <span style={{ color: 'var(--text-dim)' }}>LTHR : <strong style={{ color: '#f97316', fontFamily: 'DM Mono,monospace' }}>{profile.lthr}bpm</strong></span>
              <span style={{ color: 'var(--text-dim)' }}>Max : <strong style={{ color: '#ef4444', fontFamily: 'DM Mono,monospace' }}>{localHrMax}bpm</strong></span>
            </div>
          </div>
          <ModeToggle mode={hrMode} onChange={setHrMode} />
        </div>

        {hrMode === 'auto' ? (
          <>
            {/* FCmax input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>FC max :</span>
              <input type="number" value={fcMaxInput} placeholder="ex: 185"
                onChange={e => { setFcMaxInput(e.target.value); setIsHrDirty(true) }}
                style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>bpm</span>
            </div>
            <ZBars
              zones={hrZonesAuto.map((z, i) => ({
                z: z.z, label: z.label,
                // Z5 (VO2max) shown as ≥ since it goes to FCmax (Coggan/Allen)
                range: i === 4 ? `≥ ${z.min} bpm` : `${z.min} – ${z.max} bpm`,
              }))}
              onSelect={(key, label, range) => onSelect(label, range)}
              selectedKey={zoneSelKey}
              editKey={activeEdit?.startsWith('hr:') ? activeEdit.slice(3) : null}
              editDraft={editDraft}
              onEditStart={(key, cur) => tryEdit(`hr:${key}`, cur)}
              onEditChange={setEditDraft}
              onEditConfirm={() => { void confirmZoneEdit() }}
              onEditCancel={cancelEdit}
              editSaving={false}
            />
            {isHrDirty && (
              <button onClick={() => { void handleSaveHR() }} disabled={saving2} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                {saving2 ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
            {hrSaveError && (
              <p style={{ fontSize: 10, color: '#ef4444', marginTop: 6 }}>Erreur : {hrSaveError}</p>
            )}
          </>
        ) : (
          <div>
            {hrManual.map((z, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 6, background: `${Z_COLORS[i]}22`, border: `1px solid ${Z_COLORS[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: Z_COLORS[i], flexShrink: 0 }}>Z{i + 1}</span>
                <span style={{ fontSize: 11, color: 'var(--text-mid)', minWidth: 52 }}>{ZONE_LABELS[i]}</span>
                <input type="number" value={z.min} onChange={e => { const v = [...hrManual]; v[i] = {...v[i], min: parseInt(e.target.value)||0}; setHrManual(v); setIsHrDirty(true) }}
                  style={{ width: 60, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
                <input type="number" value={z.max} onChange={e => { const v = [...hrManual]; v[i] = {...v[i], max: parseInt(e.target.value)||0}; setHrManual(v); setIsHrDirty(true) }}
                  style={{ width: 60, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 11, outline: 'none' }} />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>bpm</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={resetHR} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Réinitialiser</button>
              {isHrDirty && (
                <button onClick={() => { void handleSaveHR() }} disabled={saving2} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving2 ? 'not-allowed' : 'pointer', opacity: saving2 ? 0.7 : 1 }}>
                  {saving2 ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* HR gradient bar — Coggan/Allen FCmax */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden' }}>
            {hrZonesAuto.map((z, i) => {
              // Z5 has min=max=hrMax → give it a fixed visual slice
              const flex = i === 4 ? Math.round(localHrMax * 0.05) : z.max - z.min
              return <div key={z.z} style={{ flex, background: Z_COLORS[i], opacity: 0.8 }} />
            })}
          </div>
          <div style={{ display: 'flex', marginTop: 3 }}>
            {hrZonesAuto.map((z, i) => {
              const flex = i === 4 ? Math.round(localHrMax * 0.05) : z.max - z.min
              return (
                <div key={z.z} style={{ flex, textAlign: 'center' }}>
                  <span style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', color: Z_COLORS[i] }}>{z.min}</span>
                </div>
              )
            })}
            <span style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', color: Z_COLORS[3] }}>{localHrMax}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ════════════════════════════════════════════════
// POWER CURVE LOG SVG
// ════════════════════════════════════════════════
function PowerCurveLogSVG({ bikeByYear, hiddenYears, selectedYear, weight }: {
  bikeByYear: Record<string, Record<string, number>>
  hiddenYears: Set<string>
  selectedYear: string
  weight: number
}) {
  const W = 760, H = 380
  const leftMargin = 52, bottomMargin = 36

  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<{ svgX: number; pxX: number; dur: string | null } | null>(null)

  // ── 5 années max, plus récentes en premier ───────────────────
  const sortedDesc = Object.keys(bikeByYear).sort((a, b) => b.localeCompare(a)).slice(0, 5)
  const allYears   = [...sortedDesc].reverse()                 // asc pour itération cohérente
  const visibleYears = allYears.filter(y => !hiddenYears.has(y))

  let maxW = 0
  for (const yr of visibleYears) {
    for (const dur of BIKE_DURS) {
      const w = bikeByYear[yr]?.[dur] ?? 0
      if (w > maxW) maxW = w
    }
  }
  if (maxW === 0) maxW = 1000

  const plotW = W - leftMargin
  const plotH = H - bottomMargin - 10

  // ── Échelle logarithmique : positionX = log10(secs) / log10(duréeMax) ──
  const LOG_MAX = Math.log10(21600)   // 6h en secondes
  function logX(secs: number): number {
    return (Math.log10(Math.max(secs, 1)) / LOG_MAX) * plotW + leftMargin
  }

  function polyY(w: number): number {
    return H - bottomMargin - (w / (maxW * 1.1)) * plotH
  }

  // Best per duration (all time = max across visible years)
  function getBestForYear(year: string): Record<string, number> {
    if (year === 'All Time') {
      const best: Record<string, number> = {}
      for (const dur of BIKE_DURS) {
        let bw = 0
        for (const yr of allYears) {
          const w = bikeByYear[yr]?.[dur] ?? 0
          if (w > bw) bw = w
        }
        best[dur] = bw
      }
      return best
    }
    return bikeByYear[year] ?? {}
  }

  // ── Nearest duration avec seuil 30px physiques ───────────────
  // scale = SVG units per CSS pixel → threshold en SVG units = 30 * scale
  function getSvgCoords(clientX: number): { svgX: number; pxX: number; scale: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = W / rect.width
    return { svgX: (clientX - rect.left) * scale, pxX: clientX - rect.left, scale }
  }

  function nearestDur(svgX: number, scale: number): string | null {
    let best: string | null = null
    let bestDist = Infinity
    for (const dur of BIKE_DURS) {
      const secs = DUR_SECS[dur]
      if (!secs) continue
      const dist = Math.abs(logX(secs) - svgX)
      if (dist < bestDist) { bestDist = dist; best = dur }
    }
    // Convert SVG distance to physical pixels: dist / scale, seuil = 30px
    return best !== null && bestDist / scale < 30 ? best : null
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const coords = getSvgCoords(e.clientX)
    if (!coords) return
    setCursor({ svgX: coords.svgX, pxX: coords.pxX, dur: nearestDur(coords.svgX, coords.scale) })
  }

  function handleTouchMove(e: React.TouchEvent<SVGSVGElement>) {
    if (!e.touches[0]) return
    const coords = getSvgCoords(e.touches[0].clientX)
    if (!coords) return
    setCursor({ svgX: coords.svgX, pxX: coords.pxX, dur: nearestDur(coords.svgX, coords.scale) })
  }

  function handleMouseLeave() { setCursor(null) }
  function handleTouchEnd() { setCursor(null) }

  const xAxisDurs = ['10s','1min','5min','20min','1h','3h','6h']

  // Y grid lines at every 100W
  const yGridVals: number[] = []
  for (let w = 0; w <= maxW * 1.1; w += 100) yGridVals.push(w)

  // Which years to render
  const yearsToRender = selectedYear === 'All Time'
    ? visibleYears
    : visibleYears.filter(y => y === selectedYear)

  // Tooltip rows for the hovered duration
  const tooltipRows: { yr: string; color: string; w: number; wkg: string }[] = []
  if (cursor?.dur) {
    for (const yr of yearsToRender) {
      const w = getBestForYear(yr)[cursor.dur] ?? 0
      if (w > 0) {
        const wkg = weight > 0 ? (w / weight).toFixed(2) : '—'
        tooltipRows.push({ yr, color: getPCColor(yr, sortedDesc), w, wkg })
      }
    }
    tooltipRows.sort((a, b) => b.w - a.w)
  }

  // gradient IDs must be unique per year
  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', minWidth: W, height: H + 4, display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          {yearsToRender.map(yr => {
            const color = getPCColor(yr, sortedDesc)
            return (
              <linearGradient key={yr} id={`pcg-${yr}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            )
          })}
          {selectedYear === 'All Time' && (
            <linearGradient id="pcg-alltime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c8e0" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#00c8e0" stopOpacity="0.02" />
            </linearGradient>
          )}
        </defs>

        {/* Grid */}
        {yGridVals.map(w => (
          <line key={w}
            x1={leftMargin} y1={polyY(w)} x2={W} y2={polyY(w)}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 4"
          />
        ))}

        {/* Y axis labels */}
        {yGridVals.filter(w => w % 100 === 0).map(w => (
          <text key={w} x={leftMargin - 6} y={polyY(w) + 4} textAnchor="end"
            style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fill: 'var(--text-dim)' }}>
            {w}W
          </text>
        ))}

        {/* Year curves + dots */}
        {yearsToRender.map(yr => {
          const color = getPCColor(yr, sortedDesc)
          const bestForYear = getBestForYear(yr)
          const points = BIKE_DURS.map(dur => {
            const w = bestForYear[dur] ?? 0
            return { dur, w, x: logX(DUR_SECS[dur] ?? 1), y: polyY(w) }
          }).filter(p => p.w > 0)

          if (points.length === 0) return null

          const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ')
          const fillStr = `${leftMargin},${H - bottomMargin} ${polylineStr} ${points[points.length - 1].x},${H - bottomMargin}`

          return (
            <g key={yr}>
              <polygon points={fillStr} fill={`url(#pcg-${yr})`} />
              <polyline points={polylineStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {points.map(p => {
                const isHovered = cursor?.dur === p.dur
                return (
                  <g key={p.dur} style={{ pointerEvents: 'none' }}>
                    {isHovered && (
                      <circle cx={p.x} cy={p.y} r={11} fill={color} opacity={0.18} />
                    )}
                    <circle cx={p.x} cy={p.y} r={isHovered ? 6 : 4.5} fill={color} stroke={isHovered ? '#fff' : 'none'} strokeWidth={isHovered ? 1.5 : 0}>
                      {!isHovered && <title>{yr} · {p.dur} · {p.w}W</title>}
                    </circle>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Vertical crosshair */}
        {cursor && (
          <line
            x1={cursor.svgX} y1={10}
            x2={cursor.svgX} y2={H - bottomMargin}
            stroke="rgba(255,255,255,0.30)" strokeWidth="1" strokeDasharray="4 3"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* X axis labels */}
        {xAxisDurs.map(dur => {
          const secs = DUR_SECS[dur]
          if (!secs) return null
          return (
            <text key={dur} x={logX(secs)} y={H - 10} textAnchor="middle"
              style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', fill: 'var(--text-dim)' }}>
              {dur}
            </text>
          )
        })}

        {/* X axis line */}
        <line x1={leftMargin} y1={H - bottomMargin} x2={W} y2={H - bottomMargin} stroke="var(--border)" strokeWidth="1" />
      </svg>

      {/* Floating tooltip */}
      {cursor?.dur && tooltipRows.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 14,
          left: cursor.svgX < W * 0.55 ? cursor.pxX + 14 : cursor.pxX - 198,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 20,
          minWidth: 172,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {cursor.dur}
          </div>
          {tooltipRows.map(row => (
            <div key={row.yr} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: row.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)', width: 34 }}>{row.yr}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono,monospace', marginLeft: 'auto' }}>{row.w}W</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>{row.wkg} W/kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// SUB-TAB 2: RECORDS PERSONNELS
// ════════════════════════════════════════════════
function RecordsSubTab({ onSelect, selectedDatum, profile }: {
  onSelect: Props['onSelect']
  selectedDatum: Props['selectedDatum']
  profile: Props['profile']
}) {
  const [sport, setSport] = useState<RecordSport>('bike')
  // ── Année globale (pills DS §16) ─────────────────────────────────
  const [recordYear, setRecordYear] = useState('All Time')
  const [hiddenYears, setHiddenYears] = useState<Set<string>>(new Set())
  // ── Inline edit state (one record at a time) ─────────────────────
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')       // temps final
  const [editDate, setEditDate] = useState('')
  const [recordSaving, setRecordSaving] = useState(false)
  // Splits triathlon
  const [editSplitSwim, setEditSplitSwim] = useState('')
  const [editSplitT1,   setEditSplitT1]   = useState('')
  const [editSplitBike, setEditSplitBike] = useState('')
  const [editSplitT2,   setEditSplitT2]   = useState('')
  const [editSplitRun,  setEditSplitRun]  = useState('')

  // Tous les records vélo depuis Supabase (toutes années)
  const [bikeAllRecords, setBikeAllRecords] = useState<{id: string; distance_label: string; performance: string; achieved_at: string}[]>([])

  // All personal records for run/swim/rowing/gym from Supabase
  const [allSpRecords, setAllSpRecords] = useState<SpRecord[]>([])

  // Load all bike records from Supabase on mount (toutes années)
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('personal_records')
        .select('id, distance_label, performance, achieved_at')
        .eq('user_id', user.id)
        .eq('sport', 'bike')
        .order('achieved_at', { ascending: false })
      if (data) setBikeAllRecords(data as {id: string; distance_label: string; performance: string; achieved_at: string}[])
    }
    void load()
  }, [])

  // Load run/swim/rowing/gym/triathlon records from Supabase
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('personal_records')
        .select('id, sport, distance_label, performance, performance_unit, achieved_at, split_swim, split_t1, split_bike, split_t2, split_run')
        .eq('user_id', user.id)
        .in('sport', ['run', 'swim', 'rowing', 'gym', 'triathlon'])
        .order('achieved_at', { ascending: false })
      if (data) setAllSpRecords(data as SpRecord[])
    }
    void load()
  }, [])

  // Meilleur record vélo pour une durée (filtré par année sélectionnée)
  function getEffectiveRec(dur: string): {id: string | null; w: number; date: string} {
    const recs = bikeAllRecords
      .filter(r => r.distance_label === dur && (recordYear === 'All Time' || r.achieved_at.slice(0, 4) === recordYear))
      .map(r => ({ id: r.id, w: parseInt(r.performance) || 0, date: r.achieved_at }))
      .filter(r => r.w > 0)
      .sort((a, b) => b.w - a.w)
    return recs[0] ?? { id: null, w: 0, date: '—' }
  }

  // Meilleur record vélo de l'année précédente
  function getPrevRec(dur: string): {w: number; date: string} | undefined {
    if (recordYear === 'All Time') {
      // 2e meilleur record toutes années confondues
      const all = bikeAllRecords
        .filter(r => r.distance_label === dur)
        .map(r => ({ w: parseInt(r.performance) || 0, date: r.achieved_at }))
        .filter(r => r.w > 0)
        .sort((a, b) => b.w - a.w)
      return all[1]
    }
    const prevYear = String(parseInt(recordYear) - 1)
    const recs = bikeAllRecords
      .filter(r => r.distance_label === dur && r.achieved_at.slice(0, 4) === prevYear)
      .map(r => ({ w: parseInt(r.performance) || 0, date: r.achieved_at }))
      .filter(r => r.w > 0)
      .sort((a, b) => b.w - a.w)
    return recs[0]
  }

  function tryEdit(key: string, currentVal: string, recordId: string | null = null) {
    if (activeEdit && activeEdit !== key) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    setActiveEdit(key)
    setEditingRecordId(recordId)
    setEditDraft(currentVal)
    setEditDate(new Date().toISOString().split('T')[0])
  }

  function cancelEdit() {
    setActiveEdit(null)
    setEditingRecordId(null)
    setEditDraft('')
    setEditSplitSwim(''); setEditSplitT1(''); setEditSplitBike(''); setEditSplitT2(''); setEditSplitRun('')
  }

  // Meilleur record triathlon pour un format (filtré par année)
  function getTrBest(fmt: string): SpRecord | null {
    const recs = allSpRecords.filter(r =>
      r.sport === 'triathlon' && r.distance_label === fmt &&
      (recordYear === 'All Time' || r.achieved_at.slice(0, 4) === recordYear)
    )
    if (!recs.length) return null
    return [...recs].sort((a, b) => toSec(a.performance) - toSec(b.performance))[0]
  }

  // Record triathlon de l'année précédente
  function getTrPrev(fmt: string): SpRecord | null {
    if (recordYear === 'All Time') {
      const all = allSpRecords.filter(r => r.sport === 'triathlon' && r.distance_label === fmt)
      if (all.length < 2) return null
      const sorted = [...all].sort((a, b) => toSec(a.performance) - toSec(b.performance))
      const bestYear = sorted[0].achieved_at.slice(0, 4)
      return sorted.find(r => r.achieved_at.slice(0, 4) !== bestYear) ?? null
    }
    const prevYear = String(parseInt(recordYear) - 1)
    const recs = allSpRecords.filter(r =>
      r.sport === 'triathlon' && r.distance_label === fmt && r.achieved_at.slice(0, 4) === prevYear
    )
    if (!recs.length) return null
    return [...recs].sort((a, b) => toSec(a.performance) - toSec(b.performance))[0]
  }

  function tryEditTriathlon(key: string, rec: SpRecord | null) {
    if (activeEdit && activeEdit !== key) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    setActiveEdit(key)
    setEditingRecordId(rec?.id ?? null)
    setEditDraft(rec?.performance ?? '')
    setEditDate(rec?.achieved_at ?? new Date().toISOString().slice(0, 10))
    setEditSplitSwim(rec?.split_swim ?? '')
    setEditSplitT1(rec?.split_t1 ?? '')
    setEditSplitBike(rec?.split_bike ?? '')
    setEditSplitT2(rec?.split_t2 ?? '')
    setEditSplitRun(rec?.split_run ?? '')
  }

  async function confirmTriathlonRecord(fmt: string) {
    setRecordSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const achievedAt = editDate || new Date().toISOString().slice(0, 10)
      const payload = {
        performance:      editDraft || '0:00:00',
        performance_unit: 'time',
        split_swim:       editSplitSwim || null,
        split_t1:         editSplitT1   || null,
        split_bike:       editSplitBike || null,
        split_t2:         editSplitT2   || null,
        split_run:        editSplitRun  || null,
        achieved_at:      achievedAt,
      }
      if (editingRecordId) {
        await supabase.from('personal_records').update(payload).eq('id', editingRecordId)
        setAllSpRecords(prev => prev.map(r =>
          r.id === editingRecordId ? { ...r, ...payload } : r
        ))
      } else {
        const { data: inserted } = await supabase.from('personal_records').insert({
          user_id:        user.id,
          sport:          'triathlon',
          distance_label: fmt,
          event_type:     'competition',
          race_name:      null,
          ...payload,
        }).select('id, sport, distance_label, performance, performance_unit, achieved_at, split_swim, split_t1, split_bike, split_t2, split_run').single()
        if (inserted) setAllSpRecords(prev => [...prev, inserted as SpRecord])
      }
    }
    setRecordSaving(false)
    cancelEdit()
  }

  // Meilleur record pour les sports non-vélo (retourne l'id pour upsert)
  function getSpBest(sp: string, dist: string, year: string): { id: string; perf: string; date: string } | null {
    const recs = allSpRecords.filter(r =>
      r.sport === sp && r.distance_label === dist &&
      (year === 'All Time' || r.achieved_at.slice(0, 4) === year)
    )
    if (!recs.length) return null
    const isTime = sp !== 'gym'
    const sorted = [...recs].sort((a, b) =>
      isTime
        ? toSec(a.performance) - toSec(b.performance)
        : parseFloat(b.performance) - parseFloat(a.performance)
    )
    return { id: sorted[0].id, perf: sorted[0].performance, date: sorted[0].achieved_at }
  }

  // Record de l'année précédente pour les sports non-vélo
  function getSpPrev(sp: string, dist: string): { perf: string; date: string } | null {
    if (recordYear === 'All Time') {
      // 2e meilleur toutes années (de l'année suivante la moins bonne)
      const all = allSpRecords.filter(r => r.sport === sp && r.distance_label === dist && r.performance !== '—')
      if (all.length < 2) return null
      const isTime = sp !== 'gym'
      const sorted = [...all].sort((a, b) =>
        isTime ? toSec(a.performance) - toSec(b.performance) : parseFloat(b.performance) - parseFloat(a.performance)
      )
      const bestYear = sorted[0].achieved_at.slice(0, 4)
      const prev = sorted.find(r => r.achieved_at.slice(0, 4) !== bestYear)
      return prev ? { perf: prev.performance, date: prev.achieved_at } : null
    }
    const prevYear = String(parseInt(recordYear) - 1)
    const r = getSpBest(sp, dist, prevYear)
    return r ? { perf: r.perf, date: r.date } : null
  }

  // Toutes les années disponibles (vélo + tous sports) pour les pills
  const allRecordYears: string[] = (() => {
    const s = new Set<string>()
    bikeAllRecords.forEach(r => s.add(r.achieved_at.slice(0, 4)))
    allSpRecords.forEach(r => s.add(r.achieved_at.slice(0, 4)))
    return [...s].sort((a, b) => b.localeCompare(a))
  })()

  async function confirmSpRecord(sp: string, dist: string, unit: string) {
    setRecordSaving(true)
    if (editDraft) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const achievedAt = editDate || new Date().toISOString().slice(0, 10)
        if (editingRecordId) {
          // UPDATE du record existant
          await supabase.from('personal_records').update({
            performance:      editDraft,
            performance_unit: unit,
            achieved_at:      achievedAt,
          }).eq('id', editingRecordId)
          setAllSpRecords(prev => prev.map(r =>
            r.id === editingRecordId
              ? { ...r, performance: editDraft, performance_unit: unit, achieved_at: achievedAt }
              : r
          ))
        } else {
          // INSERT nouveau record
          const { data: inserted } = await supabase.from('personal_records').insert({
            user_id:          user.id,
            sport:            sp,
            distance_label:   dist,
            performance:      editDraft,
            performance_unit: unit,
            event_type:       'training',
            achieved_at:      achievedAt,
            race_name:        null,
            pace_s_km:        null,
            elevation_gain_m: null,
            split_swim:       null,
            split_bike:       null,
            split_run:        null,
            station_times:    null,
            notes:            null,
          }).select('id, sport, distance_label, performance, performance_unit, achieved_at').single()
          if (inserted) setAllSpRecords(prev => [...prev, inserted as SpRecord])
        }
      }
    }
    setRecordSaving(false)
    setActiveEdit(null)
    setEditingRecordId(null)
    setEditDraft('')
  }

  async function confirmBikeRecord(dur: string) {
    setRecordSaving(true)
    const watts = parseInt(editDraft) || 0
    if (watts > 0) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const achievedAt = editDate || new Date().toISOString().split('T')[0]
        if (editingRecordId) {
          // UPDATE du record existant
          await supabase.from('personal_records').update({
            performance: String(watts),
            achieved_at: achievedAt,
          }).eq('id', editingRecordId)
          setBikeAllRecords(prev => prev.map(r =>
            r.id === editingRecordId
              ? { ...r, performance: String(watts), achieved_at: achievedAt }
              : r
          ))
        } else {
          // INSERT nouveau record
          const { data: inserted } = await supabase.from('personal_records').insert({
            user_id:          user.id,
            sport:            'bike',
            distance_label:   dur,
            performance:      String(watts),
            performance_unit: 'watts',
            event_type:       'training',
            achieved_at:      achievedAt,
            race_name:        null,
            pace_s_km:        null,
            elevation_gain_m: null,
            split_swim:       null,
            split_bike:       null,
            split_run:        null,
            station_times:    null,
            notes:            null,
          }).select('id, distance_label, performance, achieved_at').single()
          if (inserted) setBikeAllRecords(prev => [...prev, inserted as typeof bikeAllRecords[0]])
        }
      }
    }
    setRecordSaving(false)
    setActiveEdit(null)
    setEditingRecordId(null)
    setEditDraft('')
  }

  // Build bikeByYear depuis Supabase uniquement (meilleur par durée par année)
  const bikeByYear: Record<string, Record<string, number>> = {}
  for (const rec of bikeAllRecords) {
    const yr  = rec.achieved_at.slice(0, 4)
    const dur = rec.distance_label
    const w   = parseInt(rec.performance) || 0
    if (w <= 0) continue
    if (!bikeByYear[yr]) bikeByYear[yr] = {}
    if (!bikeByYear[yr][dur] || w > bikeByYear[yr][dur]) bikeByYear[yr][dur] = w
  }
  const bikeYears = Object.keys(bikeByYear).sort((a, b) => b.localeCompare(a)).slice(0, 5)

  function toggleHiddenYear(yr: string) {
    setHiddenYears(prev => {
      const next = new Set(prev)
      if (next.has(yr)) next.delete(yr)
      else next.add(yr)
      return next
    })
  }

  const SPORT_TABS: [RecordSport, string, string][] = [
    ['bike',       'Vélo',       '#3b82f6'],
    ['run',        'Course',     '#22c55e'],
    ['swim',       'Natation',   '#38bdf8'],
    ['rowing',     'Aviron',     '#14b8a6'],
    ['triathlon',  'Triathlon',  '#f59e0b'],
    ['hyrox',      'Hyrox',      '#ef4444'],
    ['gym',        'Muscu',      '#f97316'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader label="Records personnels" gradient="linear-gradient(180deg,#ffb340,#f97316)" />

      {/* Sport tabs */}
      <SportTabs
        tabs={SPORT_TABS.map(([id, label, color]) => ({ id, label, color }))}
        value={sport}
        onChange={(id) => setSport(id as RecordSport)}
      />

      {/* Year pills DS §16 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['All Time', ...allRecordYears] as string[]).map(yr => {
          const active = recordYear === yr
          const color  = yr === 'All Time' ? '#5b6fff' : (YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR)
          return (
            <button key={yr} onClick={() => setRecordYear(yr)} style={{
              padding: '5px 12px', borderRadius: 20, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              fontSize: 12, fontWeight: active ? 700 : 500,
              transition: 'background 0.15s, color 0.15s',
              background: active ? color : 'var(--bg-card2)',
              color: active ? '#ffffff' : 'var(--text-dim)',
            }}>
              {yr}
            </button>
          )
        })}
      </div>

      {/* BIKE */}
      {sport === 'bike' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Power Curve</h2>
            </div>

            {/* Scroll horizontal sur mobile si l'axe X est trop dense */}
            <div style={{ overflowX: 'auto', overflowY: 'visible', margin: '0 -4px' }}>
              <PowerCurveLogSVG bikeByYear={bikeByYear} hiddenYears={hiddenYears} selectedYear={recordYear} weight={profile.weight} />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {bikeYears.map(yr => {
                const color = getPCColor(yr, bikeYears)
                const hidden = hiddenYears.has(yr)
                return (
                  <button key={yr} onClick={() => toggleHiddenYear(yr)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20, border: '1px solid',
                    borderColor: hidden ? 'var(--border)' : color,
                    background: hidden ? 'var(--bg-card2)' : `${color}18`,
                    cursor: 'pointer', opacity: hidden ? 0.4 : 1,
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: hidden ? 'var(--text-dim)' : color }}>{yr}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Records de puissance</h2>
            {BIKE_DURS.map(d => {
              const eff = getEffectiveRec(d)
              const prev = getPrevRec(d)
              const editKey = `bike-record-${d}`
              const isEditing = activeEdit === editKey
              const sel = selectedDatum?.label === `Vélo ${d}` && selectedDatum?.value === `${eff.w}W`

              if (isEditing) {
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, marginBottom: 5,
                    background: 'rgba(0,200,224,0.06)', border: '1px solid #00c8e0',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', minWidth: 72, flexShrink: 0 }}>{d}</span>
                    <input
                      type="number"
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      autoFocus
                      placeholder="Watts"
                      style={{ width: 76, padding: '4px 8px', borderRadius: 6, border: '1px solid #00c8e0', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') void confirmBikeRecord(d); if (e.key === 'Escape') cancelEdit() }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>W</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }}
                    />
                    <button
                      onClick={() => void confirmBikeRecord(d)}
                      disabled={recordSaving}
                      style={{ padding: '4px 11px', borderRadius: 6, border: 'none', background: '#00c8e0', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}
                    >
                      {recordSaving ? '…' : 'Confirmer'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Annuler
                    </button>
                  </div>
                )
              }

              return (
                <RecordRow key={d} label={d}
                  rec24={eff.w > 0 ? `${eff.w}W` : '—'}
                  rec23={prev && prev.w > 0 ? `${prev.w}W` : '—'}
                  sub={eff.w > 0 ? `${(eff.w / profile.weight).toFixed(2)} W/kg` : undefined}
                  onSelect={() => eff.w > 0 ? onSelect(`Vélo ${d}`, `${eff.w}W`) : undefined}
                  selected={sel}
                  actions={
                    <button
                      onClick={() => tryEdit(editKey, eff.w > 0 ? String(eff.w) : '', eff.id)}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Modifier
                    </button>
                  }
                />
              )
            })}
          </Card>
        </div>
      )}

      {/* RUN */}
      {sport === 'run' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Records course à pied</h2>
            </div>
            <TimeBarChart records={allSpRecords.filter(r => r.sport === 'run')} chartDists={CHART_DISTS.run} color="#22c55e" />
            {RUN_DISTS.map(d => {
              const editKey = `run-${d}`
              const isEditing = activeEdit === editKey
              const spBest  = getSpBest('run', d, recordYear)
              const prevRec = getSpPrev('run', d)
              const pace = spBest ? calcPacePerKm(RUN_KM[d] ?? 0, spBest.perf) : '—'
              const sel = selectedDatum?.label === `Course ${d}` && selectedDatum?.value === (spBest?.perf ?? '—')
              if (isEditing) {
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, marginBottom: 5,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid #22c55e',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', minWidth: 72, flexShrink: 0 }}>{d}</span>
                    <input type="text" value={editDraft} onChange={e => setEditDraft(e.target.value)} autoFocus
                      placeholder="mm:ss ou h:mm:ss"
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #22c55e', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') void confirmSpRecord('run', d, 'time'); if (e.key === 'Escape') cancelEdit() }} />
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
                    <button onClick={() => void confirmSpRecord('run', d, 'time')} disabled={recordSaving}
                      style={{ padding: '4px 11px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                      {recordSaving ? '…' : 'Confirmer'}
                    </button>
                    <button onClick={cancelEdit}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Annuler
                    </button>
                  </div>
                )
              }
              return (
                <RecordRow key={d} label={d}
                  rec24={spBest?.perf ?? '—'}
                  rec23={prevRec?.perf ?? '—'}
                  sub={pace !== '—' ? pace : undefined}
                  onSelect={() => spBest ? onSelect(`Course ${d}`, spBest.perf) : undefined}
                  selected={sel}
                  actions={
                    <button onClick={() => tryEdit(editKey, spBest?.perf ?? '', spBest?.id ?? null)}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Modifier
                    </button>
                  } />
              )
            })}
          </Card>
        </div>
      )}

      {/* SWIM */}
      {sport === 'swim' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Records natation</h2>
            </div>
            <TimeBarChart records={allSpRecords.filter(r => r.sport === 'swim')} chartDists={CHART_DISTS.swim} color="#38bdf8" />
            {SWIM_DISTS.map(d => {
              const editKey = `swim-${d}`
              const isEditing = activeEdit === editKey
              const spBest  = getSpBest('swim', d, recordYear)
              const prevRec = getSpPrev('swim', d)
              const split   = spBest ? calcSplit500m(SWIM_M[d] ?? 0, spBest.perf).replace('/500m', '/100m') : '—'
              const sel = selectedDatum?.label === `Natation ${d}` && selectedDatum?.value === (spBest?.perf ?? '—')
              if (isEditing) {
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, marginBottom: 5,
                    background: 'rgba(56,189,248,0.06)', border: '1px solid #38bdf8',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', minWidth: 72, flexShrink: 0 }}>{d}</span>
                    <input type="text" value={editDraft} onChange={e => setEditDraft(e.target.value)} autoFocus
                      placeholder="mm:ss"
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #38bdf8', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') void confirmSpRecord('swim', d, 'time'); if (e.key === 'Escape') cancelEdit() }} />
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
                    <button onClick={() => void confirmSpRecord('swim', d, 'time')} disabled={recordSaving}
                      style={{ padding: '4px 11px', borderRadius: 6, border: 'none', background: '#38bdf8', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                      {recordSaving ? '…' : 'Confirmer'}
                    </button>
                    <button onClick={cancelEdit}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Annuler
                    </button>
                  </div>
                )
              }
              return (
                <RecordRow key={d} label={d}
                  rec24={spBest?.perf ?? '—'}
                  rec23={prevRec?.perf ?? '—'}
                  sub={split !== '—' ? split : undefined}
                  onSelect={() => spBest ? onSelect(`Natation ${d}`, spBest.perf) : undefined}
                  selected={sel}
                  actions={
                    <button onClick={() => tryEdit(editKey, spBest?.perf ?? '', spBest?.id ?? null)}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Modifier
                    </button>
                  } />
              )
            })}
          </Card>
        </div>
      )}

      {/* ROWING */}
      {sport === 'rowing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>Records aviron</h2>
            </div>
            <TimeBarChart records={allSpRecords.filter(r => r.sport === 'rowing')} chartDists={CHART_DISTS.rowing} color="#14b8a6" />
            {ROW_DISTS.map(d => {
              const editKey = `rowing-${d}`
              const isEditing = activeEdit === editKey
              const spBest  = getSpBest('rowing', d, recordYear)
              const prevRec = getSpPrev('rowing', d)
              const split   = spBest ? calcSplit500m(ROW_M[d] ?? 0, spBest.perf) : '—'
              const wStr = (() => {
                if (split === '—') return '—'
                const pp = split.split('/')[0].split(':').map(Number)
                const ss = (pp[0] ?? 0) * 60 + (pp[1] ?? 0)
                return ss > 0 ? `~${Math.round(2.80 / (ss / 500) ** 3)}W` : '—'
              })()
              const lbl = d === 'Semi' ? 'Semi (21km)' : d === 'Marathon' ? 'Marathon (42km)' : d
              const sel = selectedDatum?.label === `Aviron ${d}` && selectedDatum?.value === (spBest?.perf ?? '—')
              if (isEditing) {
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, marginBottom: 5,
                    background: 'rgba(20,184,166,0.06)', border: '1px solid #14b8a6',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', minWidth: 80, flexShrink: 0 }}>{lbl}</span>
                    <input type="text" value={editDraft} onChange={e => setEditDraft(e.target.value)} autoFocus
                      placeholder="mm:ss ou h:mm:ss"
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #14b8a6', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') void confirmSpRecord('rowing', d, 'time'); if (e.key === 'Escape') cancelEdit() }} />
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
                    <button onClick={() => void confirmSpRecord('rowing', d, 'time')} disabled={recordSaving}
                      style={{ padding: '4px 11px', borderRadius: 6, border: 'none', background: '#14b8a6', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                      {recordSaving ? '…' : 'Confirmer'}
                    </button>
                    <button onClick={cancelEdit}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Annuler
                    </button>
                  </div>
                )
              }
              return (
                <RecordRow key={d} label={lbl}
                  rec24={spBest?.perf ?? '—'}
                  rec23={prevRec?.perf ?? '—'}
                  sub={split !== '—' ? `${split} · ${wStr}` : undefined}
                  onSelect={() => spBest ? onSelect(`Aviron ${d}`, spBest.perf) : undefined}
                  selected={sel}
                  actions={
                    <button onClick={() => tryEdit(editKey, spBest?.perf ?? '', spBest?.id ?? null)}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Modifier
                    </button>
                  } />
              )
            })}
            <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '10px 0 0' }}>Puissance via formule Concept2 : P = 2.80 / (split/500)³</p>
          </Card>
        </div>
      )}

      {/* TRIATHLON */}
      {sport === 'triathlon' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TRIATHLON_FORMATS.map(fmt => {
            const editKey  = `triathlon-${fmt.id}`
            const isEditing = activeEdit === editKey
            const best     = getTrBest(fmt.id)
            const prev     = getTrPrev(fmt.id)

            const fieldStyle = {
              flex: 1, padding: '4px 8px', borderRadius: 6,
              border: '1px solid #f59e0b', background: 'var(--input-bg)',
              color: 'var(--text)', fontFamily: 'DM Mono,monospace',
              fontSize: 11, outline: 'none', minWidth: 0,
            }
            const labelStyle = { fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }

            if (isEditing) {
              return (
                <Card key={fmt.id} style={{ padding: '14px 16px', border: '1px solid #f59e0b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                      {fmt.label}
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 8 }}>
                        {fmt.swim} · {fmt.bike} · {fmt.run}
                      </span>
                    </span>
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
                  </div>

                  {/* Grille des splits */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 80px 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={labelStyle}>🏊 Natation</span>
                      <input value={editSplitSwim} onChange={e => setEditSplitSwim(e.target.value)}
                        placeholder="hh:mm:ss" style={fieldStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={labelStyle}>T1</span>
                      <input value={editSplitT1} onChange={e => setEditSplitT1(e.target.value)}
                        placeholder="mm:ss" style={fieldStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={labelStyle}>🚴 Vélo</span>
                      <input value={editSplitBike} onChange={e => setEditSplitBike(e.target.value)}
                        placeholder="hh:mm:ss" style={fieldStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={labelStyle}>T2</span>
                      <input value={editSplitT2} onChange={e => setEditSplitT2(e.target.value)}
                        placeholder="mm:ss" style={fieldStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={labelStyle}>🏃 Course</span>
                      <input value={editSplitRun} onChange={e => setEditSplitRun(e.target.value)}
                        placeholder="hh:mm:ss" style={fieldStyle} />
                    </div>
                  </div>

                  {/* Temps final + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Temps final</span>
                    <input value={editDraft} onChange={e => setEditDraft(e.target.value)}
                      placeholder="hh:mm:ss"
                      onKeyDown={e => { if (e.key === 'Enter') void confirmTriathlonRecord(fmt.id); if (e.key === 'Escape') cancelEdit() }}
                      style={{ ...fieldStyle, maxWidth: 110, fontWeight: 700 }} />
                    <button onClick={() => void confirmTriathlonRecord(fmt.id)} disabled={recordSaving}
                      style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                      {recordSaving ? '…' : 'Confirmer'}
                    </button>
                    <button onClick={cancelEdit}
                      style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Annuler
                    </button>
                  </div>
                </Card>
              )
            }

            return (
              <Card key={fmt.id} style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Ligne titre */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: best ? 6 : 0 }}>
                      <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                        {fmt.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {fmt.swim} · {fmt.bike} · {fmt.run}
                      </span>
                      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 700, color: best ? '#f59e0b' : 'var(--text-dim)', marginLeft: 'auto' }}>
                        {best?.performance ?? '—'}
                      </span>
                    </div>

                    {/* Splits si disponibles */}
                    {best && (best.split_swim || best.split_bike || best.split_run) && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>
                        {best.split_swim && <span>🏊 {best.split_swim}</span>}
                        {best.split_t1   && <span style={{ color: 'var(--text-dim)' }}>T1 {best.split_t1}</span>}
                        {best.split_bike && <span>🚴 {best.split_bike}</span>}
                        {best.split_t2   && <span style={{ color: 'var(--text-dim)' }}>T2 {best.split_t2}</span>}
                        {best.split_run  && <span>🏃 {best.split_run}</span>}
                      </div>
                    )}

                    {/* Record précédent */}
                    {prev && (
                      <div style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)', marginTop: 2 }}>
                        Préc. : {prev.performance} ({prev.achieved_at.slice(0, 4)})
                      </div>
                    )}
                  </div>

                  <button onClick={() => tryEditTriathlon(editKey, best)}
                    style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Modifier
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* HYROX */}
      {sport === 'hyrox' && (
        <HyroxSection onSelect={onSelect} selectedDatum={selectedDatum} />
      )}

      {/* GYM */}
      {sport === 'gym' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SectionHeader label="Records muscu" gradient="linear-gradient(180deg,#fb923c,#f97316)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="md:grid-cols-2">
            {GYM_MOVES.map(m => (
              <Card key={m.name} style={{ padding: 16 }}>
                <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#f97316' }}>{m.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {m.recs.map(r => {
                    const distLabel = `${m.name} — ${r.l}`
                    const editKey   = `gym-${distLabel}`
                    const isEditing = activeEdit === editKey
                    const unit      = r.l.includes('reps') ? 'reps' : 'kg'
                    const spBest    = getSpBest('gym', distLabel, recordYear)
                    const displayVal = spBest ? `${spBest.perf}${unit === 'reps' ? ' reps' : ' kg'}` : '—'
                    const sel = selectedDatum?.label === distLabel && selectedDatum?.value === displayVal

                    if (isEditing) {
                      return (
                        <div key={r.l} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderRadius: 7, marginBottom: 3,
                          background: 'rgba(249,115,22,0.06)', border: '1px solid #f97316',
                        }}>
                          <span style={{ fontSize: 11, flex: 1, color: 'var(--text-mid)' }}>{r.l}</span>
                          <input type="number" value={editDraft} onChange={e => setEditDraft(e.target.value)} autoFocus
                            placeholder={unit}
                            style={{ width: 64, padding: '3px 7px', borderRadius: 6, border: '1px solid #f97316', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}
                            onKeyDown={e => { if (e.key === 'Enter') void confirmSpRecord('gym', distLabel, unit); if (e.key === 'Escape') cancelEdit() }} />
                          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{unit}</span>
                          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                            style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 10, outline: 'none' }} />
                          <button onClick={() => void confirmSpRecord('gym', distLabel, unit)} disabled={recordSaving}
                            style={{ padding: '3px 9px', borderRadius: 6, border: 'none', background: '#f97316', color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: recordSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                            {recordSaving ? '…' : 'OK'}
                          </button>
                          <button onClick={cancelEdit}
                            style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div key={r.l} onClick={() => displayVal !== '—' ? onSelect(distLabel, displayVal) : undefined} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '5px 9px', borderRadius: 7,
                        background: sel ? 'rgba(249,115,22,0.14)' : 'rgba(249,115,22,0.07)',
                        border: `1px solid ${sel ? 'rgba(249,115,22,0.50)' : 'rgba(249,115,22,0.15)'}`,
                        cursor: displayVal !== '—' ? 'pointer' : undefined,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{r.l}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: displayVal !== '—' ? '#f97316' : 'var(--text-dim)' }}>
                            {displayVal}
                          </span>
                          <button onClick={e => { e.stopPropagation(); tryEdit(editKey, spBest?.perf ?? '', spBest?.id ?? null) }}
                            style={{ padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)', fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>
                            Modifier
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// SUB-TAB 3: YEAR DATAS — refonte complète
// ════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────
type YDSportId = 'running' | 'trail' | 'cycling' | 'swimming' | 'rowing' | 'hyrox' | 'gym' | 'ski' | 'other'

interface YDAutoStat {
  nb_sorties: number; km: number; heures: number
  denivele: number; longest_km: number; longest_h: number; tss: number
}

interface YDManual {
  id?: string; user_id?: string; sport: string; year: number
  km: number | null; heures: number | null; denivele: number | null
  nb_sorties: number | null
  sortie_plus_longue_km: number | null; sortie_plus_longue_heures: number | null
  tss: number | null; volume_tonnes: number | null
  specifique: Record<string, unknown>; updated_at?: string
}

// Colonnes réelles de la table activities (sport_type stocké via SPORT_TYPE_MAP de lib/strava/activities.ts)
interface YDRawAct {
  sport_type:      string | null
  started_at:      string | null
  moving_time_s:   number | null
  distance_m:      number | null
  tss:             number | null
  elevation_gain_m: number | null
}

// Type pour l'import Strava (réponse API brute)
interface StravaActivity {
  id: number; name?: string
  sport_type?: string; type?: string
  start_date?: string
  moving_time?: number; elapsed_time?: number
  distance?: number; total_elevation_gain?: number
  average_speed?: number; max_speed?: number
  average_heartrate?: number; max_heartrate?: number
  average_watts?: number; max_watts?: number
  weighted_average_watts?: number; kilojoules?: number
  suffer_score?: number; average_cadence?: number
  average_temp?: number; calories?: number
  trainer?: boolean; commute?: boolean; flagged?: boolean
}

// Mapping Strava sport_type → valeur stockée en DB
// Doit rester synchronisé avec la contrainte activities_sport_type_check
const STRAVA_SPORT_MAP: Record<string, string> = {
  // Running
  Run: 'run', VirtualRun: 'run',
  // Trail / rando
  TrailRun: 'trail_run', Hike: 'trail_run',
  // Vélo
  Ride: 'bike', MountainBikeRide: 'bike', GravelRide: 'bike',
  EBikeRide: 'bike', EMountainBikeRide: 'bike', Handcycle: 'bike', Velomobile: 'bike',
  // Vélo virtuel
  VirtualRide: 'virtual_bike',
  // Natation
  Swim: 'swim', OpenWaterSwim: 'open_water_swim',
  // Aviron / pagaie
  Rowing: 'rowing', VirtualRow: 'rowing', Canoeing: 'rowing', Kayaking: 'rowing',
  // Salle
  Workout: 'gym', WeightTraining: 'gym', Elliptical: 'gym', StairStepper: 'gym', Pilates: 'gym',
  // Valeurs spécifiques disponibles en DB
  CrossFit: 'crossfit',
  Yoga: 'yoga',
  HighIntensityIntervalTraining: 'hiit',
  // Ski & sports de glisse
  AlpineSki: 'ski', BackcountrySki: 'ski', NordicSki: 'ski',
  Snowboard: 'ski', Snowshoe: 'ski', RollerSki: 'ski',
  IceSkate: 'ski', InlineSkate: 'ski',
}
function mapStravaSport(stravaType: string): string {
  // Fallback 'other' : jamais de valeur hors contrainte activities_sport_type_check
  return STRAVA_SPORT_MAP[stravaType] ?? 'other'
}

// ── Sport definitions ──────────────────────────────────────────
// Les keys incluent les valeurs stockées après mapStravaSport ET les variantes manuelles
const YD_SPORTS: { id: YDSportId; label: string; color: string; keys: string[] }[] = [
  { id: 'running',  label: 'Running',  color: '#22c55e', keys: ['run', 'running', 'virtualrun', 'walk'] },
  { id: 'trail',    label: 'Trail',    color: '#84cc16', keys: ['trail_run', 'trail', 'trail_running', 'trailrun', 'hike'] },
  { id: 'cycling',  label: 'Cyclisme', color: '#00c8e0', keys: ['bike', 'virtual_bike', 'cycling', 'ride', 'virtual_ride', 'road_cycling', 'gravelride', 'mountainbikeride', 'ebikeride'] },
  { id: 'swimming', label: 'Natation', color: '#38bdf8', keys: ['swim', 'swimming', 'open_water_swim', 'open_water_swimming', 'openwatersim'] },
  { id: 'rowing',   label: 'Aviron',   color: '#14b8a6', keys: ['rowing', 'virtualrow', 'canoeing', 'kayaking'] },
  { id: 'hyrox',    label: 'Hyrox',    color: '#ef4444', keys: ['hyrox'] },
  { id: 'gym',      label: 'Muscu',    color: '#f97316', keys: ['gym', 'weight_training', 'crosstraining', 'workout', 'weighttraining', 'crossfit', 'yoga', 'hiit', 'pilates'] },
  { id: 'ski',      label: 'Ski',      color: '#a78bfa', keys: ['ski', 'skiing', 'alpine_ski', 'backcountry_ski', 'nordic_ski', 'snowboard', 'alpineski', 'nordicski', 'snowshoe', 'rollerski'] },
  { id: 'other',    label: 'Autres',   color: '#9ca3af', keys: ['other'] },
]

// ── Metric definitions ─────────────────────────────────────────
interface YDMetric {
  key: string; label: string
  fmt: (v: number) => string
  fromAuto: (s: YDAutoStat) => number
  fromManual: (e: YDManual) => number | null
  manualKey: 'km' | 'heures' | 'denivele' | 'nb_sorties' | 'tss' | 'volume_tonnes'
  step: string
}

const YD_METRICS: Record<string, YDMetric> = {
  km:            { key: 'km',            label: 'Distance',   fmt: v => `${v.toFixed(0)} km`, fromAuto: s => s.km,          fromManual: e => e.km,            manualKey: 'km',            step: '0.1' },
  heures:        { key: 'heures',        label: 'Heures',     fmt: v => fmtHhMM(v),           fromAuto: s => s.heures,      fromManual: e => e.heures,        manualKey: 'heures',        step: '0.1' },
  denivele:      { key: 'denivele',      label: 'D+',         fmt: v => `${Math.round(v)} m`, fromAuto: s => s.denivele,    fromManual: e => e.denivele,      manualKey: 'denivele',      step: '1'   },
  nb_sorties:    { key: 'nb_sorties',    label: 'Sorties',    fmt: v => `${Math.round(v)}`,   fromAuto: s => s.nb_sorties,  fromManual: e => e.nb_sorties,    manualKey: 'nb_sorties',    step: '1'   },
  tss:           { key: 'tss',           label: 'TSS',        fmt: v => `${Math.round(v)}`,   fromAuto: s => s.tss,         fromManual: e => e.tss,           manualKey: 'tss',           step: '1'   },
  volume_tonnes: { key: 'volume_tonnes', label: 'Volume (t)', fmt: v => `${v.toFixed(1)} t`,  fromAuto: _ => 0,             fromManual: e => e.volume_tonnes, manualKey: 'volume_tonnes', step: '0.1' },
}

const YD_SPORT_METRICS: Record<YDSportId, string[]> = {
  running:  ['km', 'heures', 'denivele', 'nb_sorties'],
  trail:    ['km', 'heures', 'denivele', 'nb_sorties'],
  cycling:  ['km', 'heures', 'denivele', 'tss', 'nb_sorties'],
  swimming: ['km', 'heures', 'nb_sorties'],
  rowing:   ['km', 'heures', 'nb_sorties'],
  hyrox:    ['nb_sorties', 'km', 'heures'],
  gym:      ['nb_sorties', 'heures', 'volume_tonnes'],
  ski:      ['heures', 'denivele', 'nb_sorties'],
  other:    ['nb_sorties', 'heures', 'km'],
}

// ── Chart 1 Compare — couleurs par année ────────────────────────
const C1_CMP_COLORS: Record<string, string> = {
  '2021': '#9ca3af',
  '2022': '#6366f1',
  '2023': '#f97316',
  '2024': '#eab308',
  '2025': '#3b82f6',
  '2026': '#00c8e0',
}

/** Numéro de semaine ISO 8601 (1-53) depuis une date ISO string */
function getISOWeek(dateStr: string): number {
  const d    = new Date(dateStr)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ── Markers types ────────────────────────────────────────────
interface C1Race {
  id: string
  title: string | null
  started_at: string
  sport_type: string | null
  moving_time_s: number | null
  distance_m: number | null
}
interface C1Injury {
  id: string
  nom: string
  type: string
  date_debut: string
  date_fin: string | null
}
interface C1RaceMarker  { race: C1Race; x: number; color: string }
interface C1InjuryBand  { inj: C1Injury; x1: number; x2: number; isPoint: boolean }

// ── Component ─────────────────────────────────────────────────
function YearDatasSubTab() {
  const router = useRouter()
  const [loading, setLoading]         = useState(true)
  const [autoStats, setAutoStats]     = useState<Record<string, Record<string, YDAutoStat>>>({})
  const [manualMap, setManualMap]     = useState<Record<string, Record<string, YDManual>>>({})
  // year → month(0-11) → sportId → {km, heures, nb_sorties}
  const [monthlyStats, setMonthlyStats] = useState<
    Record<string, Record<number, Record<string, { km: number; heures: number; nb_sorties: number }>>>
  >({})
  const [allYears, setAllYears]       = useState<string[]>([])
  const [stravaConnected, setStravaConnected] = useState(false)

  const [activeSport, setActiveSport] = useState<YDSportId>('running')
  const [mode, setMode]               = useState<'auto' | 'manual'>('auto')
  const [selectedYear, setSelectedYear] = useState('all')
  const [chartMetric, setChartMetric]   = useState('heures')

  // Chart 1 controls
  const [chart1Year,      setChart1Year]      = useState('')
  const [chart1Metric,    setChart1Metric]    = useState<'km' | 'heures' | 'nb_sorties'>('heures')
  const [chart1Period,    setChart1Period]    = useState<'mois' | 'semaine'>('mois')
  // Chart 1 — Mode Comparer
  const [c1CompareMode,   setC1CompareMode]   = useState(false)
  const [c1CompareSport,  setC1CompareSport]  = useState<string>('running')
  const [c1CompareYears,  setC1CompareYears]  = useState<string[]>([])
  const [c1CompareSheet,  setC1CompareSheet]  = useState(false)
  // weeklyStats : year → isoWeek(1-53) → sportId → {km, heures, nb_sorties}
  const [weeklyStats, setWeeklyStats] = useState<
    Record<string, Record<number, Record<string, { km: number; heures: number; nb_sorties: number }>>>
  >({})

  // Edit state (manual mode)
  const [editYear,  setEditYear]  = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<YDManual>>({})
  const [saving, setSaving]       = useState(false)
  const [addYearInput, setAddYearInput] = useState('')

  // Sync dropdown
  const [syncing,      setSyncing]      = useState(false)
  const [syncMsg,      setSyncMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [showSyncMenu, setShowSyncMenu] = useState(false)
  const syncMenuRef = useRef<HTMLDivElement>(null)

  // Import historique Strava
  const [importing,       setImporting]       = useState(false)
  const [importProgress,  setImportProgress]  = useState<{
    imported: number; skipped: number; page: number; done: boolean; error?: string
  } | null>(null)

  // Chart tooltips
  const [hoveredBar,      setHoveredBar]      = useState<{ year: string; val: number; svgX: number } | null>(null)
  const [hoveredPoint,    setHoveredPoint]    = useState<number | null>(null)
  // Chart 1 markers — compétitions + blessures
  const [c1Races,         setC1Races]         = useState<C1Race[]>([])
  const [c1Injuries,      setC1Injuries]      = useState<C1Injury[]>([])
  const [c1HoveredRace,   setC1HoveredRace]   = useState<C1Race | null>(null)
  const [c1HoveredInjury, setC1HoveredInjury] = useState<C1Injury | null>(null)
  // Visibilité des marqueurs
  const [c1ShowRaces,     setC1ShowRaces]     = useState(true)
  const [c1ShowBlessures, setC1ShowBlessures] = useState(true)
  const [c1FeatOpen,      setC1FeatOpen]      = useState(false)
  const c1FeatRef = useRef<HTMLDivElement>(null)

  // Responsive
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Scroll reveal §12 — déclenché quand les charts passent dans le viewport
  useEffect(() => {
    const els = document.querySelectorAll('.yd-reveal')
    if (!els.length) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          ;(e.target as HTMLElement).classList.add('yd-visible')
          io.unobserve(e.target)
        }
      }),
      { threshold: 0.08 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [autoStats, allYears])

  // ── Fetch ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    // Pagination pour contourner le plafond PostgREST db-max-rows=1000
    // (le .limit() côté client est écrasé par ce plafond serveur)
    const PAGE = 1000
    let acts: YDRawAct[] = []
    let offset = 0
    while (true) {
      const { data: page } = await sb
        .from('activities')
        .select('sport_type, started_at, moving_time_s, distance_m, tss, elevation_gain_m')
        .order('started_at', { ascending: false })
        .range(offset, offset + PAGE - 1)
      if (!page?.length) break
      acts = [...acts, ...(page as YDRawAct[])]
      if (page.length < PAGE) break
      offset += PAGE
    }

    const auto: Record<string, Record<string, YDAutoStat>> = {}
    const monthly: Record<string, Record<number, Record<string, { km: number; heures: number; nb_sorties: number }>>> = {}
    const weekly:  Record<string, Record<number, Record<string, { km: number; heures: number; nb_sorties: number }>>> = {}

    for (const act of acts) {
      if (!act.started_at || !act.sport_type) continue
      const year  = act.started_at.slice(0, 4)
      const month = parseInt(act.started_at.slice(5, 7)) - 1  // 0-indexed
      const week  = getISOWeek(act.started_at)
      const lower = act.sport_type.toLowerCase()
      for (const sp of YD_SPORTS) {
        if (!sp.keys.includes(lower)) continue
        // Annual
        if (!auto[year]) auto[year] = {}
        if (!auto[year][sp.id]) auto[year][sp.id] = { nb_sorties: 0, km: 0, heures: 0, denivele: 0, longest_km: 0, longest_h: 0, tss: 0 }
        const s  = auto[year][sp.id]
        const km = (act.distance_m ?? 0) / 1000
        const h  = (act.moving_time_s ?? 0) / 3600
        s.nb_sorties += 1; s.km += km; s.heures += h; s.tss += act.tss ?? 0
        s.denivele   += act.elevation_gain_m ?? 0
        if (km > s.longest_km) s.longest_km = km
        if (h  > s.longest_h)  s.longest_h  = h
        // Monthly
        if (!monthly[year]) monthly[year] = {}
        if (!monthly[year][month]) monthly[year][month] = {}
        if (!monthly[year][month][sp.id]) monthly[year][month][sp.id] = { km: 0, heures: 0, nb_sorties: 0 }
        monthly[year][month][sp.id].km         += km
        monthly[year][month][sp.id].heures     += h
        monthly[year][month][sp.id].nb_sorties += 1
        // Weekly (ISO 8601)
        if (!weekly[year]) weekly[year] = {}
        if (!weekly[year][week]) weekly[year][week] = {}
        if (!weekly[year][week][sp.id]) weekly[year][week][sp.id] = { km: 0, heures: 0, nb_sorties: 0 }
        weekly[year][week][sp.id].km         += km
        weekly[year][week][sp.id].heures     += h
        weekly[year][week][sp.id].nb_sorties += 1
        break
      }
    }

    const manual: Record<string, Record<string, YDManual>> = {}
    const { data: manualRows, error: manualErr } = await sb
      .from('year_data_manual')
      .select('*')
      .order('year', { ascending: false })
    if (!manualErr && manualRows) {
      for (const row of manualRows as YDManual[]) {
        if (!manual[row.sport]) manual[row.sport] = {}
        manual[row.sport][String(row.year)] = row
      }
    }

    const yearsSet = new Set<string>()
    Object.keys(auto).forEach(y => yearsSet.add(y))
    Object.values(manual).forEach(m => Object.keys(m).forEach(y => yearsSet.add(y)))
    const years = Array.from(yearsSet).sort((a, b) => b.localeCompare(a))

    setAutoStats(auto)
    setManualMap(manual)
    setMonthlyStats(monthly)
    setWeeklyStats(weekly)
    setAllYears(years)
    setChart1Year(prev => prev && years.includes(prev) ? prev : (years[0] ?? String(new Date().getFullYear())))
    setC1CompareYears(prev => prev.length > 0 ? prev : (years[0] ? [years[0]] : []))
    setLoading(false)
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  // ── Fetch marqueurs (compétitions + blessures) ───────────────
  const fetchMarkers = useCallback(async () => {
    const sb = createClient()
    const [{ data: runRaces }, { data: cycleRaces }, { data: injuriesData }] = await Promise.all([
      // Courses à pied (is_race = true → workout_type 1)
      sb.from('activities')
        .select('id, title, started_at, sport_type, moving_time_s, distance_m')
        .eq('is_race', true),
      // Courses cyclistes (workout_type 11 dans raw_data)
      sb.from('activities')
        .select('id, title, started_at, sport_type, moving_time_s, distance_m')
        .filter('raw_data->>workout_type', 'eq', '11'),
      // Blessures — erreur silencieuse si table absente (data sera null)
      sb.from('injuries').select('id, nom, type, date_debut, date_fin'),
    ])
    const merged = [...(runRaces ?? []), ...(cycleRaces ?? [])]
    // Dédupliquer par id (une course running peut matcher les deux requêtes)
    const seen = new Set<string>()
    const unique = merged.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    setC1Races(unique as C1Race[])
    setC1Injuries((injuriesData ?? []) as C1Injury[])
  }, [])

  useEffect(() => { void fetchMarkers() }, [fetchMarkers])

  // Strava connection check — exact same pattern as Profile page (useConnections hook)
  const checkStravaConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/oauth/status')
      if (!res.ok) return
      const { connected: cp } = await res.json() as { connected: string[] }
      setStravaConnected(cp.includes('strava'))
    } catch {}
  }, [])

  useEffect(() => { void checkStravaConnection() }, [checkStravaConnection])

  // Close sync menu on outside click
  useEffect(() => {
    if (!showSyncMenu) return
    function onClickOutside(e: MouseEvent) {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target as Node)) {
        setShowSyncMenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showSyncMenu])

  // Close Fonctionnalités dropdown on outside click
  useEffect(() => {
    if (!c1FeatOpen) return
    function onClickOutside(e: MouseEvent) {
      if (c1FeatRef.current && !c1FeatRef.current.contains(e.target as Node)) {
        setC1FeatOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [c1FeatOpen])

  // ── Helpers ────────────────────────────────────────────────
  const sportDef     = YD_SPORTS.find(s => s.id === activeSport)!
  const sportMetrics = YD_SPORT_METRICS[activeSport]
  const validMetric  = sportMetrics.includes(chartMetric) ? chartMetric : sportMetrics[0]
  const metricDef    = YD_METRICS[validMetric]!
  const chartYears   = [...allYears].sort()

  function autoStat(year: string): YDAutoStat | null { return autoStats[year]?.[activeSport] ?? null }
  function manualEntry(year: string): YDManual | null { return manualMap[activeSport]?.[year] ?? null }

  function getDisplayVal(m: YDMetric, year: string): number {
    if (mode === 'auto') { const s = autoStat(year); return s ? m.fromAuto(s) : 0 }
    const e = manualEntry(year); return e ? (m.fromManual(e) ?? 0) : 0
  }

  const aggStat: YDAutoStat | null = (() => {
    if (mode !== 'auto') return null
    const agg: YDAutoStat = { nb_sorties: 0, km: 0, heures: 0, denivele: 0, longest_km: 0, longest_h: 0, tss: 0 }
    let found = false
    for (const yr of allYears) {
      const s = autoStat(yr); if (!s) continue; found = true
      agg.nb_sorties += s.nb_sorties; agg.km += s.km; agg.heures += s.heures
      agg.denivele += s.denivele; agg.tss += s.tss
      if (s.longest_km > agg.longest_km) agg.longest_km = s.longest_km
      if (s.longest_h  > agg.longest_h)  agg.longest_h  = s.longest_h
    }
    return found ? agg : null
  })()

  const displayAuto:   YDAutoStat | null = selectedYear === 'all' ? aggStat : autoStat(selectedYear)
  const displayManual: YDManual   | null = selectedYear === 'all' ? null    : manualEntry(selectedYear)
  const hasDisplay = mode === 'auto' ? displayAuto !== null : displayManual !== null

  // Merged value: prefer auto (individual activities), fallback to manual (annual totals from sync)
  function getMergedVal(m: YDMetric, year: string, sport: string): number {
    const a = autoStats[year]?.[sport] ?? null
    if (a) return m.fromAuto(a)
    const e = manualMap[sport]?.[year] ?? null
    return e ? (m.fromManual(e) ?? 0) : 0
  }

  const chartVals   = chartYears.map(yr => getMergedVal(metricDef, yr, activeSport))
  const maxChartVal = Math.max(...chartVals, 1)

  // ── Save manual (UPSERT) ───────────────────────────────────
  async function saveManual(year: string) {
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const payload = {
        user_id:                   user.id,
        sport:                     activeSport,
        year:                      parseInt(year),
        km:                        editDraft.km                        ?? null,
        heures:                    editDraft.heures                    ?? null,
        denivele:                  editDraft.denivele                  ?? null,
        nb_sorties:                editDraft.nb_sorties                ?? null,
        sortie_plus_longue_km:     editDraft.sortie_plus_longue_km     ?? null,
        sortie_plus_longue_heures: editDraft.sortie_plus_longue_heures ?? null,
        tss:                       editDraft.tss                       ?? null,
        volume_tonnes:             editDraft.volume_tonnes             ?? null,
        specifique:                editDraft.specifique                ?? {},
        updated_at:                new Date().toISOString(),
      }
      const { data: saved } = await sb
        .from('year_data_manual')
        .upsert(payload, { onConflict: 'user_id,sport,year' })
        .select()
        .single()
      if (saved) {
        const s = saved as YDManual
        setManualMap(prev => ({ ...prev, [activeSport]: { ...(prev[activeSport] ?? {}), [year]: s } }))
        if (!allYears.includes(year)) setAllYears(prev => [...prev, year].sort((a, b) => b.localeCompare(a)))
      }
      setEditYear(null); setEditDraft({})
    } finally { setSaving(false) }
  }

  function startEdit(year: string) {
    if (editYear && editYear !== year) {
      if (!window.confirm('Abandonner les modifications en cours ?')) return
    }
    const existing = manualEntry(year)
    setEditDraft(existing ? { ...existing } : { sport: activeSport, year: parseInt(year), specifique: {} })
    setEditYear(year)
  }

  function handleAddYear() {
    const yr = addYearInput.trim()
    if (!yr || !/^\d{4}$/.test(yr)) return
    if (!allYears.includes(yr)) setAllYears(prev => [...prev, yr].sort((a, b) => b.localeCompare(a)))
    setMode('manual')
    setSelectedYear(yr)
    setAddYearInput('')
    startEdit(yr)
  }

  // ── Provider sync — architecture extensible ────────────────
  type SyncResult = { ok: boolean; text: string }

  async function syncStrava(): Promise<SyncResult> {
    const res = await fetch('/api/strava/stats')
    if (res.status === 403) return { ok: false, text: 'Non connecté à Strava. Connecte ton compte depuis les paramètres.' }
    if (!res.ok)            return { ok: false, text: 'Erreur Strava. Réessaie plus tard.' }

    const data      = await res.json() as Record<string, unknown>
    const currentYr = String(new Date().getFullYear())
    const sb        = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { ok: false, text: 'Non authentifié.' }

    type StravaTotal = { count: number; distance: number; moving_time: number }
    const mappings: { sportId: string; ytd: StravaTotal | null }[] = [
      { sportId: 'running',  ytd: (data.ytd_run_totals  ?? null) as StravaTotal | null },
      { sportId: 'cycling',  ytd: (data.ytd_ride_totals ?? null) as StravaTotal | null },
      { sportId: 'swimming', ytd: (data.ytd_swim_totals ?? null) as StravaTotal | null },
    ]
    for (const { sportId, ytd } of mappings) {
      if (!ytd) continue
      await sb.from('year_data_manual').upsert({
        user_id:    user.id,
        sport:      sportId,
        year:       parseInt(currentYr),
        km:         Math.round((ytd.distance    / 1000) * 10) / 10,
        heures:     Math.round((ytd.moving_time / 3600) * 10) / 10,
        nb_sorties: ytd.count,
        denivele: null, sortie_plus_longue_km: null, sortie_plus_longue_heures: null,
        tss: null, volume_tonnes: null, specifique: {}, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,sport,year' })
    }
    return { ok: true, text: `Données ${currentYr} mises à jour (Running, Cyclisme, Natation).` }
  }

  // Point d'entrée générique — ajouter Garmin/Polar/Wahoo ici quand dispo
  async function syncProvider(provider: 'strava'): Promise<SyncResult> {
    switch (provider) {
      case 'strava': return syncStrava()
      default:       return { ok: false, text: `Intégration ${provider} non disponible.` }
    }
  }

  async function handleSync(provider: 'strava') {
    setSyncing(true); setSyncMsg(null); setShowSyncMenu(false)
    try {
      const result = await syncProvider(provider)
      setSyncMsg(result)
      if (result.ok) await fetchData()
    } catch { setSyncMsg({ ok: false, text: 'Erreur inattendue.' }) }
    finally { setSyncing(false) }
  }

  // ── Import historique complet Strava ───────────────────────
  async function handleImportHistory() {
    if (!stravaConnected || importing) return
    setImporting(true)
    setSyncMsg(null)
    setImportProgress({ imported: 0, skipped: 0, page: 0, done: false })

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        setImportProgress({ imported: 0, skipped: 0, page: 0, done: true, error: 'Non authentifié.' })
        return
      }

      let page           = 1
      let totalImported  = 0
      let totalProcessed = 0

      while (true) {
        const res = await fetch(`/api/strava/import-history?page=${page}&per_page=200`)
        if (res.status === 403) {
          setImportProgress({ imported: totalImported, skipped: totalProcessed - totalImported, page, done: true, error: 'Non connecté à Strava.' })
          break
        }
        if (!res.ok) {
          setImportProgress({ imported: totalImported, skipped: totalProcessed - totalImported, page, done: true, error: `Erreur Strava (${res.status}).` })
          break
        }

        const activities = await res.json() as StravaActivity[]
        if (!activities?.length) {
          // Toutes les pages traitées
          setImportProgress({ imported: totalImported, skipped: totalProcessed - totalImported, page: page - 1, done: true })
          if (totalImported > 0) await fetchData()
          break
        }

        totalProcessed += activities.length

        const rows = activities.map(a => ({
          user_id:          user.id,
          provider:         'strava',
          provider_id:      String(a.id),
          sport_type:       mapStravaSport(a.sport_type ?? a.type ?? 'Workout'),
          title:            a.name ?? null,
          started_at:       a.start_date ?? null,
          moving_time_s:    a.moving_time    ?? null,
          elapsed_time_s:   a.elapsed_time   ?? null,
          distance_m:       a.distance       ?? null,
          elevation_gain_m: a.total_elevation_gain ?? null,
          avg_speed_ms:     a.average_speed  ?? null,
          max_speed_ms:     a.max_speed      ?? null,
          avg_hr:           a.average_heartrate ?? null,
          max_hr:           a.max_heartrate  ? Math.round(a.max_heartrate) : null,
          avg_watts:        a.average_watts  ?? null,
          normalized_watts: a.weighted_average_watts ? Math.round(a.weighted_average_watts) : null,
          kilojoules:       a.kilojoules     ?? null,
          suffer_score:     a.suffer_score   ?? null,
          avg_cadence:      a.average_cadence ?? null,
          avg_temp_c:       a.average_temp   ?? null,
          trainer:          a.trainer        ?? null,
          commute:          a.commute        ?? null,
          flagged:          a.flagged        ?? null,
          calories:         a.calories       ?? null,
          raw_data:         a,
          created_at:       new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        }))

        // ON CONFLICT DO NOTHING — évite les erreurs de doublon sans pré-filtre
        const { data: inserted, error: upsertErr } = await sb
          .from('activities')
          .upsert(rows, { onConflict: 'user_id,provider,provider_id', ignoreDuplicates: true })
          .select('provider_id')

        if (upsertErr) {
          setImportProgress({ imported: totalImported, skipped: totalProcessed - totalImported, page, done: true, error: `Erreur DB: ${upsertErr.message}` })
          break
        }
        totalImported += inserted?.length ?? 0

        page++
        setImportProgress({ imported: totalImported, skipped: totalProcessed - totalImported, page, done: false })
      }
    } catch {
      setImportProgress(prev =>
        prev ? { ...prev, done: true, error: 'Erreur inattendue.' }
             : { imported: 0, skipped: 0, page: 0, done: true, error: 'Erreur inattendue.' }
      )
    } finally {
      setImporting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Chargement des données…</p>
        </div>
      </div>
    )
  }

  const currentYear   = String(new Date().getFullYear())
  const manualListYrs = allYears.includes(currentYear) ? allYears : [currentYear, ...allYears]
  const SVG_W         = 500
  const MONTHS        = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

  // ── Chart 1: volume par sport (mensuel ou hebdomadaire) ───────
  const c1YearOpts = allYears.length > 0 ? allYears : [currentYear]
  // Nombre de points X selon la période
  const C1_N = chart1Period === 'mois' ? 12 : 52
  // Libellés axe X
  const C1_LABELS: string[] = chart1Period === 'mois'
    ? MONTHS
    : Array.from({ length: 52 }, (_, i) => `S${i + 1}`)
  // Valeurs par point (index 0-based) pour un sport + une année
  const c1PointVals = (sportId: string, year = chart1Year): number[] =>
    Array.from({ length: C1_N }, (_, i) =>
      chart1Period === 'mois'
        ? (monthlyStats[year]?.[i]?.[sportId]?.[chart1Metric] ?? 0)
        : (weeklyStats[year]?.[i + 1]?.[sportId]?.[chart1Metric] ?? 0)
    )
  // Sports ayant des données (mode normal)
  const c1HasData = Array.from({ length: C1_N }, (_, i) => i).some(i =>
    YD_SPORTS.some(sp => c1PointVals(sp.id)[i] > 0)
  )
  const c1Sports = c1HasData ? YD_SPORTS.filter(sp =>
    Array.from({ length: C1_N }, (_, i) => i).some(i => c1PointVals(sp.id)[i] > 0)
  ) : []
  // Fallback annuel (seulement en mode mois et hors compare)
  const c1HasMonthly = c1HasData && chart1Period === 'mois'
  const c1AnnualSports = !c1HasMonthly && !c1CompareMode ? YD_SPORTS.filter(sp => {
    const e = manualMap[sp.id]?.[chart1Year]
    if (!e) return false
    const v = chart1Metric === 'km' ? (e.km ?? 0) : chart1Metric === 'heures' ? (e.heures ?? 0) : (e.nb_sorties ?? 0)
    return v > 0
  }) : []
  const c1AnnualMax = c1AnnualSports.length > 0
    ? Math.max(1, ...c1AnnualSports.map(sp => {
        const e = manualMap[sp.id]?.[chart1Year]
        return chart1Metric === 'km' ? (e?.km ?? 0) : chart1Metric === 'heures' ? (e?.heures ?? 0) : (e?.nb_sorties ?? 0)
      }))
    : 1
  // MaxVal selon mode
  const c1MaxVal = c1CompareMode
    ? Math.max(1, ...c1CompareYears.flatMap(yr => c1PointVals(c1CompareSport, yr)))
    : Math.max(1, ...c1Sports.flatMap(sp => c1PointVals(sp.id)))
  // Mobile : viewBox plus haut + largeur fixe 728px en mode Semaine (scroll horizontal)
  const C1_H    = isMobile ? 230 : 155
  const C1_SVG_W = (isMobile && chart1Period === 'semaine') ? 728 : SVG_W
  const C1_PL = 44, C1_PR = 10, C1_PT = 16, C1_PB = 32
  const c1PlotW = C1_SVG_W - C1_PL - C1_PR
  const c1PlotH = C1_H - C1_PT - C1_PB
  // Diviseur protégé contre C1_N = 1
  const c1X = (i: number) => C1_PL + (i / Math.max(1, C1_N - 1)) * c1PlotW
  const c1Y = (v: number) => C1_PT + c1PlotH - (v / c1MaxVal) * c1PlotH
  // Helper format valeur tooltip
  const c1FmtVal = (v: number): string =>
    chart1Metric === 'heures'     ? `${v.toFixed(1)} h`
    : chart1Metric === 'km'       ? `${Math.round(v)} km`
    : `${Math.round(v)} séance${Math.round(v) > 1 ? 's' : ''}`

  // ── Chart 1 markers computation ────────────────────────────────
  // Années visibles sur le chart (normal = [chart1Year], compare = c1CompareYears)
  const c1MarkerYears = c1CompareMode ? c1CompareYears : (chart1Year ? [chart1Year] : [])

  // Helper : index X (0-based) depuis une date ISO
  const dateToIdx = (dateStr: string): number => {
    if (chart1Period === 'mois') return parseInt(dateStr.slice(5, 7)) - 1
    return getISOWeek(dateStr) - 1
  }

  const c1RaceMarkers: C1RaceMarker[] = []
  const c1InjuryBands: C1InjuryBand[] = []

  // Races
  for (const race of c1Races) {
    if (!race.started_at) continue
    const yr = race.started_at.slice(0, 4)
    if (!c1MarkerYears.includes(yr)) continue
    const x = c1X(dateToIdx(race.started_at))
    const lower = (race.sport_type ?? '').toLowerCase()
    const sp = YD_SPORTS.find(s => s.keys.includes(lower))
    c1RaceMarkers.push({ race, x, color: sp?.color ?? '#fbbf24' })
  }

  // Injury bands
  for (const inj of c1Injuries) {
    for (const yr of c1MarkerYears) {
      const startYr = inj.date_debut.slice(0, 4)
      const endYr   = inj.date_fin ? inj.date_fin.slice(0, 4) : startYr
      if (endYr < yr || startYr > yr) continue
      const idxMax  = C1_N - 1
      const x1 = c1X(startYr === yr ? dateToIdx(inj.date_debut) : 0)
      if (!inj.date_fin) {
        c1InjuryBands.push({ inj, x1, x2: x1, isPoint: true })
        continue
      }
      const x2 = c1X(endYr === yr ? dateToIdx(inj.date_fin) : idxMax)
      c1InjuryBands.push({ inj, x1, x2, isPoint: false })
    }
  }

  // Formatage date lisible pour tooltip
  const fmtDate = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // ── Chart 3: global all-sport stats per year — merged sources ─
  const c3Stats = chartYears.map(yr => ({
    year: yr,
    heures: Math.round(YD_SPORTS.reduce((acc, sp) => {
      const a = autoStats[yr]?.[sp.id]; if (a) return acc + a.heures
      return acc + (manualMap[sp.id]?.[yr]?.heures ?? 0)
    }, 0) * 10) / 10,
    nb_sorties: Math.round(YD_SPORTS.reduce((acc, sp) => {
      const a = autoStats[yr]?.[sp.id]; if (a) return acc + a.nb_sorties
      return acc + (manualMap[sp.id]?.[yr]?.nb_sorties ?? 0)
    }, 0)),
    km: Math.round(YD_SPORTS.reduce((acc, sp) => {
      const a = autoStats[yr]?.[sp.id]; if (a) return acc + a.km
      return acc + (manualMap[sp.id]?.[yr]?.km ?? 0)
    }, 0)),
  }))
  const hasC3Data = c3Stats.some(s => s.heures > 0 || s.nb_sorties > 0 || s.km > 0)
  const C3_H = 80, C3_PL = 44, C3_PR = 8, C3_PT = 8, C3_PB = 20
  const c3PlotW = SVG_W - C3_PL - C3_PR
  const c3PlotH = C3_H - C3_PT - C3_PB
  const c3N   = Math.max(chartYears.length, 1)
  const c3Gap = 5
  const c3BarW = Math.max(10, c3PlotW / c3N - c3Gap)

  return (
    <div className="yd-enter" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ── */}
      {isMobile ? (
        /* ── Mobile : 3 lignes ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeader label="Données annuelles" gradient="linear-gradient(180deg,#a855f7,#5b6fff)" />

          {/* Ligne 1 : toggle Auto/Manuel + sélecteur d'année */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['auto', 'manual'] as const).map(m => (
                <button key={m} onClick={() => {
                  setMode(m)
                  setSelectedYear(m === 'auto' ? 'all' : (allYears[0] ?? currentYear))
                  setEditYear(null)
                }} style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: mode === m ? '#5b6fff' : 'var(--bg-card2)',
                  color:      mode === m ? '#fff'    : 'var(--text-dim)',
                }}>
                  {m === 'auto' ? 'Auto' : 'Manuel'}
                </button>
              ))}
            </div>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              style={{ flex: 1, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
              {mode === 'auto' && <option value="all">Toutes années</option>}
              {allYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>

          {/* Ligne 2 : saisie d'année — uniquement en mode manuel */}
          {mode === 'manual' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" value={addYearInput}
                onChange={e => setAddYearInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddYear()}
                placeholder="2023" min="2000" max="2035"
                style={{ flex: 1, padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
              />
              <button onClick={handleAddYear} style={{
                padding: '5px 12px', borderRadius: 7, border: '1px solid #a855f7',
                background: 'rgba(168,85,247,0.12)', color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>+ Saisir</button>
            </div>
          )}

          {/* Ligne 3 : sync + import */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Sync dropdown */}
            <div ref={syncMenuRef} style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => setShowSyncMenu(v => !v)}
                disabled={syncing}
                style={{
                  width: '100%', padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)',
                  background: showSyncMenu ? 'var(--bg-card2)' : 'var(--bg-card)',
                  color: 'var(--text)', fontSize: 11, fontWeight: 600,
                  cursor: syncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: syncing ? 0.7 : 1,
                  transition: 'background 0.12s',
                }}
              >
                {syncing ? 'Sync…' : 'Synchroniser'}
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1.5 3L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {showSyncMenu && !syncing && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 200,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 4, minWidth: 210,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
                }}>
                  <button
                    onClick={() => void handleSync('strava')}
                    disabled={!stravaConnected}
                    style={{
                      width: '100%', padding: '8px 11px', borderRadius: 7, border: 'none',
                      background: 'transparent', textAlign: 'left',
                      cursor: stravaConnected ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: stravaConnected ? 1 : 0.5, color: 'var(--text)',
                      fontSize: 12, fontWeight: 500, transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (stravaConnected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FC4C02', flexShrink: 0 }} />
                      Sync Strava
                    </span>
                    {!stravaConnected && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>Non connecté</span>
                    )}
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                  {(['Garmin', 'Polar', 'Wahoo'] as const).map(p => (
                    <div key={p} style={{
                      padding: '8px 11px', borderRadius: 7,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: 0.45, cursor: 'not-allowed',
                      color: 'var(--text)', fontSize: 12, fontWeight: 500,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0 }} />
                        Sync {p}
                      </span>
                      <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600, marginLeft: 6, whiteSpace: 'nowrap' }}>
                        Bientôt disponible
                      </span>
                    </div>
                  ))}
                  {stravaConnected && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                      <button
                        onClick={() => { void handleImportHistory(); setShowSyncMenu(false) }}
                        disabled={importing || syncing}
                        style={{
                          width: '100%', padding: '8px 11px', borderRadius: 7, border: 'none',
                          background: 'transparent', textAlign: 'left',
                          cursor: importing || syncing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          opacity: importing || syncing ? 0.5 : 1, color: 'var(--text)',
                          fontSize: 12, fontWeight: 500, transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!importing && !syncing) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M12 3v13M7 11l5 5 5-5"/><line x1="4" y1="20" x2="20" y2="20"/>
                        </svg>
                        {importing ? 'Import en cours…' : 'Importer l\'historique'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Desktop : une seule rangée (inchangé) ── */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <SectionHeader label="Données annuelles" gradient="linear-gradient(180deg,#a855f7,#5b6fff)" />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['auto', 'manual'] as const).map(m => (
                <button key={m} onClick={() => {
                  setMode(m)
                  setSelectedYear(m === 'auto' ? 'all' : (allYears[0] ?? currentYear))
                  setEditYear(null)
                }} style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: mode === m ? '#5b6fff' : 'var(--bg-card2)',
                  color:      mode === m ? '#fff'    : 'var(--text-dim)',
                }}>
                  {m === 'auto' ? 'Auto' : 'Manuel'}
                </button>
              ))}
            </div>
            {/* Year selector */}
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
              {mode === 'auto' && <option value="all">Toutes années</option>}
              {allYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
            {/* Add year — uniquement en mode manuel */}
            {mode === 'manual' && (
              <div style={{ display: 'flex', gap: 3 }}>
                <input
                  type="number" value={addYearInput}
                  onChange={e => setAddYearInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddYear()}
                  placeholder="2023" min="2000" max="2035"
                  style={{ width: 58, padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
                />
                <button onClick={handleAddYear} style={{
                  padding: '5px 10px', borderRadius: 7, border: '1px solid #a855f7',
                  background: 'rgba(168,85,247,0.12)', color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>+ Saisir</button>
              </div>
            )}
            {/* Sync dropdown */}
            <div ref={syncMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSyncMenu(v => !v)}
                disabled={syncing}
                style={{
                  padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)',
                  background: showSyncMenu ? 'var(--bg-card2)' : 'var(--bg-card)',
                  color: 'var(--text)', fontSize: 11, fontWeight: 600,
                  cursor: syncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5, opacity: syncing ? 0.7 : 1,
                  transition: 'background 0.12s',
                }}
              >
                {syncing ? 'Sync…' : 'Synchroniser'}
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1.5 3L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {showSyncMenu && !syncing && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 5px)', right: 0, zIndex: 200,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 4, minWidth: 210,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
                }}>
                  {/* Strava */}
                  <button
                    onClick={() => void handleSync('strava')}
                    disabled={!stravaConnected}
                    style={{
                      width: '100%', padding: '8px 11px', borderRadius: 7, border: 'none',
                      background: 'transparent', textAlign: 'left',
                      cursor: stravaConnected ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: stravaConnected ? 1 : 0.5, color: 'var(--text)',
                      fontSize: 12, fontWeight: 500, transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (stravaConnected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FC4C02', flexShrink: 0 }} />
                      Sync Strava
                    </span>
                    {!stravaConnected && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>Non connecté</span>
                    )}
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                  {/* Garmin / Polar / Wahoo — bientôt disponible */}
                  {(['Garmin', 'Polar', 'Wahoo'] as const).map(p => (
                    <div key={p} style={{
                      padding: '8px 11px', borderRadius: 7,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: 0.45, cursor: 'not-allowed',
                      color: 'var(--text)', fontSize: 12, fontWeight: 500,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0 }} />
                        Sync {p}
                      </span>
                      <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600, marginLeft: 6, whiteSpace: 'nowrap' }}>
                        Bientôt disponible
                      </span>
                    </div>
                  ))}
                  {stravaConnected && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                      <button
                        onClick={() => { void handleImportHistory(); setShowSyncMenu(false) }}
                        disabled={importing || syncing}
                        style={{
                          width: '100%', padding: '8px 11px', borderRadius: 7, border: 'none',
                          background: 'transparent', textAlign: 'left',
                          cursor: importing || syncing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          opacity: importing || syncing ? 0.5 : 1, color: 'var(--text)',
                          fontSize: 12, fontWeight: 500, transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!importing && !syncing) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M12 3v13M7 11l5 5 5-5"/><line x1="4" y1="20" x2="20" y2="20"/>
                        </svg>
                        {importing ? 'Import en cours…' : 'Importer l\'historique Strava'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync message */}
      {syncMsg && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 12,
          background: syncMsg.ok ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${syncMsg.ok ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
          color: syncMsg.ok ? '#22c55e' : '#ef4444',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {syncMsg.text}
          <button onClick={() => setSyncMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16, lineHeight: 1, padding: '0 0 0 8px' }}>
            ×
          </button>
        </div>
      )}

      {/* Import progress */}
      {importProgress && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: importProgress.done && importProgress.error
            ? 'rgba(239,68,68,0.07)'
            : importProgress.done
              ? 'rgba(34,197,94,0.07)'
              : 'rgba(168,85,247,0.07)',
          border: `1px solid ${importProgress.done && importProgress.error
            ? 'rgba(239,68,68,0.22)'
            : importProgress.done
              ? 'rgba(34,197,94,0.22)'
              : 'rgba(168,85,247,0.22)'}`,
        }}>
          {!importProgress.done ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Import Strava en cours…</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: '#a855f7', fontWeight: 700 }}>
                  {importProgress.imported} activités
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 5 }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg,#a855f7,#5b6fff)',
                  transition: 'width 0.5s ease',
                  /* largeur indicative — on ne connaît pas le total */
                  width: `${Math.min(94, 4 + Math.log1p(importProgress.imported) * 12)}%`,
                }} />
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: 0 }}>
                Page {importProgress.page} · {importProgress.skipped} déjà en base
              </p>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: importProgress.error ? '#ef4444' : '#22c55e', fontWeight: 500 }}>
                {importProgress.error
                  ? importProgress.error
                  : `${importProgress.imported} activité${importProgress.imported !== 1 ? 's' : ''} importée${importProgress.imported !== 1 ? 's' : ''} · ${importProgress.skipped} déjà en base`}
              </span>
              <button onClick={() => setImportProgress(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16, lineHeight: 1, padding: '0 0 0 10px' }}>
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Sport tabs ── */}
      <SportTabs
        tabs={YD_SPORTS.map(sp => ({ id: sp.id, label: sp.label, color: sp.color }))}
        value={activeSport}
        onChange={(id) => {
          const sportId = id as YDSportId
          setActiveSport(sportId)
          setEditYear(null)
          setChartMetric(YD_SPORT_METRICS[sportId][0] ?? 'km')
        }}
      />

      {/* ── KPI cards ── */}
      {hasDisplay ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {sportMetrics.map(mk => {
            const m = YD_METRICS[mk]; if (!m) return null
            const val = mode === 'auto'
              ? (displayAuto   ? m.fromAuto(displayAuto)            : 0)
              : (displayManual ? (m.fromManual(displayManual) ?? 0) : 0)
            return (
              <div key={mk} style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 3px' }}>{m.label}</p>
                <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 15, fontWeight: 700, color: sportDef.color, margin: 0 }}>
                  {val > 0 ? m.fmt(val) : <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12 }}>—</span>}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', margin: 0, padding: '10px 0' }}>
            {mode === 'manual'
              ? 'Aucune donnée. Clique sur "+ Saisir" pour ajouter une année.'
              : 'Aucune activité Strava pour ce sport / cette période.'}
          </p>
        </Card>
      )}

      {/* ════ Chart 1 — Volume par sport (mois / semaine) ════ */}
      <Card style={{ position: 'relative' }}>

        {/* ── Controls ── */}
        <div className="yd-reveal" style={{ marginBottom: c1CompareMode ? 8 : 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>
              Volume par sport
            </h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Toggle Mois / Semaine */}
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {(['mois', 'semaine'] as const).map(p => (
                  <button key={p} onClick={() => setChart1Period(p)} style={{
                    padding: '4px 9px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                    background: chart1Period === p ? 'var(--primary)' : 'var(--bg-card2)',
                    color:      chart1Period === p ? '#fff' : 'var(--text-dim)',
                  }}>
                    {p === 'mois' ? 'Mois' : 'Sem.'}
                  </button>
                ))}
              </div>
              {/* Selects année + métrique (cachés en mode Comparer) */}
              {!c1CompareMode && (
                <>
                  <select value={chart1Year} onChange={e => setChart1Year(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                    {c1YearOpts.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                  <select value={chart1Metric} onChange={e => setChart1Metric(e.target.value as 'km' | 'heures' | 'nb_sorties')}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                    <option value="heures">Heures</option>
                    <option value="km">Distance (km)</option>
                    <option value="nb_sorties">Sorties</option>
                  </select>
                </>
              )}
              {/* Bouton Comparer */}
              <button
                onClick={() => {
                  const next = !c1CompareMode
                  setC1CompareMode(next)
                  if (next && isMobile) setC1CompareSheet(true)
                }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: c1CompareMode ? 'none' : '1px solid var(--primary)',
                  background: c1CompareMode ? 'var(--primary)' : 'transparent',
                  color: c1CompareMode ? '#fff' : 'var(--primary)',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                Comparer
              </button>

              {/* Bouton Fonctionnalités — dropdown toggles marqueurs */}
              <div ref={c1FeatRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setC1FeatOpen(v => !v)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: c1FeatOpen ? 'var(--bg-card2)' : 'transparent',
                    color: 'var(--text-dim)',
                    transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  Affichage <span style={{ fontSize: 9, opacity: 0.7 }}>{c1FeatOpen ? '▲' : '▼'}</span>
                </button>
                {c1FeatOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 12px', minWidth: 148,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={c1ShowRaces}
                        onChange={() => setC1ShowRaces(v => !v)}
                        style={{ accentColor: '#ef4444', cursor: 'pointer', width: 14, height: 14 }}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '1.5px solid white', boxShadow: '0 0 0 1px #ef4444', flexShrink: 0 }} />
                        Courses
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={c1ShowBlessures}
                        onChange={() => setC1ShowBlessures(v => !v)}
                        style={{ accentColor: '#ef4444', cursor: 'pointer', width: 14, height: 14 }}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text)' }}>
                        <span style={{ fontSize: 10 }}>⚡</span>
                        Blessures
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Panneau Comparer — desktop inline ── */}
          {c1CompareMode && !isMobile && (
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', marginTop: 10,
              padding: '8px 12px', background: 'var(--bg-card2)', borderRadius: 8, flexWrap: 'wrap',
            }}>
              {/* Sélecteur sport */}
              <select value={c1CompareSport} onChange={e => setC1CompareSport(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                {YD_SPORTS.map(sp => <option key={sp.id} value={sp.id}>{sp.label}</option>)}
              </select>
              {/* Sélecteur métrique */}
              <select value={chart1Metric} onChange={e => setChart1Metric(e.target.value as 'km' | 'heures' | 'nb_sorties')}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                <option value="heures">Heures</option>
                <option value="km">Distance (km)</option>
                <option value="nb_sorties">Sorties</option>
              </select>
              {/* Checkboxes années (max 3) */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Années (max 3)</span>
                {c1YearOpts.map(yr => {
                  const checked = c1CompareYears.includes(yr)
                  const color   = C1_CMP_COLORS[yr] ?? '#9ca3af'
                  return (
                    <label key={yr} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setC1CompareYears(prev =>
                          checked ? prev.filter(y => y !== yr)
                                  : prev.length < 3 ? [...prev, yr] : prev
                        )}
                        style={{ accentColor: color, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{yr}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Contenu chart ── */}
        {(c1CompareMode ? c1CompareYears.length > 0 : c1Sports.length > 0) ? (
          <div style={{ position: 'relative', minHeight: isMobile ? 280 : 'auto' }}>

            {/* ── Tooltip crosshair ancré en haut-droite (hors scroll) ── */}
            {(hoveredPoint !== null || c1HoveredRace || c1HoveredInjury) && (
              <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 10, pointerEvents: 'none',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px', minWidth: 140, maxWidth: 200,
              }}>
                {hoveredPoint !== null && (
                  <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 600, margin: '0 0 5px', color: 'var(--text-mid)' }}>
                    {C1_LABELS[hoveredPoint]}
                  </p>
                )}
                {/* Section compétition */}
                {c1HoveredRace && (
                  <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🏆 Compétition
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px', wordBreak: 'break-word' }}>{c1HoveredRace.title ?? '—'}</p>
                    <p style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)', margin: 0 }}>
                      {fmtDate(c1HoveredRace.started_at)}
                      {c1HoveredRace.distance_m ? ` · ${Math.round(c1HoveredRace.distance_m / 1000)} km` : ''}
                      {c1HoveredRace.moving_time_s ? ` · ${Math.floor(c1HoveredRace.moving_time_s / 3600)}h${String(Math.floor((c1HoveredRace.moving_time_s % 3600) / 60)).padStart(2, '0')}` : ''}
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--primary)', margin: '3px 0 0', fontWeight: 600 }}>Clic → détail activité</p>
                  </div>
                )}
                {/* Section blessure */}
                {c1HoveredInjury && (
                  <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', margin: '0 0 3px' }}>⚡ Blessure</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{c1HoveredInjury.nom}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 2px' }}>{c1HoveredInjury.type}</p>
                    <p style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)', margin: 0 }}>
                      {fmtDate(c1HoveredInjury.date_debut)}
                      {c1HoveredInjury.date_fin ? ` → ${fmtDate(c1HoveredInjury.date_fin)}` : ' (en cours)'}
                    </p>
                    <p style={{ fontSize: 9, color: '#ef4444', margin: '3px 0 0', fontWeight: 600 }}>Clic → blessures</p>
                  </div>
                )}
                {hoveredPoint !== null && (c1CompareMode ? (
                  /* Mode Comparer : ligne par année */
                  c1CompareYears.map(yr => {
                    const v = c1PointVals(c1CompareSport, yr)[hoveredPoint]
                    if (v === 0) return null
                    const color = C1_CMP_COLORS[yr] ?? '#9ca3af'
                    return (
                      <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color }}>{yr}</span>
                        <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', fontWeight: 700, color: 'var(--text-dim)', marginLeft: 4 }}>
                          {c1FmtVal(v)}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  /* Mode normal : ligne par sport */
                  c1Sports.map(sp => {
                    const v = c1PointVals(sp.id)[hoveredPoint]
                    if (v === 0) return null
                    return (
                      <div key={sp.id} style={{ marginBottom: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sp.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: sp.color }}>{sp.label}</span>
                        </span>
                        <div style={{ paddingLeft: 10 }}>
                          <p style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', fontWeight: 700, color: 'var(--text-dim)', margin: '1px 0' }}>
                            {c1FmtVal(v)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ))}
              </div>
            )}

            {/* ── SVG courbes — wrapper scrollable sur mobile en mode Semaine ── */}
            <div style={{
              overflowX: isMobile ? 'auto' : 'visible',
              overflowY: 'visible',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              marginRight: isMobile ? -16 : 0,
              paddingRight: isMobile ? 16 : 0,
            } as React.CSSProperties}>
            <svg
              viewBox={`0 0 ${C1_SVG_W} ${C1_H}`}
              className="perf-chart1-svg"
              style={{
                display: 'block', overflow: 'visible',
                width: (isMobile && chart1Period === 'semaine') ? C1_SVG_W : '100%',
                height: 'auto',
                cursor: (c1HoveredRace || c1HoveredInjury) ? 'pointer' : 'crosshair',
              }}
              onMouseMove={e => {
                const rect  = e.currentTarget.getBoundingClientRect()
                const svgX  = ((e.clientX - rect.left) / rect.width) * C1_SVG_W
                const rawI  = Math.round(((svgX - C1_PL) / c1PlotW) * (C1_N - 1))
                setHoveredPoint(Math.max(0, Math.min(C1_N - 1, rawI)))
                // Détection hover marqueur course (±10px, seulement si visible)
                const nearRace = c1ShowRaces
                  ? c1RaceMarkers.find(m => Math.abs(m.x - svgX) < 10)
                  : undefined
                setC1HoveredRace(nearRace?.race ?? null)
                // Détection hover blessure (seulement si visible)
                const nearInj = c1ShowBlessures
                  ? c1InjuryBands.find(b =>
                      b.isPoint ? Math.abs(b.x1 - svgX) < 10 : svgX >= b.x1 - 4 && svgX <= b.x2 + 4
                    )
                  : undefined
                setC1HoveredInjury(nearInj?.inj ?? null)
              }}
              onMouseLeave={() => {
                setHoveredPoint(null)
                setC1HoveredRace(null)
                setC1HoveredInjury(null)
              }}
              onClick={() => {
                if (c1HoveredRace)   { router.push(`/activities?id=${c1HoveredRace.id}`); return }
                if (c1HoveredInjury) { router.push('/injuries') }
              }}
            >
              {/* Grid */}
              {(() => {
                const ticks = chart1Metric === 'heures'
                  ? Array.from({ length: Math.floor(c1MaxVal / 5) + 1 }, (_, i) => i * 5).filter(v => v <= c1MaxVal + 0.1)
                  : [0, 0.5, 1].map(f => c1MaxVal * f)
                return ticks.map(v => {
                  const y = c1Y(v)
                  return (
                    <g key={v}>
                      <line x1={C1_PL} y1={y} x2={C1_SVG_W - C1_PR} y2={y} stroke="var(--border)" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                      <text x={C1_PL - 3} y={y + 4} textAnchor="end" style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>
                        {chart1Metric === 'heures' ? `${v}h` : `${Math.round(v)}`}
                      </text>
                    </g>
                  )
                })
              })()}

              {/* ── Injury bands (derrière les courbes) ── */}
              {c1ShowBlessures && c1InjuryBands.map((band, idx) =>
                band.isPoint ? (
                  /* Marqueur ponctuel — cercle rouge */
                  <circle key={`inj-pt-${idx}`}
                    cx={band.x1} cy={C1_PT + c1PlotH + 6}
                    r={isMobile ? 3 : 4}
                    fill="#ef4444" stroke="white" strokeWidth={1}
                    style={{ pointerEvents: 'none' }}
                  />
                ) : (
                  /* Bande verticale semi-transparente */
                  <rect key={`inj-band-${idx}`}
                    x={band.x1} y={C1_PT}
                    width={Math.max(2, band.x2 - band.x1)} height={c1PlotH}
                    fill="rgba(239,68,68,0.08)" rx={2}
                    style={{ pointerEvents: 'none' }}
                  />
                )
              )}

              {/* Courbes — mode Comparer */}
              {c1CompareMode && c1CompareYears.map(yr => {
                const color = C1_CMP_COLORS[yr] ?? '#9ca3af'
                const vals  = c1PointVals(c1CompareSport, yr)
                const pts: [number, number][] = vals.map((v, i) => [c1X(i), c1Y(v)] as [number, number])
                return (
                  <g key={yr}>
                    <path d={monotonePath(pts)} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    {vals.map((v, i) => v > 0 && hoveredPoint === i ? (
                      <circle key={i} cx={c1X(i)} cy={c1Y(v)} r={3} fill={color} stroke={color} strokeWidth="1.5" />
                    ) : null)}
                  </g>
                )
              })}

              {/* Courbes — mode normal */}
              {!c1CompareMode && c1Sports.map(sp => {
                const vals  = c1PointVals(sp.id)
                const pts: [number, number][] = vals.map((v, i) => [c1X(i), c1Y(v)] as [number, number])
                return (
                  <g key={sp.id}>
                    <path d={monotonePath(pts)} fill="none" stroke={sp.color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    {vals.map((v, i) => v > 0 ? (
                      <circle key={i}
                        cx={c1X(i)} cy={c1Y(v)}
                        r={hoveredPoint === i ? 3 : 0}
                        fill={sp.color} stroke={sp.color} strokeWidth="1.5"
                        opacity={hoveredPoint === i ? 1 : 0}
                      />
                    ) : null)}
                  </g>
                )
              })}

              {/* ── Race markers — cercles rouges au bas du plot area ── */}
              {c1ShowRaces && c1RaceMarkers.map((marker, idx) => {
                const isH = c1HoveredRace?.id === marker.race.id
                const r   = isMobile ? 3 : 4
                return (
                  <circle key={`race-${idx}`}
                    cx={marker.x} cy={C1_PT + c1PlotH + 6}
                    r={3}
                    fill="#ef4444"
                    opacity={isH ? 1 : 0.75}
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })}

              {/* Crosshair vertical */}
              {hoveredPoint !== null && (
                <line
                  x1={c1X(hoveredPoint)} y1={C1_PT}
                  x2={c1X(hoveredPoint)} y2={C1_PT + c1PlotH}
                  stroke="var(--border)" strokeWidth="1" strokeOpacity="0.6"
                  pointerEvents="none"
                />
              )}

              {/* X labels */}
              {chart1Period === 'mois'
                ? MONTHS.map((m, i) => (
                    <text key={i} x={c1X(i)} y={C1_H - 4} textAnchor="middle"
                      style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>
                      {m}
                    </text>
                  ))
                : Array.from({ length: 52 }, (_, i) => i).filter(i => i % 8 === 0).map(i => (
                    <text key={i} x={c1X(i)} y={C1_H - 4} textAnchor="middle"
                      style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>
                      S{i + 1}
                    </text>
                  ))
              }
            </svg>
            </div>{/* fin scroll wrapper */}

            {/* Légende */}
            <div className="perf-chart1-legend" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {c1CompareMode
                ? c1CompareYears.map(yr => {
                    const color = C1_CMP_COLORS[yr] ?? '#9ca3af'
                    return (
                      <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 14, height: 3, borderRadius: 2, background: color }} />
                        <span style={{ fontSize: 10, color }}>{yr}</span>
                      </div>
                    )
                  })
                : c1Sports.map(sp => (
                    <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 14, height: 3, borderRadius: 2, background: sp.color }} />
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{sp.label}</span>
                    </div>
                  ))
              }
            </div>
          </div>

        ) : c1AnnualSports.length > 0 ? (
          /* Fallback : totaux annuels depuis year_data_manual (pas de détail mensuel) */
          <div style={{ padding: '4px 0' }}>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 12px', fontStyle: 'italic' }}>
              Détail mensuel non disponible — totaux {chart1Year}
            </p>
            {c1AnnualSports.map(sp => {
              const e   = manualMap[sp.id]?.[chart1Year]
              const val = chart1Metric === 'km'
                ? (e?.km ?? 0)
                : chart1Metric === 'heures' ? (e?.heures ?? 0) : (e?.nb_sorties ?? 0)
              const pct = Math.max(4, (val / c1AnnualMax) * 100)
              const fmt = chart1Metric === 'heures'
                ? `${val.toFixed(1)} h`
                : chart1Metric === 'km' ? `${val.toFixed(0)} km` : `${Math.round(val)}`
              return (
                <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 58, textAlign: 'right', flexShrink: 0 }}>{sp.label}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: sp.color, borderRadius: 5, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: sp.color, width: 52, flexShrink: 0, fontWeight: 600 }}>
                    {fmt}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState icon="chart" title="Aucune donnée" description={`Aucune activité enregistrée pour ${chart1Year}.`} />
        )}

        {/* ── Bottom sheet mobile — Mode Comparer ── */}
        {c1CompareMode && isMobile && c1CompareSheet && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              background: 'rgba(0,0,0,0.45)',
            }}
            onClick={() => setC1CompareSheet(false)}
          >
            <div
              style={{
                background: 'var(--bg-card)', borderRadius: '16px 16px 0 0',
                padding: '20px 16px 32px', animation: 'slideUp 0.25s ease',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, margin: 0 }}>Mode Comparer</h4>
                <button onClick={() => setC1CompareSheet(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-dim)', padding: 4 }}>✕</button>
              </div>
              {/* Sport */}
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 4px' }}>Sport</p>
              <select value={c1CompareSport} onChange={e => setC1CompareSport(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, outline: 'none', marginBottom: 12 }}>
                {YD_SPORTS.map(sp => <option key={sp.id} value={sp.id}>{sp.label}</option>)}
              </select>
              {/* Métrique */}
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 4px' }}>Métrique</p>
              <select value={chart1Metric} onChange={e => setChart1Metric(e.target.value as 'km' | 'heures' | 'nb_sorties')}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, outline: 'none', marginBottom: 14 }}>
                <option value="heures">Heures</option>
                <option value="km">Distance (km)</option>
                <option value="nb_sorties">Sorties</option>
              </select>
              {/* Années */}
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 8px' }}>Années à comparer (max 3)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {c1YearOpts.map(yr => {
                  const checked = c1CompareYears.includes(yr)
                  const color   = C1_CMP_COLORS[yr] ?? '#9ca3af'
                  return (
                    <label key={yr} style={{
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      padding: '5px 10px', borderRadius: 20,
                      background: checked ? `${color}22` : 'var(--bg-card2)',
                      border: `1px solid ${checked ? color : 'var(--border)'}`,
                    }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setC1CompareYears(prev =>
                          checked ? prev.filter(y => y !== yr)
                                  : prev.length < 3 ? [...prev, yr] : prev
                        )}
                        style={{ accentColor: color, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{yr}</span>
                    </label>
                  )
                })}
              </div>
              <button
                onClick={() => setC1CompareSheet(false)}
                style={{
                  marginTop: 18, width: '100%', padding: '10px', borderRadius: 8,
                  background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13,
                  border: 'none', cursor: 'pointer',
                }}>
                Appliquer
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ════ Chart 2 — Comparaison inter-années par sport ════ */}
      {(chartVals.some(v => v > 0) || allYears.length > 0) && (
        <Card>
          <div className="yd-reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: 0 }}>
              Comparaison par année — {sportDef.label}
            </h3>
            <select value={validMetric} onChange={e => setChartMetric(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
              {sportMetrics.map(mk => <option key={mk} value={mk}>{YD_METRICS[mk]?.label}</option>)}
            </select>
          </div>
          {(() => {
            const svgH = 150, bPad = 22, tPad = 8, lPad = 42
            const plotW = SVG_W - lPad - 8, plotH = svgH - bPad - tPad
            const n = Math.max(chartYears.length, 1), gap = 5
            const barW = Math.max(12, plotW / n - gap)
            const yMax = maxChartVal * 1.15
            const yStep = Math.pow(10, Math.floor(Math.log10(maxChartVal || 1)))
            const yLabels: number[] = []
            for (let v = 0; v <= yMax && yLabels.length < 5; v += yStep) yLabels.push(v)
            return (
              <div style={{ position: 'relative' }}>
                <svg viewBox={`0 0 ${SVG_W} ${svgH}`} style={{ width: '100%', height: svgH, overflow: 'visible' }}
                  onMouseLeave={() => setHoveredBar(null)}>
                  {yLabels.map(v => {
                    const y = tPad + plotH - (v / yMax) * plotH
                    return (
                      <g key={v}>
                        <line x1={lPad} y1={y} x2={SVG_W - 8} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                        <text x={lPad - 3} y={y + 4} textAnchor="end"
                          style={{ fontSize: 8, fontFamily: 'DM Mono,monospace', fill: 'var(--text-dim)' }}>
                          {metricDef.fmt(v)}
                        </text>
                      </g>
                    )
                  })}
                  <line x1={lPad} y1={tPad + plotH} x2={SVG_W - 8} y2={tPad + plotH} stroke="var(--border)" strokeWidth="1" />
                  {chartYears.map((yr, i) => {
                    const val = chartVals[i], bh = Math.max(0, (val / yMax) * plotH)
                    const bx = lPad + i * (barW + gap) + gap / 2, by = tPad + plotH - bh
                    const cx = bx + barW / 2
                    const col = SPORT_DS_COLOR[activeSport] ?? YEAR_DEFAULT_COLOR
                    const sel = selectedYear === yr, hov = hoveredBar?.year === yr
                    return (
                      <g key={yr} style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredBar({ year: yr, val, svgX: cx })}
                        onClick={() => setSelectedYear(yr)}>
                        <rect
                          x={bx} y={by} width={barW} height={bh} rx={4}
                          fill={col} opacity={hov || sel ? 1.0 : 0.75}
                          className="yd-bar"
                          style={{ animation: `ydBarEnter 400ms ease-out ${i * 30}ms both` }}
                        />
                        {sel && <rect x={bx - 1} y={by - 1} width={barW + 2} height={bh + 1} rx={4} fill="none" stroke={col} strokeWidth="1.5" />}
                        {(!isMobile || barW >= 18) && (
                          <text x={cx} y={svgH - 5} textAnchor="middle"
                            style={{ fontSize: isMobile ? 8 : 9, fontFamily: 'DM Mono,monospace', fill: sel ? col : 'var(--text-dim)', fontWeight: sel ? '700' : '400' }}>
                            {yr.slice(2)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
                {hoveredBar && (
                  <div style={{
                    position: 'absolute', top: 4, pointerEvents: 'none', zIndex: 10,
                    left:  hoveredBar.svgX < SVG_W / 2 ? `calc(${(hoveredBar.svgX / SVG_W * 100).toFixed(1)}% + 10px)` : undefined,
                    right: hoveredBar.svgX >= SVG_W / 2 ? `calc(${((SVG_W - hoveredBar.svgX) / SVG_W * 100).toFixed(1)}% + 10px)` : undefined,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', whiteSpace: 'nowrap',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 2px', color: SPORT_DS_COLOR[activeSport] ?? YEAR_DEFAULT_COLOR }}>{hoveredBar.year}</p>
                    <p style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', margin: 0 }}>
                      {metricDef.label}: <strong>{metricDef.fmt(hoveredBar.val)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )
          })()}
        </Card>
      )}

      {/* ════ Chart 3 — Volume global toutes disciplines ════ */}
      {hasC3Data && (
        <Card>
          <h3 className="yd-reveal" style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>
            Volume global — Toutes disciplines
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              { key: 'heures'     as const, label: 'Heures',        color: '#00c8e0', max: Math.max(1, ...c3Stats.map(s => s.heures)),     fmt: (v: number) => `${v.toFixed(0)}h`  },
              { key: 'nb_sorties' as const, label: 'Sorties',       color: '#f97316', max: Math.max(1, ...c3Stats.map(s => s.nb_sorties)), fmt: (v: number) => `${v}`              },
              { key: 'km'         as const, label: 'Distance (km)', color: '#3b82f6', max: Math.max(1, ...c3Stats.map(s => s.km)),         fmt: (v: number) => `${v}km`             },
            ]).map(({ key, label, color, max, fmt }) => (
              <div key={key}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  {label}
                </p>
                <svg viewBox={`0 0 ${SVG_W} ${C3_H}`} style={{ width: '100%', height: C3_H, overflow: 'visible' }}>
                  <line x1={C3_PL} y1={C3_PT + c3PlotH} x2={SVG_W - C3_PR} y2={C3_PT + c3PlotH} stroke="var(--border)" strokeWidth="1" />
                  <text x={C3_PL - 3} y={C3_PT + 5} textAnchor="end"
                    style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>
                    {fmt(max)}
                  </text>
                  {c3Stats.map((s, i) => {
                    const val = s[key]
                    const bh  = Math.max(0, (val / max) * c3PlotH)
                    const bx  = C3_PL + i * (c3BarW + c3Gap) + c3Gap / 2
                    const by  = C3_PT + c3PlotH - bh
                    const cx  = bx + c3BarW / 2
                    return (
                      <g key={s.year}>
                        <rect
                          x={bx} y={by} width={c3BarW} height={bh} rx={4}
                          fill={color} opacity={0.75}
                          className="yd-bar"
                          style={{ animation: `ydBarEnter 400ms ease-out ${i * 30}ms both` }}
                        />
                        {bh > 24 && (
                          <text x={cx} y={by + bh / 2 + 4} textAnchor="middle"
                            style={{ fontSize: 10, fill: '#fff', fontFamily: 'DM Mono,monospace', fontWeight: '700' }}>
                            {fmt(val)}
                          </text>
                        )}
                        <text x={cx} y={C3_H - 3} textAnchor="middle"
                          style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>
                          {s.year.slice(2)}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Manual entry list ── */}
      {mode === 'manual' && (
        <Card>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>
            {sportDef.label} — Saisie manuelle
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {manualListYrs.map(yr => {
              const entry = manualEntry(yr), isEditing = editYear === yr
              const col   = YEAR_COLORS[yr] ?? YEAR_DEFAULT_COLOR

              if (isEditing) {
                return (
                  <div key={yr} style={{ border: `1.5px solid ${col}50`, borderRadius: 10, padding: 14, background: 'var(--bg-card2)' }}>
                    <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 700, color: col, margin: '0 0 10px' }}>{yr}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {sportMetrics.map(mk => {
                        const m = YD_METRICS[mk]; if (!m) return null
                        const rawVal = editDraft[m.manualKey]
                        const strVal = typeof rawVal === 'number' ? String(rawVal) : ''
                        return (
                          <div key={mk}>
                            <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>{m.label}</label>
                            <input type="number" step={m.step} min="0" value={strVal}
                              onChange={e => setEditDraft(p => ({
                                ...p,
                                [m.manualKey]: e.target.value === '' ? null : parseFloat(e.target.value),
                              }))}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { void saveManual(yr) }} disabled={saving}
                        style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? '…' : 'Confirmer'}
                      </button>
                      <button onClick={() => { setEditYear(null); setEditDraft({}) }}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-card2)' }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: col, minWidth: 36 }}>{yr}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {entry
                      ? sportMetrics.slice(0, 3).map(mk => {
                          const m = YD_METRICS[mk]!; const v = m.fromManual(entry)
                          return v != null && v > 0 ? (
                            <span key={mk} style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>{m.label} </span>
                              <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{m.fmt(v)}</span>
                            </span>
                          ) : null
                        })
                      : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Aucune donnée</span>}
                  </div>
                  <button onClick={() => startEdit(yr)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                    {entry ? 'Modifier' : '+ Saisir'}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Auto empty state ── */}
      {mode === 'auto' && allYears.length === 0 && (
        <Card>
          <EmptyState
            icon="activity"
            title="Aucune activité"
            description="Synchronise Strava ou importe ton historique pour voir tes données annuelles."
          />
        </Card>
      )}

    </div>
  )
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function DatasTab({ onSelect, selectedDatum, profile, onOpenAI }: Props) {
  type SubTab = 'zones' | 'records' | 'yeardata'
  const [subTab, setSubTab] = useState<SubTab>('zones')

  const SUB_TABS: { id: SubTab; label: string; color: string; bg: string }[] = [
    { id: 'zones',    label: 'Zones',      color: '#00c8e0', bg: 'rgba(0,200,224,0.10)' },
    { id: 'records',  label: 'Records',    color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
    { id: 'yeardata', label: 'Year Datas', color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 12, border: '1px solid', cursor: 'pointer',
            borderColor: subTab === t.id ? t.color : 'var(--border)',
            background: subTab === t.id ? t.bg : 'var(--bg-card)',
            color: subTab === t.id ? t.color : 'var(--text-mid)',
            fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: subTab === t.id ? 700 : 400,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'zones'    && <ZonesSubTab profile={profile} onSelect={onSelect} selectedDatum={selectedDatum} onOpenAI={onOpenAI} />}
      {subTab === 'records'  && <RecordsSubTab onSelect={onSelect} selectedDatum={selectedDatum} profile={profile} />}
      {subTab === 'yeardata' && <YearDatasSubTab />}
    </div>
  )
}
