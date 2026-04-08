'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — light theme
// ─────────────────────────────────────────────────────────────
const T = {
  bg:          '#eef2f7',
  bgAlt:       '#f8fafc',
  surface:     '#ffffff',
  border:      'rgba(0,0,0,0.07)',
  borderMid:   'rgba(0,0,0,0.12)',
  text:        '#0d1117',
  textSub:     'rgba(13,17,23,0.60)',
  textMuted:   'rgba(13,17,23,0.38)',
  accent:      '#00c8e0',
  accentBg:    'rgba(0,200,224,0.08)',
  accentText:  '#0099b8',
  sidebar:     '#ffffff',
  sidebarW:    220,
  topH:        52,
  radius:      16,
  radiusSm:    10,
  shadow:      '0 2px 12px rgba(0,80,160,0.07), 0 1px 3px rgba(0,0,0,0.05)',
  shadowCard:  '0 4px 24px rgba(0,100,150,0.10), 0 1px 4px rgba(0,0,0,0.06)',
  fontDisplay: "'Syne', sans-serif",
  fontBody:    "'DM Sans', sans-serif",
  fontMono:    "'DM Mono', monospace",
} as const

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type SportType = 'run' | 'trail_run' | 'bike' | 'virtual_bike' | 'swim' | 'rowing' | 'hyrox' | 'gym' | 'other'
type TimeFilter = '1w' | '4w' | '6w' | '10w' | '6m' | '1y' | 'all'

interface Activity {
  id:               string
  sport_type:       SportType
  title:            string
  started_at:       string
  distance_m:       number | null
  moving_time_s:    number | null
  elapsed_time_s:   number | null
  elevation_gain_m: number | null
  elevation_loss_m: number | null
  avg_hr:           number | null
  max_hr:           number | null
  min_hr:           number | null
  avg_speed_ms:     number | null
  avg_pace_s_km:    number | null
  avg_watts:        number | null
  max_watts:        number | null
  normalized_watts: number | null
  ftp_at_time:      number | null
  avg_cadence:      number | null
  max_cadence:      number | null
  calories:         number | null
  kilojoules:       number | null
  tss:              number | null
  trimp:            number | null
  intensity_factor: number | null
  suffer_score:     number | null
  aerobic_decoupling: number | null
  avg_temp_c:       number | null
  rpe:              number | null
  perceived_effort: number | null
  notes:            string | null
  description:      string | null
  is_race:          boolean
  trainer:          boolean | null
  provider:         string | null
  gear_name:        string | null
  power_curve:      number[] | null
  pace_curve:       number[] | null
  streams:          StreamData | null
  laps:             LapData[] | null
  [key: string]:    unknown
}

interface StreamData {
  time?:      number[]
  distance?:  number[]
  altitude?:  number[]
  heartrate?: number[]
  velocity?:  number[]
  watts?:     number[]
  cadence?:   number[]
  temp?:      number[]
}

interface LapData {
  lap_index?:    number
  start_index?:  number
  end_index?:    number
  distance_m:    number
  moving_time_s: number
  avg_hr?:       number | null
  avg_speed_ms?: number | null
  avg_watts?:    number | null
}

interface TrainingZoneRow {
  sport: string
  z1_label: string; z1_value: string
  z2_label: string; z2_value: string
  z3_label: string; z3_value: string
  z4_label: string; z4_value: string
  z5_label: string; z5_value: string
  ftp_watts: number | null
  lthr: number | null
  threshold_pace_s_km: number | null
  vma_ms?: number | null
}

interface ParsedZone { label: string; color: string; min: number; max: number }

interface Profile { weight_kg: number | null }

// ─────────────────────────────────────────────────────────────
// SPORT CONFIG (no emojis)
// ─────────────────────────────────────────────────────────────
const SPORT_LABEL: Record<SportType, string> = {
  run: 'Course', trail_run: 'Trail', bike: 'Vélo', virtual_bike: 'Home trainer',
  swim: 'Natation', rowing: 'Aviron', hyrox: 'Hyrox', gym: 'Muscu', other: 'Autre',
}

const SPORT_COLOR: Record<SportType, string> = {
  run: '#22c55e', trail_run: '#f97316', bike: '#3b82f6', virtual_bike: '#60a5fa',
  swim: '#38bdf8', rowing: '#14b8a6', hyrox: '#ef4444', gym: '#ffb340', other: '#94a3b8',
}

const TIME_FILTER_LABEL: Record<TimeFilter, string> = {
  '1w': '1 sem.', '4w': '4 sem.', '6w': '6 sem.', '10w': '10 sem.', '6m': '6 mois', '1y': '1 an', 'all': 'Tout',
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function fmtDur(s: number | null | undefined): string {
  if (!s || s <= 0) return '—'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  if (sec > 0) return `${m}min${String(sec).padStart(2, '0')}`
  return `${m}min`
}

function fmtDist(m: number | null | undefined): string {
  if (!m) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km`
  return `${Math.round(m)} m`
}

function fmtPace(sKm: number | null | undefined): string {
  if (!sKm || sKm <= 0 || sKm > 1800) return '—'
  const m = Math.floor(sKm / 60)
  const s = Math.floor(sKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function isoWeek(d: Date): string {
  return getWeekStart(d).toISOString().slice(0, 10)
}

function cutoffDate(filter: TimeFilter): Date | null {
  const now = new Date()
  const map: Record<TimeFilter, () => Date | null> = {
    '1w':  () => { const d = new Date(now); d.setDate(d.getDate() - 7); return d },
    '4w':  () => { const d = new Date(now); d.setDate(d.getDate() - 28); return d },
    '6w':  () => { const d = new Date(now); d.setDate(d.getDate() - 42); return d },
    '10w': () => { const d = new Date(now); d.setDate(d.getDate() - 70); return d },
    '6m':  () => { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d },
    '1y':  () => { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d },
    'all': () => null,
  }
  return map[filter]()
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function numWeeks(filter: TimeFilter): number {
  const map: Record<TimeFilter, number> = { '1w': 1, '4w': 4, '6w': 6, '10w': 10, '6m': 26, '1y': 52, 'all': 12 }
  return map[filter]
}

const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']

function parseZoneText(text: string): { min: number; max: number } {
  if (!text) return { min: 0, max: Infinity }
  const lt = text.match(/^[<＜](\d+)/)
  if (lt) return { min: 0, max: Number(lt[1]) }
  const gt = text.match(/^[>＞](\d+)/)
  if (gt) return { min: Number(gt[1]), max: Infinity }
  const range = text.match(/(\d+)\D+(\d+)/)
  if (range) return { min: Number(range[1]), max: Number(range[2]) }
  return { min: 0, max: Infinity }
}

function buildZones(row: TrainingZoneRow): ParsedZone[] {
  return [
    { label: row.z1_label, color: ZONE_COLORS[0], ...parseZoneText(row.z1_value) },
    { label: row.z2_label, color: ZONE_COLORS[1], ...parseZoneText(row.z2_value) },
    { label: row.z3_label, color: ZONE_COLORS[2], ...parseZoneText(row.z3_value) },
    { label: row.z4_label, color: ZONE_COLORS[3], ...parseZoneText(row.z4_value) },
    { label: row.z5_label, color: ZONE_COLORS[4], ...parseZoneText(row.z5_value) },
  ]
}

function calcTimeInZones(data: number[], zones: ParsedZone[], sampleRateS = 1): number[] {
  const counts = zones.map(() => 0)
  for (const v of data) {
    for (let i = 0; i < zones.length; i++) {
      if (v >= zones[i].min && v <= zones[i].max) { counts[i]++; break }
    }
  }
  return counts.map(c => c * sampleRateS)
}

function computeFitness(activities: Activity[]): { ctl: number; atl: number; tsb: number } {
  const tssMap = new Map<string, number>()
  for (const a of activities) {
    if (!a.tss) continue
    const d = a.started_at.slice(0, 10)
    tssMap.set(d, (tssMap.get(d) ?? 0) + Number(a.tss))
  }
  const today = new Date()
  let ctl = 0, atl = 0
  const ctlK = 1 / 42, atlK = 1 / 7
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const tss = tssMap.get(dateStr) ?? 0
    ctl = ctl + (tss - ctl) * ctlK
    atl = atl + (tss - atl) * atlK
  }
  return { ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 }
}

// ─────────────────────────────────────────────────────────────
// HOOK: useActivities
// ─────────────────────────────────────────────────────────────
function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sb = createClient()
      const { data, error: err } = await sb
        .from('activities')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(500)
      if (err) throw err
      setActivities((data ?? []) as unknown as Activity[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { activities, loading, error, reload: load }
}

// ─────────────────────────────────────────────────────────────
// HOOK: useWindowWidth
// ─────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(1280)
  useEffect(() => {
    const u = () => setW(window.innerWidth)
    u(); window.addEventListener('resize', u)
    return () => window.removeEventListener('resize', u)
  }, [])
  return w
}

function useTrainingZones() {
  const [zones, setZones] = useState<TrainingZoneRow[]>([])
  useEffect(() => {
    createClient().from('training_zones').select('*').eq('is_current', true)
      .then(({ data }) => setZones((data ?? []) as unknown as TrainingZoneRow[]))
  }, [])
  return zones
}

function useProfile() {
  const [profile, setProfile] = useState<Profile>({ weight_kg: null })
  useEffect(() => {
    createClient().from('profiles').select('weight_kg').limit(1).single()
      .then(({ data }) => { if (data) setProfile(data as Profile) })
  }, [])
  return profile
}

// Reads CTL/ATL/TSB from metrics_daily if rows exist (more accurate than client-side)
function useMetricsDaily(): { ctl: number | null; atl: number | null; tsb: number | null } {
  const [metrics, setMetrics] = useState<{ ctl: number | null; atl: number | null; tsb: number | null }>({ ctl: null, atl: null, tsb: null })
  useEffect(() => {
    createClient().from('metrics_daily').select('ctl,atl,tsb,date')
      .order('date', { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data && (data as Record<string, unknown>).ctl != null) {
          const d = data as { ctl: number; atl: number; tsb: number }
          setMetrics({ ctl: Math.round(d.ctl * 10) / 10, atl: Math.round(d.atl * 10) / 10, tsb: Math.round(d.tsb * 10) / 10 })
        }
      })
  }, [])
  return metrics
}

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px', boxShadow: T.shadow }}>
      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: T.fontDisplay, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.2, fontFamily: T.fontDisplay }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSub, marginTop: 3, fontFamily: T.fontBody }}>{sub}</div>}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? T.accent : T.surface,
        color: active ? '#fff' : T.textSub,
        border: `1px solid ${active ? T.accent : T.border}`,
        borderRadius: 20, padding: '4px 12px', fontSize: 12,
        cursor: 'pointer', fontWeight: active ? 600 : 400, transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 14,
      textTransform: 'uppercase', letterSpacing: 0.9, fontFamily: T.fontDisplay }}>
      {children}
    </div>
  )
}

function TooltipInfo({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: T.border, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.textSub, fontWeight: 700, lineHeight: 1 }}>?</span>
      {show && (
        <div style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: T.text, color: '#fff', fontSize: 11, padding: '8px 10px', borderRadius: 6,
          width: 220, lineHeight: 1.5, zIndex: 999, pointerEvents: 'none', whiteSpace: 'pre-wrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            border: '5px solid transparent', borderTopColor: T.text }} />
        </div>
      )}
    </span>
  )
}

function ZoneBars({ zones, timesS }: { zones: ParsedZone[]; timesS: number[] }) {
  const total = timesS.reduce((a, b) => a + b, 0)
  if (!total) return <div style={{ fontSize: 12, color: T.textMuted }}>Aucune donnée de zone</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {zones.map((z, i) => {
        const t = timesS[i] ?? 0
        const pct = total > 0 ? (t / total) * 100 : 0
        return (
          <div key={z.label} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 52px 40px', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: T.textSub, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color, display: 'inline-block', flexShrink: 0 }} />
              {z.label}
            </div>
            <div style={{ height: 7, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: z.color, borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: T.text, textAlign: 'right', fontWeight: 500 }}>{fmtDur(t)}</div>
            <div style={{ fontSize: 10, color: T.textMuted, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ALTITUDE SPARKLINE
// ─────────────────────────────────────────────────────────────
function AltitudeLine({ alt }: { alt: number[] }) {
  if (alt.length < 2) return null
  const mn = Math.min(...alt), mx = Math.max(...alt)
  const range = mx - mn || 1
  const W = 600, H = 52
  const pts = alt.map((v, i) => `${(i / (alt.length - 1)) * W},${H - ((v - mn) / range) * (H - 4) - 2}`)
  const path = `M${pts.join('L')} L${W},${H} L0,${H}Z`
  return (
    <div style={{ marginBottom: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 52, display: 'block' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="altG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={path} fill="url(#altG)" stroke="#9ca3af" strokeWidth="1.5" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMuted, marginTop: 2 }}>
        <span>{Math.round(mn)} m</span>
        <span>Altitude</span>
        <span>{Math.round(mx)} m</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// STREAM CHART (power / HR / pace)
// ─────────────────────────────────────────────────────────────
function StreamLine({ data, color, label, unit, height = 48 }: {
  data: number[]; color: string; label: string; unit: string; height?: number
}) {
  if (!data || data.length < 2) return null
  const mn = Math.min(...data), mx = Math.max(...data)
  const range = mx - mn || 1
  const W = 600, H = height
  const smooth = (arr: number[], w = 5) => arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - w), i + w + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
  const pts = smooth(data).map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - mn) / range) * (H - 4) - 2}`)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 3 }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SYNC CHARTS (crosshair, HR zone coloring, laps)
