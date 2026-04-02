'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════
type SportType     = 'run' | 'trail_run' | 'bike' | 'virtual_bike' | 'swim' | 'rowing' | 'hyrox' | 'gym' | 'other'
type ActivityStatus = 'imported' | 'completed' | 'validated'
type FilterSport   = 'all' | SportType
type FilterStatus  = 'all' | ActivityStatus
type FilterType    = 'all' | 'training' | 'competition'
type DetailTab     = 'summary' | 'charts' | 'intervals' | 'records' | 'enrich'

interface Zone { label: string; color: string; min: number; max: number }
interface TrainingZones { hr: Zone[]; pace: Zone[]; power: Zone[] }

interface IntervalBlock {
  index:     number
  label:     string
  startS:    number
  durationS: number
  avgHr:     number
  avgPace:   number   // s/km
  avgWatts:  number
  distance:  number   // m
}

interface PRRecord {
  label:  string
  value:  string
  unit:   string
  isNew:  boolean
}

interface PlannedVsActual {
  plannedTitle:    string
  plannedDurationMin: number
  actualDurationMin:  number
  matchPct:        number
  status:          'respected' | 'modified' | 'missed'
}

interface HyroxStation {
  name:       string
  time?:      string
  distance?:  number
  weight?:    number
  reps?:      number
}

interface GymSet   { reps: number; weight: number }
interface GymExercise {
  id:       string
  name:     string
  category: 'upper' | 'lower' | 'cardio' | 'other'
  sets:     GymSet[]
  cardioTime?:    string
  cardioDistance?:number
  cardioWatts?:   number
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
  // enrichment
  gymExercises?:  GymExercise[]
  hyroxStations?: HyroxStation[]
  hyroxRuns?:     string[]
  userNotes?:     string
  feeling?:       number
}

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════
const SPORT_LABEL: Record<SportType, string> = {
  run:'Running', trail_run:'Trail', bike:'Cyclisme', virtual_bike:'Home Trainer',
  swim:'Natation', rowing:'Aviron', hyrox:'Hyrox', gym:'Musculation', other:'Autre'
}
const SPORT_EMOJI: Record<SportType, string> = {
  run:'🏃', trail_run:'🏔', bike:'🚴', virtual_bike:'🚴', swim:'🏊',
  rowing:'🚣', hyrox:'🏋️', gym:'💪', other:'⚡'
}
const SPORT_COLOR: Record<SportType, string> = {
  run:'#22c55e', trail_run:'#f97316', bike:'#3b82f6', virtual_bike:'#3b82f6',
  swim:'#38bdf8', rowing:'#14b8a6', hyrox:'#ef4444', gym:'#ffb340', other:'#9ca3af'
}
const SPORT_BG: Record<SportType, string> = {
  run:'rgba(34,197,94,0.10)', trail_run:'rgba(249,115,22,0.10)', bike:'rgba(59,130,246,0.10)',
  virtual_bike:'rgba(59,130,246,0.10)', swim:'rgba(56,189,248,0.10)', rowing:'rgba(20,184,166,0.10)',
  hyrox:'rgba(239,68,68,0.10)', gym:'rgba(255,179,64,0.10)', other:'rgba(156,163,175,0.10)'
}
const PROVIDER_LABEL: Record<string, string> = {
  manual:'Manuel', strava:'Strava', wahoo:'Wahoo', polar:'Polar',
  garmin:'Garmin', withings:'Withings', fitbit:'Fitbit'
}
const STATUS_CFG = {
  imported:  { label:'Importée',  color:'#9ca3af', bg:'rgba(156,163,175,0.10)' },
  completed: { label:'Complétée', color:'#ffb340', bg:'rgba(255,179,64,0.10)'  },
  validated: { label:'Validée',   color:'#22c55e', bg:'rgba(34,197,94,0.10)'   },
}
const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const ZONE_LABELS = ['Z1 Récup','Z2 Aérobie','Z3 Tempo','Z4 Seuil','Z5 VO2max']

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmer Carry','Sandbag Lunges','Wall Balls']
const GYM_UPPER  = ['Développé couché','Développé incliné','Tractions','Rowing barre','Curl biceps','Extension triceps','Élévations latérales','Pompes','Dips','Autre']
const GYM_LOWER  = ['Squat','Leg press','Fentes','Romanian deadlift','Hip thrust','Leg curl','Leg extension','Mollets','Sumo deadlift','Autre']
const GYM_CARDIO = ['SkiErg','Rameur','Vélo','Vélo elliptique','Stairs','Corde à sauter','Autre']
const GYM_OTHER  = ['Étirements','Mobilité','Gainage','Yoga','Pilates','Autre']

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

function formatPace(s_km: number): string {
  if (!s_km || s_km <= 0) return '—'
  const m = Math.floor(s_km / 60)
  const s = Math.round(s_km % 60)
  return `${m}:${String(s).padStart(2,'0')}/km`
}

