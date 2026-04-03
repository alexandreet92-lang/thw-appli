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

// Stream data points from provider
interface StreamData {
  time:     number[]   // seconds from start
  distance: number[]   // meters
  altitude: number[]   // meters
  heartrate:number[]   // bpm
  velocity: number[]   // m/s
  watts:    number[]   // W (bike only)
  cadence:  number[]   // rpm or spm
}

interface TrackConfig {
  key:     keyof StreamData
  label:   string
  unit:    string
  color:   string
  height:  number
  invert?: boolean   // for pace: lower = faster, invert Y
  format?: (v: number) => string
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

interface PRRecord {
  label:  string
  value:  string
  isNew:  boolean
}

interface HyroxStation {
  name:      string
  time?:     string
  distance?: number
  weight?:   number
  reps?:     number
}

interface GymSet { reps: number; weight: number }
interface GymExercise {
  id:            string
  name:          string
  category:      'upper' | 'lower' | 'cardio' | 'other'
  sets:          GymSet[]
  cardioTime?:   string
  cardioDist?:   number
  cardioWatts?:  number
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
  streams?:         Partial<StreamData>
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
  run: 'Running', trail_run: 'Trail', bike: 'Cyclisme', virtual_bike: 'Home Trainer',
  swim: 'Natation', rowing: 'Aviron', hyrox: 'Hyrox', gym: 'Musculation', other: 'Autre',
}
const SPORT_EMOJI: Record<SportType, string> = {
  run: '🏃', trail_run: '🏔', bike: '🚴', virtual_bike: '🚴',
  swim: '🏊', rowing: '🚣', hyrox: '🏋️', gym: '💪', other: '⚡',
}
const SPORT_COLOR: Record<SportType, string> = {
  run: '#22c55e', trail_run: '#f97316', bike: '#3b82f6', virtual_bike: '#3b82f6',
  swim: '#38bdf8', rowing: '#14b8a6', hyrox: '#ef4444', gym: '#ffb340', other: '#9ca3af',
}
const STATUS_CFG = {
  imported:  { label: 'Importée',  color: '#9ca3af', bg: 'rgba(156,163,175,0.10)' },
  completed: { label: 'Complétée', color: '#ffb340', bg: 'rgba(255,179,64,0.10)'  },
  validated: { label: 'Validée',   color: '#22c55e', bg: 'rgba(34,197,94,0.10)'   },
}
const PROVIDER_LABEL: Record<string, string> = {
  manual: 'Manuel', strava: 'Strava', wahoo: 'Wahoo',
  polar: 'Polar', garmin: 'Garmin', withings: 'Withings',
}
const ZONE_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

// Track colors — analytical palette
const TRACK_COLORS = {
  altitude:  '#8b5cf6',
  velocity:  '#38bdf8',
  watts:     '#3b82f6',
  heartrate: '#ef4444',
  cadence:   '#ec4899',
  pace:      '#22c55e',
}

const HYROX_STATIONS = ['SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Rowing','Farmer Carry','Sandbag Lunges','Wall Balls']
const GYM_UPPER  = ['Développé couché','Développé incliné','Tractions','Rowing barre','Curl biceps','Extension triceps','Élévations latérales','Pompes','Dips','Autre']
const GYM_LOWER  = ['Squat','Leg press','Fentes','Romanian deadlift','Hip thrust','Leg curl','Leg extension','Mollets','Sumo deadlift','Autre']
const GYM_CARDIO = ['SkiErg','Rameur','Vélo','Vélo elliptique','Stairs','Autre']
const GYM_OTHER  = ['Étirements','Mobilité','Gainage','Yoga','Pilates','Autre']

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}`
  return `${m}:${String(Math.round(sec)).padStart(2,'0')}`
}
function fmtPace(s_km: number): string {
  if (!s_km || s_km <= 0) return '—'
  return `${Math.floor(s_km/60)}:${String(Math.round(s_km%60)).padStart(2,'0')}/km`
}
function fmtDist(m: number | null): string {
  if (!m || m <= 0) return '—'
  return m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`
}
function fmtSpeed(ms: number): string { return `${(ms*3.6).toFixed(1)} km/h` }
function fmtPaceShort(s_km: number): string {
  return `${Math.floor(s_km/60)}:${String(Math.round(s_km%60)).padStart(2,'0')}`
}
function velocityToPace(ms: number): number { return ms > 0 ? 1000/ms : 0 }

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a,b)=>a+b,0)/arr.length
}
function max_v(arr: number[]): number { return arr.length ? Math.max(...arr) : 0 }
function min_v(arr: number[]): number { return arr.length ? Math.min(...arr) : 0 }

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
      { label:'Z4', color:'#f97316', min:228, max:255 },
      { label:'Z5', color:'#ef4444', min:0,   max:228 },
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
  for (let i=0; i<zones.length; i++) if (value>=zones[i].min && value<zones[i].max) return i
  return zones.length-1
}

// ══════════════════════════════════════════════════════════
// AUTO-ANALYSIS
// ══════════════════════════════════════════════════════════
function generateAnalysis(a: Activity, streams?: Partial<StreamData>): string[] {
  const lines: string[] = []
  const isBike = a.sport==='bike'||a.sport==='virtual_bike'
  const isRun  = a.sport==='run'||a.sport==='trail_run'

  if (isBike && a.avg_watts && a.normalized_watts) {
    const vi = a.normalized_watts/a.avg_watts
    if (vi < 1.05)      lines.push('Effort régulier — maîtrise de l\'intensité.')
    else if (vi < 1.12) lines.push('Effort globalement régulier, quelques variations.')
    else                lines.push('Forte variabilité de puissance — effort irrégulier.')
  }
  if (a.tss) {
    if (a.tss > 150)      lines.push(`Charge élevée (${Math.round(a.tss)} TSS) — récupération 48h+ recommandée.`)
    else if (a.tss > 80)  lines.push(`Charge modérée (${Math.round(a.tss)} TSS) — récupération 24h.`)
    else                  lines.push(`Charge légère (${Math.round(a.tss)} TSS).`)
  }
  if (isRun && a.avg_hr && a.avg_pace_s_km) {
    if (a.avg_hr < 148)      lines.push('Séance en endurance fondamentale — FC bien maîtrisée.')
    else if (a.avg_hr < 163) lines.push('Intensité tempo — allure bien tenue.')
    else                     lines.push('Séance à haute intensité.')
  }
  if ((a.elevation_gain_m ?? 0) > 500) lines.push(`Dénivelé important (${Math.round(a.elevation_gain_m!)}m) — impact musculaire excentrique.`)
  if ((a.moving_time_s ?? 0) > 7200)   lines.push('Longue durée — hydratation et récupération à soigner.')
  if (!lines.length) lines.push('Données enregistrées. Connectez vos capteurs pour l\'analyse détaillée.')
  return lines.slice(0,3)
}

