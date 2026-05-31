'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/hooks/useTheme'
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '@/components/ui/ScrollReveal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FitnessCards } from '@/components/training/FitnessCards'
import { SportTabs } from '@/components/ui/SportTabs'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { TRAINING_ONBOARDING } from '@/onboarding/configs/training.config'
import { HelpCircle, ChevronDown, ChevronLeft, MoreHorizontal, Sparkles } from 'lucide-react'
import { ActivityTitle } from '@/components/activity/ActivityTitle'
import { Spinner } from '@/components/ui/Spinner'
import { SkeletonFitnessCards } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { ActivityMapCard } from '@/components/activity/ActivityMapCard'
import { LapsChart } from '@/components/activity/LapsChart'
import { LapsTable } from '@/components/activity/LapsTable'
import { PowerDistribution } from '@/components/activity/PowerDistribution'
import { AerobicEfficiency } from '@/components/activity/AerobicEfficiency'
import { MmpTable, MMP_TABLE_DURATIONS, MMP_TABLE_LABELS } from '@/components/activity/MmpTable'
import { AIBubble } from '@/components/activity/AIBubble'
import { useAIAnalysis } from '@/hooks/useAIAnalysis'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — CSS variables (auto light/dark via html.light / html.dark)
// ─────────────────────────────────────────────────────────────
const T = {
  bg:          'var(--bg)',
  bgAlt:       'var(--bg-card2)',
  surface:     'var(--bg-card)',
  border:      'var(--border)',
  borderMid:   'var(--border-mid)',
  text:        'var(--text)',
  textSub:     'var(--text-mid)',
  textMuted:   'var(--text-dim)',
  accent:      '#1B6EF3',
  accentBg:    'rgba(27,110,243,0.08)',
  accentText:  '#4D9EFF',
  sidebar:     'var(--nav-bg)',
  sidebarW:    220,
  topH:        52,
  radius:      16,
  radiusSm:    10,
  shadow:      'var(--shadow-card)',
  shadowCard:  'var(--shadow)',
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
  max_speed_ms:     number | null
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
  summary_polyline: string | null
  raw_data:         Record<string, unknown> | null
  [key: string]:    unknown
}

interface StreamData {
  time?:             number[]
  distance?:         number[]
  altitude?:         number[]
  heartrate?:        number[]
  velocity?:         number[]
  watts?:            number[]
  cadence?:          number[]
  temp?:             number[]
  latlng?:           number[][]
}

interface LapData {
  lap_index?:       number
  start_index?:     number
  end_index?:       number
  distance_m:       number
  moving_time_s:    number
  elapsed_time_s?:  number | null
  avg_hr?:          number | null
  max_heartrate?:   number | null
  avg_speed_ms?:    number | null
  avg_watts?:       number | null
  max_watts?:       number | null
  avg_cadence?:     number | null
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

interface Profile { weight_kg: number | null; birth_date: string | null }

// ─────────────────────────────────────────────────────────────
// SPORT CONFIG (no emojis)
// ─────────────────────────────────────────────────────────────
const SPORT_LABEL: Record<SportType, string> = {
  run: 'Course', trail_run: 'Trail', bike: 'Vélo', virtual_bike: 'Vélo',
  swim: 'Natation', rowing: 'Aviron', hyrox: 'Hyrox', gym: 'Muscu', other: 'Autre',
}

// Pour les agrégations sport, virtual_bike est regroupé avec bike
function normalizeSport(sport: string): string {
  return sport === 'virtual_bike' ? 'bike' : sport
}

const SPORT_COLOR: Record<SportType, string> = {
  run: '#f97316', trail_run: '#f97316', bike: '#3b82f6', virtual_bike: '#60a5fa',
  swim: '#06b6d4', rowing: '#14b8a6', hyrox: '#ec4899', gym: '#8b5cf6', other: '#94a3b8',
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
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  if (m > 0) return sec > 0 ? `${m}'${String(sec).padStart(2, '0')}` : `${m}'`
  return `${sec}s`
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
// HOOK: useActivities — pagination par lots de 50
// ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

function useActivities() {
  const [activities, setActivities]   = useState<Activity[]>([])
  const [totalCount, setTotalCount]   = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const pageRef = useRef(0)
  const busyRef = useRef(false)

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    if (busyRef.current) return
    busyRef.current = true
    if (reset) { setLoading(true); setError(null) }
    else setLoadingMore(true)
    try {
      const sb = createClient()
      const from = pageNum * PAGE_SIZE
      const { data, error: err, count } = await sb
        .from('activities')
        .select('*', { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (err) throw err
      const items = (data ?? []) as unknown as Activity[]
      if (reset) setActivities(items)
      else setActivities(prev => [...prev, ...items])
      if (count !== null) setTotalCount(count)
      setHasMore(items.length === PAGE_SIZE)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      busyRef.current = false
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }, [])

  const load = useCallback(async () => {
    pageRef.current = 0
    setHasMore(true)
    await fetchPage(0, true)
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || busyRef.current) return
    pageRef.current += 1
    await fetchPage(pageRef.current, false)
  }, [fetchPage, hasMore, loadingMore])

  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id))
    setTotalCount(prev => prev !== null ? prev - 1 : null)
  }, [])

  useEffect(() => { load() }, [load])
  return { activities, totalCount, loading, loadingMore, hasMore, error, reload: load, loadMore, removeActivity }
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
  const [profile, setProfile] = useState<Profile>({ weight_kg: null, birth_date: null })
  useEffect(() => {
    createClient().from('profiles').select('weight_kg,birth_date').limit(1).single()
      .then(({ data }) => { if (data) setProfile(data as Profile) })
  }, [])
  return profile
}

// Estimated max HR: use 220 - age if birth_date is known, else 190 as default
function estimateMaxHr(birth_date: string | null): number {
  if (!birth_date) return 190
  const age = new Date().getFullYear() - new Date(birth_date).getFullYear()
  return Math.max(160, 220 - age)
}

// Reads CTL/ATL/TSB from metrics_daily if rows exist (more accurate than client-side)
function useMetricsDaily(): { ctl: number | null; atl: number | null; tsb: number | null; loading: boolean } {
  const [metrics, setMetrics] = useState<{ ctl: number | null; atl: number | null; tsb: number | null }>({ ctl: null, atl: null, tsb: null })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    createClient().from('metrics_daily').select('ctl,atl,tsb,date')
      .order('date', { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data && (data as Record<string, unknown>).ctl != null) {
          const d = data as { ctl: number; atl: number; tsb: number }
          setMetrics({ ctl: Math.round(d.ctl * 10) / 10, atl: Math.round(d.atl * 10) / 10, tsb: Math.round(d.tsb * 10) / 10 })
        }
        setLoading(false)
      }, () => { setLoading(false) })
  }, [])
  return { ...metrics, loading }
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

const ZONE_DESCRIPTIONS: Record<string, string> = {
  'Z1': 'Récupération — effort très léger, fréquence cardiaque basse. Idéal pour récupérer entre les séances.',
  'Z2': 'Endurance — base aérobie fondamentale. Effort où une conversation est encore possible. Zone clé du volume d\'entraînement.',
  'Z3': 'Tempo — allure soutenue, légèrement inconfortable. Améliore l\'endurance lactique.',
  'Z4': 'Seuil — effort intense, proche du seuil lactique. Impossible de tenir plus de 20–60 min.',
  'Z5': 'VO2max — sprint, effort maximal court. Stimule la puissance aérobie maximale.',
}

