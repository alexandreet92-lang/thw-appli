'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — light theme
// ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#f5f6f8',
  surface:   '#ffffff',
  border:    '#e5e7eb',
  borderMid: '#d1d5db',
  text:      '#111827',
  textSub:   '#6b7280',
  textMuted: '#9ca3af',
  accent:    '#2563eb',
  accentBg:  '#eff6ff',
  accentText:'#1d4ed8',
  sidebar:   '#ffffff',
  sidebarW:  220,
  topH:      52,
  radius:    8,
  shadow:    '0 1px 3px rgba(0,0,0,0.08)',
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

// ─────────────────────────────────────────────────────────────
// SPORT CONFIG (no emojis)
// ─────────────────────────────────────────────────────────────
const SPORT_LABEL: Record<SportType, string> = {
  run: 'Course', trail_run: 'Trail', bike: 'Vélo', virtual_bike: 'Home trainer',
  swim: 'Natation', rowing: 'Aviron', hyrox: 'Hyrox', gym: 'Muscu', other: 'Autre',
}

const SPORT_COLOR: Record<SportType, string> = {
  run: '#2563eb', trail_run: '#7c3aed', bike: '#d97706', virtual_bike: '#ea580c',
  swim: '#0891b2', rowing: '#059669', hyrox: '#dc2626', gym: '#6b7280', other: '#94a3b8',
}