function formatDist(m: number | null): string {
  if (!m || m <= 0) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`
  return `${Math.round(m)} m`
}

function calcPaceFromTimeAndDist(timeStr: string, distM: number): string {
  if (!timeStr || !distM) return '—'
  const parts = timeStr.split(':').map(Number)
  let totalS = 0
  if (parts.length === 2) totalS = parts[0]*60 + parts[1]
  else if (parts.length === 3) totalS = parts[0]*3600 + parts[1]*60 + parts[2]
  if (!totalS) return '—'
  const s_km = totalS / (distM / 1000)
  return `${Math.floor(s_km/60)}:${String(Math.round(s_km%60)).padStart(2,'0')}/km`
}

function defaultZones(): TrainingZones {
  return {
    hr: [
      { label:'Z1', color:'#9ca3af', min:0,   max:130 },
      { label:'Z2', color:'#22c55e', min:130, max:150 },
      { label:'Z3', color:'#eab308', min:150, max:165 },
      { label:'Z4', color:'#f97316', min:165, max:178 },
      { label:'Z5', color:'#ef4444', min:178, max:999 },
    ],
    pace: [
      { label:'Z1', color:'#9ca3af', min:330, max:999 },
      { label:'Z2', color:'#22c55e', min:280, max:330 },
      { label:'Z3', color:'#eab308', min:255, max:280 },
      { label:'Z4', color:'#f97316', min:230, max:255 },
      { label:'Z5', color:'#ef4444', min:0,   max:230 },
    ],
    power: [
      { label:'Z1', color:'#9ca3af', min:0,   max:166 },
      { label:'Z2', color:'#22c55e', min:166, max:226 },
      { label:'Z3', color:'#eab308', min:226, max:262 },
      { label:'Z4', color:'#f97316', min:262, max:316 },
      { label:'Z5', color:'#ef4444', min:316, max:999 },
    ],
  }
}

function getZoneIdx(value: number, zones: Zone[]): number {
  for (let i = 0; i < zones.length; i++) {
    if (value >= zones[i].min && value < zones[i].max) return i
  }
  return zones.length - 1
}

// Auto-analysis text
function generateAnalysis(a: Activity): string[] {
  const lines: string[] = []
  const dur   = (a.moving_time_s ?? 0) / 60
  const hr    = a.avg_hr ?? 0
  const sport = a.sport
  const isBike = sport === 'bike' || sport === 'virtual_bike'
  const isRun  = sport === 'run' || sport === 'trail_run'

  if (isBike && a.avg_watts && a.normalized_watts) {
    const vi = a.normalized_watts / a.avg_watts
    if (vi < 1.05)       lines.push('⚡ Effort très régulier — excellente maîtrise de l\'intensité.')
    else if (vi < 1.12)  lines.push('📊 Effort globalement régulier — quelques variations.')
    else                 lines.push('⚠️ Forte variabilité de puissance — effort irrégulier.')
    if (a.tss) {
      if (a.tss > 150)   lines.push(`🔴 Charge très élevée (${Math.round(a.tss)} TSS) — récupération 48h+ recommandée.`)
      else if (a.tss > 80) lines.push(`💪 Charge significative (${Math.round(a.tss)} TSS) — récupération 24h.`)
      else               lines.push(`✅ Charge légère (${Math.round(a.tss)} TSS) — récupération rapide.`)
    }
  }

  if (isRun && a.avg_pace_s_km) {
    if (hr > 0 && hr < 148)      lines.push('✅ Effort en endurance fondamentale — FC bien contrôlée.')
    else if (hr > 0 && hr < 163) lines.push('📈 Intensité tempo — bonne tenue de l\'allure.')
    else if (hr > 0)             lines.push('🔴 Séance à haute intensité — surveillance de la fatigue.')
  }

  if (dur > 120) lines.push('⏱ Longue durée — hydratation et nutrition à soigner post-séance.')
  if ((a.elevation_gain_m ?? 0) > 600) lines.push(`⛰ Dénivelé important (${Math.round(a.elevation_gain_m!)}m) — impact musculaire excentrique.`)
  if (sport === 'swim' && a.distance_m) lines.push(`🏊 ${formatDist(a.distance_m)} en ${formatDuration(a.moving_time_s ?? 0)} — allure moy. ${a.avg_pace_s_km ? formatPace(a.avg_pace_s_km/10) + '/100m' : '—'}.`)

  if (lines.length === 0) lines.push('✅ Séance enregistrée — données disponibles pour l\'analyse.')
  return lines.slice(0, 4)
}

// Interval detection (from laps data)
function detectIntervals(a: Activity): IntervalBlock[] {
  const laps = a.raw_data?.laps as any[] | undefined
  if (!laps || laps.length < 2) return []
  return laps.map((lap: any, i: number): IntervalBlock => ({
    index:     i + 1,
    label:     lap.name ?? `Lap ${i + 1}`,
    startS:    lap.start_index ?? i * 300,
    durationS: lap.elapsed_time ?? lap.moving_time ?? 300,
    avgHr:     lap.average_heartrate ?? 0,
    avgPace:   lap.average_speed ? Math.round(1000 / lap.average_speed) : 0,
    avgWatts:  lap.average_watts ?? 0,
    distance:  lap.distance ?? 0,
  }))
}

// Record detection
const POWER_DURATIONS = [300, 600, 1200, 3600]
const RUN_DIST_M      = [1000, 5000, 10000, 21097, 42195]
const RUN_DIST_LABELS: Record<number, string> = { 1000:'1 km', 5000:'5 km', 10000:'10 km', 21097:'Semi', 42195:'Marathon' }

function detectRecords(a: Activity): PRRecord[] {
  const records: PRRecord[] = []
  const isBike = a.sport === 'bike' || a.sport === 'virtual_bike'
  const isRun  = a.sport === 'run' || a.sport === 'trail_run'

  if (isBike && a.avg_watts && a.moving_time_s) {
    POWER_DURATIONS.forEach(d => {
      if ((a.moving_time_s ?? 0) >= d * 0.85) {
        const label = d < 3600 ? `Best ${d/60}min` : `Best 1h`
        const estimated = Math.round(a.avg_watts! * (1 + 0.05 * (d / (a.moving_time_s ?? d))))
        if (estimated > 150) records.push({ label, value: `${estimated}`, unit:'W', isNew: Math.random() > 0.75 })
      }
    })
  }

  if (isRun && a.distance_m && a.avg_pace_s_km) {
    RUN_DIST_M.forEach(d => {
      if ((a.distance_m ?? 0) >= d * 0.9) {
        records.push({ label: RUN_DIST_LABELS[d] ?? `${d/1000}km`, value: formatPace(a.avg_pace_s_km!), unit:'', isNew: Math.random() > 0.8 })
      }
    })
  }
  return records
}

// Compare planned vs actual
function comparePlannedActual(a: Activity, plannedSessions: any[]): PlannedVsActual | null {
  if (!plannedSessions.length || !a.started_at) return null
  const date = a.started_at.split('T')[0]
  const match = plannedSessions.find(s => {
    const d = new Date(s.week_start ?? '')
    return s.sport === a.sport
  })
  if (!match) return null
  const planned = match.duration_min * 60
  const actual  = a.moving_time_s ?? 0
  const pct = planned > 0 ? Math.round((actual / planned) * 100) : 100
  return {
    plannedTitle:       match.title,
    plannedDurationMin: match.duration_min,
    actualDurationMin:  Math.round((a.moving_time_s ?? 0) / 60),
    matchPct:           pct,
    status:             pct >= 85 ? 'respected' : pct >= 50 ? 'modified' : 'missed',
  }
}

// ══════════════════════════════════════════════════════════
// SUPABASE HOOK
// ══════════════════════════════════════════════════════════
const PAGE_SIZE = 20

function useActivities() {
  const supabase = createClient()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)

  interface LoadFilters { sport?: string; isRace?: boolean; search?: string }

  const load = useCallback(async (p = 0, filters?: LoadFilters) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    let q = supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

    if (filters?.sport && filters.sport !== 'all') q = q.eq('sport_type', filters.sport)
    if (filters?.isRace !== undefined) q = q.eq('is_race', filters.isRace)

    const { data, count, error } = await q
    if (error) { setLoading(false); return }

    const mapped: Activity[] = (data ?? []).map((r: any): Activity => ({
      id:               r.id,
      sport:            (r.sport_type as SportType) ?? 'other',
      title:            r.title ?? SPORT_LABEL[(r.sport_type as SportType)] ?? 'Activité',
      started_at:       r.started_at,
      distance_m:       r.distance_m,
      moving_time_s:    r.moving_time_s,
      elapsed_time_s:   r.elapsed_time_s,
      elevation_gain_m: r.elevation_gain_m,
      avg_speed_ms:     r.avg_speed_ms,
      avg_pace_s_km:    r.avg_pace_s_km,
      avg_hr:           r.avg_hr,
      max_hr:           r.max_hr,
      avg_watts:        r.avg_watts,
      normalized_watts: r.normalized_watts,
      avg_cadence:      r.avg_cadence,
      calories:         r.calories,
      tss:              r.tss,
      rpe:              r.rpe,
      is_race:          r.is_race ?? false,
      trainer:          r.trainer ?? false,
      provider:         r.provider ?? 'manual',
      status:           (r.status as ActivityStatus) ?? 'imported',
      notes:            r.notes,
      raw_data:         r.raw_data ?? {},
      gymExercises:     r.raw_data?.gymExercises,
      hyroxStations:    r.raw_data?.hyroxStations,
      hyroxRuns:        r.raw_data?.hyroxRuns,
      userNotes:        r.notes,
      feeling:          r.rpe,
    }))

    if (p === 0) setActivities(mapped)
    else setActivities(prev => [...prev, ...mapped])
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateActivity(id: string, updates: Partial<Activity>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const current = activities.find(a => a.id === id)
    if (!current) return
    await supabase.from('activities').update({
      notes:      updates.userNotes ?? null,
      rpe:        updates.feeling ?? null,
      status:     updates.status ?? current.status,
      raw_data:   updates.raw_data ?? current.raw_data,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  return { activities, loading, total, page, load, updateActivity }
}

// ══════════════════════════════════════════════════════════
// SMALL UI ATOMS
// ══════════════════════════════════════════════════════════
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'16px', boxShadow:'var(--shadow-card)', marginBottom:12, ...style }}>
      {children}
    </div>
  )
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.1em', color:'var(--text-dim)', margin:'0 0 10px' }}>
      {children}
    </p>
  )
}

function KpiChip({ label, value, color, sub }: { label:string; value:string; color?:string; sub?:string }) {
  return (
    <div style={{ padding:'9px 11px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
      <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>{label}</p>
      <p style={{ fontFamily:'DM Mono,monospace', fontSize:15, fontWeight:700, color:color ?? 'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{value}</p>
      {sub && <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SVG CHARTS
// ══════════════════════════════════════════════════════════

// Zone bar
function ZoneBar({ labels, times, colors }: { labels:string[]; times:number[]; colors:string[] }) {
  const total = times.reduce((a, b) => a + b, 0)
  if (!total) return <p style={{ fontSize:11, color:'var(--text-dim)' }}>Données zones non disponibles</p>
  return (
    <div>
      <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden', gap:1, marginBottom:8 }}>
        {times.map((t, i) => {
          const pct = (t / total) * 100
          if (pct < 1) return null
          return <div key={i} style={{ width:`${pct}%`, background:colors[i], borderRadius:2 }}/>
        })}
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const }}>
        {times.map((t, i) => {
          const pct = Math.round((t / total) * 100)
          if (pct < 1) return null
          const mins = Math.round(t)
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:colors[i] }}/>
              <span style={{ fontSize:10, color:'var(--text-mid)', fontFamily:'DM Mono,monospace' }}>{labels[i]} {pct}% · {mins}min</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Sparkline with zone coloring + interactive selection
interface SparklineProps {
  data:        number[]
  zones?:      Zone[]
  color:       string
  height?:     number
  label?:      string
  unit?:       string
  selection?:  [number, number] | null
  onSelect?:   (range: [number, number] | null) => void
}

function Sparkline({ data, zones, color, height=64, label, unit, selection, onSelect }: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number>(0)
  const [hover, setHover] = useState<number|null>(null)

  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 400, H = height

  function xToIdx(clientX: number): number {
    if (!svgRef.current) return 0
    const rect = svgRef.current.getBoundingClientRect()
    const pct = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(data.length - 1, Math.round(pct * (data.length - 1))))
  }

  function ptY(v: number) { return H - ((v - min) / range) * (H - 12) - 6 }
  function ptX(i: number) { return (i / (data.length - 1)) * W }

  // Build colored segments if zones provided
  const segments: { d: string; color: string }[] = []
  if (zones) {
    let segStart = 0
    let segColor = color
    for (let i = 1; i <= data.length; i++) {
      const prevZone = getZoneIdx(data[i-1] ?? data[i-2] ?? min, zones)
      const currZone = i < data.length ? getZoneIdx(data[i], zones) : -1
      if (i === data.length || prevZone !== currZone) {
        const pts = data.slice(segStart, i).map((v, j) =>
          `${j===0?'M':'L'}${ptX(segStart+j).toFixed(1)},${ptY(v).toFixed(1)}`
        ).join(' ')
        segments.push({ d: pts, color: zones[prevZone]?.color ?? color })
        segStart = i
        segColor = i < data.length ? (zones[currZone]?.color ?? color) : color
      }
    }
  } else {
    const pts = data.map((v, i) => `${i===0?'M':'L'}${ptX(i).toFixed(1)},${ptY(v).toFixed(1)}`).join(' ')
    segments.push({ d: pts, color })
  }

  const fillPts = data.map((v, i) => `${i===0?'M':'L'}${ptX(i).toFixed(1)},${ptY(v).toFixed(1)}`).join(' ')
  const fillPath = fillPts + ` L${W},${H} L0,${H} Z`

  const selX1 = selection ? (selection[0] / (data.length-1)) * W : null
  const selX2 = selection ? (selection[1] / (data.length-1)) * W : null

  return (
    <div>
      {label && (
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>{label}</span>
          {hover !== null && <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700, color }}>{Math.round(data[hover])}{unit}</span>}
        </div>
      )}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height, display:'block', cursor: onSelect ? 'crosshair' : 'default', userSelect:'none' }}
        preserveAspectRatio="none"
        onMouseMove={e => {
          const idx = xToIdx(e.clientX)
          setHover(idx)
          if (dragging && onSelect) {
            const a = Math.min(dragStart, idx)
            const b = Math.max(dragStart, idx)
            onSelect([a, b])
          }
        }}
        onMouseLeave={() => { setHover(null); if (dragging) setDragging(false) }}
        onMouseDown={e => {
          if (!onSelect) return
          const idx = xToIdx(e.clientX)
          setDragStart(idx)
          setDragging(true)
          onSelect(null)
        }}
        onMouseUp={() => setDragging(false)}
      >
        <defs>
          <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#g${color.replace('#','')})`}/>
        {segments.map((seg, i) => (
          <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
        ))}
        {/* Selection overlay */}
        {selX1 !== null && selX2 !== null && (
          <rect x={selX1} y={0} width={selX2-selX1} height={H} fill="rgba(0,200,224,0.12)" stroke="#00c8e0" strokeWidth="1" opacity="0.8"/>
        )}
        {/* Hover line */}
        {hover !== null && (
          <>
            <line x1={ptX(hover)} y1={0} x2={ptX(hover)} y2={H} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
            <circle cx={ptX(hover)} cy={ptY(data[hover])} r="3" fill={color} stroke="var(--bg-card)" strokeWidth="1.5"/>
          </>
        )}
      </svg>
    </div>
  )
}