// ─────────────────────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────────────────────
function DonutChart({ zones, timesS, onZoneClick }: {
  zones: ParsedZone[]; timesS: number[]; onZoneClick?: (zone: ParsedZone) => void
}) {
  const total = timesS.reduce((a, b) => a + b, 0)
  if (!total) return <div style={{ fontSize: 12, color: T.textMuted }}>Aucune donnée de zone</div>

  const R = 36, strokeW = 10, C = 2 * Math.PI * R
  let offset = 0
  const segments = zones.map((z, i) => {
    const pct = total > 0 ? timesS[i] / total : 0
    const dash = pct * C
    const seg = { zone: z, time: timesS[i], pct, dash, offset }
    offset += dash
    return seg
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={R} fill="none" stroke={T.border} strokeWidth={strokeW} />
        {segments.map((seg, i) => (
          <circle key={i} cx={45} cy={45} r={R}
            fill="none"
            stroke={seg.zone.color}
            strokeWidth={strokeW}
            strokeDasharray={`${seg.dash} ${C - seg.dash}`}
            strokeDashoffset={C / 4 - seg.offset}
            style={{ cursor: onZoneClick ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
            onMouseEnter={e => { (e.target as SVGCircleElement).style.opacity = '0.7' }}
            onMouseLeave={e => { (e.target as SVGCircleElement).style.opacity = '1' }}
            onClick={() => onZoneClick?.(seg.zone)}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {segments.map((seg, i) => (
          <div key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: onZoneClick ? 'pointer' : 'default' }}
            onClick={() => onZoneClick?.(seg.zone)}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.zone.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.textSub, minWidth: 24 }}>{seg.zone.label}</span>
            <span style={{ fontSize: 11, color: T.text, fontWeight: 600, fontFamily: T.fontMono }}>{fmtDur(seg.time)}</span>
            <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>{(seg.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Zones with toggle (Jauges / Donuts)
function ZonesSection({ label, zones, timesS }: { label: string; zones: ParsedZone[]; timesS: number[] }) {
  const [view, setView] = useState<'jauges' | 'donuts'>('jauges')
  const [activeZone, setActiveZone] = useState<ParsedZone | null>(null)

  return (
    <div style={{ flex: '1 1 200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: T.textMuted }}>{label}</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['jauges','donuts'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
              background: view === v ? T.accent : T.surface,
              color: view === v ? '#fff' : T.textMuted,
              border: `1px solid ${view === v ? T.accent : T.border}`,
              transition: 'all 0.15s',
            }}>
              {v === 'jauges' ? 'Jauges' : 'Donuts'}
            </button>
          ))}
        </div>
      </div>
      {view === 'jauges'
        ? <ZoneBars zones={zones} timesS={timesS} />
        : <DonutChart zones={zones} timesS={timesS} onZoneClick={z => setActiveZone(z)} />
      }
      {/* Zone description bottom sheet */}
      <BottomSheet
        isOpen={activeZone !== null}
        onClose={() => setActiveZone(null)}
        title={activeZone?.label ?? ''}
      >
        {activeZone && (
          <div style={{ paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: activeZone.color, display: 'inline-block' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{activeZone.label}</span>
            </div>
            <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, margin: 0 }}>
              {ZONE_DESCRIPTIONS[activeZone.label] ?? 'Zone d\'entraînement.'}
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: T.textMuted }}>
              {activeZone.min > 0 && <span>Plage : {activeZone.min} – {activeZone.max === Infinity ? '∞' : activeZone.max}</span>}
            </div>
          </div>
        )}
      </BottomSheet>
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
// SHARED: Mini crosshair chart (standalone SVG with hover)
// ─────────────────────────────────────────────────────────────
function useCrosshairSvg(
  svgRef: React.RefObject<SVGSVGElement | null>,
  N: number
): { idx: number | null; pct: number | null; onMove: (e: React.MouseEvent | React.TouchEvent) => void; onLeave: () => void } {
  const [idx, setIdx] = useState<number | null>(null)
  const [pct, setPct] = useState<number | null>(null)
  function getIdx(clientX: number) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setPct(p)
    setIdx(Math.min(N - 1, Math.max(0, Math.round(p * (N - 1)))))
  }
  function onMove(e: React.MouseEvent | React.TouchEvent) {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    getIdx(clientX)
  }
  function onLeave() { setIdx(null); setPct(null) }
  return { idx, pct, onMove, onLeave }
}

// ─────────────────────────────────────────────────────────────
// POWER CURVE CHART — vélo uniquement
// ─────────────────────────────────────────────────────────────
const MMP_DURATIONS   = [5,10,30,60,180,300,600,1200,1800,3600,5400,7200,10800,14400]
const MMP_LABELS      = ["5s","10s","30s","1'","3'","5'","10'","20'","30'","1h","1h30","2h","3h","4h"]
const KEY_MOMENT_DURS = [300, 1200, 1800, 2700, 3600] // 5' 20' 30' 45' 1h
const KEY_MOMENT_LBLS = ["5'", "20'", "30'", "45'", "1h"]

function calculateDecoupling(watts: number[], heartrate: number[]): number | null {
  const n = Math.min(watts.length, heartrate.length)
  if (n < 120) return null
  const mid = Math.floor(n / 2)
  const avgW1 = watts.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const avgHr1 = heartrate.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const avgW2 = watts.slice(mid, n).reduce((a, b) => a + b, 0) / (n - mid)
  const avgHr2 = heartrate.slice(mid, n).reduce((a, b) => a + b, 0) / (n - mid)
  const ef1 = avgHr1 > 0 ? avgW1 / avgHr1 : 0
  const ef2 = avgHr2 > 0 ? avgW2 / avgHr2 : 0
  if (ef1 === 0) return null
  return ((ef1 - ef2) / ef1) * 100
}

function computeMmpCurve(wStream: number[], durations: number[]): number[] {
  const N = wStream.length
  // Cap spikes at 1500W avant le calcul
  const cleaned = wStream.map(w => Math.min(w, 1500))
  const prefix = new Array(N + 1).fill(0)
  for (let i = 0; i < N; i++) prefix[i + 1] = prefix[i] + cleaned[i]
  return durations.map(d => {
    if (d > N) return 0
    let max = 0
    for (let i = 0; i <= N - d; i++) {
      const avg = (prefix[i + d] - prefix[i]) / d
      if (avg > max) max = avg
    }
    return Math.round(max)
  })
}

function PowerCurveChart({ watts, activityId, activityDurationS }: {
  watts:             number[]
  activityId:        string
  activityDurationS: number
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const N = watts.length
  if (N < 60) return null

  const DURATIONS = MMP_DURATIONS.filter(d => d <= N)
  const LABELS    = MMP_LABELS.filter((_, i) => MMP_DURATIONS[i] <= N)

  const mmp = useMemo(() => {
    return computeMmpCurve(watts, DURATIONS)
  }, [watts, DURATIONS])

  // Session MMP for all table durations (including non-standard ones like 45')
  const sessionMmpTable = useMemo(() =>
    computeMmpCurve(watts, MMP_TABLE_DURATIONS),
    [watts]
  )

  // PR curve (chart background) + year + alltime records for the table
  const [prMmp,        setPrMmp]        = useState<number[] | null>(null)
  const [yearMmp,      setYearMmp]      = useState<number[] | null>(null)
  const [allTimeMmp,   setAllTimeMmp]   = useState<number[] | null>(null)
  const [recordFilter, setRecordFilter] = useState<'year' | 'alltime'>('alltime')
  const [prLoading,    setPrLoading]    = useState(false)

  useEffect(() => {
    setPrLoading(true)
    const since24m  = new Date(Date.now() - 24 * 30 * 86_400_000).toISOString()
    const since3y   = new Date(Date.now() - 36 * 30 * 86_400_000).toISOString()
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()

    type MmpRow = { id: string; streams: StreamData | null }

    function aggregate(rows: MmpRow[]): { prBest: number[]; tableBest: number[] } {
      const prBest    = DURATIONS.map(() => 0)
      const tableBest = MMP_TABLE_DURATIONS.map(() => 0)
      for (const row of rows) {
        if (row.id === activityId) continue
        const s = row.streams
        if (!s?.watts?.length) continue
        if (Math.max(...s.watts) > 1200) continue
        computeMmpCurve(s.watts, DURATIONS).forEach((v, i) => { if (v > prBest[i]) prBest[i] = v })
        computeMmpCurve(s.watts, MMP_TABLE_DURATIONS).forEach((v, i) => { if (v > tableBest[i]) tableBest[i] = v })
      }
      return { prBest, tableBest }
    }

    const base = createClient().from('activities').select('id, streams')
      .in('sport_type', ['bike','virtual_bike']).not('streams', 'is', null)

    Promise.all([
      base.gte('started_at', since24m),
      base.gte('started_at', yearStart),
      base.gte('started_at', since3y),
    ]).then(([r24m, ryear, r3y]) => {
      const { prBest, tableBest: table24 } = aggregate((r24m.data  ?? []) as MmpRow[])
      const { tableBest: tableYear }        = aggregate((ryear.data ?? []) as MmpRow[])
      const { tableBest: tableAll  }        = aggregate((r3y.data   ?? []) as MmpRow[])

      setPrMmp(prBest.some(v => v > 0) ? prBest : null)
      setYearMmp(tableYear)
      setAllTimeMmp(tableAll)
      void table24 // computed but superseded by alltime for the table
      setPrLoading(false)
    }).catch(() => setPrLoading(false))
  }, [activityId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Key moment markers (5' 20' 30' 45' 1h) — only if duration in range
  const keyMoments = useMemo(() => {
    return KEY_MOMENT_DURS
      .filter(d => d <= N)
      .map((d, i) => {
        const ti = MMP_TABLE_DURATIONS.indexOf(d)
        const w  = ti >= 0 ? sessionMmpTable[ti] : 0
        return { d, label: KEY_MOMENT_LBLS[KEY_MOMENT_DURS.indexOf(d)], watts: w, altY: i % 2 === 1 }
      })
      .filter(m => m.watts > 0)
  }, [sessionMmpTable, N])

  const { idx, pct, onMove, onLeave } = useCrosshairSvg(svgRef, DURATIONS.length)
  const mmpContainerRef = useRef<HTMLDivElement>(null)
  const [mmpMousePos,   setMmpMousePos] = useState<{ x: number; y: number } | null>(null)

  function handleMmpMove(e: React.MouseEvent) {
    if (mmpContainerRef.current) {
      const r = mmpContainerRef.current.getBoundingClientRect()
      setMmpMousePos({ x: e.clientX - r.left, y: e.clientY - r.top })
    }
    onMove(e)
  }
  function handleMmpLeave() { setMmpMousePos(null); onLeave() }

  const W = 1000, H = 220, pad = 10
  void pad

  // Log10 scale helpers
  const logMin = Math.log10(DURATIONS[0])
  const logMax = Math.log10(DURATIONS[DURATIONS.length - 1])
  function logX(d: number): number {
    return ((Math.log10(d) - logMin) / (logMax - logMin)) * W
  }

  const allVals = [...mmp, ...(prMmp ?? [])]
  const maxYWatts = Math.ceil(Math.max(...allVals.filter(v => v > 0), 200) / 200) * 200

  function yOf(v: number): number {
    return H - (v / maxYWatts) * H
  }

  const yGridlines: number[] = []
  for (let w = 0; w <= maxYWatts; w += 200) yGridlines.push(w)

  function buildCurvePaths(vals: number[]): { fill: string; line: string } {
    const pts = DURATIONS.map((d, i) => `${logX(d).toFixed(1)},${yOf(vals[i]).toFixed(1)}`)
    return {
      fill: `M${logX(DURATIONS[0]).toFixed(1)},${H}L${pts.join('L')}L${logX(DURATIONS[DURATIONS.length-1]).toFixed(1)},${H}Z`,
      line: `M${pts.join('L')}`,
    }
  }

  const { fill: fillPath, line: linePath } = buildCurvePaths(mmp)
  const prPaths = prMmp ? buildCurvePaths(prMmp) : null

  const cursorX = pct !== null ? pct * W : null
  const avgW = watts.reduce((a, b) => a + b, 0) / N

  function fmtDuration(s: number): string {
    if (s < 60)   return `${s}s`
    if (s < 3600) { const m = Math.floor(s/60); const sec = s%60; return sec ? `${m}'${String(sec).padStart(2,'0')}` : `${m}'` }
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60)
    return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`
  }

  const recordMmp = recordFilter === 'year' ? yearMmp : allTimeMmp

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
        Courbe de puissance (MMP)
        {prLoading && <span style={{ marginLeft: 8, fontSize: 10, color: T.textMuted, fontWeight: 400 }}>Calcul des records…</span>}
      </div>

      {/* Hover bar */}
      {idx !== null && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 8, background: T.bgAlt, borderRadius: 8, padding: '6px 12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#5b6fff', fontWeight: 600, fontFamily: T.fontMono }}>{mmp[idx]} W · {fmtDuration(DURATIONS[idx])}</span>
          <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>{(mmp[idx] / avgW).toFixed(2)}× moy.</span>
          {prMmp && prMmp[idx] > 0 && (
            <span style={{ fontSize: 10, color: '#EF4444', fontFamily: T.fontMono }}>Record 24m: {prMmp[idx]} W</span>
          )}
        </div>
      )}

      <div ref={mmpContainerRef} style={{ position: 'relative', cursor: 'crosshair', paddingLeft: 32 }}>
        <svg ref={svgRef} viewBox={`-32 0 ${W + 32} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}
          preserveAspectRatio="none"
          onMouseMove={handleMmpMove} onMouseLeave={handleMmpLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          <defs>
            <linearGradient id="mmpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b6fff" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#5b6fff" stopOpacity="0.02"/>
            </linearGradient>
          </defs>

          {/* Gridlines Y tous les 200W */}
          {yGridlines.filter(w => w > 0).map(w => {
            const y = yOf(w)
            return (
              <g key={w}>
                <line x1={0} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3"/>
                <text x={-6} y={y + 4} textAnchor="end" style={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>{w}W</text>
              </g>
            )
          })}

          {/* PR curve (background) */}
          {prPaths && (
            <>
              <path d={prPaths.fill} fill="rgba(239,68,68,0.05)"/>
              <path d={prPaths.line} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="5,3" strokeLinejoin="round"/>
            </>
          )}

          {/* This activity curve */}
          <path d={fillPath} fill="url(#mmpFill)"/>
          <path d={linePath} fill="none" stroke="#5b6fff" strokeWidth="2" strokeLinejoin="round"/>

          {/* Key moment markers — rendered before cursor so cursor stays on top */}
          {keyMoments.map(({ d, label: kmLabel, watts: kmW, altY }) => {
            const x  = logX(d)
            const cy = yOf(kmW)
            const ly = altY ? cy - 24 : cy - 10
            return (
              <g key={d}>
                <line x1={x} y1={0} x2={x} y2={H} stroke="#94A3B8" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.65"/>
                <rect x={x - 22} y={ly - 11} width={44} height={12} rx={2}
                  fill="var(--bg-card)" stroke="#94A3B8" strokeWidth="0.7" opacity="0.95"/>
                <text x={x} y={ly - 2} textAnchor="middle"
                  fontSize="9" fill="var(--text-mid)" fontWeight="700"
                  style={{ fontFamily: 'DM Mono, monospace' }}>
                  {kmW}W
                </text>
                <circle cx={x} cy={cy} r="2.5" fill="#94A3B8" opacity="0.8"/>
              </g>
            )
          })}

          {cursorX !== null && (
            <line x1={cursorX} y1={0} x2={cursorX} y2={H} stroke={T.text} strokeWidth="1" strokeDasharray="3,3"/>
          )}
          {idx !== null && (
            <circle cx={logX(DURATIONS[idx])} cy={yOf(mmp[idx])} r="4" fill="#5b6fff"/>
          )}
          {idx !== null && prMmp && prMmp[idx] > 0 && (
            <circle cx={logX(DURATIONS[idx])} cy={yOf(prMmp[idx])} r="3.5" fill="#EF4444" opacity="0.8"/>
          )}
        </svg>

        {/* MMP tooltip */}
        {idx !== null && mmpMousePos && (
          <div style={{
            position: 'absolute',
            left: mmpMousePos.x > 300 ? mmpMousePos.x - 155 : mmpMousePos.x + 14,
            top: Math.max(4, mmpMousePos.y - 72),
            background: 'var(--bg)',
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
            pointerEvents: 'none',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4, fontFamily: T.fontMono }}>
              {fmtDuration(DURATIONS[idx])}
            </div>
            <div style={{ color: '#5b6fff', fontWeight: 700, fontFamily: T.fontMono }}>
              {mmp[idx]} W <span style={{ color: T.textMuted, fontWeight: 400, fontSize: 10 }}>séance</span>
            </div>
            {prMmp && prMmp[idx] > 0 && (
              <div style={{ color: '#EF4444', fontFamily: T.fontMono, marginTop: 2 }}>
                {prMmp[idx]} W <span style={{ color: T.textMuted, fontWeight: 400, fontSize: 10 }}>record</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* X axis labels */}
      <div style={{ position: 'relative', height: 16, marginTop: 2 }}>
        {DURATIONS.map((d, i) => (
          <span key={d} style={{
            position: 'absolute',
            left: `${(logX(d) / W) * 100}%`,
            transform: 'translateX(-50%)',
            fontSize: 9, color: T.textMuted, fontFamily: T.fontMono, whiteSpace: 'nowrap',
          }}>{LABELS[i]}</span>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#5b6fff', display: 'inline-block', borderRadius: 1 }}/>Cette séance
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#EF4444', display: 'inline-block', borderRadius: 1 }}/>Record 24 mois
        </div>
      </div>

      {/* Records vs Session table */}
      <MmpTable
        sessionMmp={sessionMmpTable}
        recordMmp={recordMmp}
        durations={MMP_TABLE_DURATIONS}
        labels={MMP_TABLE_LABELS}
        sessionN={activityDurationS}
        filter={recordFilter}
        onFilter={setRecordFilter}
        loading={prLoading}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GAP CHART — Course à pied uniquement (allure réelle vs ajustée)
// ─────────────────────────────────────────────────────────────
function GapChart({ velocity, altitude, distance }: { velocity: number[]; altitude: number[]; distance: number[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const N = Math.min(velocity.length, altitude.length, distance.length)
  if (N < 60) return null

  // Smooth data
  function smooth(arr: number[], w = 5): number[] {
    return arr.map((_, i) => {
      const sl = arr.slice(Math.max(0, i - w), i + w + 1)
      return sl.reduce((a, b) => a + b, 0) / sl.length
    })
  }

  const pace = useMemo(() =>
    smooth(velocity.slice(0, N).map(v => v > 0.3 ? 1000 / v : 0), 10),
    [velocity, N]
  )

  // Grade Adjusted Pace using Minetti energy cost model
  // grade = (dAlt / dDist) per sample, smoothed
  const gap = useMemo(() => {
    const grades = altitude.slice(0, N).map((alt, i) => {
      if (i === 0) return 0
      const dDist = Math.max(0.1, distance[i] - distance[i - 1])
      const dAlt  = alt - altitude[i - 1]
      return dAlt / dDist  // unitless grade (rise/run)
    })
    const sGrades = smooth(grades, 15)
    return pace.map((p, i) => {
      if (p <= 0) return 0
      const g = Math.max(-0.45, Math.min(0.45, sGrades[i]))
      // Strava-like GAP factor based on Minetti metabolic cost
      // factor > 1 → going uphill (harder) → GAP pace is faster
      const factor = 1 + g * (0.033 * Math.abs(g) * 1000 + 0.133)
      return p / Math.max(0.5, factor)
    })
  }, [pace, altitude, distance, N, smooth])

  const { idx, pct, onMove, onLeave } = useCrosshairSvg(svgRef, N)
  const W = 1000, H = 80, pad = 4

  const validPace = pace.filter(v => v > 0)
  const validGap  = gap.filter(v => v > 0)
  if (!validPace.length) return null

  const minV = Math.min(...validPace, ...validGap) * 0.95
  const maxV = Math.max(...validPace, ...validGap) * 1.05
  const range = maxV - minV || 1

  function buildPath(data: number[], fill: boolean): string {
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * W
      const y = v > 0 ? H - pad - ((maxV - v) / range) * (H - pad * 2) : H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    if (fill) return `M0,${H}L${pts.join('L')}L${W},${H}Z`
    return `M${pts.join('L')}`
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
        Allure réelle vs ajustée (GAP)
      </div>

      {idx !== null && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 8, background: T.bgAlt, borderRadius: 8, padding: '6px 12px', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600, fontFamily: T.fontMono }}>Réelle {fmtPace(pace[idx])}</span>
          <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600, fontFamily: T.fontMono }}>GAP {fmtPace(gap[idx])}</span>
          {gap[idx] > 0 && pace[idx] > 0 && Math.abs(gap[idx] - pace[idx]) > 3 && (
            <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>
              {gap[idx] < pace[idx] ? `↑ montée (${Math.round(pace[idx]-gap[idx])}s/km)` : `↓ descente`}
            </span>
          )}
        </div>
      )}

      <div style={{ position: 'relative', cursor: 'crosshair' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}
          preserveAspectRatio="none"
          onMouseMove={onMove} onMouseLeave={onLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          <defs>
            <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#86efac" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#86efac" stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          <path d={buildPath(gap, true)} fill="url(#gapFill)"/>
          <path d={buildPath(gap, false)} fill="none" stroke="#86efac" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d={buildPath(pace, false)} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round"/>
          {pct !== null && (
            <line x1={pct * W} y1={0} x2={pct * W} y2={H} stroke={T.text} strokeWidth="1" strokeDasharray="3,3"/>
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#f97316', display: 'inline-block', borderRadius: 1 }}/>Allure réelle
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#86efac', display: 'inline-block', borderRadius: 1 }}/>Allure ajustée (GAP)
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DECOUPLING CHART — Vélo uniquement (puissance normalisée vs FC)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// TIMELINE BAR — barre de temps sous les graphiques
// ─────────────────────────────────────────────────────────────
function TimelineBar({ totalS, cursorPct }: { totalS: number; cursorPct: number | null }) {
  if (totalS < 120) return null
  const tickIntervalS = 1800 // 30 min
  const ticks: number[] = []
  for (let t = tickIntervalS; t < totalS; t += tickIntervalS) ticks.push(t)

  function fmtTick(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h === 0) return `${m}'`
    if (m === 0) return `${h}h`
    return `${h}h${String(m).padStart(2, '0')}`
  }

  return (
    <div style={{ position: 'relative', height: 28, backgroundColor: 'var(--info-bg)', borderTop: `1px solid var(--info-border)`, marginTop: 2 }}>
      {ticks.map(t => (
        <div key={t} style={{ position: 'absolute', left: `${(t / totalS) * 100}%`, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 1, height: 6, backgroundColor: 'var(--border-mid)' }} />
          <span style={{ fontSize: 9, color: 'var(--text-dim)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{fmtTick(t)}</span>
        </div>
      ))}
      {cursorPct !== null && (
        <div style={{ position: 'absolute', left: `${cursorPct * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--text)', opacity: 0.5, pointerEvents: 'none' }} />
      )}
    </div>
  )
}

function DecouplingChart({ watts, heartrate, decouplingPct, altitude, temp, time }: {
  watts: number[]; heartrate: number[]; decouplingPct: number | null
  altitude?: number[] | null; temp?: number[] | null; time?: number[] | null
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const decoupContainerRef = useRef<HTMLDivElement>(null)
  const [decoupMousePos, setDecoupMousePos] = useState<{ x: number; y: number } | null>(null)
  const N = Math.min(watts.length, heartrate.length)
  if (N < 120) return null

  function smooth(arr: number[], w = 15): number[] {
    return arr.map((_, i) => {
      const sl = arr.slice(Math.max(0, i - w), i + w + 1)
      return sl.reduce((a, b) => a + b, 0) / sl.length
    })
  }

  const sWatts = useMemo(() => smooth(watts.slice(0, N)), [watts, N])
  const sHr    = useMemo(() => smooth(heartrate.slice(0, N)), [heartrate, N])
  const sTemp  = useMemo(() => temp?.length ? smooth(temp.slice(0, N), 10) : null, [temp, N])

  // Normalize both 0–1
  const wMin = Math.min(...sWatts), wMax = Math.max(...sWatts)
  const hMin = Math.min(...sHr),    hMax = Math.max(...sHr)
  const wRange = wMax - wMin || 1
  const hRange = hMax - hMin || 1

  // Temp normalization (if available)
  const tMin = sTemp ? Math.min(...sTemp) : 0
  const tMax = sTemp ? Math.max(...sTemp) : 1
  const tRange = tMax - tMin || 1

  // Pre-compute avgEF for cursor découplage
  const avgW  = sWatts.reduce((a, b) => a + b, 0) / N
  const avgHr = sHr.reduce((a, b) => a + b, 0) / N
  const avgEF = avgHr > 0 ? avgW / avgHr : 0

  // Total time for timeline bar
  const totalS = time?.length ? (time[Math.min(N-1, time.length-1)] - time[0]) : N

  const { idx, pct, onMove, onLeave } = useCrosshairSvg(svgRef, N)
  const W = 1000, H = 180, pad = 4

  const decoupColor = decouplingPct == null ? T.textSub
    : decouplingPct < 5 ? '#22c55e'
    : decouplingPct < 8 ? '#eab308'
    : '#ef4444'

  function buildNormPath(data: number[], mn: number, rng: number, fill: boolean): string {
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * W
      const y = H - pad - ((v - mn) / rng) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    if (fill) return `M0,${H}L${pts.join('L')}L${W},${H}Z`
    return `M${pts.join('L')}`
  }

  function handleDecoupMove(e: React.MouseEvent) {
    if (!decoupContainerRef.current) return
    const rect = decoupContainerRef.current.getBoundingClientRect()
    setDecoupMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    onMove(e)
  }
  function handleDecoupLeave() { setDecoupMousePos(null); onLeave() }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
        Découplage puissance / FC
        {decouplingPct != null && (
          <span style={{ marginLeft: 8, fontSize: 11, color: decoupColor, fontWeight: 600, fontFamily: T.fontMono }}>
            {decouplingPct.toFixed(1)}%
          </span>
        )}
      </div>

      <div ref={decoupContainerRef} style={{ position: 'relative', cursor: 'crosshair' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}
          preserveAspectRatio="none"
          onMouseMove={handleDecoupMove} onMouseLeave={handleDecoupLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          <path d={buildNormPath(sWatts, wMin, wRange, false)} fill="none" stroke="#5b6fff" strokeWidth="2" strokeLinejoin="round"/>
          <path d={buildNormPath(sHr, hMin, hRange, false)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeDasharray="6,3"/>
          {sTemp && (
            <path d={buildNormPath(sTemp, tMin, tRange, false)} fill="none" stroke="#6EE7B7" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7"/>
          )}
          {pct !== null && (
            <line x1={pct * W} y1={0} x2={pct * W} y2={H} stroke={T.text} strokeWidth="1" strokeDasharray="3,3"/>
          )}
        </svg>

        {/* Cursor tooltip positioned at mouse */}
        {idx !== null && decoupMousePos && (
          <div data-chart-tooltip="" style={{
            position: 'absolute',
            left: decoupMousePos.x > 400 ? decoupMousePos.x - 150 : decoupMousePos.x + 12,
            top: Math.max(0, decoupMousePos.y - 80),
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '6px 10px',
            pointerEvents: 'none',
            zIndex: 20,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
          }}>
            {/* Temps */}
            {time && time[idx] != null && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>
                {(() => { const t = time[idx] - time[0]; const m = Math.floor(t/60); const s = t%60; return `${m}:${String(s).padStart(2,'0')}` })()}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#5b6fff', fontWeight: 700, fontFamily: T.fontMono }}>{Math.round(sWatts[idx])} W</div>
            <div style={{ fontSize: 11, color: '#ef4444', fontFamily: T.fontMono }}>{Math.round(sHr[idx])} bpm</div>
            {altitude?.[idx] != null && (
              <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: T.fontMono }}>{Math.round(altitude[idx])} m</div>
            )}
            {sTemp?.[idx] != null && (
              <div style={{ fontSize: 11, color: '#6EE7B7', fontFamily: T.fontMono }}>{Math.round(sTemp[idx])} °C</div>
            )}
            {avgEF > 0 && sHr[idx] > 0 && (() => {
              const efNow = sWatts[idx] / sHr[idx]
              const d = ((efNow - avgEF) / avgEF) * 100
              return (
                <div style={{ fontSize: 11, color: d >= 0 ? '#22c55e' : '#ef4444', fontFamily: T.fontMono }}>
                  {d >= 0 ? '+' : ''}{d.toFixed(1)}% EF
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <TimelineBar totalS={totalS} cursorPct={pct} />

      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#5b6fff', display: 'inline-block', borderRadius: 1 }}/>Puissance (normalisée)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#ef4444', display: 'inline-block', borderRadius: 1, borderTop: '2px dashed #ef4444' }}/>FC (normalisée)
        </div>
        {sTemp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
            <span style={{ width: 12, height: 2, background: '#6EE7B7', display: 'inline-block', borderRadius: 1 }}/>Température
          </div>
        )}
      </div>

      <div style={{
        marginTop: 20,
        padding: '20px 24px',
        backgroundColor: 'var(--info-bg)',
        borderRadius: 16,
        border: '1px solid var(--info-border)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-title)', margin: '0 0 16px' }}>
          Qu&apos;est-ce que la dérive cardiaque ?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.75, margin: '0 0 12px' }}>
          La <strong style={{ color: 'var(--text-title)' }}>dérive cardiaque</strong> mesure dans quelle mesure votre fréquence cardiaque augmente
          par rapport à votre production de puissance au cours d&apos;un effort. À puissance constante, si votre cœur doit battre de
          plus en plus vite pour maintenir le même effort, la dérive est positive. C&apos;est un indicateur clé de la qualité de votre
          endurance aérobie fondamentale.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '16px 0' }}>
          <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--zone-good-bg)', border: '1px solid var(--zone-good-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', margin: '0 0 4px' }}>{'< 5%'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>Excellent. Endurance aérobie bien développée.</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--zone-med-bg)', border: '1px solid var(--zone-med-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#D97706', margin: '0 0 4px' }}>5 – 8%</p>
            <p style={{ fontSize: 11, color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>Normal sur les longues sorties. Marge de progression.</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--zone-bad-bg)', border: '1px solid var(--zone-bad-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', margin: '0 0 4px' }}>{'>  8%'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>Dérive importante. Base aérobie à renforcer.</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.75, margin: '12px 0 0' }}>
          <strong style={{ color: 'var(--text-title)' }}>Influence de la chaleur :</strong> au-delà de 30°C, l&apos;organisme redirige
          le flux sanguin vers la peau pour dissiper la chaleur. Le volume d&apos;éjection cardiaque diminue, et le cœur
          s&apos;emballe pour compenser. Des études en conditions chaudes (35°C) montrent une augmentation de FC de{' '}
          <strong>+11%</strong> et une chute du VO2max de <strong>-15%</strong> sur 45 minutes comparé à 22°C. Une dérive élevée
          par forte chaleur n&apos;est donc pas le signe d&apos;un manque d&apos;endurance — c&apos;est une réponse physiologique normale.
          La déshydratation produit le même effet en réduisant le volume sanguin.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HR CUMULATIVE CHART — FC durée cumulée (vélo + course)
// ─────────────────────────────────────────────────────────────
function HrCumulativeChart({ heartrate, maxHrEst }: { heartrate: number[]; maxHrEst: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef2 = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const N = heartrate.length
  if (N < 60) return null

  const minHr = Math.max(50, Math.floor(Math.min(...heartrate) / 10) * 10)
  const maxHr = Math.min(240, Math.ceil(Math.max(...heartrate) / 10) * 10)

  // Count seconds at each bpm
  const bpmCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const hr of heartrate) {
      const bpm = Math.round(hr)
      counts[bpm] = (counts[bpm] ?? 0) + 1
    }
    return counts
  }, [heartrate])

  // Build cumulative time array: for each bpm X, how many seconds were spent at >= X
  const bpmRange = Array.from({ length: maxHr - minHr + 1 }, (_, i) => minHr + i)
  const cumulative = useMemo(() => {
    const totals = bpmRange.map(bpm => bpmCounts[bpm] ?? 0)
    // suffix sum: time at >= bpm
    const cum = new Array(totals.length).fill(0)
    cum[totals.length - 1] = totals[totals.length - 1]
    for (let i = totals.length - 2; i >= 0; i--) cum[i] = cum[i + 1] + totals[i]
    return cum
  }, [bpmCounts, bpmRange])

  const maxCum = Math.max(...cumulative, 1)
  const { idx, pct, onMove, onLeave } = useCrosshairSvg(svgRef, bpmRange.length)

  const W = 1000, H = 200, pad = 4
  const pts = cumulative.map((v, i) => {
    const x = (i / (bpmRange.length - 1)) * W
    const y = H - pad - (v / maxCum) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const fillPath = `M0,${H}L${pts.join('L')}L${W},${H}Z`
  const linePath = `M${pts.join('L')}`

  function fmtCumTime(s: number): string {
    if (s < 60)   return `${s}s`
    if (s < 3600) return `${Math.floor(s/60)}'${(s%60).toString().padStart(2,'0')}`
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60)
    return `${h}h${String(m).padStart(2,'0')}`
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef2.current) return
    const rect = containerRef2.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    onMove(e)
  }
  function handleMouseLeave() { setMousePos(null); onLeave() }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
        Durée cumulée par FC
      </div>

      <div ref={containerRef2} style={{ position: 'relative', cursor: 'crosshair' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          <defs>
            <linearGradient id="hrCumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#hrCumFill)"/>
          <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
          {pct !== null && (
            <line x1={pct * W} y1={0} x2={pct * W} y2={H} stroke={T.text} strokeWidth="1" strokeDasharray="3,3"/>
          )}
        </svg>

        {/* Cursor tooltip positioned at mouse */}
        {idx !== null && mousePos && (
          <div style={{
            position: 'absolute',
            left: Math.min(mousePos.x + 12, 999),
            top: Math.max(0, mousePos.y - 52),
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 7,
            padding: '5px 10px',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, fontFamily: T.fontMono }}>{bpmRange[idx]} bpm</div>
            <div style={{ fontSize: 11, color: T.text, fontFamily: T.fontMono }}>{fmtCumTime(cumulative[idx])}</div>
            <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>{Math.round((Number(bpmRange[idx])/maxHrEst)*100)}% FC max</div>
          </div>
        )}
      </div>

      {/* X axis — bpm labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[minHr, ...Array.from({length:4},(_,i)=>Math.round(minHr+(maxHr-minHr)*(i+1)/5)), maxHr].map(bpm => (
          <span key={bpm} style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontMono }}>{bpm}</span>
        ))}
      </div>

      <div style={{
        marginTop: 20,
        padding: '20px 24px',
        backgroundColor: 'var(--info-bg)',
        borderRadius: 16,
        border: '1px solid var(--info-border)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-title)', margin: '0 0 12px' }}>
          Durée cumulée par fréquence cardiaque
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.75, margin: '0 0 12px' }}>
          Ce graphique montre le temps total passé <strong style={{ color: 'var(--text-title)' }}>à atteindre ou dépasser</strong> chaque
          niveau de fréquence cardiaque. La courbe descend de gauche à droite : plus la FC est élevée, moins vous y avez passé de temps.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.75, margin: '0 0 12px' }}>
          <strong style={{ color: 'var(--text-title)' }}>Le seuil des 90% FCmax est crucial :</strong> c&apos;est dans cette zone
          d&apos;intensité que le système cardiovasculaire est soumis à sa plus forte sollicitation, forçant les adaptations
          qui font progresser le VO2max. Les athlètes d&apos;endurance intègrent des séances d&apos;intervalles spécifiquement pour
          accumuler du temps dans cette zone.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>
          <strong style={{ color: 'var(--text-title)' }}>Lecture :</strong> si le point à 160 bpm indique 1h30, vous avez pédalé
          1 heure 30 à 160 bpm <em>ou plus</em>. Suivez l&apos;évolution de ce chiffre à 90%+ FCmax d&apos;une séance
          à l&apos;autre pour quantifier vos gains de VO2max.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// POLYLINE — décodage Google Polyline encodé
// ─────────────────────────────────────────────────────────────
interface LatLngPoint { lat: number; lng: number }

function decodePolyline(encoded: string): LatLngPoint[] {
  const points: LatLngPoint[] = []
  let lat = 0, lng = 0, i = 0
  while (i < encoded.length) {
    let b: number, shift = 0, result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 32)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 32)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

/** Trouve le point GPS sur le tracé à une distance donnée (mètres depuis le départ) */
function findGpsAtDistance(
  distMeters: number,
  polyPoints: LatLngPoint[],
  cumDist: number[],
): LatLngPoint | null {
  if (!polyPoints || polyPoints.length < 2 || !cumDist.length) return null
  const total = cumDist[cumDist.length - 1]
  const d = Math.min(distMeters, total)
  for (let i = 1; i < cumDist.length; i++) {
    if (cumDist[i] >= d) {
      const seg = cumDist[i] - cumDist[i - 1]
      const t   = seg > 0 ? (d - cumDist[i - 1]) / seg : 0
      return {
        lat: polyPoints[i - 1].lat + t * (polyPoints[i].lat - polyPoints[i - 1].lat),
        lng: polyPoints[i - 1].lng + t * (polyPoints[i].lng - polyPoints[i - 1].lng),
      }
    }
  }
  return polyPoints[polyPoints.length - 1]
}

/** Calcule les distances cumulées (mètres) le long d'un tracé polyline */
function buildCumDist(pts: LatLngPoint[]): number[] {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const cosLat = Math.cos(pts[i - 1].lat * Math.PI / 180)
    const dx = (pts[i].lng - pts[i - 1].lng) * cosLat * 111320
    const dy = (pts[i].lat - pts[i - 1].lat) * 111320
    cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return cum
}

// ─────────────────────────────────────────────────────────────
// SYNC CHARTS (crosshair, HR zone coloring, laps)
// ─────────────────────────────────────────────────────────────
function SyncCharts({ activity, hrZones, powerZones, paceZones, polylinePoints, onHoverGps }: {
  activity: Activity
  hrZones?: ParsedZone[]
  powerZones?: ParsedZone[]
  paceZones?: ParsedZone[]
  polylinePoints?: LatLngPoint[] | null
  onHoverGps?: (gps: LatLngPoint | null) => void
}) {
  void powerZones; void paceZones
  const s = activity.streams
  if (!s) return null

  const isBike = ['bike','virtual_bike'].includes(activity.sport_type)
  const isRun  = ['run','trail_run'].includes(activity.sport_type)

  const time = s.time ?? []
  const N = time.length
  if (N < 2) return null

  const [cursorPct, setCursorPct]   = useState<number | null>(null)
  const [mousePos, setMousePos]     = useState<{x:number;y:number}|null>(null)
  const [isOverCharts, setIsOverCharts] = useState(false)
  const [selection, setSelection]   = useState<[number,number] | null>(null)
  const [dragStartPct, setDragStartPct] = useState<number | null>(null)
  const [selectedLap, setSelectedLap]   = useState<number | null>(null)
  const [showSelModal, setShowSelModal]  = useState(false)
  const containerRef   = useRef<HTMLDivElement>(null)
  const tracksAreaRef  = useRef<HTMLDivElement>(null)
  const handleMoveRef  = useRef<(clientX: number, clientY: number) => void>(() => {})

  // Distances cumulées le long du tracé polyline (pour mapping curseur → GPS)
  const polyCumDist = useMemo(
    () => polylinePoints && polylinePoints.length > 1 ? buildCumDist(polylinePoints) : null,
    [polylinePoints],
  )

  const cursor = cursorPct !== null ? Math.min(N-1, Math.max(0, Math.round(cursorPct * (N-1)))) : null

  function getPct(clientX: number, el: Element): number {
    const rect = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  function handleMove(clientX: number, clientY: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({ x: clientX - rect.left, y: clientY - rect.top })
    // pct calculé sur la zone charts (sans le left-col label)
    const chartEl = tracksAreaRef.current ?? containerRef.current
    const pct = getPct(clientX, chartEl)
    setCursorPct(pct)
    if (dragStartPct !== null) {
      const i1 = Math.round(dragStartPct * (N-1))
      const i2 = Math.round(pct * (N-1))
      setSelection([Math.min(i1,i2), Math.max(i1,i2)])
    }
    // Mapping curseur → GPS si polyline disponible
    if (polylinePoints && polyCumDist && s?.distance) {
      const idx = Math.min(N-1, Math.max(0, Math.round(pct * (N-1))))
      const distM = s.distance[idx]
      if (typeof distM === 'number') {
        const gps = findGpsAtDistance(distM, polylinePoints, polyCumDist)
        onHoverGps?.(gps)
      }
    }
  }

  // Ref always points to latest handleMove — used by native touch listener
  handleMoveRef.current = handleMove

  // Native touchmove with passive:false — bloque le scroll pendant le scrub
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      if (!t) return
      setIsOverCharts(true)
      handleMoveRef.current(t.clientX, t.clientY)
    }
    const onTouchEndCancel = () => {
      setIsOverCharts(false)
      setCursorPct(null)
      setMousePos(null)
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEndCancel)
    el.addEventListener('touchcancel', onTouchEndCancel)
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEndCancel)
      el.removeEventListener('touchcancel', onTouchEndCancel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDown(clientX: number) {
    const chartEl = tracksAreaRef.current ?? containerRef.current
    if (!chartEl) return
    setDragStartPct(getPct(clientX, chartEl))
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

  function buildFillPath(data: number[], H: number, pad = 4, invertY = false): string {
    if (!data.length) return ''
    const mn = Math.min(...data), mx = Math.max(...data)
    const range = mx - mn || 1
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * 1000
      const norm = invertY ? (mx - v) / range : (v - mn) / range
      const y = H - pad - norm * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M0,${H}L${pts.join('L')}L${1000},${H}Z`
  }

  function buildLinePath(data: number[], H: number, pad = 4, invertY = false): string {
    if (!data.length) return ''
    const mn = Math.min(...data), mx = Math.max(...data)
    const range = mx - mn || 1
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * 1000
      const norm = invertY ? (mx - v) / range : (v - mn) / range
      const y = H - pad - norm * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M${pts.join('L')}`
  }

  function getHrColor(hr: number, zones?: ParsedZone[]): string {
    if (!zones) return '#F87171'
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
  const temp     = s.temp      ?? null
  const laps     = activity.laps ?? []

  // Vitesse km/h (cyclisme + course)
  const speedKmh = (isBike || isRun) && velocity
    ? velocity.map(v => v * 3.6)
    : null

  type Track = {
    label: string; data: number[]; color: string; fill: string; unit: string; H: number
    isHr?: boolean; isAlt?: boolean; invertY?: boolean
    formatY?: (v: number) => string; formatVal?: (v: number) => string
  }

  // ── FIX 1 : couleurs exactes + nouvelles courbes ──
  const tracks: Track[] = ([
    alt ? {
      label: 'Altitude', data: alt, color: '#94A3B8', fill: 'rgba(148,163,184,0.15)',
      unit: 'm', H: 77, isAlt: true,
      formatY: (v: number) => `${Math.round(v)} m`,
      formatVal: (v: number) => `${Math.round(v)}`,
    } : null,
    hr ? {
      label: 'FC', data: hr, color: '#F87171', fill: 'rgba(248,113,113,0.10)',
      unit: 'bpm', H: 77, isHr: true,
      formatY: (v: number) => `${Math.round(v)} bpm`,
      formatVal: (v: number) => `${Math.round(v)}`,
    } : null,
    isBike && watts ? {
      label: 'Puissance', data: watts, color: '#818CF8', fill: 'rgba(129,140,248,0.10)',
      unit: 'W', H: 86,
      formatY: (v: number) => `${Math.round(v)} W`,
      formatVal: (v: number) => `${Math.round(v)}`,
    } : null,
    isRun && velocity ? {
      label: 'Allure', data: velocity.map(v => v > 0 ? (1000/v) : 0),
      color: '#f97316', fill: 'rgba(249,115,22,0.10)',
      unit: 's/km', H: 86, invertY: true,
      formatY: (v: number) => fmtPace(v),
      formatVal: (v: number) => fmtPace(v),
    } : null,
    // ── courbe vitesse (avant cadence) ──
    speedKmh ? {
      label: 'Vitesse', data: speedKmh, color: '#60A5FA', fill: 'rgba(96,165,250,0.10)',
      unit: 'km/h', H: 58,
      formatY: (v: number) => `${v.toFixed(1)} km/h`,
      formatVal: (v: number) => v.toFixed(1),
    } : null,
    cadence ? {
      label: 'Cadence', data: cadence, color: '#F472B6', fill: 'rgba(244,114,182,0.10)',
      unit: 'rpm', H: 58,
      formatY: (v: number) => `${Math.round(v)} rpm`,
      formatVal: (v: number) => `${Math.round(v)}`,
    } : null,
    // streams.temp sera disponible après l'ajout de 'temp' dans STREAM_KEYS (voir PROMPT_TEMP_STREAM)
    (isBike || isRun) && temp ? {
      label: 'Température', data: temp, color: '#6EE7B7', fill: 'rgba(110,231,183,0.10)',
      unit: '°C', H: 58,
      formatY: (v: number) => `${Math.round(v)} °C`,
      formatVal: (v: number) => `${Math.round(v)}`,
    } : null,
  ] as (Track|null)[]).filter((t): t is Track => t !== null)

  if (!tracks.length) return null

  const maxIntensity = watts ? Math.max(...watts) : hr ? Math.max(...hr) : 1

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
      dur, dist: sliceDist,
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
      {/* ── CSS responsive ── */}
      <style>{`
        .sync-mobile-header { display: flex !important; }
        .sync-left-col      { display: none  !important; }
        @media (min-width: 768px) {
          .sync-mobile-header { display: none  !important; }
          .sync-left-col      { display: block !important; }
        }
      `}</style>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{ position: 'relative', userSelect: 'none', cursor: 'crosshair' }}
        onMouseMove={e => handleMove(e.clientX, e.clientY)}
        onMouseLeave={() => { setIsOverCharts(false); setCursorPct(null); setMousePos(null); onHoverGps?.(null) }}
        onMouseDown={e => handleDown(e.clientX)}
        onMouseUp={handleUp}
        onTouchStart={e => { setIsOverCharts(true); handleDown(e.touches[0].clientX) }}
        onTouchEnd={() => { handleUp() }}
      >
        {/* Cursor line */}
        {isOverCharts && cursorPct !== null && mousePos !== null && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: mousePos.x,
            width: 1, background: T.text, pointerEvents: 'none', zIndex: 50,
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

        {/* Tracks — onMouseEnter/Leave ici uniquement pour isOverCharts */}
        <div
          ref={tracksAreaRef}
          onMouseEnter={() => setIsOverCharts(true)}
          onMouseLeave={() => setIsOverCharts(false)}
        >
        {tracks.map((track) => {
          const mn = Math.min(...track.data), mx = Math.max(...track.data)
          const range = mx - mn || 1
          const inv = track.invertY ?? false
          const fillPath = buildFillPath(track.data, track.H, 4, inv)
          const linePath = buildLinePath(track.data, track.H, 4, inv)
          const meanVal  = track.data.reduce((a, b) => a + b, 0) / track.data.length
          const maxVal   = inv ? mn : mx   // display max (for pace, "max" is slowest = mn in raw s/km)
          const avgVal   = meanVal

          const cursorY = cursor !== null
            ? (() => {
                const v = track.data[cursor]
                const norm = inv ? (mx - v) / range : (v - mn) / range
                return track.H - 4 - norm * (track.H - 8)
              })()
            : null

          // Range label for mobile header
          const rangeLabel = track.formatY
            ? inv
              ? `${track.formatY(mx)} – ${track.formatY(mn)}`
              : `${track.formatY(mn)} – ${track.formatY(mx)}`
            : `${Math.round(mn)} – ${Math.round(mx)} ${track.unit}`

          // Left col Max/Moy display
          const maxStr = track.formatVal ? track.formatVal(maxVal) : Math.round(maxVal).toString()
          const avgStr = track.formatVal ? track.formatVal(avgVal) : Math.round(avgVal).toString()

          return (
            <div key={track.label} style={{ marginBottom: 20 }}>
              {/* Mobile header: label + range (hidden on desktop) */}
              <div className="sync-mobile-header" style={{ fontSize: 10, color: T.textMuted, marginBottom: 2, justifyContent: 'space-between' }}>
                <span style={{ color: track.color, fontWeight: 600 }}>{track.label}</span>
                <span>{rangeLabel}</span>
              </div>

              {/* FIX 3: row = [left col desktop] [chart] [right val desktop] */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>

                {/* Left col — desktop only */}
                <div className="sync-left-col" style={{ width: 140, minWidth: 48, flexShrink: 0, paddingRight: 12, paddingTop: 4 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: track.color, lineHeight: 1 }}>
                    {track.label}
                  </p>
                  <p style={{ margin: '0 0 1px', fontSize: 11, color: 'var(--text-label)' }}>
                    Max {maxStr} {track.unit}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-label)' }}>
                    Moy. {avgStr} {track.unit}
                  </p>
                </div>

                {/* Chart */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <svg
                    viewBox={`0 0 1000 ${track.H}`}
                    style={{ width: '100%', height: track.H, display: 'block', overflow: 'visible' }}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`fill-${track.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={track.color} stopOpacity="0.12"/>
                        <stop offset="100%" stopColor={track.color} stopOpacity="0"/>
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
                      return (
                        <rect key={li}
                          x={lx1} y={track.H - 12} width={Math.max(2, lx2 - lx1)} height={12}
                          fill={lapColor} fillOpacity="0.7"
                          onClick={() => setSelectedLap(selectedLap === li ? null : li)}
                          style={{ cursor: 'pointer' }}
                        />
                      )
                    })}

                    {/* HR — zone-colored segments */}
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
                          <path d={fillPath} fill={`url(#fill-${track.label})`} />
                          {segments.map((seg, si) => (
                            <line key={si} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                              stroke={seg.color} strokeWidth="1.5" />
                          ))}
                          {(() => {
                            const mean = hr.reduce((a, b) => a + b, 0) / hr.length
                            const y = track.H - 4 - ((mean - mn) / range) * (track.H - 8)
                            return <line x1={0} y1={y} x2={1000} y2={y} stroke="#F87171" strokeWidth="1" strokeDasharray="6,4" opacity="0.35" />
                          })()}
                        </>
                      )
                    })()}

                    {/* Other tracks */}
                    {!track.isHr && (
                      <>
                        <path d={fillPath} fill={`url(#fill-${track.label})`} />
                        <path d={linePath} fill="none" stroke={track.color} strokeWidth="1.5" strokeLinejoin="round" />
                      </>
                    )}

                    {/* Horizontal crosshair */}
                    {cursorY !== null && (
                      <line x1={0} y1={cursorY} x2={1000} y2={cursorY} stroke={T.text} strokeWidth="0.8" strokeDasharray="4,3" opacity="0.5" />
                    )}
                  </svg>
                </div>

              </div>
            </div>
          )
        })}
        </div>{/* end tracksAreaRef */}

        {/* Unified cursor tooltip */}
        {isOverCharts && cursor !== null && mousePos !== null && (
          <div
            data-chart-tooltip=""
            style={{
              position: 'absolute',
              left: (cursorPct ?? 0) > 0.75 ? mousePos.x - 160 : mousePos.x + 12,
              top: 80,
              pointerEvents: 'none',
              zIndex: 200,
              borderRadius: 10,
              padding: '8px 12px',
              minWidth: 140,
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 6px', fontWeight: 500 }}>
              {(() => { const t = time[cursor] - time[0]; const m = Math.floor(t/60); const sec = t%60; return `${m}:${String(sec).padStart(2,'0')}` })()}
            </p>
            {tracks.map(track => {
              const v = track.data[cursor]
              const label = track.formatVal ? track.formatVal(v) : Math.round(v).toString()
              return (
                <div key={track.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, margin: '2px 0' }}>
                  <span style={{ fontSize: 11, color: track.color }}>{track.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{label} {track.unit}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      {time.length > 0 && (
        <TimelineBar
          totalS={time[time.length - 1] - time[0]}
          cursorPct={isOverCharts ? cursorPct : null}
        />
      )}

      {/* Laps */}
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
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 8 }}>Intervalle #{selectedLap! + 1}</div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSelModal(false)}
        >
          <div style={{ background: T.surface, borderRadius: 12, padding: '24px 28px', minWidth: 280, maxWidth: 380,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Sélection — {fmtDur(selStats.dur)}</div>
              <button onClick={() => setShowSelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {selStats.dist != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>Distance</span><span style={{ fontWeight: 600 }}>{fmtDist(selStats.dist)}</span></div>}
              {selStats.hrMoy != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>FC moyenne</span><span style={{ fontWeight: 600 }}>{selStats.hrMoy} bpm</span></div>}
              {selStats.hrMax != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>FC max.</span><span style={{ fontWeight: 600 }}>{selStats.hrMax} bpm</span></div>}
              {selStats.watts != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>Watts moy.</span><span style={{ fontWeight: 600 }}>{selStats.watts} W</span></div>}
              {selStats.pace != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>Allure moy.</span><span style={{ fontWeight: 600 }}>{fmtPace(selStats.pace)}</span></div>}
              {selStats.dPlus != null && selStats.dPlus > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>D+</span><span style={{ fontWeight: 600 }}>+{selStats.dPlus} m</span></div>}
              {selStats.cad != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMuted }}>Cadence moy.</span><span style={{ fontWeight: 600 }}>{selStats.cad} rpm</span></div>}
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
// ─────────────────────────────────────────────────────────────
// DONNÉES SPÉCIFIQUES PAR SPORT
// ─────────────────────────────────────────────────────────────
function SectionDonneesSpecifiques({ inRange, zones, bikeZones, runZones, hrZones, bikeTimesZ, runTimesZ, hrTimesZ }: {
  inRange: Activity[]
  zones: TrainingZoneRow[]
  bikeZones: ParsedZone[] | null
  runZones: ParsedZone[] | null
  hrZones: ParsedZone[]
  bikeTimesZ: number[] | null
  runTimesZ: number[] | null
  hrTimesZ: number[]
}) {
  const [activeSport, setActiveSport] = useState<string>('run')

  const sportsPresent = useMemo(() => {
    const s = new Set(inRange.map(a => normalizeSport(a.sport_type)))
    return ['run', 'bike', 'swim', 'gym', 'hyrox', 'rowing'].filter(sp => s.has(sp))
  }, [inRange])

  if (!sportsPresent.length) return <div style={{ color: T.textMuted, padding: 20 }}>Aucune activité dans la période</div>

  const sport = sportsPresent.includes(activeSport) ? activeSport : sportsPresent[0]
  const sportActs = inRange.filter(a => normalizeSport(a.sport_type) === sport)

  // Run metrics
  const runPaces = sportActs.filter(a => a.avg_pace_s_km || (a.moving_time_s && a.distance_m)).map(a =>
    a.avg_pace_s_km ?? (a.moving_time_s! / a.distance_m!) * 1000)
  const avgPace = runPaces.length ? runPaces.reduce((a, b) => a + b, 0) / runPaces.length : null
  const runCadences = sportActs.filter(a => a.avg_cadence).map(a => Number(a.avg_cadence))
  const avgRunCad = runCadences.length ? Math.round(runCadences.reduce((a,b)=>a+b,0)/runCadences.length) : null

  // Bike metrics
  const bikeWatts = sportActs.filter(a => a.avg_watts).map(a => Number(a.avg_watts))
  const avgWatts = bikeWatts.length ? Math.round(bikeWatts.reduce((a,b)=>a+b,0)/bikeWatts.length) : null
  const bikeNp = sportActs.filter(a => a.normalized_watts).map(a => Number(a.normalized_watts))
  const avgNp = bikeNp.length ? Math.round(bikeNp.reduce((a,b)=>a+b,0)/bikeNp.length) : null
  const bikeIf = sportActs.filter(a => a.intensity_factor).map(a => Number(a.intensity_factor))
  const avgIf = bikeIf.length ? (bikeIf.reduce((a,b)=>a+b,0)/bikeIf.length).toFixed(2) : null
  const bikeCad = sportActs.filter(a => a.avg_cadence).map(a => Number(a.avg_cadence))
  const avgBikeCad = bikeCad.length ? Math.round(bikeCad.reduce((a,b)=>a+b,0)/bikeCad.length) : null
  const bikeDecoupling = sportActs.filter(a => a.aerobic_decoupling != null).map(a => Number(a.aerobic_decoupling))
  const avgDecoupling = bikeDecoupling.length ? (bikeDecoupling.reduce((a,b)=>a+b,0)/bikeDecoupling.length).toFixed(1) : null
  const runZoneRow = zones.find(z => z.sport === 'run')
  const vapKmh = runZoneRow?.vma_ms ? (Number(runZoneRow.vma_ms) * 3.6).toFixed(1) : null

  const SPORT_TAB_LABEL: Record<string, string> = { run: 'Course', bike: 'Vélo', swim: 'Natation', gym: 'Muscu', hyrox: 'Hyrox', rowing: 'Aviron' }

  return (
    <div>
      {/* Sport tabs */}
      <SportTabs
        tabs={sportsPresent.map(sp => ({
          id: sp,
          label: SPORT_TAB_LABEL[sp] ?? sp,
          color: SPORT_COLOR[sp as SportType] ?? T.accent,
        }))}
        value={sport}
        onChange={(id) => setActiveSport(id as SportType)}
        style={{ marginBottom: 20 }}
      />

      {/* Run specific */}
      {sport === 'run' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {avgPace && <StatCard label="Allure moy." value={fmtPace(avgPace)} />}
            {vapKmh && <StatCard label="VAP" value={`${vapKmh} km/h`} />}
            {avgRunCad && <StatCard label="Cadence moy." value={`${avgRunCad} spm`} />}
            {avgDecoupling && <StatCard label="Découplage moy." value={`${avgDecoupling}%`} />}
          </div>
          {runZones && runTimesZ && runTimesZ.some(t => t > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <SectionTitle>Zones allure</SectionTitle>
              <ZoneBars zones={runZones} timesS={runTimesZ} />
            </div>
          )}
          {hrTimesZ.some(t => t > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <SectionTitle>Zones FC</SectionTitle>
              <ZoneBars zones={hrZones} timesS={hrTimesZ} />
            </div>
          )}
        </div>
      )}

      {/* Bike specific */}
      {sport === 'bike' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {avgWatts && <StatCard label="Watts moy." value={`${avgWatts} W`} />}
            {avgNp && <StatCard label="NP moy." value={`${avgNp} W`} />}
            {avgIf && <StatCard label="IF moy." value={avgIf} />}
            {avgBikeCad && <StatCard label="Cadence moy." value={`${avgBikeCad} rpm`} />}
            {avgDecoupling && <StatCard label="Découplage moy." value={`${avgDecoupling}%`} />}
          </div>
          {bikeZones && bikeTimesZ && bikeTimesZ.some(t => t > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <SectionTitle>Zones puissance</SectionTitle>
              <ZoneBars zones={bikeZones} timesS={bikeTimesZ} />
            </div>
          )}
          {hrTimesZ.some(t => t > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <SectionTitle>Zones FC</SectionTitle>
              <ZoneBars zones={hrZones} timesS={hrTimesZ} />
            </div>
          )}
        </div>
      )}

      {/* Swim specific */}
      {sport === 'swim' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard label="Séances" value={sportActs.length.toString()} />
          <StatCard label="Distance tot." value={fmtDist(sportActs.reduce((s,a) => s + (a.distance_m ?? 0), 0))} />
          <StatCard label="Temps tot." value={fmtDur(sportActs.reduce((s,a) => s + (a.moving_time_s ?? 0), 0))} />
          {(() => {
            const paces = sportActs.filter(a => a.avg_pace_s_km).map(a => Number(a.avg_pace_s_km))
            const ap = paces.length ? Math.round(paces.reduce((a,b)=>a+b,0)/paces.length) : null
            return ap ? <StatCard label="Allure moy." value={fmtPace(ap)} /> : null
          })()}
        </div>
      )}

      {/* Gym specific */}
      {sport === 'gym' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard label="Séances" value={sportActs.length.toString()} />
          <StatCard label="Temps tot." value={fmtDur(sportActs.reduce((s,a) => s + (a.moving_time_s ?? 0), 0))} />
          {(() => {
            const cals = sportActs.filter(a => a.calories).map(a => Number(a.calories))
            return cals.length ? <StatCard label="Calories moy." value={`${Math.round(cals.reduce((a,b)=>a+b,0)/cals.length)} kcal`} /> : null
          })()}
        </div>
      )}

      {/* Hyrox specific */}
      {sport === 'hyrox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard label="Séances" value={sportActs.length.toString()} />
          <StatCard label="Temps tot." value={fmtDur(sportActs.reduce((s,a) => s + (a.moving_time_s ?? 0), 0))} />
          <StatCard label="Distance tot." value={fmtDist(sportActs.reduce((s,a) => s + (a.distance_m ?? 0), 0))} />
        </div>
      )}

      {/* Rowing specific */}
      {sport === 'rowing' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard label="Séances" value={sportActs.length.toString()} />
          <StatCard label="Distance tot." value={fmtDist(sportActs.reduce((s,a) => s + (a.distance_m ?? 0), 0))} />
          <StatCard label="Temps tot." value={fmtDur(sportActs.reduce((s,a) => s + (a.moving_time_s ?? 0), 0))} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// WEEK DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function WeekDetailModal({ week, activities, onClose }: {
  week: { week: string; total: number; time: number; dist: number; count: number; sports: Map<string, number> }
  activities: Activity[]
  onClose: () => void
}) {
  const weekStart = new Date(week.week)
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  const weekActs  = activities.filter(a => {
    const d = new Date(a.started_at)
    return d >= weekStart && d <= weekEnd
  })

  const totalTss  = weekActs.reduce((s, a) => s + (a.tss ?? 0), 0)
  const totalElev = weekActs.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)
  const hrVals    = weekActs.filter(a => a.avg_hr).map(a => Number(a.avg_hr))
  const meanHr    = hrVals.length ? Math.round(hrVals.reduce((a,b)=>a+b,0)/hrVals.length) : null

  const sportEntries = Array.from(week.sports.entries()).sort((a, b) => b[1] - a[1])
  const maxSport = Math.max(...sportEntries.map(e => e[1]), 1)

  const label = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
    ' – ' + weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: T.surface, borderRadius: T.radius, padding: '24px 28px',
        width: '100%', maxWidth: 480, boxShadow: T.shadowCard, maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>Semaine du {label}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{week.count} séance{week.count !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.textMuted, lineHeight: 1 }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Temps', value: fmtDur(week.time) },
            { label: 'Distance', value: fmtDist(week.dist) },
            { label: 'D+', value: totalElev > 1 ? `+${Math.round(totalElev)} m` : '—' },
            { label: 'TSS', value: totalTss ? Math.round(totalTss).toString() : '—' },
            { label: 'FC moy.', value: meanHr ? `${meanHr} bpm` : '—' },
            { label: 'Séances', value: week.count.toString() },
          ].map(k => (
            <div key={k.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: T.fontDisplay, fontWeight: 700 }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Répartition sport */}
        {sportEntries.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10, fontFamily: T.fontDisplay }}>Répartition</div>
            {sportEntries.map(([sport, time]) => {
              const col = SPORT_COLOR[sport as SportType] ?? '#888'
              const pct = (time / maxSport) * 100
              return (
                <div key={sport} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 56px', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: 'inline-block', flexShrink: 0 }} />
                    {SPORT_LABEL[sport as SportType] ?? sport}
                  </div>
                  <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.textSub, textAlign: 'right' }}>{fmtDur(time)}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Activités */}
        {weekActs.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 8, fontFamily: T.fontDisplay }}>Activités</div>
            {weekActs.map(a => {
              const col = SPORT_COLOR[a.sport_type] ?? '#888'
              return (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 3, height: 32, background: col, borderRadius: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{a.title}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{new Date(a.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: T.textSub, fontFamily: T.fontMono }}>
                    {a.distance_m ? <div style={{ fontWeight: 600, color: T.text }}>{fmtDist(a.distance_m)}</div> : null}
                    <div>{fmtDur(a.moving_time_s)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionDonnees({ activities, zones, profile }: {
  activities: Activity[]
  zones: TrainingZoneRow[]
  profile: Profile
}) {
  const [filter, setFilter] = useState<TimeFilter>('4w')
  const [dataTab, setDataTab] = useState<'general' | 'specific'>('general')
  const [selectedWeek, setSelectedWeek] = useState<null | { week: string; total: number; time: number; dist: number; count: number; sports: Map<string, number> }>(null)
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

  // Requête dédiée graphe — indépendante de la pagination, toujours 12 semaines
  const [weeklyActs, setWeeklyActs] = useState<{ started_at: string; moving_time_s: number | null; distance_m: number | null; sport_type: string }[]>([])
  useEffect(() => {
    const start = new Date(); start.setDate(start.getDate() - 12 * 7)
    createClient()
      .from('activities')
      .select('started_at, moving_time_s, distance_m, sport_type')
      .gte('started_at', start.toISOString())
      .order('started_at', { ascending: true })
      .then(({ data }) => setWeeklyActs((data ?? []) as { started_at: string; moving_time_s: number | null; distance_m: number | null; sport_type: string }[]))
  }, [])

  const CHART_WEEKS = 12
  const weeks = useMemo(() => {
    const now = new Date()
    const map = new Map<string, { total: number; time: number; dist: number; count: number; sports: Map<string, number> }>()
    for (let i = CHART_WEEKS - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7)
      const k = isoWeek(d)
      if (!map.has(k)) map.set(k, { total: 0, time: 0, dist: 0, count: 0, sports: new Map() })
    }
    for (const a of weeklyActs) {
      const k = isoWeek(new Date(a.started_at))
      if (map.has(k)) {
        const w = map.get(k)!
        w.total += a.moving_time_s ?? 0
        w.time  += a.moving_time_s ?? 0
        w.dist  += a.distance_m ?? 0
        w.count++
        const sp = normalizeSport(a.sport_type ?? 'other')
        w.sports.set(sp, (w.sports.get(sp) ?? 0) + (a.moving_time_s ?? 0))
      }
    }
    return Array.from(map.entries()).map(([week, v]) => ({ week, ...v }))
  }, [weeklyActs])

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
    const sp = normalizeSport(a.sport_type ?? 'other')
    if (!sportMap.has(sp)) sportMap.set(sp, { count: 0, time: 0, dist: 0 })
    const e = sportMap.get(sp)!
    e.count++; e.time += a.moving_time_s ?? 0; e.dist += a.distance_m ?? 0
  }
  const sports = Array.from(sportMap.entries()).sort((a, b) => b[1].time - a[1].time)

  void profile

  return (
    <div>
      {/* Filtres période + toggle général/spécifique */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(TIME_FILTER_LABEL) as TimeFilter[]).map(f => (
            <Chip key={f} label={TIME_FILTER_LABEL[f]} active={filter === f} onClick={() => setFilter(f)} />
          ))}
        </div>
        {/* Toggle Général / Spécifique */}
        <div style={{ display: 'flex', background: T.bgAlt, borderRadius: T.radiusSm, padding: 3, gap: 2, border: `1px solid ${T.border}` }}>
          {(['general', 'specific'] as const).map(tab => (
            <button key={tab} onClick={() => setDataTab(tab)} style={{
              background: dataTab === tab ? T.surface : 'transparent',
              border: dataTab === tab ? `1px solid ${T.border}` : '1px solid transparent',
              borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
              color: dataTab === tab ? T.text : T.textSub,
              fontWeight: dataTab === tab ? 600 : 400,
              fontFamily: T.fontBody, transition: 'all 0.15s',
              boxShadow: dataTab === tab ? T.shadow : 'none',
            }}>
              {tab === 'general' ? 'Général' : 'Spécifique'}
            </button>
          ))}
        </div>
      </div>

      {/* Détail semaine — BottomSheet */}
      {selectedWeek && (() => {
        const ws = new Date(selectedWeek.week)
        const we = new Date(ws); we.setDate(we.getDate() + 6)
        const label = ws.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' – ' + we.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        const weekActs = activities.filter(a => { const d = new Date(a.started_at); return d >= ws && d <= we })
        const totalTss  = weekActs.reduce((s, a) => s + (a.tss ?? 0), 0)
        const totalElev = weekActs.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)
        const hrVals    = weekActs.filter(a => a.avg_hr).map(a => Number(a.avg_hr))
        const meanHr    = hrVals.length ? Math.round(hrVals.reduce((a,b)=>a+b,0)/hrVals.length) : null
        const sportEntries = Array.from(selectedWeek.sports.entries()).sort((a, b) => b[1] - a[1])
        const totalSport   = sportEntries.reduce((s, [,t]) => s + t, 0)
        return (
          <BottomSheet isOpen onClose={() => setSelectedWeek(null)}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">Semaine du {label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{selectedWeek.count} séance{selectedWeek.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: 'TEMPS',    value: fmtDur(selectedWeek.time) },
                { label: 'DISTANCE', value: fmtDist(selectedWeek.dist) },
                { label: 'D+',       value: totalElev >= 1 ? `+${Math.round(totalElev)} m` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
                  <span className="text-base font-bold text-foreground leading-tight">{value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: 'TSS',     value: totalTss ? Math.round(totalTss).toString() : '—' },
                { label: 'FC MOY.', value: meanHr ? `${meanHr} bpm` : '—' },
                { label: 'SÉANCES', value: selectedWeek.count.toString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
                  <span className="text-base font-bold text-foreground">{value}</span>
                </div>
              ))}
            </div>
            {sportEntries.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">Répartition</p>
                {sportEntries.map(([sport, time]) => {
                  const col = SPORT_COLOR[sport as SportType] ?? '#888'
                  const pct = totalSport > 0 ? (time / totalSport) * 100 : 0
                  return (
                    <div key={sport} className="flex items-center gap-3 mb-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col }} />
                      <span className="text-sm text-foreground w-16 flex-shrink-0">{SPORT_LABEL[sport as SportType] ?? sport}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col }} />
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right flex-shrink-0">{fmtDur(time)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {weekActs.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">Activités</p>
                {weekActs.map(act => {
                  const col = SPORT_COLOR[act.sport_type] ?? '#888'
                  return (
                    <div key={act.id} className="flex items-start py-3 border-b border-border last:border-0">
                      <div className="w-1 self-stretch rounded-full mr-3 flex-shrink-0 min-h-[36px]" style={{ background: col }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{act.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(act.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {act.distance_m && <p className="text-sm font-semibold text-foreground">{fmtDist(act.distance_m)}</p>}
                        <p className="text-xs text-muted-foreground">{fmtDur(act.moving_time_s)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </BottomSheet>
        )
      })()}

      {/* === DONNÉES GÉNÉRALES === */}
      {dataTab === 'general' && (
        <>
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

      {/* CTL / ATL / TSB — skeleton pendant chargement Supabase */}
      {dbMetrics.loading
        ? <SkeletonFitnessCards />
        : <FitnessCards ctl={ctl} atl={atl} tsb={tsb} />
      }

      {/* Weekly volume chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '18px 20px', marginBottom: 16 }}>
        <SectionTitle>Volume hebdomadaire <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>— clic pour détail</span></SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {weeks.map((w, i) => {
            const barH = Math.max(4, Math.round((w.total / maxTime) * 96))
            const isNow = i === weeks.length - 1
            const d = new Date(w.week)
            const sportEntries = Array.from(w.sports.entries()).sort((a, b) => b[1] - a[1])

            return (
              <div key={w.week}
                onClick={() => w.count > 0 && setSelectedWeek(w)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0, cursor: w.count > 0 ? 'pointer' : 'default' }}>
                {w.time > 60 && (
                  <div style={{ fontSize: 9, color: isNow ? T.accent : T.textMuted, fontWeight: isNow ? 700 : 400 }}>
                    {fmtDur(w.time)}
                  </div>
                )}
                <div style={{
                  width: '75%', height: barH, display: 'flex', flexDirection: 'column-reverse',
                  borderRadius: '3px 3px 0 0', overflow: 'hidden', minWidth: 6,
                  transition: 'opacity 0.15s', opacity: 1,
                }}
                  onMouseEnter={e => { if (w.count > 0) (e.currentTarget as HTMLDivElement).style.opacity = '0.75' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}>
                  {sportEntries.map(([sport, sportTime]) => {
                    const col = SPORT_COLOR[sport as SportType] ?? '#94a3b8'
                    const pct = w.total > 0 ? (sportTime / w.total) * 100 : 0
                    return (
                      <div key={sport} style={{ width: '100%', flexShrink: 0, background: isNow ? col : col + '99',
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
        </> /* end general tab */
      )}

      {/* === DONNÉES SPÉCIFIQUES === */}
      {dataTab === 'specific' && (
        <SectionDonneesSpecifiques inRange={inRange} zones={zones} bikeZones={bikeZones} runZones={runZones} hrZones={hrZoneColors} bikeTimesZ={bikeTimesZ} runTimesZ={runTimesZ} hrTimesZ={hrTimesZ} />
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
          {(a.rpe ?? a.perceived_effort) != null && <span style={{ color: T.textMuted, fontSize: 10, fontFamily: T.fontMono }}>RPE {Number(a.rpe ?? a.perceived_effort).toFixed(1)}</span>}
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
// RPE / SENSATION INPUT MODAL
// ─────────────────────────────────────────────────────────────
function RpeModal({ activityId, initialRpe, initialSensation, onClose, onSave }: {
  activityId: string
  initialRpe: number | null
  initialSensation: number | null
  onClose: () => void
  onSave: (rpe: number, sensation: number) => void
}) {
  const [rpe, setRpe]             = useState(initialRpe ?? 5)
  const [sensation, setSensation] = useState(initialSensation ?? 3)
  const [saving, setSaving]       = useState(false)

  async function save() {
    setSaving(true)
    try {
      const sb = createClient()
      await sb.from('activities').update({ rpe, perceived_effort: sensation }).eq('id', activityId)
      onSave(rpe, sensation)
    } finally {
      setSaving(false)
    }
  }

  function SliderRow({ label, value, min, max, step, onChange, color }: {
    label: string; value: number; min: number; max: number; step: number
    onChange: (v: number) => void; color: string
  }) {
    const pct = ((value - min) / (max - min)) * 100
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: T.fontDisplay }}>{value.toFixed(1)}</span>
        </div>
        <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: T.border, borderRadius: 3 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.1s' }} />
          </div>
          <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            style={{ position: 'absolute', left: 0, right: 0, opacity: 0, height: '100%', cursor: 'pointer', width: '100%', margin: 0 }} />
          <div style={{
            position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
            width: 20, height: 20, borderRadius: '50%', background: color,
            boxShadow: `0 0 0 3px ${color}30`, border: `2px solid ${T.surface}`,
            pointerEvents: 'none',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: T.textMuted }}>{min}</span>
          <span style={{ fontSize: 10, color: T.textMuted }}>{max}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: T.surface, borderRadius: T.radius, padding: '28px 28px 20px', width: '100%', maxWidth: 380, boxShadow: T.shadowCard }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>Ressenti & effort</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.textMuted }}>✕</button>
        </div>

        <SliderRow label="Sensation" value={sensation} min={1} max={5} step={0.5}
          onChange={setSensation}
          color={sensation <= 2 ? '#ef4444' : sensation <= 3 ? '#f97316' : '#22c55e'} />

        <SliderRow label="RPE (effort perçu)" value={rpe} min={1} max={10} step={0.5}
          onChange={setRpe}
          color={rpe >= 8 ? '#ef4444' : rpe >= 5 ? '#f97316' : '#22c55e'} />

        <button onClick={save} disabled={saving} style={{
          width: '100%', background: T.accent, color: '#fff', border: 'none', borderRadius: T.radiusSm,
          padding: '12px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, fontFamily: T.fontDisplay,
        }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
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
  const width    = useWindowWidth()
  const isMobile = width < 768
  const col = SPORT_COLOR[a.sport_type] ?? T.accent

  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false)
  const [isDeleting,           setIsDeleting]           = useState(false)
  const [deleteError,          setDeleteError]          = useState<string | null>(null)
  const [mapExpanded,          setMapExpanded]          = useState(false)
  const [hoverGps,             setHoverGps]             = useState<LatLngPoint | null>(null)
  // Mobile — sections repliables
  const [showDecoupling,       setShowDecoupling]       = useState(false)
  const [showHrCumulative,     setShowHrCumulative]     = useState(false)
  const [hoveredLapBar,        setHoveredLapBar]        = useState<number | null>(null)
  const globalAI  = useAIAnalysis()
  const decoupAI  = useAIAnalysis()

  // ── FIX 1 : masque le header app sur mobile ──────────────────
  useEffect(() => {
    if (window.innerWidth >= 768) return
    document.body.classList.add('hide-app-header')
    return () => document.body.classList.remove('hide-app-header')
  }, [])

  // Tracé GPS décodé (pour mapping curseur → point sur la carte)
  const polylinePoints = useMemo<LatLngPoint[] | null>(() => {
    const encoded = (a.summary_polyline as string | null)
      ?? ((a.raw_data as Record<string, unknown> | null)?.map as Record<string, unknown> | null)
        ?.summary_polyline as string | null
    if (!encoded || encoded.length < 2) return null
    return decodePolyline(encoded)
  }, [a.summary_polyline, a.raw_data])

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const sb = createClient()
      const { error } = await sb.from('activities').delete().eq('id', a.id)
      if (error) throw error
      setShowDeleteConfirm(false)
      onClose()
    } catch (err) {
      console.error('Erreur suppression:', err)
      setDeleteError('Erreur lors de la suppression. Réessayez.')
      setIsDeleting(false)
    }
  }
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

  const decoupling = useMemo(() => {
    if (a.aerobic_decoupling != null) return Number(a.aerobic_decoupling)
    const w = a.streams?.watts, hr = a.streams?.heartrate
    if (!w || !hr) return null
    return calculateDecoupling(w, hr)
  }, [a.aerobic_decoupling, a.streams?.watts, a.streams?.heartrate])

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

  // Pw/FC effectiveness (legacy)
  const pwHr = a.avg_watts && a.avg_hr
    ? (Number(a.avg_watts) / Number(a.avg_hr)).toFixed(2) : null

  // ── FIX 4 : nouvelles données ──

  // Durée Z2 : secondes passées en FC zone 2 (120-150 bpm par défaut)
  const z2DurationS = useMemo(() => {
    const hrStream = a.streams?.heartrate
    if (!hrStream || !hrStream.length) return null
    const z2 = hrZones[1] // index 1 = Z2
    return hrStream.filter(v => v >= z2.min && v < z2.max).length
  }, [a.streams?.heartrate])

  // NP calculé depuis stream puissance si non stocké (RMS 30s)
  const computedNp = useMemo(() => {
    if (a.normalized_watts) return Number(a.normalized_watts)
    const w = a.streams?.watts
    if (!w || w.length < 30) return null
    const WINDOW = 30
    const rolling = w.map((_, i) => {
      const sl = w.slice(Math.max(0, i - WINDOW + 1), i + 1)
      return sl.reduce((acc, v) => acc + v, 0) / sl.length
    })
    const sq = rolling.map(v => v * v)
    const meanSq = sq.reduce((acc, v) => acc + v, 0) / sq.length
    return Math.round(Math.sqrt(meanSq))
  }, [a.normalized_watts, a.streams?.watts])

  // Roue libre (freewheeling) : vel > 2 km/h ET puissance < 10 W
  const freewheelPowerS = useMemo(() => {
    const vel = a.streams?.velocity, w = a.streams?.watts
    if (!vel || !w || !isBike) return null
    let count = 0
    const len = Math.min(vel.length, w.length)
    for (let i = 0; i < len; i++) {
      if (vel[i] * 3.6 > 2 && w[i] < 10) count++
    }
    return count > 0 ? count : null
  }, [a.streams?.velocity, a.streams?.watts, isBike])

  // Temp max depuis stream
  const maxTempStream = useMemo(() => {
    const t = a.streams?.temp
    return t && t.length ? Math.round(Math.max(...t)) : null
  }, [a.streams?.temp])

  // EF = NP / FC_moy
  const efVal = computedNp && a.avg_hr
    ? (computedNp / Number(a.avg_hr)).toFixed(2) : null

  // Cadence max (stockée ou max du stream)
  const maxCadStream = a.streams?.cadence?.length
    ? Math.round(Math.max(...a.streams.cadence)) : null
  const maxCad = a.max_cadence ?? maxCadStream

  // Puissance max (stockée ou max du stream)
  const maxWattsStream = a.streams?.watts?.length ? Math.round(Math.max(...a.streams.watts)) : null
  const maxWatts = a.max_watts != null ? Number(a.max_watts) : maxWattsStream

  // FC max stream fallback
  const maxHrStream = a.streams?.heartrate?.length
    ? Math.round(Math.max(...a.streams.heartrate)) : null

  // Roue libre % (watts-based)
  const freewheelPowerPct = freewheelPowerS && a.moving_time_s
    ? ((freewheelPowerS / a.moving_time_s) * 100).toFixed(1) : null

  // W/kg moyen (avg_watts / poids)
  const wkgMoy = a.avg_watts && profile.weight_kg
    ? (Number(a.avg_watts) / Number(profile.weight_kg)).toFixed(2) : null

  // VAP from zone row
  const runZoneRowLocal = zones.find(z => z.sport === 'run')
  const vap = runZoneRowLocal?.vma_ms
    ? `${(Number(runZoneRowLocal.vma_ms) * 3.6).toFixed(1)} km/h` : null

  const sensation = a.perceived_effort  // /5 scale
  const rpeVal    = a.rpe               // /10 scale
  const [showRpeModal, setShowRpeModal] = useState(false)
  const [localRpe, setLocalRpe]         = useState<number | null>(rpeVal)
  const [localSensation, setLocalSensation] = useState<number | null>(sensation)

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

  // ── IA prompt builders ───────────────────────────────────────
  const buildDecouplingPrompt = () => {
    const hr = a.streams?.heartrate ?? []
    const half = Math.floor(hr.length / 2)
    const fc1 = half > 0 ? Math.round(hr.slice(0, half).reduce((s, v) => s + v, 0) / half) : null
    const fc2 = half > 0 ? Math.round(hr.slice(half).reduce((s, v) => s + v, 0) / (hr.length - half)) : null
    const tempArr = a.streams?.temp ?? []
    const tempMoy = tempArr.length ? Math.round(tempArr.reduce((s, v) => s + v, 0) / tempArr.length) : null
    const tempMax = tempArr.length ? Math.round(Math.max(...tempArr)) : null
    const ftp = a.ftp_at_time ?? null
    const np = computedNp
    const ifVal = np && ftp ? (np / ftp).toFixed(2) : null
    return `Tu es l'agent d'analyse de performance de THW Coaching.
Analyse le découplage puissance/FC de cette séance.

DONNÉES DE LA SÉANCE :
- Découplage P/FC : ${decoupling?.toFixed(1) ?? '—'}%
- Durée : ${fmtDur(a.moving_time_s)}
- Watts moy. : ${a.avg_watts ? Math.round(Number(a.avg_watts)) : '—'}W | Watts norm. : ${np ?? '—'}W
- FC moy. (1ère moitié) : ${fc1 ?? '—'}bpm | FC moy. (2ème moitié) : ${fc2 ?? '—'}bpm
- Température moy. : ${tempMoy ?? '—'}°C | Température max : ${tempMax ?? '—'}°C
- TSS : ${a.tss ? Math.round(Number(a.tss)) : '—'} | IF : ${ifVal ?? '—'}
- FTP athlète : ${ftp ?? '—'}W

Fournis une analyse en deux parties séparées par "---EN CLAIR---" :

PARTIE 1 (TECHNIQUE) : analyse scientifique du découplage,
interprétation de chaque donnée, facteurs physiologiques,
influence de la chaleur si temp > 28°C.

PARTIE 2 (EN CLAIR) : explique en langage simple ce que ça veut
dire pour cet athlète, ce qu'il faut retenir, quoi travailler.`
  }

  const buildGlobalPrompt = () => {
    const km = a.distance_m ? (Number(a.distance_m) / 1000).toFixed(2) : '—'
    const speed = a.avg_speed_ms ? (Number(a.avg_speed_ms) * 3.6).toFixed(1) : '—'
    const ftp = a.ftp_at_time ?? null
    const np = computedNp
    const ifVal = np && ftp ? (np / ftp).toFixed(2) : null
    const maxHrEst = estimateMaxHr(profile.birth_date)
    const maxHrVal = a.max_hr ?? maxHrStream
    const hrMaxPct = maxHrVal ? Math.round((Number(maxHrVal) / maxHrEst) * 100) : null
    const tempArr = a.streams?.temp ?? []
    const tempMoy = tempArr.length ? Math.round(tempArr.reduce((s, v) => s + v, 0) / tempArr.length) : null
    const lapsLine = a.laps && a.laps.length > 1
      ? `- Laps : ${a.laps.map(l => (l.avg_watts ? `${Math.round(l.avg_watts)}W` : `${fmtDur(l.moving_time_s)}`)).join(' / ')}`
      : ''
    return `Tu es l'agent d'analyse de performance de THW Coaching.
Analyse complète de cette séance d'entraînement.

DONNÉES COMPLÈTES :
- Activité : ${a.title ?? 'Sans titre'} | Sport : ${a.sport_type} | Date : ${fmtDate(a.started_at)}
- Distance : ${km}km | Durée : ${fmtDur(a.moving_time_s)} | D+ : ${a.elevation_gain_m ? Math.round(Number(a.elevation_gain_m)) : '—'}m
- Watts moy : ${a.avg_watts ? Math.round(Number(a.avg_watts)) : '—'}W | NP : ${np ?? '—'}W | VI : ${vi ?? '—'}
- FC max : ${maxHrVal ?? '—'}bpm (${hrMaxPct ?? '—'}% FCmax) | FC moy : ${a.avg_hr ? Math.round(Number(a.avg_hr)) : '—'}bpm
- TSS : ${a.tss ? Math.round(Number(a.tss)) : '—'} | IF : ${ifVal ?? '—'} | Découp. : ${decoupling?.toFixed(1) ?? '—'}%
- Cadence moy : ${a.avg_cadence ? Math.round(Number(a.avg_cadence)) : '—'}rpm | Vitesse moy : ${speed}km/h
- Temp moy : ${tempMoy ?? '—'}°C | Calories : ${a.calories ? Math.round(Number(a.calories)) : '—'}kcal
- FTP : ${ftp ?? '—'}W | W/kg : ${wkgMoy ?? '—'}
${lapsLine}

Analyse en deux parties séparées par "---EN CLAIR---" :

PARTIE 1 (TECHNIQUE) : qualité de l'effort, pacing, zones,
cohérence puissance/FC, points forts et axes d'amélioration,
analyse physiologique complète.

PARTIE 2 (EN CLAIR) : résumé accessible, ce qu'il faut retenir,
conseil pour la prochaine séance similaire.`
  }

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

  // ── Shared modals JSX (used by both mobile and desktop paths) ──
  const sharedModals = (
    <>
      {showRpeModal && (
        <RpeModal
          activityId={a.id}
          initialRpe={localRpe}
          initialSensation={localSensation}
          onClose={() => setShowRpeModal(false)}
          onSave={(rpe, sens) => {
            setLocalRpe(rpe)
            setLocalSensation(sens)
            setShowRpeModal(false)
          }}
        />
      )}
      <BottomSheet
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
        title="Supprimer l'activité"
      >
        <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7, marginBottom: 16 }}>
          Cette action est irréversible. L&apos;activité sera supprimée
          définitivement de THW Coaching.
          Elle restera présente sur Strava et Polar.
        </p>
        {deleteError && (
          <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{deleteError}</p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12, border: '1px solid var(--info-border)',
              background: 'transparent', color: 'var(--text-body)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12, border: 'none',
              background: '#EF4444', color: 'white',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </BottomSheet>
    </>
  )

  // ── Shared data blocks JSX (5 blocs) ──
  const dataBlocks = (
    <div style={{ display: 'flex', gap: 0, marginBottom: 0, flexWrap: 'wrap' }}>

      {/* BLOC 1 — Volume */}
      <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
        {!isGym && a.distance_m != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Distance</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{fmtDist(a.distance_m)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>Durée</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{fmtDur(a.moving_time_s)}</span>
        </div>
        {isBike && a.avg_speed_ms != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Vitesse moy.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{(Number(a.avg_speed_ms) * 3.6).toFixed(1)} km/h</span>
          </div>
        )}
        {isBike && a.max_speed_ms != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Vitesse max.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{(Number(a.max_speed_ms) * 3.6).toFixed(1)} km/h</span>
          </div>
        )}
        {(isRun || isSwim) && paceS != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Allure moy.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{fmtPace(paceS)}</span>
          </div>
        )}
        {isBike && freewheelS != null && freewheelS > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Roue libre</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{fmtDur(freewheelS)} ({freewheelPct}%)</span>
          </div>
        )}
      </div>

      {/* BLOC 2 — Charge / ressenti */}
      <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textMuted }}>Ressenti</span>
          <button onClick={() => setShowRpeModal(true)} style={{
            background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 6,
            padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: T.textSub,
          }}>+ Saisir</button>
        </div>
        {localSensation != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Sensation</span>
            <span style={{ fontSize: 12, fontWeight: 600,
              color: Number(localSensation) <= 2 ? '#ef4444' : Number(localSensation) <= 3 ? '#f97316' : '#22c55e',
              fontFamily: T.fontMono }}>{Number(localSensation).toFixed(1)}/5</span>
          </div>
        )}
        {localRpe != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>RPE</span>
            <span style={{ fontSize: 12, fontWeight: 600,
              color: Number(localRpe) >= 8 ? '#ef4444' : Number(localRpe) >= 5 ? '#f97316' : '#22c55e',
              fontFamily: T.fontMono }}>{Number(localRpe).toFixed(1)}/10</span>
          </div>
        )}
        {a.tss != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center' }}>
              TSS<TooltipInfo text={'TSS (Training Stress Score)\n\nMesure la charge d\'une séance.\n\nTSS = (durée × NP × IF)² / FTP²\n\n< 150 → récupération rapide\n150–300 → fatigant\n> 300 → très éprouvant'} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(a.tss))}</span>
          </div>
        )}
        {a.trimp != null && !a.tss && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>TRIMP</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(a.trimp))}</span>
          </div>
        )}
        {z2DurationS != null && z2DurationS > 60 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>
              Durée Z2
              <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 4 }}>({hrZones[1].min}–{hrZones[1].max} bpm)</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F87171', fontFamily: T.fontMono }}>{fmtDur(z2DurationS)}</span>
          </div>
        )}
        {decoupling != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Découplage P/FC</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: T.fontMono,
              color: decoupling < 5 ? '#22c55e' : decoupling < 8 ? '#eab308' : '#ef4444',
            }}>{decoupling.toFixed(1)}%</span>
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
            {computedNp != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Watts norm.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{computedNp} W</span>
              </div>
            )}
            {maxWatts != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Watts max</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{maxWatts} W</span>
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
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(a.avg_cadence))} rpm</span>
              </div>
            )}
            {maxCad != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Cadence max</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(maxCad))} rpm</span>
              </div>
            )}
            {freewheelPowerS != null && freewheelPowerS > 60 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Roue libre</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{fmtDur(freewheelPowerS)} ({freewheelPowerPct}%)</span>
              </div>
            )}
            {efVal != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>EF</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{efVal}</span>
              </div>
            )}
            {wkgMoy != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>W/kg</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{wkgMoy} w/kg</span>
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
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(a.avg_cadence))} spm</span>
              </div>
            )}
            {maxCad != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Cadence max</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(maxCad))} spm</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* BLOC 4 — Cardio */}
      {(() => {
        const maxHrEst = estimateMaxHr(profile.birth_date)
        return (
          <div style={{ flex: '1 1 140px', paddingRight: 24, paddingBottom: 12 }}>
            {(a.max_hr ?? maxHrStream) != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>FC max</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>
                  {a.max_hr ?? maxHrStream} bpm
                  <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 4 }}>({Math.round((Number(a.max_hr ?? maxHrStream)/maxHrEst)*100)}%)</span>
                </span>
              </div>
            )}
            {a.avg_hr != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>FC moy.</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>
                  {Math.round(Number(a.avg_hr))} bpm
                  <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 4 }}>({Math.round((Number(a.avg_hr)/maxHrEst)*100)}%)</span>
                </span>
              </div>
            )}
            {decoupling != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Découplage</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: T.fontMono,
                  color: decoupling < 5 ? '#22c55e' : decoupling < 8 ? '#eab308' : '#ef4444',
                }}>{decoupling.toFixed(1)}%</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* BLOC 5 — Contexte */}
      <div style={{ flex: '1 1 140px', paddingBottom: 12 }}>
        {(a.elevation_gain_m ?? 0) > 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>D+</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>+{Math.round(Number(a.elevation_gain_m))} m</span>
          </div>
        )}
        {maxAlt != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Alt. max.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{maxAlt} m</span>
          </div>
        )}
        {avgAlt != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Alt. moy.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{avgAlt} m</span>
          </div>
        )}
        {a.avg_temp_c != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Temp. moy.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(a.avg_temp_c))} °C</span>
          </div>
        )}
        {maxTempStream != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Temp. max</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{maxTempStream} °C</span>
          </div>
        )}
        {a.calories != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Calories</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{Math.round(Number(a.calories))} kcal</span>
          </div>
        )}
      </div>
    </div>
  )

  // ── Two-path return: mobile (Strava) vs desktop (unchanged) ──
  return isMobile ? (
    /* ══════════════════════════════════════════
       MOBILE — layout Strava
    ══════════════════════════════════════════ */
    <>
      <div data-fullscreen-activity="" style={{ position: 'relative', minHeight: '100vh' }}>

        {/* ── CARTE HERO — position:fixed garantit pleine largeur viewport ── */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: '52vh',
          width: '100%',
          zIndex: 10,
        }}>
          {polylinePoints && polylinePoints.length >= 2 ? (
            <ActivityMapCard
              activity={a as unknown as Record<string, unknown>}
              mobileHero={true}
              hoverGps={hoverGps}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${col}33 0%, ${col}11 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: col, opacity: 0.25 }} />
            </div>
          )}
          {/* Bouton retour overlay — fond sombre visible sur toute carte */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, left: 12, zIndex: 20,
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <ChevronLeft size={18} color="white" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── BOTTOM SHEET ── */}
        <div
          data-bottom-sheet=""
          style={{
            marginTop: '52vh',
            position: 'relative', zIndex: 20,
            borderRadius: '20px 20px 0 0',
            paddingBottom: 120,
            animation: 'slideUpSheet 0.45s cubic-bezier(0.32,0.72,0,1) both',
          }}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--info-border)' }} />
          </div>

          {/* Nom + sport + date */}
          <div style={{ padding: '0 16px 16px' }}>
            <div data-activity-title="">
              <ActivityTitle activityId={a.id} initialName={a.title} />
            </div>
            <p data-activity-subtitle="" style={{ fontSize: 13, color: T.textMuted, margin: '4px 0 0', lineHeight: 1.4 }}>
              {SPORT_LABEL[a.sport_type]}
              {' · '}
              {fmtDate(a.started_at)}
              {a.is_race ? ' · Compétition' : ''}
            </p>
          </div>

          {/* Stats 3×2 compact */}
          {(() => {
            const km = a.distance_m ? (Number(a.distance_m)/1000).toFixed(2) : null
            const avgSpeedKmh = a.avg_speed_ms
              ? (Number(a.avg_speed_ms)*3.6).toFixed(1)
              : (a.avg_pace_s_km && Number(a.avg_pace_s_km) > 0)
                ? (3600 / Number(a.avg_pace_s_km)).toFixed(1)
                : (a.moving_time_s && a.distance_m && Number(a.distance_m) > 100)
                  ? ((Number(a.distance_m) / Number(a.moving_time_s)) * 3.6).toFixed(1)
                  : null
            const avgWattsVal = a.avg_watts ? `${Math.round(Number(a.avg_watts))} W` : null
            const elevGainVal = (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : null
            const tssVal = a.tss ? Math.round(Number(a.tss)).toString() : null
            const STATS = [
              { label: 'Distance',   value: !isGym && km ? `${km} km` : '—' },
              { label: 'Durée',      value: a.moving_time_s ? fmtDur(a.moving_time_s) : '—' },
              { label: 'Vitesse',    value: avgSpeedKmh ? `${avgSpeedKmh} km/h` : '—' },
              { label: isBike ? 'Watts moy.' : 'Allure', value: isBike ? (avgWattsVal ?? '—') : (paceS ? fmtPace(paceS) : '—') },
              { label: 'D+',         value: elevGainVal ?? '—' },
              { label: 'TSS',        value: tssVal ?? '—' },
            ]
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '16px 20px',
                gap: 0,
                borderBottom: '1px solid var(--info-border)',
                marginBottom: 24,
              }}>
                {STATS.map((s, i) => (
                  <div key={s.label} style={{
                    padding: '10px 0',
                    paddingRight: i % 3 !== 2 ? 12 : 0,
                    borderRight: i % 3 !== 2 ? '1px solid var(--info-border)' : 'none',
                    paddingLeft: i % 3 !== 0 ? 12 : 0,
                    marginBottom: i < 3 ? 8 : 0,
                  }}>
                    <p data-stat-label="" style={{
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', margin: '0 0 3px',
                    }}>
                      {s.label}
                    </p>
                    <p data-stat-value="" style={{
                      fontSize: 18, fontWeight: 700,
                      color: 'var(--text)', margin: 0, lineHeight: 1.2,
                    }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* ── BOUTON IA GLOBAL (mobile) ── */}
          <div style={{ padding: '0 16px 20px' }}>
            <button
              onClick={() => globalAI.status === 'idle' || globalAI.status === 'done' || globalAI.status === 'error'
                ? globalAI.run(buildGlobalPrompt())
                : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '10px 16px', borderRadius: 8,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <Sparkles size={14} color="#06B6D4" />
              Analyse complète de la séance par l&apos;IA
            </button>
            <AIBubble text={globalAI.text} status={globalAI.status} onRetry={() => { globalAI.reset(); globalAI.run(buildGlobalPrompt()) }} />
          </div>

          {/* ── SECTIONS dans le sheet ── */}
          <div style={{ padding: '0 16px' }}>

            {/* DONNÉES */}
            <Section title="Données">
              {(() => {
                const maxHrEst = estimateMaxHr(profile.birth_date)
                const rows: { label: string; value: string | null }[] = [
                  { label: 'Watts moy.',    value: isBike && a.avg_watts ? `${Math.round(Number(a.avg_watts))} W${pctFtp ? ` (${pctFtp}% FTP)` : ''}` : null },
                  { label: 'Watts norm.',   value: isBike && computedNp ? `${computedNp} W` : null },
                  { label: 'Watts max',     value: isBike && maxWatts ? `${maxWatts} W` : null },
                  { label: 'Cadence moy.',  value: a.avg_cadence ? `${Math.round(Number(a.avg_cadence))} ${isBike ? 'rpm' : 'spm'}` : null },
                  { label: 'Cadence max',   value: maxCad ? `${Math.round(Number(maxCad))} ${isBike ? 'rpm' : 'spm'}` : null },
                  { label: 'W/kg',          value: wkgMoy ? `${wkgMoy} w/kg` : null },
                  { label: 'Roue libre',    value: isBike && freewheelPowerS && freewheelPowerS > 60 ? `${fmtDur(freewheelPowerS)} (${freewheelPowerPct}%)` : null },
                  { label: 'Durée Z2',      value: z2DurationS && z2DurationS > 60 ? fmtDur(z2DurationS) : null },
                  { label: 'Découplage P/FC', value: decoupling != null ? `${decoupling.toFixed(1)}%` : null },
                  { label: 'FC max',        value: (a.max_hr ?? maxHrStream) != null ? `${a.max_hr ?? maxHrStream} bpm (${Math.round((Number(a.max_hr ?? maxHrStream)/maxHrEst)*100)}%)` : null },
                  { label: 'D+',            value: (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : null },
                  { label: 'Alt. max.',     value: maxAlt != null ? `${maxAlt} m` : null },
                  { label: 'Alt. moy.',     value: avgAlt != null ? `${avgAlt} m` : null },
                  { label: 'Temp. moy.',    value: a.avg_temp_c != null ? `${Math.round(Number(a.avg_temp_c))} °C` : null },
                  { label: 'Temp. max',     value: maxTempStream != null ? `${maxTempStream} °C` : null },
                  { label: 'Calories',      value: a.calories != null ? `${Math.round(Number(a.calories))} kcal` : null },
                ].filter(r => r.value)
                return (
                  <div style={{ margin: '0 -16px' }}>
                    {rows.map(r => (
                      <div key={r.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 20px',
                        borderBottom: '1px solid var(--info-border)',
                      }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Section>

            {/* COURBES */}
            {a.streams && (
              <Section title="Courbes">
                <SyncCharts
                  activity={a}
                  hrZones={hrZones}
                  powerZones={bikeZones ?? undefined}
                  paceZones={runZones ?? undefined}
                  polylinePoints={polylinePoints}
                  onHoverGps={setHoverGps}
                />
              </Section>
            )}

            {/* ZONES */}
            {((isBike && bikeZones && powerTimesZ?.some(t => t > 0)) ||
              (isRun && runZones && paceTimesZ?.some(t => t > 0)) ||
              hrTimesZ?.some(t => t > 0)) && (
              <Section title="Zones">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {isBike && bikeZones && powerTimesZ && powerTimesZ.some(t => t > 0) && (
                    <ZonesSection label="Puissance" zones={bikeZones} timesS={powerTimesZ} />
                  )}
                  {isRun && runZones && paceTimesZ && paceTimesZ.some(t => t > 0) && (
                    <ZonesSection label="Allure" zones={runZones} timesS={paceTimesZ} />
                  )}
                  {hrTimesZ && hrTimesZ.some(t => t > 0) && (
                    <ZonesSection label="Fréquence cardiaque" zones={hrZones} timesS={hrTimesZ} />
                  )}
                </div>
              </Section>
            )}

            {/* GRAPHIQUES AVANCÉS */}
            {a.streams && (() => {
              const s = a.streams
              const maxHrEst = estimateMaxHr(profile.birth_date)
              return (
                <>
                  {isBike && s.watts && s.watts.length > 60 && (
                    <Section title="Courbe de puissance">
                      <PowerCurveChart
                        watts={s.watts}
                        activityId={a.id}
                        activityDurationS={a.moving_time_s ?? s.watts.length}
                      />
                    </Section>
                  )}
                  {isBike && s.watts && s.heartrate && s.watts.length > 120 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        <button onClick={() => setShowDecoupling(v => !v)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: T.accent, fontWeight: 600, padding: 0 }}>
                          {showDecoupling ? 'Masquer' : 'Voir le graphique'}
                        </button>
                      </div>
                      {showDecoupling && (
                        <DecouplingChart
                          watts={s.watts} heartrate={s.heartrate}
                          decouplingPct={decoupling} altitude={s.altitude}
                          temp={s.temp} time={s.time}
                        />
                      )}
                      {/* IA Découplage */}
                      <div style={{ marginTop: 12 }}>
                        <button
                          onClick={() => decoupAI.status === 'idle' || decoupAI.status === 'done' || decoupAI.status === 'error'
                            ? decoupAI.run(buildDecouplingPrompt())
                            : undefined}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 20,
                            background: 'linear-gradient(135deg,#06B6D4,#818CF8)',
                            border: 'none', color: 'white',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          <Sparkles size={14} /> Analyser avec l&apos;IA
                        </button>
                        <AIBubble text={decoupAI.text} status={decoupAI.status} onRetry={() => { decoupAI.reset(); decoupAI.run(buildDecouplingPrompt()) }} />
                      </div>
                    </div>
                  )}
                  {(isBike || isRun) && s.heartrate && s.heartrate.length > 60 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        <button onClick={() => setShowHrCumulative(v => !v)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: T.accent, fontWeight: 600, padding: 0 }}>
                          {showHrCumulative ? 'Masquer' : 'Voir le graphique'}
                        </button>
                      </div>
                      {showHrCumulative && (
                        <HrCumulativeChart heartrate={s.heartrate} maxHrEst={maxHrEst} />
                      )}
                    </div>
                  )}
                </>
              )
            })()}

            {/* NOTES */}
            {(a.notes || a.description) && (
              <Section title="Commentaire">
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{a.notes ?? a.description}</div>
              </Section>
            )}

            {/* LAPS */}
            {a.laps && a.laps.length > 1 && (
              <Section title={`Intervalles — ${a.laps.length} tours`}>
                <div style={{ overflowX: 'auto' }}>
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
                              {isBike ? (lap.avg_watts ? `${Math.round(lap.avg_watts)} W` : '—')
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
              </Section>
            )}

            {/* DELETE */}
            <div style={{ marginTop: 32, paddingBottom: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12,
                  background: 'none', border: '1.5px solid #EF4444',
                  color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Supprimer l&apos;activité
              </button>
            </div>

          </div>
        </div>
      </div>

      {sharedModals}
    </>
  ) : (
    /* ══════════════════════════════════════════
       DESKTOP — layout existant inchangé
    ══════════════════════════════════════════ */
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── PARTIE 2 : Header bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexWrap: 'nowrap',
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: '#06B6D4', padding: 0, flexShrink: 0,
        }}>
          <ChevronLeft size={16} /> Retour
        </button>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <ActivityTitle activityId={a.id} initialName={a.title} />
        </div>
        <span style={{ fontSize: 12, background: col + '18', color: col, padding: '2px 8px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>
          {SPORT_LABEL[a.sport_type]}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {fmtDate(a.started_at)}
          {a.is_race && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#ef444415', padding: '2px 8px', borderRadius: 20 }}>Compétition</span>}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowDeleteConfirm(true)} style={{
          fontSize: 12, color: '#EF4444', border: '1px solid #EF4444',
          borderRadius: 5, padding: '3px 10px', background: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          Supprimer
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ── PARTIE 3 : Hero row (carte | stats) ── */}
        {mapExpanded ? (
          <div style={{ height: 400, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <ActivityMapCard
              activity={a as unknown as Record<string, unknown>}
              isMobile={false}
              expanded={true}
              onToggle={() => setMapExpanded(false)}
              hoverGps={hoverGps}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Carte */}
            <div style={{ height: 280, borderRadius: 10, overflow: 'hidden' }}>
              <ActivityMapCard
                activity={a as unknown as Record<string, unknown>}
                isMobile={false}
                expanded={false}
                onToggle={() => setMapExpanded(true)}
                hoverGps={hoverGps}
              />
            </div>
            {/* Stats + Analyse */}
            <div>
              {(() => {
                const km = !isGym && a.distance_m ? (Number(a.distance_m)/1000).toFixed(2) : null
                const avgSpeedKmh = a.avg_speed_ms
                  ? (Number(a.avg_speed_ms)*3.6).toFixed(1)
                  : (paceS && paceS > 0) ? (3600/paceS).toFixed(1) : null
                const STATS_MAIN = [
                  { label: 'Distance',  value: km ? `${km} km` : '—' },
                  { label: 'Durée',     value: a.moving_time_s ? fmtDur(a.moving_time_s) : '—' },
                  { label: 'Vitesse',   value: avgSpeedKmh ? `${avgSpeedKmh} km/h` : '—' },
                  { label: isBike ? 'Watts moy.' : 'Allure',
                    value: isBike ? (a.avg_watts ? `${Math.round(Number(a.avg_watts))} W` : '—') : (paceS ? fmtPace(paceS) : '—'),
                    color: isBike ? '#818CF8' : undefined },
                  { label: 'D+',        value: (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : '—' },
                  { label: 'TSS',       value: a.tss ? Math.round(Number(a.tss)).toString() : '—', color: '#F97316' },
                ]
                return (
                  <>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
                      background: 'var(--border)', border: '1px solid var(--border)',
                      borderRadius: 10, overflow: 'hidden', marginBottom: 10,
                    }}>
                      {STATS_MAIN.map(s => (
                        <div key={s.label} style={{ background: 'var(--bg)', padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 500, color: s.color ?? 'var(--text)' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {decoupling !== null && (
                      <div style={{
                        background: decoupling < 5 ? 'var(--zone-good-bg)' : decoupling < 10 ? 'var(--zone-med-bg)' : 'var(--zone-bad-bg)',
                        border: `1px solid ${decoupling < 5 ? 'var(--zone-good-border)' : decoupling < 10 ? 'var(--zone-med-border)' : 'var(--zone-bad-border)'}`,
                        borderRadius: 7, padding: '8px 12px',
                        display: 'flex', gap: 8, alignItems: 'center',
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: decoupling < 5 ? '#10B981' : decoupling < 10 ? '#F59E0B' : '#EF4444', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-body)' }}>
                          {decoupling < 5 ? 'Bonne résistance aérobie' : decoupling < 10 ? 'Légère dérive cardiaque' : 'Dérive cardiaque élevée'} — découplage {decoupling.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── IA ANALYSE GLOBALE (desktop) ── */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => globalAI.status === 'idle' || globalAI.status === 'done' || globalAI.status === 'error'
              ? globalAI.run(buildGlobalPrompt())
              : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer',
            }}
          >
            <Sparkles size={14} color="#06B6D4" />
            Analyse complète de la séance par l&apos;IA
          </button>
          <AIBubble text={globalAI.text} status={globalAI.status} onRetry={() => { globalAI.reset(); globalAI.run(buildGlobalPrompt()) }} />
        </div>

        {/* ── PARTIE 4 : Données détaillées — 4 colonnes ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, padding: '16px 20px' }}>

            {/* ── PUISSANCE (bike) / EFFORT (run/gym) ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase', color: '#818CF8', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #818CF825' }}>
                {isBike ? 'Puissance' : 'Effort'}
              </div>
              {(isBike ? [
                { label: 'Watts norm.',  value: computedNp ? `${computedNp} W` : null },
                { label: 'Watts max',    value: maxWatts ? `${maxWatts} W` : null },
                { label: 'W/kg',         value: wkgMoy ? `${wkgMoy} W/kg` : null },
                { label: 'Roue libre',   value: freewheelPowerPct ? `${freewheelPowerPct}%` : null },
                { label: 'Cadence moy.', value: a.avg_cadence ? `${Math.round(Number(a.avg_cadence))} rpm` : null },
                { label: 'Cadence max',  value: maxCad ? `${maxCad} rpm` : null },
              ] : [
                { label: 'Durée',        value: a.moving_time_s ? fmtDur(a.moving_time_s) : null },
                { label: 'Allure moy.',  value: paceS ? fmtPace(paceS) : null },
                { label: 'Cadence moy.', value: a.avg_cadence ? `${Math.round(Number(a.avg_cadence))} spm` : null },
                { label: 'Cadence max',  value: maxCad ? `${maxCad} spm` : null },
                { label: 'Distance',     value: a.distance_m ? fmtDist(a.distance_m) : null },
              ] as { label: string; value: string | null }[]).filter(r => r.value != null).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* ── CARDIO ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase', color: '#EF4444', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #EF444425' }}>
                Cardio
              </div>
              {(() => {
                const maxHrVal = a.max_hr ?? maxHrStream
                const maxHrEst = estimateMaxHr(profile.birth_date)
                const maxHrPct = maxHrVal && maxHrEst ? Math.round((maxHrVal / maxHrEst) * 100) : null
                return (
                  <>
                    {maxHrVal != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>FC max</span>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{maxHrVal} bpm{maxHrPct ? <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> ({maxHrPct}%)</span> : null}</span>
                      </div>
                    )}
                    {decoupling !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Découplage P/FC</span>
                        <span style={{ fontWeight: 500, color: decoupling < 5 ? '#10B981' : 'var(--text)' }}>{decoupling.toFixed(1)}%</span>
                      </div>
                    )}
                    {z2DurationS != null && z2DurationS > 30 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Durée Z2</span>
                        <span style={{ fontWeight: 500, color: '#06B6D4' }}>{fmtDur(z2DurationS)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ressenti</span>
                      {localSensation != null
                        ? <span style={{ fontWeight: 500, color: 'var(--text)' }}>{localSensation}/5</span>
                        : <button onClick={() => setShowRpeModal(true)} style={{ fontSize: 11, color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Saisir</button>
                      }
                    </div>
                  </>
                )
              })()}
            </div>

            {/* ── TERRAIN ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase', color: '#10B981', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #10B98125' }}>
                Terrain
              </div>
              {[
                { label: 'D+',         value: (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : null },
                { label: 'Alt. max',   value: maxAlt ? `${maxAlt} m` : null },
                { label: 'Alt. moy.',  value: avgAlt ? `${avgAlt} m` : null },
                { label: 'Distance',   value: a.distance_m ? fmtDist(a.distance_m) : null },
              ].filter(r => r.value != null).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* ── CONDITIONS ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase', color: '#F97316', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #F9731625' }}>
                Conditions
              </div>
              {(() => {
                const tempAvg = a.avg_temp_c != null
                  ? Math.round(Number(a.avg_temp_c))
                  : (a.streams?.temp?.length ? Math.round(a.streams.temp.reduce((s, v) => s + v, 0) / a.streams.temp.length) : null)
                return ([
                  { label: 'Temp. moy.',  value: tempAvg != null ? `${tempAvg} °C` : null,                        color: undefined },
                  { label: 'Temp. max',   value: maxTempStream ? `${maxTempStream} °C` : null,                     color: maxTempStream && maxTempStream > 32 ? '#EF4444' : undefined },
                  { label: 'Calories',    value: a.calories ? `${Math.round(Number(a.calories))} kcal` : null,     color: undefined },
                  { label: 'TSS',         value: a.tss ? Math.round(Number(a.tss)).toString() : null,              color: '#F97316' as string | undefined },
                  { label: 'TRIMP',       value: a.trimp ? Math.round(Number(a.trimp)).toString() : null,          color: undefined },
                ] as { label: string; value: string | null; color?: string }[]).filter(r => r.value != null).map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ fontWeight: 500, color: r.color ?? 'var(--text)' }}>{r.value}</span>
                  </div>
                ))
              })()}
            </div>

          </div>
        </div>

        {/* ── COURBES ── */}
        {a.streams && (
          <div style={{ marginBottom: 32, paddingTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Courbes
            </div>
            <SyncCharts
              activity={a}
              hrZones={hrZones}
              powerZones={bikeZones ?? undefined}
              paceZones={runZones ?? undefined}
              polylinePoints={polylinePoints}
              onHoverGps={setHoverGps}
            />
          </div>
        )}

        {/* ── LAPS ── */}
        {a.laps && a.laps.length > 1 && (
          <div style={{ marginBottom: 32, paddingTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Laps · {a.laps.length} tours
            </div>
            <LapsChart
              laps={a.laps}
              streams={a.streams}
              avgWatts={a.avg_watts}
              hoveredLap={hoveredLapBar}
              onHoverLap={setHoveredLapBar}
            />
            <LapsTable
              laps={a.laps}
              streams={a.streams}
              sport={a.sport_type}
              maxHrEst={estimateMaxHr(profile.birth_date)}
              hoveredLap={hoveredLapBar}
              onHoverLap={setHoveredLapBar}
            />
          </div>
        )}

        {/* ── ZONES ── */}
        {((isBike && bikeZones && powerTimesZ && powerTimesZ.some(t => t > 0)) ||
          (isRun && runZones && paceTimesZ && paceTimesZ.some(t => t > 0)) ||
          (hrTimesZ && hrTimesZ.some(t => t > 0))) ? (
          <div style={{ marginBottom: 32, paddingTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
              textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
              Zones
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {isBike && bikeZones && powerTimesZ && powerTimesZ.some(t => t > 0) && (
                <ZonesSection label="Puissance" zones={bikeZones} timesS={powerTimesZ} />
              )}
              {isRun && runZones && paceTimesZ && paceTimesZ.some(t => t > 0) && (
                <ZonesSection label="Allure" zones={runZones} timesS={paceTimesZ} />
              )}
              {hrTimesZ && hrTimesZ.some(t => t > 0) && (
                <ZonesSection label="Fréquence cardiaque" zones={hrZones} timesS={hrTimesZ} />
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
            <div style={{ marginBottom: 32, paddingTop: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
                textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
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

        {/* ── GRAPHIQUES D'ANALYSE AVANCÉE ── */}
        {a.streams && (() => {
          const s = a.streams
          const maxHrEst = estimateMaxHr(profile.birth_date)
          const showDec      = isBike && !!s.watts && !!s.heartrate && s.watts.length > 120
          const showHrCum    = (isBike || isRun) && !!s.heartrate && s.heartrate.length > 60
          const showDistrib  = isBike && !!s.watts && s.watts.length > 120
          const showAerobicE = isBike && !!s.watts && !!s.heartrate && s.watts.length > 400
          return (
            <>
              {/* MMP / GAP */}
              {isBike && s.watts && s.watts.length > 60 && (
                <PowerCurveChart
                  watts={s.watts}
                  activityId={a.id}
                  activityDurationS={a.moving_time_s ?? s.watts.length}
                />
              )}
              {isRun && s.velocity && s.altitude && s.distance && s.velocity.length > 60 && (
                <GapChart velocity={s.velocity} altitude={s.altitude} distance={s.distance} />
              )}

              {/* A — DÉCOUPLAGE P/FC — pleine largeur */}
              {showDec && (
                <div style={{ marginBottom: 32, paddingTop: 8 }}>
                  <DecouplingChart
                    watts={s.watts!}
                    heartrate={s.heartrate!}
                    decouplingPct={decoupling}
                    altitude={s.altitude}
                    temp={s.temp}
                    time={s.time}
                  />
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => decoupAI.status === 'idle' || decoupAI.status === 'done' || decoupAI.status === 'error'
                        ? decoupAI.run(buildDecouplingPrompt())
                        : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 20,
                        background: 'linear-gradient(135deg,#06B6D4,#818CF8)',
                        border: 'none', color: 'white',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      <Sparkles size={14} /> Analyser avec l&apos;IA
                    </button>
                    <AIBubble text={decoupAI.text} status={decoupAI.status} onRetry={() => { decoupAI.reset(); decoupAI.run(buildDecouplingPrompt()) }} />
                  </div>
                </div>
              )}

              {/* B — DISTRIBUTION + DURÉE CUMULÉE — 2 colonnes */}
              {(showDistrib || showHrCum) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                  {showDistrib && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
                        textTransform: 'uppercase', marginBottom: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
                        Distribution de puissance
                      </div>
                      <PowerDistribution
                        watts={s.watts!}
                        ftp={a.ftp_at_time}
                      />
                    </div>
                  )}
                  {showHrCum && (
                    <div>
                      <HrCumulativeChart heartrate={s.heartrate!} maxHrEst={maxHrEst} />
                    </div>
                  )}
                </div>
              )}

              {/* C — EFFICACITÉ AÉROBIE — pleine largeur */}
              {showAerobicE && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9,
                    textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
                    Efficacité aérobie
                  </div>
                  <AerobicEfficiency
                    watts={s.watts!}
                    heartrate={s.heartrate!}
                    time={s.time}
                  />
                </div>
              )}
            </>
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


      </div>

      {sharedModals}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CALENDAR — Apple Calendar style (all screen sizes)
// ─────────────────────────────────────────────────────────────

const MCAL_MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MCAL_DAYS_MOB  = ['L','M','M','J','V','S','D']
const MCAL_DAYS_DESK = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

type MK = { year: number; month: number }

function mkKey(m: MK)                   { return `${m.year}-${m.month}` }
function addMK(m: MK, delta: number): MK {
  let mo = m.month + delta
  const yr = m.year + Math.floor(mo / 12)
  mo = ((mo % 12) + 12) % 12
  return { year: yr, month: mo }
}
function daysInMK(m: MK): number  { return new Date(m.year, m.month + 1, 0).getDate() }
function firstDowMK(m: MK): number { return (new Date(m.year, m.month, 1).getDay() + 6) % 7 } // Mon=0
function toDS(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

// ── Month grid ────────────────────────────────────────────────
function CalendarMonthGrid({ mk, actMap, todayStr, isMobile, onDayTap }: {
  mk: MK
  actMap: Map<string, Activity[]>
  todayStr: string
  isMobile: boolean
  onDayTap: (d: string) => void
}) {
  const firstDow = firstDowMK(mk)
  const days     = daysInMK(mk)
  const cells: (number | null)[] = [
    ...Array.from<null>({ length: firstDow }).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  const cellMinH  = isMobile ? 70 : 90
  const dayFs     = isMobile ? 18 : 20

  return (
    <div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: `0.5px solid ${T.border}` }}>
          {row.map((day, di) => {
            if (day === null) return <div key={di} style={{ minHeight: cellMinH }} />

            const dateStr   = toDS(mk.year, mk.month, day)
            const acts      = actMap.get(dateStr) ?? []
            const isToday   = dateStr === todayStr
            const isWeekend = di >= 5

            return (
              <div
                key={di}
                onClick={() => acts.length > 0 ? onDayTap(dateStr) : undefined}
                style={{
                  minHeight: cellMinH,
                  padding: isMobile ? '6px 2px' : '6px 6px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMobile ? 'center' : 'flex-start',
                  gap: isMobile ? 4 : 3,
                  cursor: acts.length > 0 ? 'pointer' : 'default',
                }}
              >
                {/* Day number */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: isToday ? '#EF4444' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: dayFs, fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#fff' : isWeekend ? T.textMuted : T.text,
                  flexShrink: 0,
                  alignSelf: isMobile ? 'center' : 'flex-start',
                }}>
                  {day}
                </div>

                {/* Mobile: dots only */}
                {isMobile && acts.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center', maxWidth: 36, flexWrap: 'wrap' }}>
                    {acts.slice(0, 3).map((a, ai) => (
                      <div key={ai} style={{ width: 6, height: 6, borderRadius: '50%', background: SPORT_COLOR[a.sport_type] ?? '#94a3b8', flexShrink: 0 }} />
                    ))}
                    {acts.length > 3 && <span style={{ fontSize: 10, color: T.textMuted, lineHeight: 1 }}>+</span>}
                  </div>
                )}

                {/* Desktop: dot + text per activity */}
                {!isMobile && acts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                    {acts.slice(0, 3).map((a, ai) => {
                      const col   = SPORT_COLOR[a.sport_type] ?? '#94a3b8'
                      const label = `${SPORT_LABEL[a.sport_type]}${a.moving_time_s ? ` · ${fmtDur(a.moving_time_s)}` : ''}`
                      return (
                        <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                          <span style={{
                            fontSize: 11, color: col, fontWeight: 500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                          }}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                    {acts.length > 3 && (
                      <span style={{ fontSize: 10, color: T.textMuted, paddingLeft: 10 }}>
                        +{acts.length - 3} autre{acts.length - 3 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Day panel (bottom sheet on mobile, right panel on desktop) ─
function DayPanel({ date, acts, isMobile, onClose, onSelect }: {
  date: string
  acts: Activity[]
  isMobile: boolean
  onClose: () => void
  onSelect: (a: Activity) => void
}) {
  const d   = new Date(date + 'T00:00:00')
  const cap = (() => {
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  const actList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {acts.length === 0 ? (
        <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Aucune activité ce jour</p>
      ) : acts.map(a => {
        const col = SPORT_COLOR[a.sport_type] ?? '#888'
        return (
          <div key={a.id} onClick={() => { onSelect(a); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.3 }}>
                {a.title || SPORT_LABEL[a.sport_type]}
              </p>
              <p style={{ fontSize: 11, color: T.textMuted, margin: '2px 0 0' }}>
                {SPORT_LABEL[a.sport_type]}
                {a.moving_time_s ? ` · ${fmtDur(a.moving_time_s)}`  : ''}
                {a.distance_m    ? ` · ${fmtDist(a.distance_m)}`    : ''}
              </p>
            </div>
            <span style={{ fontSize: 18, color: T.textMuted }}>›</span>
          </div>
        )
      })}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <style>{`@keyframes mcal_up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: T.surface, borderRadius: '18px 18px 0 0',
          padding: '14px 16px 40px', zIndex: 201,
          maxHeight: '60vh', overflowY: 'auto',
          boxShadow: '0 -6px 32px rgba(0,0,0,0.22)',
          animation: 'mcal_up 0.22s ease',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 14px', fontFamily: T.fontDisplay }}>{cap}</p>
          {actList}
        </div>
      </>
    )
  }

  // Desktop: right slide-in panel
  return (
    <>
      <style>{`@keyframes mcal_right{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
        background: T.surface, borderLeft: `1px solid ${T.border}`,
        padding: '24px 20px', zIndex: 201,
        overflowY: 'auto',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.12)',
        animation: 'mcal_right 0.22s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontDisplay }}>{cap}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.textMuted, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        {actList}
      </div>
    </>
  )
}

// ── Main calendar view ────────────────────────────────────────
function CalendarView({ activities, onSelect, isMobile }: {
  activities: Activity[]
  onSelect: (a: Activity) => void
  isMobile: boolean
}) {
  const now      = new Date()
  const todayStr = toDS(now.getFullYear(), now.getMonth(), now.getDate())
  const curMK: MK = { year: now.getFullYear(), month: now.getMonth() }

  const [months, setMonths] = useState<MK[]>(() => {
    const arr: MK[] = []
    for (let i = -3; i <= 3; i++) arr.push(addMK(curMK, i))
    return arr
  })

  const actMap = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const a of activities) {
      const d   = new Date(a.started_at)
      const key = toDS(d.getFullYear(), d.getMonth(), d.getDate())
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [activities])

  const [panelDate, setPanelDate] = useState<string | null>(null)
  const panelActs = panelDate ? (actMap.get(panelDate) ?? []) : []

  const scrollRef   = useRef<HTMLDivElement>(null)
  const monthRefs   = useRef<Map<string, HTMLDivElement>>(new Map())
  const topSentinel = useRef<HTMLDivElement>(null)
  const botSentinel = useRef<HTMLDivElement>(null)
  const didScroll   = useRef(false)

  // Scroll to current month on first render
  useEffect(() => {
    if (didScroll.current) return
    requestAnimationFrame(() => {
      const el  = monthRefs.current.get(mkKey(curMK))
      const con = scrollRef.current
      if (el && con) { con.scrollTop = el.offsetTop; didScroll.current = true }
    })
  })

  // Infinite scroll
  useEffect(() => {
    const con = scrollRef.current
    if (!con) return
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        if (e.target === topSentinel.current) {
          setMonths(prev => {
            const added: MK[] = []
            for (let i = 3; i >= 1; i--) added.push(addMK(prev[0], -i))
            return [...added, ...prev]
          })
        } else if (e.target === botSentinel.current) {
          setMonths(prev => {
            const last = prev[prev.length - 1]
            const added: MK[] = []
            for (let i = 1; i <= 3; i++) added.push(addMK(last, i))
            return [...prev, ...added]
          })
        }
      }
    }, { root: con, rootMargin: '400px 0px' })
    if (topSentinel.current) obs.observe(topSentinel.current)
    if (botSentinel.current) obs.observe(botSentinel.current)
    return () => obs.disconnect()
  }, [])

  const handleDayTap = useCallback((d: string) => setPanelDate(d), [])

  const dayLabels = isMobile ? MCAL_DAYS_MOB : MCAL_DAYS_DESK
  const scrollH   = isMobile
    ? 'calc(100svh - 52px - 14px - 50px - 50px)'
    : 'calc(100vh - 220px)'

  return (
    <div style={{ maxWidth: isMobile ? undefined : 1200, margin: isMobile ? undefined : '0 auto' }}>
      {/* Weekday header */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        background: T.surface, borderBottom: `1px solid ${T.border}`,
      }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{
            padding: isMobile ? '7px 0' : '9px 0', textAlign: 'center',
            fontSize: isMobile ? 12 : 12, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 0.4,
            color: i >= 5 ? T.textMuted : T.textSub,
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Scrollable months */}
      <div
        ref={scrollRef}
        style={{
          overflowY: 'auto',
          height: scrollH,
          overscrollBehavior: 'contain',
        }}
      >
        <div ref={topSentinel} style={{ height: 1 }} />

        {months.map(mk => (
          <div key={mkKey(mk)} ref={el => { if (el) monthRefs.current.set(mkKey(mk), el) }}>
            {/* Sticky month name */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              background: T.surface,
              padding: isMobile ? '12px 16px 6px' : '14px 20px 8px',
              borderBottom: `0.5px solid ${T.border}`,
            }}>
              <span style={{
                fontSize: 28, fontWeight: 800,
                color: T.text, fontFamily: T.fontDisplay, letterSpacing: -0.5,
              }}>
                {MCAL_MONTHS[mk.month]}
              </span>
              {' '}
              <span style={{ fontSize: 15, fontWeight: 400, color: T.textMuted }}>
                {mk.year !== now.getFullYear() ? mk.year : ''}
              </span>
            </div>

            <CalendarMonthGrid
              mk={mk} actMap={actMap} todayStr={todayStr}
              isMobile={isMobile} onDayTap={handleDayTap}
            />
          </div>
        ))}

        <div ref={botSentinel} style={{ height: 1 }} />
      </div>

      {panelDate && (
        <DayPanel
          date={panelDate} acts={panelActs}
          isMobile={isMobile}
          onClose={() => setPanelDate(null)}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CALENDAR GRID — unified entry point
// ─────────────────────────────────────────────────────────────
function CalendarGrid({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const isMobile = useWindowWidth() < 768
  return <CalendarView activities={activities} onSelect={onSelect} isMobile={isMobile} />
}

// ─────────────────────────────────────────────────────────────
// SECTION: ANALYSE
// ─────────────────────────────────────────────────────────────
function SectionAnalyse({ activities, zones, profile, deepLinkId, onDelete, loadMore, hasMore, loadingMore }: {
  activities: Activity[]
  zones: TrainingZoneRow[]
  profile: Profile
  deepLinkId?: string | null
  onDelete?: (id: string) => void
  loadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
}) {
  const saWidth    = useWindowWidth()
  const isMobileSA = saWidth < 768
  const [view, setView]         = useState<'list'|'calendar'>('list')
  const [selected, setSelected] = useState<Activity | null>(null)
  const [search, setSearch]     = useState('')
  const [sport, setSport]       = useState<'all' | SportType>('all')
  const [raceFilter, setRaceFilter] = useState<'all'|'race'|'training'>('all')
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const touchStartX = useRef<number>(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !loadMore) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore()
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadMore, hasMore, loadingMore])

  // Deep-link : ouvre automatiquement l'activité demandée depuis Planning
  useEffect(() => {
    if (!deepLinkId || activities.length === 0 || selected) return
    const found = activities.find(a => a.id === deepLinkId)
    if (found) setSelected(found)
  }, [deepLinkId, activities])

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
        {/* Bouton retour masqué sur mobile — remplacé par le header fixe dans ActivityDetail */}
        {!isMobileSA && (
          <button
            onClick={() => setSelected(null)}
            style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', color: T.textSub, fontSize: 13, padding: 0 }}>
            <span style={{ fontSize: 16 }}>←</span> Retour à la liste
          </button>
        )}
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
                <div key={act.id} style={{ position: 'relative', overflow: 'hidden' }}>
                  {onDelete && (
                    <div
                      onClick={() => setConfirmDeleteId(act.id)}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
                      <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Supprimer</span>
                    </div>
                  )}
                  <div
                    style={{ transform: swipedId === act.id ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 200ms ease', background: T.surface, position: 'relative', zIndex: 2 }}
                    onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
                    onTouchEnd={e => {
                      if (!onDelete) return
                      const delta = e.changedTouches[0].clientX - touchStartX.current
                      if (delta < -50) setSwipedId(act.id)
                      else if (delta > 20) setSwipedId(null)
                    }}
                  >
                    <ActivityRow a={act} selected={false} onClick={() => {
                      if (swipedId === act.id) { setSwipedId(null); return }
                      setSelected(act)
                    }} />
                  </div>
                  {confirmDeleteId === act.id && (
                    <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.06)', borderTop: `1px solid rgba(239,68,68,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#EF4444' }}>Supprimer cette activité ?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { onDelete?.(act.id); setConfirmDeleteId(null); setSwipedId(null) }} style={{ padding: '5px 14px', borderRadius: 8, background: '#EF4444', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
                        <button onClick={() => { setConfirmDeleteId(null); setSwipedId(null) }} style={{ padding: '5px 14px', borderRadius: 8, background: T.border, border: 'none', color: T.text, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>Aucune activité</div>
              )}
            </div>
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: T.textMuted }}>Chargement…</div>
          )}
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
  return <ToastProvider><TrainingPageInner /></ToastProvider>
}

function TrainingPageInner() {
  useTheme() // branche sur le thème global (force re-render quand dark/light change)
  const { activities, totalCount, loading, loadingMore, hasMore, error, reload, loadMore, removeActivity } = useActivities()
  const { showToast } = useToast()
  const { show: showHelp, dismiss: dismissHelp, reopen: reopenHelp } = usePageOnboarding(TRAINING_ONBOARDING.pageId, TRAINING_ONBOARDING.version)
  const zones   = useTrainingZones()
  const profile = useProfile()
  const [section, setSection]       = useState<Section>('donnees')
  const [sectionOpen, setSectionOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [syncing, setSyncing]           = useState(false)
  const [syncingPolar, setSyncingPolar] = useState(false)
  const [syncMsg, setSyncMsg]           = useState<string | null>(null)
  const [importing, setImporting]     = useState(false)
  const [appMenuOpen, setAppMenuOpen] = useState(false)
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 })
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const fileInputRef       = useRef<HTMLInputElement>(null)
  const appBtnRef          = useRef<HTMLButtonElement>(null)
  const sectionDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/oauth/status').then(r => r.json())
      .then((json: { connected?: { provider: string }[] }) => {
        setConnectedProviders((json.connected ?? []).map(c => c.provider))
      }).catch(() => {})
  }, [])

  const stravaConnected = connectedProviders.includes('strava')
  const polarConnected  = connectedProviders.includes('polar')
  const garminConnected = connectedProviders.includes('garmin')

  function handleAppBtn() {
    if (appBtnRef.current) {
      const r = appBtnRef.current.getBoundingClientRect()
      setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setAppMenuOpen(v => !v)
  }

  const handleDeleteActivity = async (actId: string) => {
    const sb = createClient()
    const { error: delErr } = await sb.from('activities').delete().eq('id', actId)
    if (!delErr) {
      removeActivity(actId)
      showToast('Activité supprimée')
    } else {
      showToast('Erreur lors de la suppression')
    }
  }

  // Polar auto-sync on mount — cooldown 5 min
  useEffect(() => {
    const COOLDOWN_MS = 5 * 60 * 1000
    const last = localStorage.getItem('polar_last_sync')
    if (last && Date.now() - Number(last) < COOLDOWN_MS) return
    setSyncMsg('Polar…')
    fetch('/api/sync/polar', { method: 'POST' })
      .then(r => r.json())
      .then((json: { exercises_synced?: number }) => {
        localStorage.setItem('polar_last_sync', String(Date.now()))
        if ((json.exercises_synced ?? 0) > 0) {
          setSyncMsg(`+${json.exercises_synced} Polar`)
          reload()
        } else {
          setSyncMsg(null)
        }
      })
      .catch(() => { setSyncMsg(null) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-activity-file', { method: 'POST', body: formData })
      const json = await res.json() as { activity?: { name?: string; date?: string; duration_seconds?: number; distance_km?: number; elevation_gain_m?: number; hr_avg?: number; hr_max?: number; calories?: number; tss?: number }; error?: string }
      if (!res.ok || !json.activity) throw new Error(json.error ?? 'Erreur import')
      const a = json.activity
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Non connecté')
      const { error: insErr } = await sb.from('activities').insert({
        user_id: user.id,
        title: a.name ?? file.name,
        started_at: a.date ?? new Date().toISOString(),
        moving_time_s: a.duration_seconds ?? null,
        distance_m: a.distance_km != null ? Math.round(a.distance_km * 1000) : null,
        elevation_gain_m: a.elevation_gain_m ?? null,
        avg_hr: a.hr_avg ?? null,
        max_hr: a.hr_max ?? null,
        calories: a.calories ?? null,
        tss: a.tss ?? null,
        sport_type: 'other',
        provider: 'manual_import',
      })
      if (insErr) throw insErr
      showToast('Activité importée')
      await reload()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur import')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const width   = useWindowWidth()
  const isMobile = width < 768
  const active  = NAV.find(n => n.id === section)!
  // Deep-link depuis Planning : ?id=<activity_id> → ouvre directement la section analyse
  const [deepLinkId, setDeepLinkId] = useState<string|null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) { setDeepLinkId(id); setSection('analyse') }
  }, [])

  // Sidebar collapse — restore from localStorage (mobile always closed)
  useEffect(() => {
    if (isMobile) { setSidebarOpen(false); return }
    const saved = localStorage.getItem('sidebar_open')
    if (saved !== null) setSidebarOpen(saved === 'true')
  }, [isMobile])

  // Sidebar collapse — persist to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_open', String(sidebarOpen))
  }, [sidebarOpen])

  async function syncStrava() {
    setSyncing(true); setSyncMsg(null)
    try {
      const res  = await fetch('/api/sync/strava', { method: 'POST' })
      const json = await res.json() as { synced?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Sync échoué')
      setSyncMsg(json.synced === 0 ? 'À jour' : `+${json.synced} activité${json.synced !== 1 ? 's' : ''}`)
      await reload()
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSyncing(false); setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  async function syncPolar() {
    setSyncingPolar(true); setSyncMsg(null)
    try {
      const res  = await fetch('/api/sync/polar', { method: 'POST' })
      const json = await res.json() as { exercises_synced?: number }
      localStorage.setItem('polar_last_sync', String(Date.now()))
      if ((json.exercises_synced ?? 0) > 0) { setSyncMsg(`+${json.exercises_synced} Polar`); await reload() }
      else setSyncMsg('Polar à jour')
    } catch { setSyncMsg('Erreur Polar') }
    finally { setSyncingPolar(false); setTimeout(() => setSyncMsg(null), 4000) }
  }

  function handleFileImport() { fileInputRef.current?.click() }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target as Node)) {
        setSectionOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.fontBody }}>

      {/* ── TOP BAR — section dropdown + boutons ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: T.bg }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Gauche : dropdown de section animé (mobile uniquement) */}
          <div ref={sectionDropdownRef} style={{ position: 'relative' }}>
            {isMobile ? (
            <button
              onClick={() => setSectionOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{active.label}</span>
              <svg width="12" height="12" viewBox="0 0 12 12"
                style={{ transform: sectionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 250ms ease', flexShrink: 0 }}
              >
                <path d="M2 4l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{active.label}</span>
            )}
            {/* Menu déroulant animé — mobile uniquement */}
            {isMobile && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 220, zIndex: 200,
              backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              maxHeight: sectionOpen ? '300px' : '0px',
              opacity: sectionOpen ? 1 : 0,
              transition: 'max-height 300ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
              pointerEvents: sectionOpen ? 'auto' : 'none',
            }}>
              {NAV.map(n => (
                <button key={n.id}
                  onClick={() => { setSection(n.id); setSectionOpen(false) }}
                  style={{
                    width: '100%', padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                    backgroundColor: n.id === section ? 'rgba(6,182,212,0.08)' : 'transparent',
                    borderLeft: n.id === section ? '3px solid #06B6D4' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{n.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.desc}</span>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Droite : statuts de sync + boutons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading && <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody }}>Chargement…</span>}
            {syncing && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#FC4C02', fontWeight: 600 }}><Spinner size={12} color="#FC4C02" /> Strava</span>}
            {syncingPolar && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#D0021B', fontWeight: 600 }}><Spinner size={12} color="#D0021B" /> Polar</span>}
            {syncMsg && !syncing && !syncingPolar && (
              <span style={{ fontSize: 11, color: syncMsg.startsWith('+') ? '#22c55e' : syncMsg.includes('jour') ? T.textMuted : '#ef4444', fontFamily: T.fontBody, fontWeight: 600 }}>{syncMsg}</span>
            )}
            <input ref={fileInputRef} type="file" accept=".fit,.gpx" style={{ display: 'none' }} onChange={handleImportFile} />
            <button
              ref={appBtnRef}
              onClick={handleAppBtn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              App
              <ChevronDown size={13} className="text-muted-foreground" />
            </button>
            {appMenuOpen && createPortal(
              <div className="fixed inset-0 z-[9999]" onClick={() => setAppMenuOpen(false)}>
                <div
                  className="absolute w-52 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
                  style={{ top: menuPos.top, right: menuPos.right }}
                  onClick={e => e.stopPropagation()}
                >
                  {[
                    { name: 'Strava', color: '#FC4C02', connected: stravaConnected,  onPress: () => syncStrava() },
                    { name: 'Garmin', color: '#007DC5', connected: garminConnected,  onPress: () => handleFileImport() },
                    { name: 'Polar',  color: '#D0021B', connected: polarConnected,   onPress: () => syncPolar() },
                  ].map((svc, i, arr) => (
                    <button
                      key={svc.name}
                      onClick={() => { svc.onPress(); setAppMenuOpen(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left${i < arr.length - 1 ? ' border-b border-border' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: svc.color }} />
                      <span className="text-sm font-medium text-foreground flex-1">{svc.name}</span>
                      {svc.connected
                        ? <span className="text-[11px] font-medium text-green-500">Connecté</span>
                        : <span className="text-[11px] text-muted-foreground">{svc.name === 'Garmin' ? 'Importer' : 'Non connecté'}</span>
                      }
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
            <button
              onClick={reload}
              title="Recharger depuis la base"
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                color: T.textSub, cursor: 'pointer', padding: '5px 9px', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 28 }}
            >
              {loading ? <Spinner size={13} color={T.textSub} /> : '↻'}
            </button>
            <button onClick={reopenHelp} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.25)', color:'#06B6D4', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>?</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto', position: 'relative' }}>

        {/* ── SIDEBAR (desktop) — overlay drawer ── */}
        {!isMobile && (
          <>
            {/* Backdrop transparent pour fermer au clic extérieur */}
            {sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 98 }}
              />
            )}
            <aside style={{
              position: 'fixed',
              top: 0, left: 0,
              height: '100vh',
              width: 260,
              zIndex: 100,
              background: 'var(--nav-bg)',
              borderRight: '1px solid var(--border)',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
              overflowY: 'auto',
              padding: '72px 12px 20px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 1.1, paddingLeft: 10, marginBottom: 10, fontFamily: T.fontDisplay }}>
                NAVIGATION
              </div>
              {NAV.map(n => {
                const isActive = n.id === section
                return (
                  <button
                    key={n.id}
                    onClick={() => { setSection(n.id); setSidebarOpen(false) }}
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

              {/* Résumé */}
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

              {/* Pull-tab bord droit */}
              <button
                onClick={() => setSidebarOpen(o => !o)}
                style={{
                  position: 'absolute',
                  top: '50%', right: -16,
                  transform: 'translateY(-50%)',
                  width: 16, height: 48,
                  background: 'var(--nav-bg)',
                  border: '1px solid var(--border)',
                  borderLeft: 'none',
                  borderRadius: '0 6px 6px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 10, padding: 0,
                  zIndex: 1,
                }}
              >
                {sidebarOpen ? '‹' : '⋮'}
              </button>
            </aside>
          </>
        )}

        {/* ── CONTENT ── */}
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '14px 12px' : '22px 28px' }}>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: T.radius, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 5 }}>Erreur de chargement</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, fontFamily: 'monospace' }}>{error}</div>
              <button onClick={reload} style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
                Réessayer
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && !error && <PageLoader />}

          {/* Sections */}
          {!loading && !error && section === 'donnees'     && <div className="fade-up"><ScrollReveal><SectionDonnees activities={activities} zones={zones} profile={profile} /></ScrollReveal></div>}
          {!loading && !error && section === 'analyse'     && <div className="fade-up"><ScrollReveal><SectionAnalyse activities={activities} zones={zones} profile={profile} deepLinkId={deepLinkId} onDelete={handleDeleteActivity} loadMore={loadMore} hasMore={hasMore} loadingMore={loadingMore} /></ScrollReveal></div>}
          {!loading && !error && section === 'progression' && <div className="fade-up"><ScrollReveal><SectionProgression activities={activities} /></ScrollReveal></div>}
        </main>
      </div>

      <PageHelp config={TRAINING_ONBOARDING} show={showHelp} onDismiss={dismissHelp} />

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 3px; }
        input::placeholder { color: var(--text-dim); }
        button:focus { outline: none; }
        select option { background: var(--bg-card); color: var(--text); }
        table { border-spacing: 0; }
      `}</style>

    </div>
  )
}