const TIME_FILTER_LABEL: Record<TimeFilter, string> = {
  '1w': '1 sem.', '4w': '4 sem.', '6w': '6 sem.', '10w': '10 sem.', '6m': '6 mois', '1y': '1 an', 'all': 'Tout',
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function fmtDur(s: number | null | undefined): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
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

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSub, marginTop: 3 }}>{sub}</div>}
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
    <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, marginBottom: 14,
      textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {children}
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
// SECTION: DONNÉES
// ─────────────────────────────────────────────────────────────
function SectionDonnees({ activities }: { activities: Activity[] }) {
  const [filter, setFilter] = useState<TimeFilter>('4w')
  const cutoff = cutoffDate(filter)
  const inRange = useMemo(() =>
    activities.filter(a => !cutoff || new Date(a.started_at) >= cutoff),
    [activities, cutoff, filter]
  )

  // Aggregate stats
  const totalDist  = inRange.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalTime  = inRange.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalElev  = inRange.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)
  const totalTss   = inRange.reduce((s, a) => s + (a.tss ?? 0), 0)
  const hrVals     = inRange.filter(a => a.avg_hr).map(a => a.avg_hr!)
  const rpeVals    = inRange.filter(a => (a.rpe ?? a.perceived_effort)).map(a => a.rpe ?? a.perceived_effort ?? 0)
  const meanHr     = hrVals.length ? Math.round(avg(hrVals)) : null
  const meanRpe    = rpeVals.length ? avg(rpeVals).toFixed(1) : null
  const avgTss     = inRange.filter(a => a.tss).length ? Math.round(totalTss / inRange.filter(a => a.tss).length) : null

  // Weekly chart
  const nWeeks = numWeeks(filter)
  const weeks = useMemo(() => {
    const now = new Date()
    const map = new Map<string, { tss: number; dist: number; time: number; count: number }>()
    for (let i = nWeeks - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7)
      const k = isoWeek(d)
      if (!map.has(k)) map.set(k, { tss: 0, dist: 0, time: 0, count: 0 })
    }
    for (const a of inRange) {
      const k = isoWeek(new Date(a.started_at))
      if (map.has(k)) {
        const w = map.get(k)!
        w.tss  += a.tss ?? 0
        w.dist += a.distance_m ?? 0
        w.time += a.moving_time_s ?? 0
        w.count++
      }
    }
    return Array.from(map.entries()).map(([week, v]) => ({ week, ...v }))
  }, [inRange, nWeeks])

  const maxTss  = Math.max(...weeks.map(w => w.tss), 1)
  const maxDist = Math.max(...weeks.map(w => w.dist), 1)

  // Sport breakdown
  const sportMap = new Map<string, { count: number; time: number; dist: number }>()
  for (const a of inRange) {
    const s = a.sport_type ?? 'other'
    if (!sportMap.has(s)) sportMap.set(s, { count: 0, time: 0, dist: 0 })
    const e = sportMap.get(s)!
    e.count++; e.time += a.moving_time_s ?? 0; e.dist += a.distance_m ?? 0
  }
  const sports = Array.from(sportMap.entries()).sort((a, b) => b[1].time - a[1].time)

  return (
    <div>
      {/* Time filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {(Object.keys(TIME_FILTER_LABEL) as TimeFilter[]).map(f => (
          <Chip key={f} label={TIME_FILTER_LABEL[f]} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard label="Séances" value={inRange.length.toString()} />
        <StatCard label="Distance" value={fmtDist(totalDist)} />
        <StatCard label="Temps" value={fmtDur(totalTime)} />
        <StatCard label="D+" value={totalElev >= 1 ? `${Math.round(totalElev)} m` : '—'} />
        <StatCard label="TSS total" value={totalTss ? Math.round(totalTss).toString() : '—'} />
        <StatCard label="TSS / séance" value={avgTss ? avgTss.toString() : '—'} />
        <StatCard label="FC moy." value={meanHr ? `${meanHr} bpm` : '—'} />
        <StatCard label="RPE moyen" value={meanRpe ? `${meanRpe}/10` : '—'} />
      </div>

      {/* Weekly chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SectionTitle>Volume hebdomadaire</SectionTitle>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: T.textMuted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: T.accent, display: 'inline-block' }} />
              TSS
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#d1d5db', display: 'inline-block' }} />
              Distance
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
          {weeks.map((w, i) => {
            const hTss  = Math.round((w.tss / maxTss) * 96)
            const hDist = Math.round((w.dist / maxDist) * 96)
            const isNow = i === weeks.length - 1
            const d = new Date(w.week)
            const lbl = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            return (
              <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 1, height: 96, justifyContent: 'center' }}>
                  <div
                    title={`TSS: ${Math.round(w.tss)}`}
                    style={{ flex: 1, height: hTss || 1, background: isNow ? T.accent : T.accentBg, borderRadius: '2px 2px 0 0', maxWidth: 14 }}
                  />
                  <div
                    title={`Distance: ${fmtDist(w.dist)}`}
                    style={{ flex: 1, height: hDist || 1, background: isNow ? T.borderMid : T.border, borderRadius: '2px 2px 0 0', maxWidth: 14 }}
                  />
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
      </div>

      {/* Sport breakdown */}
      {sports.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px' }}>
          <SectionTitle>Répartition par sport</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sports.map(([sport, v]) => {
              const col = SPORT_COLOR[sport as SportType] ?? '#888'
              const pct = totalTime > 0 ? (v.time / totalTime) * 100 : (v.count / inRange.length) * 100
              return (
                <div key={sport} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 70px 60px', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{SPORT_LABEL[sport as SportType] ?? sport}</div>
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
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '3px 1fr auto',
        gap: 10, padding: '10px 12px', borderRadius: 7,
        cursor: 'pointer', marginBottom: 2,
        background: selected ? T.accentBg : 'transparent',
        border: `1px solid ${selected ? T.accent + '40' : 'transparent'}`,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <div style={{ background: col, borderRadius: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.title}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{fmtDateShort(a.started_at)}</span>
          <span style={{ color: col, fontWeight: 500 }}>{SPORT_LABEL[a.sport_type]}</span>
          {a.is_race && <span style={{ color: '#dc2626', fontWeight: 600 }}>Compétition</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.textSub, textAlign: 'right', flexShrink: 0 }}>
        {a.distance_m ? <div style={{ fontWeight: 500 }}>{fmtDist(a.distance_m)}</div> : null}
        {a.moving_time_s ? <div>{fmtDur(a.moving_time_s)}</div> : null}
        {paceS && ['run','trail_run'].includes(a.sport_type) ? <div style={{ color: T.textMuted }}>{fmtPace(paceS)}</div> : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY DETAIL
// ─────────────────────────────────────────────────────────────
function ActivityDetail({ a, onClose }: { a: Activity; onClose: () => void }) {
  const col = SPORT_COLOR[a.sport_type] ?? T.accent
  // Prefer stored pace from DB; fall back to computed
  const paceS = a.avg_pace_s_km
    ?? (a.moving_time_s && a.distance_m && a.distance_m > 100 ? (a.moving_time_s / a.distance_m) * 1000 : null)
  const isRun   = ['run', 'trail_run'].includes(a.sport_type)
  const isBike  = ['bike', 'virtual_bike'].includes(a.sport_type)
  const isSwim  = a.sport_type === 'swim'

  // Stats sections — each filtered to non-null values
  const perf = [
    { label: 'Distance',      v: fmtDist(a.distance_m) },
    { label: 'Durée',         v: fmtDur(a.moving_time_s) },
    { label: 'Allure moy.',   v: (isRun || isSwim) ? fmtPace(paceS) : null },
    { label: 'Vitesse moy.',  v: isBike && a.avg_speed_ms ? `${(a.avg_speed_ms * 3.6).toFixed(1)} km/h` : null },
    { label: 'D+',            v: a.elevation_gain_m ? `+${Math.round(a.elevation_gain_m)} m` : null },
    { label: 'D-',            v: a.elevation_loss_m ? `${Math.round(a.elevation_loss_m)} m` : null },
    { label: 'TSS',           v: a.tss ? Math.round(a.tss).toString() : null },
    { label: 'RPE',           v: (a.rpe ?? a.perceived_effort) ? `${(a.rpe ?? a.perceived_effort)}/10` : null },
  ].filter(s => s.v && s.v !== '—')

  const cardio = [
    { label: 'FC moy.',       v: a.avg_hr ? `${Math.round(Number(a.avg_hr))} bpm` : null },
    { label: 'FC max.',       v: a.max_hr ? `${a.max_hr} bpm` : null },
    { label: 'FC min.',       v: a.min_hr ? `${a.min_hr} bpm` : null },
    { label: 'TRIMP',         v: a.trimp ? a.trimp.toString() : null },
    { label: 'Découplage',    v: a.aerobic_decoupling != null ? `${Number(a.aerobic_decoupling).toFixed(1)}%` : null },
  ].filter(s => s.v)

  const power = [
    { label: 'Watts moy.',    v: a.avg_watts ? `${Math.round(Number(a.avg_watts))} W` : null },
    { label: 'Watts max.',    v: a.max_watts ? `${a.max_watts} W` : null },
    { label: 'NP',            v: a.normalized_watts ? `${a.normalized_watts} W` : null },
    { label: 'IF',            v: a.intensity_factor ? Number(a.intensity_factor).toFixed(2) : null },
    { label: 'FTP (époque)',  v: a.ftp_at_time ? `${a.ftp_at_time} W` : null },
    { label: 'kJ',            v: a.kilojoules ? `${Math.round(Number(a.kilojoules))} kJ` : null },
  ].filter(s => s.v)

  const extra = [
    { label: 'Cadence moy.',  v: a.avg_cadence ? `${Math.round(Number(a.avg_cadence))} rpm` : null },
    { label: 'Cadence max.',  v: a.max_cadence ? `${a.max_cadence} rpm` : null },
    { label: 'Calories',      v: a.calories ? `${a.calories} kcal` : null },
    { label: 'Température',   v: a.avg_temp_c != null ? `${Math.round(Number(a.avg_temp_c))}°C` : null },
    { label: 'Gear',          v: a.gear_name ?? null },
    { label: 'Source',        v: a.provider ?? null },
    { label: 'Appareil',      v: a.trainer ? 'Home trainer' : null },
  ].filter(s => s.v)

  function StatRow({ items }: { items: { label: string; v: string | null }[] }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {items.map(s => (
          <div key={s.label} style={{ background: T.bg, borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{s.v}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, background: col + '18', color: col, padding: '2px 9px', borderRadius: 12 }}>
              {SPORT_LABEL[a.sport_type]}
            </span>
            {a.is_race && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#dc2626', padding: '2px 9px', borderRadius: 12 }}>
                Compétition
              </span>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>{a.title}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>{fmtDate(a.started_at)}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 18, padding: '0 2px', lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Altitude */}
        {a.streams?.altitude && a.streams.altitude.length > 2 && (
          <AltitudeLine alt={a.streams.altitude} />
        )}

        {/* Stream charts */}
        {a.streams?.watts && a.streams.watts.length > 2 && (
          <StreamLine data={a.streams.watts} color="#7c3aed" label="Puissance (W)" unit="W" />
        )}
        {a.streams?.heartrate && a.streams.heartrate.length > 2 && (
          <StreamLine data={a.streams.heartrate} color="#dc2626" label="FC (bpm)" unit="bpm" />
        )}
        {a.streams?.velocity && a.streams.velocity.length > 2 && (
          <StreamLine data={a.streams.velocity.map(v => v * 3.6)} color="#2563eb" label="Vitesse (km/h)" unit="km/h" />
        )}

        {/* Stats sections */}
        {perf.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>Performance</div>
            <StatRow items={perf} />
          </div>
        )}
        {cardio.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>Cardio</div>
            <StatRow items={cardio} />
          </div>
        )}
        {power.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>Puissance</div>
            <StatRow items={power} />
          </div>
        )}
        {extra.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>Détails</div>
            <StatRow items={extra} />
          </div>
        )}

        {/* Notes */}
        {a.notes && (
          <div style={{ background: T.bg, borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>{a.notes}</div>
          </div>
        )}

        {/* Laps */}
        {a.laps && a.laps.length > 1 && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>
              Intervalles — {a.laps.length} tours
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: T.textMuted, textAlign: 'left' }}>
                    <th style={{ padding: '3px 6px 6px 0', fontWeight: 500, fontSize: 10 }}>#</th>
                    <th style={{ padding: '3px 6px 6px', fontWeight: 500, fontSize: 10 }}>Dist.</th>
                    <th style={{ padding: '3px 6px 6px', fontWeight: 500, fontSize: 10 }}>Durée</th>
                    <th style={{ padding: '3px 6px 6px', fontWeight: 500, fontSize: 10 }}>Allure</th>
                    <th style={{ padding: '3px 6px 6px', fontWeight: 500, fontSize: 10 }}>FC</th>
                  </tr>
                </thead>
                <tbody>
                  {a.laps.map((lap, i) => {
                    const lp = lap.moving_time_s && lap.distance_m > 0 ? (lap.moving_time_s / lap.distance_m) * 1000 : null
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: '5px 6px 5px 0', color: T.textMuted }}>{i + 1}</td>
                        <td style={{ padding: '5px 6px', color: T.text }}>{fmtDist(lap.distance_m)}</td>
                        <td style={{ padding: '5px 6px', color: T.text }}>{fmtDur(lap.moving_time_s)}</td>
                        <td style={{ padding: '5px 6px', color: T.text }}>{fmtPace(lp)}</td>
                        <td style={{ padding: '5px 6px', color: T.text }}>{lap.avg_hr ? `${Math.round(lap.avg_hr)} bpm` : '—'}</td>
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
// SECTION: ANALYSE
// ─────────────────────────────────────────────────────────────
function SectionAnalyse({ activities }: { activities: Activity[] }) {
  const [selected, setSelected] = useState<Activity | null>(null)
  const [search, setSearch]   = useState('')
  const [sport, setSport]     = useState<'all' | SportType>('all')
  const [raceFilter, setRaceFilter] = useState<'all' | 'race' | 'training'>('all')
  const width = useWindowWidth()
  const wide  = width >= 960

  const allSports = useMemo(() => Array.from(new Set(activities.map(a => a.sport_type))), [activities])

  const filtered = useMemo(() => activities.filter(a => {
    if (sport !== 'all' && a.sport_type !== sport) return false
    if (raceFilter === 'race' && !a.is_race) return false
    if (raceFilter === 'training' && a.is_race) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.title?.toLowerCase().includes(q) && !a.sport_type?.toLowerCase().includes(q)) return false
    }
    return true
  }), [activities, sport, raceFilter, search])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected && wide ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
      <div>
        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{
              flex: '1 1 160px', background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 7, padding: '7px 12px', fontSize: 12, color: T.text, outline: 'none',
            }}
          />
          <select
            value={sport} onChange={e => setSport(e.target.value as 'all' | SportType)}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: T.text, outline: 'none' }}
          >
            <option value="all">Tous les sports</option>
            {allSports.map(s => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
          </select>
          <select
            value={raceFilter} onChange={e => setRaceFilter(e.target.value as typeof raceFilter)}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: T.text, outline: 'none' }}
          >
            <option value="all">Tout</option>
            <option value="training">Entraînements</option>
            <option value="race">Compétitions</option>
          </select>
        </div>

        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
          {filtered.length} activité{filtered.length !== 1 ? 's' : ''}
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {filtered.map(act => (
              <ActivityRow
                key={act.id} a={act}
                selected={selected?.id === act.id}
                onClick={() => setSelected(prev => prev?.id === act.id ? null : act)}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>
                Aucune activité
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div style={wide ? { position: 'sticky', top: T.topH + 16 } : { marginTop: 12 }}>
          <ActivityDetail a={selected} onClose={() => setSelected(null)} />
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
  const [section, setSection]       = useState<Section>('donnees')
  const [mobileOpen, setMobileOpen] = useState(false)
  const width   = useWindowWidth()
  const isMobile = width < 768
  const active  = NAV.find(n => n.id === section)!

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        height: T.topH, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        boxShadow: T.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Training</span>
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
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 1.2, paddingLeft: 10, marginBottom: 8 }}>
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
                    borderRadius: 7, padding: '9px 10px', cursor: 'pointer', marginBottom: 2,
                    background: isActive ? T.accentBg : 'transparent',
                    borderLeft: `3px solid ${isActive ? T.accent : 'transparent'}`,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.accentText : T.text }}>
                    {n.label}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{n.desc}</div>
                </button>
              )
            })}

            {/* Sidebar summary */}
            {!loading && activities.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 1.2, marginBottom: 10 }}>RÉSUMÉ</div>
                {[
                  { label: 'Total',        value: activities.length },
                  { label: 'Cette semaine', value: activities.filter(a => isoWeek(new Date(a.started_at)) === isoWeek(new Date())).length },
                  { label: 'Compétitions', value: activities.filter(a => a.is_race).length },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: T.textSub }}>{s.label}</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{s.value}</span>
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
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>{active.label}</h1>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: T.textMuted }}>{active.desc}</p>
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
          {!loading && !error && section === 'donnees'     && <SectionDonnees activities={activities} />}
          {!loading && !error && section === 'analyse'     && <SectionAnalyse activities={activities} />}
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