// ─────────────────────────────────────────────────────────────
function SyncCharts({ activity, hrZones, powerZones, paceZones }: {
  activity: Activity
  hrZones?: ParsedZone[]
  powerZones?: ParsedZone[]
  paceZones?: ParsedZone[]
}) {
  const s = activity.streams
  if (!s) return null

  const isBike = ['bike','virtual_bike'].includes(activity.sport_type)
  const isRun  = ['run','trail_run'].includes(activity.sport_type)

  const time = s.time ?? []
  const N = time.length
  if (N < 2) return null

  const [cursorPct, setCursorPct] = useState<number | null>(null)
  const [selection, setSelection]  = useState<[number,number] | null>(null)
  const [dragStartPct, setDragStartPct] = useState<number | null>(null)
  const [selectedLap, setSelectedLap]   = useState<number | null>(null)
  const [showSelModal, setShowSelModal]  = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const cursor = cursorPct !== null ? Math.min(N-1, Math.max(0, Math.round(cursorPct * (N-1)))) : null

  function getPct(clientX: number, el: Element): number {
    const rect = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  function handleMove(clientX: number) {
    if (!containerRef.current) return
    const pct = getPct(clientX, containerRef.current)
    setCursorPct(pct)
    if (dragStartPct !== null) {
      const i1 = Math.round(dragStartPct * (N-1))
      const i2 = Math.round(pct * (N-1))
      setSelection([Math.min(i1,i2), Math.max(i1,i2)])
    }
  }

  function handleDown(clientX: number) {
    if (!containerRef.current) return
    setDragStartPct(getPct(clientX, containerRef.current))
    setSelection(null)
    setShowSelModal(false)
  }

  function handleUp() {
    setDragStartPct(null)
    if (selection && selection[1] - selection[0] > 5) setShowSelModal(true)
  }

  function smooth(arr: number[], w = 5): number[] {
    return arr.map((_, i) => {
      const sl = arr.slice(Math.max(0, i - w), i + w + 1)
      return sl.reduce((a, b) => a + b, 0) / sl.length
    })
  }

  function buildFillPath(data: number[], H: number, pad = 4): string {
    if (!data.length) return ''
    const mn = Math.min(...data), mx = Math.max(...data)
    const range = mx - mn || 1
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * 1000
      const y = H - pad - ((v - mn) / range) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M0,${H}L${pts.join('L')}L${1000},${H}Z`
  }

  function buildLinePath(data: number[], H: number, pad = 4): string {
    if (!data.length) return ''
    const mn = Math.min(...data), mx = Math.max(...data)
    const range = mx - mn || 1
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * 1000
      const y = H - pad - ((v - mn) / range) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M${pts.join('L')}`
  }

  function getHrColor(hr: number, zones?: ParsedZone[]): string {
    if (!zones) return '#ef4444'
    for (const z of zones) if (hr >= z.min && hr <= z.max) return z.color
    return ZONE_COLORS[4]
  }

  function getIntensityColor(val: number, max: number): string {
    const pct = max > 0 ? val / max : 0
    if (pct < 0.6) return ZONE_COLORS[0]
    if (pct < 0.7) return ZONE_COLORS[1]
    if (pct < 0.8) return ZONE_COLORS[2]
    if (pct < 0.9) return ZONE_COLORS[3]
    return ZONE_COLORS[4]
  }

  const watts    = s.watts     ? smooth(s.watts)    : null
  const velocity = s.velocity  ? smooth(s.velocity) : null
  const cadence  = s.cadence   ? smooth(s.cadence)  : null
  const hr       = s.heartrate ? smooth(s.heartrate): null
  const alt      = s.altitude  ?? null
  const laps     = activity.laps ?? []

  type Track = {
    label: string; data: number[]; color: string; unit: string; H: number
    isHr?: boolean; isAlt?: boolean; formatY?: (v: number) => string
  }

  const tracks: Track[] = ([
    alt    ? { label: 'Altitude', data: alt, color: '#94a3b8', unit: 'm',     H: 64, isAlt: true, formatY: (v: number) => `${Math.round(v)} m` } : null,
    hr     ? { label: 'FC',       data: hr,  color: '#ef4444', unit: 'bpm',   H: 64, isHr: true,  formatY: (v: number) => `${Math.round(v)} bpm` } : null,
    isBike && watts    ? { label: 'Puissance', data: watts,    color: '#5b6fff', unit: 'W',     H: 72, formatY: (v: number) => `${Math.round(v)} W` } : null,
    isRun  && velocity ? { label: 'Allure',    data: velocity.map(v => v > 0 ? (1000/v) : 0), color: '#22c55e', unit: 's/km', H: 72, formatY: (v: number) => fmtPace(v) } : null,
    cadence ? { label: 'Cadence', data: cadence, color: '#00c8e0', unit: 'rpm', H: 48, formatY: (v: number) => `${Math.round(v)} rpm` } : null,
  ] as (Track|null)[]).filter((t): t is Track => t !== null)

  if (!tracks.length) return null

  // Max intensity for lap coloring
  const maxIntensity = watts ? Math.max(...watts) : hr ? Math.max(...hr) : 1

  // Selection stats
  const selStats = selection ? (() => {
    const [i1, i2] = selection
    const dur = time[i2] - time[i1]
    const sliceDist = s.distance ? s.distance[i2] - s.distance[i1] : null
    const hrSlice = hr ? hr.slice(i1, i2+1) : null
    const wSlice  = watts ? watts.slice(i1, i2+1) : null
    const vSlice  = velocity ? velocity.slice(i1, i2+1).filter(v => v > 0) : null
    const altSlice = alt ? alt.slice(i1, i2+1) : null
    const dPlus  = altSlice ? altSlice.reduce((acc, v, idx) => idx > 0 && v > altSlice[idx-1] ? acc + (v - altSlice[idx-1]) : acc, 0) : null
    const cadSlice = cadence ? cadence.slice(i1, i2+1) : null
    return {
      dur,
      dist: sliceDist,
      hrMoy: hrSlice ? Math.round(avg(hrSlice)) : null,
      hrMax: hrSlice ? Math.round(Math.max(...hrSlice)) : null,
      watts: wSlice ? Math.round(avg(wSlice)) : null,
      pace:  vSlice && vSlice.length ? avg(vSlice.map(v => 1000/v)) : null,
      dPlus: dPlus ? Math.round(dPlus) : null,
      cad:   cadSlice ? Math.round(avg(cadSlice)) : null,
    }
  })() : null

  const selLap = selectedLap !== null && laps[selectedLap] ? laps[selectedLap] : null

  return (
    <div>
      {/* Cursor values bar */}
      {cursor !== null && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap', minHeight: 20,
          background: T.bgAlt, borderRadius: 8, padding: '6px 12px', alignItems: 'center' }}>
          {hr     && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, fontFamily: T.fontMono }}>FC {Math.round(hr[cursor])} bpm</span>}
          {isBike && watts && <span style={{ fontSize: 11, color: '#5b6fff', fontWeight: 600, fontFamily: T.fontMono }}>{Math.round(watts[cursor])} W</span>}
          {isRun && velocity && velocity[cursor] > 0 && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, fontFamily: T.fontMono }}>{fmtPace(1000/velocity[cursor])}</span>}
          {cadence && <span style={{ fontSize: 11, color: '#00c8e0', fontWeight: 600, fontFamily: T.fontMono }}>{Math.round(cadence[cursor])} rpm</span>}
          {alt && <span style={{ fontSize: 11, color: T.textSub, fontWeight: 500, fontFamily: T.fontMono }}>{Math.round(alt[cursor])} m</span>}
          <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 'auto', fontFamily: T.fontMono }}>
            {(() => { const t = time[cursor] - time[0]; const m = Math.floor(t/60); const sec = t%60; return `${m}:${String(sec).padStart(2,'0')}` })()}
          </span>
        </div>
      )}

      {/* Chart container — mouse + touch tracking on this div */}
      <div
        ref={containerRef}
        style={{ position: 'relative', userSelect: 'none', cursor: 'crosshair' }}
        onMouseMove={e => handleMove(e.clientX)}
        onMouseLeave={() => setCursorPct(null)}
        onMouseDown={e => handleDown(e.clientX)}
        onMouseUp={handleUp}
        onTouchStart={e => { e.preventDefault(); handleDown(e.touches[0].clientX) }}
        onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
        onTouchEnd={handleUp}
      >
        {/* Continuous vertical cursor line as overlay div */}
        {cursorPct !== null && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: `${cursorPct * 100}%`,
            width: 1, background: T.text, pointerEvents: 'none', zIndex: 10,
          }} />
        )}

        {/* Selection overlay */}
        {selection && (() => {
          const x1 = (selection[0] / (N-1)) * 100
          const x2 = (selection[1] / (N-1)) * 100
          return (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${x1}%`, width: `${x2-x1}%`,
              background: T.accent, opacity: 0.08, pointerEvents: 'none', zIndex: 9,
            }} />
          )
        })()}

        {/* Tracks */}
        {tracks.map((track) => {
          const mn = Math.min(...track.data), mx = Math.max(...track.data)
          const range = mx - mn || 1
          const fillPath = buildFillPath(track.data, track.H)
          const linePath = buildLinePath(track.data, track.H)

          // Cursor y position for horizontal line
          const cursorY = cursor !== null
            ? track.H - 4 - ((track.data[cursor] - mn) / range) * (track.H - 8)
            : null

          return (
            <div key={track.label} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: track.color, fontWeight: 600 }}>{track.label}</span>
                <span>{track.formatY ? `${track.formatY(mn)} – ${track.formatY(mx)}` : `${Math.round(mn)} – ${Math.round(mx)} ${track.unit}`}</span>
              </div>
              <svg
                viewBox={`0 0 1000 ${track.H}`}
                style={{ width: '100%', height: track.H, display: 'block', overflow: 'visible' }}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`fill-${track.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={track.color} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={track.color} stopOpacity="0.03"/>
                  </linearGradient>
                </defs>

                {/* Lap rectangles on altitude track */}
                {track.isAlt && laps.map((lap, li) => {
                  const si = lap.start_index ?? 0
                  const ei = lap.end_index ?? (li < laps.length - 1 ? (laps[li+1].start_index ?? N-1) : N-1)
                  const lx1 = (si / (N-1)) * 1000
                  const lx2 = (ei / (N-1)) * 1000
                  const lapIntensity = lap.avg_watts ?? lap.avg_hr ?? 0
                  const lapColor = getIntensityColor(Number(lapIntensity), maxIntensity)
                  const barH = 12
                  return (
                    <rect key={li}
                      x={lx1} y={track.H - barH} width={Math.max(2, lx2 - lx1)} height={barH}
                      fill={lapColor} fillOpacity="0.7"
                      onClick={() => setSelectedLap(selectedLap === li ? null : li)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                })}

                {/* HR segments (zone-colored line) */}
                {track.isHr && hr && (() => {
                  const segments: { x1: number; x2: number; color: string; y1: number; y2: number }[] = []
                  for (let i = 1; i < hr.length; i++) {
                    const sx1 = ((i-1) / (N-1)) * 1000
                    const sx2 = (i / (N-1)) * 1000
                    const sy1 = track.H - 4 - ((hr[i-1] - mn) / range) * (track.H - 8)
                    const sy2 = track.H - 4 - ((hr[i] - mn) / range) * (track.H - 8)
                    segments.push({ x1: sx1, x2: sx2, color: getHrColor(hr[i], hrZones), y1: sy1, y2: sy2 })
                  }
                  return (
                    <>
                      {/* Fill under HR line */}
                      <path d={fillPath} fill={`url(#fill-${track.label})`} />
                      {/* Colored line segments */}
                      {segments.map((seg, si) => (
                        <line key={si} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                          stroke={seg.color} strokeWidth="2" />
                      ))}
                      {/* Average dashed line */}
                      {(() => {
                        const mean = hr.reduce((a, b) => a + b, 0) / hr.length
                        const y = track.H - 4 - ((mean - mn) / range) * (track.H - 8)
                        return <line x1={0} y1={y} x2={1000} y2={y} stroke="#ef4444" strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />
                      })()}
                    </>
                  )
                })()}

                {/* Other tracks — filled area */}
                {!track.isHr && (
                  <>
                    <path d={fillPath} fill={`url(#fill-${track.label})`} />
                    <path d={linePath} fill="none" stroke={track.color} strokeWidth="2" strokeLinejoin="round" />
                  </>
                )}

                {/* Horizontal crosshair line */}
                {cursorY !== null && (
                  <line x1={0} y1={cursorY} x2={1000} y2={cursorY} stroke={T.text} strokeWidth="0.8" strokeDasharray="4,3" opacity="0.6" />
                )}
              </svg>
            </div>
          )
        })}
      </div>

      {/* Laps row */}
      {laps.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 5 }}>Intervalles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {laps.map((lap, li) => {
              const lapIntensity = lap.avg_watts ?? lap.avg_hr ?? 0
              const col = getIntensityColor(Number(lapIntensity), maxIntensity)
              return (
                <button key={li} onClick={() => setSelectedLap(selectedLap === li ? null : li)}
                  style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                    border: `1px solid ${selectedLap === li ? col : T.border}`,
                    background: selectedLap === li ? col + '20' : T.surface,
                    color: selectedLap === li ? col : T.textSub }}>
                  #{li+1} · {fmtDur(lap.moving_time_s)}
                </button>
              )
            })}
          </div>

          {selLap && (
            <div style={{ marginTop: 10, background: T.bg, borderRadius: 7, padding: '12px 14px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 8 }}>
                Intervalle #{selectedLap! + 1}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
                {selLap.distance_m > 0 && <span><span style={{ color: T.textMuted }}>Dist. </span>{fmtDist(selLap.distance_m)}</span>}
                <span><span style={{ color: T.textMuted }}>Durée </span>{fmtDur(selLap.moving_time_s)}</span>
                {selLap.avg_hr != null && <span><span style={{ color: T.textMuted }}>FC moy. </span>{Math.round(selLap.avg_hr)} bpm</span>}
                {selLap.avg_watts != null && isBike && <span><span style={{ color: T.textMuted }}>Watts </span>{Math.round(selLap.avg_watts)} W</span>}
                {selLap.avg_speed_ms != null && !isBike && <span><span style={{ color: T.textMuted }}>Allure </span>{fmtPace((1/selLap.avg_speed_ms)*1000)}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection modal */}
      {showSelModal && selStats && selection && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowSelModal(false)}
        >
          <div style={{ background: T.surface, borderRadius: 12, padding: '24px 28px', minWidth: 280, maxWidth: 380,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                Sélection — {fmtDur(selStats.dur)}
              </div>
              <button onClick={() => setShowSelModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 18 }}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {selStats.dist != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>Distance</span>
                  <span style={{ fontWeight: 600 }}>{fmtDist(selStats.dist)}</span>
                </div>
              )}
              {selStats.hrMoy != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>FC moyenne</span>
                  <span style={{ fontWeight: 600 }}>{selStats.hrMoy} bpm</span>
                </div>
              )}
              {selStats.hrMax != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>FC max.</span>
                  <span style={{ fontWeight: 600 }}>{selStats.hrMax} bpm</span>
                </div>
              )}
              {selStats.watts != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>Watts moy.</span>
                  <span style={{ fontWeight: 600 }}>{selStats.watts} W</span>
                </div>
              )}
              {selStats.pace != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>Allure moy.</span>
                  <span style={{ fontWeight: 600 }}>{fmtPace(selStats.pace)}</span>
                </div>
              )}
              {selStats.dPlus != null && selStats.dPlus > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>D+</span>
                  <span style={{ fontWeight: 600 }}>+{selStats.dPlus} m</span>
                </div>
              )}
              {selStats.cad != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textMuted }}>Cadence moy.</span>
                  <span style={{ fontWeight: 600 }}>{selStats.cad} rpm</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION: DONNÉES