// Elevation Profile
function ElevationProfile({ data, selection, onSelect }: { data:number[]; selection:[number,number]|null; onSelect:(r:[number,number]|null)=>void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)

  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const W = 400, H = 72

  function xToIdx(cx: number) {
    if (!svgRef.current) return 0
    const rect = svgRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(data.length-1, Math.round(((cx-rect.left)/rect.width)*(data.length-1))))
  }
  function ptY(v: number) { return H - ((v-min)/range)*(H-10)-5 }
  function ptX(i: number) { return (i/(data.length-1))*W }

  const d   = data.map((v,i) => `${i===0?'M':'L'}${ptX(i).toFixed(1)},${ptY(v).toFixed(1)}`).join(' ')
  const fill = d + ` L${W},${H} L0,${H} Z`
  const selX1 = selection ? (selection[0]/(data.length-1))*W : null
  const selX2 = selection ? (selection[1]/(data.length-1))*W : null

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>Profil altimétrique</span>
        <span style={{ fontSize:10, color:'var(--text-dim)' }}>{Math.round(min)}m → {Math.round(max)}m</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, display:'block', cursor:'crosshair', userSelect:'none' }}
        preserveAspectRatio="none"
        onMouseDown={e => { setDragStart(xToIdx(e.clientX)); setDragging(true); onSelect(null) }}
        onMouseMove={e => { if (dragging) { const a=Math.min(dragStart,xToIdx(e.clientX)),b=Math.max(dragStart,xToIdx(e.clientX)); onSelect([a,b]) } }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <defs>
          <linearGradient id="elevG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05"/>
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#elevG)"/>
        <path d={d}    fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round"/>
        {selX1 !== null && selX2 !== null && (
          <rect x={selX1} y={0} width={selX2-selX1} height={H} fill="rgba(0,200,224,0.15)" stroke="#00c8e0" strokeWidth="1"/>
        )}
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// INTERVALS CHART
// ══════════════════════════════════════════════════════════
function IntervalsChart({ intervals, sport }: { intervals:IntervalBlock[]; sport:SportType }) {
  const [sel, setSel] = useState<number|null>(null)
  if (!intervals.length) return <p style={{ fontSize:12, color:'var(--text-dim)', textAlign:'center' as const, padding:'16px 0' }}>Aucun intervalle détecté dans cette activité.</p>

  const isBike = sport==='bike'||sport==='virtual_bike'
  const maxHr  = Math.max(...intervals.map(i => i.avgHr), 1)
  const maxVal = isBike ? Math.max(...intervals.map(i => i.avgWatts), 1) : maxHr

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80, marginBottom:8 }}>
        {intervals.map((iv, i) => {
          const val  = isBike ? iv.avgWatts : iv.avgHr
          const pct  = (val / maxVal) * 100
          const zIdx = iv.avgHr > 175 ? 4 : iv.avgHr > 162 ? 3 : iv.avgHr > 148 ? 2 : iv.avgHr > 132 ? 1 : 0
          return (
            <div key={i} onClick={() => setSel(sel===i ? null : i)} title={iv.label}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer', gap:0, height:'100%', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', height:`${Math.max(pct,4)}%`, background:ZONE_COLORS[zIdx], borderRadius:'3px 3px 0 0', opacity:sel===null||sel===i?1:0.35, transition:'opacity 0.15s', minHeight:3 }}/>
            </div>
          )
        })}
      </div>

      {sel !== null && intervals[sel] && (() => {
        const iv = intervals[sel]
        return (
          <div style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg-card2)', border:`1px solid ${ZONE_COLORS[3]}33`, marginTop:4 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>{iv.label}</p>
              <button onClick={() => setSel(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
              <div><p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Durée</p><p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{formatDuration(iv.durationS)}</p></div>
              {iv.avgHr > 0 && <div><p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>FC moy.</p><p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#ef4444', margin:0 }}>{Math.round(iv.avgHr)}<span style={{ fontSize:10, fontWeight:400 }}> bpm</span></p></div>}
              {isBike && iv.avgWatts > 0 && <div><p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Puissance</p><p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#3b82f6', margin:0 }}>{Math.round(iv.avgWatts)}<span style={{ fontSize:10, fontWeight:400 }}> W</span></p></div>}
              {!isBike && iv.avgPace > 0 && <div><p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Allure</p><p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#22c55e', margin:0 }}>{formatPace(iv.avgPace)}</p></div>}
              {iv.distance > 0 && <div><p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Distance</p><p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{formatDist(iv.distance)}</p></div>}
            </div>
          </div>
        )
      })()}

      <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:12 }}>
        {intervals.map((iv, i) => (
          <div key={i} onClick={() => setSel(sel===i ? null : i)}
            style={{ display:'grid', gridTemplateColumns:'28px 1fr repeat(3,auto)', gap:8, alignItems:'center', padding:'8px 12px', borderRadius:9, background:'var(--bg-card2)', border:`1px solid ${sel===i?ZONE_COLORS[3]+'55':'var(--border)'}`, cursor:'pointer', transition:'border 0.15s' }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700, color:'var(--text-dim)', textAlign:'center' as const }}>{iv.index}</span>
            <span style={{ fontSize:11, color:'var(--text-mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{iv.label}</span>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text)' }}>{formatDuration(iv.durationS)}</span>
            {iv.avgHr > 0 && <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#ef4444', fontWeight:600 }}>{Math.round(iv.avgHr)}</span>}
            {isBike && iv.avgWatts > 0 ? <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#3b82f6', fontWeight:600 }}>{Math.round(iv.avgWatts)}W</span>
            : iv.avgPace > 0 ? <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#22c55e', fontWeight:600 }}>{formatPace(iv.avgPace)}</span>
            : <span/>}
          </div>
        ))}
      </div>
      <p style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center' as const, marginTop:8 }}>Cliquez sur un bloc pour voir les détails</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GYM ENRICHMENT
// ══════════════════════════════════════════════════════════
function GymEnrichment({ exercises, onChange }: { exercises:GymExercise[]; onChange:(e:GymExercise[])=>void }) {
  const [section, setSection] = useState<'upper'|'lower'|'cardio'|'other'>('upper')
  const sections = [
    { id:'upper' as const,  label:'Haut du corps',  list:GYM_UPPER  },
    { id:'lower' as const,  label:'Bas du corps',   list:GYM_LOWER  },
    { id:'cardio' as const, label:'Cardio',          list:GYM_CARDIO },
    { id:'other' as const,  label:'Autre',           list:GYM_OTHER  },
  ]
  const current = sections.find(s => s.id===section)!

  function add(name: string) {
    onChange([...exercises, { id:uid(), name, category:section, sets:[{reps:0,weight:0}] }])
  }
  function addSet(id: string) {
    onChange(exercises.map(e => e.id===id ? { ...e, sets:[...e.sets,{reps:0,weight:0}] } : e))
  }
  function dupSet(id: string, si: number) {
    onChange(exercises.map(e => e.id===id ? { ...e, sets:[...e.sets.slice(0,si+1),{...e.sets[si]},...e.sets.slice(si+1)] } : e))
  }
  function updSet(id: string, si: number, field: 'reps'|'weight', val: number) {
    onChange(exercises.map(e => e.id===id ? { ...e, sets:e.sets.map((s,i)=>i===si?{...s,[field]:val}:s) } : e))
  }
  function delSet(id: string, si: number) {
    onChange(exercises.map(e => e.id===id ? { ...e, sets:e.sets.filter((_,i)=>i!==si) } : e))
  }
  function del(id: string) { onChange(exercises.filter(e => e.id!==id)) }
  function updCardio(id: string, patch: Partial<GymExercise>) {
    onChange(exercises.map(e => e.id===id ? { ...e, ...patch } : e))
  }

  const filtered = exercises.filter(e => e.category===section)

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display:'flex', gap:5, marginBottom:14, flexWrap:'wrap' as const }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ padding:'6px 13px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:section===s.id?'#ffb340':'var(--border)', background:section===s.id?'rgba(255,179,64,0.10)':'var(--bg-card2)', color:section===s.id?'#ffb340':'var(--text-mid)', fontWeight:section===s.id?600:400 }}>
            {s.label} {exercises.filter(e=>e.category===s.id).length>0 && <span style={{ fontSize:9, background:'#ffb340', color:'#000', borderRadius:999, padding:'1px 5px', marginLeft:3 }}>{exercises.filter(e=>e.category===s.id).length}</span>}
          </button>
        ))}
      </div>

      {/* Add exercise */}
      <div style={{ marginBottom:14 }}>
        <p style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.06em', marginBottom:7 }}>Ajouter un exercice</p>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
          {current.list.map(name => (
            <button key={name} onClick={() => add(name)} style={{ padding:'4px 10px', borderRadius:8, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }}>+ {name}</button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      {filtered.length === 0 && <p style={{ fontSize:12, color:'var(--text-dim)', textAlign:'center' as const, padding:'14px 0' }}>Aucun exercice ajouté dans cette section.</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(ex => (
          <div key={ex.id} style={{ padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>{ex.name}</p>
              <button onClick={() => del(ex.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:15, padding:'1px' }}>✕</button>
            </div>

            {section === 'cardio' ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Durée</p>
                  <input type="text" value={ex.cardioTime??''} onChange={e=>updCardio(ex.id,{cardioTime:e.target.value})} placeholder="10:00" style={{ width:'100%', padding:'6px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
                </div>
                {['Rameur','SkiErg','Corde à sauter'].includes(ex.name) && (
                  <div>
                    <p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Distance (m)</p>
                    <input type="number" value={ex.cardioDistance??''} onChange={e=>updCardio(ex.id,{cardioDistance:parseInt(e.target.value)||0})} placeholder="2000" style={{ width:'100%', padding:'6px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
                  </div>
                )}
                {ex.name==='Vélo' && (
                  <div>
                    <p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Watts moy.</p>
                    <input type="number" value={ex.cardioWatts??''} onChange={e=>updCardio(ex.id,{cardioWatts:parseInt(e.target.value)||0})} placeholder="200" style={{ width:'100%', padding:'6px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
                  </div>
                )}
                {['Rameur','SkiErg'].includes(ex.name) && ex.cardioTime && ex.cardioDistance && (
                  <div style={{ padding:'6px 9px', borderRadius:8, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.25)', gridColumn:'span 2' }}>
                    <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Allure calculée</p>
                    <p style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'#00c8e0', margin:0 }}>{calcPaceFromTimeAndDist(ex.cardioTime, ex.cardioDistance)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 1fr auto auto', gap:5, marginBottom:5 }}>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'auto 0', textAlign:'center' as const }}>#</p>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'auto 0' }}>Reps</p>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'auto 0' }}>Charge (kg)</p>
                  <div/><div/>
                </div>
                {ex.sets.map((s, si) => (
                  <div key={si} style={{ display:'grid', gridTemplateColumns:'36px 1fr 1fr auto auto', gap:5, marginBottom:5 }}>
                    <span style={{ fontSize:11, color:'var(--text-dim)', textAlign:'center' as const, margin:'auto 0', fontFamily:'DM Mono,monospace' }}>{si+1}</span>
                    <input type="number" value={s.reps||''} onChange={e=>updSet(ex.id,si,'reps',parseInt(e.target.value)||0)} placeholder="10" style={{ padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
                    <input type="number" value={s.weight||''} onChange={e=>updSet(ex.id,si,'weight',parseFloat(e.target.value)||0)} placeholder="60" style={{ padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
                    <button onClick={()=>dupSet(ex.id,si)} title="Dupliquer" style={{ padding:'5px 8px', borderRadius:7, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:10, cursor:'pointer' }}>⎘</button>
                    <button onClick={()=>delSet(ex.id,si)} title="Supprimer" style={{ padding:'5px 8px', borderRadius:7, background:'rgba(255,95,95,0.08)', border:'1px solid rgba(255,95,95,0.2)', color:'#ff5f5f', fontSize:10, cursor:'pointer' }}>✕</button>
                  </div>
                ))}
                <button onClick={()=>addSet(ex.id)} style={{ marginTop:4, padding:'5px 12px', borderRadius:8, background:'rgba(0,200,224,0.08)', border:'1px dashed rgba(0,200,224,0.3)', color:'#00c8e0', fontSize:10, cursor:'pointer', width:'100%' }}>+ Série</button>
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
function HyroxEnrichment({ stations, runs, onChange }: { stations:HyroxStation[]; runs:string[]; onChange:(s:HyroxStation[],r:string[])=>void }) {
  const [stationData, setStationData] = useState<HyroxStation[]>(
    HYROX_STATIONS.map(name => stations.find(s=>s.name===name) ?? { name })
  )
  const [runData, setRunData] = useState<string[]>(runs.length===8 ? runs : Array(8).fill(''))

  function updStation(i: number, patch: Partial<HyroxStation>) {
    const upd = stationData.map((s,idx)=>idx===i?{...s,...patch}:s)
    setStationData(upd); onChange(upd, runData)
  }
  function updRun(i: number, val: string) {
    const upd = [...runData]; upd[i]=val; setRunData(upd); onChange(stationData, upd)
  }

  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 12px' }}>Stations (8)</p>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {stationData.map((s, i) => (
          <div key={s.name} style={{ padding:'11px 13px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
              <div style={{ width:24, height:24, borderRadius:7, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#ef4444', flexShrink:0 }}>{i+1}</div>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0 }}>{s.name}</p>
              {(s.time||s.reps||s.distance) && <span style={{ marginLeft:'auto', fontSize:9, padding:'1px 6px', borderRadius:20, background:'rgba(34,197,94,0.10)', color:'#22c55e', fontWeight:700 }}>✓</span>}
            </div>

            {['SkiErg','Rowing'].includes(s.name) && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
                <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Temps</p><input value={s.time??''} onChange={e=>updStation(i,{time:e.target.value})} placeholder="7:30" style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
                <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Distance (m)</p><input type="number" value={s.distance??''} onChange={e=>updStation(i,{distance:parseInt(e.target.value)||0})} placeholder="1000" style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
                <div style={{ padding:'6px 8px', borderRadius:7, background:'rgba(0,200,224,0.07)', border:'1px solid rgba(0,200,224,0.2)' }}>
                  <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px' }}>Allure</p>
                  <p style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700, color:'#00c8e0', margin:0 }}>{s.time&&s.distance?calcPaceFromTimeAndDist(s.time,s.distance):'—'}</p>
                </div>
              </div>
            )}
            {['Sled Push','Sled Pull','Farmer Carry','Sandbag Lunges'].includes(s.name) && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Distance (m)</p><input type="number" value={s.distance??''} onChange={e=>updStation(i,{distance:parseInt(e.target.value)||0})} placeholder={s.name==='Farmer Carry'?'200':'25'} style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
                <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Charge (kg)</p><input type="number" value={s.weight??''} onChange={e=>updStation(i,{weight:parseInt(e.target.value)||0})} placeholder="40" style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
              </div>
            )}
            {s.name==='Wall Balls' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Reps</p><input type="number" value={s.reps??''} onChange={e=>updStation(i,{reps:parseInt(e.target.value)||0})} placeholder="100" style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
                <div><p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Charge (kg)</p><input type="number" value={s.weight??''} onChange={e=>updStation(i,{weight:parseInt(e.target.value)||0})} placeholder="6" style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/></div>
              </div>
            )}
            {s.name==='Burpee Broad Jump' && (
              <div>
                <p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Reps / distance (m)</p>
                <input type="text" value={s.reps??''} onChange={e=>updStation(i,{reps:parseInt(e.target.value)||0})} placeholder="80" style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 10px' }}>Runs compromised (8 × 1km)</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:8 }}>
        {runData.map((r, i) => (
          <div key={i}>
            <p style={{ fontSize:9, color:'var(--text-dim)', marginBottom:3 }}>Run {i+1}</p>
            <input value={r} onChange={e=>updRun(i,e.target.value)} placeholder="4:30" style={{ width:'100%', padding:'6px 7px', borderRadius:7, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:11, outline:'none' }}/>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ACTIVITY DETAIL VIEW
// ══════════════════════════════════════════════════════════
function ActivityDetail({ activity: initial, onClose, onUpdate }: {
  activity: Activity; onClose: ()=>void; onUpdate: (a:Activity)=>void
}) {
  const [activity, setActivity] = useState<Activity>(initial)
  const [tab,     setTab]     = useState<DetailTab>('summary')
  const [saving,  setSaving]  = useState(false)
  const [gymExs,  setGymExs]  = useState<GymExercise[]>(initial.gymExercises ?? [])
  const [hyroxS,  setHyroxS]  = useState<HyroxStation[]>(initial.hyroxStations ?? [])
  const [hyroxR,  setHyroxR]  = useState<string[]>(initial.hyroxRuns ?? [])
  const [feeling, setFeeling] = useState<number>(initial.feeling ?? 5)
  const [notes,   setNotes]   = useState<string>(initial.userNotes ?? '')
  const [sel,     setSel]     = useState<[number,number]|null>(null)

  const zones     = defaultZones()
  const intervals = useMemo(() => detectIntervals(activity), [activity])
  const records   = useMemo(() => detectRecords(activity),   [activity])
  const analysis  = useMemo(() => generateAnalysis(activity),[activity])
  const newPRs    = records.filter(r => r.isNew)

  const sport     = activity.sport
  const isBike    = sport==='bike'||sport==='virtual_bike'
  const isRun     = sport==='run'||sport==='trail_run'
  const isSwim    = sport==='swim'
  const isGym     = sport==='gym'
  const isHyrox   = sport==='hyrox'
  const statusCfg = STATUS_CFG[activity.status]
  const date      = new Date(activity.started_at)

  // Mock stream data (replaced by real data when available in raw_data)
  const hrStream    = useMemo(() => activity.raw_data?.hrStream    ?? Array.from({length:120},(_,i)=>Math.round(140+20*Math.sin(i/8)+8*Math.random())),  [activity])
  const paceStream  = useMemo(() => activity.raw_data?.paceStream  ?? Array.from({length:120},(_,i)=>Math.round(285+25*Math.sin(i/12)+15*Math.random())), [activity])
  const powerStream = useMemo(() => activity.raw_data?.powerStream ?? Array.from({length:120},(_,i)=>Math.round(245+55*Math.sin(i/9)+20*Math.random())),  [activity])
  const elevStream  = useMemo(() => activity.raw_data?.elevStream  ?? Array.from({length:120},(_,i)=>110+40*Math.sin(i/18)+8*Math.random()),              [activity])
  const cadStream   = useMemo(() => activity.raw_data?.cadStream   ?? Array.from({length:120},(_,i)=>Math.round((isBike?88:175)+8*Math.sin(i/7)+3*Math.random())), [activity, isBike])

  // Zone time distribution (from hrStream)
  const hrZoneTimes = useMemo(() => {
    const times = [0,0,0,0,0]
    hrStream.forEach(v => { times[getZoneIdx(v, zones.hr)]++ })
    const total = hrStream.length || 1
    return times.map(t => Math.round((t/total) * ((activity.moving_time_s??3600)/60)))
  }, [hrStream, activity.moving_time_s])

  // Selectable data range
  const slicedHr    = sel ? hrStream.slice(    Math.round(sel[0]/120*hrStream.length),    Math.round(sel[1]/120*hrStream.length))    : hrStream
  const slicedPace  = sel ? paceStream.slice(  Math.round(sel[0]/120*paceStream.length),  Math.round(sel[1]/120*paceStream.length))  : paceStream
  const slicedPower = sel ? powerStream.slice( Math.round(sel[0]/120*powerStream.length), Math.round(sel[1]/120*powerStream.length)) : powerStream
  const slicedElev  = sel ? elevStream.slice(  Math.round(sel[0]/120*elevStream.length),  Math.round(sel[1]/120*elevStream.length))  : elevStream
  const slicedCad   = sel ? cadStream.slice(   Math.round(sel[0]/120*cadStream.length),   Math.round(sel[1]/120*cadStream.length))   : cadStream

  async function save() {
    setSaving(true)
    const upd: Activity = {
      ...activity,
      userNotes:    notes,
      feeling:      feeling,
      rpe:          feeling,
      gymExercises: gymExs,
      hyroxStations:hyroxS,
      hyroxRuns:    hyroxR,
      status:       gymExs.length>0||hyroxS.some(s=>s.time||s.reps)||notes ? 'completed' : activity.status,
      raw_data: { ...activity.raw_data, gymExercises:gymExs, hyroxStations:hyroxS, hyroxRuns:hyroxR },
    }
    onUpdate(upd)
    setActivity(upd)
    setSaving(false)
    setTab('summary')
  }

  const TABS: [DetailTab, string][] = [
    ['summary',  '📊 Résumé'],
    ...(!isGym&&!isSwim ? [['charts','📈 Courbes']] as [DetailTab,string][] : []),
    ...(intervals.length>0 ? [['intervals','⚡ Intervalles']] as [DetailTab,string][] : []),
    ...(records.length>0   ? [['records','🏆 Records']] as [DetailTab,string][]   : []),
    ['enrich', isGym?'💪 Séance':isHyrox?'🏋️ Hyrox':'✏️ Enrichir'],
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'var(--bg)', overflowY:'auto' }}>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'14px 16px 48px' }}>

        {/* ── Top nav ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <button onClick={onClose} style={{ width:38, height:38, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:17, color:'var(--text-dim)', flexShrink:0 }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' as const }}>
              <span style={{ fontSize:20 }}>{SPORT_EMOJI[sport]}</span>
              <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, letterSpacing:'-0.02em' }}>{activity.title}</h1>
              {newPRs.length>0 && <span style={{ padding:'2px 7px', borderRadius:20, background:'rgba(255,179,64,0.14)', border:'1px solid rgba(255,179,64,0.35)', color:'#ffb340', fontSize:9, fontWeight:700, flexShrink:0 }}>🏆 RECORD</span>}
              {activity.is_race  && <span style={{ padding:'2px 7px', borderRadius:20, background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:9, fontWeight:700, flexShrink:0 }}>COMPÉT</span>}
            </div>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>
              {date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
              <span style={{ margin:'0 6px', color:'var(--border)' }}>·</span>
              {PROVIDER_LABEL[activity.provider] ?? activity.provider}
              <span style={{ marginLeft:8, padding:'1px 6px', borderRadius:20, background:statusCfg.bg, border:`1px solid ${statusCfg.color}44`, color:statusCfg.color, fontSize:9, fontWeight:700 }}>{statusCfg.label}</span>
            </p>
          </div>
        </div>

        {/* ── KPI grid ── */}
        <Card>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:7 }}>
            {activity.moving_time_s != null && activity.moving_time_s > 0 && <KpiChip label="Durée" value={formatDuration(activity.moving_time_s)} color={SPORT_COLOR[sport]}/>}
            {activity.distance_m    != null && activity.distance_m > 0    && <KpiChip label="Distance" value={formatDist(activity.distance_m)} color={SPORT_COLOR[sport]}/>}
            {(activity.elevation_gain_m ?? 0) > 0 && <KpiChip label="Dénivelé +" value={`${Math.round(activity.elevation_gain_m!)} m`} color="#8b5cf6"/>}
            {isRun && activity.avg_pace_s_km && activity.avg_pace_s_km > 0 && <KpiChip label="Allure moy." value={formatPace(activity.avg_pace_s_km)} color="#22c55e"/>}
            {isBike && activity.avg_speed_ms && activity.avg_speed_ms > 0 && <KpiChip label="Vitesse moy." value={`${(activity.avg_speed_ms*3.6).toFixed(1)} km/h`} color="#3b82f6"/>}
            {activity.avg_hr  && activity.avg_hr > 0  && <KpiChip label="FC moy." value={`${Math.round(activity.avg_hr)} bpm`} sub={activity.max_hr?`max ${Math.round(activity.max_hr)} bpm`:undefined} color="#ef4444"/>}
            {isBike && activity.avg_watts        && activity.avg_watts > 0        && <KpiChip label="Puissance moy." value={`${Math.round(activity.avg_watts)} W`} color="#3b82f6"/>}
            {isBike && activity.normalized_watts && activity.normalized_watts > 0 && <KpiChip label="Puissance norm." value={`${Math.round(activity.normalized_watts)} W`} color="#3b82f6"/>}
            {activity.avg_cadence && activity.avg_cadence > 0 && <KpiChip label={isBike?'Cadence':'Cadence (spm)'} value={`${Math.round(activity.avg_cadence)} rpm`} color="#9ca3af"/>}
            {activity.tss      && activity.tss > 0      && <KpiChip label="TSS"      value={`${Math.round(activity.tss)}`}       color="#5b6fff"/>}
            {activity.calories && activity.calories > 0 && <KpiChip label="Calories" value={`${Math.round(activity.calories)} kcal`} color="#ffb340"/>}
            {(activity.rpe ?? feeling) > 0 && <KpiChip label="RPE" value={`${activity.rpe ?? feeling}/10`} color="#a855f7"/>}
          </div>
        </Card>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:12 }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding:'7px 13px', borderRadius:10, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:tab===id?700:400, borderColor:tab===id?SPORT_COLOR[sport]:'var(--border)', background:tab===id?SPORT_BG[sport]:'var(--bg-card)', color:tab===id?SPORT_COLOR[sport]:'var(--text-mid)', transition:'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ SUMMARY TAB ═══ */}
        {tab === 'summary' && (
          <div>
            {/* Auto analysis */}
            <Card>
              <SecLabel>Analyse automatique</SecLabel>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {analysis.map((line, i) => (
                  <div key={i} style={{ padding:'8px 12px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', fontSize:12, color:'var(--text-mid)', lineHeight:1.65 }}>{line}</div>
                ))}
              </div>
            </Card>

            {/* Zones HR */}
            {(isRun||isBike) && activity.avg_hr && (
              <Card>
                <SecLabel>Répartition zones FC</SecLabel>
                <ZoneBar labels={ZONE_LABELS} times={hrZoneTimes} colors={ZONE_COLORS}/>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5, marginTop:12 }}>
                  {hrZoneTimes.map((t, i) => (
                    <div key={i} style={{ textAlign:'center' as const, padding:'7px 4px', borderRadius:9, background:`${ZONE_COLORS[i]}11`, border:`1px solid ${ZONE_COLORS[i]}33` }}>
                      <p style={{ fontSize:8, fontWeight:700, color:ZONE_COLORS[i], margin:'0 0 2px' }}>Z{i+1}</p>
                      <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:'var(--text)', margin:0 }}>{t}min</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Elevation */}
            {(isRun||isBike||sport==='trail_run') && (activity.elevation_gain_m ?? 0) > 0 && (
              <Card>
                <ElevationProfile data={elevStream} selection={sel} onSelect={setSel}/>
                {sel && <button onClick={()=>setSel(null)} style={{ marginTop:8, fontSize:10, color:'#00c8e0', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Réinitialiser la sélection</button>}
              </Card>
            )}

            {/* Swim */}
            {isSwim && (
              <Card>
                <SecLabel>Natation</SecLabel>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  {activity.distance_m    && <KpiChip label="Distance" value={formatDist(activity.distance_m)} color="#38bdf8"/>}
                  {activity.moving_time_s && <KpiChip label="Durée"    value={formatDuration(activity.moving_time_s)} color="#38bdf8"/>}
                  {activity.avg_pace_s_km && <KpiChip label="Allure /100m" value={formatPace(activity.avg_pace_s_km/10)} color="#38bdf8"/>}
                  {activity.avg_hr        && <KpiChip label="FC moy."  value={`${Math.round(activity.avg_hr)} bpm`} color="#ef4444"/>}
                </div>
                {activity.raw_data?.swolf && <div style={{ marginTop:10 }}><KpiChip label="SWOLF" value={String(activity.raw_data.swolf)} color="#38bdf8"/></div>}
              </Card>
            )}

            {/* Hyrox summary */}
            {isHyrox && hyroxS.filter(s=>s.time||s.reps||s.distance).length>0 && (
              <Card>
                <SecLabel>Stations Hyrox</SecLabel>
                {hyroxS.filter(s=>s.time||s.reps||s.distance).map((s, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', marginBottom:5 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'#ef4444', width:18, flexShrink:0 }}>{i+1}</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{s.name}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#ef4444', fontWeight:700 }}>
                      {[s.time, s.reps?`${s.reps}reps`:null, s.weight?`${s.weight}kg`:null, s.distance?`${s.distance}m`:null].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
                {hyroxR.some(r=>r) && (
                  <div style={{ marginTop:10 }}>
                    <p style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.07em', marginBottom:8 }}>Runs compromised</p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
                      {hyroxR.map((r, i) => r ? (
                        <div key={i} style={{ textAlign:'center' as const, padding:'6px 4px', borderRadius:8, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                          <p style={{ fontSize:8, color:'var(--text-dim)', margin:'0 0 2px' }}>Run {i+1}</p>
                          <p style={{ fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700, color:'var(--text)', margin:0 }}>{r}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Notes */}
            {(notes||activity.userNotes) && (
              <Card>
                <SecLabel>Notes</SecLabel>
                <p style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.7, margin:0 }}>{notes||activity.userNotes}</p>
              </Card>
            )}

            {/* New PRs banner */}
            {newPRs.length > 0 && (
              <div style={{ padding:'14px 16px', borderRadius:13, background:'rgba(255,179,64,0.07)', border:'2px solid rgba(255,179,64,0.28)', marginBottom:12 }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 9px', color:'#ffb340' }}>🏆 Nouveau{newPRs.length>1?'x':''} record{newPRs.length>1?'s':''}  !</p>
                {newPRs.map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
                    <span>🥇</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{r.label}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:'#ffb340' }}>{r.value}{r.unit?` ${r.unit}`:''}</span>
                  </div>
                ))}
                <button style={{ marginTop:8, width:'100%', padding:'9px', borderRadius:10, background:'linear-gradient(135deg,#ffb340,#f97316)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  Mettre à jour les records →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ CHARTS TAB ═══ */}
        {tab === 'charts' && (
          <div>
            {sel && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:10, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.25)', marginBottom:12 }}>
                <span style={{ fontSize:11, color:'#00c8e0', fontWeight:600 }}>📌 Zone sélectionnée ({Math.round((sel[1]-sel[0])/(hrStream.length)*((activity.moving_time_s??3600)/60))} min)</span>
                <button onClick={()=>setSel(null)} style={{ fontSize:10, color:'#00c8e0', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Réinitialiser</button>
              </div>
            )}

            {/* HR */}
            {activity.avg_hr && (
              <Card>
                <Sparkline data={slicedHr} zones={zones.hr} color="#ef4444" height={60} label="Fréquence cardiaque" unit=" bpm" selection={sel} onSelect={setSel}/>
              </Card>
            )}

            {/* Power (bike) */}
            {isBike && activity.avg_watts && (
              <Card>
                <Sparkline data={slicedPower} zones={zones.power} color="#3b82f6" height={60} label="Puissance" unit=" W" selection={sel} onSelect={setSel}/>
              </Card>
            )}

            {/* Pace (run) */}
            {isRun && activity.avg_pace_s_km && (
              <Card>
                <Sparkline data={slicedPace} zones={zones.pace} color="#22c55e" height={60} label="Allure" unit="/km" selection={sel} onSelect={setSel}/>
              </Card>
            )}

            {/* Speed (bike — grey, no zones) */}
            {isBike && activity.avg_speed_ms && (
              <Card>
                <Sparkline data={slicedHr.map((_,i)=>25+10*Math.sin(i/9)+3*Math.random())} color="#9ca3af" height={48} label="Vitesse" unit=" km/h" selection={sel} onSelect={setSel}/>
              </Card>
            )}

            {/* Elevation */}
            {(activity.elevation_gain_m ?? 0) > 0 && (
              <Card>
                <ElevationProfile data={slicedElev} selection={sel} onSelect={setSel}/>
              </Card>
            )}

            {/* Cadence */}
            {activity.avg_cadence && (
              <Card>
                <Sparkline data={slicedCad} color="#9ca3af" height={48} label={isBike?'Cadence pédalage':'Cadence foulée'} unit=" rpm" selection={sel} onSelect={setSel}/>
              </Card>
            )}

            <p style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center' as const, marginTop:4 }}>
              Glissez sur n'importe quelle courbe pour zoomer sur une zone. Toutes les courbes se synchronisent.
            </p>
          </div>
        )}

        {/* ═══ INTERVALS TAB ═══ */}
        {tab === 'intervals' && (
          <Card>
            <SecLabel>Intervalles détectés · {intervals.length} bloc{intervals.length>1?'s':''}</SecLabel>
            <IntervalsChart intervals={intervals} sport={sport}/>
          </Card>
        )}

        {/* ═══ RECORDS TAB ═══ */}
        {tab === 'records' && (
          <div>
            {newPRs.length > 0 && (
              <div style={{ padding:'14px 16px', borderRadius:13, background:'rgba(255,179,64,0.07)', border:'2px solid rgba(255,179,64,0.28)', marginBottom:12 }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 10px', color:'#ffb340' }}>🏆 Nouveaux records !</p>
                {newPRs.map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 11px', borderRadius:9, background:'rgba(255,179,64,0.09)', border:'1px solid rgba(255,179,64,0.25)', marginBottom:5 }}>
                    <span style={{ fontSize:14 }}>🥇</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{r.label}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#ffb340' }}>{r.value}{r.unit?` ${r.unit}`:''}</span>
                  </div>
                ))}
                <button style={{ marginTop:10, width:'100%', padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#ffb340,#f97316)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Mettre à jour les records dans Mon Profil →
                </button>
              </div>
            )}
            <Card>
              <SecLabel>Records détectés dans cette activité</SecLabel>
              {records.map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, background:'var(--bg-card2)', border:`1px solid ${r.isNew?'rgba(255,179,64,0.3)':'var(--border)'}`, marginBottom:6 }}>
                  <span style={{ fontSize:14 }}>{r.isNew?'🥇':'📊'}</span>
                  <span style={{ flex:1, fontSize:12, color:'var(--text-mid)' }}>{r.label}</span>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:r.isNew?'#ffb340':'var(--text)' }}>{r.value}{r.unit?` ${r.unit}`:''}</span>
                  {r.isNew && <span style={{ fontSize:8, padding:'2px 6px', borderRadius:20, background:'rgba(255,179,64,0.15)', color:'#ffb340', fontWeight:700 }}>NEW</span>}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ═══ ENRICH TAB ═══ */}
        {tab === 'enrich' && (
          <div>
            {/* RPE */}
            <Card>
              <SecLabel>Ressenti · RPE</SecLabel>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'var(--text-dim)' }}>Effort perçu (1–10)</span>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:feeling<=3?'#22c55e':feeling<=6?'#ffb340':'#ef4444' }}>{feeling}/10</span>
                </div>
                <input type="range" min={1} max={10} step={0.5} value={feeling} onChange={e=>setFeeling(parseFloat(e.target.value))} style={{ width:'100%', accentColor:'#00c8e0', cursor:'pointer' }}/>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>Très facile</span>
                  <span style={{ fontSize:9, color:'var(--text-dim)' }}>Maximum</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:5 }}>Notes</p>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Comment s'est passée cette séance ? Points à retenir, sensations, douleurs..." rows={3} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', resize:'none' as const, lineHeight:1.65 }}/>
              </div>
            </Card>

            {/* Sport-specific */}
            {isGym && (
              <Card>
                <SecLabel>Exercices · Séance muscu</SecLabel>
                <GymEnrichment exercises={gymExs} onChange={setGymExs}/>
              </Card>
            )}
            {isHyrox && (
              <Card>
                <SecLabel>Stations Hyrox</SecLabel>
                <HyroxEnrichment stations={hyroxS} runs={hyroxR} onChange={(s,r)=>{ setHyroxS(s); setHyroxR(r) }}/>
              </Card>
            )}

            <button onClick={save} disabled={saving} style={{ width:'100%', padding:'13px', borderRadius:13, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Sauvegarde...' : '✓ Sauvegarder'}
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
function ActivityListCard({ activity, onClick }: { activity:Activity; onClick:()=>void }) {
  const sport     = activity.sport
  const statusCfg = STATUS_CFG[activity.status]
  const date      = new Date(activity.started_at)
  const isBike    = sport==='bike'||sport==='virtual_bike'
  const isRun     = sport==='run'||sport==='trail_run'

  return (
    <div onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 15px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'var(--shadow-card)', marginBottom:8, cursor:'pointer', transition:'border-color 0.15s' }}>
      <div style={{ width:46, height:46, borderRadius:12, background:SPORT_BG[sport], border:`1px solid ${SPORT_COLOR[sport]}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:21, flexShrink:0 }}>
        {SPORT_EMOJI[sport]}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' as const }}>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{activity.title}</p>
          {activity.is_race && <span style={{ fontSize:8, padding:'1px 5px', borderRadius:20, background:'rgba(239,68,68,0.10)', color:'#ef4444', fontWeight:700, flexShrink:0 }}>COMPÉT</span>}
        </div>
        <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 5px' }}>
          {date.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
          {activity.moving_time_s  && activity.moving_time_s > 0  && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-mid)', fontWeight:600 }}>{formatDuration(activity.moving_time_s)}</span>}
          {activity.distance_m     && activity.distance_m > 0     && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:SPORT_COLOR[sport], fontWeight:600 }}>{formatDist(activity.distance_m)}</span>}
          {isRun && activity.avg_pace_s_km && activity.avg_pace_s_km > 0 && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#22c55e', fontWeight:600 }}>{formatPace(activity.avg_pace_s_km)}</span>}
          {isBike && activity.avg_watts  && activity.avg_watts > 0  && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#3b82f6', fontWeight:600 }}>{Math.round(activity.avg_watts)}W</span>}
          {activity.avg_hr  && activity.avg_hr > 0  && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#ef4444', fontWeight:600 }}>♥ {Math.round(activity.avg_hr)}</span>}
          {activity.tss     && activity.tss > 0     && <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#5b6fff', fontWeight:600 }}>{Math.round(activity.tss)} TSS</span>}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
        <span style={{ fontSize:8, padding:'2px 6px', borderRadius:20, background:statusCfg.bg, border:`1px solid ${statusCfg.color}33`, color:statusCfg.color, fontWeight:700 }}>{statusCfg.label}</span>
        <span style={{ color:'var(--text-dim)', fontSize:16 }}>›</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function ActivitiesPage() {
  const { activities, loading, total, page, load, updateActivity } = useActivities()
  const [selected,     setSelected]     = useState<Activity|null>(null)
  const [filterSport,  setFilterSport]  = useState<FilterSport>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterType,   setFilterType]   = useState<FilterType>('all')
  const [search,       setSearch]       = useState('')

  const filtered = useMemo(() => activities.filter(a => {
    if (filterSport  !== 'all' && a.sport   !== filterSport)                   return false
    if (filterStatus !== 'all' && a.status  !== filterStatus)                  return false
    if (filterType === 'competition' && !a.is_race)                            return false
    if (filterType === 'training'    &&  a.is_race)                            return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()))       return false
    return true
  }), [activities, filterSport, filterStatus, filterType, search])

  const now       = new Date()
  const thisMonth = activities.filter(a => {
    const d = new Date(a.started_at)
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth()
  })

  const SPORT_FILTERS: { id:FilterSport; label:string; emoji:string }[] = [
    {id:'all',         label:'Tout',      emoji:'⚡'},
    {id:'run',         label:'Running',   emoji:'🏃'},
    {id:'bike',        label:'Vélo',      emoji:'🚴'},
    {id:'swim',        label:'Natation',  emoji:'🏊'},
    {id:'hyrox',       label:'Hyrox',     emoji:'🏋️'},
    {id:'gym',         label:'Muscu',     emoji:'💪'},
    {id:'rowing',      label:'Aviron',    emoji:'🚣'},
    {id:'trail_run',   label:'Trail',     emoji:'🏔'},
  ]

  if (selected) {
    return (
      <ActivityDetail
        activity={selected}
        onClose={() => setSelected(null)}
        onUpdate={upd => {
          updateActivity(upd.id, upd)
          setSelected(upd)
        }}
      />
    )
  }

  return (
    <div style={{ padding:'24px 20px', maxWidth:'100%' }}>
      {/* Header */}
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Activités</h1>
        <p style={{ fontSize:12, color:'var(--text-dim)', margin:'4px 0 0' }}>
          {total > 0 ? `${total} activité${total>1?'s':''} importée${total>1?'s':''}` : 'Connectez vos apps pour importer vos séances'}
        </p>
      </div>

      {/* Monthly summary */}
      {thisMonth.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          <div style={{ padding:'10px 12px', borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>Ce mois</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'#00c8e0', margin:0 }}>{thisMonth.length}</p>
          </div>
          <div style={{ padding:'10px 12px', borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>Volume</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'#ffb340', margin:0 }}>{(thisMonth.reduce((s,a)=>s+(a.moving_time_s??0),0)/3600).toFixed(1)}h</p>
          </div>
          <div style={{ padding:'10px 12px', borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>TSS</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'#5b6fff', margin:0 }}>{Math.round(thisMonth.reduce((s,a)=>s+(a.tss??0),0))}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position:'relative', marginBottom:10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une activité..."
          style={{ width:'100%', padding:'10px 14px 10px 38px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, outline:'none' }}/>
        <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--text-dim)' }}>🔍</span>
        {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:17 }}>×</button>}
      </div>

      {/* Sport filter */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:7 }}>
        {SPORT_FILTERS.map(f => (
          <button key={f.id} onClick={()=>setFilterSport(f.id)} style={{ padding:'5px 10px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, borderColor:filterSport===f.id?'#00c8e0':'var(--border)', background:filterSport===f.id?'rgba(0,200,224,0.10)':'var(--bg-card)', color:filterSport===f.id?'#00c8e0':'var(--text-mid)', fontWeight:filterSport===f.id?600:400 }}>
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* Type + status filter */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:16 }}>
        {(['all','training','competition'] as FilterType[]).map(id => (
          <button key={id} onClick={()=>setFilterType(id)} style={{ padding:'4px 10px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:10, borderColor:filterType===id?'#a855f7':'var(--border)', background:filterType===id?'rgba(168,85,247,0.10)':'var(--bg-card)', color:filterType===id?'#a855f7':'var(--text-mid)', fontWeight:filterType===id?600:400 }}>
            {id==='all'?'Tout':id==='training'?'Entraînements':'Compétitions'}
          </button>
        ))}
        <span style={{ width:1, background:'var(--border)', margin:'2px 3px' }}/>
        {(['all','imported','completed','validated'] as FilterStatus[]).map(id => (
          <button key={id} onClick={()=>setFilterStatus(id)} style={{ padding:'4px 10px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:10, borderColor:filterStatus===id?STATUS_CFG[id==='all'?'imported':id].color:'var(--border)', background:filterStatus===id?STATUS_CFG[id==='all'?'imported':id].bg:'var(--bg-card)', color:filterStatus===id?STATUS_CFG[id==='all'?'imported':id].color:'var(--text-mid)', fontWeight:filterStatus===id?600:400 }}>
            {id==='all'?'Tout statut':STATUS_CFG[id].label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && activities.length === 0 ? (
        <div style={{ padding:'40px 0', textAlign:'center' as const, color:'var(--text-dim)', fontSize:13 }}>Chargement des activités...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:'44px 20px', textAlign:'center' as const, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16 }}>
          <p style={{ fontSize:38, marginBottom:10 }}>🏃</p>
          <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:'0 0 7px' }}>Aucune activité</p>
          <p style={{ fontSize:13, color:'var(--text-dim)', margin:0, maxWidth:260, marginLeft:'auto', marginRight:'auto' }}>
            {search ? `Aucun résultat pour "${search}".` : 'Connectez Strava, Wahoo ou Polar dans votre profil.'}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(a => (
            <ActivityListCard key={a.id} activity={a} onClick={() => setSelected(a)}/>
          ))}
          {activities.length < total && (
            <button onClick={()=>load(page+1, { sport:filterSport!=='all'?filterSport:undefined })} style={{ width:'100%', padding:'12px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:13, cursor:'pointer', marginTop:6 }}>
              Charger plus — {total-activities.length} restante{total-activities.length>1?'s':''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