// Detect intervals from laps
function detectIntervals(a: Activity): IntervalBlock[] {
  const laps = a.raw_data?.laps as any[] | undefined
  if (!laps || laps.length < 2) return []
  return laps.map((lap: any, i: number): IntervalBlock => ({
    index:    i+1,
    label:    lap.name ?? `Lap ${i+1}`,
    startIdx: lap.start_index ?? 0,
    endIdx:   lap.end_index ?? 0,
    durationS:lap.elapsed_time ?? lap.moving_time ?? 0,
    avgHr:    lap.average_heartrate ?? 0,
    avgPace:  lap.average_speed ? Math.round(1000/lap.average_speed) : 0,
    avgWatts: lap.average_watts ?? 0,
    distM:    lap.distance ?? 0,
  }))
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

  const load = useCallback(async (p=0, sport?: string, isRace?: boolean) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    let q = supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(p*PAGE_SIZE, (p+1)*PAGE_SIZE-1)

    if (sport && sport !== 'all') q = q.eq('sport_type', sport)
    if (isRace !== undefined)     q = q.eq('is_race', isRace)

    const { data, count, error } = await q
    if (error) { setLoading(false); return }

    const mapped: Activity[] = (data ?? []).map((r: any): Activity => ({
      id: r.id, sport: (r.sport_type as SportType) ?? 'other',
      title: r.title ?? SPORT_LABEL[(r.sport_type as SportType)] ?? 'Activité',
      started_at: r.started_at,
      distance_m: r.distance_m, moving_time_s: r.moving_time_s,
      elapsed_time_s: r.elapsed_time_s, elevation_gain_m: r.elevation_gain_m,
      avg_speed_ms: r.avg_speed_ms, max_speed_ms: r.max_speed_ms,
      avg_pace_s_km: r.avg_pace_s_km, avg_hr: r.avg_hr, max_hr: r.max_hr,
      avg_watts: r.avg_watts, normalized_watts: r.normalized_watts,
      avg_cadence: r.avg_cadence, calories: r.calories, tss: r.tss, rpe: r.rpe,
      is_race: r.is_race ?? false, trainer: r.trainer ?? false,
      provider: r.provider ?? 'manual', status: (r.status as ActivityStatus) ?? 'imported',
      notes: r.notes, raw_data: r.raw_data ?? {},
      streams: r.raw_data?.streams,
      gymExercises: r.raw_data?.gymExercises,
      hyroxStations: r.raw_data?.hyroxStations,
      hyroxRuns: r.raw_data?.hyroxRuns,
      userNotes: r.notes, feeling: r.rpe,
    }))

    if (p===0) setActivities(mapped)
    else setActivities(prev=>[...prev,...mapped])
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateActivity(id: string, updates: Partial<Activity>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const cur = activities.find(a => a.id===id)
    if (!cur) return
    await supabase.from('activities').update({
      notes: updates.userNotes ?? null,
      rpe:   updates.feeling ?? null,
      status: updates.status ?? cur.status,
      raw_data: updates.raw_data ?? cur.raw_data,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setActivities(prev => prev.map(a => a.id===id ? { ...a, ...updates } : a))
  }

  return { activities, loading, total, page, load, updateActivity }
}

// ══════════════════════════════════════════════════════════
// ANALYTICS CHART ENGINE
// Full synchronized multi-track SVG chart
// ══════════════════════════════════════════════════════════
interface ChartSelection { startPct: number; endPct: number }

interface TrackDef {
  id:      string
  label:   string
  unit:    string
  color:   string
  data:    number[]
  height:  number
  invert?: boolean
  format:  (v: number) => string
}

interface CursorState { pct: number; visible: boolean }

// Single track SVG renderer
function ChartTrack({
  track, xData, cursor, selection, onCursorMove, onSelectStart, onSelectMove, onSelectEnd,
}: {
  track:         TrackDef
  xData:         number[]   // x-axis values (distance m or time s)
  cursor:        CursorState
  selection:     ChartSelection | null
  onCursorMove:  (pct: number) => void
  onSelectStart: (pct: number) => void
  onSelectMove:  (pct: number) => void
  onSelectEnd:   () => void
}) {
  const svgRef   = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState(false)

  const W = 1000   // viewBox width
  const H = track.height

  const raw   = track.data
  const valid = raw.filter(v => v > 0 && isFinite(v))
  if (!valid.length) return (
    <div style={{ height:track.height+36, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 16px' }}>
      <span style={{ fontSize:11, color:'var(--text-dim)' }}>{track.label} — données non disponibles</span>
    </div>
  )

  const dataMin = min_v(valid)
  const dataMax = max_v(valid)
  const span    = dataMax - dataMin || 1
  const pad     = span * 0.08

  // project value to Y
  function toY(v: number): number {
    const norm = (v - (dataMin-pad)) / (span + 2*pad)
    return track.invert ? norm*(H-2)+1 : (1-norm)*(H-2)+1
  }

  // build polyline points
  const n = raw.length
  const pts = raw.map((v, i) => {
    const x = (i/(n-1)) * W
    const y = (v>0&&isFinite(v)) ? toY(v) : (track.invert ? 1 : H-1)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // fill path
  const fillPts = raw.map((v, i) => {
    const x = (i/(n-1)) * W
    const y = (v>0&&isFinite(v)) ? toY(v) : (track.invert ? 1 : H-1)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const fillPath = `${fillPts.join(' ')} L${W},${H} L0,${H} Z`

  // y-axis labels
  const yLabels = [dataMin, (dataMin+dataMax)/2, dataMax].map((v, i) => ({
    y: toY(v),
    label: track.format(v),
  }))

  // cursor X position
  const cursorX = cursor.visible ? cursor.pct * W : null

  // selection rect
  const selX1 = selection ? selection.startPct * W : null
  const selX2 = selection ? selection.endPct * W : null

  function getPct(e: React.MouseEvent | React.TouchEvent): number {
    if (!svgRef.current) return 0
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  return (
    <div style={{ position:'relative', borderBottom:'1px solid var(--border)' }}>
      {/* Label row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 12px 3px' }}>
        <span style={{ fontSize:10, fontWeight:600, color:track.color, textTransform:'uppercase' as const, letterSpacing:'0.08em' }}>{track.label}</span>
        <div style={{ display:'flex', gap:12 }}>
          <span style={{ fontSize:9, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>min {track.format(dataMin)}</span>
          <span style={{ fontSize:9, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>avg {track.format(avg(valid))}</span>
          <span style={{ fontSize:9, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>max {track.format(dataMax)}</span>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width:'100%', height:track.height, display:'block', cursor:'crosshair', userSelect:'none' }}
        preserveAspectRatio="none"
        onMouseMove={e => { const p=getPct(e); onCursorMove(p); if(drag) onSelectMove(p) }}
        onMouseDown={e => { const p=getPct(e); setDrag(true); onSelectStart(p) }}
        onMouseUp={() => { setDrag(false); onSelectEnd() }}
        onMouseLeave={() => { onCursorMove(-1); if(drag) { setDrag(false); onSelectEnd() } }}
        onTouchMove={e => { const p=getPct(e); onCursorMove(p); if(drag) onSelectMove(p) }}
        onTouchStart={e => { const p=getPct(e); setDrag(true); onSelectStart(p) }}
        onTouchEnd={() => { setDrag(false); onSelectEnd() }}
      >
        <defs>
          <linearGradient id={`fill_${track.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={track.color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={track.color} stopOpacity="0.02"/>
          </linearGradient>
          <clipPath id={`clip_${track.id}`}>
            <rect x="0" y="0" width={W} height={H}/>
          </clipPath>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1="0" y1={f*H} x2={W} y2={f*H} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,6" opacity="0.5"/>
        ))}

        {/* Area fill */}
        <path d={fillPath} fill={`url(#fill_${track.id})`} clipPath={`url(#clip_${track.id})`}/>

        {/* Main line */}
        <polyline points={pts} fill="none" stroke={track.color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#clip_${track.id})`}/>

        {/* Selection overlay */}
        {selX1 !== null && selX2 !== null && (
          <rect x={Math.min(selX1,selX2)} y={0} width={Math.abs(selX2-selX1)} height={H}
            fill="rgba(0,200,224,0.10)" stroke="#00c8e0" strokeWidth="0.8" opacity="0.9"/>
        )}

        {/* Cursor */}
        {cursorX !== null && cursorX >= 0 && (
          <>
            <line x1={cursorX} y1={0} x2={cursorX} y2={H} stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
            {/* value dot */}
            {(() => {
              const idx  = Math.round((cursorX/W)*(raw.length-1))
              const val  = raw[idx]
              if (!val || !isFinite(val) || val <= 0) return null
              const dotY = toY(val)
              return <circle cx={cursorX} cy={dotY} r="2.5" fill={track.color} stroke="var(--bg-card)" strokeWidth="1.5"/>
            })()}
          </>
        )}
      </svg>
    </div>
  )
}

// Cursor tooltip — shows all track values at current position
function CursorTooltip({ tracks, cursor, xData, sport }: {
  tracks: TrackDef[]; cursor: CursorState; xData: number[]; sport: SportType
}) {
  if (!cursor.visible || cursor.pct < 0) return null
  const idx = Math.min(Math.round(cursor.pct * (xData.length-1)), xData.length-1)
  const xVal = xData[idx]

  return (
    <div style={{
      display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' as const,
      padding:'8px 14px', background:'var(--bg-card2)', borderBottom:'1px solid var(--border)',
      minHeight:36,
    }}>
      <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--text-dim)', minWidth:60 }}>
        {xVal >= 1000 ? `${(xVal/1000).toFixed(2)}km` : `${Math.round(xVal)}s`}
      </span>
      {tracks.map(t => {
        const tidx = Math.min(Math.round(cursor.pct*(t.data.length-1)), t.data.length-1)
        const val  = t.data[tidx]
        if (!val || !isFinite(val) || val<=0) return null
        return (
          <span key={t.id} style={{ fontSize:11, fontFamily:'DM Mono,monospace', fontWeight:600, color:t.color }}>
            {t.label}: {t.format(val)} {t.unit}
          </span>
        )
      })}
    </div>
  )
}

// Selection stats panel
function SelectionStats({ tracks, xData, selection, sport }: {
  tracks: TrackDef[]; xData: number[]; selection: ChartSelection; sport: SportType
}) {
  const startIdx = Math.round(selection.startPct * (xData.length-1))
  const endIdx   = Math.round(selection.endPct   * (xData.length-1))
  if (endIdx <= startIdx) return null

  const startX = xData[startIdx] ?? 0
  const endX   = xData[endIdx]   ?? 0
  const isDistX = (xData[xData.length-1] ?? 0) > 1000

  const distOrTime = isDistX
    ? fmtDist(endX - startX)
    : fmtDur(endX - startX)
  const label = isDistX ? 'Distance' : 'Durée'

  return (
    <div style={{ margin:'0', padding:'12px 14px', background:'rgba(0,200,224,0.06)', borderBottom:'1px solid rgba(0,200,224,0.2)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#00c8e0', textTransform:'uppercase' as const, letterSpacing:'0.08em' }}>Zone sélectionnée</span>
        <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'#00c8e0' }}>{label} : {distOrTime}</span>
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' as const }}>
        {tracks.map(t => {
          const slice = t.data.slice(startIdx, endIdx+1).filter(v => v>0&&isFinite(v))
          if (!slice.length) return null
          const a = avg(slice), mx = max_v(slice)
          return (
            <div key={t.id}>
              <p style={{ fontSize:9, color:'var(--text-dim)', margin:'0 0 2px', textTransform:'uppercase' as const, letterSpacing:'0.06em' }}>{t.label}</p>
              <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:t.color, margin:0 }}>
                {t.format(a)} <span style={{ fontSize:9, fontWeight:400, color:'var(--text-dim)' }}>moy · max {t.format(mx)}</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// X-axis (shared)
function XAxis({ xData }: { xData: number[] }) {
  if (!xData.length) return null
  const isDistX = (xData[xData.length-1] ?? 0) > 1000
  const ticks = 6
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 12px 8px', borderBottom:'1px solid var(--border)' }}>
      {Array.from({length:ticks},(_,i) => {
        const idx = Math.round((i/(ticks-1))*(xData.length-1))
        const v = xData[idx] ?? 0
        return (
          <span key={i} style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>
            {isDistX ? `${(v/1000).toFixed(1)}km` : fmtDur(v)}
          </span>
        )
      })}
    </div>
  )
}

// Main synchronized chart container
function SyncCharts({ activity }: { activity: Activity }) {
  const [cursor,    setCursor]    = useState<CursorState>({ pct:-1, visible:false })
  const [selection, setSelection] = useState<ChartSelection|null>(null)
  const [dragStart, setDragStart] = useState<number|null>(null)

  const streams = activity.streams ?? {}
  const isBike  = activity.sport==='bike'||activity.sport==='virtual_bike'
  const isRun   = activity.sport==='run'||activity.sport==='trail_run'

  // Build x-axis data: prefer distance, fall back to time
  const xData: number[] = useMemo(() => {
    if (streams.distance?.length) return streams.distance
    if (streams.time?.length)     return streams.time
    // Generate from moving_time_s if no streams
    const t = activity.moving_time_s ?? 3600
    return Array.from({length:120},(_,i)=>Math.round((i/119)*t))
  }, [streams, activity.moving_time_s])

  // Build tracks based on sport and available data
  const tracks: TrackDef[] = useMemo(() => {
    const defs: TrackDef[] = []

    // Altitude — always first if available
    if (streams.altitude?.length) {
      defs.push({
        id:'altitude', label:'Altitude', unit:'m', color:TRACK_COLORS.altitude,
        data: streams.altitude, height:64,
        format: v => `${Math.round(v)}m`,
      })
    }

    if (isBike) {
      if (streams.velocity?.length) defs.push({
        id:'velocity', label:'Vitesse', unit:'km/h', color:TRACK_COLORS.velocity,
        data: streams.velocity.map(v => v*3.6), height:72,
        format: v => `${v.toFixed(1)}`,
      })
      if (streams.watts?.length) defs.push({
        id:'watts', label:'Puissance', unit:'W', color:TRACK_COLORS.watts,
        data: streams.watts, height:80,
        format: v => `${Math.round(v)}`,
      })
      if (streams.heartrate?.length) defs.push({
        id:'heartrate', label:'FC', unit:'bpm', color:TRACK_COLORS.heartrate,
        data: streams.heartrate, height:72,
        format: v => `${Math.round(v)}`,
      })
      if (streams.cadence?.length) defs.push({
        id:'cadence', label:'Cadence', unit:'rpm', color:TRACK_COLORS.cadence,
        data: streams.cadence, height:56,
        format: v => `${Math.round(v)}`,
      })
    }

    if (isRun) {
      // Pace: invert axis (lower = faster = top)
      if (streams.velocity?.length) defs.push({
        id:'pace', label:'Allure', unit:'/km', color:TRACK_COLORS.pace,
        data: streams.velocity.map(v => v>0 ? 1000/v : 0), height:80,
        invert: true,
        format: v => fmtPaceShort(v),
      })
      if (streams.heartrate?.length) defs.push({
        id:'heartrate', label:'FC', unit:'bpm', color:TRACK_COLORS.heartrate,
        data: streams.heartrate, height:72,
        format: v => `${Math.round(v)}`,
      })
      if (streams.cadence?.length) defs.push({
        id:'cadence', label:'Cadence', unit:'spm', color:TRACK_COLORS.cadence,
        data: streams.cadence, height:56,
        format: v => `${Math.round(v)}`,
      })
    }

    if (!isBike && !isRun) {
      if (streams.heartrate?.length) defs.push({
        id:'heartrate', label:'FC', unit:'bpm', color:TRACK_COLORS.heartrate,
        data: streams.heartrate, height:80,
        format: v => `${Math.round(v)}`,
      })
    }

    return defs
  }, [streams, isBike, isRun])

  const hasData = tracks.length > 0

  function onCursorMove(pct: number) {
    setCursor({ pct, visible: pct >= 0 })
    if (dragStart !== null) {
      setSelection({ startPct: Math.min(dragStart,pct), endPct: Math.max(dragStart,pct) })
    }
  }
  function onSelectStart(pct: number) { setDragStart(pct); setSelection(null) }
  function onSelectMove(pct: number) {
    if (dragStart !== null) setSelection({ startPct: Math.min(dragStart,pct), endPct: Math.max(dragStart,pct) })
  }
  function onSelectEnd() { setDragStart(null) }
  function clearSelection() { setSelection(null); setDragStart(null) }

  if (!hasData) return (
    <div style={{ padding:'32px 16px', textAlign:'center' as const }}>
      <p style={{ fontSize:13, color:'var(--text-dim)' }}>
        Courbes non disponibles — les données de flux (heartrate, pace, power, altitude) ne sont pas encore importées pour cette activité.
      </p>
      <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:8 }}>
        Les données de flux sont disponibles via Strava Connect ou Garmin Connect.
      </p>
    </div>
  )

  const trackProps = { xData, cursor, selection, onCursorMove, onSelectStart, onSelectMove, onSelectEnd }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg-card2)' }}>
        <p style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:0 }}>
          Courbes · {tracks.length} métrique{tracks.length>1?'s':''}
        </p>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {tracks.map(t => (
            <span key={t.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10 }}>
              <span style={{ width:16, height:2, background:t.color, display:'inline-block', borderRadius:1 }}/>
              <span style={{ color:'var(--text-dim)' }}>{t.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Instruction */}
      {!selection && (
        <div style={{ padding:'5px 14px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:0 }}>Survolez pour inspecter · Cliquez-glissez pour sélectionner une zone</p>
        </div>
      )}

      {/* Cursor tooltip */}
      <CursorTooltip tracks={tracks} cursor={cursor} xData={xData} sport={activity.sport}/>

      {/* Selection stats */}
      {selection && (selection.endPct - selection.startPct) > 0.01 && (
        <SelectionStats tracks={tracks} xData={xData} selection={selection} sport={activity.sport}/>
      )}

      {/* Tracks */}
      <div style={{ background:'var(--bg-card)' }}>
        {tracks.map(track => (
          <ChartTrack key={track.id} track={track} {...trackProps}/>
        ))}
      </div>

      {/* X-axis */}
      <XAxis xData={xData}/>

      {/* Reset */}
      {selection && (
        <div style={{ padding:'8px 14px' }}>
          <button onClick={clearSelection} style={{ fontSize:10, color:'#00c8e0', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Réinitialiser la sélection
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// HR ZONE BAR
// ══════════════════════════════════════════════════════════
function HrZoneBar({ hrStream, zones, totalS }: { hrStream:number[]; zones:Zone[]; totalS:number }) {
  const times = [0,0,0,0,0]
  hrStream.forEach((v:number) => { times[getZoneIdx(v, zones)]++ })
  const total = hrStream.length || 1
  const totalMins = times.map(t => Math.round((t/total)*(totalS/60)))
  const totalPcts = times.map(t => Math.round((t/total)*100))

  return (
    <div>
      <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', gap:1, marginBottom:10 }}>
        {totalPcts.map((pct, i) => pct>=1 ? <div key={i} style={{ width:`${pct}%`, background:ZONE_COLORS[i] }}/> : null)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5 }}>
        {zones.map((z, i) => (
          <div key={i} style={{ textAlign:'center' as const, padding:'7px 4px', borderRadius:8, background:`${ZONE_COLORS[i]}0d`, border:`1px solid ${ZONE_COLORS[i]}2a` }}>
            <p style={{ fontSize:8, fontWeight:700, color:ZONE_COLORS[i], margin:'0 0 2px', textTransform:'uppercase' as const }}>{z.label}</p>
            <p style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:'var(--text)', margin:0 }}>{totalMins[i]}min</p>
            <p style={{ fontSize:8, color:'var(--text-dim)', margin:'1px 0 0' }}>{totalPcts[i]}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// GYM ENRICHMENT
// ══════════════════════════════════════════════════════════
function GymEnrichment({ exercises, onChange }: { exercises:GymExercise[]; onChange:(e:GymExercise[])=>void }) {
  const [section, setSection] = useState<'upper'|'lower'|'cardio'|'other'>('upper')
  const sections = [
    {id:'upper' as const, label:'Haut',   list:GYM_UPPER},
    {id:'lower' as const, label:'Bas',    list:GYM_LOWER},
    {id:'cardio' as const,label:'Cardio', list:GYM_CARDIO},
    {id:'other' as const, label:'Autre',  list:GYM_OTHER},
  ]
  const cur = sections.find(s=>s.id===section)!
  const filtered = exercises.filter(e=>e.category===section)

  function add(name:string) { onChange([...exercises,{id:uid(),name,category:section,sets:[{reps:0,weight:0}]}]) }
  function addSet(id:string) { onChange(exercises.map(e=>e.id===id?{...e,sets:[...e.sets,{reps:0,weight:0}]}:e)) }
  function dupSet(id:string,si:number) { onChange(exercises.map(e=>e.id===id?{...e,sets:[...e.sets.slice(0,si+1),{...e.sets[si]},...e.sets.slice(si+1)]}:e)) }
  function updSet(id:string,si:number,field:'reps'|'weight',val:number) { onChange(exercises.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,[field]:val}:s)}:e)) }
  function delSet(id:string,si:number) { onChange(exercises.map(e=>e.id===id?{...e,sets:e.sets.filter((_,i)=>i!==si)}:e)) }
  function del(id:string) { onChange(exercises.filter(e=>e.id!==id)) }

  return (
    <div>
      <div style={{ display:'flex', gap:5, marginBottom:14 }}>
        {sections.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{ padding:'5px 12px',borderRadius:9,border:'1px solid',cursor:'pointer',fontSize:11,borderColor:section===s.id?'#ffb340':'var(--border)',background:section===s.id?'rgba(255,179,64,0.10)':'var(--bg-card2)',color:section===s.id?'#ffb340':'var(--text-mid)',fontWeight:section===s.id?600:400 }}>
            {s.label} {exercises.filter(e=>e.category===s.id).length>0&&<span style={{ fontSize:9,background:'#ffb340',color:'#000',borderRadius:999,padding:'0 4px',marginLeft:3 }}>{exercises.filter(e=>e.category===s.id).length}</span>}
          </button>
        ))}
      </div>
      <div style={{ display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:14 }}>
        {cur.list.map(name=><button key={name} onClick={()=>add(name)} style={{ padding:'4px 10px',borderRadius:8,border:'1px dashed var(--border)',background:'transparent',color:'var(--text-dim)',fontSize:11,cursor:'pointer' }}>+ {name}</button>)}
      </div>
      {filtered.length===0&&<p style={{ fontSize:12,color:'var(--text-dim)',textAlign:'center' as const,padding:'14px 0' }}>Aucun exercice dans cette section.</p>}
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {filtered.map(ex=>(
          <div key={ex.id} style={{ padding:'12px 14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0 }}>{ex.name}</p>
              <button onClick={()=>del(ex.id)} style={{ background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:15 }}>✕</button>
            </div>
            {section==='cardio'?(
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Durée</p><input type="text" value={ex.cardioTime??''} onChange={e=>onChange(exercises.map(x=>x.id===ex.id?{...x,cardioTime:e.target.value}:x))} placeholder="10:00" style={{ width:'100%',padding:'6px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>
                {['Rameur','SkiErg'].includes(ex.name)&&<div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Distance (m)</p><input type="number" value={ex.cardioDist??''} onChange={e=>onChange(exercises.map(x=>x.id===ex.id?{...x,cardioDist:parseInt(e.target.value)||0}:x))} placeholder="2000" style={{ width:'100%',padding:'6px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>}
                {ex.name==='Vélo'&&<div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Watts</p><input type="number" value={ex.cardioWatts??''} onChange={e=>onChange(exercises.map(x=>x.id===ex.id?{...x,cardioWatts:parseInt(e.target.value)||0}:x))} placeholder="200" style={{ width:'100%',padding:'6px 9px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>}
              </div>
            ):(
              <div>
                <div style={{ display:'grid',gridTemplateColumns:'32px 1fr 1fr auto auto',gap:5,marginBottom:5 }}>
                  <span style={{ fontSize:9,color:'var(--text-dim)',textAlign:'center' as const }}>#</span>
                  <span style={{ fontSize:9,color:'var(--text-dim)' }}>Reps</span>
                  <span style={{ fontSize:9,color:'var(--text-dim)' }}>Charge (kg)</span>
                  <span/><span/>
                </div>
                {ex.sets.map((s,si)=>(
                  <div key={si} style={{ display:'grid',gridTemplateColumns:'32px 1fr 1fr auto auto',gap:5,marginBottom:5 }}>
                    <span style={{ fontSize:11,color:'var(--text-dim)',textAlign:'center' as const,margin:'auto 0',fontFamily:'DM Mono,monospace' }}>{si+1}</span>
                    <input type="number" value={s.reps||''} onChange={e=>updSet(ex.id,si,'reps',parseInt(e.target.value)||0)} placeholder="10" style={{ padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/>
                    <input type="number" value={s.weight||''} onChange={e=>updSet(ex.id,si,'weight',parseFloat(e.target.value)||0)} placeholder="60" style={{ padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/>
                    <button onClick={()=>dupSet(ex.id,si)} style={{ padding:'5px 8px',borderRadius:7,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer' }}>⎘</button>
                    <button onClick={()=>delSet(ex.id,si)} style={{ padding:'5px 8px',borderRadius:7,background:'rgba(255,95,95,0.08)',border:'1px solid rgba(255,95,95,0.2)',color:'#ff5f5f',fontSize:10,cursor:'pointer' }}>✕</button>
                  </div>
                ))}
                <button onClick={()=>addSet(ex.id)} style={{ marginTop:4,padding:'5px 12px',borderRadius:8,background:'rgba(0,200,224,0.07)',border:'1px dashed rgba(0,200,224,0.3)',color:'#00c8e0',fontSize:10,cursor:'pointer',width:'100%' }}>+ Série</button>
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
function calcPaceFromTimeAndDist(timeStr:string,distM:number):string {
  if(!timeStr||!distM)return '—'
  const p=timeStr.split(':').map(Number)
  const s=p.length===2?p[0]*60+p[1]:p[0]*3600+p[1]*60+(p[2]||0)
  if(!s)return '—'
  const sk=s/(distM/1000)
  return `${Math.floor(sk/60)}:${String(Math.round(sk%60)).padStart(2,'0')}/km`
}

function HyroxEnrichment({ stations, runs, onChange }:{stations:HyroxStation[];runs:string[];onChange:(s:HyroxStation[],r:string[])=>void}) {
  const [sd,setSd]=useState<HyroxStation[]>(HYROX_STATIONS.map(n=>stations.find(s=>s.name===n)??{name:n}))
  const [rd,setRd]=useState<string[]>(runs.length===8?runs:Array(8).fill(''))
  function upd(i:number,patch:Partial<HyroxStation>){const u=sd.map((s,idx)=>idx===i?{...s,...patch}:s);setSd(u);onChange(u,rd)}
  function updRun(i:number,val:string){const u=[...rd];u[i]=val;setRd(u);onChange(sd,u)}
  return(
    <div>
      <p style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 12px' }}>Stations</p>
      <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>
        {sd.map((s,i)=>(
          <div key={s.name} style={{ padding:'10px 13px',borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <div style={{ width:22,height:22,borderRadius:6,background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#ef4444',flexShrink:0 }}>{i+1}</div>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:700,margin:0 }}>{s.name}</p>
              {(s.time||s.reps||s.distance)&&<span style={{ marginLeft:'auto',fontSize:8,padding:'1px 5px',borderRadius:20,background:'rgba(34,197,94,0.10)',color:'#22c55e',fontWeight:700 }}>✓</span>}
            </div>
            {['SkiErg','Rowing'].includes(s.name)&&(
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6 }}>
                <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Temps</p><input value={s.time??''} onChange={e=>upd(i,{time:e.target.value})} placeholder="7:30" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>
                <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Distance (m)</p><input type="number" value={s.distance??''} onChange={e=>upd(i,{distance:parseInt(e.target.value)||0})} placeholder="1000" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>
                <div style={{ padding:'6px 8px',borderRadius:7,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.2)' }}><p style={{ fontSize:8,color:'var(--text-dim)',margin:'0 0 2px' }}>Allure</p><p style={{ fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:'#00c8e0',margin:0 }}>{s.time&&s.distance?calcPaceFromTimeAndDist(s.time,s.distance):'—'}</p></div>
              </div>
            )}
            {['Sled Push','Sled Pull','Farmer Carry','Sandbag Lunges'].includes(s.name)&&(
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Distance (m)</p><input type="number" value={s.distance??''} onChange={e=>upd(i,{distance:parseInt(e.target.value)||0})} placeholder="25" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>
                <div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Charge (kg)</p><input type="number" value={s.weight??''} onChange={e=>upd(i,{weight:parseInt(e.target.value)||0})} placeholder="40" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>
              </div>
            )}
            {s.name==='Wall Balls'&&<div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}><div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Reps</p><input type="number" value={s.reps??''} onChange={e=>upd(i,{reps:parseInt(e.target.value)||0})} placeholder="100" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div><div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Charge (kg)</p><input type="number" value={s.weight??''} onChange={e=>upd(i,{weight:parseInt(e.target.value)||0})} placeholder="6" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div></div>}
            {s.name==='Burpee Broad Jump'&&<div><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Reps</p><input type="number" value={s.reps??''} onChange={e=>upd(i,{reps:parseInt(e.target.value)||0})} placeholder="80" style={{ width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>}
          </div>
        ))}
      </div>
      <p style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 10px' }}>Runs compromised (8 × 1km)</p>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6 }}>
        {rd.map((r,i)=>(
          <div key={i}><p style={{ fontSize:9,color:'var(--text-dim)',marginBottom:3 }}>Run {i+1}</p><input value={r} onChange={e=>updRun(i,e.target.value)} placeholder="4:30" style={{ width:'100%',padding:'6px 7px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:11,outline:'none' }}/></div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ACTIVITY DETAIL
// ══════════════════════════════════════════════════════════
function ActivityDetail({ activity: initial, onClose, onUpdate }: {
  activity:Activity; onClose:()=>void; onUpdate:(a:Activity)=>void
}) {
  const [tab,     setTab]     = useState<DetailTab>('overview')
  const [feeling, setFeeling] = useState(initial.feeling ?? 0)
  const [notes,   setNotes]   = useState(initial.userNotes ?? '')
  const [gymExs,  setGymExs]  = useState<GymExercise[]>(initial.gymExercises ?? [])
  const [hyroxS,  setHyroxS]  = useState<HyroxStation[]>(initial.hyroxStations ?? [])
  const [hyroxR,  setHyroxR]  = useState<string[]>(initial.hyroxRuns ?? [])
  const [saving,  setSaving]  = useState(false)
  const [activity,setActivity]= useState(initial)

  const zones     = defaultZones()
  const intervals = useMemo(()=>detectIntervals(activity),[activity])
  const analysis  = useMemo(()=>generateAnalysis(activity,activity.streams),[activity])

  const sport  = activity.sport
  const isBike = sport==='bike'||sport==='virtual_bike'
  const isRun  = sport==='run'||sport==='trail_run'
  const isSwim = sport==='swim'
  const isGym  = sport==='gym'
  const isHyrox= sport==='hyrox'
  const statusCfg = STATUS_CFG[activity.status]
  const date = new Date(activity.started_at)

  // VAP: virtual adjusted pace (grade adjusted)
  const vap = activity.avg_pace_s_km && activity.elevation_gain_m && activity.distance_m
    ? activity.avg_pace_s_km * (1 - (activity.elevation_gain_m / activity.distance_m) * 0.035)
    : null

  async function save() {
    setSaving(true)
    const upd: Activity = {
      ...activity, userNotes:notes, feeling, rpe:feeling,
      gymExercises:gymExs, hyroxStations:hyroxS, hyroxRuns:hyroxR,
      status: (gymExs.length>0||hyroxS.some(s=>s.time||s.reps)||notes) ? 'completed' : activity.status,
      raw_data: {...activity.raw_data, gymExercises:gymExs, hyroxStations:hyroxS, hyroxRuns:hyroxR},
    }
    onUpdate(upd); setActivity(upd); setSaving(false); setTab('overview')
  }

  const TABS: [DetailTab,string][] = [
    ['overview', 'Vue d\'ensemble'],
    ...(!isGym&&!isSwim ? [['charts','Courbes']] as [DetailTab,string][] : []),
    ...(intervals.length>0 ? [['intervals','Intervalles']] as [DetailTab,string][] : []),
    ['enrich', isGym?'Séance':isHyrox?'Hyrox':'Enrichir'],
  ]

  // ── stat value style
  function val(v: string|null|undefined, color='var(--text)'): React.ReactNode {
    if (!v||v==='—') return <span style={{ fontFamily:'DM Mono,monospace',fontSize:22,fontWeight:700,color:'var(--text-dim)' }}>—</span>
    return <span style={{ fontFamily:'DM Mono,monospace',fontSize:22,fontWeight:700,color }}>{v}</span>
  }
  function subval(v: string): React.ReactNode {
    return <span style={{ fontFamily:'DM Mono,monospace',fontSize:11,color:'var(--text-dim)',marginLeft:4 }}>{v}</span>
  }

  // ── Stats grid component
  function StatBox({ label, main, sub, note, color='var(--text)' }: { label:string;main:string|null|undefined;sub?:string;note?:string;color?:string }) {
    return (
      <div style={{ padding:'10px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',minWidth:0 }}>
        <p style={{ fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 5px' }}>{label}</p>
        <div style={{ display:'flex',alignItems:'baseline',gap:4,flexWrap:'wrap' as const }}>
          {val(main,color)}
          {sub&&subval(sub)}
        </div>
        {note&&<p style={{ fontSize:9,color:'var(--text-dim)',margin:'3px 0 0' }}>{note}</p>}
      </div>
    )
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'var(--bg)',overflowY:'auto' }}>
      <div style={{ maxWidth:'100%',margin:'0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',position:'sticky',top:0,zIndex:10 }}>
          <button onClick={onClose} style={{ width:36,height:36,borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'var(--text-dim)',flexShrink:0 }}>←</button>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:800,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,letterSpacing:'-0.02em' }}>{activity.title}</p>
              {activity.is_race&&<span style={{ fontSize:8,padding:'1px 6px',borderRadius:20,background:'rgba(239,68,68,0.10)',color:'#ef4444',fontWeight:700,flexShrink:0,border:'1px solid rgba(239,68,68,0.25)' }}>COMPÉTITION</span>}
            </div>
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:'2px 0 0' }}>
              {date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
              <span style={{ margin:'0 6px',color:'var(--border)' }}>·</span>{PROVIDER_LABEL[activity.provider]??activity.provider}
              <span style={{ marginLeft:8,padding:'1px 5px',borderRadius:20,background:statusCfg.bg,border:`1px solid ${statusCfg.color}33`,color:statusCfg.color,fontSize:8,fontWeight:700 }}>{statusCfg.label}</span>
            </p>
          </div>
        </div>

        <div style={{ maxWidth:1100,margin:'0 auto',padding:'0 0 40px' }}>

          {/* ── Tabs ── */}
          <div style={{ display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-card)' }}>
            {TABS.map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ padding:'11px 18px',border:'none',cursor:'pointer',fontSize:12,fontWeight:tab===id?700:400,background:'transparent',color:tab===id?SPORT_COLOR[sport]:'var(--text-dim)',borderBottom:tab===id?`2px solid ${SPORT_COLOR[sport]}`:'2px solid transparent',transition:'all 0.15s',whiteSpace:'nowrap' as const }}>
                {label}
              </button>
            ))}
          </div>

          {/* ═══ OVERVIEW ═══ */}
          {tab==='overview' && (
            <div style={{ padding:'20px' }}>

              {/* Run stats */}
              {isRun && (
                <>
                  {/* Desktop: single row */}
                  <div className="hidden md:grid" style={{ gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:12 }}>
                    <StatBox label="Durée"       main={activity.moving_time_s?fmtDur(activity.moving_time_s):null}/>
                    <StatBox label="Distance"    main={fmtDist(activity.distance_m)} color={SPORT_COLOR[sport]}/>
                    <StatBox label="Allure moy." main={activity.avg_pace_s_km?fmtPace(activity.avg_pace_s_km):null} sub={activity.avg_speed_ms?`${fmtSpeed(activity.avg_speed_ms)}`:undefined}/>
                    <StatBox label="VAP"         main={vap?fmtPace(vap):null} sub={vap&&activity.avg_speed_ms?`${((1000/vap)*3.6).toFixed(1)}km/h`:undefined}/>
                    <StatBox label="Dénivelé +"  main={(activity.elevation_gain_m??0)>0?`${Math.round(activity.elevation_gain_m!)} m`:null}/>
                    <StatBox label="Cadence"     main={activity.avg_cadence?`${Math.round(activity.avg_cadence)} spm`:null}/>
                  </div>
                  <div className="hidden md:grid" style={{ gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16 }}>
                    <StatBox label="RPE" main={feeling>0?`${feeling}/10`:null} color="#a855f7"/>
                    <StatBox label="FC moy." main={activity.avg_hr?`${Math.round(activity.avg_hr)} bpm`:null} sub={activity.max_hr&&activity.avg_hr?`${Math.round((activity.avg_hr/activity.max_hr)*100)}% FC max`:undefined} color="#ef4444" note={activity.max_hr?`FC max : ${Math.round(activity.max_hr)} bpm`:undefined}/>
                    <div/>
                    <div/>
                  </div>
                  {/* Mobile: 2 cols */}
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:12 }}>
                    <StatBox label="Durée"      main={activity.moving_time_s?fmtDur(activity.moving_time_s):null}/>
                    <StatBox label="Distance"   main={fmtDist(activity.distance_m)} color={SPORT_COLOR[sport]}/>
                    <StatBox label="Allure moy." main={activity.avg_pace_s_km?fmtPace(activity.avg_pace_s_km):null} sub={activity.avg_speed_ms?`${fmtSpeed(activity.avg_speed_ms)}`:undefined}/>
                    <StatBox label="VAP"        main={vap?fmtPace(vap):null}/>
                    <StatBox label="Dénivelé +" main={(activity.elevation_gain_m??0)>0?`${Math.round(activity.elevation_gain_m!)} m`:null}/>
                    <StatBox label="Cadence"    main={activity.avg_cadence?`${Math.round(activity.avg_cadence)} spm`:null}/>
                    <StatBox label="RPE"        main={feeling>0?`${feeling}/10`:null} color="#a855f7"/>
                    <StatBox label="FC moy."    main={activity.avg_hr?`${Math.round(activity.avg_hr)} bpm`:null} sub={activity.max_hr&&activity.avg_hr?`${Math.round((activity.avg_hr/activity.max_hr)*100)}%`:undefined} color="#ef4444" note={activity.max_hr?`max ${Math.round(activity.max_hr)} bpm`:undefined}/>
                  </div>
                </>
              )}

              {/* Bike stats */}
              {isBike && (
                <>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:7,marginBottom:7 }}>
                    <StatBox label="Durée"      main={activity.moving_time_s?fmtDur(activity.moving_time_s):null}/>
                    <StatBox label="Distance"   main={fmtDist(activity.distance_m)} color={SPORT_COLOR[sport]}/>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:7 }}>
                    <StatBox label="Vitesse moy." main={activity.avg_speed_ms?fmtSpeed(activity.avg_speed_ms):null} sub={activity.max_speed_ms?`max ${fmtSpeed(activity.max_speed_ms)}`:undefined}/>
                    <StatBox label="Dénivelé +"   main={(activity.elevation_gain_m??0)>0?`${Math.round(activity.elevation_gain_m!)} m`:null}/>
                    <div/>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:16 }}>
                    <StatBox label="Puissance moy."  main={activity.avg_watts?`${Math.round(activity.avg_watts)} W`:null} color="#3b82f6"/>
                    <StatBox label="Puissance norm."  main={activity.normalized_watts?`${Math.round(activity.normalized_watts)} W`:null} color="#3b82f6"/>
                    <StatBox label="RPE"             main={feeling>0?`${feeling}/10`:null} color="#a855f7"/>
                    <StatBox label="FC moy."         main={activity.avg_hr?`${Math.round(activity.avg_hr)} bpm`:null} sub={activity.max_hr&&activity.avg_hr?`${Math.round((activity.avg_hr/activity.max_hr)*100)}%`:undefined} color="#ef4444" note={activity.max_hr?`max ${Math.round(activity.max_hr)} bpm`:undefined}/>
                  </div>
                </>
              )}

              {/* Swim */}
              {isSwim && (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:7,marginBottom:16 }}>
                  <StatBox label="Distance"     main={fmtDist(activity.distance_m)} color="#38bdf8"/>
                  <StatBox label="Durée"        main={activity.moving_time_s?fmtDur(activity.moving_time_s):null}/>
                  <StatBox label="Allure /100m" main={activity.avg_pace_s_km?fmtPace(activity.avg_pace_s_km/10):null} color="#38bdf8"/>
                  <StatBox label="FC moy."      main={activity.avg_hr?`${Math.round(activity.avg_hr)} bpm`:null} color="#ef4444"/>
                </div>
              )}

              {/* Other / gym / hyrox */}
              {!isRun&&!isBike&&!isSwim && (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:7,marginBottom:16 }}>
                  {activity.moving_time_s&&<StatBox label="Durée"    main={fmtDur(activity.moving_time_s)}/>}
                  {activity.distance_m&&  <StatBox label="Distance"  main={fmtDist(activity.distance_m)} color={SPORT_COLOR[sport]}/>}
                  {activity.avg_hr&&      <StatBox label="FC moy."   main={`${Math.round(activity.avg_hr)} bpm`} color="#ef4444"/>}
                  {activity.calories&&    <StatBox label="Calories"  main={`${Math.round(activity.calories)} kcal`}/>}
                </div>
              )}

              {/* TSS if available */}
              {activity.tss && activity.tss > 0 && (
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:16 }}>
                  <StatBox label="TSS"      main={`${Math.round(activity.tss)}`} color="#5b6fff"/>
                  {activity.calories&&<StatBox label="Calories" main={`${Math.round(activity.calories)} kcal`}/>}
                </div>
              )}

              {/* Analysis */}
              <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:16 }}>
                <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 9px' }}>Analyse</p>
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {analysis.map((line,i)=><p key={i} style={{ fontSize:12,color:'var(--text-mid)',lineHeight:1.65,margin:0,borderLeft:`2px solid ${SPORT_COLOR[sport]}`,paddingLeft:10 }}>{line}</p>)}
                </div>
              </div>

              {/* HR Zones */}
              {(isRun||isBike) && activity.avg_hr && (activity.streams?.heartrate?.length ?? 0) > 0 && (
                <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:16 }}>
                  <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 11px' }}>Répartition zones FC</p>
                  <HrZoneBar hrStream={activity.streams!.heartrate!} zones={zones.hr} totalS={activity.moving_time_s??3600}/>
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div style={{ padding:'12px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:16 }}>
                  <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 7px' }}>Notes</p>
                  <p style={{ fontSize:12,color:'var(--text-mid)',lineHeight:1.7,margin:0 }}>{notes}</p>
                </div>
              )}

              {/* Hyrox summary */}
              {isHyrox && hyroxS.filter(s=>s.time||s.reps||s.distance).length>0 && (
                <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:16 }}>
                  <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 11px' }}>Stations</p>
                  {hyroxS.filter(s=>s.time||s.reps||s.distance).map((s,i)=>(
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 10px',borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',marginBottom:5 }}>
                      <span style={{ fontSize:9,fontWeight:800,color:'#ef4444',width:18,flexShrink:0 }}>{i+1}</span>
                      <span style={{ flex:1,fontSize:12,fontWeight:600 }}>{s.name}</span>
                      <span style={{ fontFamily:'DM Mono,monospace',fontSize:11,color:'#ef4444',fontWeight:700 }}>
                        {[s.time,s.reps?`${s.reps} reps`:null,s.weight?`${s.weight}kg`:null,s.distance?`${s.distance}m`:null].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ CHARTS ═══ */}
          {tab==='charts' && (
            <div style={{ background:'var(--bg-card)',borderTop:'1px solid var(--border)' }}>
              <SyncCharts activity={activity}/>
            </div>
          )}

          {/* ═══ INTERVALS ═══ */}
          {tab==='intervals' && (
            <div style={{ padding:'20px' }}>
              {intervals.length===0?(
                <p style={{ fontSize:13,color:'var(--text-dim)',textAlign:'center' as const,padding:'24px 0' }}>Aucun intervalle détecté — données de laps non disponibles.</p>
              ):(
                <div>
                  <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px' }}>{intervals.length} bloc{intervals.length>1?'s':''} détecté{intervals.length>1?'s':''}</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {intervals.map((iv,i)=>(
                      <div key={i} style={{ display:'grid',gridTemplateColumns:'28px 1fr repeat(4,auto)',gap:8,alignItems:'center',padding:'10px 13px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                        <span style={{ fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:'var(--text-dim)',textAlign:'center' as const }}>{iv.index}</span>
                        <span style={{ fontSize:12,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{iv.label}</span>
                        <span style={{ fontFamily:'DM Mono,monospace',fontSize:12,color:'var(--text)' }}>{fmtDur(iv.durationS)}</span>
                        <span style={{ fontFamily:'DM Mono,monospace',fontSize:12,color:'var(--text)' }}>{fmtDist(iv.distM)}</span>
                        {iv.avgHr>0&&<span style={{ fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:600,color:'#ef4444' }}>{Math.round(iv.avgHr)} bpm</span>}
                        {isBike&&iv.avgWatts>0?<span style={{ fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:600,color:'#3b82f6' }}>{Math.round(iv.avgWatts)} W</span>
                        :iv.avgPace>0?<span style={{ fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:600,color:'#22c55e' }}>{fmtPace(iv.avgPace)}</span>
                        :<span/>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ENRICH ═══ */}
          {tab==='enrich' && (
            <div style={{ padding:'20px' }}>
              {/* RPE */}
              <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:14 }}>
                <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 12px' }}>Ressenti · RPE</p>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                  <span style={{ fontSize:11,color:'var(--text-dim)' }}>Effort perçu (1–10)</span>
                  <span style={{ fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:feeling===0?'var(--text-dim)':feeling<=3?'#22c55e':feeling<=6?'#ffb340':'#ef4444' }}>{feeling>0?`${feeling}/10`:'—'}</span>
                </div>
                <input type="range" min={1} max={10} step={0.5} value={feeling||5} onChange={e=>setFeeling(parseFloat(e.target.value))} style={{ width:'100%',accentColor:'#00c8e0',cursor:'pointer' }}/>
                <div style={{ display:'flex',justifyContent:'space-between',marginTop:3 }}>
                  <span style={{ fontSize:9,color:'var(--text-dim)' }}>Très facile</span>
                  <span style={{ fontSize:9,color:'var(--text-dim)' }}>Maximum</span>
                </div>
              </div>

              {/* Notes */}
              <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:14 }}>
                <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 9px' }}>Notes personnelles</p>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Sensations, points à retenir, observations..." rows={3} style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',resize:'none' as const,lineHeight:1.65 }}/>
              </div>

              {isGym && (
                <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:14 }}>
                  <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px' }}>Exercices</p>
                  <GymEnrichment exercises={gymExs} onChange={setGymExs}/>
                </div>
              )}
              {isHyrox && (
                <div style={{ padding:'14px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)',marginBottom:14 }}>
                  <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 14px' }}>Détail Hyrox</p>
                  <HyroxEnrichment stations={hyroxS} runs={hyroxR} onChange={(s,r)=>{setHyroxS(s);setHyroxR(r)}}/>
                </div>
              )}

              <button onClick={save} disabled={saving} style={{ width:'100%',padding:'13px',borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1 }}>
                {saving?'Sauvegarde...':'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
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
  const isBike    = sport==='bike'||sport==='virtual_bike'
  const isRun     = sport==='run'||sport==='trail_run'
  const date      = new Date(activity.started_at)

  return (
    <div onClick={onClick} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,marginBottom:6,cursor:'pointer' }}>
      <div style={{ width:42,height:42,borderRadius:10,background:`${SPORT_COLOR[sport]}14`,border:`1px solid ${SPORT_COLOR[sport]}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,flexShrink:0 }}>
        {SPORT_EMOJI[sport]}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:2 }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{activity.title}</p>
          {activity.is_race&&<span style={{ fontSize:8,padding:'1px 5px',borderRadius:20,background:'rgba(239,68,68,0.08)',color:'#ef4444',fontWeight:700,flexShrink:0,border:'1px solid rgba(239,68,68,0.2)' }}>COMPÉT</span>}
        </div>
        <p style={{ fontSize:10,color:'var(--text-dim)',margin:'0 0 5px' }}>
          {date.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </p>
        <div style={{ display:'flex',gap:10,flexWrap:'wrap' as const }}>
          {activity.moving_time_s && activity.moving_time_s>0 && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-mid)',fontWeight:600 }}>{fmtDur(activity.moving_time_s)}</span>}
          {activity.distance_m   && activity.distance_m>0    && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:SPORT_COLOR[sport],fontWeight:600 }}>{fmtDist(activity.distance_m)}</span>}
          {isRun&&activity.avg_pace_s_km&&activity.avg_pace_s_km>0 && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-mid)',fontWeight:600 }}>{fmtPace(activity.avg_pace_s_km)}</span>}
          {isBike&&activity.avg_watts&&activity.avg_watts>0          && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:'var(--text-mid)',fontWeight:600 }}>{Math.round(activity.avg_watts)}W</span>}
          {activity.avg_hr&&activity.avg_hr>0 && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:'#ef4444',fontWeight:600 }}>{Math.round(activity.avg_hr)} bpm</span>}
          {activity.tss&&activity.tss>0       && <span style={{ fontSize:10,fontFamily:'DM Mono,monospace',color:'#5b6fff',fontWeight:600 }}>{Math.round(activity.tss)} TSS</span>}
        </div>
      </div>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0 }}>
        <span style={{ fontSize:8,padding:'2px 6px',borderRadius:20,background:statusCfg.bg,border:`1px solid ${statusCfg.color}28`,color:statusCfg.color,fontWeight:700 }}>{statusCfg.label}</span>
        <span style={{ color:'var(--text-dim)',fontSize:15 }}>›</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function ActivitiesPage() {
  const { activities, loading, total, page, load, updateActivity } = useActivities()
  const [selected,    setSelected]    = useState<Activity|null>(null)
  const [filterSport, setFilterSport] = useState<FilterSport>('all')
  const [filterStatus,setFilterStatus]= useState<FilterStatus>('all')
  const [filterType,  setFilterType]  = useState<FilterType>('all')
  const [search,      setSearch]      = useState('')

  const filtered = useMemo(() => activities.filter(a => {
    if (filterSport  !== 'all' && a.sport  !== filterSport)              return false
    if (filterStatus !== 'all' && a.status !== filterStatus)             return false
    if (filterType==='competition' && !a.is_race)                        return false
    if (filterType==='training'    &&  a.is_race)                        return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [activities, filterSport, filterStatus, filterType, search])

  const now = new Date()
  const thisMonth = activities.filter(a => {
    const d = new Date(a.started_at)
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth()
  })

  // Sport options for dropdown
  const availableSports = Array.from(new Set(activities.map(a=>a.sport)))

  if (selected) return (
    <ActivityDetail activity={selected} onClose={()=>setSelected(null)} onUpdate={upd=>{ updateActivity(upd.id,upd); setSelected(upd) }}/>
  )

  return (
    <div style={{ padding:'22px 20px',maxWidth:'100%' }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,letterSpacing:'-0.03em',margin:0 }}>Activités</h1>
        <p style={{ fontSize:12,color:'var(--text-dim)',margin:'4px 0 0' }}>
          {total>0?`${total} activité${total>1?'s':''}`:'Connectez vos apps pour importer vos séances'}
        </p>
      </div>

      {/* Monthly summary */}
      {thisMonth.length>0 && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16 }}>
          {[
            {l:'Ce mois',v:String(thisMonth.length),c:'#00c8e0'},
            {l:'Volume',v:`${(thisMonth.reduce((s,a)=>s+(a.moving_time_s??0),0)/3600).toFixed(1)}h`,c:'#ffb340'},
            {l:'TSS',v:String(Math.round(thisMonth.reduce((s,a)=>s+(a.tss??0),0))),c:'#5b6fff'},
          ].map(x=>(
            <div key={x.l} style={{ padding:'10px 12px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border)' }}>
              <p style={{ fontSize:9,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 3px' }}>{x.l}</p>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:x.c,margin:0 }}>{x.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position:'relative',marginBottom:10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
          style={{ width:'100%',padding:'9px 14px 9px 36px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:13,outline:'none' }}/>
        <span style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--text-dim)' }}>🔍</span>
        {search&&<button onClick={()=>setSearch('')} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:17 }}>×</button>}
      </div>

      {/* Filters — dropdowns */}
      <div style={{ display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:16 }}>
        <select value={filterSport} onChange={e=>setFilterSport(e.target.value as FilterSport)}
          style={{ padding:'7px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none',cursor:'pointer' }}>
          <option value="all">Tous les sports</option>
          {availableSports.map(s=><option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
        </select>

        <select value={filterType} onChange={e=>setFilterType(e.target.value as FilterType)}
          style={{ padding:'7px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none',cursor:'pointer' }}>
          <option value="all">Entraînement + Compétition</option>
          <option value="training">Entraînement</option>
          <option value="competition">Compétition</option>
        </select>

        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as FilterStatus)}
          style={{ padding:'7px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text)',fontSize:12,outline:'none',cursor:'pointer' }}>
          <option value="all">Tous les statuts</option>
          <option value="imported">Importée</option>
          <option value="completed">Complétée</option>
          <option value="validated">Validée</option>
        </select>
      </div>

      {/* List */}
      {loading&&activities.length===0 ? (
        <div style={{ padding:'40px 0',textAlign:'center' as const,color:'var(--text-dim)',fontSize:13 }}>Chargement...</div>
      ) : filtered.length===0 ? (
        <div style={{ padding:'44px 20px',textAlign:'center' as const,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14 }}>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'0 0 7px' }}>Aucune activité</p>
          <p style={{ fontSize:13,color:'var(--text-dim)',margin:0 }}>
            {search?`Aucun résultat pour "${search}".`:'Connectez Strava, Wahoo ou Polar dans votre profil pour importer vos séances.'}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(a=><ActivityListCard key={a.id} activity={a} onClick={()=>setSelected(a)}/>)}
          {activities.length<total && (
            <button onClick={()=>load(page+1,filterSport!=='all'?filterSport:undefined)} style={{ width:'100%',padding:'11px',borderRadius:11,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer',marginTop:6 }}>
              Charger plus — {total-activities.length} restante{total-activities.length>1?'s':''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