// ─────────────────────────────────────────────────────────────
function SectionDonnees({ activities, zones, profile }: {
  activities: Activity[]
  zones: TrainingZoneRow[]
  profile: Profile
}) {
  const [filter, setFilter] = useState<TimeFilter>('4w')
  const dbMetrics = useMetricsDaily()
  const cutoff = cutoffDate(filter)
  const inRange = useMemo(() =>
    activities.filter(a => !cutoff || new Date(a.started_at) >= cutoff),
    [activities, filter]
  )

  const totalDist  = inRange.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalTime  = inRange.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalElev  = inRange.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)
  const totalTss   = inRange.reduce((s, a) => s + (a.tss ?? 0), 0)
  const hrVals     = inRange.filter(a => a.avg_hr).map(a => Number(a.avg_hr))
  const rpeVals    = inRange.filter(a => a.rpe ?? a.perceived_effort).map(a => Number(a.rpe ?? a.perceived_effort))
  const meanHr     = hrVals.length ? Math.round(avg(hrVals)) : null
  const meanRpe    = rpeVals.length ? avg(rpeVals).toFixed(1) : null
  const tssCount   = inRange.filter(a => a.tss).length
  const avgTss     = tssCount ? Math.round(totalTss / tssCount) : null
  const localMetrics = useMemo(() => computeFitness(activities), [activities])
  const ctl = dbMetrics.ctl ?? localMetrics.ctl
  const atl = dbMetrics.atl ?? localMetrics.atl
  const tsb = dbMetrics.tsb ?? localMetrics.tsb

  const nWeeks = numWeeks(filter)
  const weeks = useMemo(() => {
    const now = new Date()
    const map = new Map<string, { total: number; time: number; dist: number; count: number; sports: Map<string, number> }>()
    for (let i = nWeeks - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7)
      const k = isoWeek(d)
      if (!map.has(k)) map.set(k, { total: 0, time: 0, dist: 0, count: 0, sports: new Map() })
    }
    for (const a of inRange) {
      const k = isoWeek(new Date(a.started_at))
      if (map.has(k)) {
        const w = map.get(k)!
        w.total += a.moving_time_s ?? 0
        w.time  += a.moving_time_s ?? 0
        w.dist  += a.distance_m ?? 0
        w.count++
        const sp = a.sport_type ?? 'other'
        w.sports.set(sp, (w.sports.get(sp) ?? 0) + (a.moving_time_s ?? 0))
      }
    }
    return Array.from(map.entries()).map(([week, v]) => ({ week, ...v }))
  }, [inRange, nWeeks])

  const maxTime = Math.max(...weeks.map(w => w.total), 1)

  const bikeZoneRow = zones.find(z => z.sport === 'bike')
  const runZoneRow  = zones.find(z => z.sport === 'run')
  const bikeZones   = bikeZoneRow ? buildZones(bikeZoneRow) : null
  const runZones    = runZoneRow  ? buildZones(runZoneRow)  : null
  const hrZoneColors: ParsedZone[] = [
    { label: 'Z1 Récup', color: ZONE_COLORS[0], min: 0, max: 120 },
    { label: 'Z2 Aérobie', color: ZONE_COLORS[1], min: 120, max: 150 },
    { label: 'Z3 Tempo', color: ZONE_COLORS[2], min: 150, max: 165 },
    { label: 'Z4 Seuil', color: ZONE_COLORS[3], min: 165, max: 180 },
    { label: 'Z5 VO2max', color: ZONE_COLORS[4], min: 180, max: 999 },
  ]

  const bikeTimesZ = useMemo(() => {
    if (!bikeZones) return null
    const acc = bikeZones.map(() => 0)
    for (const a of inRange) {
      if (!['bike','virtual_bike'].includes(a.sport_type)) continue
      if (!a.streams?.watts) continue
      const t = calcTimeInZones(a.streams.watts, bikeZones)
      t.forEach((v, i) => acc[i] += v)
    }
    return acc
  }, [inRange, bikeZones])

  const runTimesZ = useMemo(() => {
    if (!runZones) return null
    const acc = runZones.map(() => 0)
    for (const a of inRange) {
      if (!['run','trail_run'].includes(a.sport_type)) continue
      if (!a.streams?.velocity) continue
      const paces = a.streams.velocity.map(v => v > 0.5 ? (1000 / v) : 0)
      const t = calcTimeInZones(paces, runZones)
      t.forEach((v, i) => acc[i] += v)
    }
    return acc
  }, [inRange, runZones])

  const hrTimesZ = useMemo(() => {
    const acc = hrZoneColors.map(() => 0)
    for (const a of inRange) {
      if (!a.streams?.heartrate) continue
      const t = calcTimeInZones(a.streams.heartrate, hrZoneColors)
      t.forEach((v, i) => acc[i] += v)
    }
    return acc
  }, [inRange])

  const sportMap = new Map<string, { count: number; time: number; dist: number }>()
  for (const a of inRange) {
    const sp = a.sport_type ?? 'other'
    if (!sportMap.has(sp)) sportMap.set(sp, { count: 0, time: 0, dist: 0 })
    const e = sportMap.get(sp)!
    e.count++; e.time += a.moving_time_s ?? 0; e.dist += a.distance_m ?? 0
  }
  const sports = Array.from(sportMap.entries()).sort((a, b) => b[1].time - a[1].time)

  void profile

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {(Object.keys(TIME_FILTER_LABEL) as TimeFilter[]).map(f => (
          <Chip key={f} label={TIME_FILTER_LABEL[f]} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard label="Séances" value={inRange.length.toString()} />
        <StatCard label="Distance" value={fmtDist(totalDist)} />
        <StatCard label="Temps" value={fmtDur(totalTime)} />
        <StatCard label="D+" value={totalElev >= 1 ? `+${Math.round(totalElev)} m` : '—'} />
        <StatCard label="TSS total" value={totalTss ? Math.round(totalTss).toString() : '—'} />
        <StatCard label="TSS / séance" value={avgTss ? avgTss.toString() : '—'} />
        <StatCard label="FC moy." value={meanHr ? `${meanHr} bpm` : '—'} />
        <StatCard label="RPE moyen" value={meanRpe ? `${meanRpe}/10` : '—'} />
      </div>

      {/* CTL / ATL / TSB */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 20px', marginBottom: 16 }}>
        <SectionTitle>Fitness</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {([
            { key: 'CTL', val: ctl, color: '#00c8e0', tip: 'CTL (Chronic Training Load)\n\nCharge chronique sur 42 jours.\nMesure votre forme à long terme.\n\nFormule : moyenne exponentielle\ndu TSS quotidien, constante 42j.\n\nPlus c\'est élevé : meilleure forme.' },
            { key: 'ATL', val: atl, color: '#ff5f5f', tip: 'ATL (Acute Training Load)\n\nCharge aiguë sur 7 jours.\nMesure la fatigue récente.\n\nFormule : moyenne exponentielle\ndu TSS quotidien, constante 7j.\n\nPlus c\'est élevé : plus de fatigue.' },
            { key: 'TSB', val: tsb, color: tsb >= 0 ? '#5b6fff' : '#ff5f5f', tip: 'TSB (Training Stress Balance)\n\nTSB = CTL - ATL\n\nBalance forme/fatigue.\n\n> 0 : forme supérieure à la fatigue.\n< 0 : fatigue supérieure à la forme.\nIdéal compét. : entre +5 et +25.' },
          ] as { key: string; val: number; color: string; tip: string }[]).map(({ key, val, color, tip }) => (
            <div key={key} style={{ background: T.bgAlt, borderRadius: T.radiusSm, padding: '14px 16px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6, display: 'flex', alignItems: 'center', fontFamily: T.fontDisplay, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {key}<TooltipInfo text={tip} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly volume chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px', marginBottom: 16 }}>
        <SectionTitle>Volume hebdomadaire</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {weeks.map((w, i) => {
            const barH = Math.max(4, Math.round((w.total / maxTime) * 96))
            const hours = w.total / 3600
            const isNow = i === weeks.length - 1
            const d = new Date(w.week)
            const sportEntries = Array.from(w.sports.entries()).sort((a, b) => b[1] - a[1])

            return (
              <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                {w.time > 60 && (
                  <div style={{ fontSize: 9, color: isNow ? T.accent : T.textMuted, fontWeight: isNow ? 700 : 400 }}>
                    {fmtDur(w.time)}
                  </div>
                )}
                <div style={{ width: '75%', height: barH, display: 'flex', flexDirection: 'column-reverse', borderRadius: '3px 3px 0 0', overflow: 'hidden', minWidth: 6 }}
                  title={`${d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} · ${hours.toFixed(1)}h · ${w.count} séance${w.count!==1?'s':''}`}>
                  {sportEntries.map(([sport, sportTime]) => {
                    const col = SPORT_COLOR[sport as SportType] ?? '#94a3b8'
                    const pct = w.total > 0 ? (sportTime / w.total) * 100 : 0
                    return (
                      <div key={sport} style={{ width: '100%', flexShrink: 0, background: isNow ? col : col + '80',
                        height: `${pct}%`, transition: 'height 0.3s' }} />
                    )
                  })}
                  {w.total === 0 && <div style={{ width: '100%', height: '100%', background: T.border }} />}
                </div>
                {(i === 0 || i % Math.max(1, Math.floor(weeks.length / 4)) === 0 || isNow) && (
                  <div style={{ fontSize: 9, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textAlign: 'center' }}>
                    {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {sports.length > 1 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            {sports.map(([sport]) => (
              <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.textSub }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: SPORT_COLOR[sport as SportType] ?? '#888', display: 'inline-block' }} />
                {SPORT_LABEL[sport as SportType] ?? sport}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sport breakdown */}
      {sports.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px', marginBottom: 16 }}>
          <SectionTitle>Répartition par sport</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sports.map(([sport, v]) => {
              const col = SPORT_COLOR[sport as SportType] ?? '#888'
              const pct = totalTime > 0 ? (v.time / totalTime) * 100 : 0
              return (
                <div key={sport} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 56px 56px', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: 'inline-block', flexShrink: 0 }} />
                    {SPORT_LABEL[sport as SportType] ?? sport}
                  </div>
                  <div style={{ height: 7, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.textSub, textAlign: 'right' }}>{fmtDur(v.time)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, textAlign: 'right' }}>{v.count}×</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Zones panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {bikeZones && bikeTimesZ && bikeTimesZ.some(t => t > 0) && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
            <SectionTitle>Zones puissance — Vélo</SectionTitle>
            <ZoneBars zones={bikeZones} timesS={bikeTimesZ} />
          </div>
        )}
        {runZones && runTimesZ && runTimesZ.some(t => t > 0) && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
            <SectionTitle>Zones allure — Course</SectionTitle>
            <ZoneBars zones={runZones} timesS={runTimesZ} />
          </div>
        )}
        {hrTimesZ && hrTimesZ.some(t => t > 0) && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
            <SectionTitle>Zones FC — Global</SectionTitle>
            <ZoneBars zones={hrZoneColors} timesS={hrTimesZ} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY ROW
// ─────────────────────────────────────────────────────────────
function ActivityRow({ a, selected, onClick }: { a: Activity; selected: boolean; onClick: () => void }) {
  const col = SPORT_COLOR[a.sport_type] ?? '#888'
  const paceS = a.avg_pace_s_km
    ?? (a.moving_time_s && a.distance_m && a.distance_m > 100 ? (a.moving_time_s / a.distance_m) * 1000 : null)
  const isBikeRow = ['bike','virtual_bike'].includes(a.sport_type)
  const isRunRow  = ['run','trail_run'].includes(a.sport_type)
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '3px 1fr auto',
        gap: 10, padding: '11px 14px', borderRadius: 0,
        cursor: 'pointer',
        background: selected ? T.accentBg : 'transparent',
        borderBottom: `1px solid ${T.border}`,
        borderLeft: `3px solid ${selected ? T.accent : 'transparent'}`,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = T.bgAlt }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <div style={{ background: col, borderRadius: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.fontBody }}>
          {a.title}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{fmtDateShort(a.started_at)}</span>
          <span style={{ color: col, fontWeight: 600, fontSize: 10, background: col + '18', padding: '1px 7px', borderRadius: 20 }}>{SPORT_LABEL[a.sport_type]}</span>
          {a.is_race && <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 10, background: '#ef444415', padding: '1px 7px', borderRadius: 20 }}>Compét.</span>}
          {a.tss != null && <span style={{ color: T.textMuted, fontSize: 10, fontFamily: T.fontMono }}>TSS {Math.round(Number(a.tss))}</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.textSub, textAlign: 'right', flexShrink: 0, fontFamily: T.fontMono }}>
        {a.distance_m ? <div style={{ fontWeight: 600, color: T.text, fontSize: 12 }}>{fmtDist(a.distance_m)}</div> : null}
        {a.moving_time_s ? <div style={{ color: T.textSub }}>{fmtDur(a.moving_time_s)}</div> : null}
        {paceS && isRunRow ? <div style={{ color: T.textMuted, fontSize: 10 }}>{fmtPace(paceS)}</div> : null}
        {isBikeRow && a.avg_watts ? <div style={{ color: T.textMuted, fontSize: 10 }}>{Math.round(Number(a.avg_watts))} W</div> : null}
        {a.avg_hr ? <div style={{ color: T.textMuted, fontSize: 10 }}>{Math.round(Number(a.avg_hr))} bpm</div> : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY DETAIL
// ─────────────────────────────────────────────────────────────
function ActivityDetail({ a, onClose, zones, profile }: {
  a: Activity; onClose: () => void
  zones: TrainingZoneRow[]; profile: Profile
}) {
  const col = SPORT_COLOR[a.sport_type] ?? T.accent
  const isBike = ['bike','virtual_bike'].includes(a.sport_type)
  const isRun  = ['run','trail_run'].includes(a.sport_type)
  const isSwim = a.sport_type === 'swim'
  const isGym  = a.sport_type === 'gym'

  const paceS = a.avg_pace_s_km
    ?? (a.moving_time_s && a.distance_m && a.distance_m > 100 ? (a.moving_time_s / a.distance_m) * 1000 : null)

  const bikeZoneRow = zones.find(z => z.sport === 'bike')
  const runZoneRow  = zones.find(z => z.sport === 'run')
  const bikeZones   = bikeZoneRow ? buildZones(bikeZoneRow) : null
  const runZones    = runZoneRow  ? buildZones(runZoneRow)  : null
  const hrZones: ParsedZone[] = [
    { label: 'Z1', color: ZONE_COLORS[0], min: 0, max: 120 },
    { label: 'Z2', color: ZONE_COLORS[1], min: 120, max: 150 },
    { label: 'Z3', color: ZONE_COLORS[2], min: 150, max: 165 },
    { label: 'Z4', color: ZONE_COLORS[3], min: 165, max: 180 },
    { label: 'Z5', color: ZONE_COLORS[4], min: 180, max: 999 },
  ]

  const wkg = (a.normalized_watts ?? a.avg_watts) && profile.weight_kg
    ? ((Number(a.normalized_watts ?? a.avg_watts)) / Number(profile.weight_kg)).toFixed(2) : null

  const vi = a.normalized_watts && a.avg_watts && Number(a.avg_watts) > 0
    ? (Number(a.normalized_watts) / Number(a.avg_watts)).toFixed(2) : null

  const decoupling = a.aerobic_decoupling != null ? Number(a.aerobic_decoupling) : null

  // Freewheeling (coasting): cadence == 0 while velocity > 0.5 m/s
  const freewheelS = useMemo(() => {
    if (!isBike || !a.streams?.cadence || !a.streams?.velocity) return null
    let coasting = 0
    const cad = a.streams.cadence, vel = a.streams.velocity
    const len = Math.min(cad.length, vel.length)
    for (let i = 0; i < len; i++) {
      if (vel[i] > 0.5 && cad[i] === 0) coasting++
    }
    return coasting // seconds (1 sample = 1s)
  }, [a.streams?.cadence, a.streams?.velocity, isBike])

  const freewheelPct = freewheelS && a.moving_time_s
    ? ((freewheelS / a.moving_time_s) * 100).toFixed(1) : null

  // Max altitude from streams
  const maxAlt = a.streams?.altitude?.length ? Math.round(Math.max(...a.streams.altitude)) : null
  const avgAlt = a.streams?.altitude?.length
    ? Math.round(a.streams.altitude.reduce((s, v) => s + v, 0) / a.streams.altitude.length) : null

  // % FTP
  const pctFtp = a.avg_watts && a.ftp_at_time
    ? Math.round((Number(a.avg_watts) / a.ftp_at_time) * 100) : null

  // Pw/FC effectiveness
  const pwHr = a.avg_watts && a.avg_hr
    ? (Number(a.avg_watts) / Number(a.avg_hr)).toFixed(2) : null

  // VAP from zone row
  const runZoneRowLocal = zones.find(z => z.sport === 'run')
  const vap = runZoneRowLocal?.vma_ms
    ? `${(Number(runZoneRowLocal.vma_ms) * 3.6).toFixed(1)} km/h` : null

  const sensation = a.perceived_effort ?? a.suffer_score

  const powerTimesZ = useMemo(() => {
    if (!bikeZones || !a.streams?.watts) return null
    return calcTimeInZones(a.streams.watts, bikeZones)
  }, [a.streams?.watts, bikeZones])

  const paceTimesZ = useMemo(() => {
    if (!runZones || !a.streams?.velocity) return null
    const paces = a.streams.velocity.map(v => v > 0.5 ? 1000 / v : 0)
    return calcTimeInZones(paces, runZones)
  }, [a.streams?.velocity, runZones])

  const hrTimesZ = useMemo(() => {
    if (!a.streams?.heartrate) return null
    return calcTimeInZones(a.streams.heartrate, hrZones)
  }, [a.streams?.heartrate])

  function StatBlock({ items }: { items: { label: string; v: string | null | undefined }[] }) {
    const visible = items.filter(s => s.v && s.v !== '—')
    if (!visible.length) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {visible.map(s => (
          <div key={s.label} style={{ background: T.bg, borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{s.v}</div>
          </div>
        ))}
      </div>
    )
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
        {title}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ background: T.surface, borderRadius: T.radius, boxShadow: T.shadowCard }}>
      <div style={{ padding: '20px 22px' }}>

        {/* ── HERO ── */}
        <div style={{ marginBottom: 24 }}>
          {/* Sport + Title + Date row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: col + '18', border: `2px solid ${col}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: col }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col, background: col + '18', padding: '2px 9px', borderRadius: 20, fontFamily: T.fontDisplay }}>
                  {SPORT_LABEL[a.sport_type]}
                </span>
                <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody }}>{fmtDate(a.started_at)}</span>
                {a.is_race && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#ef444415', padding: '2px 9px', borderRadius: 20 }}>Compétition</span>}
                {a.trainer && <span style={{ fontSize: 10, color: T.textMuted, background: T.bg, padding: '2px 9px', borderRadius: 20, border: `1px solid ${T.border}` }}>Intérieur</span>}
                {a.gear_name && <span style={{ fontSize: 10, color: T.textMuted, background: T.bg, padding: '2px 9px', borderRadius: 20, border: `1px solid ${T.border}` }}>{a.gear_name}</span>}
              </div>
            </div>
          </div>

          {/* KPI hero strip */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Distance', value: (!isGym && a.distance_m) ? fmtDist(a.distance_m) : null },
              { label: 'Durée', value: a.moving_time_s ? fmtDur(a.moving_time_s) : null },
              { label: 'D+', value: (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : null },
              { label: isBike ? 'Watts moy.' : (isRun ? 'Allure moy.' : null), value: isBike ? (a.avg_watts ? `${Math.round(Number(a.avg_watts))} W` : null) : (isRun && paceS ? fmtPace(paceS) : null) },
              { label: 'TSS', value: a.tss ? Math.round(Number(a.tss)).toString() : null },
              { label: 'Calories', value: a.calories ? `${Math.round(Number(a.calories))} kcal` : null },
            ].filter(k => k.label && k.value).map(k => (
              <div key={k.label!} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '10px 16px', border: `1px solid ${T.border}`, textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: T.fontDisplay, fontWeight: 700, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay, lineHeight: 1 }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5 DATA BLOCKS ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, flexWrap: 'wrap' }}>

          {/* BLOC 1 — Volume */}
          <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
            {!isGym && a.distance_m != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Distance</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmtDist(a.distance_m)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: T.textMuted }}>Durée</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmtDur(a.moving_time_s)}</span>
            </div>
            {isBike && a.avg_speed_ms != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Vitesse moy.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{(Number(a.avg_speed_ms) * 3.6).toFixed(1)} km/h</span>
              </div>
            )}
            {(isRun || isSwim) && paceS != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Allure moy.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmtPace(paceS)}</span>
              </div>
            )}
            {isBike && freewheelS != null && freewheelS > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Roue libre</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmtDur(freewheelS)} ({freewheelPct}%)</span>
              </div>
            )}
          </div>

          {/* BLOC 2 — Charge / ressenti */}
          <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
            {sensation != null && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>Sensation</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{sensation}/10</span>
                </div>
                <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
                  <div style={{ width: `${(Number(sensation) / 10) * 100}%`, height: '100%', borderRadius: 2,
                    background: Number(sensation) <= 3 ? ZONE_COLORS[1] : Number(sensation) <= 6 ? ZONE_COLORS[2] : Number(sensation) <= 8 ? ZONE_COLORS[3] : ZONE_COLORS[4] }} />
                </div>
              </div>
            )}
            {a.rpe != null && a.rpe !== sensation && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>RPE</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Number(a.rpe).toFixed(1)}/10</span>
                </div>
                <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
                  <div style={{ width: `${(Number(a.rpe) / 10) * 100}%`, height: '100%', borderRadius: 2,
                    background: Number(a.rpe) <= 3 ? ZONE_COLORS[1] : Number(a.rpe) <= 6 ? ZONE_COLORS[2] : Number(a.rpe) <= 8 ? ZONE_COLORS[3] : ZONE_COLORS[4] }} />
                </div>
              </div>
            )}
            {a.tss != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center' }}>
                  TSS<TooltipInfo text={'TSS (Training Stress Score)\n\nMesure la charge d\'une séance.\n\nTSS = (durée × NP × IF)² / FTP²\n\n< 150 → récupération rapide\n150–300 → fatigant\n> 300 → très éprouvant'} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Math.round(Number(a.tss))}</span>
              </div>
            )}
          </div>

          {/* BLOC 3 — Sport-specific */}
          <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
            {isBike && (
              <>
                {a.avg_watts != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>Watts moy.</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                      {Math.round(Number(a.avg_watts))} W{pctFtp ? ` (${pctFtp}% FTP)` : ''}
                    </span>
                  </div>
                )}
                {a.normalized_watts != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>NP</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.normalized_watts} W</span>
                  </div>
                )}
                {vi != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>Variabilité (VI)</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{vi}</span>
                  </div>
                )}
                {pwHr != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>Pw/FC</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{pwHr}</span>
                  </div>
                )}
                {a.avg_cadence != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>Cadence moy.</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Math.round(Number(a.avg_cadence))} rpm</span>
                  </div>
                )}
              </>
            )}
            {isRun && (
              <>
                {vap != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>VAP</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{vap}</span>
                  </div>
                )}
                {a.avg_cadence != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>Cadence moy.</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Math.round(Number(a.avg_cadence))} spm</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* BLOC 4 — Cardio */}
          <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
            {a.avg_hr != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>FC moy.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Math.round(Number(a.avg_hr))} bpm</span>
              </div>
            )}
            {a.max_hr != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>FC max.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.max_hr} bpm</span>
              </div>
            )}
            {a.aerobic_decoupling != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Découplage</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Number(a.aerobic_decoupling).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* BLOC 5 — Contexte */}
          <div style={{ flex: '1 1 140px', paddingBottom: 12 }}>
            {a.elevation_gain_m != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>D+</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>+{Math.round(Number(a.elevation_gain_m))} m</span>
              </div>
            )}
            {maxAlt != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Alt. max.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{maxAlt} m</span>
              </div>
            )}
            {avgAlt != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Alt. moy.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{avgAlt} m</span>
              </div>
            )}
            {a.avg_temp_c != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Température</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Math.round(Number(a.avg_temp_c))}°C</span>
              </div>
            )}
            {a.calories != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Calories</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.calories} kcal</span>
              </div>
            )}
          </div>
        </div>

        {/* ── COURBES ── */}
        {a.streams && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 10, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Courbes
            </div>
            <SyncCharts activity={a} hrZones={hrZones} powerZones={bikeZones ?? undefined} paceZones={runZones ?? undefined} />
          </div>
        )}

        {/* ── ZONES ── */}
        {(isBike && bikeZones && powerTimesZ && powerTimesZ.some(t => t > 0)) ||
         (isRun && runZones && paceTimesZ && paceTimesZ.some(t => t > 0)) ||
         (hrTimesZ && hrTimesZ.some(t => t > 0)) ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 10, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Zones
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {isBike && bikeZones && powerTimesZ && powerTimesZ.some(t => t > 0) && (
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6 }}>Puissance</div>
                  <ZoneBars zones={bikeZones} timesS={powerTimesZ} />
                </div>
              )}
              {isRun && runZones && paceTimesZ && paceTimesZ.some(t => t > 0) && (
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6 }}>Allure</div>
                  <ZoneBars zones={runZones} timesS={paceTimesZ} />
                </div>
              )}
              {hrTimesZ && hrTimesZ.some(t => t > 0) && (
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6 }}>Fréquence cardiaque</div>
                  <ZoneBars zones={hrZones} timesS={hrTimesZ} />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── ANALYSE AUTOMATIQUE ── */}
        {(() => {
          const insights: { type: 'good' | 'neutral' | 'warn'; text: string }[] = []
          if (decoupling !== null) {
            if (decoupling < 5)        insights.push({ type: 'good',    text: `Bonne résistance aérobie — découplage FC/puissance de ${decoupling.toFixed(1)}% (< 5% : excellent)` })
            else if (decoupling < 10)  insights.push({ type: 'neutral', text: `Légère dérive cardiaque — découplage de ${decoupling.toFixed(1)}% (normal sur les sorties longues)` })
            else                       insights.push({ type: 'warn',    text: `Dérive cardiaque élevée — découplage de ${decoupling.toFixed(1)}% → fatigue ou base aérobie insuffisante` })
          }
          if (isBike && vi !== null) {
            const viNum = parseFloat(vi)
            if (viNum < 1.05)      insights.push({ type: 'good',    text: `Effort très régulier — variabilité de puissance VI ${vi} (idéal triathlon / endurance)` })
            else if (viNum < 1.12) insights.push({ type: 'neutral', text: `Effort modérément variable — VI ${vi}` })
            else                   insights.push({ type: 'neutral', text: `Effort très variable — VI ${vi} (typique des parcours accidentés)` })
          }
          if (isBike && a.intensity_factor) {
            const ifNum = Number(a.intensity_factor)
            if (ifNum < 0.75)      insights.push({ type: 'good',    text: `Sortie en zone d'endurance — IF ${ifNum.toFixed(2)} (récupération rapide prévue)` })
            else if (ifNum < 0.85) insights.push({ type: 'neutral', text: `Sortie à allure tempo — IF ${ifNum.toFixed(2)}` })
            else if (ifNum < 0.95) insights.push({ type: 'neutral', text: `Sortie intensive — IF ${ifNum.toFixed(2)}` })
            else                   insights.push({ type: 'warn',    text: `Effort maximal — IF ${ifNum.toFixed(2)} → priorité à la récupération` })
          }
          if (isRun && a.avg_hr && paceS && paceS > 0) {
            const ef = (1000 / paceS) / Number(a.avg_hr)
            if (ef > 0.013)      insights.push({ type: 'good',    text: `Bonne efficacité aérobie en course — EF ${ef.toFixed(3)} m/s/bpm` })
            else if (ef > 0.010) insights.push({ type: 'neutral', text: `Efficacité aérobie correcte — EF ${ef.toFixed(3)} m/s/bpm` })
          }
          if (a.suffer_score != null && Number(a.suffer_score) > 200) {
            insights.push({ type: 'warn', text: `Score de souffrance élevé — ${a.suffer_score} (récupération recommandée avant la prochaine séance intense)` })
          }
          if (!insights.length) return null
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
                textTransform: 'uppercase', marginBottom: 10, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
                Analyse automatique
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {insights.map((ins, i) => {
                  const dot = ins.type === 'good' ? '#22c55e' : ins.type === 'warn' ? '#f97316' : T.textMuted
                  const bg  = ins.type === 'good' ? 'rgba(34,197,94,0.06)' : ins.type === 'warn' ? 'rgba(249,115,22,0.06)' : T.bgAlt
                  const border = ins.type === 'good' ? 'rgba(34,197,94,0.2)' : ins.type === 'warn' ? 'rgba(249,115,22,0.2)' : T.border
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: bg,
                      borderRadius: 8, padding: '10px 14px', border: `1px solid ${border}` }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, marginTop: 4, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: T.text, lineHeight: 1.55, fontFamily: T.fontBody }}>{ins.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── NOTES ── */}
        {(a.notes || a.description) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Commentaire
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{a.notes ?? a.description}</div>
          </div>
        )}

        {/* ── LAPS TABLE ── */}
        {a.laps && a.laps.length > 1 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Intervalles — {a.laps.length} tours
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: T.textMuted }}>
                    {['#','Dist.','Durée', isBike ? 'Watts' : 'Allure', 'FC'].map(h => (
                      <th key={h} style={{ padding: '3px 8px 6px 0', fontWeight: 500, fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.laps.map((lap, i) => {
                    const lp = lap.moving_time_s && lap.distance_m > 0 ? (lap.moving_time_s / lap.distance_m) * 1000 : null
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: '5px 8px 5px 0', color: T.textMuted }}>{i+1}</td>
                        <td style={{ padding: '5px 8px 5px 0' }}>{!isGym ? fmtDist(lap.distance_m) : '—'}</td>
                        <td style={{ padding: '5px 8px 5px 0' }}>{fmtDur(lap.moving_time_s)}</td>
                        <td style={{ padding: '5px 8px 5px 0' }}>
                          {isBike
                            ? (lap.avg_watts ? `${Math.round(lap.avg_watts)} W` : '—')
                            : (isRun||isSwim) ? fmtPace(lp)
                            : lap.avg_speed_ms ? `${(lap.avg_speed_ms*3.6).toFixed(1)} km/h` : '—'}
                        </td>
                        <td style={{ padding: '5px 8px 5px 0' }}>{lap.avg_hr ? `${Math.round(lap.avg_hr)} bpm` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CALENDAR GRID
// ─────────────────────────────────────────────────────────────
function CalendarGrid({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const [offset, setOffset] = useState(0)
  const [weeks, setWeeksCount] = useState<5|10>(5)

  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() - offset * 7)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - weeks * 7 + 1)

  const actMap = new Map<string, Activity[]>()
  for (const a of activities) {
    const d = a.started_at.slice(0, 10)
    if (!actMap.has(d)) actMap.set(d, [])
    actMap.get(d)!.push(a)
  }

  const grid: Date[][] = []
  let cur = getWeekStart(new Date(startDate))
  while (cur <= endDate) {
    const row: Date[] = []
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur))
      cur = new Date(cur)
      cur.setDate(cur.getDate() + 1)
    }
    grid.push(row)
  }

  const dayLabels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {([5,10] as const).map(n => (
            <Chip key={n} label={`${n} sem.`} active={weeks === n} onClick={() => setWeeksCount(n)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setOffset(o => o + weeks)}
            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12, color: T.textSub }}>
            Précédent
          </button>
          {offset > 0 && (
            <button onClick={() => setOffset(0)}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12, color: T.textSub }}>
              {"Aujourd'hui"}
            </button>
          )}
          {offset > 0 && (
            <button onClick={() => setOffset(o => Math.max(0, o - weeks))}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12, color: T.textSub }}>
              Suivant
            </button>
          )}
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${T.border}` }}>
          {dayLabels.map(d => (
            <div key={d} style={{ padding: '6px 8px', fontSize: 10, color: T.textMuted, textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
          ))}
        </div>

        {grid.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: ri < grid.length - 1 ? `1px solid ${T.border}` : 'none' }}>
            {row.map((day, di) => {
              const dateStr = day.toISOString().slice(0, 10)
              const dayActs = actMap.get(dateStr) ?? []
              const isToday = dateStr === new Date().toISOString().slice(0, 10)
              const isInFuture = day > now
              return (
                <div key={di} style={{
                  borderLeft: di > 0 ? `1px solid ${T.border}` : 'none',
                  minHeight: 64, padding: '5px 6px',
                  background: isToday ? T.accentBg : isInFuture ? '#fafafa' : T.surface,
                }}>
                  <div style={{ fontSize: 11, color: isToday ? T.accent : T.textMuted, fontWeight: isToday ? 700 : 400, marginBottom: 3 }}>
                    {day.getDate()}
                  </div>
                  {dayActs.slice(0, 3).map((a, ai) => {
                    const col = SPORT_COLOR[a.sport_type] ?? '#888'
                    return (
                      <div key={ai} onClick={() => onSelect(a)}
                        style={{ fontSize: 10, background: col + '18', color: col, padding: '2px 5px',
                          borderRadius: 4, cursor: 'pointer', marginBottom: 2, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500,
                          border: `1px solid ${col}30` }}>
                        {SPORT_LABEL[a.sport_type]} · {fmtDur(a.moving_time_s)}
                      </div>
                    )
                  })}
                  {dayActs.length > 3 && (
                    <div style={{ fontSize: 9, color: T.textMuted }}>+{dayActs.length - 3}</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION: ANALYSE
// ─────────────────────────────────────────────────────────────
function SectionAnalyse({ activities, zones, profile }: {
  activities: Activity[]
  zones: TrainingZoneRow[]
  profile: Profile
}) {
  const [view, setView]         = useState<'list'|'calendar'>('list')
  const [selected, setSelected] = useState<Activity | null>(null)
  const [search, setSearch]     = useState('')
  const [sport, setSport]       = useState<'all' | SportType>('all')
  const [raceFilter, setRaceFilter] = useState<'all'|'race'|'training'>('all')

  const allSports = useMemo(() => Array.from(new Set(activities.map(a => a.sport_type))), [activities])

  const filtered = useMemo(() => activities.filter(a => {
    if (sport !== 'all' && a.sport_type !== sport) return false
    if (raceFilter === 'race' && !a.is_race) return false
    if (raceFilter === 'training' && a.is_race) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.title?.toLowerCase().includes(q)) return false
    }
    return true
  }), [activities, sport, raceFilter, search])

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', color: T.textSub, fontSize: 13, padding: 0 }}>
          <span style={{ fontSize: 16 }}>←</span> Retour à la liste
        </button>
        <ActivityDetail a={selected} onClose={() => setSelected(null)} zones={zones} profile={profile} />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <Chip label="Liste" active={view === 'list'} onClick={() => setView('list')} />
        <Chip label="Calendrier" active={view === 'calendar'} onClick={() => setView('calendar')} />
      </div>

      {view === 'calendar' && (
        <CalendarGrid activities={activities} onSelect={setSelected} />
      )}

      {view === 'list' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{ flex: '1 1 160px', background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 7, padding: '7px 12px', fontSize: 12, color: T.text, outline: 'none' }}
            />
            <select value={sport} onChange={e => setSport(e.target.value as 'all'|SportType)}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7,
                padding: '7px 10px', fontSize: 12, color: T.text, outline: 'none' }}>
              <option value="all">Tous les sports</option>
              {allSports.map(s => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
            </select>
            <select value={raceFilter} onChange={e => setRaceFilter(e.target.value as typeof raceFilter)}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7,
                padding: '7px 10px', fontSize: 12, color: T.text, outline: 'none' }}>
              <option value="all">Tout</option>
              <option value="training">Entraînements</option>
              <option value="race">Compétitions</option>
            </select>
          </div>

          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
            {filtered.length} activité{filtered.length !== 1 ? 's' : ''}
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow }}>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {filtered.map(act => (
                <ActivityRow key={act.id} a={act} selected={false} onClick={() => setSelected(act)} />
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>Aucune activité</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION: PROGRESSION
// ─────────────────────────────────────────────────────────────
function SectionProgression({ activities }: { activities: Activity[] }) {
  const bests = useMemo(() => {
    const map: Record<string, {
      longestDist: Activity | null; longestTime: Activity | null
      fastestPace: Activity | null; highestTss: Activity | null; highestWatts: Activity | null
    }> = {}

    for (const a of activities) {
      if (!map[a.sport_type]) map[a.sport_type] = {
        longestDist: null, longestTime: null, fastestPace: null, highestTss: null, highestWatts: null
      }
      const r = map[a.sport_type]

      if ((a.distance_m ?? 0) > (r.longestDist?.distance_m ?? 0)) r.longestDist = a
      if ((a.moving_time_s ?? 0) > (r.longestTime?.moving_time_s ?? 0)) r.longestTime = a
      if ((a.tss ?? 0) > (r.highestTss?.tss ?? 0)) r.highestTss = a
      if ((a.normalized_watts ?? a.avg_watts ?? 0) > (r.highestWatts?.normalized_watts ?? r.highestWatts?.avg_watts ?? 0)) r.highestWatts = a

      const pace = a.avg_pace_s_km
        ?? (a.moving_time_s && (a.distance_m ?? 0) > 500 ? (a.moving_time_s / a.distance_m!) * 1000 : null)
      const bestP = r.fastestPace?.avg_pace_s_km
        ?? (r.fastestPace?.moving_time_s && r.fastestPace?.distance_m
          ? (r.fastestPace.moving_time_s / r.fastestPace.distance_m) * 1000 : null)
      if (pace && (bestP === null || pace < bestP)) r.fastestPace = a
    }
    return map
  }, [activities])

  const sports = Object.keys(bests) as SportType[]

  // Recent 90 days
  const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90)
  const recent = activities.filter(a => new Date(a.started_at) >= cutoff90).slice(0, 8)

  if (!sports.length) {
    return <div style={{ textAlign: 'center', padding: 60, color: T.textMuted }}>Aucune donnée</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        {sports.map(sport => {
          const col = SPORT_COLOR[sport] ?? '#888'
          const b = bests[sport]
          const count = activities.filter(a => a.sport_type === sport).length

          const records = [
            { label: 'Plus longue distance', v: fmtDist(b.longestDist?.distance_m), a: b.longestDist },
            { label: 'Sortie la plus longue', v: fmtDur(b.longestTime?.moving_time_s), a: b.longestTime },
            { label: 'Allure la plus rapide', v: (() => {
              const act = b.fastestPace
              if (!act) return '—'
              const p = act.avg_pace_s_km
                ?? (act.moving_time_s && act.distance_m ? (act.moving_time_s / act.distance_m) * 1000 : null)
              return fmtPace(p)
            })(), a: b.fastestPace },
            { label: 'TSS le plus élevé', v: b.highestTss?.tss ? Math.round(b.highestTss.tss).toString() : '—', a: b.highestTss },
            { label: 'NP le plus élevé', v: b.highestWatts?.normalized_watts ? `${Math.round(b.highestWatts.normalized_watts)} W` : '—', a: b.highestWatts },
          ].filter(r => r.a && r.v !== '—')

          if (!records.length) return null

          return (
            <div key={sport} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '11px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 4, height: 16, background: col, borderRadius: 2 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{SPORT_LABEL[sport]}</span>
                </div>
                <span style={{ fontSize: 11, color: T.textMuted }}>{count} séance{count !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1, background: T.border }}>
                {records.map(r => (
                  <div key={r.label} style={{ background: T.surface, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 3 }}>{r.v}</div>
                    {r.a && (
                      <div style={{ fontSize: 10, color: T.textMuted }}>
                        {fmtDateShort(r.a.started_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {recent.length > 0 && (
        <div>
          <SectionTitle>Activités récentes — 90 jours</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {recent.map(a => {
              const col = SPORT_COLOR[a.sport_type] ?? '#888'
              return (
                <div key={a.id} style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderLeft: `4px solid ${col}`, borderRadius: T.radius, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{fmtDateShort(a.started_at)}</span>
                    {a.is_race && <span style={{ color: '#dc2626', fontWeight: 600 }}>Compét.</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 11, color: T.textSub, display: 'flex', gap: 8 }}>
                    {a.distance_m ? <span>{fmtDist(a.distance_m)}</span> : null}
                    {a.moving_time_s ? <span>{fmtDur(a.moving_time_s)}</span> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// NAV CONFIG
// ─────────────────────────────────────────────────────────────
type Section = 'donnees' | 'analyse' | 'progression'

const NAV: { id: Section; label: string; desc: string }[] = [
  { id: 'donnees',     label: 'Données',     desc: 'Charge et volume' },
  { id: 'analyse',     label: 'Analyse',     desc: 'Activités et détails' },
  { id: 'progression', label: 'Progression', desc: 'Records et tendances' },
]

// ─────────────────────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const { activities, loading, error, reload } = useActivities()
  const zones   = useTrainingZones()
  const profile = useProfile()
  const [section, setSection]       = useState<Section>('donnees')
  const [mobileOpen, setMobileOpen] = useState(false)
  const width   = useWindowWidth()
  const isMobile = width < 768
  const active  = NAV.find(n => n.id === section)!

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.fontBody }}>

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        height: T.topH, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        boxShadow: T.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: -0.3, fontFamily: T.fontDisplay }}>Training</span>
          {!isMobile && <span style={{ fontSize: 12, color: T.textMuted }}>/ {active.label}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && <span style={{ fontSize: 11, color: T.textMuted }}>Chargement…</span>}
          {!loading && !error && <span style={{ fontSize: 11, color: T.textMuted }}>{activities.length} activités</span>}
          <button
            onClick={reload}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, color: T.textSub, cursor: 'pointer', padding: '4px 10px', fontSize: 13 }}
          >
            ↻
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── SIDEBAR (desktop) ── */}
        {!isMobile && (
          <aside style={{
            width: T.sidebarW, flexShrink: 0,
            background: T.sidebar, borderRight: `1px solid ${T.border}`,
            padding: '20px 12px',
            position: 'sticky', top: T.topH, height: `calc(100vh - ${T.topH}px)`,
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 1.1, paddingLeft: 10, marginBottom: 10, fontFamily: T.fontDisplay }}>
              NAVIGATION
            </div>
            {NAV.map(n => {
              const isActive = n.id === section
              return (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none',
                    borderRadius: T.radiusSm, padding: '10px 12px', cursor: 'pointer', marginBottom: 3,
                    background: isActive ? T.accentBg : 'transparent',
                    borderLeft: `3px solid ${isActive ? T.accent : 'transparent'}`,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = T.bgAlt }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.text, fontFamily: T.fontDisplay }}>
                    {n.label}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2, fontFamily: T.fontBody }}>{n.desc}</div>
                </button>
              )
            })}

            {/* Sidebar summary */}
            {!loading && activities.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 1.1, marginBottom: 10, fontFamily: T.fontDisplay }}>RÉSUMÉ</div>
                {[
                  { label: 'Total',         value: activities.length },
                  { label: 'Cette semaine', value: activities.filter(a => isoWeek(new Date(a.started_at)) === isoWeek(new Date())).length },
                  { label: 'Compétitions',  value: activities.filter(a => a.is_race).length },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: T.textSub, fontFamily: T.fontBody }}>{s.label}</span>
                    <span style={{ color: T.text, fontWeight: 700, fontFamily: T.fontMono }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* ── CONTENT ── */}
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '14px 12px' : '22px 28px' }}>

          {/* Mobile nav */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setMobileOpen(o => !o)}
                style={{
                  width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: T.radius, padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: T.text,
                }}
              >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{active.label}</span>
                  <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>{active.desc}</span>
                </div>
                <span style={{ fontSize: 11, color: T.textMuted, transform: mobileOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
              </button>
              {mobileOpen && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, marginTop: 6, overflow: 'hidden' }}>
                  {NAV.map(n => {
                    const isActive = n.id === section
                    return (
                      <button
                        key={n.id}
                        onClick={() => { setSection(n.id); setMobileOpen(false) }}
                        style={{
                          width: '100%', textAlign: 'left', background: isActive ? T.accentBg : T.surface,
                          border: 'none', padding: '11px 16px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        <div style={{ fontSize: 13, color: isActive ? T.accentText : T.text, fontWeight: isActive ? 600 : 400 }}>{n.label}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{n.desc}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Page heading */}
          {!isMobile && (
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>{active.label}</h1>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: T.textMuted, fontFamily: T.fontBody }}>{active.desc}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: T.radius, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 5 }}>Erreur de chargement</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, fontFamily: 'monospace' }}>{error}</div>
              <button onClick={reload} style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
                Réessayer
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[80, 120, 80, 100].map((h, i) => (
                <div key={i} style={{ background: T.surface, borderRadius: T.radius, height: h, border: `1px solid ${T.border}`, opacity: 0.7 }} />
              ))}
            </div>
          )}

          {/* Sections */}
          {!loading && !error && section === 'donnees'     && <SectionDonnees activities={activities} zones={zones} profile={profile} />}
          {!loading && !error && section === 'analyse'     && <SectionAnalyse activities={activities} zones={zones} profile={profile} />}
          {!loading && !error && section === 'progression' && <SectionProgression activities={activities} />}
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        input::placeholder { color: #9ca3af; }
        button:focus { outline: none; }
        select option { background: #fff; color: #111827; }
        table { border-spacing: 0; }
      `}</style>
    </div>
  )
}
